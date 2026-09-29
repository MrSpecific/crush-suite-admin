import { prisma } from '@/lib/prisma';
import type { ComboboxOption } from '@/app/components/forms';

export const getMerchantOptions = async (): Promise<ComboboxOption[]> => {
  const merchants = await prisma.merchant.findMany({
    select: {
      id: true,
      shop: true,
      status: true,
      compliancePartnerAccountName: true,
      platformShopName: true,
    },
    orderBy: [{ compliancePartnerAccountName: 'asc' }, { shop: 'asc' }],
  });

  return merchants.map(({ id, shop, status, compliancePartnerAccountName, platformShopName }) => ({
    value: id.toString(),
    label: compliancePartnerAccountName || platformShopName || shop,
    description: [shop, `#${id}`, status === 'REMOVED' && 'Removed'].filter(Boolean).join(' · '),
  }));
};
