import { prismaClubs } from '@/lib/prisma-clubs';
import { PageLayout } from '@/app/components/PageLayout';
import { DataTable } from '@/app/components/DataTable';
import { Pagination } from '@/app/components/Pagination';
import { queryPagination } from '@/lib/queryPagination';
import { dateFormatter } from '@/lib/formatters';
import { Badge, Flex, Text } from '@radix-ui/themes';
import { ButtonLink } from '@/app/components/ButtonLink';
import type { RadixColor } from '@/types/radix-ui';

const migrationStatusColor: Record<string, RadixColor> = {
  PENDING: 'gray',
  VALIDATING: 'blue',
  RESOLVING_CUSTOMERS: 'blue',
  CREATING_MEMBERSHIPS: 'blue',
  RESOLVING_PAYMENTS: 'blue',
  COLLECTING_PAYMENTS: 'blue',
  COMPLETED: 'green',
  FAILED: 'red',
  CANCELLED: 'orange',
};

const Actions = ({ id }: { id: string }) => (
  <ButtonLink href={`/clubs/migrations/${id}`}>View</ButtonLink>
);

export default async function Page(props: { searchParams: Promise<PageSearchParams> }) {
  const searchParams = await props.searchParams;
  const { page } = searchParams;
  const count = await prismaClubs.clubMigration.count();
  const migrations = await prismaClubs.clubMigration.findMany({
    ...queryPagination({ page, count }),
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      shop: true,
      status: true,
      totalRecords: true,
      resolvedCount: true,
      errorCount: true,
      filename: true,
      createdAt: true,
      completedAt: true,
      club: { select: { name: true } },
    },
  });

  const headers = [
    { id: 'shop', title: 'Shop' },
    { id: 'club', title: 'Club', formatter: (v: { name: string } | null) => v?.name ?? '—' },
    { id: 'filename', title: 'File', formatter: (v: string | null) => v ?? '—' },
    {
      id: 'status',
      title: 'Status',
      formatter: (value: string) => (
        <Badge color={migrationStatusColor[value] ?? 'gray'} variant="soft">{value}</Badge>
      ),
    },
    {
      id: 'totalRecords',
      title: 'Progress',
      formatter: (total: number, row: any) => (
        <Flex align="center" gap="2">
          <Text size="2">{row.resolvedCount} / {total}</Text>
          {row.errorCount > 0 && (
            <Badge color="red" variant="soft" size="1">{row.errorCount} errors</Badge>
          )}
        </Flex>
      ),
    },
    { id: 'createdAt', title: 'Started', formatter: dateFormatter },
    { id: 'completedAt', title: 'Completed', formatter: (v: Date | null) => v ? dateFormatter(v) : '—' },
    { type: 'actions' as const, title: 'Actions' },
  ];

  return (
    <PageLayout heading="Migrations">
      <DataTable headers={headers} data={migrations} Actions={Actions} />
      <Pagination count={count} />
    </PageLayout>
  );
}
