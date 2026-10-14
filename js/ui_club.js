'use strict';
// ─── Obrazovky: Klub (vedenie, mládež a ženy, história), Tréning, rozhovory, tlačovky ───

const confCol = v => (v >= 70 ? '#2ecc71' : v >= 45 ? '#ffd23f' : v >= 25 ? '#ff9f43' : '#ff5a5f');
function confBar(v) { return `<div class="bconf"><div class="bc-bar"><i style="width:${Math.round(v)}%;background:${confCol(v)}"></i></div><b style="color:${confCol(v)}">${Math.round(v)} %</b></div>`; }
const okIc = ok => (ok ? '<i class="ok">✔</i>' : '<i class="no">✖</i>');

// ── Spoločné prvky rozhrania ───────────────────────────────────
// prepínač s rovnako širokými tlačidlami: items = [label] alebo [[value, label, tip]]
function seg(items, cur, act, extra = '', cls = '') {
  return `<div class="seg ${cls}">${items.map((it, i) => { const [v, l, tip] = Array.isArray(it) ? it : [i, it]; return `<button class="${String(cur) === String(v) ? 'on' : ''}" data-a="${act}" data-v="${v}" ${extra}${tip ? ` title="${U.esc(tip)}"` : ''}>${l}</button>`; }).join('')}</div>`;
}
const frow = (label, inner) => `<div class="frow"><label>${label}</label><div class="frow-c">${inner}</div></div>`;
const tile = (label, value, sub = '', cls = '') => `<div class="tile ${cls}"><small>${label}</small><b>${value}</b>${sub ? `<em>${sub}</em>` : ''}</div>`;
function meter(v, max, col) { const p = max > 0 ? U.clamp(v / max * 100, 0, 100) : 0; return `<div class="meter"><i style="width:${p.toFixed(1)}%;${col ? `background:${col}` : ''}"></i></div>`; }
const starsH = q => `<span class="stars">${'★'.repeat(q)}<i>${'★'.repeat(5 - q)}</i></span>`;

// ── Klub ───────────────────────────────────────────────────────
const CLUB_SUB = [['main', '🏟️ Klub'], ['board', '🏛️ Vedenie'], ['youth', '🌱 Mládež a ženy'], ['hist', '📜 História']];
function tabClub() {
  const sub = UI.clubSub || 'main';
  const body = sub === 'board' ? clubBoardHTML() : sub === 'youth' ? clubYouthHTML() : sub === 'hist' ? clubHistHTML() : clubMainHTML();
  return `${seg(CLUB_SUB, sub, 'clubSub', '', 'subtabs')}${body}`;
}

// úlohy: počet splnených (bez hlavného cieľa)
function objCount() { const os = board().objs.filter(o => o.k !== 'league'); return { done: os.filter(o => objState(o, false).done === true).length, n: os.length }; }
function objRow(o) {
  const s = objState(o, false), lg = o.k === 'league';
  const lgOn = lg && ulRow().p > 0;
  const st = s.done === true ? '<b class="ob-st ok">✔</b>' : s.done === false ? '<b class="ob-st no">✖</b>' : lgOn ? `<b class="ob-st ${s.pct >= 1 ? 'ok' : 'no'}">${s.cur}.</b>` : '<b class="ob-st wait">⏳</b>';
  const val = lg ? (lgOn ? `${s.cur}. / ${s.t}.` : `cieľ ${s.t}.`) : o.k === 'profit' ? U.money(s.cur) : o.k === 'sell' ? `${U.money(s.cur)}` : o.k === 'wage' || o.k === 'derby' || o.k === 'euro' ? '' : `${typeof s.cur === 'number' ? s.cur.toLocaleString('sk-SK') : s.cur} / ${s.t.toLocaleString('sk-SK')}`;
  const rw = lg ? 'hlavný cieľ' : o.must ? `−${objPenalty(o)} % dôvery` : `+${U.money(objReward(o).cash)}`;
  return `<div class="obj ${o.must ? 'must' : ''}"><span class="ob-ic">${objIc[o.k]}</span><div class="ob-t"><b>${U.esc(s.txt)}</b><small>${o.must ? '<i class="ob-m">povinná</i>' : ''}${rw}</small></div><div class="ob-p">${meter(lg && !lgOn ? 0 : s.pct, 1, s.done === false ? '#ff5a5f' : s.pct >= 1 ? '#2ecc71' : '#5ab8ff')}<small>${val}</small></div>${st}</div>`;
}
function dealCard() {
  const b = board(), d = b.deal, u = userTeam(), bill = teamWageBill(u), left = tbLeft(), tot = d.tb + 0.5 * (b.sales || 0);
  const act = negOpen() ? `<div class="m-btns"><button class="btn btn-ghost sm" data-a="dealOk">Prijať návrh</button><button class="btn btn-go sm" data-a="dealNeg">🤝 Rokovať</button></div>` : `<div class="deal-st">${d.neg ? '✔ Dohodnuté na sezónu ' + seasonTxt() : 'Rokovať môžeš na začiatku sezóny'}</div><div class="m-btns"><button class="btn btn-ghost sm" data-a="askCap" ${(b.wAskY === G.year && b.wAsk >= 2) ? 'disabled' : ''}>🏛️ Požiadať o vyšší limit platov</button></div>`;
  return `<div class="card deal"><div class="card-h">🤝 Zmluva s vedením <span class="muted">${seasonTxt()}</span></div>
<div class="dl-row"><span>Rozpočet na prestupy</span><b>${U.money(Math.max(0, left))}</b><em>z ${U.money(tot)}</em>${meter(Math.max(0, left), tot || 1, left < 0 ? '#ff5a5f' : '#2ecc71')}</div>
<div class="dl-row"><span>Platy hráčov</span><b>${wk(bill)}</b><em>limit ${wk(b.wageCap)}</em>${meter(bill, b.wageCap, bill > b.wageCap ? '#ff5a5f' : '#5ab8ff')}</div>
<div class="stgrid three">${tile('Tvoj plat', wk(d.sal))}${tile('Prémia za úlohu', U.money(d.bonus))}${tile('Tvoje úspory', U.money(G.coachCash || 0))}</div>
${act}</div>`;
}
function clubBoardHTML() {
  const b = board(), row = ulRow(), oc = objCount();
  const sfz = licCheck('sfz'), uefa = licCheck('uefa');
  const lic = (n, L, note) => `<div class="card"><div class="card-h">${n} ${L.ok ? '<span class="tag ok">splnená</span>' : '<span class="tag no">nesplnená</span>'}</div>${L.items.map(i => `<div class="kv lic"><span>${okIc(i.ok)} ${i.n}</span>${i.ok || !i.k ? '' : `<button class="link" data-a="facFocus" data-v="${i.k}">Postaviť ›</button>`}</div>`).join('')}<p class="muted small">${note}</p></div>`;
  return `<div class="stgrid four">${tile('Dôvera vedenia', `<span style="color:${confCol(b.conf)}">${Math.round(b.conf)} %</span>`, meter(b.conf, 100, confCol(b.conf)))}${tile('Cieľ sezóny', `do ${b.goal.target}. miesta`, BOARD_GOALS[b.goal.k])}${tile('Teraz', row.p ? `<span class="${row.pos <= b.goal.target ? 'pos' : 'neg'}">${row.pos}. miesto</span>` : '—', row.p ? `${row.pts} b. · ${row.p} z.` : 'sezóna sa ešte nezačala')}${tile('Úlohy splnené', `${oc.done}/${oc.n}`, '+ hlavný cieľ')}</div>
${b.sacked ? '<div class="neg-msg">Vedenie ťa odvolalo.</div>' : b.conf < 30 ? '<div class="neg-msg warn">Vedenie stráca trpezlivosť.</div>' : ''}
${b.offers && b.offers.length ? jobsCard(b.offers, b.sacked) : ''}
<div class="grid2 eq"><div>${dealCard()}</div><div class="card"><div class="card-h">🎯 Úlohy na sezónu</div><div class="objs">${b.objs.map(objRow).join('')}</div></div></div>
<div class="grid2 eq">${ownerLicHTML()}</div>
<div class="grid2 eq">${lic('📋 Licencia SFZ', sfz, 'Povinná pre Niké ligu – inak pokuta a −3 body.')}${lic('🇪🇺 Licencia UEFA', uefa, 'Bez nej nemôžeš hrať európske poháre.')}</div>
${b.hist.length ? `<div class="card"><div class="card-h">Hodnotenie sezón</div><table class="tbl"><tr><th class="tl">Sezóna</th><th class="tl">Cieľ</th><th>Miesto</th><th></th><th>Úlohy</th><th>Dôvera</th></tr>${b.hist.map(h => `<tr><td class="tl">${h.season}</td><td class="tl">${h.goal}</td><td>${h.pos}.</td><td>${okIc(h.met)}</td><td>${h.objs || '—'}</td><td>${h.conf} %</td></tr>`).join('')}</table></div>` : ''}`;
}

