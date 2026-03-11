import { Flex, Badge, DataList, Text, Code, Tooltip } from '@radix-ui/themes';
import type { BadgeProps } from '@radix-ui/themes';
import { ClipboardCopy } from '@/app/components/ClipboardCopy';
import { Link } from '@/app/components/Link';
import { QuestionMarkCircledIcon } from '@radix-ui/react-icons';

export type DataListItem = {
  id?: string;
  label?: string;
  value?: string | null;
  valueDisplay?: string;
  children?: React.ReactNode;
  badge?: boolean;
  as?: 'badge' | 'code' | 'text';
  bold?: boolean;
  clipboard?: boolean;
  linkTo?: string;
  target?: '_blank' | '_self';
  tooltip?: string;
} & Pick<BadgeProps, 'color' | 'size'>;

export const DataListItem = ({ item }: { item: DataListItem }) => {
  const {
    label,
    value,
    children,
    valueDisplay,
    badge,
    as,
    bold,
    color,
    size,
    clipboard,
    linkTo,
    target,
    tooltip,
  } = item;

  if (!label || (!value && !children)) return null;

  const itemValue = children || valueDisplay || value;

  const Item = (
    <Text color={color || undefined} weight={bold ? 'bold' : undefined} size={size || undefined}>
      {badge || as === 'badge' ? (
        <Badge>{itemValue}</Badge>
      ) : as === 'code' ? (
        <Code>{itemValue}</Code>
      ) : (
        itemValue
      )}
    </Text>
  );

  return (
    <DataList.Item>
      <DataList.Label width="auto" minWidth="0">
        {label}
      </DataList.Label>
      <DataList.Value>
        <Flex align="center" gap="2">
          {linkTo ? (
            <Link href={linkTo} target={target}>
              {Item}
            </Link>
          ) : (
            Item
          )}
          {tooltip && (
            <Tooltip content={tooltip}>
              <QuestionMarkCircledIcon />
            </Tooltip>
          )}
          {clipboard && <ClipboardCopy text={value} />}
        </Flex>
      </DataList.Value>
    </DataList.Item>
  );
};

export const QuickDataList = ({
  data,
  children,
  size,
  ...props
}: {
  data: DataListItem[];
  children?: React.ReactNode;
  size?: ComponentProps<typeof DataList.Root>['size'];
  props?: {};
}) => {
  return (
    <DataList.Root size={size}>
      {data.map((item, i) => (
        <DataListItem key={item.id || `${i}-${item?.label}`} item={item} />
      ))}
      {children}
    </DataList.Root>
  );
};

QuickDataList.Item = DataListItem;
