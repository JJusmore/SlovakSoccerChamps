'use strict';
// ─── UI trhu: profil hráča, vyjednávanie, prestupy, skauting, financie, pošta ───


const wk = v => `${U.money(v)}/týž.`;
function ovrTxt(p) {
  const [a, b] = rRange(p);
  if (a === b) return ovr(p.r);
  return `<span class="ovr rng ${ovrCls(Math.round((a + b) / 2))}" title="Odhad – hráč nie je dostatočne preskautovaný">${a}–${b}</span>`;
}
function potTier(g) { return g >= 15 ? 'p-gem' : g >= 10 ? 'p-big' : g >= 5 ? 'p-tal' : g >= 2 ? 'p-grow' : 'p-peak'; }
function potTxt(p, withGap) {
  const pr = potRange(p);
  if (!pr) return '<span class="pot unk" title="Potenciál zistí skaut">?</span>';
  const mid = (pr[0] + pr[1]) / 2, g = Math.round(mid - p.r);
  const v = pr[0] === pr[1] ? pr[0] : `${pr[0]}–${pr[1]}`;
  const gapTxt = g > 0 ? `+${g}` : 'vrchol';
  return `<span class="pot ${potTier(g)}" title="Potenciál ${v} (${g > 0 ? 'môže sa zlepšiť o ' + g : 'na vrchole'})">${v}${withGap ? `<em>${g > 0 ? '▲' + g : '■'}</em>` : ''}</span>`;
}
function talentTag(p) {
  if (potRange(p) == null) return '';
  const [k, t] = talentLabel(p);
  return `<i class="tal tal-${k}">${t}</i>`;
}
function knowBar(p) { const k = know(p); return `<span class="kbar ${k >= 100 ? 'full' : ''}" title="Preskautované na ${k} %"><i style="width:${k}%"></i></span>`; }
function ctTxt(p) {
  if (p.tid < 0) return '<span class="muted">bez zmluvy</span>';
  const left = contractLeft(p);
  return `<span class="${left <= 1 ? 'warn' : ''}">do ${p.ce}</span>`;
}
function pBadges(p) {
  const b = [];
  if ((G.short || []).includes(p.id)) b.push('<i class="bd star" title="Sledovaný">★</i>');
  if (injured(p)) b.push(injTag(p));
  if (isNT(p)) { const y = ((G.nt && G.nt.u21) || []).includes(p.id); b.push(`<i class="bd nt" title="Reprezentant Slovenska${y ? ' U21' : ''}">🇸🇰${y ? ' U21' : ''}</i>`); }
  if (p.loan) b.push(`<i class="bd loan" title="Hosťovanie z klubu ${U.esc(G.teams[p.loan.from].name)}">HOS</i>`);
  if (p.tid < 0) b.push('<i class="bd free">VOĽNÝ</i>');
  else if (contractLeft(p) <= 1 && p.tid !== G.userTid) b.push('<i class="bd exp" title="Posledný rok zmluvy – lacnejší">ZML</i>');
  if (p.wo) b.push('<i class="bd wo" title="Chce odísť – lacnejší">CHCE ODÍSŤ</i>');
  if (p.listedAI || (p.listed && p.tid === G.userTid)) b.push('<i class="bd list">NA PREDAJ</i>');
  const tg = p.tid !== G.userTid && G.userTid >= 0 && G.biz ? trainGainRange(p, trainQ(userTeam())) : null;
  if (tg && tg[1] >= 2) b.push(`<i class="bd trn" title="U teba lepší tréning – potenciál +${tg[0]} – ${tg[1]}">🏋️</i>`);
  return b.join('');
}

// ── Profil hráča ────────────────────────────────────────────────
function attrBars(p) {
  const k = know(p);
  if (k < 45) return `<div class="attrs-unk">🔒 Atribúty neznáme – pošli skauta</div>`;
  const A = playerAttrs(p), N = attrNames(p, true);
  const exact = k >= 70;
  return `<div class="attrs">${A.map((v, i) => {
    const shown = exact ? v : Math.round(v / 5) * 5;
    return `<div class="at"><span>${N[i]}</span><b>${exact ? v : '~' + shown}</b></div>`;
  }).join('')}</div>`;
}

function compareBlock(p) {
  const u = userTeam();
  if (p.tid === u.id || !attrsKnown(p)) return '';
  const mine = teamPlayers(u).filter(x => x.pos === p.pos).sort((a, b) => b.r - a.r)[0];
  if (!mine) return '';
  const A = playerAttrs(p), B = playerAttrs(mine), N = attrNames(p);
  const cell = (a, b) => `<td class="${a > b ? 'up' : a < b ? 'dn' : ''}">${a}</td>`;
  return `<div class="cmp"><div class="cmp-h">Porovnanie s <b>${U.esc(pName(mine))}</b></div>
<table class="tbl cmp-t"><tr><th></th><th>OVR</th>${N.map(n => `<th>${n}</th>`).join('')}</tr>
<tr><td class="tl">${U.esc(pName(p))}</td>${cell(p.r, mine.r)}${A.map((v, i) => cell(v, B[i])).join('')}</tr>
<tr><td class="tl">${U.esc(pName(mine))}</td><td>${mine.r}</td>${B.map(v => `<td>${v}</td>`).join('')}</tr></table></div>`;
}

// sezóny hráča: aktuálna + história (zápasy, góly, asistencie, karty, priemerné hodnotenie)
function seasonsBlock(p) {
  const cur = [G.year, p.tid, p.s.gp, p.s.g, p.s.a, Math.round(avgRt(p.s)), p.s.yc || 0, p.s.rc || 0];
  const rows = [cur, ...(p.sh || []).slice().reverse()].filter((r, i) => i === 0 ? r[2] > 0 || (p.sh || []).length : true);
  if (!rows.length && !(p.c.gp + p.s.gp)) return '';
  const lbl = y => `${y}/${String((y + 1) % 100).padStart(2, '0')}`;
  const club = tid => (tid >= 0 && G.teams[tid] ? `<span class="ss-club">${crestSVG(G.teams[tid], 16)}${U.esc(G.teams[tid].short)}</span>` : '<span class="muted">voľný</span>');
  const rated = rows.filter(r => r[5] && r[2]), avg = rated.length ? Math.round(rated.reduce((a, r) => a + r[5] * r[2], 0) / rated.reduce((a, r) => a + r[2], 0)) : 0;
  return `<div class="pseasons"><div class="cmp-h">Sezóny</div><table class="tbl ss-t"><tr><th class="tl">Sezóna</th><th class="tl">Klub</th><th>Z</th><th>G</th><th>A</th><th>🟨</th><th>🟥</th><th title="Priemerné hodnotenie">Ø</th></tr>
${rows.map((r, i) => `<tr class="${i === 0 ? 'now' : ''}"><td class="tl">${lbl(r[0])}</td><td class="tl">${club(r[1])}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td><td>${r[6] || ''}</td><td>${r[7] || ''}</td><td>${r[5] ? rtPill(r[5]) : ''}</td></tr>`).join('')}
<tr class="tot"><td class="tl" colspan="2">Kariéra</td><td>${p.c.gp + p.s.gp}</td><td>${p.c.g + p.s.g}</td><td>${p.c.a + p.s.a}</td><td></td><td></td><td>${avg ? rtPill(avg) : ''}</td></tr></table></div>`;
}

function historyBlock(p) {
  if (!p.h || !p.h.length) return '';
  const nm = id => (id >= 0 && G.teams[id] ? U.esc(G.teams[id].short) : 'voľný');
  const T = { buy: 'prestup', sell: 'prestup', free: 'voľný', swap: 'výmena', loanIn: 'hosťovanie', loanOut: 'hosťovanie', release: 'uvoľnený' };
  return `<div class="phist"><div class="cmp-h">Prestupová história</div>${p.h.slice().reverse().map(h => `<div class="ph"><span>${h.y}</span><span>${nm(h.from)} → ${nm(h.to)}</span><span class="muted">${T[h.type] || ''}</span><b>${h.fee ? U.money(h.fee) : '—'}</b></div>`).join('')}</div>`;
}

