export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDateTime(value: string | Date, timezone?: string): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timezone,
  }).format(date);
}

export function formatDate(value: string | Date, timezone?: string): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeZone: timezone,
  }).format(date);
}

export function toDatetimeLocal(value: string | Date, timezone?: string): string {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}
