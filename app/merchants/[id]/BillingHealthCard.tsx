import { Badge, Box, Callout, Card, Code, Flex, Heading, Text } from '@radix-ui/themes';
import {
  CheckCircledIcon,
  CrossCircledIcon,
  ExclamationTriangleIcon,
  InfoCircledIcon,
} from '@radix-ui/react-icons';
import { DataTable } from '@/app/components/DataTable';
import { QuickDataList } from '@/app/components/QuickDataList';
import { LocalDateTime } from '@/app/components/LocalDateTime';
import {
  sameSubscription,
  type BillingDiagnosis,
  type BillingFacts,
  type BillingState,
} from '@/lib/billingDiagnosis';
import { RepairBillingButton } from '@/app/merchants/[id]/RepairBillingButton';
import { Link } from '@/app/components/Link';
import { formatMoney, type AppSubscriptionDiscount } from '@/lib/shopify';
import type { SubscriptionDiscount } from '@prisma/client';

// The web app turns any charge made with this discount into a Shopify test charge.
const TEST_CHARGE_DISCOUNT = 'FREE FOR TESTING';

const shopifyDiscountFormatter = (discount: AppSubscriptionDiscount | null) => {
  if (!discount) return '—';

  const duration =
    discount.durationLimitInIntervals == null
      ? 'forever'
      : `${discount.remainingDurationInIntervals ?? 0} of ${discount.durationLimitInIntervals} periods left`;

  return (
    <Flex direction="column">
      <Text size="2">
        {discount.label} → {formatMoney(discount.priceAfterDiscount)}
      </Text>
      <Text size="1" color="gray">
        {duration}
      </Text>
    </Flex>
  );
};

const discountOnRecord = (discount: SubscriptionDiscount | null) => {
  if (!discount) return 'None';

  const amount =
    discount.discountPercent > 0
      ? `${Math.round(discount.discountPercent * 100)}% off`
      : `$${discount.discountFixed.toFixed(2)} off`;

  return (
    <Flex gap="2" align="center" wrap="wrap">
      <Link href={`/discounts/${discount.id}`}>
        <Code>{discount.value}</Code>
      </Link>
      <Text size="2">
        {discount.description} · {amount} · {discount.durationIntervals} periods
      </Text>
      {discount.description === TEST_CHARGE_DISCOUNT && (
        <Badge color="gray" variant="outline">
          Makes test charges
        </Badge>
      )}
    </Flex>
  );
};

const stateStyle: Record<BillingState, { color: any; Icon: typeof InfoCircledIcon }> = {
  healthy: { color: 'green', Icon: CheckCircledIcon },
  'not-subscribed': { color: 'gray', Icon: InfoCircledIcon },
  'awaiting-activation': { color: 'blue', Icon: InfoCircledIcon },
  'out-of-sync': { color: 'orange', Icon: ExclamationTriangleIcon },
  'shopify-frozen': { color: 'orange', Icon: ExclamationTriangleIcon },
  stuck: { color: 'red', Icon: CrossCircledIcon },
  unknown: { color: 'gray', Icon: ExclamationTriangleIcon },
};

export const subscriptionStatusColor = (status?: string | null): any => {
  switch (status) {
    case 'ACTIVE':
      return 'green';
    case 'PENDING':
    case 'ACCEPTED':
      return 'yellow';
    case 'FROZEN':
      return 'orange';
    case 'DECLINED':
    case 'CANCELLED':
    case 'EXPIRED':
      return 'red';
    default:
      return 'gray';
  }
};

const StatusBadge = ({ status, test }: { status: string; test?: boolean }) => (
  <Flex gap="1">
    <Badge color={subscriptionStatusColor(status)} variant="soft">
      {status}
    </Badge>
    {test && (
      <Badge color="gray" variant="outline">
        Test
      </Badge>
    )}
  </Flex>
);

export const BillingHealthCard = ({
  merchantId,
  facts,
  diagnosis,
  subscriptionDiscount,
}: {
  merchantId: number;
  facts: BillingFacts;
  diagnosis: BillingDiagnosis;
  /** The discount the web app saved with the merchant's latest plan selection. */
  subscriptionDiscount: SubscriptionDiscount | null;
}) => {
  const { color, Icon } = stateStyle[diagnosis.state];
  const { stored, recent, platformBillingId, platformBillingStatus } = facts;

  return (
    <Card my="4">
      <Heading mb="3">Billing Health</Heading>

      <Callout.Root color={color} mb="3">
        <Callout.Icon>
          <Icon />
        </Callout.Icon>
        <Callout.Text>
          <Text weight="bold">{diagnosis.title}.</Text> {diagnosis.detail}
        </Callout.Text>
      </Callout.Root>

      <QuickDataList
        data={[
          { label: 'Merchant Sees', value: diagnosis.merchantSees },
          {
            label: 'Stored Billing ID',
            value: platformBillingId ?? 'None',
            clipboard: !!platformBillingId,
          },
          { label: 'Stored Billing Status', value: platformBillingStatus ?? 'None', badge: true },
          {
            label: 'Stored Charge in Shopify',
            children: platformBillingId ? (
              stored ? (
                <StatusBadge status={stored.status} test={stored.test} />
              ) : stored === null ? (
                <Text color="red">Not found</Text>
              ) : undefined
            ) : undefined,
          },
          {
            label: 'Stored Charge Created',
            children: stored ? <LocalDateTime value={new Date(stored.createdAt)} /> : undefined,
          },
          {
            label: 'Discount on Record',
            children: discountOnRecord(subscriptionDiscount),
            tooltip:
              'Saved with the latest plan selection and replaced on every new one. Earlier discounts show per subscription below.',
          },
        ]}
      />

      {recent.length > 0 && (
        <Box mt="4">
          <Text as="p" size="2" weight="bold" mb="2">
            Recent Shopify subscriptions (any status)
          </Text>
          <DataTable
            headers={[
              { id: 'name', title: 'Plan' },
              {
                id: 'status',
                title: 'Status',
                formatter: (v: string, row) => <StatusBadge status={v} test={row.test} />,
              },
              {
                id: 'discount',
                title: 'Discount',
                formatter: shopifyDiscountFormatter,
              },
              {
                id: 'createdAt',
                title: 'Created',
                formatter: (v: string) => <LocalDateTime value={new Date(v)} />,
              },
              {
                id: 'id',
                title: 'Stored?',
                formatter: (v: string) =>
                  platformBillingId && sameSubscription(v, platformBillingId) ? (
                    <Badge color="blue" variant="soft">
                      Stored
                    </Badge>
                  ) : (
                    ''
                  ),
              },
            ]}
            data={recent}
          />
        </Box>
      )}

      {diagnosis.repair && (
        <Box mt="3">
          <RepairBillingButton merchantId={merchantId} repair={diagnosis.repair} />
        </Box>
      )}
    </Card>
  );
};
