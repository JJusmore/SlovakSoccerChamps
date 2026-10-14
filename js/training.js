'use strict';
// ─── Tréning: týždenný plán (5 tréningov), záťaž, zohratosť, tímové perky, individuálny tréning, realizačný tím ───

// [ikona, názov, záťaž, body do perku, popis]
const TR_SESS = {
  tac: ['🧠', 'Taktika', 2, 'tac', 'zohratosť'],
  att: ['⚽', 'Útok', 3, 'att', 'zakončenie, viac šancí'],
  def: ['🛡️', 'Obrana', 3, 'def', 'menej šancí súpera'],
  tec: ['🎯', 'Technika', 2, 'tec', 'rýchlejší rozvoj'],
  fit: ['🏃', 'Kondícia', 3, 'fit', 'vytrvalosť, menej zranení'],
  sp: ['🌀', 'Štandardky', 1, 'sp', 'rohy a priame kopy'],
  rec: ['🧊', 'Regenerácia', -2, null, '+kondícia'],
  off: ['🏖️', 'Voľno', -3, null, '+kondícia, +morálka'],
};
const TR_DAYS = ['Po', 'Ut', 'St', 'Št', 'Pi'];
const TR_INT = ['Nízka', 'Normálna', 'Vysoká'];
const INT_F = [0.75, 1, 1.25];
// tímové perky – body z tréningov počas sezóny (po sezóne polovica ostáva)
const TR_PERKS = {
  att: ['⚽', 'Kanonieri', 'viac šancí v zápase'],
  def: ['🧱', 'Betón', 'súper má menej šancí'],
  tac: ['🧩', 'Zohratý stroj', 'zohratosť rastie rýchlejšie a pomalšie klesá'],
  tec: ['🎯', 'Technická škola', 'hráči sa rýchlejšie zlepšujú'],
  fit: ['🫁', 'Železné pľúca', 'menej únavy a zranení'],
  sp: ['🌀', 'Majstri štandardiek', 'viac gólov zo štandardiek'],
};
const PERK_T = [120, 260, 420];
const PERK_LV = ['', 'bronz', 'striebro', 'zlato'];

function trn() {
  const u = userTeam();
  if (!G.trn || G.trn.tid !== u.id) G.trn = { tid: u.id };
  const t = G.trn;
  if (!t.plan) t.plan = ['tac', 'att', 'def', 'tec', 'rec'];
  if (t.int == null) t.int = 1;
  if (!t.pts) t.pts = { att: 0, def: 0, tac: 0, tec: 0, fit: 0, sp: 0 };
  if (t.coh == null) { t.coh = 45; t.form = u.form; t.style = tacOf(u).s; }
  if (t.year !== G.year) { if (t.year != null) for (const k in t.pts) t.pts[k] = Math.round(t.pts[k] * 0.5); t.sum = 0; t.n = 0; t.year = G.year; }
  return t;
}
const trCount = k => trn().plan.filter(x => x === k).length;
const trInt = () => trn().int;
function trLoad() { const t = trn(); return Math.max(0, Math.round(t.plan.reduce((a, k) => a + TR_SESS[k][2], 0) * INT_F[t.int] * 10) / 10); }
const LOAD_LO = 5, LOAD_HI = 11;
function loadZone() { const L = trLoad(); return L > LOAD_HI + 2 ? 'vhi' : L > LOAD_HI ? 'hi' : L < LOAD_LO ? 'lo' : 'ok'; }
function perkLv(k) { const v = trn().pts[k] || 0; return PERK_T.filter(x => v >= x).length; }
const isMe = t => t && t.id === G.userTid;

// ── Vplyv na rozvoj a zápas ───────────────────────────────────
function trDayF() {
  const t = trn(), st = staff(), L = trLoad();
  const work = t.plan.filter(k => TR_SESS[k][3]).length;
  let f = 0.8 + 0.07 * trCount('tec') + 0.03 * (work - trCount('tec'));
  f *= [0.85, 1, 1.15][t.int] * (L < LOAD_LO ? 0.88 : L > LOAD_HI + 2 ? 0.94 : 1) * (1 + 0.04 * perkLv('tec'));
  return f * (1 + 0.04 * ((st.ast ? st.ast.q : 0) + (st.fit ? st.fit.q : 0)) / 2);
}
function trDevF() { const t = trn(); return t.n ? t.sum / t.n : 1; }
function trFitDay() {
  const st = staff(), L = trLoad();
  return 2 * trCount('rec') + 1.5 * trCount('off') - 1.6 * Math.max(0, L - LOAD_HI) + (L < LOAD_LO ? 2 : 0) + (st.fit ? st.fit.q * 0.6 : 0);
}
function trInjF(t) {
  if (!isMe(t)) return 1;
  const st = staff(), L = trLoad();
  return (1 + 0.1 * Math.max(0, L - LOAD_HI)) * (1 - 0.04 * trCount('fit')) * (1 - 0.07 * perkLv('fit')) * (1 - 0.07 * (st.doc ? st.doc.q : 0));
}
const trAttF = t => (isMe(t) ? 1 + 0.02 * perkLv('att') + 0.006 * trCount('att') : 1);
const trDefF = t => (isMe(t) ? 1 - 0.02 * perkLv('def') - 0.006 * trCount('def') : 1);
const trSpF = t => (isMe(t) ? 1 + 0.1 * perkLv('sp') + 0.03 * trCount('sp') : 1);
const trTireF = t => (isMe(t) ? 1 - 0.06 * perkLv('fit') - 0.02 * trCount('fit') : 1);
const cohF = t => (isMe(t) ? 0.95 + 0.1 * trn().coh / 100 : 1);

