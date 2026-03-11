import { OrderStatus, ProductCategory } from '@prisma/client';
import type { RadixColor } from '@/types/radix-ui';
import { DOMElement } from 'react';

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

export const productCategoryMetaData: Record<
  ProductCategory,
  { label: string; color: RadixColor; icon?: React.ReactNode }
> = {
  beer: { label: 'Beer', color: 'orange' },
  cider: { label: 'Cider', color: 'yellow' },
  liquor: { label: 'Liquor', color: 'purple' },
  mead: { label: 'Mead', color: 'orange' },
  wine: { label: 'Wine', color: 'red' },
  canned_cocktail: { label: 'Canned Cocktail', color: 'blue' },
  flavored_alcohol: { label: 'Flavored Alcohol', color: 'green' },
  liqueur: { label: 'Liqueur', color: 'pink' },
  merchandise: { label: 'Merchandise', color: 'gray' },
  multi_pack: { label: 'Multi-Pack', color: 'cyan' },
  non_alcoholic_beverage: { label: 'Non-Alcoholic Beverage', color: 'teal' },
  other_alcohol: { label: 'Other Alcohol', color: 'indigo' },
  other_any: { label: 'Other/Any', color: 'gray' },
  sake: { label: 'Sake', color: 'yellow' },
};
