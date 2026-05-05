import { prismaClubs } from '@/lib/prisma-clubs';
import { PageLayout } from '@/app/components/PageLayout';
import { DataTable } from '@/app/components/DataTable';
import { Pagination } from '@/app/components/Pagination';
import { queryPagination } from '@/lib/queryPagination';
import { dateFormatter } from '@/lib/formatters';
import { DataFilter } from '@/app/components/DataFilter';
import { Badge } from '@radix-ui/themes';
import { ButtonLink } from '@/app/components/ButtonLink';
import { Prisma } from '@/generated/prisma/clubs';
import { clubsMerchantStatusMetaData } from '@/lib/metaData';

const Actions = ({ id }: { id: number }) => (
  <ButtonLink href={`/clubs/merchants/${id}`}>View</ButtonLink>
);

export default async function Page({ searchParams }: { searchParams: PageSearchParams }) {
  const { page, search } = searchParams;
  const searchString = search?.toString();
  const where = getMerchantWhere(searchString);
  const count = await prismaClubs.merchant.count({ where });
  const merchants = await prismaClubs.merchant.findMany({
    ...queryPagination({ page, count }),
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      shop: true,
      platformShopName: true,
      platformEmail: true,
      status: true,
      createdAt: true,
    },
  });

  const headers = [
    { id: 'shop', title: 'Shop' },
    { id: 'platformShopName', title: 'Name' },
    { id: 'platformEmail', title: 'Email' },
    {
      id: 'status',
      title: 'Status',
      formatter: (value: string) => {
        const meta = clubsMerchantStatusMetaData[value as keyof typeof clubsMerchantStatusMetaData] ?? { label: value, color: 'gray' };
        return <Badge color={meta.color}>{meta.label}</Badge>;
      },
    },
    { id: 'createdAt', title: 'Created At', formatter: dateFormatter },
    { type: 'actions' as const, title: 'Actions' },
  ];

  return (
    <PageLayout heading="Merchants">
      <DataFilter />
      <DataTable headers={headers} data={merchants} Actions={Actions} />
      <Pagination count={count} />
    </PageLayout>
  );
}

const getMerchantWhere = (search?: string): Prisma.MerchantWhereInput | undefined => {
  if (!search) return undefined;

  return {
    OR: [
      { shop: { contains: search, mode: Prisma.QueryMode.insensitive } },
      { platformShopName: { contains: search, mode: Prisma.QueryMode.insensitive } },
      { platformEmail: { contains: search, mode: Prisma.QueryMode.insensitive } },
    ],
  };
};
