import type { Prisma } from '@/generated/prisma/clubs';
import type { RadixColor } from '@/types/radix-ui';

// Release order status isn't stored, it's derived from the order's fields. Each
// filter here must agree with getReleaseOrderStatus below.
export const releaseOrderStatusWhere: Record<string, Prisma.ReleaseOrderWhereInput> = {
  pending: { skippedAt: null, closedOutAt: null, platformOrderId: null, preProcessingError: false },
  blocked: { skippedAt: null, closedOutAt: null, platformOrderId: null, preProcessingError: true },
  ordered: { skippedAt: null, closedOutAt: null, platformOrderId: { not: null } },
  refunded: { closedOutAt: null, skippedAt: null, platformOrderId: { not: null }, refundedAmount: { gt: 0 } },
  skipped: { closedOutAt: null, skippedAt: { not: null } },
  closed_out: { closedOutAt: { not: null } },
};

export const releaseOrderStatusOptions = [
  { label: 'Pending', value: 'pending' },
  { label: 'Blocked', value: 'blocked' },
  { label: 'Ordered', value: 'ordered' },
  { label: 'Refunded', value: 'refunded' },
  { label: 'Skipped', value: 'skipped' },
  { label: 'Closed Out', value: 'closed_out' },
];

export const releaseOrderStatusSelect = {
  skippedAt: true,
  closedOutAt: true,
  platformOrderId: true,
  preProcessingError: true,
  refundedAmount: true,
} satisfies Prisma.ReleaseOrderSelect;

export const getReleaseOrderStatus = (order: {
  skippedAt: Date | null;
  closedOutAt: Date | null;
  platformOrderId: string | null;
  preProcessingError: boolean;
  refundedAmount: number;
}): { label: string; color: RadixColor } => {
  if (order.closedOutAt) return { label: 'Closed Out', color: 'red' };
  if (order.skippedAt) return { label: 'Skipped', color: 'gray' };
  if (order.platformOrderId && order.refundedAmount > 0) return { label: 'Refunded', color: 'purple' };
  if (order.platformOrderId) return { label: 'Ordered', color: 'green' };
  if (order.preProcessingError) return { label: 'Blocked', color: 'amber' };
  return { label: 'Pending', color: 'orange' };
};
