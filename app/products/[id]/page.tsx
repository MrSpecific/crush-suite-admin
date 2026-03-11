import { prisma } from '@/lib/prisma';
import { Box, Card, Flex, Grid, Heading, ScrollArea, Text } from '@radix-ui/themes';
import { Link } from '@/app/components/Link';
import { NotFound } from '@/app/components/NotFound';
import { PageLayout } from '@/app/components/PageLayout';
import { QuickDataList, type DataListItem as QuickDataListItem } from '@/app/components/QuickDataList';
import { ProductCategoryBadge } from '@/app/components/ProductCategoryBadge';
import {
  currencyFormatter,
  dateFormatter,
  dateTimeFormatter,
  formatAsUrl,
} from '@/lib/formatters';

export default async function Page({ params }: { params: { id: string } }) {
  const { id } = params;

  const data = await prisma.product.findUnique({
    where: {
      id: parseInt(id),
    },
    include: {
      merchant: {
        include: {
          billingPlan: true,
        },
      },
    },
  });

  if (!id || !data) return <NotFound message="Product Not Found" />;

  const { merchant } = data;

  return (
    <PageLayout
      heading={data.name}
      actions={merchant ? [{ label: 'View Merchant', href: `/merchants/${merchant.id}` }] : undefined}
    >
      <Grid columns={{ initial: '1', md: '2' }} gap="4">
        <Card>
          <Heading as="h2" size="3" mb="3">
            Product Overview
          </Heading>
          <QuickDataList
            data={[
              { label: 'ID', value: data.id.toString(), clipboard: true, as: 'code' },
              { label: 'Name', value: data.name, bold: true },
              {
                label: 'Category',
                children: <ProductCategoryBadge type={data.productCategory} />,
              },
              {
                label: 'Published',
                value: data.published ? 'Yes' : 'No',
                badge: true,
                color: data.published ? 'green' : 'gray',
              },
              {
                label: 'Archived',
                value: data.archived ? 'Yes' : 'No',
                badge: true,
                color: data.archived ? 'orange' : 'gray',
              },
              {
                label: 'Alcohol',
                value: data.alcohol ? 'Yes' : 'No',
                badge: true,
                color: data.alcohol ? 'red' : 'gray',
              },
              {
                label: 'Club Member Only',
                value: data.clubMemberOnly ? 'Yes' : 'No',
                badge: true,
                color: data.clubMemberOnly ? 'purple' : 'gray',
              },
              {
                label: 'Multipack',
                value: data.multipack ? 'Yes' : 'No',
                badge: true,
                color: data.multipack ? 'blue' : 'gray',
              },
              { label: 'Price', value: currencyFormatter(data.price) },
              { label: 'Inventory', value: data.inventory.toString() },
              { label: 'SKU', value: data.sku },
              {
                label: 'Image URL',
                value: data.imageUrl,
                linkTo: data.imageUrl || undefined,
                target: '_blank',
              },
              { label: 'Handle', value: data.handle, as: 'code' },
              { label: 'Description', value: data.descriptionText },
            ]}
          />
        </Card>

        <Card>
          <Heading as="h2" size="3" mb="3">
            Merchant
          </Heading>
          <QuickDataList
            data={[
              merchant
                ? {
                    label: 'Merchant',
                    children: <Link href={`/merchants/${merchant.id}`}>{merchant.compliancePartnerAccountName || merchant.shop}</Link>,
                  }
                : undefined,
              merchant
                ? {
                    label: 'Shop',
                    value: merchant.shop,
                    linkTo: formatAsUrl(merchant.shop),
                    target: '_blank',
                  }
                : undefined,
              merchant
                ? {
                    label: 'Status',
                    value: merchant.status,
                    badge: true,
                  }
                : undefined,
              merchant
                ? { label: 'Billing Plan', value: merchant.billingPlan?.name }
                : undefined,
              merchant
                ? { label: 'Platform Plan', value: merchant.platformPlanName }
                : undefined,
              merchant
                ? {
                    label: 'Platform Email',
                    value: merchant.platformEmail,
                    linkTo: merchant.platformEmail ? `mailto:${merchant.platformEmail}` : undefined,
                  }
                : undefined,
              merchant
                ? {
                    label: 'Compliance Partner Account',
                    value: merchant.compliancePartnerAccountName,
                  }
                : undefined,
              merchant
                ? { label: 'Merchant Created', value: dateTimeFormatter(merchant.createdAt) }
                : undefined,
              merchant
                ? { label: 'Merchant Updated', value: dateTimeFormatter(merchant.updatedAt) }
                : undefined,
            ].filter(Boolean) as QuickDataListItem[]}
          />
        </Card>
      </Grid>

      <Grid columns={{ initial: '1', md: '2' }} gap="4" mt="4">
        <Card>
          <Heading as="h2" size="3" mb="3">
            Commercial Details
          </Heading>
          <QuickDataList
            data={[
              { label: 'ABV', value: data.abv },
              {
                label: 'Volume',
                value: data.volume ? `${data.volume} ${data.volumeUnits}` : undefined,
              },
              { label: 'Vintage', value: data.vintage },
              { label: 'Type', value: data.type },
              { label: 'Varietal', value: data.varietal },
              { label: 'Min Order', value: data.minOrder.toString() },
              { label: 'Max Order', value: data.maxOrder.toString() },
              { label: 'MOQ Units', value: data.moqUnits.toString() },
              {
                label: 'Exclude From MOQ',
                value: data.excludeFromMinOrderQty ? 'Yes' : 'No',
                badge: true,
                color: data.excludeFromMinOrderQty ? 'orange' : 'gray',
              },
              {
                label: 'Weight',
                value: `${data.weight} ${data.weightUnit}`,
              },
            ]}
          />
        </Card>

        <Card>
          <Heading as="h2" size="3" mb="3">
            Platform And Compliance
          </Heading>
          <QuickDataList
            data={[
              { label: 'Platform', value: data.platform, badge: true, color: 'gray' },
              { label: 'Shop', value: data.shop, linkTo: formatAsUrl(data.shop), target: '_blank' },
              { label: 'Compliance Partner', value: data.compliancePartner, badge: true, color: 'blue' },
              { label: 'Compliance Partner ID', value: data.compliancePartnerId, clipboard: true },
              {
                label: 'Compliance Product ID',
                value: data.compliancePartnerProductId,
                clipboard: true,
              },
              { label: 'Platform Product ID', value: data.platformProductId, clipboard: true },
              { label: 'Platform Variant ID', value: data.platformVariantId, clipboard: true },
              {
                label: 'Has Options',
                value: data.hasOptions ? 'Yes' : 'No',
                badge: true,
                color: data.hasOptions ? 'teal' : 'gray',
              },
              { label: 'Created At', value: dateTimeFormatter(data.createdAt) },
              { label: 'Updated At', value: dateTimeFormatter(data.updatedAt) },
              { label: 'Synced At', value: data.syncedAt ? dateTimeFormatter(data.syncedAt) : 'Never' },
            ]}
          />
        </Card>
      </Grid>

      <Grid columns={{ initial: '1', md: '2' }} gap="4" mt="4">
        <JsonCard title="Variant Options" data={data.productVariantOptions} />
        <JsonCard title="All Variant Options" data={data.productVariantAllOptions} />
        <JsonCard title="Alcohol Data" data={data.alcoholData} />
        <JsonCard title="No-Sale States Data" data={data.noSaleStatesData} />
        <JsonCard title="Price Data" data={data.priceData} />
      </Grid>
    </PageLayout>
  );
}

const JsonCard = ({ title, data }: { title: string; data: unknown }) => {
  return (
    <Card>
      <Heading as="h2" size="3" mb="3">
        {title}
      </Heading>
      {data ? (
        <ScrollArea scrollbars="both" type="auto">
          <Box
            asChild
            p="3"
            style={{
              backgroundColor: 'var(--gray-2)',
              borderRadius: 'var(--radius-3)',
            }}
          >
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {JSON.stringify(data, null, 2)}
            </pre>
          </Box>
        </ScrollArea>
      ) : (
        <Text color="gray">No data available</Text>
      )}
    </Card>
  );
};
