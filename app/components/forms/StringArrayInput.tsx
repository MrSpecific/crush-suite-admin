import { useState } from 'react';
import { clsx } from 'clsx';
import { Box, Button, Flex, IconButton, Text, TextField } from '@radix-ui/themes';
import { CrossCircledIcon } from '@radix-ui/react-icons';
import { SelectInput, SelectOptionGroups } from './SelectInput';
import css from './FormField.module.css';
import { FormLabel } from './FormLabel';

export type StringArrayProps = {
  id?: string;
  name: string;
  label?: string;
  addButtonLabel?: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  className?: string;
  messages?: {
    valueMissing?: string;
    typeMismatch?: string;
  };
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
};

export const StringArrayInput = ({
  id,
  name,
  label,
  addButtonLabel = 'Add',
  description,
  placeholder,
  defaultValue,
  className,
  messages = {},
  min,
  max,
  step,
  required = false,
}: StringArrayProps) => {
  const fieldId = id || name;
  const [values, setValues] = useState<string[]>(defaultValue ? defaultValue.split(',') : []);

  return (
    <Box>
      <Box>
        <FormLabel label={label} name={name} required={required} htmlFor={fieldId} />

        {description && (
          <Text as="div" size="1" color="gray" mt="0" mb="1">
            {description}
          </Text>
        )}
      </Box>
      <input
        id={fieldId}
        name={name}
        type="hidden"
        required={required}
        value={values.join(',')}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        readOnly
      />
      <Flex direction="column" gap="2" mb="2">
        {values.map((value, index) => (
          <TextField.Root
            key={`${name}-field-${index}`}
            placeholder="storename.myshopify.com"
            value={value}
            onChange={(e) => {
              const newValues = [...values];
              newValues[index] = e.target.value;
              setValues(newValues);
            }}
            onKeyDown={(e) => {}}
          >
            <TextField.Slot />
            <TextField.Slot>
              <IconButton
                type="button"
                onClick={() => {
                  const newValues = [...values].filter((_, i) => i !== index);
                  setValues(newValues);
                  // setValues((prev) =>
                  //   prev.filter((_, i) => {
                  //     console.log(`Checking store at index ${i} : ${index}`, i !== index);
                  //     return i !== index;
                  //   })
                  // );
                }}
                variant="ghost"
              >
                <CrossCircledIcon height="16" width="16" />
              </IconButton>
            </TextField.Slot>
          </TextField.Root>
        ))}
      </Flex>
      <Button type="button" variant="soft" onClick={() => setValues([...values, ''])}>
        {addButtonLabel}
      </Button>
    </Box>
  );
};
