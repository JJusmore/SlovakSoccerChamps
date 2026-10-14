'use strict';
// ─── Mimoriadne udalosti klubu: príležitosti aj nepríjemnosti, vždy s výberom ───

const EV_CAT = {
  stad: { n: 'Štadión', ic: '🏟️', c: '#5ab8ff' },
  team: { n: 'Tím', ic: '⚽', c: '#47e087' },
  city: { n: 'Mesto a fanúšikovia', ic: '🏘️', c: '#ffb02e' },
  media: { n: 'Médiá', ic: '📺', c: '#ff7bd5' },
  biz: { n: 'Biznis', ic: '💼', c: '#ffd23f' },
  trouble: { n: 'Problém', ic: '⚠️', c: '#ff5a5f' },
};
const EV_BANDS = ['skupiny Horalky', 'rockovej legendy Tatra Rock', 'DJ-a Lukasa', 'kapely Dolná Zem', 'speváčky Mileny', 'dychovky Veselá Muzika'];
const EV_LEGENDS = ['Jozef Kráľ', 'Marek Hudec', 'Peter Lipka', 'Ľubomír Novák', 'Ján Sokol', 'Róbert Mikula'];
const EV_ABROAD = ['Rakúsky', 'Český', 'Maďarský', 'Poľský', 'Slovinský'];

