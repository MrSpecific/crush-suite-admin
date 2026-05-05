'use server';

import { prismaClubs } from '@/lib/prisma-clubs';
import { revalidatePath } from 'next/cache';
import { PageLayout } from '@/app/components/PageLayout';
import { Badge, Box, Card, Flex, Switch, Text } from '@radix-ui/themes';

async function toggleFlag(id: number, currentValue: boolean) {
  'use server';
  await prismaClubs.featureFlag.update({
    where: { id },
    data: { enabled: !currentValue },
  });
  revalidatePath('/clubs/feature-flags');
}

export default async function Page() {
  const flags = await prismaClubs.featureFlag.findMany({
    orderBy: { key: 'asc' },
    select: { id: true, key: true, enabled: true, description: true, updatedAt: true },
  });

  return (
    <PageLayout heading="Feature Flags">
      <Flex direction="column" gap="3">
        {flags.length === 0 && (
          <Text color="gray" size="2">No feature flags configured.</Text>
        )}
        {flags.map((flag) => (
          <Card key={flag.id}>
            <Flex justify="between" align="center" gap="4">
              <Box>
                <Flex align="center" gap="2" mb="1">
                  <Text size="2" weight="bold">{flag.key}</Text>
                  <Badge
                    color={flag.enabled ? 'green' : 'gray'}
                    variant="soft"
                    size="1"
                  >
                    {flag.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </Flex>
                {flag.description && (
                  <Text size="1" color="gray">{flag.description}</Text>
                )}
              </Box>
              <form action={toggleFlag.bind(null, flag.id, flag.enabled)}>
                <Switch
                  type="submit"
                  checked={flag.enabled}
                  color={flag.enabled ? 'green' : 'gray'}
                  style={{ cursor: 'pointer' }}
                />
              </form>
            </Flex>
          </Card>
        ))}
      </Flex>
    </PageLayout>
  );
}
