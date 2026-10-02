const DAY_MS = 24 * 60 * 60 * 1000;

export type CalendarView = 'MONTH' | 'WEEK' | 'DAY';

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

/** Lunes de la semana que contiene `date`. */
export function startOfWeek(date: Date): Date {
  const day = startOfDay(date);
  const weekday = day.getDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  return addDays(day, diff);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** Las 6 semanas (42 días) que cubren el mes de `date`, empezando en lunes. */
export function monthMatrix(date: Date): Date[] {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const gridStart = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

export function weekDays(date: Date): Date[] {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function daySpan(start: Date, view: CalendarView): Date[] {
  if (view === 'DAY') return [startOfDay(start)];
  if (view === 'WEEK') return weekDays(start);
  return monthMatrix(start);
}

export function shiftPeriod(date: Date, view: CalendarView, direction: 1 | -1): Date {
  if (view === 'DAY') return addDays(date, direction);
  if (view === 'WEEK') return addDays(date, 7 * direction);
  return addMonths(date, direction);
}

export function periodLabel(date: Date, view: CalendarView): string {
  const options: Intl.DateTimeFormatOptions =
    view === 'MONTH'
      ? { month: 'long', year: 'numeric' }
      : view === 'WEEK'
        ? { day: 'numeric', month: 'short', year: 'numeric' }
        : { dateStyle: 'full' };

  const formatted = new Intl.DateTimeFormat('es-MX', options).format(date);

  if (view === 'WEEK') {
    const end = addDays(date, 6);
    return `${formatted.split(' ').slice(0, 2).join(' ')} — ${new Intl.DateTimeFormat(
      'es-MX',
      { day: 'numeric', month: 'short', year: 'numeric' },
    ).format(end)}`;
  }

  return formatted;
}

export const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function weekdayLabel(date: Date): string {
  return new Intl.DateTimeFormat('es-MX', { weekday: 'short' })
    .format(date)
    .replace('.', '');
}

export function dayNumber(date: Date): string {
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric' }).format(date);
}

export function timeLabel(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}
