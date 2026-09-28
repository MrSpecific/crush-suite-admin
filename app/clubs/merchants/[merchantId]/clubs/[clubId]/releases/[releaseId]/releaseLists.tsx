import { prismaClubs } from '@/lib/prisma-clubs';
import { ButtonLink } from '@/app/components/ButtonLink';
import { Badge } from '@radix-ui/themes';
import { dateFormatter, dateTimeFormatter } from '@/lib/formatters';
import { Prisma } from '@/generated/prisma/clubs';

// Shared by the release detail page previews and the full order / not-yet-customized lists

export const releasePath = (merchantId: number, clubId: string, releaseId: string) =>
  `/clubs/merchants/${merchantId}/clubs/${clubId}/releases/${releaseId}`;

// Minimal release lookup for the list pages, scoped to the merchant + club in the URL
export const getReleaseForList = async (merchantId: number, clubId: string, releaseId: string) => {
  if (isNaN(merchantId)) return null;

  const release = await prismaClubs.release.findUnique({
    where: { id: releaseId },
    select: {
      id: true,
      name: true,
      releaseDate: true,
      clubId: true,
      club: {
        select: {
          merchantId: true,
          name: true,
          merchant: { select: { shop: true, platformShopName: true } },
        },
      },
    },
  });

  if (!release || release.club.merchantId !== merchantId || release.clubId !== clubId) return null;
  return release;
};

const customerSearch = (search: string): Prisma.ClubCustomerWhereInput => ({
  OR: [
    { defaultEmail: { contains: search, mode: Prisma.QueryMode.insensitive } },
    { firstName: { contains: search, mode: Prisma.QueryMode.insensitive } },
    { lastName: { contains: search, mode: Prisma.QueryMode.insensitive } },
  ],
});

const customerName = (customer: { firstName: string | null; lastName: string | null }) =>
  [customer.firstName, customer.lastName].filter(Boolean).join(' ') || '—';

// Orders

export const getReleaseOrderWhere = (
  releaseId: string,
  search?: string
): Prisma.ReleaseOrderWhereInput =>
  search ? { releaseId, clubCustomer: customerSearch(search) } : { releaseId };

export const releaseOrderSelect = {
  id: true,
  platformCustomerId: true,
  platformOrderId: true,
  orderCreatedAt: true,
  skippedAt: true,
  deliveryMethod: true,
  subtotal: true,
  discountAmount: true,
  deliveryPrice: true,
  createdAt: true,
  clubCustomer: {
    select: { defaultEmail: true, firstName: true, lastName: true },
  },
} satisfies Prisma.ReleaseOrderSelect;

type ReleaseOrder = Prisma.ReleaseOrderGetPayload<{ select: typeof releaseOrderSelect }>;

export const toReleaseOrderRows = (orders: ReleaseOrder[], basePath: string) =>
  orders.map((order) => ({
    ...order,
    customerEmail: order.clubCustomer.defaultEmail,
    customerName: customerName(order.clubCustomer),
    orderHref: `${basePath}/orders/${order.id}`,
  }));

export const releaseOrderHeaders = [
  {
    id: 'customerEmail',
    title: 'Email',
    href: (_v: string, row: any) => row.orderHref,
  },
  { id: 'customerName', title: 'Name' },
  {
    id: 'skippedAt',
    title: 'Status',
    formatter: (skippedAt: Date | null, row: any) => {
      if (skippedAt) return <Badge color="gray" variant="soft">Skipped</Badge>;
      if (row.platformOrderId) return <Badge color="green" variant="soft">Ordered</Badge>;
      return <Badge color="orange" variant="soft">Pending</Badge>;
    },
  },
  { id: 'platformOrderId', title: 'Order ID', as: 'code' as const },
  { id: 'deliveryMethod', title: 'Delivery' },
  {
    id: 'subtotal',
    title: 'Subtotal',
    formatter: (v: number) => `$${v.toFixed(2)}`,
  },
  {
    id: 'discountAmount',
    title: 'Discount',
    formatter: (v: number) => (v > 0 ? `-$${v.toFixed(2)}` : '—'),
  },
  {
    id: 'deliveryPrice',
    title: 'Shipping',
    formatter: (v: number) => (v > 0 ? `$${v.toFixed(2)}` : '—'),
  },
  { id: 'orderCreatedAt', title: 'Ordered At', formatter: (v: Date | null) => v ? dateTimeFormatter(v) : '—' },
  { id: 'createdAt', title: 'Created', formatter: dateFormatter },
  { type: 'actions' as const, title: 'Actions' },
];

export const ReleaseOrderActions = ({ orderHref }: { orderHref: string }) => (
  <ButtonLink href={orderHref}>View</ButtonLink>
);

// Active members who belong to this release cycle but have no order for it yet

export const getMembersWithoutOrderWhere = (
  release: { id: string; clubId: string; releaseDate: Date },
  search?: string
): Prisma.MembershipWhereInput => ({
  clubId: release.clubId,
  status: 'ACTIVE',
  joinedAt: { lt: release.releaseDate },
  customer: {
    ReleaseOrder: { none: { releaseId: release.id } },
    ...(search && customerSearch(search)),
  },
});

export const memberWithoutOrderSelect = {
  id: true,
  memberNumber: true,
  joinedAt: true,
  customer: {
    select: { id: true, platformCustomerId: true, defaultEmail: true, firstName: true, lastName: true },
  },
} satisfies Prisma.MembershipSelect;

type MemberWithoutOrder = Prisma.MembershipGetPayload<{ select: typeof memberWithoutOrderSelect }>;

export const toMemberWithoutOrderRows = (memberships: MemberWithoutOrder[]) =>
  memberships.map((membership) => ({
    ...membership,
    customerEmail: membership.customer.defaultEmail,
    customerName: customerName(membership.customer),
    platformCustomerId: membership.customer.platformCustomerId,
    customerId: membership.customer.id,
  }));

export const memberWithoutOrderHeaders = [
  {
    id: 'customerEmail',
    title: 'Email',
    href: (_v: string, row: any) => `/clubs/members/${row.customerId}`,
  },
  { id: 'customerName', title: 'Name' },
  { id: 'memberNumber', title: 'Member #', formatter: (v: string | null) => v ?? '—' },
  { id: 'platformCustomerId', title: 'Customer ID', as: 'code' as const },
  { id: 'joinedAt', title: 'Joined', formatter: dateFormatter },
  { type: 'actions' as const, title: 'Actions' },
];

export const MemberWithoutOrderActions = ({ customerId }: { customerId: string }) => (
  <ButtonLink href={`/clubs/members/${customerId}`}>View</ButtonLink>
);
