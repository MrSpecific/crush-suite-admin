import type { Merchant } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getEnvironment } from '@/lib/getEnvironment';
import { decryptVinoshipperSecret } from './credentials';
import type { VinoshipperProfile } from './types/merchant';
import type { VinoshipperOrder } from './types/order';
import type { VinoshipperProductFeed, VinoshipperProductFeedProduct } from './types/product';
import type { VinoshipperCustomer, VinoshipperCustomerListItem } from './types/customer';
import type { VinoshipperGetRegisteredWebhook } from './types/webhook';

const BASE_URLS = {
  production: 'https://vinoshipper.com',
  sandbox: 'https://zlminc.dev',
};

const REQUEST_TIMEOUT_MS = 15_000;

// Mirrors the main app: production talks to Vinoshipper, everything else to their
// sandbox, since that's where non-production merchants' keys are valid.
export const getVinoshipperBaseUrl = () =>
  process.env.VINOSHIPPER_API_URL ||
  (getEnvironment().name === 'production' ? BASE_URLS.production : BASE_URLS.sandbox);

type VinoshipperErrorDetail = {
  description: string;
  code: string;
  field: string;
  shortDescription: string | null;
};

type VinoshipperErrorBody = {
  error?: { status: number; type: string; errors?: VinoshipperErrorDetail[] };
};

export class VinoshipperApiError extends Error {
  status?: number;
  type?: string;
  errors?: VinoshipperErrorDetail[];
  traceId?: string | null;

  constructor(
    message: string,
    options?: {
      status?: number;
      type?: string;
      errors?: VinoshipperErrorDetail[];
      traceId?: string | null;
    }
  ) {
    super(message);
    this.name = 'VinoshipperApiError';
    Object.assign(this, options);
  }
}

export type VinoshipperMerchant = Pick<
  Merchant,
  'shop' | 'compliancePartner' | 'compliancePartnerId' | 'compliancePartnerApiPub' | 'compliancePartnerApiSec'
>;

export type VinoshipperClient = ReturnType<typeof createVinoshipperClient>;

/**
 * Read-only Vinoshipper API client that acts as the given merchant, using the
 * API keys they connected in the app. Throws `VinoshipperApiError` if the
 * merchant isn't on Vinoshipper or has no keys.
 */
export const getVinoshipperClient = (merchant: VinoshipperMerchant) => {
  if (merchant.compliancePartner !== 'VINOSHIPPER') {
    throw new VinoshipperApiError(`${merchant.shop} uses ${merchant.compliancePartner}, not Vinoshipper`);
  }

  const { compliancePartnerApiPub: publicKey, compliancePartnerApiSec: encryptedSecret } = merchant;
  if (!publicKey || !encryptedSecret) {
    throw new VinoshipperApiError(`${merchant.shop} has no Vinoshipper API keys`);
  }

  let secretKey: string;
  try {
    secretKey = decryptVinoshipperSecret(encryptedSecret);
  } catch (error) {
    throw new VinoshipperApiError(
      `Couldn't decrypt the Vinoshipper secret for ${merchant.shop}: ${error instanceof Error ? error.message : error}`
    );
  }

  return createVinoshipperClient({
    authorization: `Basic ${Buffer.from(`${publicKey}:${secretKey}`).toString('base64')}`,
    producerId: merchant.compliancePartnerId,
  });
};

export const getVinoshipperClientForMerchant = async (merchantId: number) => {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: {
      shop: true,
      compliancePartner: true,
      compliancePartnerId: true,
      compliancePartnerApiPub: true,
      compliancePartnerApiSec: true,
    },
  });
  if (!merchant) throw new VinoshipperApiError(`Merchant ${merchantId} not found`);

  return getVinoshipperClient(merchant);
};

const createVinoshipperClient = ({
  authorization,
  producerId,
}: {
  authorization: string;
  producerId?: string | null;
}) => {
  const request = <T>(path: string, init?: { method?: 'GET' | 'POST'; body?: unknown }) =>
    vinoshipperRequest<T>(path, { authorization, ...init });

  const requireProducerId = () => {
    if (!producerId) throw new VinoshipperApiError('Merchant has no Vinoshipper producer ID');
    return producerId;
  };

  return {
    /** Escape hatch for endpoints not wrapped below. Path is relative to the base URL. */
    request,

    getProfile: () => request<VinoshipperProfile>('/api/v3/p/profile'),

    getWebhooks: () => request<VinoshipperGetRegisteredWebhook[]>('/api/v3/p/profile/webhooks'),

    /**
     * `orderNumber` is our `Order.compliancePartnerOrderId`. Returns null when VS
     * has no such order.
     */
    getOrder: (orderNumber: string) =>
      returnNullOn404(request<VinoshipperOrder>(`/api/v3/p/orders/${encodeURIComponent(orderNumber)}`)),

    getProductFeed: () =>
      request<VinoshipperProductFeed>(`/api/v3/feeds/vs/${requireProducerId()}/products?soldOut=true`),

    getProduct: (productId: string | number) =>
      returnNullOn404(
        request<VinoshipperProductFeedProduct>(
          `/api/v3/feeds/vs/${requireProducerId()}/products/${encodeURIComponent(productId)}`
        )
      ),

    getCustomer: (customerId: string | number) =>
      returnNullOn404(
        request<VinoshipperCustomer>(`/api/v3/p/customers/${encodeURIComponent(customerId)}`)
      ),

    listCustomers: ({
      pageIndex = 0,
      pageSize = 250,
      clubsOnly,
    }: { pageIndex?: number; pageSize?: number; clubsOnly?: boolean } = {}) =>
      request<{ total: number; items: VinoshipperCustomerListItem[] }>('/api/v3/p/customers/list', {
        method: 'POST',
        body: { pageIndex, pageSize, clubsOnly },
      }),

    findCustomersByEmail: (email: string) =>
      request<VinoshipperCustomer[]>('/api/v3/p/customers/exists', {
        method: 'POST',
        body: { email },
      }),
  };
};

const vinoshipperRequest = async <T>(
  path: string,
  { authorization, method = 'GET', body }: { authorization: string; method?: string; body?: unknown }
): Promise<T> => {
  const url = `${getVinoshipperBaseUrl()}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
        'VS-Client-ID': 'crush-suite',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new VinoshipperApiError(
      `Couldn't reach Vinoshipper: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  const traceId = response.headers.get('vs-trace-id');

  // VS answers bad credentials with its HTML login page rather than a 401.
  if (response.headers.get('content-type')?.includes('text/html')) {
    throw new VinoshipperApiError('Vinoshipper rejected the API keys (redirected to login)', {
      status: response.status,
      traceId,
    });
  }

  const text = await response.text();
  const payload = text ? safeJsonParse(text) : undefined;

  if (!response.ok) {
    const error = (payload as VinoshipperErrorBody | undefined)?.error;
    const detail = error?.errors?.map((e) => e.description).join('; ');

    throw new VinoshipperApiError(
      `Vinoshipper ${method} ${path} failed with ${response.status}${
        error?.type ? ` ${error.type}` : ''
      }${detail ? `: ${detail}` : text && !payload ? `: ${text.slice(0, 200)}` : ''}`,
      { status: response.status, type: error?.type, errors: error?.errors, traceId }
    );
  }

  return payload as T;
};

const returnNullOn404 = async <T>(promise: Promise<T>) => {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof VinoshipperApiError && error.status === 404) return null;
    throw error;
  }
};

const safeJsonParse = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};
