import { prismaClubs } from '@/lib/prisma-clubs';
import { PageLayout } from '@/app/components/PageLayout';
import { QuickDataList } from '@/app/components/QuickDataList';
import { DataTable } from '@/app/components/DataTable';
import { DataDialog } from '@/app/components/DataDialog';
import { NotFound } from '@/app/components/NotFound';
import { Badge, Box, Card, Grid, Heading, Text } from '@radix-ui/themes';
import {
  dateFormatter,
  dateTimeFormatter,
  linkToClubMerchantFormatter,
} from '@/lib/formatters';
import type { RadixColor } from '@/types/radix-ui';

const membershipStatusColor: Record<string, RadixColor> = {
  ACTIVE: 'green',
  PAUSED: 'yellow',
  LEFT: 'gray',
  PENDING_MIGRATION: 'orange',
};

const subscriptionStatusColor: Record<string, RadixColor> = {
  ACTIVE: 'green',
  PAUSED: 'yellow',
  CANCELLED: 'gray',
};

const billingStatusColor: Record<string, RadixColor> = {
  PENDING: 'gray',
  SUCCESS: 'green',
  FAILED: 'red',
  CHALLENGED: 'purple',
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

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const customer = await prismaClubs.clubCustomer.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      defaultEmail: true,
      firstName: true,
      lastName: true,
      defaultPhoneNumber: true,
      shop: true,
      platformCustomerId: true,
      notes: true,
      Membership: {
        orderBy: { joinedAt: 'desc' },
        select: {
          id: true,
          status: true,
          joinedAt: true,
          leftAt: true,
          pausedAt: true,
          memberNumber: true,
          clubId: true,
          club: {
            select: {
              name: true,
              clubType: true,
              merchantId: true,
              merchant: { select: { platformShopName: true, shop: true } },
            },
          },
          bundleSubscription: {
            select: {
              id: true,
              status: true,
              frequency: true,
              nextBillingDate: true,
              bundleType: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!customer) return <NotFound message="Member not found" />;

  const [releaseOrders, billingRecords, membershipEvents, bundleEvents, emailLogs] = await Promise.all([
    prismaClubs.releaseOrder.findMany({
      where: { clubCustomerId: customer.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        skippedAt: true,
        platformOrderId: true,
        orderCreatedAt: true,
        deliveryMethod: true,
        total: true,
        currencyCode: true,
        createdAt: true,
        release: {
          select: { id: true, name: true, clubId: true, club: { select: { merchantId: true, name: true } } },
        },
      },
    }),
    prismaClubs.membershipBillingRecord.findMany({
      where: { membership: { customerId: customer.id } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        billingCycleStart: true,
        billingCycleEnd: true,
        amount: true,
        currencyCode: true,
        status: true,
        platformOrderId: true,
        errorMessage: true,
        attemptCount: true,
        createdAt: true,
        membership: { select: { club: { select: { name: true } } } },
      },
    }),
    prismaClubs.membershipEvent.findMany({
      where: { membership: { customerId: customer.id } },
      orderBy: { createdAt: 'desc' },
      take: 25,
      select: {
        id: true,
        type: true,
        reason: true,
        metadata: true,
        createdAt: true,
        membership: { select: { club: { select: { name: true } } } },
      },
    }),
    prismaClubs.bundleSubscriptionEvent.findMany({
      where: { membership: { customerId: customer.id } },
      orderBy: { createdAt: 'desc' },
      take: 25,
      select: {
        id: true,
        type: true,
        reason: true,
        metadata: true,
        createdAt: true,
        membership: { select: { club: { select: { name: true } } } },
      },
    }),
    prismaClubs.customerEmailLog.findMany({
      where: { shop: customer.shop, sentTo: customer.defaultEmail },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        emailType: true,
        success: true,
        error: true,
        createdAt: true,
      },
    }),
  ]);

  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || '—';
  const heading = fullName !== '—' ? fullName : customer.defaultEmail;

  // ─── Memberships ──────────────────────────────────────────────────
  const memberships = customer.Membership.map((m) => ({
    ...m,
    merchantId: m.club.merchantId,
    clubName: m.club.name,
    merchantName: m.club.merchant.platformShopName ?? m.club.merchant.shop,
  }));

  const membershipHeaders = [
    {
      id: 'clubName',
      title: 'Club',
      href: (_v: string, row: any) => `/clubs/merchants/${row.merchantId}/clubs/${row.clubId}`,
    },
    { id: 'merchantName', title: 'Merchant', formatter: linkToClubMerchantFormatter },
    {
      id: 'club',
      title: 'Type',
      formatter: (club: { clubType: string }) => titleCase(club.clubType),
    },
    { id: 'memberNumber', title: 'Member #', formatter: (v: string | null) => v ?? '—' },
    {
      id: 'status',
      title: 'Status',
      formatter: (value: string) => (
        <Badge color={membershipStatusColor[value] ?? 'gray'} variant="soft">{value}</Badge>
      ),
    },
    {
      id: 'bundleSubscription',
      title: 'Subscription',
      formatter: (sub: any) =>
        sub ? (
          <Badge color={subscriptionStatusColor[sub.status] ?? 'gray'} variant="soft">
            {sub.status} · {titleCase(sub.frequency)}
          </Badge>
        ) : (
          '—'
        ),
      href: (sub: any, row: any) =>
        sub ? `/clubs/merchants/${row.merchantId}/clubs/${row.clubId}/subscriptions/${sub.id}` : undefined,
    },
    { id: 'joinedAt', title: 'Joined', formatter: dateFormatter },
    { id: 'leftAt', title: 'Left', formatter: (v: Date | null) => (v ? dateFormatter(v) : '—') },
  ];

  // ─── Release orders ───────────────────────────────────────────────
  const releaseOrderRows = releaseOrders.map((o) => ({
    ...o,
    releaseName: o.release.name,
    clubName: o.release.club.name,
    merchantId: o.release.club.merchantId,
    clubId: o.release.clubId,
  }));

  const releaseOrderHeaders = [
    {
      id: 'releaseName',
      title: 'Release',
      href: (_v: string, row: any) =>
        `/clubs/merchants/${row.merchantId}/clubs/${row.clubId}/releases/${row.release.id}`,
    },
    { id: 'clubName', title: 'Club' },
    {
      id: 'skippedAt',
      title: 'Status',
      formatter: (skippedAt: Date | null, row: any) => {
        if (skippedAt) return <Badge color="gray" variant="soft">Skipped</Badge>;
        if (row.platformOrderId) return <Badge color="green" variant="soft">Ordered</Badge>;
        return <Badge color="orange" variant="soft">Pending</Badge>;
      },
    },
    { id: 'deliveryMethod', title: 'Delivery' },
    { id: 'total', title: 'Total', formatter: (v: number, row: any) => money(v, row.currencyCode) },
    {
      id: 'orderCreatedAt',
      title: 'Ordered',
      formatter: (v: Date | null) => (v ? dateFormatter(v) : '—'),
    },
    { id: 'createdAt', title: 'Created', formatter: dateFormatter },
  ];

  // ─── Membership billing ───────────────────────────────────────────
  const billingRows = billingRecords.map((b) => ({ ...b, clubName: b.membership.club.name }));

  const billingHeaders = [
    { id: 'clubName', title: 'Club' },
    {
      id: 'billingCycleStart',
      title: 'Cycle',
      formatter: (v: Date, row: any) => `${dateFormatter(v)} – ${dateFormatter(row.billingCycleEnd)}`,
    },
    { id: 'amount', title: 'Amount', formatter: (v: number, row: any) => money(v, row.currencyCode) },
    {
      id: 'status',
      title: 'Status',
      formatter: (v: string) => (
        <Badge color={billingStatusColor[v] ?? 'gray'} variant="soft">{v}</Badge>
      ),
    },
    { id: 'attemptCount', title: 'Attempts' },
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

  // ─── Activity timeline (membership + bundle events merged) ─────────
  const activity = [
    ...membershipEvents.map((e) => ({ ...e, kind: 'Membership' as const })),
    ...bundleEvents.map((e) => ({ ...e, kind: 'Subscription' as const })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 30)
    .map((e) => ({ ...e, clubName: e.membership.club.name }));

  const activityHeaders = [
    { id: 'createdAt', title: 'When', formatter: dateTimeFormatter },
    {
      id: 'kind',
      title: 'Source',
      formatter: (v: string) => (
        <Badge color={v === 'Subscription' ? 'purple' : 'blue'} variant="soft" size="1">{v}</Badge>
      ),
    },
    { id: 'type', title: 'Event', formatter: (v: string) => titleCase(v) },
    { id: 'clubName', title: 'Club' },
    { id: 'reason', title: 'Reason', formatter: (v: string | null) => v ?? '—' },
    {
      id: 'metadata',
      title: 'Detail',
      formatter: (v: any) => (v ? <DataDialog title="Event Metadata" data={v} /> : '—'),
    },
  ];

  // ─── Email log ────────────────────────────────────────────────────
  const emailHeaders = [
    { id: 'createdAt', title: 'Sent', formatter: dateTimeFormatter },
    { id: 'emailType', title: 'Type', formatter: (v: string) => titleCase(v) },
    {
      id: 'success',
      title: 'Result',
      formatter: (v: boolean) => (
        <Badge color={v ? 'green' : 'red'} variant="soft">{v ? 'Sent' : 'Failed'}</Badge>
      ),
    },
    {
      id: 'error',
      title: 'Error',
      formatter: (v: string | null) =>
        v ? (
          <Text size="1" color="red" title={v}>
            {v.slice(0, 50)}{v.length > 50 ? '…' : ''}
          </Text>
        ) : '—',
    },
  ];

  return (
    <PageLayout
      heading={heading}
      subheading={customer.shop}
      actions={[{ label: 'Back to Members', href: '/clubs/members', variant: 'soft', color: 'gray' }]}
    >
      <Grid columns={{ initial: '1', md: '2' }} gap="4" mb="6">
        <Card>
          <Heading size="3" mb="3">Customer Details</Heading>
          <QuickDataList
            data={[
              { label: 'Email', value: customer.defaultEmail, linkTo: `mailto:${customer.defaultEmail}` },
              { label: 'Name', value: fullName !== '—' ? fullName : undefined },
              { label: 'Phone', value: customer.defaultPhoneNumber },
              { label: 'Shop', value: customer.shop },
              { label: 'Shopify Customer ID', value: customer.platformCustomerId, as: 'code' },
              { label: 'Notes', value: customer.notes },
              { label: 'Created', value: dateFormatter(customer.createdAt) },
              { label: 'Updated', value: dateFormatter(customer.updatedAt) },
            ]}
          />
        </Card>

        <Card>
          <Heading size="3" mb="3">Summary</Heading>
          <QuickDataList
            data={[
              { label: 'Memberships', value: customer.Membership.length.toString() },
              { label: 'Active', value: customer.Membership.filter((m) => m.status === 'ACTIVE').length.toString() },
              { label: 'Paused', value: customer.Membership.filter((m) => m.status === 'PAUSED').length.toString() },
              { label: 'Left', value: customer.Membership.filter((m) => m.status === 'LEFT').length.toString() },
              {
                label: 'Bundle Subscriptions',
                value: customer.Membership.filter((m) => m.bundleSubscription).length.toString(),
              },
              { label: 'Release Orders', value: releaseOrders.length.toString() },
            ]}
          />
        </Card>
      </Grid>

      <Box mb="6">
        <Heading size="4" mb="3">Memberships ({customer.Membership.length})</Heading>
        {memberships.length > 0 ? (
          <DataTable headers={membershipHeaders} data={memberships} />
        ) : (
          <Text color="gray" size="2">No memberships.</Text>
        )}
      </Box>

      <Box mb="6">
        <Heading size="4" mb="3">Release Orders ({releaseOrderRows.length})</Heading>
        {releaseOrderRows.length > 0 ? (
          <DataTable headers={releaseOrderHeaders} data={releaseOrderRows} />
        ) : (
          <Text color="gray" size="2">No release orders.</Text>
        )}
      </Box>

      {billingRows.length > 0 && (
        <Box mb="6">
          <Heading size="4" mb="3">Membership Billing ({billingRows.length})</Heading>
          <DataTable headers={billingHeaders} data={billingRows} />
        </Box>
      )}

      {activity.length > 0 && (
        <Box mb="6">
          <Heading size="4" mb="3">Activity ({activity.length})</Heading>
          <DataTable headers={activityHeaders} data={activity} />
        </Box>
      )}

      {emailLogs.length > 0 && (
        <Box>
          <Heading size="4" mb="3">Email Log ({emailLogs.length})</Heading>
          <DataTable headers={emailHeaders} data={emailLogs} />
        </Box>
      )}
    </PageLayout>
  );
}
