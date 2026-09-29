'use client';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { clsx } from 'clsx';
import * as Form from '@radix-ui/react-form';
import { Popover as PopoverPrimitive } from 'radix-ui';
import { Popover, Text } from '@radix-ui/themes';
import fieldCss from './FormField.module.css';
import css from './ComboboxInput.module.css';
import { FormLabel } from './FormLabel';

export type ComboboxOption = { value: string; label: string; description?: string };

export type ComboboxInputProps = {
  name: string;
  label?: string;
  options: ComboboxOption[];
  defaultValue?: string | number;
  placeholder?: string;
  required?: boolean;
  className?: string;
  maxResults?: number;
  messages?: { valueMissing?: string };
};

// A searchable select. The visible text input is only used for searching; the selected
// option's value is submitted through a hidden input named `name`.
export const ComboboxInput = ({
  name,
  label,
  options,
  defaultValue,
  placeholder = 'Search…',
  required = false,
  className,
  maxResults = 50,
  messages = {},
}: ComboboxInputProps) => {
  const listboxId = useId();
  const searchName = `${name}Search`;
  const anchorRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  const [selected, setSelected] = useState<ComboboxOption | undefined>(() =>
    options.find((option) => option.value === defaultValue?.toString())
  );
  const [query, setQuery] = useState(selected?.label ?? '');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const results = useMemo(() => {
    // Show everything while the input still displays the current selection
    const search = query === selected?.label ? '' : query.trim().toLowerCase();
    const matches = search
      ? options.filter((option) =>
          [option.label, option.description, option.value].some((text) =>
            text?.toLowerCase().includes(search)
          )
        )
      : options;
    return matches.slice(0, maxResults);
  }, [options, query, selected, maxResults]);

  // Keep the keyboard-highlighted option in view
  useEffect(() => {
    if (!open) return;
    const active = listboxRef.current?.querySelector('[data-active]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  const select = (option: ComboboxOption) => {
    setSelected(option);
    setQuery(option.label);
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!open) return setOpen(true);
        setActiveIndex((index) => Math.min(index + 1, results.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
        break;
      case 'Enter':
        if (open && results[activeIndex]) {
          event.preventDefault();
          select(results[activeIndex]);
        }
        break;
      case 'Escape':
        setOpen(false);
        break;
    }
  };

  // Discard unselected search text so the field can't look filled in when it isn't
  const handleBlur = () => {
    setOpen(false);
    setQuery(selected?.label ?? '');
  };

  const activeOption = open ? results[activeIndex] : undefined;

  return (
    <Form.Field className={clsx(fieldCss.FormField, className)} name={searchName}>
      <FormLabel label={label} name={name} required={required} htmlFor={searchName} />
      <input type="hidden" name={name} value={selected?.value ?? ''} />
      <Popover.Root open={open} onOpenChange={setOpen}>
        {/* Themes' Popover.Anchor drops its children (v3.3.0), so use the primitive directly */}
        <PopoverPrimitive.Anchor ref={anchorRef}>
          <Form.Control asChild>
            <input
              id={searchName}
              className={fieldCss.Input}
              type="text"
              role="combobox"
              autoComplete="off"
              aria-expanded={open}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={
                activeOption ? `${listboxId}-${activeOption.value}` : undefined
              }
              placeholder={placeholder}
              required={required}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
                setOpen(true);
                if (!event.target.value) setSelected(undefined);
              }}
              onFocus={(event) => {
                event.target.select();
                setOpen(true);
              }}
              onClick={() => setOpen(true)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
            />
          </Form.Control>
        </PopoverPrimitive.Anchor>
        {/* Portalled so the list isn't clipped by overflow-hidden parents like Card */}
        <Popover.Content
          size="1"
          className={css.Content}
          align="start"
          sideOffset={4}
          // Keep focus in the search input while the list is open
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={(event) => {
            if (anchorRef.current?.contains(event.target as Node)) event.preventDefault();
          }}
        >
          <ul ref={listboxRef} id={listboxId} role="listbox" className={css.Listbox}>
            {results.length === 0 && (
              <li className={css.Empty}>
                <Text size="2" color="gray">
                  No matches
                </Text>
              </li>
            )}
            {results.map((option, index) => (
              <li
                key={option.value}
                id={`${listboxId}-${option.value}`}
                role="option"
                aria-selected={option.value === selected?.value}
                data-active={index === activeIndex || undefined}
                className={css.Option}
                // Prevent the input blurring before the click registers
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => select(option)}
              >
                <Text as="div" size="2" weight="bold">
                  {option.label}
                </Text>
                {option.description && (
                  <Text as="div" size="1" color="gray">
                    {option.description}
                  </Text>
                )}
              </li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Root>
      <Text color="red" size="1">
        <Form.Message className={fieldCss.FormMessage} match="valueMissing">
          {messages.valueMissing ?? 'This field is required'}
        </Form.Message>
      </Text>
    </Form.Field>
  );
};