// ── Rokovanie s vedením ───────────────────────────────────────
function openBoardNeg() {
  const b = board(), d = b.deal;
  if (!negOpen()) { toast('Rokovať s vedením môžeš len na začiatku sezóny.', 'bad'); return; }
  const P = { tb: d.tb, wc: d.wc, sal: d.sal };
  const R = { tb: [d.tb0 * 0.5, d.tb0 * 2], wc: [d.wc0 * 0.9, d.wc0 * 1.35], sal: [d.sal0 * 0.6, d.sal0 * 2] };
  const st = k => niceStep(Math.max(10, (k === 'tb' ? d.tb0 : k === 'wc' ? d.wc0 : d.sal0) * 0.025));
  const fmt = (k, v) => (k === 'tb' ? U.money(v) : wk(v));
  const rows = [['tb', '💼 Rozpočet na prestupy', d.tb0], ['wc', '📋 Limit platov hráčov', d.wc0], ['sal', '👤 Tvoj plat', d.sal0]];
  const reply = () => {
    const lv = negLevel(P), t = negTerms(lv);
    const cls = lv <= 0 ? 'good' : lv < 3 ? 'mid' : 'bad';
    const head = lv === -1 ? '✔ Vedenie súhlasí' : lv === 0 ? '✔ Vedenie súhlasí' : lv < 3 ? '≈ Vedenie súhlasí, ak:' : '✖ Vedenie odmietne';
    return `<div class="ng-chance ${cls}">${head}</div>${lv < 3 && t.length ? `<ul class="neg-terms">${t.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}`;
  };
  const html = () => `<h3>🤝 Rokovanie s vedením</h3>
${rows.map(([k, n, base]) => { const dis = k === 'tb' && !d.tb0; return `<div class="bn-row"><div class="bn-h"><span>${n}</span><b id="bn_${k}">${fmt(k, P[k])}</b></div>
<input type="range" class="ng-range" id="bnr_${k}" min="${roundTo(R[k][0], st(k))}" max="${roundTo(R[k][1], st(k))}" step="${st(k)}" value="${P[k]}" ${dis ? 'disabled' : ''}>
<small class="muted">návrh vedenia ${fmt(k, base)}${dis ? ' · klub je v mínuse' : ''}</small></div>`; }).join('')}
<div id="bnReply">${reply()}</div>
<div class="ng-tries">Trpezlivosť vedenia: ${'●'.repeat(Math.max(0, 3 - d.tries))}${'○'.repeat(Math.min(3, d.tries))}</div>
<div class="m-btns"><button class="btn btn-ghost" data-m="x">Zrušiť</button><button class="btn btn-go" data-m="send">Navrhnúť</button></div>`;
  const m = modal(html(), {
    cls: 'bneg',
    on: k => {
      if (k !== 'send') return;
      const r = negotiate(P);
      if (r.res === 'ok') { toast('🤝 Dohoda s vedením podpísaná.', 'good'); saveGame(); rerenderAny(); return; }
      if (r.res === 'angry') { toast('Vedenie rokovanie ukončilo – platí jeho návrh.', 'bad'); saveGame(); rerenderAny(); return; }
      toast('Vedenie návrh odmietlo.', 'bad');
      m.el.querySelector('.modal').innerHTML = html(); bind();
      return false;
    },
  });
  const bind = () => rows.forEach(([k]) => {
    const r = m.el.querySelector('#bnr_' + k);
    r.addEventListener('input', () => { P[k] = +r.value; m.el.querySelector('#bn_' + k).textContent = fmt(k, P[k]); m.el.querySelector('#bnReply').innerHTML = reply(); });
  });
  bind();
}
// výzva na Prehľade
function boardPromptCard() {
  if (G.userTid < 0 || !negOpen()) return '';
  const d = deal();
  return `<div class="card bprompt"><div class="card-h">🤝 Vedenie čaká na rokovanie <span class="muted">${seasonTxt()}</span></div>
<div class="stgrid three">${tile('Na prestupy', U.money(d.tb0))}${tile('Limit platov', wk(d.wc0))}${tile('Tvoj plat', wk(d.sal0))}</div>
<div class="m-btns"><button class="btn btn-ghost sm" data-a="dealOk">Prijať návrh</button><button class="btn btn-go sm" data-a="dealNeg">🤝 Rokovať</button></div></div>`;
}
function jobsCard(ids, sacked) {
  return `<div class="card jobs"><div class="card-h">${sacked ? '📨 Ponuky práce' : '📨 Ponuky z iných klubov'}</div>${ids.map(id => { const t = G.teams[id]; return `<div class="job">${crestSVG(t, 34)}<div><b>${U.esc(t.name)}</b><small>${leagueOf(t).name} · OVR ${teamRating(t)}</small></div><button class="btn btn-go sm" data-a="jobTake" data-id="${t.id}">Prijať</button></div>`; }).join('')}</div>`;
}

function clubYouthHTML() {
  const u = userTeam(), y = u19(), tb = u19Table(y), B = bTeam(), w = wom();
  const sc = Object.entries(y.sc).map(([id, n]) => [G.players[id], n]).filter(([p]) => p).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const yt = `<div class="card"><div class="card-h">🌱 ${y.name} <span class="muted">${y.cur}/${y.rounds.length} kôl</span></div>
<table class="tbl mini"><tr><th>#</th><th class="tl">Klub</th><th>Z</th><th>Skóre</th><th>B</th></tr>${tb.map((r, i) => { const t = G.teams[r.tid]; return `<tr class="${r.tid === u.id ? 'me' : ''}"><td>${i + 1}</td><td class="tl">${teamTag(t, 16)}</td><td>${r.p}</td><td>${r.gf}:${r.ga}</td><td><b>${r.pts}</b></td></tr>`; }).join('')}</table>
<div class="kv"><span>Sila dorastu</span><b>${ovr(Math.round(u19Rating()))}</b></div>
${sc.length ? `<div class="kv"><span>Strelci</span><b>${sc.map(([p, n]) => `${U.esc(pName(p))} ${n}`).join(', ')}</b></div>` : ''}
${y.cup ? `<div class="kv"><span>🏆 Letný turnaj</span><b class="${y.cup.won ? 'pos' : ''}">${y.cup.won ? 'Víťaz!' : 'Víťaz: ' + U.esc(y.cup.winner)}</b></div>` : ''}</div>`;
  let bt;
  if (B) {
    const ps = sortSquad(teamPlayers(B)), row = leagueTable(leagueOf(B)).findIndex(r => r.tid === B.id) + 1;
    bt = `<div class="card"><div class="card-h">🅱️ ${U.esc(B.name)} <span class="muted">${leagueOf(B).name} · ${row}. miesto</span></div>
<div class="xlist scroll">${ps.map(p => `<div class="xr bt" data-a="player" data-id="${p.id}">${dpBadge(p)}<div class="xr-n"><b>${U.esc(pFull(p))}</b><small>${p.age} r. · ${p.s.gp} z · ${p.s.g} g</small></div>${ovr(p.r)}${potTxt(p, true)}<button class="btn btn-blue sm xr-b" data-a="toA" data-id="${p.id}" title="Do A-tímu">↑ A-tím</button></div>`).join('')}</div></div>`;
  } else bt = `<div class="card"><div class="card-h">🅱️ B-tím</div>${G.bPending === G.year ? '<p class="pos">Začína hrať od budúcej sezóny.</p>' : `<p class="muted small">Mladí hráči dostanú zápasy v najnižšej súťaži regiónu.</p><button class="btn btn-go sm" data-a="foundB">Založiť B-tím · ${U.money(bCost())}</button>`}</div>`;
  let wt;
  if (w) {
    const tw = u19Table(w);
    wt = `<div class="card"><div class="card-h">👩 Ženský tím <span class="muted">Liga žien · ${w.cur}/${w.rounds.length}</span></div>
<table class="tbl mini"><tr><th>#</th><th class="tl">Klub</th><th>Z</th><th>Skóre</th><th>B</th></tr>${tw.map((r, i) => `<tr class="${r.i === 0 ? 'me' : ''}"><td>${i + 1}</td><td class="tl">${U.esc(w.teams[r.i].n)}</td><td>${r.p}</td><td>${r.gf}:${r.ga}</td><td><b>${r.pts}</b></td></tr>`).join('')}</table>
<div class="kv"><span>Podpora klubu</span><b>${'★'.repeat(G.womOn.sup)}${'☆'.repeat(3 - G.womOn.sup)}</b></div><div class="kv"><span>Náklady</span><b>${wk(womWeekly())}</b></div>
${G.womOn.sup < 3 ? `<button class="btn btn-blue sm" data-a="supWomen">Podporiť · ${U.money(U.nice(womCost() * (G.womOn.sup + 1) * 0.8))}</button>` : ''}</div>`;
  } else wt = `<div class="card"><div class="card-h">👩 Ženský tím</div><p class="muted small">Viac fanúšikov a lepšia povesť u sponzorov.</p><button class="btn btn-go sm" data-a="foundWomen">Založiť · ${U.money(womCost())}</button></div>`;
  return `<div class="grid2"><div>${yt}</div><div>${bt}${wt}</div></div>`;
}

function clubHistHTML() {
  const u = userTeam(), R = rec(), leg = legends(), an = anniversary(u);
  const rr = (n, v) => `<div class="kv"><span>${n}</span><b>${v || '—'}</b></div>`;
  return `<div class="grid2 eq"><div>
<div class="card"><div class="card-h">🎂 ${U.esc(u.name)} <span class="muted">založený ${founded(u)}</span></div>
${an ? `<div class="anniv">🎉 ${an}. výročie klubu!</div>` : ''}
${retroOn() ? '<p class="pos">👕 Retro dres je v predaji – viac suvenírov.</p>' : `<p class="muted small">Retro dres na sezónu: viac predaných suvenírov${an ? ' (k výročiu ešte viac)' : ''}.</p><button class="btn btn-blue sm" data-a="retro">Retro dres · ${U.money(retroCost())}</button>`}</div>
<div class="card"><div class="card-h">📈 Rekordy</div>
${rr('Najvyššia výhra', R.bigW && `${R.bigW.s} · ${U.esc(R.bigW.opp)} (${R.bigW.y})`)}${rr('Najvyššia prehra', R.bigL && `${R.bigL.s} · ${U.esc(R.bigL.opp)} (${R.bigL.y})`)}
${rr('Návštevnosť', R.att && `${R.att.n.toLocaleString('sk-SK')} · ${U.esc(R.att.opp)} (${R.att.y})`)}${rr('Séria bez prehry', R.unbB && `${R.unbB.n} zápasov (${R.unbB.y})`)}
${rr('Séria výhier', R.winB && `${R.winB.n} zápasov (${R.winB.y})`)}${rr('Najviac gólov v sezóne', R.sg && `${U.esc(R.sg.name)} · ${R.sg.n} (${R.sg.y})`)}</div>
<div class="card"><div class="card-h">🏛️ Sieň slávy <span class="muted">100+ zápasov alebo 35+ gólov</span></div>
${leg.length ? `<div class="plist">${leg.map(h => `<div class="prow ${G.players[h.pid] && G.players[h.pid].tid === u.id ? '' : 'gone'}" ${G.players[h.pid] ? `data-a="player" data-id="${h.pid}"` : ''}>${posBadge(h.pos)}<span class="pr-n">${U.esc(h.n)} <small class="muted">${h.y0}${h.y1 ? '–' + h.y1 : '–'}</small></span><span class="muted small">${h.gp} z · ${h.g} g · ${h.a} a</span>${h.y1 ? '' : '<b class="leg-now">v klube</b>'}</div>`).join('')}</div>` : '<p class="muted">Zatiaľ žiadna legenda.</p>'}</div></div>
<div>${goalsHTML()}</div>
<div class="card wide"><div class="card-h">Kariéra trénera</div>
<table class="tbl"><tr><th>Sezóna</th><th class="tl">Klub</th><th class="tl">Súťaž</th><th>Miesto</th><th>B</th><th class="hm">V-R-P</th><th class="hm">Skóre</th><th class="hm">Pohár</th><th class="hm">Classic</th><th class="hm">Európa</th><th class="hm tl">Strelec</th></tr>
${G.history.slice().reverse().map(h => `<tr><td>${h.season}</td><td class="tl">${U.esc(h.club || u.name)}</td><td class="tl">${h.league}</td><td><b>${h.pos}.</b></td><td>${h.pts}</td><td class="hm">${h.w}-${h.d}-${h.l}</td><td class="hm">${h.gf}:${h.ga}</td><td class="hm">${h.cup}</td><td class="hm">${h.cls || '—'}</td><td class="hm">${h.eu || '—'}</td><td class="hm tl">${U.esc(h.scorer)}</td></tr>`).join('') || '<tr><td colspan="11" class="muted">Prvá sezóna práve prebieha.</td></tr>'}</table></div></div>`;
}

// ── Tréning ────────────────────────────────────────────────────
const ZONE_TXT = { lo: ['Nízka', '#5ab8ff', 'pomalší rozvoj'], ok: ['Optimálna', '#2ecc71', ''], hi: ['Vysoká', '#ff9f43', 'únava, viac zranení'], vhi: ['Preťaženie', '#ff5a5f', 'veľa zranení, zlá nálada'] };
function tabTraining() {
  const t = trn(), st = staff(), u = userTeam(), its = itPlayers(), slots = itSlots(), L = trLoad(), z = loadZone(), [zn, zc, zt] = ZONE_TXT[z];
  cohCheck();
  const opt = cur => Object.entries(TR_SESS).map(([k, [ic, n]]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${ic} ${n}</option>`).join('');
  const days = t.plan.map((k, i) => `<label class="trd"><small>${TR_DAYS[i]}</small><select class="inp" data-c="trSlot" data-i="${i}">${opt(k)}</select><em><b class="${TR_SESS[k][2] > 0 ? 'neg' : 'pos'}">${TR_SESS[k][2] > 0 ? '+' : ''}${TR_SESS[k][2]}</b> ${TR_SESS[k][4]}</em></label>`).join('');
  const lp = U.clamp(L / 16 * 100, 0, 100);
  const plan = `<div class="card"><div class="card-h">📅 Týždenný plán <span class="muted">5 tréningov medzi zápasmi</span></div>
<div class="tr-days">${days}</div>
<div class="tr-load"><div class="tl-h"><span>Záťaž</span><b style="color:${zc}">${String(L).replace('.', ',')} · ${zn}</b>${zt ? `<em>${zt}</em>` : ''}</div>
<div class="tl-bar"><i class="z-lo" style="width:${LOAD_LO / 16 * 100}%"></i><i class="z-ok" style="width:${(LOAD_HI - LOAD_LO) / 16 * 100}%"></i><i class="z-hi" style="width:${2 / 16 * 100}%"></i><i class="z-vhi"></i><b style="left:${lp}%"></b></div></div>
${frow('Intenzita', seg(TR_INT.map((n, i) => [i, n, ['Menej zranení, pomalší rozvoj', 'Bežná', 'Rýchlejší rozvoj, viac únavy a zranení'][i]]), t.int, 'trInt'))}
<div class="stgrid four">${tile('Rozvoj', `${Math.round(trDayF() * 100)} %`)}${tile('Kondícia', `${trFitDay() >= 0 ? '+' : ''}${Math.round(trFitDay())}/deň`)}${tile('Zranenia', `×${trInjF(u).toFixed(2).replace('.', ',')}`)}${tile('Zohratosť', `${Math.round(t.coh)} %`, meter(t.coh, 100, '#5ab8ff'))}</div>
<p class="muted small tr-note">Zmena formácie zníži zohratosť o 22 %, zmena štýlu o 10 %.</p></div>`;
  const perks = `<div class="card"><div class="card-h">🏅 Tímové perky <span class="muted">body z tréningov · po sezóne ostane polovica</span></div><div class="xlist">${Object.entries(TR_PERKS).map(([k, [ic, n, d]]) => {
    const v = Math.round(t.pts[k] || 0), lv = perkLv(k), nx = PERK_T[lv];
    return `<div class="xr perk lv${lv}"><span class="ob-ic">${ic}</span><div class="xr-n"><b>${n}</b><small>${d}</small></div><span class="perk-lv">${lv ? PERK_LV[lv] : '—'}</span><div class="ob-p">${meter(nx ? v - (PERK_T[lv - 1] || 0) : 1, nx ? nx - (PERK_T[lv - 1] || 0) : 1, ['#5d6478', '#c98a4b', '#c0c6d6', '#ffd23f'][lv])}<small>${nx ? `${v} / ${nx}` : 'max'}</small></div></div>`;
  }).join('')}</div></div>`;
  const cands = sortSquad(teamPlayers(u)).filter(p => !p.it);
  const itRows = its.map(p => `<div class="xr it" data-a="player" data-id="${p.id}">${dpBadge(p)}<div class="xr-n"><b>${U.esc(pFull(p))}</b><small>${U.esc(itLabel(p))}${p.it.k === 'trait' ? ` · šanca ${Math.round(itChance(p) * 100)} %` : ''}</small></div>${meter(p.it.prog, itNeed(p), '#2ecc71')}<small class="xr-v">${Math.round(p.it.prog / itNeed(p) * 100)} %</small><button class="btn btn-ghost sm xr-b" data-a="itStop" data-id="${p.id}" title="Zrušiť">✕</button></div>`).join('');
  const add = its.length < slots ? `<div class="it-add"><select class="inp" id="itP"><option value="">Hráč…</option>${cands.map(p => `<option value="${p.id}">${dpOf(p)} · ${U.esc(pName(p))} (${p.r})</option>`).join('')}</select><select class="inp" id="itK"><option value="">Program…</option></select><button class="btn btn-go sm" data-a="itAdd">Pridať</button></div>` : '';
  const ind = `<div class="card"><div class="card-h">🎯 Individuálny tréning <span class="muted">${its.length}/${slots}</span></div>${itRows ? `<div class="xlist">${itRows}</div>` : '<p class="muted small">Nikto netrénuje individuálne.</p>'}${add}
<p class="muted small tr-note">Mladší hráči sa učia rýchlejšie. Špecialita potrebuje dostatočný atribút a nemusí vyjsť na prvý raz.</p></div>`;
  return `<div class="grid2 eq"><div>${plan}${ind}</div><div>${perks}${staffCard()}</div></div>`;
}
// realizačný tím – každý post sa dá rozkliknúť
function staffCard() {
  const st = staff();
  const sRow = (x, cur, r) => `<div class="xr sf ${cur ? 'cur' : ''} ${cur && !x ? 'empty' : ''}"><div class="xr-n"><b>${x ? U.esc(x.n) : 'Neobsadené'}</b>${cur && x ? '<small>v klube</small>' : ''}</div>${x ? starsH(x.q) : '<span></span>'}<small class="xr-v">${x ? wk(x.w) : ''}</small>${cur ? (x && r !== 'ast' ? `<button class="btn btn-ghost sm xr-b" data-a="staffFire" data-v="${r}">Prepustiť</button>` : '<span></span>') : `<button class="btn btn-blue sm xr-b" data-a="staffHire" data-v="${x.id}">Najať</button>`}</div>`;
  return `<div class="card"><div class="card-h">👔 Realizačný tím <span class="muted">${wk(staffWeekly())}</span></div><div class="accd-list">${STAFF_ROLES.map(([r, ic, n]) => {
    const c = st[r], open = UI.staffOpen === r;
    return `<div class="accd ${open ? 'open' : ''}"><div class="accd-h" data-a="staffTog" data-v="${r}"><span class="sp-ic">${ic}</span><div class="xr-n"><b>${n}</b><small>${c ? U.esc(c.n) : 'neobsadené'}</small></div>${c ? starsH(c.q) : '<span class="muted small">—</span>'}<small class="xr-v">${c ? wk(c.w) : ''}</small><span class="sc-chev">▾</span></div>
${open ? `<div class="accd-b"><p class="muted small">${STAFF_FX[r]}</p>${c ? sRow(c, true, r) : ''}${staffPool().filter(x => x.role === r).map(x => sRow(x, false, r)).join('')}</div>` : ''}</div>`;
  }).join('')}</div></div>`;
}

