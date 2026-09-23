'use client';
import { useSyncExternalStore } from 'react';

const localDateTimeFormat = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'long',
});

const utcDateTimeFormat = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'long',
  timeZone: 'UTC',
});

const subscribe = () => () => {};

// Renders in the viewer's timezone. The server (and first client render, to
// avoid a hydration mismatch) shows UTC, then swaps to local once mounted.
export const LocalDateTime = ({ value }: { value: Date | null | undefined }) => {
  const isClient = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  if (!value) return null;

  const utc = utcDateTimeFormat.format(value);

  return (
    <time dateTime={value.toISOString()} title={utc}>
      {isClient ? localDateTimeFormat.format(value) : utc}
    </time>
  );
};
