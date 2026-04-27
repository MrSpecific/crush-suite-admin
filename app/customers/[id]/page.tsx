import { prisma } from '@/lib/prisma';
import { Box, Badge, Card, Flex, Grid, Heading, Text } from '@radix-ui/themes';
import { NotFound } from '@/app/components/NotFound';
import { PageLayout } from '@/app/components/PageLayout';
import { QuickDataList } from '@/app/components/QuickDataList';
import { DataTable } from '@/app/components/DataTable';
import { dateFormatter, dateTimeFormatter, emailFormatter } from '@/lib/formatters';
import { OrderTableActions, getOrderTableHeaders } from '@/app/orders/orderTable';

const ordersTake = 20;

export default async function Page({ params }: { params: { id: string } }) {
  const { id } = params;

  const data = await prisma.customer.findUnique({
    where: { id: parseInt(id) },
    include: {
      merchant: true,
      orders: {
        orderBy: { createdAt: 'desc' },
        take: ordersTake,
      },
    },
  });

  if (!id || !data) return <NotFound message="Customer Not Found" />;

  const orderCount = await prisma.order.count({ where: { customerId: parseInt(id) } });

  const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ') || data.email;
  const memberships = Array.isArray(data.memberships)
    ? (data.memberships as { name?: string; clubName?: string }[])
    : [];

  return (
    <PageLayout heading={fullName}>
      <Grid columns={{ initial: '1', md: '2' }} gap="4">
        <Card>
          <Heading size="3" mb="3">
            Customer Info
          </Heading>
          <QuickDataList
            data={[
              { label: 'ID', value: String(data.id) },
              { label: 'First Name', value: data.firstName },
              { label: 'Last Name', value: data.lastName },
              { label: 'Email', value: data.email },
              { label: 'Phone', value: data.phoneNumber },
              {
                label: 'Uses Phone as Primary',
                value: data.usesPhoneNumberAsPrimary ? 'Yes' : undefined,
              },
              { label: 'Date of Birth', value: data.dob ? dateFormatter(data.dob) : undefined },
              {
                label: 'Club Member',
                children: data.isClubMember ? (
                  <Badge color="green" variant="soft">
                    Yes
                  </Badge>
                ) : (
                  <Badge color="gray" variant="soft">
                    No
                  </Badge>
                ),
              },
              { label: 'Created At', value: dateTimeFormatter(data.createdAt) },
              { label: 'Updated At', value: dateTimeFormatter(data.updatedAt) },
              {
                label: 'Synced At',
                value: data.syncedAt ? dateTimeFormatter(data.syncedAt) : 'Never',
              },
            ]}
          />
        </Card>

        <Flex direction="column" gap="4">
          <Card>
            <Heading size="3" mb="3">
              Platform & Compliance
            </Heading>
            <QuickDataList
              data={[
                { label: 'Platform', value: data.platform },
                {
                  label: 'Platform Customer ID',
                  value: data.platformCustomerId,
                  clipboard: true,
                },
                { label: 'Shop', value: data.shop },
                {
                  label: 'Merchant',
                  value: data.merchant?.compliancePartnerAccountName ?? data.merchant?.shop,
                  linkTo: `/merchants/${data.merchantId}`,
                },
                { label: 'Compliance Partner', value: data.compliancePartner },
                {
                  label: 'Compliance Partner ID',
                  value: data.compliancePartnerId,
                  clipboard: true,
                },
                {
                  label: 'Compliance Partner Customer ID',
                  value: data.compliancePartnerCustomerId,
                  clipboard: true,
                },
                {
                  label: 'Compliance Partner Email',
                  value: data.compliancePartnerEmail,
                },
              ]}
            />
          </Card>

          {memberships.length > 0 && (
            <Card>
              <Heading size="3" mb="3">
                Memberships
              </Heading>
              <Flex direction="column" gap="2">
                {memberships.map((m, i) => (
                  <Badge key={i} color="blue" variant="soft" size="2">
                    {m.clubName || m.name || JSON.stringify(m)}
                  </Badge>
                ))}
              </Flex>
            </Card>
          )}
        </Flex>
      </Grid>

      <Box my="4">
        <Flex justify="between" align="center" gap="2" mb="2">
          <Heading size="4">Orders ({orderCount})</Heading>
        </Flex>
        <DataTable
          headers={getOrderTableHeaders({ includeMerchant: false })}
          data={data.orders}
          Actions={OrderTableActions}
        />
        {orderCount > ordersTake && (
          <Text size="2" color="gray" mt="2" as="div">
            Showing {ordersTake} of {orderCount} orders.
          </Text>
        )}
      </Box>
    </PageLayout>
  );
}
