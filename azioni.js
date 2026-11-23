'use strict';
/* ---------- Azioni ---------- */
function exportCsv() {
  const D = S.data, n = v => String(v).replace('.', ',');
  const q = s => '"' + String(s).replace(/"/g, '""') + '"';
  let out = 'Tipo;Categoria;Account;Nome;Valore;Dove;Obiettivo;AssetClass\n' + D.voci.map(v => [v.tipo, q(v.categoria), q(accName(v)), q(v.nome), n(v.valore), q(v.dove || ''), v.obiettivo ? n(v.obiettivo) : '', q(v.assetClass || '')].join(';')).join('\n');
  out += '\n\nMese;Attivi;Passivi;Netto\n' + D.storico.map(s => [s.mese, n(s.attivi), n(s.passivi), n(s.netto)].join(';')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + out], { type: 'text/csv;charset=utf-8' }));
  a.download = 'pfinance_' + D.nome.replace(/[^a-z0-9]/gi, '') + '_' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click(); URL.revokeObjectURL(a.href);
}

const FIDS = ['ft', 'fm', 'fa', 'fc', 'fn', 'fv', 'fk', 'fi', 'ff', 'fw', 'fwn', 'fo', 'fac'];
function grabForm() {
  const o = {}; FIDS.forEach(id => { const e = $(id); if (e) o[id] = e.value; });
  return o;
}