// ── Profil hráča: štýl, noha, triky, posty, špeciality ─────────
function stars(n, max = 5) { return `<span class="stars" title="${n} z ${max}">${'★'.repeat(n)}<i>${'★'.repeat(max - n)}</i></span>`; }
function footTxt(p) { ensureProfile(p); return FOOT_NAME[p.ft]; }
function footTag(p) { ensureProfile(p); return `<i class="foot foot-${p.ft}" title="Silnejšia noha: ${FOOT_NAME[p.ft]}">${p.ft === 'R' ? 'P' : p.ft === 'L' ? 'Ľ' : 'O'}</i>`; }
function pos2Badges(p, small) {
  ensureProfile(p);
  return (p.pos2 || []).map(x => `<span class="pos2" title="Vie hrať aj ${POS_NAME_SK[x].toLowerCase()} (malá strata sily)">${small ? POS_SK[x] : posBadge(x)}</span>`).join('');
}
function traitChip(k, lvl) {
  const T = TRAITS[k];
  return `<span class="trait tl${lvl}" title="${T.n} (${LVL_NAME[lvl]}) – ${T.d}"><em>${T.ic}</em>${T.n}<u>${'●'.repeat(lvl)}${'○'.repeat(3 - lvl)}</u></span>`;
}
function traitIcons(p) {
  if (know(p) < 70) return '';
  ensureProfile(p);
  const ks = Object.keys(p.tr || {});
  return ks.length ? `<span class="tr-ic">${ks.map(k => `<i class="tl${p.tr[k]}" title="${TRAITS[k].n} (${LVL_NAME[p.tr[k]]})">${TRAITS[k].ic}</i>`).join('')}</span>` : '';
}
function styleTxt(p) { return know(p) >= 70 ? `<i class="arch" title="${STYLE_DESC[archName(p)] || ''}">${archName(p)}</i>` : ''; }
function profileBlock(p) {
  ensureProfile(p);
  const k = know(p), ex = k >= 70, q = '<span class="muted">?</span>';
  if (k < 45) return `<div class="attrs-unk pprof-unk">🔒 Profil neznámy – pošli skauta</div>`;
  const st = archName(p);
  const ks = Object.keys(p.tr || {}).sort((a, b) => p.tr[b] - p.tr[a]);
  const posLine = `${dpBadge(p)}<b>${DP_NAME[dpOf(p)]}</b>${(p.dp2 || []).map(d => ` <span class="pf-p2">${d} ${DP_NAME[d]} <small>−3 %</small></span>`).join('')}${(p.pos2 || []).map(x => ` <span class="pf-p2">${posBadge(x)} ${POS_NAME_SK[x]} <small>−6 %</small></span>`).join('')}`;
  return `<div class="pprof">
<div class="pf-row"><div class="pf-cell pf-style"><small>Štýl hry</small>${ex ? `<b>${st}</b><span class="muted">${STYLE_DESC[st] || ''}</span>` : q}</div>
<div class="pf-cell"><small>Silnejšia noha</small>${k >= 45 ? `<b>${footTag(p)} ${footTxt(p)}</b>` : q}</div>
${p.pos === 'GK' ? '' : `<div class="pf-cell"><small>Slabšia noha</small>${ex ? stars(p.wf) : q}</div>
<div class="pf-cell"><small>Triky</small>${ex ? stars(p.sk) : q}</div>`}</div>
<div class="pf-pos"><small>Posty</small>${k >= 45 ? posLine : q}</div>
<div class="pf-tr"><small>Špeciality</small>${!ex ? '<span class="muted">🔒 od 70 %</span>' : ks.length ? ks.map(x => traitChip(x, p.tr[x])).join('') : '<span class="muted">žiadne</span>'}</div>
</div>`;
}

function playerCard(p) {
  const u = userTeam();
  const t = p.tid >= 0 ? G.teams[p.tid] : null;
  const own = p.tid === u.id;
  const k = know(p);
  const shortl = (G.short || []).includes(p.id);
  const queued = (G.scoutQueue || []).includes(p.id);
  let actions = '';
  if (own) {
    if (p.loan) actions = `<span class="muted">Na hosťovaní z klubu ${U.esc(G.teams[p.loan.from].name)} do konca sezóny.</span>`;
    else actions = `<button class="btn btn-blue sm" data-a="talk" data-id="${p.id}">💬 Rozhovor</button>${bTeam() ? `<button class="btn btn-ghost sm" data-a="toB" data-id="${p.id}">↓ B-tím</button>` : ''}<button class="btn btn-blue sm" data-a="renew" data-id="${p.id}">Predĺžiť zmluvu</button>
<button class="btn btn-ghost sm" data-a="toggleList" data-id="${p.id}">${p.listed ? 'Stiahnuť zo zoznamu' : 'Na predajný zoznam'}</button>
<button class="btn btn-ghost sm" data-a="quickSell" data-id="${p.id}">Rýchly predaj</button>
<button class="btn btn-ghost sm" data-a="loanOut" data-id="${p.id}">Na hosťovanie</button>
<button class="btn btn-bad sm" data-a="release" data-id="${p.id}">Uvoľniť</button>`;
  } else if (bTeam() && p.tid === bTeam().id) {
    actions = `<button class="btn btn-go sm" data-a="toA" data-id="${p.id}">↑ Do A-tímu</button>`;
  } else if (p.loan && p.loan.from === u.id) {
    actions = `<span class="muted">Tvoj hráč na hosťovaní v klube ${U.esc(t.name)}.</span>`;
  } else {
    actions = `${k < 100 ? `<button class="btn btn-ghost sm" data-a="scoutP" data-id="${p.id}" ${queued ? 'disabled' : ''}>${queued ? 'Skaut je na ceste' : '🔍 Skautovať'}</button>` : ''}
<button class="btn btn-ghost sm" data-a="shortP" data-id="${p.id}">${shortl ? '★ Nesledovať' : '☆ Sledovať'}</button>
${preAllowed(p) ? `<button class="btn btn-blue sm" data-a="preSign" data-id="${p.id}" title="Príde zadarmo po sezóne">📝 Predzmluva</button>` : p.pre && p.pre.tid === G.userTid ? '<span class="pos">📝 Predzmluva podpísaná</span>' : ''}
${p.tid < 0 ? `<button class="btn btn-go sm" data-a="negotiate" data-id="${p.id}">Podpísať zmluvu</button>`
    : `${p.age <= 24 && !p.loan && t.lvl <= u.lvl ? `<button class="btn btn-blue sm" data-a="loanIn" data-id="${p.id}">Hosťovanie (${U.money(loanFee(p))})</button>` : ''}<button class="btn btn-go sm" data-a="negotiate" data-id="${p.id}">Ponuka na prestup</button>`}`;
  }
  const price = own ? null : askingPrice(p);
  return `<div class="pcard">
<div class="pc-top"><canvas class="pc-fig" width="90" height="110" data-pid="${p.id}"></canvas>
<div class="pc-info"><b>${U.esc(pFull(p))} ${pBadges(p)}</b>
<div>${dpBadge(p)} ${DP_NAME[dpOf(p)]}${k >= 45 ? pos2Badges(p) : ''}${k >= 70 ? ` · ${styleTxt(p)}` : ''} · ${flag(p.nat)} · ${p.age} r.</div>
<div>${talentTag(p)}</div>
<div class="pc-club">${t ? teamTag(t, 18) + ` <span class="muted">${leagueOf(t).name}</span>` : '<span class="muted">Voľný hráč</span>'}</div>
<div class="pc-know">Preskautované ${knowBar(p)} <b>${k} %</b></div></div>
<div class="pc-r">${ovrTxt(p)}<small>Potenciál</small>${potTxt(p, true)}</div></div>
${attrBars(p)}
${profileBlock(p)}
<div class="pc-stats">
<div><small>Trhová hodnota</small><b>${U.money(playerValue(p))}</b></div>
${own ? `<div><small>Plat</small><b>${wk(p.w || 0)}</b></div>` : `<div><small>${p.tid < 0 ? 'Podpisový bonus' : 'Cena klubu'}</small><b>${p.tid < 0 ? U.money(signingBonus(p)) : U.money(price)}</b></div>`}
<div><small>Zmluva</small><b>${ctTxt(p)}</b></div>
<div><small>Sezóna</small><b>${p.s.gp} z · ${p.s.g} g · ${p.s.a} a</b></div>
<div title="Priemerné hodnotenie v sezóne"><small>Ø hodnotenie</small><b>${p.s.rn ? rtPill(Math.round(avgRt(p.s))) : '–'}</b></div>
<div title="Hodnotenia v posledných zápasoch"><small>Forma</small><b class="pc-form">${(p.lr || []).length ? p.lr.map(rtPill).join('') : '–'}</b></div>
${!own && G.biz ? (() => { const tg = trainGainRange(p, trainQ(u)); return `<div title="Tréningové podmienky: doteraz ${trainPrev(p).toFixed(1).replace('.', ',')} · tvoj klub ${trainQ(u)}"><small>Tréning u teba</small><b class="${tg ? 'pos' : 'muted'}">${tg ? `▲ pot. +${tg[0]}${tg[1] > tg[0] ? '–' + tg[1] : ''}` : 'bez zmeny'}</b></div>`; })() : ''}
${injured(p) ? `<div><small>Zranenie</small><b class="neg">🚑 ${U.esc(injName(p))} · ${dniTxt(p.inj.d)}</b></div>` : ''}
<div><small>Kondícia</small><b>${p.fit} %</b></div>
${own ? `<div title="${ROLE_SK[playerRole(p)]}"><small>Morálka</small><b>${MOR_IC(mor(p))[0]} ${MOR_IC(mor(p))[1]}${p.prom ? ' · 🤝' : ''}</b></div>` : `<div title="Provízia agenta pri prestupe"><small>Agent</small><b>${U.esc(agentOf(p).n)} <span class="muted">${'💰'.repeat(agentOf(p).g)}</span></b></div>`}
${p.caps || p.u21 ? `<div><small>Reprezentácia</small><b>🇸🇰 ${p.caps || 0}${p.u21 ? ` · U21 ${p.u21}` : ''}</b></div>` : ''}
${own && (p.rel || p.gb) ? `<div><small>Klauzuly</small><b>${p.rel ? `výstupná ${U.money(p.rel)}` : ''}${p.rel && p.gb ? ' · ' : ''}${p.gb ? `${U.money(p.gb)}/gól` : ''}</b></div>` : ''}
${p.sellOn && p.sellOn.tid === G.userTid ? `<div><small>Tvoj podiel z predaja</small><b class="pos">${p.sellOn.pct} %</b></div>` : ''}
${p.cs && p.cs.t === G.userTid && own ? `<div><small>Za klub</small><b>${p.cs.gp} z · ${p.cs.g} g · ${p.cs.a} a</b></div>` : ''}
<div title="Skúsenosti z odohraných zápasov – zlepšujú výkon v zápase"><small>Skúsenosti</small><b>${Math.round(p.xp ?? 0)} <span class="muted small">výkon ${xpFactor(p) >= 1 ? '+' : '−'}${Math.abs(Math.round((xpFactor(p) - 1) * 100))} %</span></b></div>
${p.acad ? `<div><small>Akadémia</small><b>🎓 tréning ${Math.round(p.tp || 0)} %</b></div>` : ''}
<div title="Karty v sezóne a agresivita hráča"><small>Karty</small><b>🟨 ${p.s.yc || 0} · 🟥 ${p.s.rc || 0}${p.ban > 0 ? ` <span class="neg">🚫 ${p.ban}</span>` : ''}</b></div></div>
${(() => { const sr = scoutReport(p); return sr ? `<div class="srep"><div class="cmp-h">📝 Správa skauta</div><p>${U.esc(sr)}</p></div>` : ''; })()}
${own && p.raise ? `<div class="neg-msg warn">💰 Chce vyšší plat – predĺž mu zmluvu.</div>` : ''}${own && p.ego ? `<div class="neg-msg warn">⭐ Stavia si hlavu – pomôže kritika.</div>` : ''}
${compareBlock(p)}${seasonsBlock(p)}${historyBlock(p)}
<div class="m-btns">${actions}</div></div>`;
}

