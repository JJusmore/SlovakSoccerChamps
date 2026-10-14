'use strict';
// ─── Prestupová stránka: trh, filtre, odporúčania, sledovaní, môj káder ───

const TF_DEFAULT = () => ({
  q: '', pos: [], arch: '', trait: '', foot: '', lvlMin: 0, lvlMax: 9, reg: '', ageMin: 16, ageMax: 40, ovrMin: 1, ovrMax: 99, potMin: 1, price: 16,
  attr: -1, attrMin: 60, free: false, scouted: false, unknown: false, expiring: false, wants: false, loanable: false, aff: false, svk: false, better: false,
});
UI.tf = Object.assign({ mode: 'market', sort: 'r', dir: -1, page: 0, per: 30, showF: false, preset: '' }, TF_DEFAULT());
UI.live = new Set(['tf_q', 'tf_rng']);
const PRICE_STEPS = [500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000, 1e6, 2e6, 5e6, 1e7, 2e7, 5e7, Infinity];

const TF_PRESETS = [
  ['rec', '🔥 Posily pre tím', { better: true, aff: true }, 'gain'],
  ['talent', '🌱 Talenty do 21', { ageMax: 21 }, 'p'],
  ['cheap', '💸 Lacné posily', { better: true, aff: true }, 'price', 1],
  ['exp', '📝 Končiace zmluvy', { expiring: true }, 'r'],
  ['free', '🆓 Voľní hráči', { free: true }, 'r'],
  ['loan', '🔄 Na hosťovanie', { loanable: true }, 'p'],
  ['wants', '😤 Chcú odísť', { wants: true }, 'r'],
  ['svk', '🇸🇰 Slováci', { svk: true }, 'r'],
];

// ── Pomocné výpočty ─────────────────────────────────────────────
function teamNeeds() {
  const u = userTeam(), slots = FORMATIONS[u.form];
  const by = { GK: [], DF: [], MF: [], FW: [] };
  u.lineup.forEach((id, i) => { const p = G.players[id]; if (p) by[slots[i][0]].push(p.r); });
  const ref = {}, avg = {};
  for (const k in by) {
    if (!by[k].length) { const sq = teamPlayers(u).filter(p => p.pos === k).map(p => p.r); by[k] = sq.length ? [Math.max(...sq)] : [0]; }
    ref[k] = Math.min(...by[k]); avg[k] = U.avg(by[k]);
  }
  const weakest = ['DF', 'MF', 'FW', 'GK'].sort((a, b) => avg[a] - avg[b])[0];
  return { ref, avg, weakest };
}
function gainFor(p, nd) { return Math.round(estR(p) - nd.ref[p.pos]); }
function dealRatio(p) { return p.tid < 0 ? 9 : playerValue(p) / Math.max(1, askingPrice(p)); }
function loanable(p, u) {
  if (p.tid < 0 || p.loan || p.age > 24) return false;
  const t = G.teams[p.tid];
  return t.lvl <= u.lvl && !(t.lineup || []).includes(p.id);
}
function potEst(p) { const r = potRange(p); return r ? (r[0] + r[1]) / 2 : estR(p); }

function activeFilterCount() {
  const f = UI.tf, d = TF_DEFAULT();
  let n = 0;
  for (const k in d) {
    if (Array.isArray(d[k])) { if (f[k].length) n++; }
    else if (k === 'attrMin') continue;
    else if (f[k] !== d[k]) n++;
  }
  return n;
}

