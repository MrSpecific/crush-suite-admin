import { prisma } from '@/lib/prisma';
import { Badge, Box, Card, Flex, Grid, Heading, ScrollArea, Text } from '@radix-ui/themes';
import { Link } from '@/app/components/Link';
import { NotFound } from '@/app/components/NotFound';
import { PageLayout } from '@/app/components/PageLayout';
import {
  QuickDataList,
  type DataListItem as QuickDataListItem,
} from '@/app/components/QuickDataList';
import { ProductCategoryBadge } from '@/app/components/ProductCategoryBadge';
import { currencyFormatter, dateTimeFormatter, formatAsUrl } from '@/lib/formatters';

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
  const isShipCompliant = data.compliancePartner === 'SHIPCOMPLIANT';

  return (
    <PageLayout
      heading={data.name}
      actions={
        merchant ? [{ label: 'View Merchant', href: `/merchants/${merchant.id}` }] : undefined
      }
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
            data={
              [
                merchant
                  ? {
                      label: 'Merchant',
                      children: (
                        <Link href={`/merchants/${merchant.id}`}>
                          {merchant.compliancePartnerAccountName || merchant.shop}
                        </Link>
                      ),
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
                merchant ? { label: 'Billing Plan', value: merchant.billingPlan?.name } : undefined,
                merchant ? { label: 'Platform Plan', value: merchant.platformPlanName } : undefined,
                merchant
                  ? {
                      label: 'Platform Email',
                      value: merchant.platformEmail,
                      linkTo: merchant.platformEmail
                        ? `mailto:${merchant.platformEmail}`
                        : undefined,
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
              ].filter(Boolean) as QuickDataListItem[]
            }
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
            data={
              [
                { label: 'Platform', value: data.platform, badge: true, color: 'gray' },
                {
                  label: 'Shop',
                  value: data.shop,
                  linkTo: formatAsUrl(data.shop),
                  target: '_blank',
                },
                {
                  label: 'Compliance Partner',
                  value: data.compliancePartner,
                  badge: true,
                  color: 'blue',
                },
                { label: 'Compliance Partner ID', value: data.compliancePartnerId, clipboard: true },
                {
                  label: 'Compliance Product ID',
                  value: data.compliancePartnerProductId,
                  clipboard: true,
                },
                isShipCompliant
                  ? {
                      label: 'Compliance Brand ID',
                      value: data.compliancePartnerBrandId,
                      clipboard: true,
                    }
                  : undefined,
                isShipCompliant
                  ? {
                      label: 'Compliance Validation',
                      children: data.compliancePartnerValidatedAt ? (
                        <Badge color="green">
                          Validated {dateTimeFormatter(data.compliancePartnerValidatedAt)}
                        </Badge>
                      ) : (
                        <Badge color="orange">Not validated</Badge>
                      ),
                    }
                  : undefined,
                isShipCompliant && data.compliancePartnerValidationError
                  ? {
                      label: 'Validation Error',
                      children: (
                        <Text color="red" size="2">
                          {data.compliancePartnerValidationError}
                        </Text>
                      ),
                    }
                  : undefined,
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
                {
                  label: 'Synced At',
                  value: data.syncedAt ? dateTimeFormatter(data.syncedAt) : 'Never',
                },
              ].filter(Boolean) as QuickDataListItem[]
            }
          />
        </Card>
      </Grid>

      <Grid columns={{ initial: '1', md: '2' }} gap="4" mt="4">
        <VariantOptionsCard title="Variant Options" data={data.productVariantOptions} />
        <JsonCard title="All Variant Options" data={data.productVariantAllOptions} />
        <AlcoholDataCard data={data.alcoholData} />
        <JsonCard title="No-Sale States Data" data={data.noSaleStatesData} />
        <PriceDataCard data={data.priceData} />
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

const PriceDataCard = ({ data }: { data: unknown }) => {
  const priceData = normalizePriceData(data);

  if (!priceData) {
    return (
      <Card>
        <Heading as="h2" size="3" mb="3">
          Price Data
        </Heading>
        <Text color="gray">No data available</Text>
      </Card>
    );
  }

  const allowedQuantities = getNumberArray(priceData.allowedQuantities);

  const summaryItems = [
    { label: 'MSRP', value: formatCurrencyValue(priceData.msrp) },
    { label: 'Case Size', value: formatUnitCount(priceData.caseSize, 'unit') },
    { label: 'Min Order', value: formatUnitCount(priceData.minOrder, 'unit') },
    {
      label: 'Max Order',
      value: 'maxOrder' in priceData ? formatMaxOrder(priceData.maxOrder) : undefined,
    },
  ].filter(hasDisplayValue);

  const orderRules = [
    getPriceDataListItem(priceData, 'msrp', 'MSRP', formatCurrencyValue),
    getPriceDataListItem(priceData, 'caseSize', 'Case Size', (value) =>
      formatUnitCount(value, 'unit')
    ),
    getPriceDataListItem(priceData, 'minOrder', 'Minimum Order', (value) =>
      formatUnitCount(value, 'unit')
    ),
    getPriceDataListItem(priceData, 'maxOrder', 'Maximum Order', formatMaxOrder, true),
    getPriceDataListItem(priceData, 'increments', 'Order Increments', (value) =>
      formatUnitCount(value, 'unit')
    ),
    getPriceDataListItem(priceData, 'moqUnits', 'MOQ Units'),
    getPriceDataListItem(
      priceData,
      'excludeFromMinOrderQty',
      'Exclude From Minimum Order',
      formatYesNo
    ),
  ].filter(Boolean) as QuickDataListItem[];

  const additionalItems = Object.entries(priceData)
    .filter(([key]) => !knownPriceDataKeys.has(key))
    .map(([key, value]) => {
      const formattedValue = formatPriceValue(value);

      return formattedValue
        ? {
            label: humanizeOptionLabel(key),
            value: formattedValue,
          }
        : undefined;
    })
    .filter(Boolean) as QuickDataListItem[];

  const hasStructuredData =
    summaryItems.length || orderRules.length || allowedQuantities.length || additionalItems.length;

  const msrpDisplay = formatCurrencyValue(priceData.msrp);
  const caseSizeDisplay = formatPriceValue(priceData.caseSize);

  return (
    <Card>
      <Flex justify="between" align="start" gap="3" mb="3" wrap="wrap">
        <Heading as="h2" size="3">
          Price Data
        </Heading>
        <Flex gap="2" wrap="wrap">
          {msrpDisplay && (
            <Badge color="green" variant="soft">
              {msrpDisplay} MSRP
            </Badge>
          )}
          {caseSizeDisplay && (
            <Badge color="gray" variant="soft">
              Case of {caseSizeDisplay}
            </Badge>
          )}
        </Flex>
      </Flex>

      {hasStructuredData ? (
        <Flex direction="column" gap="4">
          {summaryItems.length ? (
            <Grid columns={{ initial: '2', md: '4' }} gap="2">
              {summaryItems.map((item) => (
                <Box
                  key={item.label}
                  p="3"
                  style={{
                    backgroundColor: 'var(--gray-2)',
                    borderRadius: 'var(--radius-3)',
                  }}
                >
                  <Text as="div" size="1" color="gray" mb="1">
                    {item.label}
                  </Text>
                  <Text as="div" size="3" weight="bold">
                    {item.value}
                  </Text>
                </Box>
              ))}
            </Grid>
          ) : null}

          {orderRules.length ? (
            <Box>
              <Text as="div" size="1" color="gray" weight="bold" mb="2">
                Order Rules
              </Text>
              <QuickDataList data={orderRules} size="1" />
            </Box>
          ) : null}

          {allowedQuantities.length ? (
            <Box>
              <Text as="div" size="1" color="gray" weight="bold" mb="2">
                Allowed Quantities
              </Text>
              <Flex gap="2" wrap="wrap">
                {allowedQuantities.map((quantity) => (
                  <Badge key={quantity} color="gray" variant="soft">
                    {quantity}
                  </Badge>
                ))}
              </Flex>
            </Box>
          ) : null}

          {additionalItems.length ? (
            <Box>
              <Text as="div" size="1" color="gray" weight="bold" mb="2">
                Additional Data
              </Text>
              <QuickDataList data={additionalItems} size="1" />
            </Box>
          ) : null}
        </Flex>
      ) : (
        <Text color="gray">No structured price data available</Text>
      )}
    </Card>
  );
};

const AlcoholDataCard = ({ data }: { data: unknown }) => {
  const alcoholData = normalizeAlcoholData(data);

  if (!alcoholData) {
    return (
      <Card>
        <Heading as="h2" size="3" mb="3">
          Alcohol Data
        </Heading>
        <Text color="gray">No data available</Text>
      </Card>
    );
  }

  const bottleSize = getRecord(alcoholData.bottleSize);
  const bottleDisplay = getBottleDisplay(bottleSize);
  const bottleVolume = getBottleVolume(bottleSize);
  const winemakerNote = formatMultilineText(alcoholData.winemakerNote);

  const summaryItems = [
    { label: 'ABV', value: formatAbv(alcoholData.abv) },
    { label: 'Vintage', value: formatAlcoholValue(alcoholData.vintage) },
    { label: 'Type', value: formatAlcoholValue(alcoholData.type) },
    { label: 'Bottle', value: bottleDisplay },
  ].filter(hasDisplayValue);

  const wineDetails = [
    getAlcoholDataListItem(alcoholData, 'type', 'Type'),
    getAlcoholDataListItem(alcoholData, 'varietal', 'Varietal'),
    getAlcoholDataListItem(alcoholData, 'vintage', 'Vintage'),
    getAlcoholDataListItem(alcoholData, 'winemaker', 'Winemaker'),
    getAlcoholDataListItem(alcoholData, 'bottlingDate', 'Bottling Date'),
  ].filter(Boolean) as QuickDataListItem[];

  const chemistryAndPackage = [
    getAlcoholDataListItem(alcoholData, 'abv', 'ABV', formatAbv),
    getAlcoholDataListItem(alcoholData, 'ph', 'pH', formatAlcoholValue, true),
    getAlcoholDataListItem(
      alcoholData,
      'titratableAcid',
      'Titratable Acid',
      formatAlcoholValue,
      true
    ),
    bottleDisplay ? { label: 'Bottle Size', value: bottleDisplay } : undefined,
    bottleVolume ? { label: 'Bottle Volume', value: bottleVolume } : undefined,
    getBottleDataListItem(bottleSize, 'units', 'Bottle Units'),
    getBottleDataListItem(bottleSize, 'id', 'Bottle Size ID', 'code'),
  ].filter(Boolean) as QuickDataListItem[];

  const additionalItems = Object.entries(alcoholData)
    .filter(([key]) => !knownAlcoholDataKeys.has(key))
    .map(([key, value]) => {
      const formattedValue = formatAlcoholValue(value);

      return formattedValue
        ? {
            label: humanizeOptionLabel(key),
            value: formattedValue,
          }
        : undefined;
    })
    .filter(Boolean) as QuickDataListItem[];

  const hasStructuredData =
    summaryItems.length ||
    wineDetails.length ||
    chemistryAndPackage.length ||
    additionalItems.length ||
    winemakerNote;

  return (
    <Card>
      <Flex justify="between" align="start" gap="3" mb="3" wrap="wrap">
        <Heading as="h2" size="3">
          Alcohol Data
        </Heading>
        <Flex gap="2" wrap="wrap">
          {formatAlcoholValue(alcoholData.type) && (
            <Badge color="pink" variant="soft">
              {formatAlcoholValue(alcoholData.type)}
            </Badge>
          )}
          {formatAlcoholValue(alcoholData.vintage) && (
            <Badge color="gray" variant="soft">
              {formatAlcoholValue(alcoholData.vintage)}
            </Badge>
          )}
        </Flex>
      </Flex>

      {hasStructuredData ? (
        <Flex direction="column" gap="4">
          {summaryItems.length ? (
            <Grid columns={{ initial: '2', md: '4' }} gap="2">
              {summaryItems.map((item) => (
                <Box
                  key={item.label}
                  p="3"
                  style={{
                    backgroundColor: 'var(--gray-2)',
                    borderRadius: 'var(--radius-3)',
                  }}
                >
                  <Text as="div" size="1" color="gray" mb="1">
                    {item.label}
                  </Text>
                  <Text as="div" size="3" weight="bold">
                    {item.value}
                  </Text>
                </Box>
              ))}
            </Grid>
          ) : null}

          <Grid columns={{ initial: '1', md: '2' }} gap="4">
            {wineDetails.length ? (
              <Box>
                <Text as="div" size="1" color="gray" weight="bold" mb="2">
                  Wine Details
                </Text>
                <QuickDataList data={wineDetails} size="1" />
              </Box>
            ) : null}

            {chemistryAndPackage.length ? (
              <Box>
                <Text as="div" size="1" color="gray" weight="bold" mb="2">
                  Chemistry & Package
                </Text>
                <QuickDataList data={chemistryAndPackage} size="1" />
              </Box>
            ) : null}
          </Grid>

          {winemakerNote ? (
            <Box>
              <Text as="div" size="1" color="gray" weight="bold" mb="2">
                Winemaker Note
              </Text>
              <Box
                p="3"
                style={{
                  backgroundColor: 'var(--gray-2)',
                  borderRadius: 'var(--radius-3)',
                }}
              >
                <Text as="p" size="2" style={{ margin: 0, whiteSpace: 'pre-line' }}>
                  {winemakerNote}
                </Text>
              </Box>
            </Box>
          ) : null}

          {additionalItems.length ? (
            <Box>
              <Text as="div" size="1" color="gray" weight="bold" mb="2">
                Additional Data
              </Text>
              <QuickDataList data={additionalItems} size="1" />
            </Box>
          ) : null}
        </Flex>
      ) : (
        <Text color="gray">No structured alcohol data available</Text>
      )}
    </Card>
  );
};

const normalizeVariantOptions = (
  data: unknown
): { label: string; value?: string; values?: string[] }[] => {
  if (!data) return [];

  if (Array.isArray(data)) {
    return data.map((item, index) => normalizeVariantOptionItem(item, index)).filter(Boolean) as {
      label: string;
      value?: string;
      values?: string[];
    }[];
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

const knownPriceDataKeys = new Set([
  'msrp',
  'caseSize',
  'maxOrder',
  'minOrder',
  'moqUnits',
  'increments',
  'allowedQuantities',
  'excludeFromMinOrderQty',
]);

const normalizePriceData = (data: unknown): Record<string, unknown> | null => {
  if (typeof data === 'string') {
    try {
      return getRecord(JSON.parse(data));
    } catch {
      return null;
    }
  }

  return getRecord(data);
};

const getPriceDataListItem = (
  data: Record<string, unknown>,
  key: string,
  label: string,
  formatter = formatPriceValue,
  showMissing = false
): QuickDataListItem | undefined => {
  if (!(key in data)) return undefined;

  const value = formatter(data[key]);
  if (value) {
    return { label, value };
  }

  return showMissing ? { label, value: 'Not provided', color: 'gray' } : undefined;
};

const getNumberArray = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === 'number') return item;

      if (typeof item === 'string') {
        const parsedValue = Number(item);
        return Number.isFinite(parsedValue) ? parsedValue : undefined;
      }

      return undefined;
    })
    .filter((item): item is number => item !== undefined);
};

const formatCurrencyValue = (value: unknown): string | undefined => {
  const numberValue = getNumberValue(value);
  if (numberValue !== undefined) {
    return currencyFormatter(numberValue);
  }

  return formatPriceValue(value);
};

const formatMaxOrder = (value: unknown): string | undefined => {
  const numberValue = getNumberValue(value);
  if (value == null || numberValue === 0) return 'No maximum';

  return formatUnitCount(value, 'unit');
};

const formatUnitCount = (value: unknown, unit: string): string | undefined => {
  const formattedValue = formatPriceValue(value);
  if (!formattedValue) return undefined;

  return `${formattedValue} ${formattedValue === '1' ? unit : `${unit}s`}`;
};

const formatYesNo = (value: unknown): string | undefined => {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';

  return formatPriceValue(value);
};

const formatPriceValue = (value: unknown): string | undefined => {
  if (value == null) return undefined;

  if (Array.isArray(value)) {
    return value.map(formatPriceValue).filter(Boolean).join(', ') || undefined;
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    return trimmedValue || undefined;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
};

const getNumberValue = (value: unknown): number | undefined => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;

  if (typeof value === 'string') {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : undefined;
  }

  return undefined;
};

const knownAlcoholDataKeys = new Set([
  'ph',
  'abv',
  'type',
  'vintage',
  'varietal',
  'winemaker',
  'bottleSize',
  'bottlingDate',
  'winemakerNote',
  'titratableAcid',
]);

const normalizeAlcoholData = (data: unknown): Record<string, unknown> | null => {
  if (typeof data === 'string') {
    try {
      return getRecord(JSON.parse(data));
    } catch {
      return null;
    }
  }

  return getRecord(data);
};

const getRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  return value as Record<string, unknown>;
};

