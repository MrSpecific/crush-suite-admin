import { prismaClubs } from '@/lib/prisma-clubs';
import { PageLayout } from '@/app/components/PageLayout';
import { QuickDataList } from '@/app/components/QuickDataList';
import { DataTable } from '@/app/components/DataTable';
import { Pagination } from '@/app/components/Pagination';
import { NotFound } from '@/app/components/NotFound';
import { Badge, Box, Card, Grid, Heading, Text } from '@radix-ui/themes';
import { dateFormatter, dateTimeFormatter } from '@/lib/formatters';
import { queryPagination } from '@/lib/queryPagination';
import type { RadixColor } from '@/types/radix-ui';

const migrationStatusColor: Record<string, RadixColor> = {
  PENDING: 'gray',
  VALIDATING: 'blue',
  RESOLVING_CUSTOMERS: 'blue',
  CREATING_MEMBERSHIPS: 'blue',
  RESOLVING_PAYMENTS: 'blue',
  COLLECTING_PAYMENTS: 'blue',
  COMPLETED: 'green',
  FAILED: 'red',
  CANCELLED: 'orange',
};

const recordStatusColor: Record<string, RadixColor> = {
  PENDING: 'gray',
  CUSTOMER_RESOLVED: 'blue',
  MEMBERSHIP_CREATED: 'blue',
  PAYMENT_RESOLVED: 'teal',
  COMPLETED: 'green',
  ERROR: 'red',
  SKIPPED: 'orange',
};

export default async function Page({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: PageSearchParams;
}) {
  const { page } = searchParams;
  const recordCount = await prismaClubs.clubMigrationRecord.count({
    where: { migrationId: params.id },
  });

  const migration = await prismaClubs.clubMigration.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      shop: true,
      status: true,
      totalRecords: true,
      resolvedCount: true,
      membershipCreatedCount: true,
      paymentResolvedCount: true,
      contractCreatedCount: true,
      errorCount: true,
      contractStrategy: true,
      gatewayType: true,
      gracePeriodDays: true,
      sendWelcomeEmails: true,
      filename: true,
      workerJobId: true,
      completedAt: true,
      error: true,
      club: { select: { id: true, name: true, merchantId: true } },
    },
  });

  if (!migration) return <NotFound message="Migration not found" />;

  const records = await prismaClubs.clubMigrationRecord.findMany({
    ...queryPagination({ page, count: recordCount }),
    where: { migrationId: params.id },
    orderBy: { rowNumber: 'asc' },
    select: {
      id: true,
      rowNumber: true,
      email: true,
      firstName: true,
      lastName: true,
      status: true,
      error: true,
      errorPhase: true,
      membershipId: true,
      contractCreated: true,
      welcomeEmailSent: true,
    },
  });

  const pctComplete =
    migration.totalRecords > 0
      ? Math.round((migration.resolvedCount / migration.totalRecords) * 100)
      : 0;

  const recordHeaders = [
    { id: 'rowNumber', title: '#' },
    { id: 'email', title: 'Email' },
    {
      id: 'firstName',
      title: 'Name',
      formatter: (_: string, row: any) =>
        [row.firstName, row.lastName].filter(Boolean).join(' ') || '—',
    },
    {
      id: 'status',
      title: 'Status',
      formatter: (value: string) => (
        <Badge color={recordStatusColor[value] ?? 'gray'} variant="soft" size="1">
          {value.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      id: 'contractCreated',
      title: 'Contract',
      formatter: (v: boolean) => (v ? <Badge color="green" variant="soft" size="1">Created</Badge> : '—'),
    },
    {
      id: 'error',
      title: 'Error',
      formatter: (v: string | null, row: any) =>
        v ? (
          <Text size="1" color="red" title={v}>
            {row.errorPhase ? `[${row.errorPhase}] ` : ''}{v.slice(0, 60)}{v.length > 60 ? '…' : ''}
          </Text>
        ) : '—',
    },
  ];

  return (
    <PageLayout
      heading={`Migration: ${migration.shop}`}
      subheading={migration.club ? migration.club.name : undefined}
      actions={[
        { label: 'Back to Migrations', href: '/clubs/migrations', variant: 'soft', color: 'gray' },
        ...(migration.club
          ? [{
              label: 'View Club',
              href: `/clubs/merchants/${migration.club.merchantId}/clubs/${migration.club.id}`,
              variant: 'soft' as const,
            }]
          : []),
      ]}
    >
      <Grid columns={{ initial: '1', md: '2' }} gap="4" mb="6">
        <Card>
          <Heading size="3" mb="3">Migration Details</Heading>
          <QuickDataList
            data={[
              {
                label: 'Status',
                children: (
                  <Badge color={migrationStatusColor[migration.status] ?? 'gray'}>
                    {migration.status}
                  </Badge>
                ),
              },
              { label: 'Shop', value: migration.shop },
              { label: 'File', value: migration.filename },
              { label: 'Worker Job', value: migration.workerJobId, as: 'code' },
              { label: 'Started', value: dateFormatter(migration.createdAt) },
              {
                label: 'Completed',
                value: migration.completedAt ? dateTimeFormatter(migration.completedAt) : undefined,
              },
            ]}
          />
          {migration.error && (
            <Box mt="3" p="2" style={{ backgroundColor: 'var(--red-2)', borderRadius: 'var(--radius-2)' }}>
              <Text size="1" color="red" weight="bold">Error</Text>
              <Text as="p" size="1" color="red" mt="1">{migration.error}</Text>
            </Box>
          )}
        </Card>

        <Box>
          <Card mb="4">
            <Heading size="3" mb="3">Progress</Heading>
            <QuickDataList
              data={[
                { label: 'Total Records', value: migration.totalRecords.toString() },
                { label: 'Resolved', value: `${migration.resolvedCount} (${pctComplete}%)` },
                { label: 'Memberships Created', value: migration.membershipCreatedCount.toString() },
                { label: 'Payments Resolved', value: migration.paymentResolvedCount.toString() },
                { label: 'Contracts Created', value: migration.contractCreatedCount.toString() },
                {
                  label: 'Errors',
                  children: migration.errorCount > 0
                    ? <Badge color="red" variant="soft">{migration.errorCount}</Badge>
                    : <Text size="2">0</Text>,
                },
              ]}
            />
          </Card>

          <Card>
            <Heading size="3" mb="3">Configuration</Heading>
            <QuickDataList
              data={[
                { label: 'Contract Strategy', value: migration.contractStrategy },
                { label: 'Gateway Type', value: migration.gatewayType },
                {
                  label: 'Grace Period',
                  value: migration.gracePeriodDays > 0
                    ? `${migration.gracePeriodDays} days`
                    : 'None',
                },
                { label: 'Welcome Emails', value: migration.sendWelcomeEmails ? 'Yes' : 'No' },
              ]}
            />
          </Card>
        </Box>
      </Grid>

      <Box>
        <Heading size="4" mb="3">Records ({recordCount})</Heading>
        <DataTable headers={recordHeaders} data={records} />
        <Pagination count={recordCount} />
      </Box>
    </PageLayout>
  );
}
