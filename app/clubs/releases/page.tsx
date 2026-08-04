import { prismaClubs } from '@/lib/prisma-clubs';
import { PageLayout } from '@/app/components/PageLayout';
import { DataTable } from '@/app/components/DataTable';
import { Pagination } from '@/app/components/Pagination';
import { DataFilter, type SelectDataFilter } from '@/app/components/DataFilter';
import { queryPagination } from '@/lib/queryPagination';
import { dateFormatter } from '@/lib/formatters';
import { ButtonLink } from '@/app/components/ButtonLink';
import { Badge } from '@radix-ui/themes';
import { Prisma } from '@/generated/prisma/clubs';
import type { RadixColor } from '@/types/radix-ui';

const releaseStatusColor: Record<string, RadixColor> = {
  draft: 'gray',
  published: 'green',
  archived: 'orange',
};

const Actions = ({ id, merchantId, clubId }: { id: string; merchantId: number; clubId: string }) => (
  <ButtonLink href={`/clubs/merchants/${merchantId}/clubs/${clubId}/releases/${id}`}>View</ButtonLink>
);

export default async function Page(props: { searchParams: Promise<PageSearchParams> }) {
  const searchParams = await props.searchParams;
  const { page, search, status } = searchParams;
  const where = getReleaseWhere(search?.toString(), status?.toString());
  const count = await prismaClubs.release.count({ where });
  const releases = await prismaClubs.release.findMany({
    ...queryPagination({ page, count }),
    where,
    orderBy: { releaseDate: 'desc' },
    select: {
      id: true,
      name: true,
      status: true,
      releaseDate: true,
      allReleaseOrdersCreated: true,
      contractsGenerated: true,
      createdAt: true,
      clubId: true,
      club: {
        select: {
          name: true,
          merchantId: true,
          merchant: { select: { shop: true, platformShopName: true } },
        },
      },
      _count: { select: { ReleaseOrder: true } },
    },
  });

  const rows = releases.map((release) => ({
    ...release,
    merchantId: release.club.merchantId,
    clubName: release.club.name,
    merchant: release.club.merchant,
    orderCount: release._count.ReleaseOrder,
  }));

  const filters: SelectDataFilter[] = [
    {
      label: 'Status',
      name: 'status',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
        { label: 'Archived', value: 'archived' },
      ],
    },
  ];

  const headers = [
    {
      id: 'name',
      title: 'Release',
      href: (_v: string, row: any) => `/clubs/merchants/${row.merchantId}/clubs/${row.clubId}/releases/${row.id}`,
    },
    {
      id: 'clubName',
      title: 'Club',
      href: (_v: string, row: any) => `/clubs/merchants/${row.merchantId}/clubs/${row.clubId}`,
    },
    {
      id: 'merchant',
      title: 'Merchant',
      formatter: (value: { shop: string; platformShopName: string | null }) =>
        value.platformShopName ?? value.shop,
      href: (_v: any, row: any) => `/clubs/merchants/${row.merchantId}`,
    },
    {
      id: 'status',
      title: 'Status',
      formatter: (value: string) => (
        <Badge color={releaseStatusColor[value] ?? 'gray'} variant="soft">
          {value}
        </Badge>
      ),
    },
    { id: 'releaseDate', title: 'Release Date', formatter: dateFormatter },
    { id: 'orderCount', title: 'Orders' },
    {
      id: 'allReleaseOrdersCreated',
      title: 'Orders Created',
      formatter: (value: boolean) => (
        <Badge color={value ? 'green' : 'gray'} variant="soft">
          {value ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      id: 'contractsGenerated',
      title: 'Contracts Generated',
      formatter: (value: boolean) => (
        <Badge color={value ? 'green' : 'gray'} variant="soft">
          {value ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    { id: 'createdAt', title: 'Created', formatter: dateFormatter },
    { type: 'actions' as const, title: 'Actions' },
  ];

  return (
    <PageLayout heading="All Releases">
      <DataFilter filters={filters} />
      <DataTable headers={headers} data={rows} Actions={Actions} />
      <Pagination count={count} />
    </PageLayout>
  );
}

const getReleaseWhere = (search?: string, status?: string): Prisma.ReleaseWhereInput | undefined => {
  const conditions: Prisma.ReleaseWhereInput[] = [];

  if (status) {
    conditions.push({ status: status as Prisma.ReleaseWhereInput['status'] });
  }

  if (search) {
    conditions.push({
      OR: [
        { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { platformHandle: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { club: { name: { contains: search, mode: Prisma.QueryMode.insensitive } } },
        { club: { merchant: { shop: { contains: search, mode: Prisma.QueryMode.insensitive } } } },
        {
          club: {
            merchant: { platformShopName: { contains: search, mode: Prisma.QueryMode.insensitive } },
          },
        },
      ],
    });
  }

  return conditions.length > 0 ? { AND: conditions } : undefined;
};