/* Avviso con Annulla (10 secondi): l'eliminazione vera parte solo allo scadere */
async function commitDel() {
  const u = S.undo; if (!u || u.kind !== 'del') return;
  clearTimeout(S.undoT); S.undo = null; S.toast = null;
  try { await deleteDoc(doc(db, 'users', S.data.uid, 'voci', u.x.id)); } catch (e) { (u.wasArch ? S.data.arch : S.data.voci).push(u.x); S.msg = errText(e); }
}
function setUndo(txt, u) {
  clearTimeout(S.undoT); S.undo = u; S.toast = txt;
  S.undoT = setTimeout(async () => { if (S.undo && S.undo.kind === 'del') await commitDel(); else { S.undo = null; S.toast = null; } if (S.data) render(); }, 10000);
}
const keepTT = () => { const t = document.querySelector('.tt'); if (t && S.ttl != null) t.scrollLeft = S.ttl; };
async function act(el) {
  let a = el.dataset.act; const v = el.dataset.v, D = S.data;
  S.msg = '';
  try {
    if (a === 'shsave') { const u = $('shu').value.trim(), t = $('sht').value.trim(); if (!/^https:\/\/script\.google\.com\/.+\/exec/.test(u) || !t) { S.msg = 'Servono l\'indirizzo dello script (finisce con /exec) e la chiave.'; return render(); } try { localStorage.setItem('pf_sheet', JSON.stringify({ url: u, token: t })); } catch (e) {} S.msg = 'Collegamento salvato.'; return render(); }
    if (a === 'shdel') { try { localStorage.removeItem('pf_sheet'); } catch (e) {} S.msg = 'Foglio scollegato.'; return render(); }
    if (a === 'shtest') { const c = sheetCfg(); if (!c) return; try { const j = await chiamaFoglio(c, { prova: '1' }); S.msg = j.ok ? 'Collegamento riuscito.' : 'Lo script risponde ma: ' + (j.errore || 'errore') + '.'; } catch (e) { S.msg = 'Lo script non risponde: controlla indirizzo e pubblicazione.'; } return render(); }
    if (a === 'info') { S.tab = 'info'; S.menu = false; window.scrollTo(0, 0); return render(); }
    if (a === 'terms') { S.tab = 'terms'; S.menu = false; return render(); }
    if (a === 'demo') return avviaDemo();
    if (a === 'demoexit') return location.reload();
    if (a === 'cnd') { S.tab = 'cnd'; S.menu = false; window.scrollTo(0, 0); return render(); }
    if (a === 'cndcopy') { try { await navigator.clipboard.writeText(S.user.uid); S.msg = 'Codice copiato.'; } catch (e) { S.msg = 'Copia non riuscita: tieni premuto sul codice e copialo.'; } return render(); }
    if (a === 'cndadd' || a === 'cnddel') {
      const mio = S.user.uid, vw = [...((S.profile && S.profile.viewers) || [])];
      let nv;
      if (a === 'cnddel') nv = vw.filter(x => x !== v);
      else {
        const c = ($('cndu') ? $('cndu').value : '').trim(), n = ($('cndn') ? $('cndn').value : '').trim();
        if (!/^[A-Za-z0-9]{20,40}$/.test(c) || c === mio) { S.msg = 'Il codice non è valido.'; return render(); }
        if (vw.includes(c)) { S.msg = 'Questa persona ha già l\'accesso.'; return render(); }
        if (vw.length >= 10) { S.msg = 'Puoi condividere al massimo con 10 persone.'; return render(); }
        nv = [...vw, c]; if (n) { const l = lsJ('pf_lbl', {}); l[c] = n; try { localStorage.setItem('pf_lbl', JSON.stringify(l)); } catch (e) {} }
      }
      await updateDoc(doc(db, 'users', mio), { viewers: nv }); S.profile.viewers = nv; S.msg = 'Accesso aggiornato.'; return render();
    }
    if (a === 'cndaddv') {
      const c = ($('cndv') ? $('cndv').value : '').trim(), n = ($('cndw') ? $('cndw').value : '').trim() || 'Persona';
      if (!/^[A-Za-z0-9]{20,40}$/.test(c) || c === S.user.uid) { S.msg = 'Il codice non è valido.'; return render(); }
      const l = lsJ('pf_visti', []).filter(x => x.uid !== c); l.push({ uid: c, nome: n }); try { localStorage.setItem('pf_visti', JSON.stringify(l)); } catch (e) {} S.msg = 'Persona aggiunta.'; return render();
    }
    if (a === 'cndrim') { try { localStorage.setItem('pf_visti', JSON.stringify(lsJ('pf_visti', []).filter(x => x.uid !== v))); } catch (e) {} return render(); }
    if (a === 'cndvedi') { const x = lsJ('pf_visti', []).find(y => y.uid === v); if (x) return vediDi(x.uid, x.nome); return; }
    if (a === 'tornaMio') return tornaMio();
    if (a === 'imp') { S.tab = 'imp'; S.menu = false; S.imp = null; S.impErr = null; window.scrollTo(0, 0); return render(); }
    if (a === 'impcl') { if (S.imp && S.imp.righe[+v]) S.imp.righe[+v].classe = el.value; return; }
    if (a === 'impno') { S.imp = null; S.impErr = null; return render(); }
    if (a === 'impsok') return impStoricoApplica();
    if (a === 'impPok') return impPortApplica();
    if (a === 'accept') {
      if (!$('tc') || !$('tc').checked) { S.msg = 'Per continuare devi spuntare la casella di accettazione.'; return render(); }
      await updateDoc(doc(db, 'users', S.user.uid), { termini: TERMS_V, terminiAt: serverTimestamp() });
      S.profile.termini = TERMS_V; S.msg = ''; return render();
    }
    if (a === 'pg') {
      const i = ORD.indexOf(S.tab), n = i + (+v); if (i < 0 || n < 0 || n >= ORD.length) return;
      S.tab = ORD[n]; render(); window.scrollTo(0, 0);
      return;
    }
    if (a === 'mode') { S.mode = v; return render(); }
    if (a === 'google') { await signInWithPopup(auth, new GoogleAuthProvider()); return; }
    if (a === 'logout') { S.tab = 'pat'; S.menu = false; S.pop = null; S.fAcc = 'all'; await signOut(auth); try { await terminate(db); await clearIndexedDbPersistence(db); } catch (e) {} return location.reload(); }
    if (a === 'refresh') return location.reload();
    if (a === 'hide') { S.hide = !hideAmt(); try { localStorage.setItem('pf_hide', S.hide ? '1' : '0'); } catch (e) {} return render(); }
    if (a === 'tab') { S.tab = v; return render(); }
    if (a === 'bil') { S.tab = 'bil'; S.menu = false; window.scrollTo(0, 0); return render(); }
    if (a === 'rfs') return aggiornaPrezzi(true);
    if (a === 'accsel') { S.cx = false; S.thl = null; S.tab = S.tab === 'alb' || S.tab === 'con' || S.tab === 'por' || S.tab === 'ben' || S.tab === 'pas' ? S.tab : 'pan'; S.cfm = false; S.fAcc = v; S.edit = null; S.fd = null; S.addAcc = false; S.pp = ['r']; S.pieSel = null; window.scrollTo(0, 0); return render(); }
    if (a === 'pano') { S.cx = false; S.thl = null; S.tab = 'pan'; S.cfm = false; S.fAcc = 'all'; S.edit = null; S.fd = null; S.addAcc = false; S.pp = ['r']; S.pieSel = null; window.scrollTo(0, 0); return render(); }
    if (a === 'accT') { S.accOpen = !(S.accOpen || (S.tab === 'pan' && (S.fAcc || 'all') !== 'all')); S.addAcc = false; return render(); }
    if (a === 'nv') { S.tab = 'nv'; S.edit = null; S.fd = null; S.exp = { ...(S.exp || {}), form: true }; window.scrollTo(0, 0); return render(); }
    if (a === 'facc') { S.fAcc = S.fAcc === v && v !== 'all' ? 'all' : v; S.edit = null; S.menu = false; S.addAcc = false; return render(); }
    if (a === 'admin') { S.tab = 'adm'; S.menu = false; S.addAcc = false; return render(); }
    if (a === 'exp') { S.exp = S.exp || {}; S.exp[v] = !S.exp[v]; return render(); }
    if (a === 'menu') { S.menu = !S.menu; S.addAcc = false; return render(); }
    if (a === 'addo') { S.addAcc = true; render(); const i = $('an'); if (i) i.focus(); return; }
    if (a === 'addc') { S.addAcc = false; return render(); }
    if (a === 'pop') { S.pop = { id: v, mode: 'menu' }; return render(); }
    if (a === 'popclose') { S.pop = null; render(); return keepTT(); }
    if (a === 'tleaf') { const t = document.querySelector('.tt'); S.ttl = t ? t.scrollLeft : null; S.pop = { id: v, mode: 'menu' }; render(); return keepTT(); }
    if (a === 'popback') { if (S.pop.only) { S.pop = null; render(); return keepTT(); } S.pop.mode = 'menu'; return render(); }
    if (a === 'popupd') { S.pop.mode = 'upd'; return render(); }
    if (a === 'popdel') { S.pop.mode = 'del'; return render(); }
    if (a === 'popedit' && innerWidth >= 1000 && (D.voci.find(z => z.id === S.pop.id) || {}).categoria === 'Investimenti') { const x = D.voci.find(z => z.id === S.pop.id); S.tab = 'por'; S.pe = isPort(x) ? x.id : null; S.pd = null; S.pop = null; S.tex = false; return render(); }
    if (a === 'popedit') { S.edit = S.pop.id; S.fd = null; S.pop = null; if (innerWidth >= 1000) S.tab = 'nv'; S.tex = false; render(); const f = $('formvoce'); if (f) f.scrollIntoView({ behavior: 'smooth' }); return; }
    if (a === 'updsave') {
      const x = D.voci.find(z => z.id === S.pop.id), nv = pnum($('pv').value);
      if (!isFinite(nv) || nv < 0) { S.msg = 'Inserisci un valore valido (zero o più).'; return render(); }
      const { id: _i, ...rest } = x, dati = { ...rest, valore: r2(nv) };
      await setDoc(doc(db, 'users', D.uid, 'voci', x.id), dati); Object.assign(x, dati);
      await syncStorico(); S.pop = null; S.msg = 'Valore aggiornato.'; render(); return keepTT();
    }
    if (a === 'poparch') {
      const x0 = D.voci.find(z => z.id === S.pop.id);
      if (x0 && x0.valore !== 0) { S.pop.mode = 'arch'; return render(); }
      a = 'poparchok';
    }
    if (a === 'sort') { const [t, c] = v.split('|'), s = sortSt(t); S.sort = S.sort || {}; S.sort[t] = s && s.c === c ? { c, d: s.d === 'a' ? 'd' : 'a' } : { c, d: 'a' }; return render(); }
    if (a === 'ccol') { S.ccol = S.ccol || {}; S.ccol[v] = !(S.ccol[v] !== undefined ? S.ccol[v] : S.ccAll !== false); return render(); }
    if (a === 'ccolall') { S.ccol = {}; S.ccAll = v === '1'; S.acol = {}; accList(D).forEach(([k]) => { S.acol[k] = v === '1'; }); return render(); }
    if (a === 'acol') { S.acol = S.acol || {}; S.acol[v] = !accCol(v); return render(); }
    if (a === 'pcol') { S.pcol = S.pcol || {}; S.pcol[v] = !pCol(v); return render(); }
    if (a === 'pcolall') { S.acol = {}; S.pcol = {}; accList(D).forEach(([k]) => { S.acol[k] = v === '1'; }); D.voci.filter(isPort).forEach(x => { S.pcol[x.id] = v === '1'; }); return render(); }
    if (a === 'cfm') { S.cfm = true; return render(); }
    if (a === 'cfmno') { S.cfm = false; return render(); }
    if (a === 'carcs') { S.carc = !S.carc; return render(); }
    if (a === 'cedit') { S.edit = v; S.fd = null; S.back = 'con'; S.tab = 'nv'; window.scrollTo(0, 0); return render(); }
    if (a === 'cfmsave') {
      const ch = [];
      for (const i of document.querySelectorAll('.cvi')) {
        const x = D.voci.find(z => z.id === i.dataset.id), nv = pnum(i.value);
        if (!x) continue;
        if (!isFinite(nv) || nv < 0) { S.msg = 'Valore non valido su "' + dn(x) + '": scrivi zero o più.'; return render(); }
        if (r2(nv) !== x.valore) ch.push([x, r2(nv)]);
      }
      if (!ch.length) { S.cfm = false; S.msg = 'Nessun valore cambiato.'; return render(); }
      await Promise.all(ch.map(([x, nv]) => updateDoc(doc(db, 'users', D.uid, 'voci', x.id), { valore: nv })));
      ch.forEach(([x, nv]) => { x.valore = nv; });
      await syncStorico(); S.cfm = false; S.msg = 'Valori aggiornati.'; return render();
    }
    if (a === 'carch' || a === 'cres') {
      const to = a === 'carch', from = to ? D.voci : D.arch, dest = to ? D.arch : D.voci, i = from.findIndex(z => z.id === v);
      if (i < 0) return;
      await updateDoc(doc(db, 'users', D.uid, 'voci', v), { archiviata: to });
      const [x] = from.splice(i, 1); x.archiviata = to; if (!to) applyPiano(x); dest.push(x);
      await syncStorico();
      if (to) { setUndo('Archiviato: ' + dn(x), { kind: 'arch', id: v }); return render(); }
      S.msg = 'Conto ripristinato.'; return render();
    }
    if (a === 'cdel') {
      await commitDel();
      let from = D.voci, i = from.findIndex(z => z.id === v); if (i < 0) { from = D.arch; i = from.findIndex(z => z.id === v); }
      if (i < 0) return;
      const wasArch = from === D.arch, [x] = from.splice(i, 1);
      await syncStorico(); setUndo('Eliminato: ' + dn(x), { kind: 'del', x, wasArch }); return render();
    }
    if (a === 'undo') {
      const u = S.undo; if (!u) return; clearTimeout(S.undoT); S.undo = null; S.toast = null;
      if (u.kind === 'del') { (u.wasArch ? D.arch : D.voci).push(u.x); await syncStorico(); }
      else { const i = D.arch.findIndex(z => z.id === u.id); if (i >= 0) { await updateDoc(doc(db, 'users', D.uid, 'voci', u.id), { archiviata: false }); const [x] = D.arch.splice(i, 1); x.archiviata = false; applyPiano(x); D.voci.push(x); await syncStorico(); } }
      S.msg = 'Operazione annullata.'; return render();
    }
    if (a === 'poparchok' || a === 'popres') {
      const id = S.pop.id, to = a === 'poparchok', from = to ? D.voci : D.arch, dest = to ? D.arch : D.voci, i = from.findIndex(z => z.id === id);
      if (i < 0) return;
      await updateDoc(doc(db, 'users', D.uid, 'voci', id), { archiviata: to });
      const [x] = from.splice(i, 1); x.archiviata = to; if (!to) applyPiano(x); dest.push(x);
      await syncStorico(); S.pop = null; S.msg = to ? 'Archiviato. Non conta più nei totali, lo storico resta.' : 'Ripristinato.'; return render();
    }
    if (a === 'delok') {
      const id = S.pop.id; D.arch = (D.arch || []).filter(z => z.id !== id);
      await deleteDoc(doc(db, 'users', D.uid, 'voci', id));
      D.voci = D.voci.filter(z => z.id !== id); await syncStorico(); S.pop = null; return render();
    }
    if (a === 'tview') { S.thl = null; S.tanim = true; S.tview = v; S.tx = new Set(['r']); S.pp = ['r']; S.pieSel = null; S.anim = true; return render(); }
    if (a === 'qs') { if (!isTouch()) return; const [k, i] = v.split(':'); S.qsel = S.qsel || {}; S.qsel[k] = S.qsel[k] === +i ? null : +i; return render(); }
    if (a === 'copen') { S.cx = true; S.csel = null; return render(); }
    if (a === 'cclose') { S.cx = false; return render(); }
    if (a === 'topen') { S.tex = true; S.tcan = true; S.tz = 1; return render(); }
    if (a === 'tzin' || a === 'tzout' || a === 'tzfit') {
      const c = $('tfsc'), fx = c ? (c.scrollLeft + c.clientWidth / 2) / c.scrollWidth : 0, fy = c ? (c.scrollTop + c.clientHeight / 2) / c.scrollHeight : 0;
      S.tz = a === 'tzfit' ? 1 : Math.max(0.3, Math.min(6, (S.tz || 1) * (a === 'tzin' ? 1.25 : 0.8))); S.tcan = false; render();
      const n = $('tfsc'); if (n) { n.scrollLeft = fx * n.scrollWidth - n.clientWidth / 2; n.scrollTop = fy * n.scrollHeight - n.clientHeight / 2; }
      return;
    }
    if (a === 'tclose') { S.tex = false; S.tcan = true; return render(); }
    if (a === 'hper') { S.hper = v; return render(); }
    if (a === 'hopen') { S.hq = v; S.hanim = 'in'; return render(); }
    if (a === 'hclose') { S.hq = null; S.hanim = 'out'; return render(); }
    if (a === 'qopen') { S.qd = v; S.panim = 'in'; return render(); }
    if (a === 'qclose') { S.qd = null; S.panim = 'out'; return render(); }
    if (a === 'qdes') { if (S.qsel && S.qsel[v] != null) { S.qsel[v] = null; render(); } return; }
    if (a === 'texp' || a === 'tcol') {
      const all = new Set(['r']);
      if (a === 'texp') { const w = n => { if (n.kids.length) { all.add(n.id); n.kids.forEach(w); } }; w(alberoDati({ ...S.data, voci: vz(S.data.voci) }, S.tview || 'agg')); }
      S.tanim = true; S.tx = all; return render();
    }
    if (a === 'topie') { const p = $('pie'); if (p) p.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (a === 'tn') {
      const w0 = document.querySelector('.tt'), sl = w0 ? w0.scrollLeft : 0, stp = w0 ? w0.scrollTop : 0, lv = +el.dataset.l;
      S.tx = S.tx || new Set(['r']); S.tanim = true; if (S.tx.has(v)) S.tx.delete(v); else S.tx.add(v);
            render();
      const w = document.querySelector('.tt');
      if (w) w.scrollTop = stp;
      if (w) { const fine = (2 + (lv + 2) * (TN.w + TN.gx) - TN.gx) * treeK(); w.scrollLeft = S.tx.has(v) && fine > sl + w.clientWidth ? fine - w.clientWidth + 6 : sl; }
      return;
    }
    if (a === 'pies') {
      const i = +v;
      if (S.pieSel === i) {
        const root = alberoDati({ ...S.data, voci: vz(S.data.voci) }, S.tview || 'agg'), f = alberoTrova(root, (S.pp || ['r']).slice(-1)[0]) || alberoTrova(root, 'r'), g = pieDati(f.node).groups[i];
        if (g && g.can) { S.pp = [...(S.pp || ['r']), g.id]; S.pieSel = null; S.anim = true; return render(); }
        return;
      }
      S.anim = 'sel'; S.pieSel = i; return render();
    }
    if (a === 'pdes') { if (S.pieSel == null) return; S.pieSel = null; S.anim = 'sel'; return render(); }
    if (a === 'ser') {
      const def = ['attivi', 'passivi', 'netto'], cur = S.sel instanceof Set && S.sel.size ? S.sel : new Set(def);
      if (v === 'var') S.sel = cur.size === 1 && cur.has('var') ? new Set(def) : new Set(['var']);
      else { const n = new Set(cur); n.delete('var'); if (n.has(v)) n.delete(v); else n.add(v); S.sel = n.size ? n : new Set(def); }
      return render();
    }
    if (a === 'agg') { S.aggK = S.aggK || {}; S.aggK[el.dataset.k] = v; S.wsig = null; return render(); }
    if (a === 'pback') { if (S.pp && S.pp.length > 1) S.pp = S.pp.slice(0, -1); S.pieSel = null; S.anim = true; return render(); }
    if (a === 'phome') { S.pp = ['r']; S.pieSel = null; S.anim = true; return render(); }
    if (a === 'dmode') { S.dmode = el.value; return render(); }
    if (a === 'adda') {
      const nm = $('an').value.trim();
      if (!nm) { S.msg = 'Scrivi il nome dell\'account.'; return render(); }
      if (D.accounts.length >= 10) { S.msg = 'Massimo 10 account.'; return render(); }
      if ([D.nome, ...D.accounts.map(x => x.nome)].some(x => x.toLowerCase() === nm.toLowerCase())) { S.msg = 'Esiste già un account con questo nome.'; return render(); }
      const r = await addDoc(collection(db, 'users', D.uid, 'account'), { nome: nm });
      D.accounts.push({ id: r.id, nome: nm }); D.accounts.sort((x, y) => x.nome.localeCompare(y.nome)); S.addAcc = false; S.msg = 'Account aggiunto.'; return render();
    }
    if (a === 'rena') {
      const ac = D.accounts.find(x => x.id === v), nm = (prompt('Nuovo nome dell\'account', ac.nome) || '').trim();
      if (!nm || nm === ac.nome) return;
      if ([D.nome, ...D.accounts.filter(x => x.id !== v).map(x => x.nome)].some(x => x.toLowerCase() === nm.toLowerCase())) { S.msg = 'Esiste già un account con questo nome.'; return render(); }
      await setDoc(doc(db, 'users', D.uid, 'account', v), { nome: nm }); ac.nome = nm; D.accounts.sort((x, y) => x.nome.localeCompare(y.nome)); return render();
    }
    if (a === 'dela') {
      if (D.voci.some(x => x.account === v)) { S.msg = 'Prima sposta o elimina le voci di questo account.'; return render(); }
      if (!confirm('Eliminare questo account?')) return;
      await deleteDoc(doc(db, 'users', D.uid, 'account', v)); D.accounts = D.accounts.filter(x => x.id !== v);
      if (S.fAcc === v) S.fAcc = 'all'; return render();
    }
    if (a === 'range') { S.range = el.value; return render(); }
    if (a === 'yrsel') { if (!el.value) return; S.yr = el.value; S.range = 'year'; return render(); }
    if (a === 'rfrom' || a === 'rto') { if (!/^\d{4}-\d{2}$/.test(el.value)) return; if (a === 'rfrom') S.rFrom = el.value; else S.rTo = el.value; return render(); }
    if (a === 'cmpm') { S.cmp = el.value; return render(); }
    if (a === 'fs') { S.fs = v || null; return render(); }
    if (a === 'zm') {
      const k = el.dataset.k, c = CHK[k]; if (!c) return; const z = ZM[k] || { a: 0, b: c.pts.length - 1 }, sp = z.b - z.a, m = (z.a + z.b) / 2;
      if (v === '0') { delete ZM[k]; lcRepaint(k); } else if (v === 'in') lcZoom(k, 1.6, m); else if (v === 'out') lcZoom(k, 1 / 1.6, m); else lcPan(k, (v === 'l' ? -1 : 1) * sp * 0.35);
      return;
    }
    if (a === 'rowm') { S.popm = { mese: v, mode: 'menu' }; return render(); }
    if (a === 'pmclose') { S.popm = null; return render(); }
    if (a === 'pmback') { S.popm.mode = 'menu'; return render(); }
    if (a === 'pmdel') { S.popm.mode = 'del'; return render(); }
    if (a === 'pmedit') { S.editM = S.popm.mese; S.draft = null; S.popm = null; render(); const fm = $('formm'); return fm ? fm.scrollIntoView({ behavior: 'smooth' }) : window.scrollTo(0, 0); }
    if (a === 'pmdelok') { const m = S.popm.mese; await deleteDoc(doc(db, 'users', D.uid, 'storico', m)); D.storico = D.storico.filter(x => x.mese !== m); S.popm = null; return render(); }
    if (a === 'editm') { S.editM = v; S.draft = null; render(); return window.scrollTo(0, 0); }
    if (a === 'cancelm') { S.editM = null; return render(); }
    if (a === 'delm') {
      if (!confirm('Eliminare questo mese dallo storico?')) return;
      await deleteDoc(doc(db, 'users', D.uid, 'storico', v));
      D.storico = D.storico.filter(x => x.mese !== v); return render();
    }
    if (a === 'savem') {
      const mm = $('mm').value.trim(), at = pnum($('ma').value), pa = pnum($('mp').value);
      S.draft = S.editM ? null : { mm, ma: $('ma').value, mp: $('mp').value };
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mm)) { S.msg = 'Inserisci il mese nel formato AAAA-MM (es. 2026-03).'; return render(); }
      if (mm >= monthKey()) { S.msg = 'Puoi inserire solo mesi passati: il mese in corso si aggiorna da solo.'; return render(); }
      if (!isFinite(at) || !isFinite(pa) || at < 0 || pa < 0) { S.msg = 'Inserisci attivi e passivi validi (zero o più).'; return render(); }
      const dati = { attivi: r2(at), passivi: r2(pa), netto: r2(at - pa) };
      await setDoc(doc(db, 'users', D.uid, 'storico', mm), { ...dati, manuale: true, aggiornato: serverTimestamp() });
      const ex = D.storico.find(x => x.mese === mm);
      if (ex) Object.assign(ex, dati, { manuale: true }); else { D.storico.push({ mese: mm, ...dati, manuale: true }); D.storico.sort((x, y) => x.mese.localeCompare(y.mese)); }
      S.editM = null; S.draft = null; S.msg = 'Mese salvato.'; render(); const fm = $('formm'); return fm && fm.scrollIntoView({ block: 'center' });
    }
    if (a === 'share') {
      const url = location.href.split('#')[0];
      const data = { title: 'P.Finance', text: 'Prova P.Finance: monitora il tuo patrimonio.', url };
      if (navigator.share) { try { await navigator.share(data); } catch (_) {} return; }
      try { await navigator.clipboard.writeText(url); S.msg = 'Link copiato negli appunti.'; } catch (_) { S.msg = 'Link: ' + url; }
      return render();
    }
    if (a === 'ftipo' || a === 'fmod' || a === 'fcat') { S.fd = grabForm(); return render(); }
    if (a === 'edit') { S.edit = v; return render(); }
    if (a === 'cancel') { S.edit = null; S.fd = null; if (S.exp) S.exp.form = false; if (innerWidth >= 1000 && S.tab === 'nv') { S.tab = S.back || 'pan'; S.back = null; } return render(); }
    if (a === 'export') return exportCsv();
    if (a === 'prezzi') return aggiornaPrezzi(true);
    if (a === 'pedit') { S.pe = v; S.pd = null; S.pcur = null; S.msg = ''; return render(); }
    if (a === 'pcancel') { S.pe = null; S.pd = null; S.pcur = null; return render(); }
    if (a === 'pradd' || a === 'prrm') { const L = grabPort(); if (a === 'pradd') L.push({ isin: '', nome: '', classe: '', quote: '', manuale: '', nom: false, pmc: '', aliq: '' }); else L.splice(+v, 1); S.pd = L; return render(); }
    if (a === 'pmopen') { S.pd = grabPort(); S.pcur = +v; render(); return window.scrollTo(0, 0); }
    if (a === 'pmdone') { S.pd = grabPort(); S.pcur = null; return render(); }
    if (a === 'pmadd') { const L = grabPort(); L.push({ isin: '', nome: '', classe: '', quote: '', manuale: '', nom: false, pmc: '', aliq: '' }); S.pd = L; S.pcur = L.length - 1; render(); return window.scrollTo(0, 0); }
    if (a === 'pmrm') { const L = grabPort(); L.splice(+v, 1); S.pd = L; S.pcur = null; return render(); }
    if (a === 'caddo') { S.addConto = true; S.msg = ''; return render(); }
    if (a === 'caddc') { S.addConto = false; return render(); }
    if (a === 'xaddo') { S.addX = v; S.msg = ''; S.xmod = 'piano'; S.xnn = ''; return render(); }
    if (a === 'xmod') { S.xnn = $('xnn') ? $('xnn').value : ''; S.xmod = $('xmod').value; return render(); }
    if (a === 'xaddc') { S.addX = null; return render(); }
    if (a === 'xaddok') {
      const kind = S.addX || 'pas', C = VOCI_CFG[kind], tipo = kind === 'pas' ? 'passivo' : 'attivo';
      const nm = $('xnn').value.trim(), k = $('xnacc').value, account = k === 'main' ? '' : k;
      if (!nm) { S.msg = 'Scrivi il nome.'; return render(); }
      if (D.voci.some(x => C.ev(x) && x.nome.toLowerCase() === nm.toLowerCase() && (x.account || '') === account)) { S.msg = 'Esiste già una voce con questo nome in questo account.'; return render(); }
      if (kind === 'pas' && $('xr')) {
        const res = pnum($('xr').value), fin = $('xf').value, t = new Date(), oggi = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
        if (!isFinite(res) || res <= 0) { S.msg = 'Inserisci il debito residuo di oggi.'; return render(); }
        if (!fin || fin <= oggi) { S.msg = 'La data dell\'ultima rata deve essere futura.'; return render(); }
        const dp = applyPiano({ tipo: 'passivo', categoria: $('xncat').value, nome: nm, account, piano: true, inCorso: true, capitale: r2(res), inizio: oggi, fine: fin, valore: 0 });
        const rp = await addDoc(collection(db, 'users', D.uid, 'voci'), dp); D.voci.push({ id: rp.id, ...dp });
        await syncStorico(); S.addX = null; S.msg = 'Passivo in corso aggiunto: scende da solo dal mese prossimo.'; return render();
      }
      if (kind === 'pas' && $('xk')) {
        const cap = pnum($('xk').value), ini = $('xi').value, fin = $('xf').value;
        if (!isFinite(cap) || cap <= 0) { S.msg = 'Inserisci l\'importo preso a prestito.'; return render(); }
        if (!ini || !fin || fin <= ini) { S.msg = 'Inserisci le date: la fine deve essere dopo l\'inizio.'; return render(); }
        const dp = applyPiano({ tipo: 'passivo', categoria: $('xncat').value, nome: nm, account, piano: true, capitale: r2(cap), inizio: ini, fine: fin, valore: 0 });
        const rp = await addDoc(collection(db, 'users', D.uid, 'voci'), dp); D.voci.push({ id: rp.id, ...dp });
        await syncStorico(); S.addX = null; S.msg = 'Passivo aggiunto con piano di rimborso.'; return render();
      }
      const sv = $('xnv').value.trim(), val = sv ? pnum(sv) : 0;
      if (!isFinite(val) || val < 0) { S.msg = 'L\'importo deve essere zero o più.'; return render(); }
      if (D.voci.some(x => C.ev(x) && x.nome.toLowerCase() === nm.toLowerCase() && (x.account || '') === account)) { S.msg = 'Esiste già una voce con questo nome in questo account.'; return render(); }
      const nl = { tipo, categoria: $('xncat').value, nome: nm, account, valore: r2(val) };
      const r = await addDoc(collection(db, 'users', D.uid, 'voci'), nl); D.voci.push({ id: r.id, ...nl });
      await syncStorico(); S.addX = null; S.msg = 'Voce aggiunta.'; return render();
    }
    if (a === 'caddok') {
      const nm = $('cnn').value.trim(), k = $('cnacc').value, account = k === 'main' ? '' : k, sv = $('cnv').value.trim(), val = sv ? pnum(sv) : 0;
      if (!nm) { S.msg = 'Scrivi il nome del conto.'; return render(); }
      if (!isFinite(val) || val < 0) { S.msg = 'Il saldo deve essere zero o più.'; return render(); }
      if (D.voci.some(x => x.categoria === 'Liquidità' && x.nome.toLowerCase() === nm.toLowerCase() && (x.account || '') === account)) { S.msg = 'Esiste già un conto con questo nome in questo account.'; return render(); }
      const nl = { tipo: 'attivo', categoria: 'Liquidità', nome: nm, account, valore: r2(val) };
      const r = await addDoc(collection(db, 'users', D.uid, 'voci'), nl); D.voci.push({ id: r.id, ...nl });
      await syncStorico(); S.addConto = false; S.msg = 'Conto aggiunto.'; return render();
    }
    if (a === 'paddo') { S.addPort = true; S.msg = ''; return render(); }
    if (a === 'paddc') { S.addPort = false; return render(); }
    if (a === 'pmnew') { S.addPort = false; S.pcur = null; return portNuovo($('pnacc').value, $('pnnm').value); }
    if (a === 'psave') return portSalva();
    if (a === 'pnew') return portNuovo(v);
    if (a === 'pdel') {
      const x = D.voci.find(z => z.id === v); if (!x || !confirm('Eliminare il portafoglio ' + x.nome + ' con tutti i suoi prodotti?')) return;
      await deleteDoc(doc(db, 'users', D.uid, 'voci', v)); D.voci = D.voci.filter(z => z.id !== v); if (S.pe === v) { S.pe = null; S.pd = null; S.pcur = null; }
      await syncStorico(); S.msg = 'Portafoglio eliminato.'; return render();
    }
    if (a === 'pconv') return portConverti();
    if (a === 'timpno') { S.timp = null; S.timpErr = ''; return render(); }
    if (a === 'timpok') return isAdmin() ? titoliApplica() : undefined;
    if (a === 'save') {
      S.fd = grabForm();
      const tipo = $('ft').value, categoria = $('fc').value; let nome = $('fn') ? $('fn').value.trim() : '', fm = $('fm'), fa2 = $('fa');
      const base = { tipo, categoria, nome, account: fa2 && fa2.value !== 'main' ? fa2.value : '' };
      const ed0 = S.edit ? D.voci.find(x => x.id === S.edit) : null;
      let dati;
      if (tipo === 'passivo' && fm && fm.value === 'piano') {
        const cap = pnum($('fk').value), ini = $('fi').value, fin = $('ff').value;
        if (!nome || !isFinite(cap) || cap <= 0) { S.msg = 'Inserisci un nome e l\'importo preso a prestito.'; return render(); }
        if (!ini || !fin || fin <= ini) { S.msg = 'Inserisci le date: la fine deve essere dopo l\'inizio.'; return render(); }
        dati = applyPiano({ ...base, piano: true, capitale: r2(cap), inizio: ini, fine: fin, valore: 0 });
      } else {
        const isI = tipo === 'attivo' && categoria === 'Investimenti';
        const porta = isI && ed0 && isPort(ed0);
        const prod = porta ? ed0.prodotti || [] : isI && ed0 && hasProd(ed0) ? ed0.prodotti : null;
        const conProd = !!(prod && prod.length);
        const valore = conProd ? 0 : pnum($('fv') ? $('fv').value : '');
        if (isI) { nome = ($('fw') ? ($('fw').value === '__new' ? ($('fwn') ? $('fwn').value.trim() : '') : $('fw').value) : ''); base.nome = nome; if (!nome) { S.msg = 'Scegli il conto di riferimento o scrivi il nome del nuovo conto.'; return render(); } if (!porta && (!$('fac') || !$('fac').value)) { S.msg = 'Scegli l\'asset class.'; return render(); } }
        if (!nome || !isFinite(valore) || valore < 0) { S.msg = 'Inserisci un nome e un valore valido (zero o più).'; return render(); }
        dati = { ...base, valore: r2(valore) };
        if (tipo === 'attivo' && categoria === 'Investimenti') {
          const dove = nome, ob = $('fo') ? pnum($('fo').value) : NaN;
          dati.dove = dove; dati.nome = dove; if (porta) dati.portafoglio = true; else dati.assetClass = $('fac').value;
          if (!D.voci.some(x => x.categoria === 'Liquidità' && x.nome.toLowerCase() === dove.toLowerCase())) {
            const nl = { tipo: 'attivo', categoria: 'Liquidità', nome: dove, account: base.account, valore: 0 };
            const r0 = await addDoc(collection(db, 'users', D.uid, 'voci'), nl); D.voci.push({ id: r0.id, ...nl });
          }
          if (isFinite(ob) && ob > 0) dati.obiettivo = r2(ob);
          if (conProd) { dati.prodotti = prod; dati.valore = S.prezzi || !ed0 ? valoreProd(dati) : ed0.valore; }
        }
      }
      if (S.edit) { await setDoc(doc(db, 'users', D.uid, 'voci', S.edit), dati); const i = D.voci.findIndex(x => x.id === S.edit); D.voci[i] = { id: S.edit, ...dati }; }
      else { const r = await addDoc(collection(db, 'users', D.uid, 'voci'), dati); D.voci.push({ id: r.id, ...dati }); }
      S.edit = null; S.fd = null; if (S.exp) S.exp.form = false; if (innerWidth >= 1000 && S.tab === 'nv') { S.tab = S.back || 'pan'; S.back = null; } await syncStorico(); return render();
    }
    if (a === 'del') {
      if (!confirm('Eliminare questa voce?')) return;
      await deleteDoc(doc(db, 'users', D.uid, 'voci', v));
      D.voci = D.voci.filter(x => x.id !== v); await syncStorico(); return render();
    }
    if (a === 'pdfmake') {
      S.pdfBusy = true; S.pdf = null; render(); await new Promise(r => setTimeout(r, 40));
      try { await caricaPdfLib(); S.pdf = await creaPdf(S.data, !!S.pdfHide); } finally { S.pdfBusy = false; }
      return render();
    }
    if (a === 'pdfsave') {
      const u = URL.createObjectURL(S.pdf.blob), l = document.createElement('a'); l.href = u; l.download = S.pdf.name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 8000); return;
    }
    if (a === 'pdfshare') {
      const f = new File([S.pdf.blob], S.pdf.name, { type: 'application/pdf' });
      try { await navigator.share({ files: [f], title: 'Report del patrimonio' }); } catch (e) { if (e.name !== 'AbortError') throw e; }
      return;
    }
    if (a === 'appr' || a === 'rev') { await updateDoc(doc(db, 'users', v), { approved: a === 'appr' }); await loadUsers(); return render(); }
    if (a === 'rej') { if (!confirm('Rifiutare questa richiesta?')) return; await deleteDoc(doc(db, 'users', v)); await loadUsers(); return render(); }
    if (a === 'reload-users') { await loadUsers(); return render(); }
    if (a === 'richno') { try { await deleteDoc(doc(db, 'richiesteIsin', v)); S.rich = (S.rich || []).filter(x => x.isin !== v); } catch (e) { S.msg = errText(e); } return render(); }
    if (a === 'richok') {
      const c = sheetCfg(), lista = (S.rich || []).filter(x => !(S.prezzi && S.prezzi.map[x.isin] > 0));
      if (!c) { S.msg = 'Collega prima il foglio dalla pagina Info.'; return render(); }
      if (S.richBusy) return;
      S.richBusy = true; const out = [];
      for (let i = 0; i < lista.length; i++) {
        const x = lista[i]; S.msg = 'Aggiungo al foglio ' + (i + 1) + ' di ' + lista.length + ': ' + x.isin + '…'; render();
        try {
          const j = await chiamaFoglio(c, { isin: x.isin, nome: pulisciTesto(x.nome, 60), classe: pulisciTesto(x.classe, 40) });
          if (j.ok) { out.push(x.isin + (j.esito === 'presente' ? ' già nel foglio' : ' aggiunto')); try { await deleteDoc(doc(db, 'richiesteIsin', x.isin)); } catch (e) {} S.rich = S.rich.filter(z => z.isin !== x.isin); }
          else out.push(x.isin + ': ' + (j.errore || 'errore'));
        } catch (e) { out.push(x.isin + ': foglio non raggiungibile'); }
      }
      S.richBusy = false; S.msg = out.length ? out.join('; ') + '. I prezzi arrivano quando il foglio pubblicato si aggiorna.' : 'Nessun ISIN da aggiungere.'; return render();
    }
  } catch (e) { S.msg = errText(e); render(); }
}

