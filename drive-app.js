'use strict';
/* ---------- Collegamento tra app e archivio Drive (va caricato DOPO azioni.js) ---------- */
(() => {
  /* Codice pubblico dell'app per l'accesso a Google (non è una password) */
  Archivio.configura({ clientId: '123810645490-iikqffltvem9qhud133kdfr0re0nof4g.apps.googleusercontent.com' });
  const MESSAGGI = {
    'drive-scaduto': 'NON salvato: il collegamento a Drive è scaduto. Premi « Ricollega » e ripeti l\'operazione.',
    'drive-sola-lettura': 'NON salvato: sei in sola lettura. Premi « Ricollega » e ripeti l\'operazione.',
    'drive-conflitto': 'NON salvato: i dati sono cambiati su un altro dispositivo. Premi « Ricollega » per rileggerli e poi ripeti.',
    'network-drive': 'Salvataggio NON confermato: problema di connessione. Premi « Ricollega » e controlla i dati prima di ripetere.',
    'network-google': 'Google non è raggiungibile. Controlla la connessione e riprova.',
    'drive-permesso-negato': 'Permesso non concesso: autorizza l\'accesso a Drive.',
    'drive-non-configurato': 'Collegamento a Google non configurato.',
    'drive-file-non-valido': 'Il file non è una copia valida di P.Finance. Nessun dato è stato cambiato.',
    'vecchio-nessun-dato': 'Per questo account non risultano dati nella versione precedente. Prova con un altro account.',
    'vecchio-non-approvato': 'Questo account non era stato approvato nella versione precedente: non ci sono dati da trasferire.',
    'vecchio-accesso': 'Ripeti il passo 1: accedi al vecchio archivio.',
    'unavailable': 'Vecchio archivio non raggiungibile. Controlla la connessione e riprova.',
    'permission-denied': 'Operazione non permessa.',
    'drive-gia-presente': 'Su Drive ci sono già dei dati: non sono stati sovrascritti.',
    'trasferimento-diverso': 'Trasferimento NON completato: la copia su Drive non coincide con l\'originale. I dati di partenza non sono stati toccati.',
    'drive-versione-nuova': 'I dati sono di una versione più recente dell\'app. Chiudi e riapri l\'app per aggiornarla.'
  };
  const testoDi = e => MESSAGGI[e && e.code] || null;
  const errTextBase = window.errText;
  window.errText = e => testoDi(e) || errTextBase(e);

  const velo = on => {
    let v = document.getElementById('dvelo');
    if (on && !v) {
      v = document.createElement('div'); v.id = 'dvelo'; v.setAttribute('role', 'status'); v.textContent = 'Salvataggio su Drive…';
      v.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(241,245,244,.82);display:flex;align-items:center;justify-content:center;font-weight:700;color:#0f3f3a';
      document.body.appendChild(v);
    } else if (!on && v) v.remove();
  };

  /* Dopo un salvataggio fallito la schermata torna ai dati confermati */
  async function riallinea(messaggio) {
    if (S.data && !S.demo) {
      const ps = await getDoc(doc(db, 'users', 'drive'));
      S.profile = profiloDa(ps.data());
      try { await caricaDati('drive', S.profile.nome); } catch (e) { console.warn('Rilettura incompleta', e.code); }
    }
    S.msg = messaggio; render();
  }
  const raggruppa = f => async (...args) => {
    if (S.demo) return f(...args);
    try { return await Archivio.gruppo(() => f(...args), velo); }
    catch (e) { await riallinea(window.errText(e)); }
  };

  /* In sola lettura l'app non deve provare ad aggiornare nulla da sola */
  const syncBase = window.syncStorico, migraBase = window.migraCategorie;
  window.syncStorico = async () => { if (Archivio.stato().scrivibile) return syncBase(); };
  window.migraCategorie = async (...a) => { if (Archivio.stato().scrivibile) return migraBase(...a); };
  /* Se il permesso è scaduto, il tocco su « Accetto » ricollega prima di registrare */
  const actBase = window.act;
  window.act = async el => {
    if (!S.demo && el.dataset.act === 'accept' && $('tc') && $('tc').checked && !Archivio.stato().scrivibile) {
      try { await Archivio.collega(); S.profile = (await window.getDoc(doc(db, 'users', 'drive'))).data(); S.msg = ''; } catch (e) { S.msg = window.errText(e); }
      return render();
    }
    return actBase(el);
  };
  const caricaDati = window.loadData;
  window.loadData = raggruppa(caricaDati);
  ['act', 'commitDel', 'homeSalva', 'impStoricoApplica', 'impPortApplica'].forEach(n => { window[n] = raggruppa(window[n]); });

  /* Il profilo non ha più approvazione né amministratore */
  /* "approved" qui significa solo che il primo accesso è completato */
  const profiloDa = p => ({ ...p, nome: (p && p.nome) || '', approved: !!(p && p.nome) && (p.trasferimento || {}).stato !== 'da-verificare' });
  const getDocBase = window.getDoc;
  window.getDoc = async r => {
    const s = await getDocBase(r);
    return r.parti.length === 2 ? { id: s.id, exists: () => true, data: () => profiloDa(s.data()) } : s;
  };

  window.driveRicarica = async () => {
    S.profile = (await window.getDoc(doc(db, 'users', 'drive'))).data();
    await window.loadData('drive', S.profile.nome);
  };

  window.driveGuasto = e => { S.msg = window.errText(e); const am = document.getElementById('am'); if (am) am.textContent = S.msg; else render(); };

  async function ricollega() {
    try {
      await Archivio.collega();
      S.profile = (await window.getDoc(doc(db, 'users', 'drive'))).data();
      S.msg = 'Dati aggiornati da Drive.';
      await window.loadData('drive', S.profile.nome); render();
    } catch (e) { S.msg = window.errText(e); render(); }
  }

  function scaricaCopia() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([Archivio.esporta()], { type: 'application/json' }));
    a.download = 'pfinance-copia-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  async function dopoRipristino(f) {
    velo(true);
    try { await f(); velo(false); await riallinea('Copia ripristinata. I dati di prima sono conservati tra le copie.'); }
    catch (e) { velo(false); await riallinea(window.errText(e)); }
  }
  const quandoIt = q => q ? new Date(q).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }) : '';

  function cartaCopie() {
    const c = document.createElement('div'); c.className = 'card'; c.id = 'dcopie';
    c.innerHTML = '<h2>Copie di sicurezza</h2><div class="lbl">Scarica ogni tanto una copia: se si cancella la cartella dell\'app su Drive si perdono anche le copie salvate lì.</div>' +
      '<div class="acts"><button class="b" type="button" data-d="scarica">Scarica copia</button><label class="b s">Ripristina da file<input type="file" accept=".json,application/json" data-d="file" hidden></label><button class="b s" type="button" data-d="elenco">Copie su Drive</button></div><div data-d="lista"></div>';
    const q = s => c.querySelector('[data-d="' + s + '"]');
    q('scarica').onclick = scaricaCopia;
    q('file').onchange = async ev => {
      const f = ev.target.files[0]; ev.target.value = ''; if (!f) return;
      let d; try { d = JSON.parse(await f.text()); } catch (e) { S.msg = MESSAGGI['drive-file-non-valido']; return render(); }
      if (confirm('Sostituire TUTTI i dati con quelli della copia?')) await dopoRipristino(() => Archivio.ripristina(d));
    };
    q('elenco').onclick = async () => {
      const l = q('lista'); l.textContent = 'Ricerca…';
      try {
        const copie = await Archivio.copie(); l.textContent = copie.length ? '' : 'Nessuna copia ancora: la prima si crea con la prima modifica di una giornata.';
        copie.forEach(x => {
          const r = document.createElement('div'); r.className = 'row';
          const n = document.createElement('div'); n.className = 'n';
          n.textContent = x.prima ? 'Dati di prima dell\'ultimo ripristino (' + quandoIt(x.quando) + ')' : 'Copia del ' + x.nome.slice(15, 25).split('-').reverse().join('/');
          const b = document.createElement('button'); b.type = 'button'; b.className = 'b s sm'; b.textContent = 'Ripristina';
          b.onclick = async () => { if (confirm('Sostituire TUTTI i dati con questa copia?')) await dopoRipristino(() => Archivio.ripristinaDaDrive(x.id)); };
          r.append(n, b); l.appendChild(r);
        });
      } catch (e) { l.textContent = window.errText(e); }
    };
    return c;
  }

  /* Rimedio per chi ha scelto « Inizio da zero » per sbaglio: visibile solo finché non ci sono dati */
  function cartaTrasferimento() {
    const c = document.createElement('div'); c.className = 'card';
    c.innerHTML = '<h2>Usavi già l\'app?</h2><div class="lbl">Finché qui non registri dati, puoi trasferire quelli della versione precedente.</div><div class="acts"><button class="b s" type="button">Trasferisci i miei dati</button></div>';
    c.querySelector('button').onclick = () => { S.benv = 'vecchio'; S.msg = ''; S.profile.approved = false; render(); };
    return c;
  }

  function barra() {
    const vecchia = document.getElementById('dbarra'), st = Archivio.stato();
    if (vecchia) vecchia.remove();
    if (window.PF_PROVA && !document.getElementById('dprova')) {
      const p = document.createElement('div'); p.id = 'dprova'; p.textContent = 'VERSIONE DI PROVA';
      p.style.cssText = 'position:fixed;left:8px;bottom:calc(env(safe-area-inset-bottom,0px) + 76px);z-index:100001;background:#b45309;color:#fff;font:700 11px system-ui,sans-serif;padding:4px 8px;border-radius:8px;pointer-events:none';
      document.body.appendChild(p);
    }
    const main = document.querySelector('#app main');
    if (!main || S.demo || !S.data) return;
    if (!st.scrivibile) {
      const b = document.createElement('div'); b.id = 'dbarra'; b.className = 'msg'; b.style.cssText = 'display:flex;gap:8px;align-items:center;justify-content:space-between';
      const t = document.createElement('span'); t.textContent = 'Sola lettura · dati del ' + quandoIt(st.quando);
      const k = document.createElement('button'); k.type = 'button'; k.className = 'b sm'; k.textContent = 'Ricollega'; k.onclick = ricollega;
      b.append(t, k); main.prepend(b);
    }
    if (S.tab === 'rep' && !document.getElementById('dcopie')) {
      main.appendChild(cartaCopie());
      if (st.scrivibile && Archivio.trasferibile()) main.appendChild(cartaTrasferimento());
    }
  }
  const renderBase = window.render;
  window.render = (...a) => { const r = renderBase(...a); barra(); return r; };
  /* La scadenza del permesso si vede subito, senza ridisegnare i moduli in compilazione */
  let prima = null;
  const controllaScadenza = () => { const ora = Archivio.stato().scrivibile; if (ora !== prima) { prima = ora; barra(); } };
  setInterval(controllaScadenza, 20000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') controllaScadenza(); });
  Archivio.ascolta(() => { prima = Archivio.stato().scrivibile; });
})();
