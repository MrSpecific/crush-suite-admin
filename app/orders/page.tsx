import { DataTable } from '@/app/components/DataTable';
import { PageLayout } from '@/app/components/PageLayout';
import { Pagination } from '@/app/components/Pagination';
import { OrderTableActions, getOrderTableHeaders } from '@/app/orders/orderTable';
import { prisma } from '@/lib/prisma';
import { queryPagination } from '@/lib/queryPagination';

export default async function Page({ searchParams }: { searchParams: PageSearchParams }) {
  const { page } = searchParams;

  const count = await prisma.order.count();
  const orders = await prisma.order.findMany({
    ...queryPagination({ page }),
    include: {
      merchant: {
        select: { compliancePartnerAccountName: true, shop: true, id: true },
      },
      customer: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <PageLayout heading="Orders">
      <DataTable headers={getOrderTableHeaders()} data={orders} Actions={OrderTableActions} />
      <Pagination count={count} />
    </PageLayout>
  );
}
