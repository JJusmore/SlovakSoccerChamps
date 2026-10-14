'use strict';
// ─── Záložka Financie: prehľad, sponzori, štadión a vstupné, zariadenia ───

UI.fin = { mode: 'overview' };
UI.live && UI.live.add('fin_ticket');

const eur2 = v => (Math.round(v * 100) % 100 ? v.toFixed(2).replace('.', ',') : String(Math.round(v))) + ' €';
// presné eurá pri menších sumách (do 10 tis.), inak skrátene
const eur = v => (Math.abs(v) < 1e4 ? (v < 0 ? '−' : '') + Math.round(Math.abs(v)).toLocaleString('sk-SK') + ' €' : U.money(v));
const plus = v => (v > 0 ? '+' : '') + eur(v);
const INC_CATS = ['mafia', 'euro', 'spons', 'gate', 'st', 'cater', 'vip', 'merch', 'tours', 'resto', 'tv', 'grant', 'events', 'prize', 'sales', 'loans'];
const EXP_CATS = ['wages', 'staff', 'bonus', 'agents', 'ops', 'matchday', 'upkeep', 'scouts', 'women', 'fines', 'eventx', 'buys', 'loans', 'invest', 'other'];
const CAT_IC = { mafia: '🕶️', staff: '👔', agents: '🕴️', bonus: '⚽', women: '👩', fines: '⚖️', euro: '🌍', gate: '🎟️', vip: '🥂', st: '🎫', cater: '🌭', merch: '🛍️', spons: '🤝', tv: '📺', grant: '🏛️', events: '✨', prize: '🏆', sales: '💰', loans: '🔁', buys: '🛒', wages: '👕', scouts: '🔭', invest: '🏗️', ops: '🏢', upkeep: '🔧', matchday: '🚧', eventx: '⚠️', tours: '🏛️', resto: '🍽️', other: '•', season: '🏛️' };
const CAT_COL = { tours: '#d9b38c', resto: '#ff9fb3', spons: '#47e087', gate: '#5ab8ff', vip: '#c79bff', merch: '#ffb02e', tv: '#ff7bd5', season: '#8fe3d2', wages: '#ff5a5f', ops: '#ff9f6b', matchday: '#ffcc66', upkeep: '#d98cff', scouts: '#8fb4ff' };
const W_INC = { spons: 'Sponzori', tv: 'TV práva', merch: 'Fanshop a suveníry', gate: 'Vstupné a občerstvenie', vip: 'VIP lóže', tours: 'Múzeum', resto: 'Reštaurácia', season: 'Dotácia a permanentky' };
const W_EXP = { wages: 'Platy hráčov', ops: 'Prevádzka klubu', matchday: 'Organizácia zápasov', upkeep: 'Údržba areálu', scouts: 'Skauti' };
const W_HINT = { gate: 'priemer – doma hráš každé druhé kolo', vip: 'priemer na kolo', season: 'zaplatené na začiatku sezóny, rozpočítané na kolá', ops: 'realizačný tím, cestovanie, energie', matchday: 'usporiadatelia, bezpečnosť, upratovanie', upkeep: '0,2 % hodnoty zariadení za kolo' };

// ── Grafy ───────────────────────────────────────────────────────
let CH_N = 0;
function lineChart(vals, opts = {}) {
  if (!vals || vals.length < 2) return `<p class="muted ch-empty">${opts.empty || 'Zatiaľ bez dát'}</p>`;
  const id = 'lc' + (++CH_N), col = opts.color || '#47e087';
  const W = 600, H = opts.h || 170, PX = 6, PT = 14, PB = 10;
  const mn0 = Math.min(...vals), mx0 = Math.max(...vals);
  const mn = opts.zero === false ? mn0 - (mx0 - mn0) * 0.15 : Math.min(0, mn0), mx = mx0 + (mx0 - mn) * 0.08 + 1;
  const x = i => PX + i / (vals.length - 1) * (W - 2 * PX);
  const y = v => PT + (1 - (v - mn) / Math.max(1, mx - mn)) * (H - PT - PB);
  const pts = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const base = y(mn < 0 && mx > 0 ? 0 : mn);
  const fmt = opts.fmt || U.money, last = vals[vals.length - 1];
  const grid = [0.25, 0.5, 0.75].map(k => `<line x1="0" x2="${W}" y1="${(PT + k * (H - PT - PB)).toFixed(1)}" y2="${(PT + k * (H - PT - PB)).toFixed(1)}" class="ch-grid"/>`).join('');
  return `<div class="lchart"><svg class="chart2" viewBox="0 0 ${W} ${H}" role="img" aria-label="${opts.label || 'Graf'}">
<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".42"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>
${grid}${mn < 0 ? `<line x1="0" x2="${W}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}" class="ch-zero"/>` : ''}
<polygon points="${x(0).toFixed(1)},${base.toFixed(1)} ${pts} ${x(vals.length - 1).toFixed(1)},${base.toFixed(1)}" fill="url(#${id})"/>
<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
<circle cx="${x(vals.length - 1).toFixed(1)}" cy="${y(last).toFixed(1)}" r="9" fill="${col}" opacity=".25"/><circle cx="${x(vals.length - 1).toFixed(1)}" cy="${y(last).toFixed(1)}" r="4.5" fill="#fff" stroke="${col}" stroke-width="2.5"/></svg>
<div class="ch-lab"><span>${opts.l0 || fmt(vals[0])}</span><span>max ${fmt(mx0)}</span><span><b>${fmt(last)}</b></span></div></div>`;
}

