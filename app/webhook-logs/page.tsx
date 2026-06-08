import { prisma, QueryMode } from '@/lib/prisma';
import { PageLayout } from '@/app/components/PageLayout';
import { DataTable } from '@/app/components/DataTable';
import { Pagination } from '@/app/components/Pagination';
import { DataFilter, type SelectDataFilter } from '@/app/components/DataFilter';
import { Badge, Text } from '@radix-ui/themes';
import { dateTimeFormatter } from '@/lib/formatters';
import { ButtonLink } from '@/app/components/ButtonLink';
import { DataDialog } from '@/app/components/DataDialog';
import { queryPagination } from '@/lib/queryPagination';

const statusMeta: Record<string, { label: string; color: 'blue' | 'green' | 'red' | 'gray' }> = {
  RECEIVED: { label: 'Received', color: 'blue' },
  PROCESSED: { label: 'Processed', color: 'green' },
  ERROR: { label: 'Error', color: 'red' },
  SKIPPED: { label: 'Skipped', color: 'gray' },
};

const OrderActions = ({ orderId }: { orderId: number | null }) =>
  orderId ? <ButtonLink href={`/orders/${orderId}`}>View Order</ButtonLink> : null;

export default async function Page({ searchParams }: { searchParams: PageSearchParams }) {
  const { page, status, search } = searchParams;
  const searchString = search?.toString();
  const statusString = status?.toString();

  const where = {
    ...(statusString ? { status: statusString } : {}),
    ...(searchString
      ? {
          OR: [
            { shop: { contains: searchString, mode: QueryMode.insensitive } },
            { platformOrderId: { contains: searchString, mode: QueryMode.insensitive } },
            { topic: { contains: searchString, mode: QueryMode.insensitive } },
          ],
        }
      : {}),
  };

  const count = await prisma.orderWebhookLog.count({ where });
  const logs = await prisma.orderWebhookLog.findMany({
    ...queryPagination({ page, count }),
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      createdAt: true,
      shop: true,
      platformOrderId: true,
      topic: true,
      status: true,
      errors: true,
      orderId: true,
      payload: true,
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
    {
      id: 'payload',
      title: 'Data',
      formatter: (v: unknown) => <DataDialog title="Webhook Payload" data={v} />,
    },
    { id: 'shop', title: 'Shop' },
    { id: 'platformOrderId', title: 'Platform Order ID', as: 'code' as const },
    { id: 'topic', title: 'Topic' },
    {
      id: 'status',
      title: 'Status',
      formatter: (v: string) => {
        const meta = statusMeta[v] ?? { label: v, color: 'gray' };
        return <Badge color={meta.color} variant="soft" size="1">{meta.label}</Badge>;
      },
    },
    {
      id: 'errors',
      title: 'Errors',
      formatter: (v: string[]) =>
        v.length > 0 ? (
          <Text color="red" size="1">{v[0]}{v.length > 1 ? ` (+${v.length - 1} more)` : ''}</Text>
        ) : (
          '—'
        ),
    },
    { id: 'createdAt', title: 'Received', formatter: dateTimeFormatter },
    { type: 'actions' as const, title: 'Actions' },
  ];

  return (
    <PageLayout heading="Webhook Logs">
      <DataFilter filters={filters} />
      <DataTable headers={headers} data={logs} Actions={OrderActions} />
      <Pagination count={count} />
    </PageLayout>
  );
}
