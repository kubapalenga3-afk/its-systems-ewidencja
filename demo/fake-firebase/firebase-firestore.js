// DEMO — podstawiony Firestore trzymający dane w pamięci (patrz firebase-app.js).
// Obsługuje dokładnie to, czego używa index.html: collection/doc/query/where,
// getDocs/getDoc/setDoc(merge)/addDoc/deleteDoc i Timestamp.now().
import { __store, __delay } from './firebase-app.js';

const table = name => (__store[name] ||= {});
const clone = obj => JSON.parse(JSON.stringify(obj));

function matches(value, op, expected) {
  switch (op) {
    case '==': return value === expected;
    case '>=': return value >= expected;
    case '<=': return value <= expected;
    case '>':  return value >  expected;
    case '<':  return value <  expected;
    default: throw new Error('Demo Firestore: nieobsługiwany operator ' + op);
  }
}

function docSnap(id, data) {
  return {
    id,
    exists: () => data !== undefined,
    data: () => (data === undefined ? undefined : clone(data))
  };
}

export function getFirestore(app) { return { app }; }
export function collection(db, name) { return { name }; }
export function doc(db, name, id) { return { name, id }; }
export function where(field, op, value) { return { field, op, value }; }
export function orderBy() { return null; }
export function query(col, ...constraints) {
  return { name: col.name, constraints: constraints.filter(Boolean) };
}

export async function getDocs(ref) {
  await __delay(120);
  const constraints = ref.constraints || [];
  const docs = Object.entries(table(ref.name))
    .filter(([, d]) => constraints.every(c => matches(d[c.field], c.op, c.value)))
    .map(([id, d]) => docSnap(id, d));
  return { docs, size: docs.length, empty: !docs.length, forEach: fn => docs.forEach(fn) };
}

export async function getDoc(ref) {
  await __delay(80);
  return docSnap(ref.id, table(ref.name)[ref.id]);
}

export async function setDoc(ref, data, options) {
  await __delay(250);
  const t = table(ref.name);
  t[ref.id] = options?.merge ? { ...(t[ref.id] || {}), ...clone(data) } : clone(data);
}

export async function addDoc(col, data) {
  await __delay(300);
  const id = 'e-new-' + (++__store.seq);
  table(col.name)[id] = clone(data);
  return { id };
}

export async function deleteDoc(ref) {
  await __delay(200);
  delete table(ref.name)[ref.id];
}

export const Timestamp = {
  now: () => ({ seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 })
};