function seasonBars(hist) {
  const rows = hist.slice(0, 8).reverse();
  if (!rows.length) return '<p class="muted ch-empty">Zatiaľ bez dát</p>';
  const net = h => INC_CATS.reduce((a, k) => a + Math.max(0, h[k] || 0), 0) + EXP_CATS.reduce((a, k) => a + Math.min(0, h[k] || 0), 0);
  const vs = rows.map(net), mx = Math.max(1, ...vs.map(Math.abs));
  const W = 600, H = 170, mid = vs.some(v => v < 0) ? H / 2 : H - 26, bw = Math.min(56, (W - 20) / rows.length - 14);
  const amp = vs.some(v => v < 0) ? H / 2 - 26 : H - 46;
  return `<svg class="chart2" viewBox="0 0 ${W} ${H}" role="img" aria-label="Zisk podľa sezón">
<line x1="0" x2="${W}" y1="${mid}" y2="${mid}" class="ch-zero"/>
${rows.map((h, i) => {
    const v = vs[i], hh = Math.max(2, Math.abs(v) / mx * amp), cx = 10 + (i + 0.5) * (W - 20) / rows.length;
    const yy = v >= 0 ? mid - hh : mid;
    return `<rect x="${(cx - bw / 2).toFixed(1)}" y="${yy.toFixed(1)}" width="${bw.toFixed(1)}" height="${hh.toFixed(1)}" rx="6" fill="${v >= 0 ? '#2ecc71' : '#ff5a5f'}" opacity=".9"/>
<text x="${cx.toFixed(1)}" y="${(v >= 0 ? yy - 6 : yy + hh + 14).toFixed(1)}" class="ch-t" text-anchor="middle">${U.esc(plus(v))}</text>
<text x="${cx.toFixed(1)}" y="${H - 6}" class="ch-t mut" text-anchor="middle">${U.esc(h.season.slice(2))}</text>`;
  }).join('')}</svg>`;
}

// ── Výpočty ─────────────────────────────────────────────────────
function seasonStartBudget() {
  const cur = fin().cur || {};
  return userTeam().budget - Object.values(cur).reduce((a, v) => a + v, 0);
}
function finProjection() {
  const u = userTeam(), lg = leagueOf(u), w = weeklyParts(), h = homeMatchEstimate(null);
  let left = 0, homes = 0;
  for (let d = G.day; d < G.calendar.length; d++) {
    const ev = G.calendar[d];
    if (ev.t !== 'L') continue;
    left++;
    if ((lg.rounds[ev.r] || []).some(m => m.h === u.id && m.hg == null)) homes++;
  }
  if (lg.lvl === 1 && !lg.groupA) homes += 5;
  const tbl = leagueTable(lg), pos = Math.max(0, tbl.findIndex(r => r.tid === u.id));
  const prize = U.nice(LEVEL_INFO[lg.lvl].prize * Math.max(0.15, 1 - pos / tbl.length));
  const fixed = w.I.spons + w.I.tv + w.I.merch - (w.E.wages + w.E.ops + w.E.upkeep + w.E.scouts);
  return { left, homes, prize, pos: pos + 1, end: Math.round(u.budget + left * fixed + homes * h.net + (seasonOver() ? 0 : prize)) };
}
function finHealth() {
  const u = userTeam(), w = weeklyParts();
  const ratio = w.exp / Math.max(1, w.inc), wageShare = w.E.wages / Math.max(1, w.inc);
  const loss = w.exp - w.inc;
  const reserve = loss > 0 ? Math.floor(Math.max(0, u.budget) / loss) : Infinity;
  let g, name;
  if (u.budget < 0) [g, name] = ['E', 'Kritické'];
  else if (ratio < 0.75) [g, name] = ['A', 'Výborné'];
  else if (ratio < 0.9) [g, name] = ['B', 'Dobré'];
  else if (ratio < 1 || reserve > 40) [g, name] = ['C', 'Napäté'];
  else if (reserve > 12) [g, name] = ['D', 'Rizikové'];
  else [g, name] = ['E', 'Kritické'];
  const wageCap = Math.max(0, U.nice(w.inc * 0.9 - (w.exp - w.E.wages)));
  return { g, name, ratio, wageShare, reserve, wageCap, w };
}
function finTips() {
  const b = G.biz, u = userTeam(), out = [], hl = finHealth();
  const open = Object.keys(SLOTS).filter(s => !b.sp[s] && (b.offers[s] || []).length);
  if (open.length) {
    const add = open.reduce((a, s) => { const o = bestOffer(s); return a + (o ? o.weekly : 0); }, 0);
    out.push(['good', '🤝', `Voľní sponzori: ${open.length} (+${wk(add)})`, 'finMode', 'sponsors', 'Podpísať']);
  }
  const opp = nextHomeOpp(), bt = bestTicket(opp), now = homeMatchEstimate(opp).net, best = homeMatchEstimate(opp, bt).net;
  if (bt !== b.ticket && best > now * 1.05 + 20) out.push(['good', '🎟️', `Lístok za ${eur2(bt)}: +${U.money(best - now)} za zápas`, 'tkSet', 'best', 'Nastaviť']);
  if (b.attLast && b.attLast >= capacity() * 0.96 && facCost('stad') != null && !facBuilding('stad')) out.push(['info', '🏟️', `Vypredané – väčší štadión: +${U.money(facGain('stad'))}/sezónu`, 'facFocus', 'stad', 'Rozšíriť']);
  if (hl.wageShare > 0.72) out.push(['bad', '👕', `Platy: ${Math.round(hl.wageShare * 100)} % príjmov (zdravé do 60 %)`, 'tab', 'transfers', 'Prestupy']);
  if (hl.reserve < 20) out.push(['bad', '⚠️', `−${U.money(hl.w.exp - hl.w.inc)} za kolo · vydrží ${hl.reserve} kôl`]);
  const roi = FAC_KEYS.filter(k => facCost(k) != null && !facBuilding(k) && !facReq(k)).map(k => { const g = facGain(k) - upkeepNext(k) * 32; return [k, g > 0 ? facCost(k) / g : Infinity]; }).filter(x => x[1] < 5).sort((a, c) => a[1] - c[1])[0];
  if (roi && u.budget > facCost(roi[0]) * 1.4 && (b.build || []).length < 2) out.push(['good', '🏗️', `${FAC[roi[0]].name}: vráti sa za ${roi[1].toFixed(1).replace('.', ',')} sez.`, 'facFocus', roi[0], 'Postaviť']);
  if (b.deal) out.push(['info', b.deal.ic || '✨', b.deal.title || 'Nová udalosť', 'tab', 'inbox', 'Pošta']);
  if (!out.length) out.push(['good', '✅', 'Všetko v poriadku']);
  return out;
}