function openPlayer(pid) {
  const p = G.players[pid];
  if (!p) return;
  const m = modal(playerCard(p) + '<div class="m-btns"><button class="btn btn-ghost sm" data-m="x">Zavrieť</button></div>', { cls: 'pmodal' });
  paintFigures(m.el);
}

function paintFigures(root) {
  root.querySelectorAll('canvas.pc-fig').forEach(cv => {
    const p = G.players[+cv.dataset.pid]; if (!p) return;
    const t = p.tid >= 0 ? G.teams[p.tid] : null;
    const kit = t ? (p.pos === 'GK' ? { p: '#2ecc71', s: '#111', sh: '#1a1a1a', pat: 'plain' } : t.kit) : { p: '#9e9e9e', s: '#fff', sh: '#444', pat: 'plain' };
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    drawFigure(ctx, 45, 104, 44, kit, playerLook(p), { face: 1, num: p.num });
  });
  if (typeof paintTeamFigures === 'function') paintTeamFigures(root);
  if (typeof paintAvatars === 'function') paintAvatars(root);
}

// ── Vyjednávanie (prestup / voľný hráč / predĺženie) ────────────
// krok pre +/- podľa veľkosti sumy (1, 2, 5, 10, 20, 50 …)
function niceStep(v) {
  const raw = Math.max(1, v);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / mag;
  return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * mag;
}
function roundTo(v, st) { return Math.max(st, Math.round(v / st) * st); }
const seasonsWord = n => (n === 1 ? 'sezóna' : n <= 4 ? 'sezóny' : 'sezón');

