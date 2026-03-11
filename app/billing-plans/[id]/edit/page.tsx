// import { Proposal as ProposalType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { Box, Card, Flex, Grid, Heading, Text, Table, Separator } from '@radix-ui/themes';
import { Link } from '@/app/components/Link';
import { NotFound } from '@/app/components/NotFound';
import { PageLayout } from '@/app/components/PageLayout';
import { QuickDataList } from '@/app/components/QuickDataList';
import { currencyFormatter, dateTimeFormatter, percentFormatter } from '@/lib/formatters';
import { ButtonLink } from '@/app/components/ButtonLink';
import { BillingPlanForm } from '../../BillingPlanForm';
import { DeleteRow } from '@/app/tools/DeleteRow';
import { serverSession } from '@/lib/authorize';

export default async function Page({ params }: { params: { id: string } }) {
  const { id } = params;

  const session = await serverSession();
  const data = await prisma.billingPlan.findUnique({
    where: {
      id: parseInt(id),
    },
    // include: {
    //   // customer: true,
    //   merchants: true,
    //   // Fulfillment: true,
    // },
  });

  if (!id || !data) return <NotFound message="Billing Plan Not Found" />;

  return (
    <PageLayout heading={`Billing Plan Id #${id}`}>
      {/* <pre>{JSON.stringify(data, null, 2)}</pre> */}
      <BillingPlanForm billingPlan={data} />
      <Separator orientation="horizontal" size="4" my="5" />
      <DeleteRow type="billingPlan" id={id} session={session} />
    </PageLayout>
  );
}