// ── Prehľad ─────────────────────────────────────────────────────
function finKpis() {
  const u = userTeam(), b = G.biz, hl = finHealth(), w = hl.w, wb = w.inc - w.exp;
  const nsp = Object.values(b.sp).filter(Boolean).length;
  return `<div class="fin-kpis">
<div class="fk fk-budget"><span class="fk-ic">💶</span><div><small>Rozpočet</small><b class="${u.budget < 0 ? 'neg' : ''}">${U.money(u.budget)}</b></div></div>
<div class="fk"><span class="fk-ic">📈</span><div><small>Príjmy za kolo</small><b class="pos">${eur(w.inc)}</b></div></div>
<div class="fk"><span class="fk-ic">📉</span><div><small>Výdavky za kolo</small><b class="neg">${eur(w.exp)}</b></div></div>
<div class="fk"><span class="fk-ic">⚖️</span><div><small>Bilancia za kolo</small><b class="${wb < 0 ? 'neg' : 'pos'}">${plus(wb)}</b></div></div>
<div class="fk fk-health h-${hl.g}"><span class="fk-grade">${hl.g}</span><div><small>Finančné zdravie</small><b>${hl.name}</b></div></div>
<div class="fk clk ${nsp < 5 ? 'warnb' : ''}" data-a="finMode" data-v="sponsors"><span class="fk-ic">🤝</span><div><small>Sponzori</small><b>${nsp}<span class="muted">/5</span>${nsp < 5 && Object.keys(SLOTS).some(s => !b.sp[s] && (b.offers[s] || []).length) ? ' <span class="small warn">podpíš ›</span>' : ''}</b></div></div>
</div>`;
}

function stackBar(parts, total, cols) {
  return `<div class="stack">${parts.filter(([, v]) => v > 0).map(([k, v]) => `<i style="width:${(v / Math.max(1, total) * 100).toFixed(2)}%;background:${cols[k] || '#888'}" title="${U.esc((W_INC[k] || W_EXP[k] || k) + ': ' + U.money(v))}"></i>`).join('')}</div>`;
}

function weekCard() {
  const w = weeklyParts(), net = w.inc - w.exp, top = Math.max(w.inc, w.exp, 1);
  const rows = (o, names, sign) => Object.keys(names).filter(k => o[k] > 0).sort((a, c) => o[c] - o[a]).map(k => `<div class="wk-row"><i class="sw" style="background:${CAT_COL[k]}"></i><span${W_HINT[k] ? ` title="${W_HINT[k]}"` : ''}>${CAT_IC[k]} ${names[k]}</span><b class="${sign}">${sign === 'neg' ? '−' : ''}${eur(o[k])}</b></div>`).join('');
  return `<div class="card wkcard"><div class="card-h">Rozpočet jedného kola</div>
<div class="wk-bars"><div><small>Príjmy</small>${stackBar(Object.entries(w.I), top, CAT_COL)}<b class="pos">${eur(w.inc)}</b></div>
<div><small>Výdavky</small>${stackBar(Object.entries(w.E), top, CAT_COL)}<b class="neg">−${eur(w.exp)}</b></div></div>
<div class="wk-cols"><div>${rows(w.I, W_INC, 'pos')}</div><div>${rows(w.E, W_EXP, 'neg')}</div></div>
<div class="wk-net ${net < 0 ? 'bad' : ''}"><span>Bilancia jedného kola</span><b>${plus(net)}</b></div>
</div>`;
}

function gaugeSVG(hl) {
  const r = 70, cx = 90, cy = 86;
  const seg = (a0, a1, c) => { const p = a => [cx + r * Math.cos(Math.PI * (1 - a)), cy - r * Math.sin(Math.PI * (1 - a))]; const [x0, y0] = p(a0), [x1, y1] = p(a1); return `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" stroke="${c}" stroke-width="14" fill="none"/>`; };
  const t = U.clamp((1.25 - hl.ratio) / 0.75, 0.02, 0.98), ang = Math.PI * (1 - t);
  const nx = cx + (r - 18) * Math.cos(ang), ny = cy - (r - 18) * Math.sin(ang);
  return `<svg class="gauge" viewBox="0 0 180 100" aria-hidden="true">
${seg(0, 0.2, '#ff5a5f')}${seg(0.205, 0.4, '#ff9f43')}${seg(0.405, 0.6, '#ffd23f')}${seg(0.605, 0.8, '#9be15d')}${seg(0.805, 1, '#2ecc71')}
<line x1="${cx}" y1="${cy}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="7" fill="#fff"/></svg>`;
}

function healthCard() {
  const hl = finHealth(), w = hl.w;
  const tips = finTips();
  return `<div class="card hcard h-${hl.g}"><div class="card-h">Finančné zdravie</div>
<div class="hc-top">${gaugeSVG(hl)}<div class="hc-grade"><b>${hl.g}</b><span>${hl.name}</span></div></div>
<div class="kv"><span>Výdavky z príjmov</span><b>${Math.round(hl.ratio * 100)} %</b></div>
<div class="kv"><span title="Zdravé je do 60 %">Platy z príjmov</span><b class="${hl.wageShare > 0.72 ? 'neg' : hl.wageShare > 0.6 ? 'warn' : ''}">${Math.round(hl.wageShare * 100)} %</b></div>
<div class="kv"><span>Odporúčaný strop platov</span><b>${eur(hl.wageCap)}/týž.</b></div>
<div class="kv"><span>${hl.reserve === Infinity ? 'Klub je v pluse' : 'Rezerva'}</span><b>${hl.reserve === Infinity ? '✔' : hl.reserve + ' kôl'}</b></div>
<div class="tips">${tips.map(([t, ic, txt, a, v, lab]) => `<div class="tip ${t}"><span class="tip-ic">${ic}</span><span>${txt}</span>${a ? `<button class="link" data-a="${a}" data-v="${v}" data-t="${v}">${lab} ›</button>` : ''}</div>`).join('')}</div></div>`;
}

