'use server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { authorize, serverSession } from '@/lib/authorize';
import {
  diagnoseBilling,
  loadBillingFacts,
  matchPlanByName,
  type BillingRepair,
} from '@/lib/billingDiagnosis';

/**
 * Apply the repair the billing diagnosis names for a merchant.
 *
 * The diagnosis is recomputed here rather than trusted from the page, and the
 * caller passes the repair it showed the admin: if Shopify's state has moved
 * on since the page loaded and the repair would now be different, nothing is
 * changed.
 */
export const repairMerchantBilling = async ({
  merchantId,
  expected,
}: {
  merchantId: number;
  expected: BillingRepair['kind'];
}) => {
  const session = await serverSession();
  if (!session) return { success: false, message: 'Not Authenticated' };
  if (!authorize({ session, role: 'ADMIN' }).authorized)
    return { success: false, message: 'Not Authorized' };

  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: {
      shop: true,
      accessToken: true,
      platformBillingId: true,
      platformBillingStatus: true,
      billingPlanId: true,
    },
  });
  if (!merchant) return { success: false, message: 'Merchant not found' };

  const diagnosis = diagnoseBilling(await loadBillingFacts(merchant));
  const repair = diagnosis.repair;
  if (!repair) return { success: false, message: `Nothing to repair: ${diagnosis.title}` };
  if (repair.kind !== expected) {
    return {
      success: false,
      message: 'Billing changed since this page loaded. Reload and review before repairing.',
    };
  }

  try {
    if (repair.kind === 'reset') {
      // With no billing id the web app serves the plan picker, so the merchant
      // can choose a plan and approve a fresh charge.
      await prisma.merchant.update({
        where: { id: merchantId },
        data: { platformBillingId: null, platformBillingStatus: null },
      });
      log(session.user?.email, merchant.shop, `reset billing (was ${merchant.platformBillingId})`);
      revalidatePath(`/merchants/${merchantId}`);
      return {
        success: true,
        message: 'Billing reset. The merchant will see the plan picker next time they open the app.',
      };
    }

    const plans = await prisma.billingPlan.findMany({ select: { id: true, name: true } });
    const plan = matchPlanByName(plans, repair.subscriptionName);
    await prisma.merchant.update({
      where: { id: merchantId },
      data: {
        platformBillingId: repair.subscriptionId,
        // Lower case, as the web app writes it after reading Shopify.
        platformBillingStatus: 'active',
        ...(plan ? { billingPlanId: plan.id } : {}),
      },
    });
    log(
      session.user?.email,
      merchant.shop,
      `linked billing to ${repair.subscriptionId} (was ${merchant.platformBillingId})` +
        (plan ? `, plan ${plan.id}` : ', no matching plan')
    );
    revalidatePath(`/merchants/${merchantId}`);
    return {
      success: true,
      message: plan
        ? `Linked to "${repair.subscriptionName}" and set the plan to ${plan.name}.`
        : `Linked to "${repair.subscriptionName}". No billing plan matches that name, so the plan was left unchanged.`,
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

function log(admin: string | null | undefined, shop: string, action: string) {
  console.log(`[repairMerchantBilling] ${admin ?? 'unknown admin'} ${action} for ${shop}`);
}

export type RepairMerchantBillingResult = PromiseReturnType<
  ReturnType<typeof repairMerchantBilling>
>;
