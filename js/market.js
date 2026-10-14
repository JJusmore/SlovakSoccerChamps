'use strict';
// ─── Trh s hráčmi: atribúty, zmluvy, skauting, vyjednávanie, hosťovania, financie, pošta ───

// ── Atribúty ────────────────────────────────────────────────────
const ATTR_OUT = ['RÝC', 'STR', 'PRI', 'TEC', 'OBR', 'FYZ'];
const ATTR_OUT_FULL = ['Rýchlosť', 'Streľba', 'Prihrávky', 'Technika', 'Obrana', 'Fyzička'];
const ATTR_GK = ['REF', 'CHY', 'VÝB', 'NOH', 'POS', 'FYZ'];
const ATTR_GK_FULL = ['Reflexy', 'Chytanie', 'Výbehy', 'Hra nohou', 'Postavenie', 'Fyzička'];
const POS_PROFILE = { GK: [4, 3, 0, -8, 2, 0], DF: [-1, -10, -2, -5, 8, 4], MF: [0, -1, 5, 3, -3, -1], FW: [3, 6, -3, 3, -14, 0] };
// Štýly hry (určujú aj profil atribútov)
const ARCHETYPES = {
  GK: [['Na čiare', [7, 2, -3, -2, 2, -2]], ['Sweeper keeper', [0, 0, 8, 3, 0, 0]], ['Rozohrávajúci brankár', [-2, 0, 2, 9, 0, 0]], ['Istý v rukách', [0, 7, -2, 0, 3, 0]]],
  DF: [['Tank', [-3, -3, -2, -3, 6, 9]], ['Rozohrávajúci obranca', [0, 0, 8, 2, -1, -2]], ['Rýchly obranca', [8, 0, 0, 1, 0, -3]], ['Ofenzívny krajný', [5, 1, 3, 4, -3, -1]], ['Ničiteľ', [-2, -3, -1, -2, 9, 5]]],
  MF: [['Tiki-taka', [-1, 0, 9, 4, -3, -3]], ['Dlhé lopty', [-2, 3, 8, -1, 0, 1]], ['Kľučkár', [5, 0, 0, 9, -4, -3]], ['Box-to-box', [2, 2, 0, 0, 3, 4]], ['Ničiteľ', [-1, -4, 1, -3, 9, 5]], ['Kreatívec', [0, 3, 6, 6, -5, -3]]],
  FW: [['Lovec gólov', [0, 9, -2, 0, 0, 2]], ['Tank', [-4, 4, -2, -2, 2, 9]], ['Kľučkár', [4, 0, 0, 9, 0, -4]], ['Šprintér', [10, 0, 0, 2, 0, -4]], ['Falošná deviatka', [0, 2, 7, 5, 0, -3]]],
};
const STYLE_DESC = {
  'Na čiare': 'Skvelé reflexy na bránkovej čiare', 'Sweeper keeper': 'Vybieha z bránky a čistí priestor za obranou', 'Rozohrávajúci brankár': 'Výborná hra nohou, začína útoky',
  'Istý v rukách': 'Málokedy pustí loptu', 'Tank': 'Silový hráč, ťažko sa cez neho prechádza', 'Rozohrávajúci obranca': 'Rozohráva dlhými loptami zozadu',
  'Rýchly obranca': 'Dobehne každého útočníka', 'Ofenzívny krajný': 'Podporuje útok po krídle', 'Ničiteľ': 'Rozbíja útoky súpera, tvrdý v súbojoch',
  'Tiki-taka': 'Krátke rýchle prihrávky, drží loptu', 'Dlhé lopty': 'Presné dlhé prihrávky cez celé ihrisko', 'Kľučkár': 'Obchádza súperov kľučkami',
  'Box-to-box': 'Behá od šestnástky k šestnástke', 'Kreatívec': 'Vymýšľa šance, nečakané prihrávky', 'Lovec gólov': 'Žije v šestnástke a strieľa góly',
  'Šprintér': 'Extrémne rýchly, uteká obrancom', 'Falošná deviatka': 'Útočník, ktorý sa vracia a tvorí hru',
};

// Špeciality s úrovňou 1 – 3 (bronz, striebro, zlato). attr = index atribútu, od ktorého závisia
const TRAITS = {
  fin: { n: 'Zakončovateľ', ic: '🥅', pos: ['FW', 'MF'], attr: 1, d: 'Presnejšie strely zblízka' },
  lng: { n: 'Strela zďaleka', ic: '🎯', pos: ['MF', 'FW'], attr: 1, d: 'Nebezpečné strely spoza šestnástky' },
  drb: { n: 'Kľučkár', ic: '🪄', pos: ['FW', 'MF', 'DF'], attr: 3, d: 'Ľahšie obchádza obrancov' },
  vis: { n: 'Prihrávka do behu', ic: '🧠', pos: ['MF', 'FW'], attr: 2, d: 'Presnejšie prihrávky' },
  lob: { n: 'Dlhé lopty', ic: '📏', pos: ['MF', 'DF', 'GK'], attr: 2, d: 'Presné dlhé prihrávky' },
  crs: { n: 'Centre', ic: '🎳', pos: ['MF', 'DF', 'FW'], attr: 2, d: 'Presné centre do šestnástky' },
  hdr: { n: 'Hlavičkár', ic: '✈️', pos: ['FW', 'DF'], attr: 5, d: 'Vyhráva vzdušné súboje' },
  tnk: { n: 'Tank', ic: '🛡️', pos: ['DF', 'FW', 'MF'], attr: 5, d: 'Ťažko sa mu berie lopta' },
  spd: { n: 'Šprintér', ic: '⚡', pos: ['FW', 'MF', 'DF'], attr: 0, d: 'Vyššia maximálna rýchlosť' },
  tkl: { n: 'Tvrdý v súbojoch', ic: '🧱', pos: ['DF', 'MF'], attr: 4, d: 'Častejšie vyhrá súboj o loptu' },
  sta: { n: 'Pľúca tímu', ic: '🫁', pos: ['MF', 'DF', 'FW'], attr: 5, d: 'Menej sa unaví' },
  pen: { n: 'Penaltový exekútor', ic: '🧊', pos: ['FW', 'MF'], attr: 1, d: 'Istota pri penaltách' },
  fk: { n: 'Štandardky', ic: '🌀', pos: ['MF', 'FW', 'DF'], attr: 2, d: 'Nebezpečné priame kopy a rohy' },
  ldr: { n: 'Líder', ic: '👑', pos: ['DF', 'MF', 'FW', 'GK'], attr: -1, d: 'Povzbudí celý tím' },
  ref: { n: 'Reflexy', ic: '🧤', pos: ['GK'], attr: 0, d: 'Dosiahne aj na strely do rohu' },
  pks: { n: 'Chytač penált', ic: '✋', pos: ['GK'], attr: 4, d: 'Často vystihne penaltu' },
  swp: { n: 'Výbehy', ic: '🏃', pos: ['GK'], attr: 2, d: 'Rozhodné výbehy proti útočníkom' },
};
const STYLE_TRAIT = { 'Lovec gólov': 'fin', 'Tank': 'tnk', 'Kľučkár': 'drb', 'Šprintér': 'spd', 'Falošná deviatka': 'vis', 'Tiki-taka': 'vis', 'Dlhé lopty': 'lob', 'Box-to-box': 'sta', 'Ničiteľ': 'tkl', 'Kreatívec': 'vis', 'Rozohrávajúci obranca': 'lob', 'Rýchly obranca': 'spd', 'Ofenzívny krajný': 'crs', 'Na čiare': 'ref', 'Sweeper keeper': 'swp', 'Rozohrávajúci brankár': 'lob', 'Istý v rukách': 'pks' };
const FOOT_NAME = { R: 'pravá', L: 'ľavá', B: 'obe nohy' };
const LVL_NAME = ['', 'bronz', 'striebro', 'zlato'];

