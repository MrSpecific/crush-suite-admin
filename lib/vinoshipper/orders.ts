import { getVinoshipperClient, type VinoshipperMerchant } from './client';
import type {
  VinoshipperOrder,
  VinoshipperOrderStatus,
  VinoshipperOrderStatusOfOrder,
} from './types/order';

export type VinoshipperOrderLookup = {
  order: VinoshipperOrder | null;
  orderNumber?: string | null;
  error?: string;
};

/**
 * Fetches the live Vinoshipper order for one of our orders. Never throws:
 * failures come back as `error` so a page can render the rest of itself.
 */
export const getVinoshipperOrderLookup = async ({
  merchant,
  compliancePartnerOrderId,
}: {
  merchant: VinoshipperMerchant;
  compliancePartnerOrderId?: string | null;
}): Promise<VinoshipperOrderLookup> => {
  const orderNumber = compliancePartnerOrderId;
  if (!orderNumber) {
    return { order: null, error: 'No Vinoshipper order number is stored for this order.' };
  }

  try {
    const order = await getVinoshipperClient(merchant).getOrder(orderNumber);

    return order
      ? { order, orderNumber }
      : { order: null, orderNumber, error: `Vinoshipper has no order ${orderNumber}.` };
  } catch (error) {
    return {
      order: null,
      orderNumber,
      error: error instanceof Error ? error.message : 'Unable to load Vinoshipper order.',
    };
  }
};

/**
 * The figures worth showing from a VS order, read the way the worker's
 * reconciliation reads them (see the docblock on `VinoshipperOrder`):
 * - tax is VS's own calculation from the `taxes` breakdown, not `taxesTotal`,
 *   which only echoes what we submitted
 * - fees are summed from `extraFees[]`, since `extraFeesTotal` is always 0
 * - `platformCharges` are negative when they're charges, so they're flipped to
 *   read as positive amounts billed to the merchant
 */
export const getVinoshipperOrderFigures = (order: VinoshipperOrder) => {
  const charges = order.platformCharges;
  const { countyTaxes, cityTaxes, stateTaxes, otherTaxes } = order.taxes ?? {};

  return {
    total: order.total,
    salesTax: round(sum([countyTaxes, cityTaxes, stateTaxes, otherTaxes])),
    shipping: order.shipping?.price ?? null,
    fees: round(sum(order.extraFees?.map((fee) => fee.amount))),
    taxesAdjusted: order.taxesAdjusted ?? null,
    feesAdjusted: order.extraFeesAdjusted ?? null,
    merchant: charges
      ? {
          amountDue: liability(charges.amountDue),
          vinoshipperFee: liability(charges.vinoshipperFee),
          stateFees: liability(charges.stateFees),
          salesTax: liability(charges.taxSales),
          shipping: liability(charges.shipping),
        }
      : null,
    trackingNumbers: (order.shipping?.packages ?? [])
      .map((pkg) => pkg.trackingNumber)
      .filter(Boolean),
  };
};

export const getUpsTrackingUrl = (trackingNumber: string) =>
  `https://www.ups.com/track?tracknum=${encodeURIComponent(trackingNumber)}`;

type StatusMeta = { label: string; color: 'green' | 'blue' | 'yellow' | 'orange' | 'red' | 'gray' };

/** VS's `status`: whether the order was accepted and paid. */
export const vinoshipperStatusMeta: Record<VinoshipperOrderStatus, StatusMeta> = {
  SUCCESS: { label: 'Success', color: 'green' },
  PENDING: { label: 'Pending', color: 'yellow' },
  PAYMENT_AUTHORIZED: { label: 'Payment Authorized', color: 'blue' },
  PROBLEM: { label: 'Problem', color: 'red' },
  PAYMENT_CAPTURE_FAILED: { label: 'Payment Capture Failed', color: 'red' },
  AGE_VERIFICATION_FAILED: { label: 'Age Verification Failed', color: 'red' },
  AGE_VERIFICATION_LOCKED: { label: 'Age Verification Locked', color: 'red' },
  DELETED: { label: 'Deleted', color: 'gray' },
};

/** VS's `orderStatus`: where the order is in fulfillment. */
export const vinoshipperOrderStatusMeta: Record<VinoshipperOrderStatusOfOrder, StatusMeta> = {
  OPEN: { label: 'Open', color: 'blue' },
  NEW_MEMBER: { label: 'New Member', color: 'blue' },
  UNPAID: { label: 'Unpaid', color: 'yellow' },
  LABELS_GENERATED: { label: 'Labels Generated', color: 'yellow' },
  SHIPPED: { label: 'Shipped', color: 'blue' },
  DELIVERED: { label: 'Delivered', color: 'green' },
  PICKED_UP: { label: 'Picked Up', color: 'green' },
  RETURNED: { label: 'Returned', color: 'orange' },
  CANCELLED: { label: 'Cancelled', color: 'gray' },
  PROBLEM: { label: 'Problem', color: 'red' },
};

const sum = (values: (number | null | undefined)[] = []) =>
  values.reduce<number>((total, value) => total + (Number.isFinite(value) ? (value as number) : 0), 0);

const liability = (value?: number | null) =>
  typeof value === 'number' && Number.isFinite(value) ? round(-value) : null;

const round = (value: number) => Math.round(value * 100) / 100;
