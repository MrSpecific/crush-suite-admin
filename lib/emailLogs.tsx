import { Badge } from '@radix-ui/themes';
import { prismaClubs } from '@/lib/prisma-clubs';
import { Prisma, type CustomerEmailType, type MerchantEmailType } from '@/generated/prisma/clubs';
import { customerEmailTypeMetaData, merchantEmailTypeMetaData } from '@/lib/metaData';
import { dateTimeFormatter } from '@/lib/formatters';

export type CustomerEmailLogRow = {
  id: string;
  emailType: CustomerEmailType;
  sentTo: string;
  success: boolean;
  retryable: boolean | null;
  error: string | null;
  sendCount: number;
  releaseName: string | null;
  createdAt: Date;
  lastSentAt: Date;
};

type ClubCustomerEmailLogFilters = {
  shop: string;
  clubId: string;
  emailType?: string;
  success?: boolean;
  search?: string;
};

// CustomerEmailLog has no club FK — it's keyed by shop, and the worker stamps
// one of clubId / membershipId / releaseOrderId into `metadata` depending on
// the email type. Resolve those back to this club.
const getClubCustomerEmailLogWhere = ({
  shop,
  clubId,
  emailType,
  success,
  search,
}: ClubCustomerEmailLogFilters) => {
  const conditions = [
    Prisma.sql`l."shop" = ${shop}`,
    Prisma.sql`(
      l."metadata"->>'clubId' = ${clubId}
      OR l."metadata"->>'membershipId' IN (SELECT m."id" FROM "Membership" m WHERE m."clubId" = ${clubId})
      OR l."metadata"->>'releaseOrderId' IN (
        SELECT ro."id" FROM "ReleaseOrder" ro
        JOIN "Release" r ON r."id" = ro."releaseId"
        WHERE r."clubId" = ${clubId}
      )
    )`,
  ];

  if (emailType && emailType in customerEmailTypeMetaData) {
    conditions.push(Prisma.sql`l."emailType"::text = ${emailType}`);
  }

  if (typeof success === 'boolean') {
    conditions.push(Prisma.sql`l."success" = ${success}`);
  }

  if (search) {
    conditions.push(Prisma.sql`l."sentTo" ILIKE ${`%${search}%`}`);
  }

  return Prisma.join(conditions, ' AND ');
};

export const getClubCustomerEmailLogs = async ({
  take,
  skip = 0,
  ...filters
}: ClubCustomerEmailLogFilters & { take: number; skip?: number }) => {
  const where = getClubCustomerEmailLogWhere(filters);

  return prismaClubs.$queryRaw<CustomerEmailLogRow[]>`
    SELECT
      l."id",
      l."emailType",
      l."sentTo",
      l."success",
      l."retryable",
      l."error",
      l."sendCount",
      l."metadata"->>'releaseName' AS "releaseName",
      l."createdAt",
      l."lastSentAt"
    FROM "CustomerEmailLog" l
    WHERE ${where}
    ORDER BY l."lastSentAt" DESC
    LIMIT ${take} OFFSET ${skip}
  `;
};

export const countClubCustomerEmailLogs = async (filters: ClubCustomerEmailLogFilters) => {
  const where = getClubCustomerEmailLogWhere(filters);
  const [{ count }] = await prismaClubs.$queryRaw<{ count: number }[]>`
    SELECT COUNT(*)::int AS "count"
    FROM "CustomerEmailLog" l
    WHERE ${where}
  `;

  return count;
};

const failedBadge = (retryable: boolean | null) => (
  <Badge color={retryable === false ? 'red' : 'orange'} variant="soft" size="1">
    {retryable === false ? 'Failed' : 'Failed (retrying)'}
  </Badge>
);

const sentBadge = (
  <Badge color="green" variant="soft" size="1">
    Sent
  </Badge>
);

export const emailStatusFilterOptions = [
  { label: 'Sent', value: 'sent' },
  { label: 'Failed', value: 'failed' },
];

export const parseEmailStatusFilter = (status?: string | string[]) =>
  status === 'sent' ? true : status === 'failed' ? false : undefined;

export const merchantEmailLogHeaders = [
  {
    id: 'emailType',
    title: 'Type',
    formatter: (v: MerchantEmailType) => {
      const meta = merchantEmailTypeMetaData[v] ?? { label: v, color: 'gray' };
      return (
        <Badge color={meta.color} variant="soft" size="1">
          {meta.label}
        </Badge>
      );
    },
  },
  { id: 'sentTo', title: 'Sent To' },
  {
    id: 'success',
    title: 'Status',
    formatter: (v: boolean, row: { retryable: boolean | null }) =>
      v ? sentBadge : failedBadge(row.retryable),
  },
  { id: 'error', title: 'Error', formatter: (v: string | null) => v ?? '—' },
  { id: 'createdAt', title: 'Sent At', formatter: dateTimeFormatter },
];

export const customerEmailLogHeaders = [
  {
    id: 'emailType',
    title: 'Type',
    formatter: (v: CustomerEmailType) => {
      const meta = customerEmailTypeMetaData[v] ?? { label: v, color: 'gray' };
      return (
        <Badge color={meta.color} variant="soft" size="1">
          {meta.label}
        </Badge>
      );
    },
  },
  { id: 'sentTo', title: 'Sent To' },
  { id: 'releaseName', title: 'Release', formatter: (v: string | null) => v ?? '—' },
  {
    id: 'success',
    title: 'Status',
    formatter: (v: boolean, row: { retryable: boolean | null }) =>
      v ? sentBadge : failedBadge(row.retryable),
  },
  { id: 'error', title: 'Error', formatter: (v: string | null) => v ?? '—' },
  { id: 'sendCount', title: 'Sends', formatter: (v: number) => v.toString() },
  { id: 'lastSentAt', title: 'Last Sent', formatter: dateTimeFormatter },
];

// Email logs are keyed by shop, not merchant id — resolve ids for linking.
export const getMerchantIdsByShop = async (shops: string[]) => {
  const merchants = await prismaClubs.merchant.findMany({
    where: { shop: { in: [...new Set(shops)] } },
    select: { id: true, shop: true },
  });

  return new Map(merchants.map((m) => [m.shop, m.id]));
};

export const shopHeader = {
  id: 'shop',
  title: 'Shop',
  href: (_v: string, row: { merchantId?: number }) =>
    row.merchantId ? `/clubs/merchants/${row.merchantId}` : undefined,
};
