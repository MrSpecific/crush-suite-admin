import { prismaClubs } from '@/lib/prisma-clubs';
import { PageLayout } from '@/app/components/PageLayout';
import { QuickDataList } from '@/app/components/QuickDataList';
import { DataTable } from '@/app/components/DataTable';
import { DataDialog } from '@/app/components/DataDialog';
import { Pagination } from '@/app/components/Pagination';
import { NotFound } from '@/app/components/NotFound';
import { Badge, Box, Card, Grid, Heading, Text } from '@radix-ui/themes';
import { dateFormatter, dateTimeFormatter } from '@/lib/formatters';
import { queryPagination } from '@/lib/queryPagination';
import { ButtonLink } from '@/app/components/ButtonLink';
import type { RadixColor } from '@/types/radix-ui';

const subscriptionStatusColor: Record<string, RadixColor> = {
  ACTIVE: 'green',
  PAUSED: 'yellow',
  CANCELLED: 'gray',
};

const orderStatusColor: Record<string, RadixColor> = {
  PENDING: 'gray',
  PROCESSING: 'blue',
  COMPLETED: 'green',
  FAILED: 'red',
  SKIPPED: 'orange',
  CHALLENGED: 'purple',
  ORDER_ID_UNRESOLVED: 'amber',
};

const orderSourceColor: Record<string, RadixColor> = {
  CHECKOUT: 'blue',
  RENEWAL: 'gray',
  MANUAL: 'purple',
};

const eventTypeColor: Record<string, RadixColor> = {
  RESCHEDULED: 'blue',
  SKIPPED: 'orange',
  FREQUENCY_CHANGED: 'purple',
  SELECTIONS_CHANGED: 'cyan',
  BUNDLE_TYPE_CHANGED: 'purple',
  ADDRESS_CHANGED: 'gray',
  PHONE_CHANGED: 'gray',
  PAYMENT_CHANGED: 'teal',
};

const money = (value: number | null | undefined, currency = 'USD') =>
  value != null
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value)
    : '—';

const titleCase = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

