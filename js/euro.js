'use strict';
// ─── Európske poháre: Liga majstrov, Európska liga, Konferenčná liga ───
// Zahraničné kluby nemajú ligu – hrajú len poháre, ich kádre sa vyvíjajú simulovane.

const EURO_DEF = {
  cl: { name: 'Liga majstrov', short: 'LM', kind: 'cl', prize: { entry: 3.6e6, win: 0.9e6, draw: 0.3e6, ko: [2.2e6, 3.4e6, 5e6], champ: 4e6 } },
  el: { name: 'Európska liga', short: 'EL', kind: 'el', prize: { entry: 1.4e6, win: 0.3e6, draw: 0.1e6, ko: [0.8e6, 1.2e6, 2e6], champ: 2e6 } },
  ecl: { name: 'Konferenčná liga', short: 'KL', kind: 'ecl', prize: { entry: 0.6e6, win: 0.15e6, draw: 0.05e6, ko: [0.4e6, 0.6e6, 1e6], champ: 1e6 } },
};
const EURO_ORDER = ['cl', 'el', 'ecl'];
const EURO_AFTER = [4, 8, 12, 16, 21, 23, 26, 28, 30]; // po ktorom ligovom kole sa hrá
const EURO_KO = ['Štvrťfinále', 'Semifinále', 'Finále'];
const EURO_FAN = { TUR: 88, SRB: 85, GRE: 82, CRO: 76, ARG: 80, POL: 72, SCO: 74, ITA: 64, ENG: 56, ESP: 58, GER: 55, FRA: 60, POR: 62, NED: 58, HUN: 70, CZE: 62, BUL: 66, ROU: 72, UKR: 60, AUT: 50, SUI: 44, DEN: 48, NOR: 40, SWE: 52, BEL: 54 };

const isForeign = t => !!(t && t.fx);
function euroBudget(tier) { return U.nice(Math.pow(1.2, tier - 64) * 3e6); }
function foreignName(cc) {
  let c = cc;
  if (!U.chance(0.7)) c = U.pick(EURO_IMPORT.filter(x => x !== cc));
  const d = EURO_COUNTRY[c] || EURO_COUNTRY[cc];
  return { fn: U.pick(d[1]), ln: U.pick(d[2]), nat: c };
}
const FOREIGN_LG = {};
function foreignLeague(t) { return FOREIGN_LG[t.fx] || (FOREIGN_LG[t.fx] = { id: -1, lvl: 0, reg: null, name: (EURO_COUNTRY[t.fx] || ['Zahraničie'])[0], tids: [], rounds: [] }); }

