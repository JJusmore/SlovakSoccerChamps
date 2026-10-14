'use strict';
// ─── Sezóna: rozpis, tabuľky, simulácia, pohár, koniec sezóny, prestupy ───

const L1_SPLIT_AFTER = 22;
const LEAGUE_DAYS = 32;

function roundRobin(ids) {
  const arr = ids.slice();
  if (arr.length % 2) arr.push(-1);
  const m = arr.length, rounds = [];
  for (let r = 0; r < m - 1; r++) {
    const rd = [];
    for (let i = 0; i < m / 2; i++) {
      const a = arr[i], b = arr[m - 1 - i];
      if (a < 0 || b < 0) continue;
      if (i === 0 ? r % 2 === 0 : (i % 2 === 0)) rd.push([a, b]); else rd.push([b, a]);
    }
    rounds.push(rd);
    arr.splice(1, 0, arr.pop());
  }
  return rounds;
}

function doubleRR(ids) {
  const first = roundRobin(U.shuffle(ids.slice()));
  const second = first.map(rd => rd.map(([h, a]) => [a, h]));
  return first.concat(second);
}

const mkMatch = ([h, a]) => ({ h, a, hg: null, ag: null });

function startSeason() {
  for (const lg of G.leagues) {
    lg.rounds = doubleRR(lg.tids).map(rd => rd.map(mkMatch));
    lg.groupA = null;
  }
  setupCups();
  setupEuro();
  G.calendar = [{ t: 'C', k: 'sup', r: 0 }];
  const ci = { reg: 0, sp: 0, cls: 0 };
  for (let r = 0; r < LEAGUE_DAYS; r++) {
    G.calendar.push({ t: 'L', r });
    for (const k of ['reg', 'sp', 'cls']) if (CUP_GRP_AFTER[k].includes(r)) G.calendar.push({ t: 'C', k, r: ci[k]++ });
    if (G.euro && EURO_AFTER.includes(r)) G.calendar.push({ t: 'E', r: EURO_AFTER.indexOf(r) });
  }
  G.day = 0; G.wins = null;
  if (typeof onSeasonStart === 'function') onSeasonStart();
  for (const p of G.players) if (p) {
    p.s = { gp: 0, g: 0, a: 0, yc: 0, rc: 0 }; p.fit = 100; p.ban = 0;
    // letná prestávka: väčšina zranení sa vylieči
    if (p.inj && (p.inj.d -= 20) <= 0) delete p.inj;
  }
  for (const t of G.teams) { t.dis = { y: 0, r: 0 }; t.inc = 0; }
}