// ── Rozhovor s hráčom ──────────────────────────────────────────
function openTalk(pid) {
  const p = G.players[pid];
  if (!p) return;
  const av = talkAvail(p), [ic, mn] = MOR_IC(mor(p));
  modal(`<h3>💬 Rozhovor · ${U.esc(pFull(p))}</h3>
<div class="talk-st"><span>${ic} Morálka: <b>${mn}</b></span><span>Rola: <b>${ROLE_SK[playerRole(p)]}</b></span>${p.prom ? `<span>🤝 Sľub: ${p.prom.ok}/${p.prom.need} (ostáva ${p.prom.left})</span>` : ''}${p.wo ? '<span class="neg">Chce odísť</span>' : ''}</div>
${av.length ? `<div class="talk-opts">${TALKS.filter(([k]) => av.includes(k)).map(([k, n]) => `<button class="btn btn-blue" data-m="${k}">${n}</button>`).join('')}</div>` : '<p class="muted">S hráčom si nedávno hovoril. Skús o pár dní.</p>'}
<div class="m-btns"><button class="btn btn-ghost" data-m="x">Zavrieť</button></div>`, {
    on: k => {
      if (k === 'x') return;
      const r = talkPlayer(p, k);
      toast(`${pName(p)}: ${r.txt}`, r.d > 0 ? 'good' : r.d < 0 ? 'bad' : '');
      saveGame(); rerenderAny();
    },
  });
}
function rerenderAny() { if (document.querySelector('.hub')) renderTab(); }

