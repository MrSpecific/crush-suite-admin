import { prisma } from '@/lib/prisma';
import { prismaClubs } from '@/lib/prisma-clubs';
import { getClubsShopAccessToken } from '@/lib/clubs-shopify';
import {
  getShopifyAdminProductUrl,
  getShopifyVariantsByPlatformVariantIds,
  type ShopifyVariantSummary,
} from '@/lib/shopify';
import { PageLayout } from '@/app/components/PageLayout';
import { QuickDataList } from '@/app/components/QuickDataList';
import { DataTable } from '@/app/components/DataTable';
import { NotFound } from '@/app/components/NotFound';
import { ButtonLink } from '@/app/components/ButtonLink';
import { Badge, Box, Card, Flex, Grid, Heading, Text } from '@radix-ui/themes';
import { dateFormatter, dateTimeFormatter } from '@/lib/formatters';
import { DataFilter } from '@/app/components/DataFilter';
import type { RadixColor } from '@/types/radix-ui';
import {
  getMembersWithoutOrderWhere,
  memberWithoutOrderHeaders,
  MemberWithoutOrderActions,
  memberWithoutOrderSelect,
  releaseOrderHeaders,
  ReleaseOrderActions,
  releaseOrderSelect,
  releasePath,
  getReleaseOrderWhere,
  toMemberWithoutOrderRows,
  toReleaseOrderRows,
} from './releaseLists';

// Rows shown per list on this page; the full lists are paginated on their own pages
const previewTake = 20;

const statusColor: Record<string, RadixColor> = {
  published: 'green',
  draft: 'gray',
};

const productKindColor: Record<string, RadixColor> = {
  default: 'blue',
  optional: 'gray',
};

// Club products may store Shopify GIDs; compliance products store the numeric id
const numericShopifyId = (id: string) => id.split('/').pop() ?? id;

const variantDisplayName = (variant: ShopifyVariantSummary) =>
  variant.title && variant.title !== 'Default Title'
    ? `${variant.product.title} — ${variant.title}`
    : variant.product.title;

// Names are a nicety: a missing/expired token or Shopify error falls back to the catalog
async function getShopifyVariants(shop: string, platformVariantIds: string[]) {
  try {
    const accessToken = await getClubsShopAccessToken(shop);
    if (!accessToken) return [];
    return await getShopifyVariantsByPlatformVariantIds({ shop, accessToken, platformVariantIds });
  } catch (error) {
    console.error(`Failed to load Shopify variants for ${shop}`, error);
    return [];
  }
}