function catList(cur, cats, sign) {
  const vals = cats.map(k => [k, cur[k] || 0]).filter(([, v]) => sign > 0 ? v > 0 : v < 0).map(([k, v]) => [k, Math.abs(v)]);
  const sum = vals.reduce((a, v) => a + v[1], 0), mx = Math.max(1, ...vals.map(v => v[1]));
  return `${vals.sort((a, c) => c[1] - a[1]).map(([k, v]) => `<div class="cb"><span>${CAT_IC[k] || ''} ${FIN_CATS[k]}</span><div class="cb-bar"><i class="${sign > 0 ? 'inc' : 'exp'}" style="width:${(v / mx * 100).toFixed(1)}%"></i></div><b class="${sign > 0 ? 'pos' : 'neg'}">${sign > 0 ? '' : '−'}${eur(v)}<small>${Math.round(v / Math.max(1, sum) * 100)} %</small></b></div>`).join('') || '<p class="muted small">Zatiaľ nič.</p>'}
<div class="cb-tot"><span>Spolu</span><b class="${sign > 0 ? 'pos' : 'neg'}">${sign > 0 ? '' : '−'}${eur(sum)}</b></div>`;
}

function finOverview() {
  const u = userTeam(), f = fin(), cur = f.cur || {};
  const start = seasonStartBudget(), delta = u.budget - start, pj = finProjection();
  const totI = INC_CATS.reduce((a, k) => a + Math.max(0, cur[k] || 0), 0), totE = EXP_CATS.reduce((a, k) => a + Math.min(0, cur[k] || 0), 0);
  const earners = teamPlayers(u).sort((a, c) => (c.w || 0) - (a.w || 0)).slice(0, 8), wb = Math.max(1, teamWageBill(u));
  const net = h => INC_CATS.reduce((a, k) => a + Math.max(0, h[k] || 0), 0) + EXP_CATS.reduce((a, k) => a + Math.min(0, h[k] || 0), 0);
  return `<div class="card fin-hero">
<div class="fh-main"><small>Rozpočet klubu</small><div class="fh-big ${u.budget < 0 ? 'neg' : ''}">${U.money(u.budget)}</div>
<div class="fh-delta ${delta < 0 ? 'neg' : 'pos'}">${delta < 0 ? '▼' : '▲'} ${plus(delta)} <span class="muted">od začiatku sezóny</span></div>
${seasonOver() ? '' : `<div class="fh-proj"><small>Odhad na konci sezóny</small><b class="${pj.end < 0 ? 'neg' : ''}">${U.money(pj.end)}</b><span class="muted">${pj.left} kôl · ${pj.homes} domácich zápasov · prémia ≈ ${U.money(pj.prize)} za ${pj.pos}. miesto</span></div>`}</div>
<div class="fh-chart">${lineChart(f.bal, { label: 'Vývoj rozpočtu v sezóne', l0: 'začiatok sezóny', color: u.budget < start ? '#ff7b7f' : '#47e087' })}</div></div>
<div class="grid2 fin-grid"><div>${weekCard()}</div><div>${healthCard()}</div></div>
<div class="card"><div class="card-h">Sezóna ${seasonLabel()} doteraz <span class="${totI + totE < 0 ? 'neg' : 'pos'}">${totI + totE < 0 ? 'strata' : 'zisk'} ${U.money(Math.abs(totI + totE))}</span></div>
<div class="grid2 seas"><div><div class="sub-h">Príjmy</div>${catList(cur, INC_CATS, 1)}</div><div><div class="sub-h">Výdavky</div>${catList(cur, EXP_CATS, -1)}</div></div></div>
<div class="grid2 fin-grid"><div class="card"><div class="card-h">Zisk podľa sezón</div>${seasonBars(f.hist || [])}
${(f.hist || []).length ? `<table class="tbl fin-hist"><tr><th>Sezóna</th><th>Príjmy</th><th>Výdavky</th><th>Zisk</th><th>Rozpočet</th></tr>${f.hist.slice(0, 8).map(h => `<tr><td>${h.season}</td><td class="pos">${U.money(INC_CATS.reduce((a, k) => a + Math.max(0, h[k] || 0), 0))}</td><td class="neg">${U.money(-EXP_CATS.reduce((a, k) => a + Math.min(0, h[k] || 0), 0))}</td><td class="${net(h) < 0 ? 'neg' : 'pos'}">${plus(net(h))}</td><td><b>${U.money(h.end)}</b></td></tr>`).join('')}</table>` : ''}</div>
<div class="card"><div class="card-h">Najvyššie platy <span class="muted">spolu ${wk(teamWageBill(u))}</span></div><div class="plist">${earners.map(p => `<div class="prow wage-row" data-a="player" data-id="${p.id}">${dpBadge(p)}<span class="pr-n">${U.esc(pFull(p))}<i class="wbar"><i style="width:${((p.w || 0) / (earners[0].w || 1) * 100).toFixed(0)}%"></i></i></span>${ovr(p.r)}<span class="pr-ct">${ctTxt(p)}</span><span class="pr-wage">${wk(p.w || 0)}<small>${Math.round((p.w || 0) / wb * 100)} %</small></span></div>`).join('')}</div></div></div>`;
}

