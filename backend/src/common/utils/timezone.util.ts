/**
 * Normaliza a UTC una fecha que puede llegar como:
 * - ISO 8601 con offset explícito ("2026-10-01T10:00:00+02:00"),
 * - ISO 8601 en Z ("2026-10-01T16:00:00Z"),
 * - hora local sin offset ("2026-10-01T10:00:00") combinada con un
 *   timezone IANA ("America/Mexico_City") segun la convencion del plan.
 */
export function toUtcDateTime(value: string, timezone?: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?/.test(value)) {
    throw new TypeError(`Fecha no valida: ${value}`);
  }

  const hasOffset = /(Z|[+-]\d{2}:?\d{2})$/.test(value);

  if (hasOffset) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new TypeError(`Fecha no valida: ${value}`);
    }
    return parsed;
  }

  return zonedTimeToUtc(value, timezone ?? 'UTC');
}

/**
 * Interpreta una hora local sin offset como hora de `timeZone` y devuelve
 * el instante UTC equivalente. Basado en el offset derivado con Intl.
 */
export function zonedTimeToUtc(naiveIso: string, timeZone: string): Date {
  if (!timeZone || !isValidTimeZone(timeZone)) {
    throw new TypeError(`Zona horaria no valida: ${timeZone}`);
  }

  // Primera aproximacion: tratar la hora local como si fuera UTC.
  const wall = new Date(`${naiveIso}Z`);

  const firstOrder = new Date(wall.getTime() - offsetMs(wall, timeZone));
  return new Date(wall.getTime() - offsetMs(firstOrder, timeZone));
}

function offsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);

  const fields: Record<string, string> = {};
  for (const part of parts) {
    fields[part.type] = part.value;
  }

  const asUtc = Date.UTC(
    toNum(fields.year, 'year'),
    toNum(fields.month, 'month') - 1,
    toNum(fields.day, 'day'),
    toNum(fields.hour, 'hour'),
    toNum(fields.minute, 'minute'),
    toNum(fields.second, 'second'),
  );

  return asUtc - instant.getTime();
}

function toNum(value: string | undefined, label: string): number {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new TypeError(`No se pudo leer el ${label} de la zona horaria`);
  }
  return parsed;
}

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
