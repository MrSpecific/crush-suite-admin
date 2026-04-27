'use client';
import type { ReactNode } from 'react';
import NextLink from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Text } from '@radix-ui/themes';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from '@radix-ui/react-icons';
import { defaultTake } from '@/lib/queryPagination';
import styles from './Pagination.module.css';

type PaginationProps = {
  take?: number;
  count: number;
};

type PageSegment = number | 'gap';

export const Pagination = ({ take = defaultTake, count }: PaginationProps) => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const totalPages = Math.ceil(count / take);
  const page = Math.min(getCurrentPage(searchParams.get('page')), Math.max(totalPages, 1));
  const segments = getPageSegments(page, totalPages);
  const firstResult = (page - 1) * take + 1;
  const lastResult = Math.min(page * take, count);

  const pageUrl = (pageTarget: number) => {
    const params = new URLSearchParams(searchParams.toString());

    if (pageTarget <= 1) {
      params.delete('page');
    } else {
      params.set('page', pageTarget.toString());
    }

    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  if (totalPages < 1) {
    return (
      <nav className={styles.pagination} aria-label="Pagination">
        <Text size="2" color="gray">
          No results
        </Text>
      </nav>
    );
  }

  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <Text as="span" size="2" color="gray" className={styles.summary}>
        {firstResult}-{lastResult} of {count}
      </Text>

      <ol className={styles.segmentedControl}>
        <PaginationControl href={pageUrl(1)} disabled={page === 1} ariaLabel="First page">
          <DoubleArrowLeftIcon />
        </PaginationControl>
        <PaginationControl href={pageUrl(page - 1)} disabled={page === 1} ariaLabel="Previous page">
          <ChevronLeftIcon />
        </PaginationControl>

        {segments.map((segment, index) =>
          segment === 'gap' ? (
            <li className={styles.segment} key={`gap-${index}`}>
              <span className={styles.gap} aria-hidden="true">
                ...
              </span>
            </li>
          ) : (
            <li className={styles.segment} key={segment}>
              {segment === page ? (
                <span className={styles.currentPage} aria-current="page">
                  {segment}
                </span>
              ) : (
                <NextLink
                  className={styles.pageLink}
                  href={pageUrl(segment)}
                  aria-label={`Page ${segment}`}
                >
                  {segment}
                </NextLink>
              )}
            </li>
          )
        )}

        <PaginationControl
          href={pageUrl(page + 1)}
          disabled={page === totalPages}
          ariaLabel="Next page"
        >
          <ChevronRightIcon />
        </PaginationControl>
        <PaginationControl
          href={pageUrl(totalPages)}
          disabled={page === totalPages}
          ariaLabel="Last page"
        >
          <DoubleArrowRightIcon />
        </PaginationControl>
      </ol>
    </nav>
  );
};

const PaginationControl = ({
  href,
  disabled,
  ariaLabel,
  children,
}: {
  href: string;
  disabled: boolean;
  ariaLabel: string;
  children: ReactNode;
}) => {
  return (
    <li className={styles.segment}>
      {disabled ? (
        <span className={styles.disabledPageLink} aria-disabled="true" aria-label={ariaLabel}>
          {children}
        </span>
      ) : (
        <NextLink className={styles.pageLink} href={href} aria-label={ariaLabel}>
          {children}
        </NextLink>
      )}
    </li>
  );
};

const getCurrentPage = (value: string | null) => {
  const page = Number(value);

  return Number.isInteger(page) && page > 0 ? page : 1;
};

const getPageSegments = (page: number, totalPages: number): PageSegment[] => {
  if (totalPages <= 7) {
    return range(1, totalPages);
  }

  const pages = new Set<number>([1, totalPages, page - 1, page, page + 1]);

  if (page <= 4) {
    range(2, 5).forEach((value) => pages.add(value));
  }

  if (page >= totalPages - 3) {
    range(totalPages - 4, totalPages - 1).forEach((value) => pages.add(value));
  }

  const sortedPages = Array.from(pages)
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((a, b) => a - b);

  return sortedPages.reduce<PageSegment[]>((segments, currentPage, index) => {
    const previousPage = sortedPages[index - 1];

    if (previousPage && currentPage - previousPage > 1) {
      if (currentPage - previousPage === 2) {
        segments.push(previousPage + 1);
      } else {
        segments.push('gap');
      }
    }

    segments.push(currentPage);
    return segments;
  }, []);
};

const range = (start: number, end: number) => {
  const first = Math.max(start, 1);

  return Array.from({ length: Math.max(end - first + 1, 0) }, (_, index) => first + index);
};
