'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DiscountType } from '@prisma/client';
import * as Form from '@radix-ui/react-form';
import { Box, Button, Grid } from '@radix-ui/themes';
import { FormField } from '@/app/components/forms';
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton';
import { upsertDiscount, UpsertDiscountProps } from '@/app/discounts/server/upsertDiscount';
import { FormWarning } from '../components/FormWarning';

export const DiscountForm = ({
  discount = null,
  onComplete = () => {},
  after,
}: {
  discount?: any;
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

    const data = Object.fromEntries(formData) as unknown as UpsertDiscountProps;

    const result = await upsertDiscount({ ...data });

    if (!result.success) {
      setformState('error');
      setErrorMessage(result.message);
      return result;
    }

    onComplete(result);

    if (after) {
      router.push(after);
    } else {
      router.push(`/discounts/${result?.discount?.id}`);
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
        <input type="hidden" name="id" value={discount?.id} />
        <FormField
          name="description"
          label="Description"
          defaultValue={discount?.description}
          type="text"
          required
          messages={{ valueMissing: 'Description is required' }}
          // tooltip="A name for this specific client, could be a department or the whole company"
          // defaultValue={lead?.name}
        />
        <FormField
          name="value"
          label="Value (Discount Code)"
          defaultValue={discount?.value}
          type="text"
          required
          messages={{ valueMissing: 'Value is required' }}
        />
        <FormField
          name="discountFixed"
          label="Discount (Fixed)"
          defaultValue={discount?.discountFixed}
          type="number"
          required
        />
        <FormField
          name="discountPercent"
          label="Discount (Percent)"
          defaultValue={discount?.discountPercent}
          type="number"
          required
        />
        <FormField
          name="discountType"
          label="Discount Type"
          defaultValue={discount?.discountType}
          type="select"
          placeholder="Type"
          options={[
            {
              label: 'Discount Type',
              options: Object.values(DiscountType).map((value) => ({ value, label: value })),
            },
          ]}
          required
        />
        <FormField
          name="durationIntervals"
          label="Duration Intervals"
          defaultValue={discount?.durationIntervals}
          type="number"
          required
        />

        {/* <Grid columns={{ initial: '1', md: '2' }} gap="2">

        </Grid> */}

        <Form.Submit asChild>
          <Button mt="3" size="3">
            Save Discount
          </Button>
        </Form.Submit>
      </Form.Root>
    </>
  );
};

export default DiscountForm;
