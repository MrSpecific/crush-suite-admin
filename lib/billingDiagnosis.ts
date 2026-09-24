import {
  getShopifyAppBilling,
  getShopifyAppSubscriptionById,
  getShopifyRecentAppSubscriptions,
  type AppSubscription,
  type AppSubscriptionSummary,
} from '@/lib/shopify';

/*
 * Billing diagnosis: compares what our database says about a merchant's
 * Shopify subscription with what Shopify says, and names the fix.
 *
 * Why this exists: the web app gates access on platformBillingId /
 * platformBillingStatus, but only ever reads Shopify's activeSubscriptions.
 * A charge that was created but never approved leaves platformBillingId set
 * with no active subscription, and the web app (before the fix on
 * crush-suite fix/new-store-billing-frozen) showed "Your billing status is:
 * frozen" with no way to pick a plan again.
 */

export type BillingFacts = {
  platformBillingId: string | null;
  platformBillingStatus: string | null;
  /** Shopify's ACTIVE subscriptions for the shop. */
  active: AppSubscription[];
  /** The subscription platformBillingId points at. undefined when there is no
   *  platformBillingId to look up; null when Shopify has no such subscription. */
  stored: AppSubscriptionSummary | null | undefined;
  /** The newest subscriptions of any status, for history. */
  recent: AppSubscriptionSummary[];
  /** Set when Shopify could not be queried; nothing else can be trusted. */
  error?: string;
};

export type BillingRepair =
  | { kind: 'link-active'; subscriptionId: string; subscriptionName: string }
  | { kind: 'reset' };

export type BillingState =
  | 'healthy'
  | 'not-subscribed'
  | 'out-of-sync'
  | 'stuck'
  | 'awaiting-activation'
  | 'shopify-frozen'
  | 'unknown';

export type BillingDiagnosis = {
  state: BillingState;
  title: string;
  detail: string;
  merchantSees: string;
  repair?: BillingRepair;
};

export async function loadBillingFacts({
  shop,
  accessToken,
  platformBillingId,
  platformBillingStatus,
}: {
  shop?: string | null;
  accessToken?: string | null;
  platformBillingId: string | null;
  platformBillingStatus: string | null;
}): Promise<BillingFacts> {
  const base = { platformBillingId, platformBillingStatus, active: [], stored: undefined, recent: [] };
  if (!shop) return { ...base, error: 'No shop stored for this merchant.' };
  if (!accessToken) return { ...base, error: 'No access token stored for this merchant.' };

  try {
    const [active, stored, recent] = await Promise.all([
      getShopifyAppBilling({ shop, accessToken }),
      platformBillingId
        ? getShopifyAppSubscriptionById({ shop, accessToken, subscriptionId: platformBillingId })
        : Promise.resolve(undefined),
      getShopifyRecentAppSubscriptions({ shop, accessToken }),
    ]);
    return { platformBillingId, platformBillingStatus, active, stored, recent };
  } catch (err) {
    return {
      ...base,
      error: err instanceof Error ? err.message : 'Unable to load Shopify billing information.',
    };
  }
}

