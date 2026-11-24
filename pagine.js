'use strict';
/* ---------- Schermate ---------- */
const ORD = ['pat', 'dis', 'por', 'rep'];
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
  const IC = { pan: '<path d="M3 12l9-8 9 8"/><path d="M5 10v10h14V10"/>', pat: '<path d="M3 10h18M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18M12 3l9 5H3z"/>', dis: '<path d="M12 3v9h9"/><path d="M20.5 15A9 9 0 1 1 9 3.5"/>', and: '<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>', rep: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/>', por: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>' , ben: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>', pas: '<path d="M3 5l5 6 4-4 6 8"/><path d="M12.5 15H18V9.5"/>'};
  const wide = innerWidth >= 1000;
  if (!wide && S.tab === 'pan') S.tab = 'pat';
  if (!wide && S.tab === 'nv') S.tab = 'pat';
  if (S.tab === 'alb') S.tab = 'pan';
  if (!wide && (S.tab === 'alb' || S.tab === 'con' || S.tab === 'and')) S.tab = 'pat';
  if (wide && (!S.panSeen && S.tab === 'pat' || ['pat', 'dis', 'and'].includes(S.tab))) S.tab = 'pan';
  S.panSeen = true;
  const tabs = [...(wide ? [['pan', 'Panoramica']] : []), ['pat', 'Patrimonio'], ['dis', wide ? 'Distribuzione' : 'Saldi'], ...(wide ? [['and', 'Andamento']] : [['por', 'Portafogli'], ['ben', 'Beni'], ['pas', 'Passivi']]), ['rep', 'Report']];
  const pend = isAdmin() ? S.users.filter(u => !u.approved).length : 0;
  if (S.tab === 'adm' && !isAdmin()) S.tab = 'pat';
  let body = '';
  if (S.tab === 'pan') body = pagePan(); else if (S.tab === 'pat' || S.tab === 'nv') body = pagePat(); else if (S.tab === 'alb') body = pageAlb(); else if (S.tab === 'con') body = pageSaldi(); else if (S.tab === 'por') body = portSub() + (S.psub === 'bil' ? pageBilanc() : pagePortMob()); else if (S.tab === 'ben') body = pageBeni(); else if (S.tab === 'pas') body = pagePassivi(); else if (S.tab === 'dis') body = wide ? pageDis() : pageSaldi(); else if (S.tab === 'and') body = pageAnd(); else if (S.tab === 'bil') { S.tab = 'por'; S.psub = 'bil'; body = portSub() + pageBilanc(); } else if (S.tab === 'rep') body = pageRep(); else if (S.tab === 'imp') body = pageImp(); else if (S.tab === 'cnd') body = pageCnd(); else if (S.tab === 'terms') body = pageTerms(); else if (S.tab === 'info') body = pageInfo(); else body = pageAdm();
  el.innerHTML = `<header><div class="hw"><button class="ham" data-act="menu" aria-label="Menu">☰${pend ? '<i class="dot"></i>' : ''}</button><h1>P.Finance <span class="ver">v${VER} beta</span></h1><span class="un">${esc(S.profile.nome)}</span>
    ${wide ? '' : `<button class="b s sm" data-act="hide">${hideAmt() ? 'Mostra importi' : 'Nascondi importi'}</button>`}<button class="b s sm" data-act="share">Condividi</button><button class="b s sm" data-act="logout">Esci</button></div>
    </header>
    <main>
    ${S.demo ? `<div class="msg ok" style="display:flex;gap:8px;align-items:center;justify-content:space-between"><span>Modalità demo: dati inventati, nulla viene salvato.</span><button class="b s sm" data-act="demoexit">Esci dalla demo</button></div>` : ''}${S.ro ? `<div class="msg ok" style="display:flex;gap:8px;align-items:center;justify-content:space-between"><span>Stai guardando i dati di ${esc(S.ro.nome)} in sola visualizzazione.</span><button class="b s sm" data-act="tornaMio">Torna ai miei</button></div>` : ''}<div class="msg ${/salvato\.$|salvati\.$|registrate\.$|aggiunto\.$|aggiornato\.$|aggiornati\.$|importato\.$|^(Link|Codice) copiato/.test(S.msg) ? 'ok' : ''}">${esc(S.msg)}</div>${body}</main>${S.menu ? drawer() : ''}${S.pop ? popup() : ''}${S.popm ? popupM() : ''}${S.fs ? fsOverlay() : ''}${S.toast ? `<div class="toast"><span>${esc(S.toast)}</span><button class="b sm" data-act="undo">Annulla</button></div>` : ''}${arrows()}${wide ? navWide(IC, pend, D) : `<nav><div class="nv">${tabs.map(([k, l]) => `<button data-act="tab" data-v="${k}" class="${S.tab === k ? 'on' : ''}" aria-label="${l}"><svg viewBox="0 0 24 24">${IC[k]}</svg>${l}</button>`).join('')}</div></nav>`}`;
  const hd = document.querySelector('header'); if (hd) document.documentElement.style.setProperty('--hh', hd.offsetHeight + 'px');
  navSync();
}

