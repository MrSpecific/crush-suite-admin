import { prisma } from '@/lib/prisma';
import { getClubsShopAccessToken } from '@/lib/clubs-shopify';
import { getVinoshipperOrderLookup } from '@/lib/vinoshipper';
import { orderStatusMetaData } from '@/lib/metaData';
import { dateTimeFormatter } from '@/lib/formatters';
import { Badge, Card, Flex, Grid, Heading, Text } from '@radix-ui/themes';
import { QuickDataList } from '@/app/components/QuickDataList';
import { ShopifyOrderCard, getShopifyOrderLookup } from '@/app/components/ShopifyOrderCard';
import { VinoshipperOrderCard } from '@/app/components/VinoshipperOrderCard';
import {
  SubscriptionContractCard,
  getSubscriptionContractLookup,
} from '@/app/components/SubscriptionContractCard';

// Shopify and Vinoshipper are both fetched live, so this renders inside a
// Suspense boundary and the rest of the order page doesn't wait on them.
export async function ExternalStatus({
  shop,
  platformOrderId,
  platformContractId,
  contractCancelledAt,
  closedOutAt,
}: {
  shop: string;
  platformOrderId: string | null;
  platformContractId: string | null;
  contractCancelledAt: Date | null;
  closedOutAt: Date | null;
}) {
  // The clubs app owns this token; an expired one is treated as unavailable
  const accessToken = await getClubsShopAccessToken(shop).catch(() => null);

  const [shopifyOrderLookup, contractLookup, complianceOrder] = await Promise.all([
    getShopifyOrderLookup({ shop, accessToken, platformOrderId }),
    getSubscriptionContractLookup({ shop, accessToken, platformContractId }),
    getComplianceOrder(shop, platformOrderId),
  ]);

  const vinoshipperOrderLookup =
    complianceOrder?.compliancePartner === 'VINOSHIPPER'
      ? await getVinoshipperOrderLookup({
          merchant: complianceOrder.merchant,
          compliancePartnerOrderId: complianceOrder.compliancePartnerOrderId,
        })
      : null;

  return (
    <>
      <Grid columns={{ initial: '1', md: '2', lg: '3' }} gap="4" mb="4" align="start">
        <ShopifyOrderCard shop={shop} lookup={shopifyOrderLookup} />
        <ComplianceOrderCard order={complianceOrder} platformOrderId={platformOrderId} />
        {vinoshipperOrderLookup && <VinoshipperOrderCard lookup={vinoshipperOrderLookup} />}
      </Grid>

      <SubscriptionContractCard
        shop={shop}
        lookup={contractLookup}
        stored={{ platformOrderId, contractCancelledAt, closedOutAt }}
      />
    </>
  );
}

// Clubs orders reach Vinoshipper through the Compliance app, which ingests the
// Shopify order billing creates — so the link is shop + Shopify order ID.
const getComplianceOrder = async (shop: string, platformOrderId: string | null) => {
  if (!platformOrderId) return null;

  return prisma.order.findFirst({
    where: { platformOrderId, merchant: { shop } },
    select: {
      id: true,
      status: true,
      issues: true,
      createdAt: true,
      platformOrderName: true,
      compliancePartner: true,
      compliancePartnerOrderId: true,
      merchant: {
        select: {
          shop: true,
          compliancePartner: true,
          compliancePartnerId: true,
          compliancePartnerApiPub: true,
          compliancePartnerApiSec: true,
        },
      },
    },
  });
};

type ComplianceOrder = Awaited<ReturnType<typeof getComplianceOrder>>;

const ComplianceOrderCard = ({
  order,
  platformOrderId,
}: {
  order: ComplianceOrder;
  platformOrderId: string | null;
}) => {
  const statusMeta = order ? orderStatusMetaData[order.status] : undefined;

  return (
    <Card>
      <Flex justify="between" align="center" gap="3" mb="3">
        <Heading size="4">Compliance</Heading>
        {order ? (
          <Badge color={statusMeta?.color ?? 'gray'} variant="soft">
            {statusMeta?.label ?? order.status}
          </Badge>
        ) : (
          <Badge color="gray" variant="soft">
            Not found
          </Badge>
        )}
      </Flex>

      {order ? (
        <QuickDataList
          data={[
            {
              label: 'Compliance Order',
              value: order.platformOrderName ?? `#${order.id}`,
              linkTo: `/orders/${order.id}`,
            },
            { label: 'Partner', value: order.compliancePartner },
            { label: 'Partner Order ID', value: order.compliancePartnerOrderId, as: 'code', clipboard: true },
            {
              label: 'Issues',
              value: order.issues.length > 0 ? order.issues.join('; ') : undefined,
              color: 'red',
            },
            { label: 'Created', value: dateTimeFormatter(order.createdAt) },
          ]}
        />
      ) : (
        <Text color="gray">
          {platformOrderId
            ? 'The Compliance app has no order for this Shopify order. The merchant may not use Compliance, or the order was never ingested.'
            : 'No Shopify order has been created yet, so there is nothing in Compliance.'}
        </Text>
      )}
    </Card>
  );
};
