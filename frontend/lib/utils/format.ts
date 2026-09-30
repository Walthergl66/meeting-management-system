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