// ── Tlačová konferencia ───────────────────────────────────────
function openPress(pc, after) {
  if (!pc) { if (after) after(); return; }
  modal(`<div class="press"><div class="press-h">🎙️ Tlačová konferencia</div><p class="press-q">„${U.esc(pressQ(pc))}“</p>
<div class="press-a">${PRESS[pc.k][1].map(([t], i) => `<button class="btn btn-blue" data-m="a${i}">${U.esc(t)}</button>`).join('')}</div>
<div class="m-btns"><button class="btn btn-ghost sm" data-m="skip">Bez komentára</button></div></div>`, {
    cls: 'press-m', locked: true,
    on: k => {
      if (k[0] === 'a') { const ef = pressAnswer(pc, +k.slice(1)); if (ef.length) toast('🎙️ ' + ef.join(' · ')); saveGame(); }
      if (after) setTimeout(after, 50);
    },
  });
}

// ── Prípravný panel pred zápasom: analýza súpera a podmienky ───
function prematchExtra(x) {
  const h = G.teams[x.m.h], a = G.teams[x.m.a], wx = weatherFor(h), ref = refFor(h, a), km = travelKm(h, a, x.m.neutral);
  const an = oppAnalysis(x), pi = pitchOf(h);
  const fm = an.form.map(f => `<i class="fm f-${f}">${f}</i>`).join('');
  const rec = an.rec, cur = tacOf(userTeam()), same = rec && rec.s === cur.s && rec.w === cur.w && rec.b === cur.b;
  return `<div class="pm-cond"><span title="Počasie">${wxTxt(wx)}</span><span title="Ihrisko">${pi.art ? '🟩 umelá tráva' : '🌱 tráva'}${pi.heat ? ' · vyhrievaná' : ''}</span><span title="Rozhodca">🧑‍⚖️ ${U.esc(ref.n)} <i class="stars">${'🟨'.repeat(ref.st)}</i></span>${varOn(h, a) ? '<span>📺 VAR</span>' : ''}<span title="Cesta hostí">${travelTxt(km)}</span></div>
<div class="card pm-an"><div class="card-h">🔍 Analýza súpera · ${U.esc(an.opp.short)}</div>
<div class="stgrid three">${tile('Forma', `<span class="lt-form">${fm || '—'}</span>`)}${tile('Kľúčový hráč', an.key ? `${U.esc(pName(an.key))} ${ovr(an.key.r)}` : '—')}${tile('Strelec', an.top ? `${U.esc(pName(an.top))} (${an.top.s.g})` : '—')}
${tile('Hrá', TAC_S[an.tac.s], `${TAC_B[an.tac.b].toLowerCase()} línia`)}${tile('Útok · stred · obrana', `${Math.round(an.s.att)} · ${Math.round(an.s.mid)} · ${Math.round(an.s.def)}`)}${tile('Slabina', an.weak || '—')}</div>
${rec ? `<div class="an-rec">💡 Asistent: <b>${TAC_S[rec.s]}, ${TAC_W[rec.w].toLowerCase()} hra, ${TAC_B[rec.b].toLowerCase()} línia</b>${same ? ' <span class="pos">✔ už nastavené</span>' : ` <button class="btn btn-go sm" data-a="useRec" data-s="${rec.s}" data-w="${rec.w}" data-b="${rec.b}">Použiť</button>`}</div>` : ''}</div>`;
}