function openNegotiation(pid, mode) {
  const p = G.players[pid], u = userTeam();
  if (!p) return;
  if (mode !== 'renew') {
    const err = transferCheck(p, { pre: mode === 'pre' });
    if (err) { toast(err, 'bad'); return; }
  } else if (negLocked(p)) { toast('Hráč teraz o zmluve nechce hovoriť. Skús o pár dní.', 'bad'); return; }
  const club = p.tid >= 0 ? G.teams[p.tid] : null;
  const ask = mode === 'buy' ? askingPrice(p) : 0;
  const demand = () => (mode === 'renew' ? renewDemand(p) : mode === 'pre' ? U.nice(wageDemand(p, u) * 1.05) : wageDemand(p, u));
  const dW = demand();
  const wStep = niceStep(dW * 0.02), cStep = niceStep(Math.max(100, ask) * 0.02);
  const N = {
    step: mode === 'buy' ? 'fee' : 'terms', cash: ask ? roundTo(ask * 0.9, cStep) : 0, swap: null, msg: '', msgCls: '',
    fee: mode === 'free' || mode === 'pre' ? signingBonus(p) : 0, counter: null, wage: roundTo(dW * 0.95, wStep), rel: 0, gb: 0,
  };
  // klauzuly znižujú požiadavku hráča
  const dEff = () => U.nice(dW * clauseF(N.rel, N.gb));
  const agFee = () => agentFee(p, mode, N.fee, N.wage);
  const endMin = mode === 'renew' ? Math.max(p.ce || G.year, G.year + 1) + 1 : mode === 'pre' ? G.year + 2 : G.year + 1;
  N.end = Math.min(G.year + 6, mode === 'renew' ? endMin + 1 : G.year + (p.age >= 30 ? 2 : 3));
  const swaps = teamPlayers(u).filter(x => !x.loan).sort((a, b) => playerValue(b) - playerValue(a));
  const ns = negState(p.id);
  const oldW = mode === 'renew' ? (p.w || 0) : 0;
  const titles = { renew: ['📝', 'Predĺženie zmluvy'], free: ['✍️', 'Podpis voľného hráča'], buy: ['💼', 'Ponuka na prestup'], pre: ['📝', 'Predzmluva – príde po sezóne zadarmo'] };

  // rozsahy posuvníkov a stupníc
  const wMin = roundTo(dW * 0.5, wStep), wMax = roundTo(dW * 1.6, wStep);
  const cMin = roundTo(ask * 0.4, cStep), cMax = roundTo(ask * 1.3, cStep);
  const pct = (v, a, b) => U.clamp((v - a) / Math.max(1, b - a) * 100, 0, 100);

  const termsOk = w => {
    let ok = w / dEff();
    const years = N.end - G.year;
    if (p.age >= 30 && years >= 2) ok += 0.05;
    if (p.age >= 31 && years <= 1) ok -= 0.08;
    if (p.age <= 22 && potOf(p) > p.r + 8 && years >= 5) ok -= 0.05;
    return ok;
  };
  const termsChance = () => {
    const ok = termsOk(N.wage);
    if (ok >= 1) return ['good', '✔ Hráč by mal súhlasiť'];
    if (ok >= 0.9) return ['mid', `≈ Možno súhlasí (šanca asi ${Math.round((ok - 0.9) / 0.1 * 100)} %)`];
    return ['bad', '✖ Takúto ponuku odmietne'];
  };
  const swapVal = () => (N.swap != null && club ? swapValue(G.players[N.swap], club) : 0);
  const feeChance = () => {
    const r = (N.cash + swapVal()) / ask;
    if (r >= 1) return ['good', '✔ Klub ponuku prijme'];
    if (r >= 0.82) return ['mid', '≈ Klub možno pristúpi, inak dá protiponuku'];
    return ['bad', '✖ Klub takú ponuku odmietne'];
  };
  const gauge = (id, v, a, b, red, goal, goalLabel) => {
    const pr = pct(red, a, b), pg = pct(goal, a, b);
    return `<div class="ng-gauge"><div class="g-z g-red" style="width:${pr}%"></div><div class="g-z g-amb" style="left:${pr}%;width:${pg - pr}%"></div><div class="g-z g-grn" style="left:${pg}%;width:${100 - pg}%"></div>
<em style="left:${pg}%">${goalLabel}</em><i id="${id}" style="left:${pct(v, a, b)}%"></i></div>`;
  };
  const amount = (pref, val, unit) => `<div class="ng-amount">
<button class="ng-btn big" data-m="${pref}-10" title="−10 %">−10%</button><button class="ng-btn" data-m="${pref}-" title="Menej">−</button>
<label class="ng-val"><input id="ng_${pref}" class="ng-input" value="${val}" inputmode="numeric" autocomplete="off"><span>${unit}</span></label>
<button class="ng-btn" data-m="${pref}+" title="Viac">+</button><button class="ng-btn big" data-m="${pref}+10" title="+10 %">+10%</button></div>`;

  const render = () => {
    const [ic, title] = titles[mode];
    let html = `<div class="ng-head"><canvas class="pc-fig ng-fig" width="90" height="110" data-pid="${p.id}"></canvas><div class="ng-hinfo">
<div class="ng-title">${ic} ${title}</div>
<div class="ng-name">${U.esc(pFull(p))} ${pBadges(p)}</div>
<div class="ng-meta">${dpBadge(p)} ${DP_NAME[dpOf(p)]} · ${p.age} r. · ${ovrTxt(p)} ${potTxt(p)}</div>
<div class="ng-club">${club ? crestSVG(club, 18) + ' ' + U.esc(club.name) : 'Voľný hráč'} · hodnota ${U.money(playerValue(p))}</div></div></div>`;
    if (N.step === 'fee') {
      const sw = N.swap != null ? G.players[N.swap] : null;
      const swV = swapVal();
      const [cc, ct] = feeChance();
      html += `<div class="ng-sec"><div class="ng-lab">Prestupová suma <span>Klub si pýta <b class="acc">${U.money(ask)}</b></span></div>
${amount('c', N.cash, '€')}
<input type="range" id="ng_cR" class="ng-range" min="${cMin}" max="${cMax}" step="${cStep}" value="${U.clamp(N.cash, cMin, cMax)}">
${gauge('gC', N.cash + swV, cMin, cMax, ask * 0.82, ask, 'cena klubu')}
<div class="ng-chance ${cc}" id="ngChance">${ct}</div>
<div class="ng-quick"><button class="chip" data-m="cAsk">Ponúknuť cenu klubu</button><button class="chip" data-m="c90">90 % ceny</button></div></div>
<div class="ng-sec"><div class="ng-lab">Výmena hráča <span>voliteľné – pridaj svojho hráča do obchodu</span></div>
<select class="inp ng-sel" id="negSwap"><option value="">— bez výmeny —</option>${swaps.map(x => `<option value="${x.id}" ${N.swap === x.id ? 'selected' : ''}>${U.esc(pName(x))} (${POS_SK[x.pos]}, ${x.r}) – ${U.money(playerValue(x))}</option>`).join('')}</select>
${sw ? `<div class="ng-swapv">Hodnota ${U.esc(pName(sw))} pre klub: <b>${U.money(swV)}</b></div>` : ''}</div>
<div class="ng-kpis"><div><small>Ponuka spolu</small><b id="kTot" class="acc">${U.money(N.cash + swV)}</b></div><div><small>Tvoj rozpočet</small><b class="${u.budget < N.cash ? 'neg' : ''}">${U.money(u.budget)}</b></div><div><small>Po prestupe</small><b id="kAfter" class="${u.budget - N.cash < 0 ? 'neg' : 'pos'}">${U.money(u.budget - N.cash)}</b></div></div>
${N.msg ? `<div class="neg-msg ${N.msgCls}">${N.msg}</div>` : ''}
<div class="m-btns">${N.counter ? `<button class="btn btn-blue" data-m="takeCounter">Prijať ${U.money(N.counter)}</button>` : ''}<button class="btn btn-ghost" data-m="x">Zrušiť</button><button class="btn btn-go" data-m="sendFee">Poslať ponuku</button></div>
<div class="ng-tries">Zostávajúce pokusy pred urážkou klubu: ${'●'.repeat(Math.max(0, 3 - ns.tries))}${'○'.repeat(Math.min(3, ns.tries))}</div>`;
    } else if (N.step === 'terms') {
      const ends = [];
      for (let y = endMin; y <= G.year + 6; y++) ends.push(y);
      const [cc, ct] = termsChance();
      html += `${mode === 'buy' ? `<div class="neg-ok">✔ Klub prijal ponuku <b>${U.money(N.fee)}</b>. Teraz sa dohodni s hráčom.</div>` : ''}
<div class="ng-sec"><div class="ng-lab">Týždenný plat <span>Hráč žiada <b class="acc">${wk(dW)}</b>${oldW ? ` · teraz zarába ${wk(oldW)}` : ''}</span></div>
${amount('w', N.wage, '€/týž.')}
<input type="range" id="ng_wR" class="ng-range" min="${wMin}" max="${wMax}" step="${wStep}" value="${U.clamp(N.wage, wMin, wMax)}">
${gauge('gW', N.wage, wMin, wMax, dW * 0.9, dW, 'požiadavka')}
<div class="ng-chance ${cc}" id="ngChance">${ct}</div>
<div class="ng-quick"><button class="chip" data-m="wDemand">Dať požiadavku</button><button class="chip" data-m="w95">95 %</button><button class="chip" data-m="w105">+5 % navyše</button></div></div>
<div class="ng-sec"><div class="ng-lab">Zmluva do leta <span>${p.age >= 30 ? 'starší hráč chce radšej dlhšiu zmluvu' : p.age <= 22 && potOf(p) > p.r + 8 ? 'talent nechce byť viazaný príliš dlho' : 'dlhšia zmluva = vyššia hodnota hráča'}</span></div>
<div class="ng-years">${ends.map(y => `<button class="ng-yr ${y === N.end ? 'on' : ''}" data-m="y${y}"><b>${y}</b><small>${y - G.year} ${seasonsWord(y - G.year)}</small></button>`).join('')}</div></div>
<div class="ng-sec"><div class="ng-lab">Klauzuly <span>hráč za ne zľaví z platu</span></div>
<div class="ng-cl">${REL_OPTS.map(([v, n]) => `<button class="chip ${N.rel === v ? 'on' : ''}" data-m="rel${v}" title="${v ? 'Klub, ktorý zaplatí ' + U.money(U.nice(playerValue(p) * v)) + ', ho môže kúpiť bez tvojho súhlasu' : ''}">${v ? '📑 ' : ''}${n}</button>`).join('')}</div>
${p.pos !== 'GK' && p.pos !== 'DF' ? `<div class="ng-cl">${GB_OPTS.map(([v, n], i) => `<button class="chip ${N.gb === v ? 'on' : ''}" data-m="gb${i}">${v ? '⚽ ' : ''}${n}${v ? ` (${U.money(U.nice(N.wage * v))})` : ''}</button>`).join('')}</div>` : ''}
${dEff() !== dW ? `<div class="ng-swapv">Požiadavka s klauzulami: <b>${wk(dEff())}</b></div>` : ''}</div>
<div class="ng-kpis"><div><small>Platy po podpise</small><b id="kWages">${wk(teamWageBill(u) - oldW + N.wage)}</b></div>
<div><small>Týždenná bilancia</small><b id="kBal" class="${weeklyBalance() - N.wage + oldW < 0 ? 'neg' : 'pos'}">${U.money(weeklyBalance() - N.wage + oldW)}</b></div>
${mode === 'free' || mode === 'pre' ? `<div><small>Podpisový bonus</small><b>${U.money(N.fee)}</b></div>` : `<div><small>Spolu za zmluvu</small><b id="kTot">${U.money(N.wage * 32 * (N.end - G.year))}</b></div>`}
<div title="${U.esc(agentOf(p).n)}"><small>Provízia agenta</small><b id="kAg">${U.money(agFee())}</b></div>
<div><small>Limit vedenia</small><b id="kCap" class="${teamWageBill(u) - oldW + N.wage > board().wageCap ? 'neg' : ''}">${wk(board().wageCap)}</b></div></div>
${N.msg ? `<div class="neg-msg ${N.msgCls}">${N.msg}</div>` : ''}
<div class="m-btns"><button class="btn btn-ghost" data-m="x">Zrušiť</button>${teamWageBill(u) - oldW + N.wage > board().wageCap ? `<button class="btn btn-blue" data-m="askCap" title="Vedenie môže limit platov navýšiť">🏛️ Požiadať o vyšší limit</button>` : ''}<button class="btn btn-go" data-m="sendTerms">Ponúknuť zmluvu</button></div>
<div class="ng-tries">Trpezlivosť hráča: ${'●'.repeat(Math.max(0, 3 - ns.ptries))}${'○'.repeat(Math.min(3, ns.ptries))}</div>`;
    } else {
      html += `<div class="neg-ok big">🎉 ${N.msg}</div><div class="m-btns"><button class="btn btn-go" data-m="x">Super!</button></div>`;
    }
    m.el.querySelector('.modal').innerHTML = html;
    paintFigures(m.el);
    bindLive();
  };

  // živá aktualizácia pri ťahaní posuvníka / písaní (bez prekreslenia celého okna)
  const live = () => {
    const q = s => m.el.querySelector(s);
    if (N.step === 'fee') {
      const tot = N.cash + swapVal();
      const g = q('#gC'); if (g) g.style.left = pct(tot, cMin, cMax) + '%';
      const [cc, ct] = feeChance(); const c = q('#ngChance'); if (c) { c.className = 'ng-chance ' + cc; c.textContent = ct; }
      const k = q('#kTot'); if (k) k.textContent = U.money(tot);
      const a = q('#kAfter'); if (a) { a.textContent = U.money(u.budget - N.cash); a.className = u.budget - N.cash < 0 ? 'neg' : 'pos'; }
    } else if (N.step === 'terms') {
      const g = q('#gW'); if (g) g.style.left = pct(N.wage, wMin, wMax) + '%';
      const [cc, ct] = termsChance(); const c = q('#ngChance'); if (c) { c.className = 'ng-chance ' + cc; c.textContent = ct; }
      const kw = q('#kWages'); if (kw) kw.textContent = wk(teamWageBill(u) - oldW + N.wage);
      const kb = q('#kBal'); if (kb) { const b = weeklyBalance() - N.wage + oldW; kb.textContent = U.money(b); kb.className = b < 0 ? 'neg' : 'pos'; }
      const kt = q('#kTot'); if (kt && mode !== 'free') kt.textContent = U.money(N.wage * 32 * (N.end - G.year));
      const ka = q('#kAg'); if (ka) ka.textContent = U.money(agFee());
      const kc = q('#kCap'); if (kc) kc.className = teamWageBill(u) - oldW + N.wage > board().wageCap ? 'neg' : '';
    }
  };
  const bindLive = () => {
    const pairs = [['c', 'cash'], ['w', 'wage']];
    for (const [pref, key] of pairs) {
      const inp = m.el.querySelector('#ng_' + pref), rng = m.el.querySelector('#ng_' + pref + 'R');
      if (rng) rng.addEventListener('input', () => { N[key] = +rng.value; if (inp) inp.value = rng.value; live(); });
      if (inp) inp.addEventListener('input', () => {
        N[key] = Math.max(0, Math.round(+String(inp.value).replace(/[^\d]/g, '') || 0));
        if (rng) rng.value = U.clamp(N[key], +rng.min, +rng.max);
        live();
      });
    }
  };
  const readInputs = () => {
    const c = m.el.querySelector('#ng_c'); if (c) N.cash = Math.max(0, Math.round(+String(c.value).replace(/[^\d]/g, '') || 0));
    const s = m.el.querySelector('#negSwap'); if (s) N.swap = s.value === '' ? null : +s.value;
    const w = m.el.querySelector('#ng_w'); if (w) N.wage = Math.max(1, Math.round(+String(w.value).replace(/[^\d]/g, '') || 0));
  };
  const finish = () => {
    const ag = agFee();
    if (ag) book('agents', -ag);
    if (mode === 'pre') {
      p.pre = { tid: u.id, w: N.wage, end: N.end, fee: N.fee };
      news(`📝 ${pFull(p)} podpísal predzmluvu – po sezóne príde zadarmo.`, 'good');
      N.msg = `${pFull(p)} podpísal predzmluvu do leta ${N.end}.`;
      N.step = 'done'; saveGame();
      return;
    }
    if (mode === 'renew') {
      p.raise = 0;
      p.w = N.wage; p.ce = N.end;
      news(`${pFull(p)} predĺžil zmluvu do leta ${N.end} (${wk(N.wage)}).`, 'good');
      N.msg = `${pFull(p)} podpísal novú zmluvu do leta ${N.end} za ${wk(N.wage)}.`;
    } else {
      completeTransfer(p, N.fee, N.wage, N.end, mode === 'buy' ? N.swap : null);
      p.mor = 66;
      N.msg = `${pFull(p)} je tvoj nový hráč!${N.fee ? ` (${U.money(N.fee)})` : ''}`;
      SFX.init(); SFX.cheer();
    }
    p.rel = N.rel ? U.nice(playerValue(p) * N.rel) : 0;
    p.gb = N.gb ? U.nice(N.wage * N.gb) : 0;
    N.step = 'done';
    saveGame();
  };
  const m = modal('<div></div>', {
    cls: 'pmodal negm',
    onClose: () => { if (N.step === 'done') rerender(); },
    on: (k) => {
      readInputs();
      if (k === 'x') return true;
      const adj = (key, st, k2) => {
        const v = N[key];
        if (k2 === '-10') N[key] = roundTo(v * 0.9, st);
        else if (k2 === '+10') N[key] = roundTo(v * 1.1, st);
        else if (k2 === '-') N[key] = Math.max(st, Math.round((v - st) / st) * st);
        else if (k2 === '+') N[key] = Math.round((v + st) / st) * st;
      };
      if (k[0] === 'c' && ['-10', '+10', '-', '+'].includes(k.slice(1))) adj('cash', cStep, k.slice(1));
      if (k[0] === 'w' && ['-10', '+10', '-', '+'].includes(k.slice(1))) adj('wage', wStep, k.slice(1));
      if (k === 'cAsk') N.cash = ask;
      if (k === 'c90') N.cash = roundTo(ask * 0.9, cStep);
      if (k === 'wDemand') N.wage = dEff();
      if (/^rel\d$/.test(k)) N.rel = +k.slice(3);
      if (/^gb\d$/.test(k)) N.gb = GB_OPTS[+k.slice(2)][0];
      if (k === 'w95') N.wage = roundTo(dW * 0.95, wStep);
      if (k === 'w105') N.wage = roundTo(dW * 1.05, wStep);
      if (/^y\d{4}$/.test(k)) N.end = +k.slice(1);
      if (k === 'takeCounter') { N.cash = N.counter; N.fee = N.counter; N.counter = null; N.step = 'terms'; N.msg = ''; }
      if (k === 'sendFee') {
        if (N.cash > u.budget) { N.msg = 'Na takúto ponuku nemáš peniaze.'; N.msgCls = 'bad'; }
        else if (tbCheck(N.cash)) { N.msg = tbCheck(N.cash); N.msgCls = 'bad'; }
        else if (N.swap != null && teamPlayers(u).length <= 16) { N.msg = 'Po výmene by si mal príliš malý káder.'; N.msgCls = 'bad'; }
        else {
          const r = evalOffer(p, N.cash, N.swap);
          if (r.res === 'accept') { N.fee = N.cash; N.step = 'terms'; N.msg = ''; N.counter = null; }
          else if (r.res === 'counter') { N.counter = r.fee; N.msg = `Klub ${U.esc(club.name)} chce viac: <b>${U.money(r.fee)}</b>${N.swap != null ? ' (spolu s výmenou)' : ''}.`; N.msgCls = 'warn'; }
          else if (r.res === 'angry') { N.msg = 'Klub sa urazil a ďalšie rokovania odmietol. Skús o pár dní.'; N.msgCls = 'bad'; saveGame(); render(); m.el.querySelector('[data-m=sendFee]').disabled = true; return false; }
          else { N.msg = 'Ponuka bola zamietnutá – je príliš nízka.'; N.msgCls = 'bad'; }
        }
      }
      if (k === 'askCap') {
        const r = askWageRaise(teamWageBill(u) - oldW + N.wage - board().wageCap);
        N.msg = r.msg; N.msgCls = r.res === 'no' ? 'bad' : 'warn'; saveGame();
      }
      if (k === 'sendTerms') {
        if (N.fee + agFee() > u.budget) { N.msg = 'Nemáš dosť peňazí (aj na províziu agenta).'; N.msgCls = 'bad'; }
        else if (mode !== 'renew' && mode !== 'buy' && tbCheck(N.fee + agFee())) { N.msg = tbCheck(N.fee + agFee()); N.msgCls = 'bad'; }
        else if (teamWageBill(u) - oldW + N.wage > board().wageCap) { N.msg = `Prekročíš rozpočet vedenia na platy (${wk(board().wageCap)}). Predaj hráča alebo ponúkni nižší plat.`; N.msgCls = 'bad'; }
        else {
          const r = evalTerms(p, N.wage, N.end, dEff());
          if (r === 'accept') finish();
          else if (r === 'angry') { N.msg = 'Hráč rokovanie ukončil. Skús to o pár dní.'; N.msgCls = 'bad'; saveGame(); render(); m.el.querySelector('[data-m=sendTerms]').disabled = true; return false; }
          else { N.msg = 'Hráč odmietol – chce lepšie podmienky.'; N.msgCls = 'bad'; }
        }
      }
      render();
      return false;
    },
  });
  m.el.addEventListener('change', e => { if (e.target.id === 'negSwap') { readInputs(); render(); } });
  m.el.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.classList.contains('ng-input')) e.target.blur(); });
  render();
}