// e = { money, fans, att, fitXI, fitAll, fitP:[pid, v], xpYoung, tpAcad, rev, talent, gamble:{ p, lose } }
const EVENTS = [
  { k: 'concert', cat: 'stad', ic: '🎤', w: 3, make: c => ({ t: 'Koncert na štadióne', x: `Agentúra chce na tvojom štadióne usporiadať koncert ${U.pick(EV_BANDS)}. Príde veľa ľudí, no trávnik to odnesie.`,
    o: [['Veľký koncert na trávniku', { money: c.M(1.1), att: 0.85, fans: 0.01 }], ['Menší koncert pred štadiónom', { money: c.M(0.45) }], ['Odmietnuť', {}]] }) },
  { k: 'festival', cat: 'city', ic: '🎪', w: 2, make: c => ({ t: 'Mestské slávnosti', x: `Mesto ${c.u.city} hľadá miesto pre slávnosti a chce si prenajať tvoj areál.`,
    o: [['Prenajať areál', { money: c.M(0.35), fans: 0.02 }], ...(c.b.fac.cater ? [['Prenajať a otvoriť vlastné stánky', { money: c.M(0.35 + 0.12 * c.b.fac.cater), fans: 0.02, fitAll: -2 }]] : []), ['Odmietnuť', {}]] }) },
  { k: 'photo', cat: 'media', ic: '📸', w: 2, cond: c => !!c.star, make: c => ({ t: 'Reklamná kampaň', x: `Reklamná agentúra chce ${pFull(c.star)} do celoslovenskej kampane. Natáčanie ho však unaví.`,
    o: [['Súhlasiť', { money: c.M(0.45), fitP: [c.star.id, -10] }], ...(c.young ? [[`Navrhnúť mladého ${pName(c.young)}`, { money: c.M(0.15), fans: 0.005 }]] : []), ['Odmietnuť', {}]] }) },
  { k: 'friendly', cat: 'team', ic: '🤝', w: 2, cond: c => !!c.big, make: c => ({ t: 'Prípravný zápas', x: `${c.big.name} ťa pozýva na prípravný zápas a zaplatí štartovné.`,
    o: [['Zahrať s celým tímom', { money: c.M(0.7), fitXI: -8, xpYoung: 2 }], ['Poslať rezervu a mladých', { money: c.M(0.3), xpYoung: 3 }], ['Odmietnuť', {}]] }) },
  { k: 'charity', cat: 'city', ic: '💛', w: 2, make: c => ({ t: 'Charitatívny turnaj', x: `V meste ${c.u.city} sa hrá charitatívny turnaj pre detskú nemocnicu. Bez honoráru, ale ľudia to ocenia.`,
    o: [['Zúčastniť sa s celým tímom', { fans: 0.04, fitXI: -3 }], ['Poslať len trénera a kapitána', { fans: 0.015 }], ['Odmietnuť', {}]] }) },
  { k: 'patron', cat: 'biz', ic: '💰', w: 1.5, cond: c => c.u.lvl >= 3, make: c => ({ t: 'Dar od podnikateľa', x: `Miestny podnikateľ ${U.pick(FIRST_NAMES)} ${U.pick(SURNAMES)} chce klub finančne podporiť.`,
    o: [['Prijať dar', { money: c.M(0.9) }], ['Požiadať o viac', { money: c.M(1.6), gamble: { p: 0.45, lose: {} } }], ['Odmietnuť', {}]] }) },
  { k: 'tv', cat: 'media', ic: '📺', w: 1.5, cond: c => c.u.lvl >= 2 && c.u.lvl <= 6, make: c => ({ t: 'Prenos v televízii', x: 'Regionálna televízia chce vysielať tvoj najbližší domáci zápas naživo.',
    o: [['Súhlasiť', { money: c.M(0.55), fans: 0.01 }], ['Odmietnuť', {}]] }) },
  { k: 'camp', cat: 'team', ic: '🏕️', w: 2, make: c => ({ t: 'Letný detský kemp', x: 'Rodičia sa pýtajú na futbalový kemp pre deti na tvojom štadióne. Možno objavíš talent.',
    o: [['Usporiadať kemp', { money: c.M(0.25), fans: 0.02, talent: 0.25 }], ['Odmietnuť', {}]] }) },
  { k: 'legend', cat: 'team', ic: '🎓', w: 1.2, make: c => ({ t: 'Návšteva legendy', x: `Bývalý reprezentant ${U.pick(EV_LEGENDS)} ponúka týždeň tréningov s tvojimi mladými hráčmi.`,
    o: [['Pozvať ho', { money: -c.M(0.3), xpYoung: 4, tpAcad: 35 }], ['Odmietnuť', {}]] }) },
  { k: 'film', cat: 'media', ic: '🎬', w: 1, make: c => ({ t: 'Natáčanie seriálu', x: 'Televízia chce na štadióne natáčať scény do nového seriálu. Tréningy budú narušené.',
    o: [['Povoliť celý týždeň', { money: c.M(0.8), fitAll: -5 }], ['Len cez víkend', { money: c.M(0.35) }], ['Odmietnuť', {}]] }) },
  { k: 'beer', cat: 'biz', ic: '🍺', w: 1.2, make: c => ({ t: 'Pivný festival', x: 'Pivovar chce pri najbližšom domácom zápase usporiadať festival pred štadiónom.',
    o: [['Súhlasiť', { money: c.M(0.4), att: 1.12 }], ['Odmietnuť', {}]] }) },
  { k: 'bus', cat: 'city', ic: '🚌', w: 1.2, make: c => ({ t: 'Výjazd fanúšikov', x: 'Fanklub chce zorganizovať autobusy na zápas vonku a žiada klub o príspevok.',
    o: [['Zaplatiť autobusy', { money: -c.M(0.2), fans: 0.03 }], ['Zaplatiť polovicu', { money: -c.M(0.1), fans: 0.012 }], ['Odmietnuť', { fans: -0.01 }]], def: 2 }) },
  { k: 'youthcup', cat: 'team', ic: '🏆', w: 1, make: c => ({ t: 'Mládežnícky turnaj', x: 'Zväz ponúka tvojmu klubu usporiadať medzinárodný turnaj hráčov do 17 rokov.',
    o: [['Usporiadať turnaj', { money: -c.M(0.35), fans: 0.02, xpYoung: 3, talent: 0.2 }], ['Odmietnuť', {}]] }) },
  { k: 'storm', cat: 'trouble', ic: '⛈️', w: 1, make: c => ({ t: 'Búrka poškodila tribúnu', x: 'Silná búrka strhla časť strechy na tribúne. Bez opravy prídu na zápas menej ľudí.',
    o: [['Opraviť hneď', { money: -c.M(0.5) }], ['Počkať s opravou', { att: 0.8, fans: -0.01 }]], def: 1 }) },
  { k: 'pipe', cat: 'trouble', ic: '🚿', w: 0.9, make: c => ({ t: 'Havária v šatniach', x: 'Praskla voda v šatniach. Hráči sa nemajú kde poriadne pripraviť.',
    o: [['Zavolať firmu', { money: -c.M(0.25) }], ['Provizórne riešenie', { fitAll: -6 }]], def: 1 }) },
  { k: 'audit', cat: 'trouble', ic: '🧾', w: 0.7, make: c => ({ t: 'Kontrola licencie', x: 'Komisia zväzu našla nedostatky v dokumentácii klubu a navrhuje pokutu.',
    o: [['Zaplatiť pokutu', { money: -c.M(0.3) }], ['Odvolať sa', { gamble: { p: 0.45, lose: { money: -c.M(0.6) } } }]], def: 0 }) },
  { k: 'viral', cat: 'media', ic: '📱', w: 1, cond: c => !!c.star, make: c => ({ t: 'Virálne video', x: `Video, ako ${pName(c.star)} trafil na tréningu brvno z polovice ihriska, obletelo sociálne siete.`,
    o: [['Využiť na propagáciu', { fans: 0.03, money: c.M(0.1) }], ['Nechať tak', { fans: 0.01 }]], def: 1 }) },
  { k: 'esport', cat: 'biz', ic: '🎮', w: 0.8, make: c => ({ t: 'Turnaj vo FIFA', x: 'Študenti chcú v klubovni usporiadať turnaj vo futbalovej videohre.',
    o: [['Usporiadať', { money: c.M(0.15), fans: 0.01 }], ['Odmietnuť', {}]] }) },
  { k: 'marathon', cat: 'city', ic: '🏃', w: 0.9, make: c => ({ t: 'Mestský maratón', x: `Organizátori maratónu v meste ${c.u.city} chcú mať cieľ na tvojom štadióne.`,
    o: [['Súhlasiť', { money: c.M(0.3), att: 0.92 }], ['Odmietnuť', {}]] }) },
  { k: 'interview', cat: 'media', ic: '🎙️', w: 1, make: c => ({ t: 'Exkluzívny rozhovor', x: 'Celoštátne noviny chcú veľký rozhovor s trénerom o plánoch klubu.',
    o: [['Otvorený rozhovor', { fans: 0.015, rev: 0.02 }], ['Odmietnuť', {}]] }) },
  { k: 'kits', cat: 'biz', ic: '👕', w: 1, cond: c => c.b.fac.shop > 0 || !!c.b.sp.kit, make: c => ({ t: 'Veľká objednávka dresov', x: `Firma ${U.pick(SURNAMES)} ${U.pick(['Stavby', 'Transport', 'Elektro', 'Agro'])} objednala 200 dresov s logom klubu pre zamestnancov.`,
    o: [['Vybaviť objednávku', { money: c.M(0.3 + 0.06 * c.b.fac.shop) }], ['Odmietnuť', {}]] }) },
  { k: 'award', cat: 'media', ic: '🥇', w: 0.8, cond: c => !!c.star, make: c => ({ t: 'Hráč mesiaca', x: `${pFull(c.star)} vyhral anketu Hráč mesiaca. Fanúšikovia chcú oslavu.`,
    o: [['Oslava s fanúšikmi', { fans: 0.02, money: -c.M(0.05) }], ['Len gratulácia', {}]] }) },
  { k: 'abroad', cat: 'team', ic: '✈️', w: 0.7, cond: c => c.u.lvl <= 3, make: c => ({ t: 'Turnaj v zahraničí', x: `${U.pick(EV_ABROAD)} klub pozýva tvoj tím na víkendový turnaj a zaplatí cestu aj štartovné.`,
    o: [['Prijať pozvanie', { money: c.M(0.9), fitXI: -12, xpYoung: 2 }], ['Odmietnuť', {}]] }) },
  { k: 'xmas', cat: 'city', ic: '🎄', w: 1.5, cond: () => G.day >= seasonWindows()[1][0] - 4 && G.day <= seasonWindows()[1][1] + 2, make: c => ({ t: 'Vianočný večierok', x: 'Fanklub sa pýta, či klub tento rok zorganizuje vianočný večierok s hráčmi.',
    o: [['Veľká oslava', { money: -c.M(0.15), fans: 0.03 }], ['Skromný večierok', { fans: 0.01 }], ['Bez večierka', {}]] }) },
  { k: 'anniv', cat: 'city', ic: '🎂', w: 0.5, make: c => ({ t: 'Výročie klubu', x: 'Klub oslavuje okrúhle výročie založenia. Fanúšikovia čakajú veľkú oslavu.',
    o: [['Veľká oslava s legendami', { money: -c.M(0.15), fans: 0.05 }], ['Skromná oslava', { fans: 0.015 }], ['Bez oslavy', { fans: -0.01 }]], def: 2 }) },
  { k: 'school', cat: 'city', ic: '🏫', w: 1, make: c => ({ t: 'Deň otvorených dverí', x: 'Miestne školy by rady priviedli deti na prehliadku štadióna a tréning s hráčmi.',
    o: [['Zorganizovať', { money: -c.M(0.05), fans: 0.02, talent: 0.1 }], ['Odmietnuť', {}]] }) },
  { k: 'grass', cat: 'trouble', ic: '🌱', w: 0.6, cond: c => !(c.b.fac.heat > 0), make: c => ({ t: 'Choroba trávnika', x: 'Na trávniku sa objavila pliesňová choroba. Hrá sa naň horšie a vyzerá zle.',
    o: [['Položiť nový trávnik', { money: -c.M(0.4) }], ['Hrať aj tak', { att: 0.9, fitAll: -4 }]], def: 1 }) },
];

