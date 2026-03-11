import { prisma } from '@/lib/prisma';
import { Badge, Box, Card, Flex, Grid, Heading, ScrollArea, Text } from '@radix-ui/themes';
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
        <VariantOptionsCard title="Variant Options" data={data.productVariantOptions} />
        <JsonCard title="All Variant Options" data={data.productVariantAllOptions} />
        <JsonCard title="Alcohol Data" data={data.alcoholData} />
        <JsonCard title="No-Sale States Data" data={data.noSaleStatesData} />
        <JsonCard title="Price Data" data={data.priceData} />
      </Grid>
    </PageLayout>
  );
}

const VariantOptionsCard = ({ title, data }: { title: string; data: unknown }) => {
  const options = normalizeVariantOptions(data);

  if (!options.length) {
    return <JsonCard title={title} data={data} />;
  }

  return (
    <Card>
      <Heading as="h2" size="3" mb="3">
        {title}
      </Heading>
      <Flex direction="column" gap="3">
        {options.map((option, index) => (
          <Box
            key={`${option.label}-${index}`}
            p="3"
            style={{
              backgroundColor: 'var(--gray-2)',
              borderRadius: 'var(--radius-3)',
            }}
          >
            <Text as="div" size="1" color="gray" mb="1">
              {option.label}
            </Text>
            {option.values?.length ? (
              <Flex wrap="wrap" gap="2">
                {option.values.map((value) => (
                  <Badge key={value} variant="soft">
                    {value}
                  </Badge>
                ))}
              </Flex>
            ) : (
              <Text>{option.value}</Text>
            )}
          </Box>
        ))}
      </Flex>
    </Card>
  );
};

const normalizeVariantOptions = (
  data: unknown
): { label: string; value?: string; values?: string[] }[] => {
  if (!data) return [];

  if (Array.isArray(data)) {
    return data
      .map((item, index) => normalizeVariantOptionItem(item, index))
      .filter(Boolean) as { label: string; value?: string; values?: string[] }[];
  }

  if (typeof data === 'object') {
    return Object.entries(data as Record<string, unknown>)
      .map(([key, value]) => normalizeKeyValueOption(key, value))
      .filter(Boolean) as { label: string; value?: string; values?: string[] }[];
  }

  return [];
};

const normalizeVariantOptionItem = (item: unknown, index: number) => {
  if (item == null) return null;

  if (typeof item !== 'object') {
    return {
      label: `Option ${index + 1}`,
      value: formatVariantValue(item),
    };
  }

  const record = item as Record<string, unknown>;
  const label = firstString(record, ['name', 'label', 'title', 'option']) || `Option ${index + 1}`;

  const directValues = firstArray(record, ['values', 'optionValues', 'choices']);
  if (directValues.length) {
    return {
      label,
      values: directValues.map(formatVariantValue).filter(Boolean),
    };
  }

  const directValue = firstValue(record, ['value', 'selectedValue', 'selected']);
  if (directValue !== undefined) {
    return {
      label,
      value: formatVariantValue(directValue),
    };
  }

  const remainingEntries = Object.entries(record).filter(
    ([key]) => !['name', 'label', 'title', 'option'].includes(key)
  );

  if (remainingEntries.length === 1) {
    return normalizeKeyValueOption(label, remainingEntries[0][1]);
  }

  if (remainingEntries.length > 1) {
    return {
      label,
      value: JSON.stringify(Object.fromEntries(remainingEntries), null, 2),
    };
  }

  return null;
};

const normalizeKeyValueOption = (key: string, value: unknown) => {
  if (value == null) return null;

  if (Array.isArray(value)) {
    return {
      label: humanizeOptionLabel(key),
      values: value.map(formatVariantValue).filter(Boolean),
    };
  }

  return {
    label: humanizeOptionLabel(key),
    value: formatVariantValue(value),
  };
};

const firstString = (record: Record<string, unknown>, keys: string[]) => {
  const value = firstValue(record, keys);
  return typeof value === 'string' ? value : undefined;
};

const firstArray = (record: Record<string, unknown>, keys: string[]) => {
  const value = firstValue(record, keys);
  return Array.isArray(value) ? value : [];
};

const firstValue = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    if (key in record) {
      return record[key];
    }
  }

  return undefined;
};

const humanizeOptionLabel = (value: string) =>
  value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatVariantValue = (value: unknown) => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
};

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
