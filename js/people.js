'use strict';
// ─── Ľudia: morálka a rozhovory, sľuby, agenti a klauzuly, chémia a kapitán, reprezentácia ───

// ── Morálka (0 – 100) ──────────────────────────────────────────
const mor = p => (p && p.mor != null ? p.mor : 60);
const MOR_IC = v => (v >= 80 ? ['😀', 'Výborná'] : v >= 62 ? ['🙂', 'Dobrá'] : v >= 45 ? ['😐', 'Priemerná'] : v >= 28 ? ['😕', 'Slabá'] : ['😠', 'Zlá']);
function morTag(p) { const [ic, n] = MOR_IC(mor(p)); return `<i class="mor" title="Morálka: ${n} (${Math.round(mor(p))})">${ic}</i>`; }
function addMor(p, d) { p.mor = U.clamp(mor(p) + d, 0, 100); }
// rola v kádri podľa sily: kľúčový hráč, základ, rotácia, náhradník
function playerRole(p) {
  const t = p.tid >= 0 ? G.teams[p.tid] : null;
  if (!t) return 'res';
  const ps = teamPlayers(t).sort((a, b) => b.r - a.r), i = ps.indexOf(p);
  return i < 3 ? 'key' : i < 11 ? 'start' : i < 16 ? 'rot' : 'res';
}
const ROLE_SK = { key: 'Kľúčový hráč', start: 'Základ', rot: 'Rotácia', res: 'Náhradník' };

function moraleAfterMatch(x, res) {
  const u = userTeam(), home = x.m.h === u.id, side = home ? 0 : 1;
  const my = home ? res.hg : res.ag, op = home ? res.ag : res.hg, rd = my > op ? 1 : my < op ? -1 : 0;
  const xi = new Set(res.lu ? res.lu[side] : u.lineup), sb = new Set(res.sb ? res.sb[side] : []);
  for (const p of teamPlayers(u)) {
    if (p.acad) continue;
    let d = rd;
    if (xi.has(p.id)) d += 2 + rd + (res.rt && res.rt[p.id] ? (res.rt[p.id] - 65) / 6 : 0);
    else if (sb.has(p.id)) d += 1;
    else if (!injured(p) && !(p.ban > 0)) { const r = playerRole(p); d += (r === 'key' ? -4 : r === 'start' ? -3 : r === 'rot' ? -1 : 0) * (p.age <= 20 ? 0.5 : 1); }
    addMor(p, d);
    // sľub o minútach
    if (p.prom) {
      p.prom.left--; if (xi.has(p.id)) p.prom.ok++;
      if (p.prom.left <= 0) {
        if (p.prom.ok >= p.prom.need) { addMor(p, 10); news(`🤝 ${pFull(p)} je spokojný – sľub si dodržal.`, 'good'); }
        else { addMor(p, -25); p.wo = true; inboxAdd({ type: 'info', text: `😠 ${pFull(p)} je nahnevaný – sľúbil si mu viac zápasov v základe. Chce odísť.` }); }
        p.prom = null;
      }
    }
    if (mor(p) < 25 && !p.wo) { p.wo = true; p.woMor = true; inboxAdd({ type: 'info', text: `😠 ${pFull(p)} je nespokojný a žiada prestup.` }); }
    else if (p.woMor && mor(p) >= 55) { p.wo = false; p.woMor = false; }
  }
}
// pomaly sa vracia k normálu
function moraleDay() {
  for (const p of teamPlayers(userTeam())) { const m = mor(p); if (m > 62) p.mor = m - 0.4; else if (m < 58) p.mor = m + 0.4; }
}
// rozhovor s hráčom
const TALKS = [['praise', '👏 Pochváliť'], ['crit', '😤 Kritizovať'], ['prom', '🤝 Sľúbiť viac zápasov'], ['calm', '🧘 Upokojiť']];
function talkAvail(p) {
  const out = [];
  if (p.tid !== G.userTid) return out;
  if ((p.talkD || -1) > dayKey()) return out;
  out.push('praise', 'crit');
  if (!p.prom && playerRole(p) !== 'key') out.push('prom');
  if (p.wo) out.push('calm');
  return out;
}
function talkPlayer(p, k) {
  const form = (p.lr && p.lr.length) ? U.avg(p.lr) : 64;
  let d = 0, txt;
  if (k === 'praise') { d = form >= 68 ? 8 : form >= 60 ? 3 : -2; txt = d > 2 ? 'Pochvala ho potešila.' : d > 0 ? 'Poďakoval sa.' : 'Myslí si, že pochvala nebola zaslúžená.'; }
  else if (k === 'crit' && p.ego && U.chance(0.7)) { p.ego = 0; d = -3; txt = 'Pochopil, že tím je viac ako on.'; }
  else if (k === 'crit') { if (form >= 66) { d = -10; txt = 'Je urazený – hrá predsa dobre.'; } else if (U.chance(0.55)) { d = 6; txt = 'Kritika ho nakopla, chce sa zlepšiť.'; } else { d = -8; txt = 'Kritiku zobral zle.'; } }
  else if (k === 'prom') { d = 12; p.prom = { left: 8, ok: 0, need: 5 }; txt = 'Sľúbil si mu miesto v základe v 5 z 8 zápasov.'; }
  else if (k === 'calm') {
    if (U.chance(0.3 + mor(p) / 220 + (playerRole(p) === 'key' ? 0.1 : 0))) { p.wo = false; p.woMor = false; d = 10; txt = 'Rozhovor pomohol – zostáva v klube.'; }
    else { d = -5; txt = 'Stále chce odísť.'; }
  }
  addMor(p, d);
  p.talkD = dayKey() + 5;
  return { d, txt };
}

