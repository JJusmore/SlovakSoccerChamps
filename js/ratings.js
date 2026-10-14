'use strict';
// ─── Hodnotenia výkonov (1 – 10) a zranenia ───

// [názov, váha, min. dní, max. dní] – dni = hracie dni
const INJ_TYPES = [
  ['Pomliaždenina', 34, 1, 2],
  ['Natiahnutý sval', 25, 2, 4],
  ['Podvrtnutý členok', 15, 3, 6],
  ['Natrhnutý sval', 12, 5, 9],
  ['Zranenie kolena', 8.5, 8, 14],
  ['Zlomenina', 4, 14, 24],
  ['Pretrhnuté väzy', 1.5, 28, 45],
  ['Choroba', 0, 2, 5],
  ['Osobné voľno', 0, 2, 3],
];
const INJ_REAL = INJ_TYPES.slice(0, 7);
const injured = p => !!(p && p.inj && p.inj.d > 0);
const injName = p => INJ_TYPES[p.inj.k][0];
const dniTxt = d => `${d} ${d === 1 ? 'deň' : d <= 4 ? 'dni' : 'dní'}`;
function injTag(p) { return injured(p) ? `<i class="bd inj" title="${U.esc(injName(p))} – ešte ${dniTxt(p.inj.d)}">🚑 ${p.inj.d}</i>` : ''; }

// zranenia sa vylosujú pred zápasom (ako karty) – [{ min, side, pid, k, d }]
function genInjuries(home, away) {
  const out = [];
  [home, away].forEach((t, side) => {
    const opp = side ? home : away;
    const oa = (opp.lineup || []).map(id => G.players[id]).filter(Boolean);
    const oppAgg = oa.length ? U.avg(oa.map(p => p.agg ?? 40)) : 40;
    const fz = t.id === G.userTid && G.biz ? G.biz.fac : {};
    for (const id of t.lineup || []) {
      const p = G.players[id];
      if (!p) continue;
      let ch = trInjF(t) * 0.0105 * (p.fit < 50 ? 2.4 : p.fit < 70 ? 1.6 : 1) * [0.9, 1, 1.2][t.press ?? 1] * (0.8 + oppAgg / 200) * (p.age >= 31 ? 1.3 : 1) * (1 - 0.12 * (fz.medical || 0));
      if (p.pos === 'GK') ch *= 0.4;
      if (!U.chance(ch)) continue;
      const ty = U.weighted(INJ_REAL, x => x[1]);
      let d = U.ri(ty[2], ty[3]);
      if (fz.medical) d = Math.max(1, Math.round(d * (1 - 0.1 * fz.medical)));
      out.push({ min: U.ri(3, 88), side, pid: id, k: INJ_TYPES.indexOf(ty), d });
    }
  });
  return out.sort((a, b) => a.min - b.min);
}

function applyInjuries(list) {
  for (const e of list || []) {
    const p = G.players[e.pid];
    if (!p) continue;
    if (!injured(p) || p.inj.d < e.d) p.inj = { k: e.k, d: e.d };
    if (p.tid !== G.userTid) continue;
    news(`🚑 ${pFull(p)}: ${INJ_TYPES[e.k][0].toLowerCase()} – mimo ${dniTxt(e.d)}.`, 'bad');
    if (e.d >= 10) inboxAdd({ type: 'info', text: `🚑 ${pFull(p)} má vážne zranenie (${INJ_TYPES[e.k][0].toLowerCase()}) – vynechá ${dniTxt(e.d)}.` });
  }
}

// každý hrací deň sa zranenia hoja (regeneračné centrum zrýchľuje)
function healDay() {
  const rc = (G.biz && G.biz.fac ? G.biz.fac.recov || 0 : 0) + (G.userTid >= 0 && staff().doc ? staff().doc.q * 0.6 : 0);
  for (const p of G.players) {
    if (!p || !p.inj) continue;
    p.inj.d -= 1 + (p.tid === G.userTid && rc && U.chance(0.12 * rc) ? 1 : 0);
    if (p.inj.d > 0) continue;
    delete p.inj;
    if (p.tid === G.userTid) news(`✅ ${pFull(p)} je po zranení späť.`, 'good');
  }
}

