'use server';
import { prisma } from '@/lib/prisma';
import { serverSession } from '@/lib/hooks/useSession';
import { authorize } from '@/lib/authorize';

export type DeleteRows = 'billingPlan' | 'discount' | 'apiKey';

export const deleteRow = async ({ id, type }: { id: string | number; type: DeleteRows }) => {
  const session = await serverSession();
  if (!session) return { success: false, message: 'Not Authenticated' };

  if (!authorize({ session, role: 'ADMIN' }).authorized)
    return { success: false, message: 'Not Authorized' };

  try {
    switch (type) {
      case 'billingPlan':
        await prisma.billingPlan.delete({ where: { id: integer(id) } });
        return { success: true, message: 'Billing Plan deleted' };
      case 'discount':
        await prisma.subscriptionDiscount.delete({ where: { id: integer(id) } });
        return { success: true, message: 'Discount deleted' };
      case 'apiKey':
        const apiKeyId = typeof id === 'string' ? id : String(id);
        await prisma.apiAccess.delete({ where: { id: apiKeyId } });
        return { success: true, message: 'API Key deleted' };
      default:
        return { success: false, message: 'Type not found' };
    }
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

const integer = (value: string | number) => {
  if (typeof value === 'string') {
    const parsed = parseInt(value);
    return isNaN(parsed) ? undefined : parsed;
  }
  return value;
};
