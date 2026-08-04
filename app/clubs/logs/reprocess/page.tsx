import { prismaClubs } from '@/lib/prisma-clubs';
import { PageLayout } from '@/app/components/PageLayout';
import { DataTable } from '@/app/components/DataTable';
import { Pagination } from '@/app/components/Pagination';
import { DataFilter, type SelectDataFilter } from '@/app/components/DataFilter';
import { queryPagination } from '@/lib/queryPagination';
import { dateTimeFormatter } from '@/lib/formatters';
import { Badge } from '@radix-ui/themes';
import { Prisma } from '@/generated/prisma/clubs';
import type { RadixColor } from '@/types/radix-ui';

const stageMeta: Record<string, { label: string; color: RadixColor }> = {
  orders_not_created: { label: 'Orders Not Created', color: 'orange' },
  contracts_not_generated: { label: 'Contracts Not Generated', color: 'purple' },
  billing_not_attempted: { label: 'Billing Not Attempted', color: 'red' },
};

export default async function Page(props: { searchParams: Promise<PageSearchParams> }) {
  const searchParams = await props.searchParams;
  const { page, search, stage } = searchParams;
  const where = getWhere(search?.toString(), stage?.toString());
  const count = await prismaClubs.releaseReprocessLog.count({ where });
  const logs = await prismaClubs.releaseReprocessLog.findMany({
    ...queryPagination({ page, count }),
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      createdAt: true,
      shop: true,
      stage: true,
      triggeredBy: true,
      jobId: true,
      releaseId: true,
      release: {
        select: {
          name: true,
          clubId: true,
          club: { select: { merchantId: true } },
        },
      },
    },
  });

  const rows = logs.map((log) => ({
    ...log,
    releaseName: log.release.name,
    merchantId: log.release.club.merchantId,
    clubId: log.release.clubId,
  }));

  const filters: SelectDataFilter[] = [
    {
      label: 'Stage',
      name: 'stage',
      options: Object.entries(stageMeta).map(([value, meta]) => ({ label: meta.label, value })),
    },
  ];

  const headers = [
    { id: 'createdAt', title: 'When', formatter: dateTimeFormatter },
    { id: 'shop', title: 'Shop' },
    {
      id: 'releaseName',
      title: 'Release',
      href: (_v: string, row: any) => `/clubs/merchants/${row.merchantId}/clubs/${row.clubId}/releases/${row.releaseId}`,
    },
    {
      id: 'stage',
      title: 'Stage',
      formatter: (value: string) => {
        const meta = stageMeta[value] ?? { label: value, color: 'gray' as RadixColor };
        return (
          <Badge color={meta.color} variant="soft">
            {meta.label}
          </Badge>
        );
      },
    },
    { id: 'triggeredBy', title: 'Triggered By' },
    { id: 'jobId', title: 'Job ID', formatter: (v: string | null) => v ?? '—', as: 'code' as const },
  ];

  return (
    <PageLayout
      heading="Reprocess Log"
      subheading="Audit trail of manual 'Reprocess release' invocations, including re-driven billing attempts"
    >
      <DataFilter filters={filters} />
      <DataTable headers={headers} data={rows} />
      <Pagination count={count} />
    </PageLayout>
  );
}

const getWhere = (search?: string, stage?: string): Prisma.ReleaseReprocessLogWhereInput | undefined => {
  const conditions: Prisma.ReleaseReprocessLogWhereInput[] = [];

  if (stage) conditions.push({ stage });

  if (search) {
    conditions.push({
      OR: [
        { shop: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { triggeredBy: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { release: { name: { contains: search, mode: Prisma.QueryMode.insensitive } } },
      ],
    });
  }

  return conditions.length > 0 ? { AND: conditions } : undefined;
};
