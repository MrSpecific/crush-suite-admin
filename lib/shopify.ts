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