function applyFilters(ps, u, nd) {
  const f = UI.tf;
  const q = U.plain(f.q.trim().toLowerCase());
  const maxP = PRICE_STEPS[f.price];
  return ps.filter(p => {
    const t = p.tid >= 0 ? G.teams[p.tid] : null;
    if (f.free && t) return false;
    if (f.pos.length && !f.pos.includes(p.pos) && !(know(p) >= 45 && (p.pos2 || []).some(x => f.pos.includes(x)))) return false;
    if (t && (t.lvl < f.lvlMin || t.lvl > f.lvlMax)) return false;
    if (f.reg && t && t.reg !== f.reg) return false;
    if (p.age < f.ageMin || p.age > f.ageMax) return false;
    const [lo, hi] = rRange(p);
    if (hi < f.ovrMin || lo > f.ovrMax) return false;
    if (f.potMin > 1) { const pr = potRange(p); if (!pr || pr[1] < f.potMin) return false; }
    if (f.svk && p.nat !== 'SVK') return false;
    if (f.scouted && know(p) < 70) return false;
    if (f.unknown && know(p) >= 45) return false;
    if (f.expiring && !(t && contractLeft(p) <= 1)) return false;
    if (f.wants && !(p.wo || p.listedAI)) return false;
    if (f.loanable && !loanable(p, u)) return false;
    if (f.arch && !(know(p) >= 70 && archName(p) === f.arch)) return false;
    if (f.trait && !(know(p) >= 70 && trLvl(p, f.trait) > 0)) return false;
    if (f.foot && !(know(p) >= 45 && (p.ft === f.foot || p.ft === 'B'))) return false;
    if (f.attr >= 0) { if (!attrsKnown(p) || p.pos === 'GK' !== (f.pos.length === 1 && f.pos[0] === 'GK')) return false; if (playerAttrs(p)[f.attr] < f.attrMin) return false; }
    if (q && !U.plain((p.fn + ' ' + p.ln).toLowerCase()).includes(q)) return false;
    const price = askingPrice(p);
    if (maxP !== Infinity && price > maxP) return false;
    if (f.aff && price > u.budget) return false;
    if (f.better && gainFor(p, nd) <= 0) return false;
    return true;
  });
}

function sortKey(nd) {
  return {
    r: p => estR(p), p: p => potEst(p), price: p => askingPrice(p), age: p => p.age, name: p => U.plain(p.ln + ' ' + p.fn),
    k: p => know(p), lvl: p => (p.tid >= 0 ? -G.teams[p.tid].lvl : -10), ct: p => (p.tid >= 0 ? p.ce : 0),
    vfm: p => estR(p) / Math.log10(askingPrice(p) + 10), gain: p => gainFor(p, nd) * 1000 - askingPrice(p) / 1e6,
  }[UI.tf.sort] || (p => estR(p));
}

// ── Riadok hráča ────────────────────────────────────────────────
function avatarCv(p, size = 44) {
  return `<canvas class="av" width="${size * 2}" height="${size * 2}" style="width:${size}px;height:${size}px" data-pid="${p.id}"></canvas>`;
}
function paintAvatars(root) {
  root.querySelectorAll('canvas.av').forEach(cv => {
    const p = G.players[+cv.dataset.pid]; if (!p) return;
    const t = p.tid >= 0 ? G.teams[p.tid] : null;
    const kit = p.pos === 'GK' ? { p: '#2ecc71', s: '#111', sh: '#1a1a1a', pat: 'plain', so: '#2ecc71' } : t ? t.kit : { p: '#8a8fa8', s: '#ffffff', sh: '#444', pat: 'plain' };
    const W = cv.width, ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, W, W);
    ctx.save(); ctx.beginPath(); ctx.arc(W / 2, W / 2, W / 2, 0, Math.PI * 2); ctx.clip();
    const g = ctx.createLinearGradient(0, 0, 0, W);
    g.addColorStop(0, t ? U.shade(t.kit.p === '#ffffff' ? t.kit.s : t.kit.p, -0.35) : '#3a4170'); g.addColorStop(1, '#141a43');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, W);
    const u = W * 0.476;
    drawFigure(ctx, W / 2, W * 1.2, u, kit, playerLook(p), { face: 1 });
    ctx.restore();
  });
}

