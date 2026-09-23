import { prismaClubs } from '@/lib/prisma-clubs';
import { PageLayout } from '@/app/components/PageLayout';
import { QuickDataList } from '@/app/components/QuickDataList';
import { NotFound } from '@/app/components/NotFound';
import { Badge, Card, Grid, Heading } from '@radix-ui/themes';
import { utcDateTimeFormatter } from '@/lib/formatters';
import { merchantEmailTypeMetaData } from '@/lib/metaData';
import { EmailMetadata, failedBadge, sentBadge } from '@/lib/emailLogs';

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const log = await prismaClubs.merchantEmailLog.findUnique({ where: { id } });

  if (!log) return <NotFound message="Email not found" />;

  const merchant = await prismaClubs.merchant.findUnique({
    where: { shop: log.shop },
    select: { id: true, platformShopName: true },
  });

  const typeMeta = merchantEmailTypeMetaData[log.emailType] ?? {
    label: log.emailType,
    color: 'gray',
  };

  return (
    <PageLayout
      heading={typeMeta.label}
      subheading={`Merchant email to ${log.sentTo}`}
      actions={[
        {
          label: 'All Merchant Emails',
          href: '/clubs/logs/merchant-emails',
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
              { label: 'Sent At', value: utcDateTimeFormatter(log.createdAt) },
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

        <Card>
          <Heading size="3" mb="3">
            Metadata
          </Heading>
          <EmailMetadata metadata={log.metadata} />
        </Card>
      </Grid>
    </PageLayout>
  );
}
