'use strict';
// ─── Fanúšikovia: temperament, rivalita (derby), nálada, výtržnosti · karty a tresty ───

// identifikátor klubu: kľúč reálneho klubu alebo #mesto
const REAL_DERBIES = [
  ['slovan', 'trnava', 3, 'Slovenské derby'], ['kosice', 'presov', 3, 'Východniarske derby'],
  ['slovan', 'dac', 2, 'Šláger Slovan – DAC'], ['trnava', 'dac', 2, 'Západoslovenské derby'],
  ['zilina', 'trencin', 2, 'Považské derby'], ['ruzomberok', 'mikulas', 2, 'Liptovské derby'],
  ['dukla', 'podbrezova', 2, 'Pohronské derby'], ['michalovce', 'humenne', 2, 'Zemplínske derby'],
  ['slovan', 'inter', 2, 'Bratislavské derby'], ['slovan', 'petrzalka', 2, 'Bratislavské derby'], ['inter', 'petrzalka', 2, 'Bratislavské derby'],
  ['zlatemoravce', '#Nitra', 2, 'Ponitrianske derby'], ['presov', '#Bardejov', 2, 'Šarišské derby'], ['skalica', '#Senica', 2, 'Záhorské derby'],
  ['kosice', 'michalovce', 1, 'Východné derby'], ['zilina', 'slovan', 1, 'Šláger ligy'], ['komarno', 'dac', 1, 'Žitnoostrovské derby'],
  ['dukla', 'zvolen', 1, 'Stredoslovenské derby'], ['trencin', 'povazska', 1, 'Považské derby'], ['pohronie', 'podbrezova', 1, 'Pohronské derby'],
];
// temperament fanúšikov (0 – 100), herný odhad
const FAN_TEMPER = { slovan: 88, trnava: 86, dac: 74, kosice: 72, presov: 70, dukla: 62, zilina: 56, inter: 55, petrzalka: 52, trencin: 46, michalovce: 46, humenne: 46, komarno: 44, ruzomberok: 40, skalica: 40, mikulas: 40, zlatemoravce: 38, zvolen: 36, podbrezova: 24 };

function teamRef(id) {
  if (id[0] === '#') return G.teams.find(t => t.city === id.slice(1) && t.parent == null) || null;
  return G.teams.find(t => t.key === id) || null;
}
const rivKey = (a, b) => (a < b ? a + '-' + b : b + '-' + a);
function setRival(A, B, l, n) { const k = rivKey(A.id, B.id), o = G.rivals[k]; if (!o || o[0] < l) G.rivals[k] = [l, n]; }
function hasRival(id) { return Object.keys(G.rivals).some(k => k.split('-').map(Number).includes(id)); }

function initFans() {
  for (const t of G.teams) {
    if (t.fa != null) continue;
    const base = { 1: 46, 2: 36, 3: 30 }[t.lvl] || 22;
    t.fa = U.clamp(Math.round(FAN_TEMPER[t.key] ?? base + U.gauss() * 13), 5, 95);
    if (t.parent != null) t.fa = Math.min(t.fa, 18);
  }
  G.rivals = G.rivals || {};
  for (const [a, b, l, n] of REAL_DERBIES) { const A = teamRef(a), B = teamRef(b); if (A && B && A !== B) setRival(A, B, l, n); }
  // susedské derby pre kluby bez rivala (v rámci svojej skupiny)
  for (const lg of G.leagues) {
    const free = U.shuffle(lg.tids.filter(id => G.teams[id].parent == null && !hasRival(id)));
    for (let i = 0; i + 1 < free.length; i += 2) setRival(G.teams[free[i]], G.teams[free[i + 1]], 1, 'Susedské derby');
  }
}

