import { Badge, Box, Callout, Card, Flex, Grid, Heading, Text } from '@radix-ui/themes';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { DataDialog } from '@/app/components/DataDialog';
import { ExternalButtonLink } from '@/app/components/ButtonLink';
import { DataTable } from '@/app/components/DataTable';
import { Link } from '@/app/components/Link';
import { QuickDataList } from '@/app/components/QuickDataList';
import { formatDateTime } from '@/app/components/ShopifyOrderCard';
import { dateFormatter } from '@/lib/formatters';
import {
  formatMoney,
  getShopifyAdminOrderUrl,
  getShopifySubscriptionContract,
  type ShopifySubscriptionBillingAttempt,
  type ShopifySubscriptionContract,
} from '@/lib/shopify';
import type { RadixColor } from '@/types/radix-ui';

export type SubscriptionContractLookup = {
  contract: ShopifySubscriptionContract | null;
  error?: string;
};

const contractStatusColor: Record<string, RadixColor> = {
  ACTIVE: 'green',
  PAUSED: 'amber',
  CANCELLED: 'gray',
  EXPIRED: 'gray',
  FAILED: 'red',
  STALE: 'orange',
};

const attemptState = (attempt: ShopifySubscriptionBillingAttempt): { label: string; color: RadixColor } => {
  if (attempt.order) return { label: 'Charged', color: 'green' };
  if (attempt.processingError) return { label: 'Failed', color: 'red' };
  if (attempt.nextActionUrl) return { label: 'Needs 3DS', color: 'amber' };
  if (!attempt.completedAt) return { label: 'Pending', color: 'blue' };
  return { label: 'Completed', color: 'gray' };
};

export const getSubscriptionContractLookup = async ({
  shop,
  accessToken,
  platformContractId,
}: {
  shop: string;
  accessToken?: string | null;
  platformContractId?: string | null;
}): Promise<SubscriptionContractLookup> => {
  if (!platformContractId) {
    return { contract: null, error: 'No subscription contract ID is stored for this order.' };
  }

  if (!accessToken) {
    return { contract: null, error: 'No valid Clubs access token is stored for this shop.' };
  }

  try {
    const contract = await getShopifySubscriptionContract({ shop, accessToken, platformContractId });

    return contract
      ? { contract }
      : { contract: null, error: 'Shopify did not return this subscription contract.' };
  } catch (error) {
    return {
      contract: null,
      error: error instanceof Error ? error.message : 'Unable to load the subscription contract.',
    };
  }
};

/**
 * Where our record and Shopify's disagree. These are the states that leave an
 * order flagged (or unflagged) in the Clubs app for reasons the DB alone can't show.
 */
const getDiscrepancies = (
  contract: ShopifySubscriptionContract,
  stored: { platformOrderId: string | null; contractCancelledAt: Date | null; closedOutAt: Date | null },
) => {
  const discrepancies: string[] = [];
  const chargedOrders = contract.billingAttempts.nodes.flatMap((a) => (a.order ? [a.order] : []));

  if (!stored.platformOrderId && chargedOrders.length > 0) {
    discrepancies.push(
      `Shopify charged this contract (order ${chargedOrders[0].name}), but no Shopify order ID is stored on the release order.`,
    );
  }

  if (
    stored.platformOrderId &&
    chargedOrders.length > 0 &&
    !chargedOrders.some((o) => o.legacyResourceId === stored.platformOrderId)
  ) {
    discrepancies.push(
      `The stored Shopify order ID (${stored.platformOrderId}) doesn't match any order Shopify created from this contract.`,
    );
  }

  if (chargedOrders.length > 1) {
    discrepancies.push(`Shopify created ${chargedOrders.length} orders from this contract.`);
  }

  if ((stored.contractCancelledAt || stored.closedOutAt) && contract.status === 'ACTIVE') {
    discrepancies.push('The order is closed out / the contract is recorded as cancelled, but Shopify still has it ACTIVE.');
  }

  if (contract.customerPaymentMethod?.revokedAt) {
    discrepancies.push(
      `The contract's payment method was revoked${
        contract.customerPaymentMethod.revokedReason ? ` (${contract.customerPaymentMethod.revokedReason})` : ''
      }.`,
    );
  }

  return discrepancies;
};

