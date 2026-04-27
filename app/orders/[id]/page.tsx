import { prisma } from '@/lib/prisma';
import { Box, Card, Grid, Heading, Text, Table, Badge, Callout, Flex } from '@radix-ui/themes';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { Link } from '@/app/components/Link';
import { NotFound } from '@/app/components/NotFound';
import { PageLayout } from '@/app/components/PageLayout';
import { QuickDataList } from '@/app/components/QuickDataList';
import { currencyFormatter, currencyFormatterWithDecimals, dateTimeFormatter } from '@/lib/formatters';
import { ProductCategoryBadge } from '@/app/components/ProductCategoryBadge';
import { ProductCategory } from '@/types/types';
import { orderStatusMetaData } from '@/lib/metaData';

type PurchaseItem = {
  quantity: number;
  soldExternal?: boolean;
  productType?: string;
  platformVariantId?: string;
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

const fulfillmentStatusMeta: Record<string, { label: string; color: string }> = {
  SHIPPING_LABELS_GENERATED: { label: 'Labels Generated', color: 'yellow' },
  SHIPPED: { label: 'Shipped', color: 'blue' },
  DELIVERED: { label: 'Delivered', color: 'green' },
  PICKED_UP: { label: 'Picked Up', color: 'green' },
  CANCELLED: { label: 'Cancelled', color: 'gray' },
  RETURNED: { label: 'Returned', color: 'orange' },
  ERROR: { label: 'Error', color: 'red' },
};

export default async function Page({ params }: { params: { id: string } }) {
  const { id } = params;

  const data = await prisma.order.findUnique({
    where: {
      id: parseInt(id),
    },
    include: {
      customer: true,
      merchant: true,
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
          platformVariantId: {
            in: platformVariantIds,
          },
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

  const productsByVariantId = new Map(
    products
      .filter((product) => product.platformVariantId)
      .map((product) => [product.platformVariantId as string, product])
  );

  const shippingAddr = data.shippingAddress as ShopifyAddress | null;
  const billingAddr = data.billingAddress as ShopifyAddress | null;
  const hasBilling =
    billingAddr && JSON.stringify(billingAddr) !== JSON.stringify(shippingAddr);

  const heading = data.platformOrderName ? `Order ${data.platformOrderName}` : `Order #${id}`;

  return (
    <PageLayout heading={heading}>
      {data.issues.length > 0 && (
        <Callout.Root color="red" variant="surface" mb="5">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>
            <Text as="div" weight="bold" mb="1">
              {data.issues.length} {data.issues.length === 1 ? 'Issue' : 'Issues'} Found
            </Text>
            <ul style={{ paddingLeft: '1rem', margin: 0 }}>
              {data.issues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          </Callout.Text>
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
          <Card>
            <Heading size="3" mb="3">
              Customer & Merchant
            </Heading>
            <QuickDataList
              data={[
                {
                  label: 'Merchant',
                  value: data.merchant?.compliancePartnerAccountName,
                  linkTo: `/merchants/${data.merchantId}`,
                },
                { label: 'Shop', value: data.merchant?.shop },
                {
                  label: 'Customer Name',
                  value:
                    [data.customer?.firstName, data.customer?.lastName].filter(Boolean).join(' ') ||
                    undefined,
                },
                { label: 'Customer Email', value: data.customer?.email },
                { label: 'Customer DOB', value: data.customer?.dob?.toLocaleDateString() },
                { label: 'Phone', value: data.phone || data.customer?.phoneNumber },
              ]}
            />
          </Card>

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
        </Flex>
      </Grid>

      {(shippingAddr || data.shippingMethod) && (
        <Grid gap="4" columns={{ initial: '1', md: hasBilling ? '2' : '1' }} mt="4">
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

            {items &&
              items.map((item: PurchaseItem) => {
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
                        <Text color="gray">Not found in DB</Text>
                      )}
                    </Table.Cell>
                    <Table.RowHeaderCell>{platformVariantId}</Table.RowHeaderCell>
                    <Table.Cell>{compliancePartnerProductId}</Table.Cell>
                    <Table.Cell>{quantity}</Table.Cell>
                    <Table.Cell>
                      <ProductCategoryBadge type={productType as ProductCategory} />
                    </Table.Cell>
                    <Table.Cell>{soldExternal ? 'Yes' : 'NO'}</Table.Cell>
                  </Table.Row>
                );
              })}
          </Table.Root>
        </Box>
      </Card>
    </PageLayout>
  );
}
