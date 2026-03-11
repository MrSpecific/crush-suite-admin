import type { BadgeProps, CheckboxProps, ButtonProps, FormMessageProps } from '@radix-ui/themes';

export type RadixColor = BadgeProps['color'];

// export type CheckedState = boolean | 'indeterminate';
export type CheckedState = CheckboxProps['checked'];
export type CheckboxSize = FormMessageProps['size'];

export type FormMessageMatch = FormMessageProps['match'];

export type RadixButtonVariant = ButtonProps['variant'];
