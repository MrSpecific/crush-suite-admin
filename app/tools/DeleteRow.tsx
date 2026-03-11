'use client';
import React, { useState } from 'react';
import { Flex, Button, AlertDialog, Text } from '@radix-ui/themes';
import { useRouter } from 'next/navigation';
import { deleteRow, type DeleteRows } from './deleteRow.server';

export const DeleteRow = ({
  id,
  type,
  onDelete = () => {},
  redirectTo,
  session,
}: {
  id: string | number;
  type: DeleteRows;
  onDelete?: () => void;
  redirectTo?: string;
  session?: MaybeSession;
}) => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setLoading(true);
    const result = await deleteRow({ id, type });
    console.log(result);
    setLoading(false);
    onDelete();

    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.back();
    }
  };

  // if (session && !authorize({ session, role: 'ADMIN' }).authorized) return null;

  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger>
        <Button color="red" loading={loading} variant="soft">
          Delete
        </Button>
      </AlertDialog.Trigger>
      <AlertDialog.Content style={{ maxWidth: 450 }}>
        <AlertDialog.Title>Delete this {type}</AlertDialog.Title>
        <AlertDialog.Description size="2">
          Are you sure you want to delete this {type}?
          <br />
          <Text weight="bold">This can&apos;t be un-done.</Text>
        </AlertDialog.Description>

        <Flex gap="3" mt="4" justify="end">
          <AlertDialog.Cancel>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </AlertDialog.Cancel>
          <AlertDialog.Action>
            <Button variant="solid" color="red" onClick={handleDelete} loading={loading}>
              Delete
            </Button>
          </AlertDialog.Action>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
};
