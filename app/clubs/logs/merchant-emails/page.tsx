import { prismaClubs } from '@/lib/prisma-clubs';
import { PageLayout } from '@/app/components/PageLayout';
import { DataTable } from '@/app/components/DataTable';
import { Pagination } from '@/app/components/Pagination';
import { DataFilter, type SelectDataFilter } from '@/app/components/DataFilter';
import { queryPagination } from '@/lib/queryPagination';
import { merchantEmailTypeMetaData } from '@/lib/metaData';
import {
  emailStatusFilterOptions,
  getMerchantIdsByShop,
  merchantEmailLogHeaders,
  parseEmailStatusFilter,
  shopHeader,
} from '@/lib/emailLogs';
import { Prisma } from '@/generated/prisma/clubs';

export default async function Page(props: { searchParams: Promise<PageSearchParams> }) {
  const searchParams = await props.searchParams;
  const { page, search, emailType, status } = searchParams;
  const where = getWhere(search?.toString(), emailType?.toString(), parseEmailStatusFilter(status));
  const count = await prismaClubs.merchantEmailLog.count({ where });
  const logs = await prismaClubs.merchantEmailLog.findMany({
    ...queryPagination({ page, count }),
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      shop: true,
      emailType: true,
      sentTo: true,
      success: true,
      retryable: true,
      error: true,
      createdAt: true,
    },
  });

  const merchantIds = await getMerchantIdsByShop(logs.map((log) => log.shop));
  const rows = logs.map((log) => ({ ...log, merchantId: merchantIds.get(log.shop) }));

  const filters: SelectDataFilter[] = [
    {
      label: 'Type',
      name: 'emailType',
      options: Object.entries(merchantEmailTypeMetaData).map(([value, { label }]) => ({
        label,
        value,
      })),
    },
    { label: 'Status', name: 'status', options: emailStatusFilterOptions },
  ];

  return (
    <PageLayout heading="Merchant Emails" subheading="Emails sent to merchants, across all shops">
      <DataFilter filters={filters} />
      <DataTable headers={[shopHeader, ...merchantEmailLogHeaders]} data={rows} />
      <Pagination count={count} />
    </PageLayout>
  );
}

const getWhere = (
  search?: string,
  emailType?: string,
  success?: boolean
): Prisma.MerchantEmailLogWhereInput | undefined => {
  const conditions: Prisma.MerchantEmailLogWhereInput[] = [];

  if (emailType && emailType in merchantEmailTypeMetaData) {
    conditions.push({ emailType: emailType as keyof typeof merchantEmailTypeMetaData });
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