// ── Taktika, štandardky a šatňa (záložka Tím) ─────────────────
function tacticsExtraHTML() {
  const u = userTeam(), t = tacOf(u), xi = u.lineup.map(id => G.players[id]).filter(p => p && p.pos !== 'GK');
  u.sp = u.sp || {};
  const sp = SP_K.map(([k, n]) => { const cur = spTaker(u, k); return `<label class="sp-sel"><small>${n}</small><select class="inp sm" data-c="spSel" data-k="${k}">${xi.map(p => `<option value="${p.id}" ${cur && cur.id === p.id ? 'selected' : ''}>${U.esc(pName(p))}</option>`).join('')}</select></label>`; }).join('');
  return `<div class="tac-form">
${frow('Mentalita', seg(['Defenzívna', 'Vyrovnaná', 'Útočná'], u.ment, 'ment'))}
${frow('Presing', seg(['Nízky', 'Normálny', 'Vysoký'], u.press, 'press'))}
${frow('Štýl', seg(TAC_S, t.s, 'tacSet', 'data-k="s"'))}
${frow('Šírka', seg(TAC_W, t.w, 'tacSet', 'data-k="w"'))}
${frow('Línia', seg(TAC_B, t.b, 'tacSet', 'data-k="b"'))}</div>
<div class="sp-grid">${sp}</div>`;
}
function dressingHTML() {
  const u = userTeam(), c = chem(u), cap = captainOf(u), gr = natGroups(u).slice(0, 6);
  return `<div class="card tac-card"><div class="card-h">🤝 Šatňa <span class="muted">chémia</span></div>${confBar(c)}
<div class="cf-grid">${chemParts(u).map(([n, v]) => `<div class="cf"><span>${n}</span><b class="${v > 0 ? 'pos' : v < 0 ? 'neg' : 'muted'}">${v > 0 ? '+' : ''}${v}</b></div>`).join('')}</div>
<div class="nat-row">${gr.map(([n, k]) => `<span class="natp">${flag(n)}<b>${k}</b></span>`).join('')}</div>
${frow('©️ Kapitán', `<select class="inp sm" data-c="capSel">${sortSquad(teamPlayers(u)).filter(p => !p.acad).map(p => `<option value="${p.id}" ${cap && cap.id === p.id ? 'selected' : ''}>${U.esc(pName(p))}${trLvl(p, 'ldr') ? ' ★' : ''}</option>`).join('')}</select>`)}</div>`;
}

