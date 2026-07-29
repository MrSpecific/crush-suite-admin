import { prismaClubs } from '@/lib/prisma-clubs';
import { PageLayout } from '@/app/components/PageLayout';
import { DataTable } from '@/app/components/DataTable';
import { Pagination } from '@/app/components/Pagination';
import { queryPagination } from '@/lib/queryPagination';
import { clubStatusFormatter, clubTypeFormatter, dateFormatter } from '@/lib/formatters';
import { ButtonLink } from '@/app/components/ButtonLink';

const Actions = ({ id, merchantId }: { id: string; merchantId: number }) => (
  <ButtonLink href={`/clubs/merchants/${merchantId}/clubs/${id}`}>View</ButtonLink>
);

export default async function Page(props: { searchParams: Promise<PageSearchParams> }) {
  const searchParams = await props.searchParams;
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
      <DataTable headers={headers} data={clubs} Actions={Actions} />
      <Pagination count={count} />
    </PageLayout>
  );
}