export const SubscriptionContractCard = ({
  lookup,
  shop,
  stored,
  clubsAppUrl,
}: {
  lookup: SubscriptionContractLookup;
  shop: string;
  // Shopify admin has no page for a contract; the Clubs app's order page is where it's managed
  clubsAppUrl?: string | null;
  stored: { platformOrderId: string | null; contractCancelledAt: Date | null; closedOutAt: Date | null };
}) => {
  const { contract, error } = lookup;
  const discrepancies = contract ? getDiscrepancies(contract, stored) : [];

  const attemptHeaders = [
    { id: 'createdAt', title: 'Attempted', formatter: (v: string) => formatDateTime(v) },
    {
      id: 'id',
      title: 'Result',
      formatter: (_v: string, row: ShopifySubscriptionBillingAttempt) => {
        const { label, color } = attemptState(row);
        return (
          <Badge color={color} variant="soft">
            {label}
          </Badge>
        );
      },
    },
    {
      id: 'processingError',
      title: 'Error',
      formatter: (v: ShopifySubscriptionBillingAttempt['processingError']) =>
        v ? (
          <Text size="1">
            <code>{v.code}</code> {v.message}
          </Text>
        ) : (
          '—'
        ),
    },
    {
      id: 'order',
      title: 'Order',
      formatter: (v: ShopifySubscriptionBillingAttempt['order']) =>
        v ? (
          <Link href={getShopifyAdminOrderUrl(shop, v.legacyResourceId)} target="_blank">
            {v.name}
          </Link>
        ) : (
          '—'
        ),
    },
    { id: 'completedAt', title: 'Completed', formatter: (v: string | null) => formatDateTime(v) ?? '—' },
  ];

  return (
    <Card style={{ borderTop: '3px solid #95BF47' }}>
      <Flex justify="between" align="center" gap="3" mb="3">
        <Heading size="4">Subscription Contract</Heading>
        <Flex align="center" gap="2">
          {contract ? (
            <Badge color={contractStatusColor[contract.status] ?? 'gray'} variant="soft">
              {contract.status}
            </Badge>
          ) : (
            <Badge color="gray" variant="soft">
              Unavailable
            </Badge>
          )}
          {contract && <DataDialog title="Subscription Contract" data={contract} />}
          {clubsAppUrl && (
            <ExternalButtonLink href={clubsAppUrl} size="1" variant="soft" color="gray">
              Open in Clubs
            </ExternalButtonLink>
          )}
        </Flex>
      </Flex>

      {contract ? (
        <Flex direction="column" gap="3">
          {discrepancies.length > 0 && (
            <Callout.Root color="red" size="1">
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Box>
                {discrepancies.map((d) => (
                  <Text key={d} as="div" size="1">
                    {d}
                  </Text>
                ))}
              </Box>
            </Callout.Root>
          )}
          <Grid columns={{ initial: '1', md: '1fr 2fr' }} gap="4">
            <QuickDataList
              data={[
                { label: 'Contract ID', value: contract.id.split('/').pop(), as: 'code', clipboard: true },
                {
                  label: 'Next Billing',
                  value: contract.nextBillingDate ? dateFormatter(new Date(contract.nextBillingDate)) : undefined,
                },
                {
                  label: 'Last Payment',
                  children: contract.lastPaymentStatus ? (
                    <Badge color={contract.lastPaymentStatus === 'SUCCEEDED' ? 'green' : 'red'} variant="soft">
                      {contract.lastPaymentStatus}
                    </Badge>
                  ) : undefined,
                },
                { label: 'Last Error Type', value: contract.lastBillingAttemptErrorType, color: 'red' },
                {
                  label: 'Payment Method',
                  children: contract.customerPaymentMethod ? (
                    <Badge color={contract.customerPaymentMethod.revokedAt ? 'red' : 'green'} variant="soft">
                      {contract.customerPaymentMethod.revokedAt ? 'Revoked' : 'Valid'}
                    </Badge>
                  ) : undefined,
                },
                {
                  label: 'Delivery',
                  value: [
                    contract.deliveryMethod?.__typename.replace('SubscriptionDeliveryMethod', ''),
                    contract.deliveryPrice ? formatMoney(contract.deliveryPrice) : undefined,
                  ]
                    .filter(Boolean)
                    .join(' · '),
                },
                { label: 'Created', value: formatDateTime(contract.createdAt) },
                { label: 'Updated', value: formatDateTime(contract.updatedAt) },
              ]}
            />
            <Box>
              <Text as="div" size="2" weight="bold" mb="2">
                Billing Attempts ({contract.billingAttempts.nodes.length})
              </Text>
              {contract.billingAttempts.nodes.length > 0 ? (
                <DataTable headers={attemptHeaders} data={contract.billingAttempts.nodes} />
              ) : (
                <Text color="gray" size="2">
                  Shopify has no billing attempts for this contract.
                </Text>
              )}
            </Box>
          </Grid>
        </Flex>
      ) : (
        <Text color="gray">{error || 'Subscription contract information could not be loaded.'}</Text>
      )}
    </Card>
  );
};