// [úroveň 1 – 3, názov] alebo null
function rivalry(a, b) {
  if (!a || !b || a === b) return null;
  const r = G.rivals && G.rivals[rivKey(a.id, b.id)];
  if (r) return r;
  if (a.city === b.city && a.parent == null && b.parent == null) return [2, 'Mestské derby'];
  return null;
}
function rivalsOf(t) {
  const out = [];
  for (const k in G.rivals || {}) {
    const [x, y] = k.split('-').map(Number);
    if (x === t.id || y === t.id) out.push([G.teams[x === t.id ? y : x], ...G.rivals[k]]);
  }
  return out.sort((a, b) => b[1] - a[1]);
}
const flames = fa => Math.max(1, Math.ceil((fa ?? 30) / 20));
const tempName = fa => ['', 'pokojní', 'zapálení', 'hluční', 'búrliví', 'agresívni'][flames(fa)];
function tempTag(t) { const f = flames(t.fa); return `<span class="temper t${f}" title="Temperament fanúšikov: ${tempName(t.fa)}">${'🔥'.repeat(f)}</span>`; }
function teamHard(t) { const ps = (t.lineup || []).map(id => G.players[id]).filter(Boolean); return ps.length ? Math.round(U.avg(ps.map(p => p.agg ?? 40))) : 40; }

// ── Agresivita hráčov ──────────────────────────────────────────
function initAgg(p) {
  const st = archName(p);
  const a = 35 + U.gauss() * 13 + ({ DF: 10, MF: 4, FW: 0, GK: -15 })[p.pos] + (st === 'Ničiteľ' ? 18 : st === 'Tank' ? 10 : st === 'Tiki-taka' || st === 'Kreatívec' ? -6 : 0) + trLvl(p, 'tkl') * 5;
  p.agg = U.clamp(Math.round(a), 2, 98);
}

// ── Karty ───────────────────────────────────────────────────────
function genCards(home, away) {
  const r = rivalry(home, away), rl = r ? r[0] : 0, out = [];
  for (const [side, t] of [[0, home], [1, away]]) {
    const lp = lineupPlayers(t);
    if (!lp.length) continue;
    const hard = U.avg(lp.map(x => x.p.agg ?? 40));
    const k = (0.55 + hard / 85) * (1 + 0.15 * rl) * [0.9, 1, 1.15][t.press ?? 1] * (side ? 1.08 : 1) * refK(refFor(home, away));
    const w = x => Math.pow(x.p.agg ?? 40, 1.1) * ({ GK: 0.15, DF: 1.25, MF: 1.15, FW: 0.8 })[x.sp];
    const yel = {};
    for (let i = U.poisson(1.5 * k); i > 0; i--) {
      let x = U.weighted(lp, w);
      const min = U.ri(3, 92);
      if (yel[x.p.id] != null) {
        // druhá žltá len občas, inak karta pre iného hráča
        if (U.chance(0.15)) { out.push({ side, pid: x.p.id, c: 'R', two: true, min: Math.max(min, yel[x.p.id] + 1) }); continue; }
        x = U.weighted(lp, w);
        if (yel[x.p.id] != null) continue;
      }
      yel[x.p.id] = min; out.push({ side, pid: x.p.id, c: 'Y', min });
    }
    if (U.chance(0.028 * k)) out.push({ side, pid: U.weighted(lp, w).p.id, c: 'R', min: U.ri(10, 90) });
  }
  out.sort((a, b) => a.min - b.min);
  const off = new Set();
  return out.filter(c => { if (off.has(c.pid)) return false; if (c.c === 'R') off.add(c.pid); return true; });
}
// oslabenie po červenej karte v simulácii
function redCardEffect(chances, cards) {
  let ch = chances;
  for (const c of cards) {
    if (c.c !== 'R') continue;
    ch = ch.filter(x => !(x.side === c.side && x.min > c.min && U.chance(0.25)));
    for (let i = U.poisson(1.2 * (90 - c.min) / 90); i > 0; i--) ch.push({ side: 1 - c.side, min: U.rf(c.min + 1, 90) });
  }
  return ch.sort((a, b) => a.min - b.min);
}
function applyCards(cards, home, away) {
  for (const c of cards || []) {
    const p = G.players[c.pid];
    if (!p) continue;
    const t = c.side ? away : home;
    t.dis = t.dis || { y: 0, r: 0 };
    p.s.yc = p.s.yc || 0; p.s.rc = p.s.rc || 0;
    const own = p.tid === G.userTid;
    if (c.c === 'Y') {
      p.s.yc++; t.dis.y++;
      if (p.s.yc % 4 === 0) { p.ban = (p.ban || 0) + 1; if (own) news(`🟨 ${pFull(p)} má ${p.s.yc}. žltú kartu – vynechá najbližší zápas.`, 'bad'); }
    } else {
      p.s.rc++; t.dis.r++;
      const n = c.two ? 1 : U.ri(1, 3);
      p.ban = (p.ban || 0) + n;
      if (own) news(`🟥 ${pFull(p)} dostal červenú kartu – trest na ${n} ${n === 1 ? 'zápas' : 'zápasy'}.`, 'bad');
    }
  }
}

