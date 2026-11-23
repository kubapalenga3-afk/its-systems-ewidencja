// DEMO — podstawiony Firebase Auth (patrz firebase-app.js).
import { __store, __delay } from './firebase-app.js';

const auths = new Map();

function authError(code) {
  const err = new Error(code);
  err.code = code;
  return err;
}

function emit(auth) {
  auth.listeners.forEach(cb => cb(auth.currentUser));
}

export function getAuth(app) {
  if (!auths.has(app.name)) auths.set(app.name, { app, currentUser: null, listeners: [] });
  return auths.get(app.name);
}

export function onAuthStateChanged(auth, cb) {
  auth.listeners.push(cb);
  setTimeout(() => cb(auth.currentUser), 600);
  return () => { auth.listeners = auth.listeners.filter(x => x !== cb); };
}

export async function signInWithEmailAndPassword(auth, email, password) {
  await __delay(600);
  const acc = __store.accounts[String(email).toLowerCase()];
  if (!acc || acc.password !== password) throw authError('auth/invalid-credential');
  auth.currentUser = { uid: acc.uid, email };
  emit(auth);
  return { user: auth.currentUser };
}

export async function signOut(auth) {
  await __delay(150);
  auth.currentUser = null;
  emit(auth);
}

export async function createUserWithEmailAndPassword(auth, email, password) {
  await __delay(500);
  const key = String(email).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(key)) throw authError('auth/invalid-email');
  if (__store.accounts[key]) throw authError('auth/email-already-in-use');
  if (String(password).length < 6) throw authError('auth/weak-password');
  const uid = 'u-new-' + (++__store.seq);
  __store.accounts[key] = { uid, password };
  auth.currentUser = { uid, email };
  emit(auth);
  return { user: auth.currentUser };
}

export async function sendPasswordResetEmail() {
  await __delay(900);
}
