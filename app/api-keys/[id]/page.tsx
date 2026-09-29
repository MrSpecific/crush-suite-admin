import { prisma } from '@/lib/prisma';
import { Status } from '@prisma/client';
import { Badge, Box, Card, Flex, Grid, Heading, Text } from '@radix-ui/themes';
import { NotFound } from '@/app/components/NotFound';
import { PageLayout } from '@/app/components/PageLayout';
import { QuickDataList } from '@/app/components/QuickDataList';
import { LocalDateTime } from '@/app/components/LocalDateTime';
import { DataTable } from '@/app/components/DataTable';
import { ButtonLink } from '@/app/components/ButtonLink';
import { dateFormatter } from '@/lib/formatters';
import { RadixColor } from '@/types/radix-ui';
import { apiKeyScopeLabel } from '../scopes';

const merchantStatusColors: Record<Status, RadixColor> = {
  READY: 'green',
  INSTALLED: 'orange',
  REMOVED: 'gray',
  ERROR: 'red',
};

// Show only the last few characters; the copy button still copies the full key
const maskKey = (key: string) => `••••••••${key.slice(-4)}`;

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;

  const data = await prisma.apiAccess.findUnique({
    where: { id },
    include: { merchant: true },
  });

  if (!id || !data) return <NotFound message="API Key Not Found" />;

  const { merchant } = data;
  const merchantName =
    merchant.compliancePartnerAccountName || merchant.platformShopName || merchant.shop;

  const otherKeys = await prisma.apiAccess.findMany({
    where: { merchantId: data.merchantId, id: { not: id } },
    orderBy: { createdAt: 'desc' },
  });

  type DataHeaders = QueryToHeader<typeof otherKeys>[];

  const otherKeyHeaders: DataHeaders = [
    {
      id: 'scopes',
      title: 'Scopes',
      formatter: (scopes: string[]) => <ScopeBadges scopes={scopes} />,
    },
    { id: 'limit', title: 'Limit', formatter: (limit: number) => `${limit} / min` },
    { id: 'createdAt', title: 'Created At', formatter: dateFormatter },
    { type: 'actions', title: 'Actions' },
  ];

  return (
    <PageLayout
      heading={`API Key for ${merchantName}`}
      actions={[{ label: 'Edit', href: `/api-keys/${id}/edit` }]}
    >
      <Grid gap="4" columns={{ initial: '1', md: '2' }}>
        <Card>
          <Heading size="3" mb="3">
            Access
          </Heading>
          <QuickDataList
            data={[
              { label: 'ID', value: id, as: 'code', clipboard: true },
              { label: 'Rate Limit', value: `${data.limit} requests / minute` },
              {
                label: 'Scopes',
                children: <ScopeBadges scopes={data.scopes} />,
              },
              {
                label: 'Private Key',
                value: data.privateKey,
                valueDisplay: maskKey(data.privateKey),
                as: 'code',
                clipboard: true,
              },
              {
                label: 'Sandbox Key',
                value: data.sandboxKey,
                valueDisplay: data.sandboxKey ? maskKey(data.sandboxKey) : undefined,
                as: 'code',
                clipboard: true,
              },
              { label: 'Created At', children: <LocalDateTime value={data.createdAt} /> },
              { label: 'Updated At', children: <LocalDateTime value={data.updatedAt} /> },
            ]}
          />
        </Card>
        <Card>
          <Heading size="3" mb="3">
            Merchant
          </Heading>
          <QuickDataList
            data={[
              {
                label: 'Name',
                value: merchantName,
                linkTo: `/merchants/${merchant.id}`,
                bold: true,
              },
              { label: 'Merchant ID', value: merchant.id.toString() },
              {
                label: 'Shop',
                value: merchant.shop,
                linkTo: `//${merchant.shop}`,
                target: '_blank',
              },
              {
                label: 'Status',
                children: (
                  <Badge color={merchantStatusColors[merchant.status]} variant="soft">
                    {merchant.status}
                  </Badge>
                ),
              },
              { label: 'Compliance Partner', value: merchant.compliancePartner },
              { label: 'Platform', value: merchant.platform },
            ]}
          />
          {merchant.status === 'REMOVED' && (
            <Text as="p" size="2" color="orange" mt="3">
              This merchant has uninstalled the app.
            </Text>
          )}
        </Card>
      </Grid>

      {otherKeys.length > 0 && (
        <Box my="5">
          <Heading size="4" mb="2">
            Other API Keys for this Merchant ({otherKeys.length})
          </Heading>
          <DataTable headers={otherKeyHeaders} data={otherKeys} Actions={Actions} />
        </Box>
      )}
    </PageLayout>
  );
}

const ScopeBadges = ({ scopes }: { scopes: string[] }) =>
  scopes.length ? (
    <Flex gap="1" wrap="wrap">
      {scopes.map((scope) => (
        <Badge key={scope} variant="soft" color={scope.startsWith('write:') ? 'orange' : 'blue'}>
          {apiKeyScopeLabel(scope)}
        </Badge>
      ))}
    </Flex>
  ) : (
    <Text color="gray">None</Text>
  );

const Actions = ({ ...props }) => (
  <Flex gap="2">
    <ButtonLink href={`/api-keys/${props.id}`}>View</ButtonLink>
    <ButtonLink href={`/api-keys/${props.id}/edit`}>Edit</ButtonLink>
  </Flex>
);
