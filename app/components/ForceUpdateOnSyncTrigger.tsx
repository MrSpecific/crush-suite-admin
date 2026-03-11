'use client';
import { useState } from 'react';
import { Button, Box, Flex, Text, AlertDialog } from '@radix-ui/themes';
import { ExclamationTriangleIcon, HeartFilledIcon } from '@radix-ui/react-icons';
import { forceUpdateOnSync } from '@/app/components/forceUpdateOnSync.server';

export const ForceUpdateOnSyncTrigger = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    const result = await forceUpdateOnSync();
    if (result.success) setSuccess(true);
    if (!result.success) {
      setSuccess(false);
      setError(true);
    }
    setLoading(false);
  };

  return (
    <Box>
      <AlertDialog.Root>
        <AlertDialog.Trigger>
          <Button color="red" loading={loading}>
            Force Update on Next Sync
          </Button>
        </AlertDialog.Trigger>
        <AlertDialog.Content maxWidth="450px">
          <AlertDialog.Title>Force Update on Next Sync</AlertDialog.Title>
          <AlertDialog.Description size="2">
            Are you sure? All merchants will be updated on their next sync.
          </AlertDialog.Description>

          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button variant="solid" color="red" onClick={() => handleSubmit()} loading={loading}>
                Force Update on Next Sync
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>

      {success && (
        <Text color="green">
          <Flex gap="2" align="center">
            <HeartFilledIcon /> Success!
          </Flex>
        </Text>
      )}
      {error && (
        <Text color="red" weight="bold">
          <Flex gap="2">
            <ExclamationTriangleIcon /> Error
          </Flex>
        </Text>
      )}
    </Box>
  );
};
