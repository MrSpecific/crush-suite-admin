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
  const count = await prisma.subscriptionDiscount.count();
  const discounts = await prisma.subscriptionDiscount.findMany({
    ...queryPagination({ page }),
    include: {
      merchants: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  type DataHeaders = QueryToHeader<typeof discounts>[];

  const headers: DataHeaders = [
    { type: 'data', title: 'Data' },
    // { id: 'id', title: 'ID', formatter: orderLinkFormatter },
    // {
    //   id: 'merchant',
    //   title: 'Merchant',
    //   formatter: merchantFormatter,
    // },
    {
      id: 'createdAt',
      title: 'Created At',
      formatter: dateFormatter,
    },
    { id: 'updatedAt', title: 'Updated At', formatter: dateFormatter },
    { id: 'platform', title: 'Platform' },
    { id: 'description', title: 'Description' },
    { id: 'value', title: 'Value', clipboard: true },
    { id: 'uses', title: 'Uses' },
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
    <PageLayout heading="Discounts" actions={[{ label: 'Add New', href: '/discounts/add' }]}>
      <DataTable headers={headers} data={discounts} Actions={Actions} />
      <Pagination count={count} />
    </PageLayout>
  );
}

const Actions = ({ ...props }) => {
  return (
    <Flex gap="2">
      <ButtonLink href={`/discounts/${props.id}`}>View</ButtonLink>
      <ButtonLink href={`/discounts/${props.id}/edit`}>Edit</ButtonLink>
    </Flex>
  );
};

const orderIdsFormatter = (value: any, row: any) => (
  <Flex direction="column" gap="2">
    <Box>
      <Text as="div" size="1" color="gray">
        Compliance Partner Order ID:
      </Text>
      {value}
    </Box>
    <Box>
      <Text as="div" size="1" color="gray">
        Platform Order Id:
      </Text>
      {row.platformOrderId}
    </Box>
  </Flex>
);

// const costsFormatter = (value: any, row: any) => (
//   <Flex direction="column" gap="2">
//     <Box>
//       <Text as="div" size="1" color="gray">
//         Total Value:
//       </Text>
//       {currencyFormatterWithDecimals(value)}
//     </Box>
//     <Box>
//       <Text as="div" size="1" color="gray">
//         Total Tax:
//       </Text>
//       {currencyFormatterWithDecimals(row.totalTax)}
//     </Box>
//   </Flex>
// );

const costsFormatter = (value: any, row: any) => (
  <VerticalList
    values={[
      {
        label: 'Total Value',
        value: currencyFormatterWithDecimals(row.totalValue),
        weight: 'bold',
      },
      { label: 'Total Tax', value: currencyFormatterWithDecimals(row.totalTax) },
      {
        label: 'Total Discounts',
        value: row.totalDiscounts ? currencyFormatterWithDecimals(row.totalDiscounts) : undefined,
      },
    ]}
  />
);

const VerticalList = ({
  values,
}: {
  values: { label?: string; value?: string; weight?: 'bold' }[];
}) => {
  if (!values) return null;

  return (
    <Flex direction="column" gap="2">
      {values.map(
        ({ label, value, weight }) =>
          value && (
            <Box key={`${label}-${value}`}>
              <Text as="div" size="1" color="gray">
                {label}:
              </Text>
              <Text weight={weight}>{value}</Text>
            </Box>
          )
      )}
    </Flex>
  );
};
