import { Button, Dialog, Flex } from '@radix-ui/themes';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

type EditDialogProps = {
  trigger?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
};

export const EditDialog = ({ trigger = 'Edit', title, description, children }: EditDialogProps) => {
  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <Button>{trigger}</Button>
      </Dialog.Trigger>

      <Dialog.Content maxWidth="450px">
        <Dialog.Title>{title}</Dialog.Title>

        {description && (
          <Dialog.Description size="2" mb="4">
            {description}
          </Dialog.Description>
        )}

        {children}

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
          <Dialog.Close>
            <Button>Save</Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};
