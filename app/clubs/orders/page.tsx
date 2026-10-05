import { prismaClubs } from '@/lib/prisma-clubs';
import { PageLayout } from '@/app/components/PageLayout';
import { DataTable } from '@/app/components/DataTable';
import { Pagination } from '@/app/components/Pagination';
import { DataFilter, type SelectDataFilter } from '@/app/components/DataFilter';
import { queryPagination } from '@/lib/queryPagination';
import { dateFormatter, dateTimeFormatter } from '@/lib/formatters';
import { ButtonLink } from '@/app/components/ButtonLink';
import { Badge } from '@radix-ui/themes';
import { DeliveryMethod, Prisma } from '@/generated/prisma/clubs';
import {
  getReleaseOrderStatus,
  releaseOrderStatusOptions,
  releaseOrderStatusSelect,
  releaseOrderStatusWhere,
} from '@/lib/releaseOrderStatus';

const Actions = ({ orderHref }: { orderHref: string }) => <ButtonLink href={orderHref}>View</ButtonLink>;

export default async function Page(props: { searchParams: Promise<PageSearchParams> }) {
  const searchParams = await props.searchParams;
  const { page, search, status, delivery, merchant } = searchParams;
  const where = getOrderWhere({
    search: search?.toString().trim(),
    status: status?.toString(),
    delivery: delivery?.toString(),
    merchantId: merchant ? parseInt(merchant.toString()) : undefined,
  });

  const [count, merchants] = await Promise.all([
    prismaClubs.releaseOrder.count({ where }),
    prismaClubs.merchant.findMany({
      where: { Club: { some: {} } },
      orderBy: { shop: 'asc' },
      select: { id: true, shop: true, platformShopName: true },
    }),
  ]);

  const orders = await prismaClubs.releaseOrder.findMany({
    ...queryPagination({ page, count }),
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      ...releaseOrderStatusSelect,
      id: true,
      orderCreatedAt: true,
      deliveryMethod: true,
      total: true,
      currencyCode: true,
      createdAt: true,
      clubCustomerId: true,
      clubCustomer: {
        select: { defaultEmail: true, firstName: true, lastName: true },
      },
      release: {
        select: {
          id: true,
          name: true,
          clubId: true,
          club: {
            select: {
              name: true,
              merchantId: true,
              merchant: { select: { shop: true, platformShopName: true } },
            },
          },
        },
      },
    },
  });

  const rows = orders.map((order) => {
    const { release, clubCustomer } = order;
    const clubHref = `/clubs/merchants/${release.club.merchantId}/clubs/${release.clubId}`;
    const releaseHref = `${clubHref}/releases/${release.id}`;

    return {
      ...order,
      customerEmail: clubCustomer.defaultEmail,
      customerName: [clubCustomer.firstName, clubCustomer.lastName].filter(Boolean).join(' ') || '—',
      memberHref: `/clubs/members/${order.clubCustomerId}`,
      releaseName: release.name,
      releaseHref,
      clubName: release.club.name,
      clubHref,
      merchantName: release.club.merchant.platformShopName ?? release.club.merchant.shop,
      merchantHref: `/clubs/merchants/${release.club.merchantId}`,
      orderHref: `${releaseHref}/orders/${order.id}`,
    };
  });

  const filters: SelectDataFilter[] = [
    {
      label: 'Status',
      name: 'status',
      options: releaseOrderStatusOptions,
    },
    {
      label: 'Delivery',
      name: 'delivery',
      options: [
        { label: 'Shipping', value: 'SHIPPING' },
        { label: 'Pickup', value: 'PICKUP' },
        { label: 'Local Delivery', value: 'LOCAL_DELIVERY' },
      ],
    },
    {
      label: 'Merchant',
      name: 'merchant',
      allLabel: 'All Merchants',
      options: merchants.map((m) => ({ label: m.platformShopName ?? m.shop, value: m.id.toString() })),
    },
  ];

  const headers = [
    {
      id: 'customerEmail',
      title: 'Email',
      href: (_v: string, row: any) => row.orderHref,
    },
    {
      id: 'customerName',
      title: 'Name',
      href: (_v: string, row: any) => row.memberHref,
    },
    {
      id: 'skippedAt',
      title: 'Status',
      formatter: (_v: unknown, row: any) => {
        const { label, color } = getReleaseOrderStatus(row);
        return (
          <Badge color={color} variant="soft">
            {label}
          </Badge>
        );
      },
    },
    { id: 'platformOrderId', title: 'Order ID', as: 'code' as const },
    {
      id: 'releaseName',
      title: 'Release',
      href: (_v: string, row: any) => row.releaseHref,
    },
    {
      id: 'clubName',
      title: 'Club',
      href: (_v: string, row: any) => row.clubHref,
    },
    {
      id: 'merchantName',
      title: 'Merchant',
      href: (_v: string, row: any) => row.merchantHref,
    },
    { id: 'deliveryMethod', title: 'Delivery' },
    {
      id: 'total',
      title: 'Total',
      formatter: (v: number) => `$${v.toFixed(2)}`,
    },
    {
      id: 'orderCreatedAt',
      title: 'Ordered At',
      formatter: (v: Date | null) => (v ? dateTimeFormatter(v) : '—'),
    },
    { id: 'createdAt', title: 'Created', formatter: dateFormatter },
    { type: 'actions' as const, title: 'Actions' },
  ];

  return (
    <PageLayout heading="Orders" subheading={`${count.toLocaleString()} release orders`}>
      <DataFilter filters={filters} />
      <DataTable headers={headers} data={rows} Actions={Actions} />
      <Pagination count={count} />
    </PageLayout>
  );
}

const insensitive = Prisma.QueryMode.insensitive;

// Every whitespace-separated term must match somewhere, so "jane smith" finds
// first + last name and "jane acme" narrows by customer and merchant.
const searchTermWhere = (term: string): Prisma.ReleaseOrderWhereInput => ({
  OR: [
    { id: term },
    { platformOrderId: { contains: term, mode: insensitive } },
    { platformContractId: { contains: term, mode: insensitive } },
    { platformCustomerId: { contains: term, mode: insensitive } },
    { clubCustomer: { defaultEmail: { contains: term, mode: insensitive } } },
    { clubCustomer: { firstName: { contains: term, mode: insensitive } } },
    { clubCustomer: { lastName: { contains: term, mode: insensitive } } },
    { release: { name: { contains: term, mode: insensitive } } },
    { release: { club: { name: { contains: term, mode: insensitive } } } },
    { release: { club: { merchant: { shop: { contains: term, mode: insensitive } } } } },
    { release: { club: { merchant: { platformShopName: { contains: term, mode: insensitive } } } } },
  ],
});

const getOrderWhere = ({
  search,
  status,
  delivery,
  merchantId,
}: {
  search?: string;
  status?: string;
  delivery?: string;
  merchantId?: number;
}): Prisma.ReleaseOrderWhereInput | undefined => {
  const conditions: Prisma.ReleaseOrderWhereInput[] = [];

  if (status && Object.hasOwn(releaseOrderStatusWhere, status)) {
    conditions.push(releaseOrderStatusWhere[status]);
  }

  if (delivery && Object.hasOwn(DeliveryMethod, delivery)) {
    conditions.push({ deliveryMethod: delivery as DeliveryMethod });
  }

  if (merchantId !== undefined && !isNaN(merchantId)) {
    conditions.push({ release: { club: { merchantId } } });
  }

  if (search) {
    conditions.push(...search.split(/\s+/).map(searchTermWhere));
  }

  return conditions.length > 0 ? { AND: conditions } : undefined;
};
