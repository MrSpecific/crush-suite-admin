import { prismaClubs } from '@/lib/prisma-clubs';
import { PageLayout } from '@/app/components/PageLayout';
import { DataTable } from '@/app/components/DataTable';
import { Pagination } from '@/app/components/Pagination';
import { DataFilter, type SelectDataFilter } from '@/app/components/DataFilter';
import { queryPagination } from '@/lib/queryPagination';
import { clubStatusFormatter, clubTypeFormatter, dateFormatter } from '@/lib/formatters';
import { clubStatusMetaData, clubTypeMetaData } from '@/lib/metaData';
import { ButtonLink } from '@/app/components/ButtonLink';
import { Prisma, type ClubStatus, type ClubType } from '@/generated/prisma/clubs';

const Actions = ({ id, merchantId }: { id: string; merchantId: number }) => (
  <ButtonLink href={`/clubs/merchants/${merchantId}/clubs/${id}`}>View</ButtonLink>
);

export default async function Page(props: { searchParams: Promise<PageSearchParams> }) {
  const searchParams = await props.searchParams;
  const { page, search, status, type, merchant } = searchParams;
  const where = getClubWhere(
    search?.toString(),
    status?.toString(),
    type?.toString(),
    merchant ? parseInt(merchant.toString()) : undefined
  );
  const [count, merchants] = await Promise.all([
    prismaClubs.club.count({ where }),
    prismaClubs.merchant.findMany({
      where: { Club: { some: {} } },
      orderBy: { shop: 'asc' },
      select: { id: true, shop: true, platformShopName: true },
    }),
  ]);
  const clubs = await prismaClubs.club.findMany({
    ...queryPagination({ page, count }),
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      merchantId: true,
      name: true,
      status: true,
      clubType: true,
      membershipPrice: true,
      createdAt: true,
      merchant: {
        select: { shop: true, platformShopName: true },
      },
    },
  });

  const filters: SelectDataFilter[] = [
    {
      label: 'Status',
      name: 'status',
      options: Object.entries(clubStatusMetaData).map(([value, { label }]) => ({ label, value })),
    },
    {
      label: 'Type',
      name: 'type',
      allLabel: 'All Types',
      options: Object.entries(clubTypeMetaData).map(([value, { label }]) => ({ label, value })),
    },
    {
      label: 'Merchant',
      name: 'merchant',
      allLabel: 'All Merchants',
      options: merchants.map((m) => ({
        label: m.platformShopName ?? m.shop,
        value: m.id.toString(),
      })),
    },
  ];

  const headers = [
    {
      id: 'name',
      title: 'Club Name',
      href: (value: string, row: { id: string; merchantId: number }) =>
        `/clubs/merchants/${row.merchantId}/clubs/${row.id}`,
    },
    {
      id: 'merchant',
      title: 'Merchant',
      formatter: (value: { shop: string; platformShopName: string | null }) =>
        value.platformShopName ?? value.shop,
    },
    {
      id: 'status',
      title: 'Status',
      formatter: clubStatusFormatter,
    },
    { id: 'clubType', title: 'Type', formatter: clubTypeFormatter },
    {
      id: 'membershipPrice',
      title: 'Price',
      formatter: (value: number) => (value ? `$${value.toFixed(2)}` : '—'),
    },
    { id: 'createdAt', title: 'Created', formatter: dateFormatter },
    { type: 'actions' as const, title: 'Actions' },
  ];

  return (
    <PageLayout heading="All Clubs">
      <DataFilter filters={filters} />
      <DataTable headers={headers} data={clubs} Actions={Actions} />
      <Pagination count={count} />
    </PageLayout>
  );
}

// Unknown status/type values from the URL are ignored rather than passed to Prisma, which would throw on them.
const isClubStatus = (value?: string): value is ClubStatus =>
  !!value && value in clubStatusMetaData;
const isClubType = (value?: string): value is ClubType => !!value && value in clubTypeMetaData;

const getClubWhere = (
  search?: string,
  status?: string,
  type?: string,
  merchantId?: number
): Prisma.ClubWhereInput | undefined => {
  const conditions: Prisma.ClubWhereInput[] = [];

  if (merchantId !== undefined && !isNaN(merchantId)) {
    conditions.push({ merchantId });
  }

  if (isClubStatus(status)) {
    conditions.push({ status });
  }

  if (isClubType(type)) {
    conditions.push({ clubType: type });
  }

  if (search) {
    conditions.push({
      OR: [
        { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { platformHandle: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { merchant: { shop: { contains: search, mode: Prisma.QueryMode.insensitive } } },
        {
          merchant: { platformShopName: { contains: search, mode: Prisma.QueryMode.insensitive } },
        },
      ],
    });
  }

  return conditions.length > 0 ? { AND: conditions } : undefined;
};