function assignAttrs(p) {
  const list = ARCHETYPES[p.pos];
  p.arch = U.ri(0, list.length - 1);
  const prof = POS_PROFILE[p.pos], ao = list[p.arch][1];
  p.ao = prof.map((v, i) => Math.round(v + ao[i] + U.gauss() * 3));
}
// pre staré uloženia: štýl podľa existujúceho profilu atribútov
function matchStyle(p) {
  const list = ARCHETYPES[p.pos], prof = POS_PROFILE[p.pos];
  let best = 0, bv = -1e9;
  list.forEach(([, o], i) => {
    let v = 0;
    for (let k = 0; k < 6; k++) v += (p.ao[k] - prof[k]) * o[k];
    if (v > bv) { bv = v; best = i; }
  });
  return best;
}
function ensureProfile(p) {
  if (!p.ao) assignAttrs(p);
  if (p.ft != null) return;
  const r = Math.random();
  p.ft = r < 0.7 ? 'R' : r < 0.95 ? 'L' : 'B';
  p.wf = p.ft === 'B' ? 5 : U.weighted([1, 2, 3, 4, 5], w => [0, 10, 35, 38, 13, 4][w]);
  // odchýlka atribútu od bežného profilu postu (štýl hry + individualita)
  const prof = POS_PROFILE[p.pos], dev = i => p.ao[i] - prof[i];
  p.sk = p.pos === 'GK' ? 1 : U.clamp(Math.round(dev(3) / 5 + (p.pos === 'FW' ? 2.4 : p.pos === 'MF' ? 2.2 : 1.6) + U.gauss() * 0.75), 1, 5);
  // vedľajšie posty
  p.pos2 = [];
  if (p.pos === 'DF') { if (U.chance(0.3)) p.pos2.push('MF'); }
  else if (p.pos === 'MF') { if (U.chance(0.28)) p.pos2.push('FW'); if (U.chance(0.22)) p.pos2.push('DF'); }
  else if (p.pos === 'FW') { if (U.chance(0.32)) p.pos2.push('MF'); }
  // špeciality
  const style = ARCHETYPES[p.pos][p.arch][0], favored = STYLE_TRAIT[style];
  const cand = [];
  for (const k in TRAITS) {
    const T = TRAITS[k];
    if (!T.pos.includes(p.pos)) continue;
    let sc = T.attr >= 0 ? dev(T.attr) : 0;
    if (k === favored) sc += 4;
    if (k === 'ldr') sc = p.age >= 26 ? U.rf(-6, 9) : -20;
    if (k === 'pen' || k === 'fk') sc -= 1;
    sc += U.gauss() * 3;
    if (sc > 7) cand.push([k, sc]);
  }
  cand.sort((a, b) => b[1] - a[1]);
  p.tr = {};
  // druhá a tretia špecialita sú stále vzácnejšie
  cand.filter(([, sc], i) => sc > [7, 9, 12.5][i]).slice(0, 3).forEach(([k, sc]) => { p.tr[k] = sc > 15 ? 3 : sc > 11 ? 2 : 1; });
}
function trLvl(p, k) { return (p && p.tr && p.tr[k]) || 0; }

function playerAttrs(p) {
  if (!p.ao) assignAttrs(p);
  const agePace = p.age >= 30 ? -(p.age - 29) * 1.5 : p.age <= 21 ? 2 : 0;
  return p.ao.map((o, i) => U.clamp(Math.round(p.r + o + (i === 0 && p.pos !== 'GK' ? agePace : 0)), 1, 99));
}
function attrNames(p, full) { return p.pos === 'GK' ? (full ? ATTR_GK_FULL : ATTR_GK) : (full ? ATTR_OUT_FULL : ATTR_OUT); }
function archName(p) { if (!p.ao) assignAttrs(p); return (ARCHETYPES[p.pos][p.arch] || ARCHETYPES[p.pos][0])[0]; }

// ── Zmluvy a platy (plat = € za týždeň / hrací deň) ─────────────
const MIN_WAGE = { 0: 4000, 1: 800, 2: 250, 3: 90, 4: 45, 5: 22, 6: 12, 7: 7, 8: 4, 9: 3 };
function baseValue(r) { return 2100 * Math.pow(1.125, r - 20); }
function wageFor(p, lvl) {
  const ageW = p.age <= 20 ? 0.6 : p.age <= 23 ? 0.85 : p.age <= 30 ? 1 : 0.9;
  const top = p.r > 68 ? Math.pow(1.07, p.r - 68) : 1; // hviezdy si pýtajú oveľa viac
  return U.nice(Math.max(MIN_WAGE[lvl || 9], baseValue(p.r) * ageW * 0.005 * top));
}
function initContract(p, lvl) {
  if (p.tid < 0) { p.ce = 0; p.w = 0; return; }
  p.ce = G.year + (G.offseason ? 2 : 1) + U.ri(0, 3);
  p.w = wageFor(p, lvl);
}
function contractLeft(p) { return p.tid < 0 || !p.ce ? 0 : p.ce - G.year; } // 1 = posledná sezóna
function levelWageBill(l) { return 20 * wageFor({ r: LEVEL_INFO[l].base + 3, age: 26 }, l); }
function teamWageBill(t) { return teamPlayers(t).reduce((a, p) => a + (p.w || 0), 0); }

// ── Prestupové okná ─────────────────────────────────────────────
// prestupové okná podľa ligových kôl: letné do 6. kola, zimné od 16. do 21. kola
function seasonWindows() {
  if (G.wins && G.wins.length) return G.wins;
  const dl = r => { const i = G.calendar.findIndex(e => e.t === 'L' && e.r === r); return i < 0 ? 0 : i; };
  G.wins = [[0, dl(5), 'Letné'], [dl(15) + 1, dl(20), 'Zimné']];
  return G.wins;
}
function windowNow() {
  const d = G.day;
  if (seasonOver()) return { open: false, next: null, name: 'Letné' };
  for (const w of seasonWindows()) if (d >= w[0] && d <= w[1]) return { open: true, name: w[2], left: w[1] - d };
  const nxt = seasonWindows().find(w => w[0] > d);
  return { open: false, next: nxt ? nxt[0] - d : null, name: nxt ? nxt[2] : 'Letné' };
}
const dayKey = () => G.year * 100 + G.day;

// ── Financie ────────────────────────────────────────────────────
const FIN_CATS = { gate: 'Vstupenky', vip: 'VIP lóže', st: 'Permanentky', cater: 'Občerstvenie', merch: 'Suveníry a fanshop', spons: 'Sponzori', tv: 'TV práva', grant: 'Dotácie', events: 'Mimoriadne príjmy', euro: 'Európske poháre', eventx: 'Mimoriadne výdavky', prize: 'Prémie', sales: 'Predaje hráčov', loans: 'Hosťovania', buys: 'Nákupy hráčov', staff: 'Realizačný tím', mafia: 'Súkromní darcovia', agents: 'Agenti', bonus: 'Prémie hráčom', women: 'Ženský tím', fines: 'Pokuty', wages: 'Platy hráčov', scouts: 'Skauti', invest: 'Investície', ops: 'Prevádzka klubu', upkeep: 'Údržba areálu', matchday: 'Organizácia zápasov', tours: 'Prehliadky múzea', resto: 'Klubová reštaurácia', other: 'Ostatné' };
function fin() { return G.fin || (G.fin = { cur: {}, hist: [], bal: [] }); }
function book(cat, amount) {
  amount = Math.round(amount);
  const f = fin();
  f.cur[cat] = (f.cur[cat] || 0) + amount;
  userTeam().budget += amount;
  boardBook(cat, amount);
}
// priemerná bilancia jedného kola (týždňa) vrátane polovice domácich zápasov
function weeklyBalance() { const w = weeklyParts(); return w.inc - w.exp; }

