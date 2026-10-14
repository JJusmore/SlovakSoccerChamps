'use strict';
// ─── Poháre: Slovak Classic, Slovenský pohár, Superpohár, regionálne poháre ───

// after = po ktorom ligovom kole sa hrá ďalšie kolo pohára
const CUP_DEF = {
  cls: { grp: 'cls', kind: 'classic', name: 'Slovak Classic', short: 'Classic', after: [0, 3, 7, 11, 14, 17, 22, 27, 31], neutralFinal: true, tier: true },
  sp: { grp: 'sp', kind: 'cup', name: 'Slovenský pohár', short: 'Pohár', after: [2, 6, 10, 15, 20, 25], neutralFinal: true },
  sup: { grp: 'sup', kind: 'super', name: 'Superpohár', short: 'Superpohár', before: true },
  rZ: { grp: 'reg', kind: 'reg', reg: 'Z', name: 'Pohár ZsFZ', short: 'Pohár ZsFZ', after: [1, 5, 9, 13, 19, 24, 29] },
  rS: { grp: 'reg', kind: 'reg', reg: 'S', name: 'Pohár SsFZ', short: 'Pohár SsFZ', after: [1, 5, 9, 13, 19, 24, 29] },
  rV: { grp: 'reg', kind: 'reg', reg: 'V', name: 'Pohár VsFZ', short: 'Pohár VsFZ', after: [1, 5, 9, 13, 19, 24, 29] },
};
const CUP_GRP_AFTER = { reg: CUP_DEF.rZ.after, sp: CUP_DEF.sp.after, cls: CUP_DEF.cls.after };
const CUP_ORDER = ['cls', 'sp', 'sup', 'rZ', 'rS', 'rV'];
const CLS_PRIZE = { 2: 300000, 4: 120000, 8: 60000, 16: 30000, 32: 16000, 64: 9000, 128: 5000, 256: 3000 };
const REG_PRIZE = { 2: 8000, 4: 4000, 8: 2500, 16: 1600, 32: 1000, 64: 600 };

function cupList() { return G.cups ? CUP_ORDER.map(k => G.cups[k]).filter(Boolean) : []; }
function cupsOfGrp(grp) { return cupList().filter(c => c.grp === (grp || 'sp')); }
function cupDef(c) { return CUP_DEF[c.id] || CUP_DEF.sp; }
function userCups() { return cupList().filter(c => c.entrants.includes(G.userTid)); }

function cupNames(n) {
  let P = 1;
  while (P * 2 <= n) P *= 2;
  const out = [];
  if (P < n) out.push('Predkolo');
  let k = 1;
  for (let m = P; m >= 2; m /= 2) out.push(m === 2 ? 'Finále' : m === 4 ? 'Semifinále' : m === 8 ? 'Štvrťfinále' : m === 16 ? 'Osemfinále' : (k++) + '. kolo');
  return out;
}
function cupRoundName(c, i) {
  if (typeof c === 'number') { i = c; c = G.cups && G.cups.sp; }
  if (!c) return (i + 1) + '. kolo';
  if (c.id === 'sup') return 'Finále';
  return (c.names && c.names[i]) || (i + 1) + '. kolo';
}

// ── Vytvorenie súťaží na začiatku sezóny ────────────────────────
function setupCups() {
  G.cups = {};
  const A = t => t.parent == null && !t.fx;
  const ids = f => G.teams.filter(t => A(t) && f(t)).map(t => t.id);
  // Slovak Classic – všetky kluby Slovenska
  makeCup('cls', ids(() => true));
  // Slovenský pohár – 64 klubov
  const byLvl = l => ids(t => t.lvl === l);
  const sp = [...byLvl(1), ...byLvl(2)];
  const u = G.userTid;
  if (u >= 0 && !sp.includes(u) && A(G.teams[u])) sp.push(u);
  const p3 = U.shuffle(byLvl(3).filter(id => !sp.includes(id)));
  const p4 = U.shuffle(byLvl(4).filter(id => !sp.includes(id)));
  while (sp.length < 64 && p3.length) sp.push(p3.pop());
  while (sp.length < 64 && p4.length) sp.push(p4.pop());
  makeCup('sp', sp.slice(0, 64));
  // regionálne poháre – kluby 4. až 9. ligy
  for (const k of ['rZ', 'rS', 'rV']) makeCup(k, ids(t => t.lvl >= 4 && t.reg === CUP_DEF[k].reg));
  // Superpohár – majster ligy proti víťazovi pohára
  const L1 = G.leagues[0].tids;
  let champ = G.prev && G.prev.champ, cw = G.prev && G.prev.cupW;
  const best = L1.slice().sort((a, b) => teamRating(G.teams[b]) - teamRating(G.teams[a]));
  if (champ == null || !G.teams[champ] || G.teams[champ].lvl !== 1) champ = best[0];
  if (cw == null || cw === champ || !G.teams[cw] || G.teams[cw].lvl > 2) cw = (G.prev && G.prev.second != null && G.prev.second !== champ) ? G.prev.second : best.find(id => id !== champ);
  makeCup('sup', [champ, cw]);
}

function makeCup(id, tids) {
  const d = CUP_DEF[id];
  const c = { id, grp: d.grp, kind: d.kind, name: d.name, rounds: [], byes: {}, names: cupNames(tids.length), cur: 0, alive: tids.slice(), entrants: tids.slice(), winner: null, runner: null, earn: 0 };
  G.cups[id] = c;
  if (tids.length >= 2) drawCupRound(c);
  return c;
}