// ── Sponzori ────────────────────────────────────────────────────
function spCard(slot) {
  const b = G.biz, def = SLOTS[slot], c = b.sp[slot];
  const head = `<div class="sp-h"><span class="sp-ic">${def.ic}</span><div><b>${def.name}</b><small>${def.desc}</small></div>${c ? '<span class="sp-ok">✔ podpísané</span>' : ''}</div>`;
  if (c) {
    return `<div class="sp-card signed">${head}
<div class="sp-name">${U.esc(c.name)}</div>
<div class="sp-tags"><span class="sp-type t-${c.type}">${SP_TYPE[c.type]}</span><span class="muted">zmluva do leta ${c.until}</span></div>
<div class="sp-money"><b>${wk(c.weekly)}</b><small>${sponsorDesc(c)}${c.type === 'win' ? ` · zatiaľ ${c.wins || 0} výhier` : ''}</small></div></div>`;
  }
  const offers = b.offers[slot] || [];
  if (!offers.length) return `<div class="sp-card empty">${head}<div class="reco-empty">Voľné miesto. Nové ponuky prídu v najbližšom prestupovom okne.</div></div>`;
  const best = bestOffer(slot);
  return `<div class="sp-card">${head}<div class="sp-offers">${offers.map(o => {
    const sv = offerSeasonValue(o), isBest = best && best.id === o.id;
    return `<div class="spo ${isBest ? 'best' : ''}">
${isBest ? '<div class="spo-best">⭐ Najvýhodnejšia</div>' : ''}
<div class="spo-top"><b>${U.esc(o.name)}</b><span class="sp-type t-${o.type}">${SP_TYPE[o.type]}</span></div>
<div class="spo-grid">
  <div><small>Za kolo</small><b class="acc">${U.money(o.weekly)}</b></div>
  <div><small>Za sezónu ≈</small><b class="pos">${U.money(sv)}</b></div>
  <div><small>Pri podpise</small><b>${U.money(o.sign)}</b></div>
  <div><small>Dĺžka</small><b>${o.years} ${seasonsWord(o.years)}</b></div>
</div>
<div class="spo-cond">${o.type === 'fixed' ? '🔒 Istá suma bez podmienok' : o.type === 'win' ? `🏆 ${sponsorDesc(o)} <span class="muted">(odhad ${expectedWins()} výhier)</span>` : o.type === 'goal' ? `🎯 ${sponsorDesc(o)} <span class="muted">(šanca ≈ ${Math.round(goalChance(o.target) * 100)} %)</span>` : `🛍️ ${sponsorDesc(o)}`}</div>
<div class="spo-btns"><button class="btn btn-ghost sm" data-a="spNeg" data-s="${slot}" data-id="${o.id}" ${o.neg ? 'disabled' : ''} title="55 % šanca na +8 až 18 %, inak sponzor odíde">${o.neg ? '✔ Vyjednané' : '💬 Vyjednať viac'}</button>
<button class="btn btn-go sm" data-a="spSign" data-s="${slot}" data-id="${o.id}">✍️ Podpísať</button></div></div>`;
  }).join('')}</div></div>`;
}

function finSponsors() {
  const b = G.biz, w = weeklyParts();
  const open = Object.keys(SLOTS).filter(s => !b.sp[s] && (b.offers[s] || []).length);
  const total = open.reduce((a, s) => { const o = bestOffer(s); return a + (o ? o.weekly : 0); }, 0);
  return `<div class="card"><div class="card-h">Sponzorské zmluvy <span class="muted">teraz ${wk(sponsorWeekly())} · ${Math.round(w.I.spons / Math.max(1, w.inc) * 100)} % príjmov</span></div>
${open.length ? `<div class="sp-banner"><div><b>${open.length} ${open.length === 1 ? 'voľné miesto' : open.length <= 4 ? 'voľné miesta' : 'voľných miest'} s ponukami</b><small>${b.offersUntil >= 0 ? `do ${b.offersUntil + 1}. hracieho dňa` : ''}</small></div>
<button class="btn btn-go" data-a="spSignBest">⭐ Podpísať všetky najvýhodnejšie (+${wk(total)})</button></div>` : ''}
<div class="sp-grid">${Object.keys(SLOTS).map(spCard).join('')}</div></div>`;
}

// ── Štadión a vstupné ───────────────────────────────────────────
function nextHomeOpp() {
  const nx = nextUserFixture();
  if (nx && nx.m && nx.m.h === G.userTid && !nx.m.neutral) return G.teams[nx.m.a];
  return null;
}

function ticketProjection() {
  const b = G.biz, u = userTeam(), opp = nextHomeOpp();
  const est = homeMatchEstimate(opp);
  const scen = [0.5, 0.75, 1, 1.5, 2, 3].map(k => Math.max(0.5, Math.round(DEF_TICKET[u.lvl] * k * 2) / 2));
  const uniq = [...new Set(scen.concat([b.ticket]))].sort((a, c) => a - c);
  const best = Math.max(...uniq.map(p => homeMatchEstimate(opp, p).net));
  return `<div class="tk-now"><div><small>${opp ? 'Najbližší domáci zápas: ' + U.esc(opp.name) : 'Bežný domáci zápas'}</small>
<b>${est.att.toLocaleString('sk-SK')} divákov</b><span class="muted">z ${capacity().toLocaleString('sk-SK')} miest (${Math.round(est.att / capacity() * 100)} %)</span></div>
<div><small>Čistý zisk zo zápasu</small><b class="${est.net < 0 ? 'neg' : 'pos'}">${U.money(est.net)}</b><span class="muted">tržby ${U.money(est.total)} − organizácia ${U.money(est.cost)}</span></div></div>
<div class="tk-split"><span>🎟️ lístky <b>${U.money(est.gate)}</b></span><span>🌭 občerstvenie <b>${U.money(est.cater)}</b></span>${est.vip ? `<span>🥂 VIP <b>${U.money(est.vip)}</b></span>` : ''}<span>🚧 organizácia <b class="neg">−${U.money(est.cost)}</b></span></div>
<table class="tbl tk-t"><tr><th>Cena lístka</th><th>Diváci</th><th>Čistý zisk</th></tr>${uniq.map(p => { const e = homeMatchEstimate(opp, p); return `<tr class="clk ${p === b.ticket ? 'me' : ''} ${e.net === best ? 'bestrow' : ''}" data-a="tkSet" data-v="${p}"><td>${eur2(p)}${p === DEF_TICKET[u.lvl] ? ' <span class="muted small">bežná</span>' : ''}</td><td>${e.att.toLocaleString('sk-SK')}</td><td><b>${U.money(e.net)}</b>${e.net === best ? ' ⭐' : ''}</td></tr>`; }).join('')}</table>`;
}

