import { DataFilter } from '@/app/components/DataFilter';
import { DataTable } from '@/app/components/DataTable';
import { PageLayout } from '@/app/components/PageLayout';
import { Pagination } from '@/app/components/Pagination';
import { OrderTableActions, getOrderTableHeaders } from '@/app/orders/orderTable';
import { getOrderSearchWhere } from '@/lib/orderSearch';
import { prisma } from '@/lib/prisma';
import { queryPagination } from '@/lib/queryPagination';

export default async function Page(props: { searchParams: Promise<PageSearchParams> }) {
  const searchParams = await props.searchParams;
  const { page, search } = searchParams;
  const where = getOrderSearchWhere(search);

  const count = await prisma.order.count({ where });
  const orders = await prisma.order.findMany({
    ...queryPagination({ page, count }),
    where,
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
      <DataFilter />
      <DataTable headers={getOrderTableHeaders()} data={orders} Actions={OrderTableActions} />
      <Pagination count={count} />
    </PageLayout>
  );
}
