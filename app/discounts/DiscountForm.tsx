'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DiscountType } from '@prisma/client';
import * as Form from '@radix-ui/react-form';
import { Button, Grid } from '@radix-ui/themes';
import { FormField } from '@/app/components/forms';
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton';
import { upsertDiscount, UpsertDiscountProps } from '@/app/discounts/server/upsertDiscount';
import { FormWarning } from '../components/FormWarning';

// The database stores discountPercent as a fraction (0.15 === 15%), but it's
// far easier to type/read a whole-number percent. These helpers convert
// between the two so the UI shows "15" while the DB keeps "0.15".
const fractionToPercent = (fraction?: number | null) =>
  fraction != null ? Math.round(fraction * 100 * 100) / 100 : undefined;
const percentToFraction = (percent: number) => Math.round((percent / 100) * 10000) / 10000;

const DISCOUNT_TYPE_LABELS: Record<string, string> = {
  oneTime: 'One time',
  recurring: 'Recurring',
};

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

    // Convert the whole-number percent from the input back into the fraction
    // the database expects (e.g. 15 -> 0.15).
    const percentInput = parseFloat(data.discountPercent as unknown as string);
    const discountPercent = Number.isFinite(percentInput) ? percentToFraction(percentInput) : 0;

    const result = await upsertDiscount({ ...data, discountPercent });

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
          description="Internal name for this discount"
          defaultValue={discount?.description}
          type="text"
          required
          messages={{ valueMissing: 'Description is required' }}
        />
        <FormField
          name="value"
          label="Discount Code"
          description="The code customers enter at checkout"
          defaultValue={discount?.value}
          type="text"
          required
          messages={{ valueMissing: 'A discount code is required' }}
        />

        <Grid columns={{ initial: '1', sm: '2' }} gap="3">
          <FormField
            name="discountPercent"
            label="Discount (Percent)"
            description="Whole number — e.g. 15 for 15% off"
            defaultValue={fractionToPercent(discount?.discountPercent)}
            type="number"
            min={0}
            max={100}
            step={0.01}
            placeholder="0"
          />
          <FormField
            name="discountFixed"
            label="Discount (Fixed $)"
            description="Flat amount off, in dollars"
            defaultValue={discount?.discountFixed}
            type="number"
            min={0}
            step={0.01}
            placeholder="0"
          />
        </Grid>

        <FormField
          name="discountType"
          label="Discount Type"
          description="Recurring applies every billing cycle; one time applies once"
          defaultValue={discount?.discountType ?? DiscountType.recurring}
          type="select"
          placeholder="Type"
          options={[
            {
              label: 'Discount Type',
              options: Object.values(DiscountType).map((value) => ({
                value,
                label: DISCOUNT_TYPE_LABELS[value] ?? value,
              })),
            },
          ]}
          required
        />
        <FormField
          name="durationIntervals"
          label="Duration Intervals"
          description="Number of billing cycles the discount applies to"
          defaultValue={discount?.durationIntervals}
          type="number"
          min={1}
          step={1}
          required
        />

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
