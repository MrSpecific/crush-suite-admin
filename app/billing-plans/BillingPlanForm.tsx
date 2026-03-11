'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BillingPlan, BillingType, PerUseType, PerUseUnits } from '@prisma/client';
import * as Form from '@radix-ui/react-form';
import { Button, Grid, Heading, Box, Flex } from '@radix-ui/themes';
import { FormField, StringArrayInput } from '@/app/components/forms';
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton';
import { upsertBillingPlan, UpsertBillingPlanProps } from './server/upsertBillingPlan';

export const BillingPlanForm = ({
  billingPlan,
  // users = [],
  onComplete = () => {},
  after,
}: {
  billingPlan?: BillingPlan;
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

    const data = Object.fromEntries(formData) as unknown as UpsertBillingPlanProps;

    if (data.accessibleStores) {
      data.accessibleStores = (data.accessibleStores as unknown as string).split(',');
    }

    const result = await upsertBillingPlan({ ...data });

    if (!result.success) {
      setformState('error');
      setErrorMessage(result.message);
      return result;
    }

    onComplete(result);

    if (after) {
      router.push(after);
    } else {
      router.push(`/billing-plans`);
    }

    return result;
  };

  if (formState === 'loading') return <LoadingSkeleton />;

  return (
    <>
      <Form.Root
        onSubmit={async (event) => {
          const result = await handleSubmit(event);
          onComplete(result);
        }}
      >
        <input type="hidden" name="id" value={billingPlan?.id} />
        <Flex direction="column" gap="3">
          <FormField
            name="name"
            label="Name"
            required
            messages={{ valueMissing: 'Name is required' }}
            defaultValue={billingPlan?.name}
          />

          <Grid columns={{ initial: '1', md: '2' }} gap="2">
            <FormField
              name="description"
              label="Description"
              required
              messages={{ valueMissing: 'Description is required' }}
              defaultValue={billingPlan?.description ?? undefined}
            />
            <FormField name="notes" label="Notes" type="text" />
          </Grid>

          <Grid columns={{ initial: '1', md: '2' }} gap="2">
            <FormField
              name="trialDays"
              label="Trial Days"
              type="number"
              min={0}
              defaultValue={billingPlan?.trialDays || 0}
            />
            <FormField
              name="type"
              label="Type"
              type="select"
              defaultValue={billingPlan?.type}
              placeholder="Type"
              options={[
                {
                  label: 'Billing Type',
                  options: Object.values(BillingType).map((value) => ({ value, label: value })),
                },
              ]}
              required
            />
          </Grid>

          <Grid columns={{ initial: '1', md: '3' }} gap="2">
            <FormField
              name="price"
              label="Price ($)"
              description="(Whole number)"
              type="number"
              placeholder="Price"
              min={0}
              defaultValue={billingPlan?.price}
              required
            />
            <FormField
              name="perUsePrice"
              label="Per Use Price (%)"
              description="(As a decimal)"
              type="text"
              messages={{ typeMismatch: 'Must be a number' }}
              defaultValue={billingPlan?.perUsePrice}
            />
            <FormField
              name="perUseThreshold"
              label="Per Use Threshold ($)"
              description="Threshold when revenue sharing has been met (Whole number)"
              min={0}
              type="number"
              defaultValue={billingPlan?.perUseThreshold}
            />
          </Grid>

          <Grid columns={{ initial: '1', md: '4' }} gap="2">
            <FormField
              name="perUseCap"
              label="Per Use Cap ($)"
              description="Revenue sharing capped amount (no decimals)"
              min={0}
              type="number"
              defaultValue={billingPlan?.perUseCap}
            />
            <FormField
              name="perUseUnits"
              label="Per Use Units"
              description="% or Fixed"
              type="select"
              defaultValue={billingPlan?.perUseUnits || PerUseUnits.percent}
              placeholder="Units"
              messages={{ valueMissing: 'Per Use Units are required' }}
              options={[
                {
                  label: 'Per Use Units',
                  options: Object.values(PerUseUnits).map((value) => ({ value, label: value })),
                },
              ]}
              required
            />
            <FormField
              name="perUseTerms"
              label="Per Use Terms"
              description="eg. X % per month over Y USD. Capped at Z USD"
              type="text"
              defaultValue={billingPlan?.perUseTerms}
              required
            />
            <FormField
              name="perUseType"
              label="Per Use Type"
              type="select"
              defaultValue={billingPlan?.perUseType || 'transaction'}
              placeholder="Type"
              options={[
                {
                  label: 'Per Use Type',
                  options: Object.values(PerUseType).map((value) => ({ value, label: value })),
                },
              ]}
              required
            />
          </Grid>

          <Grid columns={{ initial: '1', md: '2' }} gap="2">
            <StringArrayInput
              name="accessibleStores"
              label="Accessible Stores"
              addButtonLabel="Add store"
              description="Stores that can access this plan (myshopify urls)"
              defaultValue={billingPlan?.accessibleStores?.join(',')}
            />
          </Grid>
        </Flex>

        {formState === 'error' && (
          <Box>
            <Heading as="h2" color="red">
              Error:
            </Heading>
            <pre>{errorMessage}</pre>
          </Box>
        )}

        <Form.Submit asChild>
          <Button mt="3" size="3">
            Save Plan
          </Button>
        </Form.Submit>
      </Form.Root>
    </>
  );
};
