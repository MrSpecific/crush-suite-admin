import { Order } from '@prisma/client';
import { prisma, QueryMode } from '@/lib/prisma';
import { Badge, Box, Card, Flex, Grid, Heading, Text } from '@radix-ui/themes';
import { Link } from '@/app/components/Link';
import { NotFound } from '@/app/components/NotFound';
import { PageLayout } from '@/app/components/PageLayout';
import { DataFilter } from '@/app/components/DataFilter';
import { DataTable } from '@/app/components/DataTable';
import { Pagination } from '@/app/components/Pagination';
import { QuickDataList } from '@/app/components/QuickDataList';
import { CompliancePartnerConnectionBadge } from '@/app/components/CompliancePartnerConnectionBadge';
import { ComplianceMap, type StateRecord } from '@/app/components/ComplianceMap';
import { queryPagination } from '@/lib/queryPagination';
import {
  dateFormatter,
  dateTimeFormatter,
  currencyFormatter,
  currencyFormatterWithDecimals,
  noNullsFormatter,
  percentFormatter,
} from '@/lib/formatters';
import { ButtonLink } from '@/app/components/ButtonLink';
import { OrderTableActions, getOrderTableHeaders } from '@/app/orders/orderTable';
import {
  getShopifyAppBilling,
  type AppSubscription,
  type AppSubscriptionLineItem,
} from '@/lib/shopify';

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
    ...queryPagination({ page, take: productsTake, count: productCount }),
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

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth().toString();
  const currentYear = currentDate.getFullYear().toString();
  const billingMonthLabel = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(currentDate);

  const monthlyBillingOrders = await prisma.order.findMany({
    where: {
      merchantId,
      transactionMonth: currentMonth,
      transactionYear: currentYear,
    },
    orderBy: {
      createdAt: 'asc',
    },
    select: {
      id: true,
      totalValue: true,
      createdAt: true,
    },
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

  const [webhookLogs, appIssues] = await Promise.all([
    prisma.orderWebhookLog.findMany({
      where: { shop: data.shop },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        createdAt: true,
        platformOrderId: true,
        topic: true,
        status: true,
        errors: true,
        orderId: true,
      },
    }),
    prisma.appIssue.findMany({
      where: { merchantId, resolved: false },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        createdAt: true,
        issueType: true,
        resolved: true,
      },
    }),
  ]);

  const {
    shop,
    compliancePartner,
    compliancePartnerConnection,
    compliancePartnerId,
    compliancePartnerAccountName,
    status,
    billingPlan,
    platformPlanName,
    salesUSAStates,
    platformEmail,
  } = data;
  const stateList = salesUSAStates ? (salesUSAStates as StateRecord[]).map((s) => s.name) : [];
  const billingSummary = getMerchantBillingSummary({
    billingPlan,
    orders: monthlyBillingOrders,
  });

  const shopifyBillingLookup = await getShopifyBillingLookup({
    shop: data.shop,
    accessToken: data.accessToken,
  });

  return (
    <PageLayout
      heading={compliancePartnerAccountName ?? shop}
      actions={[
        { href: `/merchants/${merchantId}/orders`, label: 'Orders' },
        { href: `/merchants/${merchantId}/products`, label: 'Products', variant: 'soft' },
        {
          href: `/merchants/${merchantId}/events`,
          label: 'Events',
          variant: 'soft',
          color: 'orange',
        },
      ]}
    >
      <Grid columns={{ initial: '1', md: '2' }} gap="4">
        <Box>
          <QuickDataList
            data={[
              { label: 'Shop', value: shop, linkTo: `//${shop}` },
              { label: 'Compliance Partner', value: compliancePartner },
              {
                label: 'Connection',
                children: compliancePartnerConnection ? (
                  <CompliancePartnerConnectionBadge connection={compliancePartnerConnection} />
                ) : undefined,
              },
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

      <MerchantBillingSnapshot
        billingMonthLabel={billingMonthLabel}
        billingSummary={billingSummary}
        platformBillingId={data.platformBillingId}
        platformBillingStatus={data.platformBillingStatus}
      />

      <ShopifyBillingCard lookup={shopifyBillingLookup} />

      <MerchantOrders orders={orders} merchantId={id} count={orderCount} />

      <Flex justify="between" gap="2" align="center">
        <Heading>Products for this merchant</Heading>
        <Link href={`/merchants/${merchantId}/products`}>View All</Link>
      </Flex>
      <MerchantProducts products={products} headers={productHeaders} count={productCount} />

      <MerchantEvents events={events} merchantId={id} />

      <MerchantAppIssues issues={appIssues} merchantId={id} />

      <MerchantWebhookLogs logs={webhookLogs} />
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

const MerchantBillingSnapshot = ({
  billingMonthLabel,
  billingSummary,
  platformBillingId,
  platformBillingStatus,
}: {
  billingMonthLabel: string;
  billingSummary: ReturnType<typeof getMerchantBillingSummary>;
  platformBillingId?: string | null;
  platformBillingStatus?: string | null;
}) => {
  return (
    <Card my="4">
      <Heading mb="2">Billing Snapshot</Heading>
      {billingSummary ? (
        <>
          <QuickDataList
            data={[
              { label: 'Billing Plan', value: billingSummary.planName },
              {
                label: 'Recurring Plan Cost',
                value: currencyFormatterWithDecimals(billingSummary.planPrice),
              },
              {
                label: 'Usage Rate',
                value:
                  billingSummary.perUseUnits === 'percent'
                    ? percentFormatter(billingSummary.perUsePrice)
                    : currencyFormatterWithDecimals(billingSummary.perUsePrice),
              },
              {
                label: 'Usage Threshold',
                value: currencyFormatterWithDecimals(billingSummary.perUseThreshold),
              },
              {
                label: 'Usage Cap',
                value: currencyFormatterWithDecimals(billingSummary.perUseCap),
              },
              { label: 'Usage Terms', value: billingSummary.perUseTerms },
              {
                label: `${billingMonthLabel} Revenue`,
                value: currencyFormatterWithDecimals(billingSummary.totalMonthlyRevenue),
              },
              {
                label: `${billingMonthLabel} Chargeable Orders`,
                value: billingSummary.chargeableOrderCount.toString(),
              },
              {
                label: `${billingMonthLabel} Estimated Usage Charges`,
                value: currencyFormatterWithDecimals(billingSummary.estimatedUsageCharge),
                tooltip:
                  'Estimated from order totals using current billing plan rules. Historical Shopify charge records are not stored in this admin database.',
              },
              {
                label: `${billingMonthLabel} Estimated Total Charges`,
                value: currencyFormatterWithDecimals(
                  billingSummary.planPrice + billingSummary.estimatedUsageCharge
                ),
                tooltip: 'Recurring plan price plus estimated current-month usage charges.',
              },
              { label: 'Platform Billing Status', value: platformBillingStatus, badge: true },
              { label: 'Platform Billing ID', value: platformBillingId, clipboard: true },
            ]}
          />
          <Text as="p" size="1" color="gray" mt="3">
            Usage charges are estimated from local order data using the same threshold logic as the
            worker. Actual historical charge events are not persisted in this admin database.
          </Text>
        </>
      ) : (
        <Text color="gray">No billing plan is assigned to this merchant.</Text>
      )}
    </Card>
  );
};

const getMerchantBillingSummary = ({
  billingPlan,
  orders,
}: {
  billingPlan?: {
    name: string;
    price: number;
    perUsePrice: number;
    perUseThreshold: number;
    perUseCap: number;
    perUseTerms: string;
    perUseUnits: 'percent' | 'fixed';
  } | null;
  orders: { totalValue: number }[];
}) => {
  if (!billingPlan) return null;

  let runningRevenue = 0;
  let estimatedUsageCharge = 0;
  let chargeableOrderCount = 0;

  for (const order of orders) {
    runningRevenue += order.totalValue;

    const thresholdExceeded =
      !billingPlan.perUseThreshold || billingPlan.perUseThreshold === 0
        ? true
        : runningRevenue > billingPlan.perUseThreshold;

    if (!thresholdExceeded) continue;

    chargeableOrderCount += 1;
    estimatedUsageCharge +=
      billingPlan.perUseUnits === 'percent'
        ? billingPlan.perUsePrice * order.totalValue
        : billingPlan.perUsePrice;
  }

  if (billingPlan.perUseCap > 0) {
    estimatedUsageCharge = Math.min(estimatedUsageCharge, billingPlan.perUseCap);
  }

  return {
    planName: billingPlan.name,
    planPrice: billingPlan.price,
    perUsePrice: billingPlan.perUsePrice,
    perUseThreshold: billingPlan.perUseThreshold,
    perUseCap: billingPlan.perUseCap,
    perUseTerms: billingPlan.perUseTerms,
    perUseUnits: billingPlan.perUseUnits,
    totalMonthlyRevenue: runningRevenue,
    chargeableOrderCount,
    estimatedUsageCharge,
  };
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

type ShopifyBillingLookup = {
  subscriptions: AppSubscription[];
  error?: string;
};

const getShopifyBillingLookup = async ({
  shop,
  accessToken,
}: {
  shop?: string | null;
  accessToken?: string | null;
}): Promise<ShopifyBillingLookup> => {
  if (!shop) return { subscriptions: [], error: 'No shop stored for this merchant.' };
  if (!accessToken) return { subscriptions: [], error: 'No access token stored for this merchant.' };

  try {
    const subscriptions = await getShopifyAppBilling({ shop, accessToken });
    return { subscriptions };
  } catch (err) {
    return {
      subscriptions: [],
      error: err instanceof Error ? err.message : 'Unable to load Shopify billing information.',
    };
  }
};

const subscriptionStatusColor = (status: string): any => {
  switch (status) {
    case 'ACTIVE': return 'green';
    case 'PENDING':
    case 'ACCEPTED': return 'yellow';
    case 'FROZEN': return 'orange';
    case 'DECLINED':
    case 'CANCELLED':
    case 'EXPIRED': return 'red';
    default: return 'gray';
  }
};

const ShopifyBillingCard = ({ lookup }: { lookup: ShopifyBillingLookup }) => {
  const { subscriptions, error } = lookup;
  const hasActive = subscriptions.length > 0;

  return (
    <Card my="4" style={{ borderTop: '3px solid #95BF47' }}>
      <Flex justify="between" align="center" gap="3" mb="3">
        <Flex align="center" gap="2">
          <img src="/shopify_logo_whitebg.svg" alt="Shopify" style={{ height: '20px', display: 'block' }} />
          <Text size="2" color="gray">App Billing</Text>
        </Flex>
        {hasActive ? (
          <Badge style={{ backgroundColor: '#e8f5d9', color: '#3d6b17' }} variant="soft">
            {subscriptions.length === 1 ? 'Active' : `${subscriptions.length} Active`}
          </Badge>
        ) : (
          <Badge color="gray" variant="soft">No Active Plan</Badge>
        )}
      </Flex>

      {hasActive ? (
        subscriptions.map((sub: AppSubscription) => (
          <Box key={sub.id}>
            <QuickDataList
              data={[
                { label: 'Plan', value: sub.name, bold: true },
                {
                  label: 'Status',
                  children: (
                    <Badge color={subscriptionStatusColor(sub.status)} variant="soft">
                      {sub.status}
                    </Badge>
                  ),
                },
                ...sub.lineItems.flatMap((item: AppSubscriptionLineItem) => {
                  const d = item.plan.pricingDetails;
                  if (d.__typename === 'AppRecurringPricing') {
                    return [{
                      label: 'Price',
                      value: `${d.price.amount} ${d.price.currencyCode} / ${d.interval === 'EVERY_30_DAYS' ? '30 days' : 'year'}`,
                    }];
                  }
                  if (d.__typename === 'AppUsagePricing') {
                    return [
                      { label: 'Usage', value: `${d.balanceUsed.amount} / ${d.cappedAmount.amount} ${d.cappedAmount.currencyCode}` },
                      { label: 'Usage Terms', value: d.terms },
                    ];
                  }
                  return [];
                }),
                {
                  label: 'Trial Days',
                  value: sub.trialDays ? String(sub.trialDays) : undefined,
                },
                {
                  label: 'Period End',
                  value: sub.currentPeriodEnd
                    ? dateTimeFormatter(new Date(sub.currentPeriodEnd))
                    : undefined,
                },
                { label: 'Created', value: dateTimeFormatter(new Date(sub.createdAt)) },
              ]}
            />
          </Box>
        ))
      ) : (
        <Text color="gray" size="2">{error || 'No active app subscription found.'}</Text>
      )}
    </Card>
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

const MerchantAppIssues = ({
  issues,
  merchantId,
}: {
  issues: { id: string; createdAt: Date; issueType: string; resolved: boolean }[];
  merchantId: string;
}) => {
  if (issues.length === 0) return null;

  const issueTypeColors: Record<string, string> = {
    PRODUCTS: 'blue',
    CUSTOMERS: 'purple',
    ORDERS: 'orange',
    COMPLIANCE_PRODUCTS: 'red',
  };
  const issueTypeLabels: Record<string, string> = {
    PRODUCTS: 'Products',
    CUSTOMERS: 'Customers',
    ORDERS: 'Orders',
    COMPLIANCE_PRODUCTS: 'Compliance Products',
  };

  return (
    <Box my="4">
      <Flex justify="between" align="center" mb="2">
        <Heading>Open Issues ({issues.length})</Heading>
        <ButtonLink href="/issues?resolved=no" variant="soft" color="gray" size="1">
          View All Issues
        </ButtonLink>
      </Flex>
      <DataTable
        headers={[
          {
            id: 'issueType',
            title: 'Type',
            formatter: (v: string) => (
              <Badge color={(issueTypeColors[v] ?? 'gray') as any} variant="soft">
                {issueTypeLabels[v] ?? v}
              </Badge>
            ),
          },
          {
            id: 'resolved',
            title: 'Status',
            formatter: (v: boolean) => (
              <Badge color={v ? 'green' : 'red'} variant="soft">{v ? 'Resolved' : 'Open'}</Badge>
            ),
          },
          { id: 'createdAt', title: 'Created', formatter: dateTimeFormatter },
        ]}
        data={issues}
      />
    </Box>
  );
};

const MerchantWebhookLogs = ({
  logs,
}: {
  logs: {
    id: number;
    createdAt: Date;
    platformOrderId: string;
    topic: string;
    status: string;
    errors: string[];
    orderId: number | null;
  }[];
}) => {
  return (
    <Box my="4">
      <Heading mb="2">Recent Webhook Logs</Heading>
      {logs.length > 0 ? (
        <DataTable
          headers={[
            { id: 'platformOrderId', title: 'Platform Order ID' },
            { id: 'topic', title: 'Topic' },
            {
              id: 'status',
              title: 'Status',
              formatter: (v: string) => (
                <Badge
                  color={v === 'RECEIVED' ? 'blue' : v === 'PROCESSED' ? 'green' : 'red'}
                  variant="soft"
                  size="1"
                >
                  {v}
                </Badge>
              ),
            },
            {
              id: 'errors',
              title: 'Errors',
              formatter: (v: string[]) =>
                v.length > 0 ? (
                  <Text color="red" size="1">{v[0]}{v.length > 1 ? ` (+${v.length - 1})` : ''}</Text>
                ) : (
                  '—'
                ),
            },
            { id: 'createdAt', title: 'Received', formatter: dateTimeFormatter },
          ]}
          data={logs}
        />
      ) : (
        <Text color="gray" size="2">No webhook logs for this merchant.</Text>
      )}
    </Box>
  );
};
