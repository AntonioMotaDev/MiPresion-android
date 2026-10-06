import { describe, it, expect } from 'vitest';
import { buildBackup, parseBackup, missingReadings, backupFileName } from '../src/logic/backup.js';

const NOW = new Date(2026, 9, 6, 12, 0).getTime();
const reading = (id, over = {}) => ({ id, sys: 128, dia: 82, pul: 70, note: 'café', ts: NOW - 3600e3, created_at: NOW - 3500e3, ...over });
const fileOf = (lecturas, extra = {}) => JSON.stringify({ version: 1, exportado: NOW, lecturas, ...extra });

describe('buildBackup', () => {
  it('arma el formato con versión, fecha y solo los campos conocidos', () => {
    const b = buildBackup([{ ...reading('a'), extra: 'x' }, reading('b', { pul: null, note: undefined })], NOW);
    expect(b.version).toBe(1);
    expect(b.exportado).toBe(NOW);
    expect(Object.keys(b.lecturas[0])).toEqual(['id', 'sys', 'dia', 'pul', 'note', 'ts', 'created_at']);
    expect(b.lecturas[1]).toMatchObject({ pul: null, note: '' });
  });
  it('nombre del archivo con la fecha', () => {
    expect(backupFileName(new Date(2026, 9, 6))).toBe('mi-presion-respaldo-2026-10-06.json');
  });
  it('lo que se guarda se puede volver a leer igual', () => {
    const data = [reading('a'), reading('b', { pul: null, note: '' })];
    const parsed = parseBackup(JSON.stringify(buildBackup(data, NOW)), NOW);
    expect(parsed.ok).toBe(true);
    expect(parsed.readings).toEqual(data);
  });
});

describe('parseBackup', () => {
  it('rechaza texto que no es JSON', () => {
    expect(parseBackup('hola', NOW)).toMatchObject({ ok: false });
  });
  it('rechaza JSON sin lecturas o de otra versión', () => {
    expect(parseBackup('{"a":1}', NOW).ok).toBe(false);
    expect(parseBackup(fileOf([], { version: 2 }), NOW).message).toMatch(/otra versión/);
  });
  it.each([
    ['sin id', { id: '' }],
    ['alta fuera de rango', { sys: 400 }],
    ['baja fuera de rango', { dia: 10 }],
    ['alta menor que baja', { sys: 80, dia: 90 }],
    ['pulso fuera de rango', { pul: 300 }],
    ['nota muy larga', { note: 'x'.repeat(201) }],
    ['fecha inválida', { ts: 'ayer' }],
    ['fecha en el futuro', { ts: NOW + 3 * 864e5 }],
    ['números con decimales', { sys: 120.5 }],
  ])('si una medición está mal (%s) no importa nada', (_name, bad) => {
    const res = parseBackup(fileOf([reading('ok'), reading('mal', bad)]), NOW);
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/medición 2/);
  });
  it('acepta pulso y nota vacíos, y completa created_at', () => {
    const res = parseBackup(fileOf([{ id: 'a', sys: 120, dia: 80, ts: NOW - 1000 }]), NOW);
    expect(res.readings[0]).toEqual({ id: 'a', sys: 120, dia: 80, pul: null, note: '', ts: NOW - 1000, created_at: NOW - 1000 });
  });
  it('quita ids repetidos dentro del mismo archivo', () => {
    expect(parseBackup(fileOf([reading('a'), reading('a')]), NOW).readings).toHaveLength(1);
  });
});

describe('missingReadings', () => {
  it('restaurar dos veces el mismo archivo no duplica nada', () => {
    const backup = [reading('a'), reading('b'), reading('c')];
    let db = [reading('a')];
    const first = missingReadings(db, backup);
    db = [...db, ...first];
    const second = missingReadings(db, backup);
    expect(first.map((r) => r.id)).toEqual(['b', 'c']);
    expect(second).toEqual([]);
    expect(db).toHaveLength(3);
  });
  it('nunca borra lo que ya existe', () => {
    const db = [reading('x'), reading('y')];
    expect(missingReadings(db, [reading('a')]).map((r) => r.id)).toEqual(['a']);
  });
});
