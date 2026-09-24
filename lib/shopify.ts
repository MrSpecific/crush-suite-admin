const DEFAULT_SHOPIFY_ADMIN_API_VERSION = '2026-01';

type ShopifyGraphqlError = {
  message: string;
  path?: Array<string | number>;
  extensions?: Record<string, unknown>;
};

type ShopifyGraphqlResponse<TData> = {
  data?: TData;
  errors?: ShopifyGraphqlError[];
};

type Money = {
  amount: string;
  currencyCode: string;
};

type MoneySet = {
  shopMoney: Money;
};

export type ShopifyOrder = {
  id: string;
  legacyResourceId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  processedAt?: string | null;
  sourceName?: string | null;
  sourceIdentifier?: string | null;
  displayFinancialStatus?: string | null;
  displayFulfillmentStatus?: string | null;
  totalPriceSet?: MoneySet | null;
  currentTotalPriceSet?: MoneySet | null;
  app?: {
    id: string;
    name: string;
  } | null;
  publication?: {
    id: string;
    name: string;
  } | null;
  channelInformation?: {
    id: string;
    channelId: string;
    app: {
      id: string;
      title: string;
      handle?: string | null;
    };
    channelDefinition?: {
      id: string;
      channelName: string;
      subChannelName: string;
      handle: string;
      isMarketplace: boolean;
    } | null;
  } | null;
};

type ShopifyOrderQueryData = {
  order: ShopifyOrder | null;
};

type ShopifyGraphqlRequest<TVariables extends Record<string, unknown>> = {
  shop: string;
  accessToken: string;
  query: string;
  variables?: TVariables;
  apiVersion?: string;
};

export class ShopifyAdminApiError extends Error {
  status?: number;
  graphqlErrors?: ShopifyGraphqlError[];

  constructor(
    message: string,
    options?: { status?: number; graphqlErrors?: ShopifyGraphqlError[] }
  ) {
    super(message);
    this.name = 'ShopifyAdminApiError';
    this.status = options?.status;
    this.graphqlErrors = options?.graphqlErrors;
  }
}

export const SHOPIFY_ORDER_QUERY = /* GraphQL */ `
  query CrushSuiteAdminOrder($id: ID!) {
    order(id: $id) {
      id
      legacyResourceId
      name
      createdAt
      updatedAt
      processedAt
      sourceName
      sourceIdentifier
      displayFinancialStatus
      displayFulfillmentStatus
      totalPriceSet {
        shopMoney {
          amount
          currencyCode
        }
      }
      currentTotalPriceSet {
        shopMoney {
          amount
          currencyCode
        }
      }
      app {
        id
        name
      }
      publication {
        id
        name
      }
      channelInformation {
        id
        channelId
        app {
          id
          title
          handle
        }
        channelDefinition {
          id
          channelName
          subChannelName
          handle
          isMarketplace
        }
      }
    }
  }
`;

export async function shopifyAdminGraphql<
  TData,
  TVariables extends Record<string, unknown> = Record<string, unknown>,