// zmena formácie alebo štýlu zníži zohratosť
function cohCheck() {
  const t = trn(), u = userTeam(), s = tacOf(u).s;
  if (t.form !== u.form) { t.coh = Math.max(0, t.coh - 22); t.form = u.form; }
  if (t.style !== s) { t.coh = Math.max(0, t.coh - 10); t.style = s; }
}
function trWeek() {
  const t = trn(), u = userTeam(), L = trLoad(), mult = INT_F[t.int] * (1 + 0.05 * (staff().ast ? staff().ast.q : 0));
  cohCheck();
  for (const k of t.plan) { const pk = TR_SESS[k][3]; if (pk) t.pts[pk] = (t.pts[pk] || 0) + 3 * mult * (L > LOAD_HI + 2 ? 0.8 : 1); }
  t.coh = U.clamp(t.coh + trCount('tac') * 2.6 * INT_F[t.int] - (2.2 - 0.5 * perkLv('tac')), 0, 100);
  if (L > LOAD_HI + 2) for (const p of teamPlayers(u)) addMor(p, -1);
  if (trCount('off') >= 2) for (const p of teamPlayers(u)) addMor(p, 1);
}

// ── Individuálny tréning ───────────────────────────────────────
const IT_KINDS = { pos: 'Nová pozícia', wf: 'Slabšia noha', sk: 'Triky', attr: 'Atribút', trait: 'Špecialita' };
function itSlots() { const st = staff(); return 2 + (st.ast ? Math.ceil(st.ast.q / 2) : 0); }
function itPlayers() { return teamPlayers(userTeam()).filter(p => p.it); }
// požiadavka na špecialitu: súvisiaci atribút 60 / 70 / 80
function traitReq(p, k, lv) {
  const T = TRAITS[k];
  if (k === 'ldr') return p.age >= 25 + lv;
  if (T.attr < 0) return true;
  return playerAttrs(p)[T.attr] >= [0, 60, 70, 80][lv];
}
function itOptions(p) {
  const out = [];
  for (const d of DP_LIST) if (d !== 'B' && p.pos !== 'GK' && d !== dpOf(p) && !(p.dp2 || []).includes(d) && (p.dp2 || []).length < 2 && dpFit(p, d) >= 0.85) out.push(['pos', d, `Nový post: ${DP_NAME[d]}`]);
  if (p.pos !== 'GK' && (p.wf || 3) < 5) out.push(['wf', 0, `Slabšia noha (${p.wf || 3} → ${(p.wf || 3) + 1} ★)`]);
  if (p.pos !== 'GK' && (p.sk || 2) < 5) out.push(['sk', 0, `Triky (${p.sk || 2} → ${(p.sk || 2) + 1} ★)`]);
  attrNames(p, true).forEach((n, i) => out.push(['attr', i, `${n} +3`]));
  for (const k in TRAITS) {
    if (!TRAITS[k].pos.includes(p.pos)) continue;
    const lv = trLvl(p, k) + 1, have = Object.keys(p.tr || {}).filter(x => p.tr[x]).length;
    if (lv > 3 || (lv === 1 && have >= 3) || !traitReq(p, k, lv)) continue;
    out.push(['trait', k, `${TRAITS[k].ic} ${TRAITS[k].n} – ${PERK_LV[lv]}`]);
  }
  return out;
}
function setIt(p, k, v) {
  if (!k) { p.it = null; return null; }
  if (!p.it && itPlayers().length >= itSlots()) return `Individuálne môžeš trénovať najviac ${itSlots()} hráčov.`;
  p.it = { k, v, prog: 0 };
  return null;
}
function itLabel(p) {
  if (!p.it) return '';
  const { k, v } = p.it;
  return k === 'pos' ? `Nový post: ${DP_NAME[v]}` : k === 'attr' ? `${attrNames(p, true)[v]} +3` : k === 'trait' ? `${TRAITS[v].n} – ${PERK_LV[trLvl(p, v) + 1]}` : IT_KINDS[k];
}
function itNeed(p) {
  const { k, v } = p.it;
  if (k === 'pos') return 45;
  if (k === 'wf') return 30 + 9 * (p.wf || 3);
  if (k === 'sk') return 30 + 9 * (p.sk || 2);
  if (k === 'attr') return Math.round(28 + Math.max(0, playerAttrs(p)[v] - 50) * 0.6);
  return [0, 45, 75, 110][trLvl(p, v) + 1] || 110;
}
const itChance = p => (p.it && p.it.k === 'trait' ? Math.min(0.92, 0.65 + 0.05 * (staff().ast ? staff().ast.q : 0)) : 1);
function itDay() {
  const st = staff(), t = trn();
  for (const p of itPlayers()) {
    if (injured(p)) continue;
    const ageF = p.age <= 21 ? 1.3 : p.age <= 26 ? 1 : p.age <= 30 ? 0.75 : 0.5;
    p.it.prog += ageF * [0.8, 1, 1.2][t.int] * (1 + 0.08 * (st.ast ? st.ast.q : 0)) * (trCount('tec') >= 2 ? 1.1 : 1);
    p.fit = Math.max(25, p.fit - 1);
    if (p.it.prog < itNeed(p)) continue;
    const { k, v } = p.it, lbl = itLabel(p) || IT_KINDS[k];
    if (k === 'trait' && !U.chance(itChance(p))) { p.it.prog = Math.round(itNeed(p) * 0.5); news(`🎯 ${pFull(p)}: tréning špeciality zatiaľ nevyšiel – pokračuje.`, 'bad'); continue; }
    if (k === 'pos') p.dp2 = [...(p.dp2 || []), v].slice(0, 2);
    else if (k === 'wf') p.wf = Math.min(5, (p.wf || 3) + 1);
    else if (k === 'sk') p.sk = Math.min(5, (p.sk || 2) + 1);
    else if (k === 'attr') { if (!p.ao) assignAttrs(p); p.ao[v] += 3; }
    else if (k === 'trait') { p.tr = p.tr || {}; p.tr[v] = trLvl(p, v) + 1; }
    news(`🎯 ${pFull(p)} dokončil individuálny tréning: ${lbl}.`, 'good');
    p.it = null;
  }
}

