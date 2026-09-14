import { prismaClubs } from '@/lib/prisma-clubs';
import { PageLayout } from '@/app/components/PageLayout';
import { DataTable } from '@/app/components/DataTable';
import { DataFilter, type SelectDataFilter } from '@/app/components/DataFilter';
import { Pagination } from '@/app/components/Pagination';
import { NotFound } from '@/app/components/NotFound';
import { queryPagination } from '@/lib/queryPagination';
import { dateFormatter } from '@/lib/formatters';
import { ButtonLink } from '@/app/components/ButtonLink';
import { Badge } from '@radix-ui/themes';
import { Prisma } from '@/generated/prisma/clubs';
import type { RadixColor } from '@/types/radix-ui';

const membershipStatusColor: Record<string, RadixColor> = {
  ACTIVE: 'green',
  PAUSED: 'yellow',
  LEFT: 'gray',
  PENDING_MIGRATION: 'orange',
};

const subscriptionStatusColor: Record<string, RadixColor> = {
  ACTIVE: 'green',
  PAUSED: 'yellow',
  CANCELLED: 'gray',
};

const titleCase = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const Actions = ({ customerId }: { customerId: string }) => (
  <ButtonLink href={`/clubs/members/${customerId}`}>View</ButtonLink>
);

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
  const { page, search, status } = searchParams;

  if (isNaN(merchantId)) return <NotFound message="Club not found" />;

  const club = await prismaClubs.club.findUnique({
    where: { id: clubId },
    select: { id: true, name: true, merchantId: true },
  });

  if (!club || club.merchantId !== merchantId) return <NotFound message="Club not found" />;

  const where = getMembershipWhere(clubId, search?.toString(), status?.toString());
  const count = await prismaClubs.membership.count({ where });
  const memberships = await prismaClubs.membership.findMany({
    ...queryPagination({ page, count }),
    where,
    orderBy: { joinedAt: 'desc' },
    select: {
      id: true,
      status: true,
      memberNumber: true,
      joinedAt: true,
      leftAt: true,
      pausedAt: true,
      customer: {
        select: { id: true, defaultEmail: true, firstName: true, lastName: true },
      },
      bundleSubscription: {
        select: { id: true, status: true, frequency: true, nextBillingDate: true },
      },
    },
  });

  const rows = memberships.map((m) => ({
    ...m,
    customerId: m.customer.id,
    name: [m.customer.firstName, m.customer.lastName].filter(Boolean).join(' ') || '—',
    email: m.customer.defaultEmail,
  }));

  const filters: SelectDataFilter[] = [
    {
      label: 'Status',
      name: 'status',
      options: [
        { label: 'Active', value: 'ACTIVE' },
        { label: 'Paused', value: 'PAUSED' },
        { label: 'Left', value: 'LEFT' },
        { label: 'Pending Migration', value: 'PENDING_MIGRATION' },
      ],
    },
  ];

  const headers = [
    {
      id: 'email',
      title: 'Email',
      href: (_v: string, row: any) => `/clubs/members/${row.customerId}`,
    },
    { id: 'name', title: 'Name' },
    { id: 'memberNumber', title: 'Member #', formatter: (v: string | null) => v ?? '—' },
    {
      id: 'status',
      title: 'Status',
      formatter: (value: string) => (
        <Badge color={membershipStatusColor[value] ?? 'gray'} variant="soft">
          {value}
        </Badge>
      ),
    },
    {
      id: 'bundleSubscription',
      title: 'Subscription',
      formatter: (sub: any) =>
        sub ? (
          <Badge color={subscriptionStatusColor[sub.status] ?? 'gray'} variant="soft">
            {sub.status} · {titleCase(sub.frequency)}
          </Badge>
        ) : (
          '—'
        ),
    },
    { id: 'joinedAt', title: 'Joined', formatter: dateFormatter },
    { id: 'pausedAt', title: 'Paused', formatter: (v: Date | null) => (v ? dateFormatter(v) : '—') },
    { id: 'leftAt', title: 'Left', formatter: (v: Date | null) => (v ? dateFormatter(v) : '—') },
    { type: 'actions' as const, title: 'Actions' },
  ];

  return (
    <PageLayout
      heading={`${club.name} — Members`}
      actions={[
        {
          label: 'Back to Club',
          href: `/clubs/merchants/${merchantId}/clubs/${clubId}`,
          variant: 'soft',
          color: 'gray',
        },
      ]}
    >
      <DataFilter filters={filters} />
      <DataTable headers={headers} data={rows} Actions={Actions} />
      <Pagination count={count} />
    </PageLayout>
  );
}

const getMembershipWhere = (
  clubId: string,
  search?: string,
  status?: string
): Prisma.MembershipWhereInput => {
  const conditions: Prisma.MembershipWhereInput[] = [{ clubId }];

  if (status) {
    conditions.push({ status: status as Prisma.MembershipWhereInput['status'] });
  }

  if (search) {
    conditions.push({
      OR: [
        { memberNumber: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { customer: { defaultEmail: { contains: search, mode: Prisma.QueryMode.insensitive } } },
        { customer: { firstName: { contains: search, mode: Prisma.QueryMode.insensitive } } },
        { customer: { lastName: { contains: search, mode: Prisma.QueryMode.insensitive } } },
      ],
    });
  }

  return { AND: conditions };
};