// ── Prestupy (záložka) ──────────────────────────────────────────
function windowPill() {
  const w = windowNow();
  if (w.open) return `<div class="wpill open" title="Prestupové okno je otvorené">🔓 ${w.name} okno<small>${w.left === 0 ? 'posledný deň!' : 'ešte ' + (w.left + 1) + ' dní'}</small></div>`;
  return `<div class="wpill" title="Prestupové okno je zatvorené">🔒 Okno zatvorené<small>${w.next != null ? 'otvorí sa o ' + w.next + ' dní' : 'po sezóne'}</small></div>`;
}

function transferHistory() {
  const log = G.tlog || [];
  const nm = id => (id >= 0 && G.teams[id] ? teamTag(G.teams[id], 18, true) : '<span class="muted">voľný</span>');
  const T = { buy: 'Nákup', sell: 'Predaj', free: 'Voľný hráč', swap: 'Výmena', loanIn: 'Hosťovanie', loanOut: 'Hosťovanie', release: 'Uvoľnenie' };
  const buys = log.filter(e => e.type === 'buy').sort((a, b) => b.fee - a.fee)[0];
  const sells = log.filter(e => e.type === 'sell').sort((a, b) => b.fee - a.fee)[0];
  const sum = (t) => log.filter(e => e.type === t).reduce((a, e) => a + e.fee, 0);
  return `<div class="grid2"><div class="kv"><span>Najdrahší nákup</span><b>${buys ? U.esc(buys.name) + ' · ' + U.money(buys.fee) : '—'}</b></div>
<div class="kv"><span>Najdrahší predaj</span><b>${sells ? U.esc(sells.name) + ' · ' + U.money(sells.fee) : '—'}</b></div>
<div class="kv"><span>Spolu nákupy</span><b>${U.money(sum('buy'))}</b></div><div class="kv"><span>Spolu predaje</span><b>${U.money(sum('sell'))}</b></div></div>
<table class="tbl"><tr><th>Sezóna</th><th class="tl">Hráč</th><th class="tl">Odkiaľ</th><th class="tl">Kam</th><th class="hm">Typ</th><th>Suma</th></tr>
${log.map(e => `<tr data-a="player" data-id="${e.pid}" class="clk"><td>${e.y}/${String((e.y + 1) % 100).padStart(2, '0')}</td><td class="tl">${U.esc(e.name)}</td><td class="tl">${nm(e.from)}</td><td class="tl">${nm(e.to)}</td><td class="hm">${T[e.type] || ''}</td><td><b>${e.fee ? U.money(e.fee) : '—'}</b></td></tr>`).join('') || '<tr><td colspan="6" class="muted">Zatiaľ žiadne prestupy.</td></tr>'}</table>`;
}