// ── Agenti a klauzuly v zmluvách ───────────────────────────────
const AGENCIES = ['ProFutbal Agency', 'Danube Sports', 'Tatra Management', 'Golden Boot SK', 'Carpathia Sports', 'Elite Talent', 'Váh Football Group', 'Central Europe Stars'];
function agentOf(p) { const h = U.hash('ag' + p.id); return { n: AGENCIES[h % AGENCIES.length], g: 1 + (h >>> 4) % 3 }; }
function agentFee(p, mode, fee, wage) {
  const g = agentOf(p).g;
  if (mode === 'buy') return U.nice(fee * (0.03 + 0.02 * g) + wage * 2);
  if (mode === 'free') return U.nice(wage * (5 + 3 * g));
  return U.nice(wage * (1 + g));
}
// výstupná klauzula (násobok hodnoty) a bonus za gól – hráč za ne zľaví z platu
const REL_OPTS = [[0, 'Bez klauzuly', 1], [2, '2× hodnota', 0.9], [3, '3× hodnota', 0.95], [5, '5× hodnota', 0.98]];
const GB_OPTS = [[0, 'Bez bonusu', 1], [0.5, 'Malý bonus za gól', 0.97], [1.2, 'Veľký bonus za gól', 0.93]];
function clauseF(rel, gb) { return (REL_OPTS.find(o => o[0] === rel) || REL_OPTS[0])[2] * (GB_OPTS.find(o => o[0] === gb) || GB_OPTS[0])[2]; }
// klub aktivuje výstupnú klauzulu – prestup sa nedá odmietnuť
function releaseClauseDay() {
  const u = userTeam();
  if (teamPlayers(u).length <= 17) return;
  for (const p of teamPlayers(u)) {
    if (!p.rel || p.loan || !U.chance(0.035)) continue;
    const buyers = G.teams.filter(t => !isUserSide(t) && t.budget >= p.rel && teamBase(t) >= p.r - 8 && teamBase(t) <= p.r + 3 && teamPlayers(t).length < 28);
    if (!buyers.length) continue;
    const b = U.pick(buyers), fee = p.rel;
    p.rel = 0;
    sellTo(p, b, fee);
    inboxAdd({ type: 'info', text: `📑 ${b.name} aktivoval výstupnú klauzulu – ${pFull(p)} odchádza za ${U.money(fee)}.` });
    return;
  }
}
function goalBonusPay(ev) {
  for (const e of ev) { const p = G.players[e.pid]; if (p && p.tid === G.userTid && p.gb) book('bonus', -p.gb); }
}
// podiel z ďalšieho predaja (sell-on) – kľúčový príjem slovenských klubov
function sellOnCheck(p, from, to, fee) {
  const so = p.sellOn;
  if (!so || !fee || !from || from.id === so.tid || (to && to.id === so.tid)) return;
  const cut = U.nice(fee * so.pct / 100);
  if (so.tid === G.userTid) {
    book('sales', cut);
    inboxAdd({ type: 'info', text: `💶 ${pFull(p)} prestúpil do klubu ${to ? to.name : '—'} za ${U.money(fee)} – tvoj podiel z ďalšieho predaja (${so.pct} %) je ${U.money(cut)}.` });
    news(`💶 Podiel z predaja ${pFull(p)}: +${U.money(cut)}.`, 'good');
  } else if (G.teams[so.tid]) G.teams[so.tid].budget += cut;
  p.sellOn = null;
}

