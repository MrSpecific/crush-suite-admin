import { prismaClubs } from '@/lib/prisma-clubs';
import { PageLayout } from '@/app/components/PageLayout';
import { DataTable } from '@/app/components/DataTable';
import { dateFormatter } from '@/lib/formatters';
import { Badge } from '@radix-ui/themes';
import { ButtonLink } from '@/app/components/ButtonLink';
import type { RadixColor } from '@/types/radix-ui';

const billingTypeColor: Record<string, RadixColor> = {
  monthly: 'blue',
  percentage: 'purple',
  oneTime: 'gray',
};

const Actions = ({ id }: { id: number }) => (
  <ButtonLink href={`/clubs/billing-plans/${id}`}>View</ButtonLink>
);

export default async function Page() {
  const plans = await prismaClubs.appBillingPlan.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      type: true,
      price: true,
      trialDays: true,
      currencyCode: true,
      createdAt: true,
      _count: { select: { merchants: true } },
    },
  });

  const headers = [
    { id: 'name', title: 'Name' },
    {
      id: 'type',
      title: 'Type',
      formatter: (value: string) => (
        <Badge color={billingTypeColor[value] ?? 'gray'} variant="soft">
          {value}
        </Badge>
      ),
    },
    {
      id: 'price',
      title: 'Price',
      formatter: (value: number) => `$${value.toFixed(2)}`,
    },
    {
      id: 'trialDays',
      title: 'Trial Days',
      formatter: (value: number) => (value > 0 ? value.toString() : '—'),
    },
    {
      id: '_count',
      title: 'Merchants',
      formatter: (value: { merchants: number }) => value.merchants.toString(),
    },
    { id: 'createdAt', title: 'Created', formatter: dateFormatter },
    { type: 'actions' as const, title: 'Actions' },
  ];

  return (
    <PageLayout heading="Billing Plans">
      <DataTable headers={headers} data={plans} Actions={Actions} />
    </PageLayout>
  );
}