function marketRow(p, opts = {}) {
  const u = userTeam();
  const t = p.tid >= 0 ? G.teams[p.tid] : null;
  const own = p.tid === u.id || (p.loan && p.loan.from === u.id);
  const nd = opts.nd || teamNeeds();
  const price = own ? playerValue(p) : askingPrice(p);
  const can = own || price <= u.budget;
  const k = know(p);
  const gain = own ? null : gainFor(p, nd);
  const deal = !own && t && dealRatio(p) >= 1.12;
  const short = (G.short || []).includes(p.id);
  const sub = [k >= 70 ? `<i class="arch">${archName(p)}</i>` : '', `${p.age} r.`, t ? `${crestSVG(t, 15)} ${U.esc(t.short)} <span class="lvlt ${t.fx ? 'fx' : ''}">${t.fx || t.lvl + '.'}</span>` : '<span class="freet">voľný hráč</span>', ctTxt(p)].filter(Boolean).join(' · ');
  return `<div class="mr ${short ? 'starred' : ''}" data-a="player" data-id="${p.id}">
${avatarCv(p)}
<div class="mr-main"><div class="mr-name">${dpBadge(p)}${k >= 45 ? pos2Badges(p, true) : ''}<b>${U.esc(pFull(p))}</b>${flag(p.nat)}${pBadges(p)}${k >= 45 ? footTag(p) : ''}${traitIcons(p)}</div><div class="mr-sub">${sub}</div></div>
<div class="mr-c mr-ovr">${ovrTxt(p)}</div>
<div class="mr-c mr-pot">${potTxt(p, true)}</div>
<div class="mr-c mr-kn" title="Preskautované ${k} %">${knowBar(p)}<small>${k}%</small></div>
<div class="mr-c mr-gain">${gain == null ? '' : `<span class="gainb ${gain > 0 ? 'up' : gain < -6 ? 'dn' : ''}" title="Rozdiel oproti tvojmu najslabšiemu hráčovi v zostave na tomto poste">${gain > 0 ? '+' : ''}${gain}</span>`}</div>
<div class="mr-c mr-price"><b class="${can ? '' : 'no'}">${p.tid < 0 ? 'zadarmo' : U.money(price)}</b><small>${deal ? '<i class="dealt">výhodné</i>' : (p.w ? wk(p.w) : '')}</small></div>
${opts.noAct ? '' : `<div class="mr-act">
<button class="ic ${short ? 'on' : ''}" data-a="shortP" data-id="${p.id}" title="${short ? 'Nesledovať' : 'Sledovať'}">${short ? '★' : '☆'}</button>
${!own && k < 100 ? `<button class="ic" data-a="scoutP" data-id="${p.id}" title="Skautovať" ${(G.scoutQueue || []).includes(p.id) ? 'disabled' : ''}>🔍</button>` : '<span class="ic-sp"></span>'}
${own ? '' : `<button class="btn btn-go sm" data-a="negotiate" data-id="${p.id}">${p.tid < 0 ? 'Podpísať' : 'Ponuka'}</button>`}</div>`}</div>`;
}

// ── Ovládacie prvky filtrov ─────────────────────────────────────
function dualRange(key, min, max, lo, hi, fmt) {
  const a = (lo - min) / (max - min) * 100, b = (hi - min) / (max - min) * 100;
  return `<div class="dr"><div class="dr-track"><i class="dr-fill" id="fill_${key}" style="left:${a}%;right:${100 - b}%"></i></div>
<input type="range" min="${min}" max="${max}" step="1" value="${lo}" data-c="tf_rng" data-k="${key}" data-e="lo" aria-label="${key} od">
<input type="range" min="${min}" max="${max}" step="1" value="${hi}" data-c="tf_rng" data-k="${key}" data-e="hi" aria-label="${key} do"></div>
<div class="dr-lbl" id="lbl_${key}">${fmt(lo, hi)}</div>`;
}
function oneRange(key, min, max, v, fmt) {
  return `<input type="range" class="sr" min="${min}" max="${max}" step="1" value="${v}" data-c="tf_rng" data-k="${key}" data-e="one"><div class="dr-lbl" id="lbl_${key}">${fmt(v)}</div>`;
}
const RFMT = {
  age: (a, b) => `${a} – ${b} rokov`, ovr: (a, b) => `${a} – ${b}`, lvl: (a, b) => { const n = l => (l === 0 ? 'Zahraničie' : l + '. liga'); return a === b ? n(a) : `${n(a)} – ${n(b)}`; },
  pot: v => (v <= 1 ? 'bez limitu' : `aspoň ${v}`), price: v => (PRICE_STEPS[v] === Infinity ? 'bez limitu' : `do ${U.money(PRICE_STEPS[v])}`), attr: v => `aspoň ${v}`,
};