// Žreb kola. Slovak Classic: v prvých kolách hrajú kluby so súpermi podobnej sily.
function drawCupRound(c) {
  let alive = c.alive.slice();
  const n = alive.length, r = c.rounds.length;
  const str = id => teamRating(G.teams[id]);
  let P = 1;
  while (P * 2 <= n) P *= 2;
  if (P < n) {
    // predkolo: najsilnejší majú voľný žreb
    alive.sort((a, b) => str(b) - str(a));
    const play = 2 * (n - P);
    c.byes[r] = alive.slice(0, n - play);
    alive = alive.slice(n - play);
  }
  const pairs = [];
  if (cupDef(c).tier && n > 32) {
    const chunk = n > 64 ? 8 : 16;
    const sorted = alive.map(id => [id, str(id) + U.gauss() * 2.5]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
    for (let i = 0; i < sorted.length; i += chunk) {
      const ch = U.shuffle(sorted.slice(i, i + chunk));
      for (let j = 0; j + 1 < ch.length; j += 2) pairs.push([ch[j], ch[j + 1]]);
    }
  } else {
    const sh = c.id === 'sup' ? alive : U.shuffle(alive);
    for (let i = 0; i + 1 < sh.length; i += 2) pairs.push([sh[i], sh[i + 1]]);
  }
  const final = pairs.length === 1 && !(c.byes[r] || []).length;
  c.rounds.push(pairs.map(([h, a]) => {
    if (c.id !== 'sup') {
      const lh = G.teams[h].lvl, la = G.teams[a].lvl;
      if (la > lh || (la === lh && U.chance(0.5))) [h, a] = [a, h];
    }
    return { h, a, hg: null, ag: null, pen: null, w: null, neutral: final && !!cupDef(c).neutralFinal };
  }));
}

// ── Prémie ──────────────────────────────────────────────────────
// počet klubov, ktoré hrajú dané kolo (bez voľného žrebu)
function cupRoundTeams(c, r) {
  const N = c.entrants.length;
  let P = 1;
  while (P * 2 <= N) P *= 2;
  if (P < N) return r === 0 ? 2 * (N - P) : P / Math.pow(2, r - 1);
  return P / Math.pow(2, r);
}
function cupPrize(c, r) {
  const n = cupRoundTeams(c, r);
  if (c.id === 'cls') return CLS_PRIZE[n] || 2000;
  if (c.grp === 'reg') return REG_PRIZE[n] || 400;
  if (c.id === 'sup') return 40000;
  return U.nice(LEVEL_INFO[1].income * 0.15 * Math.pow(1.8, r)) + (n === 2 ? 150000 : 0);
}
// bonus za vyradenie klubu z vyššej ligy (len Slovak Classic)
function cupScalpBonus(c, r, winner, loser) {
  if (c.id !== 'cls') return 0;
  const d = G.teams[winner].lvl - G.teams[loser].lvl;
  return d > 0 ? U.nice(cupPrize(c, r) * 0.5 * Math.min(4, d)) : 0;
}
function payCup(c, tid, amt) {
  if (!amt) return;
  if (tid === G.userTid) { book('prize', amt); c.earn = (c.earn || 0) + amt; }
  else G.teams[tid].budget += amt;
}

// Ukončí kolo pohára po odohraní všetkých zápasov dňa
function finishCupRound(c, r) {
  const rd = c.rounds[r];
  const uid = G.userTid;
  const wasIn = rd.some(m => m.h === uid || m.a === uid);
  for (const m of rd) {
    const los = m.w === m.h ? m.a : m.h;
    payCup(c, m.w, cupPrize(c, r) + cupScalpBonus(c, r, m.w, los));
  }
  c.alive = [...(c.byes[r] || []), ...rd.map(m => m.w)];
  c.cur++;
  if (wasIn && !c.alive.includes(uid)) news(`Koniec v súťaži ${c.name}: ${userTeam().name} vypadol (${cupRoundName(c, r)}).`, 'bad');
  if (c.alive.length === 1) {
    c.winner = c.alive[0];
    const fm = rd[rd.length - 1];
    c.runner = fm.w === fm.h ? fm.a : fm.h;
    news(`${G.teams[c.winner].name} vyhral ${c.id === 'sup' ? 'Superpohár' : c.name}!`, c.winner === uid ? 'good' : 'info');
  } else drawCupRound(c);
}

// Kam sa klub dostal (pre históriu a súhrn sezóny)
function cupReach(c, tid) {
  if (!c || !c.entrants.includes(tid)) return '—';
  if (c.winner === tid) return 'Víťaz';
  for (let i = 0; i < c.rounds.length; i++) {
    const m = c.rounds[i].find(m => m.h === tid || m.a === tid);
    if (m && m.w != null && m.w !== tid) return cupRoundName(c, i);
  }
  return c.alive.includes(tid) ? 'v hre' : '—';
}
function cupUserMatch(c, r) { return (c.rounds[r] || []).find(m => m.h === G.userTid || m.a === G.userTid) || null; }
function cupOfMatch(x) { return (x && x.ck && G.cups && G.cups[x.ck]) || (G.cups && G.cups.sp) || null; }
function cupLabel(c, r) { return `${c.name}${c.id === 'sup' ? '' : ' · ' + cupRoundName(c, r)}`; }
// koľko klubov z každej ligy je ešte v hre
function cupAliveByLvl(c) {
  const o = {};
  for (const id of c.alive) { const l = G.teams[id].lvl; o[l] = (o[l] || 0) + 1; }
  return o;
}