function evCtx() {
  const u = userTeam(), b = biz();
  const L = lwb(u.lvl);
  const own = availPlayers(u).filter(p => !p.loan);
  const star = own.slice().sort((a, c) => c.r - a.r)[0];
  const young = own.filter(p => p.age <= 21 && p !== star).sort((a, c) => c.r - a.r)[0];
  const bigs = G.teams.filter(t => t.lvl < u.lvl && t.lvl >= Math.max(1, u.lvl - 3));
  return { u, b, L, M: k => U.nice(L * k), star, young, big: bigs.length ? U.pick(bigs) : null };
}

function genDeal() {
  const b = biz();
  if (!b || b.deal) return;
  const c = evCtx();
  const hist = b.evHist || [];
  const list = EVENTS.filter(e => (!e.cond || e.cond(c)) && !hist.includes(e.k));
  if (!list.length) return;
  const e = U.weighted(list, x => x.w);
  const m = e.make(c);
  b.deal = { k: e.k, cat: e.cat, ic: e.ic, title: m.t, text: m.x, opts: m.o.map(([l, eff]) => ({ l, e: eff })), def: m.def ?? m.o.length - 1, id: U.ri(1, 1e9), exp: G.day + 3, year: G.year };
  b.evHist = hist.concat(e.k).slice(-6);
  inboxAdd({ type: 'deal', dealId: b.deal.id, deal: JSON.parse(JSON.stringify(b.deal)) });
}