const tip = document.createElement('div'); tip.className = 'tip'; document.body.appendChild(tip);
const tipAt = (e, t) => { if (!t) { tip.style.display = 'none'; return; } tip.textContent = t.dataset.tip; tip.style.display = 'block'; const w = tip.offsetWidth; tip.style.left = Math.max(4, Math.min(innerWidth - w - 4, e.clientX + 12)) + 'px'; tip.style.top = (e.clientY + 16) + 'px'; };
/* ---------- Importa titoli (CSV della scheda "Elenco titoli") ---------- */
function csvRighe(t) {
  t = t.replace(/^﻿/, ''); const d = (t.split('\n')[0].match(/;/g) || []).length > (t.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
  const rows = []; let r = [], c = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
    else if (ch === '"') q = true;
    else if (ch === d) { r.push(c); c = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; r.push(c); c = ''; rows.push(r); r = []; }
    else c += ch;
  }
  if (c !== '' || r.length) { r.push(c); rows.push(r); }
  return rows.filter(x => x.some(y => y.trim() !== ''));
}
function titoliProposta(txt) {
  const D = S.data, R = csvRighe(txt); if (R.length < 2) throw new Error('File vuoto.');
  const H = R[0].map(x => x.trim().toLowerCase()), ix = n => H.indexOf(n);
  const iC = ix('classe'), iI = ix('isin'), iN = ix('nome'), iV = ix('valore'), iQ = H.findIndex(h => h === 'quantità' || h === 'quantita');
  const iCo = H.map((h, i) => /^quantit[àa] .+/.test(h) ? i : -1).filter(i => i >= 0);
  if (iC < 0 || iI < 0 || iV < 0 || iQ < 0 || !iCo.length) throw new Error('Non trovo le colonne Classe, Isin, Valore, Quantità e le quantità per conto. Hai scaricato la scheda "Elenco titoli"?');
  const acc = S.fAcc && S.fAcc !== 'all' && S.fAcc !== 'main' ? S.fAcc : '';
  if (D.voci.some(v => isInvLegacy(v) && (v.account || '') === acc)) throw new Error('Prima riunisci le voci di investimento esistenti nei portafogli (riquadro in alto, pagina Portafogli).');
  const mapC = c => { c = c.trim().toLowerCase(); return /^azion/.test(c) ? 'Azioni' : /^obblig/.test(c) ? 'Obbligazioni' : /^cript/.test(c) ? 'Criptovalute' : /^(commod|oro)/.test(c) ? 'Oro e materie prime' : 'Altro'; };
  const g = new Map(); let letti = 0;
  R.slice(1).forEach(r => {
    const tot = pnum(r[iQ]), val = pnum(r[iV]); if (!(tot > 0) || !(val > 0)) return; letti++;
    iCo.forEach(i => {
      const qt = pnum(r[i]); if (!(qt > 0)) return;
      const broker = H[i].replace(/^quantit[àa] /, '').trim().split(/\s+/)[0]; const dove = broker.charAt(0).toUpperCase() + broker.slice(1);
      if (!g.has(dove.toLowerCase())) g.set(dove.toLowerCase(), { dove, valore: 0, prodotti: [] });
      const G = g.get(dove.toLowerCase()), isin = String(r[iI] || '').trim().toUpperCase(), man = r2(val * qt / tot), cl = mapC(r[iC]), nm = String(r[iN] || '').trim();
      G.valore += man;
      const p = /^[A-Z0-9]{12}$/.test(isin) ? G.prodotti.find(z => z.isin === isin) : null;
      if (p) { p.quote += qt; p.manuale = r2(p.manuale + man); }
      else if (/^[A-Z0-9]{12}$/.test(isin)) G.prodotti.push({ isin, nome: nm, classe: cl, quote: qt, manuale: man });
      else G.prodotti.push({ isin: '', nome: nm, classe: cl, quote: 0, manuale: man });
    });
  });
  const righe = [...g.values()].map(x => {
    x.valore = r2(x.valore);
    const ex = D.voci.find(v => isPort(v) && (v.dove || '').trim().toLowerCase() === x.dove.toLowerCase() && (v.account || '') === acc);
    return { ...x, exId: ex ? ex.id : '', prima: ex ? ex.valore : null, nPrima: ex ? (ex.prodotti || []).length : 0 };
  }).sort((a, b) => a.dove.localeCompare(b.dove));
  if (!righe.length) throw new Error('Nessun titolo con quantità trovato.');
  return { righe, acc, letti };
}
async function titoliApplica() {
  const D = S.data, P = S.timp; if (!P) return;
  for (const x of P.righe) {
    if (x.exId) {
      const v = D.voci.find(y => y.id === x.exId); if (!v) continue;
      const { id, assetClass, ...rest } = v; const keep = p => { const o = (v.prodotti || []).find(z => z.isin && z.isin === p.isin); return o ? { ...p, ...(o.nom ? { nom: true } : {}), ...(o.pmc > 0 ? { pmc: o.pmc } : {}), ...(o.aliq != null ? { aliq: o.aliq } : {}) } : p; }; const dati = { ...rest, valore: x.valore, prodotti: x.prodotti.map(keep), portafoglio: true };
      await setDoc(doc(db, 'users', D.uid, 'voci', id), dati); delete v.assetClass; Object.assign(v, dati);
    } else {
      if (!D.voci.some(y => y.categoria === 'Liquidità' && y.nome.toLowerCase() === x.dove.toLowerCase() && (y.account || '') === P.acc)) {
        const nl = { tipo: 'attivo', categoria: 'Liquidità', nome: x.dove, account: P.acc, valore: 0 };
        const r0 = await addDoc(collection(db, 'users', D.uid, 'voci'), nl); D.voci.push({ id: r0.id, ...nl });
      }
      const dati = { tipo: 'attivo', categoria: 'Investimenti', nome: x.dove, dove: x.dove, account: P.acc, valore: x.valore, prodotti: x.prodotti, portafoglio: true };
      const r = await addDoc(collection(db, 'users', D.uid, 'voci'), dati); D.voci.push({ id: r.id, ...dati });
    }
  }
  D.voci.forEach(applyPiano); S.timp = null; await syncStorico(); S.msg = 'Titoli importati e aggiornati.'; render();
}
/* ---------- Portafogli: modifica prodotti, nuovo portafoglio, riunione delle voci vecchie ---------- */
function grabPort() {
  const NM = [...document.querySelectorAll('.pnom')]; return [...document.querySelectorAll('.ppr:not(.lbl)')].map((r, i) => ({ nom: !!(NM[i] && NM[i].checked), isin: r.querySelector('.pi').value, nome: r.querySelector('.pn').value, classe: r.querySelector('.pc').value, quote: r.querySelector('.pq').value, manuale: r.querySelector('.pm').value, pmc: r.querySelector('.pp').value, aliq: r.querySelector('.pa').value }));
}
async function portSalva() {
  try { await portSalva0(); } catch (e) { S.pd = grabPort(); S.msg = 'Salvataggio non riuscito' + (e && e.code === 'network-offline' ? ': sei offline.' : ': ' + (e && e.message || 'errore') + '.'); render(); }
  const m = $('pmsg'); if (m) m.scrollIntoView({ block: 'center' });
}
async function portSalva0() {
  const D = S.data, v = D.voci.find(z => z.id === S.pe); if (!v) { S.pe = null; return render(); }
  const prod = [], err = m => { S.pd = grabPort(); S.msg = m; render(); };
  for (const r of grabPort()) {
    const isin = r.isin.trim().toUpperCase(), qs = r.quote.trim(), ms = r.manuale.trim();
    let nome = r.nome.trim(); if (isin && !nome && isAdmin()) nome = await nomeDaIsin(isin);
    if (!isin && !nome && !qs && !ms) continue;
    if (!r.classe) return err('Scegli la classe di investimento di ogni prodotto.');
    const m = ms ? pnum(ms) : 0; if (!isFinite(m) || m < 0) return err('Il valore manuale deve essere zero o più.');
    if (isin) {
      const q = pnum(qs); if (!/^[A-Z0-9]{12}$/.test(isin) || !(q > 0)) return err('Ogni prodotto con ISIN ha bisogno di 12 caratteri e di quote maggiori di zero.');
      const pm = r.pmc.trim() ? pnum(r.pmc) : 0, al = r.aliq.trim() ? pnum(r.aliq) : null;
      if (!isFinite(pm) || pm < 0) return err('Il prezzo medio di carico deve essere zero o più.');
      if (al !== null && (!isFinite(al) || al < 0 || al > 100)) return err('L\'aliquota va da 0 a 100.');
      prod.push({ isin, nome, classe: r.classe, quote: Math.round(q * 1e6) / 1e6, manuale: r2(m), ...(r.nom ? { nom: true } : {}), ...(pm > 0 ? { pmc: Math.round(pm * 1e6) / 1e6 } : {}), ...(al !== null ? { aliq: al } : {}) });
    } else {
      if (!(m > 0)) return err('Un prodotto senza ISIN ha bisogno del valore manuale in euro.');
      prod.push({ isin: '', nome, classe: r.classe, quote: 0, manuale: r2(m) });
    }
  }
  const nn = $('pnome') ? $('pnome').value.trim() : v.nome, vecchio = v.nome;
  if (!nn) return err('Il nome del portafoglio non può essere vuoto.');
  const na = $('pacc') ? ($('pacc').value === 'main' ? '' : $('pacc').value) : (v.account || ''), cambiato = na !== (v.account || '');
  if (nn !== vecchio || cambiato) {
    if (D.voci.some(x => x.id !== v.id && isPort(x) && (x.account || '') === na && (x.dove || x.nome).trim().toLowerCase() === nn.toLowerCase())) return err('Esiste già un portafoglio con questo nome in questo account.');
    /* rinomina anche il conto di liquidità collegato (stesso nome e account) */
    const lq = D.voci.find(y => y.categoria === 'Liquidità' && y.nome === vecchio && (y.account || '') === (v.account || ''));
    if (lq) { const { id: lid, ...lr } = lq; await setDoc(doc(db, 'users', D.uid, 'voci', lid), { ...lr, nome: nn, account: na }); lq.nome = nn; lq.account = na; }
  }
  const { id, assetClass, ...rest } = v, dati = { ...rest, nome: nn, account: na, ...(rest.dove === vecchio || !rest.dove ? { dove: nn } : {}), portafoglio: true, prodotti: prod };
  dati.valore = prod.length ? valoreProd(dati) : 0;
  await setDoc(doc(db, 'users', D.uid, 'voci', id), dati); delete v.assetClass; Object.assign(v, dati);
  await syncStorico(); S.pe = null; S.pd = null; S.msg = 'Portafoglio salvato.'; render();
  if (!isAdmin()) segnalaIsin(prod);
  if (isAdmin()) { const extra = await sheetAggiungi(prod); if (extra) { S.msg = 'Portafoglio salvato.' + extra; render(); } }
}
async function portNuovo(acc, nome) {
  const D = S.data, inp = $('pnn_' + acc), nm = nome != null ? String(nome).trim() : inp ? inp.value.trim() : '', account = acc === 'main' ? '' : acc;
  if (!nm) { S.msg = 'Scrivi il nome del conto (es. Directa).'; return render(); }
  if (D.voci.some(x => isPort(x) && (x.account || '') === account && (x.dove || '').trim().toLowerCase() === nm.toLowerCase())) { S.msg = 'Esiste già un portafoglio con questo nome in questo account.'; return render(); }
  if (!D.voci.some(y => y.categoria === 'Liquidità' && y.nome.toLowerCase() === nm.toLowerCase() && (y.account || '') === account)) {
    const nl = { tipo: 'attivo', categoria: 'Liquidità', nome: nm, account, valore: 0 };
    const r0 = await addDoc(collection(db, 'users', D.uid, 'voci'), nl); D.voci.push({ id: r0.id, ...nl });
  }
  const dati = { tipo: 'attivo', categoria: 'Investimenti', nome: nm, dove: nm, account, valore: 0, portafoglio: true, prodotti: [] };
  const r = await addDoc(collection(db, 'users', D.uid, 'voci'), dati); D.voci.push({ id: r.id, ...dati });
  S.pe = r.id; S.pd = null; S.msg = ''; render();
}
async function portConverti() {
  const D = S.data;
  for (const G of portProposta(D)) {
    const ex = G.exId ? D.voci.find(v => v.id === G.exId) : null, tgt = ex || G.voci[0];
    const { id, assetClass, ...rest } = tgt;
    const dati = ex ? { ...rest, portafoglio: true, prodotti: [...(ex.prodotti || []), ...G.prodotti] }
      : { tipo: 'attivo', categoria: 'Investimenti', nome: G.dove, dove: G.dove, account: G.account, valore: 0, portafoglio: true, prodotti: G.prodotti, ...(G.obiettivo ? { obiettivo: G.obiettivo } : {}) };
    dati.valore = valoreProd(dati);
    await setDoc(doc(db, 'users', D.uid, 'voci', id), dati); delete tgt.assetClass; Object.assign(tgt, dati);
    for (const o of G.voci) if (o !== tgt) { await deleteDoc(doc(db, 'users', D.uid, 'voci', o.id)); D.voci = D.voci.filter(z => z !== o); }
  }
  D.voci.forEach(applyPiano); await syncStorico(); S.msg = 'Portafogli aggiornati.'; render();
}
document.addEventListener('change', async e => {
  if (e.target.id !== 'titf' || !e.target.files[0] || !S.data || !isAdmin()) return;
  try { S.timp = titoliProposta(await e.target.files[0].text()); S.timpErr = ''; } catch (x) { S.timp = null; S.timpErr = x.message || 'File non valido.'; }
  render();
});
/* ---------- Pagina Importazioni: storico e portafoglio da CSV ---------- */
const MESI_IT = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const meseIt = k => MESI_IT[+k.slice(5) - 1] + ' ' + k.slice(0, 4);
/* numero all'italiana: 15.050 = 15050, 1.234,5 = 1234.5, 12,5 = 12.5, 1.5 = 1.5 */
function numIt(s) {
  s = String(s == null ? '' : s).replace(/[\s€%]/g, ''); if (!s) return NaN;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); else s = s.replace(',', '.');
  return /^-?\d+(\.\d+)?$/.test(s) ? parseFloat(s) : NaN;
}
/* legge il file anche se salvato da Excel in codifica Windows */
async function leggiFile(f) {
  const b = await f.arrayBuffer();
  try { return new TextDecoder('utf-8', { fatal: true }).decode(b); } catch (e) { return new TextDecoder('windows-1252').decode(b); }
}
const sanif = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
function meseDaTesto(t) {
  t = sanif(t); let m = t.match(/^([a-z]{3})[a-z]*\.?[\s\-\/]+(\d{2}|\d{4})$/);
  if (m) { const i = MESI_IT.indexOf(m[1]); if (i >= 0) return (m[2].length === 2 ? '20' + m[2] : m[2]) + '-' + String(i + 1).padStart(2, '0'); }
  m = t.match(/^(\d{4})-(\d{1,2})$/); if (m && +m[2] >= 1 && +m[2] <= 12) return m[1] + '-' + m[2].padStart(2, '0');
  m = t.match(/^(\d{1,2})\/(\d{4})$/); if (m && +m[1] >= 1 && +m[1] <= 12) return m[2] + '-' + m[1].padStart(2, '0');
  return null;
}
function storicoProposta(txt) {
  const D = S.data, R = csvRighe(txt), mk = monthKey();
  const hi = R.findIndex(r => r.some(c => /^data$/.test(sanif(c))) && r.some(c => /^liquid/.test(sanif(c))));
  if (hi < 0) throw new Error('Non trovo le colonne Data, Liquidità, Investimenti, Beni, Passivi. Hai scelto il file giusto?');
  const H = R[hi].map(sanif), iD = H.indexOf('data'), iL = H.findIndex(h => /^liquid/.test(h)), iI = H.findIndex(h => /^(investiment|portafogli)/.test(h)), iB = H.findIndex(h => /^beni/.test(h)), iP = H.findIndex(h => /^passiv/.test(h));
  if (iL < 0 || iI < 0 || iB < 0 || iP < 0) throw new Error('Mancano alcune colonne: servono Data, Liquidità, Investimenti, Beni e Passivi.');
  const mesi = []; let nuovi = 0, agg = 0, skip = 0;
  for (const r of R.slice(hi + 1)) {
    const mese = meseDaTesto(r[iD]); if (!mese) continue;
    const liq = numIt(r[iL]), port = numIt(r[iI]), beni = numIt(r[iB]), pas = numIt(r[iP]);
    if (![liq, port, beni, pas].every(isFinite)) continue;
    const attivi = liq + port + beni, passivi = Math.abs(pas);
    if (attivi === 0 && passivi === 0) continue;
    const ex = D.storico.find(x => x.mese === mese);
    if (mese >= mk || (ex && !ex.manuale)) { skip++; continue; }
    if (mesi.some(x => x.mese === mese)) continue;
    mesi.push({ mese, attivi: r2(attivi), passivi: r2(passivi), netto: r2(attivi - passivi), liq: r2(Math.max(liq, 0)), port: r2(Math.max(port, 0)), beni: r2(Math.max(beni, 0)) });
    if (ex) agg++; else nuovi++;
  }
  if (!mesi.length) throw new Error('Nessun mese da importare' + (skip ? ' (quelli nel file sono il mese in corso o già registrati dall\'app).' : ': non trovo righe con data e importi.'));
  mesi.sort((x, y) => x.mese.localeCompare(y.mese));
  return { kind: 'sto', mesi, nuovi, agg, skip };
}
async function impStoricoApplica() {
  const D = S.data, P = S.imp; if (!P || P.kind !== 'sto') return;
  try {
    for (const m of P.mesi) {
      const { mese, ...dati } = m;
      await setDoc(doc(db, 'users', D.uid, 'storico', mese), { ...dati, manuale: true, aggiornato: serverTimestamp() });
      const ex = D.storico.find(x => x.mese === mese); if (ex) Object.assign(ex, dati, { manuale: true }); else D.storico.push({ mese, ...dati, manuale: true });
    }
    D.storico.sort((x, y) => x.mese.localeCompare(y.mese));
    S.msg = `Storico importato: ${P.mesi.length} mesi.`; S.imp = null; S.impErr = null; render();
  } catch (e) { S.msg = 'Importazione non riuscita' + (e && e.code === 'network-offline' ? ': sei offline.' : ': ' + errText(e)); render(); }
}
const CLASSE_NOTA = { SGLD: 'Oro e materie prime', BITC: 'Criptovalute', BTCE: 'Criptovalute', ZBTC: 'Criptovalute' };
function portafoglioProposta(txt) {
  const R = csvRighe(txt), hi = R.findIndex(r => r.some(c => sanif(c) === 'isin'));
  if (hi < 0) throw new Error('Non trovo le colonne ISIN, TICKER, QUOTE, PMC. Hai scelto il file giusto?');
  const H = R[hi].map(sanif), iI = H.indexOf('isin'), iT = H.indexOf('ticker'), iQ = H.findIndex(h => /^quot|^quant/.test(h)), iP = H.findIndex(h => /^pmc|^prezzo medio|^carico/.test(h));
  if (iQ < 0) throw new Error('Non trovo la colonna QUOTE.');
  const g = new Map(); let bad = 0;
  for (const r of R.slice(hi + 1)) {
    const isin = String(r[iI] || '').trim().toUpperCase(); if (!isin) continue;
    const q = numIt(r[iQ]), pmc = iP >= 0 && String(r[iP] || '').trim() ? numIt(r[iP]) : 0;
    if (!/^[A-Z0-9]{12}$/.test(isin) || !(q > 0) || !isFinite(pmc) || pmc < 0) { bad++; continue; }
    const tk = iT >= 0 ? String(r[iT] || '').trim().toUpperCase() : '', o = g.get(isin);
    if (o) { o.pmc = (o.quote * o.pmc + q * pmc) / (o.quote + q); o.quote += q; } else g.set(isin, { isin, ticker: tk, quote: q, pmc, classe: CLASSE_NOTA[tk] || 'Azioni' });
  }
  const righe = [...g.values()].map(x => ({ ...x, quote: Math.round(x.quote * 1e6) / 1e6, pmc: Math.round(x.pmc * 1e6) / 1e6 }));
  if (!righe.length) throw new Error('Nessun prodotto valido nel file.');
  return { kind: 'port', righe, bad };
}
async function impPortApplica() {
  const D = S.data, P = S.imp; if (!P || P.kind !== 'port') return;
  const nm = ($('impn') ? $('impn').value : '').trim(), sel = $('impa') ? $('impa').value : 'main', account = sel === 'main' ? '' : sel;
  S.impNome = nm; S.impAcc = sel;
  if (!nm) { S.msg = 'Scrivi il nome del conto (es. Directa).'; return render(); }
  try {
    /* investimenti inseriti a solo valore con lo stesso nome del conto: li sostituisce il portafoglio importato (gli altri restano) */
    const vecchi = D.voci.filter(v => isInvLegacy(v) && (v.account || '') === account && (v.dove || v.nome || '').trim().toLowerCase() === nm.toLowerCase());
    for (const o of vecchi) { await deleteDoc(doc(db, 'users', D.uid, 'voci', o.id)); D.voci = D.voci.filter(z => z !== o); }
    const ex = D.voci.find(v => isPort(v) && (v.dove || v.nome || '').trim().toLowerCase() === nm.toLowerCase() && (v.account || '') === account);
    const keep = p => { const o = ex && (ex.prodotti || []).find(z => z.isin && z.isin === p.isin); return o ? { ...p, ...(o.nom ? { nom: true } : {}), ...(o.aliq != null ? { aliq: o.aliq } : {}) } : p; };
    const prod = P.righe.map(r => keep({ isin: r.isin, nome: r.ticker, classe: r.classe, quote: r.quote, manuale: r2(r.quote * r.pmc), ...(r.pmc > 0 ? { pmc: r.pmc } : {}) }));
    if (ex) {
      const { id, assetClass, ...rest } = ex, dati = { ...rest, portafoglio: true, prodotti: prod }; dati.valore = valoreProd(dati);
      await setDoc(doc(db, 'users', D.uid, 'voci', id), dati); delete ex.assetClass; Object.assign(ex, dati);
    } else {
      if (!D.voci.some(y => y.categoria === 'Liquidità' && y.nome.toLowerCase() === nm.toLowerCase() && (y.account || '') === account)) {
        const nl = { tipo: 'attivo', categoria: 'Liquidità', nome: nm, account, valore: 0 };
        const r0 = await addDoc(collection(db, 'users', D.uid, 'voci'), nl); D.voci.push({ id: r0.id, ...nl });
      }
      const dati = { tipo: 'attivo', categoria: 'Investimenti', nome: nm, dove: nm, account, valore: 0, portafoglio: true, prodotti: prod }; dati.valore = valoreProd(dati);
      const r = await addDoc(collection(db, 'users', D.uid, 'voci'), dati); D.voci.push({ id: r.id, ...dati });
    }
    D.voci.forEach(applyPiano); await syncStorico();
    S.imp = null; S.impErr = null; S.impNome = ''; S.msg = `Portafoglio importato: ${prod.length} prodotti.` + (vecchi.length ? ` Sostituito l'investimento inserito a valore (${vecchi.length}).` : ''); render();
    if (!isAdmin()) segnalaIsin(prod);
    else { const extra = await sheetAggiungi(prod); if (extra) { S.msg += extra; render(); } }
  } catch (e) { S.msg = 'Importazione non riuscita' + (e && e.code === 'network-offline' ? ': sei offline.' : ': ' + errText(e)); render(); }
}
document.addEventListener('change', async e => {
  const id = e.target.id; if ((id !== 'imps' && id !== 'impp') || !e.target.files[0] || !S.data) return;
  if ($('impn')) S.impNome = $('impn').value; if ($('impa')) S.impAcc = $('impa').value;
  const k = id === 'imps' ? 'sto' : 'port';
  try { const txt = await leggiFile(e.target.files[0]); S.imp = k === 'sto' ? storicoProposta(txt) : portafoglioProposta(txt); S.impErr = null; }
  catch (x) { S.imp = null; S.impErr = [k, x.message || 'File non valido.']; }
  if (S.imp && S.imp.kind === 'port') { const nm = (S.impNome || '').trim().toLowerCase(), acc = (S.impAcc || 'main') === 'main' ? '' : S.impAcc, ex = nm && S.data.voci.find(v => isPort(v) && (v.dove || v.nome || '').trim().toLowerCase() === nm && (v.account || '') === acc); S.imp.exN = nm ? (ex ? (ex.prodotti || []).length : 0) : null; }
  render();
});
document.addEventListener('mousemove', e => { const t = e.target.closest ? e.target.closest('[data-tip]') : null; tipAt(e, PTYPE === 'touch' && t && t.closest('.pie') ? null : t); });
document.addEventListener('mouseleave', () => tipAt(null, null));
/* Albero ingrandito: si trascina con il mouse per spostarsi */
let TDRAG = null;
document.addEventListener('mousedown', e => { const c = e.target.closest && e.target.closest('#tfsc'); if (!c || e.button !== 0 || e.target.closest('[data-act]')) return; TDRAG = { c, x: e.clientX, y: e.clientY, l: c.scrollLeft, t: c.scrollTop }; c.classList.add('drag'); e.preventDefault(); });
document.addEventListener('mousemove', e => { if (!TDRAG) return; TDRAG.c.scrollLeft = TDRAG.l - (e.clientX - TDRAG.x); TDRAG.c.scrollTop = TDRAG.t - (e.clientY - TDRAG.y); });
document.addEventListener('mouseup', () => { if (TDRAG) { TDRAG.c.classList.remove('drag'); TDRAG = null; } });
document.addEventListener('change', async e => {
  if (e.target.id !== 'impf' || !e.target.files[0]) return;
  const D = S.data, box = $('impmsg'); if (!D) return;
  try {
    const txt = await e.target.files[0].text(), mk = monthKey(); let ok = 0, skip = 0, bad = 0;
    for (const ln of txt.split(/\r?\n/)) {
      const p = ln.trim().split(/[;,\t]/).map(x => x.trim()); if (p.length < 3 || !/^\d{4}-\d{2}$/.test(p[0])) continue;
      const at = Number(p[1].replace(',', '.')), pa = Number(p[2].replace(',', '.'));
      if (!isFinite(at) || !isFinite(pa) || at < 0 || pa < 0 || +p[0].slice(5) < 1 || +p[0].slice(5) > 12) { bad++; continue; }
      const ex = D.storico.find(x => x.mese === p[0]);
      if (p[0] >= mk || (ex && !ex.manuale)) { skip++; continue; }
      const dati = { attivi: r2(at), passivi: r2(pa), netto: r2(at - pa) };
      /* colonne facoltative 4-6: liquidità, portafoglio, beni */
      [['liq', 3], ['port', 4], ['beni', 5]].forEach(([k, j]) => { const x = p[j] !== undefined && p[j] !== '' ? Number(p[j].replace(',', '.')) : NaN; if (isFinite(x) && x >= 0) dati[k] = r2(x); });
      await setDoc(doc(db, 'users', D.uid, 'storico', p[0]), { ...dati, manuale: true, aggiornato: serverTimestamp() });
      if (ex) Object.assign(ex, dati, { manuale: true }); else D.storico.push({ mese: p[0], ...dati, manuale: true });
      ok++;
    }
    D.storico.sort((x, y) => x.mese.localeCompare(y.mese));
    S.msg = `Importati ${ok} mesi.` + (skip ? ` Saltati ${skip} (mese in corso o già registrato dall'app).` : '') + (bad ? ` Righe non valide: ${bad}.` : ''); render();
  } catch (er) { if (box) box.textContent = errText(er); }
});
document.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (el && el.tagName !== 'SELECT' && el.tagName !== 'INPUT') act(el); else if (!el && S.pieSel != null && S.tab === 'dis') { S.pieSel = null; S.anim = 'sel'; render(); } });
document.addEventListener('change', e => { if ((e.target.tagName === 'SELECT' || e.target.type === 'month') && e.target.dataset.act) act(e.target); });
document.addEventListener('change', e => { if (e.target.id === 'zt') { S.showZero = e.target.checked; try { localStorage.setItem('pf_zero', S.showZero ? '1' : '0'); } catch (x) {} render(); } });
document.addEventListener('input', e => { if (e.target.id === 'cq') { S.cq = e.target.value; const p = e.target.selectionStart; render(); const n = $('cq'); if (n) { n.focus(); n.setSelectionRange(p, p); } } });
document.addEventListener('change', e => { if (e.target.id === 'pdfhide') { S.pdfHide = e.target.checked; S.pdf = null; render(); } });
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('cvi')) { e.preventDefault(); const l = [...document.querySelectorAll('.cvi')], n = l[l.indexOf(e.target) + 1]; if (n) { n.focus(); n.select(); } else act(document.querySelector('[data-act="cfmsave"]')); return; }
  if (e.key !== 'Enter') return;
  if ($('an') && document.activeElement === $('an')) act(document.querySelector('[data-act="adda"]'));
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});