// ── Reprezentácia (Štatistiky) ─────────────────────────────────
function ntCard() {
  const nt = G.nt;
  if (!nt || !nt.res.length) return `<div class="card"><div class="card-h">🇸🇰 Reprezentácia</div><p class="muted small">Prvý zraz bude po ${NT_BREAKS[0] + 1}. kole.</p></div>`;
  const mine = (nt.sq || []).concat(nt.u21 || []).map(id => G.players[id]).filter(p => p && p.tid === G.userTid);
  return `<div class="card"><div class="card-h">🇸🇰 Reprezentácia</div>
${nt.res.slice(0, 6).map(r => `<div class="nt-r"><i class="nt-tag">${r.tag}</i><span>${r.home ? 'Slovensko – ' + U.esc(r.opp) : U.esc(r.opp) + ' – Slovensko'}</span><b class="${r.g > r.ga ? 'pos' : r.g < r.ga ? 'neg' : ''}">${r.home ? r.g + ':' + r.ga : r.ga + ':' + r.g}</b><small class="muted">${r.sc.map(id => G.players[id] ? pName(G.players[id]) : '').filter(Boolean).join(', ')}</small></div>`).join('')}
${mine.length ? `<div class="kv"><span>Z tvojho klubu</span><b>${mine.map(p => U.esc(pName(p)) + (nt.u21.includes(p.id) ? ' (U21)' : '')).join(', ')}</b></div>` : ''}</div>`;
}

// ── Odvolanie trénera ──────────────────────────────────────────
function screenSacked() {
  const b = board(), u = userTeam();
  if (!b.offers || !b.offers.length) b.offers = jobOffers(false);
  UI.root.innerHTML = `<div class="page season-end"><div class="se-card"><div class="se-title">Koniec v klube ${U.esc(u.name)}</div>${crestSVG(u, 80)}
<p class="se-pos">Vedenie stratilo dôveru a odvolalo ťa.</p>${jobsCard(b.offers, true)}</div></div>`;
}