>({
  shop,
  accessToken,
  query,
  variables,
  apiVersion,
}: ShopifyGraphqlRequest<TVariables>): Promise<TData> {
  if (!shop) {
    throw new ShopifyAdminApiError('Missing Shopify shop domain');
  }

  if (!accessToken) {
    throw new ShopifyAdminApiError('Missing Shopify access token');
  }

  const shopDomain = normalizeShopifyShopDomain(shop);
  const version =
    apiVersion || process.env.SHOPIFY_ADMIN_API_VERSION || DEFAULT_SHOPIFY_ADMIN_API_VERSION;
  const response = await fetch(`https://${shopDomain}/admin/api/${version}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });

  const payload = (await parseShopifyResponse<TData>(response)) as ShopifyGraphqlResponse<TData>;

  if (!response.ok) {
    throw new ShopifyAdminApiError(`Shopify Admin API request failed with ${response.status}`, {
      status: response.status,
      graphqlErrors: payload.errors,
    });
  }

  if (payload.errors?.length) {
    throw new ShopifyAdminApiError(formatGraphqlErrors(payload.errors), {
      status: response.status,
      graphqlErrors: payload.errors,
    });
  }

  if (!payload.data) {
    throw new ShopifyAdminApiError('Shopify Admin API returned no data', {
      status: response.status,
    });
  }

  return payload.data;
}

export async function getShopifyOrderByPlatformOrderId({
  shop,
  accessToken,
  platformOrderId,
}: {
  shop: string;
  accessToken: string;
  platformOrderId: string;
}) {
  const data = await shopifyAdminGraphql<ShopifyOrderQueryData, { id: string }>({
    shop,
    accessToken,
    query: SHOPIFY_ORDER_QUERY,
    variables: {
      id: toShopifyOrderGid(platformOrderId),
    },
  });

  return data.order;
}

export function toShopifyOrderGid(platformOrderId: string) {
  if (platformOrderId.startsWith('gid://shopify/Order/')) {
    return platformOrderId;
  }

  return `gid://shopify/Order/${platformOrderId}`;
}

export function getShopifyOrderSourceLabel(order: ShopifyOrder | null) {
  if (!order) return undefined;

  return (
    order.channelInformation?.channelDefinition?.subChannelName ||
    order.channelInformation?.channelDefinition?.channelName ||
    order.publication?.name ||
    order.app?.name ||
    order.sourceName ||
    undefined
  );
}

export type ShopifyVariantSummary = {
  id: string;
  legacyResourceId: string;
  title: string;
  product: { id: string; legacyResourceId: string; title: string };
};

type ShopifyVariantsQueryData = {
  nodes: Array<ShopifyVariantSummary | Record<string, never> | null>;
};

const SHOPIFY_VARIANTS_QUERY = /* GraphQL */ `
  query CrushSuiteAdminVariants($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on ProductVariant {
        id
        legacyResourceId
        title
        product {
          id
          legacyResourceId
          title
        }
      }
    }
  }
`;

export async function getShopifyVariantsByPlatformVariantIds({
  shop,
  accessToken,
  platformVariantIds,
}: {
  shop: string;
  accessToken: string;
  platformVariantIds: string[];
}) {
  if (platformVariantIds.length === 0) return [];

  const data = await shopifyAdminGraphql<ShopifyVariantsQueryData, { ids: string[] }>({
    shop,
    accessToken,
    query: SHOPIFY_VARIANTS_QUERY,
    variables: {
      ids: [...new Set(platformVariantIds.map(toShopifyVariantGid))],
    },
  });

  return data.nodes.filter((node): node is ShopifyVariantSummary => !!node && 'id' in node);
}

export function toShopifyVariantGid(platformVariantId: string) {
  if (platformVariantId.startsWith('gid://shopify/ProductVariant/')) {
    return platformVariantId;
  }

  return `gid://shopify/ProductVariant/${platformVariantId}`;
}

export function getShopifyAdminProductUrl(shop: string, platformProductId: string) {
  const id = platformProductId.split('/').pop();
  return `https://${normalizeShopifyShopDomain(shop)}/admin/products/${id}`;
}

export function getShopifyAdminOrderUrl(shop: string, platformOrderId: string) {
  return `https://${normalizeShopifyShopDomain(shop)}/admin/orders/${platformOrderId}`;
}

function normalizeShopifyShopDomain(shop: string) {
  const trimmedShop = shop
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '');

  if (!trimmedShop) {
    throw new ShopifyAdminApiError('Invalid Shopify shop domain');
  }

  return trimmedShop;
}

async function parseShopifyResponse<TData>(response: Response) {
  const body = await response.text();

  if (!body) {
    return {};
  }

  try {
    return JSON.parse(body) as ShopifyGraphqlResponse<TData>;
  } catch {
    throw new ShopifyAdminApiError('Shopify Admin API returned invalid JSON', {
      status: response.status,
    });
  }
}

function formatGraphqlErrors(errors: ShopifyGraphqlError[]) {
  return errors.map((error) => error.message).join('; ');
}

// ─── App Billing ─────────────────────────────────────────────────────────────

type AppRecurringPricing = {
  __typename: 'AppRecurringPricing';
  price: Money;
  interval: 'ANNUAL' | 'EVERY_30_DAYS';
};

type AppUsagePricing = {
  __typename: 'AppUsagePricing';
  balanceUsed: Money;
  cappedAmount: Money;
  terms: string;
};

export type AppSubscriptionLineItem = {
  id: string;
  plan: {
    pricingDetails: AppRecurringPricing | AppUsagePricing;
  };
};

export type AppSubscription = {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  currentPeriodEnd?: string | null;
  trialDays?: number | null;
  lineItems: AppSubscriptionLineItem[];
};

