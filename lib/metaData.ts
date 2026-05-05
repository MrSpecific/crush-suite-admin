import { OrderStatus, ProductCategory, AppIssueType } from '@prisma/client';
import type { RadixColor } from '@/types/radix-ui';
import { DOMElement } from 'react';
import type { ClubStatus, ClubType, Status as ClubsMerchantStatus, MerchantEmailType } from '../generated/prisma/clubs';

type EnumMetaData = {
  label: string;
  color: RadixColor;
  description?: string;
};

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

export const clubTypeMetaData: Record<ClubType, EnumMetaData> = {
  release: {
    label: 'Release',
    color: 'blue',
    description: 'Traditional release-based club',
  },
  bundle_subscription: {
    label: 'Bundle Subscription',
    color: 'purple',
    description: 'Recurring subscription with bundle selections',
  },
};

export const clubStatusMetaData: Record<ClubStatus, EnumMetaData> = {
  draft: {
    label: 'Draft',
    color: 'gray',
    description: 'Not published to customers',
  },
  published: {
    label: 'Published',
    color: 'green',
    description: 'Live and visible to customers',
  },
  archived: {
    label: 'Archived',
    color: 'orange',
    description: 'No longer active',
  },
};

export const appIssueTypeMetaData: Record<AppIssueType, EnumMetaData> = {
  PRODUCTS: { label: 'Products', color: 'blue' },
  CUSTOMERS: { label: 'Customers', color: 'purple' },
  ORDERS: { label: 'Orders', color: 'orange' },
  COMPLIANCE_PRODUCTS: { label: 'Compliance Products', color: 'red' },
};

export const merchantEmailTypeMetaData: Record<MerchantEmailType, EnumMetaData> = {
  WELCOME: { label: 'Welcome', color: 'green' },
  CUSTOMIZATION_OPENING: { label: 'Customization Opening', color: 'blue' },
  CUSTOMIZATION_CLOSING: { label: 'Customization Closing', color: 'orange' },
  CUSTOMIZATION_CLOSED: { label: 'Customization Closed', color: 'gray' },
  RELEASE_CLOSING: { label: 'Release Closing', color: 'orange' },
  RELEASE_SUMMARY: { label: 'Release Summary', color: 'purple' },
};

export const clubsMerchantStatusMetaData: Record<ClubsMerchantStatus, EnumMetaData> = {
  READY: {
    label: 'Ready',
    color: 'green',
    description: 'App installed and fully configured',
  },
  INSTALLED: {
    label: 'Installed',
    color: 'orange',
    description: 'App installed but setup not complete',
  },
  REMOVED: {
    label: 'Removed',
    color: 'gray',
    description: 'App uninstalled',
  },
  ERROR: {
    label: 'Error',
    color: 'red',
    description: 'App encountered an error',
  },
  MODULE_APP_INSTALLED: {
    label: 'Module Installed',
    color: 'blue',
    description: 'Module app installed',
  },
};