// ── Skutočné súpisky zahraničných klubov ───────────────────────
const DP_STYLES = { SO: ['Tank', 'Ničiteľ', 'Rozohrávajúci obranca'], 'ĽO': ['Ofenzívny krajný', 'Rýchly obranca'], PO: ['Ofenzívny krajný', 'Rýchly obranca'], DZ: ['Ničiteľ', 'Box-to-box', 'Dlhé lopty'], SZ: ['Box-to-box', 'Tiki-taka', 'Dlhé lopty'], OZ: ['Kreatívec', 'Tiki-taka', 'Kľučkár'], 'ĽZ': ['Kľučkár', 'Box-to-box'], PZ: ['Kľučkár', 'Box-to-box'], 'ĽK': ['Kľučkár', 'Šprintér'], PK: ['Kľučkár', 'Šprintér'], 'ÚT': ['Lovec gólov', 'Tank', 'Falošná deviatka'] };
function parseRealSquad(text) {
  return text.trim().split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const tk = l.split(/\s+/), dps = tk[0].split('/').map(c => DP_CODE[c]).filter(Boolean);
    const age = +tk[tk.length - 1], r = +tk[tk.length - 2], nat = tk[tk.length - 3];
    const names = tk.slice(1, tk.length - 3).map(x => x.replace(/_/g, ' '));
    return { dp: dps[0], dp2: dps.slice(1), pos: DP_BROAD[dps[0]], fn: names.length > 1 ? names[0] : '', ln: names.length > 1 ? names.slice(1).join(' ') : names[0], nat, r, age };
  });
}
// štýl hry a noha podľa skutočného postu
function applyRealPos(p, dp, dp2) {
  p.dp = dp; if (dp2 && dp2.length) p.dp2 = dp2; else delete p.dp2;
  const list = ARCHETYPES[p.pos], names = DP_STYLES[dp];
  if (names) {
    const opts = names.map(n => list.findIndex(a => a[0] === n)).filter(i => i >= 0);
    if (opts.length) { p.arch = U.pick(opts); const prof = POS_PROFILE[p.pos], ao = list[p.arch][1]; p.ao = prof.map((v, i) => Math.round(v + ao[i] + U.gauss() * 3)); }
  }
  p.ft = null; ensureProfile(p);
  if ((dp === 'ĽO' || dp === 'ĽZ') && U.chance(0.8)) p.ft = 'L';
  if ((dp === 'PO' || dp === 'PZ') && U.chance(0.85)) p.ft = 'R';
}
function fillRealSquad(t, key) {
  const sq = parseRealSquad(EURO_SQUADS[key]);
  for (const s of sq) {
    const p = newPlayer({ fn: s.fn, ln: s.ln, nat: s.nat, pos: s.pos, r: s.r, pot: rollPotential(s.age, s.r, t.tier), age: s.age, tid: t.id, real: true });
    applyRealPos(p, s.dp, s.dp2);
    t.pids.push(p.id);
  }
  // doplnenie kádra odchovancami
  const need = { GK: 3, DF: 7, MF: 7, FW: 4 };
  for (const pos in need) for (let k = teamPlayers(t).filter(p => p.pos === pos).length; k < need[pos]; k++) { const p = genPlayer(t.id, pos, t.tier - 7, { young: true }); t.pids.push(p.id); }
  assignTeamDPs(t);
  t.tier = Math.round(U.avg(teamPlayers(t).map(p => p.r).sort((a, b) => b - a).slice(0, 16)));
}
// staré uloženia: vymyslených hráčov zahraničných klubov nahradia skutočné súpisky
function realizeEuroSquads() {
  for (const id of G.euroTids || []) {
    const t = G.teams[id];
    if (!t || !t.key || !EURO_SQUADS[t.key.slice(3)] || t.realSq || teamPlayers(t).some(p => p.real)) continue;
    for (const p of teamPlayers(t)) {
      if (p.real || (p.h && p.h.some(h => h.from >= 0 && G.teams[h.from] && !G.teams[h.from].fx))) continue;
      t.pids = t.pids.filter(x => x !== p.id); G.players[p.id] = null;
      if (G.know) delete G.know[p.id];
    }
    fillRealSquad(t, t.key.slice(3));
    t.realSq = true;
    assignNumbers(t); autoLineup(t);
  }
  G.short = (G.short || []).filter(id => G.players[id]);
  G.scouted = (G.scouted || []).filter(x => G.players[x.pid]);
  G.scoutQueue = (G.scoutQueue || []).filter(id => G.players[id]);
}