// ── Znalosť hráčov (skauting) ───────────────────────────────────
function know(p) {
  if (!p) return 0;
  if (p.tid === G.userTid || (p.loan && p.loan.from === G.userTid)) return 100;
  const k = (G.know && G.know[p.id]) || 0;
  let base = 15;
  const t = p.tid >= 0 ? G.teams[p.tid] : null;
  // svetové hviezdy a vlastná liga sú známe, o zvyšku zahraničia vieš málo
  if (t && t.fx) base = (t.tier || 0) >= 80 ? 45 : 25;
  else if (t && (t.lvl === 1 || t.lid === userTeam().lid)) base = 45;
  return Math.max(base, k);
}
function addKnow(p, amt) {
  G.know = G.know || {};
  G.know[p.id] = Math.min(100, Math.max(know(p), (G.know[p.id] || 0) + amt));
}
function rRange(p) {
  const k = know(p);
  if (k >= 45) return [p.r, p.r];
  const w = Math.round(2 + (45 - k) / 45 * 10);
  const a = U.hash(p.id + ':' + (G.seed || 1)) % (w + 1);
  return [Math.max(1, p.r - a), p.r - a + w];
}
function estR(p) { const [a, b] = rRange(p); return (a + b) / 2; }
function potOf(p) { return Math.max(p.pot || p.r, p.r); }
function potGap(p) { return potOf(p) - p.r; }
// slovný popis talentu
function talentLabel(p) {
  const g = potGap(p);
  if (g >= 15 && p.age <= 22) return ['gem', '💎 Klenot'];
  if (g >= 10) return ['big', '⭐ Veľký talent'];
  if (g >= 5 && p.age >= 24) return ['late', '🌱 Neskorý kvet'];
  if (g >= 5) return ['tal', '📈 Talent'];
  if (g >= 2) return ['grow', '↗ Ešte porastie'];
  if (p.age >= 31) return ['vet', '🎖️ Skúsený'];
  return ['peak', '⏸ Na vrchole'];
}
function rerollPotentials(keepHigh) {
  for (const p of G.players) {
    if (!p) continue;
    const t = p.tid >= 0 ? G.teams[p.tid] : null;
    const np = rollPotential(p.age, p.r, t ? teamBase(t) : p.r);
    p.pot = keepHigh && p.age < 24 && (p.pot || 0) - p.r >= 8 ? Math.max(p.pot, np) : np;
  }
}
function potRange(p) {
  const k = know(p), pot = potOf(p);
  if (k >= 100) return [pot, pot];
  if (k >= 70) { const a = U.hash('p' + p.id) % 6; return [Math.max(p.r, pot - a), pot - a + 5]; }
  return null;
}
function attrsKnown(p) { return know(p) >= 70; }

// ── Hodnota a cena ──────────────────────────────────────────────
function askingPrice(p) {
  if (p.tid < 0) return 0;
  const t = G.teams[p.tid];
  let v = playerValue(p);
  if (t.lineup && t.lineup.includes(p.id)) {
    v *= 1.25;
    if (G.userTid >= 0 && t.lid === userTeam().lid) v *= 1.2; // konkurentovi z ligy predávajú opory neradi
  }
  if (t.fx) v *= 1.15 + (t.tier - 64) * 0.02; // veľkokluby predávajú draho
  if (p.wo) v *= 0.75;
  if (p.listedAI) v *= 0.85;
  v *= mafDisc(t);
  if (t.budget < 0) v *= 0.85;
  return U.nice(U.clamp(v, 500, 2.5e8));
}
// podpisové pri voľnom hráčovi: dobrí hráči chcú časť ušetreného prestupu
function signingBonus(p) {
  const share = p.r >= 70 ? 0.3 : p.r >= 62 ? 0.18 : p.r >= 50 ? 0.08 : 0;
  return U.nice(Math.max(wageDemand(p, userTeam()) * 4, playerValue(p) * share));
}

// ── Vyjednávanie ────────────────────────────────────────────────
function negState(pid) { G.neg = G.neg || {}; return G.neg[pid] || (G.neg[pid] = { tries: 0, ptries: 0, lock: -1 }); }
function negLocked(p) { const s = negState(p.id); return s.lock > dayKey(); }

function swapValue(sw, club) {
  const v = playerValue(sw);
  const same = teamPlayers(club).filter(x => x.pos === sw.pos);
  const avg = same.length ? U.avg(same.map(x => x.r)) : teamBase(club);
  const f = sw.r >= avg + 2 ? 0.95 : sw.r >= avg - 3 ? 0.7 : sw.r >= avg - 8 ? 0.4 : 0.15;
  return U.nice(v * f);
}

function transferCheck(p, opts = {}) {
  const u = userTeam();
  if (!p) return 'Hráč neexistuje.';
  if (p.tid === u.id) return 'Hráč už je v tvojom tíme.';
  if (p.loan) return 'Hráč je na hosťovaní, teraz ho nemožno kúpiť.';
  if (p.tid >= 0 && !windowNow().open && !opts.pre) return 'Prestupové okno je zatvorené. Voľných hráčov môžeš podpísať kedykoľvek.';
  if (p.tid >= 0 && mafBan()) return 'Klub má od súdu zákaz prestupov.';
  if (teamPlayers(u).length >= 30 && !opts.swap) return 'Máš plný káder (30 hráčov).';
  if (negLocked(p)) return 'Klub ani hráč s tebou teraz nechcú rokovať. Skús o pár dní.';
  if (p.tid >= 0) {
    const from = G.teams[p.tid];
    if (from.lvl < u.lvl - 1 && p.r > teamBase(u) + 10) return 'Hráč nemá záujem hrať v takto slabom klube – najprv si vybuduj silnejší tím.';
    if (from.lvl < u.lvl && p.r > teamBase(u) + 13) return 'Hráč je na tvoj klub príliš dobrý – nemá záujem.';
  } else if (p.r > teamBase(u) + 7) return 'Voľný hráč čaká na ponuku z vyššej súťaže.';
  return null;
}

// Vyhodnotí ponuku klubu. Výsledok: accept | counter | reject | angry
function evalOffer(p, cash, swapPid) {
  const ask = askingPrice(p);
  const club = G.teams[p.tid];
  const sw = swapPid != null ? G.players[swapPid] : null;
  const swV = sw ? swapValue(sw, club) : 0;
  const ratio = (cash + swV) / ask;
  const ns = negState(p.id);
  if (ratio >= 1) return { res: 'accept' };
  if (ratio >= 0.82) {
    if (U.chance((ratio - 0.82) / 0.18 * 0.45)) return { res: 'accept' };
    ns.tries++;
    return { res: 'counter', fee: U.nice(Math.max(cash, (ask - swV) * U.rf(0.95, 1))) };
  }
  ns.tries++;
  if (ns.tries >= 3) { ns.lock = dayKey() + 4; ns.tries = 0; return { res: 'angry' }; }
  return { res: 'reject' };
}

function wageDemand(p, toTeam) {
  let d = wageFor(p, toTeam.lvl);
  const from = p.tid >= 0 ? G.teams[p.tid] : null;
  if (from && from.id !== toTeam.id) {
    const diff = toTeam.lvl - from.lvl;
    if (diff > 0) d *= 1 + 0.3 * diff; else if (diff < 0) d *= 0.9;
    d = Math.max(d, (p.w || 0) * (diff >= 0 ? 1.1 : 1));
  } else if (!from) d *= p.r >= 68 ? 1.35 : 1.15;
  if (p.wo) d *= 0.9;
  return U.nice(d);
}

function renewDemand(p) {
  const u = userTeam();
  let d = wageFor(p, u.lvl);
  if (p.r > teamBase(u) + 3) d *= 1.2;
  if (p.age <= 22 && potOf(p) > p.r + 8) d *= 1.1;
  return U.nice(Math.max(d, (p.w || 0) * 1.05));
}

// Osobné podmienky: accept | reject | angry
function evalTerms(p, wage, endYear, demand) {
  const ns = negState(p.id);
  const years = endYear - G.year;
  let ok = wage / demand;
  if (p.age >= 30 && years >= 2) ok += 0.05;
  if (p.age >= 31 && years <= 1) ok -= 0.08;
  if (p.age <= 22 && potOf(p) > p.r + 8 && years >= 5) ok -= 0.05;
  if (ok >= 1 || (ok >= 0.9 && U.chance((ok - 0.9) / 0.1))) { ns.ptries = 0; return 'accept'; }
  ns.ptries++;
  if (ns.ptries >= 3) { ns.lock = dayKey() + 4; ns.ptries = 0; return 'angry'; }
  return 'reject';
}

