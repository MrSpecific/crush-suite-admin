import { prismaClubs } from '@/lib/prisma-clubs';
import { PageLayout } from '@/app/components/PageLayout';
import { QuickDataList } from '@/app/components/QuickDataList';
import { DataTable } from '@/app/components/DataTable';
import { NotFound } from '@/app/components/NotFound';
import { Badge, Box, Card, Grid, Heading, Text } from '@radix-ui/themes';
import { dateFormatter } from '@/lib/formatters';
import { ButtonLink } from '@/app/components/ButtonLink';
import { clubsMerchantStatusMetaData } from '@/lib/metaData';

const MerchantActions = ({ id }: { id: number }) => (
  <ButtonLink href={`/clubs/merchants/${id}`}>View</ButtonLink>
);

export default async function Page({ params }: { params: { id: string } }) {
  const planId = parseInt(params.id);
  if (isNaN(planId)) return <NotFound message="Billing plan not found" />;

  const plan = await prismaClubs.appBillingPlan.findUnique({
    where: { id: planId },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      name: true,
      description: true,
      notes: true,
      type: true,
      price: true,
      currencyCode: true,
      trialDays: true,
      perUsePrice: true,
      perUseThreshold: true,
      perUseCap: true,
      perUseUnits: true,
      perUseTerms: true,
      // accessibleStores: true,
      merchants: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          shop: true,
          platformShopName: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  if (!plan) return <NotFound message="Billing plan not found" />;

  const merchantHeaders = [
    { id: 'shop', title: 'Shop' },
    { id: 'platformShopName', title: 'Name', formatter: (v: string | null) => v ?? '—' },
    {
      id: 'status',
      title: 'Status',
      formatter: (value: string) => {
        const meta = clubsMerchantStatusMetaData[
          value as keyof typeof clubsMerchantStatusMetaData
        ] ?? { label: value, color: 'gray' };
        return (
          <Badge color={meta.color} variant="soft">
            {meta.label}
          </Badge>
        );
      },
    },
    { id: 'createdAt', title: 'Joined', formatter: dateFormatter },
    { type: 'actions' as const, title: 'Actions' },
  ];

  return (
    <PageLayout
      heading={plan.name}
      actions={[
        {
          label: 'Back to Billing Plans',
          href: '/clubs/billing-plans',
          variant: 'soft',
          color: 'gray',
        },
      ]}
    >
      <Grid columns={{ initial: '1', md: '2' }} gap="4" mb="6">
        <Card>
          <Heading size="3" mb="3">
            Plan Details
          </Heading>
          <QuickDataList
            data={[
              { label: 'Type', value: plan.type },
              { label: 'Price', value: `$${plan.price.toFixed(2)} / mo` },
              { label: 'Currency', value: plan.currencyCode },
              {
                label: 'Trial Days',
                value: plan.trialDays > 0 ? plan.trialDays.toString() : 'None',
              },
              { label: 'Description', value: plan.description },
              { label: 'Notes', value: plan.notes },
              { label: 'Created', value: dateFormatter(plan.createdAt) },
              { label: 'Updated', value: dateFormatter(plan.updatedAt) },
            ]}
          />
        </Card>

        <Card>
          <Heading size="3" mb="3">
            Usage Billing
          </Heading>
          <QuickDataList
            data={[
              {
                label: 'Per-Use Rate',
                value:
                  plan.perUseUnits === 'percent'
                    ? `${(plan.perUsePrice * 100).toFixed(2)}%`
                    : `$${plan.perUsePrice.toFixed(2)}`,
              },
              { label: 'Units', value: plan.perUseUnits },
              {
                label: 'Threshold',
                value: plan.perUseThreshold > 0 ? `$${plan.perUseThreshold.toFixed(2)}` : 'None',
              },
              {
                label: 'Cap',
                value:
                  plan.perUseCap > 0
                    ? `$${plan.perUseCap.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : 'None',
              },
              { label: 'Terms', value: plan.perUseTerms },
              // {
              //   label: 'Accessible Stores',
              //   value:
              //     plan.accessibleStores.length > 0
              //       ? plan.accessibleStores.join(', ')
              //       : 'All stores',
              // },
            ]}
          />
        </Card>
      </Grid>

      <Box>
        <Heading size="4" mb="3">
          Merchants on this plan ({plan.merchants.length})
        </Heading>
        {plan.merchants.length > 0 ? (
          <DataTable headers={merchantHeaders} data={plan.merchants} Actions={MerchantActions} />
        ) : (
          <Text color="gray" size="2">
            No merchants on this plan.
          </Text>
        )}
      </Box>
    </PageLayout>
  );
}
