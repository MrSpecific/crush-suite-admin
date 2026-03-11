import { DataFilter } from '@/app/components/DataFilter';
import { DataTable } from '@/app/components/DataTable';
import { NotFound } from '@/app/components/NotFound';
import { PageLayout } from '@/app/components/PageLayout';
import { Pagination } from '@/app/components/Pagination';
import { prisma, QueryMode } from '@/lib/prisma';
import { queryPagination } from '@/lib/queryPagination';
import { currencyFormatter, dateFormatter } from '@/lib/formatters';

const productsTake = 10;

export default async function Page({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: PageSearchParams;
}) {
  const merchantId = parseInt(params.id);
  const { page, search } = searchParams;
  const searchString = search?.toString();

  const merchant = await prisma.merchant.findUnique({
    where: {
      id: merchantId,
    },
    select: {
      id: true,
      shop: true,
      compliancePartnerAccountName: true,
    },
  });

  if (!params.id || !merchant) return <NotFound message="Merchant Not Found" />;

  const where = search
    ? {
        OR: [{ name: { contains: searchString, mode: QueryMode.insensitive } }],
        AND: [{ merchantId }],
      }
    : {
        merchantId,
      };

  const count = await prisma.product.count({ where });
  const products = await prisma.product.findMany({
    ...queryPagination({ page, take: productsTake }),
    where,
    orderBy: {
      createdAt: 'desc',
    },
  });
  type DataHeaders = QueryToHeader<typeof products>[];

  const headers: DataHeaders = [
    { type: 'data', title: 'Data' },
    { id: 'id', title: 'ID' },
    { id: 'name', title: 'Name' },
    { id: 'alcohol', title: 'Alcohol' },
    { id: 'abv', title: 'ABV' },
    {
      id: 'volume',
      title: 'Volume',
      formatter: (value, row) => (value ? `${value} ${row.volumeUnits}` : ''),
    },
    { id: 'price', title: 'Price', formatter: currencyFormatter },
    { id: 'shop', title: 'Shop' },
    { id: 'createdAt', title: 'Created At', formatter: dateFormatter },
    { id: 'updatedAt', title: 'Updated At', formatter: dateFormatter },
    { id: 'syncedAt', title: 'Synced At', formatter: dateFormatter },
    { id: 'compliancePartner', title: 'Compliance Partner' },
  ];

  return (
    <PageLayout
      heading={`Products for ${merchant.compliancePartnerAccountName ?? merchant.shop}`}
      actions={[{ label: 'Back to Merchant', href: `/merchants/${merchant.id}` }]}
    >
      <DataFilter />
      <DataTable headers={headers} data={products} />
      <Pagination take={productsTake} count={count} />
    </PageLayout>
  );
}