// ── Tréningové podmienky klubov (stupnica ako tréningové centrum 0 – 5) ──
// tvoj klub = úroveň tréningového centra, ostatné podľa ligy a veľkosti, zahraničné podľa sily
function trainQ(t) {
  if (!t) return 0;
  if (t.id === G.userTid && G.biz) return G.biz.fac.train || 0;
  if (t.fx) return 3 + U.clamp((t.tier - 64) / 18, 0, 1) * 2;
  if (t.lvl === 1) return 2.5 + U.clamp(((REAL_CAPACITY[t.key] || 5000) - 5000) / 12000, 0, 1.5);
  return [0, 0, 2, 1.5, 1, 0.5, 0, 0, 0, 0][t.lvl] || 0;
}
// najlepšie podmienky, aké hráč doteraz mal
const trainPrev = p => Math.max(p.tq ?? (p.tid >= 0 ? 0 : 1), p.tid >= 0 ? trainQ(G.teams[p.tid]) : 0);
const TRAIN_AGE = a => (a <= 19 ? 1.6 : a <= 21 ? 1.3 : a <= 23 ? 0.9 : a <= 25 ? 0.5 : a <= 27 ? 0.25 : 0);
// odhad rastu potenciálu po príchode do klubu s lepším tréningom [min, max]
function trainGainRange(p, to, mult = 1) {
  const d = to - trainPrev(p), f = d * TRAIN_AGE(p.age) * mult;
  if (d < 0.5 || f < 0.5) return null;
  const cap = x => Math.max(0, Math.min(8, 88 - (p.pot || p.r), p.pot >= 74 ? Math.ceil(x / 2) : x));
  const lo = cap(Math.round(f * 0.6)), hi = cap(Math.round(f * 1.3));
  return hi > 0 ? [lo, hi] : null;
}
// lepšie tréningové centrum = vyšší potenciál (mladí najviac)
function trainBoost(p, to, prev, mult = 1) {
  let g = 0;
  const d = to - prev;
  if (d >= 0.5 && TRAIN_AGE(p.age)) {
    g = Math.round(d * TRAIN_AGE(p.age) * mult * U.rf(0.6, 1.3));
    if (p.pot >= 74) g = Math.ceil(g / 2);
    g = Math.max(0, Math.min(g, 8, 88 - (p.pot || p.r)));
    if (g) p.pot = (p.pot || p.r) + g;
  }
  p.tq = Math.max(prev, to);
  return g;
}

function moveToTeam(p, t, keepLoan) {
  const old = p.tid >= 0 ? G.teams[p.tid] : null;
  const prevQ = trainPrev(p);
  removeFromTeam(p);
  G.freeAgents = G.freeAgents.filter(id => id !== p.id);
  p.tid = t.id; t.pids.push(p.id); p.num = 0;
  p.listed = false; p.listedAI = false; p.wo = false;
  if (!keepLoan) delete p.loan;
  if (!(old && t.parent === old.id) && !(old && old.parent === t.id)) { p.joined = G.year; delete p.mor; delete p.prom; delete p.it; delete p.rel; delete p.gb; }
  const tg = trainBoost(p, trainQ(t), prevQ);
  if (tg && t.id === G.userTid) news(`🏋️ ${pFull(p)} má u teba lepšie podmienky na tréning – potenciál +${tg}.`, 'good');
  assignNumbers(t);
  if (old) {
    if (old.lineup) old.lineup = old.lineup.map(id => (id === p.id ? -1 : id));
    if (old.id !== G.userTid) aiRefill(old);
    validateLineup(old);
  }
  if (t.id !== G.userTid) validateLineup(t);
}

function logTransfer(p, from, to, fee, type) {
  const e = { y: G.year, d: G.day, pid: p.id, name: pFull(p), from: from ? from.id : -1, to: to ? to.id : -1, fee, type };
  p.h = p.h || [];
  p.h.push({ y: G.year, from: e.from, to: e.to, fee, type });
  sellOnCheck(p, from, to, fee);
  if (p.h.length > 8) p.h.shift();
  if ((from && from.id === G.userTid) || (to && to.id === G.userTid)) { G.tlog = G.tlog || []; G.tlog.unshift(e); }
}

function completeTransfer(p, fee, wage, endYear, swapPid) {
  const u = userTeam();
  const from = p.tid >= 0 ? G.teams[p.tid] : null;
  if (from) { book('buys', -fee); from.budget += fee; }
  else { book('buys', -fee); }
  if (swapPid != null) {
    const sw = G.players[swapPid];
    if (sw && from) {
      moveToTeam(sw, from);
      sw.w = wageFor(sw, from.lvl); sw.ce = G.year + U.ri(2, 4);
      logTransfer(sw, u, from, 0, 'swap');
      news(`Výmena: ${pFull(sw)} odchádza do klubu ${from.name} v rámci prestupu.`, 'transfer');
    }
  }
  moveToTeam(p, u);
  p.w = wage; p.ce = endYear;
  G.short = (G.short || []).filter(id => id !== p.id);
  logTransfer(p, from, u, fee, from ? 'buy' : 'free');
  news(from ? `Prestup: ${pFull(p)} prichádza z klubu ${from.name} za ${U.money(fee)}.` : `${pFull(p)} podpísal zmluvu ako voľný hráč.`, 'transfer');
  validateLineup(u);
}

function sellTo(p, buyer, fee) {
  const u = userTeam();
  book('sales', fee); buyer.budget -= fee;
  moveToTeam(p, buyer);
  p.w = Math.max(p.w || 0, wageFor(p, buyer.lvl)); p.ce = G.year + U.ri(2, 4);
  logTransfer(p, u, buyer, fee, 'sell');
  for (const m of G.inbox || []) if (m.type === 'offer' && m.pid === p.id && m.status === 'open') m.status = 'closed';
  validateLineup(u);
  news(`Predaj: ${pFull(p)} odchádza do klubu ${buyer.name} za ${U.money(fee)}.`, 'transfer');
}

function sellCheck(p) {
  const ps = teamPlayers(userTeam());
  if (p.loan) return 'Hráč je u teba len na hosťovaní.';
  if (!windowNow().open) return 'Prestupové okno je zatvorené.';
  if (ps.length <= 16) return 'V kádri musíš mať aspoň 16 hráčov.';
  if (p.pos === 'GK' && ps.filter(x => x.pos === 'GK').length <= 2) return 'Musíš mať aspoň 2 brankárov.';
  return null;
}

function quickSaleOffer(p) {
  const val = playerValue(p), u = userTeam();
  const cands = G.teams.filter(t => t.id !== u.id && t.budget >= val * 0.5 && teamPlayers(t).length < 28 && Math.abs(teamBase(t) - p.r) <= 10);
  if (!cands.length) return null;
  const buyer = U.weighted(cands, t => 12 - Math.abs(teamBase(t) - p.r));
  return { buyer, offer: U.nice(Math.min(buyer.budget, val * U.rf(0.65, 0.9))) };
}

function releasePlayer(p) {
  const u = userTeam();
  const pay = U.nice((p.w || 0) * Math.max(0, contractLeft(p) - 1) * 8 + (p.w || 0) * 4);
  book('other', -pay);
  removeFromTeam(p);
  p.tid = -1; p.ce = 0; p.w = 0; p.listed = false;
  G.freeAgents.push(p.id);
  logTransfer(p, u, null, 0, 'release');
  validateLineup(u);
  news(`${pFull(p)} bol uvoľnený z klubu (odstupné ${U.money(pay)}).`);
  return pay;
}
function releaseCost(p) { return U.nice((p.w || 0) * Math.max(0, contractLeft(p) - 1) * 8 + (p.w || 0) * 4); }

