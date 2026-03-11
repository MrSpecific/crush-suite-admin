import type { ComponentProps as ReactComponentProps } from 'react';
import { Profile, Session } from 'next-auth';
import type { Header } from '@/app/components/DataTable';

export {};

declare global {
  interface Window {
    clipboardData: any;
  }

  type PromiseReturnType<T> = T extends PromiseLike<infer U> ? U : T;

  type FullSession = Session & {
    givenName?: string;
    familyName?: string;
  };
  type MaybeSession = FullSession | null;

  type PickOptional<T, RequiredKeys extends keyof T, OptionalKeys extends keyof T> = Pick<
    T,
    RequiredKeys
  > &
    Partial<Pick<T, OptionalKeys>>;

  type PickRequiredOptional<T, RequiredKeys extends keyof T, OptionalKeys extends keyof T> = Pick<
    T,
    RequiredKeys
  > &
    Partial<Pick<T, OptionalKeys>>;

  type SomeRequired<T, RequiredKeys extends keyof T> = Pick<T, RequiredKeys> &
    Partial<Omit<T, RequiredKeys>>;

  type SomeOptional<T, OptionalKeys extends keyof T> = Omit<T, OptionalKeys> &
    Partial<Pick<T, OptionalKeys>>;

  type ValidityState =
    | 'valueMissing'
    | 'typeMismatch'
    | 'patternMismatch'
    | 'tooLong'
    | 'tooShort'
    | 'rangeUnderflow'
    | 'rangeOverflow'
    | 'stepMismatch'
    | 'badInput'
    | 'customError'
    | 'valid';

  type FormState = 'idle' | 'loading' | 'success' | 'error';

  type FieldToHeader<T> = {
    [K in keyof T]: {
      id?: K;
    } & Omit<Header, 'id'>;
  }[keyof T];

  type ElementType<T extends any[]> = T extends (infer U)[] ? U : never;

  type QueryToHeader<T> = FieldToHeader<ElementType<T>>;

  type PageSearchParams = { [key: string]: string | string[] | undefined };

  type ComponentProps<T> = ReactComponentProps<T>;

  type FormBoolean = boolean | string | null;
}