// ── Chémia v kádri a kapitán ───────────────────────────────────
function captainOf(t) {
  const ps = teamPlayers(t).filter(p => !p.acad);
  if (t.cap != null && ps.some(p => p.id === t.cap)) return G.players[t.cap];
  return ps.sort((a, b) => (trLvl(b, 'ldr') * 10 + b.age + b.r / 4) - (trLvl(a, 'ldr') * 10 + a.age + a.r / 4))[0] || null;
}
function natGroups(t) {
  const g = {};
  for (const p of teamPlayers(t)) if (!p.acad) g[p.nat] = (g[p.nat] || 0) + 1;
  return Object.entries(g).sort((a, b) => b[1] - a[1]);
}
function chemParts(t) {
  const ps = teamPlayers(t).filter(p => !p.acad), n = Math.max(1, ps.length);
  const gr = natGroups(t), cap = captainOf(t);
  const parts = [
    ['Spoločný jazyk', Math.round(18 * (gr[0] ? gr[0][1] / n : 0) - 1.2 * Math.max(0, gr.length - 4))],
    ['Nováčikovia', -3 * Math.max(0, ps.filter(p => p.joined === G.year).length - 2)],
    ['Kapitán', cap ? Math.round(trLvl(cap, 'ldr') * 4 + (cap.age >= 28 ? 3 : 0) + (mor(cap) - 60) / 10) : -4],
    ['Morálka', Math.round((U.avg(ps.map(mor)) - 60) / 3)],
  ];
  if (t.id === G.userTid) {
    const c = campChem(); if (c) parts.push(['Sústredenie', c]);
    const e = egoCount(t); if (e) parts.push(['Hviezdne maniere', -3 * e]);
  }
  if (t.id === G.userTid) {
    if (G.trn && G.trn.coh != null) parts.push(['Zohratosť', Math.round((G.trn.coh - 50) / 10)]);
    const st = staff();
    if (st.ast) parts.push(['Asistent trénera', st.ast.q]);
  }
  return parts;
}
function chem(t) {
  if (t.id !== G.userTid) return 60;
  return U.clamp(Math.round(52 + chemParts(t).reduce((a, x) => a + x[1], 0)), 15, 100);
}
const chemF = t => 0.97 + 0.06 * chem(t) / 100;
function moraleF(t) {
  if (t.id !== G.userTid) return 1;
  const xi = (t.lineup || []).map(id => G.players[id]).filter(Boolean);
  return xi.length ? 0.97 + 0.06 * U.avg(xi.map(mor)) / 100 : 1;
}

