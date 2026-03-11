import { clsx } from 'clsx';
import * as Form from '@radix-ui/react-form';
import { Box, Text } from '@radix-ui/themes';
import { SelectInput, SelectOptionGroups } from './SelectInput';
import css from './FormField.module.css';
import { FormLabel } from './FormLabel';

export type InputTypes = 'email' | 'password' | 'text' | 'number' | 'select' | 'checkbox' | 'radio';

export type FormFieldProps = {
  id?: string;
  name: string;
  label?: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string | number;
  type?: InputTypes;
  className?: string;
  messages?: {
    valueMissing?: string;
    typeMismatch?: string;
  };
  options?: SelectOptionGroups;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
};

export const FormField = ({
  id,
  name,
  label,
  description,
  placeholder,
  defaultValue,
  type = 'text',
  options,
  className,
  messages = {},
  min,
  max,
  step,
  required = false,
}: FormFieldProps) => {
  const inputElement = (type: InputTypes) => {
    switch (type) {
      case 'select':
        return (
          <SelectInput
            className={css.SelectInput}
            name={name}
            groups={options}
            required={required}
            placeholder={placeholder}
            defaultValue={typeof defaultValue === 'string' ? defaultValue : undefined}
          />
        );
      default:
        return (
          <input
            className={css.Input}
            name={name}
            type={type}
            required={required}
            defaultValue={defaultValue}
            placeholder={placeholder}
            min={min}
            max={max}
            step={step}
          />
        );
    }
  };

  const fieldId = id || name;

  return (
    <Form.Field id={fieldId} className={clsx(css.FormField, className)} name={name}>
      <Box>
        <FormLabel label={label} name={name} required={required} htmlFor={fieldId} />

        {description && (
          <Text as="div" size="1" color="gray" mt="0" mb="1">
            {description}
          </Text>
        )}
      </Box>
      <Form.Control asChild>{inputElement(type)}</Form.Control>
      <Text color="red" size="1">
        <Form.Message className={css.FormMessage} match="valueMissing">
          {messages.valueMissing ?? 'This field is required'}
        </Form.Message>
        <Form.Message className={css.FormMessage} match="typeMismatch">
          {messages.typeMismatch ?? 'Invalid value'}
        </Form.Message>
        <Form.Message className={css.FormMessage} match="badInput">
          Bad Input
        </Form.Message>
        <Form.Message className={css.FormMessage} match="tooShort">
          Too Short
        </Form.Message>
        <Form.Message className={css.FormMessage} match="tooLong">
          Too Long
        </Form.Message>
        <Form.Message className={css.FormMessage} match="patternMismatch">
          Pattern Mismatch
        </Form.Message>
        <Form.Message className={css.FormMessage} match="rangeOverflow">
          Range Overflow
        </Form.Message>
        <Form.Message className={css.FormMessage} match="rangeUnderflow">
          Range Underflow
        </Form.Message>
        <Form.Message className={css.FormMessage} match="stepMismatch">
          Step Mismatch
        </Form.Message>
      </Text>
    </Form.Field>
  );
};
