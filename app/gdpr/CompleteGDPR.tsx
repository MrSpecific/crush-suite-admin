'use client';
import React, { useState } from 'react';
import { Flex, Button, AlertDialog, Text } from '@radix-ui/themes';
import { useRouter } from 'next/navigation';
import { completeGDPR } from './completeGDPR.server';

export const CompleteGDPR = ({
  id,
  onDelete = () => {},
  redirectTo,
  session,
}: {
  id: string;
  onDelete?: () => void;
  redirectTo?: string;
  session?: MaybeSession;
}) => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleComplete = async () => {
    setLoading(true);
    const result = await completeGDPR({ id });
    console.log(result);
    setLoading(false);
    onDelete();

    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.back();
    }
  };

  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger>
        <Button loading={loading}>Mark as Complete</Button>
      </AlertDialog.Trigger>
      <AlertDialog.Content style={{ maxWidth: 450 }}>
        <AlertDialog.Title>Complete this GDPR Request</AlertDialog.Title>
        <AlertDialog.Description size="2">
          Are you sure you want to mark this GDPR request as completed?
          <br />
          This action will remove the request from the list and mark it as completed.
        </AlertDialog.Description>

        <Flex gap="3" mt="4" justify="end">
          <AlertDialog.Cancel>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </AlertDialog.Cancel>
          <AlertDialog.Action>
            <Button variant="solid" color="red" onClick={handleComplete} loading={loading}>
              Mark as Completed
            </Button>
          </AlertDialog.Action>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
};