export function diagnoseBilling(facts: BillingFacts): BillingDiagnosis {
  const { platformBillingId, platformBillingStatus, active, stored, error } = facts;

  if (error) {
    return {
      state: 'unknown',
      title: 'Could not check billing with Shopify',
      detail: error,
      merchantSees: 'Unknown',
    };
  }

  const dbSaysActive = platformBillingStatus?.toLowerCase() === 'active';
  const newestActive = [...active].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  if (newestActive) {
    const linked =
      !!platformBillingId && active.some((sub) => sameSubscription(sub.id, platformBillingId));

    if (linked && dbSaysActive) {
      return {
        state: 'healthy',
        title: 'Billing is healthy',
        detail: `Our record matches the active Shopify subscription "${newestActive.name}".`,
        merchantSees: 'The app, with full access.',
      };
    }

    const repair: BillingRepair = {
      kind: 'link-active',
      subscriptionId: newestActive.id,
      subscriptionName: newestActive.name,
    };

    if (!platformBillingId) {
      return {
        state: 'out-of-sync',
        title: 'Shopify has an active subscription we have no record of',
        detail: `Shopify shows "${newestActive.name}" as active, but no billing id is stored.`,
        merchantSees: 'The plan picker, even though they are already subscribed.',
        repair,
      };
    }

    if (!linked) {
      return {
        state: 'out-of-sync',
        title: 'Our record points at the wrong subscription',
        detail: `The stored billing id is not the active Shopify subscription "${newestActive.name}". Usage charges are raised against the stored id, so they may fail.`,
        merchantSees: dbSaysActive
          ? 'The app, with full access.'
          : 'A billing status screen until the app re-checks Shopify.',
        repair,
      };
    }

    return {
      state: 'out-of-sync',
      title: 'Our stored status is stale',
      detail: `The stored subscription is active in Shopify, but our status is "${platformBillingStatus ?? 'empty'}". The web app corrects this itself the next time the merchant opens it.`,
      merchantSees: 'A brief billing check, then the app.',
      repair,
    };
  }

  if (!platformBillingId) {
    return {
      state: 'not-subscribed',
      title: 'Not subscribed yet',
      detail: 'No billing id is stored and Shopify has no active subscription.',
      merchantSees: 'The plan picker.',
    };
  }

  if (stored?.status === 'FROZEN') {
    return {
      state: 'shopify-frozen',
      title: 'Shopify has frozen this subscription',
      detail:
        'Shopify freezes app subscriptions when the store itself has a billing problem (for example unpaid Shopify bills). The merchant has to resolve it with Shopify; resetting would not help.',
      merchantSees: '"Your billing status is: frozen".',
    };
  }

  if (stored?.status === 'ACCEPTED') {
    return {
      state: 'awaiting-activation',
      title: 'Approved, waiting for Shopify to activate',
      detail:
        'The merchant approved the charge and Shopify has not activated it yet. This normally resolves within moments; check again shortly.',
      merchantSees: 'A billing status screen.',
    };
  }

  return {
    state: 'stuck',
    title: 'Stuck on a charge that never became active',
    detail: stuckDetail(stored),
    merchantSees:
      '"Your billing status is: frozen", with no way to pick a plan again. (Once the web fix ships they will see the plan picker instead.)',
    repair: { kind: 'reset' },
  };
}

function stuckDetail(stored: AppSubscriptionSummary | null | undefined) {
  const prefix = 'A billing id is stored but Shopify has no active subscription.';
  switch (stored?.status) {
    case 'PENDING':
      return `${prefix} The stored charge is still PENDING: it was created but never approved. If approval failed on Shopify's page, the store may not be able to approve app charges at all (Plus development stores are a known case).`;
    case 'DECLINED':
      return `${prefix} The stored charge was DECLINED.`;
    case 'EXPIRED':
      return `${prefix} The stored charge EXPIRED before it was approved.`;
    case 'CANCELLED':
      return `${prefix} The stored charge was CANCELLED.`;
    case undefined:
    case null:
      return `${prefix} Shopify has no record of the stored charge at all.`;
    default:
      return `${prefix} The stored charge is ${stored?.status}.`;
  }
}

/** Compare subscription ids whether stored as a gid or the bare numeric id. */
export function sameSubscription(a: string, b: string) {
  return a.split('/').pop() === b.split('/').pop();
}

/*
 * Plan name matching, mirroring crush-suite web/services/Billing/Billing.helper.ts:
 * Shopify keeps the name a subscription was created with, and our plan rows
 * are not always written the same way ("Pro Plan" vs "Pro").
 */
export function normalizePlanName(name: string) {
  return (name || '')
    .toLowerCase()
    .replace(/\bplans?\b/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function matchPlanByName<T extends { name: string }>(plans: T[], name: string) {
  const exact = plans.find((plan) => plan.name === name);
  if (exact) return exact;

  const key = normalizePlanName(name);
  if (!key) return undefined;
  return plans.find((plan) => normalizePlanName(plan.name) === key);
}