// ── Hodnotenie výkonu: priemer okolo 6,4, zapisuje sa ×10 (68 = 6,8) ──
function rateMatch(res) {
  const out = {}, goals = [res.hg, res.ag];
  const injMin = {}; for (const e of res.inj || []) injMin[e.pid] = e.min;
  for (let side = 0; side < 2; side++) {
    const my = goals[side], op = goals[1 - side];
    const team = (res.lu[side] || []).map(id => G.players[id]).filter(Boolean);
    const avgR = team.length ? U.avg(team.map(p => p.r)) : 50;
    const resB = (my > op ? 0.45 : my === op ? 0.05 : -0.35) + U.clamp(my - op, -4, 4) * 0.08;
    const saves = Math.max(0, (res.shots ? res.shots[1 - side] : op * 3) - op);
    const list = (res.lu[side] || []).map(id => [id, 1]).concat((res.sb && res.sb[side] || []).map(id => [id, 0.55]));
    for (const [id, w] of list) {
      const p = G.players[id];
      if (!p || out[id] != null) continue;
      const pos = p.pos;
      const g = res.ev.filter(e => e.pid === id).length, a = res.ev.filter(e => e.aid === id).length;
      const cs = (res.cards || []).filter(c => c.pid === id);
      let r = 6.3 + resB * w;
      r += g * (pos === 'FW' ? 0.9 : pos === 'MF' ? 1 : 1.2) + (g >= 3 ? 0.3 : 0) + a * 0.55;
      if (cs.some(c => c.c === 'R')) r -= 1.3; else if (cs.length) r -= 0.3;
      if (pos === 'GK') r += (op === 0 ? 0.8 : -0.3 * op) + Math.min(0.7, saves * 0.07);
      else if (pos === 'DF') r += (op === 0 ? 0.55 : 0.1 - 0.12 * op) * w;
      else if (pos === 'MF') r += (op === 0 ? 0.12 : 0) * w;
      else if (!g) r -= 0.25 * w;
      r += (p.r - avgR) / 28 + U.gauss() * 0.4;
      if (injMin[id] != null) r = 6.3 + (r - 6.3) * U.clamp(injMin[id] / 90, 0.3, 1);
      out[id] = Math.round(U.clamp(r, 3, 10) * 10);
    }
  }
  return out;
}
// zapíše hodnotenia do sezónnych štatistík a formy (posledných 5 zápasov)
function applyRatings(rt) {
  for (const id in rt) {
    const p = G.players[id];
    if (!p) continue;
    p.s.rt = (p.s.rt || 0) + rt[id]; p.s.rn = (p.s.rn || 0) + 1;
    p.lr = (p.lr || []).concat(rt[id]).slice(-5);
  }
}
function momOf(rt) { let best = null, bv = -1; for (const id in rt) if (rt[id] > bv) { bv = rt[id]; best = +id; } return best; }
const avgRt = s => (s && s.rn ? s.rt / s.rn : 0);
const rtFmt = v => (v ? (v / 10).toFixed(1).replace('.', ',') : '–');
const rtCls = v => (!v ? '' : v >= 80 ? 'r8' : v >= 70 ? 'r7' : v >= 62 ? 'r6' : v >= 55 ? 'r5' : 'r4');
const rtPill = v => `<b class="rtp ${rtCls(v)}">${rtFmt(v)}</b>`;

// koniec sezóny: riadok do histórie hráča [rok, klub, z, g, a, Ø×10, žlté, červené]
function pushSeasonHistory(p) {
  if (!p.s.gp && p.tid !== G.userTid) return;
  (p.sh = p.sh || []).push([G.year, p.tid, p.s.gp, p.s.g, p.s.a, Math.round(avgRt(p.s)), p.s.yc || 0, p.s.rc || 0]);
  if (p.sh.length > 10) p.sh.shift();
}