const getAlcoholDataListItem = (
  data: Record<string, unknown>,
  key: string,
  label: string,
  formatter = formatAlcoholValue,
  showMissing = false
): QuickDataListItem | undefined => {
  if (!(key in data)) return undefined;

  const value = formatter(data[key]);
  if (value) {
    return { label, value };
  }

  return showMissing ? { label, value: 'Not provided', color: 'gray' } : undefined;
};

const getBottleDataListItem = (
  bottleSize: Record<string, unknown> | null,
  key: string,
  label: string,
  as?: QuickDataListItem['as']
): QuickDataListItem | undefined => {
  if (!bottleSize || !(key in bottleSize)) return undefined;

  const value = formatAlcoholValue(bottleSize[key]);
  return value ? { label, value, as } : undefined;
};

const getBottleDisplay = (bottleSize: Record<string, unknown> | null) => {
  if (!bottleSize) return undefined;

  return (
    formatAlcoholValue(bottleSize.desc) ||
    formatAlcoholValue(bottleSize.volumeDisplay) ||
    getBottleVolume(bottleSize)
  );
};

const getBottleVolume = (bottleSize: Record<string, unknown> | null) => {
  if (!bottleSize) return undefined;

  const volumeDisplay = formatAlcoholValue(bottleSize.volumeDisplay);
  if (volumeDisplay) return volumeDisplay;

  const ml = formatAlcoholValue(bottleSize.ml);
  return ml ? `${ml} mL` : undefined;
};

const formatAbv = (value: unknown) => {
  const formattedValue = formatAlcoholValue(value);
  if (!formattedValue) return undefined;

  return formattedValue.includes('%') ? formattedValue : `${formattedValue}%`;
};

const formatAlcoholValue = (value: unknown) => {
  if (value == null) return undefined;

  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    return trimmedValue || undefined;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
};

const formatMultilineText = (value: unknown) => {
  const formattedValue = formatAlcoholValue(value);
  return formattedValue?.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
};

const hasDisplayValue = (
  item: { label: string; value?: string } | undefined
): item is { label: string; value: string } => Boolean(item?.value);

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
