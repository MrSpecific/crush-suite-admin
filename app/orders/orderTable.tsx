import { Header } from '@/app/components/DataTable';
import { ButtonLink } from '@/app/components/ButtonLink';
import {
  currencyFormatterWithDecimals,
  dateFormatter,
  issuesFormatter,
  merchantFormatter,
  orderStatusFormatter,
} from '@/lib/formatters';
import { Box, Flex, Text } from '@radix-ui/themes';

export const getOrderTableHeaders = ({
  includeMerchant = true,
  includeActions = true,
}: {
  includeMerchant?: boolean;
  includeActions?: boolean;
} = {}): Header[] => {
  const headers: Header[] = [{ type: 'data', title: 'Data' }];

  if (includeMerchant) {
    headers.push({
      id: 'merchant',
      title: 'Merchant',
      formatter: merchantFormatter,
    });
  }

  headers.push(
    {
      id: 'createdAt',
      title: 'Created At',
      formatter: dateFormatter,
    },
    { id: 'totalValue', title: 'Value', formatter: costsFormatter },
    {
      id: 'compliancePartnerOrderId',
      title: 'Order Ids',
      formatter: orderIdsFormatter,
    },
    { id: 'status', title: 'Status', formatter: orderStatusFormatter },
    { id: 'issues', title: 'Issues', formatter: issuesFormatter }
  );

  if (includeActions) {
    headers.push({ type: 'actions', title: 'Actions' });
  }

  return headers;
};

export const OrderTableActions = ({ id }: { id: number }) => {
  return (
    <Flex gap="2">
      <ButtonLink href={`/orders/${id}`}>View</ButtonLink>
    </Flex>
  );
};

const orderIdsFormatter = (value: any, row: any) => (
  <Flex direction="column" gap="2">
    <Box>
      <Text as="div" size="1" color="gray">
        Compliance Partner Order ID:
      </Text>
      {value}
    </Box>
    <Box>
      <Text as="div" size="1" color="gray">
        Platform Order Id:
      </Text>
      {row.platformOrderId}
    </Box>
  </Flex>
);

const costsFormatter = (_value: any, row: any) => (
  <VerticalList
    values={[
      {
        label: 'Total Value',
        value: currencyFormatterWithDecimals(row.totalValue),
        weight: 'bold',
      },
      { label: 'Total Tax', value: currencyFormatterWithDecimals(row.totalTax) },
      {
        label: 'Total Discounts',
        value: row.totalDiscounts ? currencyFormatterWithDecimals(row.totalDiscounts) : undefined,
      },
    ]}
  />
);

const VerticalList = ({
  values,
}: {
  values: { label?: string; value?: string; weight?: 'bold' }[];
}) => {
  if (!values) return null;

  return (
    <Flex direction="column" gap="2">
      {values.map(
        ({ label, value, weight }) =>
          value && (
            <Box key={`${label}-${value}`}>
              <Text as="div" size="1" color="gray">
                {label}:
              </Text>
              <Text weight={weight}>{value}</Text>
            </Box>
          )
      )}
    </Flex>
  );
};
