import { PageLayout } from '@/app/components/PageLayout';
import { Flex } from '@radix-ui/themes';
import { ForceUpdateOnSyncTrigger } from '../components/ForceUpdateOnSyncTrigger';

export default async function Page({ searchParams }: { searchParams: PageSearchParams }) {
  return (
    <PageLayout heading="Tools">
      <Flex direction="column" gap="2">
        <ForceUpdateOnSyncTrigger />
      </Flex>
    </PageLayout>
  );
}
