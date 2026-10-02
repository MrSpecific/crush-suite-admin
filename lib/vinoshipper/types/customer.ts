// Copied from crush-suite/shared_types/vinoshipper.customer.types.ts — keep in sync.

export type VinoshipperCustomerListItem = {
  id: number;
  email: string | null;
  primaryPhone: {
    number: string | null;
    country: string | null;
    extension: string | null;
  } | null;
  firstName: string | null;
  lastName: string | null;
  memberships: VinoshipperMembership[];
  clubMember: boolean;
  clubsOnHold: boolean;
  creditCard: null;
};

export type VinoshipperCustomerList = VinoshipperCustomerListItem[];

export type VinoshipperCustomer = {
  id: number;
  firstName?: string;
  lastName: string;
  email: string | null;
  primaryPhone: {
    number: string | null;
    country: string | null;
    extension: string | null;
  } | null;
  dateOfBirth: {
    day: number;
    month: number;
    year: number;
  } | null;
  shippingAddress: VinoshipperCustomerShippingAddress;
  optedIntoMarketingEmails: boolean;
  clubMember: boolean | null;
  memberships: VinoshipperCustomerClub[];
};

export type VinoshipperCustomerShippingAddress = {
  id: number;
  firstName: string;
  lastName: string;
  street1: string | null;
  street2: string | null;
  city: string | null;
  postalCode: string | null;
  stateCode: string | null;
  country: string | null; // eg CA
  accessPoint: string | null;
  description: string | null;
  suspectedPOBox: boolean;
  phoneNumber: unknown | null;
  poBox: boolean;
  linkedAddress: number | null;
} | null;

export type VinoshipperCustomerClub = {
  club: {
    id: number;
    name: string;
    description: string;
    pickupEnabled: boolean;
    pickupRequiresAddress: boolean;
    pickupOnly: boolean;
    giftEnabled: boolean;
    giftReleaseOptions: null[];
    private: boolean;
    archived: boolean;
    preorder: boolean;
  };
  producer: {
    id: number;
    name: string;
    description: string;
    type: string;
    imageUrl: string;
    website: string;
    searchKey: string;
    enableGift: boolean;
  };
  id: number;
  description: string;
  shippingAddress: VinoshipperCustomerShippingAddress;
  pickup: boolean;
  clubId: number;
  clubName: string;
  gift: null;
  releasesRemaining: null;
  hold: boolean;
  title: string;
  holdStartDate: null;
  holdEndDate: null;
  dateJoined: string;
};

export type VinoshipperMembership = {
  id: number;
  clubId: number;
  clubName: string;
  dateJoined: string | null;
  shippingAddress: {
    id: number;
    salutation: null;
    firstName: string | null;
    lastName: string | null;
    businessName: null;
    fullName: string | null;
    street1: string | null;
    street2: null | string;
    city: string | null;
    postalCode: string | null;
    stateCode: string | null;
    country: "US";
    phoneNumber: string | null;
    phone: {
      number: string | null;
      country: null;
      extension: null;
    };
    accessPoint: null;
    description: null;
    suspectedPOBox: false;
    poBox: false;
    linkedAddress: null;
  };
  pickup: boolean;
  gift: null;
  releasesRemaining: null;
  hold: boolean;
  holdStartDate: null;
  holdEndDate: null;
  holdReason: null;
  skipLimit: {
    skipLimitEnabled: false;
    releasesSkipped: 0;
    ignoreSkipLimit: false;
    skipLimitOverridden: false;
    skipsRemaining: 0;
    canSkip: true;
  };
  profileUpdateToken: null;
  shippingClass: null;
  memberEnrolledById: number | null;
  memberEnrolledByName: string | null;
  memberDeactivatedById: null;
  title: string;
  description: string | null;
};
