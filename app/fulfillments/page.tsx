import { prisma } from '@/lib/prisma';
import { PageLayout } from '@/app/components/PageLayout';
import { DataTable } from '@/app/components/DataTable';
import { Pagination } from '@/app/components/Pagination';
import { DataFilter, type SelectDataFilter } from '@/app/components/DataFilter';
import { Badge } from '@radix-ui/themes';
import { dateTimeFormatter } from '@/lib/formatters';
import { ButtonLink } from '@/app/components/ButtonLink';
import { queryPagination } from '@/lib/queryPagination';
import { FulfillmentStatus } from '@prisma/client';
import type { RadixColor } from '@/types/radix-ui';

const statusMeta: Record<FulfillmentStatus, { label: string; color: RadixColor }> = {
  SHIPPING_LABELS_GENERATED: { label: 'Labels Generated', color: 'blue' },
  SHIPPED: { label: 'Shipped', color: 'cyan' },
  DELIVERED: { label: 'Delivered', color: 'green' },
  PICKED_UP: { label: 'Picked Up', color: 'teal' },
  CANCELLED: { label: 'Cancelled', color: 'gray' },
  RETURNED: { label: 'Returned', color: 'orange' },
  ERROR: { label: 'Error', color: 'red' },
};

const OrderActions = ({ orderId }: { orderId: number }) => (
  <ButtonLink href={`/orders/${orderId}`}>View Order</ButtonLink>
);

export default async function Page({ searchParams }: { searchParams: PageSearchParams }) {
  const { page, status } = searchParams;

  const where = status ? { status: status as FulfillmentStatus } : {};

  const count = await prisma.fulfillment.count({ where });
  const fulfillments = await prisma.fulfillment.findMany({
    ...queryPagination({ page, count }),
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      shop: true,
      platformOrderId: true,
      platformFulfillmentId: true,
      status: true,
      orderId: true,
    },
  });

  const filters: SelectDataFilter[] = [
    {
      label: 'Status',
      name: 'status',
      allLabel: 'All Statuses',
      options: Object.entries(statusMeta).map(([value, meta]) => ({
        label: meta.label,
        value,
      })),
    },
  ];

  const headers = [
    { id: 'shop', title: 'Shop' },
    { id: 'platformOrderId', title: 'Platform Order ID', as: 'code' as const },
    { id: 'platformFulfillmentId', title: 'Fulfillment ID', as: 'code' as const },
    {
      id: 'status',
      title: 'Status',
      formatter: (v: FulfillmentStatus) => {
        const meta = statusMeta[v] ?? { label: v, color: 'gray' };
        return <Badge color={meta.color} variant="soft">{meta.label}</Badge>;
      },
    },
    { id: 'createdAt', title: 'Created', formatter: dateTimeFormatter },
    { id: 'updatedAt', title: 'Updated', formatter: dateTimeFormatter },
    { type: 'actions' as const, title: 'Actions' },
  ];

  return (
    <PageLayout heading="Fulfillments">
      <DataFilter filters={filters} />
      <DataTable headers={headers} data={fulfillments} Actions={OrderActions} />
      <Pagination count={count} />
    </PageLayout>
  );
}
