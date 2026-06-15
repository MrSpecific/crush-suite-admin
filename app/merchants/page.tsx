import { Prisma, Status, CompliancePartnerConnection } from '@prisma/client';
import { compliancePartnerConnectionMetaData } from '@/lib/metaData';
import { prisma, QueryMode } from '@/lib/prisma';
import { PageLayout } from '@/app/components/PageLayout';
import { DataTable } from '@/app/components/DataTable';
import { EditDialog } from '@/app/components/EditDialog';
import { Pagination } from '@/app/components/Pagination';
import { queryPagination } from '@/lib/queryPagination';
import {
  compliancePartnerFormatter,
  dateFormatter,
  linkToMerchantFormatter,
  merchantNameAndShop,
} from '@/lib/formatters';
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

const connectionOptions: {
  value: CompliancePartnerConnection;
  label: string;
  color: RadixColor;
}[] = (Object.keys(compliancePartnerConnectionMetaData) as CompliancePartnerConnection[]).map(
  (value) => ({
    value,
    label: compliancePartnerConnectionMetaData[value].label,
    color: compliancePartnerConnectionMetaData[value].color,
  })
);

// The default sort (no `sort` param) is newest install date first.
const defaultSortLabel = 'Install Date (Newest)';
const sortOptions: {
  value: string;
  label: string;
  orderBy: Prisma.MerchantOrderByWithRelationInput;
}[] = [
  { value: 'installed_asc', label: 'Install Date (Oldest)', orderBy: { createdAt: 'asc' } },
  { value: 'name_asc', label: 'Name (A to Z)', orderBy: { compliancePartnerAccountName: 'asc' } },
  { value: 'name_desc', label: 'Name (Z to A)', orderBy: { compliancePartnerAccountName: 'desc' } },
];
const defaultMerchantOrderBy: Prisma.MerchantOrderByWithRelationInput = { createdAt: 'desc' };

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
  const { page, search, status, billingPlanId, connection, sort } = searchParams;
  const searchString = search?.toString();
  const statusFilter = normalizeMerchantStatus(status);
  const billingPlanFilter = normalizeBillingPlanFilter(billingPlanId);
  const connectionFilter = normalizeConnectionFilter(connection);
  const orderBy = getMerchantOrderBy(sort);
  const where = getMerchantWhere({
    search: searchString,
    status: statusFilter,
    billingPlan: billingPlanFilter,
    connection: connectionFilter,
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
    orderBy,
  });
  type DataHeaders = QueryToHeader<typeof merchants>[];

  const headers: DataHeaders = [
    { type: 'data', title: 'Data' },
    // { id: 'id', title: 'ID' },
    { id: 'compliancePartnerAccountName', title: 'Name', formatter: merchantNameAndShop },
    // { id: 'shop', title: 'Shop', formatter: linkToMerchantFormatter },
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
    { id: 'compliancePartner', title: 'Compliance Partner', formatter: compliancePartnerFormatter },
    { id: 'createdAt', title: 'Installed', formatter: dateFormatter },
    // {
    //   id: 'compliancePartnerConnection',
    //   title: 'Connection',
    //   formatter: (value) => <CompliancePartnerConnectionBadge connection={value} />,
    // },
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
    {
      label: 'Connection',
      name: 'connection',
      allLabel: 'All connections',
      options: connectionOptions,
    },
    {
      label: 'Sort by',
      name: 'sort',
      allLabel: defaultSortLabel,
      options: sortOptions.map(({ value, label }) => ({ value, label })),
    },
  ];

  return (
    <PageLayout heading={getMerchantPageHeading(statusFilter, connectionFilter)}>
      <DataFilter filters={filters} />
      <DataTable headers={headers} data={merchants} Actions={Actions} />
      <Pagination count={count} />
    </PageLayout>
  );
}

const getMerchantPageHeading = (status?: Status, connection?: CompliancePartnerConnection) => {
  if (connection === 'ERROR') return 'Connection Errors';

  if (!status) return 'Merchants';

  const headings: Partial<Record<Status, string>> = {
    READY: 'Active Merchants',
    INSTALLED: 'Installed Merchants',
    REMOVED: 'Removed Merchants',
  };

  return headings[status] || 'Merchants';
};

const normalizeConnectionFilter = (connection?: string | string[]) => {
  const value = Array.isArray(connection) ? connection[0] : connection;

  if (!value) return undefined;

  const validConnections = connectionOptions.map((option) => option.value);

  return validConnections.includes(value as CompliancePartnerConnection)
    ? (value as CompliancePartnerConnection)
    : undefined;
};

const getMerchantOrderBy = (sort?: string | string[]) => {
  const value = Array.isArray(sort) ? sort[0] : sort;
  const option = sortOptions.find((o) => o.value === value);

  return option?.orderBy ?? defaultMerchantOrderBy;
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
  connection,
}: {
  search?: string;
  status?: Status;
  billingPlan?: number | typeof noBillingPlanFilterValue;
  connection?: CompliancePartnerConnection;
}) => {
  const where: Prisma.MerchantWhereInput = {};

  if (search) {
    where.OR = [
      { shop: { contains: search, mode: QueryMode.insensitive } },
      { compliancePartnerAccountName: { contains: search, mode: QueryMode.insensitive } },
    ];
  }

  if (status) {
    where.status = status;
  }

  if (connection) {
    where.compliancePartnerConnection = connection;
  }

  if (billingPlan === noBillingPlanFilterValue) {
    where.billingPlanId = null;
  } else if (billingPlan) {
    where.billingPlanId = billingPlan;
  }

  return Object.keys(where).length > 0 ? where : undefined;
};
