// Copied from crush-suite/shared_types/vinoshipper.product.types.ts — keep in sync.

import { VinoshipperNotAvailableInState } from "./general";

export type VinoshipperProductPriceMeta = {
  increments: number;
  minOrder: number;
  maxOrder: null | number;
  moqUnits: number;
  caseSize: number;
  msrp: number;
  excludeFromMinOrderQty: boolean;
};

export type VinoshipperProductAlcoholMeta = {
  vintage: string;
  abv: number;
  type: "white" | "red" | "rose" | string;
  varietal: string;
  bottleSize: {
    units: number;
    ml: number;
    desc: string;
  };
  winemakerNote: string;
};

export type VinoshipperProductCategory =
  | "Wine"
  | "Merchandise"
  | "Multi-Pack"
  | "Beverage (Taxable)"
  | "Beer"
  | "Cider";

export type VinoshipperProductWeight = {
  lbs: number;
};

export type VinoshipperProductFeedProduct = {
  id: number;
  name: string;
  desc: string;
  img: string;
  inventory: number;
  price: number;
  pack: boolean;
  alcohol: boolean;
  productCategory: VinoshipperProductCategory;
  priceMeta: VinoshipperProductPriceMeta;
  alcoholMeta: VinoshipperProductAlcoholMeta;
  notAvailableIn: VinoshipperNotAvailableInState[] | [];
  sku: string;
  memberOnly?: boolean;
  weight?: VinoshipperProductWeight;
};

export type VinoshipperProductFeedProducer = {
  id: number;
  name: string;
  img: string;
  website: string;
  allowsPickup: boolean;
  allowsLocalDelivery: boolean;
  minimumOrderQuantity: number;
};

export type VinoshipperProductFeedState = {
  abbr: string;
  name: string;
};

export type VinoshipperProductFeed = {
  producer: VinoshipperProductFeedProducer;
  products: VinoshipperProductFeedProduct[];
  states: VinoshipperProductFeedState[];
};
