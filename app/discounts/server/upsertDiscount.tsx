'use server';
import { prisma } from '@/lib/prisma';
import { type SubscriptionDiscount } from '@prisma/client';
import { serverSession } from '@/lib/hooks/useSession';
import { authorize } from '@/lib/authorize';
import { dbFormat } from '@/lib/dbFormat';

type RequiredProps =
  | 'description'
  | 'value'
  | 'discountFixed'
  | 'discountPercent'
  | 'discountType'
  | 'durationIntervals';
export type UpsertDiscountProps = SomeRequired<SubscriptionDiscount, RequiredProps>;

export const upsertDiscount = async ({
  id = undefined,
  description,
  value,
  discountFixed,
  discountPercent,
  discountType,
  durationIntervals,
}: UpsertDiscountProps) => {
  const session = await serverSession();
  if (!session) return { success: false, message: 'Not Authenticated' };

  if (!authorize({ session, role: 'ADMIN' }).authorized)
    return { success: false, message: 'Not Authorized' };

  const sharedProps = {
    description,
    value,
    discountType,
  };

  let discount;

  try {
    if (id) {
      discount = await prisma.subscriptionDiscount.update({
        where: { id: dbFormat.integer(id) },
        data: {
          ...sharedProps,
          discountFixed: discountFixed ? parseFloat(discountFixed as unknown as string) : undefined,
          discountPercent: discountPercent
            ? parseFloat(discountPercent as unknown as string)
            : undefined,
          durationIntervals: durationIntervals
            ? parseInt(durationIntervals as unknown as string)
            : undefined,
        },
      });
    } else {
      discount = await prisma.subscriptionDiscount.create({
        data: {
          ...sharedProps,
          discountFixed: discountFixed ? parseFloat(discountFixed as unknown as string) : 0,
          discountPercent: discountPercent ? parseFloat(discountPercent as unknown as string) : 0,
          durationIntervals: durationIntervals
            ? parseInt(durationIntervals as unknown as string)
            : 0,
          uses: 0,
        },
      });
    }
  } catch (error) {
    let message;
    if (error instanceof Error) {
      console.error(error.message);
      message = `Error creating lead: ${error?.message}`;
    } else {
      message = 'Unknown error';
    }
    return { success: false, message };
  }

  return { success: true, message: 'Discount saved', discount };
};
