'use client';
import { useState } from 'react';
import * as Form from '@radix-ui/react-form';
import { Button, Flex, Text } from '@radix-ui/themes';
import { MagicWandIcon } from '@radix-ui/react-icons';
import { ClipboardCopy } from '@/app/components/ClipboardCopy';
import { FormLabel } from '@/app/components/forms/FormLabel';
import fieldCss from '@/app/components/forms/FormField.module.css';

// 32 random bytes as hex, from the browser's CSPRNG
export const generateKey = (prefix: string) => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return prefix + Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

// A text field for an API key, with a button to fill it with a newly generated key
export const GeneratedKeyField = ({
  name,
  label,
  prefix,
  defaultValue,
  required = false,
  messages = {},
}: {
  name: string;
  label: string;
  prefix: string;
  defaultValue?: string | null;
  required?: boolean;
  messages?: { valueMissing?: string };
}) => {
  const [value, setValue] = useState(defaultValue ?? '');
  const replacingExisting = !!defaultValue && value !== defaultValue;

  return (
    <Form.Field className={fieldCss.FormField} name={name}>
      <FormLabel label={label} name={name} required={required} htmlFor={name} />
      <Flex gap="2" align="center">
        <Form.Control asChild>
          <input
            id={name}
            className={fieldCss.Input}
            type="text"
            autoComplete="off"
            spellCheck={false}
            required={required}
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </Form.Control>
        <ClipboardCopy text={value} />
        <Button type="button" variant="soft" onClick={() => setValue(generateKey(prefix))}>
          <MagicWandIcon />
          Generate
        </Button>
      </Flex>
      {replacingExisting && (
        <Text as="div" size="1" color="orange" mt="1">
          Saving replaces the current key. Anything still using the old key will stop working.
        </Text>
      )}
      <Text color="red" size="1">
        <Form.Message className={fieldCss.FormMessage} match="valueMissing">
          {messages.valueMissing ?? 'This field is required'}
        </Form.Message>
      </Text>
    </Form.Field>
  );
};
