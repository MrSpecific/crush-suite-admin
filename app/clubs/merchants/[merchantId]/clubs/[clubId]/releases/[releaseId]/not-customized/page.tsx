import { prismaClubs } from '@/lib/prisma-clubs';
import { PageLayout } from '@/app/components/PageLayout';
import { DataTable } from '@/app/components/DataTable';
import { DataFilter } from '@/app/components/DataFilter';
import { Pagination } from '@/app/components/Pagination';
import { NotFound } from '@/app/components/NotFound';
import { queryPagination } from '@/lib/queryPagination';
import { Text } from '@radix-ui/themes';
import {
  getMembersWithoutOrderWhere,
  getReleaseForList,
  memberWithoutOrderHeaders,
  MemberWithoutOrderActions,
  memberWithoutOrderSelect,
  releasePath,
  toMemberWithoutOrderRows,
} from '../releaseLists';

export default async function Page(
  props: {
    params: Promise<{ merchantId: string; clubId: string; releaseId: string }>;
    searchParams: Promise<PageSearchParams>;
  }
) {
  const params = await props.params;
  const { page, search } = await props.searchParams;
  const merchantId = parseInt(params.merchantId);
  const { clubId, releaseId } = params;

  const release = await getReleaseForList(merchantId, clubId, releaseId);
  if (!release) return <NotFound message="Release not found" />;

  const where = getMembersWithoutOrderWhere(release, search?.toString().trim());
  const count = await prismaClubs.membership.count({ where });
  const memberships = await prismaClubs.membership.findMany({
    ...queryPagination({ page, count }),
    where,
    orderBy: { joinedAt: 'asc' },
    select: memberWithoutOrderSelect,
  });

  const merchantName = release.club.merchant.platformShopName ?? release.club.merchant.shop;

  return (
    <PageLayout
      heading={`${release.name} — Not Yet Customized`}
      subheading={`${release.club.name} · ${merchantName}`}
      actions={[
        {
          label: 'Back to Release',
          href: releasePath(merchantId, clubId, releaseId),
          variant: 'soft',
          color: 'gray',
        },
      ]}
    >
      <Text as="p" size="2" color="gray" mb="3">
        Active members who have not customized or been given an order for this release.
      </Text>
      <DataFilter />
      <DataTable
        headers={memberWithoutOrderHeaders}
        data={toMemberWithoutOrderRows(memberships)}
        Actions={MemberWithoutOrderActions}
      />
      <Pagination count={count} />
    </PageLayout>
  );
}