function filterPanel() {
  const f = UI.tf;
  const posSel = f.pos;
  const archList = [...new Set((posSel.length ? posSel : ['GK', 'DF', 'MF', 'FW']).flatMap(ps => ARCHETYPES[ps].map(a => a[0])))];
  const trList = Object.keys(TRAITS).filter(k => !posSel.length || TRAITS[k].pos.some(x => posSel.includes(x)));
  const attrNames = posSel.length === 1 && posSel[0] === 'GK' ? ATTR_GK_FULL : ATTR_OUT_FULL;
  const flags = [['free', 'Voľní hráči'], ['better', 'Posila pre môj tím'], ['aff', 'Cenovo dostupní'], ['expiring', 'Končiaca zmluva'], ['wants', 'Chcú odísť / na predaj'], ['loanable', 'Dá sa požičať'], ['scouted', 'Preskautovaní (70 %+)'], ['unknown', 'Neznámi (na skauting)'], ['svk', 'Len Slováci']];
  const n = activeFilterCount();
  return `<aside class="tf-side ${f.showF ? 'open' : ''}">
<div class="tf-side-h"><b>Filtre</b>${n ? `<span class="badge">${n}</span>` : ''}<button class="link" data-a="tfReset">Zrušiť všetko</button></div>
<div class="fgrp"><label>Meno</label><input class="inp" placeholder="Hľadať hráča…" value="${U.esc(f.q)}" data-c="tf_q"></div>
<div class="fgrp"><label>Post</label><div class="seg">${['GK', 'DF', 'MF', 'FW'].map(ps => `<button class="segb pos-${ps} ${posSel.includes(ps) ? 'on' : ''}" data-a="tfPos" data-v="${ps}">${POS_NAME_SK[ps]}</button>`).join('')}</div></div>
<div class="fgrp"><label>Štýl hry <small>(preskautovaní 70 %+)</small></label><select class="inp" data-c="tf_sel" data-k="arch"><option value="">Akýkoľvek</option>${archList.map(a => `<option ${f.arch === a ? 'selected' : ''}>${a}</option>`).join('')}</select></div>
<div class="fgrp"><label>Špecialita <small>(preskautovaní 70 %+)</small></label><select class="inp" data-c="tf_sel" data-k="trait"><option value="">Akákoľvek</option>${trList.map(k => `<option value="${k}" ${f.trait === k ? 'selected' : ''}>${TRAITS[k].ic} ${TRAITS[k].n}</option>`).join('')}</select></div>
<div class="fgrp"><label>Silnejšia noha</label><div class="seg">${[['', 'Všetky'], ['R', 'Pravá'], ['L', 'Ľavá'], ['B', 'Obe']].map(([v, nm]) => `<button class="segb ${f.foot === v ? 'on' : ''}" data-a="tfFoot" data-v="${v}">${nm}</button>`).join('')}</div></div>
<div class="fgrp"><label>Súťaž</label>${dualRange('lvl', 0, 9, f.lvlMin, f.lvlMax, RFMT.lvl)}</div>
<div class="fgrp"><label>Región</label><div class="seg">${[['', 'Všetky'], ['Z', 'Západ'], ['S', 'Stred'], ['V', 'Východ']].map(([v, nm]) => `<button class="segb ${f.reg === v ? 'on' : ''}" data-a="tfReg" data-v="${v}">${nm}</button>`).join('')}</div></div>
<div class="fgrp"><label>Vek</label>${dualRange('age', 16, 40, f.ageMin, f.ageMax, RFMT.age)}</div>
<div class="fgrp"><label>Sila (OVR)</label>${dualRange('ovr', 1, 99, f.ovrMin, f.ovrMax, RFMT.ovr)}</div>
<div class="fgrp"><label>Potenciál <small>(známy)</small></label>${oneRange('pot', 1, 95, f.potMin, RFMT.pot)}</div>
<div class="fgrp"><label>Maximálna cena</label>${oneRange('price', 0, PRICE_STEPS.length - 1, f.price, RFMT.price)}</div>
<div class="fgrp"><label>Atribút <small>(len preskautovaní)</small></label><select class="inp" data-c="tf_sel" data-k="attr"><option value="-1">— žiadny —</option>${attrNames.map((a, i) => `<option value="${i}" ${f.attr === i ? 'selected' : ''}>${a}</option>`).join('')}</select>
${f.attr >= 0 ? oneRange('attr', 30, 95, f.attrMin, RFMT.attr) : ''}</div>
<div class="fgrp"><label>Stav</label><div class="tgls">${flags.map(([k, nm]) => `<label class="tgl"><input type="checkbox" data-c="tf_flag" data-k="${k}" ${f[k] ? 'checked' : ''}><i></i><span>${nm}</span></label>`).join('')}</div></div>
</aside>`;
}

