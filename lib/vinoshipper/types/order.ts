// Copied from crush-suite/shared_types/vinoshipper.order.types.ts — keep in sync.

export type CreateOrder = {
  customer: OrderCustomer;
  shipToAddress: CreateOrderShipTo | null;
  productIdType: "VS_ID";
  products: CreateOrderProduct[];
  shippingRate: CreateOrderShippingRate;
  taxes: number;
  disableCustomerNotifications: boolean;
  paid: boolean;
  orderNumber: string;
  fees?: number;
  discount?: {
    productDiscount?: {
      type: "PERCENT" | "DOLLAR" | "FLAT_RATE" | "FREE";
      value: number;
      description?: string;
      appliedValue?: number;
    };
    shippingDiscount?: {
      type: "PERCENT" | "DOLLAR" | "FLAT_RATE" | "FREE";
      value: number;
      /**
       * Only applicable to dollar or flat rate discounts
       */
      perPackage: boolean;
    };
  };
  specialInstructions?: {
    producerNote: string | null;
    giftNote: string | null;
    /**
     * Format YYYY-MM-dd
     */
    shipDate: string | null;
  };
  /**
   * Free-form key/value metadata VS stores against the order and echoes back
   * on the order response. Values must be strings.
   */
  metaFields?: Record<string, string>;
};

export type CreateOrderShippingRate = {
  carrier: "UPS" | "FEDEX" | "GLS" | "SELF";
  rateCode: string;
  price?: string;
};

/**
 * Vinoshipper POST /api/v3/p/orders/estimate-taxes
 * https://developer.vinoshipper.com/reference/estimatetaxes
 */
export type EstimateTaxesRequest = {
  shipToAddress: {
    street1: string;
    street2?: string;
    city: string;
    stateCode: string;
    postalCode: string;
    country: string; // "US"
  };
  productIdType: "SKU" | "VS_ID";
  products?: { productId: string; quantity: number; price?: number }[];
  shippingRate?: {
    rateCode: string;
    carrier?: "UPS" | "FEDEX" | "GLS" | "SELF" | null;
    price?: number | null;
    rateDescription?: string | null;
  };
};

export type EstimateTaxesResponse = {
  products?: unknown[];
  shipping?: unknown;
  extraFees?: unknown[];
  extraFeesTotal: number;
  taxesTotal: number;
  taxesTotalWithoutFees?: number;
  // The jurisdiction names and reporting codes come back as null rather than
  // absent when VS has no value for them (observed on live responses), so
  // these are nullable, not merely optional.
  taxes?: {
    state?: string | null;
    stateTaxRate?: number;
    stateTaxes?: number;
    county?: string | null;
    countyTaxRate?: number;
    countyTaxes?: number;
    city?: string | null;
    cityTaxRate?: number;
    cityTaxes?: number;
    otherTaxRate?: number;
    otherTaxes?: number;
    customStateTaxes?: number;
    countyReportingCode?: string | null;
    cityReportingCode?: string | null;
  };
};

export type PICKUP_RATE_CODE = "PCKP";
export type LOCAL_DELIVERY_RATE_CODE = "LOCAL";

export type CreateOrderProduct = {
  productId: string;
  quantity: number;
  price?: number;
};

export type CreateOrderShipTo = {
  street1: string;
  street2?: string;
  city: string;
  postalCode: string;
  stateCode: string;
  country: "US";
  firstName: string;
  lastName: string;
  phone: {
    number: string;
    country: number;
  };
  upsAccessPointId?: string; // Optional, only if the order is a pickup order
};