// ── Nálada fanúšikov (tvoj klub) ───────────────────────────────
function mood() { return G.biz ? G.biz.mood ?? 60 : 60; }
const MOOD_LV = [[25, '😡', 'nahnevaní'], [42, '😟', 'sklamaní'], [58, '😐', 'pokojní'], [75, '🙂', 'spokojní'], [101, '😍', 'nadšení']];
function moodInfo(v = mood()) { const m = MOOD_LV.find(x => v < x[0]); return { v: Math.round(v), ic: m[1], n: m[2] }; }
function moodTag() { const m = moodInfo(); return `<span class="mood" title="Nálada fanúšikov: ${m.n}">${m.ic} ${m.v}</span>`; }
function moodAttF() { return 0.88 + 0.24 * mood() / 100; }
function moodAdd(d) { const b = G.biz; if (!b) return; b.mood = U.clamp((b.mood ?? 60) + d, 0, 100); }
function moodAfterMatch(x, my, op, won) {
  const b = G.biz;
  if (!b) return;
  const u = userTeam(), opp = G.teams[x.m.h === u.id ? x.m.a : x.m.h], r = rivalry(u, opp), k = 1 + (r ? r[0] * 0.6 : 0);
  // podľa očakávaní: prehra s favoritom bolí menej, výhra nad ním poteší viac
  const exp = 1 / (1 + Math.pow(10, (teamRating(opp) - teamRating(u) + (x.m.h === u.id ? -2 : 2)) / 10));
  let d = ((won ? 1 : my === op ? 0.5 : 0) - exp) * 10;
  if (my - op >= 3) d += 3; else if (op - my >= 3) d -= 3;
  if (x.comp === 'C' && won) d += 2;
  if (x.comp === 'E') d += won ? 3 : 1;
  d *= k;
  const fzn = b.fac.fanzone || 0;
  const kot = x.m.h === u.id ? b.fac.kotol || 0 : 0;
  d *= d > 0 ? 1 + 0.15 * fzn + 0.1 * kot : 1 - 0.12 * fzn;
  if (x.m.h === u.id && b.ticket > DEF_TICKET[u.lvl] * 1.6) d -= 1;
  b.mood = U.clamp((b.mood ?? 60) * 0.96 + 55 * 0.04 + d, 0, 100);
  if (r && r[0] >= 2) news(won ? `🎉 ${r[1]} je naše! Fanúšikovia oslavujú výhru nad ${opp.name}.` : my < op ? `😤 Prehra v derby s ${opp.name} – fanúšikovia sú nahnevaní.` : `${r[1]} s ${opp.name} skončilo remízou.`, won ? 'good' : my < op ? 'bad' : 'info');
  // protest pri veľmi zlej nálade
  if (b.mood < 22 && U.chance(0.25)) {
    b.attMalus = (b.attMalus || 1) * 0.88;
    inboxAdd({ type: 'info', text: '📢 Fanúšikovia protestujú – transparenty proti vedeniu a bojkot najbližšieho domáceho zápasu (−12 % divákov).' });
  }
}