/* Barra laterale (solo computer): Panoramica, Account (Aggregato e singoli), Report, poi info, termini, amministrazione */
function navWide(IC, pend, D) {
  const fa = S.fAcc || 'all', pan = S.tab === 'pan', pa = pan || S.tab === 'alb' || S.tab === 'con' || S.tab === 'por' || S.tab === 'ben' || S.tab === 'pas', open = S.accOpen || (pa && fa !== 'all');
  const sv = d => `<svg viewBox="0 0 24 24">${d}</svg>`;
  const ICX = { acc: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.5 2.8-6 6-6s6 2.5 6 6"/><path d="M16 5a3 3 0 0 1 0 6M18 14c2 .7 3 2.5 3 5"/>', inf: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>', ter: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h7"/>', adm: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>', con: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="7" cy="6" r=".6"/><circle cx="7" cy="12" r=".6"/><circle cx="7" cy="18" r=".6"/>', alb: '<circle cx="5" cy="12" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 12h4c3 0 4-6 6-6M11 12c3 0 4 6 6 6"/>' };
  const row = (k, n, ed) => `<div class="nr"><button data-act="accsel" data-v="${esc(k)}" class="${pa && fa === k ? 'on' : ''}">${esc(n)}${k !== 'all' && isEsc(k) ? ' <small>(fuori)</small>' : ''}</button>${ed ? `<span class="nic" data-act="rena" data-v="${k}" title="Rinomina">✎</span><span class="nic" data-act="dela" data-v="${k}" title="Elimina">✕</span>` : ''}</div>`;
  const add = S.addAcc ? `<div class="nadd"><input id="an" maxlength="30" placeholder="Nome (es. Anna)"><div class="acts"><button class="b sm" data-act="adda">Aggiungi</button><button class="b s sm" data-act="addc">Annulla</button></div></div>` : `<button class="nplus" data-act="addo">＋ Aggiungi account</button>`;
  const sub = open ? `<div class="nsub">${row('all', 'Aggregato')}${row('main', D.nome)}${D.accounts.map(a => row(a.id, a.nome, true)).join('')}${add}</div>` : '';
  const it = (act, v, ic, l, on, extra) => `<button data-act="${act}"${v ? ` data-v="${v}"` : ''} class="${on ? 'on' : ''}">${sv(ic)}${l}${extra || ''}</button>`;
  return `<nav><div class="nv">${it('pano', 'all', IC.pan, 'Panoramica', pan && fa === 'all')}${it('tab', 'con', ICX.con, 'Saldi', S.tab === 'con')}${it('tab', 'por', '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>', 'Portafogli', S.tab === 'por')}${it('tab', 'ben', IC.ben, 'Beni', S.tab === 'ben')}${it('tab', 'pas', IC.pas, 'Passivi', S.tab === 'pas')}${it('tab', 'rep', IC.rep, 'Report', S.tab === 'rep')}<hr>${S.demo ? '' : `${it('imp', '', '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>', 'Importazioni', S.tab === 'imp')}${it('cnd', '', '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.3 11l7.4-4M8.3 13l7.4 4"/>', 'Condivisione', S.tab === 'cnd')}`}${it('info', '', ICX.inf, 'Info e novità', S.tab === 'info')}${it('terms', '', ICX.ter, 'Termini e condizioni', S.tab === 'terms')}${isAdmin() ? it('admin', '', ICX.adm, 'Amministrazione', S.tab === 'adm', pend ? `<span class="ver" style="background:#fee2e2;color:#b91c1c;margin:0 0 0 auto">${pend}</span>` : '') : ''}</div></nav>`;
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

window.addEventListener('pf-inst', () => { if (document.querySelector('.auth')) render(); });
function renderAuth(el) {
  const inst = (matchMedia('(display-mode: standalone)').matches || navigator.standalone) ? '' : (() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
    const tip = !S.instTip || window.PF_INST ? '' : `<p class="note" style="margin:0 0 10px">${ios ? 'Su iPhone e iPad apri questa pagina con Safari, tocca il tasto Condividi (il quadrato con la freccia) e scegli “Aggiungi alla schermata Home”.' : 'Apri il menu del browser (i tre puntini) e scegli “Installa app” oppure “Aggiungi a schermata Home”.'}</p>`;
    return `<button class="b" style="width:100%;margin-bottom:${tip ? 6 : 12}px" data-act="install">Installa l'app sul telefono</button>${tip}`;
  })();
  el.innerHTML = `<div class="auth card"><h2>P.Finance <span class="ver">v${VER} beta</span></h2>
    ${inst}<button class="b" style="width:100%" data-act="google">Accedi con Google</button>
    <p class="note">Al primo accesso l'amministratore dovrà approvarti.</p>
    <button class="b s" style="width:100%;margin-top:10px" data-act="demo">Prova la demo</button><p class="note">La demo usa dati inventati e non salva niente.</p>
    <div class="msg" id="am">${esc(S.msg)}</div></div>`;
}

const accKey = v => v.account || 'main';
const accName = v => { const D = S.data; if (!v.account) return D.nome; const a = D.accounts.find(x => x.id === v.account); return a ? a.nome : '(account eliminato)'; };

function pagePat() {
  if (innerWidth < 1000) return pageMob();
  const D = S.data, fa = S.fAcc || 'all', ed = S.edit && D.voci.find(v => v.id === S.edit);
  const vis = vz(D.voci).filter(v => inSc(v, fa)), t = totals(vis);
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
    <label class="lbl">Categoria</label><select id="fc" data-act="fcat">${CATS[tipo].filter(c => !(innerWidth >= 1000 && c === 'Investimenti' && !(ed && ed.categoria === 'Investimenti'))).map(c => `<option ${cat === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
    ${isInv && !(ed && isPort(ed)) ? `<label class="lbl">Asset class</label><select id="fac"><option value="">Scegli…</option>${ASSET.map(o => `<option ${g('fac', ed && ed.assetClass ? ed.assetClass : '') === o ? 'selected' : ''}>${o}</option>`).join('')}</select>` : ''}
    ${selMod}
    ${isInv ? '' : `<label class="lbl">Nome (es. Conto Fineco, Mutuo casa)</label><input id="fn" maxlength="60" value="${esc(g('fn', ed ? ed.nome : ''))}">`}
    ${campi}
    <div class="acts"><button class="b" data-act="save">${ed ? 'Salva modifica' : 'Aggiungi'}</button>${ed || S.tab === 'nv' ? '<button class="b s" data-act="cancel">Annulla</button>' : ''}</div>` : ''}</div>`;
  if (S.tab === 'nv') return form;
  return `${filtro}<div class="card"><div class="lbl bd">Patrimonio netto</div><div class="big ${cls(t.netto)}">${eur(t.netto)}${rfsBtn()}</div></div>${accChips()}
    <div class="card" style="padding-top:4px;padding-bottom:14px">${zeroToggle()}</div>
    <div class="card at"><h2>Attivi</h2>${listAttivi()}</div>
    <div class="card pa"><h2>Passivi</h2>${listPassivi()}</div>
    ${archSec}
    ${form}
    <div class="card"><h2>Esporta</h2><button class="b" data-act="export">Scarica i dati (CSV per Excel)</button></div>`;
}

function importCard() {
  if (!isAdmin()) return '';
  if (S.timp) return `<div class="card"><h2>Importa titoli</h2><div class="lbl" style="margin-bottom:6px">Anteprima: ${S.timp.righe.length} portafogli da creare o aggiornare${S.timp.acc ? '' : ' (account principale)'}</div>${S.timp.righe.map(x => `<div class="row"><div class="n">${esc(x.dove)}<small>${x.exId ? 'sostituisce ' + x.nPrima + ' prodotti (valore ' + eur(x.prima) + ')' : 'nuovo portafoglio'} · ${x.prodotti.length} prodotti</small></div><div class="v">${eur(x.valore)}</div></div>`).join('')}<div class="acts"><button class="b" data-act="timpok">Conferma</button><button class="b s" data-act="timpno">Annulla</button></div></div>`;
  return `<div class="card"><h2>Importa titoli</h2><div class="lbl">Carica il CSV della scheda "Elenco titoli": crea o aggiorna un portafoglio per ogni conto, con un prodotto per riga (ISIN, quote, classe).</div><input id="titf" type="file" accept=".csv,.txt">${S.timpErr ? `<div class="msg">${esc(S.timpErr)}</div>` : ''}</div>`;
}

/* ---------- Importazioni (storico e portafoglio da file CSV) ---------- */
function pageImp() {
  const D = S.data, I = S.imp, CSVACC = '.csv,.txt,text/csv,text/plain,application/csv,application/vnd.ms-excel';
  const accs = [['main', D.nome], ...D.accounts.map(a => [a.id, a.nome])];
  /* storico */
  const selS = `<label class="lbl">Importa lo storico per</label><select id="impsa"><option value="all" ${(S.impAccS || 'all') === 'all' ? 'selected' : ''}>Aggregato (totale degli account inclusi)</option>${accs.map(([k, n]) => `<option value="${esc(k)}" ${S.impAccS === k ? 'selected' : ''}>${esc(n)}${isEsc(k) ? ' (fuori dall\'aggregato)' : ''}</option>`).join('')}</select>`;
  let st = selS + `<div class="lbl">Carica il file CSV dello storico: servono le colonne Data (es. dic 23), Liquidità, Investimenti, Beni e Passivi. Le righe vuote in cima non danno problemi.</div><input id="imps" type="file" accept="${CSVACC}">`;
  if (I && I.kind === 'sto') st = `<div class="lbl" style="margin-bottom:6px">Anteprima: ${I.mesi.length} mesi da ${meseIt(I.mesi[0].mese)} a ${meseIt(I.mesi[I.mesi.length - 1].mese)}</div>
    ${I.acc ? `<div class="lbl" style="margin-bottom:6px">Solo per l'account scelto: il totale aggregato non cambia.</div>` : ''}<div class="row"><div class="n">Nuovi mesi</div><div class="v">${I.nuovi}</div></div><div class="row"><div class="n">Mesi già inseriti a mano (verranno aggiornati)</div><div class="v">${I.agg}</div></div>${I.skip ? `<div class="row"><div class="n">Saltati<small>mese in corso o già registrato dall'app</small></div><div class="v">${I.skip}</div></div>` : ''}
    <div class="acts"><button class="b" data-act="impsok">Conferma</button><button class="b s" data-act="impno">Annulla</button></div>`;
  /* portafoglio */
  let po;
  if (I && I.kind === 'port') {
    const ex = I.exN != null ? `<small>${I.exN ? 'esiste già: sostituisce ' + I.exN + ' prodotti' : 'nuovo portafoglio'}</small>` : '';
    po = `<div class="lbl" style="margin-bottom:6px">Anteprima: ${I.righe.length} prodotti${I.bad ? ` (righe non valide saltate: ${I.bad})` : ''}. Controlla la classe di ogni prodotto. Se esiste un investimento inserito a solo valore con lo stesso nome del conto, viene sostituito dal portafoglio.</div>
      <label class="lbl">Nome del conto (es. Directa)</label><input id="impn" maxlength="40" value="${esc(S.impNome || '')}" placeholder="Nome del conto">
      ${accs.length > 1 ? `<label class="lbl">Account</label><select id="impa">${accs.map(([k, n]) => `<option value="${esc(k)}" ${(S.impAcc || 'main') === k ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>` : ''}
      ${I.righe.map((r, i) => `<div class="row"><div class="n">${esc(r.ticker || r.isin)}<small>${esc(r.isin)} · ${nfm(r.quote)} quote${r.pmc > 0 ? ' · carico ' + nfm(r.pmc) : ''}</small></div><select data-act="impcl" data-v="${i}" style="width:auto;margin:0">${ASSET.map(o => `<option ${r.classe === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>`).join('')}
      <div class="acts"><button class="b" data-act="impPok">Conferma</button><button class="b s" data-act="impno">Annulla</button></div>`;
  } else po = `<div class="lbl">Carica il file CSV del portafoglio: servono le colonne ISIN, TICKER, QUOTE e PMC (prezzo medio di carico). Se il conto esiste già, i suoi prodotti vengono sostituiti.</div><label class="lbl">Nome del conto (es. Directa)</label><input id="impn" maxlength="40" value="${esc(S.impNome || '')}" placeholder="Nome del conto">${accs.length > 1 ? `<label class="lbl">Account</label><select id="impa">${accs.map(([k, n]) => `<option value="${esc(k)}" ${(S.impAcc || 'main') === k ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>` : ''}<input id="impp" type="file" accept="${CSVACC}">`;
  return `<div class="card"><h2>Importa lo storico</h2>${I && I.kind === 'port' ? '<div class="lbl">Prima concludi o annulla l\'importazione del portafoglio.</div>' : st}${S.impErr && S.impErr[0] === 'sto' ? `<div class="msg">${esc(S.impErr[1])}</div>` : ''}</div>
    <div class="card"><h2>Importa il portafoglio</h2>${I && I.kind === 'sto' ? '<div class="lbl">Prima concludi o annulla l\'importazione dello storico.</div>' : po}${S.impErr && S.impErr[0] === 'port' ? `<div class="msg">${esc(S.impErr[1])}</div>` : ''}</div>`;
}

/* ---------- Condivisione (sola visualizzazione dei propri dati con altre persone) ---------- */
const lsJ = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
function pageCnd() {
  const mio = S.user.uid, vw = (S.profile && S.profile.viewers) || [], lbl = lsJ('pf_lbl', {}), visti = lsJ('pf_visti', []);
  const nm = u => esc(lbl[u] || 'Persona ' + u.slice(0, 4));
  return `<div class="card"><h2>Il tuo codice</h2><div class="lbl">Mandalo a chi vuole darti la visualizzazione dei suoi dati, o usalo tu per dare la tua.</div><input readonly value="${esc(mio)}" onclick="this.select()"><div class="acts"><button class="b" data-act="cndcopy">Copia il codice</button></div></div>
    <div class="card"><h2>Chi può vedere i tuoi dati</h2><div class="lbl">Solo visualizzazione: non può modificare niente. Puoi toglierla quando vuoi.</div>
      ${vw.length ? vw.map(u => `<div class="row"><div class="n">${nm(u)}<small>${esc(u.slice(0, 6))}…</small></div><button class="b s sm" data-act="cnddel" data-v="${esc(u)}">Togli</button></div>`).join('') : '<div class="lbl" style="margin:8px 0">Nessuno, per ora.</div>'}
      <label class="lbl">Codice della persona (la persona deve già aver fatto l'accesso ed essere approvata)</label><input id="cndu" placeholder="Incolla il codice"><label class="lbl">Nome per ricordarti chi è</label><input id="cndn" maxlength="30" placeholder="Es. Anna"><div class="acts"><button class="b" data-act="cndadd">Dai la visualizzazione</button></div></div>
    <div class="card"><h2>Dati condivisi con te</h2>
      ${visti.length ? visti.map(x => `<div class="row"><div class="n">${esc(x.nome)}</div><button class="b sm" data-act="cndvedi" data-v="${esc(x.uid)}">Guarda</button><button class="b s sm" data-act="cndrim" data-v="${esc(x.uid)}" aria-label="Rimuovi">✕</button></div>`).join('') : '<div class="lbl" style="margin:8px 0">Nessuno, per ora.</div>'}
      <label class="lbl">Codice di chi ti ha dato l'accesso</label><input id="cndv" placeholder="Incolla il codice"><label class="lbl">Nome per ricordarti chi è</label><input id="cndw" maxlength="30" placeholder="Es. Mario"><div class="acts"><button class="b s" data-act="cndaddv">Aggiungi</button></div></div>`;
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
  return `<div class="ov" data-act="menu"></div><div class="drawer">${S.demo ? '' : `<div class="it ${S.tab === 'imp' ? 'on' : ''}" data-act="imp"><span class="t">Importazioni</span></div><div class="it ${S.tab === 'cnd' ? 'on' : ''}" data-act="cnd"><span class="t">Condivisione</span></div>`}<div class="it ${S.tab === 'info' ? 'on' : ''}" data-act="info"><span class="t">Info e novità</span></div><div class="it ${S.tab === 'terms' ? 'on' : ''}" data-act="terms"><span class="t">Termini e condizioni</span></div>${adm}</div>`;
}

/* Simbolo di aggiornamento e pulsanti account (Aggregato, account, +) accanto al patrimonio netto */
const updTxt = () => { const q = S.prezzi && S.prezzi.quando ? S.prezzi.quando : T0, d = new Date(q); return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }); };
const rfsBtn = () => `<button class="eye${S.prezziBusy ? ' spin' : ''}" data-act="rfs" aria-label="Aggiorna" title="Aggiorna prezzi e dati"><svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.5-5.8"/><path d="M20 4v4.5h-4.5"/></svg></button><span class="upd" title="${esc(prezziStato())}">${S.prezziBusy ? 'Aggiorno…' : updTxt()}</span>`;
function accChips() {
  const D = S.data, fa = S.fAcc || 'all', wide = innerWidth >= 1000, ac = wide ? 'accsel' : 'facc', V = vz(D.voci);
  const net = k => totals(V.filter(v => inSc(v, k))).netto;
  const box = (k, n, ed) => `<div class="acard${fa === k ? ' on' : ''}" data-act="${ac}" data-v="${esc(k)}"${k !== 'all' ? ` style="--at:${accTint(k)}"` : ''}><div class="lbl bd">${esc(n)}</div><div class="av ${cls(net(k))}">${eur(net(k))}</div>${k !== 'all' && isEsc(k) ? '<div class="lbl exc">fuori dall\'aggregato</div>' : ''}${k !== 'all' && fa === k && !S.ro ? `<button class="b s sm exb" data-act="escl" data-v="${esc(k)}">${isEsc(k) ? 'Includi nell\'aggregato' : 'Escludi dall\'aggregato'}</button>` : ''}${ed && fa === k ? `<span class="chpe"><button class="ic" data-act="rena" data-v="${k}" aria-label="Rinomina">✎</button><button class="ic" data-act="dela" data-v="${k}" aria-label="Elimina account">✕</button></span>` : ''}</div>`;
  const add = S.addAcc ? `<div class="acard add"><input id="an" maxlength="30" placeholder="Nome (es. Anna)"><div class="acts"><button class="b sm" data-act="adda">Aggiungi</button><button class="b s sm" data-act="addc">Annulla</button></div></div>` : `<div class="acard plus" data-act="addo" role="button" aria-label="Aggiungi account" title="Aggiungi account">+</div>`;
  const back = fa !== 'all' ? `<div class="acard back" data-act="${ac}" data-v="all" role="button">← Aggregato</div>` : '';
  return `<div class="accs">${back}${box('main', D.nome)}${D.accounts.map(a => box(a.id, a.nome, true)).join('')}${add}</div>`;
}
/* ---------- Telefono (sola consultazione) ---------- */
/* Patrimonio: patrimonio netto + gli stessi riquadri della Panoramica del computer */
function pageMob() { return conStoricoAcc(pageMob0); }
function pageMob0() {
  const D = S.data, all = D.storico;
  let fa = S.fAcc || 'all'; if (fa !== 'all' && fa !== 'main' && !D.accounts.some(a => a.id === fa)) fa = S.fAcc = 'all';
  const single = fa !== 'all', vis = vz(D.voci).filter(v => inSc(v, fa)), Dz = { ...D, voci: vis };
  const t = totals(vis), cur = all[all.length - 1], prev = all.length > 1 ? all[all.length - 2] : null, dN = cur && prev ? cur.netto - prev.netto : null;
  const pn = perNetto(t), dsub = pn ? `<div class="lbl dsub">${pn}</div>` : '';
  const head = `<div class="card"><div class="lbl bd">Patrimonio netto</div><div class="big ${cls(t.netto)}">${eur(t.netto)}${rfsBtn()}</div>${dsub}</div>${accChips()}`;
  if (!D.voci.length) return head + '<div class="card">Nessuna voce da mostrare. Le voci si aggiungono dalla versione per computer.</div>';
  const keys = ['main', 'bar', 'pas', 'cmp2'], hv = keys.includes(S.hq) ? S.hq : null, r1 = 380;
  const allF = perFiltraA(all);
  if (S.aggK) for (const k in S.aggK) if (S.aggK[k] === 'ya') S.aggK[k] = 'yf';
  const c = { all, allF, hv, r1, t, vis, Dz, single, cur, prev };
  const lst = homeList().filter(k => !HOME_BLK[k].pc), hasPer = !!all.length;
  const body = lst.map(k => homeBlk(k, c)).join('');
  S.hanim = false; S.panim = false; S.tcan = false;
  return `<div class="mob">${head}${S.ro ? '' : `<div class="hmbar">${homeBtn()}</div>`}${homeBar()}${hasPer ? perBar() : ''}${body || (S.hedit ? '' : '<div class="card">Nessun riquadro nella home. Usa "Modifica home" per aggiungerne.</div>')}</div>`;
}
/* Saldi: i conti di liquidità di ogni account */
function pageSaldi() {
  const D = S.data, wide = innerWidth >= 1000;
  let fa = S.fAcc || 'all'; if (fa !== 'all' && fa !== 'main' && !D.accounts.some(a => a.id === fa)) fa = S.fAcc = 'all';
  const single = fa !== 'all', aname = !single ? '' : fa === 'main' ? D.nome : D.accounts.find(a => a.id === fa).nome;
  const fm = !!S.cfm, liq = D.voci.filter(v => v.tipo === 'attivo' && v.categoria === 'Liquidità' && inSc(v, fa));
  const tot = a => a.reduce((s, v) => s + v.valore, 0);
  const secs = accList(D).filter(([k]) => inScK(k, fa)).map(([k, n]) => {
    const mine = liq.filter(v => accKey(v) === k).sort((a, b) => dn(a).localeCompare(dn(b)));
    if (!mine.length) return '';
    const html = `<div class="card acc" style="--at:${accTint(k)}"><div class="ptop2"><h2>${esc(n)}</h2><span class="lbl bd">${eur(tot(mine))}</span></div>${mine.map(v => `<div class="pblk"><div class="phd"><b class="grow">${esc(dn(v))}</b>${fm && !v.piano && !hasProd(v) ? `<input class="cvi" id="cv_${v.id}" inputmode="decimal" value="${String(v.valore).replace('.', ',')}" data-id="${v.id}" style="margin:0;max-width:150px;text-align:right">` : `<span class="lbl">${eur(v.valore)}</span>`}${fm ? `<button class="b s sm r" type="button" data-act="cdel" data-v="${v.id}" aria-label="Elimina conto">✕</button>` : `<button class="b s sm" data-act="tleaf" data-v="${v.id}">Modifica</button>`}</div></div>`).join('')}</div>`;
    return wide ? `<div class="prow"><div>${html}</div>${portPieCard('sp_' + k, n, contiRoot(mine), 'per conto')}</div>` : html;
  }).join('');
  const bar = fm ? `<div class="acts" style="margin-top:10px"><button class="b" data-act="cfmsave">Salva valori</button><button class="b s" data-act="cfmno">Annulla</button></div><p class="note">Con ✕ elimini un conto: per qualche secondo compare "Annulla" per tornare indietro.</p>` : `<div class="acts" style="margin-top:10px"><button class="b" data-act="cfm">Aggiorna saldi</button><button class="b s" data-act="caddo">Aggiungi conto</button></div>`;
  const opt = accList(D).filter(([k]) => inScK(k, fa)).map(([k, n]) => `<option value="${esc(k)}">${esc(n)}</option>`).join('');
  const form = S.addConto && !fm ? `<div class="card"><h2>Nuovo conto di liquidità</h2><label class="lbl">Account<select id="cnacc">${opt}</select></label><label class="lbl">Nome del conto<input id="cnn" maxlength="40" placeholder="es. Conto Fineco"></label><label class="lbl">Saldo attuale €<input id="cnv" inputmode="decimal" placeholder="0"></label><div class="acts"><button class="b" data-act="caddok">Salva conto</button><button class="b s" data-act="caddc">Annulla</button></div></div>` : '';
  const out = `<div class="card"><div class="lbl bd">Liquidità totale${aname ? ' · ' + esc(aname) : ''}</div><div class="big">${eur(tot(liq))}</div>${bar}</div>${form}${secs || (S.addConto ? '' : '<div class="card">Nessun conto di liquidità. Aggiungine uno.</div>')}${wide && liq.length ? `<div class="prow one">${portPieCard('sp_all', 'Liquidità aggregata', contiRoot(liq), 'per conto')}</div>` : ''}`;
  return wide ? `<div class="con">${accBar(fa)}${out}</div>` : accBar(fa) + out;
}
/* Beni e Passivi: stessa pagina, due elenchi (immobili, beni, altro / mutui, prestiti, debiti) */
const VOCI_CFG = {
  pas: { tot: 'Passivi totali', cls: 'neg', tone: 'p', pre: 'pa_', add: 'Aggiungi passivo', sub: 'per passivo', agg: 'Passivi aggregati', nuovo: 'Nuovo passivo', imp: 'Importo residuo €', ph: 'Nome (es. Mutuo casa)', ok: 'Salva passivo', vuoto: 'Nessun passivo. Aggiungine uno.', upd: 'Aggiorna valori', ev: v => v.tipo === 'passivo', cats: () => CATS.passivo },
  ben: { tot: 'Beni totali', cls: '', tone: 'a', pre: 'be_', add: 'Aggiungi bene', sub: 'per bene', agg: 'Beni aggregati', nuovo: 'Nuovo bene', imp: 'Valore attuale €', ph: 'Nome (es. Appartamento)', ok: 'Salva bene', vuoto: 'Nessun bene. Aggiungine uno.', upd: 'Aggiorna valori', ev: v => v.tipo === 'attivo' && v.categoria !== 'Liquidità' && v.categoria !== 'Investimenti', cats: () => CATS.attivo.filter(c => c !== 'Liquidità' && c !== 'Investimenti') }
};
function pageVoci(kind) {
  const C = VOCI_CFG[kind], D = S.data, wide = innerWidth >= 1000;
  let fa = S.fAcc || 'all'; if (fa !== 'all' && fa !== 'main' && !D.accounts.some(a => a.id === fa)) fa = S.fAcc = 'all';
  const single = fa !== 'all', aname = !single ? '' : fa === 'main' ? D.nome : D.accounts.find(a => a.id === fa).nome;
  const fm = !!S.cfm, lst = D.voci.filter(v => C.ev(v) && inSc(v, fa));
  const tot = a => a.reduce((s, v) => s + v.valore, 0);
  const secs = accList(D).filter(([k]) => inScK(k, fa)).map(([k, n]) => {
    const mine = lst.filter(v => accKey(v) === k).sort((a, b) => dn(a).localeCompare(dn(b)));
    if (!mine.length) return '';
    const html = `<div class="card acc" style="--at:${accTint(k)}"><div class="ptop2"><h2>${esc(n)}</h2><span class="lbl bd">${eur(tot(mine))}</span></div>${mine.map(v => `<div class="pblk"><div class="phd"><b class="grow">${esc(dn(v))}<small class="lbl" style="display:block;font-weight:400">${esc(v.categoria || '')}${v.piano ? ' · ' + eur(piano(v).rata) + '/mese fino al ' + fmtD(v.fine) : ''}</small></b>${fm && !v.piano ? `<input class="cvi" id="cv_${v.id}" inputmode="decimal" value="${String(v.valore).replace('.', ',')}" data-id="${v.id}" style="margin:0;max-width:150px;text-align:right">` : `<span class="lbl">${eur(v.valore)}</span>`}${fm ? `<button class="b s sm r" type="button" data-act="cdel" data-v="${v.id}" aria-label="Elimina">✕</button>` : `<button class="b s sm" data-act="tleaf" data-v="${v.id}">Modifica</button>`}</div></div>`).join('')}</div>`;
    return wide ? `<div class="prow"><div>${html}</div>${portPieCard(C.pre + k, n, contiRoot(mine, C.tone), C.sub)}</div>` : html;
  }).join('');
  const bar = fm ? `<div class="acts" style="margin-top:10px"><button class="b" data-act="cfmsave">Salva valori</button><button class="b s" data-act="cfmno">Annulla</button></div><p class="note">Con ✕ elimini una voce: per qualche secondo compare "Annulla" per tornare indietro.</p>` : `<div class="acts" style="margin-top:10px"><button class="b" data-act="cfm">${C.upd}</button><button class="b s" data-act="xaddo" data-v="${kind}">${C.add}</button></div>`;
  const opt = accList(D).filter(([k]) => inScK(k, fa)).map(([k, n]) => `<option value="${esc(k)}">${esc(n)}</option>`).join('');
  const xm = kind === 'pas' ? (S.xmod || 'piano') : 'manuale';
  const form = S.addX === kind && !fm ? `<div class="card"><h2>${C.nuovo}</h2><label class="lbl">Account<select id="xnacc">${opt}</select></label><label class="lbl">Tipo<select id="xncat">${C.cats().map(c => `<option>${esc(c)}</option>`).join('')}</select></label><label class="lbl">Nome<input id="xnn" maxlength="40" placeholder="${C.ph}" value="${esc(S.xnn || '')}"></label>${kind === 'pas' ? `<label class="lbl">Come vuoi inserire il debito?<select id="xmod" data-act="xmod"><option value="piano" ${xm === 'piano' ? 'selected' : ''}>Nuovo debito: piano di rimborso (inizio e fine)</option><option value="incorso" ${xm === 'incorso' ? 'selected' : ''}>Debito già in corso: parte dal mese prossimo</option><option value="manuale" ${xm === 'manuale' ? 'selected' : ''}>Importo a mano</option></select></label>` : ''}${kind === 'pas' && xm === 'incorso' ? `<label class="lbl">Debito residuo oggi (€)<input id="xr" inputmode="decimal" placeholder="es. 150000"></label><label class="lbl">Data dell'ultima rata<input id="xf" type="date"></label><p class="note">I mesi già registrati non cambiano: oggi il debito vale quanto scrivi, poi scende da solo ogni mese a partire dal prossimo, fino a zero all'ultima rata.</p>` : kind === 'pas' && xm === 'piano' ? `<label class="lbl">Importo preso a prestito (€)<input id="xk" inputmode="decimal" placeholder="es. 200000"></label><label class="lbl">Data di inizio<input id="xi" type="date"></label><label class="lbl">Data di fine<input id="xf" type="date"></label><p class="note">L'app calcola la rata del solo capitale (importo diviso numero di mesi): ogni mese il debito scende da solo fino a zero all'ultima rata.</p>` : `<label class="lbl">${C.imp}<input id="xnv" inputmode="decimal" placeholder="0"></label>`}<div class="acts"><button class="b" data-act="xaddok">${C.ok}</button><button class="b s" data-act="xaddc">Annulla</button></div></div>` : '';
  const out = `<div class="card"><div class="lbl bd">${C.tot}${aname ? ' · ' + esc(aname) : ''}</div><div class="big ${C.cls}">${eur(tot(lst))}</div>${bar}</div>${form}${secs || (S.addX === kind ? '' : `<div class="card">${C.vuoto}</div>`)}${wide && lst.length ? `<div class="prow one">${portPieCard(C.pre + 'all', C.agg, contiRoot(lst, C.tone), C.sub)}</div>` : ''}`;
  return wide ? `<div class="con">${accBar(fa)}${out}</div>` : accBar(fa) + out;
}
const pagePassivi = () => pageVoci('pas'), pageBeni = () => pageVoci('ben');
/* Portafogli: solo lettura (si modificano dalla versione per computer) */
/* Compra / Vendi: registra un'operazione su un prodotto di un portafoglio */
function tradeForm(ports) {
  if (!S.trade) return '';
  const buy = S.trade === 'buy', D = S.data;
  const pl = [...ports].sort((a, b) => accName(a).localeCompare(accName(b)) || a.nome.localeCompare(b.nome));
  const seen = new Map(); pl.forEach(v => (v.prodotti || []).forEach(p => { if (p.isin && !seen.has(p.isin)) seen.set(p.isin, p.nome || ''); }));
  if (!pl.length) return `<div class="card"><h2>${buy ? 'Compra' : 'Vendi'}</h2><p class="note">Crea prima un portafoglio.</p><div class="acts"><button class="b s" data-act="tradec">Chiudi</button></div></div>`;
  return `<div class="card"><h2>${buy ? 'Compra' : 'Vendi'}</h2>${S.msg ? `<div class="msg" id="pmsg">${esc(S.msg)}</div>` : ''}
    <label class="lbl">Portafoglio<select id="tpf">${pl.map(v => `<option value="${v.id}">${esc(accName(v))} · ${esc(v.nome)}</option>`).join('')}</select></label>
    <label class="lbl">ISIN<input id="tis" maxlength="12" autocapitalize="characters" list="tisl" placeholder="es. IE00BK5BQT80"></label><datalist id="tisl">${[...seen].map(([i, n]) => `<option value="${esc(i)}">${esc(n)}</option>`).join('')}</datalist>
    <div class="pcm-2"><label class="lbl">Quote (o nominale € se obbligazione)<input id="tq" inputmode="decimal" placeholder="0"></label><label class="lbl">Prezzo (€ per quota, oppure % se obbligazione)<input id="tp" inputmode="decimal" placeholder="0"></label></div>
    <label class="lbl">Commissioni € (facoltative)<input id="tf" inputmode="decimal" placeholder="0"></label>
    ${buy ? `<div class="lbl" style="margin-top:4px">Solo se il prodotto è nuovo nel portafoglio:</div><div class="pcm-2"><label class="lbl">Nome<input id="tn" placeholder="Nome (facoltativo)"></label><label class="lbl">Classe<select id="tc"><option value="">Scegli…</option>${ASSET.map(o => `<option>${o}</option>`).join('')}</select></label></div>` : ''}
    <label class="nl" style="margin-top:6px"><input type="checkbox" id="tno">Obbligazione: scrivo il nominale in euro e il prezzo in %</label>
    <label class="nl" style="margin:6px 0"><input type="checkbox" id="tli" checked>${buy ? 'Scala' : 'Aggiungi'} l'importo dal conto di liquidità con lo stesso nome del portafoglio (se esiste)</label>
    <div class="acts"><button class="b" data-act="tradeok">Registra ${buy ? 'acquisto' : 'vendita'}</button><button class="b s" data-act="tradec">Annulla</button></div>
    <p class="note">${buy ? 'Le quote si sommano e il prezzo medio di carico si ricalcola (commissioni comprese).' : 'Le quote scendono; il prezzo medio di carico resta invariato. Se vendi tutto, il prodotto esce dal portafoglio.'}</p></div>`;
}
function pagePortMob() {
  const D = S.data;
  let fa = S.fAcc || 'all'; if (fa !== 'all' && fa !== 'main' && !D.accounts.some(a => a.id === fa)) fa = S.fAcc = 'all';
  const single = fa !== 'all';
  const prodMob = p => {
    const pr = S.prezzi && S.prezzi.map[String(p.isin || '').toUpperCase()], f = prodFisc(p);
    const det = [p.isin ? 'Quote ' + nfm(p.quote) : '', pr ? 'Prezzo ' + nfm(pr) : '', p.isin && p.pmc > 0 ? 'Carico ' + nfm(p.pmc) : '', f ? 'Gain ' + (f.gain < 0 ? '−' : '+') + eur(Math.abs(f.gain)) : ''].filter(Boolean).join(' · ');
    return `<div class="row"><div class="n">${esc(p.nome || p.isin || 'Valore manuale')}<small>${esc([p.isin, p.classe].filter(Boolean).join(' · '))}${det ? '<br>' + esc(det) : ''}</small></div><div class="v">${eur(prodVal(p))}</div></div>`;
  };
  const block = v => {
    if (S.pe === v.id) return `<div class="pblk">${portEditMob(v)}</div>`;
    const L = v.prodotti || [], m = new Map(); L.forEach(p => { const c = p.classe || 'Altro'; m.set(c, (m.get(c) || 0) + prodVal(p)); });
    const cl = [...m].sort((a, b) => b[1] - a[1]).map(([c, x]) => `${esc(c)} ${v.valore > 0 ? Math.round(x / v.valore * 100) : 0}%`).join(' · ');
    const op = !pCol(v.id);
    const inner = `<div class="phd"><b class="grow" data-act="pcol" data-v="${v.id}" style="cursor:pointer"><span class="chev ${op ? 'open' : ''}">▸︎</span> ${esc(v.nome)}</b><span class="lbl">${eur(v.valore)}</span><button class="b s sm" data-act="pedit" data-v="${v.id}">Modifica</button></div>${op ? (L.length ? L.map(prodMob).join('') + (cl ? `<div class="lbl" style="margin-top:6px">${cl}</div>` : '') : '<div class="lbl">Nessun prodotto.</div>') : ''}`;
    /* computer: ogni portafoglio ha la sua torta a destra della tabella */
    if (innerWidth >= 1000 && single && op && v.valore > 0) return `<div class="pblk pwp"><div class="pwl">${inner}</div>${portPieCard('pp_' + v.id, many ? v.nome + ' · ' + accName(v) : v.nome, portRoot([v]))}</div>`;
    return `<div class="pblk">${inner}</div>`;
  };
  const allPorts = D.voci.filter(v => isPort(v) && inSc(v, fa)), many = new Set(allPorts.map(accKey)).size > 1;
  const secs = accList(D).filter(([k]) => inScK(k, fa)).map(([k, n]) => {
    const ports = allPorts.filter(v => accKey(v) === k).sort((a, b) => a.nome.localeCompare(b.nome)), t = ports.reduce((s, v) => s + v.valore, 0);
    if (!ports.length) return '';
    const html = `<div class="card acc" style="--at:${accTint(k)}"><div class="ptop2"><h2>${esc(n)}</h2><span class="lbl bd">${eur(t)}</span></div>${ports.map(block).join('')}</div>`;
    return innerWidth >= 1000 && !single ? `<div class="prow"><div>${html}</div>${portPieCard('pp_' + k, n, portRoot(ports))}</div>` : html;
  }).join('');
  const opt = accList(D).filter(([k]) => inScK(k, fa)).map(([k, n]) => `<option value="${esc(k)}">${esc(n)}</option>`).join('');
  const form = S.addPort && S.pe == null ? `<div class="card"><h2>Nuovo portafoglio</h2><label class="lbl">Account<select id="pnacc">${opt}</select></label><label class="lbl">Nome (es. Directa)<input id="pnnm" maxlength="40" placeholder="Nome del portafoglio"></label><div class="acts"><button class="b" data-act="pmnew">Crea portafoglio</button><button class="b s" data-act="paddc">Annulla</button></div></div>` : '';
  const head = `<div class="card"><div class="lbl bd">Totale portafogli</div><div class="big">${eur(allPorts.reduce((s, v) => s + v.valore, 0))}</div>${S.pe == null ? `<div class="acts" style="margin-top:10px"><button class="b" data-act="paddo">Aggiungi portafoglio</button><button class="b s" data-act="tradeo" data-v="buy">Compra</button><button class="b s" data-act="tradeo" data-v="sell">Vendi</button>${innerWidth >= 1000 ? `<button class="b s" data-act="rfs">${S.prezziBusy ? 'Aggiorno…' : 'Aggiorna prezzi'}</button>` : ''}</div>` : ''}</div>`;
  return `<div class="con">${accBar(fa)}${head}${form}${S.pe == null ? tradeForm(allPorts) : ''}${secs || (S.addPort ? '' : '<div class="card">Nessun portafoglio. Aggiungine uno.</div>')}${innerWidth >= 1000 && allPorts.length ? `<div class="prow one">${portPieCard('pp_all', 'Portafoglio aggregato', portRoot(allPorts))}</div>` : ''}</div>`;
}

/* ---------- Telefono: modifica dei prodotti di un portafoglio ---------- */
function portDraft(v) {
  return S.pd || (v.prodotti || []).map(p => ({ isin: p.isin, nome: p.nome || '', classe: p.classe || v.assetClass || '', quote: p.isin ? String(p.quote).replace('.', ',') : '', manuale: p.manuale ? String(p.manuale).replace('.', ',') : '', nom: !!p.nom, pmc: p.pmc > 0 ? String(p.pmc).replace('.', ',') : '', aliq: p.aliq != null && p.aliq !== '' ? String(p.aliq).replace('.', ',') : '' }));
}
function portTot(rows) {
  const n = x => { const y = pnum(String(x || '').trim()); return isFinite(y) && y > 0 ? y : 0; };
  return valoreProd({ prodotti: rows.filter(r => String(r.isin || '').trim() || n(r.manuale)).map(r => ({ isin: String(r.isin || '').trim().toUpperCase(), quote: n(r.quote), manuale: n(r.manuale), pmc: n(r.pmc), nom: !!r.nom })) });
}
function portEditMob(v) {
  const L = portDraft(v), cur = S.pcur != null && S.pcur < L.length ? S.pcur : null, opts = sel => `<option value="">Scegli…</option>${ASSET.map(o => `<option ${sel === o ? 'selected' : ''}>${o}</option>`).join('')}`;
  /* tutti i prodotti restano nella pagina (i non scelti sono nascosti): così il salvataggio li legge tutti */
  const rows = L.map((p, i) => {
    const k = String(p.isin || '').trim().toUpperCase(), pr = S.prezzi && S.prezzi.map[k];
    return `<div class="ppr pcm" style="${i === cur ? '' : 'display:none'}"><div class="pcm-h"><b>${p.isin || p.nome ? esc(p.nome || p.isin) : 'Nuovo prodotto'}</b><button class="b s sm r" type="button" data-act="pmrm" data-v="${i}">Togli</button></div>
      <label>ISIN<input class="pi" maxlength="12" autocapitalize="characters" placeholder="Vuoto se è un valore a mano" value="${esc(p.isin)}"></label>
      <label>Nome<input class="pn" placeholder="Nome" value="${esc(p.nome)}"></label>
      <label>Classe di investimento<select class="pc">${opts(p.classe)}</select></label>
      <div class="pcm-2"><label>Quote o nominale €<input class="pq" inputmode="decimal" placeholder="Quote" value="${esc(p.quote)}"></label><label>Prezzo medio di carico<input class="pp" inputmode="decimal" placeholder="Facoltativo" value="${esc(p.pmc || '')}"></label></div>
      <label class="nl"><input type="checkbox" class="pnom" ${p.nom ? 'checked' : ''}>Obbligazione: scrivo il nominale in euro (es. 7000)</label>
      <div class="pcm-2"><label>Aliquota %<input class="pa" inputmode="decimal" placeholder="${p.classe === 'Obbligazioni' ? '12,5' : '26'}" value="${esc(p.aliq || '')}"></label><label>Valore a mano €<input class="pm" inputmode="decimal" placeholder="Solo senza prezzo" value="${esc(p.manuale)}"></label></div>
      ${k ? `<div class="lbl">${pr ? 'Prezzo ' + nfm(pr) + (p.nom ? ' %' : '') + ' nel foglio' : 'Nessun prezzo nel foglio: vale ' + (p.pmc ? 'il prezzo di acquisto' : 'il valore a mano')}</div>` : ''}
      <div class="acts"><button class="b" type="button" data-act="pmdone">Fatto, torna all'elenco</button></div></div>`;
  }).join('');
  const lista = cur !== null ? '' : `${L.length > 8 ? '<input id="pmq" class="pmq" placeholder="Cerca un prodotto…" autocomplete="off">' : ''}<div class="pml">${L.map((p, i) => `<div class="row pmrow" data-act="pmopen" data-v="${i}" style="cursor:pointer"><div class="n">${esc(p.nome || p.isin || 'Valore a mano')}<small>${esc([p.isin, p.classe].filter(Boolean).join(' · '))}</small></div><div class="v">${eur(portTot([p]))}<span class="chev" style="margin-left:6px">›</span></div></div>`).join('') || '<div class="lbl">Nessun prodotto. Aggiungine uno.</div>'}</div>`;
  return `<div class="phd"><input id="pnome" class="grow" maxlength="40" value="${esc(v.nome)}" title="Nome del portafoglio" style="margin:0;font-weight:700"></div>
    <label class="lbl" style="display:block;margin-bottom:8px">Account del portafoglio<select id="pacc" style="margin-top:3px">${accList(S.data).map(([k, n]) => `<option value="${esc(k)}" ${k === accKey(v) ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
    ${S.msg ? `<div class="msg" id="pmsg">${esc(S.msg)}</div>` : ''}
    ${cur === null ? '<div class="lbl" style="margin-bottom:6px">Tocca un prodotto per modificarlo.</div>' : ''}${lista}${rows}
    ${cur === null ? '<button class="b s sm" type="button" data-act="pmadd">＋ Aggiungi prodotto</button>' : ''}
    <div class="pcm-tot"><span class="lbl">Totale del portafoglio dopo il salvataggio</span><b id="pprev">${eur(portTot(L))}</b></div>
    <div class="acts"><button class="b" data-act="psave">Salva</button><button class="b s" data-act="pcancel">Annulla</button></div>
    ${cur === null ? `<div class="acts" style="margin-top:14px"><button class="b s r" data-act="pdel" data-v="${v.id}">Elimina portafoglio</button></div>` : ''}
    <p class="note">Le modifiche valgono solo dopo "Salva"; con "Annulla" non cambia nulla. Se l'ISIN non ha il prezzo nel foglio, viene segnalato all'amministratore.</p>`;
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
  else body = `<div class="acts" style="flex-direction:column">${v.piano || hasProd(v) ? '' : '<button class="b" data-act="popupd">Aggiorna</button>'}<button class="b s" data-act="popedit">Modifica</button><button class="b s" data-act="poparch">Archivia</button><button class="b r" data-act="popdel">Elimina</button><button class="b s" data-act="popclose">Chiudi</button></div>`;
  return `<div class="ov povl" data-act="popclose"></div><div class="pop"><h2 style="margin-bottom:2px">${esc(dn(v))}</h2><div class="lbl" style="margin-bottom:12px">${esc(v.categoria)}${v.dove && v.dove !== dn(v) ? ' · su ' + esc(v.dove) : ''} · ${esc(accName(v))} · ${eur(v.valore)}${isA ? ' · archiviato' : ''}</div>${pi ? `<div class="lbl" style="margin:-6px 0 12px">Prestito di ${eur(v.capitale)} · rata capitale ${eur(pi.rata)}/mese · pagate ${pi.k} su ${pi.N} · fine ${fmtD(v.fine)}${pi.partito ? '' : ' · non ancora iniziato'}</div>` : ''}${ob}<div class="msg">${esc(S.msg)}</div>${body}</div>`;
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
function disParts(Dz0, single, noTree) {
  const D = S.data; if (!S.tx) S.tx = new Set(['r']);
  const Dz = Dz0 || { ...D, voci: vz(aggVoci(D)) }, wide = innerWidth >= 1000, root = alberoDati(Dz, single ? 'agg' : S.tview || 'agg');
  const found = (S.pp || ['r']).slice().reverse().map(id => alberoTrova(root, id)).find(Boolean) || alberoTrova(root, 'r');
  S.pp = found.path.map(n => n.id);
  /* l'albero è sempre tutto aperto */
  const op = new Set(['r']); const wk = n => { if (n.kids.length) { op.add(n.id); n.kids.forEach(wk); } }; wk(root); S.tx = op;
  /* computer: quattro torte piccole; telefono: torta unica come prima */
  return { tree: noTree ? '' : treeCard(root, '', single), over: !noTree && wide && S.tex ? treeCard(root, '', single, true) : '', pie: wide ? quadCard(Dz, single) : pieCard(found) };
}
/* Panoramica: solo su schermi larghi (computer) */
/* Riquadro grafici della Panoramica: un selettore sceglie quale grafico vedere */
function hubBody(key, all, r1, cols) {
  const hist = all.length >= 2, mob = innerWidth < 1000, W = mob ? Math.max(300, innerWidth - 62) : Math.max(300, Math.round((innerWidth - 200 - 56 - 28) * (cols || 5) / 12 - 40)), H = Math.max(80, r1 - 110);
  const no = t => `<div class="card"><div class="chh"><h2>${t}</h2><span class="chb"><button class="b s sm" data-act="hclose">← Indietro</button></span></div><p class="note">Il grafico comparirà quando ci saranno almeno 2 mesi di dati.</p></div>`;
  if (key === 'main') return panMain(all, r1 + 70, cols);
  if (key === 'bar') {
    if (!hist) return no('Variazione mensile del patrimonio netto');
    const A = aggOf('bar', all);
    return lcCard('bar', A === 'yf' ? 'Variazione annuale del patrimonio netto' : A === 'ya' ? 'Variazione mensile media del patrimonio netto, per anno' : 'Variazione mensile del patrimonio netto', aggSeries(all, A).dBar, [{ k: 'v', c: '#15803d', l: A === 'yf' ? 'Variazione annuale' : A === 'ya' ? 'Variazione mensile media' : 'Variazione mensile', bar: 1 }], W, H);
  }
  if (key === 'pas') {
    if (!hist) return no('Andamento dei passivi');
    const A = aggOf('pas', all);
    return lcCard('pas', 'Andamento dei passivi', aggSeries(all, A).pts, [{ k: 'passivi', c: '#b91c1c', l: 'Passivi', fit: 1, nolg: 1, ck: 1 }], W, Math.max(130, r1 - 150 + 70));
  }
  if (!hist) return no('Confronto tra periodi');
  const c = cmpParts(all, true, W, Math.max(80, r1 - 124), Math.max(80, r1 - 134)); return c.b || c.a;
}
/* Pagina dedicata all'albero del patrimonio (solo computer), dopo la Panoramica */
function pageAlb() {
  const D = S.data;
  if (!D.voci.length) return panTop('Aggregato', 'Albero') + '<div class="card">Nessuna voce da mostrare. Aggiungile con il tasto Nuova voce.</div>';
  let fa = S.fAcc || 'all'; if (fa !== 'all' && fa !== 'main' && !D.accounts.some(a => a.id === fa)) fa = S.fAcc = 'all';
  const single = fa !== 'all', vis = vz(D.voci).filter(v => inSc(v, fa)), Dz = { ...D, voci: vis };
  const aname = !single ? 'Aggregato' : fa === 'main' ? D.nome : D.accounts.find(a => a.id === fa).nome;
  S.tfull = true; const pr = disParts(Dz, single); S.tfull = false;
  S.anim = false; S.tanim = false; S.tcan = false;
  return `<div class="alb">${panTop(aname, 'Albero')}${pr.tree}</div>`;
}
const accList = D => [['main', D.nome], ...D.accounts.map(a => [a.id, a.nome])];
function pageCon() {
  const D = S.data;
  let fa = S.fAcc || 'all'; if (fa !== 'all' && fa !== 'main' && !D.accounts.some(a => a.id === fa)) fa = S.fAcc = 'all';
  const single = fa !== 'all', aname = !single ? 'Aggregato' : fa === 'main' ? D.nome : D.accounts.find(a => a.id === fa).nome;
  const q = (S.cq || '').trim().toLowerCase(), fm = !!S.cfm, col = S.ccol || {}, isCol = k => fm ? false : col[k] !== undefined ? col[k] : S.ccAll !== false;
  const flt = arr => arr.filter(v => inSc(v, fa) && (!q || (dn(v) + ' ' + v.categoria + ' ' + (v.dove || '') + ' ' + accName(v)).toLowerCase().includes(q)))
    .sort((a, b) => dn(a).localeCompare(dn(b)));
  const GC = { n: dn, v: v => v.valore }, srt = (t, arr) => sortArr(t, arr, GC);
  const act = v => `<button class="b s sm" data-act="cedit" data-v="${v.id}">Modifica</button> <button class="b s sm" data-act="carch" data-v="${v.id}">Archivia</button> <button class="b s sm r" data-act="cdel" data-v="${v.id}">Elimina</button>`;
  const actA = v => `<button class="b s sm" data-act="cres" data-v="${v.id}">Ripristina</button> <button class="b s sm r" data-act="cdel" data-v="${v.id}">Elimina</button>`;
  const row = (v, isA) => {
    const val = !isA && fm && !v.piano && !hasProd(v) ? `<input class="cvi" id="cv_${v.id}" inputmode="decimal" value="${String(v.valore).replace('.', ',')}" data-id="${v.id}">` : `<span class="${v.tipo === 'passivo' ? 'neg' : ''}">${v.tipo === 'passivo' ? '−' : ''}${eur(v.valore)}</span>`;
    const nota = [v.piano ? 'si aggiorna da solo (piano rate)' : v.tipo === 'passivo' ? esc(v.categoria) : '', isA ? esc(accName(v)) : ''].filter(Boolean).join(' · ');
    return `<tr class="cr"${isA ? ` style="background:${accTint(accKey(v))}"` : ''}><td class="cn">${esc(dn(v))}${nota ? `<small class="lbl" style="display:block">${nota}</small>` : ''}</td><td class="cv">${val}</td><td class="ca">${fm && !isA ? '' : isA ? actA(v) : act(v)}</td></tr>`;
  };
  const tot = arr => eur(arr.reduce((s, v) => s + v.valore, 0));
  const hd = (key, title, arr) => `<tr class="chd l0" data-act="ccol" data-v="${esc(key)}"><td colspan="3"><span class="chev ${isCol(key) ? '' : 'open'}">▸︎</span> ${esc(title)} <span class="lbl">${arr.length} · ${tot(arr)}</span></td></tr>`;
  const grp = (key, title, arr) => !arr.length ? '' : hd(key, title, arr) + (isCol(key) ? '' : arr.map(v => row(v, false)).join(''));
  const noInv = arr => arr.filter(v => !(v.tipo === 'attivo' && v.categoria === 'Investimenti')), att = srt('con', noInv(flt(D.voci))), arc = srt('arc', noInv(flt(D.arch || [])));
  const cOrd = ['Liquidità', 'Beni', ...CATS.attivo.filter(c => !['Liquidità', 'Investimenti', 'Beni'].includes(c))];
  const headT = (t, off) => `<tr>${thS(t, 'n', 'Nome', 'cn', off)}${thS(t, 'v', 'Valore', 'cv', off)}<th></th></tr>`;
  const cg = '<colgroup><col style="width:46%"><col style="width:22%"><col></colgroup>';
  const secs = accList(D).filter(([k]) => inScK(k, fa)).map(([k, n]) => {
    const mine = att.filter(v => accKey(v) === k);
    const t = totals(mine), body = cOrd.map(c => grp(k + '|' + c, c, mine.filter(v => v.tipo === 'attivo' && v.categoria === c))).join('') + grp(k + '|Passivi', 'Passivi', mine.filter(v => v.tipo === 'passivo'));
    const ac = accCol(k) && !(mine.length && S.cfm);
    return `<div class="card acc" style="--at:${accTint(k)}"><div class="ptop2" data-act="acol" data-v="${esc(k)}" style="cursor:pointer"><h2><span class="chev ${ac ? '' : 'open'}">▸︎</span> ${esc(n)}</h2><span class="lbl">Netto ${eur(t.netto)}</span></div>${ac ? '' : mine.length ? `<table class="ct">${cg}${headT('con', fm)}${body}</table>` : '<div class="lbl" style="padding:6px 0">Nessuna voce.</div>'}</div>`;
  }).join('');
  const tbar = fm
    ? `<div class="tbar"><span class="lbl" style="flex:1">Scrivi i nuovi valori (Invio passa al successivo), poi salva una volta sola.</span><button class="b sm" data-act="cfmsave">Salva valori</button><button class="b s sm" data-act="cfmno">Annulla</button></div>`
    : `<div class="tbar"><input id="cq" placeholder="Cerca un conto…" value="${esc(S.cq || '')}" style="max-width:260px;margin:0"><span style="flex:1"></span><button class="b s sm" data-act="ccolall" data-v="${S.ccAll !== false ? 0 : 1}">${S.ccAll !== false ? 'Espandi tutto' : 'Comprimi tutto'}</button><button class="b sm" data-act="cfm">Aggiorna fine mese</button></div>`;
  const archSec = (D.arch || []).length ? `<div class="card"><h2 style="cursor:pointer" data-act="carcs">Archiviati (${(D.arch || []).length}) ${S.carc ? '▾' : '▸'}</h2>${S.carc ? (arc.length ? `<table class="ct">${cg}${headT('arc')}${arc.map(v => row(v, true)).join('')}</table>` : '<div class="lbl">Nessun conto trovato.</div>') : '<div class="lbl">Escono dai totali, lo storico resta. Apri per ripristinarli.</div>'}</div>` : '';
  return `<div class="con">${panTop(aname, 'Liquidità')}<div class="card">${tbar}</div>${secs}${archSec}</div>`;
}

function pagePort() {
  const D = S.data;
  let fa = S.fAcc || 'all'; if (fa !== 'all' && fa !== 'main' && !D.accounts.some(a => a.id === fa)) fa = S.fAcc = 'all';
  const single = fa !== 'all', aname = !single ? 'Aggregato' : fa === 'main' ? D.nome : D.accounts.find(a => a.id === fa).nome;
  const conv = portProposta(D).filter(G => inScK(G.account || 'main', fa));
  const convCard = conv.length ? `<div class="card"><h2>Riunisci le voci di investimento</h2><p class="lbl" style="margin-top:0">Le voci di investimento attuali (una per conto e classe) diventano un portafoglio per conto, con un prodotto per riga. Il totale non cambia. Controlla l'anteprima e conferma.</p>${conv.map(G => `<div class="row"><div class="n">${esc(G.dove)} · ${esc(accName({ account: G.account }))}<small>${G.voci.length} ${G.voci.length === 1 ? 'voce' : 'voci'} (${esc(G.voci.map(dn).join(', '))}) → ${G.prodotti.length} prodotti${G.exId ? ' · si aggiunge al portafoglio già esistente' : ''}</small></div><div class="v">${eur(G.valore)}</div></div>`).join('')}<div class="acts"><button class="b" data-act="pconv">Riunisci nei portafogli</button></div></div>` : '';
  const stato = isAdmin() ? `<button class="b sm" data-act="prezzi">${S.prezziBusy ? 'Aggiorno…' : 'Aggiorna prezzi'}</button>` : '';
  const prodRow = p => {
    const k = String(p.isin || '').toUpperCase(), pr = S.prezzi && S.prezzi.map[k], v = prodVal(p), f = prodFisc(p), d = '<span class="lbl">—</span>';
    return `<tr class="cr"><td class="cn">${esc(p.nome || p.isin || 'Valore manuale')}${p.isin ? `<small class="lbl" style="display:block">${esc(p.isin)}</small>` : ''}</td><td class="cc">${esc(p.classe || '')}</td><td class="cv">${p.isin ? nfm(p.quote) : ''}</td><td class="cv">${pr ? nfm(pr) : p.isin ? (p.pmc > 0 ? nfm(p.pmc) + ' <small class="lbl">(acquisto)</small>' : S.prezzi ? 'non nel foglio' : 'manuale') : ''}</td><td class="cv">${p.isin ? (p.pmc > 0 ? nfm(p.pmc) : d) : ''}</td><td class="cv">${eur(v)}</td><td class="cv">${p.isin ? (f ? `<span class="${f.gain < 0 ? 'neg' : ''}">${f.gain < 0 ? '−' : ''}${eur(Math.abs(f.gain))}</span>` : d) : ''}</td><td class="cv">${p.isin ? nfm(prodAliq(p)) + '%' : ''}</td><td class="cv">${p.isin ? (f ? eur(f.imp) : d) : ''}</td></tr>`;
  };
  const draftOf = v => S.pd || (v.prodotti || []).map(p => ({ isin: p.isin, nome: p.nome || '', classe: p.classe || v.assetClass || '', quote: p.isin ? String(p.quote).replace('.', ',') : '', manuale: p.manuale ? String(p.manuale).replace('.', ',') : '', nom: !!p.nom, pmc: p.pmc > 0 ? String(p.pmc).replace('.', ',') : '', aliq: p.aliq != null && p.aliq !== '' ? String(p.aliq).replace('.', ',') : '' }));
  const classOpts = sel => `<option value="">Classe…</option>${ASSET.map(o => `<option ${sel === o ? 'selected' : ''}>${o}</option>`).join('')}`;
  const editBlock = v => { const L = draftOf(v); return `<div class="phd"><input id="pnome" class="grow" maxlength="40" value="${esc(S.pnome != null ? S.pnome : v.nome)}" title="Nome del portafoglio" style="margin:0;max-width:260px;font-weight:700"><button class="b sm" data-act="psave">Salva</button><button class="b s sm" data-act="pcancel">Annulla</button></div>
    ${S.msg ? `<div class="msg" id="pmsg">${esc(S.msg)}</div>` : ''}
    <div class="ppr lbl"><span>ISIN</span><span>Nome</span><span>Classe di investimento</span><span>Quote o nominale €</span><span>Prezzo medio di carico</span><span>Aliquota %</span><span>Valore manuale €</span><span></span></div>
    ${L.map((p, i) => { const k = String(p.isin || '').trim().toUpperCase(), pr = S.prezzi && S.prezzi.map[k]; return `<div class="ppr"><input class="pi" maxlength="12" placeholder="ISIN" value="${esc(p.isin)}"><input class="pn" placeholder="Nome" value="${esc(p.nome)}"><select class="pc">${classOpts(p.classe)}</select><div class="pqc"><input class="pq" inputmode="decimal" placeholder="Quote" value="${esc(p.quote)}"><label class="nl" title="Spunta per le obbligazioni: scrivi il nominale in euro (es. 7000)"><input type="checkbox" class="pnom" ${p.nom ? 'checked' : ''}>Obbligazione: nominale €</label></div><input class="pp" inputmode="decimal" placeholder="PMC" value="${esc(p.pmc || '')}"><input class="pa" inputmode="decimal" placeholder="${p.classe === 'Obbligazioni' ? '12,5' : '26'}" value="${esc(p.aliq || '')}"><input class="pm" inputmode="decimal" placeholder="Solo senza prezzo" value="${esc(p.manuale)}"><button class="b s sm r" type="button" data-act="prrm" data-v="${i}">✕</button></div>${k ? `<div class="lbl" style="margin:-2px 0 8px">${pr ? 'prezzo ' + nfm(pr) + (p.nom ? ' %' : '') + ' nel foglio' : 'nessun prezzo nel foglio: vale ' + (p.pmc ? 'il prezzo di acquisto' : 'il valore manuale')}</div>` : ''}`; }).join('')}
    <button class="b s sm" type="button" data-act="pradd">＋ Aggiungi prodotto</button>
    <p class="note">Un prodotto per riga. Con ISIN e quote il valore si calcola con il prezzo del foglio; il valore manuale vale solo se il prezzo manca. Senza ISIN scrivi solo il valore manuale (utile per Alessandra e Famiglia). Prezzo medio di carico e aliquota servono per capital gain e imposte latenti; se lasci l'aliquota vuota vale 12,5% per le obbligazioni e 26% per il resto.</p>`; };
  const viewHead = v => `<div class="phd"><b class="grow" data-act="pcol" data-v="${v.id}" style="cursor:pointer"><span class="chev ${pCol(v.id) ? '' : 'open'}">▸︎</span> ${esc(v.nome)}</b><span class="lbl">${eur(v.valore)}</span><button class="b s sm" data-act="pedit" data-v="${v.id}">Modifica</button><button class="b s sm r" data-act="pdel" data-v="${v.id}">Elimina</button></div>`;
  const viewBlock = v => {
    const L = v.prodotti || [], m = new Map(); L.forEach(p => { const c = p.classe || 'Altro'; m.set(c, (m.get(c) || 0) + prodVal(p)); });
    const t = v.valore, cl = [...m].sort((a, b) => b[1] - a[1]).map(([c, x]) => `${esc(c)} ${t > 0 ? Math.round(x / t * 100) : 0}%`).join(' · ');
    const GP = { n: p => p.nome || p.isin || 'Valore manuale', c: p => p.classe || '', q: p => p.isin ? Number(p.quote) || 0 : 0, p: p => (S.prezzi && S.prezzi.map[String(p.isin || '').toUpperCase()]) || 0, m: p => p.pmc || 0, v: prodVal, g: p => { const f = prodFisc(p); return f ? f.gain : -Infinity; }, a: p => p.isin ? prodAliq(p) : 0, i: p => { const f = prodFisc(p); return f ? f.imp : -1; } };
    return `${viewHead(v)}
    ${L.length ? `<table class="ct"><colgroup><col style="width:22%"><col style="width:12%"><col style="width:8%"><col style="width:8%"><col style="width:9%"><col style="width:11%"><col style="width:11%"><col style="width:8%"><col></colgroup><tr>${thS('prod', 'n', 'Prodotto', 'cn')}${thS('prod', 'c', 'Classe')}${thS('prod', 'q', 'Quote', 'cv')}${thS('prod', 'p', 'Prezzo', 'cv')}${thS('prod', 'm', 'Prezzo medio di carico', 'cv')}${thS('prod', 'v', 'Valore', 'cv')}${thS('prod', 'g', 'Capital gain netto', 'cv')}${thS('prod', 'a', 'Aliquota', 'cv')}${thS('prod', 'i', 'Imposte latenti', 'cv')}</tr>${sortArr('prod', L, GP).map(prodRow).join('')}</table>${cl ? `<div class="lbl" style="margin-top:6px">${cl}</div>` : ''}` : '<div class="lbl">Nessun prodotto: premi Modifica per aggiungerli.</div>'}`;
  };
  const secs = accList(D).filter(([k]) => inScK(k, fa)).map(([k, n]) => {
    const ports = D.voci.filter(v => isPort(v) && accKey(v) === k).sort((a, b) => a.nome.localeCompare(b.nome)), t = ports.reduce((s, v) => s + v.valore, 0);
    const ac = accCol(k) && !ports.some(v => S.pe === v.id);
    return `<div class="card acc" style="--at:${accTint(k)}"><div class="ptop2" data-act="acol" data-v="${esc(k)}" style="cursor:pointer"><h2><span class="chev ${ac ? '' : 'open'}">▸︎</span> ${esc(n)}</h2><span class="lbl">${ports.length} ${ports.length === 1 ? 'portafoglio' : 'portafogli'} · ${eur(t)}</span></div>
      ${ac ? '' : ports.map(v => `<div class="pblk">${S.pe === v.id ? editBlock(v) : pCol(v.id) ? viewHead(v) : viewBlock(v)}</div>`).join('') || (ac ? '' : '<div class="lbl">Nessun portafoglio.</div>')}
      ${ac ? '' : `<div class="tbar" style="margin-top:10px"><input id="pnn_${esc(k)}" maxlength="40" placeholder="Nuovo portafoglio (es. Directa)" style="max-width:260px;margin:0"><button class="b s sm" data-act="pnew" data-v="${esc(k)}">＋ Aggiungi portafoglio</button></div>`}</div>`;
  }).join('');
  return `<div class="con"><div class="ptop"><h2>Portafogli · ${esc(aname)}</h2><div class="pbtn">${stato}<button class="b s sm" data-act="pcolall" data-v="${accList(D).every(([k]) => accCol(k)) ? 0 : 1}">${accList(D).every(([k]) => accCol(k)) ? 'Espandi tutto' : 'Comprimi tutto'}</button></div></div>${convCard}${secs}${importCard()}</div>`;
}

function pagePan() { return conStoricoAcc(pagePan0); }
function pagePan0() {
  const D = S.data, all = D.storico;
  if (!D.voci.length) return panTop('Aggregato') + '<div class="card">Nessuna voce da mostrare. Aggiungile con il tasto Nuova voce.</div>';
  let fa = S.fAcc || 'all'; if (fa !== 'all' && fa !== 'main' && !D.accounts.some(a => a.id === fa)) fa = S.fAcc = 'all';
  const single = fa !== 'all', vis = vz(D.voci).filter(v => inSc(v, fa)), Dz = { ...D, voci: vis };
  const aname = !single ? 'Aggregato' : fa === 'main' ? D.nome : D.accounts.find(a => a.id === fa).nome;
  const t = totals(vis), cur = all[all.length - 1], prev = all.length > 1 ? all[all.length - 2] : null, dN = cur && prev ? cur.netto - prev.netto : null;
  const kp = (l, v, sub, c, extra, tail) => `<div class="card"><div class="lbl bd">${l}</div><div class="big ${c || ''}">${v}${extra || ''}</div><div class="lbl">${sub}</div>${tail || ''}</div>`;
  const eye = `<button class="eye" data-act="hide" aria-label="${hideAmt() ? 'Mostra importi' : 'Nascondi importi'}" title="${hideAmt() ? 'Mostra importi' : 'Nascondi importi'}"><svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>${hideAmt() ? '' : '<path d="M3 3l18 18"/>'}</svg></button>`;
  const pn = perNetto(t), dsub = pn ? `<span class="dsub">${pn}</span>` : '&nbsp;';
  const hh = (document.querySelector('header') || {}).offsetHeight || 56, avail = innerHeight - hh - 58 - 80 - 28, r1 = Math.max(single ? 300 : 290, Math.round(avail * 0.5));
  const keys = ['main', 'bar', 'pas', 'cmp2'], hv = keys.includes(S.hq) ? S.hq : null;
  const pr = disParts(Dz, single, !all.length);
  S.anim = false; S.tanim = false;
  const allF = perFiltraA(all);
  if (S.aggK) for (const k in S.aggK) if (S.aggK[k] === 'ya') S.aggK[k] = 'yf';
  const kpis = `<div class="kpis">${kp('Patrimonio netto', eur(t.netto), dsub, cls(t.netto), eye + rfsBtn())}${accChips()}</div>`;
  if (!all.length) {
    S.hanim = false; S.panim = false; S.tcan = false;
    return `<div class="pan" style="--r1:${r1}px">${panTop(aname, null, homeBtn())}${kpis}${single ? `<div class="g12 r1"><div class="s4">${colCard(t, vis)}</div><div class="s8">${pr.pie}</div></div>${histCard(fa)}` : `<div class="g12 r1"><div class="s5">${hubGrid(all, allF)}</div><div class="s3">${colCard(t, vis)}</div><div class="s4">${pr.pie}</div></div>`}</div>${pr.over}${S.cx ? colBig(t, vis) : ''}`;
  }
  const c = { all, allF, hv, r1, t, vis, Dz, single, cur, prev, pr, D: single ? Dz : aggD() };
  const ed = !!S.hedit && !S.ro, nm = k => HOME_BLK[k].n, lst = homeList();
  let items = homeLayout(r1), htm = {};
  items.forEach(i => { htm[i.k] = homeBlk(i.k, { ...c, r1: i.h * 10 - 14, cols: i.w }); });
  items = hlFix(items.filter(i => htm[i.k]), null);
  S.hmItems = items;
  S.hanim = false; S.panim = false; S.tcan = false;
  const H = Math.max(0, ...items.map(i => i.r + i.h)) * 10;
  const grid = items.length ? `<div class="hmf${ed ? ' ed' : ''}" style="height:${H}px">${items.map(i => { const px = i.h * 10 - 14; return `<div class="hf" data-k="${i.k}" style="${hmStyle(i)};--r1:${px}px">${i.k === 'and' ? htm.and.replace('height:var(--r1)', '') : htm[i.k]}${ed ? `<div class="hmov" data-hm="move"><span>✥ ${esc(nm(i.k))}</span></div><div class="hrs" data-hm="size" title="Ridimensiona"></div>` : ''}</div>`; }).join('')}</div>` : (ed ? '' : '<div class="card">Nessun riquadro nella home. Usa "Modifica home" per aggiungerne.</div>');
  return `<div class="pan" style="--r1:${r1}px">${panTop(aname, null, homeBtn())}<div class="g12 pfrow"><div class="s8">${perBar()}</div></div>${kpis}${homeBar()}${grid}</div>${pr.over}${S.cx ? colBig(t, vis) : ''}`;
}
const hmStyle = i => `left:calc((100% + 14px) * ${i.c} / 12);width:calc((100% + 14px) * ${i.w} / 12 - 14px);top:${i.r * 10}px;height:${i.h * 10 - 14}px`;
/* ---------- Home modificabile: riquadri, ordine e pannello di scelta ---------- */
function homeBlk(k, c) {
  const has = c.all.length > 0;
  if (k === 'and') {
    if (!has) return '';
    if (!c.hv) return hubGrid(c.all, c.allF, perBarA());
    const h = hubBody(c.hv, c.hv === 'cmp2' ? c.all : c.allF, c.r1, c.cols);
    return `<div class="hubc${S.hanim === 'in' ? ' anim-in' : ''}">${h.replace('</h2>', '</h2>' + perBarA())}</div>`;
  }
  if (k === 'col') return colCard(c.t, c.vis);
  if (k === 'ind') return has && c.D ? indicatori(c.D, c.all) : '';
  if (k === 'val') return valoriCard(c.vis);
  if (k === 'alb') return c.pr ? c.pr.tree : '';
  if (k === 'tor') return c.pr ? c.pr.pie : quadCard(c.Dz, c.single);
  return '';
}
/* Tasto "Modifica home" e, quando è aperto, l'elenco dei riquadri con frecce, Togli e Aggiungi */
function homeBtn() { return S.ro ? '' : `<button class="b sm" data-act="hedit">${S.hedit ? 'Fine modifica' : 'Modifica home'}</button>`; }
function homeBar() {
  if (S.ro || !S.hedit) return '';
  const mob = innerWidth < 1000, ok = k => !(mob && HOME_BLK[k].pc), lst = homeList().filter(ok), off = Object.keys(HOME_BLK).filter(k => ok(k) && !homeList().includes(k));
  const rows = lst.map((k, i) => `<div class="hrow"><b class="grow">${esc(HOME_BLK[k].n)}</b>${mob ? `<button class="b s sm" data-act="hup" data-v="${k}"${i ? '' : ' disabled'} aria-label="Sposta su">↑</button><button class="b s sm" data-act="hdn" data-v="${k}"${i < lst.length - 1 ? '' : ' disabled'} aria-label="Sposta giù">↓</button>` : ''}<button class="b s sm r" data-act="hrm" data-v="${k}">Togli</button></div>`).join('');
  return `<div class="card hed"><div class="chh"><h2>Modifica home</h2></div>${mob ? '' : '<p class="note" style="margin:0 0 8px">Trascina un riquadro per spostarlo; trascina l\'angolo in basso a destra per ridimensionarlo.</p>'}${rows || '<p class="note">Nessun riquadro: aggiungine uno.</p>'}${off.length ? `<div class="lbl" style="margin:10px 0 6px">Riquadri disponibili</div><div class="hadd">${off.map(k => `<button class="b s sm" data-act="hadd" data-v="${k}">＋ ${esc(HOME_BLK[k].n)}</button>`).join('')}</div>` : ''}<div class="acts" style="margin-top:10px"><button class="b s sm" data-act="hrip">Ripristina l'ordine iniziale</button><button class="b sm" data-act="hedit">Fine</button></div>${mob ? '<p class="note">Su telefono non compaiono Indicatori e Albero: restano nella home del computer.</p>' : ''}</div>`;
}
/* Riga per scegliere l'account nelle pagine Saldi, Portafogli, Beni, Passivi */
function accBar(fa) {
  const D = S.data; if (!D.accounts.length) return '';
  return `<div class="accs">${[['all', 'Aggregato'], ['main', D.nome], ...D.accounts.map(a => [a.id, a.nome])].map(([k, n]) => `<div class="acard${fa === k ? ' on' : ''}" data-act="facc" data-v="${esc(k)}"${k !== 'all' ? ` style="--at:${accTint(k)}"` : ''}><div class="lbl bd">${esc(n)}${k !== 'all' && isEsc(k) ? ' <small>(fuori)</small>' : ''}</div></div>`).join('')}</div>`;
}
/* Vista di un singolo account: stessa struttura dell'aggregato, ma con lo storico di quell'account (solo per disegnare la pagina) */
function conStoricoAcc(fn) {
  const D = S.data, fa = S.fAcc || 'all';
  if (fa === 'all' || !D) return fn();
  const h = histOf(D, fa); if (!h.length) return fn();
  S.data = { ...D, storico: h, _acc: fa };
  try { return fn(); } finally { S.data = D; }
}
/* Storico mese per mese di un singolo account */
function histCard(k) {
  const D = S.data, h = histOf(D, k); if (!h.length) return '';
  const rows = h.slice().reverse().slice(0, 24).map((s, i, a) => { const p = a[i + 1], d = p ? s.netto - p.netto : null; return `<div class="row"><div class="n">${esc(monthName(s.mese))}<small>attivi ${eur(s.attivi)} · passivi ${eur(s.passivi)}</small></div><div class="v ${cls(s.netto)}">${eur(s.netto)}${d !== null ? `<small class="${d >= 0 ? 'pos' : 'neg'}" style="display:block">${d >= 0 ? '+' : ''}${eur(d)}</small>` : ''}</div></div>`; }).join('');
  const noV = !D.voci.some(v => (v.account || 'main') === k);
  return `<div class="card"><h2 style="margin-top:0">Storico dell'account</h2>${noV ? `<p class="note" style="margin-top:0">Il patrimonio attuale è 0 perché non ci sono ancora conti, portafogli o beni: aggiungili dalle pagine Saldi, Portafogli e Beni. Lo storico qui sotto resta separato.</p>` : ''}${rows}</div>`;
}
const panTop = (name, title, btn) => `<div class="ptop"><h2>${title || 'Panoramica'} · ${esc(name)}</h2><div class="pbtn">${btn !== undefined ? btn : '<button class="b sm" data-act="nv">Nuova voce</button>'}</div></div>`;

const compact = v => hideAmt() ? '•••' : new Intl.NumberFormat('it-IT', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
const shortM = k => { const [y, m] = k.split('-'); return MESI[+m - 1].slice(0, 3) + ' ' + y.slice(2); };


/* ---------- Portafogli: sottopagine Elenco e Bilanciamento ---------- */
function portSub() {
  const s = S.psub === 'bil' ? 'bil' : 'elenco';
  return `<div class="psubs"><button class="${s === 'elenco' ? 'on' : ''}" data-act="psub" data-v="elenco">Elenco</button><button class="${s === 'bil' ? 'on' : ''}" data-act="psub" data-v="bil">Bilanciamento</button></div>`;
}
const BCOL = ['#378ADD', '#1D9E75', '#BA7517', '#7F77DD', '#D85A30', '#D4537E', '#888780', '#639922'];
const bP1 = v => v.toFixed(1).replace('.', ',') + '%';
/* Calcolo del bilanciamento di un account: ogni numero deriva da portafogli, prezzi e obiettivi */
function bilCalc() {
  const D = S.data, acc = S.bacc, ports = D.voci.filter(v => isPort(v) && accKey(v) === acc);
  const saved = (D.bil && D.bil[acc]) || {}, tgm = S.btg || saved, cur = {};
  ports.forEach(v => (v.prodotti || []).forEach(p => { const c = p.classe || 'Altro'; cur[c] = (cur[c] || 0) + prodVal(p); }));
  const V = Object.values(cur).reduce((s, x) => s + x, 0), Xr = pnum(S.bamt || ''), X = isFinite(Xr) && Xr > 0 ? Xr : 0, full = S.bmode === 'full';
  const cls = ASSET.filter(c => cur[c] > 0 || tgm[c] !== undefined);
  const tg = c => { const x = Number(tgm[c]); return isFinite(x) && x > 0 ? x : 0; }, sumT = cls.reduce((s, c) => s + tg(c), 0), okT = Math.abs(sumT - 100) < 0.05;
  const T = V + X, rows = cls.map(c => ({ c, cur: cur[c] || 0, tg: tg(c) }));
  rows.forEach(r => { r.pct = V > 0 ? r.cur / V * 100 : 0; r.dev = r.pct - r.tg; r.want = T * r.tg / 100; r.buy = 0; r.sell = 0; });
  if (okT && V > 0) {
    if (full) rows.forEach(r => { const d = r.want - r.cur; if (d > 0) r.buy = d; else r.sell = -d; });
    else if (X > 0) { const df = rows.map(r => Math.max(0, r.want - r.cur)), S0 = df.reduce((s, x) => s + x, 0); if (S0 > 0) rows.forEach((r, i) => { r.buy = df[i] * X / S0; }); }
  }
  /* prodotti di ogni classe (con portafoglio, prezzo e valore) */
  const prodOf = c => { const m = new Map(); ports.forEach(v => (v.prodotti || []).forEach(p => { if ((p.classe || 'Altro') !== c || !p.isin) return; const k = String(p.isin).toUpperCase(), pr = S.prezzi && S.prezzi.map[k] > 0 ? S.prezzi.map[k] : (p.pmc > 0 ? p.pmc : 0), val = prodVal(p), x = m.get(k); if (!x) m.set(k, { isin: k, nome: p.nome || '', nom: !!p.nom, price: pr, tot: val, port: v, pv: val, q: Number(p.quote) || 0, p: [{ v, p }] }); else { x.tot += val; x.p.push({ v, p }); if (val > x.pv) { x.pv = val; x.port = v; } } })); return [...m.values()].sort((a, b) => b.tot - a.tot); };
  const ops = [], notes = [];
  rows.forEach(r => {
    r.prods = prodOf(r.c);
    if (r.buy > 0.5) {
      const pk = (S.bpick || {})[r.c], cand = r.prods, ch = pk && pk !== '__new' ? cand.find(x => x.isin === pk) : (pk === '__new' || !cand.length ? null : cand[0]);
      r.pick = ch ? ch.isin : '__new';
      let isin, price, nom, port, nome = '';
      if (ch) { isin = ch.isin; price = ch.price; nom = ch.nom; port = ch.port; nome = ch.nome; }
      else {
        const n = (S.bnew || {})[r.c] || {}; isin = String(n.isin || '').trim().toUpperCase(); const sp = S.prezzi && S.prezzi.map[isin], pp = pnum(n.price || '');
        price = sp > 0 ? sp : (isFinite(pp) && pp > 0 ? pp : 0); nom = !!n.nom; port = ports.find(v => v.id === n.port) || ports[0]; r.nw = { isin, sheet: sp > 0, price, nom, port: port && port.id };
      }
      r.ok = !!(isin && /^[A-Z0-9]{12}$/.test(isin) && price > 0 && port);
      if (r.ok) { const unit = nom ? price / 100 : price, q = Math.floor(r.buy / unit + 1e-9), amt = q * unit; r.op = { buy: true, c: r.c, isin, nome, price, nom, port, q, amt, nuovo: !ch }; r.amt = amt; if (q > 0) ops.push(r.op); }
      else notes.push(r.c);
    }
    if (r.sell > 0.5) {
      const hs = [];
      r.prods.forEach(x => x.p.forEach(({ v, p }) => { const pr = S.prezzi && S.prezzi.map[x.isin] > 0 ? S.prezzi.map[x.isin] : 0; if (pr > 0 && p.quote > 0) hs.push({ v, p, pr, val: prodVal(p), nom: !!p.nom, isin: x.isin, nome: x.nome }); }));
      const tv = hs.reduce((s, h) => s + h.val, 0); r.sells = [];
      if (tv > 0) hs.forEach(h => { const share = Math.min(h.val, r.sell * h.val / tv), unit = h.nom ? h.pr / 100 : h.pr, q = Math.min(Number(h.p.quote), Math.floor(share / unit + 1e-9)); if (q <= 0) return; const gain = h.p.pmc > 0 ? Math.max(0, (h.pr - h.p.pmc) * q * (h.nom ? .01 : 1)) : 0, imp = gain * prodAliq(h.p) / 100, o = { buy: false, c: r.c, isin: h.isin, nome: h.nome, price: h.pr, nom: h.nom, port: h.v, q, amt: q * unit, imp }; r.sells.push(o); ops.push(o); });
      r.sellAmt = r.sells.reduce((s, o) => s + o.amt, 0);
      if (!r.sells.length) notes.push(r.c);
    }
    r.after = r.cur + (r.amt || 0) - (r.sellAmt || 0);
  });
  const buyT = ops.filter(o => o.buy).reduce((s, o) => s + o.amt, 0), sellT = ops.filter(o => !o.buy).reduce((s, o) => s + o.amt, 0), tax = ops.filter(o => !o.buy).reduce((s, o) => s + o.imp, 0);
  const Va = rows.reduce((s, r) => s + r.after, 0); rows.forEach(r => { r.apct = Va > 0 ? r.after / Va * 100 : 0; });
  return { acc, ports, rows, V, X, T, full, okT, sumT, ops, notes, buyT, sellT, tax, cash: X + sellT - buyT, saved };
}
function pageBilanc() {
  const D = S.data, accs = accList(D).filter(([k]) => D.voci.some(v => isPort(v) && accKey(v) === k));
  if (!accs.length) return '<div class="card"><h2>Bilanciamento</h2><p class="note">Serve almeno un portafoglio con dei prodotti: crealo dalla scheda Elenco.</p></div>';
  if (!S.bacc || !accs.some(([k]) => k === S.bacc)) S.bacc = (S.fAcc && accs.some(([k]) => k === S.fAcc) ? S.fAcc : accs[0][0]);
  const c = bilCalc(), many = c.ports.length > 1, full = c.full, ro = !!S.ro;
  const chips = accs.length > 1 ? `<div class="accs">${accs.map(([k, n]) => `<div class="acard${S.bacc === k ? ' on' : ''}" data-act="bacc" data-v="${esc(k)}" style="--at:${accTint(k)}"><div class="lbl bd">${esc(n)}</div></div>`).join('')}</div>` : '';
  const modes = `<div class="bmodes"><button class="b ${full ? 's' : ''} sm" data-act="bmode" data-v="buy">Solo acquisti</button><button class="b ${full ? '' : 's'} sm" data-act="bmode" data-v="full">Anche vendite</button><label class="lbl bamt">${full ? 'Nuovo versamento €' : 'Importo da investire €'}<input class="bin" data-bil="amt" inputmode="decimal" value="${esc(S.bamt || '')}" placeholder="0"></label></div>`;
  const maxDev = c.rows.length && c.V > 0 ? Math.max(...c.rows.map(r => Math.abs(r.dev))) : 0;
  const k = `<div class="bk"><div><span>Portafoglio oggi</span><b>${eur(c.V)}</b></div><div><span>${full ? 'Dopo il versamento' : 'Dopo l\'acquisto'}</span><b>${eur(c.V + c.X)}</b></div><div><span>Scostamento massimo</span><b>${c.okT ? bP1(maxDev).replace('%', ' punti') : '—'}</b></div></div>`;
  const used = c.rows.map(r => r.c), free = ASSET.filter(a => !used.includes(a));
  const trs = c.rows.map(r => `<tr><td>${esc(r.c)}</td><td>${eur(r.cur)}</td><td>${bP1(r.pct)}</td><td><input class="bin bt" data-bil="tg" data-c="${esc(r.c)}" inputmode="decimal" value="${r.tg ? String(r.tg).replace('.', ',') : ''}" placeholder="0"> %${r.cur <= 0 ? ` <button class="b s sm r" data-act="bdel" data-v="${esc(r.c)}" aria-label="Togli la classe">✕</button>` : ''}</td><td class="${c.okT && Math.abs(r.dev) >= 0.05 ? (r.dev > 0 ? 'neg' : 'pos') : ''}">${c.okT ? (r.dev >= 0 ? '+' : '−') + Math.abs(r.dev).toFixed(1).replace('.', ',') : '—'}</td><td>${r.buy > 0.5 ? '<b>' + eur(r.amt != null ? r.amt : r.buy) + '</b>' : r.sell > 0.5 ? '' : '—'}</td>${full ? `<td>${r.sell > 0.5 ? '<b>' + eur(r.sellAmt || 0) + '</b>' : '—'}</td>` : ''}<td>${c.okT && c.V > 0 ? bP1(r.apct) : '—'}</td></tr>`).join('');
  const tbl = `<div class="card"><h3>Obiettivo per classe di investimento</h3><div class="btw"><table class="bt2"><tr><th>Classe</th><th>Oggi</th><th>Oggi %</th><th>Obiettivo</th><th>Scostamento</th><th>Da comprare</th>${full ? '<th>Da vendere</th>' : ''}<th>Dopo</th></tr>${trs}<tr class="tt"><td>Totale</td><td>${eur(c.V)}</td><td>100%</td><td class="${c.okT ? '' : 'neg'}">${bP1(c.sumT)}</td><td></td><td>${eur(c.buyT)}</td>${full ? `<td>${eur(c.sellT)}</td>` : ''}<td></td></tr></table></div>
    <div class="bfoot">${free.length ? `<select data-act="baddc"><option value="">＋ Aggiungi classe…</option>${free.map(a => `<option>${esc(a)}</option>`).join('')}</select>` : ''}<span class="lbl">${c.okT ? 'Gli obiettivi sommano 100%.' : 'Gli obiettivi devono sommare 100%: ora ' + bP1(c.sumT) + '.'}</span><span class="grow"></span>${ro ? '' : `<button class="b sm" data-act="bsave"${c.okT ? '' : ' disabled'}>Salva obiettivi</button>`}</div></div>`;
  const bars = c.V > 0 && c.okT ? `<div class="card"><h3>Oggi, dopo e obiettivo</h3>${[['Oggi', r => r.pct], ['Dopo', r => r.apct], ['Obiettivo', r => r.tg]].map(([l, f]) => `<div class="lbl" style="margin-top:6px">${l}</div><div class="bbar">${c.rows.map(r => `<div style="width:${Math.max(0, f(r)).toFixed(2)}%;background:${BCOL[ASSET.indexOf(r.c) % 8]}" data-tip="${esc(r.c + ' · ' + bP1(f(r)))}"></div>`).join('')}</div>`).join('')}<div class="blg">${c.rows.map(r => `<span><i style="background:${BCOL[ASSET.indexOf(r.c) % 8]}"></i>${esc(r.c)}</span>`).join('')}</div></div>` : '';
  /* prodotti da comprare */
  const buyRows = c.rows.filter(r => r.buy > 0.5).map(r => {
    const sel = `<select data-bil="pick" data-c="${esc(r.c)}">${r.prods.map(x => `<option value="${esc(x.isin)}" ${r.pick === x.isin ? 'selected' : ''}>${esc(x.nome || x.isin)}</option>`).join('')}<option value="__new" ${r.pick === '__new' ? 'selected' : ''}>Altro prodotto (ISIN)…</option></select>`;
    let det;
    if (r.pick === '__new') {
      const n = (S.bnew || {})[r.c] || {}, w = r.nw || {};
      det = `<div class="bnew"><input class="bin" data-bil="nisin" data-c="${esc(r.c)}" maxlength="12" placeholder="ISIN" value="${esc(n.isin || '')}" autocapitalize="characters">${w.sheet ? `<span class="lbl">Prezzo nel foglio: ${nfm(w.price)}</span>` : `<input class="bin" data-bil="nprice" data-c="${esc(r.c)}" inputmode="decimal" placeholder="Prezzo" value="${esc(n.price || '')}">`}<label class="nl"><input type="checkbox" data-bil="nnom" data-c="${esc(r.c)}" ${n.nom ? 'checked' : ''}>Obbligazione (prezzo in %)</label>${many ? `<select data-bil="nport" data-c="${esc(r.c)}">${c.ports.map(v => `<option value="${v.id}" ${w.port === v.id ? 'selected' : ''}>${esc(v.nome)}</option>`).join('')}</select>` : ''}</div>`;
    }
    const o = r.op;
    return `<tr><td>${esc(r.c)}</td><td class="bsel">${sel}${det || ''}</td><td>${o ? (o.nom ? nfm(o.price) + ' %' : nfm(o.price)) : '—'}</td><td>${o ? nfm(o.q) + (o.nom ? ' nom.' : '') : '—'}</td><td>${o ? '<b>' + eur(o.amt) + '</b>' : '<span class="lbl">Mancano i dati</span>'}</td></tr>`;
  }).join('');
  const sellRows = c.rows.flatMap(r => (r.sells || []).map(o => `<tr><td>${esc(r.c)}</td><td class="bsel">${esc(o.nome || o.isin)}${many ? `<small class="lbl" style="display:block">${esc(o.port.nome)}</small>` : ''}</td><td>${o.nom ? nfm(o.price) + ' %' : nfm(o.price)}</td><td>${nfm(o.q)}${o.nom ? ' nom.' : ''}</td><td><b>${eur(o.amt)}</b>${o.imp > 0.5 ? `<small class="lbl" style="display:block">imposta ~${eur(o.imp)}</small>` : ''}</td></tr>`));
  const opsCard = c.okT && c.V > 0 && (buyRows || sellRows.length) ? `<div class="card"><h3>Operazioni suggerite</h3>
    ${buyRows ? `<div class="lbl" style="margin:0 0 4px">Da comprare</div><div class="btw"><table class="bt2 bops"><tr><th>Classe</th><th>Prodotto</th><th>Prezzo</th><th>Quote</th><th>Importo</th></tr>${buyRows}</table></div>` : ''}
    ${sellRows.length ? `<div class="lbl" style="margin:10px 0 4px">Da vendere</div><div class="btw"><table class="bt2 bops"><tr><th>Classe</th><th>Prodotto</th><th>Prezzo</th><th>Quote</th><th>Importo</th></tr>${sellRows.join('')}</table></div>` : ''}
    <div class="bfoot"><span class="lbl">Acquisti ${eur(c.buyT)}${c.sellT > 0 ? ' · vendite ' + eur(c.sellT) + ' · imposte stimate ' + eur(c.tax) : ''} · ${c.cash >= 0 ? 'resta non investito' : 'serve in più'} ${eur(Math.abs(c.cash))}</span><span class="grow"></span></div>
    ${c.notes.length ? `<p class="note">Per ${esc(c.notes.join(', '))} non posso calcolare le quote: serve un prodotto con prezzo nel foglio.</p>` : ''}
    ${ro || !c.ops.length ? '' : `<label class="nl" style="margin:8px 0"><input type="checkbox" data-bil="li" ${S.bli === false ? '' : 'checked'}>Aggiorna la liquidità del conto con lo stesso nome del portafoglio</label><div class="acts"><button class="b" data-act="bilok">Registra le operazioni</button></div>`}
    <p class="note">Le quote sono arrotondate per difetto al pezzo intero. Le imposte sono una stima sulle plusvalenze, con l'aliquota di ogni prodotto.</p></div>` : '';
  const hint = !c.okT ? '<p class="note">Scrivi gli obiettivi per classe e fai in modo che sommino 100%: poi compaiono le operazioni.</p>' : (!full && c.X <= 0 ? '<p class="note">Scrivi l\'importo da investire: l\'app lo ripartisce sulle classi più sotto obiettivo.</p>' : (c.okT && !c.ops.length && c.V > 0 ? '<p class="note">Il portafoglio è già in linea con gli obiettivi: nessuna operazione.</p>' : ''));
  return `<div class="bil">${chips}${modes}${k}${tbl}${hint}${bars}${opsCard}</div>`;
}
const bilDraft = () => S.btg || { ...(((S.data.bil || {})[S.bacc]) || {}) };
