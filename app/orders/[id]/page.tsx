// import { Proposal as ProposalType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { Box, Card, Grid, Heading, Text, Table } from '@radix-ui/themes';
import { Link } from '@/app/components/Link';
import { NotFound } from '@/app/components/NotFound';
import { PageLayout } from '@/app/components/PageLayout';
import { QuickDataList } from '@/app/components/QuickDataList';
import { currencyFormatter, dateTimeFormatter } from '@/lib/formatters';

type PurchaseItem = {
  quantity: number;
  soldExternal?: boolean;
  productType?: string;
  platformVariantId?: string;
  compliancePartnerProductId?: string;
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
      Fulfillment: true,
    },
  });

  if (!id || !data) return <NotFound message="Order Not Found" />;

  const { compliancePartner, purchasedItems } = data;

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

  return (
    <PageLayout heading={`Order Id #${id}`}>
      <Grid gap="4" columns={{ initial: '1', md: '2' }}>
        <QuickDataList
          data={[
            { label: 'ID', value: id },
            { label: 'Compliance Partner', value: compliancePartner },
            {
              label: 'Compliance Partner Order ID',
              value: data.compliancePartnerOrderId,
              clipboard: true,
            },
            { label: 'Platform Order ID', value: data.platformOrderId, clipboard: true },
            { label: 'Status', value: data.status, badge: true },
            { label: 'Issues', value: data.issues.join(', ') },
            { label: 'Created At', value: dateTimeFormatter(data.createdAt) },
            { label: 'Updated At', value: dateTimeFormatter(data.updatedAt) },
          ]}
        />
        <Box>
          <QuickDataList
            data={[
              { label: 'Merchant', value: data.merchant?.compliancePartnerAccountName },
              { label: 'Shop', value: data.merchant?.shop },
              {
                label: 'Customer Name',
                value: [data.customer?.firstName, data.customer?.lastName].join(' '),
              },
              { label: 'Customer Email', value: data.customer?.email },
              { label: 'Customer DOB', value: data.customer?.dob?.toLocaleDateString() },
            ]}
          />
        </Box>
      </Grid>
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
                    <Table.Cell>{productType}</Table.Cell>
                    <Table.Cell>{soldExternal ? 'Yes' : 'NO'}</Table.Cell>
                  </Table.Row>
                );
              })}
          </Table.Root>
        </Box>
      </Card>
      {/* <Flex align="start" justify="end" gap="2">
        <Link href={`/merchants/${id}/edit`}>Edit</Link>
      </Flex> */}
    </PageLayout>
  );
}
