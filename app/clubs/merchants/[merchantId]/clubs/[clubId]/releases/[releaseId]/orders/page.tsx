import { prismaClubs } from '@/lib/prisma-clubs';
import { PageLayout } from '@/app/components/PageLayout';
import { DataTable } from '@/app/components/DataTable';
import { DataFilter } from '@/app/components/DataFilter';
import { Pagination } from '@/app/components/Pagination';
import { NotFound } from '@/app/components/NotFound';
import { queryPagination } from '@/lib/queryPagination';
import {
  getReleaseForList,
  getReleaseOrderWhere,
  releaseOrderHeaders,
  ReleaseOrderActions,
  releaseOrderSelect,
  releasePath,
  toReleaseOrderRows,
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

  const where = getReleaseOrderWhere(releaseId, search?.toString().trim());
  const count = await prismaClubs.releaseOrder.count({ where });
  const orders = await prismaClubs.releaseOrder.findMany({
    ...queryPagination({ page, count }),
    where,
    orderBy: { createdAt: 'desc' },
    select: releaseOrderSelect,
  });

  const backHref = releasePath(merchantId, clubId, releaseId);
  const merchantName = release.club.merchant.platformShopName ?? release.club.merchant.shop;

  return (
    <PageLayout
      heading={`${release.name} — Orders`}
      subheading={`${release.club.name} · ${merchantName}`}
      actions={[{ label: 'Back to Release', href: backHref, variant: 'soft', color: 'gray' }]}
    >
      <DataFilter />
      <DataTable
        headers={releaseOrderHeaders}
        data={toReleaseOrderRows(orders, backHref)}
        Actions={ReleaseOrderActions}
      />
      <Pagination count={count} />
    </PageLayout>
  );
}
