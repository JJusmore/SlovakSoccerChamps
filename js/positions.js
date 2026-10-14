'use strict';
// ─── Presné posty hráčov (stopér, krajný obranca, krídlo…) a vhodnosť hráča na post v zostave ───

const DP_LIST = ['B', 'SO', 'ĽO', 'PO', 'DZ', 'SZ', 'OZ', 'ĽZ', 'PZ', 'ĽK', 'PK', 'ÚT'];
const DP_BROAD = { B: 'GK', SO: 'DF', 'ĽO': 'DF', PO: 'DF', DZ: 'MF', SZ: 'MF', OZ: 'MF', 'ĽZ': 'MF', PZ: 'MF', 'ĽK': 'FW', PK: 'FW', 'ÚT': 'FW' };
const DP_NAME = { B: 'Brankár', SO: 'Stredný obranca', 'ĽO': 'Ľavý obranca', PO: 'Pravý obranca', DZ: 'Defenzívny záložník', SZ: 'Stredný záložník', OZ: 'Ofenzívny záložník', 'ĽZ': 'Ľavý záložník', PZ: 'Pravý záložník', 'ĽK': 'Ľavé krídlo', PK: 'Pravé krídlo', 'ÚT': 'Hrotový útočník' };
// kódy v dátach súpisiek → slovenské skratky
const DP_CODE = { GK: 'B', CB: 'SO', LB: 'ĽO', RB: 'PO', LWB: 'ĽO', RWB: 'PO', DM: 'DZ', CM: 'SZ', AM: 'OZ', LM: 'ĽZ', RM: 'PZ', LW: 'ĽK', RW: 'PK', ST: 'ÚT', CF: 'ÚT', SS: 'OZ' };
const DP_ROLE = { SO: 'DFc', 'ĽO': 'DFw', PO: 'DFw', DZ: 'MFd', SZ: 'MFc', OZ: 'MFa', 'ĽZ': 'MFw', PZ: 'MFw', 'ĽK': 'FWw', PK: 'FWw', 'ÚT': 'FWc' };

// post v zostave podľa polohy na ihrisku
function slotDP(slot) {
  const [pos, fx, fy] = slot;
  if (pos === 'GK') return 'B';
  if (pos === 'DF') return fy < 0.2 ? 'ĽO' : fy > 0.8 ? 'PO' : 'SO';
  if (pos === 'MF') { if (fy < 0.25) return 'ĽZ'; if (fy > 0.75) return 'PZ'; return fx < 0.37 ? 'DZ' : fx > 0.52 ? 'OZ' : 'SZ'; }
  return fy < 0.3 ? 'ĽK' : fy > 0.7 ? 'PK' : 'ÚT';
}
// príbuzné posty (koľko sily hráč zachová)
const DP_NEAR = {
  SO: { DZ: 0.88, 'ĽO': 0.9, PO: 0.9 },
  'ĽO': { PO: 0.92, 'ĽZ': 0.93, SO: 0.88, 'ĽK': 0.85, DZ: 0.8 },
  PO: { 'ĽO': 0.92, PZ: 0.93, SO: 0.88, PK: 0.85, DZ: 0.8 },
  DZ: { SZ: 0.96, SO: 0.88, OZ: 0.88 },
  SZ: { DZ: 0.96, OZ: 0.95, 'ĽZ': 0.9, PZ: 0.9 },
  OZ: { SZ: 0.95, 'ÚT': 0.92, 'ĽK': 0.92, PK: 0.92, DZ: 0.86, 'ĽZ': 0.9, PZ: 0.9 },
  'ĽZ': { 'ĽK': 0.96, PZ: 0.92, 'ĽO': 0.9, SZ: 0.9, OZ: 0.9, PK: 0.9 },
  PZ: { PK: 0.96, 'ĽZ': 0.92, PO: 0.9, SZ: 0.9, OZ: 0.9, 'ĽK': 0.9 },
  'ĽK': { 'ĽZ': 0.96, PK: 0.94, 'ÚT': 0.92, OZ: 0.92, PZ: 0.9 },
  PK: { PZ: 0.96, 'ĽK': 0.94, 'ÚT': 0.92, OZ: 0.92, 'ĽZ': 0.9 },
  'ÚT': { OZ: 0.9, 'ĽK': 0.9, PK: 0.9 },
};
function dpFitRaw(dp, dp2, pos2, s) {
  if (dp === s) return 1;
  if (dp2 && dp2.includes(s)) return 0.97;
  const a = DP_BROAD[dp], b = DP_BROAD[s];
  if (a === 'GK' || b === 'GK') return 0.35;
  let v = (DP_NEAR[dp] && DP_NEAR[dp][s]) || (a === b ? 0.88 : Math.abs(POS_ORDER[a] - POS_ORDER[b]) === 1 ? 0.78 : 0.65);
  if (pos2 && pos2.includes(b)) v = Math.max(v, 0.92);
  return v;
}
function dpOf(p) { if (!p.dp) assignDP(p); return p.dp; }
function dpFit(p, s) { return dpFitRaw(dpOf(p), p.dp2, p.pos2, s); }
const dpLabel = p => dpOf(p);
function dpBadge(p) { const d = dpOf(p), b = DP_BROAD[d]; return `<span class="pos pos-${b} dpb" title="${DP_NAME[d]}${p.dp2 && p.dp2.length ? ' · aj ' + p.dp2.join(', ') : ''}">${POS_ICON[b]}<b>${d}</b></span>`; }