/* ---------- Accesso ---------- */
/* anteprima del totale mentre si modifica un portafoglio (telefono) */
function portAnteprima() { const el = $('pprev'); if (el) el.textContent = eur(portTot(grabPort())); }
document.addEventListener('input', e => {
  if (e.target.closest && e.target.closest('.pcm')) portAnteprima();
  if (e.target.id === 'pmq') { const q = e.target.value.trim().toLowerCase(); document.querySelectorAll('.pmrow').forEach(r => { r.style.display = !q || r.textContent.toLowerCase().includes(q) ? '' : 'none'; }); }
});
document.addEventListener('change', e => { if (e.target.closest && e.target.closest('.pcm')) portAnteprima(); });

/* ---------- Visualizzazione dei dati di un'altra persona (sola lettura) ---------- */
const SCRIVI_ORIG = { setDoc, updateDoc, deleteDoc, addDoc };
const bloccaScritture = on => Object.assign(window, on ? { setDoc: () => Promise.reject(Object.assign(new Error('read-only'), { code: 'read-only' })), updateDoc: () => Promise.reject(Object.assign(new Error('read-only'), { code: 'read-only' })), deleteDoc: () => Promise.reject(Object.assign(new Error('read-only'), { code: 'read-only' })), addDoc: () => Promise.reject(Object.assign(new Error('read-only'), { code: 'read-only' })) } : SCRIVI_ORIG);
async function vediDi(uid, nome) {
  const prec = S.data, precRo = S.ro; if (!S.own) S.own = prec;
  S.ro = { uid, nome }; bloccaScritture(true);
  try {
    S.msg = ''; await loadData(uid, nome);
    S.fAcc = 'all'; S.edit = null; S.fd = null; S.pop = null; S.popm = null; S.tab = innerWidth >= 1000 ? 'pan' : 'pat'; window.scrollTo(0, 0); render();
  } catch (e) {
    S.data = prec; S.ro = precRo; if (!precRo) { S.own = null; bloccaScritture(false); }
    S.msg = e && e.code === 'permission-denied' ? nome + ' non ti ha (ancora) dato l\'accesso.' : errText(e); render();
  }
}
function tornaMio() {
  if (!S.own) return; S.data = S.own; S.own = null; S.ro = null; bloccaScritture(false);
  S.fAcc = 'all'; S.edit = null; S.fd = null; S.pop = null; S.popm = null; S.tab = 'cnd'; S.msg = ''; window.scrollTo(0, 0); render();
}