// ─── Tabuľka ─────────────────────────────────────────────────────
// upto = počet kôl, ktoré sa započítajú (na porovnanie s predchádzajúcim kolom)
function leagueTable(lg, upto = Infinity) {
  const rows = {};
  for (const t of lg.tids) rows[t] = { tid: t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [] };
  for (const rd of (lg.rounds || []).slice(0, upto)) for (const m of rd) {
    if (m.hg == null) continue;
    const h = rows[m.h], a = rows[m.a];
    if (!h || !a) continue;
    h.p++; a.p++; h.gf += m.hg; h.ga += m.ag; a.gf += m.ag; a.ga += m.hg;
    if (m.hg > m.ag) { h.w++; a.l++; h.pts += 3; h.form.push('V'); a.form.push('P'); }
    else if (m.hg < m.ag) { a.w++; h.l++; a.pts += 3; a.form.push('V'); h.form.push('P'); }
    else { h.d++; a.d++; h.pts++; a.pts++; h.form.push('R'); a.form.push('R'); }
  }
  const arr = Object.values(rows);
  // odpočet bodov (dlhy, licencia)
  for (const r of arr) { const d = G.teams[r.tid].ded; if (d) { r.pts -= d; r.ded = d; } }
  const cmp = (x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || G.teams[x.tid].name.localeCompare(G.teams[y.tid].name);
  if (lg.groupA) {
    const A = new Set(lg.groupA);
    arr.sort((x, y) => (A.has(y.tid) ? 1 : 0) - (A.has(x.tid) ? 1 : 0) || cmp(x, y));
  } else arr.sort(cmp);
  return arr;
}

// Zóny tabuľky: 'champ' | 'up' | 'down' | 'euro' | ''
function tableZone(lg, idx, n) {
  if (lg.lvl === 1) return idx === 0 ? 'champ' : idx <= 2 ? 'euro' : idx === n - 1 ? 'down' : '';
  if (lg.lvl === 2) return idx === 0 ? 'up' : idx >= n - 3 ? 'down' : '';
  if (lg.lvl === 9) return idx === 0 ? 'up' : '';
  return idx === 0 ? 'up' : idx === n - 1 ? 'down' : '';
}

// ─── Simulácia zápasu ────────────────────────────────────────────
function chanceLambda(sA, sB, home, mentA, mentB, pressB) {
  let l = 5.0 * Math.exp((sA.att - sB.def) / 14);
  l *= home ? 1.1 : 0.93;
  l *= [0.75, 1, 1.25][mentA];
  l *= [0.85, 1, 1.12][mentB];
  l *= [1.05, 1, 0.92][pressB];
  return U.clamp(l, 1.0, 15);
}

function goalProb(shooterEff, gkEff) {
  return U.clamp(0.27 * Math.exp((shooterEff - gkEff) / 50), 0.07, 0.6);
}

function prepareTeam(t, opp) {
  if (t.id === G.userTid) { validateLineup(t); return; }
  autoLineup(t);
  // AI mentalita podľa sily súpera
  if (opp) {
    const d = teamRating(t) - teamRating(opp);
    t.ment = d < -6 ? 0 : d > 6 ? 2 : 1;
    aiTactic(t, opp);
  }
}

function lineupPlayers(t, lineup) {
  const slots = FORMATIONS[t.form];
  return (lineup || t.lineup).map((id, i) => ({ p: G.players[id], sp: slots[i][0] })).filter(x => x.p);
}

function shotEff(p, sp) {
  const fit = (0.7 + 0.3 * p.fit / 100) * xpFactor(p);
  if (p.pos === 'GK') return p.r * 0.3 * fit;
  return (playerAttrs(p)[1] + 2 * trLvl(p, 'fin') + trLvl(p, 'lng')) * posFit(p, sp) * fit;
}
function keeperEff(p) {
  const fit = (0.7 + 0.3 * p.fit / 100) * xpFactor(p);
  if (p.pos !== 'GK') return p.r * 0.35 * fit;
  const a = playerAttrs(p);
  return ((a[0] + a[1]) / 2 + 2 * trLvl(p, 'ref')) * fit;
}
function pickShooter(lp) {
  const W = { FW: 3.2, MF: 1.4, DF: 0.35, GK: 0 };
  return U.weighted(lp, x => W[x.sp] * Math.pow(shotEff(x.p, x.sp) / 50, 1.6));
}
function pickAssist(lp, shooter) {
  if (!U.chance(0.72)) return null;
  const W = { FW: 1.4, MF: 2, DF: 0.8, GK: 0.05 };
  const c = lp.filter(x => x.p !== shooter.p);
  return U.weighted(c, x => W[x.sp] * Math.pow(effR(x.p, x.sp) / 50, 1.5));
}
function gkOf(lp) { const g = lp.find(x => x.sp === 'GK'); return g ? keeperEff(g.p) : 15; }

// Vygeneruje časovú os šancí pre zápas (zdieľané so živým zápasom)
function buildChances(home, away, neutral, fromMin = 0, toMin = 90, men = [11, 11]) {
  const sH = teamStrength(home), sA = teamStrength(away);
  const frac = (toMin - fromMin) / 90;
  // hráč navyše / menej po červenej karte
  const mf = (a, b) => Math.pow(a / 11, 2) * Math.pow(11 / b, 0.8);
  const heat = !neutral && home.id === G.userTid && G.biz ? 1 + 0.025 * (G.biz.fac.heat || 0) + 0.02 * (G.biz.fac.kotol || 0) : 1;
  // taktika, chémia, morálka, tréning, počasie, cestovanie, motivácia z tlačovky
  const wx = weatherFor(home);
  const lH = chanceLambda(sH, sA, !neutral, home.ment, away.ment, away.press) * frac * mf(men[0], men[1]) * heat * matchMods(home, away, sH, sA, true, neutral, wx);
  const lA = chanceLambda(sA, sH, false, away.ment, home.ment, home.press) * frac * mf(men[1], men[0]) * matchMods(away, home, sA, sH, false, neutral, wx);
  const out = [];
  for (const [side, l] of [[0, lH], [1, lA]]) {
    const n = U.poisson(l), spq = 0.11 * spF(side ? away : home);
    for (let i = 0; i < n; i++) {
      const r = Math.random();
      out.push({ side, min: U.rf(fromMin + 0.5, toMin - 0.3), sp: r < 0.03 ? 'pk' : r < 0.03 + spq ? (r < 0.03 + spq * 0.6 ? 'ck' : 'fk') : null });
    }
  }
  out.sort((a, b) => a.min - b.min);
  // minimálny odstup 1,5 min
  for (let i = 1; i < out.length; i++) if (out[i].min - out[i - 1].min < 1.5) out[i].min = out[i - 1].min + 1.5;
  return out.filter(c => c.min < toMin + 3);
}

function simPenalties(home, away) {
  const lpH = lineupPlayers(home), lpA = lineupPlayers(away);
  const takers = lp => lp.filter(x => x.sp !== 'GK').sort((a, b) => b.p.r - a.p.r);
  const tH = takers(lpH), tA = takers(lpA);
  const gH = gkOf(lpH), gA = gkOf(lpA);
  const kick = (t, gk) => U.chance(U.clamp(0.76 + (t.p.r - gk) / 300, 0.6, 0.9));
  let h = 0, a = 0, i = 0;
  const seq = [];
  for (; i < 5; i++) {
    const kh = kick(tH[i % tH.length], gA); h += kh; seq.push([0, kh]);
    if (h > a + (5 - i) || a > h + (4 - i)) break;
    const ka = kick(tA[i % tA.length], gH); a += ka; seq.push([1, ka]);
    if (h > a + (4 - i) || a > h + (4 - i)) break;
  }
  while (h === a) {
    const kh = kick(tH[i % tH.length], gA), ka = kick(tA[i % tA.length], gH);
    h += kh; a += ka; seq.push([0, kh], [1, ka]); i++;
  }
  return { h, a, seq };
}

function simMatch(home, away, opts = {}) {
  prepareTeam(home, away); prepareTeam(away, home);
  const lpH = lineupPlayers(home), lpA = lineupPlayers(away);
  const gH = gkOf(lpH), gA = gkOf(lpA);
  const inj = genInjuries(home, away);
  // zranený hráč odíde z ihriska (nahradí ho striedajúci) a už nedostane kartu
  const injAt = {}; for (const e of inj) injAt[e.pid] = e.min;
  const cards = genCards(home, away).filter(c => !(injAt[c.pid] < c.min));
  const offAt = { ...injAt }; for (const c of cards) if (c.c === 'R') offAt[c.pid] = Math.min(c.min, offAt[c.pid] ?? 99);
  const chances = redCardEffect(buildChances(home, away, opts.neutral), cards);
  const ev = [], shots = [];
  let hg = 0, ag = 0, shH = 0, shA = 0;
  for (const c of chances) {
    const lp0 = c.side === 0 ? lpH : lpA;
    const lp = lp0.filter(x => !(offAt[x.p.id] < c.min));
    if (!lp.length) continue;
    const team = c.side === 0 ? home : away, gk = c.side === 0 ? gA : gH;
    let s, p;
    if (c.sp === 'pk') { const tk = spTaker(team, 'pk'); s = lp.find(x => x.p === tk) || pickShooter(lp); p = U.clamp(0.77 + (shotEff(s.p, s.sp) - gk) / 400, 0.62, 0.9); }
    else if (c.sp === 'fk') { const tk = spTaker(team, 'fk'); s = lp.find(x => x.p === tk) || pickShooter(lp); p = goalProb(shotEff(s.p, s.sp), gk) * 0.6; }
    else if (c.sp === 'ck') { s = spHeader(lp) || pickShooter(lp); p = goalProb(shotEff(s.p, s.sp) * (1 + 0.08 * trLvl(s.p, 'hdr')), gk) * 0.85; }
    else { s = pickShooter(lp); p = goalProb(shotEff(s.p, s.sp), gk); }
    if (c.side === 0) shH++; else shA++;
    const sh = { side: c.side, p, sp: c.sp, goal: false, min: Math.ceil(c.min), pid: s.p.id };
    shots.push(sh);
    if (U.chance(p)) {
      sh.goal = true;
      const as = c.sp === 'pk' ? null : c.sp === 'ck' || c.sp === 'fk' ? (U.chance(0.6) ? { p: spTaker(team, 'ck') } : null) : pickAssist(lp, s);
      ev.push({ min: Math.min(90, Math.ceil(c.min)), side: c.side, pid: s.p.id, aid: as && as.p && as.p !== s.p ? as.p.id : -1, sp: c.sp || undefined });
      if (c.side === 0) hg++; else ag++;
    }
  }
  // ďalšie slabšie strely (z diaľky, zblokované) – takmer bez šance na gól
  for (let side = 0; side < 2; side++) for (let i = U.poisson(4.5 * (side ? 0.9 : 1.1)); i > 0; i--) { shots.push({ side, p: U.rf(0.02, 0.07), sp: null, goal: false, min: U.ri(1, 90), pid: -1 }); if (side) shA++; else shH++; }
  // VAR: časť gólov neplatí (Niké liga a Európa)
  const varx = [];
  if (varOn(home, away)) for (let i = ev.length - 1; i >= 0; i--) if (U.chance(0.05)) { const e = ev.splice(i, 1)[0]; const sv = shots.find(x => x.goal && x.pid === e.pid && x.min === e.min); if (sv) { sv.goal = false; sv.var = true; } varx.push({ min: e.min, side: e.side, pid: e.pid, why: U.pick(VAR_WHY) }); if (e.side === 0) hg--; else ag--; }
  const res = { hg, ag, ev, cards, shots: [shH, shA], pen: null, inj: inj.filter(e => !(offAt[e.pid] < e.min)), lu: [home.lineup.slice(), away.lineup.slice()], sb: [[], []], varx };
  res.stats = simStats(home, away, res, shots);
  res.shotsL = shots.map(s => { const [x, y] = shotSpot(s); return { side: s.side, x, y, goal: s.goal, xg: Math.round(s.p * 100) / 100, sp: s.sp }; });
  if (opts.knockout && hg === ag) res.pen = simPenalties(home, away);
  applyMatchEffects(home, home.lineup, []);
  applyMatchEffects(away, away.lineup, []);
  applyCards(cards, home, away);
  applyGoals(ev);
  applyInjuries(res.inj);
  matchAfterFx(home, away, res, opts.neutral);
  return res;
}

function applyMatchEffects(t, lineup, subsIn) {
  const pm = [0.85, 1, 1.25][t.press];
  const fz = t.id === G.userTid && G.biz ? G.biz.fac : {};
  const xg = 0.9 * (1 + (9 - t.lvl) * 0.05) * (1 + 0.15 * (fz.video || 0));
  const tire = (1 - 0.08 * (fz.medical || 0)) * trTireF(t);
  const subs = new Set(subsIn || []);
  // tresty: hráč s trestom si ho odpyká, keď jeho tím odohrá zápas
  const played = new Set(lineup.concat(subsIn || []));
  for (const p of teamPlayers(t)) if (p.ban > 0 && !played.has(p.id)) p.ban--;
  for (const id of lineup.concat(subsIn || [])) {
    const p = G.players[id];
    if (!p) continue;
    p.s.gp++;
    // skúsenosti z ihriska – za striedanie polovica
    p.xp = Math.round(Math.min(100, (p.xp ?? 30) + xg * (subs.has(id) ? 0.5 : 1)) * 10) / 10;
    p.fit = Math.max(25, p.fit - Math.round(U.rf(11, 17) * pm * (1 - 0.15 * trLvl(p, 'sta')) * tire));
  }
}
function applyGoals(ev) {
  goalBonusPay(ev);
  for (const e of ev) {
    const p = G.players[e.pid]; if (p) p.s.g++;
    const a = G.players[e.aid]; if (a) a.s.a++;
  }
}

// ─── Herné dni ───────────────────────────────────────────────────
function currentEvent() { return G.calendar[G.day]; }
function seasonOver() { return G.day >= G.calendar.length; }

function dayMatches(ev) {
  const out = [];
  if (!ev) return out;
  if (ev.t === 'L') {
    for (const lg of G.leagues) {
      const rd = lg.rounds[ev.r];
      if (rd) for (const m of rd) out.push({ comp: 'L', lg, m });
    }
  } else if (ev.t === 'E') {
    for (const c of euroList()) { const ms = c.cur === ev.r ? euroStage(c, ev.r) : null; if (ms) for (const m of ms) out.push({ comp: 'E', ek: c.id, ko: ev.r >= 6, m }); }
  } else {
    for (const c of cupsOfGrp(ev.k)) if (c.cur === ev.r && c.rounds[ev.r]) for (const m of c.rounds[ev.r]) out.push({ comp: 'C', ck: c.id, m });
  }
  return out;
}

function userMatchToday() {
  return dayMatches(currentEvent()).find(x => (x.m.h === G.userTid || x.m.a === G.userTid) && x.m.hg == null) || null;
}

// Nasledujúci zápas používateľa (pre domovskú obrazovku)
function nextUserFixture() {
  for (let d = G.day; d < G.calendar.length; d++) {
    const ev = G.calendar[d];
    if (ev.t === 'L') {
      const lg = leagueOf(userTeam());
      const rd = lg.rounds[ev.r];
      const m = rd && rd.find(m => m.h === G.userTid || m.a === G.userTid);
      if (m && m.hg == null) return { comp: 'L', lg, m, ev, day: d };
    } else if (ev.t === 'E') {
      for (const c of userEuro()) {
        const m = euroUserMatch(c, ev.r);
        if (m && m.hg == null) return { comp: 'E', ek: c.id, ko: ev.r >= 6, m, ev, day: d };
        if (!m && ev.r >= c.cur && ev.r >= 6 && c.alive.includes(G.userTid) && c.winner == null) return { comp: 'E', ek: c.id, ko: true, m: null, ev, day: d };
      }
    } else {
      for (const c of cupsOfGrp(ev.k)) {
        if (!c.entrants.includes(G.userTid)) continue;
        const m = cupUserMatch(c, ev.r);
        if (m && m.hg == null) return { comp: 'C', ck: c.id, m, ev, day: d };
        if (!m && ev.r >= c.cur && c.alive.includes(G.userTid) && ev.r < c.names.length && !(c.byes[ev.r] || []).includes(G.userTid)) return { comp: 'C', ck: c.id, m: null, ev, day: d };
      }
    }
  }
  return null;
}

function recordResult(x, res) {
  const m = x.m;
  m.hg = res.hg; m.ag = res.ag;
  const ko = x.comp === 'C' || x.ko;
  if (ko && res.hg === res.ag && !res.pen) res.pen = simPenalties(G.teams[m.h], G.teams[m.a]);
  if (ko) {
    m.pen = res.pen ? [res.pen.h, res.pen.a] : null;
    m.w = res.hg > res.ag ? m.h : res.hg < res.ag ? m.a : (res.pen.h > res.pen.a ? m.h : m.a);
  }
  const home = G.teams[m.h];
  if (!m.neutral) {
    const inc = Math.round(LEVEL_INFO[home.lvl].income * (x.comp === 'E' ? 2.5 : x.comp === 'C' ? 1.5 : 1) * U.rf(0.85, 1.15));
    if (home.id === G.userTid) { if (G.biz) bizHomeMatch(x, G.teams[m.a]); else book('gate', inc); } else home.budget += inc;
  } else if (G.biz && (m.h === G.userTid || m.a === G.userTid)) bizHomeMatch(x, null);
  fanIncident(x, res);
  if (res.lu) { res.rt = rateMatch(res); applyRatings(res.rt); }
  if (m.h === G.userTid || m.a === G.userTid) {
    if (res.rt) { m.rt = res.rt; m.lu = res.lu; m.sb = res.sb; }
    m.wx = weatherFor(G.teams[m.h]); m.ref = refFor(G.teams[m.h], G.teams[m.a]).n; m.varx = res.varx || [];
    m.inj = (res.inj || []).map(e => ({ min: e.min, side: e.side, pid: e.pid, k: e.k, d: e.d }));
    m.ev = res.ev.map(e => ({ min: e.min, side: e.side, pid: e.pid, aid: e.aid, sp: e.sp }));
    m.crowd = res.crowd = matchCrowd(x);
    m.cards = (res.cards || []).map(c => ({ min: c.min, side: c.side, pid: c.pid, c: c.c }));
    const opp = G.teams[m.h === G.userTid ? m.a : m.h];
    for (const id of opp.lineup || []) { const p = G.players[id]; if (p && know(p) < 75) addKnow(p, 20); }
    if (G.biz) bizAfterMatch(x, res);
    boardAfterMatch(x, res); boardObjAfterMatch(x, res); moraleAfterMatch(x, res); recordsAfterMatch(x, res);
    if (G.maf && G.maf.fix) { if (G.maf.fix.thrown) mafLog('Zápas bol „odovzdaný“.', 'bad'); G.maf.fix = null; }
  }
}

// Odsimuluje zvyšok dňa a posunie kalendár. Vráti info o dni.
function finishDay() {
  const ev = currentEvent();
  const ms = dayMatches(ev);
  for (const x of ms) {
    if (x.m.hg != null) continue;
    const res = simMatch(G.teams[x.m.h], G.teams[x.m.a], { knockout: x.comp === 'C' || x.ko, neutral: x.m.neutral });
    recordResult(x, res);
  }
  for (const p of G.players) if (p) p.fit = Math.min(100, p.fit + 10);
  healDay();
  const info = { ev, matches: ms };
  if (ev.t === 'L') {
    if (ev.r === L1_SPLIT_AFTER - 1) makeSplit(G.leagues[0]);
  } else if (ev.t === 'E') {
    for (const c of euroList()) finishEuroRound(c, ev.r);
  } else {
    for (const c of cupsOfGrp(ev.k)) if (c.cur === ev.r && c.rounds[ev.r]) finishCupRound(c, ev.r);
  }
  marketDay(ev);
  G.day++;
  dayStartEvents();
  return info;
}

function makeSplit(lg) {
  const tbl = leagueTable(lg);
  const A = tbl.slice(0, 6).map(r => r.tid), B = tbl.slice(6).map(r => r.tid);
  lg.groupA = A;
  const ra = doubleRR(A), rb = doubleRR(B);
  for (let i = 0; i < ra.length; i++) lg.rounds.push([...ra[i], ...rb[i]].map(mkMatch));
  news('Niké liga sa po 22. kole rozdelila na skupinu o titul (1. – 6.) a o udržanie (7. – 12.).');
}

function leagueRoundCount(lg) { const n = lg.tids.length; return lg.lvl === 1 ? 32 : (n % 2 ? n : n - 1) * 2; }

// ─── Koniec sezóny ───────────────────────────────────────────────
function endSeason() {
  const u = userTeam();
  const tables = {};
  for (const lg of G.leagues) tables[lg.id] = leagueTable(lg);
  const season = `${G.year}/${String((G.year + 1) % 100).padStart(2, '0')}`;
  const ulg = leagueOf(u);
  const upos = tables[ulg.id].findIndex(r => r.tid === u.id);
  const urow = tables[ulg.id][upos];
  const summary = { season, league: ulg.name, lvl: ulg.lvl, pos: upos + 1, n: ulg.tids.length, pts: urow.pts, trophies: [], move: null, champions: [] };

  for (const lg of G.leagues) {
    const ch = G.teams[tables[lg.id][0].tid];
    summary.champions.push({ league: lg.name, team: ch.name });
  }
  if (upos === 0) {
    const tr = { season, name: ulg.name, type: 'league', lvl: ulg.lvl };
    G.trophies.push(tr); summary.trophies.push(tr);
  }
  for (const c of cupList()) {
    if (c.winner !== u.id) continue;
    const tr = { season, name: c.name, type: c.kind, lvl: 0 };
    G.trophies.push(tr); summary.trophies.push(tr);
  }
  for (const c of euroList()) {
    if (c.winner !== u.id) continue;
    const tr = { season, name: c.name, type: c.kind, lvl: 0 };
    G.trophies.push(tr); summary.trophies.push(tr);
  }
  summary.cups = [...userEuro().map(c => ({ name: c.name, reach: euroReach(c, u.id), earn: c.earn || 0 })), ...userCups().map(c => ({ name: c.name, reach: cupReach(c, u.id), earn: c.earn || 0 }))];
  const L1t = tables[G.leagues[0].id];
  G.prev = { champ: L1t[0].tid, second: L1t[1].tid, cupW: G.cups.sp ? G.cups.sp.winner : null, l1: L1t.map(r => r.tid) };
  const ueu = userEuro()[0];
  const topScorer = teamPlayers(u).sort((a, b) => b.s.g - a.s.g)[0];
  G.history.push({ season, club: u.name, league: ulg.name, lvl: ulg.lvl, pos: upos + 1, pts: urow.pts, w: urow.w, d: urow.d, l: urow.l, gf: urow.gf, ga: urow.ga, cup: cupReach(G.cups.sp, u.id), cls: cupReach(G.cups.cls, u.id), eu: ueu ? `${EURO_DEF[ueu.id].short}: ${euroReach(ueu, u.id)}` : '',
    scorer: topScorer && topScorer.s.g ? `${pName(topScorer)} (${topScorer.s.g})` : '—' });

  // Prémie
  for (const lg of G.leagues) {
    const tbl = tables[lg.id], n = tbl.length;
    tbl.forEach((r, i) => {
      const pr = U.nice(LEVEL_INFO[lg.lvl].prize * Math.max(0.15, 1 - i / n));
      if (r.tid === u.id) book('prize', pr); else G.teams[r.tid].budget += pr;
    });
  }
  summary.prize = U.nice(LEVEL_INFO[ulg.lvl].prize * Math.max(0.15, 1 - upos / ulg.tids.length));

  // úlohy od vedenia sa vyhodnotia ešte v starej súťaži
  summary.objSnap = boardObjSnap();
  // Postupy a zostupy
  G.offseason = true;
  const oldLvl = u.lvl;
  promoteRelegate(tables);
  if (u.lvl < oldLvl) summary.move = { dir: 'up', to: leagueOf(u).name };
  else if (u.lvl > oldLvl) summary.move = { dir: 'down', to: leagueOf(u).name };
  financeSeasonEnd(oldLvl, upos + 1, ulg.tids.length);
  clubSeasonEnd(summary);
  licSeasonEnd(summary);
  if (G.bPending != null && !bTeam()) createBTeam();

  // Hosťovania, vývoj hráčov, zmluvy a odchody
  summary.loansBack = returnLoans();
  summary.retired = developPlayers();
  summary.expired = handleContracts();
  maintainSquads();
  euroMaintain();
  summary.youth = youthIntake();
  // káder používateľa nesmie klesnúť pod 16 hráčov
  const uu = userTeam();
  const need = { GK: 2, DF: 5, MF: 5, FW: 3 };
  for (const pos in need) {
    while (teamPlayers(uu).filter(p => p.pos === pos).length < need[pos]) {
      const np = genPlayer(uu.id, pos, LEVEL_INFO[uu.lvl].base - 5, { young: true, hu: uu.hu });
      uu.pids.push(np.id); summary.youth.push(pFull(np));
    }
  }
  while (teamPlayers(uu).length < 16) {
    const np = genPlayer(uu.id, U.pick(['DF', 'MF', 'FW']), LEVEL_INFO[uu.lvl].base - 5, { young: true, hu: uu.hu });
    uu.pids.push(np.id); summary.youth.push(pFull(np));
  }
  refreshFreeAgents();
  aiTransferWindow(10);
  G.offseason = false;

  G.year++;
  G.seasonNo++;
  startSeason();
  for (const t of G.teams) { assignNumbers(t); if (t.id !== G.userTid) { if (t.fx || t.lvl <= 3) aiPickForm(t); else autoLineup(t); } else validateLineup(t); }
  news(`Začína sezóna ${G.year}/${String((G.year + 1) % 100).padStart(2, '0')}!`, 'good');
  dayStartEvents();
  return summary;
}

function eligibleFor(t, targetLvl) {
  if (t.parent == null) return true;
  return G.teams[t.parent].lvl < targetLvl;
}

function assignByRegion(items, groups) {
  const gs = groups.slice();
  for (const x of items) {
    const t = G.teams[x.tid];
    const i = gs.findIndex(g => g.reg === t.reg || g.reg == null);
    if (i >= 0) { x.to = gs[i]; gs.splice(i, 1); }
  }
  for (const x of items) if (!x.to) x.to = gs.shift();
}

function moveTeam(tid, to) {
  const t = G.teams[tid];
  const from = G.leagues[t.lid];
  from.tids = from.tids.filter(id => id !== tid);
  to.tids.push(tid);
  t.lid = to.id; t.lvl = to.lvl;
}

function promoteRelegate(tables) {
  const moves = [];
  for (let lvl = 1; lvl < 9; lvl++) {
    const upper = G.leagues.filter(l => l.lvl === lvl), lower = G.leagues.filter(l => l.lvl === lvl + 1);
    const promoted = [];
    for (const lg of lower) {
      const c = tables[lg.id].find(r => eligibleFor(G.teams[r.tid], lvl));
      if (c) promoted.push({ tid: c.tid, from: lg });
    }
    const relegated = [];
    if (upper.length === 1) {
      const tbl = tables[upper[0].id];
      for (let i = 0; i < promoted.length; i++) relegated.push({ tid: tbl[tbl.length - 1 - i].tid, from: upper[0] });
    } else {
      upper.forEach((lg, i) => {
        if (i < promoted.length) { const tbl = tables[lg.id]; relegated.push({ tid: tbl[tbl.length - 1].tid, from: lg }); }
      });
    }
    assignByRegion(relegated, promoted.map(p => p.from));
    assignByRegion(promoted, relegated.map(r => r.from));
    moves.push(...promoted.map(x => ({ ...x, up: true })), ...relegated.map(x => ({ ...x, up: false })));
  }
  for (const mv of moves) {
    moveTeam(mv.tid, mv.to);
    const t = G.teams[mv.tid];
    if (mv.up) news(`${t.name} postúpil do súťaže ${mv.to.name}.`, t.id === G.userTid ? 'good' : 'info');
    else news(`${t.name} zostúpil do súťaže ${mv.to.name}.`, t.id === G.userTid ? 'bad' : 'info');
    if (mv.up && t.id !== G.userTid) strengthenPromoted(t);
  }
  // B-tímy nesmú hrať rovnakú alebo vyššiu súťaž ako A-tím
  for (let guard = 0; guard < 6; guard++) {
    const bad = G.teams.find(t => t.parent != null && t.lvl <= G.teams[t.parent].lvl && t.lvl < 9);
    if (!bad) break;
    const down = G.leagues.filter(l => l.lvl === bad.lvl + 1);
    const target = down.find(l => l.reg === bad.reg) || down[0];
    const repl = leagueTable(target).find(r => G.teams[r.tid].parent == null);
    const fromLg = G.leagues[bad.lid];
    moveTeam(bad.id, target);
    if (repl) moveTeam(repl.tid, fromLg);
  }
}

function strengthenPromoted(t) {
  const base = LEVEL_INFO[t.lvl].base;
  const ps = teamPlayers(t).sort((a, b) => a.r - b.r);
  const n = Math.min(4, ps.length);
  for (let i = 0; i < n; i++) {
    const old = ps[i];
    if (old.r >= base - 2) continue;
    const np = genPlayer(t.id, old.pos, base - 1);
    removeFromTeam(old);
    G.players[old.id] = null;
    t.pids.push(np.id);
  }
}

function removeFromTeam(p) {
  if (p.tid >= 0 && p.tid === G.userTid && typeof hofCheck === 'function') hofCheck(p);
  if (p.tid >= 0) { const t = G.teams[p.tid]; t.pids = t.pids.filter(id => id !== p.id); }
  p.acad = false;
}
// rýchlosť rastu podľa veku (podiel rozdielu medzi silou a potenciálom za sezónu)
function devRate(age) { return age <= 18 ? 0.32 : age <= 20 ? 0.28 : age <= 22 ? 0.22 : age <= 24 ? 0.16 : age <= 26 ? 0.12 : 0.08; }

function developPlayers() {
  const retired = [];
  for (const p of G.players) {
    if (!p) continue;
    pushSeasonHistory(p);
    p.c.gp += p.s.gp; p.c.g += p.s.g; p.c.a += p.s.a;
    p.age++;
    if (!p.pot || p.pot < p.r) p.pot = p.r;
    const gap = p.pot - p.r;
    const own = p.tid === G.userTid;
    let d;
    // časť sezóny v akadémii – rast z akadémie sa pripisuje priebežne
    const acadShare = Math.min(1, (p.s.ad || 0) / ACAD_DAYS);
    if (p.age <= 29) {
      // minúty na ihrisku: 0 zápasov = 55 %, 20+ zápasov = 145 % bežného rastu
      const playF = 0.55 + 0.9 * Math.min(1, (p.s.gp + 0.6 * (p.s.yg || 0)) / 20);
      let g = gap * devRate(p.age) * playF * (1 - acadShare);
      // tréningový plán a realizačný tím
      if (own) { g *= trDevF(); if (p.pos === 'GK' && staff().gk) g *= 1 + 0.06 * staff().gk.q; }
      d = gap > 0 ? Math.round(g + U.gauss() * 1.1 * (1 - acadShare)) : U.ri(-1, 1);
      if (gap > 0 && d < 0) d = 0;
    } else if (p.age <= 31) d = U.ri(-2, 1);
    else if (p.age <= 33) d = U.ri(-3, 0);
    else d = U.ri(-5, -1);
    if (G.biz && p.tid === G.userTid && G.biz.fac && G.biz.fac.train) {
      const tl = G.biz.fac.train;
      if (d >= 0 && p.age <= 28 && U.chance(0.2 * tl)) d++;
      else if (d < 0 && U.chance(0.12 * tl)) d++;
    }
    if (d > 0 && p.r + d > p.pot && !U.chance(0.12)) d = Math.max(0, p.pot - p.r);
    p.r = U.clamp(p.r + d, 5, 95);
    // potenciál sa môže meniť – prielom aj stagnácia
    if (p.age <= 23) {
      let drift = U.ri(-2, 2) + (p.s.gp >= 15 ? 1 : acadShare >= 0.5 ? (G.biz && G.biz.fac.youth >= 3 ? 1 : 0) : p.s.gp < 3 ? -1 : 0);
      if (U.chance(0.04)) { drift += U.ri(5, 9); if (own) news(`💎 Prielom! ${pFull(p)} prekvapil – jeho potenciál výrazne vzrástol.`, 'good'); }
      else if (U.chance(0.04)) { drift -= U.ri(4, 8); if (own) news(`📉 ${pFull(p)} stagnuje – jeho potenciál klesol.`, 'bad'); }
      if (drift > 0 && p.pot >= 74) drift = Math.ceil(drift / 2);
      p.pot = U.clamp(p.pot + drift, p.r, 88);
    } else if (p.age >= 30) p.pot = p.r;
    else if (p.age >= 27) p.pot = Math.max(p.r, p.pot - U.ri(0, 2));
    if (p.pot < p.r) p.pot = p.r;
    p.xp = Math.min(100, (p.xp ?? 30) + 1.5);
    if (p.acad && p.age > ACAD_MAX_AGE) { p.acad = false; p.acadD = 0; if (own) news(`🎓 ${pFull(p)} (${p.age} r.) už prerástol akadémiu a vrátil sa na lavičku.`); }
    if ((p.age >= 33 && U.chance((p.age - 32) * 0.18)) || (p.age >= 31 && p.tid < 0 && U.chance(0.35))) {
      if (p.tid === G.userTid) retired.push(pFull(p));
      removeFromTeam(p);
      G.players[p.id] = null;
    }
  }
  for (const n of retired) news(`${n} ukončil kariéru.`);
  if (G.userTid >= 0) fillAcademy();
  return retired;
}

function teamBase(t) {
  const ps = teamPlayers(t);
  return ps.length ? Math.round(U.avg(ps.map(p => p.r))) : LEVEL_INFO[t.lvl].base;
}

function maintainSquads() {
  for (const t of G.teams) {
    if (t.id === G.userTid) continue;
    // vlastný dorast AI klubov – noví mladí hráči s rôznym potenciálom
    const base = Math.max(5, teamBase(t) - 9);
    const n = U.ri(1, 2) + (t.parent != null ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const np = genPlayer(t.id, U.pick(['DF', 'MF', 'FW', 'MF', 'DF', 'GK']), base, { young: true, hu: t.hu });
      np.age = U.ri(16, 18); np.pot = rollPotential(np.age, np.r, teamBase(t));
      t.pids.push(np.id);
    }
    aiRefill(t);
    const ps = sortSquad(teamPlayers(t));
    if (ps.length > 26) {
      // odchádzajú najmä starší a slabší hráči
      const extra = ps.slice().sort((a, b) => (a.r - (a.age >= 30 ? (a.age - 29) * 3 : 0) + potGap(a)) - (b.r - (b.age >= 30 ? (b.age - 29) * 3 : 0) + potGap(b))).slice(0, ps.length - 25);
      for (const p of extra) toFreeAgent(p);
    }
  }
}

function aiRefill(t) {
  const base = t.fx ? Math.max(t.tier - 5, teamBase(t) - 2) : Math.max(LEVEL_INFO[t.lvl].base - 3, teamBase(t) - 2);
  const ps = teamPlayers(t);
  for (const pos of ['GK', 'DF', 'MF', 'FW']) {
    let have = ps.filter(p => p.pos === pos).length;
    while (have < SQUAD_MIN[pos]) {
      const fa = G.freeAgents.map(id => G.players[id]).find(p => p && p.tid < 0 && p.pos === pos && Math.abs(p.r - base) <= 4);
      if (fa) { moveToTeam(fa, t); fa.w = wageFor(fa, t.lvl); fa.ce = G.year + (G.offseason ? 2 : 1) + U.ri(0, 2); }
      else { const p = genPlayer(t.id, pos, base, { young: U.chance(0.5), hu: t.hu }); t.pids.push(p.id); }
      have++;
    }
  }
  let total = teamPlayers(t).length;
  while (total < 18) { const p = genPlayer(t.id, U.pick(['DF', 'MF', 'FW']), base, { young: true, hu: t.hu }); t.pids.push(p.id); total++; }
}

function youthIntake() {
  const u = userTeam();
  const ya = G.biz ? G.biz.fac.youth : 0;
  const n = U.ri(1, 2) + (ya >= 2 ? 1 : 0) + (ya >= 4 ? 1 : 0);
  const out = [];
  for (let i = 0; i < n; i++) {
    const p = genPlayer(u.id, U.pick(['DF', 'MF', 'FW', 'MF', 'GK']), LEVEL_INFO[u.lvl].base - 6 + ya, { young: true, hu: u.hu });
    p.age = 17; p.pot = rollPotential(17, p.r, teamBase(u) + ya, ya);
    u.pids.push(p.id);
    out.push(pFull(p));
    const tl = talentLabel(p);
    news(`Z mládeže prišiel ${tl[0] === 'gem' ? '💎 klenot' : tl[0] === 'big' ? '⭐ veľký talent' : 'talent'} ${pFull(p)} (${POS_NAME_SK[p.pos]}, sila ${p.r}, potenciál ${p.pot}).`, 'good');
  }
  return out;
}

// Cielené posily AI klubov (1. – 3. liga a zahraničie): kúpia hráča na najslabší post zostavy
function aiRecruitAll() {
  const byPos = { GK: [], DF: [], MF: [], FW: [] };
  for (const p of G.players) if (p && !p.loan && p.age <= 31 && !(p.tid >= 0 && isUserSide(G.teams[p.tid])) && (p.tid >= 0 || G.freeAgents.includes(p.id))) byPos[p.pos].push(p);
  const buyers = G.teams.filter(t => !isUserSide(t) && (t.fx || t.lvl <= 3));
  for (const t of U.shuffle(buyers)) if (U.chance(t.fx ? 0.4 : [0, 0.65, 0.3, 0.2][t.lvl])) aiRecruit(t, byPos);
}
function aiRecruit(t, byPos) {
  const xi = (t.lineup || []).map(id => G.players[id]).filter(Boolean);
  if (xi.length < 11 || teamPlayers(t).length >= 27) return;
  const weak = xi.slice().sort((a, b) => a.r - b.r)[0], base = teamBase(t);
  // strop podľa ligy, aby nižšie ligy postupne nezosilneli na úroveň vyšších
  const lo = weak.r + 3, hi = Math.min(base + 6, t.fx ? 99 : LEVEL_INFO[t.lvl].base + 7), money = t.budget * 0.6;
  let best = null, bv = -1e9;
  for (const p of byPos[weak.pos]) {
    if (p.r < lo || p.r > hi || p.tid === t.id) continue;
    const s = p.tid >= 0 ? G.teams[p.tid] : null;
    if (s) {
      if (teamPlayers(s).length <= 18 || isUserSide(s)) continue;
      if (t.fx ? !s.fx || (s.tier || 0) >= t.tier : s.fx || s.lvl < t.lvl) continue;
    } else if (t.fx) continue;
    const price = s ? askingPrice(p) : 0;
    if (price > money) continue;
    const v = (p.r - weak.r) * 2 + (p.age <= 24 ? 2 : 0) - price / Math.max(1, money) * 3;
    if (v > bv) { bv = v; best = { p, s, price }; }
  }
  if (!best) return;
  const { p, s, price } = best;
  t.budget -= price; if (s) s.budget += price;
  moveToTeam(p, t);
  p.w = Math.max(p.w || 0, wageFor(p, t.lvl)); p.ce = G.year + (G.offseason ? 2 : 1) + U.ri(1, 3);
  logTransfer(p, s, t, price, s ? 'buy' : 'free');
  if (!t.fx && t.lvl <= 2) news(`Posila: ${pFull(p)} (${s ? s.short : 'voľný'} → ${t.short})${price ? ' za ' + U.money(price) : ''}.`, 'transfer');
}

// Prestupy medzi AI klubmi
function aiTransferWindow(n) {
  for (let i = 0; i < n; i++) {
    const lvl = U.weighted([1, 2, 3, 4, 5], l => [0, 4, 3, 2, 1, 1][l]);
    const buyers = G.teams.filter(t => t.lvl === lvl && !isUserSide(t));
    const sellers = G.teams.filter(t => (t.lvl === lvl + 1 || t.lvl === lvl) && !isUserSide(t));
    if (!buyers.length || !sellers.length) continue;
    const buyer = U.pick(buyers), seller = U.pick(sellers);
    if (buyer === seller) continue;
    const cands = teamPlayers(seller).filter(p => !p.loan && p.r >= teamBase(buyer) && p.pos !== 'GK');
    if (!cands.length) continue;
    const p = U.pick(cands);
    const price = U.nice(askingPrice(p) * U.rf(0.85, 1.15));
    if (buyer.budget < price || teamPlayers(buyer).length >= 28 || teamPlayers(seller).length <= 17) continue;
    buyer.budget -= price; seller.budget += price;
    moveToTeam(p, buyer);
    p.w = Math.max(p.w || 0, wageFor(p, buyer.lvl)); p.ce = G.year + (G.offseason ? 2 : 1) + U.ri(1, 3);
    logTransfer(p, seller, buyer, price, 'buy');
    G.short = (G.short || []);
    if (lvl <= 2 || G.short.includes(p.id)) news(`Prestup: ${pFull(p)} (${seller.short} → ${buyer.short}) za ${U.money(price)}.`, 'transfer');
  }
  if (G.euroTids) for (let i = 0; i < Math.max(1, Math.round(n / 4)); i++) if (U.chance(0.5)) euroBuy();
}

// ─── Uloženie ────────────────────────────────────────────────────
const SAVE_KEY = 'slovakChamps.save.v1';
// hráči sa ukladajú ako tabuľka (názvy polí len raz) – uloženie je asi o polovicu menšie
function packPlayers(ps) {
  const keys = [], idx = {};
  for (const p of ps) if (p) for (const k in p) if (!(k in idx)) { idx[k] = keys.length; keys.push(k); }
  return { keys, rows: ps.map(p => { if (!p) return 0; const r = keys.map(k => (p[k] === undefined ? null : p[k])); while (r.length && r[r.length - 1] === null) r.pop(); return r; }) };
}
function unpackPlayers(pk) {
  return pk.rows.map(r => { if (!r) return null; const p = {}; pk.keys.forEach((k, i) => { if (r[i] != null) p[k] = r[i]; }); return p; });
}
function saveString() { return JSON.stringify({ ...G, players: undefined, pp: packPlayers(G.players) }); }
function saveGame() {
  try { localStorage.setItem(SAVE_KEY, saveString()); return true; } catch (e) { console.warn('Uloženie zlyhalo', e); return false; }
}
function restoreSave(obj) { if (obj.pp) { obj.players = unpackPlayers(obj.pp); delete obj.pp; } return obj; }
function loadGame() {
  try {
    const s = localStorage.getItem(SAVE_KEY);
    if (!s) return false;
    G = restoreSave(JSON.parse(s));
    return true;
  } catch (e) { return false; }
}
function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
function deleteSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } }
