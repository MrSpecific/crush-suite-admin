import { prismaClubs } from '@/lib/prisma-clubs';
import { PageLayout } from '@/app/components/PageLayout';
import { QuickDataList, type DataListItem } from '@/app/components/QuickDataList';
import { NotFound } from '@/app/components/NotFound';
import { Badge, Box, Card, Grid, Heading } from '@radix-ui/themes';
import { utcDateTimeFormatter } from '@/lib/formatters';
import { customerEmailTypeMetaData } from '@/lib/metaData';
import { EmailMetadata, failedBadge, getMetadataString, sentBadge } from '@/lib/emailLogs';

const customerName = (c: {
  firstName: string | null;
  lastName: string | null;
  defaultEmail: string | null;
}) => [c.firstName, c.lastName].filter(Boolean).join(' ') || c.defaultEmail || undefined;

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const log = await prismaClubs.customerEmailLog.findUnique({ where: { id } });

  if (!log) return <NotFound message="Email not found" />;

  const clubCustomerId = getMetadataString(log.metadata, 'clubCustomerId');
  const clubId = getMetadataString(log.metadata, 'clubId');
  const membershipId = getMetadataString(log.metadata, 'membershipId');
  const releaseOrderId = getMetadataString(log.metadata, 'releaseOrderId');
  const releaseId = getMetadataString(log.metadata, 'releaseId');

  const customerSelect = { id: true, firstName: true, lastName: true, defaultEmail: true };

  // The worker stamps different ids into metadata per email type — resolve
  // whichever are present, scoped to this shop.
  const [merchant, customer, club, membership, releaseOrder, release] = await Promise.all([
    prismaClubs.merchant.findUnique({
      where: { shop: log.shop },
      select: { id: true, platformShopName: true },
    }),
    clubCustomerId
      ? prismaClubs.clubCustomer.findFirst({
          where: { id: clubCustomerId, shop: log.shop },
          select: customerSelect,
        })
      : null,
    clubId
      ? prismaClubs.club.findFirst({
          where: { id: clubId, merchant: { shop: log.shop } },
          select: { id: true, name: true, merchantId: true },
        })
      : null,
    membershipId
      ? prismaClubs.membership.findFirst({
          where: { id: membershipId, club: { merchant: { shop: log.shop } } },
          select: {
            id: true,
            status: true,
            memberNumber: true,
            customer: { select: customerSelect },
            club: { select: { id: true, name: true, merchantId: true } },
          },
        })
      : null,
    releaseOrderId
      ? prismaClubs.releaseOrder.findFirst({
          where: { id: releaseOrderId, release: { club: { merchant: { shop: log.shop } } } },
          select: {
            id: true,
            platformOrderId: true,
            clubCustomer: { select: customerSelect },
            release: {
              select: {
                id: true,
                name: true,
                club: { select: { id: true, name: true, merchantId: true } },
              },
            },
          },
        })
      : null,
    releaseId
      ? prismaClubs.release.findFirst({
          where: { id: releaseId, club: { merchant: { shop: log.shop } } },
          select: {
            id: true,
            name: true,
            club: { select: { id: true, name: true, merchantId: true } },
          },
        })
      : null,
  ]);

  const resolvedCustomer = customer ?? membership?.customer ?? releaseOrder?.clubCustomer;
  const resolvedRelease = releaseOrder?.release ?? release;
  const resolvedClub = club ?? membership?.club ?? resolvedRelease?.club;
  const clubPath = resolvedClub
    ? `/clubs/merchants/${resolvedClub.merchantId}/clubs/${resolvedClub.id}`
    : undefined;

  const typeMeta = customerEmailTypeMetaData[log.emailType] ?? {
    label: log.emailType,
    color: 'gray',
  };

  const related: DataListItem[] = [
    {
      label: 'Member',
      value: resolvedCustomer ? customerName(resolvedCustomer) : undefined,
      linkTo: resolvedCustomer ? `/clubs/members/${resolvedCustomer.id}` : undefined,
    },
    {
      label: 'Club',
      value: resolvedClub?.name ?? getMetadataString(log.metadata, 'clubName'),
      linkTo: clubPath,
    },
    {
      label: 'Membership',
      value: membership
        ? [membership.memberNumber && `#${membership.memberNumber}`, membership.status]
            .filter(Boolean)
            .join(' · ')
        : undefined,
    },
    {
      label: 'Release',
      value: resolvedRelease?.name ?? getMetadataString(log.metadata, 'releaseName'),
      linkTo:
        clubPath && resolvedRelease ? `${clubPath}/releases/${resolvedRelease.id}` : undefined,
    },
    {
      label: 'Release Order',
      value: releaseOrder ? (releaseOrder.platformOrderId ?? releaseOrder.id) : undefined,
      linkTo:
        clubPath && releaseOrder
          ? `${clubPath}/releases/${releaseOrder.release.id}/orders/${releaseOrder.id}`
          : undefined,
    },
  ];

  return (
    <PageLayout
      heading={typeMeta.label}
      subheading={`Customer email to ${log.sentTo}`}
      actions={[
        {
          label: 'All Customer Emails',
          href: '/clubs/logs/customer-emails',
          variant: 'soft',
          color: 'gray',
        },
      ]}
    >
      <Grid columns={{ initial: '1', md: '2' }} gap="4">
        <Card>
          <Heading size="3" mb="3">
            Email Details
          </Heading>
          <QuickDataList
            data={[
              {
                label: 'Type',
                children: (
                  <Badge color={typeMeta.color} variant="soft">
                    {typeMeta.label}
                  </Badge>
                ),
              },
              { label: 'Status', children: log.success ? sentBadge : failedBadge(log.retryable) },
              { label: 'Sent To', value: log.sentTo, linkTo: `mailto:${log.sentTo}` },
              {
                label: 'Shop',
                value: merchant?.platformShopName
                  ? `${merchant.platformShopName} (${log.shop})`
                  : log.shop,
                linkTo: merchant ? `/clubs/merchants/${merchant.id}` : undefined,
              },
              { label: 'First Sent', value: utcDateTimeFormatter(log.createdAt) },
              { label: 'Last Sent', value: utcDateTimeFormatter(log.lastSentAt) },
              { label: 'Send Count', value: log.sendCount.toString() },
              {
                label: 'Retryable',
                value: log.retryable == null ? undefined : log.retryable ? 'Yes' : 'No',
              },
              { label: 'Error', value: log.error, color: 'red' },
              { label: 'Dedup Key', value: log.dedupKey, as: 'code', clipboard: true },
              { label: 'ID', value: log.id, as: 'code', clipboard: true },
            ]}
          />
        </Card>

        <Box>
          <Card mb="4">
            <Heading size="3" mb="3">
              Related
            </Heading>
            <QuickDataList data={related} />
          </Card>

          <Card>
            <Heading size="3" mb="3">
              Metadata
            </Heading>
            <EmailMetadata metadata={log.metadata} />
          </Card>
        </Box>
      </Grid>
    </PageLayout>
  );
}