// ── Hosťovania ──────────────────────────────────────────────────
function loanFee(p) { return U.nice(Math.max(300, playerValue(p) * 0.06)); }
function loanInCheck(p) {
  const u = userTeam();
  if (!windowNow().open) return 'Prestupové okno je zatvorené.';
  if (p.tid < 0 || p.tid === u.id || p.loan) return 'Tohto hráča nemožno požičať.';
  if (mafBan()) return 'Klub má od súdu zákaz prestupov.';
  const t = G.teams[p.tid];
  if (p.age > 24) return 'Na hosťovanie kluby púšťajú len hráčov do 24 rokov.';
  if (t.lineup && t.lineup.includes(p.id)) return 'Klub ho nepustí – hrá v základnej zostave.';
  if (t.lvl > u.lvl) return 'Hosťovať môžeš len hráčov z rovnakej alebo vyššej súťaže.';
  if (teamPlayers(u).length >= 30) return 'Máš plný káder (30 hráčov).';
  return tbCheck(loanFee(p));
}
function loanIn(p) {
  const u = userTeam(), from = G.teams[p.tid], fee = loanFee(p);
  book('loans', -fee); from.budget += fee;
  moveToTeam(p, u, true);
  p.loan = { from: from.id, to: u.id };
  logTransfer(p, from, u, fee, 'loanIn');
  news(`Hosťovanie: ${pFull(p)} prichádza z klubu ${from.name} do konca sezóny.`, 'transfer');
}
function loanOutCheck(p) {
  if (!windowNow().open) return 'Prestupové okno je zatvorené.';
  if (p.loan) return 'Hráč je u teba už na hosťovaní.';
  const ps = teamPlayers(userTeam());
  if (ps.length <= 16) return 'V kádri musíš mať aspoň 16 hráčov.';
  if (p.pos === 'GK' && ps.filter(x => x.pos === 'GK').length <= 2) return 'Musíš mať aspoň 2 brankárov.';
  return null;
}
function loanOutTargets(p) {
  const u = userTeam();
  return G.teams.filter(t => t.id !== u.id && t.lvl >= u.lvl && t.lvl <= u.lvl + 3 && teamPlayers(t).length < 28 && p.r >= teamBase(t) - 2 && p.r <= teamBase(t) + 8)
    .sort((a, b) => a.lvl - b.lvl || teamBase(b) - teamBase(a)).slice(0, 4);
}
function loanOut(p, t) {
  const u = userTeam();
  moveToTeam(p, t, true);
  p.loan = { from: u.id, to: t.id };
  logTransfer(p, u, t, 0, 'loanOut');
  news(`Hosťovanie: ${pFull(p)} odchádza do klubu ${t.name}, kde dostane viac priestoru.`, 'transfer');
}
function returnLoans() {
  const back = [];
  for (const p of G.players) {
    if (!p || !p.loan) continue;
    const from = G.teams[p.loan.from];
    if (p.loan.from === G.userTid && p.s.gp >= 8 && p.age <= 24) { p.r = Math.min(95, p.r + 1); }
    const wasUser = p.loan.from === G.userTid || p.loan.to === G.userTid;
    delete p.loan;
    moveToTeam(p, from);
    if (wasUser) back.push(pFull(p));
  }
  return back;
}

// ── Zmluvy na konci sezóny ──────────────────────────────────────
function handleContracts() {
  const u = userTeam(), left = [];
  preArrivals();
  for (const p of G.players) {
    if (!p || p.tid < 0 || !p.ce || p.ce > G.year + 1) continue;
    const t = G.teams[p.tid];
    if (t.id === u.id) { left.push(pFull(p)); toFreeAgent(p); }
    else if (p.r >= teamBase(t) - 4 && p.age < 33 && U.chance(0.85)) { p.ce = G.year + 2 + U.ri(0, 2); p.w = wageFor(p, t.lvl); }
    else if (p.r >= teamBase(t) - 6 && p.age < 32 && aiFreeMove(p)) continue;
    else toFreeAgent(p);
  }
  for (const n of left) news(`${n} odišiel z klubu – skončila mu zmluva.`, 'bad');
  return left;
}
// dobrý hráč bez zmluvy hneď nájde nový klub (prestup zadarmo) – do zoznamu voľných hráčov nejde
function aiFreeMove(p) {
  const from = p.tid >= 0 ? G.teams[p.tid] : null;
  const fx = !!(from && from.fx), abroad = p.r >= 68; // silní slovenskí hráči môžu ísť aj do cudziny
  const pool = G.teams.filter(t => t !== from && !isUserSide(t) && (t.fx ? fx || abroad : !fx) && teamPlayers(t).length < 27 && teamBase(t) >= p.r - 4 && teamBase(t) <= p.r + 2);
  if (!pool.length) return false;
  const to = U.weighted(pool, t => (t.fx ? 1 + (t.tier || 64) / 40 : 10 - t.lvl) * (1 + Math.max(0, 5 - Math.abs(teamBase(t) - p.r + 1))));
  moveToTeam(p, to);
  p.w = Math.max(wageFor(p, to.lvl), p.w || 0); p.ce = G.year + (G.offseason ? 2 : 1) + U.ri(1, 3);
  logTransfer(p, from, to, 0, 'free');
  if (!to.fx && to.lvl <= 2) news(`Prestup zadarmo: ${pFull(p)} (${from ? from.short : 'voľný'} → ${to.short}).`, 'transfer');
  return true;
}
// AI kluby počas okna podpisujú dobrých voľných hráčov
function aiSignFreeAgents(chance = 0.3) {
  const fa = G.freeAgents.map(id => G.players[id]).filter(p => p && p.tid < 0 && p.r >= 50).sort((a, b) => b.r - a.r);
  for (const p of fa) if (U.chance(chance)) aiFreeMove(p);
}
function toFreeAgent(p) {
  const t = p.tid >= 0 ? G.teams[p.tid] : null;
  // hráči zahraničných klubov odchádzajú do iných líg v cudzine (k nám prídu len slabší mladíci)
  if (t && t.fx && (p.age >= 22 || p.r >= 62)) { removeFromTeam(p); if (t.lineup) t.lineup = t.lineup.map(id => (id === p.id ? -1 : id)); G.players[p.id] = null; return; }
  p.tq = Math.max(p.tq ?? 0, trainQ(t));
  removeFromTeam(p);
  p.tid = -1; p.ce = 0; p.w = 0; p.listed = false; p.listedAI = false; p.wo = false;
  if (!G.freeAgents.includes(p.id)) G.freeAgents.push(p.id);
  if (t && t.lineup) t.lineup = t.lineup.map(id => (id === p.id ? -1 : id));
}

// ── Ponuky od AI klubov na hráčov používateľa ───────────────────
function inboxAdd(m) {
  G.inbox = G.inbox || [];
  G.msgSeq = (G.msgSeq || 0) + 1;
  G.inbox.unshift({ id: G.msgSeq, day: G.day, year: G.year, read: false, ...m });
  if (G.inbox.length > 80) G.inbox.length = 80;
}
function unreadCount() { return (G.inbox || []).filter(m => !m.read).length; }

function genIncomingOffers() {
  const u = userTeam();
  if (!windowNow().open) return;
  const ub = teamBase(u);
  for (const p of teamPlayers(u)) {
    if (p.loan) continue;
    const open = (G.inbox || []).filter(m => m.type === 'offer' && m.pid === p.id && m.status === 'open').length;
    if (open >= 2) continue;
    // hráč vo forme láka väčšie kluby
    let prob = p.listed ? 0.3 : 0.01 + Math.max(0, (p.r - ub) / 120) + (p.age <= 21 && potOf(p) > p.r + 8 ? 0.015 : 0) + (formOf(p) >= 72 ? 0.03 : 0);
    if (!U.chance(prob)) continue;
    const val = playerValue(p);
    const buyers = G.teams.filter(t => !isUserSide(t) && t.lvl <= u.lvl + 1 && t.budget >= val * 0.55 && teamBase(t) <= p.r + 2 && teamBase(t) >= p.r - 12 && teamPlayers(t).length < 28);
    if (!buyers.length) continue;
    const b = U.weighted(buyers, t => (t.lvl < u.lvl ? 3 : 1) * (1 + t.budget / (val * 4)));
    const fee = U.nice(Math.min(b.budget * 0.9, val * U.rf(p.listed ? 0.62 : 0.8, p.listed ? 1.0 : 1.25)));
    inboxAdd({ type: 'offer', pid: p.id, from: b.id, fee, max: U.nice(fee * U.rf(1.05, 1.3)), exp: G.day + 3, status: 'open' });
  }
}
function expireOffers() {
  for (const m of G.inbox || []) if (m.type === 'offer' && m.status === 'open' && (m.year !== G.year || m.exp < G.day || !G.players[m.pid] || G.players[m.pid].tid !== G.userTid)) m.status = 'expired';
}
function acceptOffer(m) {
  const p = G.players[m.pid], buyer = G.teams[m.from];
  const err = sellCheck(p);
  if (err) return err;
  if (buyer.budget < m.fee) { m.status = 'expired'; return 'Klub už nemá na prestup peniaze.'; }
  sellTo(p, buyer, m.fee);
  m.status = 'accepted';
  return null;
}
function counterOffer(m, fee) {
  const p = G.players[m.pid], buyer = G.teams[m.from];
  if (fee <= m.max && buyer.budget >= fee) {
    const err = sellCheck(p);
    if (err) return { err };
    m.fee = fee; sellTo(p, buyer, fee); m.status = 'accepted';
    return { ok: true };
  }
  if (U.chance(0.5)) { m.status = 'withdrawn'; return { withdrawn: true }; }
  m.max = Math.max(m.fee, U.nice(m.max * 0.97));
  return { stays: true };
}

