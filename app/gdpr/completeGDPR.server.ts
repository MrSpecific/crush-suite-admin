'use server';
import { prisma } from '@/lib/prisma';
import { serverSession } from '@/lib/hooks/useSession';
import { authorize } from '@/lib/authorize';

export const completeGDPR = async ({ id }: { id: string }) => {
  const session = await serverSession();
  if (!session) return { success: false, message: 'Not Authenticated' };

  if (!authorize({ session, role: 'ADMIN' }).authorized)
    return { success: false, message: 'Not Authorized' };

  try {
    await prisma.gDPR.update({ where: { id }, data: { completed: true, completedAt: new Date() } });
    return { success: true, message: 'GDPR Request Completed' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};
