import { prismaClubs } from '@/lib/prisma-clubs';
import { PageLayout } from '@/app/components/PageLayout';
import { DataTable } from '@/app/components/DataTable';
import { Pagination } from '@/app/components/Pagination';
import { queryPagination } from '@/lib/queryPagination';
import { dateFormatter } from '@/lib/formatters';
import { Badge } from '@radix-ui/themes';
import type { RadixColor } from '@/types/radix-ui';
import { ButtonLink } from '@/app/components/ButtonLink';

const merchantStatusOptions: { value: string; label: string; color: RadixColor }[] = [
  { value: 'READY', label: 'Ready', color: 'green' },
  { value: 'INSTALLED', label: 'Installed', color: 'orange' },
  { value: 'REMOVED', label: 'Removed', color: 'gray' },
  { value: 'ERROR', label: 'Error', color: 'red' },
];

const Actions = ({ id }: { id: number }) => (
  <ButtonLink href={`/clubs/merchants/${id}`}>View</ButtonLink>
);

export default async function Page({ searchParams }: { searchParams: PageSearchParams }) {
  const { page } = searchParams;
  const count = await prismaClubs.merchant.count();
  const merchants = await prismaClubs.merchant.findMany({
    ...queryPagination({ page, count }),
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      shop: true,
      platformShopName: true,
      platformEmail: true,
      status: true,
      createdAt: true,
    },
  });

  const headers = [
    { id: 'shop', title: 'Shop' },
    { id: 'platformShopName', title: 'Name' },
    { id: 'platformEmail', title: 'Email' },
    {
      id: 'status',
      title: 'Status',
      formatter: (value: string) => {
        const opt = merchantStatusOptions.find((o) => o.value === value) ?? {
          label: value,
          color: 'gray' as RadixColor,
        };
        return <Badge color={opt.color}>{opt.label}</Badge>;
      },
    },
    { id: 'createdAt', title: 'Created At', formatter: dateFormatter },
    { type: 'actions' as const, title: 'Actions' },
  ];

  return (
    <PageLayout heading="Merchants">
      <DataTable headers={headers} data={merchants} Actions={Actions} />
      <Pagination count={count} />
    </PageLayout>
  );
}
