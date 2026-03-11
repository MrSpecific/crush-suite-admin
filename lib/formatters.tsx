import { Link } from '@/app/components/Link';
import { Box, Text, Button, Dialog, Flex, IconButton, Badge } from '@radix-ui/themes';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { orderStatusMetaData } from './metaData';
import { RadixColor } from '@/types/radix-ui';

export const dateFormatter = (value: Date) => (value ? value.toLocaleDateString() : '');

export const dateTimeFormatter = (value: Date) =>
  value ? `${value.toLocaleDateString()} ${value.toLocaleTimeString()}` : '';

export const merchantFormatter = (value: any) => (
  <Box>
    <Link href={`/merchants/${value.id}`}>
      <Text as="div" weight="bold">
        {value?.compliancePartnerAccountName}
      </Text>
      {value.shop}
    </Link>
  </Box>
);

export const linkToMerchantFormatter = (value: any, row: any) => (
  <Link href={`/merchants/${row.merchantId || row.id}`}>{value}</Link>
);

export const linkToProductFormatter = (value: any, row: any) => (
  <Link href={`/products/${row.productId || row.id}`}>{value}</Link>
);

export const orderLinkFormatter = (value: any) => <Link href={`/orders/${value}`}>{value}</Link>;

export const discountLinkFormatter = (value: any) => (
  <Link href={`/discounts/${value}`}>{value}</Link>
);

export const currencyFormatter = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

export const percentFormatter = (value: number) => `${value * 100}%`;

export const currencyFormatterWithDecimals = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);

export const emailFormatter = (value: string) =>
  value ? <Link href={`mailto:${value}`}>{value}</Link> : '';

export const linkFormatter = (value: string) => (value ? <Link href={value}>{value}</Link> : '');

export const issuesFormatter = (value?: string[]) => {
  // console.log('value', value);
  if (!value || !value.length) return null;

  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <Button variant="soft">
          <ExclamationTriangleIcon /> Issues
        </Button>
      </Dialog.Trigger>

      <Dialog.Content maxWidth="800px">
        <Dialog.Title>Issues with this order:</Dialog.Title>

        <ol>
          {value.map((issue: any) => (
            <li key={issue}>{issue}</li>
          ))}
        </ol>

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Close
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export const noNullsFormatter = (value: any) => (value ? value : '');

export const formatAsUrl = (input: string): string => {
  if (!input) return '';

  // Trim whitespace and convert to lowercase for consistency
  const url = input.trim();

  // If input already starts with a protocol, return as-is
  if (/^(https?:)?\/\//i.test(url)) {
    return url;
  }

  // If it looks like a domain (e.g., example.com), prefix with "//"
  return `//${url}`;
};

export const orderStatusFormatter = (value: string) => {
  const status = orderStatusMetaData[value as keyof typeof orderStatusMetaData];
  const color: RadixColor = status ? status.color : 'gray';

  return (
    <Badge color={color} variant="soft">
      {status ? status.label : value}
    </Badge>
  );
};
