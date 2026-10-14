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

export type Money = {
  amount: string;
  currencyCode: string;
};

export function formatMoney({ amount, currencyCode }: Money) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(
    Number(amount)
  );
}

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
  // Null when the variant needs no shipping (or Shopify has not assigned one)
  deliveryProfile: { id: string; name: string } | null;
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
        deliveryProfile {
          id
          name
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

export function getShopifyAdminLocationUrl(shop: string, platformLocationId: string) {
  const id = platformLocationId.split('/').pop();
  return `https://${normalizeShopifyShopDomain(shop)}/admin/settings/locations/${id}`;
}

export function getShopifyAdminDeliveryProfileUrl(shop: string, deliveryProfileId: string) {
  const id = deliveryProfileId.split('/').pop();
  return `https://${normalizeShopifyShopDomain(shop)}/admin/settings/shipping/profiles/${id}`;
}

const toShopifyGid = (type: string, id: string) =>
  id.startsWith('gid://') ? id : `gid://shopify/${type}/${id}`;

// Locations

export type ShopifyLocationDetail = {
  id: string;
  legacyResourceId: string;
  name: string;
  isActive: boolean;
  // The shop's default location for inventory
  shipsInventory: boolean;
  fulfillsOnlineOrders: boolean;
  isFulfillmentService: boolean;
  address: {
    address1: string | null;
    address2: string | null;
    city: string | null;
    provinceCode: string | null;
    zip: string | null;
    countryCode: string | null;
    phone: string | null;
  };
  localPickupSettingsV2: { pickupTime: string | null; instructions: string | null } | null;
};

const SHOPIFY_LOCATIONS_QUERY = /* GraphQL */ `
  query CrushSuiteAdminLocations($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Location {
        id
        legacyResourceId
        name
        isActive
        shipsInventory
        fulfillsOnlineOrders
        isFulfillmentService
        address {
          address1
          address2
          city
          provinceCode
          zip
          countryCode
          phone
        }
        localPickupSettingsV2 {
          pickupTime
          instructions
        }
      }
    }
  }
`;

export async function getShopifyLocationsByIds({
  shop,
  accessToken,
  platformLocationIds,
}: {
  shop: string;
  accessToken: string;
  platformLocationIds: string[];
}) {
  if (platformLocationIds.length === 0) return [];

  const data = await shopifyAdminGraphql<
    { nodes: Array<ShopifyLocationDetail | Record<string, never> | null> },
    { ids: string[] }
  >({
    shop,
    accessToken,
    query: SHOPIFY_LOCATIONS_QUERY,
    variables: { ids: [...new Set(platformLocationIds.map((id) => toShopifyGid('Location', id)))] },
  });

  return data.nodes.filter((node): node is ShopifyLocationDetail => !!node && 'id' in node);
}

// Inventory levels

export type ShopifyInventoryQuantities = {
  available: number;
  reserved: number;
  committed: number;
  on_hand: number;
};

export type ShopifyInventoryItemLevel = {
  id: string;
  legacyResourceId: string;
  // False when the merchant does not count stock for this item at all
  tracked: boolean;
  // Null when the item is not stocked at the location
  quantities: ShopifyInventoryQuantities | null;
};

type ShopifyInventoryLevelsQueryData = {
  nodes: Array<
    | {
        id: string;
        legacyResourceId: string;
        tracked: boolean;
        inventoryLevel: { quantities: { name: string; quantity: number }[] } | null;
      }
    | Record<string, never>
    | null
  >;
};

const SHOPIFY_INVENTORY_LEVELS_QUERY = /* GraphQL */ `
  query CrushSuiteAdminInventoryLevels($ids: [ID!]!, $locationId: ID!) {
    nodes(ids: $ids) {
      ... on InventoryItem {
        id
        legacyResourceId
        tracked
        inventoryLevel(locationId: $locationId) {
          quantities(names: ["available", "reserved", "committed", "on_hand"]) {
            name
            quantity
          }
        }
      }
    }
  }
`;

export async function getShopifyInventoryLevelsAtLocation({
  shop,
  accessToken,
  platformLocationId,
  platformInventoryItemIds,
}: {
  shop: string;
  accessToken: string;
  platformLocationId: string;
  platformInventoryItemIds: string[];
}): Promise<ShopifyInventoryItemLevel[]> {
  if (platformInventoryItemIds.length === 0) return [];

  const data = await shopifyAdminGraphql<
    ShopifyInventoryLevelsQueryData,
    { ids: string[]; locationId: string }
  >({
    shop,
    accessToken,
    query: SHOPIFY_INVENTORY_LEVELS_QUERY,
    variables: {
      ids: [...new Set(platformInventoryItemIds.map((id) => toShopifyGid('InventoryItem', id)))],
      locationId: toShopifyGid('Location', platformLocationId),
    },
  });

  return data.nodes
    .filter((node): node is NonNullable<typeof node> & { id: string } => !!node && 'id' in node)
    .map(({ inventoryLevel, ...item }) => ({
      id: item.id,
      legacyResourceId: item.legacyResourceId,
      tracked: item.tracked,
      quantities: inventoryLevel
        ? (Object.fromEntries(
            inventoryLevel.quantities.map((q) => [q.name, q.quantity])
          ) as ShopifyInventoryQuantities)
        : null,
    }));
}

// Delivery profiles

export type ShopifyDeliveryZone = {
  name: string;
  countries: {
    code: { countryCode: string | null; restOfWorld: boolean };
    provinces: { code: string }[];
  }[];
  methods: { name: string; active: boolean }[];
};

export type ShopifyDeliveryProfileDetail = {
  id: string;
  name: string;
  default: boolean;
  // Locations the profile ships from, across all its location groups
  locations: { legacyResourceId: string; name: string }[];
  zones: ShopifyDeliveryZone[];
};

type ShopifyDeliveryProfileQueryData = {
  deliveryProfile: {
    id: string;
    name: string;
    default: boolean;
    profileLocationGroups: {
      locationGroup: { locations: { nodes: { legacyResourceId: string; name: string }[] } };
      locationGroupZones: {
        nodes: {
          zone: { name: string; countries: ShopifyDeliveryZone['countries'] };
          methodDefinitions: { nodes: { name: string; active: boolean }[] };
        }[];
      };
    }[];
  } | null;
};

// One profile at a time, first page of each connection: profiles, zones per group and methods per
// zone are each a handful in practice. Walking every profile in the shop is expensive, so callers
// pass only the profiles they care about (see the Clubs app's shipping-rate-identity.md).
const SHOPIFY_DELIVERY_PROFILE_QUERY = /* GraphQL */ `
  query CrushSuiteAdminDeliveryProfile($id: ID!) {
    deliveryProfile(id: $id) {
      id
      name
      default
      profileLocationGroups {
        locationGroup {
          locations(first: 10) {
            nodes {
              legacyResourceId
              name
            }
          }
        }
        locationGroupZones(first: 20) {
          nodes {
            zone {
              name
              countries {
                code {
                  countryCode
                  restOfWorld
                }
                provinces {
                  code
                }
              }
            }
            methodDefinitions(first: 10) {
              nodes {
                name
                active
              }
            }
          }
        }
      }
    }
  }
`;

export async function getShopifyDeliveryProfile({
  shop,
  accessToken,
  deliveryProfileId,
}: {
  shop: string;
  accessToken: string;
  deliveryProfileId: string;
}): Promise<ShopifyDeliveryProfileDetail | null> {
  const data = await shopifyAdminGraphql<ShopifyDeliveryProfileQueryData, { id: string }>({
    shop,
    accessToken,
    query: SHOPIFY_DELIVERY_PROFILE_QUERY,
    variables: { id: toShopifyGid('DeliveryProfile', deliveryProfileId) },
  });

  const profile = data.deliveryProfile;
  if (!profile) return null;

  const locations = new Map(
    profile.profileLocationGroups
      .flatMap((group) => group.locationGroup.locations.nodes)
      .map((location) => [location.legacyResourceId, location])
  );

  return {
    id: profile.id,
    name: profile.name,
    default: profile.default,
    locations: [...locations.values()],
    zones: profile.profileLocationGroups.flatMap((group) =>
      group.locationGroupZones.nodes.map(({ zone, methodDefinitions }) => ({
        name: zone.name,
        countries: zone.countries,
        methods: methodDefinitions.nodes,
      }))
    ),
  };
}

export type ShopifySubscriptionBillingAttempt = {
  id: string;
  createdAt: string;
  completedAt: string | null;
  ready: boolean;
  idempotencyKey: string;
  nextActionUrl: string | null;
  processingError: { code: string; message: string } | null;
  order: { id: string; name: string; legacyResourceId: string } | null;
};

export type ShopifySubscriptionContract = {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  nextBillingDate: string | null;
  lastPaymentStatus: string | null;
  lastBillingAttemptErrorType: string | null;
  currencyCode: string;
  deliveryPrice: Money | null;
  deliveryMethod: { __typename: string } | null;
  customerPaymentMethod: {
    id: string;
    revokedAt: string | null;
    revokedReason: string | null;
  } | null;
  billingAttempts: { nodes: ShopifySubscriptionBillingAttempt[] };
};

// `billingAttempts` doesn't support `last` without `before`, so the newest are
// fetched with `reverse` instead.
const SHOPIFY_SUBSCRIPTION_CONTRACT_QUERY = /* GraphQL */ `
  query CrushSuiteAdminSubscriptionContract($id: ID!) {
    subscriptionContract(id: $id) {
      id
      status
      createdAt
      updatedAt
      nextBillingDate
      lastPaymentStatus
      lastBillingAttemptErrorType
      currencyCode
      deliveryPrice {
        amount
        currencyCode
      }
      deliveryMethod {
        __typename
      }
      customerPaymentMethod {
        id
        revokedAt
        revokedReason
      }
      billingAttempts(first: 10, reverse: true) {
        nodes {
          id
          createdAt
          completedAt
          ready
          idempotencyKey
          nextActionUrl
          processingError {
            code
            message
          }
          order {
            id
            name
            legacyResourceId
          }
        }
      }
    }
  }
`;

export async function getShopifySubscriptionContract({
  shop,
  accessToken,
  platformContractId,
}: {
  shop: string;
  accessToken: string;
  platformContractId: string;
}) {
  const data = await shopifyAdminGraphql<
    { subscriptionContract: ShopifySubscriptionContract | null },
    { id: string }
  >({
    shop,
    accessToken,
    query: SHOPIFY_SUBSCRIPTION_CONTRACT_QUERY,
    variables: { id: toShopifySubscriptionContractGid(platformContractId) },
  });

  return data.subscriptionContract;
}

export function toShopifySubscriptionContractGid(platformContractId: string) {
  if (platformContractId.startsWith('gid://shopify/SubscriptionContract/')) {
    return platformContractId;
  }

  return `gid://shopify/SubscriptionContract/${platformContractId}`;
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

export type AppSubscriptionDiscount = {
  /** e.g. "100% off" or "$20.00 off" */
  label: string;
  priceAfterDiscount: Money;
  durationLimitInIntervals: number | null;
  remainingDurationInIntervals: number | null;
};

export type AppSubscriptionSummary = {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  test: boolean;
  /** The discount on the recurring line item, if one was applied at creation. */
  discount: AppSubscriptionDiscount | null;
};

type AppSubscriptionSummaryNode = Omit<AppSubscriptionSummary, 'discount'> & {
  lineItems: {
    plan: {
      pricingDetails: {
        __typename: string;
        discount?: {
          durationLimitInIntervals: number | null;
          remainingDurationInIntervals: number | null;
          priceAfterDiscount: Money;
          value:
            | { __typename: 'AppSubscriptionDiscountAmount'; amount: Money }
            | { __typename: 'AppSubscriptionDiscountPercentage'; percentage: number };
        } | null;
      };
    };
  }[];
};

const APP_SUBSCRIPTION_SUMMARY_FIELDS = /* GraphQL */ `
  id
  name
  status
  createdAt
  test
  lineItems {
    plan {
      pricingDetails {
        __typename
        ... on AppRecurringPricing {
          discount {
            durationLimitInIntervals
            remainingDurationInIntervals
            priceAfterDiscount {
              amount
              currencyCode
            }
            value {
              __typename
              ... on AppSubscriptionDiscountAmount {
                amount {
                  amount
                  currencyCode
                }
              }
              ... on AppSubscriptionDiscountPercentage {
                percentage
              }
            }
          }
        }
      }
    }
  }
`;

function toAppSubscriptionSummary({ lineItems, ...node }: AppSubscriptionSummaryNode) {
  const discount = lineItems.find(
    (item) => item.plan.pricingDetails.__typename === 'AppRecurringPricing'
  )?.plan.pricingDetails.discount;

  return {
    ...node,
    discount: discount
      ? {
          label:
            discount.value.__typename === 'AppSubscriptionDiscountPercentage'
              ? `${Math.round(discount.value.percentage * 100)}% off`
              : `${formatMoney(discount.value.amount)} off`,
          priceAfterDiscount: discount.priceAfterDiscount,
          durationLimitInIntervals: discount.durationLimitInIntervals,
          remainingDurationInIntervals: discount.remainingDurationInIntervals,
        }
      : null,
  } satisfies AppSubscriptionSummary;
}

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
    { node: AppSubscriptionSummaryNode | Record<string, never> | null },
    { id: string }
  >({
    shop,
    accessToken,
    query: SHOPIFY_APP_SUBSCRIPTION_QUERY,
    variables: { id: toShopifyAppSubscriptionGid(subscriptionId) },
  });

  const node = data.node;
  return node && 'id' in node ? toAppSubscriptionSummary(node as AppSubscriptionSummaryNode) : null;
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
    { currentAppInstallation: { allSubscriptions: { nodes: AppSubscriptionSummaryNode[] } } },
    { first: number }
  >({
    shop,
    accessToken,
    query: SHOPIFY_RECENT_APP_SUBSCRIPTIONS_QUERY,
    variables: { first },
  });

  return data.currentAppInstallation.allSubscriptions.nodes.map(toAppSubscriptionSummary);
}

/** The web app stores the gid appSubscriptionCreate returns; older rows may hold the bare id. */
export function toShopifyAppSubscriptionGid(subscriptionId: string) {
  if (subscriptionId.startsWith('gid://shopify/AppSubscription/')) {
    return subscriptionId;
  }

  return `gid://shopify/AppSubscription/${subscriptionId}`;
}
