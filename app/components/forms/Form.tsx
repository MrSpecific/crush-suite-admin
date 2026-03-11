'use client';
import { useFormState } from 'react-dom';
import { redirect } from 'next/navigation';
import * as RadixForm from '@radix-ui/react-form';
import { FormField, type FormFieldProps } from './FormField';
export type { FormFieldProps } from './FormField';
import { SubmitButton } from './SubmitButton';
import { Flex } from '@radix-ui/themes';
import { useEffect } from 'react';

export type FormActionResult = {
  status: 'success' | 'error' | 'pending' | 'idle';
  message: string;
  data?: { [key: string]: any };
};

const initialState: FormActionResult = {
  status: 'idle',
  message: '',
  data: undefined,
};

type FormProps = {
  action: any;
  fields: FormFieldProps[];
  submitLabel?: string;
  onSuccess?: (data: any) => void;
  redirectTo?: string | ((data: any) => string);
  defaults?: { [key: string]: any };
};

export const Form = ({
  action,
  fields,
  submitLabel = 'Submit',
  onSuccess,
  redirectTo,
}: FormProps) => {
  const [state, formAction] = useFormState(action, initialState);

  useEffect(() => {
    console.log('State change', state?.status, state?.message);

    if (state.status === 'success') {
      console.log('Success', state.data, typeof redirectTo);
      // Run onSuccess callback
      if (typeof onSuccess === 'function') {
        console.log('run onSuccess');
        onSuccess(state.data);
      }

      // Redirect to another page
      if (typeof redirectTo === 'string') {
        console.log('redirectTo string');
        redirect(redirectTo);
      } else if (typeof redirectTo === 'function') {
        console.log('redirectTo function');
        redirect(redirectTo(state.data));
      }
    }
  }, [state, onSuccess, redirectTo]);

  return (
    <RadixForm.Root className="FormRoot" action={formAction}>
      {/* {JSON.stringify(state)} */}
      {fields.map((field) => (
        <FormField key={field.name} {...field} />
      ))}
      <Flex mt="4" gap="2">
        <RadixForm.Submit asChild>
          <SubmitButton label={submitLabel} />
        </RadixForm.Submit>
      </Flex>
      {state.message}
    </RadixForm.Root>
  );
};
