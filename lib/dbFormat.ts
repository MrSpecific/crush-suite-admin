type NumberToFormat = number | string | undefined;
type NumberFormatReturn = number | undefined;

export const formatNumberInput = (
  value: NumberToFormat,
  type: 'int' | 'dec' | undefined = 'int'
): NumberFormatReturn => {
  if (value === null) return undefined;
  if (!value) return undefined;
  if (typeof value === 'number') {
    return type === 'int' ? Math.round(value) : value;
  }

  return type === 'int' ? parseInt(value) : parseFloat(value);
};

type DateToFormat = Date | string | number | null | undefined;
type DateFormatReturn = string | null | undefined;

export const formatTimestamp = (value: DateToFormat): DateFormatReturn => {
  // Return null/undefined consistently if invalid or empty
  if (value === null) return null;
  if (value === undefined || value === '') return undefined;

  let date: Date;
  if (value instanceof Date) {
    date = value;
  } else {
    // value is string or number
    date = new Date(value);
  }

  // If `new Date(...)` cannot parse it, getTime() will be NaN
  if (isNaN(date.getTime())) {
    return undefined;
  }

  // Return ISO-8601 for storing in Supabase
  return date.toISOString();
};

// Format for PostgreSQL `date` field: YYYY-MM-DD
export const formatDate = (value: DateToFormat): string | undefined | null => {
  const iso = formatTimestamp(value);
  if (!iso) return iso;
  return iso.split('T')[0]; // just return YYYY-MM-DD
};

// Format for PostgreSQL `timetz`: HH:MM:SS.sss±HH:MM
export const formatTimeWithTZ = (value: DateToFormat): string | undefined | null => {
  const date = value instanceof Date ? value : new Date(value ?? '');
  if (isNaN(date.getTime())) return undefined;

  return date.toTimeString(); // returns 'HH:MM:SS GMT±xxxx (TimeZone)'
};

export const formatBooleanInput = (value: FormBoolean | undefined): boolean | undefined => {
  if (value === null) return undefined;
  if (value === undefined || value === '') return undefined;
  if (typeof value === 'string') {
    if (value === '0') return false;
    if (value === '1') return true;
    if (value === 'false') return false;
    if (value === 'true') return true;
    if (value === 'on') return true;
    if (value === 'off') return false;
  }
  return !!value;
};

export const dbFormat = {
  boolean: formatBooleanInput,
  number: formatNumberInput,
  integer: (value: NumberToFormat): NumberFormatReturn => formatNumberInput(value, 'int'),
  decimal: (value: NumberToFormat): NumberFormatReturn => formatNumberInput(value, 'dec'),
  timestamp: formatTimestamp,
  date: formatDate,
  timetz: formatTimeWithTZ,
  uuid: (value: string | null | undefined): string | undefined => {
    if (value === null) return undefined;
    if (value === undefined || value === '') return undefined;
    return value;
  },
};
