import { prisma, QueryMode } from '@/lib/prisma';
import { PageLayout } from '@/app/components/PageLayout';
import { DataTable } from '@/app/components/DataTable';
import { EditDialog } from '@/app/components/EditDialog';
import { Pagination } from '@/app/components/Pagination';
import { queryPagination } from '@/lib/queryPagination';
import { dateFormatter, linkToMerchantFormatter } from '@/lib/formatters';
import { DataFilter } from '@/app/components/DataFilter';
import { Flex } from '@radix-ui/themes';
import { ButtonLink } from '@/app/components/ButtonLink';

const Actions = ({ ...props }) => {
  return (
    <Flex gap="2">
      <EditDialog title="Edit Merchant" trigger="Edit">
        Hello
        {/* {JSON.stringify(props)} */}
      </EditDialog>
      <ButtonLink href={`/merchants/${props.id}`}>View</ButtonLink>
    </Flex>
  );
};

export default async function Page({ searchParams }: { searchParams: PageSearchParams }) {
  const { page, search } = searchParams;
  const searchString = search?.toString();
  const where = search
    ? {
        OR: [{ shop: { contains: searchString, mode: QueryMode.insensitive } }],
      }
    : undefined;
  const count = await prisma.merchant.count({ where });
  const merchants = await prisma.merchant.findMany({
    ...queryPagination({ page }),
    where,
    include: {
      billingPlan: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  type DataHeaders = QueryToHeader<typeof merchants>[];

  const headers: DataHeaders = [
    { type: 'data', title: 'Data' },
    // { id: 'id', title: 'ID' },
    { id: 'compliancePartnerAccountName', title: 'Name' },
    { id: 'shop', title: 'Shop', formatter: linkToMerchantFormatter },
    { id: 'createdAt', title: 'Created At', formatter: dateFormatter },
    // { id: 'updatedAt', title: 'Updated At', formatter: dateFormatter },
    // { id: 'uninstalledAt', title: 'Uninstalled At', formatter: dateFormatter },
    // { id: 'syncedAt', title: 'Synced At', formatter: dateFormatter },
    { id: 'status', title: 'Status' },
    { id: 'billingPlan', title: 'Billing Plan', formatter: (value) => value?.name },
    { id: 'compliancePartner', title: 'Compliance Partner' },
    { type: 'actions', title: 'Actions' },
  ];

  return (
    <PageLayout heading="Merchants">
      <DataFilter />
      <DataTable headers={headers} data={merchants} Actions={Actions} />
      <Pagination count={count} />
    </PageLayout>
  );
}