// ── Zahraničné kluby ───────────────────────────────────────────
function buildEuroTeams() {
  G.euroTids = G.euroTids || [];
  const FORMS = ['4-3-3', '4-3-3', '4-2-3-1', '4-2-3-1', '4-4-2', '3-5-2', '4-1-4-1'];
  for (const [key, name, short, city, cc, tier, kit, stadium, cap] of EURO_CLUBS) {
    if (G.teams.some(t => t.key === 'eu:' + key)) continue;
    const t = newTeam({ key: 'eu:' + key, name, short, city, reg: null, lvl: 0, kit: [kit[0], kit[1], U.lum(kit[0]) > 0.8 ? '#ffffff' : U.shade(kit[0], -0.35), kit[2]], budget: euroBudget(tier), stadium, form: U.pick(FORMS) });
    t.fx = cc; t.tier = tier; t.cap = cap; t.lid = -1;
    t.fa = U.clamp(Math.round((EURO_FAN[cc] || 55) + U.gauss() * 8), 10, 95);
    t.dis = { y: 0, r: 0 }; t.inc = 0;
    if (EURO_SQUADS[key]) { fillRealSquad(t, key); t.realSq = true; }
    else { const counts = { GK: 3, DF: 8, MF: 8, FW: 5 }; for (const pos in counts) for (let k = 0; k < counts[pos]; k++) { const p = genPlayer(t.id, pos, tier); t.pids.push(p.id); } }
    assignNumbers(t); autoLineup(t);
    G.euroTids.push(t.id);
  }
}
// po sezóne: kluby nakupujú v cudzine, aby si udržali úroveň
function euroMaintain() {
  for (const id of G.euroTids || []) {
    const t = G.teams[id];
    if (!t) continue;
    // úroveň klubu = priemer 16 najlepších hráčov
    const top = () => U.avg(teamPlayers(t).map(p => p.r).sort((a, b) => b - a).slice(0, 16));
    for (let k = 0; k < 3 && top() < t.tier - 2; k++) {
      const ps = teamPlayers(t).sort((a, b) => a.r - b.r);
      const out = ps.find(p => p.age >= 24) || ps[0];
      const p = genPlayer(t.id, out ? out.pos : 'MF', t.tier + 1);
      p.age = U.ri(22, 28); t.pids.push(p.id);
      if (out) toFreeAgent(out);
    }
    t.budget = Math.max(t.budget, euroBudget(t.tier) * 0.6);
    assignNumbers(t);
  }
}
// zahraničné kluby kupujú slovenské talenty
function euroBuy() {
  const buyers = (G.euroTids || []).map(id => G.teams[id]).filter(t => t && teamPlayers(t).length < 28);
  if (!buyers.length) return;
  const buyer = U.weighted(buyers, t => Math.max(1, 86 - t.tier));
  const bb = teamBase(buyer);
  const cands = [];
  for (const t of G.teams) {
    if (t.fx || isUserSide(t) || t.lvl > 2 || teamPlayers(t).length <= 18) continue;
    for (const p of teamPlayers(t)) {
      if (p.loan || p.pos === 'GK') continue;
      const ok = (p.age <= 23 && potOf(p) >= bb - 2) || p.r >= bb - 1;
      if (ok) cands.push(p);
    }
  }
  if (!cands.length) return;
  const p = U.weighted(cands, x => Math.max(1, potOf(x) - bb + 6));
  const seller = G.teams[p.tid], price = U.nice(askingPrice(p) * U.rf(1, 1.3));
  if (buyer.budget < price) return;
  buyer.budget -= price; seller.budget += price;
  moveToTeam(p, buyer);
  p.w = Math.max(p.w || 0, wageFor(p, 0)); p.ce = G.year + (G.offseason ? 2 : 1) + U.ri(2, 4);
  logTransfer(p, seller, buyer, price, 'buy');
  news(`🌍 Prestup do zahraničia: ${pFull(p)} (${seller.short} → ${buyer.name}) za ${U.money(price)}.`, 'transfer');
}

// ── Súťaže ─────────────────────────────────────────────────────
function euroList() { return G.euro ? EURO_ORDER.map(k => G.euro.comps[k]).filter(Boolean) : []; }
function euroOf(x) { return G.euro && G.euro.comps[x.ek]; }
function euroStage(c, r) { return r < 6 ? c.md[r] : c.ko[r - 6]; }
function euroRoundName(r) { return r < 6 ? `${r + 1}. kolo skupiny` : EURO_KO[r - 6]; }
function euroLabel(c, r) { return `${c.name} · ${euroRoundName(r)}`; }
function payEuro(c, tid, amt) {
  if (!amt) return;
  amt = U.nice(amt);
  if (tid === G.userTid) { book('euro', amt); c.earn = (c.earn || 0) + amt; }
  else if (G.teams[tid]) G.teams[tid].budget += amt;
}

