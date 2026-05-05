import { prismaClubs } from '@/lib/prisma-clubs';
import { PageLayout } from '@/app/components/PageLayout';
import { DataTable } from '@/app/components/DataTable';
import { Pagination } from '@/app/components/Pagination';
import { queryPagination } from '@/lib/queryPagination';
import { dateFormatter } from '@/lib/formatters';
import { Badge } from '@radix-ui/themes';
import type { RadixColor } from '@/types/radix-ui';
import { ButtonLink } from '@/app/components/ButtonLink';

const clubStatusColor: Record<string, RadixColor> = {
  draft: 'gray',
  published: 'green',
  archived: 'orange',
};

const Actions = ({ id, merchantId }: { id: string; merchantId: number }) => (
  <ButtonLink href={`/clubs/merchants/${merchantId}/clubs/${id}`}>View</ButtonLink>
);

export default async function Page({ searchParams }: { searchParams: PageSearchParams }) {
  const { page } = searchParams;
  const count = await prismaClubs.club.count();
  const clubs = await prismaClubs.club.findMany({
    ...queryPagination({ page, count }),
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

  const headers = [
    { id: 'name', title: 'Club Name' },
    {
      id: 'merchant',
      title: 'Merchant',
      formatter: (value: { shop: string; platformShopName: string | null }) =>
        value.platformShopName ?? value.shop,
    },
    {
      id: 'status',
      title: 'Status',
      formatter: (value: string) => (
        <Badge color={clubStatusColor[value] ?? 'gray'}>{value}</Badge>
      ),
    },
    { id: 'clubType', title: 'Type' },
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
      <DataTable headers={headers} data={clubs} Actions={Actions} />
      <Pagination count={count} />
    </PageLayout>
  );
}
