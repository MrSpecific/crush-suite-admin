import type { BadgeProps, CheckboxProps, FormMessageProps } from '@radix-ui/themes';

export type RadixColor = BadgeProps['color'];

// export type CheckedState = boolean | 'indeterminate';
export type CheckedState = CheckboxProps['checked'];
export type CheckboxSize = FormMessageProps['size'];

export type FormMessageMatch = FormMessageProps['match'];
