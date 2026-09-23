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
import type { RadixColor } from '@/types/radix-ui';

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

  const releaseOrders = await prismaClubs.releaseOrder.findMany({
    where: { releaseId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      platformCustomerId: true,
      platformOrderId: true,
      orderCreatedAt: true,
      skippedAt: true,
      deliveryMethod: true,
      subtotal: true,
      discountAmount: true,
      deliveryPrice: true,
      createdAt: true,
      clubCustomer: {
        select: { defaultEmail: true, firstName: true, lastName: true },
      },
    },
  });

  // Active members who belong to this release cycle but have no order for it yet
  const membersWithoutOrderWhere = {
    clubId,
    status: 'ACTIVE' as const,
    joinedAt: { lt: release.releaseDate },
    customer: { ReleaseOrder: { none: { releaseId } } },
  };

  const [membersWithoutOrder, membersWithoutOrderCount] = await Promise.all([
    prismaClubs.membership.findMany({
      where: membersWithoutOrderWhere,
      orderBy: { joinedAt: 'asc' },
      take: 100,
      select: {
        id: true,
        memberNumber: true,
        joinedAt: true,
        customer: {
          select: { id: true, platformCustomerId: true, defaultEmail: true, firstName: true, lastName: true },
        },
      },
    }),
    prismaClubs.membership.count({ where: membersWithoutOrderWhere }),
  ]);

  const memberWithoutOrderRows = membersWithoutOrder.map((membership) => ({
    ...membership,
    customerEmail: membership.customer.defaultEmail,
    customerName: [membership.customer.firstName, membership.customer.lastName].filter(Boolean).join(' ') || '—',
    platformCustomerId: membership.customer.platformCustomerId,
    customerId: membership.customer.id,
  }));

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

  const orderRows = releaseOrders.map((order) => ({
    ...order,
    customerEmail: order.clubCustomer.defaultEmail,
    customerName: [order.clubCustomer.firstName, order.clubCustomer.lastName].filter(Boolean).join(' ') || '—',
  }));

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
        <Heading size="4" mb="3">
          Orders ({release._count.ReleaseOrder})
        </Heading>
        {orderRows.length > 0 ? (
          <DataTable
            headers={[
              {
                id: 'customerEmail',
                title: 'Email',
                href: (_v: string, row: any) =>
                  `/clubs/merchants/${merchantId}/clubs/${clubId}/releases/${releaseId}/orders/${row.id}`,
              },
              { id: 'customerName', title: 'Name' },
              {
                id: 'skippedAt',
                title: 'Status',
                formatter: (skippedAt: Date | null, row: any) => {
                  if (skippedAt) return <Badge color="gray" variant="soft">Skipped</Badge>;
                  if (row.platformOrderId) return <Badge color="green" variant="soft">Ordered</Badge>;
                  return <Badge color="orange" variant="soft">Pending</Badge>;
                },
              },
              { id: 'platformOrderId', title: 'Order ID', as: 'code' as const },
              { id: 'deliveryMethod', title: 'Delivery' },
              {
                id: 'subtotal',
                title: 'Subtotal',
                formatter: (v: number) => `$${v.toFixed(2)}`,
              },
              {
                id: 'discountAmount',
                title: 'Discount',
                formatter: (v: number) => (v > 0 ? `-$${v.toFixed(2)}` : '—'),
              },
              {
                id: 'deliveryPrice',
                title: 'Shipping',
                formatter: (v: number) => (v > 0 ? `$${v.toFixed(2)}` : '—'),
              },
              { id: 'orderCreatedAt', title: 'Ordered At', formatter: (v: Date | null) => v ? dateTimeFormatter(v) : '—' },
              { id: 'createdAt', title: 'Created', formatter: dateFormatter },
              { type: 'actions' as const, title: 'Actions' },
            ]}
            data={orderRows}
            Actions={({ id }: { id: string }) => (
              <ButtonLink href={`/clubs/merchants/${merchantId}/clubs/${clubId}/releases/${releaseId}/orders/${id}`}>
                View
              </ButtonLink>
            )}
          />
        ) : (
          <Text color="gray" size="2">No orders for this release yet.</Text>
        )}
        {release._count.ReleaseOrder > 100 && (
          <Text size="1" color="gray" mt="2" as="p">
            Showing first 100 of {release._count.ReleaseOrder} orders.
          </Text>
        )}
      </Box>

      {/* Members without an order */}
      {membersWithoutOrderCount > 0 && (
        <Box mt="6">
          <Heading size="4" mb="3">
            Not Yet Customized ({membersWithoutOrderCount})
          </Heading>
          <Text as="p" size="2" color="gray" mb="3">
            Active members who have not customized or been given an order for this release.
          </Text>
          <DataTable
            headers={[
              {
                id: 'customerEmail',
                title: 'Email',
                href: (_v: string, row: any) => `/clubs/members/${row.customerId}`,
              },
              { id: 'customerName', title: 'Name' },
              { id: 'memberNumber', title: 'Member #', formatter: (v: string | null) => v ?? '—' },
              { id: 'platformCustomerId', title: 'Customer ID', as: 'code' as const },
              { id: 'joinedAt', title: 'Joined', formatter: dateFormatter },
              { type: 'actions' as const, title: 'Actions' },
            ]}
            data={memberWithoutOrderRows}
            Actions={({ customerId }: { customerId: string }) => (
              <ButtonLink href={`/clubs/members/${customerId}`}>View</ButtonLink>
            )}
          />
          {membersWithoutOrderCount > 100 && (
            <Text size="1" color="gray" mt="2" as="p">
              Showing first 100 of {membersWithoutOrderCount} members.
            </Text>
          )}
        </Box>
      )}
    </PageLayout>
  );
}
