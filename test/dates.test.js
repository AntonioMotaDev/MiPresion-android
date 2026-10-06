import { describe, it, expect } from 'vitest';
import { mondayOf, weekDays, weekOffsetOf, groupByDay, weekTitle } from '../src/logic/dates.js';

// Martes 6 de octubre de 2026, 10:00 hora local.
const NOW = new Date(2026, 9, 6, 10, 0);

describe('mondayOf', () => {
  it('regresa el lunes de la semana a las 00:00', () => {
    const m = mondayOf(NOW);
    expect([m.getFullYear(), m.getMonth(), m.getDate(), m.getHours()]).toEqual([2026, 9, 5, 0]);
  });
  it('el domingo pertenece a la semana que empezó el lunes anterior', () => {
    expect(mondayOf(new Date(2026, 9, 11, 23, 59)).getDate()).toBe(5);
  });
  it('el lunes es su propio inicio de semana', () => {
    expect(mondayOf(new Date(2026, 9, 12, 0, 1)).getDate()).toBe(12);
  });
});

describe('weekDays', () => {
  it('da lunes a domingo de esta semana', () => {
    const days = weekDays(0, NOW);
    expect(days.map((d) => d.getDate())).toEqual([5, 6, 7, 8, 9, 10, 11]);
    expect(days.map((d) => d.getDay())).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });
  it('cruza meses al ir a la semana pasada', () => {
    const days = weekDays(-1, NOW);
    expect(days[0].getMonth()).toBe(8);
    expect(days[0].getDate()).toBe(28);
    expect(days[6].getDate()).toBe(4);
  });
});

describe('weekOffsetOf', () => {
  it('calcula semanas hacia atrás', () => {
    expect(weekOffsetOf(new Date(2026, 9, 5, 0, 0).getTime(), NOW)).toBe(0);
    expect(weekOffsetOf(new Date(2026, 9, 4, 23, 0).getTime(), NOW)).toBe(-1);
    expect(weekOffsetOf(new Date(2026, 6, 1).getTime(), NOW)).toBe(-14);
  });
});

describe('groupByDay', () => {
  it('reparte por día y ordena por hora; ignora otras semanas', () => {
    const days = weekDays(0, NOW);
    const r = (d, h, id) => ({ id, ts: new Date(2026, 9, d, h).getTime() });
    const groups = groupByDay([r(6, 20, 'b'), r(6, 8, 'a'), r(11, 23, 'c'), r(4, 9, 'x'), r(12, 0, 'y')], days);
    expect(groups.map((g) => g.readings.map((x) => x.id))).toEqual([[], ['a', 'b'], [], [], [], [], ['c']]);
  });
});

describe('weekTitle', () => {
  it('nombra las semanas cercanas y fecha las demás', () => {
    expect(weekTitle(0, weekDays(0, NOW))).toBe('Esta semana');
    expect(weekTitle(-1, weekDays(-1, NOW))).toBe('Semana pasada');
    expect(weekTitle(-2, weekDays(-2, NOW))).toBe('21 sep al 27 sep');
  });
});
