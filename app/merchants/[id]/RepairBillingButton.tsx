'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertDialog, Box, Button, Flex, Text } from '@radix-ui/themes';
import { ExclamationTriangleIcon, HeartFilledIcon } from '@radix-ui/react-icons';
import type { BillingRepair } from '@/lib/billingDiagnosis';
import {
  repairMerchantBilling,
  type RepairMerchantBillingResult,
} from '@/app/merchants/[id]/repairBilling.server';

const copy = (repair: BillingRepair) =>
  repair.kind === 'reset'
    ? {
        confirm:
          'This clears the stored billing id and status. Next time the merchant opens the app they will see the plan picker and can approve a new charge. The old charge in Shopify is left as it is.',
      }
    : {
        confirm: `This points our record at the active Shopify subscription "${repair.subscriptionName}", marks it active, and sets the billing plan to the one matching that name.`,
      };

export const RepairBillingButton = ({
  merchantId,
  repair,
}: {
  merchantId: number;
  repair: BillingRepair;
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RepairMerchantBillingResult | null>(null);

  const handleRepair = async () => {
    setLoading(true);
    const res = await repairMerchantBilling({ merchantId, expected: repair.kind });
    setResult(res);
    setLoading(false);
    if (res.success) router.refresh();
  };

  return (
    <Box>
      <AlertDialog.Root>
        <AlertDialog.Trigger>
          <Button color="orange" loading={loading}>
            Repair Billing
          </Button>
        </AlertDialog.Trigger>
        <AlertDialog.Content maxWidth="480px">
          <AlertDialog.Title>Repair Billing</AlertDialog.Title>
          <AlertDialog.Description size="2">{copy(repair).confirm}</AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button variant="solid" color="orange" onClick={handleRepair} loading={loading}>
                Repair Billing
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>

      {result && (
        <Text as="p" size="2" mt="2" color={result.success ? 'green' : 'red'}>
          <Flex gap="2" align="center">
            {result.success ? <HeartFilledIcon /> : <ExclamationTriangleIcon />}
            {result.message}
          </Flex>
        </Text>
      )}
    </Box>
  );
};
