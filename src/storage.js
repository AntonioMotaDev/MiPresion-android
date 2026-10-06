// Única puerta a las mediciones. La UI no toca SQLite ni localStorage directamente,
// para poder agregar sincronización más adelante sin cambiar las pantallas.
//
// Interfaz: list(), add(reading), remove(id), importMany(readings)
// Una medición: { id, sys, dia, pul, note, ts, created_at }

import { Capacitor } from '@capacitor/core';

const DB_NAME = 'mipresion';
const LS_KEY = 'mi-presion-lecturas';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS lecturas (
  id TEXT PRIMARY KEY NOT NULL,
  sys INTEGER NOT NULL,
  dia INTEGER NOT NULL,
  pul INTEGER,
  note TEXT NOT NULL DEFAULT '',
  ts INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lecturas_ts ON lecturas (ts);
`;

const INSERT_OR_IGNORE =
  'INSERT OR IGNORE INTO lecturas (id, sys, dia, pul, note, ts, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)';

const toRow = (r) => [r.id, r.sys, r.dia, r.pul ?? null, r.note ?? '', r.ts, r.created_at];

function normalize(r) {
  return {
    id: String(r.id),
    sys: Number(r.sys),
    dia: Number(r.dia),
    pul: r.pul == null ? null : Number(r.pul),
    note: r.note ?? '',
    ts: Number(r.ts),
    created_at: Number(r.created_at),
  };
}

const byTs = (a, b) => a.ts - b.ts;

/* ---------- SQLite (Android) ---------- */

async function sqliteBackend() {
  const { CapacitorSQLite, SQLiteConnection } = await import('@capacitor-community/sqlite');
  const sqlite = new SQLiteConnection(CapacitorSQLite);
  await sqlite.checkConnectionsConsistency().catch(() => {});
  const exists = (await sqlite.isConnection(DB_NAME, false)).result;
  const db = exists
    ? await sqlite.retrieveConnection(DB_NAME, false)
    : await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false);
  await db.open();
  await db.execute(SCHEMA);

  const count = async () => (await db.query('SELECT COUNT(*) AS n FROM lecturas')).values[0].n;

  return {
    async list() {
      const res = await db.query('SELECT id, sys, dia, pul, note, ts, created_at FROM lecturas ORDER BY ts');
      return (res.values ?? []).map(normalize);
    },
    async insert(r) {
      await db.run(INSERT_OR_IGNORE, toRow(r));
    },
    async remove(id) {
      await db.run('DELETE FROM lecturas WHERE id = ?', [id]);
    },
    async importMany(readings) {
      if (!readings.length) return 0;
      const before = await count();
      await db.executeSet(readings.map((r) => ({ statement: INSERT_OR_IGNORE, values: toRow(r) })));
      return (await count()) - before;
    },
  };
}

/* ---------- localStorage (navegador, para probar con npm run dev) ---------- */

function localBackend() {
  const read = () => {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    } catch {
      return [];
    }
  };
  const write = (arr) => localStorage.setItem(LS_KEY, JSON.stringify(arr));

  return {
    async list() {
      return read().map(normalize).sort(byTs);
    },
    async insert(r) {
      const arr = read();
      if (!arr.some((x) => x.id === r.id)) write([...arr, r]);
    },
    async remove(id) {
      write(read().filter((x) => x.id !== id));
    },
    async importMany(readings) {
      const arr = read();
      const ids = new Set(arr.map((x) => x.id));
      const fresh = readings.filter((r) => !ids.has(r.id) && ids.add(r.id));
      write([...arr, ...fresh]);
      return fresh.length;
    },
  };
}

/* ---------- interfaz pública ---------- */

let backendPromise = null;
function backend() {
  backendPromise ??= Capacitor.isNativePlatform() ? sqliteBackend() : Promise.resolve(localBackend());
  return backendPromise;
}

export async function list() {
  return (await backend()).list();
}

// Recibe { sys, dia, pul, note, ts } ya validado y devuelve la medición guardada.
export async function add({ sys, dia, pul, note, ts }) {
  const reading = normalize({ id: crypto.randomUUID(), sys, dia, pul, note, ts, created_at: Date.now() });
  await (await backend()).insert(reading);
  return reading;
}

export async function remove(id) {
  return (await backend()).remove(id);
}

// Combina por id: nunca borra ni duplica. Devuelve cuántas mediciones se agregaron.
export async function importMany(readings) {
  return (await backend()).importMany(readings.map(normalize));
}
