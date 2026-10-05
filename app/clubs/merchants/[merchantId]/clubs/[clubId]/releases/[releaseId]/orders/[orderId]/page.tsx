import { prismaClubs } from '@/lib/prisma-clubs';
import { PageLayout } from '@/app/components/PageLayout';
import { QuickDataList } from '@/app/components/QuickDataList';
import { DataTable } from '@/app/components/DataTable';
import { DataDialog } from '@/app/components/DataDialog';
import { NotFound } from '@/app/components/NotFound';
import { Badge, Box, Card, Grid, Heading, Text } from '@radix-ui/themes';
import { dateFormatter, dateTimeFormatter } from '@/lib/formatters';
import type { RadixColor } from '@/types/radix-ui';
import { getReleaseOrderStatus, releaseOrderStatusSelect } from '@/lib/releaseOrderStatus';

// Events are an append-only history, so only the latest are shown
const eventTake = 100;

const eventActorColor: Record<string, RadixColor> = {
  CUSTOMER: 'blue',
  MERCHANT: 'violet',
  SYSTEM: 'gray',
  SHOPIFY: 'green',
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
    params: Promise<{ merchantId: string; clubId: string; releaseId: string; orderId: string }>;
  }
) {
  const params = await props.params;
  const merchantId = parseInt(params.merchantId);
  const { clubId, releaseId, orderId } = params;

  if (isNaN(merchantId)) return <NotFound message="Order not found" />;

  const order = await prismaClubs.releaseOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      releaseId: true,
      release: {
        select: {
          id: true,
          name: true,
          clubId: true,
          club: {
            select: { merchantId: true, name: true, merchant: { select: { shop: true, platformShopName: true } } },
          },
        },
      },
      clubCustomerId: true,
      clubCustomer: {
        select: {
          id: true,
          defaultEmail: true,
          firstName: true,
          lastName: true,
          defaultPhoneNumber: true,
          shop: true,
        },
      },
      ...releaseOrderStatusSelect,
      platformCustomerId: true,
      platformContractId: true,
      contractCancelledAt: true,
      orderCreatedAt: true,
      customizedAt: true,
      closedOutBy: true,
      closedOutReason: true,
      refundedQuantity: true,
      lastRefundedAt: true,
      deliveryMethod: true,
      deliveryAddress: true,
      deliveryPhone: true,
      deliveryPickupTitle: true,
      deliveryPickupDescription: true,
      deliveryPickupCode: true,
      deliveryLocalDeliveryCode: true,
      deliveryLocalDeliveryInstructions: true,
      shippingRateTitle: true,
      subtotal: true,
      discountAmount: true,
      discountPercent: true,
      shippingDiscountAmount: true,
      shippingDiscountPercent: true,
      deliveryPrice: true,
      complianceFeeCost: true,
      complianceCheckValid: true,
      total: true,
      currencyCode: true,
      customerShippingHoldUntil: true,
      customerNotes: true,
      giftNote: true,
      contractGeneratedAt: true,
      contractCreateAttemptedAt: true,
      attemptedFirstBillingAt: true,
      issues: {
        orderBy: [{ resolvedAt: { sort: 'desc', nulls: 'first' } }, { openedAt: 'desc' }],
        select: {
          id: true,
          code: true,
          detail: true,
          blocksProcessing: true,
          openedAt: true,
          resolvedAt: true,
          resolvedBy: true,
        },
      },
      // Archived notes are kept for support, so show them alongside live ones
      merchantNotes: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          body: true,
          sendToShopify: true,
          createdBy: true,
          archivedAt: true,
        },
      },
      events: {
        orderBy: { createdAt: 'desc' },
        take: eventTake,
        select: {
          id: true,
          createdAt: true,
          type: true,
          actor: true,
          actorLabel: true,
          data: true,
          detail: true,
          jobId: true,
          processingRecordId: true,
        },
      },
      _count: { select: { events: true } },
      products: {
        select: {
          id: true,
          price: true,
          currencyCode: true,
          quantity: true,
          releaseProduct: {
            select: { platformProductId: true, platformVariantId: true, kind: true },
          },
        },
      },
      orderProcessingRecords: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          key: true,
          completedAt: true,
          success: true,
          processingAttempt: true,
          platformErrorCode: true,
          errorData: true,
          nextActionUrl: true,
        },
      },
    },
  });

  if (
    !order ||
    order.releaseId !== releaseId ||
    order.release.clubId !== clubId ||
    order.release.club.merchantId !== merchantId
  ) {
    return <NotFound message="Order not found" />;
  }

  const fullName = [order.clubCustomer.firstName, order.clubCustomer.lastName].filter(Boolean).join(' ') || '—';
  const merchantName = order.release.club.merchant.platformShopName ?? order.release.club.merchant.shop;

  const status = getReleaseOrderStatus(order);

  const productRows = order.products.map((p) => ({
    ...p,
    kind: p.releaseProduct.kind,
    platformProductId: p.releaseProduct.platformProductId,
    platformVariantId: p.releaseProduct.platformVariantId,
  }));

  const productHeaders = [
    { id: 'platformProductId', title: 'Product ID', as: 'code' as const },
    { id: 'platformVariantId', title: 'Variant ID', as: 'code' as const },
    { id: 'kind', title: 'Kind' },
    { id: 'quantity', title: 'Qty' },
    {
      id: 'price',
      title: 'Price',
      formatter: (v: number, row: any) => money(v, row.currencyCode),
    },
  ];

  const recordHeaders = [
    { id: 'key', title: 'Key', formatter: (v: string | null) => v ?? '—' },
    { id: 'processingAttempt', title: 'Attempt' },
    {
      id: 'success',
      title: 'Result',
      formatter: (v: boolean) => (
        <Badge color={v ? 'green' : 'red'} variant="soft">
          {v ? 'Success' : 'Failed'}
        </Badge>
      ),
    },
    {
      id: 'platformErrorCode',
      title: 'Error Code',
      formatter: (v: string | null) => (v ? <code>{v}</code> : '—'),
    },
    {
      id: 'errorData',
      title: 'Error Data',
      formatter: (v: any) => (v ? <DataDialog title="Error Data" data={v} /> : '—'),
    },
    { id: 'completedAt', title: 'Completed', formatter: (v: Date | null) => (v ? dateTimeFormatter(v) : '—') },
    { id: 'createdAt', title: 'Created', formatter: dateTimeFormatter },
  ];

  const issueHeaders = [
    { id: 'code', title: 'Code', formatter: (v: string) => <code>{v}</code> },
    {
      id: 'blocksProcessing',
      title: 'Type',
      formatter: (v: boolean) => (
        <Badge color={v ? 'red' : 'amber'} variant="soft">
          {v ? 'Blocking' : 'Advisory'}
        </Badge>
      ),
    },
    { id: 'detail', title: 'Detail', formatter: (v: string | null) => v ?? '—' },
    { id: 'openedAt', title: 'Opened', formatter: dateTimeFormatter },
    {
      id: 'resolvedAt',
      title: 'Resolved',
      formatter: (v: Date | null, row: any) =>
        v ? (
          `${dateTimeFormatter(v)}${row.resolvedBy ? ` (${titleCase(row.resolvedBy)})` : ''}`
        ) : (
          <Badge color="orange" variant="soft">
            Open
          </Badge>
        ),
    },
  ];

  const noteHeaders = [
    { id: 'body', title: 'Note' },
    {
      id: 'sendToShopify',
      title: 'Visibility',
      formatter: (v: boolean) => (
        <Badge color={v ? 'blue' : 'gray'} variant="soft">
          {v ? 'Sent to Shopify' : 'Internal'}
        </Badge>
      ),
    },
    {
      id: 'archivedAt',
      title: 'Archived',
      formatter: (v: Date | null) => (v ? dateTimeFormatter(v) : '—'),
    },
    { id: 'createdBy', title: 'By', formatter: (v: string | null) => v ?? '—' },
    { id: 'updatedAt', title: 'Updated', formatter: dateTimeFormatter },
    { id: 'createdAt', title: 'Created', formatter: dateTimeFormatter },
  ];

  const eventHeaders = [
    { id: 'createdAt', title: 'When', formatter: dateTimeFormatter },
    { id: 'type', title: 'Event', formatter: (v: string) => titleCase(v) },
    {
      id: 'actor',
      title: 'Actor',
      formatter: (v: string, row: any) => (
        <Badge color={eventActorColor[v] ?? 'gray'} variant="soft">
          {row.actorLabel ?? titleCase(v)}
        </Badge>
      ),
    },
    {
      id: 'data',
      title: 'Data',
      formatter: (v: any) => (v ? <DataDialog title="Event Data" data={v} /> : '—'),
    },
    {
      id: 'detail',
      title: 'Detail',
      formatter: (v: any) => (v ? <DataDialog title="Event Detail" data={v} /> : '—'),
    },
    { id: 'jobId', title: 'Job ID', formatter: (v: string | null) => (v ? <code>{v}</code> : '—') },
  ];

  const openBlockingIssues = order.issues.filter((i) => !i.resolvedAt && i.blocksProcessing).length;

  const backHref = `/clubs/merchants/${merchantId}/clubs/${clubId}/releases/${releaseId}`;

  return (
    <PageLayout
      heading={order.platformOrderId ? `Order ${order.platformOrderId}` : `Order ${order.id}`}
      subheading={`${order.release.name} · ${order.release.club.name} · ${merchantName}`}
      actions={[{ label: 'Back to Release', href: backHref, variant: 'soft', color: 'gray' }]}
    >
      <Grid columns={{ initial: '1', md: '2' }} gap="4" mb="6">
        <Card>
          <Heading size="3" mb="3">Customer</Heading>
          <QuickDataList
            data={[
              {
                label: 'Email',
                value: order.clubCustomer.defaultEmail,
                linkTo: `/clubs/members/${order.clubCustomer.id}`,
              },
              { label: 'Name', value: fullName !== '—' ? fullName : undefined },
              { label: 'Phone', value: order.clubCustomer.defaultPhoneNumber },
              { label: 'Shop', value: order.clubCustomer.shop },
              { label: 'Shopify Customer ID', value: order.platformCustomerId, as: 'code' },
            ]}
          />
        </Card>

        <Card>
          <Heading size="3" mb="3">Order Status</Heading>
          <QuickDataList
            data={[
              { label: 'Status', children: <Badge color={status.color}>{status.label}</Badge> },
              { label: 'Shopify Order ID', value: order.platformOrderId, as: 'code' },
              { label: 'Contract ID', value: order.platformContractId, as: 'code' },
              {
                label: 'Contract Cancelled',
                value: order.contractCancelledAt ? dateTimeFormatter(order.contractCancelledAt) : undefined,
              },
              { label: 'Ordered At', value: order.orderCreatedAt ? dateTimeFormatter(order.orderCreatedAt) : undefined },
              { label: 'Customized At', value: order.customizedAt ? dateTimeFormatter(order.customizedAt) : undefined },
              { label: 'Skipped At', value: order.skippedAt ? dateTimeFormatter(order.skippedAt) : undefined },
              { label: 'Closed Out At', value: order.closedOutAt ? dateTimeFormatter(order.closedOutAt) : undefined },
              { label: 'Closed Out By', value: order.closedOutBy },
              { label: 'Close-Out Reason', value: order.closedOutReason },
              {
                label: 'Contract Generated',
                value: order.contractGeneratedAt ? dateTimeFormatter(order.contractGeneratedAt) : undefined,
              },
              {
                label: 'First Billing Attempted',
                value: order.attemptedFirstBillingAt ? dateTimeFormatter(order.attemptedFirstBillingAt) : undefined,
              },
              {
                label: 'Pre-Processing Error',
                children: order.preProcessingError ? (
                  <Badge color="red">
                    Yes{openBlockingIssues > 0 ? ` — ${openBlockingIssues} open blocking issue(s)` : ''}
                  </Badge>
                ) : undefined,
              },
              { label: 'Created', value: dateFormatter(order.createdAt) },
              { label: 'Updated', value: dateFormatter(order.updatedAt) },
            ]}
          />
        </Card>
      </Grid>

      <Grid columns={{ initial: '1', md: '2' }} gap="4" mb="6">
        <Card>
          <Heading size="3" mb="3">Delivery</Heading>
          <QuickDataList
            data={[
              { label: 'Method', value: titleCase(order.deliveryMethod) },
              { label: 'Shipping Rate', value: order.shippingRateTitle },
              { label: 'Phone', value: order.deliveryPhone },
              { label: 'Pickup Location', value: order.deliveryPickupTitle },
              { label: 'Pickup Description', value: order.deliveryPickupDescription },
              { label: 'Pickup Code', value: order.deliveryPickupCode },
              { label: 'Local Delivery Code', value: order.deliveryLocalDeliveryCode },
              { label: 'Local Delivery Instructions', value: order.deliveryLocalDeliveryInstructions },
              {
                label: 'Shipping Hold Until',
                value: order.customerShippingHoldUntil ? dateFormatter(order.customerShippingHoldUntil) : undefined,
              },
              {
                label: 'Address',
                children: order.deliveryAddress ? (
                  <DataDialog title="Delivery Address" data={order.deliveryAddress} />
                ) : undefined,
              },
            ]}
          />
        </Card>

        <Card>
          <Heading size="3" mb="3">Financials</Heading>
          <QuickDataList
            data={[
              { label: 'Subtotal', value: money(order.subtotal, order.currencyCode) },
              {
                label: 'Discount',
                value:
                  order.discountAmount > 0
                    ? `-${money(order.discountAmount, order.currencyCode)}`
                    : order.discountPercent > 0
                      ? `-${(order.discountPercent * 100).toFixed(1)}%`
                      : undefined,
              },
              { label: 'Shipping', value: money(order.deliveryPrice, order.currencyCode) },
              {
                label: 'Shipping Discount',
                value:
                  order.shippingDiscountAmount > 0
                    ? `-${money(order.shippingDiscountAmount, order.currencyCode)}`
                    : order.shippingDiscountPercent > 0
                      ? `-${(order.shippingDiscountPercent * 100).toFixed(1)}%`
                      : undefined,
              },
              {
                label: 'Compliance Fee',
                value: order.complianceFeeCost > 0 ? money(order.complianceFeeCost, order.currencyCode) : undefined,
              },
              { label: 'Total', value: money(order.total, order.currencyCode), bold: true },
              {
                label: 'Refunded',
                value:
                  order.refundedAmount > 0
                    ? `${money(order.refundedAmount, order.currencyCode)} (${order.refundedQuantity} item(s))`
                    : undefined,
              },
              {
                label: 'Last Refunded',
                value: order.lastRefundedAt ? dateTimeFormatter(order.lastRefundedAt) : undefined,
              },
              {
                label: 'Compliance Check',
                children:
                  order.complianceCheckValid == null ? undefined : (
                    <Badge color={order.complianceCheckValid ? 'green' : 'red'} variant="soft">
                      {order.complianceCheckValid ? 'Valid' : 'Invalid'}
                    </Badge>
                  ),
              },
            ]}
          />
        </Card>
      </Grid>

      {(order.customerNotes || order.giftNote) && (
        <Card mb="6">
          <Heading size="3" mb="2">Notes</Heading>
          <QuickDataList
            data={[
              { label: 'Customer Notes', value: order.customerNotes },
              { label: 'Gift Note', value: order.giftNote },
            ]}
          />
        </Card>
      )}

      {order.issues.length > 0 && (
        <Box mb="6">
          <Heading size="4" mb="3">Issues ({order.issues.length})</Heading>
          <DataTable headers={issueHeaders} data={order.issues} />
        </Box>
      )}

      {order.merchantNotes.length > 0 && (
        <Box mb="6">
          <Heading size="4" mb="3">Merchant Notes ({order.merchantNotes.length})</Heading>
          <DataTable headers={noteHeaders} data={order.merchantNotes} />
        </Box>
      )}

      <Box mb="6">
        <Heading size="4" mb="3">Products ({productRows.length})</Heading>
        {productRows.length > 0 ? (
          <DataTable headers={productHeaders} data={productRows} />
        ) : (
          <Text color="gray" size="2">No products on this order.</Text>
        )}
      </Box>

      <Box>
        <Heading size="4" mb="3">Processing Records ({order.orderProcessingRecords.length})</Heading>
        {order.orderProcessingRecords.length > 0 ? (
          <DataTable headers={recordHeaders} data={order.orderProcessingRecords} />
        ) : (
          <Text color="gray" size="2">No processing records yet.</Text>
        )}
      </Box>

      <Box mt="6">
        <Heading size="4" mb="3">Timeline ({order._count.events})</Heading>
        {order.events.length > 0 ? (
          <>
            <DataTable headers={eventHeaders} data={order.events} />
            {order._count.events > eventTake && (
              <Text size="1" color="gray" mt="2" as="p">
                Showing latest {eventTake} of {order._count.events} events.
              </Text>
            )}
          </>
        ) : (
          <Text color="gray" size="2">No events recorded yet.</Text>
        )}
      </Box>
    </PageLayout>
  );
}
