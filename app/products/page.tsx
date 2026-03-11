import { prisma, QueryMode } from '@/lib/prisma';
import { PageLayout } from '@/app/components/PageLayout';
import { DataFilter } from '@/app/components/DataFilter';
import { DataTable } from '@/app/components/DataTable';
import { EditDialog } from '@/app/components/EditDialog';
import { Pagination } from '@/app/components/Pagination';
import { queryPagination } from '@/lib/queryPagination';
import {
  dateFormatter,
  currencyFormatter,
  linkToMerchantFormatter,
  linkToProductFormatter,
} from '@/lib/formatters';

const Actions = ({ ...props }) => {
  return (
    <EditDialog title="Edit Merchant" trigger="Edit">
      Hello
      {/* {JSON.stringify(props)} */}
    </EditDialog>
  );
};

export default async function Page({ searchParams }: { searchParams: PageSearchParams }) {
  const { page, search } = searchParams;
  const searchString = search?.toString();
  const where = search
    ? {
        OR: [{ name: { contains: searchString, mode: QueryMode.insensitive } }],
      }
    : undefined;
  const count = await prisma.product.count({ where });
  const data = await prisma.product.findMany({
    ...queryPagination({ page }),
    where,
  });
  type DataHeaders = QueryToHeader<typeof data>[];

  const headers: DataHeaders = [
    { type: 'data', title: 'Data' },
    { id: 'id', title: 'ID' },
    { id: 'name', title: 'Name', formatter: linkToProductFormatter },
    { id: 'alcohol', title: 'Alcohol' },
    { id: 'abv', title: 'ABV' },
    {
      id: 'volume',
      title: 'Volume',
      formatter: (value, row) => (value ? `${value} ${row.volumeUnits}` : ''),
    },
    { id: 'price', title: 'Price', formatter: currencyFormatter },
    { id: 'shop', title: 'Shop', formatter: linkToMerchantFormatter },
    { id: 'createdAt', title: 'Created At', formatter: dateFormatter },
    { id: 'updatedAt', title: 'Updated At', formatter: dateFormatter },
    { id: 'syncedAt', title: 'Synced At', formatter: dateFormatter },
    // { id: 'platform', title: 'Platform' },
    { id: 'compliancePartner', title: 'Compliance Partner' },
    // { type: 'actions', title: 'Actions' },
  ];

  return (
    <PageLayout heading="Products">
      <DataFilter />
      <DataTable headers={headers} data={data} Actions={Actions} />
      <Pagination take={10} count={count} />
    </PageLayout>
  );
}
