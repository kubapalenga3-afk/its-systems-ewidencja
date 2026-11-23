// DEMO — podstawiony moduł Firebase używany WYŁĄCZNIE przy nagrywaniu filmu demo
// (demo/record.cjs przekierowuje na niego adresy www.gstatic.com/firebasejs/...).
// Prawdziwa apka i prawdziwa baza danych nie są tu w ogóle dotykane.
import { buildSeed } from './seed.js';

if (!globalThis.__itsDemoStore) globalThis.__itsDemoStore = buildSeed();
export const __store = globalThis.__itsDemoStore;

// Lekkie opóźnienie, żeby demo wyglądało jak praca z prawdziwym serwerem.
export const __delay = (ms) => new Promise(r => setTimeout(r, ms));

export function initializeApp(options, name = '[DEFAULT]') {
  return { name, options };
}
