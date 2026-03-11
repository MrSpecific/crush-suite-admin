// import { Proposal as ProposalType } from '@prisma/client';
import { prisma, QueryMode } from '@/lib/prisma';
import { Box, Flex, Grid, Heading, Text } from '@radix-ui/themes';
import { Link } from '@/app/components/Link';
import { NotFound } from '@/app/components/NotFound';
import { PageLayout } from '@/app/components/PageLayout';
import { DataFilter } from '@/app/components/DataFilter';
import { DataTable } from '@/app/components/DataTable';
import { EditDialog } from '@/app/components/EditDialog';
import { Pagination } from '@/app/components/Pagination';
import { QuickDataList } from '@/app/components/QuickDataList';
import { ComplianceMap, type StateRecord } from '@/app/components/ComplianceMap';
import { queryPagination } from '@/lib/queryPagination';
import { dateFormatter, currencyFormatter, linkFormatter } from '@/lib/formatters';

export default async function Page({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: PageSearchParams;
}) {
  const { id } = params;
  const { search } = searchParams;
  const searchString = search?.toString();

  const data = await prisma.product.findUnique({
    where: {
      id: parseInt(id),
    },
    include: {
      merchant: true,
    },
  });

  if (!id || !data) return <NotFound message="Product Not Found" />;

  const { shop, compliancePartner, compliancePartnerId, name } = data;

  return (
    <PageLayout heading={name ?? shop}>
      <Grid columns={{ initial: '1', md: '2' }} gap="4">
        <Box>
          <QuickDataList
            data={[
              { label: 'Shop', value: shop, linkTo: `//${shop}` },
              { label: 'Compliance Partner', value: compliancePartner },
              { label: 'Compliance Partner ID', value: compliancePartnerId },
              // { label: 'Billing Plan', value: billingPlan?.name },
              // { label: 'Status', value: status, badge: true },
              // { label: 'Platform Plan', value: platformPlanName },
              // { label: 'Admin Email', value: platformEmail, linkTo: `mailto:${platformEmail}` },
            ]}
          />
        </Box>
        <Box></Box>
      </Grid>
      {/* <Flex align="start" justify="end" gap="2">
        <Link href={`/merchants/${id}/edit`}>Edit</Link>
      </Flex> */}
    </PageLayout>
  );
}
