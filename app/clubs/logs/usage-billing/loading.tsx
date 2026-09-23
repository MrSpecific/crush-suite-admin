import { PageLayout } from '@/app/components/PageLayout';
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton';

export default async function Loading() {
  return (
    <PageLayout heading="Loading...">
      <LoadingSkeleton />
    </PageLayout>
  );
}
