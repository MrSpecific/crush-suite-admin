import { getVinoshipperClient, type VinoshipperMerchant } from './client';
import type { VinoshipperProfile } from './types/merchant';
import type { VinoshipperProductFeed } from './types/product';
import type { VinoshipperGetRegisteredWebhook } from './types/webhook';

// The main app registers this on connect (worker handleVinoshipperWebhooks);
// without it we never hear about shipments or cancellations.
const ORDER_WEBHOOK_PATH = '/vinoshipper/webhooks/orders';

type Result<T> = { data: T; error?: undefined } | { data: null; error: string };

export type VinoshipperMerchantOverview = {
  /** Set when no call could be made at all (not on VS, missing keys, etc). */
  error?: string;
  profile: Result<VinoshipperProfile>;
  webhooks: Result<VinoshipperGetRegisteredWebhook[]>;
  productFeed: Result<VinoshipperProductFeed>;
};

/**
 * Everything worth showing about a merchant's Vinoshipper account, fetched in
 * parallel. Never throws: each part carries its own error so one failing call
 * doesn't hide the others.
 */
export const getVinoshipperMerchantOverview = async (
  merchant: VinoshipperMerchant
): Promise<VinoshipperMerchantOverview> => {
  let client;
  try {
    client = getVinoshipperClient(merchant);
  } catch (error) {
    const message = errorMessage(error);
    const failed = { data: null, error: message };
    return { error: message, profile: failed, webhooks: failed, productFeed: failed };
  }

  const [profile, webhooks, productFeed] = await Promise.all([
    settle(client.getProfile()),
    settle(client.getWebhooks()),
    settle(client.getProductFeed()),
  ]);

  return { profile, webhooks, productFeed };
};

export const isOrderWebhook = (webhook: VinoshipperGetRegisteredWebhook) =>
  webhook.subject === 'ORDER' && webhook.url.includes(ORDER_WEBHOOK_PATH);

const settle = async <T>(promise: Promise<T>): Promise<Result<T>> => {
  try {
    return { data: await promise };
  } catch (error) {
    return { data: null, error: errorMessage(error) };
  }
};

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Unknown Vinoshipper error';
