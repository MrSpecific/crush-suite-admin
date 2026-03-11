import { prisma } from '@/lib/prisma';
import { PageLayout } from '@/app/components/PageLayout';
import { DataTable } from '@/app/components/DataTable';
import { EditDialog } from '@/app/components/EditDialog';
import { Pagination } from '@/app/components/Pagination';
import { queryPagination } from '@/lib/queryPagination';
import { dateFormatter, currencyFormatter } from '@/lib/formatters';
import { ButtonLink } from '../components/ButtonLink';

const take = 10;

const Actions = ({ ...props }) => {
  return <ButtonLink href={`/billing-plans/${props.id}/edit`}>Edit</ButtonLink>;
};

export default async function Page({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { page } = searchParams;
  const count = await prisma.billingPlan.count();
  const data = await prisma.billingPlan.findMany({
    ...queryPagination({ page, take }),
  });
  type DataHeaders = QueryToHeader<typeof data>[];

  const headers: DataHeaders = [
    { id: 'id', title: 'ID' },
    { id: 'name', title: 'Name' },
    { id: 'description', title: 'Description' },
    { id: 'price', title: 'Price', formatter: currencyFormatter },
    { id: 'type', title: 'Type' },
    { id: 'trialDays', title: 'Trial Days' },
    { id: 'createdAt', title: 'Created At', formatter: dateFormatter },
    { id: 'updatedAt', title: 'Updated At', formatter: dateFormatter },
    { type: 'data', title: 'Data' },
    { type: 'actions', title: 'Actions' },
  ];

  return (
    <PageLayout
      heading="Billing Plans"
      actions={[{ label: 'Add New', href: '/billing-plans/new' }]}
    >
      <DataTable headers={headers} data={data} Actions={Actions} />
      <Pagination take={take} count={count} />
    </PageLayout>
  );
}