function recoCards(nd) {
  const u = userTeam(), w = windowNow().open;
  const cands = [];
  for (const p of G.players) {
    if (!p || p.tid === u.id || p.loan || know(p) < 45) continue;
    if (p.tid >= 0 && !w) continue;
    const g = gainFor(p, nd);
    if (g <= 0) continue;
    const price = askingPrice(p) || signingBonus(p);
    if (price > u.budget) continue;
    if (transferCheck(p)) continue;
    cands.push([g * 4 + (p.age <= 23 ? 2 : 0) + (p.tid < 0 ? 2 : 0) - price / Math.max(1000, u.budget) * 5 + Math.min(3, dealRatio(p)), p, g, price]);
  }
  cands.sort((a, b) => b[0] - a[0]);
  const top = cands.slice(0, 6);
  if (!top.length) return `<div class="reco-empty">Teraz žiadna vhodná posila</div>`;
  return `<div class="reco">${top.map(([, p, g, price]) => { const t = p.tid >= 0 ? G.teams[p.tid] : null; return `<div class="rc" data-a="player" data-id="${p.id}">
${avatarCv(p, 52)}<div class="rc-gain">+${g}</div>
<b>${U.esc(pName(p))}</b><small>${POS_NAME_SK[p.pos]} · ${p.age} r.</small>
<div class="rc-club">${t ? crestSVG(t, 14) + ' ' + U.esc(t.short) : 'voľný'}</div>
<div class="rc-row">${ovrTxt(p)}${potTxt(p)}</div>
<div class="rc-price">${p.tid < 0 ? 'zadarmo' : U.money(price)}</div>
<button class="btn btn-go sm" data-a="negotiate" data-id="${p.id}">${p.tid < 0 ? 'Podpísať' : 'Ponuka'}</button></div>`; }).join('')}</div>`;
}

function marketDash(nd) {
  const u = userTeam(), wb = weeklyBalance(), sq = teamPlayers(u).length;
  const offers = (G.inbox || []).filter(m => m.type === 'offer' && m.status === 'open').length;
  return `<div class="mdash">
<div class="md"><small>Na prestupy</small><b class="${tbLeft() <= 0 ? 'neg' : 'acc'}">${U.money(Math.max(0, tbLeft()))}</b><small class="md-sub">rozpočet ${U.money(u.budget)}</small></div>
<div class="md"><small>Týždenná bilancia</small><b class="${wb < 0 ? 'neg' : 'pos'}">${U.money(wb)}</b></div>
<div class="md"><small>Káder</small><b>${sq}<span class="muted">/30</span></b></div>
<div class="md"><small>Ponuky na tvojich hráčov</small><b>${offers ? `<button class="link big" data-a="tfMode" data-v="offers">${offers} ›</button>` : '0'}</b></div>
<div class="md"><small>Najslabší post</small><b>${posBadge(nd.weakest)} ${POS_NAME_SK[nd.weakest]} <span class="muted">${Math.round(nd.avg[nd.weakest])}</span></b></div>
<div class="md">${windowPill()}</div></div>`;
}

// ── Záložka ─────────────────────────────────────────────────────
function tabTransfers() {
  const f = UI.tf;
  const nd = teamNeeds();
  const modes = [['market', '🔎 Trh hráčov'], ['short', `★ Sledovaní (${(G.short || []).length})`], ['offers', `💰 Ponuky (${(G.inbox || []).filter(m => m.type === 'offer' && m.status === 'open').length})`], ['mine', '👕 Môj káder'], ['history', '📜 História']];
  const tabs = `<div class="tf-modes">${modes.map(([k, n]) => `<button class="tfm ${f.mode === k ? 'on' : ''}" data-a="tfMode" data-v="${k}">${n}</button>`).join('')}</div>`;
  const dash = marketDash(nd);
  if (f.mode === 'short') return `${dash}<div class="card">${tabs}${shortlistView(nd)}</div>`;
  if (f.mode === 'offers') return `${dash}<div class="card">${tabs}${offersList(true)}</div>`;
  if (f.mode === 'mine') return `${dash}<div class="card">${tabs}${mySquadMarket()}</div>`;
  if (f.mode === 'history') return `${dash}<div class="card">${tabs}${transferHistory()}</div>`;
  const n = activeFilterCount();
  return `${dash}<div class="card">${tabs}
<div class="reco-wrap"><div class="card-h">🔥 Odporúčané posily</div>${recoCards(nd)}</div>
<div class="presets">${TF_PRESETS.map(([k, nm]) => `<button class="pst ${f.preset === k ? 'on' : ''}" data-a="tfPreset" data-v="${k}">${nm}</button>`).join('')}</div>
<button class="btn btn-ghost sm tf-ftoggle" data-a="tfFilters">⚙ Filtre${n ? ` (${n})` : ''}</button>
<div class="tf-layout">${filterPanel()}<div class="tf-res" id="tf-list"></div></div></div>`;
}

