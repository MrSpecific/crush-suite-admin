import { prismaClubs } from '@/lib/prisma-clubs';
import { PageLayout } from '@/app/components/PageLayout';
import { QuickDataList } from '@/app/components/QuickDataList';
import { DataTable } from '@/app/components/DataTable';
import { NotFound } from '@/app/components/NotFound';
import { Badge, Box, Card, Flex, Grid, Heading, Text } from '@radix-ui/themes';
import { clubStatusFormatter, clubTypeFormatter, dateFormatter, dateTimeFormatter } from '@/lib/formatters';
import { ButtonLink } from '@/app/components/ButtonLink';
import { clubsMerchantStatusMetaData, merchantEmailTypeMetaData } from '@/lib/metaData';

const ClubActions = ({ id, merchantId }: { id: string; merchantId: number }) => (
  <ButtonLink href={`/clubs/merchants/${merchantId}/clubs/${id}`}>View</ButtonLink>
);

export default async function Page(props: { params: Promise<{ merchantId: string }> }) {
  const params = await props.params;
  const merchantId = parseInt(params.merchantId);

  if (isNaN(merchantId)) return <NotFound message="Merchant not found" />;

  const merchant = await prismaClubs.merchant.findUnique({
    where: { id: merchantId },
    select: {
      id: true,
      shop: true,
      status: true,
      platformEmail: true,
      platformShopName: true,
      platformPhone: true,
      platformTimezone: true,
      platformStateCode: true,
      createdAt: true,
      updatedAt: true,
      AppBillingPlan: {
        select: { id: true, name: true, price: true, type: true },
      },
      Club: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          merchantId: true,
          name: true,
          status: true,
          clubType: true,
          membershipPrice: true,
          createdAt: true,
        },
      },
    },
  });

  if (!merchant) return <NotFound message="Merchant not found" />;

  const emailLogs = await prismaClubs.merchantEmailLog.findMany({
    where: { shop: merchant.shop },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { id: true, emailType: true, sentTo: true, success: true, error: true, createdAt: true },
  });

  const statusMeta = clubsMerchantStatusMetaData[merchant.status] ?? { label: merchant.status, color: 'gray' };

  const clubHeaders = [
    { id: 'name', title: 'Name' },
    {
      id: 'status',
      title: 'Status',
      formatter: clubStatusFormatter,
    },
    { id: 'clubType', title: 'Type', formatter: clubTypeFormatter },
    {
      id: 'membershipPrice',
      title: 'Membership Price',
      formatter: (value: number) => (value ? `$${value.toFixed(2)}` : '—'),
    },
    { id: 'createdAt', title: 'Created', formatter: dateFormatter },
    { type: 'actions' as const, title: 'Actions' },
  ];

  return (
    <PageLayout heading={merchant.platformShopName ?? merchant.shop}>
      <Grid columns={{ initial: '1', md: '2' }} gap="4" mb="6">
        <Card>
          <Heading size="3" mb="3">
            Merchant Details
          </Heading>
          <QuickDataList
            data={[
              { label: 'Shop', value: merchant.shop, linkTo: `//${merchant.shop}`, target: '_blank' },
              { label: 'Store Name', value: merchant.platformShopName },
              { label: 'Email', value: merchant.platformEmail, linkTo: `mailto:${merchant.platformEmail}` },
              { label: 'Phone', value: merchant.platformPhone },
              { label: 'Timezone', value: merchant.platformTimezone },
              { label: 'State', value: merchant.platformStateCode },
              {
                label: 'Status',
                children: <Badge color={statusMeta.color}>{statusMeta.label}</Badge>,
              },
              { label: 'Billing Plan', value: merchant.AppBillingPlan?.name },
              { label: 'Plan Price', value: merchant.AppBillingPlan?.price != null ? `$${merchant.AppBillingPlan.price.toFixed(2)} / mo` : undefined },
              { label: 'Created', value: dateFormatter(merchant.createdAt) },
              { label: 'Updated', value: dateFormatter(merchant.updatedAt) },
            ]}
          />
        </Card>

        <Card>
          <Heading size="3" mb="3">
            Clubs Summary
          </Heading>
          <QuickDataList
            data={[
              { label: 'Total Clubs', value: merchant.Club.length.toString() },
              {
                label: 'Published',
                value: merchant.Club.filter((c) => c.status === 'published').length.toString(),
              },
              {
                label: 'Draft',
                value: merchant.Club.filter((c) => c.status === 'draft').length.toString(),
              },
              {
                label: 'Archived',
                value: merchant.Club.filter((c) => c.status === 'archived').length.toString(),
              },
            ]}
          />
        </Card>
      </Grid>

      <Box mb="6">
        <Flex justify="between" align="center" mb="3">
          <Heading size="4">Clubs</Heading>
        </Flex>
        <DataTable headers={clubHeaders} data={merchant.Club} Actions={ClubActions} />
      </Box>

      <Box>
        <Heading size="4" mb="3">Recent Merchant Emails</Heading>
        {emailLogs.length > 0 ? (
          <DataTable
            headers={[
              {
                id: 'emailType',
                title: 'Type',
                formatter: (v: string) => {
                  const meta = merchantEmailTypeMetaData[v as keyof typeof merchantEmailTypeMetaData] ?? { label: v, color: 'gray' };
                  return <Badge color={meta.color} variant="soft" size="1">{meta.label}</Badge>;
                },
              },
              { id: 'sentTo', title: 'Sent To' },
              {
                id: 'success',
                title: 'Status',
                formatter: (v: boolean) => (
                  <Badge color={v ? 'green' : 'red'} variant="soft" size="1">
                    {v ? 'Sent' : 'Failed'}
                  </Badge>
                ),
              },
              {
                id: 'error',
                title: 'Error',
                formatter: (v: string | null) => v ?? '—',
              },
              { id: 'createdAt', title: 'Sent At', formatter: dateTimeFormatter },
            ]}
            data={emailLogs}
          />
        ) : (
          <Text color="gray" size="2">No email logs for this merchant.</Text>
        )}
      </Box>
    </PageLayout>
  );
}