export default async function Page(
  props: {
    params: Promise<{ merchantId: string; clubId: string; subscriptionId: string }>;
    searchParams: Promise<PageSearchParams>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const merchantId = parseInt(params.merchantId);
  const { clubId, subscriptionId } = params;
  const { page } = searchParams;

  if (isNaN(merchantId)) return <NotFound message="Subscription not found" />;

  const subscription = await prismaClubs.bundleSubscription.findUnique({
    where: { id: subscriptionId },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      frequency: true,
      status: true,
      nextBillingDate: true,
      lastBilledAt: true,
      platformConsolidatedContractId: true,
      cartBundleId: true,
      appliedTier: true,
      productDiscountTotal: true,
      // delivery
      deliveryMethod: true,
      deliveryAddress: true,
      deliveryPhone: true,
      shippingRate: true,
      shippingRateTitle: true,
      shippingBasePrice: true,
      shippingDiscountedPrice: true,
      shippingDiscountTitle: true,
      deliveryPickupPlatformLocationId: true,
      deliveryPickupTitle: true,
      deliveryPickupDescription: true,
      deliveryPickupCode: true,
      deliveryLocalDeliveryCode: true,
      deliveryLocalDeliveryInstructions: true,
      // compliance
      complianceFee: true,
      complianceFeeCost: true,
      bundleTypeId: true,
      bundleType: {
        select: { id: true, name: true, mode: true, clubId: true },
      },
      currentSelections: {
        select: { selections: true, updatedAt: true },
      },
      membership: {
        select: {
          id: true,
          memberNumber: true,
          status: true,
          joinedAt: true,
          clubId: true,
          club: {
            select: { id: true, name: true, merchantId: true },
          },
          customer: {
            select: { id: true, defaultEmail: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });

  if (
    !subscription ||
    subscription.membership.club.merchantId !== merchantId ||
    subscription.membership.clubId !== clubId
  ) {
    return <NotFound message="Subscription not found" />;
  }

  const orderCount = await prismaClubs.bundleOrder.count({
    where: { bundleSubscriptionId: subscriptionId },
  });

  const orders = await prismaClubs.bundleOrder.findMany({
    ...queryPagination({ page, count: orderCount }),
    where: { bundleSubscriptionId: subscriptionId },
    orderBy: { billingCycleStart: 'desc' },
    select: {
      id: true,
      source: true,
      status: true,
      billingCycleStart: true,
      billingCycleEnd: true,
      platformOrderId: true,
      subtotal: true,
      productDiscountTotal: true,
      shippingCost: true,
      complianceFeeCost: true,
      total: true,
      currencyCode: true,
      skippedAt: true,
      errorMessage: true,
      createdAt: true,
    },
  });

  const events = await prismaClubs.bundleSubscriptionEvent.findMany({
    where: { membershipId: subscription.membership.id },
    orderBy: { createdAt: 'desc' },
    take: 25,
    select: { id: true, type: true, reason: true, metadata: true, createdAt: true },
  });

  const { membership } = subscription;
  const { customer, club } = membership;
  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.defaultEmail;
  const clubHref = `/clubs/merchants/${merchantId}/clubs/${clubId}`;

  // Build delivery details that vary by method
  const deliveryData: { label: string; value?: string | null; children?: React.ReactNode; as?: 'code' }[] = [
    { label: 'Method', value: subscription.deliveryMethod },
    { label: 'Phone', value: subscription.deliveryPhone },
  ];
  if (subscription.deliveryMethod === 'SHIPPING') {
    deliveryData.push(
      { label: 'Shipping Rate', value: subscription.shippingRateTitle ?? subscription.shippingRate },
      { label: 'Base Price', value: subscription.shippingBasePrice != null ? money(subscription.shippingBasePrice) : undefined },
      { label: 'Billed Price', value: subscription.shippingDiscountedPrice != null ? money(subscription.shippingDiscountedPrice) : undefined },
      { label: 'Shipping Discount', value: subscription.shippingDiscountTitle },
    );
  } else if (subscription.deliveryMethod === 'PICKUP') {
    deliveryData.push(
      { label: 'Pickup Location', value: subscription.deliveryPickupTitle },
      { label: 'Pickup Details', value: subscription.deliveryPickupDescription },
      { label: 'Pickup Code', value: subscription.deliveryPickupCode, as: 'code' },
    );
  } else if (subscription.deliveryMethod === 'LOCAL_DELIVERY') {
    deliveryData.push(
      { label: 'Delivery Code', value: subscription.deliveryLocalDeliveryCode, as: 'code' },
      { label: 'Instructions', value: subscription.deliveryLocalDeliveryInstructions },
    );
  }

  const selections = Array.isArray(subscription.currentSelections?.selections)
    ? (subscription.currentSelections!.selections as Array<Record<string, any>>)
    : [];

  const orderHeaders = [
    {
      id: 'status',
      title: 'Status',
      formatter: (v: string) => (
        <Badge color={orderStatusColor[v] ?? 'gray'} variant="soft">{titleCase(v)}</Badge>
      ),
    },
    {
      id: 'source',
      title: 'Source',
      formatter: (v: string) => (
        <Badge color={orderSourceColor[v] ?? 'gray'} variant="soft" size="1">{v}</Badge>
      ),
    },
    {
      id: 'billingCycleStart',
      title: 'Cycle',
      formatter: (v: Date, row: any) => `${dateFormatter(v)} – ${dateFormatter(row.billingCycleEnd)}`,
    },
    { id: 'platformOrderId', title: 'Order ID', as: 'code' as const },
    { id: 'subtotal', title: 'Subtotal', formatter: (v: number, row: any) => money(v, row.currencyCode) },
    {
      id: 'productDiscountTotal',
      title: 'Discount',
      formatter: (v: number, row: any) => (v > 0 ? `-${money(v, row.currencyCode)}` : '—'),
    },
    { id: 'shippingCost', title: 'Shipping', formatter: (v: number, row: any) => (v > 0 ? money(v, row.currencyCode) : '—') },
    { id: 'total', title: 'Total', formatter: (v: number, row: any) => money(v, row.currencyCode) },
    {
      id: 'errorMessage',
      title: 'Error',
      formatter: (v: string | null) =>
        v ? (
          <Text size="1" color="red" title={v}>
            {v.slice(0, 50)}{v.length > 50 ? '…' : ''}
          </Text>
        ) : '—',
    },
    { id: 'createdAt', title: 'Created', formatter: dateFormatter },
  ];

  return (
    <PageLayout
      heading={`Subscription · ${fullName}`}
      subheading={`${club.name} · ${subscription.bundleType.name}`}
      actions={[
        { label: 'Back to Bundle', href: `${clubHref}/bundles/${subscription.bundleType.id}`, variant: 'soft', color: 'gray' },
        { label: 'View Member', href: `/clubs/members/${customer.id}`, variant: 'soft' },
      ]}
    >
      <Grid columns={{ initial: '1', md: '2' }} gap="4" mb="6">
        <Card>
          <Heading size="3" mb="3">Subscription</Heading>
          <QuickDataList
            data={[
              {
                label: 'Status',
                children: (
                  <Badge color={subscriptionStatusColor[subscription.status] ?? 'gray'}>
                    {subscription.status}
                  </Badge>
                ),
              },
              { label: 'Frequency', value: titleCase(subscription.frequency) },
              {
                label: 'Next Billing',
                value: subscription.nextBillingDate ? dateTimeFormatter(subscription.nextBillingDate) : undefined,
              },
              {
                label: 'Last Billed',
                value: subscription.lastBilledAt ? dateTimeFormatter(subscription.lastBilledAt) : undefined,
              },
              { label: 'Bundle Type', value: subscription.bundleType.name, linkTo: `${clubHref}/bundles/${subscription.bundleType.id}` },
              { label: 'Bundle Mode', value: subscription.bundleType.mode },
              { label: 'Consolidated Contract', value: subscription.platformConsolidatedContractId, as: 'code' },
              { label: 'Cart Bundle ID', value: subscription.cartBundleId, as: 'code' },
              { label: 'Created', value: dateFormatter(subscription.createdAt) },
              { label: 'Updated', value: dateFormatter(subscription.updatedAt) },
            ]}
          />
        </Card>

        <Box>
          <Card mb="4">
            <Heading size="3" mb="3">Member</Heading>
            <QuickDataList
              data={[
                { label: 'Name', value: fullName, linkTo: `/clubs/members/${customer.id}` },
                { label: 'Email', value: customer.defaultEmail, linkTo: `mailto:${customer.defaultEmail}` },
                { label: 'Member #', value: membership.memberNumber },
                {
                  label: 'Membership Status',
                  children: <Badge color={membership.status === 'ACTIVE' ? 'green' : 'gray'} variant="soft">{membership.status}</Badge>,
                },
                { label: 'Joined', value: dateFormatter(membership.joinedAt) },
                { label: 'Club', value: club.name, linkTo: clubHref },
              ]}
            />
          </Card>

          <Card>
            <Heading size="3" mb="3">Pricing</Heading>
            <QuickDataList
              data={[
                {
                  label: 'Product Discount / Cycle',
                  value: subscription.productDiscountTotal != null ? money(subscription.productDiscountTotal) : undefined,
                },
                {
                  label: 'Compliance Fee / Cycle',
                  value: subscription.complianceFeeCost > 0 ? money(subscription.complianceFeeCost) : undefined,
                },
              ]}
            >
              {subscription.appliedTier != null && (
                <QuickDataList.Item
                  item={{
                    label: 'Applied Tier',
                    children: <DataDialog title="Applied Discount Tier" data={subscription.appliedTier} />,
                  }}
                />
              )}
              {subscription.complianceFee != null && (
                <QuickDataList.Item
                  item={{
                    label: 'Compliance Fee Detail',
                    children: <DataDialog title="Compliance Fee" data={subscription.complianceFee} />,
                  }}
                />
              )}
            </QuickDataList>
          </Card>
        </Box>
      </Grid>

      <Grid columns={{ initial: '1', md: '2' }} gap="4" mb="6">
        <Card>
          <Heading size="3" mb="3">Delivery</Heading>
          <QuickDataList data={deliveryData} />
          {subscription.deliveryAddress != null && (
            <Box mt="2">
              <DataDialog title="Delivery Address" data={subscription.deliveryAddress} />
            </Box>
          )}
        </Card>

        <Card>
          <Heading size="3" mb="3">
            Current Selections ({selections.length})
          </Heading>
          {selections.length > 0 ? (
            <DataTable
              headers={[
                { id: 'variantId', title: 'Variant ID', as: 'code' as const },
                { id: 'productId', title: 'Product ID', as: 'code' as const },
                { id: 'quantity', title: 'Qty' },
              ]}
              data={selections}
            />
          ) : (
            <Text color="gray" size="2">No selection snapshot recorded.</Text>
          )}
        </Card>
      </Grid>

      <Box mb="6">
        <Heading size="4" mb="3">Billing Cycle Orders ({orderCount})</Heading>
        {orders.length > 0 ? (
          <>
            <DataTable headers={orderHeaders} data={orders} />
            <Pagination count={orderCount} />
          </>
        ) : (
          <Text color="gray" size="2">No billing cycle orders yet.</Text>
        )}
      </Box>

      <Box>
        <Heading size="4" mb="3">Activity ({events.length})</Heading>
        {events.length > 0 ? (
          <DataTable
            headers={[
              {
                id: 'type',
                title: 'Event',
                formatter: (v: string) => (
                  <Badge color={eventTypeColor[v] ?? 'gray'} variant="soft" size="1">{titleCase(v)}</Badge>
                ),
              },
              { id: 'reason', title: 'Reason', formatter: (v: string | null) => v ?? '—' },
              {
                id: 'metadata',
                title: 'Detail',
                formatter: (v: any) => (v ? <DataDialog title="Event Metadata" data={v} /> : '—'),
              },
              { id: 'createdAt', title: 'When', formatter: dateTimeFormatter },
            ]}
            data={events}
          />
        ) : (
          <Text color="gray" size="2">No recorded activity.</Text>
        )}
      </Box>
    </PageLayout>
  );
}
