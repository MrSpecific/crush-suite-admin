// import { Proposal as ProposalType } from '@prisma/client';
import { prisma, QueryMode } from '@/lib/prisma';
import { Box, Flex, Grid, Heading, Text } from '@radix-ui/themes';
import { Link } from '@/app/components/Link';
import { NotFound } from '@/app/components/NotFound';
import { PageLayout } from '@/app/components/PageLayout';
import { DataFilter } from '@/app/components/DataFilter';
import { DataTable } from '@/app/components/DataTable';
import { EditDialog } from '@/app/components/EditDialog';
import { Pagination } from '@/app/components/Pagination';
import { QuickDataList } from '@/app/components/QuickDataList';
import { ComplianceMap, type StateRecord } from '@/app/components/ComplianceMap';
import { queryPagination } from '@/lib/queryPagination';
import {
  dateFormatter,
  dateTimeFormatter,
  currencyFormatter,
  linkFormatter,
  noNullsFormatter,
} from '@/lib/formatters';
import { ButtonLink } from '@/app/components/ButtonLink';

export default async function Page({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: PageSearchParams;
}) {
  const { id } = params;
  const { page, search } = searchParams;
  const searchString = search?.toString();
  const where = search
    ? {
        OR: [{ name: { contains: searchString, mode: QueryMode.insensitive } }],
        AND: [{ merchantId: parseInt(id) }],
      }
    : {
        merchantId: parseInt(id),
      };
  const productCount = await prisma.product.count({ where });
  const products = await prisma.product.findMany({
    ...queryPagination({ page }),
    where,
  });
  type DataHeaders = QueryToHeader<typeof products>[];

  const productHeaders: DataHeaders = [
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
    // { id: 'platform', title: 'Platform' },
    { id: 'compliancePartner', title: 'Compliance Partner' },
    // { type: 'actions', title: 'Actions' },
  ];

  const events = await prisma.precomplianceEvent.findMany({
    where: {
      merchantId: parseInt(id),
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
  });

  const data = await prisma.merchant.findUnique({
    where: {
      id: parseInt(id),
    },
    include: {
      billingPlan: true,
    },
  });

  if (!id || !data) return <NotFound message="Merchant Not Found" />;

  const {
    shop,
    compliancePartner,
    compliancePartnerId,
    compliancePartnerAccountName,
    status,
    billingPlan,
    platformPlanName,
    salesUSAStates,
    platformEmail,
  } = data;
  const stateList = salesUSAStates ? (salesUSAStates as StateRecord[]).map((s) => s.name) : [];

  return (
    <PageLayout heading={compliancePartnerAccountName ?? shop}>
      <Grid columns={{ initial: '1', md: '2' }} gap="4">
        <Box>
          <QuickDataList
            data={[
              { label: 'Shop', value: shop, linkTo: `//${shop}` },
              { label: 'Compliance Partner', value: compliancePartner },
              { label: 'Compliance Partner ID', value: compliancePartnerId },
              { label: 'Billing Plan', value: billingPlan?.name },
              { label: 'Status', value: status, badge: true },
              { label: 'Platform Plan', value: platformPlanName },
              { label: 'Admin Email', value: platformEmail, linkTo: `mailto:${platformEmail}` },
            ]}
          />
        </Box>
        <Box>
          <Heading as="h2" size="2" color="gray">
            Merchant sells in:
          </Heading>
          <ComplianceMap states={stateList} />
        </Box>
      </Grid>
      {/* <Flex align="start" justify="end" gap="2">
        <Link href={`/merchants/${id}/edit`}>Edit</Link>
      </Flex> */}

      {/* {JSON.stringify(events)} */}
      <MerchantEvents events={events} merchantId={id} />

      <Heading>Products for this merchant</Heading>
      <MerchantProducts products={products} headers={productHeaders} count={productCount} />
    </PageLayout>
  );
}

const MerchantProducts = ({
  products,
  count = 0,
  headers,
}: {
  products: any;
  count: number;
  headers: any;
}) => {
  return (
    <Box>
      <DataFilter />
      <DataTable headers={headers} data={products} />
      <Pagination take={10} count={count} />
    </Box>
  );
};

const MerchantEvents = ({ events, merchantId }: { events: any; merchantId: any }) => {
  return (
    <Box my="4">
      <Flex justify="between" gap="2">
        <Heading mb="2">Recent Events</Heading>
        <Link href={`/merchants/${merchantId}/events`}>View All</Link>
      </Flex>
      <DataTable
        headers={[
          { id: 'sessionId', title: 'Session ID' },
          { id: 'eventType', title: 'Type' },
          // { id: 'shop', title: 'Shop' },
          { id: 'createdAt', title: 'Created At', formatter: dateTimeFormatter },
          // { id: 'updatedAt', title: 'Updated At', formatter: dateFormatter },
          { id: 'failedReason', title: 'Failed Reason', formatter: noNullsFormatter },
        ]}
        data={events}
      />
      <ButtonLink href={`/merchants/${merchantId}/events`}>All Events</ButtonLink>
    </Box>
  );
};
