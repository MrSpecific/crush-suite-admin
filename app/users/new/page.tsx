import { PageLayout } from '@/app/components/PageLayout';
import { CreateUserForm } from '@/app/users/new/CreateUserForm';

export default async function Page() {
  return (
    <PageLayout heading="New User">
      <CreateUserForm />
    </PageLayout>
  );
}
