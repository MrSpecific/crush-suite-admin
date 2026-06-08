import { prismaClubs } from '@/lib/prisma-clubs';
import { PageLayout } from '@/app/components/PageLayout';
import { QuickDataList } from '@/app/components/QuickDataList';
import { DataTable } from '@/app/components/DataTable';
import { NotFound } from '@/app/components/NotFound';
import { Badge, Box, Card, Flex, Grid, Heading, Text } from '@radix-ui/themes';
import { clubStatusFormatter, clubTypeFormatter, dateFormatter } from '@/lib/formatters';
import { ButtonLink } from '@/app/components/ButtonLink';
import type { RadixColor } from '@/types/radix-ui';

const releaseStatusColor: Record<string, RadixColor> = {
  draft: 'gray',
  published: 'green',
};

const membershipStatusColor: Record<string, RadixColor> = {
  ACTIVE: 'green',
  PAUSED: 'yellow',
  LEFT: 'gray',
  PENDING_MIGRATION: 'orange',
};

export default async function Page({
  params,
}: {
  params: { merchantId: string; clubId: string };
}) {
  const merchantId = parseInt(params.merchantId);
  const { clubId } = params;

  if (isNaN(merchantId)) return <NotFound message="Club not found" />;

  const club = await prismaClubs.club.findUnique({
    where: { id: clubId },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      name: true,
      description: true,
      status: true,
      clubType: true,
      releaseType: true,
      timezone: true,
      platformHandle: true,
      platformProductId: true,
      platformCustomerTag: true,
      membershipPrice: true,
      membershipRenewalFrequency: true,
      estimatedReleaseFrequency: true,
      estimatedReleaseUnit: true,
      currencyCode: true,
      market: true,
      allowSkipRelease: true,
      addComplianceProducts: true,
      nextMemberNumber: true,
      merchantId: true,
      merchant: {
        select: { shop: true, platformShopName: true },
      },
      Release: {
        orderBy: { releaseDate: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          status: true,
          publishDate: true,
          releaseDate: true,
          customizationDeadline: true,
        },
      },
      Membership: {
        select: { status: true },
      },
      BundleType: {
        orderBy: { orderPriority: 'asc' },
        select: {
          id: true,
          name: true,
          mode: true,
          status: true,
          minItems: true,
          maxItems: true,
          createdAt: true,
          _count: { select: { subscriptions: true, products: true } },
        },
      },
    },
  });

  if (!club || club.merchantId !== merchantId) return <NotFound message="Club not found" />;

  const membershipCounts = club.Membership.reduce<Record<string, number>>((acc, m) => {
    acc[m.status] = (acc[m.status] ?? 0) + 1;
    return acc;
  }, {});

  const isBundleClub = club.clubType === 'bundle_subscription';

  const subscriptionStatusGroups = isBundleClub
    ? await prismaClubs.bundleSubscription.groupBy({
        by: ['status'],
        where: { bundleType: { clubId } },
        _count: { _all: true },
      })
    : [];

  const subscriptionCounts = subscriptionStatusGroups.reduce<Record<string, number>>((acc, g) => {
    acc[g.status] = g._count._all;
    return acc;
  }, {});

  const totalSubscriptions = subscriptionStatusGroups.reduce((sum, g) => sum + g._count._all, 0);

  const releaseBasePath = `/clubs/merchants/${merchantId}/clubs/${clubId}/releases`;

  const ReleaseActions = ({ id }: { id: string }) => (
    <ButtonLink href={`${releaseBasePath}/${id}`}>View</ButtonLink>
  );

  const releaseHeaders = [
    { id: 'name', title: 'Name' },
    {
      id: 'status',
      title: 'Status',
      formatter: (value: string) => (
        <Badge color={releaseStatusColor[value] ?? 'gray'}>{value}</Badge>
      ),
    },
    { id: 'releaseDate', title: 'Release Date', formatter: dateFormatter },
    { id: 'publishDate', title: 'Opens', formatter: dateFormatter },
    { id: 'customizationDeadline', title: 'Closes', formatter: dateFormatter },
    { type: 'actions' as const, title: 'Actions' },
  ];

  return (
    <PageLayout
      heading={club.name}
      subheading={club.merchant.platformShopName ?? club.merchant.shop}
      actions={[
        {
          label: 'Back to Merchant',
          href: `/clubs/merchants/${merchantId}`,
          variant: 'soft',
          color: 'gray',
        },
      ]}
    >
      <Grid columns={{ initial: '1', md: '2' }} gap="4" mb="6">
        <Card>
          <Heading size="3" mb="3">
            Club Details
          </Heading>
          <QuickDataList
            data={[
              {
                label: 'Status',
                children: clubStatusFormatter(club.status),
              },
              { label: 'Type', children: clubTypeFormatter(club.clubType) },
              { label: 'Release Type', value: club.releaseType },
              { label: 'Timezone', value: club.timezone.replace(/_/g, '/') },
              { label: 'Handle', value: club.platformHandle },
              { label: 'Shopify Product ID', value: club.platformProductId, as: 'code' },
              { label: 'Customer Tag', value: club.platformCustomerTag, as: 'code' },
              { label: 'Currency', value: club.currencyCode },
              { label: 'Market', value: club.market },
              { label: 'Created', value: dateFormatter(club.createdAt) },
              { label: 'Updated', value: dateFormatter(club.updatedAt) },
            ]}
          />
        </Card>

        <Box>
          <Card mb="4">
            <Heading size="3" mb="3">
              Membership
            </Heading>
            <QuickDataList
              data={[
                { label: 'Total Members', value: club.Membership.length.toString() },
                { label: 'Active', value: (membershipCounts['ACTIVE'] ?? 0).toString() },
                { label: 'Paused', value: (membershipCounts['PAUSED'] ?? 0).toString() },
                { label: 'Left', value: (membershipCounts['LEFT'] ?? 0).toString() },
                {
                  label: 'Pending Migration',
                  value: (membershipCounts['PENDING_MIGRATION'] ?? 0).toString(),
                },
                {
                  label: 'Membership Price',
                  value:
                    club.membershipPrice > 0
                      ? `$${club.membershipPrice.toFixed(2)} / ${club.membershipRenewalFrequency} mo`
                      : 'Free',
                },
                { label: 'Next Member #', value: club.nextMemberNumber.toString() },
              ]}
            />
          </Card>

          <Card>
            <Heading size="3" mb="3">
              Settings
            </Heading>
            <QuickDataList
              data={[
                {
                  label: 'Release Frequency',
                  value: `Every ${club.estimatedReleaseFrequency} ${club.estimatedReleaseUnit}(s)`,
                },
                {
                  label: 'Allow Skip Release',
                  value: club.allowSkipRelease ? 'Yes' : 'No',
                },
                {
                  label: 'Compliance Products',
                  value: club.addComplianceProducts ? 'Enabled' : 'Disabled',
                },
              ]}
            />
          </Card>
        </Box>
      </Grid>

      {club.description && (
        <Card mb="4">
          <Heading size="3" mb="2">
            Description
          </Heading>
          <Text size="2" color="gray">
            {club.description}
          </Text>
        </Card>
      )}

      <Box mb="6">
        <Heading size="4" mb="3">
          Recent Releases
        </Heading>
        {club.Release.length > 0 ? (
          <DataTable headers={releaseHeaders} data={club.Release} Actions={ReleaseActions} />
        ) : (
          <Text color="gray" size="2">
            No releases yet.
          </Text>
        )}
      </Box>

      {isBundleClub && (
        <Card mb="4">
          <Heading size="3" mb="3">
            Bundle Subscriptions
          </Heading>
          <QuickDataList
            data={[
              { label: 'Total', value: totalSubscriptions.toString() },
              { label: 'Active', value: (subscriptionCounts['ACTIVE'] ?? 0).toString() },
              { label: 'Paused', value: (subscriptionCounts['PAUSED'] ?? 0).toString() },
              { label: 'Cancelled', value: (subscriptionCounts['CANCELLED'] ?? 0).toString() },
            ]}
          />
        </Card>
      )}

      {isBundleClub && (
        <Box>
          <Heading size="4" mb="3">
            Bundle Types ({club.BundleType.length})
          </Heading>
          {club.BundleType.length > 0 ? (
            <DataTable
              headers={[
                { id: 'name', title: 'Name' },
                { id: 'mode', title: 'Mode' },
                {
                  id: 'status',
                  title: 'Status',
                  formatter: (v: string) => (
                    <Badge color={v === 'active' ? 'green' : 'gray'} variant="soft">{v}</Badge>
                  ),
                },
                {
                  id: 'minItems',
                  title: 'Items',
                  formatter: (min: number, row: any) => `${min}–${row.maxItems}`,
                },
                {
                  id: '_count',
                  title: 'Products',
                  formatter: (v: { products: number }) => v.products.toString(),
                },
                {
                  id: '_count',
                  title: 'Subscribers',
                  formatter: (v: { subscriptions: number }) => v.subscriptions.toString(),
                },
                { id: 'createdAt', title: 'Created', formatter: dateFormatter },
                { type: 'actions' as const, title: 'Actions' },
              ]}
              data={club.BundleType}
              Actions={({ id }: { id: string }) => (
                <ButtonLink href={`/clubs/merchants/${merchantId}/clubs/${clubId}/bundles/${id}`}>
                  View
                </ButtonLink>
              )}
            />
          ) : (
            <Text color="gray" size="2">No bundle types configured.</Text>
          )}
        </Box>
      )}
    </PageLayout>
  );
}
