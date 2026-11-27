/* ---------- Lettura del vecchio archivio, usata solo per il trasferimento su Drive ----------
   Qui ci sono soltanto comandi di LETTURA: i dati di partenza non vengono modificati.
   L'accesso è separato da quello dell'app precedente e non resta salvato sul dispositivo. */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { initializeAuth, inMemoryPersistence, browserPopupRedirectResolver, GoogleAuthProvider, signInWithPopup, signOut, getAdditionalUserInfo, deleteUser } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, collection, getDocFromServer, getDocsFromServer } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const app = initializeApp({
  apiKey: "AIzaSyA6D6lvqErC4rXALCu9Tp_4_iI6fwjjR5k",
  authDomain: "p-finance-app.firebaseapp.com",
  projectId: "p-finance-app",
  appId: "1:157182448469:web:bf091bf38a027e004115dc"
}, 'trasferimento');
const auth = initializeAuth(app, { persistence: inMemoryPersistence, popupRedirectResolver: browserPopupRedirectResolver });
const db = getFirestore(app);
const errore = code => Object.assign(new Error(code), { code });

/* Va chiamata direttamente da un tocco */
export async function accedi() {
  const p = new GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
  const r = await signInWithPopup(auth, p);
  /* Account mai usato nell'app: non va aggiunto all'elenco degli accessi */
  if (getAdditionalUserInfo(r)?.isNewUser) { try { await deleteUser(r.user); } catch (e) {} throw errore('vecchio-nessun-dato'); }
  return r.user.email || '';
}

/* Le date del vecchio archivio diventano testo */
const converti = v => v && typeof v.toDate === 'function' ? v.toDate().toISOString()
  : Array.isArray(v) ? v.map(converti)
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, converti(x)])) : v;
const raccolta = s => Object.fromEntries(s.docs.map(d => [d.id, converti(d.data())]));

export async function leggi() {
  const uid = auth.currentUser && auth.currentUser.uid; if (!uid) throw errore('vecchio-accesso');
  const ps = await getDocFromServer(doc(db, 'users', uid));
  if (!ps.exists()) throw errore('vecchio-nessun-dato');
  const p = ps.data();
  if (p.approved !== true) throw errore('vecchio-non-approvato');
  const [v, s, a] = await Promise.all(['voci', 'storico', 'account'].map(n => getDocsFromServer(collection(db, 'users', uid, n))));
  const profilo = {};
  ['nome', 'esclusi', 'home', 'bil', 'creato'].forEach(k => { if (p[k] !== undefined) profilo[k] = converti(p[k]); });
  profilo.nome = String(profilo.nome || auth.currentUser.displayName || 'Utente').slice(0, 40);
  return { profilo, voci: raccolta(v), storico: raccolta(s), account: raccolta(a) };
}

export const esci = () => signOut(auth);
