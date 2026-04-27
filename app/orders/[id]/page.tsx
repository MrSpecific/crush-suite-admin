import { prisma } from '@/lib/prisma';
import { Box, Card, Grid, Heading, Text, Table, Badge, Callout, Flex } from '@radix-ui/themes';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { Link } from '@/app/components/Link';
import { NotFound } from '@/app/components/NotFound';
import { PageLayout } from '@/app/components/PageLayout';
import { QuickDataList } from '@/app/components/QuickDataList';
import {
  currencyFormatter,
  currencyFormatterWithDecimals,
  dateTimeFormatter,
} from '@/lib/formatters';
import {
  getShopifyAdminOrderUrl,
  getShopifyOrderByPlatformOrderId,
  getShopifyOrderSourceLabel,
  type ShopifyOrder,
} from '@/lib/shopify';
import { ProductCategoryBadge } from '@/app/components/ProductCategoryBadge';
import { ProductCategory } from '@/types/types';
import { orderStatusMetaData } from '@/lib/metaData';

type PurchaseItem = {
  name?: string;
  price?: number;
  quantity: number;
  dbProductId?: number;
  isDbProduct?: boolean;
  soldExternal?: boolean;
  productType?: string;
  platformVariantId?: string;
  isComplianceProduct?: boolean;
  isVinoshipperProduct?: boolean;
  compliancePartnerProductId?: string;
};

type ShopifyAddress = {
  firstName?: string;
  lastName?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  zip?: string;
  country?: string;
  phone?: string;
};

const billingStatusColor = (status: string): any => {
  switch (status.toLowerCase()) {
    case 'active':
      return 'green';
    case 'pending':
      return 'yellow';
    case 'frozen':
      return 'orange';
    case 'declined':
    case 'cancelled':
      return 'red';
    case 'expired':
      return 'gray';
    default:
      return 'gray';
  }
};

const fulfillmentStatusMeta: Record<string, { label: string; color: string }> = {
  SHIPPING_LABELS_GENERATED: { label: 'Labels Generated', color: 'yellow' },
  SHIPPED: { label: 'Shipped', color: 'blue' },
  DELIVERED: { label: 'Delivered', color: 'green' },
  PICKED_UP: { label: 'Picked Up', color: 'green' },
  CANCELLED: { label: 'Cancelled', color: 'gray' },
  RETURNED: { label: 'Returned', color: 'orange' },
  ERROR: { label: 'Error', color: 'red' },
};

const webhookStatusMeta: Record<string, { label: string; color: string }> = {
  RECEIVED: { label: 'Received', color: 'blue' },
  PROCESSING: { label: 'Processing', color: 'yellow' },
  SUCCESS: { label: 'Success', color: 'green' },
  FAILED: { label: 'Failed', color: 'red' },
  ERROR: { label: 'Error', color: 'red' },
  SKIPPED: { label: 'Skipped', color: 'gray' },
};

