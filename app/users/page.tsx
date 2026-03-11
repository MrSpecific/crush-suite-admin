import { Flex } from '@radix-ui/themes';
import { prisma } from '@/lib/prisma';
import { PageLayout } from '@/app/components/PageLayout';
import { DataTable } from '@/app/components/DataTable';
import { EditDialog } from '@/app/components/EditDialog';
import { ButtonLink } from '@/app/components/ButtonLink';
import { Pagination } from '@/app/components/Pagination';
import { queryPagination } from '@/lib/queryPagination';

const Actions = ({ ...props }) => {
  return (
    <Flex gap="2">
      <EditDialog title="Edit Merchant" trigger="Edit">
        TODO: Add edit form
      </EditDialog>
      <ButtonLink href={`/users/${props.id}`}>View</ButtonLink>
    </Flex>
  );
};

export default async function Page({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { page } = searchParams;
  const count = await prisma.adminUser.count();
  const data = await prisma.adminUser.findMany({
    ...queryPagination({ page }),
  });
  type DataHeaders = QueryToHeader<typeof data>[];

  const headers: DataHeaders = [
    // { id: 'id', title: 'ID' },
    { id: 'email', title: 'Email' },
    { id: 'givenName', title: 'First Name' },
    { id: 'familyName', title: 'Last Name' },
    { id: 'role', title: 'Role' },
    { id: 'lastLogin', title: 'Last Login' },
  ];

  return (
    <PageLayout heading="Admin Users">
      <DataTable headers={headers} data={data} Actions={Actions} />
      <Pagination count={count} />
    </PageLayout>
  );
}