function sortHead(k, label, cls = '') {
  const f = UI.tf, on = f.sort === k;
  return `<button class="sh ${cls} ${on ? 'on' : ''}" data-a="tfSortCol" data-k="${k}">${label}${on ? (f.dir < 0 ? ' ▾' : ' ▴') : ''}</button>`;
}

function renderTransferList() {
  const el = document.getElementById('tf-list');
  if (!el) return;
  const f = UI.tf, u = userTeam(), nd = teamNeeds();
  const base = G.players.filter(p => p && p.tid !== u.id && !(p.loan && p.loan.from === u.id));
  const ps = applyFilters(base, u, nd);
  const key = sortKey(nd), dir = f.dir;
  const keyed = ps.map(p => [key(p), p]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0) * dir || b[1].r - a[1].r).map(x => x[1]);
  const per = f.per, pages = Math.max(1, Math.ceil(keyed.length / per));
  f.page = U.clamp(f.page, 0, pages - 1);
  const from = f.page * per, slice = keyed.slice(from, from + per);
  const pg = [];
  for (let i = 0; i < pages; i++) if (i < 2 || i >= pages - 2 || Math.abs(i - f.page) <= 2) pg.push(i); else if (pg[pg.length - 1] !== -1) pg.push(-1);
  el.innerHTML = `<div class="tf-res-h"><span><b>${keyed.length}</b> hráčov${keyed.length ? ` · zobrazené ${from + 1}–${from + slice.length}` : ''}</span>
<span class="tf-res-ctl"><select class="inp sm" data-c="tf_sort"><option value="r" ${f.sort === 'r' ? 'selected' : ''}>Sila</option><option value="p" ${f.sort === 'p' ? 'selected' : ''}>Potenciál</option><option value="gain" ${f.sort === 'gain' ? 'selected' : ''}>Prínos pre tím</option><option value="vfm" ${f.sort === 'vfm' ? 'selected' : ''}>Cena / výkon</option><option value="price" ${f.sort === 'price' ? 'selected' : ''}>Cena</option><option value="age" ${f.sort === 'age' ? 'selected' : ''}>Vek</option><option value="ct" ${f.sort === 'ct' ? 'selected' : ''}>Zmluva</option><option value="k" ${f.sort === 'k' ? 'selected' : ''}>Znalosť</option><option value="name" ${f.sort === 'name' ? 'selected' : ''}>Meno</option></select>
<button class="btn btn-ghost sm" data-a="tfDir" title="Smer zoradenia">${f.dir < 0 ? '▾ zostupne' : '▴ vzostupne'}</button>
<select class="inp sm" data-c="tf_per">${[20, 30, 50, 100].map(v => `<option ${v === per ? 'selected' : ''}>${v}</option>`).join('')}</select></span></div>
<div class="mr-head"><span class="mh-av"></span>${sortHead('name', 'Hráč', 'mh-main')}${sortHead('r', 'OVR', 'mh-c')}${sortHead('p', 'POT', 'mh-c')}${sortHead('k', 'Znalosť', 'mh-c mh-kn')}${sortHead('gain', 'Prínos', 'mh-c mh-gain')}${sortHead('price', 'Cena', 'mh-c mh-price')}<span class="mh-act"></span></div>
<div class="mr-list">${slice.map(p => marketRow(p, { nd })).join('') || '<div class="reco-empty">Nikto nevyhovuje filtrom. Skús ich uvoľniť alebo klikni na „Zrušiť všetko“.</div>'}</div>
${pages > 1 ? `<div class="pager">${f.page > 0 ? `<button class="pgb" data-a="tfPage" data-v="${f.page - 1}">‹</button>` : ''}${pg.map(i => i < 0 ? '<span class="pgd">…</span>' : `<button class="pgb ${i === f.page ? 'on' : ''}" data-a="tfPage" data-v="${i}">${i + 1}</button>`).join('')}${f.page < pages - 1 ? `<button class="pgb" data-a="tfPage" data-v="${f.page + 1}">›</button>` : ''}</div>` : ''}
`;
  paintAvatars(el);
}

