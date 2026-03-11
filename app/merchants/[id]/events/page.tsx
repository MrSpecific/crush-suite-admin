// import { Proposal as ProposalType } from '@prisma/client';
import { prisma, QueryMode } from '@/lib/prisma';
import { Box, Card, Flex, Grid, Heading, Text } from '@radix-ui/themes';
import { Link } from '@/app/components/Link';
import { NotFound } from '@/app/components/NotFound';
import { PageLayout } from '@/app/components/PageLayout';
import { DataFilter } from '@/app/components/DataFilter';
import { DataTable } from '@/app/components/DataTable';
import { EditDialog } from '@/app/components/EditDialog';
import { Pagination } from '@/app/components/Pagination';
import { QuickDataList } from '@/app/components/QuickDataList';
import { ComplianceMap, type StateRecord } from '@/app/components/ComplianceMap';
import { queryPagination } from '@/lib/queryPagination';
import {
  dateFormatter,
  dateTimeFormatter,
  currencyFormatter,
  linkFormatter,
  noNullsFormatter,
} from '@/lib/formatters';

export default async function Page({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: PageSearchParams;
}) {
  const { id } = params;
  const { page, search } = searchParams;
  const where = {
    merchantId: parseInt(id),
  };
  const eventTotalCount = await prisma.precomplianceEvent.count({ where });
  const eventCounts = await prisma.precomplianceEvent.groupBy({
    by: ['eventType'],
    where,
    _count: {
      id: true, // Count the number of posts in each group
    },
  });

  const events = await prisma.precomplianceEvent.findMany({
    where,
    orderBy: {
      createdAt: 'desc',
    },
    take: 100,
  });

  const data = await prisma.merchant.findUnique({
    where: {
      id: parseInt(id),
    },
    include: {
      billingPlan: true,
    },
  });

  if (!id || !data) return <NotFound message="Merchant Not Found" />;

  const { shop, compliancePartner, compliancePartnerAccountName, status, platformEmail } = data;

  return (
    <PageLayout heading={compliancePartnerAccountName ?? shop}>
      <Grid columns={{ initial: '1', md: '2' }} gap="4">
        <Box>
          <QuickDataList
            data={[
              { label: 'Shop', value: shop, linkTo: `//${shop}` },
              { label: 'Compliance Partner', value: compliancePartner },
              { label: 'Status', value: status, badge: true },
              { label: 'Admin Email', value: platformEmail, linkTo: `mailto:${platformEmail}` },
            ]}
          />
        </Box>
      </Grid>

      <Card my="4">
        <Heading mb="2">Stats</Heading>
        <QuickDataList
          data={[
            { label: 'Total Events', value: eventTotalCount.toString() },
            ...eventCounts.map((event) => ({
              label: event.eventType,
              value: `${event._count.id.toString()} (${((event._count.id / eventTotalCount) * 100).toFixed(2)}%)`,
            })),
          ]}
        />
        {/* {JSON.stringify(eventCounts)} */}
      </Card>
      <MerchantEvents events={events} />
    </PageLayout>
  );
}

const MerchantEvents = ({ events }: { events: any }) => {
  return (
    <Box>
      <Heading mb="2">Events</Heading>
      <DataTable
        headers={[
          { type: 'data', title: 'Data' },
          { id: 'sessionId', title: 'Session ID' },
          { id: 'eventType', title: 'Type' },
          // { id: 'shop', title: 'Shop' },
          { id: 'createdAt', title: 'Created At', formatter: dateTimeFormatter },
          // { id: 'updatedAt', title: 'Updated At', formatter: dateFormatter },
          { id: 'failedReason', title: 'Failed Reason', formatter: noNullsFormatter },
        ]}
        data={events}
      />
    </Box>
  );
};
