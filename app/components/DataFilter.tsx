'use client';
import { useId } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Box, Button, Flex, Select, Text, TextField } from '@radix-ui/themes';
import * as Form from '@radix-ui/react-form';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';

const allFilterValue = '__all__';

export type DataFilterOption = {
  label: string;
  value: string;
};

export type SelectDataFilter = {
  label: string;
  name: string;
  options: DataFilterOption[];
  allLabel?: string;
  placeholder?: string;
};

export const DataFilter = ({ filters = [] }: { filters?: SelectDataFilter[] }) => {
  const { push } = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams.toString());
  const defaultValue = params.get('search') || '';
  const searchInputId = useId();

  const buildUrl = (params: URLSearchParams) => {
    const query = params.toString();

    return query ? `${pathname}?${query}` : pathname;
  };

  return (
    <Flex align="end" gap="4" wrap="wrap" mb="4">
      <Form.Root
        style={{ flex: '1 1 280px', maxWidth: 420 }}
        onSubmit={(event) => {
          event.preventDefault();
          const params = new URLSearchParams(searchParams.toString());
          const data = new FormData(event.currentTarget);
          const textInput = String(data.get('textInput') || '').trim();

          params.delete('page');
          if (textInput) {
            params.set('search', textInput);
          } else {
            params.delete('search');
          }
          push(buildUrl(params));
        }}
      >
        <Text as="label" htmlFor={searchInputId} size="1" weight="bold" mb="1">
          Search
        </Text>
        <TextField.Root
          id={searchInputId}
          radius="large"
          name="textInput"
          defaultValue={defaultValue}
        >
          <TextField.Slot>
            <MagnifyingGlassIcon height="16" width="16" />
          </TextField.Slot>
          <Button type="submit">Search</Button>
        </TextField.Root>
      </Form.Root>

      {filters.length > 0 && (
        <Flex align="end" gap="3" wrap="wrap" style={{ marginLeft: 'auto' }}>
          {filters.map((filter) => (
            <DataSelectFilter
              key={filter.name}
              filter={filter}
              searchParams={searchParams}
              onChange={(params) => push(buildUrl(params))}
            />
          ))}
        </Flex>
      )}
    </Flex>
  );
};

const DataSelectFilter = ({
  filter,
  searchParams,
  onChange,
}: {
  filter: SelectDataFilter;
  searchParams: ReturnType<typeof useSearchParams>;
  onChange: (params: URLSearchParams) => void;
}) => {
  const filterId = useId();
  const optionValues = new Set(filter.options.map((option) => option.value));
  const currentValue = searchParams.get(filter.name);
  const value = currentValue && optionValues.has(currentValue) ? currentValue : allFilterValue;

  return (
    <Box style={{ minWidth: 180 }}>
      <Text as="label" htmlFor={filterId} size="1" weight="bold" mb="1">
        {filter.label}
      </Text>
      <Select.Root
        value={value}
        onValueChange={(nextValue) => {
          const params = new URLSearchParams(searchParams.toString());

          params.delete('page');
          if (nextValue === allFilterValue) {
            params.delete(filter.name);
          } else {
            params.set(filter.name, nextValue);
          }

          onChange(params);
        }}
      >
        <Select.Trigger id={filterId} placeholder={filter.placeholder || filter.label} />
        <Select.Content>
          <Select.Item value={allFilterValue}>
            {filter.allLabel || `All ${filter.label}`}
          </Select.Item>
          {filter.options.map((option) => (
            <Select.Item key={option.value} value={option.value}>
              {option.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    </Box>
  );
};

export const useFilters = () => {
  return {};
};
