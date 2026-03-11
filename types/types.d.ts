/* eslint-disable no-unused-vars */
/* eslint-disable no-use-before-define */
import { Profile, Session } from 'next-auth';

import { Organization, Dataset } from '@prisma/client';

export * from '@prisma/client';

export { Profile, Session };

export type Maybe<T> = T | null | undefined;

export type OrganizationWithDataset = Organization & {
  dataset?: Maybe<Dataset>;
};

export type UnauthorizedError = {
  error: 'Unauthorized';
};

export type Action<T extends any[], R> = (...args: T) => R;

export type ButtonAction = {
  text: string;
  onClick: Action<any[], Promise<void> | void>;
};

export type Autocomplete =
  | 'given-name'
  | 'family-name'
  | 'address-line1'
  | 'address-line2'
  | 'address-level1'
  | 'address-level2'
  | 'address-level3'
  | 'address-level4'
  | 'country'
  | 'postal-code'
  | 'tel'
  | 'email'
  | 'bday';
