'use strict';
/* ---------- Schermate ---------- */
const ORD = ['pat', 'dis', 'and', 'rep'];
function arrows() {
  const i = ORD.indexOf(S.tab); if (i < 0 || S.menu || S.pop || S.popm || S.fs) return '';
  return (i > 0 ? '<button class="pga l" data-act="pg" data-v="-1" aria-label="Pagina precedente">‹</button>' : '') + (i < ORD.length - 1 ? '<button class="pga r" data-act="pg" data-v="1" aria-label="Pagina successiva">›</button>' : '');
}
function render() {
  const el = $('app');
  if (S.loading) { el.innerHTML = '<div class="auth card">Caricamento…</div>'; return; }
  if (!S.user) return renderAuth(el);
  if (S.profile && (S.profile.termini || 0) < TERMS_V) return termsGate();
  if (!S.profile || !S.profile.approved) {
    el.innerHTML = `<div class="auth card"><h2>Registrazione ricevuta</h2>
      <p>Ciao ${esc(S.profile?.nome || '')}. Attendi l'approvazione dell'amministratore.</p>
      <div class="msg">${esc(S.msg)}</div>
      <div class="acts"><button class="b" data-act="refresh">Controlla di nuovo</button><button class="b s" data-act="logout">Esci</button></div></div>`;
    return;
  }
  const D = S.data;
  const IC = { pan: '<path d="M3 12l9-8 9 8"/><path d="M5 10v10h14V10"/>', pat: '<path d="M3 10h18M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18M12 3l9 5H3z"/>', dis: '<path d="M12 3v9h9"/><path d="M20.5 15A9 9 0 1 1 9 3.5"/>', and: '<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>', rep: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/>' };
  const wide = innerWidth >= 1000;
  if (!wide && S.tab === 'pan') S.tab = 'pat';
  if (!wide && S.tab === 'nv') S.tab = 'pat';
  if (wide && (!S.panSeen && S.tab === 'pat' || ['pat', 'dis', 'and'].includes(S.tab))) S.tab = 'pan';
  S.panSeen = true;
  const tabs = [...(wide ? [['pan', 'Panoramica']] : []), ['pat', 'Patrimonio'], ['dis', 'Distribuzione'], ['and', 'Andamento'], ['rep', 'Report']];
  const pend = isAdmin() ? S.users.filter(u => !u.approved).length : 0;
  if (S.tab === 'adm' && !isAdmin()) S.tab = 'pat';
  let body = '';
  if (S.tab === 'pan') body = pagePan(); else if (S.tab === 'pat' || S.tab === 'nv') body = pagePat(); else if (S.tab === 'dis') body = pageDis(); else if (S.tab === 'and') body = pageAnd(); else if (S.tab === 'rep') body = pageRep(); else if (S.tab === 'terms') body = pageTerms(); else if (S.tab === 'info') body = pageInfo(); else body = pageAdm();
  el.innerHTML = `<header><div class="hw"><button class="ham" data-act="menu" aria-label="Menu">☰${pend ? '<i class="dot"></i>' : ''}</button><h1>P.Finance <span class="ver">v${VER} beta</span></h1><span class="un">${esc(S.profile.nome)}</span>
    ${wide ? '' : `<button class="b s sm" data-act="hide">${hideAmt() ? 'Mostra importi' : 'Nascondi importi'}</button>`}<button class="b s sm" data-act="share">Condividi</button><button class="b s sm" data-act="logout">Esci</button></div>
    </header>
    <main>
    <div class="msg ${/salvato\.$|aggiunto\.$|aggiornato\.$|^Link copiato/.test(S.msg) ? 'ok' : ''}">${esc(S.msg)}</div>${body}</main>${S.menu ? drawer() : ''}${S.pop ? popup() : ''}${S.popm ? popupM() : ''}${S.fs ? fsOverlay() : ''}${arrows()}${wide ? navWide(IC, pend, D) : `<nav><div class="nv">${tabs.map(([k, l]) => `<button data-act="tab" data-v="${k}" class="${S.tab === k ? 'on' : ''}" aria-label="${l}"><svg viewBox="0 0 24 24">${IC[k]}</svg>${l}</button>`).join('')}</div></nav>`}`;
  const hd = document.querySelector('header'); if (hd) document.documentElement.style.setProperty('--hh', hd.offsetHeight + 'px');
  navSync();
}

/* Barra laterale (solo computer): Panoramica, Account (Aggregato e singoli), Report, poi info, termini, amministrazione */
function navWide(IC, pend, D) {
  const fa = S.fAcc || 'all', pan = S.tab === 'pan', open = S.accOpen || (pan && fa !== 'all');
  const sv = d => `<svg viewBox="0 0 24 24">${d}</svg>`;
  const ICX = { acc: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.5 2.8-6 6-6s6 2.5 6 6"/><path d="M16 5a3 3 0 0 1 0 6M18 14c2 .7 3 2.5 3 5"/>', inf: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>', ter: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h7"/>', adm: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>' };
  const row = (k, n, ed) => `<div class="nr"><button data-act="accsel" data-v="${esc(k)}" class="${pan && fa === k ? 'on' : ''}">${esc(n)}</button>${ed ? `<span class="nic" data-act="rena" data-v="${k}" title="Rinomina">✎</span><span class="nic" data-act="dela" data-v="${k}" title="Elimina">✕</span>` : ''}</div>`;
  const add = S.addAcc ? `<div class="nadd"><input id="an" maxlength="30" placeholder="Nome (es. Anna)"><div class="acts"><button class="b sm" data-act="adda">Aggiungi</button><button class="b s sm" data-act="addc">Annulla</button></div></div>` : `<button class="nplus" data-act="addo">＋ Aggiungi account</button>`;
  const sub = open ? `<div class="nsub">${row('all', 'Aggregato')}${row('main', D.nome)}${D.accounts.map(a => row(a.id, a.nome, true)).join('')}${add}</div>` : '';
  const it = (act, v, ic, l, on, extra) => `<button data-act="${act}"${v ? ` data-v="${v}"` : ''} class="${on ? 'on' : ''}">${sv(ic)}${l}${extra || ''}</button>`;
  return `<nav><div class="nv">${it('accsel', 'all', IC.pan, 'Panoramica', pan && fa === 'all')}${it('accT', '', ICX.acc, 'Account', pan && fa !== 'all', `<span class="chev ${open ? 'open' : ''}" style="margin-left:auto">▸︎</span>`)}${sub}${it('tab', 'rep', IC.rep, 'Report', S.tab === 'rep')}<hr>${it('info', '', ICX.inf, 'Info e novità', S.tab === 'info')}${it('terms', '', ICX.ter, 'Termini e condizioni', S.tab === 'terms')}${isAdmin() ? it('admin', '', ICX.adm, 'Amministrazione', S.tab === 'adm', pend ? `<span class="ver" style="background:#fee2e2;color:#b91c1c;margin:0 0 0 auto">${pend}</span>` : '') : ''}</div></nav>`;
}

/* ---------- Gesto/tasto "indietro" ---------- */
let navLast = null;
const navKey = () => S.tab + '|' + (S.menu ? 'm' : S.pop ? 'p' : S.popm ? 'q' : S.fs ? 'f' : '');
function navSync() {
  const k = navKey();
  if (navLast === null) { history.replaceState({ k }, ''); navLast = k; return; }
  if (k === navLast) return;
  const [t0, o0] = navLast.split('|'), [t1, o1] = k.split('|');
  navLast = k;
  if (o0 && !o1 && t0 === t1) history.back(); else history.pushState({ k }, '');
}
window.addEventListener('popstate', e => {
  if (!S.user || !S.profile || !S.profile.approved || !e.state || !e.state.k) return;
  const t = e.state.k.split('|')[0], changed = t !== S.tab;
  S.tab = t; S.menu = false; S.pop = null; S.popm = null; S.fs = null; S.addAcc = false;
  navLast = t + '|';
  render(); if (changed) window.scrollTo(0, 0);
});

function renderAuth(el) {
  el.innerHTML = `<div class="auth card"><h2>P.Finance <span class="ver">v${VER} beta</span></h2>
    <button class="b" style="width:100%" data-act="google">Accedi con Google</button>
    <p class="note">Al primo accesso l'amministratore dovrà approvarti.</p>
    <div class="msg" id="am">${esc(S.msg)}</div></div>`;
}

const accKey = v => v.account || 'main';
const accName = v => { const D = S.data; if (!v.account) return D.nome; const a = D.accounts.find(x => x.id === v.account); return a ? a.nome : '(account eliminato)'; };

function pagePat() {
  const D = S.data, fa = S.fAcc || 'all', ed = S.edit && D.voci.find(v => v.id === S.edit);
  const vis = vz(D.voci).filter(v => fa === 'all' || accKey(v) === fa), t = totals(vis);
  const g = (id, d) => (S.fd && S.fd[id] !== undefined) ? S.fd[id] : d;
  const tipo = g('ft', ed ? ed.tipo : 'attivo');
  const mod = tipo === 'passivo' ? g('fm', ed ? (ed.piano ? 'piano' : 'manuale') : 'piano') : 'manuale';
  const cat = g('fc', ed ? ed.categoria : CATS[tipo][0]);
  const isInv = tipo === 'attivo' && cat === 'Investimenti';
  const accOpts = [['main', D.nome], ...D.accounts.map(a => [a.id, a.nome])];
  const clk = id => ` data-act="pop" data-v="${id}"`;
  const rcl = ' cl';
  const sumOf = arr => arr.reduce((s, v) => s + v.valore, 0);
  const sm = (v, showCat) => {
    const a = [];
    if (showCat) a.push(esc(v.categoria));
    if (v.piano) a.push(`${eur(piano(v).rata)}/mese`, `fino al ${fmtD(v.fine)}`);
    if (v.obiettivo) a.push(`obiettivo ${eur(v.obiettivo)} (${Math.round(v.valore / v.obiettivo * 100)}%)`);
    if (D.accounts.length) a.push(esc(accName(v)));
    return a.join(' · ');
  };
  const rowHtml = (v, tp, showCat) => { const s = sm(v, showCat); return `<div class="row${rcl}"${clk(v.id)}><div class="n">${esc(dn(v))}${s ? `<small>${s}</small>` : ''}</div><div class="v${tp === 'passivo' ? ' neg' : ''}">${eur(v.valore)}</div></div>`; };
  const attivi = vis.filter(v => v.tipo === 'attivo');
  const catList = [...CATS.attivo, ...new Set(attivi.map(v => v.categoria).filter(c => !CATS.attivo.includes(c)))];
  const secs = catList.map(c => ({ c, items: attivi.filter(v => v.categoria === c) })).filter(s => s.items.length);
  const listAttivi = () => {
    if (!secs.length) return '<p class="note">Nessuna voce.</p>';
    return secs.map(s => {
      const key = 'cat:' + s.c, open = S.exp && S.exp[key], n = s.items.length;
      let inner = '';
      if (open) {
        if (s.c === 'Investimenti') {
          const grp = {}; s.items.forEach(v => (grp[v.dove || ''] = grp[v.dove || ''] || []).push(v));
          const keys = Object.keys(grp).sort((a, b) => a === '' ? 1 : b === '' ? -1 : sumOf(grp[b]) - sumOf(grp[a]));
          inner = keys.map(k => `<div class="gh"><span>${k ? 'su ' + esc(k) : 'Posizione non indicata'}</span><span>${eur(sumOf(grp[k]))}</span></div>` + grp[k].sort((a, b) => b.valore - a.valore).map(v => rowHtml(v, 'attivo', false)).join('')).join('');
        } else inner = [...s.items].sort((a, b) => b.valore - a.valore).map(v => rowHtml(v, 'attivo', false)).join('');
        inner = `<div class="sub">${inner}</div>`;
      }
      return `<div class="row cl cat" data-act="exp" data-v="${esc(key)}"><div class="n">${esc(s.c)}<small>${n} ${n === 1 ? 'voce' : 'voci'}</small></div><div class="v">${eur(sumOf(s.items))}</div><span class="chev ${open ? 'open' : ''}">▸︎</span></div>${inner}`;
    }).join('');
  };
  const listPassivi = () => { const it = vis.filter(v => v.tipo === 'passivo').sort((a, b) => b.valore - a.valore); return it.length ? it.map(v => rowHtml(v, 'passivo', true)).join('') : '<p class="note">Nessuna voce.</p>'; };
  const ar = (D.arch || []).slice().sort((x, y) => x.tipo.localeCompare(y.tipo) || dn(x).localeCompare(dn(y))), aop = S.exp && S.exp.arch;
  const archSec = ar.length ? `<div class="card"><div class="row cl cat" data-act="exp" data-v="arch"><div class="n">Archiviati<small>${ar.length} ${ar.length === 1 ? 'voce' : 'voci'} · non contano nei totali</small></div><span class="chev ${aop ? 'open' : ''}">▸︎</span></div>${aop ? `<div class="sub">${ar.map(v => `<div class="row${rcl}"${clk(v.id)}><div class="n">${esc(dn(v))}<small>${esc(v.tipo === 'attivo' ? 'Attivo' : 'Passivo')} · ${esc(v.categoria)}</small></div><div class="v${v.tipo === 'passivo' ? ' neg' : ''}">${eur(v.valore)}</div></div>`).join('')}</div>` : ''}</div>` : '';
  const fname = fa === 'all' ? '' : fa === 'main' ? D.nome : ((D.accounts.find(a => a.id === fa) || {}).nome || '');
  const filtro = fname ? `<div class="banner"><span>Account: <b>${esc(fname)}</b></span><button class="b sm" data-act="facc" data-v="all">Mostra tutti</button></div>` : '';
  const selAcc = D.accounts.length ? `<label class="lbl">Account</label><select id="fa">${accOpts.map(([k, n]) => `<option value="${esc(k)}" ${g('fa', ed ? accKey(ed) : (fa !== 'all' ? fa : 'main')) === k ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>` : '';
  const num = (id, dflt) => esc(g(id, dflt));
  const suggest = [...new Set(D.voci.filter(v => v.categoria === 'Liquidità').map(v => v.nome))];
  const cur = g('fw', ed && ed.dove ? ed.dove : (suggest[0] || '__new'));
  const opts = [...new Set([...suggest, ...(ed && ed.dove ? [ed.dove] : [])])];
  const invCampi = isInv ? `<label class="lbl">Conto di riferimento</label><select id="fw" data-act="fcat">${opts.map(o => `<option value="${esc(o)}" ${cur === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}<option value="__new" ${cur === '__new' || !opts.includes(cur) ? 'selected' : ''}>＋ Nuovo conto…</option></select>
    ${cur === '__new' || !opts.includes(cur) ? `<input id="fwn" maxlength="60" placeholder="Nome del nuovo conto (verrà creato anche tra la liquidità)" value="${num('fwn', '')}">` : ''}
    <label class="lbl">Obiettivo in euro (facoltativo)</label><input id="fo" inputmode="decimal" value="${num('fo', ed && ed.obiettivo ? String(ed.obiettivo).replace('.', ',') : '')}">` : '';
  const campi = mod === 'piano'
    ? `<label class="lbl">Importo preso a prestito (€)</label><input id="fk" inputmode="decimal" value="${num('fk', ed && ed.piano ? String(ed.capitale).replace('.', ',') : '')}">
    <label class="lbl">Data di inizio</label><input id="fi" type="date" value="${num('fi', ed && ed.piano ? ed.inizio : '')}">
    <label class="lbl">Data di fine</label><input id="ff" type="date" value="${num('ff', ed && ed.piano ? ed.fine : '')}">
    <p class="note" style="margin-top:0">Il debito residuo scende da solo ogni mese della sola quota capitale (importo diviso per i mesi). Gli interessi sono un costo e non vengono considerati.</p>`
    : `<label class="lbl">${tipo === 'attivo' ? 'Saldo o valore in euro' : 'Valore in euro'}</label><input id="fv" inputmode="decimal" value="${num('fv', ed && !ed.piano ? String(ed.valore).replace('.', ',') : '')}">${invCampi}`;
  const selMod = tipo === 'passivo' ? `<label class="lbl">Come vuoi inserire il debito?</label><select id="fm" data-act="fmod"><option value="piano" ${mod === 'piano' ? 'selected' : ''}>Piano di rimborso (calcolo automatico)</option><option value="manuale" ${mod === 'manuale' ? 'selected' : ''}>Residuo inserito a mano</option></select>` : '';
  const fopen = !!ed || !!(S.exp && S.exp.form);
  const form = `<div class="card" id="formvoce"><div class="row cl cat" data-act="exp" data-v="form" style="border:0;padding:0"><div class="n">${ed ? 'Modifica voce' : 'Aggiungi al patrimonio'}</div><span class="chev ${fopen ? 'open' : ''}">▸︎</span></div>${fopen ? `
    <label class="lbl">Tipo</label><select id="ft" data-act="ftipo"><option value="attivo" ${tipo === 'attivo' ? 'selected' : ''}>Attivo (ciò che possiedi)</option><option value="passivo" ${tipo === 'passivo' ? 'selected' : ''}>Passivo (ciò che devi)</option></select>
    ${selAcc}
    <label class="lbl">Categoria</label><select id="fc" data-act="fcat">${CATS[tipo].map(c => `<option ${cat === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
    ${isInv ? `<label class="lbl">Asset class</label><select id="fac"><option value="">Scegli…</option>${ASSET.map(o => `<option ${g('fac', ed && ed.assetClass ? ed.assetClass : '') === o ? 'selected' : ''}>${o}</option>`).join('')}</select>` : ''}
    ${selMod}
    ${isInv ? '' : `<label class="lbl">Nome (es. Conto Fineco, Mutuo casa)</label><input id="fn" maxlength="60" value="${esc(g('fn', ed ? ed.nome : ''))}">`}
    ${campi}
    <div class="acts"><button class="b" data-act="save">${ed ? 'Salva modifica' : 'Aggiungi'}</button>${ed || S.tab === 'nv' ? '<button class="b s" data-act="cancel">Annulla</button>' : ''}</div>` : ''}</div>`;
  if (S.tab === 'nv') return form;
  return `${filtro}<div class="card"><div class="lbl">Patrimonio netto</div><div class="big ${cls(t.netto)}">${eur(t.netto)}</div></div>
    <div class="two"><div class="card at"><div class="lbl">Attivi</div><div class="big">${eur(t.attivi)}</div></div>
    <div class="card pa"><div class="lbl">Passivi</div><div class="big neg">${eur(t.passivi)}</div></div></div>
    <div class="card" style="padding-top:4px;padding-bottom:14px">${zeroToggle()}</div>
    <div class="card at"><h2>Attivi</h2>${listAttivi()}</div>
    <div class="card pa"><h2>Passivi</h2>${listPassivi()}</div>
    ${archSec}
    ${form}
    ${!isAdmin() ? '' : S.timp ? `<div class="card"><h2>Importa titoli</h2><div class="lbl" style="margin-bottom:6px">Anteprima: ${S.timp.righe.length} voci da creare o aggiornare${S.timp.acc ? '' : ' (account principale)'}</div>${S.timp.righe.map(x => `<div class="row"><div class="n">${esc(x.dove)} · ${esc(x.assetClass)}<small>${x.exId ? 'aggiorna da ' + eur(x.prima) : 'nuova voce'}</small></div><div class="v">${eur(x.valore)}</div></div>`).join('')}<div class="acts"><button class="b" data-act="timpok">Conferma</button><button class="b s" data-act="timpno">Annulla</button></div></div>` : `<div class="card"><h2>Importa titoli</h2><div class="lbl">Carica il CSV della scheda "Elenco titoli": crea o aggiorna una voce per ogni conto e asset class.</div><input id="titf" type="file" accept=".csv,.txt">${S.timpErr ? `<div class="msg">${esc(S.timpErr)}</div>` : ''}</div>`}
    <div class="card"><h2>Esporta</h2><button class="b" data-act="export">Scarica i dati (CSV per Excel)</button></div>`;
}

function drawer() {
  const D = S.data, fa = S.fAcc || 'all';
  const item = (k, n, sub, extra) => `<div class="it ${fa === k ? 'on' : ''}" data-act="facc" data-v="${esc(k)}"><span class="t">${esc(n)}${sub ? `<small class="lbl" style="display:block;font-weight:400">${sub}</small>` : ''}</span>${extra || ''}</div>`;
  const rows = D.accounts.map(a => item(a.id, a.nome, '', `<button class="ic" data-act="rena" data-v="${a.id}" aria-label="Rinomina">✎</button><button class="ic" data-act="dela" data-v="${a.id}" aria-label="Elimina account">✕</button>`)).join('');
  const add = (S.addAcc
    ? `<div style="margin-top:14px"><input id="an" maxlength="30" placeholder="Nome (es. Anna)"><div class="acts"><button class="b" data-act="adda">Aggiungi</button><button class="b s" data-act="addc">Annulla</button></div></div>`
    : `<div class="plus"><button class="b" data-act="addo" aria-label="Aggiungi account">+</button></div>`);
  const pend = isAdmin() ? S.users.filter(u => !u.approved).length : 0;
  const adm = isAdmin() ? `<hr style="border:0;border-top:1px solid #e2eceb;margin:18px 0 6px"><div class="it ${S.tab === 'adm' ? 'on' : ''}" data-act="admin"><span class="t">Amministrazione</span>${pend ? `<span class="ver" style="background:#fee2e2;color:#b91c1c;margin:0">${pend}</span>` : ''}</div>` : '';
  return `<div class="ov" data-act="menu"></div><div class="drawer"><h2>Account</h2>${item('all', 'Tutti gli account')}${item('main', D.nome, 'Principale')}${rows}<div class="msg">${esc(S.msg)}</div>${add}<hr style="border:0;border-top:1px solid #e2eceb;margin:18px 0 6px"><div class="it ${S.tab === 'info' ? 'on' : ''}" data-act="info"><span class="t">Info e novità</span></div><div class="it ${S.tab === 'terms' ? 'on' : ''}" data-act="terms"><span class="t">Termini e condizioni</span></div>${adm}</div>`;
}

function popup() {
  const D = S.data, p = S.pop, v = D.voci.find(x => x.id === p.id) || (D.arch || []).find(x => x.id === p.id), isA = !!v && !D.voci.includes(v);
  if (!v) return '';
  const pi = v.piano ? piano(v) : null;
  const ob = v.obiettivo ? `<div class="lbl" style="margin:-6px 0 6px">Obiettivo ${eur(v.obiettivo)} · raggiunto ${Math.round(v.valore / v.obiettivo * 100)}%</div><div style="height:8px;background:#e2eceb;border-radius:6px;margin-bottom:12px"><div style="height:100%;width:${Math.min(100, v.valore / v.obiettivo * 100)}%;background:#0f766e;border-radius:6px"></div></div>` : '';
  let body;
  if (p.mode === 'upd') body = `<label class="lbl">${v.tipo === 'attivo' ? 'Nuovo saldo o valore in euro' : 'Nuovo valore in euro'}</label><input id="pv" inputmode="decimal" value="${String(v.valore).replace('.', ',')}"><div class="acts"><button class="b" data-act="updsave">Salva</button><button class="b s" data-act="popback">Indietro</button></div>`;
  else if (p.mode === 'del') body = `<p style="margin-top:0">Vuoi davvero eliminare <b>${esc(dn(v))}</b>?</p><div class="acts"><button class="b r" data-act="delok">Sì, elimina</button><button class="b s" data-act="popback">Annulla</button></div>`;
  else if (p.mode === 'arch') body = `<p style="margin-top:0"><b>${esc(dn(v))}</b> vale ancora <b>${eur(v.valore)}</b>: archiviandolo, questa cifra esce dai totali. Procedere?</p><div class="acts"><button class="b" data-act="poparchok">Sì, archivia</button><button class="b s" data-act="popback">Annulla</button></div>`;
  else if (isA) body = `<div class="acts" style="flex-direction:column"><button class="b" data-act="popres">Ripristina</button><button class="b r" data-act="popdel">Elimina</button><button class="b s" data-act="popclose">Chiudi</button></div>`;
  else body = `<div class="acts" style="flex-direction:column">${v.piano ? '' : '<button class="b" data-act="popupd">Aggiorna</button>'}<button class="b s" data-act="popedit">Modifica</button><button class="b s" data-act="poparch">Archivia</button><button class="b r" data-act="popdel">Elimina</button><button class="b s" data-act="popclose">Chiudi</button></div>`;
  return `<div class="ov" data-act="popclose"></div><div class="pop"><h2 style="margin-bottom:2px">${esc(dn(v))}</h2><div class="lbl" style="margin-bottom:12px">${esc(v.categoria)}${v.dove && v.dove !== dn(v) ? ' · su ' + esc(v.dove) : ''} · ${esc(accName(v))} · ${eur(v.valore)}${isA ? ' · archiviato' : ''}</div>${pi ? `<div class="lbl" style="margin:-6px 0 12px">Prestito di ${eur(v.capitale)} · rata capitale ${eur(pi.rata)}/mese · pagate ${pi.k} su ${pi.N} · fine ${fmtD(v.fine)}${pi.partito ? '' : ' · non ancora iniziato'}</div>` : ''}${ob}<div class="msg">${esc(S.msg)}</div>${body}</div>`;
}

const eur0 = v => hideAmt() ? '••••' : new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, useGrouping: 'always' }).format(v || 0);
const trunc = (s, n) => s.length > n ? s.slice(0, n - 1) + '…' : s;

function pageDis() {
  const D = S.data;
  if (!D.voci.length) return '<div class="card">Nessuna voce da mostrare. Inseriscile nella pagina Patrimonio.</div>';
  if (!S.tx) S.tx = new Set(['r']);
  const pr = disParts(), html = `<div class="dgrid">${pr.tree}${pr.pie}</div>`;
  S.anim = false; S.tanim = false;
  return html;
}
function disParts(Dz0, single) {
  const D = S.data; if (!S.tx) S.tx = new Set(['r']);
  const Dz = Dz0 || { ...D, voci: vz(D.voci) }, wide = innerWidth >= 1000, root = alberoDati(Dz, single ? 'agg' : S.tview || 'agg');
  const found = (S.pp || ['r']).slice().reverse().map(id => alberoTrova(root, id)).find(Boolean) || alberoTrova(root, 'r');
  S.pp = found.path.map(n => n.id);
  /* l'albero è sempre tutto aperto */
  const op = new Set(['r']); const wk = n => { if (n.kids.length) { op.add(n.id); n.kids.forEach(wk); } }; wk(root); S.tx = op;
  /* computer: quattro torte piccole; telefono: torta unica come prima */
  return { tree: treeCard(root, '', single), pie: wide ? quadCard(Dz, single) : pieCard(found) };
}
/* Panoramica: solo su schermi larghi (computer) */
/* Riquadro grafici della Panoramica: un selettore sceglie quale grafico vedere */
const HUB = { main: 'Andamento', bar: 'Variazione mensile', cmp1: 'Confronto variazioni', cmp2: 'Confronto crescita' };
function hubBody(key, all, r1) {
  const hist = all.length >= 2, W = Math.max(380, Math.round((innerWidth - 200 - 56 - 14) * 7 / 12 - 40)), H = Math.max(130, r1 - 150 - 42);
  const no = t => `<div class="card"><h2>${t}</h2><p class="note">Il grafico comparirà quando ci saranno almeno 2 mesi di dati.</p></div>`;
  if (key === 'main') return panMain(all, r1 - 42);
  if (key === 'bar') {
    if (!hist) return no('Variazione mensile del patrimonio netto');
    const A = new Set(all.map(s => s.mese.slice(0, 4))).size >= 2 ? (S.agg || 'm') : 'm';
    return lcCard('bar', A === 'yf' ? 'Variazione annuale del patrimonio netto' : A === 'ya' ? 'Variazione mensile media del patrimonio netto, per anno' : 'Variazione mensile del patrimonio netto', aggSeries(all, A).dBar, [{ k: 'v', c: '#15803d', l: A === 'yf' ? 'Variazione annuale' : A === 'ya' ? 'Variazione mensile media' : 'Variazione mensile', bar: 1 }], W, H);
  }
  if (!hist) return no('Confronto tra periodi');
  const c = cmpParts(all, true); return key === 'cmp1' ? c.a : c.b || c.a;
}
function pagePan() {
  const D = S.data, all = D.storico;
  if (!D.voci.length) return panTop('Aggregato') + '<div class="card">Nessuna voce da mostrare. Aggiungile con il tasto Nuova voce.</div>';
  let fa = S.fAcc || 'all'; if (fa !== 'all' && fa !== 'main' && !D.accounts.some(a => a.id === fa)) fa = S.fAcc = 'all';
  const single = fa !== 'all', vis = vz(D.voci).filter(v => !single || accKey(v) === fa), Dz = { ...D, voci: vis };
  const aname = !single ? 'Aggregato' : fa === 'main' ? D.nome : D.accounts.find(a => a.id === fa).nome;
  const t = totals(vis), cur = all[all.length - 1], prev = all.length > 1 ? all[all.length - 2] : null, dN = !single && cur && prev ? cur.netto - prev.netto : null;
  const kp = (l, v, sub, c, extra) => `<div class="card"><div class="lbl">${l}</div><div class="big ${c || ''}">${v}${extra || ''}</div><div class="lbl">${sub}</div></div>`;
  const eye = `<button class="eye" data-act="hide" aria-label="${hideAmt() ? 'Mostra importi' : 'Nascondi importi'}" title="${hideAmt() ? 'Mostra importi' : 'Nascondi importi'}"><svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>${hideAmt() ? '' : '<path d="M3 3l18 18"/>'}</svg></button>`;
  const dsub = dN !== null ? `<span class="dsub"><span class="${dN > 0 ? 'pos' : dN < 0 ? 'neg' : ''}">${dN >= 0 ? '+' : ''}${eur(dN)}</span> su ${esc(monthName(prev.mese))}</span>` : '&nbsp;';
  const ind = t.attivi > 0 ? t.passivi / t.attivi : null;
  const hh = (document.querySelector('header') || {}).offsetHeight || 56, avail = innerHeight - hh - 58 - 80 - 28, r1 = Math.max(single ? 300 : 290, Math.round(avail * 0.5));
  const keys = ['main', 'bar', 'cmp1', 'cmp2'], hv = keys.includes(S.chv) ? S.chv : 'main';
  const pr = disParts(Dz, single), body = single ? '' : hubBody(hv, all, r1);
  S.anim = false; S.tanim = false;
  const selc = `<div class="chsel">${keys.map(k => `<button class="b ${k === hv ? '' : 's'} sm" data-act="chv" data-v="${k}">${HUB[k]}</button>`).join('')}${hv.startsWith('cmp') ? `<span class="chcmp">${cmpSel()}</span>` : ''}</div>`;
  const row2 = single ? `<div class="g12 r2"><div class="s12">${pr.tree}</div></div>` : `<div class="g12 r2"><div class="s9">${pr.tree}</div><div class="s3">${all.length ? indicatori(D, all) : ''}</div></div>`;
  return `<div class="pan" style="--r1:${r1}px">${panTop(aname)}<div class="kpis">${kp('Patrimonio netto', eur(t.netto), dsub, cls(t.netto), eye)}${kp('Attivi', eur(t.attivi), '&nbsp;', 'pos')}${kp('Passivi', eur(t.passivi), '&nbsp;', t.passivi ? 'neg' : '')}${kp('Indebitamento', ind === null ? '–' : (ind * 100).toFixed(1).replace('.', ',') + '%', 'passivi su attivi', '')}</div>
    ${single ? `<div class="g12 r1"><div class="s12">${pr.pie}</div></div>` : `<div class="g12 r1"><div class="s7"><div class="hubc">${selc}${body}</div></div><div class="s5">${pr.pie}</div></div>`}${row2}</div>`;
}
const panTop = name => `<div class="ptop"><h2>Panoramica · ${esc(name)}</h2><div class="pbtn"><button class="b sm" data-act="nv">Nuova voce</button></div></div>`;

const compact = v => hideAmt() ? '•••' : new Intl.NumberFormat('it-IT', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
const shortM = k => { const [y, m] = k.split('-'); return MESI[+m - 1].slice(0, 3) + ' ' + y.slice(2); };

