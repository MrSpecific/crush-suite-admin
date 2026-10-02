// Copied from crush-suite/shared_types/vinoshipper.merchant.types.ts — keep in sync.

export type VinoshipperProfile = {
  id: number;
  name: string;
  img: URL;
  website: URL;
  allowsPickup: boolean;
  allowsLocalDelivery: boolean;
  enabledShippingClasses: ShippingClass[];
  minimumOrderQuantity: number;
};

export type ShippingClass = {
  shippingClassCode: string;
  shippingClassName: string;
};
