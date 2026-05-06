import { prisma } from '@/lib/prisma';
import { prismaClubs } from '@/lib/prisma-clubs';
import { Badge, Box, Card, Flex, Grid, Heading, Separator, Text } from '@radix-ui/themes';
import { Link } from '@/app/components/Link';
import { ButtonLink } from '@/app/components/ButtonLink';
import { dateFormatter } from '@/lib/formatters';
import { clubStatusMetaData } from '@/lib/metaData';
import type { RadixColor } from '@/types/radix-ui';

export default async function Home() {
  const [
    totalMerchants,
    activeMerchants,
    errorMerchants,
    pendingGdpr,
    recentMerchants,
    totalClubs,
    publishedClubs,
    activeMembers,
    recentClubs,
  ] = await Promise.all([
    prisma.merchant.count(),
    prisma.merchant.count({ where: { status: 'READY' } }),
    prisma.merchant.count({ where: { status: 'ERROR' } }),
    prisma.gDPR.count({ where: { completed: false } }),
    prisma.merchant.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        shop: true,
        compliancePartnerAccountName: true,
        status: true,
        createdAt: true,
      },
    }),
    prismaClubs.club.count(),
    prismaClubs.club.count({ where: { status: 'published' } }),
    prismaClubs.membership.count({ where: { status: 'ACTIVE' } }),
    prismaClubs.club.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        merchantId: true,
        name: true,
        status: true,
        clubType: true,
        createdAt: true,
        merchant: { select: { platformShopName: true, shop: true } },
      },
    }),
  ]);

  const needsAttention = errorMerchants > 0 || pendingGdpr > 0;

  return (
    <main>
      <Box p="6">
        <Flex justify="between" align="baseline" mb="6">
          <Heading as="h1" size="7">
            Dashboard
          </Heading>
          <Text size="2" color="gray">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </Flex>

        {needsAttention && (
          <Card mb="6" style={{ borderLeft: '3px solid var(--red-9)' }}>
            <Flex align="center" gap="4" wrap="wrap">
              <Text size="2" weight="bold" color="red">
                Needs Attention
              </Text>
              {errorMerchants > 0 && (
                <Link href="/merchants?status=ERROR">
                  <Badge color="red" variant="soft">
                    {errorMerchants} merchant{errorMerchants !== 1 ? 's' : ''} in ERROR
                  </Badge>
                </Link>
              )}
              {pendingGdpr > 0 && (
                <Link href="/gdpr">
                  <Badge color="orange" variant="soft">
                    {pendingGdpr} pending GDPR request{pendingGdpr !== 1 ? 's' : ''}
                  </Badge>
                </Link>
              )}
            </Flex>
          </Card>
        )}

        <Grid columns={{ initial: '1', md: '2' }} gap="6">
          {/* Compliance section */}
          <Box>
            <Flex align="center" justify="between" mb="3">
              <Heading size="4">Compliance</Heading>
              <ButtonLink href="/merchants" variant="ghost" size="1" color="gray">
                View merchants →
              </ButtonLink>
            </Flex>
            <Grid columns="2" gap="3" mb="4">
              <StatCard value={totalMerchants} label="Total Merchants" href="/merchants" />
              <StatCard
                value={activeMerchants}
                label="Active"
                color="green"
                href="/merchants?status=READY"
              />
              <StatCard
                value={errorMerchants}
                label="Errors"
                color={errorMerchants > 0 ? 'red' : 'gray'}
                href="/merchants?status=ERROR"
              />
              <StatCard
                value={pendingGdpr}
                label="Pending GDPR"
                color={pendingGdpr > 0 ? 'orange' : 'gray'}
                href="/gdpr"
              />
            </Grid>

            <Separator size="4" mb="3" />
            <Flex align="center" justify="between" mb="2">
              <Heading size="2" color="gray">
                Recently Added Merchants
              </Heading>
              <ButtonLink href="/merchants" variant="ghost" size="1" color="gray">
                View more →
              </ButtonLink>
            </Flex>
            <Flex direction="column" gap="2">
              {recentMerchants.map((m) => (
                <RecentItem
                  key={m.id}
                  href={`/merchants/${m.id}`}
                  primary={m.compliancePartnerAccountName ?? m.shop}
                  secondary={m.shop}
                  date={m.createdAt}
                  status={m.status}
                  statusColor={merchantStatusColor(m.status)}
                />
              ))}
            </Flex>
          </Box>

          {/* Clubs section */}
          <Box>
            <Flex align="center" justify="between" mb="3">
              <Heading size="4">Clubs</Heading>
              <ButtonLink href="/clubs/all" variant="ghost" size="1" color="gray">
                View all clubs →
              </ButtonLink>
            </Flex>
            <Grid columns="3" gap="3" mb="4">
              <StatCard value={totalClubs} label="Total Clubs" href="/clubs/all" />
              <StatCard
                value={publishedClubs}
                label="Published"
                color="green"
                href="/clubs/all"
              />
              <StatCard value={activeMembers} label="Active Members" color="blue" />
            </Grid>

            <Separator size="4" mb="3" />
            <Heading size="2" color="gray" mb="2">
              Recently Added Clubs
            </Heading>
            <Flex direction="column" gap="2">
              {recentClubs.map((c) => (
                <RecentItem
                  key={c.id}
                  href={`/clubs/merchants/${c.merchantId}/clubs/${c.id}`}
                  primary={c.name}
                  secondary={c.merchant.platformShopName ?? c.merchant.shop}
                  date={c.createdAt}
                  status={clubStatusLabel(c.status)}
                  statusColor={clubStatusColor(c.status)}
                />
              ))}
              {recentClubs.length === 0 && (
                <Text size="2" color="gray">
                  No clubs yet.
                </Text>
              )}
            </Flex>
          </Box>
        </Grid>
      </Box>
    </main>
  );
}