export default async function Page({ params }: { params: { id: string } }) {
  const { id } = params;

  const data = await prisma.order.findUnique({
    where: {
      id: parseInt(id),
    },
    include: {
      customer: true,
      merchant: { include: { billingPlan: true } },
      Fulfillment: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!id || !data) return <NotFound message="Order Not Found" />;

  const { compliancePartner, purchasedItems } = data;
  const statusMeta = orderStatusMetaData[data.status];

  const items: PurchaseItem[] = Array.isArray(purchasedItems)
    ? (purchasedItems as PurchaseItem[])
    : typeof purchasedItems === 'string'
      ? JSON.parse(purchasedItems)
      : [];

  const platformVariantIds = Array.from(
    new Set(items.map((item) => item.platformVariantId).filter(Boolean))
  ) as string[];

  const products = platformVariantIds.length
    ? await prisma.product.findMany({
        where: {
          merchantId: data.merchantId,
          platformVariantId: { in: platformVariantIds },
        },
        select: {
          id: true,
          name: true,
          sku: true,
          price: true,
          platformProductId: true,
          platformVariantId: true,
        },
      })
    : [];

  const webhookLogs = data.platformOrderId
    ? await prisma.orderWebhookLog.findMany({
        where: {
          OR: [{ platformOrderId: data.platformOrderId }, { orderId: data.id }],
        },
        orderBy: { createdAt: 'asc' },
      })
    : [];

  const productsByVariantId = new Map(
    products
      .filter((product) => product.platformVariantId)
      .map((product) => [product.platformVariantId as string, product])
  );

  const shippingAddr = data.shippingAddress as ShopifyAddress | null;
  const billingAddr = data.billingAddress as ShopifyAddress | null;
  const hasBilling = billingAddr && JSON.stringify(billingAddr) !== JSON.stringify(shippingAddr);
  const shopifyOrderLookup = await getShopifyOrderLookup({
    shop: data.merchant?.shop,
    accessToken: data.merchant?.accessToken,
    platformOrderId: data.platformOrderId,
  });

  const heading = data.platformOrderName ? `Order ${data.platformOrderName}` : `Order #${id}`;

  return (
    <PageLayout heading={heading}>
      {data.issues.length > 0 && (
        <Callout.Root color="red" variant="surface" mb="5">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Box>
            <Text as="div" weight="bold" mb="1">
              {data.issues.length} {data.issues.length === 1 ? 'Issue' : 'Issues'} Found
            </Text>
            <ul style={{ paddingLeft: '1rem', margin: 0 }}>
              {data.issues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          </Box>
        </Callout.Root>
      )}

      <Grid gap="4" columns={{ initial: '1', md: '2' }}>
        <Card>
          <Heading size="3" mb="3">
            Order Details
          </Heading>
          <QuickDataList
            data={[
              { label: 'ID', value: id },
              { label: 'Platform Order Name', value: data.platformOrderName },
              { label: 'Compliance Partner', value: compliancePartner },
              {
                label: 'Compliance Partner Order ID',
                value: data.compliancePartnerOrderId,
                clipboard: true,
              },
              { label: 'Platform Order ID', value: data.platformOrderId, clipboard: true },
              { label: 'Platform', value: data.platform },
              { label: 'Created With', value: data.createdWith },
              {
                label: 'Status',
                children: (
                  <Badge color={statusMeta?.color} variant="soft">
                    {statusMeta?.label || data.status}
                  </Badge>
                ),
              },
              {
                label: 'Transaction',
                value:
                  data.transactionMonth && data.transactionYear
                    ? `${data.transactionMonth}/${data.transactionYear}`
                    : undefined,
              },
              { label: 'UPS Pickup ID', value: data.upsPickupId, clipboard: true },
              { label: 'Created At', value: dateTimeFormatter(data.createdAt) },
              { label: 'Updated At', value: dateTimeFormatter(data.updatedAt) },
              { label: 'Update Count', value: String(data.updatedCount) },
            ]}
          />
        </Card>

        <Flex direction="column" gap="4">
          <ShopifyOrderCard shop={data.merchant?.shop} lookup={shopifyOrderLookup} />

          <Card>
            <Heading size="3" mb="3">
              Customer
            </Heading>
            <QuickDataList
              data={[
                {
                  label: 'Customer Name',
                  value:
                    [data.customer?.firstName, data.customer?.lastName].filter(Boolean).join(' ') ||
                    undefined,
                  linkTo: data.customer ? `/customers/${data.customer.id}` : undefined,
                },
                { label: 'Customer Email', value: data.customer?.email },
                { label: 'Customer DOB', value: data.customer?.dob?.toLocaleDateString() },
                { label: 'Phone', value: data.phone || data.customer?.phoneNumber },
              ]}
            />
          </Card>

          <Card>
            <Heading size="3" mb="3">
              Merchant
            </Heading>
            <QuickDataList
              data={[
                {
                  label: 'Merchant',
                  value: data.merchant?.compliancePartnerAccountName,
                  linkTo: `/merchants/${data.merchantId}`,
                },
                {
                  label: 'Shop',
                  value: data.merchant?.shop,
                  linkTo: new URL(`https://${data.merchant?.shop}`).toString(),
                  target: '_blank',
                },
                {
                  label: 'Merchant Billing Plan',
                  value: data.merchant?.billingPlan?.name,
                },
                {
                  label: 'Merchant Billing Status',
                  children: data.merchant?.platformBillingStatus ? (
                    <Badge
                      color={billingStatusColor(data.merchant.platformBillingStatus)}
                      variant="soft"
                    >
                      {data.merchant.platformBillingStatus}
                    </Badge>
                  ) : undefined,
                },
              ]}
            />
          </Card>
        </Flex>
      </Grid>

      <Grid gap="4" columns={{ initial: '1', md: '1fr 2fr' }} mt="4">
        <Card>
          <Heading size="3" mb="3">
            Financials
          </Heading>
          <QuickDataList
            data={[
              {
                label: 'Total Value',
                value: currencyFormatterWithDecimals(data.totalValue),
                bold: true,
              },
              { label: 'Tax', value: currencyFormatterWithDecimals(data.totalTax) },
              { label: 'Shipping', value: currencyFormatterWithDecimals(data.totalShipping) },
              {
                label: 'Discounts',
                value: data.totalDiscounts
                  ? currencyFormatterWithDecimals(data.totalDiscounts)
                  : undefined,
              },
              {
                label: 'Compliance Fees',
                value: data.totalComplianceFees
                  ? currencyFormatterWithDecimals(data.totalComplianceFees)
                  : undefined,
              },
              { label: 'Quantity', value: String(data.quantityItems) },
            ]}
          />
        </Card>

        {(shippingAddr || data.shippingMethod) && (
          <Grid gap="4" columns={{ initial: '1', md: hasBilling ? '2' : '1' }}>
            <Card>
              <Heading size="3" mb="3">
                Shipping
              </Heading>
              <QuickDataList
                data={[
                  { label: 'Method', value: data.shippingMethod },
                  {
                    label: 'Ship To',
                    value: shippingAddr
                      ? [shippingAddr.firstName, shippingAddr.lastName].filter(Boolean).join(' ')
                      : undefined,
                  },
                  {
                    label: 'Address',
                    value: shippingAddr
                      ? [shippingAddr.address1, shippingAddr.address2].filter(Boolean).join(', ')
                      : undefined,
                  },
                  { label: 'City', value: shippingAddr?.city },
                  {
                    label: 'State',
                    value: shippingAddr?.province || data.shippingState,
                  },
                  { label: 'ZIP', value: shippingAddr?.zip || data.shippingZip },
                  { label: 'Country', value: shippingAddr?.country },
                ]}
              />
            </Card>

            {hasBilling && (
              <Card>
                <Heading size="3" mb="3">
                  Billing Address
                </Heading>
                <QuickDataList
                  data={[
                    {
                      label: 'Bill To',
                      value: [billingAddr.firstName, billingAddr.lastName]
                        .filter(Boolean)
                        .join(' '),
                    },
                    {
                      label: 'Address',
                      value: [billingAddr.address1, billingAddr.address2]
                        .filter(Boolean)
                        .join(', '),
                    },
                    { label: 'City', value: billingAddr.city },
                    { label: 'State', value: billingAddr.province },
                    { label: 'ZIP', value: billingAddr.zip },
                    { label: 'Country', value: billingAddr.country },
                  ]}
                />
              </Card>
            )}
          </Grid>
        )}
      </Grid>

      {data.Fulfillment.length > 0 && (
        <Card my="5">
          <Heading mb="2">Fulfillments</Heading>
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>ID</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Platform Fulfillment ID</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Shop</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Created</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Updated</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {data.Fulfillment.map((fulfillment) => {
                const fMeta = fulfillmentStatusMeta[fulfillment.status];
                return (
                  <Table.Row key={fulfillment.id} align="center">
                    <Table.Cell>{fulfillment.id}</Table.Cell>
                    <Table.Cell>
                      <Badge color={fMeta?.color as any} variant="soft">
                        {fMeta?.label || fulfillment.status}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>{fulfillment.platformFulfillmentId || '—'}</Table.Cell>
                    <Table.Cell>{fulfillment.shop}</Table.Cell>
                    <Table.Cell>{dateTimeFormatter(fulfillment.createdAt)}</Table.Cell>
                    <Table.Cell>{dateTimeFormatter(fulfillment.updatedAt)}</Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Root>
        </Card>
      )}

      <Card my="5">
        <Heading mb="2">Items</Heading>
        <Box>
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Product</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Platform Variant ID</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Compliance Partner ID</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Quantity</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Sold External</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {items.map((item: PurchaseItem) => {
                const product = item.platformVariantId
                  ? productsByVariantId.get(item.platformVariantId)
                  : undefined;
                const {
                  quantity,
                  platformVariantId,
                  compliancePartnerProductId,
                  productType,
                  soldExternal,
                } = item;
                return (
                  <Table.Row
                    key={`${platformVariantId || compliancePartnerProductId || productType}-${quantity}`}
                    align="center"
                  >
                    <Table.Cell>
                      {product ? (
                        <Box>
                          <Link href={`/products/${product.id}`}>{product.name}</Link>
                          <Text as="div" size="1" color="gray">
                            SKU: {product.sku || 'N/A'}
                          </Text>
                          <Text as="div" size="1" color="gray">
                            Price: {currencyFormatter(product.price)}
                          </Text>
                        </Box>
                      ) : (
                        <Box>
                          <Text as="div" weight="bold">
                            {item.name || 'Unmatched line item'}
                          </Text>
                          <Text as="div" size="1" color="gray">
                            Not found in DB
                          </Text>
                          {item.price !== undefined && (
                            <Text as="div" size="1" color="gray">
                              Price: {currencyFormatter(item.price)}
                            </Text>
                          )}
                          {item.dbProductId ? (
                            <Text as="div" size="1" color="gray">
                              DB Product ID: {item.dbProductId}
                            </Text>
                          ) : null}
                        </Box>
                      )}
                    </Table.Cell>
                    <Table.RowHeaderCell>{platformVariantId}</Table.RowHeaderCell>
                    <Table.Cell>{compliancePartnerProductId}</Table.Cell>
                    <Table.Cell>{quantity}</Table.Cell>
                    <Table.Cell>
                      {productType ? (
                        <ProductCategoryBadge type={productType as ProductCategory} />
                      ) : (
                        <Text color="gray">N/A</Text>
                      )}
                    </Table.Cell>
                    <Table.Cell>{soldExternal ? 'Yes' : 'NO'}</Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Root>
        </Box>
      </Card>

      {webhookLogs.length > 0 && (
        <Card my="5">
          <Heading mb="2">Webhook Logs</Heading>
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>ID</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Topic</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Errors</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Received</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {webhookLogs.map((log) => {
                const wMeta = webhookStatusMeta[log.status];
                return (
                  <Table.Row key={log.id} align="center">
                    <Table.Cell>{log.id}</Table.Cell>
                    <Table.Cell>
                      <Text as="span" style={{ fontFamily: 'monospace' }} size="2">
                        {log.topic}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge color={wMeta?.color as any} variant="soft">
                        {wMeta?.label || log.status}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      {log.errors.length > 0 ? (
                        <Box>
                          {log.errors.map((err, i) => (
                            <Text key={i} as="div" size="1" color="red">
                              {err}
                            </Text>
                          ))}
                        </Box>
                      ) : (
                        <Text color="gray">—</Text>
                      )}
                    </Table.Cell>
                    <Table.Cell>{dateTimeFormatter(log.createdAt)}</Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Root>
        </Card>
      )}
    </PageLayout>
  );
}

type ShopifyOrderLookup = {
  order: ShopifyOrder | null;
  error?: string;
};

const ShopifyOrderCard = ({
  lookup,
  shop,
}: {
  lookup: ShopifyOrderLookup;
  shop?: string | null;
}) => {
  const { order, error } = lookup;
  const sourceLabel = getShopifyOrderSourceLabel(order);
  const currentTotal = order?.currentTotalPriceSet?.shopMoney || order?.totalPriceSet?.shopMoney;

  return (
    <Card style={{ borderTop: '3px solid #95BF47' }}>
      <Flex justify="between" align="center" gap="3" mb="3">
        <img
          src="/shopify_logo_whitebg.svg"
          alt="Shopify"
          style={{ height: '26px', display: 'block' }}
        />
        {order ? (
          <Badge style={{ backgroundColor: '#e8f5d9', color: '#3d6b17' }} variant="soft">
            Live
          </Badge>
        ) : (
          <Badge color="gray" variant="soft">
            Unavailable
          </Badge>
        )}
      </Flex>

      {order ? (
        <QuickDataList
          data={[
            {
              label: 'Admin',
              value: order.name,
              linkTo:
                shop && order.legacyResourceId
                  ? getShopifyAdminOrderUrl(shop, order.legacyResourceId)
                  : undefined,
              target: '_blank',
            },
            { label: 'Source', value: sourceLabel, bold: true },
            { label: 'Source Name', value: order.sourceName, as: 'code' },
            { label: 'Source Identifier', value: order.sourceIdentifier, as: 'code' },
            { label: 'Created By App', value: order.app?.name },
            { label: 'Publication', value: order.publication?.name },
            { label: 'Channel App', value: order.channelInformation?.app.title },
            {
              label: 'Channel',
              value: order.channelInformation?.channelDefinition?.channelName,
            },
            {
              label: 'Subchannel',
              value: order.channelInformation?.channelDefinition?.subChannelName,
            },
            {
              label: 'Marketplace',
              value:
                order.channelInformation?.channelDefinition?.isMarketplace === undefined
                  ? undefined
                  : order.channelInformation.channelDefinition.isMarketplace
                    ? 'Yes'
                    : 'No',
            },
            { label: 'Financial Status', value: order.displayFinancialStatus },
            { label: 'Fulfillment Status', value: order.displayFulfillmentStatus },
            { label: 'Current Total', value: formatShopifyMoney(currentTotal) },
            { label: 'Created At', value: formatShopifyDateTime(order.createdAt) },
            { label: 'Updated At', value: formatShopifyDateTime(order.updatedAt) },
          ]}
        />
      ) : (
        <Text color="gray">{error || 'Shopify order information could not be loaded.'}</Text>
      )}
    </Card>
  );
};

const getShopifyOrderLookup = async ({
  shop,
  accessToken,
  platformOrderId,
}: {
  shop?: string | null;
  accessToken?: string | null;
  platformOrderId?: string | null;
}): Promise<ShopifyOrderLookup> => {
  if (!platformOrderId) {
    return { order: null, error: 'No Shopify order ID is stored for this order.' };
  }

  if (!shop) {
    return { order: null, error: 'No Shopify shop is stored for this order.' };
  }

  if (!accessToken) {
    return { order: null, error: 'No Shopify access token is stored for this merchant.' };
  }

  try {
    const order = await getShopifyOrderByPlatformOrderId({
      shop,
      accessToken,
      platformOrderId,
    });

    return order
      ? { order }
      : {
          order: null,
          error:
            'Shopify did not return this order. It may be older than the accessible order window or unavailable to the app.',
        };
  } catch (error) {
    return {
      order: null,
      error: error instanceof Error ? error.message : 'Unable to load Shopify order information.',
    };
  }
};

const formatShopifyMoney = (value?: { amount: string; currencyCode: string } | null) => {
  if (!value) return undefined;

  return `${value.amount} ${value.currencyCode}`;
};

const formatShopifyDateTime = (value?: string | null) => {
  if (!value) return undefined;

  return dateTimeFormatter(new Date(value));
};