/* ---------- Demo: dati inventati (10 anni, da 50.000 a 500.000 euro), nulla viene salvato ---------- */
function generaDemo() {
  const oggi = new Date(), N = 120, ACQ = 40, YM = (y, m) => y + '-' + String(m + 1).padStart(2, '0');
  const dAcq = new Date(oggi.getFullYear(), oggi.getMonth() - (N - ACQ), 1), inizio = YM(dAcq.getFullYear(), dAcq.getMonth()) + '-01', fine = YM(dAcq.getFullYear() + 25, dAcq.getMonth()) + '-01';
  const prezzi = { IE00DEMO0001: 128.6, IE00DEMO0002: 34.2, IE00DEMO0003: 47.8, IE00DEMO0004: 232, IE00DEMO0005: 171, IE00DEMO0006: 74 };
  S.prezzi = { map: prezzi, quando: Date.now() };
  const P = (n, isin, nome, classe, quote, pmc) => ({ isin, nome, classe, quote, pmc, manuale: 0 });
  const casaVal = i => i < ACQ ? 0 : Math.round(260000 * Math.pow(1.014, (i - ACQ) / 12));
  const voci = [
    { id: 'demo1', tipo: 'attivo', categoria: 'Liquidità', nome: 'Conto corrente', account: '', valore: 0 },
    { id: 'demo2', tipo: 'attivo', categoria: 'Liquidità', nome: 'Conto deposito', account: '', valore: 35000 },
    { id: 'demo3', tipo: 'attivo', categoria: 'Liquidità', nome: 'Directa', account: '', valore: 2800 },
    { id: 'demo4', tipo: 'attivo', categoria: 'Investimenti', nome: 'Directa', dove: 'Directa', account: '', valore: 0, portafoglio: true, prodotti: [
      P(1, 'IE00DEMO0001', 'ETF Azionario Mondo', 'Azioni', 850, 98.4), P(2, 'IE00DEMO0002', 'ETF Mercati Emergenti', 'Azioni', 600, 29.1),
      P(3, 'IE00DEMO0003', 'ETF Obbligazionario Euro', 'Obbligazioni', 1000, 49.5), P(4, 'IE00DEMO0004', 'ETC Oro fisico', 'Oro e materie prime', 100, 195)] },
    { id: 'demo5', tipo: 'attivo', categoria: 'Immobili', nome: 'Casa', account: '', valore: casaVal(N) },
    { id: 'demo6', tipo: 'passivo', categoria: 'Mutuo', nome: 'Mutuo casa', account: '', valore: 0, piano: true, capitale: 200000, inizio, fine },
    { id: 'demo7', tipo: 'attivo', categoria: 'Liquidità', nome: 'Conto Marco', account: 'demo-marco', valore: 9000 },
    { id: 'demo8', tipo: 'attivo', categoria: 'Investimenti', nome: 'Fineco', dove: 'Fineco', account: 'demo-marco', valore: 0, portafoglio: true, prodotti: [
      P(5, 'IE00DEMO0005', 'ETF Azionario USA', 'Azioni', 280, 140), P(6, 'IE00DEMO0006', 'ETF Tecnologia', 'Azioni', 180, 60)] }
  ];
  voci.forEach(applyPiano);
  voci[0].valore = Math.round(500000 - totals(voci).netto);
  const C = catTot(voci), T = totals(voci);
  /* storico: mese per mese, con le stesse cifre di oggi all'ultimo mese */
  let seed = 20260607; const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }, noise = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
  const ov = { 39: -.09, 40: -.12, 41: .06, 42: .05, 43: .04, 62: -.05, 63: -.03, 64: .02, 65: -.06, 66: 0, 67: -.08, 68: .07, 69: -.03, 70: -.08, 71: .05, 72: .04, 73: .03 };
  const rets = [0]; for (let i = 1; i <= N; i++) rets.push(ov[i] !== undefined ? ov[i] : .0055 + .016 * noise());
  const pathP = c => { const p = [20000]; for (let i = 1; i <= N; i++) p.push(p[i - 1] * (1 + rets[i]) + c); return p; };
  let lo = 0, hi = 30000; for (let k = 0; k < 80; k++) { const m = (lo + hi) / 2; if (pathP(m)[N] < C.port) lo = m; else hi = m; }
  const port = pathP((lo + hi) / 2), s = (C.liq - 30000 + 60000) / N, storico = [];
  for (let i = 0; i <= N; i++) {
    const d = new Date(oggi.getFullYear(), oggi.getMonth() - (N - i), 1), mese = monthKey(d);
    if (i === N) { storico.push({ mese, attivi: r2(T.attivi), passivi: r2(T.passivi), netto: r2(T.netto), liq: r2(C.liq), port: r2(C.port), beni: r2(C.beni) }); break; }
    const liq = Math.round(30000 + s * i - (i >= ACQ ? 60000 : 0) + (i > 0 ? 1300 * noise() : 0)), pt = Math.round(port[i]), beni = casaVal(i);
    const pas = i < ACQ ? 0 : Math.round(piano({ capitale: 200000, inizio, fine }, new Date(d.getFullYear(), d.getMonth() + 1, 0)).residuo);
    storico.push({ mese, attivi: liq + pt + beni, passivi: pas, netto: liq + pt + beni - pas, liq, port: pt, beni, manuale: true });
  }
  return { uid: 'demo', nome: 'Giulia', voci, arch: [], storico, accounts: [{ id: 'demo-marco', nome: 'Marco' }] };
}
function avviaDemo() {
  const D = generaDemo();
  S.demo = true; S.user = { uid: 'demo', displayName: 'Demo', email: '' }; S.profile = { nome: D.nome, approved: true, termini: TERMS_V, viewers: [] }; S.users = [];
  S.data = D; bloccaScritture(true); S.tab = innerWidth >= 1000 ? 'pan' : 'pat'; S.fAcc = 'all'; S.loading = false; S.msg = ''; window.scrollTo(0, 0); render();
}

