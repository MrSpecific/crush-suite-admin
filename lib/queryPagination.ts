export const defaultTake = 20;

type PageParam = number | string | string[] | undefined;

export const queryPagination = ({
  page,
  take = defaultTake,
  count,
}: {
  page?: PageParam;
  take?: number;
  count?: number;
}) => {
  const pageNumber = getPageNumber(page);
  const totalPages =
    typeof count === 'number' && take > 0 ? Math.max(Math.ceil(count / take), 1) : undefined;
  const currentPage = totalPages ? Math.min(pageNumber, totalPages) : pageNumber;

  return {
    take,
    skip: (currentPage - 1) * take,
  };
};

const getPageNumber = (page: PageParam) => {
  const value = Array.isArray(page) ? page[0] : page;
  const pageNumber = Number(value);

  return Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1;
};