// ── Skauti ──────────────────────────────────────────────────────
const SCOUT_BASE = { 1: 700, 2: 220, 3: 80, 4: 40, 5: 22, 6: 14, 7: 9, 8: 7, 9: 5 };
const FOCUS = { best: 'Najlepší dostupní', talent: 'Mladé talenty (do 21)', cheap: 'Výhodné kúpe', free: 'Končiace zmluvy a voľní' };
function genScout(q) {
  const nm = genName(false);
  const lvl = userTeam().lvl;
  G.scoutSeq = (G.scoutSeq || 0) + 1;
  return {
    id: G.scoutSeq, name: nm.fn + ' ' + nm.ln, q, wage: U.nice(SCOUT_BASE[lvl] * Math.pow(q, 1.4)),
    mission: { reg: '', lmin: Math.max(1, lvl - 1), lmax: Math.min(9, lvl + 2), pos: '', age: 0, focus: 'cheap' }, found: 0,
  };
}
function refreshScoutPool() {
  G.scoutPool = [];
  for (let i = 0; i < 4; i++) G.scoutPool.push(genScout(U.weighted([1, 2, 3, 4, 5], q => [0, 3, 4, 3, 2, 1][q])));
}
function hireFee(s) { return U.nice(s.wage * 5); }
function hireScout(id) {
  const s = (G.scoutPool || []).find(x => x.id === id);
  if (!s) return 'Skaut už nie je k dispozícii.';
  if ((G.scouts || []).length >= 3) return 'Môžeš mať najviac 3 skautov.';
  const fee = hireFee(s);
  if (userTeam().budget < fee) return 'Nemáš dosť peňazí.';
  book('scouts', -fee);
  G.scoutPool = G.scoutPool.filter(x => x.id !== id);
  G.scouts.push(s);
  news(`Do klubu prišiel nový skaut ${s.name} (${'★'.repeat(s.q)}).`);
  return null;
}
function fireScout(id) {
  const s = G.scouts.find(x => x.id === id);
  if (!s) return;
  book('scouts', -U.nice(s.wage * 2));
  G.scouts = G.scouts.filter(x => x.id !== id);
}

function scoutScore(p, focus, ub, budget) {
  const pot = potOf(p);
  switch (focus) {
    case 'talent': return p.age <= 21 ? pot - ub + (21 - p.age) : -99;
    case 'cheap': { const pr = p.tid < 0 ? 0 : askingPrice(p); return pr <= budget ? p.r - ub + 4 - pr / Math.max(1000, budget) * 6 : -99; }
    case 'free': return (p.tid < 0 || contractLeft(p) <= 1) ? p.r - ub + 2 : -99;
    default: return p.tid >= 0 && askingPrice(p) > Math.max(budget, 1000) * 2.5 ? -99 : p.r - ub;
  }
}

// vzdialenosť sťažuje skauting: zahraničie, iný región
function scoutDist(p) {
  const t = p.tid >= 0 ? G.teams[p.tid] : null, net = G.biz && G.biz.fac ? (G.biz.fac.scout || 0) : 0;
  if (t && t.fx) return 0.45 + 0.05 * net;
  if (t && t.reg && t.reg !== userTeam().reg) return 0.8;
  return 1;
}
const scoutCap = s => 1 + Math.floor(s.q / 2) + ((G.biz && G.biz.fac.scout) >= 2 ? 1 : 0);
// krajiny zahraničných klubov (pre misie skautov)
function scoutCountries() { const c = new Set(); for (const id of G.euroTids || []) { const t = G.teams[id]; if (t) c.add(t.fx); } return [...c].sort((a, b) => (EURO_COUNTRY[a] || [a])[0].localeCompare((EURO_COUNTRY[b] || [b])[0], 'sk')); }
function missionOK(m, p) {
  const t = p.tid >= 0 ? G.teams[p.tid] : null;
  if (m.cc) { if (!t || !t.fx) return false; if (m.cc !== 'ALL' && t.fx !== m.cc) return false; }
  else if (t) { if (t.fx) return false; if (m.reg && t.reg !== m.reg) return false; if (t.lvl < Math.max(1, m.lmin) || t.lvl > m.lmax) return false; }
  if (m.pos && p.pos !== m.pos) return false;
  if (m.age && p.age > m.age) return false;
  return true;
}
function scoutDay(ev) {
  if (!G.scouts || !G.scouts.length) return;
  const u = userTeam(), ub = teamBase(u), net = G.biz && G.biz.fac ? (G.biz.fac.scout || 0) : 0;
  G.scoutQueue = (G.scoutQueue || []).filter(id => G.players[id] && know(G.players[id]) < 100);
  let qi = 0;
  for (const s of G.scouts) {
    const found = [];
    // cielené skautovanie: hráč sa preskúma postupne (viac dní, v cudzine dlhšie)
    for (let k = 0; k < scoutCap(s) && qi < G.scoutQueue.length; k++, qi++) {
      const p = G.players[G.scoutQueue[qi]];
      const before = know(p);
      addKnow(p, Math.round((10 + 6 * s.q + 3 * net) * scoutDist(p)));
      if (know(p) >= 100 && before < 100) found.push(p);
    }
    const m = s.mission;
    if (m && !m.off) {
      if (m.cc && ev && ev.t === 'L') book('scouts', -U.nice(s.wage * 0.8)); // cestovné
      const cands = [];
      for (const p of G.players) {
        if (!p || p.tid === u.id || know(p) >= 70 || !missionOK(m, p)) continue;
        const sc = scoutScore(p, m.focus, ub, u.budget);
        if (sc < -50) continue;
        cands.push([p, sc + U.gauss() * (6 - s.q) * 2.6]);
      }
      cands.sort((a, b) => b[1] - a[1]);
      const n = U.chance(0.35 + 0.1 * s.q) ? 1 + (s.q >= 4 ? 1 : 0) : 0;
      for (const [p] of cands.slice(0, n)) { addKnow(p, Math.round((22 + 7 * s.q + 4 * net) * scoutDist(p))); found.push(p); }
    }
    if (found.length) {
      s.found += found.length;
      G.scouted = G.scouted || [];
      for (const p of found) {
        G.scouted = G.scouted.filter(x => x.pid !== p.id);
        G.scouted.unshift({ pid: p.id, by: s.name, y: G.year, d: G.day });
      }
      if (G.scouted.length > 120) G.scouted.length = 120;
      const best = found.slice().sort((a, b) => scoutScore(b, s.mission.focus, ub, u.budget) - scoutScore(a, s.mission.focus, ub, u.budget))[0];
      const recent = (G.inbox || []).slice(0, 30).some(x => x.type === 'scout' && x.pid === (best && best.id));
      const affordable = best && (best.tid < 0 || askingPrice(best) <= Math.max(u.budget, 1000) * 1.5);
      if (best && !recent && affordable && (best.r >= ub || (best.age <= 21 && potOf(best) >= ub + 4))) {
        inboxAdd({ type: 'scout', pid: best.id, scout: s.name, q: s.q });
      }
    }
  }
}