onAuthStateChanged(auth, async user => {
  if (S.demo) return;
  S.user = user; S.msg = '';
  if (!user) { S.profile = null; S.data = null; S.loading = false; return render(); }
  S.loading = true; render();
  try {
    const ref = doc(db, 'users', user.uid);
    let snap = await getDoc(ref);
    if (!snap.exists()) {
      const nome = String(user.displayName || (user.email || 'Utente').split('@')[0]).trim().slice(0, 40) || 'Utente';
      await setDoc(ref, { nome, approved: false, creato: serverTimestamp() });
      snap = await getDoc(ref);
    }
    S.profile = snap.data();
    if (user.uid === ADMIN_UID && !S.profile.approved) {
      await updateDoc(ref, { approved: true });
      S.profile.approved = true;
    }
    if (S.profile.approved) {
      await loadData(user.uid, S.profile.nome, false);
      if (isAdmin()) await loadUsers();
      aggiornaPrezzi(false);
    }
  } catch (e) { S.msg = errText(e); }
  S.loading = false; render();
});

/* Esc = indietro dai grafici ingranditi (computer) */
document.addEventListener('keydown', e => { if (e.key !== 'Escape' || !S.data || S.tab !== 'pan' || innerWidth < 1000) return; if (S.cx) { S.cx = false; render(); } else if (S.tex) { S.tex = false; S.tcan = true; render(); } else if (S.hq) { S.hq = null; S.hanim = 'out'; render(); } else if (S.qd) { S.qd = null; S.panim = 'out'; render(); } });