type AppBillingQueryData = {
  currentAppInstallation: {
    id: string;
    activeSubscriptions: AppSubscription[];
  };
};

const SHOPIFY_APP_BILLING_QUERY = /* GraphQL */ `
  query CrushSuiteAdminAppBilling {
    currentAppInstallation {
      id
      activeSubscriptions {
        id
        name
        status
        createdAt
        currentPeriodEnd
        trialDays
        lineItems {
          id
          plan {
            pricingDetails {
              ... on AppRecurringPricing {
                __typename
                price {
                  amount
                  currencyCode
                }
                interval
              }
              ... on AppUsagePricing {
                __typename
                balanceUsed {
                  amount
                  currencyCode
                }
                cappedAmount {
                  amount
                  currencyCode
                }
                terms
              }
            }
          }
        }
      }
    }
  }
`;

export async function getShopifyAppBilling({
  shop,
  accessToken,
}: {
  shop: string;
  accessToken: string;
}): Promise<AppSubscription[]> {
  const data = await shopifyAdminGraphql<AppBillingQueryData>({
    shop,
    accessToken,
    query: SHOPIFY_APP_BILLING_QUERY,
  });

  return data.currentAppInstallation.activeSubscriptions;
}

// ─── App Billing: any status ─────────────────────────────────────────────────
//
// activeSubscriptions only ever returns ACTIVE subscriptions, so a charge the
// merchant never approved (or declined, or that expired) is invisible there.
// These look subscriptions up regardless of status, which is what billing
// diagnosis needs.

export type AppSubscriptionSummary = {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  test: boolean;
};

const APP_SUBSCRIPTION_SUMMARY_FIELDS = /* GraphQL */ `
  id
  name
  status
  createdAt
  test
`;

const SHOPIFY_APP_SUBSCRIPTION_QUERY = /* GraphQL */ `
  query CrushSuiteAdminAppSubscription($id: ID!) {
    node(id: $id) {
      ... on AppSubscription {
        ${APP_SUBSCRIPTION_SUMMARY_FIELDS}
      }
    }
  }
`;

const SHOPIFY_RECENT_APP_SUBSCRIPTIONS_QUERY = /* GraphQL */ `
  query CrushSuiteAdminRecentAppSubscriptions($first: Int!) {
    currentAppInstallation {
      allSubscriptions(first: $first, sortKey: CREATED_AT, reverse: true) {
        nodes {
          ${APP_SUBSCRIPTION_SUMMARY_FIELDS}
        }
      }
    }
  }
`;

/** One subscription by id, or null when Shopify has no such subscription. */
export async function getShopifyAppSubscriptionById({
  shop,
  accessToken,
  subscriptionId,
}: {
  shop: string;
  accessToken: string;
  subscriptionId: string;
}): Promise<AppSubscriptionSummary | null> {
  const data = await shopifyAdminGraphql<
    { node: AppSubscriptionSummary | Record<string, never> | null },
    { id: string }
  >({
    shop,
    accessToken,
    query: SHOPIFY_APP_SUBSCRIPTION_QUERY,
    variables: { id: toShopifyAppSubscriptionGid(subscriptionId) },
  });

  const node = data.node;
  return node && 'id' in node ? (node as AppSubscriptionSummary) : null;
}

/** The most recently created subscriptions for the shop, newest first. */
export async function getShopifyRecentAppSubscriptions({
  shop,
  accessToken,
  first = 5,
}: {
  shop: string;
  accessToken: string;
  first?: number;
}): Promise<AppSubscriptionSummary[]> {
  const data = await shopifyAdminGraphql<
    { currentAppInstallation: { allSubscriptions: { nodes: AppSubscriptionSummary[] } } },
    { first: number }
  >({
    shop,
    accessToken,
    query: SHOPIFY_RECENT_APP_SUBSCRIPTIONS_QUERY,
    variables: { first },
  });

  return data.currentAppInstallation.allSubscriptions.nodes;
}

/** The web app stores the gid appSubscriptionCreate returns; older rows may hold the bare id. */
export function toShopifyAppSubscriptionGid(subscriptionId: string) {
  if (subscriptionId.startsWith('gid://shopify/AppSubscription/')) {
    return subscriptionId;
  }

  return `gid://shopify/AppSubscription/${subscriptionId}`;
}
