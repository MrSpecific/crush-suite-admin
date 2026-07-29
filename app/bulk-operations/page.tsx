import { prisma } from '@/lib/prisma';
import { PageLayout } from '@/app/components/PageLayout';
import { DataTable } from '@/app/components/DataTable';
import { Pagination } from '@/app/components/Pagination';
import { DataFilter, type SelectDataFilter } from '@/app/components/DataFilter';
import { Badge } from '@radix-ui/themes';
import { dateTimeFormatter } from '@/lib/formatters';
import { ButtonLink } from '@/app/components/ButtonLink';
import { queryPagination } from '@/lib/queryPagination';
import { BulkOperationType } from '@prisma/client';
import type { RadixColor } from '@/types/radix-ui';

const getOperationStatus = (op: {
  completedAt: Date | null;
  processedAt: Date | null;
  startedAt: Date | null;
}): { label: string; color: RadixColor } => {
  if (op.processedAt) return { label: 'Processed', color: 'green' };
  if (op.completedAt) return { label: 'Completed', color: 'blue' };
  if (op.startedAt) return { label: 'Running', color: 'orange' };
  return { label: 'Pending', color: 'gray' };
};

const Actions = ({ id }: { id: string }) => (
  <ButtonLink href={`/bulk-operations/${id}`}>View</ButtonLink>
);

export default async function Page(props: { searchParams: Promise<PageSearchParams> }) {
  const searchParams = await props.searchParams;
  const { page, type } = searchParams;

  const where = type ? { type: type as BulkOperationType } : {};

  const count = await prisma.merchantBulkOperation.count({ where });
  const operations = await prisma.merchantBulkOperation.findMany({
    ...queryPagination({ page, count }),
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      createdAt: true,
      startedAt: true,
      completedAt: true,
      processedAt: true,
      shop: true,
      type: true,
      platformId: true,
      merchantId: true,
      merchant: { select: { compliancePartnerAccountName: true } },
    },
  });

  const filters: SelectDataFilter[] = [
    {
      label: 'Type',
      name: 'type',
      allLabel: 'All Types',
      options: Object.values(BulkOperationType).map((v) => ({ label: v, value: v })),
    },
  ];

  const headers = [
    // { type: 'data', title: 'Data' },
    { id: 'shop', title: 'Shop' },
    {
      id: 'merchant',
      title: 'Merchant',
      formatter: (v: { compliancePartnerAccountName: string | null }) =>
        v.compliancePartnerAccountName ?? '—',
    },
    { id: 'type', title: 'Type' },
    { id: 'platformId', title: 'Platform ID', as: 'code' as const },
    {
      id: 'startedAt',
      title: 'Status',
      formatter: (_: unknown, row: any) => {
        const { label, color } = getOperationStatus(row);
        return (
          <Badge color={color} variant="soft">
            {label}
          </Badge>
        );
      },
    },
    { id: 'createdAt', title: 'Created', formatter: dateTimeFormatter },
    {
      id: 'startedAt',
      title: 'Started',
      formatter: (v: Date | null) => (v ? dateTimeFormatter(v) : '—'),
    },
    {
      id: 'completedAt',
      title: 'Completed',
      formatter: (v: Date | null) => (v ? dateTimeFormatter(v) : '—'),
    },
    {
      id: 'processedAt',
      title: 'Processed',
      formatter: (v: Date | null) => (v ? dateTimeFormatter(v) : '—'),
    },
    { type: 'actions' as const, title: 'Actions' },
  ];

  return (
    <PageLayout heading="Bulk Operations">
      <DataFilter filters={filters} />
      <DataTable headers={headers} data={operations} Actions={Actions} />
      <Pagination count={count} />
    </PageLayout>
  );
}
