import { prisma, QueryMode } from '@/lib/prisma';
import { PageLayout } from '@/app/components/PageLayout';
import { DataTable } from '@/app/components/DataTable';
import { Pagination } from '@/app/components/Pagination';
import { queryPagination } from '@/lib/queryPagination';
import {
  dateFormatter,
  issuesFormatter,
  merchantFormatter,
  orderLinkFormatter,
  currencyFormatterWithDecimals,
} from '@/lib/formatters';
import { Box, Flex, Text } from '@radix-ui/themes';
import { ButtonLink } from '@/app/components/ButtonLink';
import { Link } from '@/app/components/Link';
import { truncate } from 'fs';

export default async function Page({ searchParams }: { searchParams: PageSearchParams }) {
  const { page, search } = searchParams;
  const searchString = search?.toString();
  // const where = search
  //   ? {
  //       OR: [
  //         { firstName: { contains: searchString, mode: QueryMode.insensitive } },
  //         { lastName: { contains: searchString, mode: QueryMode.insensitive } },
  //       ],
  //     }
  //   : undefined;
  const count = await prisma.apiAccess.count();
  const discounts = await prisma.apiAccess.findMany({
    ...queryPagination({ page }),
    include: { merchant: true },
    orderBy: { createdAt: 'desc' },
  });
  type DataHeaders = QueryToHeader<typeof discounts>[];

  const headers: DataHeaders = [
    { type: 'data', title: 'Data' },
    // { id: 'id', title: 'ID', formatter: orderLinkFormatter },
    { id: 'merchant', title: 'Merchant', formatter: merchantFormatter },
    { id: 'createdAt', title: 'Created At', formatter: dateFormatter },
    { id: 'updatedAt', title: 'Updated At', formatter: dateFormatter },
    // { id: 'platform', title: 'Platform' },
    // { id: 'description', title: 'Description' },
    // { id: 'value', title: 'Value', clipboard: true },
    // { id: 'uses', title: 'Uses' },
    // {
    //   id: 'compliancePartnerOrderId',
    //   title: 'Order Ids',
    //   formatter: orderIdsFormatter,
    // },
    // { id: 'platformOrderId', title: 'Platform Order Id' },
    // { id: 'status', title: 'Status' },
    // { id: 'issues', title: 'Issues', formatter: issuesFormatter },
    { type: 'actions', title: 'Actions' },
  ];

  return (
    <PageLayout heading="API Keys" actions={[{ label: 'Add New', href: '/api-keys/add' }]}>
      <DataTable headers={headers} data={discounts} Actions={Actions} />
      <Pagination count={count} />
    </PageLayout>
  );
}

const Actions = ({ ...props }) => {
  return (
    <Flex gap="2">
      <ButtonLink href={`/api-keys/${props.id}`}>View</ButtonLink>
      <ButtonLink href={`/api-keys/${props.id}/edit`}>Edit</ButtonLink>
    </Flex>
  );
};