Object.assign(ACT, {
  dealNeg() { openBoardNeg(); },
  askCap() { const b = board(), r = askWageRaise(U.nice(b.wageCap * 0.1)); toast(r.msg, r.res === 'no' ? 'bad' : 'good'); saveGame(); renderTab(); },
  dealOk() { acceptDefault(); saveGame(); toast('Návrh vedenia prijatý.', 'good'); rerenderAny(); },
  clubSub(el) { UI.clubSub = el.dataset.v; renderTab(); },
  jobTake(el) {
    const t = G.teams[+el.dataset.id];
    confirmBox('Nový klub', `Prijať ponuku klubu <b>${U.esc(t.name)}</b>?`, 'Prijať', () => { switchClub(t.id); saveGame(); UI.tab = 'home'; screenHub('home'); });
  },
  foundB() { const e = foundB(); toast(e || 'B-tím bude hrať od budúcej sezóny.', e ? 'bad' : 'good'); saveGame(); screenHub(); },
  toA(el) { const e = moveToA(G.players[+el.dataset.id]); if (e) toast(e, 'bad'); saveGame(); rerenderAny(); },
  toB(el) { const e = moveToB(G.players[+el.dataset.id]); toast(e || 'Hráč ide do B-tímu.', e ? 'bad' : 'good'); saveGame(); rerenderAny(); },
  foundWomen() { const e = foundWomen(); toast(e || 'Ženský tím založený!', e ? 'bad' : 'good'); saveGame(); screenHub(); },
  supWomen() { const e = supportWomen(); toast(e || 'Ženský tím má väčšiu podporu.', e ? 'bad' : 'good'); saveGame(); screenHub(); },
  retro() { const e = orderRetro(); toast(e || 'Retro dres je v predaji!', e ? 'bad' : 'good'); saveGame(); screenHub(); },
  trInt(el) { trn().int = +el.dataset.v; saveGame(); renderTab(); },
  staffTog(el) { UI.staffOpen = UI.staffOpen === el.dataset.v ? null : el.dataset.v; renderTab(); },
  itAdd() {
    const ps = document.getElementById('itP'), ks = document.getElementById('itK');
    if (!ps || !ps.value || !ks || !ks.value) { toast('Vyber hráča a program.', 'bad'); return; }
    const [k, v] = ks.value.split(':'), p = G.players[+ps.value];
    const e = setIt(p, k, k === 'pos' ? v : +v);
    if (e) toast(e, 'bad'); saveGame(); renderTab();
  },
  itStop(el, e) { e.stopPropagation(); setIt(G.players[+el.dataset.id], null); saveGame(); renderTab(); },
  staffHire(el) { const e = hireStaff(+el.dataset.v); toast(e || 'Nový člen realizačného tímu!', e ? 'bad' : 'good'); saveGame(); screenHub(); },
  staffFire(el) { fireStaff(el.dataset.v); saveGame(); screenHub(); },
  tacSet(el) { tacOf(userTeam())[el.dataset.k] = +el.dataset.v; saveGame(); renderTab(); },
  useRec(el) { userTeam().tac = { s: +el.dataset.s, w: +el.dataset.w, b: +el.dataset.b }; saveGame(); toast('Taktika podľa asistenta nastavená.', 'good'); if (UI.pending) screenPrematch(UI.pending); },
  talk(el) { openTalk(+el.dataset.id); },
});
Object.assign(CHG, {
  trSlot(el) { trn().plan[+el.dataset.i] = el.value; saveGame(); renderTab(); },
  spSel(el) { const u = userTeam(); u.sp = u.sp || {}; u.sp[el.dataset.k] = +el.value; saveGame(); },
  capSel(el) { userTeam().cap = +el.value; saveGame(); renderTab(); },
});
// program individuálneho tréningu podľa vybraného hráča
document.addEventListener('change', e => {
  if (e.target.id !== 'itP') return;
  const p = G.players[+e.target.value], ks = document.getElementById('itK');
  if (!ks) return;
  ks.innerHTML = '<option value="">Program…</option>' + (p ? itOptions(p).map(([k, v, n]) => `<option value="${k}:${v}">${U.esc(n)}</option>`).join('') : '');
});

// ── Sústredenie (Prehľad) ──────────────────────────────────────
function campCard() {
  const half = campAvail();
  if (!half) return '';
  return `<div class="card camp"><div class="card-h">🏕️ ${half === 's' ? 'Letná príprava' : 'Zimné sústredenie'} <span class="muted">2 prípravné zápasy</span></div>
<div class="opt3">${CAMPS.map(([k, ic, n, , ef], i) => `<button class="trf" data-a="campGo" data-v="${i}"><span>${ic}</span><b>${n}</b><small>chémia +${ef.chem}${ef.fit ? ` · kondícia +${ef.fit}` : ''}${ef.dev ? ' · rozvoj' : ''}</small><em>${campCost(i) ? U.money(campCost(i)) : 'zadarmo'}</em></button>`).join('')}</div></div>`;
}

// ── Štadión: stavebné povolenie a dotácia (Financie → Investície) ─
function stadPermitHTML() {
  if (!G.biz) return '';
  const n = (G.biz.fac.stad || 0) + 1, p = G.permit, g = grantPct(n), gr = G.grantReq;
  const perm = !permitNeeded() ? '' : p && p.lvl === n ? (p.ok === true ? '<span class="pos">✔ povolenie</span>' : p.ok == null ? `<span class="muted">⏳ povolenie o ${Math.max(0, p.done - dayKey())} dní</span>` : '<button class="link" data-a="permitReq">✖ zamietnuté · znova ›</button>') : '<button class="btn btn-blue sm" data-a="permitReq">Stavebné povolenie</button>';
  const grant = g ? `<span class="pos">💶 dotácia ${Math.round(g * 100)} %</span>` : gr ? '<span class="muted">⏳ dotácia sa posudzuje</span>' : G.grantY === G.year ? '' : '<button class="btn btn-ghost sm" data-a="grantReq">Žiadať o dotáciu</button>';
  return perm || grant ? `<div class="fac-perm">${perm}${grant}</div>` : '';
}

// ── Vedenie: majiteľ a licencia trénera ────────────────────────
function ownerLicHTML() {
  const o = owner(), D = OWNERS[o.k], L = coachLic(), need = reqLic(userTeam().lvl);
  return `<div class="card"><div class="card-h">${D.ic} Majiteľ</div><div class="kv"><span>${U.esc(o.name)}</span><b>${D.n}</b></div><p class="muted small">${D.d}</p></div>
<div class="card"><div class="card-h">🎓 Licencia trénera</div>
<div class="kv"><span>Máš</span><b>${LIC_N[L.lv]}</b></div><div class="kv"><span>Súťaž vyžaduje</span><b class="${L.lv >= need ? 'pos' : 'neg'}">${LIC_N[need]}</b></div>
${L.course ? `<div class="kv"><span>Kurz ${LIC_N[L.course.to]}</span><b>hotovo o ${Math.max(0, L.course.done - dayKey())} dní</b></div>` : L.lv < 4 ? `<div class="m-btns left"><button class="btn btn-blue sm" data-a="licCourse">Kurz ${LIC_N[L.lv + 1]} · ${U.money(LIC_COST[L.lv + 1])} · ${LIC_DAYS[L.lv + 1]} dní</button></div>` : ''}</div>`;
}

// ── História: kariérne ciele ───────────────────────────────────
function goalsHTML() {
  const D = G.goalsDone || {};
  return `<div class="card"><div class="card-h">🎯 Kariérne ciele <span class="muted">${Object.keys(D).length}/${GOALS.length}</span></div><div class="xlist">${GOALS.map(([k, ic, n]) => `<div class="xr goal ${D[k] ? 'done' : ''}"><span class="ob-ic">${ic}</span><div class="xr-n"><b>${n}</b></div><small class="xr-v">${D[k] || ''}</small><b class="ob-st ${D[k] ? 'ok' : 'wait'}">${D[k] ? '✔' : '—'}</b></div>`).join('')}</div></div>`;
}