// ── Akadémia: mladí hráči trénujú, ale nehrajú ──────────────────
// 5 miest, ročník trvá jednu sezónu (32 kôl), potom ide hráč sám na lavičku
// a na jeho miesto nastúpi prvý hráč z čakárne (2 miesta, tam hráči ešte hrajú)
const ACAD_MAX_AGE = 21, ACAD_DAYS = 32, ACAD_CAP = 5, ACAD_WAIT = 2;
function acadLvl() { return G.biz ? G.biz.fac.youth || 0 : 0; }
function acadCap() { return ACAD_CAP; }
function acadPlayers() { const u = userTeam(); return u ? teamPlayers(u).filter(p => p.acad) : []; }
function acadEligible(p) {
  const u = userTeam();
  if (!p || p.tid !== u.id) return 'Hráč nie je v tvojom klube.';
  if (p.loan) return 'Hráč na hosťovaní nemôže ísť do akadémie.';
  if (p.age > ACAD_MAX_AGE) return `Do akadémie môžu len hráči do ${ACAD_MAX_AGE} rokov.`;
  return null;
}
// čakáreň – očistí neplatných hráčov (predaní, starší, už v akadémii)
function acadQueue() {
  const u = userTeam();
  G.acadQ = (G.acadQ || []).filter((id, i, a) => { const p = G.players[id]; return a.indexOf(id) === i && p && u && p.tid === u.id && !p.acad && !acadEligible(p); });
  return G.acadQ;
}
function inQueue(p) { return !!p && acadQueue().includes(p.id); }
function enterAcademy(p) {
  const u = userTeam();
  p.acad = true; p.acadD = 0; p.acadR0 = p.r; p.tp = p.tp || 0;
  G.acadQ = acadQueue().filter(id => id !== p.id);
  if (u.lineup.includes(p.id)) { u.lineup = u.lineup.map(id => (id === p.id ? -1 : id)); validateLineup(u); }
}
// pridá hráča do akadémie, alebo do čakárne, ak je akadémia plná
function acadAdd(p) {
  if (p.acad) return { err: 'Hráč už je v akadémii.' };
  const err = acadEligible(p);
  if (err) return { err };
  if (acadPlayers().length < ACAD_CAP) {
    if (availPlayers(userTeam()).length <= 12) return { err: 'Potrebuješ aspoň 11 hráčov na zápasy.' };
    enterAcademy(p);
    return { where: 'acad' };
  }
  const q = acadQueue();
  if (q.includes(p.id)) return { err: 'Hráč už čaká v čakárni.' };
  if (q.length >= ACAD_WAIT) return { err: `Akadémia (${ACAD_CAP}) aj čakáreň (${ACAD_WAIT}) sú plné.` };
  q.push(p.id);
  return { where: 'wait', pos: q.length };
}
function toAcademy(p) { const r = acadAdd(p); return r.err || null; }
function fromQueue(p) { G.acadQ = acadQueue().filter(id => id !== p.id); }
// do voľných miest nastúpia hráči z čakárne
function fillAcademy() {
  const u = userTeam();
  if (!u) return;
  const q = acadQueue();
  while (q.length && acadPlayers().length < ACAD_CAP && availPlayers(u).length > 12) {
    const p = G.players[q[0]];
    enterAcademy(p);
    news(`⏳ ${pFull(p)} nastúpil z čakárne do akadémie.`, 'good');
    q.splice(0, q.length, ...acadQueue());
  }
}
function fromAcademy(p, auto) {
  if (!p.acad) { fromQueue(p); return; }
  p.acad = false; p.acadD = 0;
  if (auto) {
    const gain = p.r - (p.acadR0 ?? p.r);
    news(`🎓 ${pFull(p)} ukončil ročník v akadémii a vrátil sa na lavičku${gain > 0 ? ` (sila ${p.acadR0} → ${p.r})` : ''}.`, 'good');
  }
  fillAcademy();
}
// tréningový pokrok za jeden ligový týždeň (100 = +1 sila)
function acadRate(p) {
  const gap = potOf(p) - p.r;
  if (gap <= 0) return 0;
  // ×1,1 vyrovná, že rozdiel do potenciálu sa počas sezóny zmenšuje
  return 100 * gap * devRate(p.age) * acadFactor() * 1.1 / ACAD_DAYS;
}
function acadFactor() { return 0.95 + 0.1 * acadLvl() + 0.08 * (G.biz ? G.biz.fac.dorm || 0 : 0); }
function acadDay() {
  for (const p of acadPlayers()) {
    p.s.ad = (p.s.ad || 0) + 1;
    p.acadD = (p.acadD || 0) + 1;
    p.xp = Math.min(100, (p.xp ?? 0) + 0.2);
    p.tp = (p.tp || 0) + acadRate(p) * U.rf(0.8, 1.2);
    while (p.tp >= 100 && p.r < potOf(p)) {
      p.tp -= 100; p.r++;
      news(`🎓 ${pFull(p)} sa v akadémii zlepšil na silu ${p.r}.`, 'good');
    }
    if (p.r >= potOf(p)) p.tp = 0;
  }
  for (const p of acadPlayers()) if (p.acadD >= ACAD_DAYS) fromAcademy(p, true);
  fillAcademy();
}

// ── Denné udalosti trhu ─────────────────────────────────────────
function marketDay(ev) {
  const u = userTeam();
  if (!u) return;
  bizDay(ev);
  if (ev && ev.t === 'L') {
    acadDay();
    const B = bTeam();
    book('wages', -(teamWageBill(u) + (B ? teamWageBill(B) : 0)));
    const sw = (G.scouts || []).reduce((a, s) => a + s.wage, 0);
    if (sw) book('scouts', -sw);
  }
  scoutDay(ev);
  if (windowNow().open) { genIncomingOffers(); aiTransferWindow(3); aiSignFreeAgents(); }
  expireOffers();
  clubDay(ev); peopleDay(ev); trainingDay(ev); careerDay(ev); lifeDayAll(); mafiaDay(ev);
  fin().bal.push(Math.round(u.budget));
}

// volá sa po posune dňa (aj na začiatku sezóny)
function dayStartEvents() {
  if (G.userTid == null || G.userTid < 0 || seasonOver()) return;
  const d = G.day;
  for (const w of seasonWindows()) {
    if (d === w[0]) {
      inboxAdd({ type: 'window', text: `${w[2]} prestupové okno je otvorené! Potrvá ${w[1] - w[0] + 1} hracích dní.` });
      aiRecruitAll();
      villageScout();
      if (w[0] === 0) bizSeasonStart();
      else if (G.biz) refreshOffers(false);
      markWantsOut();
      if (w[2] === 'Zimné') {
        const exp = teamPlayers(userTeam()).filter(p => !p.loan && contractLeft(p) <= 1);
        if (exp.length) inboxAdd({ type: 'contract', text: `Na konci sezóny končí zmluva hráčom: ${exp.map(pName).join(', ')}. Predĺž im zmluvu, inak odídu zadarmo.` });
      }
    }
    if (d === w[1]) inboxAdd({ type: 'window', text: `Posledný deň prestupového okna (${w[2].toLowerCase()})!` });
  }
  const u = userTeam();
  if (u.budget < 0 && d % 4 === 0) inboxAdd({ type: 'info', text: `Vedenie klubu: rozpočet je v mínuse (${U.money(u.budget)}). Predaj hráčov alebo zníž platy.` });
}

function markWantsOut() {
  for (const t of G.teams) {
    if (t.id === G.userTid) continue;
    const base = teamBase(t);
    const xi = new Set(t.lineup || []);
    for (const id of t.pids) {
      const p = G.players[id];
      if (!p || p.loan) continue;
      p.wo = !xi.has(p.id) && p.r >= base - 1 && p.age >= 20 && U.chance(0.18);
      p.listedAI = !p.wo && U.chance(0.04);
    }
  }
}

// ── Koniec sezóny – financie a staff ───────────────────────────
function financeSeasonEnd(oldLvl, pos, n) {
  const u = userTeam(), f = fin();
  bizSeasonEnd(pos, n, oldLvl);
  f.hist.unshift({ season: `${G.year}/${String((G.year + 1) % 100).padStart(2, '0')}`, ...f.cur, end: Math.round(u.budget) });
  if (f.hist.length > 12) f.hist.length = 12;
  f.cur = {}; f.bal = [];
  for (const t of G.teams) if (t.id !== G.userTid) t.budget = Math.round(t.budget * 0.85);
  for (const s of G.scouts || []) s.wage = U.nice(SCOUT_BASE[u.lvl] * Math.pow(s.q, 1.4));
  refreshScoutPool();
  for (const k in G.neg) delete G.neg[k];
  for (const p of G.players) if (p) { p.wo = false; p.listedAI = false; }
}