function finStadium() {
  const b = G.biz, u = userTeam();
  const cap = capacity(), occ = b.attLast ? Math.round(b.attLast / cap * 100) : 0;
  const avg = b.attHist.length ? Math.round(U.avg(b.attHist)) : 0;
  return `<div class="grid2"><div>
<div class="card"><div class="card-h">Cena lístka</div>
<div class="ng-amount"><button class="ng-btn" data-a="tkStep" data-v="-1">−</button>
<label class="ng-val"><span class="tk-big" id="tkVal">${eur2(b.ticket)}</span></label>
<button class="ng-btn" data-a="tkStep" data-v="1">+</button></div>
<input type="range" class="ng-range" min="0.5" max="${DEF_TICKET[u.lvl] * 3}" step="0.5" value="${b.ticket}" data-c="fin_ticket">
<div class="ng-quick"><button class="chip" data-a="tkSet" data-v="best">⭐ Najvyšší zisk</button><button class="chip" data-a="tkSet" data-v="fill">🏟️ Plný štadión</button><button class="chip" data-a="tkSet" data-v="def">Bežná cena</button></div>
<div id="ticketProj">${ticketProjection()}</div>
</div></div>
<div><div class="card"><div class="card-h">🏟️ ${U.esc(u.stadium || 'Štadión')} <button class="link" data-a="facFocus" data-v="stad">Rozšíriť ›</button></div>
<div class="stad-kpi"><div><small>Kapacita</small><b>${cap.toLocaleString('sk-SK')}</b></div><div><small>Fanúšikovia</small><b>${b.fans.toLocaleString('sk-SK')}</b></div><div title="Nálada ovplyvňuje návštevnosť a predaj suvenírov"><small>Nálada</small><b>${moodTag()}</b></div><div><small>Priemerná návštevnosť</small><b>${avg ? avg.toLocaleString('sk-SK') : '—'}</b></div><div><small>Permanentky</small><b>${b.st.toLocaleString('sk-SK')}</b></div></div>
<div class="stad-viz"><div class="sv-legend"><span><i class="dot fan"></i>fanúšikovia vzhľadom na kapacitu</span><span><i class="dot att"></i>posledný zápas${occ ? ` (${occ} %)` : ''}</span></div><div class="sv-bar"><i style="width:${Math.min(100, b.fans / cap * 100)}%"></i>${occ ? `<em style="left:${Math.min(100, occ)}%"></em>` : ''}</div></div>
<div class="kv"><span>Občerstvenie na diváka</span><b>${eur2(CATER_SPEND[u.lvl] * (1 + 0.35 * b.fac.cater))}</b></div>
<div class="kv"><span>Náklady na diváka</span><b>${eur2(MATCH_COST[u.lvl])}</b></div>
</div>
<div class="card"><div class="card-h">Návštevnosť v sezóne</div>${lineChart(b.attHist, { label: 'Návštevnosť', fmt: v => Math.round(v).toLocaleString('sk-SK'), zero: false, color: '#5ab8ff', l0: 'prvý zápas', empty: 'Zobrazí sa po prvých domácich zápasoch.' })}</div>
<div class="card"><div class="card-h">Fanúšikovia podľa sezón</div>${lineChart(b.fansHist.concat([b.fans]), { label: 'Fanúšikovia', fmt: v => Math.round(v).toLocaleString('sk-SK'), zero: false, color: '#ffb02e', l0: 'prvá sezóna' })}</div></div></div>`;
}

// ── Zariadenia ──────────────────────────────────────────────────
function facLevelEffect(k, lv) {
  const b = G.biz, u = userTeam();
  switch (k) {
    case 'stad': return `${stadCap(lv).toLocaleString('sk-SK')} miest`;
    case 'shop': return `${Math.round(b.fans * MERCH_FAN[u.lvl] * (1 + 0.35 * lv) * (1 + 0.05 * (b.fac.mkt || 0))).toLocaleString('sk-SK')} € za kolo`;
    case 'cater': return `${eur2(CATER_SPEND[u.lvl] * (1 + 0.35 * lv))} na diváka`;
    case 'youth': return lv ? `${1 + (lv >= 2 ? 1 : 0) + (lv >= 4 ? 1 : 0)}–${2 + (lv >= 2 ? 1 : 0) + (lv >= 4 ? 1 : 0)} talenty, vyšší potenciál` : '1–2 talenty, bežný potenciál';
    case 'lights': return lv ? `+${lv * 3} % divákov, TV +${lv * 10} %` : 'bez osvetlenia';
    case 'vip': return lv ? `${U.money(vipIncome(lv))} za domáci zápas` : 'bez VIP lóží';
    case 'park': return lv ? `+${lv * 6} % divákov` : 'bez parkoviska';
    case 'train': return lv ? `rýchlejší rozvoj hráčov (+${lv * 20} %)` : 'bežný tréning';
    case 'recov': return lv ? `+${lv * 2} % kondície denne` : 'bežná regenerácia';
    case 'scout': return lv ? `+${lv} hráč za deň, +${lv * 8} % znalosti` : 'bežný skauting';
    case 'mkt': return lv ? `sponzori +${lv * 8} %, suveníry +${lv * 5} %` : 'bez marketingu';
    case 'roof': return lv ? `+${lv * 4} % divákov, ${['', 'hlavná tribúna', '2 tribúny', 'všetky tribúny'][lv]}` : 'bez strechy';
    case 'seats': return lv ? `lístky o ${lv * 7} % drahšie bez straty divákov` : 'staré lavice';
    case 'led': return lv ? `sponzori +${lv * 5} %` : 'bez LED';
    case 'facade': return lv ? `sponzori +${lv * 4} %, fanúšikovia +${lv * 5} % rast` : 'pôvodná fasáda';
    case 'kotol': return lv ? `výhoda doma +${lv * 2} %, nálada +${lv * 10} %` : 'bez kotla';
    case 'family': return lv ? `noví fanúšikovia +${lv * 10} %, výtržnosti −${lv * 25} %` : 'bez rodinnej zóny';
    case 'heat': return lv ? `výhoda doma +${(lv * 2.5).toFixed(1).replace('.', ',')} %` : 'bežný trávnik';
    case 'fanzone': return lv ? `nálada +${lv * 15} %, suveníry +${lv * 6} %` : 'bez fanzóny';
    case 'video': return lv ? `+${lv * 15} % skúseností` : 'bez analytiky';
    case 'medical': return lv ? `−${lv * 8} % únavy v zápase` : 'bežná starostlivosť';
    case 'dorm': return lv ? `akadémia +${lv * 8} % rast` : 'bez internátu';
    case 'museum': return lv ? `${eur(toursFor(lv))} za kolo` : 'bez múzea';
    case 'resto': return lv ? `${eur(restoFor(lv))} za kolo` : 'bez reštaurácie';
    case 'media': return lv ? `TV +${lv * 10} %, sponzori +${lv * 4} %` : 'bez centra';
    case 'solar': return lv ? `prevádzka −${lv * 6} %` : 'bez panelov';
  }
  return '';
}

