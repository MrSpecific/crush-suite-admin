import { Prisma, Status } from '@prisma/client';
import { prisma, QueryMode } from '@/lib/prisma';
import { PageLayout } from '@/app/components/PageLayout';
import { DataTable } from '@/app/components/DataTable';
import { EditDialog } from '@/app/components/EditDialog';
import { Pagination } from '@/app/components/Pagination';
import { queryPagination } from '@/lib/queryPagination';
import { dateFormatter, linkToMerchantFormatter } from '@/lib/formatters';
import { DataFilter, type SelectDataFilter } from '@/app/components/DataFilter';
import { Flex, Badge } from '@radix-ui/themes';
import { ButtonLink } from '@/app/components/ButtonLink';
import { CompliancePartnerConnectionBadge } from '@/app/components/CompliancePartnerConnectionBadge';
import { RadixColor } from '@/types/radix-ui';

const noBillingPlanFilterValue = 'none';

const merchantStatusOptions: { value: Status; label: string; color: RadixColor }[] = [
  { value: 'READY', label: 'Ready', color: 'green' },
  { value: 'INSTALLED', label: 'Installed', color: 'orange' },
  { value: 'REMOVED', label: 'Removed', color: 'gray' },
  { value: 'ERROR', label: 'Error', color: 'red' },
];

const Actions = ({ ...props }) => {
  return (
    <Flex gap="2">
      {/* <EditDialog title="Edit Merchant" trigger="Edit">
        Hello
      </EditDialog> */}
      <ButtonLink href={`/merchants/${props.id}`}>View</ButtonLink>
    </Flex>
  );
};

export default async function Page({ searchParams }: { searchParams: PageSearchParams }) {
  const { page, search, status, billingPlanId } = searchParams;
  const searchString = search?.toString();
  const statusFilter = normalizeMerchantStatus(status);
  const billingPlanFilter = normalizeBillingPlanFilter(billingPlanId);
  const where = getMerchantWhere({
    search: searchString,
    status: statusFilter,
    billingPlan: billingPlanFilter,
  });
  const [count, billingPlans] = await Promise.all([
    prisma.merchant.count({ where }),
    prisma.billingPlan.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ]);
  const merchants = await prisma.merchant.findMany({
    ...queryPagination({ page, count }),
    where,
    include: {
      billingPlan: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  type DataHeaders = QueryToHeader<typeof merchants>[];

  const headers: DataHeaders = [
    { type: 'data', title: 'Data' },
    // { id: 'id', title: 'ID' },
    { id: 'compliancePartnerAccountName', title: 'Name', formatter: linkToMerchantFormatter },
    { id: 'shop', title: 'Shop', formatter: linkToMerchantFormatter },
    // { id: 'createdAt', title: 'Created At', formatter: dateFormatter },
    // { id: 'updatedAt', title: 'Updated At', formatter: dateFormatter },
    // { id: 'uninstalledAt', title: 'Uninstalled At', formatter: dateFormatter },
    // { id: 'syncedAt', title: 'Synced At', formatter: dateFormatter },
    {
      id: 'status',
      title: 'Status',
      formatter: (value) => {
        const status = merchantStatusOptions.find((option) => option.value === value) || {
          label: value,
          color: 'gray',
        };
        return <Badge color={status.color}>{status.label}</Badge>;
      },
    },
    { id: 'billingPlan', title: 'Billing Plan', formatter: (value) => value?.name },
    { id: 'compliancePartner', title: 'Compliance Partner' },
    {
      id: 'compliancePartnerConnection',
      title: 'Connection',
      formatter: (value) => <CompliancePartnerConnectionBadge connection={value} />,
    },
    { type: 'actions', title: 'Actions' },
  ];

  const filters: SelectDataFilter[] = [
    {
      label: 'Status',
      name: 'status',
      allLabel: 'All statuses',
      options: merchantStatusOptions,
    },
    {
      label: 'Billing Plan',
      name: 'billingPlanId',
      allLabel: 'All billing plans',
      options: [
        { label: 'No billing plan', value: noBillingPlanFilterValue },
        ...billingPlans.map((plan) => ({
          label: plan.name,
          value: plan.id.toString(),
        })),
      ],
    },
  ];

  return (
    <PageLayout heading={getMerchantPageHeading(statusFilter)}>
      <DataFilter filters={filters} />
      <DataTable headers={headers} data={merchants} Actions={Actions} />
      <Pagination count={count} />
    </PageLayout>
  );
}

const getMerchantPageHeading = (status?: Status) => {
  if (!status) return 'Merchants';

  const headings: Partial<Record<Status, string>> = {
    READY: 'Active Merchants',
    INSTALLED: 'Installed Merchants',
    REMOVED: 'Removed Merchants',
  };

  return headings[status] || 'Merchants';
};

const normalizeMerchantStatus = (status?: string | string[]) => {
  const value = Array.isArray(status) ? status[0] : status;

  if (!value) return undefined;

  const validStatuses = merchantStatusOptions.map((option) => option.value);

  return validStatuses.includes(value as Status) ? (value as Status) : undefined;
};

const normalizeBillingPlanFilter = (billingPlanId?: string | string[]) => {
  const value = Array.isArray(billingPlanId) ? billingPlanId[0] : billingPlanId;

  if (!value) return undefined;

  if (value === noBillingPlanFilterValue) return noBillingPlanFilterValue;

  const parsedValue = Number(value);

  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : undefined;
};

const getMerchantWhere = ({
  search,
  status,
  billingPlan,
}: {
  search?: string;
  status?: Status;
  billingPlan?: number | typeof noBillingPlanFilterValue;
}) => {
  const where: Prisma.MerchantWhereInput = {};

  if (search) {
    where.OR = [{ shop: { contains: search, mode: QueryMode.insensitive } }];
  }

  if (status) {
    where.status = status;
  }

  if (billingPlan === noBillingPlanFilterValue) {
    where.billingPlanId = null;
  } else if (billingPlan) {
    where.billingPlanId = billingPlan;
  }

  return Object.keys(where).length > 0 ? where : undefined;
};
