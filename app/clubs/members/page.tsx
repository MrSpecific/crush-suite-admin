import { prismaClubs } from '@/lib/prisma-clubs';
import { PageLayout } from '@/app/components/PageLayout';
import { DataTable } from '@/app/components/DataTable';
import { Pagination } from '@/app/components/Pagination';
import { queryPagination } from '@/lib/queryPagination';
import { dateFormatter } from '@/lib/formatters';
import { Badge } from '@radix-ui/themes';
import { ButtonLink } from '@/app/components/ButtonLink';

const Actions = ({ id }: { id: string }) => (
  <ButtonLink href={`/clubs/members/${id}`}>View</ButtonLink>
);

export default async function Page({ searchParams }: { searchParams: PageSearchParams }) {
  const { page } = searchParams;
  const count = await prismaClubs.clubCustomer.count();
  const customers = await prismaClubs.clubCustomer.findMany({
    ...queryPagination({ page, count }),
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      defaultEmail: true,
      firstName: true,
      lastName: true,
      shop: true,
      createdAt: true,
      _count: { select: { Membership: true } },
    },
  });

  const headers = [
    {
      id: 'defaultEmail',
      title: 'Email',
    },
    {
      id: 'firstName',
      title: 'Name',
      formatter: (_: string, row: any) =>
        [row.firstName, row.lastName].filter(Boolean).join(' ') || '—',
    },
    { id: 'shop', title: 'Shop' },
    {
      id: '_count',
      title: 'Memberships',
      formatter: (value: { Membership: number }) => value.Membership.toString(),
    },
    { id: 'createdAt', title: 'Created', formatter: dateFormatter },
    { type: 'actions' as const, title: 'Actions' },
  ];

  return (
    <PageLayout heading="Members">
      <DataTable headers={headers} data={customers} Actions={Actions} />
      <Pagination count={count} />
    </PageLayout>
  );
}