// ── Migrácia uložení z verzie 1 ─────────────────────────────────
function migrateSave() {
  if (G.v < 2) migrateV1();
  if (G.v < 3) { migrateBiz(); G.v = 3; }
  if (G.v < 5) {
    for (const p of G.players) { if (!p) continue; if (!p.ao) assignAttrs(p); else p.arch = matchStyle(p); p.ft = null; ensureProfile(p); }
    rerollPotentials(false); G.v = 5;
    if (G.userTid >= 0) inboxAdd({ type: 'info', text: 'Hráči majú nové profily: štýl hry, špeciality, silnejšiu a slabšiu nohu, triky a vedľajšie posty. Potenciály sú teraz primerané slovenským ligám – klenoty sú vzácne.' });
  }
  if (G.v < 6) {
    if (G.cup && !G.cups) {
      Object.assign(G.cup, { id: 'sp', grp: 'sp', kind: 'cup', byes: {}, runner: null, earn: 0, names: cupNames(G.cup.entrants.length) });
      G.cups = { sp: G.cup };
    }
    delete G.cup;
    for (const e of G.calendar || []) if (e.t === 'C' && !e.k) e.k = 'sp';
    G.v = 6;
    if (G.userTid >= 0) inboxAdd({ type: 'info', text: 'Nové súťaže! Od budúcej sezóny sa hrá veľký turnaj Slovak Classic pre všetky kluby Slovenska (prémie za každé víťazné kolo), Superpohár a regionálne poháre ZsFZ, SsFZ a VsFZ.' });
  }
  if (G.v < 7) {
    for (const p of G.players) if (p && p.xp == null) initXp(p, p.tid >= 0 ? G.teams[p.tid].lvl : 9, (p.c ? p.c.gp : 0) + (p.s ? p.s.gp : 0));
    G.v = 7;
    if (G.userTid >= 0) inboxAdd({ type: 'info', text: 'Novinky v tíme: 🎓 Akadémia pre hráčov do 21 rokov (rýchlejší rast, ale nehrajú), skúsenosti z ihriska zlepšujú výkon aj rozvoj hráčov a auto zostava teraz rozdeľuje hráčov podľa toho, čo daný post potrebuje.' });
  }  if (G.v < 8) {
    G.acadQ = G.acadQ || [];
    if (G.userTid >= 0) {
      const ps = acadPlayers().sort((a, b) => potGap(b) - potGap(a));
      ps.forEach((p, i) => { p.acadD = p.acadD ?? (p.s ? p.s.ad || 0 : 0); p.acadR0 = p.acadR0 ?? p.r; if (i >= ACAD_CAP) { p.acad = false; if (G.acadQ.length < ACAD_WAIT) G.acadQ.push(p.id); } });
    }
    G.v = 8;
  }  if (G.v < 9) {
    initFans();
    for (const p of G.players) if (p) { if (p.agg == null) initAgg(p); p.s.yc = p.s.yc || 0; p.s.rc = p.s.rc || 0; }
    for (const t of G.teams) { t.dis = t.dis || { y: 0, r: 0 }; t.inc = t.inc || 0; }
    if (G.biz && G.biz.mood == null) G.biz.mood = 60;
    G.v = 9;
    if (G.userTid >= 0) inboxAdd({ type: 'info', text: '🔥 Novinka: derby a rivalita, nálada a temperament fanúšikov, výtržnosti a žlté a červené karty s trestami.' });
  }  if (G.v < 10) {
    buildEuroTeams();
    G.euro = G.euro || null;
    G.v = 10;
    if (G.userTid >= 0) inboxAdd({ type: 'info', text: '🌍 Novinka: Liga majstrov, Európska liga a Konferenčná liga so zahraničnými klubmi. Hrajú od budúcej sezóny – majster Niké ligy ide do Ligy majstrov, víťaz pohára do Európskej ligy a ďalšie dva kluby do Konferenčnej ligy. Zahraničné kluby kupujú talenty a ty môžeš kupovať od nich.' });
  }  if (G.v < 11) {
    // realistický trh: dobrí voľní hráči si nájdu klub, zahraniční odídu do cudziny
    for (const id of G.freeAgents.slice()) {
      const p = G.players[id];
      if (!p || p.tid >= 0 || p.r < 58) continue;
      if (p.nat !== 'SVK' && p.r >= 62) { G.players[id] = null; continue; }
      aiFreeMove(p);
    }
    G.freeAgents = G.freeAgents.filter(id => G.players[id] && G.players[id].tid < 0);
    G.v = 11;
    if (G.userTid >= 0) inboxAdd({ type: 'info', text: '💶 Trh je realistickejší: hviezdy stoja desiatky miliónov, dobrí hráči bez zmluvy si rýchlo nájdu nový klub a voľní hráči si pýtajú podpisové.' });
  }  if (G.v < 12) {
    G.v = 12;
    if (G.userTid >= 0) inboxAdd({ type: 'info', text: '🆕 Novinky: vedenie klubu s cieľom a rozpočtom na platy, licencie, morálka a rozhovory s hráčmi, agenti a klauzuly, chémia a kapitán, reprezentácia, tréningový plán a realizačný tím, taktické pokyny a štandardky, počasie, rozhodcovia a VAR, tlačovky, B-tím, dorast U19, ženský tím, Sieň slávy, rekordy a retro dresy.' });
  }  if (G.v < 13) {
    G.v = 13;
    if (G.userTid >= 0) inboxAdd({ type: 'info', text: '🆕 Ďalšie novinky: šatňa cez polčas, sústredenie s prípravnými zápasmi, správy skautov, hodnota podľa formy a požiadavky na plat, osobné udalosti hráčov, sociálne siete, majiteľ klubu, stavebné povolenie a dotácie na štadión, xG, mapa striel a heatmapa, trénerské licencie a kariérne ciele, talenty z okresných turnajov a predzmluvy.' });
  }  if (G.v < 14) {
    G.v = 14;
    if (G.userTid >= 0) inboxAdd({ type: 'info', text: '🤝 Novinka: zmluva s vedením – rozpočet na prestupy, limit platov a tvoj plat. Na začiatku sezóny môžeš rokovať o lepších podmienkach a vedenie ti dáva úlohy na sezónu (Klub → Vedenie).' });
  }  if (G.v < 15) {
    G.v = 15;
    if (G.userTid >= 0) inboxAdd({ type: 'info', text: '🕶️ Novinka: záložka Mafia – kontakty v podsvetí, peniaze a služby za protislužby. Pozor: čím vyššia liga, tým skôr si to všimne polícia a súd.' });
  }  if (G.v < 16) {
    G.v = 16;
    if (typeof realizeEuroSquads === 'function') realizeEuroSquads();
    for (const t of G.teams) assignTeamDPs(t);
    if (G.userTid >= 0) inboxAdd({ type: 'info', text: '🌍 Zahraničné kluby majú skutočné súpisky a každý hráč má presný post (stopér, krajný obranca, krídlo…). Na svojom poste hrá naplno, mimo neho slabšie.' });
  }



}
function migrateV1() {
  G.seed = G.seed || U.ri(1, 1e9);
  for (const p of G.players) {
    if (!p) continue;
    if (!p.ao) assignAttrs(p);
    if (p.ce == null) initContract(p, p.tid >= 0 ? G.teams[p.tid].lvl : 9);
  }
  G.know = G.know || {}; G.scouts = G.scouts || []; G.scoutQueue = G.scoutQueue || []; G.inbox = G.inbox || [];
  G.short = G.short || []; G.tlog = G.tlog || []; G.neg = G.neg || {}; G.scouted = G.scouted || [];
  fin();
  const u = G.userTid >= 0 ? userTeam() : null;
  if (u) {
    if (!u.spons) u.spons = U.nice(teamWageBill(u) * 1.05);
    if (!G.scouts.length) G.scouts.push(genScout(2));
    if (!G.scoutPool) refreshScoutPool();
    inboxAdd({ type: 'info', text: 'Hra bola aktualizovaná: pribudli atribúty hráčov, skauting, zmluvy, platy, vyjednávanie, hosťovania a ponuky od klubov.' });
  }
  G.v = 2;
}

function setupCareerMarket() {
  const u = userTeam();
  setupBiz();
  G.scouts = [genScout(2)];
  refreshScoutPool();
  G.know = {}; G.scoutQueue = []; G.inbox = []; G.short = []; G.tlog = []; G.neg = {}; G.scouted = [];
  G.fin = { cur: {}, hist: [], bal: [Math.round(u.budget)] };
  const eu = typeof userEuro === 'function' ? userEuro().reduce((a, c) => a + (c.earn || 0), 0) : 0;
  if (eu) G.fin.cur.euro = eu;
  inboxAdd({ type: 'info', text: `Vitaj v klube ${u.name}! Máš jedného skauta – nastav mu misiu v záložke Skauting. Prestupové okno je otvorené.` });
  if (typeof licNotice === 'function') licNotice();
}