// ── Skauting: talenty z okresných turnajov ─────────────────────
function villageCard() {
  const ids = ((G.vt && G.vt.ids) || []).filter(id => G.players[id] && G.players[id].tid !== G.userTid && G.players[id].tid >= 0);
  if (!ids.length) return `<div class="card"><div class="card-h">🌾 Talenty z okresných turnajov</div><p class="muted small">Skauti chodia na turnaje pri otvorení prestupového okna.</p></div>`;
  return `<div class="card"><div class="card-h">🌾 Talenty z okresných turnajov <span class="muted">${ids.length}</span></div><div class="xlist">${ids.map(id => { const p = G.players[id], t = G.teams[p.tid]; return `<div class="xr vt" data-a="player" data-id="${p.id}">${dpBadge(p)}<div class="xr-n"><b>${U.esc(pFull(p))}</b><small>${p.age} r. · ${U.esc(t.name)}</small></div><span class="xr-tag">${talentTag(p)}</span>${ovr(p.r)}${potTxt(p, true)}<button class="btn btn-go sm xr-b" data-a="vtSign" data-id="${p.id}">Podpísať · ${U.money(vtFee(p))}</button></div>`; }).join('')}</div></div>`;
}

// ── Po zápase: štatistiky, mapa striel, heatmapa, sociálne siete ─
function shotMapSVG(shots, side) {
  const dots = shots.filter(s => s.side === side).map(s => { const x = 10 + s.x * 200, y = 6 + s.y * 128, r = 3 + s.xg * 9; return s.goal ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" class="sm-g"><title>Gól · xG ${String(s.xg).replace('.', ',')}</title></circle>` : `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" class="sm-m"><title>xG ${String(s.xg).replace('.', ',')}</title></circle>`; }).join('');
  return `<svg class="shotmap" viewBox="0 0 220 140"><rect x="10" y="6" width="200" height="128" class="sm-p"/><line x1="110" y1="6" x2="110" y2="134" class="sm-l"/><circle cx="110" cy="70" r="18" class="sm-l" fill="none"/><rect x="178" y="38" width="32" height="64" class="sm-l" fill="none"/><rect x="198" y="56" width="12" height="28" class="sm-l" fill="none"/><rect x="210" y="61" width="4" height="18" class="sm-gl"/>${dots}</svg>`;
}
function heatSVG(g) {
  const mx = Math.max(1, ...g);
  let c = '';
  for (let i = 0; i < 96; i++) { const v = g[i] / mx; if (v < 0.04) continue; c += `<rect x="${10 + (i % 12) * (200 / 12)}" y="${6 + Math.floor(i / 12) * 16}" width="${(200 / 12).toFixed(2)}" height="16" fill="rgba(255,${Math.round(210 - 170 * v)},40,${(0.15 + 0.7 * v).toFixed(2)})"/>`; }
  return `<svg class="shotmap heat" viewBox="0 0 220 140"><rect x="10" y="6" width="200" height="128" class="sm-p"/>${c}<line x1="110" y1="6" x2="110" y2="134" class="sm-l"/><circle cx="110" cy="70" r="18" class="sm-l" fill="none"/><rect x="10" y="38" width="32" height="64" class="sm-l" fill="none"/><rect x="178" y="38" width="32" height="64" class="sm-l" fill="none"/></svg>`;
}
function postExtraHTML(x, res, h, a) {
  const u = userTeam(), side = x.m.h === u.id ? 0 : 1;
  const shots = res.shotsL || [];
  const ids = (res.lu ? res.lu[side] : []).filter(id => G.players[id] && G.players[id].pos !== 'GK');
  const sel = UI.heatP && ids.includes(UI.heatP) ? UI.heatP : (res.rt ? ids.slice().sort((p, q) => (res.rt[q] || 0) - (res.rt[p] || 0))[0] : ids[0]);
  UI.lastRes = { x, res };
  const hm = sel ? (res.heat && res.heat[sel] ? res.heat[sel] : heatGuess(u, sel)) : null;
  const so = UI.social && UI.social.m === x.m ? UI.social.s : (UI.social = { m: x.m, s: socialAfterMatch(x, res) }).s;
  return `<div class="grid2 post-x">
<div class="card"><div class="card-h">🎯 Mapa striel <span class="muted">xG ${res.stats && res.stats.xg ? res.stats.xg.map(v => String(v).replace('.', ',')).join(' : ') : '—'}</span></div>
<div class="sm-two"><div><small>${crestSVG(h, 16)} ${U.esc(h.short)}</small>${shotMapSVG(shots, 0)}</div><div><small>${crestSVG(a, 16)} ${U.esc(a.short)}</small>${shotMapSVG(shots, 1)}</div></div></div>
<div class="card"><div class="card-h">🔥 Heatmapa <select class="inp sm" data-c="heatSel">${ids.map(id => `<option value="${id}" ${id === sel ? 'selected' : ''}>${U.esc(pName(G.players[id]))}</option>`).join('')}</select></div>${hm ? heatSVG(hm) : ''}${res.heat && res.heat[sel] ? '' : '<p class="muted small">Odhad podľa postu – presnú heatmapu má živý zápas.</p>'}</div></div>
<div class="card social"><div class="card-h">📱 Sociálne siete${so.slump ? ' <span class="neg">#trénervon</span>' : ''}</div>${so.posts.map(([n, t, l]) => `<div class="post"><b>${U.esc(n)}</b><p>${U.esc(t)}</p><small>❤️ ${l.toLocaleString('sk-SK')}</small></div>`).join('')}</div>`;
}

Object.assign(ACT, {
  campGo(el) { const r = doCamp(+el.dataset.v); if (r.err) toast(r.err, 'bad'); else toast('🏕️ ' + r.res.map(z => `${G.teams[z.opp].short} ${z.g}:${z.ga}`).join(' · '), 'good'); saveGame(); screenHub(); },
  licCourse() { const e = startCourse(); toast(e || 'Prihlásil si sa na kurz.', e ? 'bad' : 'good'); saveGame(); renderTab(); },
  vtSign(el, e) { e.stopPropagation(); const er = signVillage(+el.dataset.id); toast(er || 'Talent podpísaný!', er ? 'bad' : 'good'); saveGame(); screenHub(); },
  preSign(el) { openNegotiation(+el.dataset.id, 'pre'); },
  permitReq() { const e = requestPermit(); toast(e || 'Žiadosť o stavebné povolenie podaná.', e ? 'bad' : 'good'); saveGame(); renderTab(); },
  grantReq() { const e = requestGrant(); toast(e || 'Žiadosť o dotáciu podaná.', e ? 'bad' : 'good'); saveGame(); renderTab(); },
});
Object.assign(CHG, {
  heatSel(el) { UI.heatP = +el.value; const L = UI.lastRes; if (!L) return; const box = document.querySelector('.post-x'); if (box) box.outerHTML = postExtraHTML(L.x, L.res, G.teams[L.x.m.h], G.teams[L.x.m.a]).replace(/<div class="card social">[\s\S]*$/, ''); },
});
