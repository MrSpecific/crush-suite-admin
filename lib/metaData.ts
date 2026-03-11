import { OrderStatus } from '@prisma/client';
import type { RadixColor } from '@/types/radix-ui';

export const orderStatusMetaData: Record<OrderStatus, { label: string; color: RadixColor }> = {
  CANCELLED: { label: 'Cancelled', color: 'gray' },
  COMPLETED: { label: 'Completed', color: 'green' },
  DELIVERED: { label: 'Delivered', color: 'blue' },
  ERROR: { label: 'Error', color: 'red' },
  NONCOMPLIANT: { label: 'Non-Compliant', color: 'orange' },
  OPEN: { label: 'Open', color: 'yellow' },
  PROCESSING: { label: 'Processing', color: 'yellow' },
  SHIPPED: { label: 'Shipped', color: 'blue' },
  USER_OVERRIDE: { label: 'User Override', color: 'purple' },
};
