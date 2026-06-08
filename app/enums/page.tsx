import {
  AppIssueType,
  AppName,
  BillingType,
  BulkOperationType,
  CompliancePartner,
  CompliancePartnerConnection,
  DiscountType,
  FulfillmentPartner,
  FulfillmentStatus,
  OrderCreatedWith,
  OrderStatus,
  PerUseType,
  PerUseUnits,
  PrecomplianceEventType,
  ProductCategory,
  Role,
  Status,
  WeightUnit,
} from '@prisma/client';
import { Badge, Box, Card, Flex, Grid, Heading, Text } from '@radix-ui/themes';
import { prisma } from '@/lib/prisma';
import { PageLayout } from '@/app/components/PageLayout';
import {
  appIssueTypeMetaData,
  orderStatusMetaData,
  productCategoryMetaData,
} from '@/lib/metaData';
import type { RadixColor } from '@/types/radix-ui';

type ValueMeta = { label?: string; color?: RadixColor; description?: string };

type EnumDefinition = {
  /** The enum name as it appears in the Prisma schema. */
  name: string;
  /** A human-friendly title. */
  title: string;
  /** Where this enum is used / what it represents. */
  description: string;
  /** The values to render, in declaration order. */
  values: string[];
  /** Optional per-value metadata (label, color, description). */
  meta?: Record<string, ValueMeta>;
};

const enumDefinitions: EnumDefinition[] = [
  {
    name: 'OrderStatus',
    title: 'Order Status',
    description: 'Lifecycle status of an order as it moves through compliance and fulfillment.',
    values: Object.values(OrderStatus),
    meta: orderStatusMetaData,
  },
  {
    name: 'OrderCreatedWith',
    title: 'Order Source',
    description: 'Which system the order originated from.',
    values: Object.values(OrderCreatedWith),
  },
  {
    name: 'AppIssueType',
    title: 'App Issue Type',
    description:
      'Category of an issue surfaced for a merchant (shown on the Issues page and merchant detail).',
    values: Object.values(AppIssueType),
    meta: appIssueTypeMetaData,
  },
  {
    name: 'ProductCategory',
    title: 'Product Category',
    description: 'Classification used to determine compliance handling for a product.',
    values: Object.values(ProductCategory),
    meta: productCategoryMetaData,
  },
  {
    name: 'FulfillmentStatus',
    title: 'Fulfillment Status',
    description: 'Status of a fulfillment / shipment for an order.',
    values: Object.values(FulfillmentStatus),
  },
  {
    name: 'FulfillmentPartner',
    title: 'Fulfillment Partner',
    description: 'Who handles fulfillment for a merchant.',
    values: Object.values(FulfillmentPartner),
  },
  {
    name: 'CompliancePartner',
    title: 'Compliance Partner',
    description: 'Which provider handles compliance for a merchant, product, customer, or order.',
    values: Object.values(CompliancePartner),
  },
  {
    name: 'CompliancePartnerConnection',
    title: 'Compliance Partner Connection',
    description: "Connection state of a merchant's compliance partner integration.",
    values: Object.values(CompliancePartnerConnection),
  },
  {
    name: 'Status',
    title: 'Merchant App Status',
    description: 'Installation / setup state of the app for a merchant.',
    values: Object.values(Status),
  },
  {
    name: 'PrecomplianceEventType',
    title: 'Pre-Compliance Event Type',
    description: 'Stage of a pre-compliance checkout event.',
    values: Object.values(PrecomplianceEventType),
  },
  {
    name: 'Role',
    title: 'Admin User Role',
    description: 'Permission level of an admin user in this dashboard.',
    values: Object.values(Role),
  },
  {
    name: 'AppName',
    title: 'App Name',
    description: 'Identifier for each Crush Suite app (used by discounts, etc.).',
    values: Object.values(AppName),
  },
  {
    name: 'BillingType',
    title: 'Billing Type',
    description: 'How a billing plan charges merchants.',
    values: Object.values(BillingType),
  },
  {
    name: 'DiscountType',
    title: 'Discount Type',
    description: 'Whether a subscription discount applies once or recurs.',
    values: Object.values(DiscountType),
  },
  {
    name: 'PerUseType',
    title: 'Per-Use Type',
    description: 'What triggers usage-based billing.',
    values: Object.values(PerUseType),
  },
  {
    name: 'PerUseUnits',
    title: 'Per-Use Units',
    description: 'Unit used for usage-based billing.',
    values: Object.values(PerUseUnits),
  },
  {
    name: 'BulkOperationType',
    title: 'Bulk Operation Type',
    description: 'Type of merchant bulk operation.',
    values: Object.values(BulkOperationType),
  },
  {
    name: 'WeightUnit',
    title: 'Weight Unit',
    description: 'Unit used for product weight.',
    values: Object.values(WeightUnit),
  },
];

