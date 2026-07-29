import { prisma } from '@/lib/prisma';
import { PageLayout } from '@/app/components/PageLayout';
import { DataTable } from '@/app/components/DataTable';
import { Pagination } from '@/app/components/Pagination';
import { DataFilter, type SelectDataFilter } from '@/app/components/DataFilter';
import { Badge } from '@radix-ui/themes';
import { dateTimeFormatter } from '@/lib/formatters';
import { ButtonLink } from '@/app/components/ButtonLink';
import { queryPagination } from '@/lib/queryPagination';
import { appIssueTypeMetaData } from '@/lib/metaData';
import { AppIssueType } from '@prisma/client';
import { DataDialog } from '@/app/components/DataDialog';

const MerchantActions = ({ merchantId }: { merchantId: number }) => (
  <ButtonLink href={`/merchants/${merchantId}`}>View Merchant</ButtonLink>
);

export default async function Page(props: { searchParams: Promise<PageSearchParams> }) {
  const searchParams = await props.searchParams;
  const { page, issueType, resolved } = searchParams;

  const where = {
    ...(issueType ? { issueType: issueType as AppIssueType } : {}),
    ...(resolved === 'yes' ? { resolved: true } : resolved === 'no' ? { resolved: false } : {}),
  };

  const count = await prisma.appIssue.count({ where });
  const issues = await prisma.appIssue.findMany({
    ...queryPagination({ page, count }),
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      createdAt: true,
      shop: true,
      issueType: true,
      resolved: true,
      resolvedAt: true,
      merchantId: true,
      issueData: true,
      merchant: { select: { compliancePartnerAccountName: true } },
    },
  });

  const filters: SelectDataFilter[] = [
    {
      label: 'Type',
      name: 'issueType',
      allLabel: 'All Types',
      options: Object.entries(appIssueTypeMetaData).map(([value, meta]) => ({
        label: meta.label,
        value,
      })),
    },
    {
      label: 'Status',
      name: 'resolved',
      allLabel: 'All',
      options: [
        { label: 'Open', value: 'no' },
        { label: 'Resolved', value: 'yes' },
      ],
    },
  ];

  const headers = [
    {
      id: 'issueData',
      title: 'Data',
      formatter: (v: unknown) => <DataDialog title="Issue Data" data={v} />,
    },
    { id: 'shop', title: 'Shop' },
    {
      id: 'merchant',
      title: 'Merchant',
      formatter: (v: { compliancePartnerAccountName: string | null }) =>
        v.compliancePartnerAccountName ?? '—',
    },
    {
      id: 'issueType',
      title: 'Type',
      formatter: (v: AppIssueType) => {
        const meta = appIssueTypeMetaData[v];
        return <Badge color={meta.color} variant="soft">{meta.label}</Badge>;
      },
    },
    {
      id: 'resolved',
      title: 'Status',
      formatter: (v: boolean) => (
        <Badge color={v ? 'green' : 'red'} variant="soft">{v ? 'Resolved' : 'Open'}</Badge>
      ),
    },
    {
      id: 'resolvedAt',
      title: 'Resolved At',
      formatter: (v: Date | null) => (v ? dateTimeFormatter(v) : '—'),
    },
    { id: 'createdAt', title: 'Created', formatter: dateTimeFormatter },
    { type: 'actions' as const, title: 'Actions' },
  ];

  return (
    <PageLayout heading="App Issues">
      <DataFilter filters={filters} />
      <DataTable headers={headers} data={issues} Actions={MerchantActions} />
      <Pagination count={count} />
    </PageLayout>
  );
}
