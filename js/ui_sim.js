'use strict';
// ─── Simulácia viacerých zápasov naraz ───

const SIM_N = [[3, '3 zápasy'], [5, '5 zápasov'], [10, '10 zápasov'], [Infinity, 'Do konca sezóny']];

const openOffers = () => (G.inbox || []).filter(m => m.type === 'offer' && m.status === 'open').length;
function userLeagueRow() {
  const u = userTeam(), tbl = leagueTable(leagueOf(u)), i = tbl.findIndex(r => r.tid === u.id);
  return { pos: i + 1, pts: tbl[i] ? tbl[i].pts : 0 };
}

function openSimMany() {
  if (seasonOver()) { onContinue(); return; }
  const o = UI.simOpt || (UI.simOpt = { auto: true, ev: true });
  if (o.ev == null) o.ev = true;
  modal(`<h3>⏩ Simulovať viac zápasov</h3>
<div class="sim-n">${SIM_N.map(([n, l]) => `<button class="btn btn-blue" data-m="n" data-n="${n}">${l}</button>`).join('')}</div>
<label class="sim-opt"><input type="checkbox" data-o="auto" ${o.auto ? 'checked' : ''}><span>Auto zostava pred každým zápasom</span></label>
<label class="sim-opt"><input type="checkbox" data-o="ev" ${o.ev ? 'checked' : ''}><span>Udalosti rozhodne asistent</span></label>
<div class="m-btns"><button class="btn btn-ghost" data-m="x">Zrušiť</button></div>`, {
    cls: 'sim-modal',
    on: (k, b, m) => {
      if (k !== 'n') return;
      m.querySelectorAll('[data-o]').forEach(c => { o[c.dataset.o] = c.checked; });
      simMany(+b.dataset.n);
    },
  });
}

function simMany(n) {
  const u = userTeam(), o = UI.simOpt;
  const st = { n, log: [], stop: false, why: '', budget0: u.budget, row0: userLeagueRow(), cel: [], auto: [] };
  const evDo = () => { if (o.ev) { const r = autoDeal(); if (r) st.auto.push(r); } };
  const ov = document.createElement('div');
  ov.className = 'sim-ov';
  ov.innerHTML = `<div class="sim-box"><div class="sim-t">⏩ Simulujem</div><div class="sim-bar"><i></i></div><div class="sim-cnt"></div><div class="sim-live"></div><button class="btn btn-ghost sm sim-x">Zastaviť</button></div>`;
  document.body.appendChild(ov);
  ov.querySelector('.sim-x').onclick = () => { st.stop = true; st.why = st.why || 'user'; };
  const total = Number.isFinite(n) ? n : null;
  const step = () => {
    try {
    if (!st.stop && st.log.length < n && !seasonOver()) {
      let guard = 0;
      evDo();
      while (!seasonOver() && !userMatchToday() && guard++ < 60) { finishDay(); evDo(); }
      const x = !seasonOver() && userMatchToday();
      if (x) {
        const h = G.teams[x.m.h], a = G.teams[x.m.a];
        if (o.auto) autoLineup(u);
        const res = simMatch(h, a, { knockout: x.comp === 'C' || !!x.ko, neutral: x.m.neutral });
        recordResult(x, res);
        const info = finishDay();
        evDo();
        st.log.push({ x, res, r: info.ev.r });
        if (x.comp === 'C') { const c = cupOfMatch(x); if (c.winner === u.id) st.cel.push({ kind: c.kind, title: c.id === 'sup' ? 'VÍŤAZ SUPERPOHÁRA' : 'VÍŤAZ POHÁRA', name: c.name, sub: seasonLabel() }); }
        if (x.comp === 'E') { const c = euroOf(x); if (c.winner === u.id) st.cel.push({ kind: c.kind, title: 'VÍŤAZ ' + c.name.toUpperCase(), name: c.name, sub: seasonLabel() }); }
        const k = st.log.length, L = simLine(st.log[k - 1]);
        ov.querySelector('.sim-bar i').style.width = total ? `${Math.round(k / total * 100)}%` : `${Math.round(G.day / G.calendar.length * 100)}%`;
        ov.querySelector('.sim-cnt').textContent = total ? `${k} / ${total}` : `${k} ${k === 1 ? 'zápas' : k <= 4 ? 'zápasy' : 'zápasov'}`;
        const live = ov.querySelector('.sim-live');
        live.insertAdjacentHTML('afterbegin', `<div class="sim-l ${L.cls}">${crestSVG(L.opp, 18)}<span>${U.esc(L.opp.short)}</span><b>${L.my} : ${L.op}</b></div>`);
        if (live.children.length > 6) live.lastElementChild.remove();
        if (board().sacked) { st.stop = true; st.why = 'sacked'; }
        if (G.maf && G.maf.court) { st.stop = true; st.why = 'court'; }
      }
      setTimeout(step, 40);
      return;
    }
    } catch (e) { console.error(e); st.why = st.why || 'error'; }
    if (!st.why && seasonOver()) st.why = 'season';
    saveGame();
    ov.remove();
    screenSimSummary(st);
  };
  setTimeout(step, 60);
}

