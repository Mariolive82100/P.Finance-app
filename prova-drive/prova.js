'use strict';
/* Pagina di prova: salvataggio nella cartella riservata di Google Drive. Solo dati inventati. */
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const NOME = 'prova-drive.json';
const API = 'https://www.googleapis.com/drive/v3/files';
const UP = 'https://www.googleapis.com/upload/drive/v3/files';
const $ = id => document.getElementById(id);

/* Memoria del dispositivo: chiavi con prefisso, per non toccare quelle di P.Finance */
const mem = {
  get(k) { try { return localStorage.getItem('provaDrive_' + k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem('provaDrive_' + k, v); } catch (e) {} },
  del(k) { try { localStorage.removeItem('provaDrive_' + k); } catch (e) {} }
};

let token = null, scadenza = 0;      // permesso temporaneo di Google
let file = null;                     // { id, version } del file letto
let dati = null;
let occupato = false;

try {
  const t = JSON.parse(mem.get('token') || 'null');
  if (t && t.s > Date.now()) { token = t.t; scadenza = t.s; }
} catch (e) {}

const valido = () => !!token && Date.now() < scadenza;
const modo = () => (matchMedia('(display-mode: standalone)').matches || navigator.standalone) ? 'app installata' : 'browser';

function diario(testo) {
  let r = [];
  try { r = JSON.parse(mem.get('diario') || '[]'); } catch (e) {}
  r.unshift(new Date().toLocaleString('it-IT') + ' [' + modo() + '] ' + testo);
  r = r.slice(0, 80);
  mem.set('diario', JSON.stringify(r));
  $('diario').textContent = r.join('\n');
}

function avviso(testo) {
  $('msg').textContent = testo || '';
  $('msg').style.display = testo ? 'block' : 'none';
}

function disegna() {
  const ok = valido();
  $('stato').textContent = ok ? 'Collegato a Drive' : (mem.get('giaCollegato') ? 'Da ricollegare' : 'Non collegato');
  $('scad').textContent = ok ? 'Il permesso dura ancora circa ' + Math.max(1, Math.round((scadenza - Date.now()) / 60000)) + ' min.' : '';
  $('collega').textContent = mem.get('giaCollegato') ? 'Ricollega' : 'Accedi con Google';
  $('collega').style.display = ok ? 'none' : 'block';
  $('collega').disabled = occupato;
  ['modifica', 'ricarica', 'elimina'].forEach(i => $(i).disabled = !ok || occupato || (i === 'modifica' && !dati));
  $('file').disabled = !ok || occupato || !dati;
  $('scarica').disabled = !dati;
  $('scaduto').disabled = !ok || occupato;
  $('scollega').disabled = !token || occupato;
  const tab = $('tab');
  tab.textContent = '';
  if (dati) dati.conti.forEach(c => {
    const tr = tab.insertRow();
    tr.insertCell().textContent = c.nome;
    tr.insertCell().textContent = Math.round(c.saldo).toLocaleString('it-IT', { useGrouping: true }) + ' €';
  });
  $('info').textContent = dati
    ? 'Salvataggio n. ' + dati.numero + ' · ' + new Date(dati.quando).toLocaleString('it-IT') + ' · da ' + dati.da
    : 'Collegati per leggere i dati.';
}

/* ---------- accesso ---------- */
function collega() {
  const id = (mem.get('cid') || '').trim();
  if (!id) { $('conf').open = true; return avviso('Prima incolla e salva l\'ID client.'); }
  if (!window.google || !google.accounts) return avviso('Google non è ancora pronto. Controlla la connessione e riprova.');
  const inizio = Date.now();
  diario('richiesta di accesso');
  const client = google.accounts.oauth2.initTokenClient({
    client_id: id,
    scope: SCOPE,
    callback: async r => {
      if (r.error || !google.accounts.oauth2.hasGrantedAllScopes(r, SCOPE)) {
        diario('accesso rifiutato o incompleto: ' + (r.error || 'permesso Drive non concesso'));
        avviso('Permesso non concesso. Riprova e autorizza l\'accesso a Drive.');
        return;
      }
      token = r.access_token;
      scadenza = Date.now() + (Number(r.expires_in) - 60) * 1000;
      mem.set('token', JSON.stringify({ t: token, s: scadenza }));
      mem.set('giaCollegato', '1');
      diario('accesso riuscito in ' + Math.round((Date.now() - inizio) / 1000) + ' s');
      avviso('');
      await esegui(leggi);
    },
    error_callback: e => {
      diario('finestra di Google non completata: ' + e.type);
      avviso(e.type === 'popup_failed_to_open'
        ? 'La finestra di Google non si è aperta. Consenti le finestre a comparsa e riprova.'
        : 'Accesso interrotto. Riprova.');
    }
  });
  client.requestAccessToken({ prompt: '' });
}

function perdiToken(motivo) {
  token = null; scadenza = 0; mem.del('token');
  diario(motivo);
  disegna();
}

/* ---------- Drive ---------- */
async function chiama(url, opzioni = {}) {
  if (!valido()) { perdiToken('permesso scaduto'); throw new Error('SCADUTO'); }
  const r = await fetch(url, { ...opzioni, cache: 'no-store', headers: { ...(opzioni.headers || {}), Authorization: 'Bearer ' + token } });
  if (r.status === 401) { perdiToken('Google ha rifiutato il permesso (scaduto)'); throw new Error('SCADUTO'); }
  if (!r.ok) {
    let m = '';
    try { m = (await r.json()).error.message; } catch (e) {}
    throw new Error('Drive ' + r.status + (m ? ': ' + m : ''));
  }
  return r;
}

async function cerca() {
  const q = new URLSearchParams({ spaces: 'appDataFolder', q: "name='" + NOME + "'", orderBy: 'createdTime', fields: 'files(id,version)' });
  return (await (await chiama(API + '?' + q)).json()).files[0] || null;
}

const dispositivo = () => (/Mobi|Android|iPhone|iPad/.test(navigator.userAgent) ? 'telefono' : 'computer');

async function scrivi(nuovi) {
  /* Controllo "due dispositivi": se il file è cambiato dopo l'ultima lettura, non si sovrascrive */
  const attuale = await cerca();
  if ((attuale && (!file || attuale.id !== file.id || attuale.version !== file.version)) || (!attuale && file)) throw new Error('CAMBIATO');
  const corpo = { ...nuovi, numero: (dati ? dati.numero : 0) + 1, quando: new Date().toISOString(), da: dispositivo() };
  let id = attuale && attuale.id;
  if (!id) {
    const sep = 'pf' + Date.now();
    const multi = '--' + sep + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify({ name: NOME, parents: ['appDataFolder'] }) +
      '\r\n--' + sep + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(corpo) + '\r\n--' + sep + '--';
    id = (await (await chiama(UP + '?uploadType=multipart&fields=id', { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + sep }, body: multi })).json()).id;
  } else {
    await chiama(UP + '/' + id + '?uploadType=media&fields=id', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
  }
  file = await (await chiama(API + '/' + id + '?fields=id,version')).json();
  dati = corpo;
  diario('salvataggio n. ' + corpo.numero + ' riuscito');
}

async function leggi() {
  const f = await cerca();
  if (!f) {
    file = null; dati = null;
    await scrivi({ prova: true, conti: [
      { nome: 'Conto inventato', saldo: 5000 },
      { nome: 'Risparmi inventati', saldo: 12000 },
      { nome: 'Investimenti inventati', saldo: 30000 }
    ] });
    return;
  }
  const d = await (await chiama(API + '/' + f.id + '?alt=media')).json();
  controlla(d);
  file = f; dati = d;
  diario('lettura riuscita: salvataggio n. ' + d.numero);
}

function controlla(d) {
  if (!d || d.prova !== true || !Array.isArray(d.conti) || !d.conti.every(c => c && typeof c.nome === 'string' && Number.isFinite(c.saldo))) {
    throw new Error('Il file non è una copia di questa prova.');
  }
}

async function esegui(azione) {
  if (occupato) return;
  occupato = true; disegna();
  try { await azione(); }
  catch (e) {
    if (e.message === 'SCADUTO') avviso('Accesso scaduto: premi "Ricollega" e poi ripeti l\'ultima operazione.');
    else if (e.message === 'CAMBIATO') {
      diario('salvataggio bloccato: dati cambiati da un altro dispositivo');
      avviso('I dati sono cambiati su un altro dispositivo. Non ho sovrascritto nulla: premi "Rileggi da Drive" e riprova.');
    } else {
      diario('errore: ' + e.message);
      avviso('Operazione non riuscita. ' + e.message);
    }
  }
  occupato = false; disegna();
}

/* ---------- pulsanti ---------- */
$('cid').value = mem.get('cid') || '';
$('conf').open = !mem.get('cid');
$('salvaCid').onclick = () => {
  const v = $('cid').value.trim();
  if (!/\.apps\.googleusercontent\.com$/.test(v)) return avviso('L\'ID client deve finire con .apps.googleusercontent.com');
  mem.set('cid', v); $('conf').open = false; avviso(''); disegna();
};
$('collega').onclick = collega;
$('scollega').onclick = () => { perdiToken('scollegato a mano'); dati = null; file = null; avviso(''); disegna(); };
$('scaduto').onclick = () => { perdiToken('scadenza simulata'); avviso('Ora premi "Ricollega" e conta quanti tocchi servono.'); };
$('modifica').onclick = () => esegui(async () => {
  const conti = dati.conti.map(c => ({ ...c }));
  const c = conti[Math.floor(Math.random() * conti.length)];
  c.saldo += 100;
  await scrivi({ prova: true, conti });
  avviso('Salvato: ' + c.nome + ' +100 €.');
});
$('ricarica').onclick = () => esegui(async () => { await leggi(); avviso('Dati riletti da Drive.'); });
$('scarica').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(dati, null, 2)], { type: 'application/json' }));
  a.download = 'copia-prova-drive.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  diario('copia scaricata');
};
$('file').onchange = ev => {
  const f = ev.target.files[0];
  ev.target.value = '';
  if (!f) return;
  esegui(async () => {
    let d;
    try { d = JSON.parse(await f.text()); } catch (e) { throw new Error('File non leggibile.'); }
    controlla(d);
    if (!confirm('Sostituire i dati di prova con quelli della copia?')) return;
    await scrivi({ prova: true, conti: d.conti.map(c => ({ nome: c.nome, saldo: c.saldo })) });
    avviso('Copia ripristinata.');
  });
};
$('elimina').onclick = () => {
  if (!confirm('Eliminare definitivamente il file di prova da Drive?')) return;
  esegui(async () => {
    const f = await cerca();
    if (f) await chiama(API + '/' + f.id, { method: 'DELETE' });
    file = null; dati = null;
    diario('dati di prova eliminati');
    avviso('Dati di prova eliminati.');
  });
};
$('copia').onclick = async () => {
  try { await navigator.clipboard.writeText($('diario').textContent); avviso('Diario copiato.'); }
  catch (e) { avviso('Copia non riuscita: seleziona il testo a mano.'); }
};
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (token && !valido()) perdiToken('permesso scaduto (alla riapertura)');
  disegna();
});
setInterval(() => { if (token && !valido()) perdiToken('permesso scaduto'); else if (!occupato) disegna(); }, 30000);

diario('pagina aperta: ' + (valido() ? 'permesso ancora valido' : 'serve il collegamento'));
disegna();
/* Con un permesso ancora valido i dati si rileggono da soli */
if (valido()) esegui(leggi);
