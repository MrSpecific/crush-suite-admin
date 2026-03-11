'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Flex } from '@radix-ui/themes';
import { Link } from '@/app/components/Link';
import { defaultTake } from '@/lib/queryPagination';

export const Pagination = ({ take = defaultTake, count }: { take?: number; count: number }) => {
  const searchParams = useSearchParams();
  // const { page: searchPage, search } = searchParams;
  const page: number = Number(searchParams.get('page')) || 1;
  const totalPages = Math.ceil(count / take);
  const params = new URLSearchParams(searchParams.toString());

  const pageUrl = (pageTarget: number) => {
    params.set('page', pageTarget.toString());
    return `?${params.toString()}`;
  };

  return (
    <Flex align="center" justify="center" gap="2">
      {page > 1 && (
        <Link href={pageUrl(page - 1)} style={{ textDecoration: 'none' }}>
          Previous
        </Link>
      )}
      <span>{totalPages > 0 ? `${page} of ${totalPages}` : 'No results'}</span>
      {page < totalPages && (
        <Link href={pageUrl(page + 1)} style={{ textDecoration: 'none' }}>
          Next
        </Link>
      )}
    </Flex>
  );
};