// ── Reprezentácia Slovenska a U21 ──────────────────────────────
const NT_BREAKS = [6, 13, 23];
const NT_OPP = [['Česko', 74], ['Rakúsko', 76], ['Poľsko', 75], ['Maďarsko', 73], ['Nórsko', 76], ['Slovinsko', 71], ['Wales', 72], ['Island', 68], ['Kazachstan', 62], ['Litva', 60], ['Grécko', 72], ['Belgicko', 82], ['Anglicko', 86], ['Španielsko', 87], ['Holandsko', 83], ['Švédsko', 74], ['Škótsko', 73], ['Gruzínsko', 70], ['Srbsko', 75], ['Chorvátsko', 80]];
function ntBreak() {
  const svk = G.players.filter(p => p && p.nat === 'SVK' && p.tid >= 0 && p.age >= 18 && !injured(p));
  const senior = svk.slice().sort((a, b) => b.r - a.r).slice(0, 23);
  const sIds = new Set(senior.map(p => p.id));
  const u21 = svk.filter(p => p.age <= 21 && !sIds.has(p.id)).sort((a, b) => b.r + (b.pot || 0) / 3 - (a.r + (a.pot || 0) / 3)).slice(0, 20);
  const nt = G.nt || (G.nt = { res: [] });
  const play = (sq, tag, oppAdj) => {
    const r = U.avg(sq.slice().sort((a, b) => b.r - a.r).slice(0, 11).map(p => p.r));
    for (let k = 0; k < 2; k++) {
      const [on, orr] = U.pick(NT_OPP), o = orr + oppAdj;
      const home = U.chance(0.5), lh = 1.25 * Math.exp((r - o) / 12) * (home ? 1.12 : 1), la = 1.25 * Math.exp((o - r) / 12) * (home ? 1 : 1.12);
      const g = U.poisson(lh), ga = U.poisson(la);
      const sc = [];
      for (let i = 0; i < g; i++) { const s = U.weighted(sq, p => ({ FW: 3, MF: 1.4, DF: 0.4, GK: 0 })[p.pos] * p.r); sc.push(s.id); s.ntG = (s.ntG || 0) + 1; }
      nt.res.unshift({ y: seasonTxt(), tag, opp: on, g, ga, home, sc });
    }
  };
  play(senior, 'A', 0); play(u21, 'U21', -14);
  nt.res = nt.res.slice(0, 16);
  nt.sq = senior.map(p => p.id); nt.u21 = u21.map(p => p.id); nt.year = G.year;
  const mine = [], hurt = [];
  for (const [list, a] of [[senior, 1], [u21, 0]]) for (const p of list) {
    if (a) p.caps = (p.caps || 0) + 2; else p.u21 = (p.u21 || 0) + 2;
    p.ntY = G.year; p.fit = Math.max(40, p.fit - (a ? 12 : 8)); p.xp = Math.min(100, (p.xp ?? 30) + 1);
    if (p.tid === G.userTid) { mine.push(pName(p) + (a ? '' : ' (U21)')); addMor(p, 4); }
    if (U.chance(a ? 0.03 : 0.02)) { const k = U.ri(0, 3), d = U.ri(INJ_TYPES[k][2], INJ_TYPES[k][3]); applyInjuries([{ pid: p.id, k, d }]); if (p.tid === G.userTid) hurt.push(pName(p)); }
  }
  const last = nt.res.filter(r => r.tag === 'A').slice(0, 2).map(r => `${r.home ? 'Slovensko – ' + r.opp : r.opp + ' – Slovensko'} ${r.home ? r.g + ':' + r.ga : r.ga + ':' + r.g}`).join(', ');
  news(`🇸🇰 Reprezentácia: ${last}.`);
  if (mine.length) news(`🇸🇰 Nominácia z tvojho klubu: ${mine.join(', ')}.`, 'good');
  if (hurt.length) inboxAdd({ type: 'info', text: `🚑 Z reprezentácie sa vrátil zranený: ${hurt.join(', ')}.` });
}
const isNT = p => p.ntY === G.year;

// ── Denné napojenie ────────────────────────────────────────────
function peopleDay(ev) {
  if (G.userTid < 0) return;
  moraleDay();
  if (windowNow().open) releaseClauseDay();
  if (ev && ev.t === 'L' && NT_BREAKS.includes(ev.r)) ntBreak();
}
