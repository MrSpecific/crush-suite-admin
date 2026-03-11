import { Order } from '@prisma/client';
import { prisma, QueryMode } from '@/lib/prisma';
import { Box, Flex, Grid, Heading } from '@radix-ui/themes';
import { Link } from '@/app/components/Link';
import { NotFound } from '@/app/components/NotFound';
import { PageLayout } from '@/app/components/PageLayout';
import { DataFilter } from '@/app/components/DataFilter';
import { DataTable } from '@/app/components/DataTable';
import { Pagination } from '@/app/components/Pagination';
import { QuickDataList } from '@/app/components/QuickDataList';
import { ComplianceMap, type StateRecord } from '@/app/components/ComplianceMap';
import { queryPagination } from '@/lib/queryPagination';
import {
  dateFormatter,
  dateTimeFormatter,
  currencyFormatter,
  noNullsFormatter,
} from '@/lib/formatters';
import { ButtonLink } from '@/app/components/ButtonLink';
import { OrderTableActions, getOrderTableHeaders } from '@/app/orders/orderTable';

const productsTake = 10;
const ordersTake = 20;

export default async function Page({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: PageSearchParams;
}) {
  const { id } = params;
  const merchantId = parseInt(id);
  const { page, search } = searchParams;
  const searchString = search?.toString();
  const where = search
    ? {
        OR: [{ name: { contains: searchString, mode: QueryMode.insensitive } }],
        AND: [{ merchantId }],
      }
    : {
        merchantId,
      };

  const productCount = await prisma.product.count({ where });
  const products = await prisma.product.findMany({
    ...queryPagination({ page, take: productsTake }),
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
    { id: 'compliancePartner', title: 'Compliance Partner' },
  ];

  const events = await prisma.precomplianceEvent.findMany({
    where: {
      merchantId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
  });

  const orderCount = await prisma.order.count({
    where: {
      merchantId,
    },
  });

  const orders = await prisma.order.findMany({
    where: {
      merchantId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: ordersTake,
  });

  const data = await prisma.merchant.findUnique({
    where: {
      id: merchantId,
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
              { label: 'Created On', value: dateFormatter(data.createdAt) },
              { label: 'Updated On', value: dateFormatter(data.updatedAt) },
              { label: 'Synced On', value: data.syncedAt ? dateFormatter(data.syncedAt) : 'Never' },
              {
                label: 'Uninstalled On',
                value: data.uninstalledAt ? dateFormatter(data.uninstalledAt) : undefined,
                badge: true,
                color: 'orange',
              },
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

      <MerchantOrders orders={orders} merchantId={id} count={orderCount} />

      <Heading>Products for this merchant</Heading>
      <MerchantProducts products={products} headers={productHeaders} count={productCount} />

      <MerchantEvents events={events} merchantId={id} />
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
      <Pagination take={productsTake} count={count} />
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
          { type: 'data', title: 'Data' },
          { id: 'sessionId', title: 'Session ID' },
          { id: 'eventType', title: 'Type' },
          { id: 'createdAt', title: 'Created At', formatter: dateTimeFormatter },
          { id: 'failedReason', title: 'Failed Reason', formatter: noNullsFormatter },
        ]}
        data={events}
      />
      <ButtonLink href={`/merchants/${merchantId}/events`}>All Events</ButtonLink>
    </Box>
  );
};

const MerchantOrders = ({
  orders,
  merchantId,
  count,
}: {
  orders: Order[];
  merchantId: string;
  count: number;
}) => {
  return (
    <Box my="4">
      <Flex justify="between" gap="2">
        <Heading mb="2">Recent Orders</Heading>
        {count > ordersTake && <Link href={`/merchants/${merchantId}/orders`}>View More</Link>}
      </Flex>
      <DataTable
        headers={getOrderTableHeaders({ includeMerchant: false })}
        data={orders}
        Actions={OrderTableActions}
      />
      {count > ordersTake && <Link href={`/merchants/${merchantId}/orders`}>View More</Link>}
    </Box>
  );
};
