// import { Proposal as ProposalType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { Box, Card, Flex, Grid, Heading, Text, Table, Separator } from '@radix-ui/themes';
import { Link } from '@/app/components/Link';
import { NotFound } from '@/app/components/NotFound';
import { PageLayout } from '@/app/components/PageLayout';
import { QuickDataList } from '@/app/components/QuickDataList';
import { currencyFormatter, dateTimeFormatter, percentFormatter } from '@/lib/formatters';
import { ButtonLink } from '@/app/components/ButtonLink';

type PurchaseItem = {
  quantity: number;
  soldExternal?: boolean;
  productType?: string;
  platformVariantId?: string;
  compliancePartnerProductId?: string;
};

export default async function Page({ params }: { params: { id: string } }) {
  const { id } = params;

  const data = await prisma.apiAccess.findUnique({
    where: { id },
    include: {
      // customer: true,
      merchant: true,
      // Fulfillment: true,
    },
  });

  if (!id || !data) return <NotFound message="Order Not Found" />;

  const { merchant } = data;

  return (
    <PageLayout
      heading={`API Access #${id}`}
      actions={[{ label: 'Edit', href: `/discounts/${id}/edit` }]}
    >
      <Grid gap="4" columns={{ initial: '1', md: '2' }}>
        <QuickDataList
          data={[
            { label: 'ID', value: id },
            // { label: 'Description', value: description },
            // { label: 'Value', value: data.value },
            // { label: 'Discount Fixed', value: data.discountFixed.toString() },
            // { label: 'Discount Percent', value: percentFormatter(data.discountPercent) },
            // { label: 'Discount Type', value: data.discountType },
            // { label: 'Duration Intervals', value: data.durationIntervals.toString() },
            // { label: 'Merchant Count', value: merchants.length.toString() },
            { label: 'Created At', value: dateTimeFormatter(data.createdAt) },
            { label: 'Updated At', value: dateTimeFormatter(data.updatedAt) },
          ]}
        />
        <Box>
          <QuickDataList
            data={[
              // { label: 'description', value: description },
              { label: 'Shop', value: data.merchant?.shop },
              // {
              //   label: 'Customer Name',
              //   value: [data.customer?.firstName, data.customer?.lastName].join(' '),
              // },
              // { label: 'Customer Email', value: data.customer?.email },
              // { label: 'Customer DOB', value: data.customer?.dob?.toLocaleDateString() },
            ]}
          />
        </Box>
      </Grid>
      <Card my="5">
        <Heading mb="2">Merchant</Heading>
        <Box>
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Shop</Table.ColumnHeaderCell>
                {/* <Table.ColumnHeaderCell>Compliance Partner ID</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Quantity</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Sold External</Table.ColumnHeaderCell> */}
              </Table.Row>
            </Table.Header>
          </Table.Root>
        </Box>
      </Card>
      {/* <Flex align="start" justify="end" gap="2">
        <Link href={`/merchants/${id}/edit`}>Edit</Link>
      </Flex> */}
    </PageLayout>
  );
}
