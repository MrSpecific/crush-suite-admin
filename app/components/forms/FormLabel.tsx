import * as Form from '@radix-ui/react-form';
import { Text } from '@radix-ui/themes';
import css from './FormField.module.css';

export type InputTypes = 'email' | 'password' | 'text' | 'number' | 'select' | 'checkbox' | 'radio';

export type FormLabelProps = {
  name?: string;
  label?: string;
  required?: boolean;
  htmlFor?: string;
  children?: React.ReactNode;
};

export const FormLabel = ({ name, label, required = false, htmlFor, children }: FormLabelProps) => {
  return (
    <Text as="label" className={css.FormLabel} htmlFor={htmlFor || name} mb="1">
      <Text as="div" weight="bold" size="1">
        {label || name}
        {required && <RequiredIndicator />}
      </Text>
      {children}
    </Text>
  );
};

export const RequiredIndicator = () => (
  <Text color="cyan" weight="bold">
    &nbsp;*
  </Text>
);
