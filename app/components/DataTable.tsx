import { Flex, ScrollArea, Table } from '@radix-ui/themes';
import { DataDialog } from './DataDialog';
import { Link } from './Link';
import { ReactNode } from 'react';

export type ColumnType = 'text' | 'data' | 'actions' | 'child';

export type Header = {
  id?: string;
  title: string;
  formatter?: (value: any, row: any) => string | ReactNode;
  href?: (value: any, row: any) => string | null | undefined;
  clipboard?: boolean;
  type?: ColumnType;
  as?: 'code';
};

type DataTableProps = {
  headers: Header[];
  data: Record<string, any>[];
  Actions?: React.ComponentType<any>;
};

export const DataTable = ({ headers, data, Actions }: DataTableProps) => {
  return (
    <ScrollArea scrollbars="horizontal" type="auto" mb="4">
      <Table.Root variant="surface" mb="4">
        <Table.Header style={{ position: 'sticky', top: 0 }}>
          <Table.Row>
            {headers.map((header) => (
              <Table.ColumnHeaderCell
                key={header.id}
                minWidth="max-content"
                style={{ whiteSpace: 'nowrap' }}
              >
                {header.title}
              </Table.ColumnHeaderCell>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {data.map((row, i) => (
            <Table.Row key={i}>
              {/* <Table.Cell align="center">
                <DataDialog title="Data" data={row} />
              </Table.Cell> */}

              {headers.map((header) => {
                const key = `${header.id}-${i}`;
                if (header.type === 'data')
                  return (
                    <Table.Cell key={key} align="center">
                      <DataDialog title="Data" data={row} />
                    </Table.Cell>
                  );

                if (header.type === 'actions' && Actions) {
                  return (
                    <Table.Cell key={`actions-${i}`}>
                      <Flex gap="1" align="center">
                        <Actions {...row} />
                      </Flex>
                    </Table.Cell>
                  );
                }

                if (!header.id) return null;

                const rawValue = row[header.id];
                const displayValue = header.formatter
                  ? header.formatter(rawValue, row)
                  : header.as === 'code'
                    ? rawValue ?? '—'
                    : String(rawValue ?? '');

                const content =
                  header.as === 'code' && !header.formatter ? (
                    <code>{displayValue}</code>
                  ) : (
                    displayValue
                  );

                const href = header.href?.(rawValue, row);

                return (
                  <Table.Cell key={key} minWidth="max-content" style={{ whiteSpace: 'nowrap' }}>
                    {href ? <Link href={href}>{content}</Link> : content}
                  </Table.Cell>
                );
              })}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </ScrollArea>
  );
};
