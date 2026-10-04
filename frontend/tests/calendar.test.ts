import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  daySpan,
  isSameDay,
  isSameMonth,
  monthMatrix,
  shiftPeriod,
  startOfDay,
  startOfWeek,
  weekDays,
  weekdayLabel,
} from '@/lib/utils/calendar';

// Fechas en hora local a propósito: el calendario agrupa por día local y los
// tests describen esa intención, no la de UTC.
const d = (iso: string) => new Date(2026, 9, iso.length ? +iso : 1, 12, 0, 0);

describe('calendar', () => {
  describe('startOfDay', () => {
    it('deja la fecha en medianoche sin cambiar de día', () => {
      const resultado = startOfDay(new Date(2026, 9, 15, 23, 45, 12));

      expect(resultado.getDate()).toBe(15);
      expect(resultado.getHours()).toBe(0);
      expect(resultado.getMinutes()).toBe(0);
      expect(resultado.getSeconds()).toBe(0);
    });
  });

  describe('addDays y addMonths', () => {
    it('suma días conservando la hora', () => {
      const resultado = addDays(new Date(2026, 9, 15, 12), 3);

      expect(resultado.getDate()).toBe(18);
      expect(resultado.getHours()).toBe(12);
    });

    it('resta días cruzando el mes', () => {
      expect(addDays(new Date(2026, 9, 2, 12), -2).getDate()).toBe(30);
    });

    it('suma meses y ancla al primero del mes destino', () => {
      // Se ancla al día 1 a propósito: si no, sumar un mes desde el 31 se
      // desbordaría al mes siguiente.
      const resultado = addMonths(new Date(2026, 0, 15), 1);

      expect(resultado.getFullYear()).toBe(2026);
      expect(resultado.getMonth()).toBe(1);
      expect(resultado.getDate()).toBe(1);
    });
  });

  describe('startOfWeek', () => {
    it('retrocede al lunes de la semana', () => {
      // 15/10/2026 es jueves.
      expect(startOfWeek(d('15')).getDate()).toBe(12);
    });

    it('trata el domingo como el final de la semana, no como el principio', () => {
      // El error clásico: new Date().getDay() da 0 en domingo.
      const domingo = new Date(2026, 9, 18, 12);
      expect(domingo.getDay()).toBe(0);

      expect(startOfWeek(domingo).getDate()).toBe(12);
    });

    it('deja intacto un lunes', () => {
      expect(startOfWeek(d('12')).getDate()).toBe(12);
    });
  });

  describe('isSameDay e isSameMonth', () => {
    it('distingue días con la misma fecha pero distinta hora', () => {
      expect(
        isSameDay(new Date(2026, 9, 15, 1), new Date(2026, 9, 15, 23)),
      ).toBe(true);
      expect(
        isSameDay(new Date(2026, 9, 15, 23, 59), new Date(2026, 9, 16, 0)),
      ).toBe(false);
    });

    it('distingue meses de distinto año', () => {
      expect(isSameMonth(new Date(2026, 0, 1), new Date(2025, 0, 1))).toBe(
        false,
      );
      expect(isSameMonth(new Date(2026, 0, 1), new Date(2026, 0, 28))).toBe(
        true,
      );
    });
  });

  describe('monthMatrix', () => {
    it('devuelve 42 días en seis semanas completas', () => {
      expect(monthMatrix(d('15'))).toHaveLength(42);
    });

    it('empieza siempre en lunes', () => {
      expect(startOfWeek(monthMatrix(d('15'))[0]).getDay()).toBe(1);
    });

    it('incluye todos los días del mes consultado', () => {
      const dias = monthMatrix(d('15')).map((fecha) => fecha.getDate());

      expect(dias).toContain(1);
      expect(dias).toContain(31);
    });
  });

  describe('weekDays', () => {
    it('devuelve los siete días empezando en lunes', () => {
      const dias = weekDays(d('15'));

      expect(dias).toHaveLength(7);
      expect(dias[0].getDay()).toBe(1);
      expect(dias[6].getDay()).toBe(0);
    });
  });

  describe('daySpan', () => {
    it('un día devuelve solo ese día normalizado', () => {
      const span = daySpan(new Date(2026, 9, 15, 18), 'DAY');

      expect(span).toHaveLength(1);
      expect(span[0].getHours()).toBe(0);
    });

    it('una semana devuelve siete días', () => {
      expect(daySpan(d('15'), 'WEEK')).toHaveLength(7);
    });

    it('un mes devuelve la matriz de 42 días', () => {
      expect(daySpan(d('15'), 'MONTH')).toHaveLength(42);
    });
  });

  describe('shiftPeriod', () => {
    it('mueve un día hacia delante y hacia atrás', () => {
      expect(shiftPeriod(d('15'), 'DAY', 1).getDate()).toBe(16);
      expect(shiftPeriod(d('15'), 'DAY', -1).getDate()).toBe(14);
    });

    it('mueve una semana completa', () => {
      expect(shiftPeriod(d('15'), 'WEEK', 1).getDate()).toBe(22);
    });

    it('mueve un mes', () => {
      expect(shiftPeriod(d('15'), 'MONTH', 1).getMonth()).toBe(10);
      expect(shiftPeriod(d('15'), 'MONTH', -1).getMonth()).toBe(8);
    });
  });

  describe('weekdayLabel', () => {
    it('devuelve la etiqueta corta sin el punto final', () => {
      // Intl deja "lun." en español; el calendario la usa en una celda.
      expect(weekdayLabel(d('12'))).toBe('lun');
    });
  });
});