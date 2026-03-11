'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Box, Button, Flex, Heading, Text, TextField } from '@radix-ui/themes';
import * as Form from '@radix-ui/react-form';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';

export const DataFilter = ({}: {}) => {
  const { push } = useRouter();
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams.toString());
  const defaultValue = params.get('search') || '';

  return (
    <Box mb="4">
      <Form.Root
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const textInput = data.get('textInput');

          params.set('page', '1');
          if (textInput) {
            params.set('search', textInput as string);
          } else {
            params.delete('search');
          }
          push(`?${params.toString()}`);
        }}
      >
        <Heading as="h2" size="1" mb="1">
          Filter
        </Heading>
        <TextField.Root radius="large" name="textInput" defaultValue={defaultValue}>
          <TextField.Slot>
            <MagnifyingGlassIcon height="16" width="16" />
          </TextField.Slot>
          <Button type="submit">Filter</Button>
        </TextField.Root>
      </Form.Root>
    </Box>
  );
};

export const useFilters = () => {
  return {};
};
