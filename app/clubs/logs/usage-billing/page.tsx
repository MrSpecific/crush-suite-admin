import { prismaClubs } from '@/lib/prisma-clubs';
import { PageLayout } from '@/app/components/PageLayout';
import { DataTable } from '@/app/components/DataTable';
import { Pagination } from '@/app/components/Pagination';
import { DataFilter, type SelectDataFilter } from '@/app/components/DataFilter';
import { queryPagination } from '@/lib/queryPagination';
import { dateTimeFormatter, linkToClubMerchantFormatter } from '@/lib/formatters';
import { usageBillingSourceMetaData, usageBillingStatusMetaData } from '@/lib/metaData';
import { Badge, Text } from '@radix-ui/themes';
import { Prisma } from '@/generated/prisma/clubs';

const money = (value: number | null | undefined, currency?: string | null) =>
  value != null
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: currency ?? 'USD' }).format(value)
    : '—';

export default async function Page(props: { searchParams: Promise<PageSearchParams> }) {
  const searchParams = await props.searchParams;
  const { page, search, status, source } = searchParams;
  const where = getWhere(search?.toString(), status?.toString(), source?.toString());
  const count = await prismaClubs.usageBillingRecord.count({ where });
  const records = await prismaClubs.usageBillingRecord.findMany({
    ...queryPagination({ page, count }),
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      createdAt: true,
      shop: true,
      merchantId: true,
      source: true,
      status: true,
      platformOrderId: true,
      orderValue: true,
      currencyCode: true,
      reportedValue: true,
      attemptCount: true,
      acceptedAt: true,
      replayed: true,
      lastError: true,
      club: { select: { name: true } },
    },
  });

  const filters: SelectDataFilter[] = [
    {
      label: 'Status',
      name: 'status',
      options: Object.entries(usageBillingStatusMetaData).map(([value, meta]) => ({
        label: meta.label,
        value,
      })),
    },
    {
      label: 'Source',
      name: 'source',
      options: Object.entries(usageBillingSourceMetaData).map(([value, meta]) => ({
        label: meta.label,
        value,
      })),
    },
  ];

  const headers = [
    { id: 'createdAt', title: 'Enqueued', formatter: dateTimeFormatter },
    { id: 'shop', title: 'Shop', formatter: linkToClubMerchantFormatter },
    {
      id: 'source',
      title: 'Source',
      formatter: (value: string) => {
        const meta = usageBillingSourceMetaData[value as keyof typeof usageBillingSourceMetaData];
        return (
          <Badge color={meta?.color ?? 'gray'} variant="soft">
            {meta?.label ?? value}
          </Badge>
        );
      },
    },
    {
      id: 'club',
      title: 'Club',
      formatter: (value: { name: string } | null) => value?.name ?? '—',
    },
    { id: 'platformOrderId', title: 'Order ID', as: 'code' as const },
    {
      id: 'orderValue',
      title: 'Order Value',
      formatter: (value: number | null, row: any) => money(value, row.currencyCode),
    },
    { id: 'reportedValue', title: 'Reported ($)', formatter: (value: number | null) => (value != null ? value : '—') },
    {
      id: 'status',
      title: 'Status',
      formatter: (value: string) => {
        const meta = usageBillingStatusMetaData[value as keyof typeof usageBillingStatusMetaData];
        return (
          <Badge color={meta?.color ?? 'gray'} variant="soft">
            {meta?.label ?? value}
          </Badge>
        );
      },
    },
    { id: 'attemptCount', title: 'Attempts' },
    {
      id: 'lastError',
      title: 'Last Error',
      formatter: (value: string | null) =>
        value ? (
          <Text size="1" color="red" title={value}>
            {value.slice(0, 50)}
            {value.length > 50 ? '…' : ''}
          </Text>
        ) : (
          '—'
        ),
    },
    {
      id: 'acceptedAt',
      title: 'Accepted',
      formatter: (value: Date | null) => (value ? dateTimeFormatter(value) : '—'),
    },
  ];

  return (
    <PageLayout
      heading="Usage Billing"
      subheading="Platform usage fees charged to merchants via Shopify App Events"
    >
      <DataFilter filters={filters} />
      <DataTable headers={headers} data={records} />
      <Pagination count={count} />
    </PageLayout>
  );
}

const getWhere = (
  search?: string,
  status?: string,
  source?: string
): Prisma.UsageBillingRecordWhereInput | undefined => {
  const conditions: Prisma.UsageBillingRecordWhereInput[] = [];

  if (status) conditions.push({ status: status as Prisma.UsageBillingRecordWhereInput['status'] });
  if (source) conditions.push({ source: source as Prisma.UsageBillingRecordWhereInput['source'] });

  if (search) {
    conditions.push({
      OR: [
        { shop: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { platformOrderId: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ],
    });
  }

  return conditions.length > 0 ? { AND: conditions } : undefined;
};
