// import { Proposal as ProposalType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { Box, Card, Flex, Grid, Heading, Text, Table } from '@radix-ui/themes';
import { Link } from '@/app/components/Link';
import { NotFound } from '@/app/components/NotFound';
import { PageLayout } from '@/app/components/PageLayout';
import { QuickDataList } from '@/app/components/QuickDataList';
import { dateTimeFormatter, formatAsUrl } from '@/lib/formatters';
import Head from 'next/head';
import { ClipboardCopy } from '@/app/components/ClipboardCopy';
import { CompleteGDPR } from '../CompleteGDPR';

type PurchaseItem = {
  quantity: number;
  soldExternal?: boolean;
  productType?: string;
  platformVariantId?: string;
  compliancePartnerProductId?: string;
};

export default async function Page({ params }: { params: { id: string } }) {
  const { id } = params;

  const data = await prisma.gDPR.findUnique({
    where: {
      id,
    },
    include: {
      merchant: true,
    },
  });

  if (!id || !data) return <NotFound message="GDPR Request Not Found" />;

  const customer = data.customerId
    ? await prisma.customer.findUnique({
        where: {
          id: data.customerId,
        },
      })
    : null;

  // const { compliancePartner, purchasedItems } = data;

  // const items = typeof purchasedItems === 'string' ? JSON.parse(purchasedItems) : purchasedItems;

  return (
    <PageLayout heading={`GDPR Request #${id}`}>
      <Grid gap="4" columns={{ initial: '1', md: '2' }}>
        <QuickDataList
          data={[
            { label: 'ID', value: id },
            { label: 'Created At', value: dateTimeFormatter(data.createdAt) },
            { label: 'Updated At', value: dateTimeFormatter(data.updatedAt) },
            { label: 'Type', value: data.type, badge: true, color: 'cyan' },
            {
              label: 'Completed',
              value: data.completed ? 'Yes' : 'No',
              badge: true,
              color: data.completed ? 'teal' : 'red',
            },
            { label: 'Completed on', value: data.completedAt?.toLocaleString() },
          ]}
        />
        <Box>
          <QuickDataList
            data={[
              { label: 'Platform', value: data.platform, badge: true, color: 'yellow' },
              { label: 'Merchant', value: data.merchant?.compliancePartnerAccountName },
              {
                label: 'Shop',
                value: data.merchant?.shop,
                linkTo: data.merchant?.shop ? formatAsUrl(data.merchant?.shop) : undefined,
                target: '_blank',
              },
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

      <Card mt="8">
        <Heading as="h2" mb="3" size="2">
          Customer
        </Heading>
        {customer ? (
          <Flex gap="2" direction="column">
            <Heading as="h3" size="6">
              {customer.firstName} {customer.lastName}
            </Heading>
            <Text size="2" color="gray" as="div" mb="4" mt="-1">
              <Flex align="center" gap="2">
                {customer.email} <ClipboardCopy text={customer.email} />
              </Flex>
            </Text>
            <QuickDataList
              data={[
                { label: 'DOB', value: customer?.dob?.toLocaleDateString(), badge: true },
                { label: 'Memberships', value: JSON.stringify(customer?.memberships) },
                {
                  label: 'Club Member?',
                  value: customer?.isClubMember ? 'Yes' : 'No',
                  badge: true,
                  color: customer?.isClubMember ? 'teal' : 'ruby',
                },
                // {
                //   label: 'Customer Name',
                //   value: [data.customer?.firstName, data.customer?.lastName].join(' '),
                // },
                // { label: 'Customer Email', value: data.customer?.email },
                // { label: 'Customer DOB', value: data.customer?.dob?.toLocaleDateString() },
              ]}
            />
          </Flex>
        ) : (
          <Text>No customer data available</Text>
        )}
      </Card>
      <Flex align="start" justify="start" gap="2" mt="4">
        {!data.completed && <CompleteGDPR id={id} />}
        {/* <Link href={`/merchants/${id}/edit`}>Edit</Link> */}
      </Flex>
    </PageLayout>
  );
}
