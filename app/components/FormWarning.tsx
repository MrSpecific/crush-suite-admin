import { Callout } from '@radix-ui/themes';
import { InfoCircledIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { RadixColor } from '@/types/radix-ui';

type WarningVariant = 'warning' | 'error' | 'info';

export const FormWarning = ({
  text,
  children,
  variant = 'warning',
}: {
  text?: string;
  children?: React.ReactNode;
  variant?: WarningVariant;
}) => {
  const colors: { [key in WarningVariant]: RadixColor } = {
    warning: 'orange',
    error: 'red',
    info: 'blue',
  };

  return (
    <Callout.Root color={colors[variant]} size="2" my="2">
      <Callout.Icon>
        {variant === 'info' && <InfoCircledIcon />}
        {variant === 'warning' && <ExclamationTriangleIcon />}
        {variant === 'error' && <ExclamationTriangleIcon />}
      </Callout.Icon>
      <Callout.Text>
        {text}
        {children}
      </Callout.Text>
    </Callout.Root>
  );
};
