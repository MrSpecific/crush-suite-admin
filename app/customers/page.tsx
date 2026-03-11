import { prisma, QueryMode } from '@/lib/prisma';
import { PageLayout } from '@/app/components/PageLayout';
import { DataFilter } from '@/app/components/DataFilter';
import { DataTable } from '@/app/components/DataTable';
import { EditDialog } from '@/app/components/EditDialog';
import { dateFormatter, dateTimeFormatter, emailFormatter } from '@/lib/formatters';
import { Pagination } from '@/app/components/Pagination';
import { queryPagination } from '@/lib/queryPagination';

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
        OR: [
          { firstName: { contains: searchString, mode: QueryMode.insensitive } },
          { lastName: { contains: searchString, mode: QueryMode.insensitive } },
        ],
      }
    : undefined;
  const count = await prisma.customer.count({ where });
  const customers = await prisma.customer.findMany({
    ...queryPagination({ page }),
    where,
  });
  type DataHeaders = QueryToHeader<typeof customers>[];

  const headers: DataHeaders = [
    { type: 'data', title: 'Data' },
    { id: 'id', title: 'ID' },
    { id: 'firstName', title: 'First Name' },
    { id: 'lastName', title: 'Last Name' },
    { id: 'email', title: 'Email', formatter: emailFormatter },
    { id: 'shop', title: 'Shop' },
    { id: 'createdAt', title: 'Created At', formatter: dateFormatter },
    { id: 'updatedAt', title: 'Updated At', formatter: dateFormatter },
    { id: 'syncedAt', title: 'Synced At', formatter: dateTimeFormatter },
    // { id: 'platform', title: 'Platform' },
    { id: 'platformCustomerId', title: 'Platform Customer ID' },
    // { id: 'compliancePartner', title: 'Compliance Partner' },
    // { type: 'actions', title: 'Actions' },
  ];

  return (
    <PageLayout heading="Customers">
      <DataFilter />
      <DataTable headers={headers} data={customers} Actions={Actions} />
      <Pagination count={count} />
    </PageLayout>
  );
}