/* Torte: la fetta (o la voce in legenda) si evidenzia al passaggio del mouse; sul tocco resta il tocco */
const isTouch = () => typeof PTYPE !== 'undefined' && PTYPE === 'touch';
document.addEventListener('mouseover', e => {
  if (isTouch() || !e.target.closest) return; const el = e.target.closest('[data-act="qs"]');
  if (!el) { if (S.qsel && Object.values(S.qsel).some(x => x != null) && !e.target.closest('.pleg')) { S.qsel = {}; render(); } return; }
  const [k, i] = el.dataset.v.split(':'); S.qsel = S.qsel || {}; if (S.qsel[k] === +i) return; S.qsel[k] = +i; render();
});
document.addEventListener('mouseout', e => {
  if (isTouch()) return; if (!e.relatedTarget && S.qsel && Object.values(S.qsel).some(x => x != null)) { S.qsel = {}; render(); return; }
  const c = e.target.closest && e.target.closest('#pie .pbody'); if (!c || (e.relatedTarget && c.contains(e.relatedTarget) && e.relatedTarget.closest && e.relatedTarget.closest('[data-act="qs"]'))) return;
  if (S.qd && S.qsel && S.qsel[S.qd] != null) { S.qsel[S.qd] = null; render(); }
});

document.addEventListener('change', async e => {
  if (!e.target.classList || !e.target.classList.contains('pi') || !isAdmin()) return;
  const isin = e.target.value.trim().toUpperCase(), row = e.target.closest('.ppr'), n = row && row.querySelector('.pn');
  if (!n || n.value.trim() || !/^[A-Z0-9]{12}$/.test(isin)) return;
  n.placeholder = 'Cerco il nome…'; const nm = await nomeDaIsin(isin); n.placeholder = nm ? 'Nome' : 'Nome non trovato: ' + (window._nomeInfo || ''); if (nm && !n.value.trim()) n.value = nm;
});

