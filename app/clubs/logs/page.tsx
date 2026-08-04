import { prismaClubs } from '@/lib/prisma-clubs';
import { PageLayout } from '@/app/components/PageLayout';
import { ButtonLink } from '@/app/components/ButtonLink';
import { Card, Flex, Grid, Heading, Text } from '@radix-ui/themes';

const logSections = [
  {
    href: '/clubs/logs/usage-billing',
    title: 'Usage Billing',
    description:
      'Platform usage fees charged to merchants via Shopify App Events — the ledger behind our revenue and the reconciliation CRON.',
  },
  {
    href: '/clubs/logs/reprocess',
    title: 'Reprocess Log',
    description:
      "Audit trail of merchant-triggered \"Reprocess release\" runs, including re-driven billing attempts against members' saved cards.",
  },
];

export default async function Page() {
  const [usageBillingIssues, reprocessCount] = await Promise.all([
    prismaClubs.usageBillingRecord.count({ where: { status: { in: ['FAILED', 'REJECTED'] } } }),
    prismaClubs.releaseReprocessLog.count(),
  ]);

  const counts: Record<string, { label: string; value: number; color?: 'red' } | undefined> = {
    '/clubs/logs/usage-billing':
      usageBillingIssues > 0
        ? { label: `${usageBillingIssues} needs attention`, value: usageBillingIssues, color: 'red' }
        : undefined,
    '/clubs/logs/reprocess': { label: `${reprocessCount} total`, value: reprocessCount },
  };

  return (
    <PageLayout heading="Logs">
      <Grid columns={{ initial: '1', md: '2' }} gap="4">
        {logSections.map((section) => {
          const count = counts[section.href];

          return (
            <Card key={section.href}>
              <Flex direction="column" gap="2" height="100%">
                <Flex justify="between" align="start">
                  <Heading size="4">{section.title}</Heading>
                  {count && (
                    <Text size="1" color={count.color ?? 'gray'} weight="bold">
                      {count.label}
                    </Text>
                  )}
                </Flex>
                <Text size="2" color="gray" style={{ flexGrow: 1 }}>
                  {section.description}
                </Text>
                <Flex justify="end">
                  <ButtonLink href={section.href} variant="soft">
                    View
                  </ButtonLink>
                </Flex>
              </Flex>
            </Card>
          );
        })}
      </Grid>
    </PageLayout>
  );
}
