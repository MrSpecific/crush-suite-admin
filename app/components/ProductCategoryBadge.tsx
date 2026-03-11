import type { ProductCategory } from '@prisma/client';
import { productCategoryMetaData } from '@/lib/metaData';
import { Badge } from '@radix-ui/themes';

export const ProductCategoryBadge = ({ type }: { type: ProductCategory }) => {
  const meta = productCategoryMetaData[type];

  if (!meta) return null;

  return (
    <Badge color={meta.color} size="2" variant="soft">
      {meta.label}
    </Badge>
  );
};