// ── Ponuky a pošta ──────────────────────────────────────────────
// ── Pošta ───────────────────────────────────────────────────────
const MSG_TYPE = { offer: ['💰', 'Ponuka na hráča'], deal: ['✨', 'Udalosť'], scout: ['🔍', 'Tip od skauta'], window: ['📅', 'Prestupové okno'], contract: ['📝', 'Zmluvy'], sponsor: ['🤝', 'Sponzori'], info: ['📣', 'Klub'] };
const CLUB_MSG = ['window', 'contract', 'sponsor', 'info'];
function msgDate(m) {
  if (m.year !== G.year) return `${m.year}/${String((m.year + 1) % 100).padStart(2, '0')}`;
  const d = G.day - m.day;
  return d <= 0 ? 'dnes' : d === 1 ? 'včera' : `pred ${d} dňami`;
}
const chipsHtml = list => `<span class="evchips">${list.map(([c, t]) => `<i class="evc-${c}">${U.esc(t)}</i>`).join('')}</span>`;
function msgShell(m, cls, ic, title, body, extra = '') {
  return `<div class="mi ${cls} ${m.read ? '' : 'new'}"><div class="mi-ic">${ic}</div><div class="mi-b"><div class="mi-top"><b class="mi-t">${title}</b><span class="mi-d">${msgDate(m)}</span></div><div class="mi-x">${body}</div>${extra}</div></div>`;
}
function offerItem(m) {
  const p = G.players[m.pid], b = G.teams[m.from];
  if (!p || !b) return '';
  const st = { open: '', accepted: '<span class="st ok">Prijatá</span>', rejected: '<span class="st">Odmietnutá</span>', expired: '<span class="st">Vypršala</span>', withdrawn: '<span class="st">Stiahnutá</span>', closed: '<span class="st">Uzavretá</span>' }[m.status] || '';
  const val = playerValue(p), d = Math.round((m.fee / Math.max(1, val) - 1) * 100);
  const body = `za hráča <a data-a="player" data-id="${p.id}">${U.esc(pFull(p))}</a> ${ovr(p.r)} · trhová hodnota ${U.money(val)} <span class="${d >= 0 ? 'pos' : 'neg'}">(${d >= 0 ? '+' : ''}${d} %)</span>${m.status === 'open' ? ` · platí ešte ${Math.max(0, m.exp - G.day) + 1} dni` : ''}`;
  const btns = m.status === 'open' ? `<div class="m-btns left"><button class="btn btn-go sm" data-a="offAccept" data-id="${m.id}">Prijať</button>${p.age <= 26 ? `<button class="btn btn-go sm" data-a="offAcceptSO" data-id="${m.id}" title="Suma o 10 % nižšia, ale dostaneš 15 % z každého ďalšieho predaja">Prijať + 15 % z ďalšieho predaja</button>` : ''}<button class="btn btn-blue sm" data-a="offCounter" data-id="${m.id}">Protiponuka</button><button class="btn btn-ghost sm" data-a="offReject" data-id="${m.id}">Odmietnuť</button></div>` : st;
  return msgShell(m, `mi-offer ${m.status}`, crestSVG(b, 34), `${U.esc(b.name)} ponúka <b class="big-money">${U.money(m.fee)}</b>`, body, btns);
}
// veľká karta udalosti s možnosťami
function eventCard(d) {
  const cat = EV_CAT[d.cat] || EV_CAT.biz, left = Math.max(0, d.exp - G.day) + 1;
  return `<div class="evcard" style="--ec:${cat.c}"><div class="ev-head"><span class="ev-ic">${d.ic || '✨'}</span><div><small>${cat.ic} ${cat.n} · platí ešte ${left} ${left === 1 ? 'deň' : left <= 4 ? 'dni' : 'dní'}</small><b>${U.esc(d.title || 'Mimoriadna ponuka')}</b></div></div>
<p class="ev-txt">${U.esc(d.text)}</p>
<div class="ev-opts">${dealOpts(d).map((o, i) => `<button class="evo" data-a="dealPick" data-i="${i}"><b>${U.esc(o.l)}${d.cat === 'trouble' && i === (d.def ?? dealOpts(d).length - 1) ? ' <em class="ev-def" title="Stane sa, ak nevyberieš">⏳ predvolené</em>' : ''}</b>${chipsHtml(effChips(o.e))}</button>`).join('')}</div>
</div>`;
}
function offersList(onlyOpen) {
  const list = (G.inbox || []).filter(m => m.type === 'offer' && (!onlyOpen || m.status === 'open'));
  return list.map(offerItem).join('') || '<p class="muted">Žiadne ponuky.</p>';
}
function msgItem(m) {
  if (m.type === 'offer') return offerItem(m);
  const [ic, title] = MSG_TYPE[m.type] || MSG_TYPE.info;
  if (m.type === 'deal' && m.deal) {
    const d = m.deal, cat = EV_CAT[d.cat] || EV_CAT.biz;
    if (!m.status && G.biz && G.biz.deal && G.biz.deal.id === m.dealId) return msgShell(m, 'mi-deal open', d.ic || '✨', U.esc(d.title || 'Udalosť'), 'Čaká na tvoje rozhodnutie – pozri hore.');
    const o = m.choice != null ? dealOpts(d)[m.choice] : null;
    const st = m.status === 'expired' ? `<span class="st">Vypršalo${o && m.res ? ` · ${U.esc(o.l)}` : ''}</span>` : o ? `<span class="st ok">${U.esc(o.l)}</span>` : '<span class="st">Odmietnuté</span>';
    return msgShell(m, 'mi-deal', d.ic || '✨', `${U.esc(d.title || 'Mimoriadna ponuka')} <small class="mi-cat" style="color:${cat.c}">${cat.n}</small>`, U.esc(d.text), `<div class="mi-res">${st}${m.res ? chipsHtml(m.res) : ''}</div>`);
  }
  if (m.type === 'scout') {
    const p = G.players[m.pid];
    if (!p) return '';
    const t = p.tid >= 0 ? G.teams[p.tid] : null;
    return msgShell(m, 'mi-scout', ic, `${title} <span class="stars">${'★'.repeat(m.q || 1)}</span>`, `<b>${U.esc(m.scout)}</b> odporúča: <a data-a="player" data-id="${p.id}">${U.esc(pFull(p))}</a> ${dpBadge(p)} ${p.age} r. · ${ovrTxt(p)} ${potTxt(p)} · ${t ? `${crestSVG(t, 16)} ${U.esc(t.name)}` : 'voľný hráč'}${p.tid >= 0 ? ' · ' + U.money(askingPrice(p)) : ''}`);
  }
  let body = U.esc(m.text || '');
  if (m.type === 'sponsor') body += ` <button class="link" data-a="finGo" data-v="sponsors">Sponzori ›</button>`;
  return msgShell(m, 'mi-' + (MSG_TYPE[m.type] ? m.type : 'info'), ic, title, body);
}
function tabInbox() {
  const list = G.inbox || [], f = UI.inboxF || 'all', d = G.biz && G.biz.deal;
  const isOpenDeal = m => m.type === 'deal' && d && m.dealId === d.id && !m.status;
  const openOffers = list.filter(m => m.type === 'offer' && m.status === 'open');
  const match = m => f === 'all' || (f === 'club' ? CLUB_MSG.includes(m.type) : m.type === f);
  const rest = list.filter(m => match(m) && !isOpenDeal(m) && !(m.type === 'offer' && m.status === 'open'));
  const cnt = k => list.filter(m => k === 'club' ? CLUB_MSG.includes(m.type) : m.type === k).length;
  const unread = list.filter(m => !m.read).length;
  const chips = [['all', 'Všetko', list.length], ['deal', '✨ Udalosti', cnt('deal')], ['offer', '💰 Ponuky', cnt('offer')], ['scout', '🔍 Skauti', cnt('scout')], ['club', '📣 Klub', cnt('club')]];
  const pend = [];
  if (d && (f === 'all' || f === 'deal')) pend.push(eventCard(d));
  if (openOffers.length && (f === 'all' || f === 'offer')) pend.push(`<div class="card ib-offers"><div class="card-h">💰 Ponuky na tvojich hráčov <span class="muted">${openOffers.length}</span></div>${openOffers.map(offerItem).join('')}</div>`);
  return `<div class="inbox">
<div class="ib-top"><div class="ib-title">📬 Pošta${unread ? `<span class="badge">${unread} nových</span>` : ''}</div>
<div class="ib-f">${chips.map(([k, n, c]) => `<button class="chip ${f === k ? 'on' : ''}" data-a="inboxF" data-v="${k}">${n} <i>${c}</i></button>`).join('')}</div></div>
${pend.length ? `<div class="ib-sec">Čaká na tvoje rozhodnutie</div><div class="ib-pend">${pend.join('')}</div>` : ''}
<div class="card ib-list">${rest.map(msgItem).join('') || '<p class="muted ib-empty">Žiadne správy.</p>'}</div></div>`;
}
// upozornenie na Prehľade
function homeEvent() {
  const d = G.biz && G.biz.deal;
  if (!d) return '';
  const cat = EV_CAT[d.cat] || EV_CAT.biz;
  return `<div class="card hev" style="--ec:${cat.c}" data-a="tab" data-t="inbox"><span class="hev-ic">${d.ic || '✨'}</span><div><small>Nová udalosť · ${cat.n}</small><b>${U.esc(d.title || 'Mimoriadna ponuka')}</b></div><button class="btn btn-go sm" data-a="tab" data-t="inbox">Rozhodnúť ›</button></div>`;
}
function markInboxRead() { setTimeout(() => { for (const m of G.inbox || []) m.read = true; }, 50); }

