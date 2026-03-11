import { Select } from '@radix-ui/themes';

type PropsFrom<TComponent> = any;

export type SelectOptions = { value: string; label: string }[];
export type SelectOptionGroups = { label: string; options: SelectOptions }[];

export interface SelectInputProps {
  defaultValue?: string;
  name: string;
  groups?: SelectOptionGroups;
  color?: PropsFrom<typeof Select.Trigger>;
  value?: string;
  setValue?: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

export const SelectInput = ({
  defaultValue,
  name,
  groups,
  color,
  value,
  required,
  placeholder,
  className,
  setValue = () => {},
}: SelectInputProps) => {
  return (
    <Select.Root
      defaultValue={defaultValue}
      name={name}
      required={required}
      value={value}
      onValueChange={setValue}
    >
      <Select.Trigger color={color} placeholder={placeholder} className={className} />
      <Select.Content color={color}>
        {groups &&
          groups.map(({ label, options }) => (
            <Select.Group key={label}>
              <Select.Label>{label}</Select.Label>
              {options.map(({ value, label }) => (
                <Select.Item key={value} value={value}>
                  {label}
                </Select.Item>
              ))}
            </Select.Group>
          ))}
      </Select.Content>
    </Select.Root>
  );
};

export default SelectInput;