function facCard(k) {
  const b = G.biz, u = userTeam(), F = FAC[k], lv = b.fac[k] || 0, cost = facCost(k), bl = facBuilding(k), req = facReq(k);
  const pips = Array.from({ length: F.max }, (_, i) => `<i class="${i < lv ? 'on' : bl && i === lv ? 'bld' : ''}"></i>`).join('');
  const sport = ['train', 'recov', 'youth', 'scout', 'video', 'medical', 'dorm', 'heat', 'kotol', 'family'].includes(k);
  let action;
  if (bl) action = `<div class="fac-bld"><div class="fb-h">🚧 Stavia sa úroveň ${bl.to} – hotovo o ${buildLeft(bl)} ${buildLeft(bl) === 1 ? 'deň' : buildLeft(bl) <= 4 ? 'dni' : 'dní'}</div><div class="fb-bar"><i style="width:${Math.round(buildProgress(bl) * 100)}%"></i></div></div>`;
  else if (cost == null) action = '<span class="fac-max">✔ Maximálna úroveň</span>';
  else if (req) action = `<div class="neg-msg small">🔒 ${req}</div>`;
  else {
    const busy = (b.build || []).length >= 2, poor = u.budget < cost;
    action = `<button class="btn btn-go sm fac-go" data-a="facUp" data-v="${k}" ${poor || busy ? 'disabled' : ''}>${lv || k === 'stad' ? 'Vylepšiť' : 'Postaviť (nová stavba)'} · ${U.money(cost)}</button>${busy ? '<small class="muted">max. 2 stavby naraz</small>' : poor ? `<small class="neg">chýba ${U.money(cost - u.budget)}</small>` : ''}`;
  }
  let pay = '';
  if (cost != null && !bl) {
    const up = upkeepNext(k);
    const g = sport ? 0 : facGain(k) - up * 32;
    pay = `<div class="fac-cost"><span>⏱️ ${facDays(k)} ${facDays(k) <= 4 ? 'dni' : 'dní'}</span><span>🔧 údržba +${U.money(up)}/kolo</span></div>
${sport ? `<div class="fac-pay sport">${['kotol', 'family'].includes(k) ? '🎉 Lepšia atmosféra' : '⚽ Zlepší tím'}</div>` : g > 0 ? `<div class="fac-pay"><span>Zisk ≈ <b class="pos">${U.money(g)}</b>/sezónu</span><span>Návratnosť <b>${(cost / g).toFixed(1).replace('.', ',')}</b> sez.</span></div>` : '<div class="fac-pay bad">Nevyplatí sa</div>'}`;
  }
  // zbalená karta: názov, úroveň, teraz a stav – po rozkliknutí detail a stavba
  const open = UI.facOpen === k;
  const stTag = bl ? `<span class="tag bld">🚧 ${buildLeft(bl)} d</span>` : cost == null ? '<span class="tag ok">✔ max</span>' : req ? '<span class="tag no">🔒</span>' : `<span class="tag cost">${lv || k === 'stad' ? '' : 'nová · '}${U.money(cost)}</span>`;
  const head = `<div class="fac-row" data-a="facTog" data-v="${k}" title="${F.eff}"><span class="sp-ic">${F.ic}</span><div class="xr-n"><b>${F.name}</b><div class="pips ${F.max > 8 ? 'many' : ''}">${pips}<span>${lv}/${F.max}</span></div></div><small class="fac-now">${facLevelEffect(k, lv)}</small>${stTag}<span class="sc-chev">▾</span></div>`;
  if (!open) return `<div class="fac fold ${bl ? 'building' : ''} ${lv ? '' : 'none'} ${cost == null ? 'maxed' : ''}" id="fac_${k}">${head}</div>`;
  return `<div class="fac fold open ${bl ? 'building' : ''} ${lv ? '' : 'none'} ${cost == null ? 'maxed' : ''}" id="fac_${k}">${head}
<p class="muted small fac-eff">${F.eff}</p>
<div class="fac-lv"><div><small>Teraz</small><b>${facLevelEffect(k, lv)}</b></div>${lv < F.max ? `<span class="fac-arr">→</span><div class="nx"><small>Úroveň ${lv + 1}</small><b>${facLevelEffect(k, lv + 1)}</b></div>` : ''}</div>
${pay}${k === 'stad' && cost != null ? stadPermitHTML() : ''}<div class="fac-act">${action}</div></div>`;
}

function finFacilities() {
  const b = G.biz, u = userTeam();
  bizEnsure();
  const total = FAC_KEYS.reduce((a, k) => a + (b.fac[k] || 0), 0), max = FAC_KEYS.reduce((a, k) => a + FAC[k].max, 0);
  const builds = (b.build || []).map(x => `<div class="cb-row"><span>${FAC[x.k].ic} ${FAC[x.k].name} → ${x.to}</span><div class="fb-bar"><i style="width:${Math.round(buildProgress(x) * 100)}%"></i></div><b>${buildLeft(x)} d</b></div>`).join('');
  return `<div class="fac-sum">
<div class="fs"><small>Rozvoj areálu</small><b>${total}/${max}</b><div class="fb-bar big"><i style="width:${Math.round(total / max * 100)}%"></i></div></div>
<div class="fs"><small>Hodnota zariadení</small><b>${U.money(facValue())}</b></div>
<div class="fs"><small>Údržba za kolo</small><b class="neg">${upkeepWeekly() ? '−' + U.money(upkeepWeekly()) : '0 €'}</b></div>
<div class="fs"><small>Stavby</small><b>${(b.build || []).length}/2</b></div></div>
<div class="card campus-card"><div class="card-h">🏗️ Areál klubu</div>
<div class="campus-wrap">${campusSVG()}</div>
${builds ? `<div class="cbuilds"><small>Prebiehajúce stavby</small>${builds}</div>` : ''}</div>
${FAC_CATS.map(([cat, name]) => `<div class="card"><div class="card-h">${name}</div><div class="fac-grid">${FAC_KEYS.filter(k => FAC[k].cat === cat).map(facCard).join('')}</div></div>`).join('')}`;
}

