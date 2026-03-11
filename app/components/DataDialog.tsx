import { Button, Dialog, Flex, IconButton } from '@radix-ui/themes';
import { TokensIcon } from '@radix-ui/react-icons';

export const DataDialog = ({ title = 'data', data }: { title?: string; data: any }) => {
  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <IconButton variant="ghost">
          <TokensIcon />
        </IconButton>
      </Dialog.Trigger>

      <Dialog.Content maxWidth="800px">
        <Dialog.Title>{title}</Dialog.Title>

        <pre>{JSON.stringify(data, null, 2)}</pre>

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Close
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};
