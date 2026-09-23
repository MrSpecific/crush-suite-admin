import { prismaClubs } from '@/lib/prisma-clubs';
import { PageLayout } from '@/app/components/PageLayout';
import { DataTable } from '@/app/components/DataTable';
import { DataFilter, type SelectDataFilter } from '@/app/components/DataFilter';
import { Pagination } from '@/app/components/Pagination';
import { NotFound } from '@/app/components/NotFound';
import { queryPagination } from '@/lib/queryPagination';
import { customerEmailTypeMetaData } from '@/lib/metaData';
import {
  countClubCustomerEmailLogs,
  customerEmailLogHeaders,
  getClubCustomerEmailLogs,
} from '@/lib/customerEmailLogs';

export default async function Page(
  props: {
    params: Promise<{ merchantId: string; clubId: string }>;
    searchParams: Promise<PageSearchParams>;
  }
) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const merchantId = parseInt(params.merchantId);
  const { clubId } = params;
  const { page, search, emailType, status } = searchParams;

  if (isNaN(merchantId)) return <NotFound message="Club not found" />;

  const club = await prismaClubs.club.findUnique({
    where: { id: clubId },
    select: { id: true, name: true, merchantId: true, merchant: { select: { shop: true } } },
  });

  if (!club || club.merchantId !== merchantId) return <NotFound message="Club not found" />;

  const filters = {
    shop: club.merchant.shop,
    clubId,
    search: search?.toString(),
    emailType: emailType?.toString(),
    success: status === 'sent' ? true : status === 'failed' ? false : undefined,
  };

  const count = await countClubCustomerEmailLogs(filters);
  const emailLogs = await getClubCustomerEmailLogs({
    ...filters,
    ...queryPagination({ page, count }),
  });

  const dataFilters: SelectDataFilter[] = [
    {
      label: 'Type',
      name: 'emailType',
      options: Object.entries(customerEmailTypeMetaData).map(([value, { label }]) => ({
        label,
        value,
      })),
    },
    {
      label: 'Status',
      name: 'status',
      options: [
        { label: 'Sent', value: 'sent' },
        { label: 'Failed', value: 'failed' },
      ],
    },
  ];

  return (
    <PageLayout
      heading={`${club.name} — Member Emails`}
      actions={[
        {
          label: 'Back to Club',
          href: `/clubs/merchants/${merchantId}/clubs/${clubId}`,
          variant: 'soft',
          color: 'gray',
        },
      ]}
    >
      <DataFilter filters={dataFilters} />
      <DataTable headers={customerEmailLogHeaders} data={emailLogs} />
      <Pagination count={count} />
    </PageLayout>
  );
}
