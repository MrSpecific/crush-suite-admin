'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import * as Form from '@radix-ui/react-form';
import { Box, Button, Grid, CheckboxGroup, Flex } from '@radix-ui/themes';
import { FormField } from '@/app/components/forms';
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton';
import { upsertAPIKey, UpsertAPIKeyProps } from '@/app/api-keys/server/upsertAPIKey';
import { FormWarning } from '../components/FormWarning';
import { FormLabel } from '../components/forms/FormLabel';

export const APIKeyForm = ({
  apiKey = null,
  onComplete = () => {},
  after,
}: {
  apiKey?: any;
  onComplete?: Function;
  after?: string;
}) => {
  const router = useRouter();
  const [formState, setformState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    setformState('loading');
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const data = Object.fromEntries(formData) as unknown as UpsertAPIKeyProps;

    const result = await upsertAPIKey({ ...data });

    if (!result.success) {
      setformState('error');
      setErrorMessage(result.message);
      return result;
    }

    onComplete(result);

    if (after) {
      router.push(after);
    } else {
      router.push(`/api-keys/${result?.apiKey?.id}`);
    }

    return result;
  };

  if (formState === 'loading') return <LoadingSkeleton />;

  return (
    <>
      {formState === 'error' && <FormWarning variant="error">{errorMessage}</FormWarning>}
      <Form.Root
        onSubmit={async (event) => {
          const result = await handleSubmit(event);
          onComplete(result);
        }}
      >
        <input type="hidden" name="id" value={apiKey?.id} />

        <Flex direction="column" gap="2">
          <FormField
            name="privateKey"
            label="Private Key"
            defaultValue={apiKey?.privateKey}
            type="text"
            required
            messages={{ valueMissing: 'Private Key is required' }}
          />
          <FormField
            name="sandboxKey"
            label="Sandbox Key"
            defaultValue={apiKey?.value}
            type="text"
            required
            messages={{ valueMissing: 'Value is required' }}
          />
          <FormField
            name="limit"
            label="Limit"
            defaultValue={apiKey?.limit ?? 60}
            type="number"
            required
          />
          <FormField
            name="merchantId"
            label="Merchant ID"
            defaultValue={apiKey?.merchantId}
            type="number"
            required
          />

          <FormLabel label="Scopes" required>
            <CheckboxGroup.Root
              name="scopes"
              defaultValue={apiKey?.scopes ?? []}
              required
              // messages={{ valueMissing: 'At least one scope is required' }}
            >
              <CheckboxGroup.Item value="read:products">Read Products</CheckboxGroup.Item>
              <CheckboxGroup.Item value="write:products">Write Products</CheckboxGroup.Item>
            </CheckboxGroup.Root>
          </FormLabel>
        </Flex>

        {/* <Grid columns={{ initial: '1', md: '2' }} gap="2">

        </Grid> */}

        <Form.Submit asChild>
          <Button mt="3" size="3">
            Save API Key
          </Button>
        </Form.Submit>
      </Form.Root>
    </>
  );
};
