'use server';
import { prisma } from '@/lib/prisma';
import { ApiAccess, type SubscriptionDiscount } from '@prisma/client';
import { serverSession } from '@/lib/hooks/useSession';
import { authorize } from '@/lib/authorize';
import { dbFormat } from '@/lib/dbFormat';

type RequiredProps = 'privateKey' | 'sandboxKey' | 'limit' | 'merchantId' | 'scopes';
export type UpsertAPIKeyProps = SomeRequired<ApiAccess, RequiredProps>;

export const upsertAPIKey = async ({
  id = undefined,
  privateKey,
  sandboxKey,
  limit,
  merchantId,
  scopes,
}: UpsertAPIKeyProps) => {
  const session = await serverSession();
  if (!session) return { success: false, message: 'Not Authenticated' };

  if (!authorize({ session, role: 'ADMIN' }).authorized)
    return { success: false, message: 'Not Authorized' };

  const sharedProps = {
    privateKey,
    sandboxKey,
    limit,
    merchantId,
    scopes,
  };

  let apiKey;

  try {
    if (id) {
      apiKey = await prisma.apiAccess.update({
        where: { id },
        data: {
          ...sharedProps,
        },
      });
    } else {
      apiKey = await prisma.apiAccess.create({
        data: {
          ...sharedProps,
        },
      });
    }
  } catch (error) {
    let message;
    if (error instanceof Error) {
      console.error(error.message);
      message = `Error creating API Key: ${error?.message}`;
    } else {
      message = 'Unknown error';
    }
    return { success: false, message };
  }

  return { success: true, message: 'API Key saved', apiKey };
};