// ── Odvodenie postu (pre hráčov bez presného postu v dátach) ───
// [vhodnosť podľa atribútov] – A = [rýchlosť, streľba, prihrávky, technika, obrana, fyzička]
const DP_QUOTA = { DF: { SO: 0.5, FB: 0.5 }, MF: { DZ: 0.2, SZ: 0.3, OZ: 0.15, W: 0.35 }, FW: { 'ÚT': 0.55, W: 0.45 } };
function dpScores(p) {
  const A = playerAttrs(p), st = archName(p);
  const bonus = (names, v) => (names.includes(st) ? v : 0);
  if (p.pos === 'DF') return { SO: A[4] + A[5] * 0.8 - A[0] * 0.3 + bonus(['Tank', 'Ničiteľ'], 8), FB: A[0] * 0.8 + A[2] * 0.4 + A[3] * 0.3 - A[5] * 0.2 + bonus(['Ofenzívny krajný'], 10) + bonus(['Rýchly obranca'], 4) };
  if (p.pos === 'MF') return { DZ: A[4] + A[5] * 0.6 + bonus(['Ničiteľ'], 10), SZ: A[2] + A[5] * 0.3 + bonus(['Box-to-box', 'Tiki-taka', 'Dlhé lopty'], 6), OZ: A[3] + A[1] * 0.6 + A[2] * 0.4 - 30 + bonus(['Kreatívec'], 10), W: A[0] + A[3] * 0.7 - 10 + bonus(['Kľučkár'], 10) };
  return { 'ÚT': A[1] + A[5] * 0.5 + bonus(['Lovec gólov', 'Tank', 'Falošná deviatka'], 8), W: A[0] + A[3] - 40 + bonus(['Šprintér', 'Kľučkár'], 8) };
}
// strana: najprv tam, kde je menej hráčov, pri rovnosti podľa silnejšej nohy
function sideFor(p, mates, left, right) {
  const nl = mates.filter(m => m.dp === left).length, nr = mates.filter(m => m.dp === right).length;
  if (nl !== nr) return nl < nr ? left : right;
  return p.ft === 'R' ? right : left;
}
const groupDP = (g, p, mates) => (g === 'FB' ? sideFor(p, mates, 'ĽO', 'PO') : g === 'W' ? (p.pos === 'MF' ? sideFor(p, mates, 'ĽZ', 'PZ') : sideFor(p, mates, 'ĽK', 'PK')) : g);
const dpGroup = d => (d === 'ĽO' || d === 'PO' ? 'FB' : d === 'ĽZ' || d === 'PZ' || d === 'ĽK' || d === 'PK' ? 'W' : d);
// jeden hráč – podľa atribútov a toho, čo tímu chýba
function assignDP(p) {
  if (p.pos === 'GK') { p.dp = 'B'; return; }
  const t = p.tid >= 0 ? G.teams[p.tid] : null;
  const mates = t ? teamPlayers(t).filter(m => m !== p && m.pos === p.pos && m.dp) : [];
  const Q = DP_QUOTA[p.pos], sc = dpScores(p), n = mates.length + 1;
  let best = null, bv = -1e9;
  for (const g in Q) {
    const have = mates.filter(m => dpGroup(m.dp) === g).length;
    const v = sc[g] - 14 * Math.max(0, have + 1 - Q[g] * n);
    if (v > bv) { bv = v; best = g; }
  }
  p.dp = groupDP(best, p, mates);
}
// celý káder naraz (pri tvorbe sveta) – rozdelí posty podľa kvót
function assignTeamDPs(t) {
  for (const pos of ['DF', 'MF', 'FW']) {
    const ps = teamPlayers(t).filter(p => p.pos === pos && !p.dp);
    if (!ps.length) continue;
    const fixed = teamPlayers(t).filter(p => p.pos === pos && p.dp), Q = DP_QUOTA[pos], n = ps.length + fixed.length;
    const left = {};
    for (const g in Q) left[g] = Math.max(0, Math.round(Q[g] * n) - fixed.filter(m => dpGroup(m.dp) === g).length);
    const pairs = [];
    for (const p of ps) { const sc = dpScores(p); for (const g in Q) pairs.push([sc[g] + U.gauss() * 2, p, g]); }
    pairs.sort((a, b) => b[0] - a[0]);
    const done = new Set();
    for (const [, p, g] of pairs) {
      if (done.has(p) || left[g] <= 0) continue;
      p.dp = groupDP(g, p, teamPlayers(t).filter(m => m.pos === pos && m.dp)); left[g]--; done.add(p);
    }
    for (const p of ps) if (!p.dp) assignDP(p);
  }
  for (const p of teamPlayers(t)) if (p.pos === 'GK') p.dp = 'B';
}
// AI: formácia, ktorá najlepšie sedí kádru – priemerná sila zostavy na presných postoch + obľúbenosť formácie
const FORM_PREF = { '4-3-3': 0.7, '4-2-3-1': 0.7, '4-4-2': 0.35, '4-1-4-1': 0.3, '3-5-2': 0.15, '3-4-3': 0.1, '4-5-1': 0, '5-3-2': -0.25, '5-4-1': -0.7 };
function formFit(t, f) {
  const s = FORMATIONS[f], lu = bestLineup(t, f);
  return lu.reduce((a, id, i) => a + (G.players[id] ? effR(G.players[id], s[i][0], s[i]) : 0), 0) / 11;
}
function aiPickForm(t) {
  let best = t.form, bv = -1e9;
  for (const f of Object.keys(FORMATIONS)) {
    const v = formFit(t, f) + (FORM_PREF[f] || 0) + (f === t.form ? 0.3 : 0);
    if (v > bv) { bv = v; best = f; }
  }
  t.form = best;
  autoLineup(t);
}