export default async function Page(
  props: {
    params: Promise<{ merchantId: string; clubId: string; releaseId: string }>;
  }
) {
  const params = await props.params;
  const merchantId = parseInt(params.merchantId);
  const { clubId, releaseId } = params;

  if (isNaN(merchantId)) return <NotFound message="Release not found" />;

  const release = await prismaClubs.release.findUnique({
    where: { id: releaseId },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      name: true,
      description: true,
      status: true,
      platformHandle: true,
      publishDate: true,
      customizationDeadline: true,
      signupDeadline: true,
      inventoryAllocationDate: true,
      shippingHoldDate: true,
      releaseDate: true,
      allowCustomization: true,
      deliveryMethods: true,
      minOrderQuantity: true,
      maxOrderQuantity: true,
      minOrderValue: true,
      shippingFlatRate: true,
      defaultPlatformShippingMethodName: true,
      onlyCheapestShippingRate: true,
      allowUPSAccessPointPickup: true,
      giftNote: true,
      // inventory / processing status
      inventoryReserved: true,
      inventoryUnreserved: true,
      inventoryReservedForMemberCount: true,
      inventoryError: true,
      allReleaseOrdersCreated: true,
      allReleaseOrdersCreatedAt: true,
      contractsGenerated: true,
      contractsGeneratedAt: true,
      contractBulkOperationId: true,
      attemptedFirstBillingAt: true,
      clubId: true,
      club: {
        select: {
          merchantId: true,
          name: true,
          merchant: { select: { shop: true, platformShopName: true } },
        },
      },
      ReleaseProduct: {
        orderBy: { orderPriority: 'asc' },
        select: {
          id: true,
          platformProductId: true,
          platformVariantId: true,
          quantity: true,
          maxQuantity: true,
          minQuantity: true,
          price: true,
          priceAtCreation: true,
          currencyCode: true,
          kind: true,
          quantityAdjustable: true,
          excludeFromDiscounts: true,
        },
      },
      releaseDiscounts: {
        select: {
          id: true,
          name: true,
          scope: true,
          condition: true,
          valueType: true,
          discountPercent: true,
          discountAmount: true,
          minQuantity: true,
          minSubtotal: true,
        },
      },
      _count: {
        select: { ReleaseOrder: true },
      },
    },
  });

  if (!release || release.club.merchantId !== merchantId || release.clubId !== clubId) {
    return <NotFound message="Release not found" />;
  }

  const basePath = releasePath(merchantId, clubId, releaseId);
  const releaseOrders = await prismaClubs.releaseOrder.findMany({
    where: getReleaseOrderWhere(releaseId),
    orderBy: { createdAt: 'desc' },
    take: previewTake,
    select: releaseOrderSelect,
  });

  const membersWithoutOrderWhere = getMembersWithoutOrderWhere(release);
  const [membersWithoutOrder, membersWithoutOrderCount] = await Promise.all([
    prismaClubs.membership.findMany({
      where: membersWithoutOrderWhere,
      orderBy: { joinedAt: 'asc' },
      take: previewTake,
      select: memberWithoutOrderSelect,
    }),
    prismaClubs.membership.count({ where: membersWithoutOrderWhere }),
  ]);

  // Product names come from Shopify; the compliance catalog (when synced) provides the detail page
  const shop = release.club.merchant.shop;
  const variantIds = release.ReleaseProduct.map((p) => numericShopifyId(p.platformVariantId));
  const [catalogProducts, shopifyVariants] = await Promise.all([
    prisma.product.findMany({
      where: { shop, platformVariantId: { in: variantIds } },
      select: { id: true, name: true, platformProductId: true, platformVariantId: true },
    }),
    getShopifyVariants(shop, variantIds),
  ]);
  const catalogByVariant = new Map(
    catalogProducts.map((p) => [`${p.platformProductId}:${p.platformVariantId}`, p]),
  );
  const shopifyByVariant = new Map(shopifyVariants.map((v) => [v.legacyResourceId, v]));

  // Default products first, then by the release's own ordering
  const productRows = [...release.ReleaseProduct]
    .sort((a, b) => Number(b.kind === 'default') - Number(a.kind === 'default'))
    .map((product) => {
      const variantId = numericShopifyId(product.platformVariantId);
      const catalogProduct = catalogByVariant.get(
        `${numericShopifyId(product.platformProductId)}:${variantId}`,
      );
      const shopifyVariant = shopifyByVariant.get(variantId);
      return {
        ...product,
        name: shopifyVariant ? variantDisplayName(shopifyVariant) : catalogProduct?.name ?? '—',
        productHref: catalogProduct
          ? `/products/${catalogProduct.id}`
          : getShopifyAdminProductUrl(shop, product.platformProductId),
      };
    });

  const productHeaders = [
    {
      id: 'name',
      title: 'Name',
      href: (_v: string, row: any) => row.productHref,
    },
    { id: 'platformProductId', title: 'Product ID', as: 'code' as const },
    { id: 'platformVariantId', title: 'Variant ID', as: 'code' as const },
    {
      id: 'kind',
      title: 'Kind',
      formatter: (value: string) => (
        <Badge color={productKindColor[value] ?? 'gray'} variant="soft">
          {value}
        </Badge>
      ),
    },
    {
      id: 'price',
      title: 'Price',
      formatter: (value: number) => `$${value.toFixed(2)}`,
    },
    {
      id: 'quantity',
      title: 'Qty',
    },
    {
      id: 'quantityAdjustable',
      title: 'Adjustable',
      formatter: (value: boolean) => (value ? 'Yes' : 'No'),
    },
    {
      id: 'excludeFromDiscounts',
      title: 'Excl. Discounts',
      formatter: (value: boolean) => (value ? 'Yes' : '—'),
    },
  ];

  const discountHeaders = [
    { id: 'name', title: 'Name' },
    { id: 'scope', title: 'Scope' },
    { id: 'condition', title: 'Condition' },
    {
      id: 'valueType',
      title: 'Type',
    },
    {
      id: 'discountPercent',
      title: 'Percent',
      formatter: (v: number | null) => (v != null ? `${v}%` : '—'),
    },
    {
      id: 'discountAmount',
      title: 'Amount',
      formatter: (v: number | null) => (v != null ? `$${v.toFixed(2)}` : '—'),
    },
    {
      id: 'minQuantity',
      title: 'Min Qty',
      formatter: (v: number | null) => v ?? '—',
    },
    {
      id: 'minSubtotal',
      title: 'Min Subtotal',
      formatter: (v: number | null) => (v != null ? `$${v.toFixed(2)}` : '—'),
    },
  ];

  const backHref = `/clubs/merchants/${merchantId}/clubs/${clubId}`;
  const merchantName =
    release.club.merchant.platformShopName ?? release.club.merchant.shop;

  return (
    <PageLayout
      heading={release.name}
      subheading={`${release.club.name} · ${merchantName}`}
      actions={[
        { label: 'Back to Club', href: backHref, variant: 'soft', color: 'gray' },
      ]}
    >
      <Grid columns={{ initial: '1', md: '2' }} gap="4" mb="6">
        {/* Left: core details */}
        <Card>
          <Heading size="3" mb="3">
            Details
          </Heading>
          <QuickDataList
            data={[
              {
                label: 'Status',
                children: (
                  <Badge color={statusColor[release.status] ?? 'gray'}>{release.status}</Badge>
                ),
              },
              { label: 'Handle', value: release.platformHandle, as: 'code' },
              { label: 'Description', value: release.description },
              { label: 'Gift Note', value: release.giftNote },
              { label: 'Opens', value: dateTimeFormatter(release.publishDate) },
              { label: 'Customization Closes', value: dateTimeFormatter(release.customizationDeadline) },
              {
                label: 'Signup Deadline',
                value: release.signupDeadline ? dateTimeFormatter(release.signupDeadline) : undefined,
              },
              { label: 'Release Date', value: dateFormatter(release.releaseDate) },
              {
                label: 'Inventory Allocation',
                value: dateFormatter(release.inventoryAllocationDate),
              },
              {
                label: 'Shipping Hold Until',
                value: release.shippingHoldDate ? dateFormatter(release.shippingHoldDate) : undefined,
              },
              { label: 'Created', value: dateFormatter(release.createdAt) },
              { label: 'Updated', value: dateFormatter(release.updatedAt) },
            ]}
          />
        </Card>

        {/* Right: settings + processing status */}
        <Box>
          <Card mb="4">
            <Heading size="3" mb="3">
              Settings
            </Heading>
            <QuickDataList
              data={[
                { label: 'Allow Customization', value: release.allowCustomization ? 'Yes' : 'No' },
                {
                  label: 'Delivery Methods',
                  value: release.deliveryMethods.join(', ') || '—',
                },
                {
                  label: 'Default Shipping Method',
                  value: release.defaultPlatformShippingMethodName,
                },
                {
                  label: 'Cheapest Rate Only',
                  value: release.onlyCheapestShippingRate ? 'Yes' : 'No',
                },
                {
                  label: 'UPS Access Point Pickup',
                  value: release.allowUPSAccessPointPickup ? 'Enabled' : 'Disabled',
                },
                {
                  label: 'Shipping Flat Rate',
                  value: release.shippingFlatRate != null ? `$${release.shippingFlatRate.toFixed(2)}` : undefined,
                },
                { label: 'Min Order Qty', value: release.minOrderQuantity.toString() },
                {
                  label: 'Max Order Qty',
                  value: release.maxOrderQuantity?.toString(),
                },
                {
                  label: 'Min Order Value',
                  value: release.minOrderValue != null ? `$${release.minOrderValue.toFixed(2)}` : undefined,
                },
              ]}
            />
          </Card>

          <Card>
            <Heading size="3" mb="3">
              Processing Status
            </Heading>
            <QuickDataList
              data={[
                { label: 'Orders', value: release._count.ReleaseOrder.toString() },
                {
                  label: 'All Orders Created',
                  children: (
                    <Badge color={release.allReleaseOrdersCreated ? 'green' : 'gray'} variant="soft">
                      {release.allReleaseOrdersCreated ? 'Yes' : 'No'}
                    </Badge>
                  ),
                },
                {
                  label: 'Orders Created At',
                  value: release.allReleaseOrdersCreatedAt
                    ? dateTimeFormatter(release.allReleaseOrdersCreatedAt)
                    : undefined,
                },
                {
                  label: 'Contracts Generated',
                  children: (
                    <Badge color={release.contractsGenerated ? 'green' : 'gray'} variant="soft">
                      {release.contractsGenerated ? 'Yes' : 'No'}
                    </Badge>
                  ),
                },
                {
                  label: 'Contracts Generated At',
                  value: release.contractsGeneratedAt
                    ? dateTimeFormatter(release.contractsGeneratedAt)
                    : undefined,
                },
                {
                  label: 'Contract Bulk Op',
                  value: release.contractBulkOperationId,
                  as: 'code',
                  clipboard: true,
                  tooltip: 'Shopify bulk operation GID for in-flight contract creation. Present while a batch is running; reconciled before the next batch.',
                },
                {
                  label: 'First Billing Attempted',
                  value: release.attemptedFirstBillingAt
                    ? dateTimeFormatter(release.attemptedFirstBillingAt)
                    : undefined,
                },
                {
                  label: 'Inventory Reserved',
                  children: (
                    <Badge color={release.inventoryReserved ? 'green' : 'gray'} variant="soft">
                      {release.inventoryReserved ? 'Yes' : 'No'}
                    </Badge>
                  ),
                },
                {
                  label: 'Reserved For',
                  value: `${release.inventoryReservedForMemberCount} member(s)`,
                },
                {
                  label: 'Inventory Unreserved',
                  children: (
                    <Badge color={release.inventoryUnreserved ? 'green' : 'gray'} variant="soft">
                      {release.inventoryUnreserved ? 'Yes' : 'No'}
                    </Badge>
                  ),
                },
              ]}
            />
            {release.inventoryError && (
              <Box mt="3" p="2" style={{ backgroundColor: 'var(--red-2)', borderRadius: 'var(--radius-2)' }}>
                <Text size="1" color="red" weight="bold">
                  Inventory Error
                </Text>
                <Text as="p" size="1" color="red" mt="1">
                  {release.inventoryError}
                </Text>
              </Box>
            )}
          </Card>
        </Box>
      </Grid>

      {/* Products */}
      <Box mb="6">
        <Heading size="4" mb="3">
          Products ({release.ReleaseProduct.length})
        </Heading>
        {release.ReleaseProduct.length > 0 ? (
          <DataTable headers={productHeaders} data={productRows} />
        ) : (
          <Text color="gray" size="2">
            No products on this release.
          </Text>
        )}
      </Box>

      {/* Discounts */}
      {release.releaseDiscounts.length > 0 && (
        <Box mb="6">
          <Heading size="4" mb="3">
            Discounts ({release.releaseDiscounts.length})
          </Heading>
          <DataTable headers={discountHeaders} data={release.releaseDiscounts} />
        </Box>
      )}

      {/* Release Orders */}
      <Box>
        <Flex justify="between" align="center" mb="3">
          <Heading size="4">Orders ({release._count.ReleaseOrder})</Heading>
          {release._count.ReleaseOrder > previewTake && (
            <ButtonLink href={`${basePath}/orders`} variant="soft">
              View all
            </ButtonLink>
          )}
        </Flex>
        {releaseOrders.length > 0 ? (
          <>
            <DataFilter action={`${basePath}/orders`} />
            <DataTable
              headers={releaseOrderHeaders}
              data={toReleaseOrderRows(releaseOrders, basePath)}
              Actions={ReleaseOrderActions}
            />
          </>
        ) : (
          <Text color="gray" size="2">No orders for this release yet.</Text>
        )}
        {release._count.ReleaseOrder > previewTake && (
          <Text size="1" color="gray" mt="2" as="p">
            Showing latest {previewTake} of {release._count.ReleaseOrder} orders.
          </Text>
        )}
      </Box>

      {/* Members without an order */}
      {membersWithoutOrderCount > 0 && (
        <Box mt="6">
          <Flex justify="between" align="center" mb="3">
            <Heading size="4">Not Yet Customized ({membersWithoutOrderCount})</Heading>
            {membersWithoutOrderCount > previewTake && (
              <ButtonLink href={`${basePath}/not-customized`} variant="soft">
                View all
              </ButtonLink>
            )}
          </Flex>
          <Text as="p" size="2" color="gray" mb="3">
            Active members who have not customized or been given an order for this release.
          </Text>
          <DataTable
            headers={memberWithoutOrderHeaders}
            data={toMemberWithoutOrderRows(membersWithoutOrder)}
            Actions={MemberWithoutOrderActions}
          />
          {membersWithoutOrderCount > previewTake && (
            <Text size="1" color="gray" mt="2" as="p">
              Showing first {previewTake} of {membersWithoutOrderCount} members.
            </Text>
          )}
        </Box>
      )}
    </PageLayout>
  );
}