// staré uložené ponuky (bez možností)
function dealOpts(d) {
  if (d.opts) return d.opts;
  const e = { money: d.amt || 0 };
  if (d.k === 'photo' && d.pid != null) e.fitP = [d.pid, -10];
  if (d.k === 'concert') e.att = 0.85;
  if (d.k === 'friendly') e.fitXI = -8;
  if (d.k === 'charity') e.fans = 0.04;
  if (d.k === 'camp') e.fans = 0.02;
  return [{ l: 'Prijať', e }, { l: 'Odmietnuť', e: {} }];
}

// popis následkov pred výberom: [trieda, text]
function effChips(e) {
  const out = [], pct = v => Math.round(Math.abs(v) * 100);
  if (e.gamble) out.push(['risk', `${pct(1 - e.gamble.p)} % šanca na úspech`]);
  if (e.money) out.push([e.money > 0 ? 'good' : 'bad', `${e.money > 0 ? '+' : '−'}${U.money(Math.abs(e.money))}`]);
  if (e.gamble && e.gamble.lose.money) out.push(['bad', `pri neúspechu −${U.money(-e.gamble.lose.money)}`]);
  if (e.fans) out.push([e.fans > 0 ? 'good' : 'bad', `${e.fans > 0 ? '+' : '−'}${pct(e.fans) || 1} % fanúšikov`]);
  if (e.att) out.push([e.att > 1 ? 'good' : 'bad', `${e.att > 1 ? '+' : '−'}${pct(e.att - 1)} % divákov na najbližšom domácom zápase`]);
  if (e.fitXI) out.push(['bad', `−${-e.fitXI} % kondície zostavy`]);
  if (e.fitAll) out.push(['bad', `−${-e.fitAll} % kondície celého kádra`]);
  if (e.fitP) { const p = G.players[e.fitP[0]]; out.push(['bad', `−${-e.fitP[1]} % kondície (${p ? pName(p) : 'hráč'})`]); }
  if (e.xpYoung) out.push(['good', `+${e.xpYoung} skúsenosti mladým`]);
  if (e.tpAcad) out.push(['good', `+${e.tpAcad} % tréningu v akadémii`]);
  if (e.rev) out.push(['good', 'lepšie ponuky sponzorov']);
  if (e.talent) out.push(['good', `${pct(e.talent)} % šanca objaviť talent`]);
  if (!out.length) out.push(['none', 'bez následkov']);
  return out;
}