// ── Výtržnosti ──────────────────────────────────────────────────
function fanIncident(x, res) {
  const h = G.teams[x.m.h], a = G.teams[x.m.a];
  if (!h || !a) return;
  const r = rivalry(h, a), rl = r ? r[0] : 0;
  const A = ((h.fa ?? 30) + (a.fa ?? 30) * 0.85) / 185;
  const uf = h.id === G.userTid && G.biz ? G.biz.fac : {};
  const p = (0.003 + 0.06 * A * A * (1 + 1.5 * rl) * (h.lvl <= 2 ? 1.2 : 0.8) * (x.m.neutral ? 1.2 : 1)) * (1 + 0.2 * (uf.kotol || 0)) * (1 - 0.25 * (uf.family || 0));
  if (!U.chance(p)) return;
  const roll = Math.random();
  const kind = roll < 0.6 ? 'pyro' : roll < 0.9 ? 'fight' : 'riot';
  const culprit = U.chance((h.fa ?? 30) / ((h.fa ?? 30) + (a.fa ?? 30))) ? h : a;
  const fine = U.nice(LEVEL_INFO[culprit.lvl].income * ({ pyro: 0.15, fight: 0.5, riot: 1.2 })[kind]);
  x.m.inc = kind;
  culprit.inc = (culprit.inc || 0) + 1;
  const what = { pyro: 'pyrotechniku', fight: 'bitku fanúšikov', riot: 'vážne výtržnosti' }[kind];
  const pen = kind === 'riot' ? ' a najbližší domáci zápas odohrá bez divákov' : kind === 'fight' ? ' a zatvorený sektor na najbližší domáci zápas' : '';
  if (culprit.id === G.userTid) {
    book('eventx', -fine);
    if (G.biz) { G.biz.attMalus = (G.biz.attMalus || 1) * (kind === 'riot' ? 0 : kind === 'fight' ? 0.75 : 1); moodAdd(kind === 'riot' ? -4 : -1); }
  } else culprit.budget -= fine;
  const txt = `${kind === 'pyro' ? '🎆' : '🥊'} ${h.short} – ${a.short}: disciplinárna komisia potrestala ${culprit.name} za ${what} pokutou ${U.money(fine)}${pen}.`;
  const mine = h.id === G.userTid || a.id === G.userTid;
  if (mine) inboxAdd({ type: 'info', text: txt });
  else if (kind !== 'pyro' && (h.lvl <= 2 || h.lid === userTeam().lid)) news(txt, 'info');
}

// ── Diváci na zápase tvojho tímu (celkom a koľko z nich tvojich fanúšikov) ──
function clubFans(t) { return t.id === G.userTid && G.biz ? G.biz.fans : Math.round((t.cap || REAL_CAPACITY[t.key] || DEF_CAP[t.lvl] || 5000) * 0.55); }
function matchCrowd(x) {
  const u = userTeam(), m = x.m;
  if (m.h !== u.id && m.a !== u.id) return null;
  const home = G.teams[m.h], away = G.teams[m.a], opp = m.h === u.id ? away : home;
  const r = rivalry(home, away), rl = r ? r[0] : 0, b = G.biz;
  const travel = t => U.clamp(0.03 + 0.07 * (t.fa ?? 30) / 100 + 0.04 * rl + (home.reg === away.reg ? 0.03 : 0), 0.02, 0.24);
  let att, mine;
  if (m.neutral) {
    att = Math.round((x.comp === 'E' ? 60000 : 22500) * U.rf(0.6, 0.95));
    mine = Math.round(att * U.clamp(clubFans(u) / (clubFans(u) + clubFans(opp)), 0.2, 0.8));
  } else if (m.h === u.id) {
    att = b && b.attLast ? b.attLast : Math.round(DEF_CAP[u.lvl] * 0.6);
    mine = att - Math.round(att * travel(away));
  } else {
    const cap = home.cap || REAL_CAPACITY[home.key] || DEF_CAP[home.lvl];
    att = Math.round(cap * U.clamp(U.rf(0.35, 0.7) * (1 + 0.2 * rl) * (x.comp === 'E' ? 1.35 : x.comp === 'C' ? 1.1 : 1), 0.1, 1));
    mine = Math.min(Math.round(att * travel(u) * (0.7 + 0.6 * mood() / 100)), Math.round(clubFans(u) * 0.3));
  }
  return { att: Math.max(1, att), mine: Math.max(0, Math.min(att, mine)) };
}