/**
 * Vinoshipper's order, as returned by POST /api/v3/p/orders.
 *
 * ## Reading the money fields
 *
 * The response mixes figures we *submitted* with figures VS *computed*, and
 * the two are easy to confuse. Verified against live create-order responses:
 *
 * | field                | is                                            |
 * |----------------------|-----------------------------------------------|
 * | `taxesTotal`         | an echo of the `taxes` we submitted           |
 * | `taxes.*`            | VS's own computed sales tax                   |
 * | `taxesAdjusted`      | submitted minus VS-computed (negative = short)|
 * | `extraFees[]`        | VS's own computed fees, e.g. California CRV   |
 * | `extraFeesAdjusted`  | submitted `fees` minus VS-computed fees       |
 * | `total`              | includes the `fees` we submitted, 1:1         |
 * | `platformCharges`    | what VS bills the merchant, independent of    |
 * |                      | anything we submit                            |
 *
 * Two traps in there:
 *
 * 1. `extraFeesTotal` is **not** usable here — it stays 0 whatever we submit
 *    and whatever VS computes. Sum `extraFees[]` for VS's figure. Note this
 *    differs from `EstimateTaxesResponse.extraFeesTotal`, which *does* carry
 *    VS's computed fees. Same name, different meaning per endpoint.
 * 2. `taxesTotal` looks like a computed total but is our own number handed
 *    back. VS's tax lives in `taxes.*` (and per line on `products[].taxes`
 *    and `shipping.taxes`); all three reconcile to the same figure.
 *
 * Note `platformCharges.taxExcise` — VS states excise explicitly, and it is
 * 0: they compute no excise anywhere in this API. It is wrapped into their
 * merchant fees.
 */
export type VinoshipperOrder = {
  orderNumber: string;
  cartType?: string;
  sourceUrl: string | null;
  status: VinoshipperOrderStatus;
  orderStatus: VinoshipperOrderStatusOfOrder;
  customer: OrderCustomer;
  shipToAddress: OrderShipTo;
  products: OrderProduct[];
  productDiscount?: number;
  shippingDiscount?: number;
  packs?: Pack[];
  shipping: OrderShipping;
  packaging?: number;
  tipAmount?: number;
  extraFee?: number;
  /** VS's computed fees, itemised. Duplicates `extraFees`. */
  extraFeeDetails?: OrderExtraFee[];
  /**
   * Observed as 0 on create-order regardless of what is submitted or
   * computed — sum `extraFees` instead. See the table above.
   */
  extraFeesTotal: number;
  /** VS's own computed fees. */
  extraFees: OrderExtraFee[];
  /** Submitted `fees` minus VS's computed fees. */
  extraFeesAdjusted?: number;
  /** VS's own computed sales tax, by jurisdiction. */
  taxes: OrderTax;
  /** An echo of the `taxes` we submitted — NOT VS's calculation. */
  taxesTotal: number;
  /** Submitted `taxes` minus VS's computed tax. Negative = under-collected. */
  taxesAdjusted?: number;
  total: number;
  /** What the merchant owes VS. Unaffected by what we submit. */
  platformCharges?: OrderPlatformCharges;
  specialInstructions: {
    producerNote: string | null;
    giftNote: string | null;
    shipDate: Date | null; //the date the shipment should be hold until
    wineryNote?: string | null;
  };
  orderProblems: {
    code: string;
    description: string;
    type: string;
  }[];
  isCompliant: boolean;
  ageVerification?: {
    verified: boolean;
    idScanUrl: string | null;
  };
  purchasedAt?: string | null;
  canceledAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  cancelReason?: string | null;
  paymentMethod?: string | null;
  paymentMethodDisplayName?: string | null;
  store?: {
    id: number;
    name: string;
  };
  saleLocation?: {
    name: string;
    address: OrderShipTo;
  };
  metaFields?: Record<string, unknown>;
};

export type OrderExtraFee = {
  label: string;
  amount: number;
  description?: string | null;
};

/**
 * What VS bills the merchant for this order. Negative values are charges.
 *
 * `taxSales` is the real sales-tax liability VS will remit — charged to the
 * merchant whether or not that much was collected from the buyer, which is
 * why a negative `taxesAdjusted` is money the merchant absorbs.
 */
export type OrderPlatformCharges = {
  fundsReceived: number;
  creditCardFee: number;
  pickPackFee: number;
  vinoshipperFee: number;
  shipping: number;
  /** Always 0 — VS computes no excise in this API. */
  taxExcise: number;
  taxSales: number;
  stateFees: number;
  amountDue: number;
};

type Pack = {
  productId: number;
  productName: string;
  sku: string;
  upc: string;
  productTaxonomy: null | string;
  quantity: number;
  price: number;
  discount: number;
};

type OrderProduct = {
  packProductId?: number | null;
  productId: number;
  productName?: string;
  productVintage?: string | null;
  productTaxonomy?: {
    id: number;
    externalId: string;
    displayName: string;
    sortOrder: number;
  } | null;
  sku: string;
  upc: string;
  category: string;
  quantity: number;
  price: number;
  discount: number;
  alcoholPercentage: number;
  /** VS's computed tax for this line. These sum to `taxes.*`. */
  taxes: {
    taxRate: number;
    taxableValue: number;
    taxes: number;
  };
  cogs?: number | null;
  grossCogs?: number | null;
};

/**
 * VS's computed sales tax split by jurisdiction. The rates sum to the rate
 * applied on each line, and the amounts sum to `platformCharges.taxSales`.
 *
 * Jurisdiction names and reporting codes come back as null when VS has no
 * value for them — observed on live responses.
 */
export type OrderTax = {
  county: string | null;
  countyTaxRate: number;
  countyReportingCode: string | null;
  countyTaxes: number;
  city: string | null;
  cityTaxRate: number;
  cityReportingCode: string | null;
  cityTaxes: number;
  state: string | null;
  stateTaxRate: number;
  stateTaxes: number;
  otherTaxRate: number;
  otherTaxes: number;
  customStateTaxes?: number;
};

export type OrderShipTo = {
  id: number | null;
  salutation: string | null; // The salutation, first, and last name combined
  firstName: string | null;
  lastName: string | null;
  fullName?: string | null;
  businessName: string | null;
  street1: string;
  street2: string | null;
  city: string;
  postalCode: string;
  stateCode: string;
  country: string; // Two letter country code
  phoneNumber?: string | null;
  phone: {
    number: string;
    country: number | null;
    extension: string | null;
  };
  accessPoint: AccessPoint | null;
  description: string | null;
  suspectedPOBox: boolean;
  poBox: boolean;
  linkedAddress: object | null;
};

export type AccessPoint = {
  id: number;
  locationId: string;
  lat: number;
  lng: number;
  imageUrl: string | null;
  hours: string | null;
  note: string | null;
  businessName: string;
  street1: string;
  street2: string;
  city: string;
  postalCode: string;
  stateCode: string;
  country: string;
  phoneNumber: null | string;
};

export type OrderDOB = {
  day: number;
  month: number;
  year: number;
};

export type OrderCustomer = {
  email: string;
  firstName: string;
  lastName: string;
  address: {
    street1: string;
    street2?: string | null;
    city: string;
    postalCode: string;
    stateCode: string;
  };
  dateOfBirth: OrderDOB;
  wholesale?: boolean;
  company?: null;
  id?: null;
  fullName?: string | null;
};

type OrderShipping = {
  carrier: "UPS";
  rateCode: string;
  price: number | null;
  rateDescription: string | null;
  taxes: {
    taxRate: number;
    taxableValue: number;
    taxes: number;
  };
  packages?: OrderPackage[];
};

type OrderPackage = {
  trackingNumber: string;
  box: {
    weight: {
      lbs: number;
    };
    dimensions: {
      widthInches: number;
      heightInches: number;
      depthInches: number;
    };
  };
};

export type VinoshipperOrderStatus =
  | "PENDING"
  | "SUCCESS"
  | "AGE_VERIFICATION_FAILED"
  | "AGE_VERIFICATION_LOCKED"
  | "DELETED"
  | "PROBLEM"
  | "PAYMENT_AUTHORIZED"
  | "PAYMENT_CAPTURE_FAILED";
export type VinoshipperOrderStatusOfOrder =
  | "OPEN"
  | "LABELS_GENERATED"
  | "SHIPPED"
  | "RETURNED"
  | "DELIVERED"
  | "PICKED_UP"
  | "CANCELLED"
  | "UNPAID"
  | "PROBLEM"
  | "NEW_MEMBER";

type ProductIdType = "SKU" | "VS_ID";

export type OrderCreateProduct = {
  productId: string;
  quantity: number;
  price?: number;
};

export type OrderCreateShipTo = {
  firstName: string;
  lastName: string;
  businessName?: string;
  street1: string;
  street2?: string;
  city: string;
  postalCode: string;
  stateCode: string;
  country: string;
  phone: {
    number: string;
  };
};

export type OrderCheckCompliance = {
  customer: OrderCustomer;
  shipToAddress: OrderCreateShipTo;
  productIdType: ProductIdType;
  products: OrderCreateProduct[];
};
