'use client';
import { Button } from '@radix-ui/themes';
import { useFormStatus } from 'react-dom';

export function SubmitButton({ label = 'Submit' }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" loading={pending}>
      {label}
    </Button>
  );
}
