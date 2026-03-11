import { PageLayout } from '@/app/components/PageLayout';
import { BillingPlanForm } from '../BillingPlanForm';

export default async function Page() {
  return (
    <PageLayout heading={`New Billing Plan`}>
      <BillingPlanForm />
    </PageLayout>
  );
}
