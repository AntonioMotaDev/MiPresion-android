// Prueba de storage.js en modo navegador (localStorage), como lo usa la app al restaurar.
import { describe, it, expect, beforeEach } from 'vitest';

const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
};

const storage = await import('../src/storage.js');
const r = (id, ts) => ({ id, sys: 125, dia: 80, pul: null, note: '', ts, created_at: ts });

describe('storage.importMany', () => {
  beforeEach(() => mem.clear());

  it('restaurar dos veces el mismo respaldo no duplica', async () => {
    await storage.add({ sys: 120, dia: 80, pul: 70, note: '', ts: 1_800_000_000_000 });
    const backup = [r('a', 1_790_000_000_000), r('b', 1_791_000_000_000)];
    expect(await storage.importMany(backup)).toBe(2);
    expect(await storage.importMany(backup)).toBe(0);
    const all = await storage.list();
    expect(all).toHaveLength(3);
    expect(all.map((x) => x.id).slice(0, 2)).toEqual(['a', 'b']); // ordenadas por fecha
  });
});
