'use server';
import { prisma } from '@/lib/prisma';
import { authorize, serverSession } from '@/lib/authorize';

export const forceUpdateOnSync = async () => {
  const session = await serverSession();
  if (!session) return { success: false, message: 'Not Authorized' };
  if (!authorize({ session, role: 'ADMIN' }).authorized)
    return { success: false, message: 'Not Authorized' };

  await prisma.merchant.updateMany({
    data: { productsSyncForceUpdate: true, merchantSyncForceUpdate: true },
  });

  return { success: true, message: 'Force Update on Sync Complete' };
};

export type ForceUpdateOnSyncResult = PromiseReturnType<ReturnType<typeof forceUpdateOnSync>>;
