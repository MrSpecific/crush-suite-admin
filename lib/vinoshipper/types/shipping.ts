// Copied from crush-suite/shared_types/vinoshipper.shipping.types.ts — keep in sync.

export type VinoshipperOrderEstimatedShippingRates = {
  rates: {
    carrier: "UPS";
    rateCode: string;
    price: number;
    rateDescription: string;
  }[];
};

export type VinoshipperGetEstimatedShippingRates = {
  shipToAddress: {
    street1: string;
    street2: string;
    city: string;
    postalCode: string;
    stateCode: string;
    country: string;
  };
  productIdType: "VS_ID";
  products: {
    productId: string;
    quantity: string;
  }[];
};

export type UPSAccessPoint = {
  id: number;
  locationId: string;
  lat: number;
  lng: number;
  imageUrl: string | null;
  hours: string | null;
  note: string;
  businessName: string;
  street1: string;
  street2: string;
  city: string;
  postalCode: string;
  stateCode: string;
  country: string;
  phoneNumber: string;
};

export type UPSGetAccessPointAddress = {
  street1: string;
  city: string;
  stateCode: string;
  postalCode: string;
  country: string;
};
