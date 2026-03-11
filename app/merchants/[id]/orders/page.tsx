import { DataTable } from '@/app/components/DataTable';
import { NotFound } from '@/app/components/NotFound';
import { PageLayout } from '@/app/components/PageLayout';
import { Pagination } from '@/app/components/Pagination';
import { OrderTableActions, getOrderTableHeaders } from '@/app/orders/orderTable';
import { prisma } from '@/lib/prisma';
import { queryPagination } from '@/lib/queryPagination';

export default async function Page({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: PageSearchParams;
}) {
  const merchantId = parseInt(params.id);
  const { page } = searchParams;

  const merchant = await prisma.merchant.findUnique({
    where: {
      id: merchantId,
    },
    select: {
      id: true,
      shop: true,
      compliancePartnerAccountName: true,
    },
  });

  if (!params.id || !merchant) return <NotFound message="Merchant Not Found" />;

  const where = {
    merchantId,
  };

  const count = await prisma.order.count({ where });
  const orders = await prisma.order.findMany({
    ...queryPagination({ page }),
    where,
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <PageLayout
      heading={`Orders for ${merchant.compliancePartnerAccountName ?? merchant.shop}`}
      actions={[{ label: 'Back to Merchant', href: `/merchants/${merchant.id}` }]}
    >
      <DataTable
        headers={getOrderTableHeaders({ includeMerchant: false })}
        data={orders}
        Actions={OrderTableActions}
      />
      <Pagination count={count} />
    </PageLayout>
  );
}
