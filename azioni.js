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
function grabForm() { const o = {}; FIDS.forEach(id => { const e = $(id); if (e) o[id] = e.value; }); return o; }

const keepTT = () => { const t = document.querySelector('.tt'); if (t && S.ttl != null) t.scrollLeft = S.ttl; };
async function act(el) {
  let a = el.dataset.act; const v = el.dataset.v, D = S.data;
  S.msg = '';
  try {
    if (a === 'info') { S.tab = 'info'; S.menu = false; window.scrollTo(0, 0); return render(); }
    if (a === 'terms') { S.tab = 'terms'; S.menu = false; return render(); }
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
    if (a === 'accsel') { S.tab = 'pan'; S.fAcc = v; S.edit = null; S.fd = null; S.addAcc = false; S.pp = ['r']; S.pieSel = null; window.scrollTo(0, 0); return render(); }
    if (a === 'accT') { S.accOpen = !(S.accOpen || (S.tab === 'pan' && (S.fAcc || 'all') !== 'all')); S.addAcc = false; return render(); }
    if (a === 'nv') { S.tab = 'nv'; S.edit = null; S.fd = null; S.exp = { ...(S.exp || {}), form: true }; window.scrollTo(0, 0); return render(); }
    if (a === 'facc') { S.fAcc = v; S.edit = null; S.menu = false; S.addAcc = false; return render(); }
    if (a === 'admin') { S.tab = 'adm'; S.menu = false; S.addAcc = false; return render(); }
    if (a === 'exp') { S.exp = S.exp || {}; S.exp[v] = !S.exp[v]; return render(); }
    if (a === 'menu') { S.menu = !S.menu; S.addAcc = false; return render(); }
    if (a === 'addo') { S.addAcc = true; render(); const i = $('an'); if (i) i.focus(); return; }
    if (a === 'addc') { S.addAcc = false; return render(); }
    if (a === 'pop') { S.pop = { id: v, mode: 'menu' }; return render(); }
    if (a === 'popclose') { S.pop = null; render(); return keepTT(); }
    if (a === 'tleaf') { const t = document.querySelector('.tt'); S.ttl = t ? t.scrollLeft : null; S.pop = { id: v, mode: 'upd', only: true }; render(); return keepTT(); }
    if (a === 'popback') { if (S.pop.only) { S.pop = null; render(); return keepTT(); } S.pop.mode = 'menu'; return render(); }
    if (a === 'popupd') { S.pop.mode = 'upd'; return render(); }
    if (a === 'popdel') { S.pop.mode = 'del'; return render(); }
    if (a === 'popedit') { S.edit = S.pop.id; S.fd = null; S.pop = null; if (innerWidth >= 1000) S.tab = 'nv'; render(); const f = $('formvoce'); if (f) f.scrollIntoView({ behavior: 'smooth' }); return; }
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
    if (a === 'tview') { S.tanim = true; S.tview = v; S.tx = new Set(['r']); S.pp = ['r']; S.pieSel = null; S.anim = true; return render(); }
    if (a === 'qs') { const [k, i] = v.split(':'); S.qsel = S.qsel || {}; S.qsel[k] = S.qsel[k] === +i ? null : +i; return render(); }
    if (a === 'chv') { S.chv = v; S.qd = null; return render(); }
    if (a === 'qopen') { S.qd = v; return render(); }
    if (a === 'qclose') { S.qd = null; return render(); }
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
    if (a === 'agg') { S.agg = v; S.wsig = null; return render(); }
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
    if (a === 'cancel') { S.edit = null; S.fd = null; if (S.exp) S.exp.form = false; if (innerWidth >= 1000 && S.tab === 'nv') S.tab = 'pan'; return render(); }
    if (a === 'export') return exportCsv();
    if (a === 'timpno') { S.timp = null; S.timpErr = ''; return render(); }
    if (a === 'timpok') return isAdmin() ? titoliApplica() : undefined;
    if (a === 'save') {
      S.fd = grabForm();
      const tipo = $('ft').value, categoria = $('fc').value; let nome = $('fn') ? $('fn').value.trim() : '', fm = $('fm'), fa2 = $('fa');
      const base = { tipo, categoria, nome, account: fa2 && fa2.value !== 'main' ? fa2.value : '' };
      let dati;
      if (tipo === 'passivo' && fm && fm.value === 'piano') {
        const cap = pnum($('fk').value), ini = $('fi').value, fin = $('ff').value;
        if (!nome || !isFinite(cap) || cap <= 0) { S.msg = 'Inserisci un nome e l\'importo preso a prestito.'; return render(); }
        if (!ini || !fin || fin <= ini) { S.msg = 'Inserisci le date: la fine deve essere dopo l\'inizio.'; return render(); }
        dati = applyPiano({ ...base, piano: true, capitale: r2(cap), inizio: ini, fine: fin, valore: 0 });
      } else {
        const valore = pnum($('fv').value);
        const isI = tipo === 'attivo' && categoria === 'Investimenti';
        if (isI) { nome = ($('fw') ? ($('fw').value === '__new' ? ($('fwn') ? $('fwn').value.trim() : '') : $('fw').value) : ''); base.nome = nome; if (!nome) { S.msg = 'Scegli il conto di riferimento o scrivi il nome del nuovo conto.'; return render(); } if (!$('fac') || !$('fac').value) { S.msg = 'Scegli l\'asset class.'; return render(); } }
        if (!nome || !isFinite(valore) || valore < 0) { S.msg = 'Inserisci un nome e un valore valido (zero o più).'; return render(); }
        dati = { ...base, valore: r2(valore) };
        if (tipo === 'attivo' && categoria === 'Investimenti') {
          const dove = nome, ob = $('fo') ? pnum($('fo').value) : NaN;
          dati.dove = dove; dati.nome = dove; dati.assetClass = $('fac').value;
          if (!D.voci.some(x => x.categoria === 'Liquidità' && x.nome.toLowerCase() === dove.toLowerCase())) {
            const nl = { tipo: 'attivo', categoria: 'Liquidità', nome: dove, account: base.account, valore: 0 };
            const r0 = await addDoc(collection(db, 'users', D.uid, 'voci'), nl); D.voci.push({ id: r0.id, ...nl });
          }
          if (isFinite(ob) && ob > 0) dati.obiettivo = r2(ob);
        }
      }
      if (S.edit) { await setDoc(doc(db, 'users', D.uid, 'voci', S.edit), dati); const i = D.voci.findIndex(x => x.id === S.edit); D.voci[i] = { id: S.edit, ...dati }; }
      else { const r = await addDoc(collection(db, 'users', D.uid, 'voci'), dati); D.voci.push({ id: r.id, ...dati }); }
      S.edit = null; S.fd = null; if (S.exp) S.exp.form = false; if (innerWidth >= 1000 && S.tab === 'nv') S.tab = 'pan'; await syncStorico(); return render();
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
  const iC = ix('classe'), iN = ix('nome'), iV = ix('valore'), iQ = H.findIndex(h => h === 'quantità' || h === 'quantita');
  const iCo = H.map((h, i) => /^quantit[àa] .+/.test(h) ? i : -1).filter(i => i >= 0);
  if (iC < 0 || iV < 0 || iQ < 0 || !iCo.length) throw new Error('Non trovo le colonne Classe, Valore, Quantità e le quantità per conto. Hai scaricato la scheda "Elenco titoli"?');
  const mapC = c => { c = c.trim().toLowerCase(); return /^azion/.test(c) ? 'Azioni' : /^obblig/.test(c) ? 'Obbligazioni' : /^cript/.test(c) ? 'Criptovalute' : /^(commod|oro)/.test(c) ? 'Oro e materie prime' : 'Altro'; };
  const g = new Map(), conti = new Map(); let letti = 0;
  R.slice(1).forEach(r => {
    const tot = pnum(r[iQ]), val = pnum(r[iV]); if (!(tot > 0) || !(val > 0)) return; letti++;
    iCo.forEach(i => {
      const qt = pnum(r[i]); if (!(qt > 0)) return;
      const broker = H[i].replace(/^quantit[àa] /, '').trim().split(/\s+/)[0]; const dove = broker.charAt(0).toUpperCase() + broker.slice(1);
      const k = dove.toLowerCase() + '|' + mapC(r[iC]);
      if (!g.has(k)) g.set(k, { dove, assetClass: mapC(r[iC]), valore: 0 });
      g.get(k).valore += val * qt / tot;
    });
  });
  const acc = S.fAcc && S.fAcc !== 'all' && S.fAcc !== 'main' ? S.fAcc : '';
  const righe = [...g.values()].map(x => {
    x.valore = r2(x.valore);
    const ex = D.voci.find(v => v.tipo === 'attivo' && v.categoria === 'Investimenti' && (v.dove || '').trim().toLowerCase() === x.dove.toLowerCase() && v.assetClass === x.assetClass && (v.account || '') === acc);
    return { ...x, exId: ex ? ex.id : '', prima: ex ? ex.valore : null };
  }).sort((a, b) => a.dove.localeCompare(b.dove) || b.valore - a.valore);
  if (!righe.length) throw new Error('Nessun titolo con quantità trovato.');
  return { righe, acc, letti };
}
async function titoliApplica() {
  const D = S.data, P = S.timp; if (!P) return;
  for (const x of P.righe) {
    if (x.exId) {
      const v = D.voci.find(y => y.id === x.exId); if (!v) continue;
      const { id, ...rest } = v; const dati = { ...rest, valore: x.valore };
      await setDoc(doc(db, 'users', D.uid, 'voci', id), dati); Object.assign(v, dati);
    } else {
      if (!D.voci.some(y => y.categoria === 'Liquidità' && y.nome.toLowerCase() === x.dove.toLowerCase() && (y.account || '') === P.acc)) {
        const nl = { tipo: 'attivo', categoria: 'Liquidità', nome: x.dove, account: P.acc, valore: 0 };
        const r0 = await addDoc(collection(db, 'users', D.uid, 'voci'), nl); D.voci.push({ id: r0.id, ...nl });
      }
      const dati = { tipo: 'attivo', categoria: 'Investimenti', nome: x.dove, dove: x.dove, assetClass: x.assetClass, account: P.acc, valore: x.valore };
      const r = await addDoc(collection(db, 'users', D.uid, 'voci'), dati); D.voci.push({ id: r.id, ...dati });
    }
  }
  S.timp = null; await syncStorico(); S.msg = 'Titoli importati e aggiornati.'; render();
}
document.addEventListener('change', async e => {
  if (e.target.id !== 'titf' || !e.target.files[0] || !S.data || !isAdmin()) return;
  try { S.timp = titoliProposta(await e.target.files[0].text()); S.timpErr = ''; } catch (x) { S.timp = null; S.timpErr = x.message || 'File non valido.'; }
  render();
});
document.addEventListener('mousemove', e => { const t = e.target.closest ? e.target.closest('[data-tip]') : null; tipAt(e, PTYPE === 'touch' && t && t.closest('.pie') ? null : t); });
document.addEventListener('mouseleave', () => tipAt(null, null));
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
document.addEventListener('change', e => { if (e.target.id === 'pdfhide') { S.pdfHide = e.target.checked; S.pdf = null; render(); } });
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  if ($('an') && document.activeElement === $('an')) act(document.querySelector('[data-act="adda"]'));
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});

/* ---------- Accesso ---------- */
onAuthStateChanged(auth, async user => {
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
    }
  } catch (e) { S.msg = errText(e); }
  S.loading = false; render();
});
