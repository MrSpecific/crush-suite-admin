import { prismaClubs } from '@/lib/prisma-clubs';
import { PageLayout } from '@/app/components/PageLayout';
import { QuickDataList } from '@/app/components/QuickDataList';
import { DataTable } from '@/app/components/DataTable';
import { NotFound } from '@/app/components/NotFound';
import { Badge, Box, Card, Grid, Heading, Text } from '@radix-ui/themes';
import { dateFormatter } from '@/lib/formatters';
import type { RadixColor } from '@/types/radix-ui';

const productKindColor: Record<string, RadixColor> = {
  default: 'blue',
  optional: 'gray',
};

export default async function Page({
  params,
}: {
  params: { merchantId: string; clubId: string; bundleId: string };
}) {
  const merchantId = parseInt(params.merchantId);
  const { clubId, bundleId } = params;

  if (isNaN(merchantId)) return <NotFound message="Bundle type not found" />;

  const bundle = await prismaClubs.bundleType.findUnique({
    where: { id: bundleId },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      name: true,
      description: true,
      mode: true,
      status: true,
      minItems: true,
      maxItems: true,
      orderPriority: true,
      platformSellingPlanGroupId: true,
      platformProductId: true,
      platformVariantId: true,
      clubId: true,
      club: {
        select: {
          merchantId: true,
          name: true,
          merchant: { select: { platformShopName: true, shop: true } },
        },
      },
      products: {
        orderBy: { orderPriority: 'asc' },
        select: {
          id: true,
          platformProductId: true,
          platformVariantId: true,
          kind: true,
          defaultQuantity: true,
          minQuantity: true,
          maxQuantity: true,
          price: true,
          currencyCode: true,
          excludeFromDiscount: true,
          orderPriority: true,
        },
      },
      discounts: {
        select: {
          id: true,
          name: true,
          scope: true,
          condition: true,
          frequency: true,
          valueType: true,
          discountPercent: true,
          discountAmount: true,
          minQuantity: true,
          minSubtotal: true,
        },
      },
      _count: { select: { subscriptions: true } },
    },
  });

  if (!bundle || bundle.clubId !== clubId || bundle.club.merchantId !== merchantId) {
    return <NotFound message="Bundle type not found" />;
  }

  const productHeaders = [
    { id: 'platformProductId', title: 'Product ID', as: 'code' as const },
    { id: 'platformVariantId', title: 'Variant ID', as: 'code' as const },
    {
      id: 'kind',
      title: 'Kind',
      formatter: (v: string) => (
        <Badge color={productKindColor[v] ?? 'gray'} variant="soft">{v}</Badge>
      ),
    },
    { id: 'price', title: 'Price', formatter: (v: number) => `$${v.toFixed(2)}` },
    { id: 'defaultQuantity', title: 'Default Qty' },
    {
      id: 'minQuantity',
      title: 'Min Qty',
      formatter: (v: number | null) => v ?? '—',
    },
    {
      id: 'maxQuantity',
      title: 'Max Qty',
      formatter: (v: number | null) => v ?? '—',
    },
    {
      id: 'excludeFromDiscount',
      title: 'Excl. Discount',
      formatter: (v: boolean) => (v ? 'Yes' : '—'),
    },
  ];

  const discountHeaders = [
    { id: 'name', title: 'Name' },
    { id: 'scope', title: 'Scope' },
    { id: 'condition', title: 'Condition' },
    { id: 'frequency', title: 'Frequency', formatter: (v: string | null) => v ?? 'All' },
    { id: 'valueType', title: 'Type' },
    {
      id: 'discountPercent',
      title: 'Percent',
      formatter: (v: number | null) => (v != null ? `${(v * 100).toFixed(1)}%` : '—'),
    },
    {
      id: 'discountAmount',
      title: 'Amount',
      formatter: (v: number | null) => (v != null ? `$${v.toFixed(2)}` : '—'),
    },
  ];

  const backHref = `/clubs/merchants/${merchantId}/clubs/${clubId}`;

  return (
    <PageLayout
      heading={bundle.name}
      subheading={`${bundle.club.name} · ${bundle.club.merchant.platformShopName ?? bundle.club.merchant.shop}`}
      actions={[{ label: 'Back to Club', href: backHref, variant: 'soft', color: 'gray' }]}
    >
      <Grid columns={{ initial: '1', md: '2' }} gap="4" mb="6">
        <Card>
          <Heading size="3" mb="3">Bundle Details</Heading>
          <QuickDataList
            data={[
              {
                label: 'Status',
                children: (
                  <Badge color={bundle.status === 'active' ? 'green' : 'gray'} variant="soft">
                    {bundle.status}
                  </Badge>
                ),
              },
              { label: 'Mode', value: bundle.mode },
              { label: 'Item Range', value: `${bundle.minItems}–${bundle.maxItems} items` },
              { label: 'Display Order', value: bundle.orderPriority.toString() },
              { label: 'Description', value: bundle.description },
              { label: 'Shopify Product ID', value: bundle.platformProductId, as: 'code' },
              { label: 'Shopify Variant ID', value: bundle.platformVariantId, as: 'code' },
              { label: 'Selling Plan Group ID', value: bundle.platformSellingPlanGroupId, as: 'code' },
              { label: 'Created', value: dateFormatter(bundle.createdAt) },
              { label: 'Updated', value: dateFormatter(bundle.updatedAt) },
            ]}
          />
        </Card>

        <Card>
          <Heading size="3" mb="3">Stats</Heading>
          <QuickDataList
            data={[
              { label: 'Active Subscribers', value: bundle._count.subscriptions.toString() },
              { label: 'Products in Catalog', value: bundle.products.length.toString() },
              { label: 'Discounts', value: bundle.discounts.length.toString() },
            ]}
          />
        </Card>
      </Grid>

      <Box mb="6">
        <Heading size="4" mb="3">Products ({bundle.products.length})</Heading>
        {bundle.products.length > 0 ? (
          <DataTable headers={productHeaders} data={bundle.products} />
        ) : (
          <Text color="gray" size="2">No products in this bundle type.</Text>
        )}
      </Box>

      {bundle.discounts.length > 0 && (
        <Box>
          <Heading size="4" mb="3">Discounts ({bundle.discounts.length})</Heading>
          <DataTable headers={discountHeaders} data={bundle.discounts} />
        </Box>
      )}
    </PageLayout>
  );
}
