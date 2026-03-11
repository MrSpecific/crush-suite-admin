'use server';
import { prisma } from '@/lib/prisma';
import { type BillingPlan } from '@prisma/client';
import { serverSession } from '@/lib/hooks/useSession';
import { authorize } from '@/lib/authorize';
import { dbFormat } from '@/lib/dbFormat';

type RequiredProps = 'name' | 'type';

export type UpsertBillingPlanProps = SomeRequired<BillingPlan, RequiredProps>;

export const upsertBillingPlan = async ({
  id = undefined,
  name,
  description,
  trialDays = 0,
  notes,
  type,
  price,
  perUsePrice,
  perUseThreshold,
  perUseCap,
  perUseUnits,
  perUseTerms,
  perUseType,
  accessibleStores,
}: UpsertBillingPlanProps) => {
  const session = await serverSession();
  if (!session) return { success: false, message: 'Not Authenticated' };

  if (!authorize({ session, role: 'ADMIN' }).authorized)
    return { success: false, message: 'Not Authorized' };

  const sharedProps = {
    name,
    description,
    trialDays: dbFormat.integer(trialDays),
    notes,
    type,
    price: dbFormat.integer(price),
    perUseThreshold: dbFormat.decimal(perUseThreshold),
    perUsePrice: dbFormat.decimal(perUsePrice),
    perUseCap: dbFormat.decimal(perUseCap),
    perUseUnits,
    perUseTerms,
    perUseType,
    accessibleStores,
  };

  let discount;

  try {
    if (id) {
      discount = await prisma.billingPlan.update({
        where: { id: parseInt(id as unknown as string) },
        data: {
          ...sharedProps,
        },
      });
    } else {
      discount = await prisma.billingPlan.create({
        data: {
          ...sharedProps,
        },
      });
    }
  } catch (error) {
    let message;

    if (error instanceof Error) {
      console.error(error.message);
      message = `Error creating billing plan: ${error?.message}`;
    } else {
      message = 'Unknown error';
    }

    return { success: false, message };
  }

  return { success: true, message: 'Billing Plan saved', discount };
};