// vykoná následky, vráti zoznam výsledkov
function applyEff(e) {
  const b = biz(), u = userTeam(), res = [];
  if (e.gamble) {
    if (U.chance(e.gamble.p)) { res.push(['bad', 'Nevyšlo to.']); return res.concat(applyEff(e.gamble.lose)); }
    res.push(['good', 'Vyšlo to!']);
  }
  if (e.money) { book(e.money > 0 ? 'events' : 'eventx', e.money); res.push([e.money > 0 ? 'good' : 'bad', `${e.money > 0 ? '+' : '−'}${U.money(Math.abs(e.money))}`]); }
  if (e.fans) { const n = Math.round(b.fans * e.fans) || (e.fans > 0 ? 1 : -1); b.fans = Math.max(1, b.fans + n); res.push([n > 0 ? 'good' : 'bad', `${n > 0 ? '+' : '−'}${Math.abs(n).toLocaleString('sk-SK')} fanúšikov`]); }
  if (e.att) { b.attMalus = (b.attMalus || 1) * e.att; res.push([e.att > 1 ? 'good' : 'bad', `${e.att > 1 ? '+' : '−'}${Math.round(Math.abs(e.att - 1) * 100)} % divákov na najbližšom domácom zápase`]); }
  const fit = (ps, v) => { for (const p of ps) if (p) p.fit = U.clamp(p.fit + v, 25, 100); };
  if (e.fitXI) { fit(u.lineup.map(id => G.players[id]), e.fitXI); res.push(['bad', `zostava −${-e.fitXI} % kondície`]); }
  if (e.fitAll) { fit(teamPlayers(u), e.fitAll); res.push(['bad', `káder −${-e.fitAll} % kondície`]); }
  if (e.fitP) { const p = G.players[e.fitP[0]]; if (p && p.tid === u.id) { fit([p], e.fitP[1]); res.push(['bad', `${pName(p)} −${-e.fitP[1]} % kondície`]); } }
  if (e.xpYoung) { const ys = teamPlayers(u).filter(p => p.age <= 21); for (const p of ys) p.xp = Math.min(100, (p.xp || 0) + e.xpYoung); if (ys.length) res.push(['good', `${ys.length} mladých hráčov +${e.xpYoung} skúsenosti`]); }
  if (e.tpAcad) { const as = acadPlayers(); for (const p of as) if (p.r < potOf(p)) p.tp = Math.min(99, (p.tp || 0) + e.tpAcad); if (as.length) res.push(['good', `akadémia +${e.tpAcad} % tréningu`]); }
  if (e.rev) { b.rev = U.nice(b.rev * (1 + e.rev)); res.push(['good', 'sponzori ponúknu viac']); }
  if (e.talent && U.chance(e.talent)) {
    const p = genPlayer(u.id, U.pick(['DF', 'MF', 'FW', 'MF']), LEVEL_INFO[u.lvl].base - 6, { young: true, hu: u.hu });
    p.age = 16; p.pot = rollPotential(16, p.r, teamBase(u) + 6, 2);
    u.pids.push(p.id);
    res.push(['good', `objavil si talent: ${pFull(p)} (16 r.)`]);
    news(`🌟 Objavil si talent ${pFull(p)} (${POS_NAME_SK[p.pos]}, 16 r.) – pridal sa ku klubu.`, 'good');
  }
  if (!res.length) res.push(['none', 'bez následkov']);
  return res;
}

