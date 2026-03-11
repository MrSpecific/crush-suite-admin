// import { Proposal as ProposalType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { Box, Card, Flex, Grid, Heading, Text, Table } from '@radix-ui/themes';
import { Link } from '@/app/components/Link';
import { NotFound } from '@/app/components/NotFound';
import { PageLayout } from '@/app/components/PageLayout';
import { QuickDataList } from '@/app/components/QuickDataList';
import { dateTimeFormatter } from '@/lib/formatters';

type PurchaseItem = {
  quantity: number;
  soldExternal?: boolean;
  productType?: string;
  platformVariantId?: string;
  compliancePartnerProductId?: string;
};

export default async function Page({ params }: { params: { id: string } }) {
  const { id } = params;

  const data = await prisma.order.findUnique({
    where: {
      id: parseInt(id),
    },
    include: {
      customer: true,
      merchant: true,
      Fulfillment: true,
    },
  });

  if (!id || !data) return <NotFound message="Order Not Found" />;

  const { compliancePartner, purchasedItems } = data;

  const items = typeof purchasedItems === 'string' ? JSON.parse(purchasedItems) : purchasedItems;

  return (
    <PageLayout heading={`Order Id #${id}`}>
      <Grid gap="4" columns={{ initial: '1', md: '2' }}>
        <QuickDataList
          data={[
            { label: 'ID', value: id },
            { label: 'Compliance Partner', value: compliancePartner },
            {
              label: 'Compliance Partner Order ID',
              value: data.compliancePartnerOrderId,
              clipboard: true,
            },
            { label: 'Platform Order ID', value: data.platformOrderId, clipboard: true },
            { label: 'Status', value: data.status, badge: true },
            { label: 'Issues', value: data.issues.join(', ') },
            { label: 'Created At', value: dateTimeFormatter(data.createdAt) },
            { label: 'Updated At', value: dateTimeFormatter(data.updatedAt) },
          ]}
        />
        <Box>
          <QuickDataList
            data={[
              { label: 'Merchant', value: data.merchant?.compliancePartnerAccountName },
              { label: 'Shop', value: data.merchant?.shop },
              {
                label: 'Customer Name',
                value: [data.customer?.firstName, data.customer?.lastName].join(' '),
              },
              { label: 'Customer Email', value: data.customer?.email },
              { label: 'Customer DOB', value: data.customer?.dob?.toLocaleDateString() },
            ]}
          />
        </Box>
      </Grid>
      <Card my="5">
        <Heading mb="2">Items</Heading>
        <Box>
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Platform Variant ID</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Compliance Partner ID</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Quantity</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Sold External</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>

            {items &&
              items.map((item: PurchaseItem) => {
                const {
                  quantity,
                  platformVariantId,
                  compliancePartnerProductId,
                  productType,
                  soldExternal,
                } = item;
                return (
                  <Table.Row key={platformVariantId} align="center">
                    <Table.RowHeaderCell>{platformVariantId}</Table.RowHeaderCell>
                    <Table.Cell>{compliancePartnerProductId}</Table.Cell>
                    <Table.Cell>{quantity}</Table.Cell>
                    <Table.Cell>{productType}</Table.Cell>
                    <Table.Cell>{soldExternal ? 'Yes' : 'NO'}</Table.Cell>
                  </Table.Row>
                );
              })}
          </Table.Root>
        </Box>
      </Card>
      {/* <Flex align="start" justify="end" gap="2">
        <Link href={`/merchants/${id}/edit`}>Edit</Link>
      </Flex> */}
    </PageLayout>
  );
}
