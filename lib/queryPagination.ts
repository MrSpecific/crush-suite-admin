export const defaultTake = 20;

export const queryPagination = ({
  page,
  take = defaultTake,
}: {
  page?: number | string | string[];
  take?: number;
}) => {
  return {
    take,
    skip: page && Number(page) > 0 ? (Number(page) - 1) * take : 0,
  };
};
