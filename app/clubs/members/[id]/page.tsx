import { prismaClubs } from '@/lib/prisma-clubs';
import { PageLayout } from '@/app/components/PageLayout';
import { QuickDataList } from '@/app/components/QuickDataList';
import { DataTable } from '@/app/components/DataTable';
import { NotFound } from '@/app/components/NotFound';
import { Badge, Box, Card, Grid, Heading, Text } from '@radix-ui/themes';
import { dateFormatter } from '@/lib/formatters';
import { ButtonLink } from '@/app/components/ButtonLink';
import type { RadixColor } from '@/types/radix-ui';

const membershipStatusColor: Record<string, RadixColor> = {
  ACTIVE: 'green',
  PAUSED: 'yellow',
  LEFT: 'gray',
  PENDING_MIGRATION: 'orange',
};

const MembershipActions = ({ clubId, merchantId }: { clubId: string; merchantId: number }) => (
  <ButtonLink href={`/clubs/merchants/${merchantId}/clubs/${clubId}`}>View Club</ButtonLink>
);

export default async function Page({ params }: { params: { id: string } }) {
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
              merchantId: true,
              merchant: { select: { platformShopName: true, shop: true } },
            },
          },
        },
      },
    },
  });

  if (!customer) return <NotFound message="Member not found" />;

  const membershipHeaders = [
    {
      id: 'club',
      title: 'Club',
      formatter: (value: { name: string }) => value.name,
    },
    {
      id: 'club',
      title: 'Merchant',
      formatter: (value: { merchant: { platformShopName: string | null; shop: string } }) =>
        value.merchant.platformShopName ?? value.merchant.shop,
    },
    { id: 'memberNumber', title: 'Member #', formatter: (v: string | null) => v ?? '—' },
    {
      id: 'status',
      title: 'Status',
      formatter: (value: string) => (
        <Badge color={membershipStatusColor[value] ?? 'gray'} variant="soft">
          {value}
        </Badge>
      ),
    },
    { id: 'joinedAt', title: 'Joined', formatter: dateFormatter },
    { id: 'leftAt', title: 'Left', formatter: (v: Date | null) => (v ? dateFormatter(v) : '—') },
    { type: 'actions' as const, title: 'Actions' },
  ];

  const memberships = customer.Membership.map((m) => ({ ...m, merchantId: m.club.merchantId }));

  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || '—';

  return (
    <PageLayout
      heading={fullName !== '—' ? fullName : customer.defaultEmail}
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
          <Heading size="3" mb="3">Membership Summary</Heading>
          <QuickDataList
            data={[
              { label: 'Total', value: customer.Membership.length.toString() },
              { label: 'Active', value: customer.Membership.filter(m => m.status === 'ACTIVE').length.toString() },
              { label: 'Paused', value: customer.Membership.filter(m => m.status === 'PAUSED').length.toString() },
              { label: 'Left', value: customer.Membership.filter(m => m.status === 'LEFT').length.toString() },
            ]}
          />
        </Card>
      </Grid>

      <Box>
        <Heading size="4" mb="3">Memberships</Heading>
        {customer.Membership.length > 0 ? (
          <DataTable
            headers={membershipHeaders}
            data={memberships}
            Actions={MembershipActions}
          />
        ) : (
          <Text color="gray" size="2">No memberships.</Text>
        )}
      </Box>
    </PageLayout>
  );
}