function setDealStatus(id, st, choice, res) {
  for (const m of G.inbox || []) if (m.type === 'deal' && m.dealId === id) { m.status = st; if (choice != null) m.choice = choice; if (res) m.res = res; }
}
function pickDeal(i) {
  const b = biz(), d = b && b.deal;
  if (!d) return { err: 'Ponuka už neplatí.' };
  const opts = dealOpts(d), o = opts[i];
  if (!o) return { err: 'Neplatná voľba.' };
  const res = applyEff(o.e);
  setDealStatus(d.id, 'accepted', i, res);
  b.deal = null;
  return { label: o.l, res };
}
function acceptDeal() { const r = pickDeal(0); return r.err || null; }
// asistent vyberie najvýhodnejšiu možnosť (peniaze, fanúšikovia, diváci, kondícia, mladí)
function effScore(e) {
  if (!e) return 0;
  const unit = Math.max(1, lwb(userTeam().lvl));
  const base = x => (x.money || 0) / unit + (x.fans || 0) * 40 + (x.att ? (x.att - 1) * 10 : 0) + (x.fitXI || 0) * 0.08 + (x.fitAll || 0) * 0.1 + (x.fitP ? x.fitP[1] * 0.03 : 0)
    + (x.xpYoung || 0) * 0.3 + (x.tpAcad || 0) * 0.05 + (x.rev || 0) * 20 + (x.talent || 0) * 2;
  return e.gamble ? (1 - e.gamble.p) * base(e) + e.gamble.p * base(e.gamble.lose) : base(e);
}
function autoDeal() {
  const b = biz(), d = b && b.deal;
  if (!d) return null;
  const opts = dealOpts(d);
  let bi = 0;
  opts.forEach((o, i) => { if (effScore(o.e) > effScore(opts[bi].e)) bi = i; });
  const r = pickDeal(bi);
  return r.err ? null : { title: d.title || 'Udalosť', label: r.label };
}
function declineDeal() { const b = biz(); if (b && b.deal) pickDeal(dealOpts(b.deal).length - 1); }
// vypršanie – pri problémoch sa stane predvolená (horšia) možnosť
function expireDeal() {
  const b = biz(), d = b.deal;
  if (!d) return;
  const opts = dealOpts(d), i = d.def ?? opts.length - 1, o = opts[i];
  const res = o && (d.cat === 'trouble' || Object.keys(o.e).length) ? applyEff(o.e) : null;
  setDealStatus(d.id, 'expired', i, res);
  if (d.cat === 'trouble' && res) news(`${d.title}: nerozhodol si sa včas – ${o.l.toLowerCase()}.`, 'bad');
  b.deal = null;
}
