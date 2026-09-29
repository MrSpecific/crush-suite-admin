'use client';
import { useState } from 'react';
import { Box, Button, Callout, Text } from '@radix-ui/themes';
import {
  CheckCircledIcon,
  CrossCircledIcon,
  ExclamationTriangleIcon,
  LightningBoltIcon,
} from '@radix-ui/react-icons';
import { RadixColor } from '@/types/radix-ui';
import { testAPIKey, type TestAPIKeyResult } from './server/testAPIKey';

const resultStyles: Record<
  TestAPIKeyResult['status'],
  { color: RadixColor; Icon: typeof CheckCircledIcon }
> = {
  success: { color: 'green', Icon: CheckCircledIcon },
  warning: { color: 'orange', Icon: ExclamationTriangleIcon },
  error: { color: 'red', Icon: CrossCircledIcon },
};

export const TestAPIKeyButton = ({ id }: { id: string }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestAPIKeyResult | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setResult(null);
    try {
      setResult(await testAPIKey(id));
    } catch (error) {
      console.error(error);
      setResult({ status: 'error', message: 'Error running the test. Please try again.' });
    }
    setLoading(false);
  };

  const style = result && resultStyles[result.status];

  return (
    <Box mt="4">
      <Button variant="soft" loading={loading} onClick={handleClick}>
        <LightningBoltIcon />
        Test Private Key
      </Button>
      {result && style && (
        <Callout.Root color={style.color} size="1" mt="3">
          <Callout.Icon>
            <style.Icon />
          </Callout.Icon>
          <Callout.Text>
            {result.message}
            {result.url && (
              <Text as="div" size="1" color="gray" mt="1">
                {result.statusCode ? `${result.statusCode} from ` : ''}
                <code>{result.url}</code>
              </Text>
            )}
          </Callout.Text>
        </Callout.Root>
      )}
    </Box>
  );
};