const EnumCard = ({
  definition,
  fullWidth,
  valueColumns,
}: {
  definition: EnumDefinition;
  fullWidth?: boolean;
  valueColumns?: number;
}) => {
  const { name, title, description, values, meta } = definition;
  const hasDescriptions = values.some((v) => meta?.[v]?.description);

  return (
    <Card size="2" style={fullWidth ? { gridColumn: '1 / -1' } : undefined}>
      <Flex direction="column" gap="3">
        <Box>
          <Flex align="center" justify="between" gap="2">
            <Heading as="h2" size="4">
              {title}
            </Heading>
            <Text size="1" color="gray">
              <code>{name}</code>
            </Text>
          </Flex>
          <Text size="2" color="gray" mt="1" as="p">
            {description}
          </Text>
        </Box>

        {hasDescriptions ? (
          <Flex direction="column" gap="2">
            {values.map((value) => {
              const m = meta?.[value];
              return (
                <Flex key={value} align="start" gap="2">
                  <Badge color={m?.color ?? 'gray'} variant="soft">
                    {m?.label ?? value}
                  </Badge>
                  {m?.description && (
                    <Text size="1" color="gray">
                      {m.description}
                    </Text>
                  )}
                </Flex>
              );
            })}
          </Flex>
        ) : values.length === 0 ? (
          <Text size="2" color="gray">
            None recorded yet.
          </Text>
        ) : valueColumns && valueColumns > 1 ? (
          <Grid columns={{ initial: '1', sm: String(valueColumns) }} gapX="4" gapY="2">
            {values.map((value) => {
              const m = meta?.[value];
              return (
                <Box key={value}>
                  <Badge color={m?.color ?? 'gray'} variant="soft">
                    {m?.label ?? value}
                  </Badge>
                </Box>
              );
            })}
          </Grid>
        ) : (
          <Flex gap="2" wrap="wrap">
            {values.map((value) => {
              const m = meta?.[value];
              return (
                <Badge key={value} color={m?.color ?? 'gray'} variant="soft">
                  {m?.label ?? value}
                </Badge>
              );
            })}
          </Flex>
        )}

        <Text size="1" color="gray">
          {values.length} {values.length === 1 ? 'value' : 'values'}
        </Text>
      </Flex>
    </Card>
  );
};

// Order.issues is a free-form String[] with no enum/constant definition, so we
// surface whatever values currently exist in the database via a distinct query.
const getOrderIssueValues = async (): Promise<string[]> => {
  const rows = await prisma.$queryRaw<{ issue: string }[]>`
    SELECT DISTINCT unnest(issues) AS issue
    FROM "Order"
    ORDER BY issue
  `;
  return rows.map((r) => r.issue).filter(Boolean);
};

export default async function Page() {
  const orderIssueValues = await getOrderIssueValues();

  return (
    <PageLayout
      heading="Enums & Lists"
      subheading="Reference for all enumerated values defined in the compliance database"
    >
      <Grid columns={{ initial: '1', md: '2' }} gap="4">
        {/* Order Status & Order Source lead, then the full-width Order Issues list. */}
        {enumDefinitions.slice(0, 2).map((definition) => (
          <EnumCard key={definition.name} definition={definition} />
        ))}
        <EnumCard
          fullWidth
          valueColumns={2}
          definition={{
            name: 'Order.issues',
            title: 'Order Issues',
            description:
              'Free-form issue tags recorded on orders. Not a database enum — these are the distinct values currently present in the Order table.',
            values: orderIssueValues,
          }}
        />
        {enumDefinitions.slice(2).map((definition) => (
          <EnumCard key={definition.name} definition={definition} />
        ))}
      </Grid>
    </PageLayout>
  );
}