function tabFinance() {
  if (!G.biz || G.v < 3) { migrateBiz(); G.v = Math.max(G.v, 3); saveGame(); }
  const f = UI.fin;
  const b = G.biz;
  const openOffers = Object.keys(SLOTS).filter(s => !b.sp[s] && (b.offers[s] || []).length).length;
  const modes = [['overview', '📊 Prehľad'], ['sponsors', `🤝 Sponzori${openOffers ? ` <i class="badge">${openOffers}</i>` : ''}`], ['stadium', '🏟️ Štadión a vstupné'], ['invest', `🏗️ Zariadenia${(G.biz.build || []).length ? ' <i class="badge bld">🚧</i>' : ''}`]];
  const body = { overview: finOverview, sponsors: finSponsors, stadium: finStadium, invest: finFacilities }[f.mode] || finOverview;
  return `<div class="finance">${finKpis()}<div class="tf-modes">${modes.map(([k, n]) => `<button class="tfm ${f.mode === k ? 'on' : ''}" data-a="finMode" data-v="${k}">${n}</button>`).join('')}</div>${body()}</div>`;
}

Object.assign(ACT, {
  finMode(el) { UI.fin.mode = el.dataset.v; renderTab(); },
  finGo(el) { UI.fin.mode = el.dataset.v || 'overview'; screenHub('finance'); },
  spSign(el) {
    const err = signSponsor(el.dataset.s, +el.dataset.id);
    if (err) toast(err, 'bad'); else { toast('Zmluva so sponzorom podpísaná!', 'good'); SFX.init(); SFX.ooh(); saveGame(); }
    rerender();
  },
  spNeg(el) {
    const r = negotiateSponsor(el.dataset.s, +el.dataset.id);
    if (r.err) toast(r.err, 'bad');
    else if (r.ok) toast(`Sponzor pridal ${Math.round((r.k - 1) * 100)} %!`, 'good');
    else toast('Sponzor sa urazil a ponuku stiahol.', 'bad');
    saveGame(); rerender();
  },
  facUp(el) {
    const k = el.dataset.v, F = FAC[k], lv = G.biz.fac[k] || 0;
    confirmBox(lv ? 'Vylepšenie' : 'Stavba', `${lv ? 'Vylepšiť' : 'Postaviť'} <b>${F.name}</b> (úroveň ${lv + 1}) za <b>${U.money(facCost(k))}</b>? Stavba potrvá <b>${facDays(k)} hracích dní</b>, údržba stúpne o <b>${U.money(upkeepNext(k))}</b> za kolo.`, lv ? 'Vylepšiť' : 'Postaviť', () => {
      const err = upgradeFac(k);
      if (err) toast(err, 'bad'); else { toast(`🏗️ Stavba začala: ${F.name}`, 'good'); SFX.init(); SFX.kick(1); saveGame(); }
      rerender();
    });
  },
  facTog(el) { const k = el.dataset.v; UI.facOpen = UI.facOpen === k ? null : k; renderTab(); const c = document.getElementById('fac_' + k); if (c && UI.facOpen) c.scrollIntoView({ block: 'nearest' }); },
  facFocus(el) {
    const k = el.dataset.v;
    UI.facOpen = k;
    if (UI.fin.mode !== 'invest' || UI.tab !== 'finance') { UI.fin.mode = 'invest'; UI.tab = 'finance'; screenHub('finance'); } else renderTab();
    const c = document.getElementById('fac_' + k);
    if (c) { c.scrollIntoView({ behavior: 'smooth', block: 'center' }); c.classList.remove('flash'); void c.offsetWidth; c.classList.add('flash'); }
  },
  spSignBest() {
    let n = 0;
    for (const s in SLOTS) { if (G.biz.sp[s]) continue; const o = bestOffer(s); if (o && !signSponsor(s, o.id)) n++; }
    toast(n ? `Podpísaných ${n} zmlúv so sponzormi!` : 'Nie je čo podpísať.', n ? 'good' : '');
    if (n) { SFX.init(); SFX.cheer(); }
    saveGame(); rerender();
  },
  tkSet(el) {
    const v = el.dataset.v, b = G.biz, u = userTeam(), opp = nextHomeOpp();
    b.ticket = v === 'best' ? bestTicket(opp) : v === 'fill' ? fillTicket(opp) : v === 'def' ? DEF_TICKET[u.lvl] : +v;
    if (v === 'best') toast(`Cena lístka: ${eur2(b.ticket)}`, 'good');
    saveGame(); renderTab();
  },
  tkStep(el) {
    const b = G.biz, u = userTeam();
    b.ticket = U.clamp(Math.round((b.ticket + 0.5 * +el.dataset.v) * 2) / 2, 0.5, DEF_TICKET[u.lvl] * 3);
    saveGame(); renderTab();
  },
  dealPick(el) {
    const r = pickDeal(+el.dataset.i);
    if (r.err) toast(r.err, 'bad');
    else { toast(`${r.label}: ${r.res.map(x => x[1]).join(', ')}`, r.res.some(x => x[0] === 'bad') && !r.res.some(x => x[0] === 'good') ? 'bad' : 'good'); SFX.init(); SFX.kick(0.6); saveGame(); }
    rerender();
  },
  dealYes() { ACT.dealPick({ dataset: { i: 0 } }); },
  dealNo() { const d = G.biz && G.biz.deal; if (d) ACT.dealPick({ dataset: { i: dealOpts(d).length - 1 } }); },
});

Object.assign(CHG, {
  fin_ticket(el) {
    G.biz.ticket = +el.value;
    const v = document.getElementById('tkVal'); if (v) v.textContent = eur2(G.biz.ticket);
    const pj = document.getElementById('ticketProj'); if (pj) pj.innerHTML = ticketProjection();
    clearTimeout(UI.tkT); UI.tkT = setTimeout(saveGame, 400);
  },
});