// zápas z pohľadu tvojho tímu
function simLine({ x, res }) {
  const u = userTeam(), home = x.m.h === u.id, side = home ? 0 : 1;
  const opp = G.teams[home ? x.m.a : x.m.h], my = home ? res.hg : res.ag, op = home ? res.ag : res.hg;
  const ko = x.comp === 'C' || x.ko;
  const cls = ko && my === op ? (x.m.w === u.id ? 'w' : 'l') : my > op ? 'w' : my < op ? 'l' : 'd';
  return { home, side, opp, my, op, cls };
}

function screenSimSummary(st) {
  const u = userTeam(), row1 = userLeagueRow();
  const L = st.log.map(e => ({ ...e, ...simLine(e) }));
  const cnt = c => L.filter(e => e.cls === c).length, w = cnt('w'), d = cnt('d'), l = cnt('l');
  const gf = L.reduce((a, e) => a + e.my, 0), ga = L.reduce((a, e) => a + e.op, 0);
  // najlepší hráči simulácie (priemer hodnotení, aspoň polovica zápasov)
  const acc = {};
  for (const e of L) for (const id of [...e.res.lu[e.side], ...(e.res.sb ? e.res.sb[e.side] : [])]) {
    const r = e.res.rt && e.res.rt[id];
    if (r == null) continue;
    const s = acc[id] || (acc[id] = { n: 0, t: 0, g: 0, a: 0 });
    s.n++; s.t += r;
  }
  for (const e of L) for (const g of e.res.ev) if (g.side === e.side) { if (acc[g.pid]) acc[g.pid].g++; if (acc[g.aid]) acc[g.aid].a++; }
  const best = Object.entries(acc).filter(([, s]) => s.n >= Math.max(1, Math.ceil(L.length / 2))).sort((p, q) => q[1].t / q[1].n - p[1].t / p[1].n).slice(0, 5);
  const injN = L.reduce((a, e) => a + (e.res.inj || []).filter(i => i.side === e.side).length, 0);
  const dPos = st.row0.pos - row1.pos, dBud = u.budget - st.budget0;
  const offN = openOffers();
  const why = (st.why === 'error' ? '<div class="sim-why">⚠️ Simulácia sa prerušila</div>' : '')
    + (offN ? `<div class="sim-why">📬 V Pošte čaká ${offN} ${offN === 1 ? 'ponuka' : offN <= 4 ? 'ponuky' : 'ponúk'} na hráčov <button class="btn btn-go sm" data-a="tab" data-t="inbox">Pošta</button></div>` : '')
    + (st.auto.length ? `<div class="sim-auto">${st.auto.map(r => `<span>🤖 ${U.esc(r.title)}: <b>${U.esc(r.label)}</b></span>`).join('')}</div>` : '')
    + (st.why === 'court' ? '<div class="sim-why">⚖️ Klub je obžalovaný – súd čaká <button class="btn btn-bad sm" data-a="mafCourt">Ísť na súd</button></div>' : '')
    + (st.why === 'sacked' ? '<div class="sim-why">🏛️ Vedenie ťa odvolalo</div>'
    : st.why === 'season' ? '<div class="sim-why">🏁 Sezóna sa skončila</div>' : st.why === 'user' ? '<div class="sim-why">⏸ Zastavené</div>' : '');
  const rows = L.map(e => {
    const nm = id => U.esc(pName(G.players[id] || { ln: '?' }));
    const sc = {}; for (const g of e.res.ev) if (g.side === e.side) sc[g.pid] = (sc[g.pid] || 0) + 1;
    const scTxt = Object.entries(sc).map(([id, n]) => `${nm(+id)}${n > 1 ? ' ' + n : ''}`).join(', ');
    const inj = (e.res.inj || []).filter(i => i.side === e.side).map(i => `🚑 ${nm(i.pid)}`).join(' ');
    const red = (e.res.cards || []).filter(c => c.side === e.side && c.c === 'R').map(c => `🟥 ${nm(c.pid)}`).join(' ');
    const mom = e.res.rt ? momOf(e.res.rt) : null, momMine = mom != null && [...e.res.lu[e.side], ...(e.res.sb ? e.res.sb[e.side] : [])].includes(mom);
    return `<div class="sim-row">
<span class="sr-comp">${U.esc(fixLabel(e.x, e.r))}</span>
<span class="sr-opp"><i class="sr-ha" title="${e.home ? 'Doma' : 'Vonku'}">${e.home ? 'D' : 'V'}</i>${crestSVG(e.opp, 22)}<b>${U.esc(e.opp.name)}</b></span>
<span class="sr-sc ${e.cls}">${e.my} : ${e.op}${e.res.pen ? `<small>pk ${e.home ? e.res.pen.h : e.res.pen.a}:${e.home ? e.res.pen.a : e.res.pen.h}</small>` : ''}</span>
<span class="sr-info">${scTxt ? `⚽ ${scTxt}` : ''}${momMine ? ` <em>★ ${nm(mom)}</em>` : ''}${inj ? ` ${inj}` : ''}${red ? ` ${red}` : ''}</span></div>`;
  }).join('');
  UI.root.innerHTML = `<div class="page sim-sum">
<div class="post-res ${w > l ? 'w' : w < l ? 'l' : 'd'}"><div class="pr-out">SÚHRN SIMULÁCIE</div>
<div class="sim-big"><div><b>${L.length}</b><small>zápasov</small></div><div><b class="pos">${w}</b><small>výhry</small></div><div><b>${d}</b><small>remízy</small></div><div><b class="neg">${l}</b><small>prehry</small></div><div><b>${gf} : ${ga}</b><small>skóre</small></div></div>
<div class="sim-kv"><span>🏆 ${U.esc(leagueOf(u).name)}: <b>${row1.pos}.</b> miesto${dPos ? ` <i class="${dPos > 0 ? 'pos' : 'neg'}">${dPos > 0 ? '▲' : '▼'} ${Math.abs(dPos)}</i>` : ''} · ${row1.pts} b. (+${row1.pts - st.row0.pts})</span><span>💰 <b class="${dBud >= 0 ? 'pos' : 'neg'}">${dBud >= 0 ? '+' : '−'}${U.money(Math.abs(dBud))}</b></span>${injN ? `<span>🚑 ${injN} ${injN === 1 ? 'zranenie' : injN <= 4 ? 'zranenia' : 'zranení'}</span>` : ''}</div>
${why}</div>
<div class="post-grid"><div class="card"><div class="card-h">Zápasy</div><div class="sim-rows">${rows || '<p class="muted">Žiadny zápas.</p>'}</div></div>
<div class="card"><div class="card-h">Najlepší hráči <span class="muted">Ø hodnotenie</span></div><div class="plist">${best.map(([id, s]) => { const p = G.players[id]; return p ? `<div class="prow" data-a="player" data-id="${p.id}">${dpBadge(p)}<span class="pr-n">${U.esc(pFull(p))}</span><span class="muted small">${s.n} z${s.g ? ` · ${s.g} g` : ''}${s.a ? ` · ${s.a} a` : ''}</span><b class="pr-big">${rtPill(Math.round(s.t / s.n))}</b></div>` : ''; }).join('') || '<p class="muted">—</p>'}</div></div></div>
<div class="pm-btns"><button class="btn btn-go big" data-a="postDone">POKRAČOVAŤ ▶</button></div></div>`;
  if (st.cel.length) setTimeout(() => celebrate(st.cel), 350);
}

Object.assign(ACT, {
  simMany() { openSimMany(); },
});