function shortlistView(nd) {
  const ps = (G.short || []).map(id => G.players[id]).filter(Boolean);
  if (!ps.length) return '<div class="reco-empty">Zatiaľ nikoho nesleduješ. Na trhu klikni na ☆ pri hráčovi.</div>';
  const cmp = ps.slice(0, 8);
  const rows = [
    ['Klub', p => (p.tid >= 0 ? U.esc(G.teams[p.tid].short) + ` <span class="lvlt">${G.teams[p.tid].fx || G.teams[p.tid].lvl + '.'}</span>` : 'voľný'), null],
    ['Vek', p => p.age, p => -p.age],
    ['Sila', p => ovrTxt(p), p => estR(p)],
    ['Potenciál', p => potTxt(p), p => { const r = potRange(p); return r ? (r[0] + r[1]) / 2 : -1; }],
    ['Prínos', p => { const g = gainFor(p, nd); return `<span class="gainb ${g > 0 ? 'up' : ''}">${g > 0 ? '+' : ''}${g}</span>`; }, p => gainFor(p, nd)],
  ];
  for (let i = 0; i < 6; i++) rows.push([ATTR_OUT_FULL[i] + (i === 0 ? '' : ''), p => (attrsKnown(p) ? (p.pos === 'GK' ? `<span class="muted">${playerAttrs(p)[i]}</span>` : playerAttrs(p)[i]) : '?'), p => (attrsKnown(p) && p.pos !== 'GK' ? playerAttrs(p)[i] : -1)]);
  rows.push(['Cena', p => (p.tid < 0 ? 'zadarmo' : U.money(askingPrice(p))), p => -askingPrice(p)]);
  rows.push(['Plat teraz', p => (p.w ? wk(p.w) : '—'), null]);
  rows.push(['Zmluva', p => ctTxt(p), null]);
  const table = `<div class="cmp-wrap"><table class="tbl cmpx"><tr><th></th>${cmp.map(p => `<th data-a="player" data-id="${p.id}" class="clk">${avatarCv(p, 40)}<div>${U.esc(pName(p))}</div><small>${POS_SK[p.pos]}</small></th>`).join('')}</tr>
${rows.map(([lbl, fn, score]) => { let best = -Infinity; if (score) for (const p of cmp) best = Math.max(best, score(p)); return `<tr><td class="tl"><b>${lbl}</b></td>${cmp.map(p => `<td class="${score && score(p) === best && best > -1 ? 'best' : ''}">${fn(p)}</td>`).join('')}</tr>`; }).join('')}</table></div>`;
  return `<div class="m-btns left"><button class="btn btn-blue sm" data-a="scoutShort">🔍 Poslať skautov na všetkých</button></div>
<div class="card-h" style="margin-top:12px">Porovnanie</div>${table}
<div class="card-h" style="margin-top:14px">Zoznam</div><div class="mr-list">${ps.map(p => marketRow(p, { nd })).join('')}</div>`;
}

function mySquadMarket() {
  const u = userTeam();
  const ps = sortSquad(teamPlayers(u));
  const out = G.players.filter(p => p && p.loan && p.loan.from === u.id);
  const exp = ps.filter(p => !p.loan && contractLeft(p) <= 1);
  return `<div class="mdash small">
<div class="md"><small>Týždenné platy</small><b class="neg">${wk(teamWageBill(u))}</b></div>
<div class="md"><small>Hodnota kádra</small><b class="acc">${U.money(ps.reduce((a, p) => a + playerValue(p), 0))}</b></div>
<div class="md"><small>Na predaj</small><b>${ps.filter(p => p.listed).length}</b></div>
<div class="md"><small>Končiace zmluvy</small><b class="${exp.length ? 'warn' : ''}">${exp.length}</b></div></div>
<div class="mr-list">${ps.map(p => `<div class="mr own" data-a="player" data-id="${p.id}">${avatarCv(p)}
<div class="mr-main"><div class="mr-name">${dpBadge(p)}${pos2Badges(p, true)}<b>${U.esc(pFull(p))}</b>${pBadges(p)}${footTag(p)}${traitIcons(p)}</div><div class="mr-sub">${p.age} r. · ${archName(p)} · ${ctTxt(p)} · ${p.s.gp} z, ${p.s.g} g</div></div>
<div class="mr-c mr-ovr">${ovr(p.r)}</div><div class="mr-c mr-pot">${potTxt(p, true)}</div>
<div class="mr-c mr-price"><b>${U.money(playerValue(p))}</b><small>${wk(p.w || 0)}</small></div>
<div class="mr-act wide">${p.loan ? '<span class="muted small">hosťovanie</span>' : `<button class="btn ${p.listed ? 'btn-bad' : 'btn-ghost'} sm" data-a="toggleList" data-id="${p.id}">${p.listed ? 'Stiahnuť' : 'Na predaj'}</button><button class="btn btn-blue sm" data-a="renew" data-id="${p.id}">Zmluva</button>`}</div></div>`).join('')}</div>
${out.length ? `<div class="card-h" style="margin-top:14px">Na hosťovaní v iných kluboch</div><div class="mr-list">${out.map(p => marketRow(p)).join('')}</div>` : ''}
`;
}

