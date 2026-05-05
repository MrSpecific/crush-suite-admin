import { prismaClubs } from '@/lib/prisma-clubs';
import { PageLayout } from '@/app/components/PageLayout';
import { DataTable } from '@/app/components/DataTable';
import { Pagination } from '@/app/components/Pagination';
import { queryPagination } from '@/lib/queryPagination';
import { dateFormatter } from '@/lib/formatters';
import { Badge } from '@radix-ui/themes';
import { DataFilter, type SelectDataFilter } from '@/app/components/DataFilter';
import type { RadixColor } from '@/types/radix-ui';

const requestTypeLabels: Record<string, string> = {
  'customer-redact': 'Customer Redact',
  'customer-data-request': 'Data Request',
  'shop-redact': 'Shop Redact',
};

export default async function Page({ searchParams }: { searchParams: PageSearchParams }) {
  const { page, status } = searchParams;
  const completedFilter =
    status === 'pending' ? false : status === 'completed' ? true : undefined;

  const where = completedFilter !== undefined ? { completed: completedFilter } : {};

  const count = await prismaClubs.gDPRRequest.count({ where });
  const requests = await prismaClubs.gDPRRequest.findMany({
    ...queryPagination({ page, count }),
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      shop: true,
      type: true,
      completed: true,
      completedAt: true,
      platformCustomerId: true,
      createdAt: true,
      merchant: { select: { id: true, platformShopName: true } },
    },
  });

  const filters: SelectDataFilter[] = [
    {
      label: 'Status',
      name: 'status',
      allLabel: 'All',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Completed', value: 'completed' },
      ],
    },
  ];

  const headers = [
    { id: 'shop', title: 'Shop' },
    {
      id: 'type',
      title: 'Type',
      formatter: (value: string) => requestTypeLabels[value] ?? value,
    },
    {
      id: 'completed',
      title: 'Status',
      formatter: (value: boolean) => (
        <Badge color={(value ? 'green' : 'orange') as RadixColor} variant="soft">
          {value ? 'Completed' : 'Pending'}
        </Badge>
      ),
    },
    {
      id: 'platformCustomerId',
      title: 'Customer ID',
      formatter: (value: string | null) => value ?? '—',
    },
    { id: 'createdAt', title: 'Received', formatter: dateFormatter },
    {
      id: 'completedAt',
      title: 'Completed',
      formatter: (value: Date | null) => (value ? dateFormatter(value) : '—'),
    },
  ];

  return (
    <PageLayout heading="GDPR Requests">
      <DataFilter filters={filters} />
      <DataTable headers={headers} data={requests} />
      <Pagination count={count} />
    </PageLayout>
  );
}