// slovenskí účastníci podľa minulej sezóny (1. kolo: podľa sily)
function euroSlovak() {
  // bez licencie UEFA klub do Európy nejde
  const banned = t => G.uefaBan === G.year && t.id === G.userTid;
  const L1 = G.leagues[0].tids.map(id => G.teams[id]).filter(t => t && t.parent == null && !banned(t));
  const rank = G.prev && G.prev.l1 ? G.prev.l1.map(id => G.teams[id]).filter(t => t && t.lvl === 1 && !banned(t)) : L1.slice().sort((a, b) => teamRating(b) - teamRating(a));
  for (const t of L1.sort((a, b) => teamRating(b) - teamRating(a))) if (!rank.includes(t)) rank.push(t);
  const used = new Set(), take = t => { used.add(t.id); return t.id; };
  const cl = rank[0] ? [take(rank[0])] : [];
  const cw = G.prev && G.prev.cupW != null ? G.teams[G.prev.cupW] : null;
  const elT = cw && cw.lvl === 1 && !used.has(cw.id) ? cw : rank.find(t => !used.has(t.id));
  const el = elT ? [take(elT)] : [];
  const ecl = rank.filter(t => !used.has(t.id)).slice(0, 2).map(take);
  return { cl, el, ecl };
}
function setupEuro() {
  if (!G.euroTids || !G.euroTids.length) { G.euro = null; return; }
  const sk = euroSlovak();
  const foreign = G.euroTids.map(id => G.teams[id]).filter(Boolean).map(t => [t.id, teamRating(t) + U.gauss() * 1.6]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  G.euro = { year: G.year, comps: {} };
  // LM a EL berú najsilnejšie kluby, Konferenčná liga najslabšie (stredné kluby túto sezónu nehrajú)
  const nCL = 16 - sk.cl.length, nEL = 16 - sk.el.length, nECL = 16 - sk.ecl.length;
  const pick = { cl: foreign.slice(0, nCL), el: foreign.slice(nCL, nCL + nEL), ecl: foreign.slice(-nECL) };
  for (const k of EURO_ORDER) G.euro.comps[k] = makeEuroComp(k, [...pick[k], ...sk[k]]);
  for (const k of EURO_ORDER) {
    const c = G.euro.comps[k];
    if (c.entrants.includes(G.userTid)) inboxAdd({ type: 'info', text: `🌍 Tvoj klub hrá túto sezónu ${c.name}! Žreb: skupina ${'ABCD'[c.groups.findIndex(g => g.includes(G.userTid))]}. Za účasť si dostal ${U.money(EURO_DEF[k].prize.entry)}.` });
  }
}
function makeEuroComp(k, tids) {
  const d = EURO_DEF[k];
  const sorted = tids.slice().sort((a, b) => teamRating(G.teams[b]) - teamRating(G.teams[a]));
  const groups = [[], [], [], []];
  const cty = id => G.teams[id].fx || 'SVK';
  for (let p = 0; p < 4; p++) {
    for (const id of U.shuffle(sorted.slice(p * 4, p * 4 + 4))) {
      let gi = groups.findIndex(g => g.length === p && !g.some(x => cty(x) === cty(id)));
      if (gi < 0) gi = groups.findIndex(g => g.length === p);
      groups[gi].push(id);
    }
  }
  const md = Array.from({ length: 6 }, () => []);
  groups.forEach((g, gi) => {
    const rr = roundRobin(U.shuffle(g.slice()));
    rr.concat(rr.map(rd => rd.map(([h, a]) => [a, h]))).forEach((rd, r) => { for (const [h, a] of rd) md[r].push({ h, a, hg: null, ag: null, pen: null, w: null, g: gi }); });
  });
  const c = { id: k, kind: d.kind, name: d.name, entrants: tids.slice(), groups, md, ko: [], cur: 0, alive: tids.slice(), winner: null, runner: null, earn: 0 };
  for (const id of tids) payEuro(c, id, d.prize.entry);
  return c;
}
function euroGroupTable(c, gi) {
  const rows = {};
  for (const id of c.groups[gi]) rows[id] = { tid: id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [] };
  for (const rd of c.md) for (const m of rd) {
    if (m.g !== gi || m.hg == null) continue;
    const h = rows[m.h], a = rows[m.a];
    h.p++; a.p++; h.gf += m.hg; h.ga += m.ag; a.gf += m.ag; a.ga += m.hg;
    if (m.hg > m.ag) { h.w++; a.l++; h.pts += 3; h.form.push('V'); a.form.push('P'); }
    else if (m.hg < m.ag) { a.w++; h.l++; a.pts += 3; a.form.push('V'); h.form.push('P'); }
    else { h.d++; a.d++; h.pts++; a.pts++; h.form.push('R'); a.form.push('R'); }
  }
  return Object.values(rows).sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || teamRating(G.teams[y.tid]) - teamRating(G.teams[x.tid]));
}
const koMatch = (h, a) => ({ h, a, hg: null, ag: null, pen: null, w: null, neutral: false });
function finishEuroRound(c, r) {
  const ms = euroStage(c, r);
  if (!ms || c.cur !== r) return;
  const P = EURO_DEF[c.id].prize, uid = G.userTid;
  const was = c.alive.includes(uid);
  if (r < 6) {
    for (const m of ms) {
      if (m.hg > m.ag) payEuro(c, m.h, P.win);
      else if (m.hg < m.ag) payEuro(c, m.a, P.win);
      else { payEuro(c, m.h, P.draw); payEuro(c, m.a, P.draw); }
    }
    if (r === 5) {
      const tb = c.groups.map((_, gi) => euroGroupTable(c, gi));
      const W = tb.map(t => t[0].tid), S = tb.map(t => t[1].tid);
      c.alive = [...W, ...S];
      for (const id of c.alive) payEuro(c, id, P.ko[0]);
      c.ko.push([[W[0], S[1]], [W[1], S[0]], [W[2], S[3]], [W[3], S[2]]].map(([h, a]) => koMatch(h, a)));
    }
  } else {
    const ws = ms.map(m => m.w);
    if (r === 6) { c.alive = ws; for (const id of ws) payEuro(c, id, P.ko[1]); c.ko.push([koMatch(ws[0], ws[1]), koMatch(ws[2], ws[3])].map(m => (U.chance(0.5) ? m : koMatch(m.a, m.h)))); }
    else if (r === 7) { c.alive = ws; for (const id of ws) payEuro(c, id, P.ko[2]); const f = koMatch(ws[0], ws[1]); f.neutral = true; c.ko.push([f]); }
    else {
      const f = ms[0];
      c.winner = f.w; c.runner = f.w === f.h ? f.a : f.h; c.alive = [f.w];
      payEuro(c, c.winner, P.champ);
      news(`🏆 ${G.teams[c.winner].name} vyhral ${c.name}!`, c.winner === uid ? 'good' : 'info');
    }
  }
  c.cur = r + 1;
  // správy pre slovenské kluby
  if (was && r >= 5 && !c.alive.includes(uid)) news(`${c.name}: koniec pre ${userTeam().name} (${r === 5 ? 'skupina' : EURO_KO[r - 6].toLowerCase()}).`, 'bad');
  else if (was && r >= 5 && c.winner == null) news(`🌍 ${c.name}: ${userTeam().name} postupuje – ${EURO_KO[r - 5].toLowerCase()}!`, 'good');
  for (const id of c.entrants) {
    const t = G.teams[id];
    if (t.fx || id === uid || r !== 5) continue;
    news(`🇸🇰 ${t.name} ${c.alive.includes(id) ? 'postúpil zo skupiny' : 'skončil v skupine'} – ${c.name}.`, c.alive.includes(id) ? 'good' : 'info');
  }
}
function euroReach(c, tid) {
  if (!c || !c.entrants.includes(tid)) return '';
  if (c.winner === tid) return 'Víťaz';
  if (c.alive.includes(tid)) return c.cur <= 5 ? 'skupina' : EURO_KO[Math.min(2, c.cur - 6)];
  for (let i = c.ko.length - 1; i >= 0; i--) if (c.ko[i].some(m => m.h === tid || m.a === tid)) return EURO_KO[i];
  return 'skupina';
}
function euroUserMatch(c, r) { const ms = euroStage(c, r); return ms ? ms.find(m => m.h === G.userTid || m.a === G.userTid) || null : null; }
function userEuro() { return euroList().filter(c => c.entrants.includes(G.userTid)); }

function euroIntro(c, r, home, away, onDone) {
  const m = euroUserMatch(c, r);
  return matchCinema({
    kind: c.kind, final: r === 8, comp: c.name, round: euroRoundName(r), home, away,
    venue: m && m.neutral ? 'Finále na neutrálnej pôde' : (home.stadium || home.city || ''), extra: '', trophy: trophySVG(c.kind, 240), onDone,
  });
}
