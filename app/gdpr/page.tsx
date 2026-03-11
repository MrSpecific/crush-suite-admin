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
import { Badge, Box, Flex, Text } from '@radix-ui/themes';
import { ButtonLink, ButtonLinkSpinner } from '@/app/components/ButtonLink';
import { Link } from '@/app/components/Link';

export default async function Page({ searchParams }: { searchParams: PageSearchParams }) {
  const { page, search } = searchParams;
  const searchString = search?.toString();
  const count = await prisma.gDPR.count();
  const requests = await prisma.gDPR.findMany({
    ...queryPagination({ page }),
    include: {
      merchant: {
        select: { compliancePartnerAccountName: true, shop: true, id: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // type RequestsResponse = typeof requests[0] & {
  //   customer?: {
  //     id: string;
  //     firstName: string;
  //     lastName: string;
  //     email: string;
  //   } | null;
  // };

  // Fetch customer data separately since there is no relationship
  const customerIds = requests.map((request) => request.customerId!).filter(Boolean);

  const customers = await prisma.customer.findMany({
    where: { id: { in: customerIds } },
    select: { id: true, firstName: true, lastName: true, email: true }, // Adjust fields as needed
  });

  // Map customer data back to requests
  const customerMap = customers.reduce(
    (acc, customer) => {
      acc[customer.id] = customer;
      return acc;
    },
    {} as Record<string, (typeof customers)[number]>
  );

  // (requests as RequestsResponse).forEach((request: RequestsResponse[0]) => {
  //   request.customer = customerMap[request.customerId] || null;
  // });

  type DataHeaders = QueryToHeader<typeof requests>[];

  const headers: DataHeaders = [
    { type: 'data', title: 'Data' },
    // { id: 'id', title: 'ID', formatter: orderLinkFormatter },
    {
      id: 'merchant',
      title: 'Merchant',
      formatter: merchantFormatter,
    },
    {
      id: 'createdAt',
      title: 'Created At',
      formatter: dateFormatter,
    },
    { id: 'customerId', title: 'Customer', formatter: customerFormatter(customerMap) },
    // { id: 'updatedAt', title: 'Updated At', formatter: dateFormatter },
    // { id: 'compliancePartner', title: 'Compliance Partner' },
    // { id: 'totalValue', title: 'Value', formatter: costsFormatter },
    // { id: 'platformOrderId', title: 'Platform Order Id' },
    // { id: 'status', title: 'Status' },
    // { id: 'issues', title: 'Issues', formatter: issuesFormatter },
    { id: 'completed', title: 'Completed', formatter: completedFormatter },
    { type: 'actions', title: 'Actions' },
  ];

  return (
    <PageLayout heading="Active GDPR Requests">
      <DataTable headers={headers} data={requests} Actions={Actions} />
      <Pagination count={count} />
    </PageLayout>
  );
}

const Actions = ({ ...props }) => {
  return (
    <Flex gap="2">
      <ButtonLinkSpinner href={`/gdpr/${props.id}`}>View</ButtonLinkSpinner>
    </Flex>
  );
};

const customerFormatter = (customerMap: Record<string, any>) => {
  const formatter = (value: any, row: any) => {
    if (!value) return null;

    const customer = customerMap[value];
    if (!customer) return null;

    const { firstName, lastName, email } = customer;

    return (
      <Flex direction="column" gap="2">
        <Box>
          <Text as="div" size="1" color="gray">
            Name:
          </Text>
          <Text weight="bold">{`${firstName} ${lastName}`}</Text>
        </Box>
        <Box>
          <Text as="div" size="1" color="gray">
            Email:
          </Text>
          {email}
        </Box>
      </Flex>
    );
  };

  // Set the display name
  formatter.displayName = 'CustomerFormatter';

  return formatter;
};

const completedFormatter = (value: boolean, row: any) => {
  return (
    <Badge size="1" color={value ? 'green' : 'red'} variant="solid">
      {value ? 'Completed' : 'Not Complete'}
    </Badge>
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
