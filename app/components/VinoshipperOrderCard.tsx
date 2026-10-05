import { Badge, Box, Callout, Card, Code, Flex, Heading, Text } from '@radix-ui/themes';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { Link } from '@/app/components/Link';
import { DataDialog } from '@/app/components/DataDialog';
import { QuickDataList } from '@/app/components/QuickDataList';
import { formatDateTime } from '@/app/components/ShopifyOrderCard';
import { currencyFormatterWithDecimals } from '@/lib/formatters';
import {
  getUpsTrackingUrl,
  getVinoshipperOrderFigures,
  vinoshipperOrderStatusMeta,
  vinoshipperStatusMeta,
  type VinoshipperOrderLookup,
} from '@/lib/vinoshipper';

export const VinoshipperOrderCard = ({ lookup }: { lookup: VinoshipperOrderLookup }) => {
  const { order, orderNumber, error } = lookup;
  const figures = order ? getVinoshipperOrderFigures(order) : null;
  const status = order ? vinoshipperStatusMeta[order.status] : undefined;
  const orderStatus = order ? vinoshipperOrderStatusMeta[order.orderStatus] : undefined;
  const money = (value?: number | null) =>
    typeof value === 'number' ? currencyFormatterWithDecimals(value) : undefined;

  return (
    <Card style={{ borderTop: '3px solid #7A1F3D' }}>
      <Flex justify="between" align="center" gap="3" mb="3">
        <Heading size="4" style={{ color: '#7A1F3D' }}>
          Vinoshipper
        </Heading>
        <Flex align="center" gap="2">
          {order ? (
            <Badge style={{ backgroundColor: '#f6e7ec', color: '#7A1F3D' }} variant="soft">
              Live
            </Badge>
          ) : (
            <Badge color="gray" variant="soft">
              Unavailable
            </Badge>
          )}
          {order && <DataDialog title={`Vinoshipper Order ${order.orderNumber}`} data={order} />}
        </Flex>
      </Flex>

      {order && figures ? (
        <Flex direction="column" gap="3">
          {order.orderProblems?.length > 0 && (
            <Callout.Root color="red" size="1">
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Box>
                {order.orderProblems.map((problem) => (
                  <Text key={problem.code} as="div" size="1">
                    {problem.description}
                  </Text>
                ))}
              </Box>
            </Callout.Root>
          )}
          <QuickDataList
            data={[
              { label: 'Order Number', value: order.orderNumber, clipboard: true },
              {
                label: 'Status',
                children: (
                  <Badge color={status?.color} variant="soft">
                    {status?.label || order.status}
                  </Badge>
                ),
              },
              {
                label: 'Order Status',
                children: (
                  <Badge color={orderStatus?.color} variant="soft">
                    {orderStatus?.label || order.orderStatus}
                  </Badge>
                ),
              },
              {
                label: 'Compliant',
                children: (
                  <Badge color={order.isCompliant ? 'green' : 'red'} variant="soft">
                    {order.isCompliant ? 'Yes' : 'No'}
                  </Badge>
                ),
              },
              {
                label: 'Age Verified',
                children: order.ageVerification ? (
                  <Badge color={order.ageVerification.verified ? 'green' : 'red'} variant="soft">
                    {order.ageVerification.verified ? 'Yes' : 'No'}
                  </Badge>
                ) : undefined,
              },
              { label: 'Total', value: money(figures.total), bold: true },
              {
                label: 'VS Sales Tax',
                value: money(figures.salesTax),
                tooltip: "Vinoshipper's own tax calculation, not the tax we submitted.",
              },
              {
                label: 'Tax Difference',
                value: figures.taxesAdjusted ? money(figures.taxesAdjusted) : undefined,
                color: figures.taxesAdjusted && figures.taxesAdjusted < 0 ? 'red' : undefined,
                tooltip:
                  'Tax we submitted minus what Vinoshipper calculated. Negative means we under-collected.',
              },
              { label: 'VS Fees', value: figures.fees ? money(figures.fees) : undefined },
              {
                label: 'Fee Difference',
                value: figures.feesAdjusted ? money(figures.feesAdjusted) : undefined,
                color: figures.feesAdjusted && figures.feesAdjusted < 0 ? 'red' : undefined,
                tooltip: 'Fees we submitted minus what Vinoshipper calculated.',
              },
              {
                label: 'Billed to Merchant',
                value: money(figures.merchant?.amountDue),
                bold: true,
                tooltip: `What Vinoshipper charges the merchant for this order: VS fee ${
                  money(figures.merchant?.vinoshipperFee) ?? '—'
                }, state fees ${money(figures.merchant?.stateFees) ?? '—'}, sales tax ${
                  money(figures.merchant?.salesTax) ?? '—'
                }, shipping ${money(figures.merchant?.shipping) ?? '—'}.`,
              },
              {
                label: 'Shipping',
                value:
                  [
                    order.shipping?.rateDescription || order.shipping?.rateCode,
                    money(figures.shipping),
                  ]
                    .filter(Boolean)
                    .join(' · ') || undefined,
              },
              {
                label: 'Tracking',
                children: figures.trackingNumbers.length ? (
                  <Flex direction="column">
                    {figures.trackingNumbers.map((trackingNumber) => (
                      <Link
                        key={trackingNumber}
                        href={getUpsTrackingUrl(trackingNumber)}
                        target="_blank"
                      >
                        {trackingNumber}
                      </Link>
                    ))}
                  </Flex>
                ) : undefined,
              },
              { label: 'Purchased At', value: formatDateTime(order.purchasedAt) },
              { label: 'Shipped At', value: formatDateTime(order.shippedAt) },
              { label: 'Delivered At', value: formatDateTime(order.deliveredAt) },
              {
                label: 'Canceled At',
                value: formatDateTime(order.canceledAt),
                color: 'orange',
              },
              { label: 'Cancel Reason', value: order.cancelReason },
            ]}
          />
        </Flex>
      ) : (
        <Flex direction="column" gap="1">
          {orderNumber && (
            <Text size="2">
              Order number: <Code>{orderNumber}</Code>
            </Text>
          )}
          <Text color="gray">{error || 'Vinoshipper order information could not be loaded.'}</Text>
        </Flex>
      )}
    </Card>
  );
};