// ── Akcie a zmeny ───────────────────────────────────────────────
let tfTimer = null;
function tfRefresh(full) {
  UI.tf.page = 0;
  if (full) { renderTab(); return; }
  clearTimeout(tfTimer);
  tfTimer = setTimeout(renderTransferList, 60);
  const b = document.querySelector('.tf-side-h .badge'), n = activeFilterCount();
  if (b) b.textContent = n;
}

Object.assign(ACT, {
  tfMode(el) { UI.tf.mode = el.dataset.v; UI.tf.page = 0; renderTab(); },
  tfPage(el) { UI.tf.page = +el.dataset.v; renderTransferList(); const r = document.querySelector('.tf-res'); r && r.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
  tfPos(el) { const f = UI.tf, v = el.dataset.v; f.pos = f.pos.includes(v) ? f.pos.filter(x => x !== v) : f.pos.concat(v); f.preset = ''; if (f.attr >= 0) f.attr = -1; tfRefresh(true); },
  tfReg(el) { UI.tf.reg = el.dataset.v; UI.tf.preset = ''; tfRefresh(true); },
  tfFoot(el) { UI.tf.foot = el.dataset.v; UI.tf.preset = ''; tfRefresh(true); },
  tfReset() { Object.assign(UI.tf, TF_DEFAULT(), { preset: '', sort: 'r', dir: -1 }); tfRefresh(true); },
  tfFilters() { UI.tf.showF = !UI.tf.showF; renderTab(); },
  tfDir() { UI.tf.dir *= -1; renderTransferList(); },
  tfSortCol(el) { const k = el.dataset.k, f = UI.tf; if (f.sort === k) f.dir *= -1; else { f.sort = k; f.dir = ['price', 'age', 'name'].includes(k) ? 1 : -1; } renderTransferList(); },
  tfPreset(el) {
    const pr = TF_PRESETS.find(x => x[0] === el.dataset.v);
    const f = UI.tf;
    if (f.preset === pr[0]) { Object.assign(f, TF_DEFAULT(), { preset: '', sort: 'r', dir: -1 }); tfRefresh(true); return; }
    Object.assign(f, TF_DEFAULT(), pr[2], { preset: pr[0], sort: pr[3], dir: pr[4] || -1 });
    tfRefresh(true);
  },
});

Object.assign(CHG, {
  tf_q(el) { UI.tf.q = el.value; UI.tf.preset = ''; tfRefresh(); },
  tf_flag(el) { UI.tf[el.dataset.k] = el.checked; UI.tf.preset = ''; tfRefresh(); },
  tf_sel(el) { const k = el.dataset.k; UI.tf[k] = k === 'attr' ? +el.value : el.value; UI.tf.preset = ''; tfRefresh(k === 'attr'); },
  tf_sort(el) { UI.tf.sort = el.value; UI.tf.dir = ['price', 'age', 'name'].includes(el.value) ? 1 : -1; renderTransferList(); },
  tf_per(el) { UI.tf.per = +el.value; UI.tf.page = 0; renderTransferList(); },
  tf_rng(el) {
    const f = UI.tf, k = el.dataset.k, e = el.dataset.e, v = +el.value;
    f.preset = '';
    if (e === 'one') {
      const map = { pot: 'potMin', price: 'price', attr: 'attrMin' };
      f[map[k]] = v;
      const l = document.getElementById('lbl_' + k); if (l) l.textContent = RFMT[k](v);
    } else {
      const names = { age: ['ageMin', 'ageMax'], ovr: ['ovrMin', 'ovrMax'], lvl: ['lvlMin', 'lvlMax'] }[k];
      if (e === 'lo') f[names[0]] = Math.min(v, f[names[1]]); else f[names[1]] = Math.max(v, f[names[0]]);
      el.value = e === 'lo' ? f[names[0]] : f[names[1]];
      const min = +el.min, max = +el.max;
      const fill = document.getElementById('fill_' + k);
      if (fill) { fill.style.left = (f[names[0]] - min) / (max - min) * 100 + '%'; fill.style.right = 100 - (f[names[1]] - min) / (max - min) * 100 + '%'; }
      const l = document.getElementById('lbl_' + k); if (l) l.textContent = RFMT[k](f[names[0]], f[names[1]]);
    }
    tfRefresh();
  },
});