// ── Skauting ────────────────────────────────────────────────────
function tabScout() {
  const u = userTeam();
  const scouts = G.scouts || [];
  const sel = (id, k, opts, cur) => `<select class="inp" data-c="scoutM" data-id="${id}" data-k="${k}">${opts.map(([v, n]) => `<option value="${v}" ${String(cur) === String(v) ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
  const lvls = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(l => [l, l + '. liga']);
  const ccs = [['', '🇸🇰 Slovensko'], ['ALL', '🌍 Celé zahraničie'], ...scoutCountries().map(c => [c, (EURO_COUNTRY[c] || [c])[0]])];
  const cards = scouts.map(s => {
    const M = s.mission, open = UI.scoutOpen === s.id;
    const where = M.cc ? (M.cc === 'ALL' ? '🌍 zahraničie' : '🌍 ' + (EURO_COUNTRY[M.cc] || [M.cc])[0]) : [M.reg ? REGIONS[M.reg].name : 'celé Slovensko', M.lmin === M.lmax ? `${M.lmin}. liga` : `${Math.max(1, M.lmin)}. – ${M.lmax}. liga`].join(' · ');
    const sum = [FOCUS[M.focus], where, M.pos ? POS_NAME_SK[M.pos] : 'všetky posty', +M.age ? `do ${M.age} r.` : 'každý vek'];
    return `<div class="scout ${open ? 'open' : ''}">
<div class="sc-h" data-a="scoutTog" data-id="${s.id}"><span class="sc-av">🔭</span>
<div class="sc-main"><div><b>${U.esc(s.name)}</b> <span class="stars">${'★'.repeat(s.q)}<i>${'★'.repeat(5 - s.q)}</i></span></div><small>${sum.join(' · ')}</small></div>
<div class="sc-stat"><b>${s.found}</b><small>hráčov</small></div><span class="sc-chev">▾</span></div>
${open ? `<div class="sc-body">
<div class="sc-m"><label>Zameranie ${sel(s.id, 'focus', Object.entries(FOCUS), s.mission.focus)}</label>
<label>Krajina ${sel(s.id, 'cc', ccs, s.mission.cc || '')}</label>
${s.mission.cc ? '' : `<label>Región ${sel(s.id, 'reg', [['', 'Celé Slovensko'], ['Z', 'Západ'], ['S', 'Stred'], ['V', 'Východ']], s.mission.reg)}</label>
<label>Ligy od ${sel(s.id, 'lmin', lvls, Math.max(1, s.mission.lmin))}</label><label>do ${sel(s.id, 'lmax', lvls, s.mission.lmax)}</label>`}
<label>Post ${sel(s.id, 'pos', [['', 'Všetky'], ['GK', 'Brankár'], ['DF', 'Obranca'], ['MF', 'Záložník'], ['FW', 'Útočník']], s.mission.pos)}</label>
<label>Vek ${sel(s.id, 'age', [[0, 'Každý'], [19, 'do 19'], [21, 'do 21'], [23, 'do 23'], [27, 'do 27']], s.mission.age)}</label></div>
<div class="sc-foot"><span class="muted small">${wk(s.wage)}${s.mission.cc ? ` + cestovné ${wk(U.nice(s.wage * 0.8))}` : ''} · preskúma ${scoutCap(s)} ${scoutCap(s) === 1 ? 'hráča' : 'hráčov'} naraz</span><button class="btn btn-ghost sm" data-a="fireScout" data-id="${s.id}">Prepustiť</button></div></div>` : ''}</div>`;
  }).join('');
  const pool = (G.scoutPool || []).map(s => `<div class="xr sf scp"><div class="xr-n"><b>${U.esc(s.name)}</b><small>podpis ${U.money(hireFee(s))}</small></div><span class="stars">${'★'.repeat(s.q)}<i>${'★'.repeat(5 - s.q)}</i></span><small class="xr-v">${wk(s.wage)}</small><button class="btn btn-go sm xr-b" data-a="hireScout" data-id="${s.id}" ${scouts.length >= 3 ? 'disabled' : ''}>Najať</button></div>`).join('');
  const queue = (G.scoutQueue || []).map(id => G.players[id]).filter(Boolean);
  const reps = (G.scouted || []).map(x => G.players[x.pid]).filter(p => p && p.tid !== u.id).slice(0, 40);
  return `${villageCard()}<div class="grid2 eq">
<div class="card"><div class="card-h">Tvoji skauti <span class="muted">${scouts.length}/3</span></div>${cards || '<p class="muted">Žiadny skaut.</p>'}</div>
<div class="card"><div class="card-h">Skauti na trhu práce</div><div class="xlist">${pool || '<p class="muted">Žiadni voľní skauti.</p>'}</div></div>

<div class="card wide"><div class="card-h">Skauti preskúmavajú <span class="muted">${queue.length} · naraz ${scouts.reduce((a, s) => a + scoutCap(s), 0)}</span></div><div class="plist">${queue.map(p => marketRow(p)).join('') || '<p class="muted">Prázdne – pri hráčovi klikni na 🔍</p>'}</div></div>
<div class="card wide"><div class="card-h">Posledné správy skautov</div>
<div class="plist">${reps.map(p => marketRow(p)).join('') || '<p class="muted">Zatiaľ nič</p>'}</div></div></div>`;
}

// ── Financie ────────────────────────────────────────────────────
// ── Akcie ───────────────────────────────────────────────────────
Object.assign(ACT, {
  player(el, e) { if (e && e.target.closest('button')) return; openPlayer(+el.dataset.id); },
  inboxF(el) { UI.inboxF = el.dataset.v; renderTab(); },
  scoutTog(el) { const id = +el.dataset.id; UI.scoutOpen = UI.scoutOpen === id ? null : id; renderTab(); },
  negotiate(el) { const p = G.players[+el.dataset.id]; openNegotiation(p.id, p.tid < 0 ? 'free' : 'buy'); },
  renew(el) { openNegotiation(+el.dataset.id, 'renew'); },
  scoutP(el) {
    const p = G.players[+el.dataset.id];
    if (!(G.scouts || []).length) { toast('Nemáš skauta – najmi si ho v záložke Skauting.', 'bad'); return; }
    G.scoutQueue = G.scoutQueue || [];
    if (!G.scoutQueue.includes(p.id)) G.scoutQueue.push(p.id);
    const sc = Math.max(...G.scouts.map(x => x.q)), net = (G.biz && G.biz.fac.scout) || 0, per = (10 + 6 * sc + 3 * net) * scoutDist(p);
    toast(`Skaut začal sledovať ${pName(p)} – úplná správa asi o ${Math.max(1, Math.ceil((100 - know(p)) / per))} ${Math.ceil((100 - know(p)) / per) <= 1 ? 'deň' : 'dní'}.`);
    saveGame(); rerender();
  },
  shortP(el) {
    const id = +el.dataset.id;
    G.short = G.short || [];
    if (G.short.includes(id)) G.short = G.short.filter(x => x !== id); else G.short.push(id);
    saveGame(); rerender();
  },
  scoutShort() {
    if (!(G.scouts || []).length) { toast('Nemáš skauta.', 'bad'); return; }
    let n = 0;
    for (const id of G.short || []) { const p = G.players[id]; if (p && know(p) < 100 && !G.scoutQueue.includes(id)) { G.scoutQueue.push(id); n++; } }
    toast(n ? `${n} hráčov čaká na skauta.` : 'Všetci sledovaní sú už preskautovaní.');
    saveGame();
  },
  toggleList(el) {
    const p = G.players[+el.dataset.id];
    p.listed = !p.listed;
    toast(p.listed ? `${pName(p)} je na predajnom zozname.` : `${pName(p)} stiahnutý zo zoznamu.`);
    saveGame(); rerender();
  },
  quickSell(el) {
    const p = G.players[+el.dataset.id];
    const err = sellCheck(p);
    if (err) { toast(err, 'bad'); return; }
    if (p.offerDay === dayKey()) { toast('Dnes už o hráča nikto ďalší nemá záujem.'); return; }
    p.offerDay = dayKey();
    const of = quickSaleOffer(p);
    if (!of) { toast('O hráča momentálne nikto nemá záujem.'); return; }
    modal(`<h3>Rýchly predaj</h3><div class="mt-head">${crestSVG(of.buyer, 56)}<div><b>${U.esc(of.buyer.name)}</b><div class="muted">${leagueOf(of.buyer).name}</div></div></div>
<p>Klub ponúka hneď <b class="big-money">${U.money(of.offer)}</b> za ${U.esc(pFull(p))}.<br><span class="muted">Trhová hodnota: ${U.money(playerValue(p))}. Lepšiu cenu získaš cez predajný zoznam.</span></p>
<div class="m-btns"><button class="btn btn-ghost" data-m="no">Odmietnuť</button><button class="btn btn-go" data-m="ok">Predať</button></div>`, {
      on: k => { if (k === 'ok') { UI.sel = null; sellTo(p, of.buyer, of.offer); saveGame(); toast(`${pFull(p)} predaný za ${U.money(of.offer)}.`, 'good'); rerender(); } },
    });
  },
  release(el) {
    const p = G.players[+el.dataset.id];
    if (p.loan) { toast('Hráč je u teba len na hosťovaní.', 'bad'); return; }
    const ps = teamPlayers(userTeam());
    if (ps.length <= 16) { toast('V kádri musíš mať aspoň 16 hráčov.', 'bad'); return; }
    confirmBox('Uvoľniť hráča', `Naozaj chceš uvoľniť <b>${U.esc(pFull(p))}</b>? Odstupné za zmluvu: <b>${U.money(releaseCost(p))}</b>.`, 'Uvoľniť', () => {
      releasePlayer(p); UI.sel = null; saveGame(); rerender();
    }, 'btn-bad');
  },
  loanIn(el) {
    const p = G.players[+el.dataset.id];
    const err = loanInCheck(p);
    if (err) { toast(err, 'bad'); return; }
    const fee = loanFee(p);
    if (userTeam().budget < fee) { toast('Nemáš dosť peňazí.', 'bad'); return; }
    confirmBox('Hosťovanie', `Požičať <b>${U.esc(pFull(p))}</b> z klubu ${U.esc(G.teams[p.tid].name)} do konca sezóny za <b>${U.money(fee)}</b>? Budeš platiť jeho plat ${wk(p.w || 0)}.`, 'Požičať', () => {
      loanIn(p); saveGame(); toast(`${pFull(p)} prichádza na hosťovanie.`, 'good'); rerender();
    });
  },
  loanOut(el) {
    const p = G.players[+el.dataset.id];
    const err = loanOutCheck(p);
    if (err) { toast(err, 'bad'); return; }
    const ts = loanOutTargets(p);
    if (!ts.length) { toast('Žiadny klub teraz nemá o hosťovanie záujem.'); return; }
    modal(`<h3>Poslať na hosťovanie</h3><p>${U.esc(pFull(p))} bude hrať v inom klube do konca sezóny. Plat platí hosťujúci klub a mladý hráč, ktorý odohrá aspoň 8 zápasov, sa zlepší.</p>
<div class="plist">${ts.map(t => `<button class="fr-t" data-m="t${t.id}">${crestSVG(t, 28)}<span>${U.esc(t.name)}</span><small>${leagueOf(t).name} · OVR ${teamRating(t)}</small></button>`).join('')}</div>
<div class="m-btns"><button class="btn btn-ghost" data-m="x">Zrušiť</button></div>`, {
      on: k => { if (k[0] === 't') { const t = G.teams[+k.slice(1)]; UI.sel = null; loanOut(p, t); saveGame(); toast(`${pName(p)} ide na hosťovanie do klubu ${t.short}.`, 'good'); rerender(); } },
    });
  },
  offAccept(el) {
    const m = G.inbox.find(x => x.id === +el.dataset.id);
    const err = acceptOffer(m);
    if (err) toast(err, 'bad'); else { toast('Hráč predaný!', 'good'); saveGame(); }
    rerender();
  },
  offAcceptSO(el) {
    const m = G.inbox.find(x => x.id === +el.dataset.id), p = G.players[m.pid];
    const fee0 = m.fee; m.fee = U.nice(m.fee * 0.9);
    const err = acceptOffer(m);
    if (err) { m.fee = fee0; toast(err, 'bad'); } else { p.sellOn = { tid: G.userTid, pct: 15 }; toast('Hráč predaný – 15 % z ďalšieho predaja je tvojich.', 'good'); saveGame(); }
    rerender();
  },
  offReject(el) { const m = G.inbox.find(x => x.id === +el.dataset.id); m.status = 'rejected'; saveGame(); rerender(); },
  offCounter(el) {
    const m = G.inbox.find(x => x.id === +el.dataset.id);
    const p = G.players[m.pid];
    modal(`<h3>Protiponuka</h3><p>${U.esc(G.teams[m.from].name)} ponúka ${U.money(m.fee)} za ${U.esc(pFull(p))} (hodnota ${U.money(playerValue(p))}). Koľko chceš?</p>
<div class="neg-row"><span>Tvoja požiadavka</span><input class="inp" id="ctrFee" value="${U.nice(m.fee * 1.2)}" inputmode="numeric"></div>
<div class="m-btns"><button class="btn btn-ghost" data-m="x">Zrušiť</button><button class="btn btn-go" data-m="ok">Poslať</button></div>`, {
      on: (k, b, root) => {
        if (k !== 'ok') return;
        const fee = Math.round(+String(root.querySelector('#ctrFee').value).replace(/[^\d]/g, '') || 0);
        const r = counterOffer(m, fee);
        if (r.err) toast(r.err, 'bad');
        else if (r.ok) toast(`Dohodnuté! ${pFull(p)} predaný za ${U.money(fee)}.`, 'good');
        else if (r.withdrawn) toast('Klub ponuku stiahol.', 'bad');
        else toast('Klub trvá na svojej ponuke.');
        saveGame(); rerender();
      },
    });
  },
  hireScout(el) { const err = hireScout(+el.dataset.id); if (err) toast(err, 'bad'); else { toast('Skaut najatý.', 'good'); saveGame(); } rerender(); },
  fireScout(el) {
    const s = G.scouts.find(x => x.id === +el.dataset.id);
    confirmBox('Prepustiť skauta', `Prepustiť skauta ${U.esc(s.name)}? Odstupné ${U.money(U.nice(s.wage * 2))}.`, 'Prepustiť', () => { fireScout(s.id); saveGame(); rerender(); }, 'btn-bad');
  },
});

Object.assign(CHG, {
  scoutM(el) {
    const s = G.scouts.find(x => x.id === +el.dataset.id);
    if (!s) return;
    const k = el.dataset.k;
    s.mission[k] = ['lmin', 'lmax', 'age'].includes(k) ? +el.value : el.value;
    if (k === 'cc' && !el.value) { s.mission.lmin = Math.max(1, s.mission.lmin); }
    if (s.mission.lmin > s.mission.lmax) { if (k === 'lmin') s.mission.lmax = s.mission.lmin; else s.mission.lmin = s.mission.lmax; }
    saveGame(); renderTab();
  },
});
