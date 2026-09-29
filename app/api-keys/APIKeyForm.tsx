'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import * as Form from '@radix-ui/react-form';
import { Box, Button, Grid, CheckboxGroup, Flex } from '@radix-ui/themes';
import { ComboboxInput, FormField, type ComboboxOption } from '@/app/components/forms';
import { upsertAPIKey, UpsertAPIKeyProps } from '@/app/api-keys/server/upsertAPIKey';
import { FormWarning } from '../components/FormWarning';
import { FormLabel } from '../components/forms/FormLabel';
import { apiKeyScopes } from './scopes';
import { GeneratedKeyField } from './GeneratedKeyField';

export const APIKeyForm = ({
  apiKey = null,
  merchantOptions,
  onComplete = () => {},
  after,
}: {
  apiKey?: any;
  merchantOptions: ComboboxOption[];
  onComplete?: Function;
  after?: string;
}) => {
  const router = useRouter();
  const [formState, setformState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (formState === 'loading') return;
    setformState('loading');

    const formData = new FormData(event.currentTarget);

    const data = Object.fromEntries(formData) as unknown as UpsertAPIKeyProps;
    const scopes = formData.getAll('scopes') as string[];

    // Validated here rather than with `required`, which Radix applies to every checkbox
    if (scopes.length === 0) {
      setformState('error');
      setErrorMessage('At least one scope is required');
      return { success: false, message: 'At least one scope is required' };
    }

    let result;
    try {
      result = await upsertAPIKey({
        ...data,
        id: data.id || undefined,
        limit: Number(formData.get('limit')),
        merchantId: Number(formData.get('merchantId')),
        scopes,
      });
    } catch (error) {
      console.error(error);
      result = { success: false, message: 'Error saving API Key. Please try again.' };
    }

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

  return (
    <>
      {formState === 'error' && <FormWarning variant="error">{errorMessage}</FormWarning>}
      {/* Kept mounted while saving so entered values survive a failed save */}
      <Form.Root onSubmit={handleSubmit}>
        <input type="hidden" name="id" value={apiKey?.id} />

        <Flex direction="column" gap="2">
          <GeneratedKeyField
            name="privateKey"
            label="Private Key"
            prefix="pk_"
            defaultValue={apiKey?.privateKey}
            required
            messages={{ valueMissing: 'Private Key is required' }}
          />
          <GeneratedKeyField
            name="sandboxKey"
            label="Sandbox Key"
            prefix="sk_"
            defaultValue={apiKey?.sandboxKey}
            required
            messages={{ valueMissing: 'Sandbox Key is required' }}
          />
          <FormField
            name="limit"
            label="Rate Limit (requests per minute)"
            description={
              <>
                Most requests this key can make per minute. Anything over the limit gets a 429
                with a Retry-After header until the minute resets.
                <br />
                <strong>Suggested:</strong> 60 for most integrations, 120–300 for a headless
                storefront calling live rates or compliance checks at checkout. For reference,
                our internal app-to-app traffic gets 600.
              </>
            }
            defaultValue={apiKey?.limit ?? 60}
            type="number"
            min={1}
            step={1}
            required
            messages={{ valueMissing: 'Rate limit is required' }}
          />
          <ComboboxInput
            name="merchantId"
            label="Merchant"
            options={merchantOptions}
            defaultValue={apiKey?.merchantId}
            placeholder="Search by name, shop, or ID"
            required
            messages={{ valueMissing: 'Merchant is required' }}
          />

          <FormLabel label="Scopes" required>
            <CheckboxGroup.Root name="scopes" defaultValue={apiKey?.scopes ?? []}>
              {apiKeyScopes.map(({ value, label }) => (
                <CheckboxGroup.Item key={value} value={value}>
                  {label}
                </CheckboxGroup.Item>
              ))}
            </CheckboxGroup.Root>
          </FormLabel>
        </Flex>

        {/* <Grid columns={{ initial: '1', md: '2' }} gap="2">

        </Grid> */}

        <Form.Submit asChild>
          <Button mt="3" size="3" loading={formState === 'loading'}>
            Save API Key
          </Button>
        </Form.Submit>
      </Form.Root>
    </>
  );
};