const StatCard = ({
  value,
  label,
  color,
  href,
}: {
  value: number;
  label: string;
  color?: RadixColor;
  href?: string;
}) => {
  const content = (
    <Card style={{ cursor: href ? 'pointer' : 'default' }}>
      <Text
        as="div"
        size="7"
        weight="bold"
        color={color}
        style={{ lineHeight: 1, marginBottom: 4 }}
      >
        {value.toLocaleString()}
      </Text>
      <Text as="div" size="1" color="gray">
        {label}
      </Text>
    </Card>
  );

  return href ? <Link href={href} style={{ textDecoration: 'none' }}>{content}</Link> : content;
};

const RecentItem = ({
  href,
  primary,
  secondary,
  date,
  status,
  statusColor,
}: {
  href: string;
  primary: string;
  secondary?: string | null;
  date: Date;
  status: string;
  statusColor: RadixColor;
}) => (
  <Link href={href} style={{ textDecoration: 'none' }}>
    <Card size="1">
      <Flex justify="between" align="center" gap="2">
        <Box style={{ minWidth: 0 }}>
          <Text
            as="div"
            size="2"
            weight="medium"
            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {primary}
          </Text>
          {secondary && primary !== secondary && (
            <Text
              as="div"
              size="1"
              color="gray"
              style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {secondary}
            </Text>
          )}
        </Box>
        <Flex align="center" gap="2" flexShrink="0">
          <Badge color={statusColor} variant="soft" size="1">
            {status}
          </Badge>
          <Text size="1" color="gray">
            {dateFormatter(date)}
          </Text>
        </Flex>
      </Flex>
    </Card>
  </Link>
);

const merchantStatusColor = (status: string): RadixColor => {
  const map: Record<string, RadixColor> = {
    READY: 'green',
    INSTALLED: 'orange',
    REMOVED: 'gray',
    ERROR: 'red',
  };
  return map[status] ?? 'gray';
};

const clubStatusColor = (status: string): RadixColor => {
  return clubStatusMetaData[status as keyof typeof clubStatusMetaData]?.color ?? 'gray';
};

const clubStatusLabel = (status: string): string => {
  return clubStatusMetaData[status as keyof typeof clubStatusMetaData]?.label ?? status;
};
