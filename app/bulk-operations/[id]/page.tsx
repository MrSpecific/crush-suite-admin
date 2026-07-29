import { prisma } from '@/lib/prisma';
import { PageLayout } from '@/app/components/PageLayout';
import { QuickDataList } from '@/app/components/QuickDataList';
import { NotFound } from '@/app/components/NotFound';
import { Badge, Card, Grid, Heading } from '@radix-ui/themes';
import { dateTimeFormatter } from '@/lib/formatters';
import type { RadixColor } from '@/types/radix-ui';

const getOperationStatus = (op: {
  completedAt: Date | null;
  processedAt: Date | null;
  startedAt: Date | null;
}): { label: string; color: RadixColor } => {
  if (op.processedAt) return { label: 'Processed', color: 'green' };
  if (op.completedAt) return { label: 'Completed', color: 'blue' };
  if (op.startedAt) return { label: 'Running', color: 'orange' };
  return { label: 'Pending', color: 'gray' };
};

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const operation = await prisma.merchantBulkOperation.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      startedAt: true,
      completedAt: true,
      processedAt: true,
      shop: true,
      type: true,
      platformId: true,
      merchantId: true,
      merchant: {
        select: {
          compliancePartnerAccountName: true,
          platformEmail: true,
        },
      },
    },
  });

  if (!operation) return <NotFound message="Bulk operation not found" />;

  const status = getOperationStatus(operation);

  return (
    <PageLayout
      heading={`${operation.type} Bulk Operation`}
      subheading={operation.merchant.compliancePartnerAccountName ?? operation.shop}
      actions={[
        { label: 'Back to Bulk Operations', href: '/bulk-operations', variant: 'soft', color: 'gray' },
        { label: 'View Merchant', href: `/merchants/${operation.merchantId}`, variant: 'soft' },
      ]}
    >
      <Grid columns={{ initial: '1', md: '2' }} gap="4">
        <Card>
          <Heading size="3" mb="3">Operation Details</Heading>
          <QuickDataList
            data={[
              {
                label: 'Status',
                children: (
                  <Badge color={status.color} variant="soft">{status.label}</Badge>
                ),
              },
              { label: 'Type', value: operation.type },
              { label: 'Shop', value: operation.shop },
              { label: 'Platform ID', value: operation.platformId, as: 'code' },
              { label: 'Operation ID', value: operation.id, as: 'code' },
            ]}
          />
        </Card>

        <Card>
          <Heading size="3" mb="3">Timeline</Heading>
          <QuickDataList
            data={[
              { label: 'Created', value: dateTimeFormatter(operation.createdAt) },
              { label: 'Started', value: operation.startedAt ? dateTimeFormatter(operation.startedAt) : undefined },
              { label: 'Completed', value: operation.completedAt ? dateTimeFormatter(operation.completedAt) : undefined },
              { label: 'Processed', value: operation.processedAt ? dateTimeFormatter(operation.processedAt) : undefined },
              { label: 'Last Updated', value: dateTimeFormatter(operation.updatedAt) },
            ]}
          />
        </Card>
      </Grid>
    </PageLayout>
  );
}
