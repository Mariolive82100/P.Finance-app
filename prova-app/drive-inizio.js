'use strict';
/* ---------- Primo accesso: trasferimento dalla versione precedente oppure inizio da zero ---------- */
let vecchio = null, vecchioEmail = '';

function paginaBenvenuto(el) {
  const carta = html => {
    el.innerHTML = `<div class="auth card">${html}<div class="msg" id="am">${esc(S.msg)}</div></div>`;
    el.querySelectorAll('[data-b]').forEach(b => { b.onclick = () => azioneBenvenuto(b.dataset.b, b); });
  };
  const largo = 'style="width:100%;margin-top:10px"';
  const esci = `<button class="b s" ${largo} data-act="logout">Esci</button>`;
  if (!S.profile) return carta(`<h2>Dati non caricati</h2><button class="b" ${largo} data-act="refresh">Riprova</button>${esci}`);
  if (!Archivio.stato().scrivibile && S.benv !== 'esito') return carta(`<h2>Collegamento scaduto</h2><p>Ricollegati a Google Drive per continuare.</p><button class="b" ${largo} data-b="ricollega">Ricollega</button>${esci}`);
  const aMeta = (S.profile.trasferimento || {}).stato === 'da-verificare';
  const indietro = aMeta ? '' : `<button class="b s" ${largo} data-b="indietro">Indietro</button>`;

  if (S.benv === 'esito') {
    const n = S.benvNumeri;
    return carta(`<h2>Trasferimento completato</h2><p>I dati sono stati riletti da Drive e confrontati con gli originali: <b>coincidono</b>.</p>
      <ul class="c"><li>Voci e portafogli: ${n.voci}${n.arch ? ' (di cui ' + n.arch + ' archiviate)' : ''}</li><li>Mesi di storico: ${n.storico}</li><li>Account aggiuntivi: ${n.account}</li></ul>
      <p class="note">I dati del vecchio archivio non sono stati modificati.</p><button class="b" ${largo} data-b="entra">Entra nell'app</button>`);
  }
  if (S.benv === 'vecchio' || aMeta) {
    if (!vecchio) preparaVecchio();
    return carta(`<h2>Trasferisci i tuoi dati</h2>${aMeta ? '<p><b>Il trasferimento precedente non è terminato:</b> ripetilo.</p>' : ''}
      <p><b>1.</b> Accedi al vecchio archivio con l'account Google che usavi nell'app.</p>
      ${vecchioEmail ? `<p class="note">Accesso eseguito: ${esc(vecchioEmail)}</p>` : ''}
      <button class="b${vecchioEmail ? ' s' : ''}" ${largo} data-b="accedi" ${vecchio ? '' : 'disabled'}>${!vecchio ? 'Preparazione…' : vecchioEmail ? 'Cambia account' : 'Accedi al vecchio archivio'}</button>
      <p style="margin-top:16px"><b>2.</b> Copia i dati nel tuo Google Drive e controllali.</p>
      <button class="b" ${largo} data-b="trasferisci" ${vecchioEmail ? '' : 'disabled'}>Trasferisci i miei dati</button>${indietro}`);
  }
  if (S.benv === 'zero') return carta(`<h2>Inizia da zero</h2><label class="lbl">Come ti chiami?</label><input id="bnome" maxlength="40" placeholder="Il tuo nome"><button class="b" ${largo} data-b="crea">Continua</button>${indietro}`);
  return carta(`<h2>Benvenuto</h2><p>In questo Google Drive non ci sono ancora dati di P.Finance.</p>
    <button class="b" ${largo} data-b="vecchio">Ho già usato l'app</button><p class="note">Trasferisci i dati dalla versione precedente.</p>
    <button class="b s" ${largo} data-b="zero">Inizio da zero</button>
    <p class="note">Avevi già trasferito i dati e non li vedi? Premi Esci e scegli lo stesso account Google usato allora.</p>${esci}`);
}

async function preparaVecchio() {
  if (preparaVecchio.attesa) return;
  preparaVecchio.attesa = true;
  try { vecchio = await import('./vecchio-archivio.js'); }
  catch (e) { S.msg = 'Vecchio archivio non raggiungibile. Controlla la connessione, poi chiudi e riapri l\'app.'; }
  if (S.profile && !S.profile.approved) render();
}

async function azioneBenvenuto(cosa, tasto) {
  const nome = cosa === 'crea' ? $('bnome').value.trim() : '';
  S.msg = '';
  if (cosa === 'vecchio' || cosa === 'zero') { S.benv = cosa; return render(); }
  if (cosa === 'indietro') {
    S.benv = null;
    if (S.profile.nome) S.profile.approved = true;
    return render();
  }
  if (cosa === 'crea' && !nome) { S.msg = 'Scrivi il tuo nome.'; return render(); }
  tasto.disabled = true;
  try {
    if (cosa === 'ricollega') { await Archivio.collega(); await window.driveRicarica(); }
    if (cosa === 'crea') { await setDoc(doc(db, 'users', 'drive'), { nome }, { merge: true }); await window.driveRicarica(); S.benv = null; }
    if (cosa === 'accedi') { const finestra = vecchio.accedi(); vecchioEmail = ''; vecchioEmail = await finestra; }
    if (cosa === 'trasferisci') {
      tasto.textContent = 'Trasferimento in corso…';
      const dati = await vecchio.leggi();
      await Archivio.importa(dati);
      S.benvNumeri = { voci: Object.keys(dati.voci).length, arch: Object.values(dati.voci).filter(v => v.archiviata).length, storico: Object.keys(dati.storico).length, account: Object.keys(dati.account).length };
      S.benv = 'esito'; vecchioEmail = ''; try { await vecchio.esci(); } catch (e) {}
    }
    if (cosa === 'entra') { await window.driveRicarica(); S.benv = null; S.tab = innerWidth >= 1000 ? 'pan' : 'pat'; }
  } catch (e) { S.msg = window.errText(e); }
  render();
}
