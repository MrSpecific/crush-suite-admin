import { Flex, Text, Skeleton } from '@radix-ui/themes';

export const LoadingSkeleton = () => {
  return (
    <Flex direction="column" gap="3">
      <Text>
        <Skeleton>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque felis tellus,
          efficitur id convallis a, viverra eget libero. Nam magna erat, fringilla sed commodo sed,
          aliquet nec magna.
        </Skeleton>
      </Text>

      <Skeleton>
        <Text>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque felis tellus,
          efficitur id convallis a, viverra eget libero. Nam magna erat, fringilla sed commodo sed,
          aliquet nec magna.
        </Text>
      </Skeleton>
    </Flex>
  );
};
