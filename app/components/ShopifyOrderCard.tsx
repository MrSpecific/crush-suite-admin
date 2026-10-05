import { Badge, Card, Flex, Text } from '@radix-ui/themes';
import { QuickDataList } from '@/app/components/QuickDataList';
import { ExternalButtonLink } from '@/app/components/ButtonLink';
import { dateTimeFormatter } from '@/lib/formatters';
import {
  formatMoney,
  getShopifyAdminOrderUrl,
  getShopifyOrderByPlatformOrderId,
  getShopifyOrderSourceLabel,
  type ShopifyOrder,
} from '@/lib/shopify';

export type ShopifyOrderLookup = {
  order: ShopifyOrder | null;
  error?: string;
};

export const ShopifyOrderCard = ({
  lookup,
  shop,
  platformOrderId,
}: {
  lookup: ShopifyOrderLookup;
  shop?: string | null;
  // Fallback for the admin link when the live lookup fails (e.g. an expired token)
  platformOrderId?: string | null;
}) => {
  const { order, error } = lookup;
  const adminOrderId = order?.legacyResourceId ?? platformOrderId;
  const adminUrl = shop && adminOrderId ? getShopifyAdminOrderUrl(shop, adminOrderId) : undefined;
  const sourceLabel = getShopifyOrderSourceLabel(order);
  const currentTotal = order?.currentTotalPriceSet?.shopMoney || order?.totalPriceSet?.shopMoney;

  return (
    <Card style={{ borderTop: '3px solid #95BF47' }}>
      <Flex justify="between" align="center" gap="3" mb="3">
        <img
          src="/shopify_logo_whitebg.svg"
          alt="Shopify"
          style={{ height: '26px', display: 'block' }}
        />
        <Flex align="center" gap="2">
          {order ? (
            <Badge style={{ backgroundColor: '#e8f5d9', color: '#3d6b17' }} variant="soft">
              Live
            </Badge>
          ) : (
            <Badge color="gray" variant="soft">
              Unavailable
            </Badge>
          )}
          {adminUrl && (
            <ExternalButtonLink href={adminUrl} size="1" variant="soft" color="gray">
              Open in Shopify
            </ExternalButtonLink>
          )}
        </Flex>
      </Flex>

      {order ? (
        <QuickDataList
          data={[
            {
              label: 'Admin',
              value: order.name,
              linkTo: adminUrl,
              target: '_blank',
            },
            { label: 'Source', value: sourceLabel, bold: true },
            { label: 'Source Name', value: order.sourceName, as: 'code' },
            { label: 'Source Identifier', value: order.sourceIdentifier, as: 'code' },
            { label: 'Created By App', value: order.app?.name },
            { label: 'Publication', value: order.publication?.name },
            { label: 'Channel App', value: order.channelInformation?.app.title },
            {
              label: 'Channel',
              value: order.channelInformation?.channelDefinition?.channelName,
            },
            // {
            //   label: 'Subchannel',
            //   value: order.channelInformation?.channelDefinition?.subChannelName,
            // },
            {
              label: 'Marketplace',
              value:
                order.channelInformation?.channelDefinition?.isMarketplace === undefined
                  ? undefined
                  : order.channelInformation.channelDefinition.isMarketplace
                    ? 'Yes'
                    : 'No',
            },
            { label: 'Financial Status', value: order.displayFinancialStatus },
            { label: 'Fulfillment Status', value: order.displayFulfillmentStatus },
            { label: 'Current Total', value: formatShopifyMoney(currentTotal) },
            { label: 'Created At', value: formatDateTime(order.createdAt) },
            { label: 'Updated At', value: formatDateTime(order.updatedAt) },
          ]}
        />
      ) : (
        <Text color="gray">{error || 'Shopify order information could not be loaded.'}</Text>
      )}
    </Card>
  );
};

export const getShopifyOrderLookup = async ({
  shop,
  accessToken,
  platformOrderId,
}: {
  shop?: string | null;
  accessToken?: string | null;
  platformOrderId?: string | null;
}): Promise<ShopifyOrderLookup> => {
  if (!platformOrderId) {
    return { order: null, error: 'No Shopify order ID is stored for this order.' };
  }

  if (!shop) {
    return { order: null, error: 'No Shopify shop is stored for this order.' };
  }

  if (!accessToken) {
    return { order: null, error: 'No Shopify access token is stored for this merchant.' };
  }

  try {
    const order = await getShopifyOrderByPlatformOrderId({
      shop,
      accessToken,
      platformOrderId,
    });

    return order
      ? { order }
      : {
          order: null,
          error:
            'Shopify did not return this order. It may be older than the accessible order window or unavailable to the app.',
        };
  } catch (error) {
    return {
      order: null,
      error: error instanceof Error ? error.message : 'Unable to load Shopify order information.',
    };
  }
};

const formatShopifyMoney = (value?: { amount: string; currencyCode: string } | null) =>
  value ? formatMoney(value) : undefined;

export const formatDateTime = (value?: string | null) => {
  if (!value) return undefined;

  return dateTimeFormatter(new Date(value));
};