// ── Realizačný tím ─────────────────────────────────────────────
const STAFF_ROLES = [['ast', '🧑‍💼', 'Asistent trénera', 1.2], ['gk', '🧤', 'Tréner brankárov', 0.8], ['fit', '💪', 'Kondičný tréner', 0.9], ['doc', '🩺', 'Lekár', 1]];
const STAFF_FX = { ast: 'Tréning, analýza súpera, chémia, viac individuálnych tréningov', gk: 'Vývoj a výkon brankárov', fit: 'Kondícia a rýchlejší oddych', doc: 'Menej zranení a rýchlejšie liečenie' };
function staffWage(role, q) { const f = STAFF_ROLES.find(r => r[0] === role)[3]; return U.nice(SCOUT_BASE[userTeam().lvl] * Math.pow(q, 1.4) * f); }
function genStaff(role, q) { const nm = genName(false); return { role, n: `${nm.fn} ${nm.ln}`, q, w: staffWage(role, q), id: U.ri(1, 1e9) }; }
function staff() {
  if (!G.staff || G.staff.tid !== G.userTid) {
    G.staff = { tid: G.userTid, ast: genStaff('ast', 1), gk: null, fit: null, doc: null, pool: null, poolY: -1 };
  }
  return G.staff;
}
function staffPool() {
  const s = staff();
  if (!s.pool || s.poolY !== G.year) { s.pool = STAFF_ROLES.flatMap(([r]) => [U.ri(1, 2), U.ri(2, 4), U.ri(3, 5)].map(q => genStaff(r, q))); s.poolY = G.year; }
  return s.pool;
}
function staffWeekly() { const s = staff(); return STAFF_ROLES.reduce((a, [r]) => a + (s[r] ? s[r].w : 0), 0); }
function hireStaff(id) {
  const s = staff(), c = staffPool().find(x => x.id === id);
  if (!c) return 'Kandidát už nie je k dispozícii.';
  const cur = s[c.role];
  const pay = cur ? U.nice(cur.w * 4) : 0, sign = U.nice(c.w * 2);
  if (userTeam().budget < pay + sign) return 'Nemáš dosť peňazí.';
  if (pay) book('staff', -pay);
  book('staff', -sign);
  s[c.role] = c; s.pool = s.pool.filter(x => x.id !== id);
  news(`👔 Nový člen realizačného tímu: ${c.n} (${STAFF_ROLES.find(r => r[0] === c.role)[2]}, ${'★'.repeat(c.q)}).`, 'good');
  return null;
}
function fireStaff(role) {
  const s = staff(), cur = s[role];
  if (!cur) return null;
  book('staff', -U.nice(cur.w * 4));
  s[role] = null;
  return null;
}
const gkCoachF = p => (p.tid === G.userTid && staff().gk ? 1 + 0.012 * staff().gk.q : 1);

// ── Denné napojenie ────────────────────────────────────────────
function trainingDay(ev) {
  if (G.userTid < 0) return;
  const t = trn(), f = trDayF(), fd = trFitDay();
  t.sum += f; t.n++;
  trWeek();
  if (fd) for (const p of teamPlayers(userTeam())) p.fit = U.clamp(Math.round(p.fit + fd), 25, 100);
  itDay();
  if (ev && ev.t === 'L') book('staff', -staffWeekly());
}
