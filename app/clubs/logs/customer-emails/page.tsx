import { prismaClubs } from '@/lib/prisma-clubs';
import { PageLayout } from '@/app/components/PageLayout';
import { DataTable } from '@/app/components/DataTable';
import { Pagination } from '@/app/components/Pagination';
import { DataFilter, type SelectDataFilter } from '@/app/components/DataFilter';
import { queryPagination } from '@/lib/queryPagination';
import { customerEmailTypeMetaData } from '@/lib/metaData';
import {
  customerEmailLogHeaders,
  emailStatusFilterOptions,
  getMerchantIdsByShop,
  getMetadataString,
  parseEmailStatusFilter,
  shopHeader,
} from '@/lib/emailLogs';
import { Prisma } from '@/generated/prisma/clubs';

export default async function Page(props: { searchParams: Promise<PageSearchParams> }) {
  const searchParams = await props.searchParams;
  const { page, search, emailType, status } = searchParams;
  const where = getWhere(search?.toString(), emailType?.toString(), parseEmailStatusFilter(status));
  const count = await prismaClubs.customerEmailLog.count({ where });
  const logs = await prismaClubs.customerEmailLog.findMany({
    ...queryPagination({ page, count }),
    where,
    orderBy: { lastSentAt: 'desc' },
    select: {
      id: true,
      shop: true,
      emailType: true,
      sentTo: true,
      success: true,
      retryable: true,
      error: true,
      sendCount: true,
      metadata: true,
      createdAt: true,
      lastSentAt: true,
    },
  });

  const merchantIds = await getMerchantIdsByShop(logs.map((log) => log.shop));
  const rows = logs.map(({ metadata, ...log }) => ({
    ...log,
    merchantId: merchantIds.get(log.shop),
    clubName: getMetadataString(metadata, 'clubName'),
    releaseName: getMetadataString(metadata, 'releaseName'),
  }));

  const filters: SelectDataFilter[] = [
    {
      label: 'Type',
      name: 'emailType',
      options: Object.entries(customerEmailTypeMetaData).map(([value, { label }]) => ({
        label,
        value,
      })),
    },
    { label: 'Status', name: 'status', options: emailStatusFilterOptions },
  ];

  const [typeHeader, ...restHeaders] = customerEmailLogHeaders;
  const headers = [
    shopHeader,
    typeHeader,
    { id: 'clubName', title: 'Club', formatter: (v: string | null) => v ?? '—' },
    ...restHeaders,
  ];

  return (
    <PageLayout
      heading="Customer Emails"
      subheading="Emails sent to club members, across all shops"
    >
      <DataFilter filters={filters} />
      <DataTable headers={headers} data={rows} />
      <Pagination count={count} />
    </PageLayout>
  );
}

const getWhere = (
  search?: string,
  emailType?: string,
  success?: boolean
): Prisma.CustomerEmailLogWhereInput | undefined => {
  const conditions: Prisma.CustomerEmailLogWhereInput[] = [];

  if (emailType && emailType in customerEmailTypeMetaData) {
    conditions.push({ emailType: emailType as keyof typeof customerEmailTypeMetaData });
  }

  if (typeof success === 'boolean') conditions.push({ success });

  if (search) {
    conditions.push({
      OR: [
        { shop: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { sentTo: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ],
    });
  }

  return conditions.length > 0 ? { AND: conditions } : undefined;
};
