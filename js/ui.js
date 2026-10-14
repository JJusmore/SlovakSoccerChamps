'use strict';
// ─── Používateľské rozhranie ─────────────────────────────────────

const UI = {
  root: null, tab: 'home', sel: null, match: null,
  tableLid: null, fixRound: null, cupRound: null, cupK: null, cupAll: false,
  tf: { q: '', pos: '', lvl: '', max: '', free: false, sort: 'r', page: 0, mode: 'buy' },
  ng: { step: 1, lvl: null, lid: null, tid: null, coach: '' },
};

const seasonLabel = () => `${G.year}/${String((G.year + 1) % 100).padStart(2, '0')}`;
const POS_ICON = {
  GK: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 13.5V3.5h12v10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M5.3 4v9M8 4v9M10.7 4v9M2.5 7h11M2.5 10.2h11" stroke="currentColor" stroke-width="1" opacity=".75"/></svg>',
  DF: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.2l5.8 2.1v4.3c0 3.5-2.6 6-5.8 7.1-3.2-1.1-5.8-3.6-5.8-7.1V3.3z" fill="currentColor"/></svg>',
  MF: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 .8l7.2 7.2L8 15.2.8 8z" fill="currentColor"/><circle cx="8" cy="8" r="2.2" fill="rgba(255,255,255,.55)"/></svg>',
  FW: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.6" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M8 4.4l2.7 2-1.03 3.2H6.33L5.3 6.4z" fill="currentColor"/></svg>',
};
const posBadge = pos => `<span class="pos pos-${pos}" title="${POS_NAME_SK[pos]}">${POS_ICON[pos]}<b>${POS_SK[pos]}</b></span>`;
const ovrCls = r => (r >= 75 ? 'o5' : r >= 64 ? 'o4' : r >= 52 ? 'o3' : r >= 38 ? 'o2' : 'o1');
const ovr = r => `<span class="ovr ${ovrCls(r)}">${r}</span>`;
const fitBar = f => `<span class="fitb" title="Kondícia ${f} %"><i style="width:${f}%;background:${f > 75 ? 'var(--go)' : f > 55 ? 'var(--gk)' : 'var(--bad)'}"></i></span>`;
const teamTag = (t, size = 22, short = false) => `<span class="tt" data-a="team" data-id="${t.id}">${crestSVG(t, size)}<span>${U.esc(short ? t.short : t.name)}</span></span>`;
const flag = nat => `<span class="nat">${nat}</span>`;

function toast(msg, type = '') {
  const t = document.createElement('div');
  t.className = 'toast ' + type; t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 2800);
}

function modal(html, opts = {}) {
  const m = document.createElement('div');
  m.className = 'modal-bg';
  m.innerHTML = `<div class="modal ${opts.cls || ''}">${html}</div>`;
  document.body.appendChild(m);
  const close = () => { m.remove(); opts.onClose && opts.onClose(); };
  m.addEventListener('click', e => {
    if (e.target === m && !opts.locked) { close(); return; }
    const b = e.target.closest('[data-m]');
    if (b) { const r = opts.on ? opts.on(b.dataset.m, b, m) : undefined; if (r !== false) close(); return; }
    const a = e.target.closest('[data-a]');
    if (a && ACT[a.dataset.a]) { close(); ACT[a.dataset.a](a, e); }
  });
  return { el: m, close };
}

function confirmBox(title, text, okLabel, onOk, cls = 'btn-go') {
  modal(`<h3>${title}</h3><p>${text}</p><div class="m-btns"><button class="btn btn-ghost" data-m="no">Zrušiť</button><button class="btn ${cls}" data-m="ok">${okLabel}</button></div>`,
    { on: k => { if (k === 'ok') onOk(); } });
}

// ─── Menu ───────────────────────────────────────────────────────
function screenMenu() {
  document.body.classList.remove('in-match');
  const save = hasSave();
  UI.root.innerHTML = `
<div class="menu">
  <canvas class="menu-art"></canvas>
  <div class="menu-inner">
    <div class="logo">
      <div class="logo-top">SLOVAK</div>
      <div class="logo-mid">SOCCER</div>
      <div class="logo-script">Champs</div>
      <div class="logo-flag"><i></i><i></i><i></i></div>
    </div>
    <div class="menu-btns">
      ${save ? '<button class="btn btn-go big" data-a="continueCareer">▶ POKRAČOVAŤ V KARIÉRE</button>' : ''}
      <button class="btn ${save ? 'btn-blue' : 'btn-go'} big" data-a="newCareer">NOVÁ KARIÉRA</button>
      <button class="btn btn-blue" data-a="friendly">PRIATEĽSKÝ ZÁPAS</button>
      <button class="btn btn-ghost" data-a="howto">AKO HRAŤ</button>
    </div>
    <div class="menu-foot">9 líg slovenskej pyramídy · Niké liga a 2. liga s reálnymi hráčmi (súpisky jeseň 2026)</div>
  </div>
</div>`;
  menuArt(UI.root.querySelector('.menu-art'));
}

function menuArt(cv) {
  const ctx = cv.getContext('2d');
  const kits = [
    { p: '#ffffff', s: '#1d4fa3', sh: '#1d4fa3', pat: 'sleeves', so: '#d0112b' },
    { p: '#5bb6ec', s: '#ffffff', sh: '#ffffff', pat: 'sleeves' },
    { p: '#d0112b', s: '#111111', sh: '#111111', pat: 'plain' },
    { p: '#ffd400', s: '#1c3f94', sh: '#1c3f94', pat: 'plain' },
    { p: '#ffd200', s: '#00843d', sh: '#00843d', pat: 'plain' },
  ];
  const looks = [{ skin: '#f2c9a0', hair: '#4a3020', style: 0 }, { skin: '#e8b88a', hair: '#1a1a1a', style: 2 },
    { skin: '#6b4528', hair: '#141414', style: 4 }, { skin: '#f6d3b0', hair: '#c9a25a', style: 3 }, { skin: '#dba57a', hair: '#2b1d12', style: 1 }];
  let t0 = performance.now();
  const draw = ts => {
    if (!cv.isConnected) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = cv.clientWidth * dpr, H = cv.clientHeight * dpr;
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    ctx.clearRect(0, 0, W, H);
    const t = (ts - t0) / 1000;
    const u = Math.min(W / 13, H / 6.5);
    const base = H * 0.97;
    const order = [3, 1, 0, 2, 4];
    const xs = [0.12, 0.3, 0.5, 0.7, 0.88];
    order.forEach((k, i) => {
      const s = i === 2 ? 1.18 : (i === 1 || i === 3 ? 1.0 : 0.86);
      drawFigure(ctx, W * xs[i], base - (i === 2 ? 0 : u * 0.15), u * s, kits[k], looks[k],
        { phase: t * 3 + i, moving: i % 2 === 0, face: i < 2 ? 1 : -1, num: [7, 10, 9, 11, 8][i] });
    });
    const bx = W * 0.5 + Math.sin(t * 1.3) * u * 0.6, by = base - u * 3.2 - Math.abs(Math.sin(t * 2.6)) * u * 1.0;
    drawBall(ctx, bx, by, u * 0.42, t * 4);
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
}

// ─── Nová kariéra ───────────────────────────────────────────────
function screenNew() {
  const ng = UI.ng;
  let body = '';
  if (ng.step === 1) {
    body = `<h2 class="scr-title">Vyber si ligu</h2><p class="scr-sub">Od Niké ligy po 9. ligu</p>
<div class="lg-list">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(l => {
      const lgs = G.leagues.filter(x => x.lvl === l);
      const tids = lgs.flatMap(x => x.tids);
      const top = tids.map(id => G.teams[id]).sort((a, b) => teamRating(b) - teamRating(a)).slice(0, 5);
      const desc = l <= 2 ? `${tids.length} klubov · reálni hráči` : `${lgs.length} skupiny · ${tids.length} klubov`;
      return `<button class="lg-row" data-a="ngLvl" data-l="${l}"><span class="lg-num">${l}</span><span class="lg-name">${LEVEL_INFO[l].name}<small>${desc}</small></span>
<span class="lg-crests">${top.map(t => crestSVG(t, 26)).join('')}</span><span class="lg-go">›</span></button>`;
    }).join('')}</div>`;
  } else if (ng.step === 2) {
    const lgs = G.leagues.filter(x => x.lvl === ng.lvl);
    body = `<h2 class="scr-title">${LEVEL_INFO[ng.lvl].name} – vyber skupinu</h2>
<div class="lg-list">${lgs.map(lg => {
      const top = lg.tids.map(id => G.teams[id]).sort((a, b) => teamRating(b) - teamRating(a)).slice(0, 5);
      return `<button class="lg-row" data-a="ngGroup" data-id="${lg.id}"><span class="lg-num reg">${REGIONS[lg.reg].name[0]}</span><span class="lg-name">${lg.name}<small>${lg.tids.length} klubov · ${REGIONS[lg.reg].assoc}</small></span>
<span class="lg-crests">${top.map(t => crestSVG(t, 26)).join('')}</span><span class="lg-go">›</span></button>`;
    }).join('')}</div>`;
  } else {
    const lg = G.leagues[ng.lid];
    const ts = lg.tids.map(id => G.teams[id]).sort((a, b) => teamRating(b) - teamRating(a));
    const best = teamRating(ts[0]), worst = teamRating(ts[ts.length - 1]);
    body = `<h2 class="scr-title">${lg.name} – vyber klub</h2>
<div class="team-grid">${ts.map(t => {
      const r = teamRating(t);
      const stars = Math.max(1, Math.round(1 + 4 * (r - worst) / Math.max(1, best - worst)));
      return `<button class="team-card ${ng.tid === t.id ? 'sel' : ''}" data-a="ngTeam" data-id="${t.id}">
${crestSVG(t, 56)}<b>${U.esc(t.name)}</b><span class="stars">${'★'.repeat(stars)}<i>${'★'.repeat(5 - stars)}</i></span>
<span class="tc-meta">OVR ${r} · ${U.money(t.budget)}</span></button>`;
    }).join('')}</div>
<div class="ng-bar">
  <input class="inp" id="coachName" maxlength="24" placeholder="Meno trénera" value="${U.esc(ng.coach)}">
  <button class="btn btn-go" data-a="ngStart" ${ng.tid == null ? 'disabled' : ''}>ZAČAŤ KARIÉRU ▶</button>
</div>`;
  }
  UI.root.innerHTML = `<div class="page"><div class="topbar"><button class="btn btn-ghost sm" data-a="ngBack">‹ Späť</button><div class="tb-title">NOVÁ KARIÉRA</div><span></span></div>${body}</div>`;
}

// ─── Hub ────────────────────────────────────────────────────────
const TABS = [['home', 'Prehľad'], ['inbox', 'Pošta'], ['team', 'Tím'], ['training', 'Tréning'], ['transfers', 'Prestupy'], ['scout', 'Skauting'], ['finance', 'Financie'], ['table', 'Tabuľka'], ['fixtures', 'Zápasy'], ['cup', 'Poháre'], ['stats', 'Štatistiky'], ['club', 'Klub'], ['mafia', '🕶️ Mafia'], ['settings', '⚙']];

function screenHub(tab) {
  document.body.classList.remove('in-match');
  if (tab) UI.tab = tab;
  const u = userTeam(), lg = leagueOf(u);
  const over = seasonOver();
  UI.root.innerHTML = `
<div class="hub">
  <header class="hdr">
    <div class="hdr-club">${crestSVG(u, 46)}<div><b>${U.esc(u.name)}</b><small>${lg.name} · ${seasonLabel()}</small></div></div>
    ${windowPill()}
    <div class="hdr-money"><small>Rozpočet</small><b class="${u.budget < 0 ? 'neg' : ''}">${U.money(u.budget)}</b></div>
    <button class="btn btn-go cont" data-a="continue">${over ? 'KONIEC SEZÓNY ▶' : 'POKRAČOVAŤ ▶'}</button>
  </header>
  <nav class="tabs">${TABS.map(([k, n]) => { const c = k === 'inbox' ? unreadCount() : k === 'mafia' && mafAlert() ? '!' : 0; return `<button class="tab ${UI.tab === k ? 'on' : ''} ${k === 'mafia' ? 'mafia' : ''}" data-a="tab" data-t="${k}">${n}${c ? `<i class="badge">${c}</i>` : ''}</button>`; }).join('')}</nav>
  <main class="content" id="content"></main>
</div>`;
  renderTab();
}

function renderTab() {
  const el = document.getElementById('content');
  if (!el) return;
  const hub = el.closest('.hub'); if (hub) hub.className = 'hub tab-' + UI.tab;
  const f = { home: tabHome, inbox: tabInbox, team: tabTeam, training: tabTraining, transfers: tabTransfers, scout: tabScout, finance: tabFinance, table: tabTable, fixtures: tabFixtures, cup: tabCup, stats: tabStats, club: tabClub, mafia: tabMafia, settings: tabSettings }[UI.tab] || tabHome;
  el.innerHTML = f();
  if (UI.tab === 'transfers') renderTransferList();
  if (UI.tab === 'inbox') markInboxRead();
  paintFigures(el);
}

function boardGoal(t) {
  const lg = leagueOf(t);
  const ranks = lg.tids.map(id => G.teams[id]).sort((a, b) => teamRating(b) - teamRating(a));
  const r = ranks.indexOf(t), n = ranks.length;
  if (r <= 1) return lg.lvl === 1 ? 'Boj o titul' : 'Postup do vyššej súťaže';
  if (r < n / 2) return 'Umiestnenie v hornej polovici';
  if (r < n - 3) return 'Pokojný stred tabuľky';
  return 'Záchrana v súťaži';
}

function matchLine(m, comp, extra = '') {
  const h = G.teams[m.h], a = G.teams[m.a];
  const mine = m.h === G.userTid || m.a === G.userTid;
  let res = '<span class="sc pending">– : –</span>';
  if (m.hg != null) {
    let cls = '';
    if (mine) { const my = m.h === G.userTid ? m.hg : m.ag, op = m.h === G.userTid ? m.ag : m.hg; cls = my > op ? 'w' : my < op ? 'l' : 'd'; if (comp === 'C' && my === op) cls = m.w === G.userTid ? 'w' : 'l'; }
    res = `<span class="sc ${cls}">${m.hg} : ${m.ag}${m.pen ? `<small> pk ${m.pen[0]}:${m.pen[1]}</small>` : ''}</span>`;
  }
  const inc = m.inc ? `<i class="ml-inc" title="${{ pyro: 'Pyrotechnika', fight: 'Bitka fanúšikov', riot: 'Vážne výtržnosti' }[m.inc]}">${m.inc === 'pyro' ? '🎆' : '🥊'}</i>` : '';
  const der = rivalry(h, a);
  return `<div class="ml ${mine ? 'mine' : ''} ${der && der[0] >= 2 ? 'derby' : ''}">${extra}<span class="ml-h">${teamTag(h, 20)}</span>${res}<span class="ml-a">${teamTag(a, 20)}</span>${inc}</div>`;
}

function tabHome() {
  const u = userTeam(), lg = leagueOf(u);
  const nx = nextUserFixture();
  let next = '';
  if (seasonOver()) {
    next = `<div class="card next"><div class="card-h">Sezóna skončila</div><div class="m-btns"><button class="btn btn-go" data-a="continue">KONIEC SEZÓNY ▶</button></div></div>`;
  } else if (nx && nx.m) {
    const h = G.teams[nx.m.h], a = G.teams[nx.m.a];
    const comp = fixLabel(nx, nx.ev.r);
    next = `<div class="card next ${nx.comp !== 'L' ? 'next-cup cup-' + fixKind(nx) : ''}"><div class="card-h">Najbližší zápas <span class="muted">${comp}</span></div>
<div class="vs"><div class="vs-t">${crestSVG(h, 64)}<b>${U.esc(h.name)}</b><small>OVR ${teamRating(h)}</small></div><div class="vs-mid">VS</div><div class="vs-t">${crestSVG(a, 64)}<b>${U.esc(a.name)}</b><small>OVR ${teamRating(a)}</small></div></div>
<div class="muted center">${rivalry(h, a) ? `<b class="derby-chip">⚔️ ${U.esc(rivalry(h, a)[1])}</b> ` : ''}${nx.m.neutral ? (nx.comp === 'E' ? 'Finále na neutrálnej pôde' : 'Národný štadión, Bratislava') : U.esc(h.stadium || '')}</div>
<div class="m-btns"><button class="btn btn-ghost" data-a="tab" data-t="team">Zostava</button><button class="btn btn-blue" data-a="simMany" title="Simulovať viac zápasov">⏩ Simulovať</button><button class="btn btn-go" data-a="continue">HRAŤ ▶</button></div></div>`;
  } else if (nx) {
    next = `<div class="card next"><div class="card-h">Najbližší zápas</div><p>${fixLabel(nx, nx.ev.r)} – žreb ešte nebol.</p><div class="m-btns"><button class="btn btn-go" data-a="continue">POKRAČOVAŤ ▶</button></div></div>`;
  } else {
    next = `<div class="card next"><div class="card-h">Najbližší zápas</div><div class="m-btns"><button class="btn btn-go" data-a="continue">POKRAČOVAŤ ▶</button></div></div>`;
  }
  const tbl = leagueTable(lg);
  const idx = tbl.findIndex(r => r.tid === u.id);
  const from = U.clamp(idx - 2, 0, Math.max(0, tbl.length - 5));
  const mini = tbl.slice(from, from + 5).map((r, i) => {
    const t = G.teams[r.tid];
    return `<tr class="${r.tid === u.id ? 'me' : ''}"><td class="z-${tableZone(lg, from + i, tbl.length)}">${from + i + 1}</td><td>${teamTag(t, 18)}</td><td>${r.p}</td><td>${r.gf}:${r.ga}</td><td><b>${r.pts}</b></td></tr>`;
  }).join('');
  const recent = [];
  for (let d = G.day - 1; d >= 0 && recent.length < 5; d--) {
    const ev = G.calendar[d];
    const m = ev.t === 'L' ? (lg.rounds[ev.r] || []).find(m => m.h === u.id || m.a === u.id) : ev.t === 'E' ? userEuro().map(c => euroUserMatch(c, ev.r)).find(Boolean) : cupsOfGrp(ev.k).map(c => cupUserMatch(c, ev.r)).find(Boolean);
    if (m && m.hg != null) recent.push(matchLine(m, ev.t === 'E' ? (m.g == null ? 'C' : 'L') : ev.t));
  }
  const ps = teamPlayers(u);
  const top = ps.slice().sort((a, b) => b.s.g - a.s.g)[0];
  return `<div class="grid2">
<div>${boardPromptCard()}${homeEvent()}${campCard()}${next}${homeCups()}
<div class="card"><div class="card-h">Posledné zápasy</div>${recent.join('') || '<p class="muted">Zatiaľ žiadne odohrané zápasy.</p>'}</div></div>
<div><div class="card"><div class="card-h">Tabuľka <button class="link" data-a="tab" data-t="table">celá ›</button></div>
<table class="tbl mini"><tr><th>#</th><th>Klub</th><th>Z</th><th>Skóre</th><th>B</th></tr>${mini}</table></div>
<div class="card"><div class="card-h">Prestupový trh ${windowPill()}</div>
<div class="kv"><span>Nové správy</span><b>${unreadCount() ? `<button class="link" data-a="tab" data-t="inbox">${unreadCount()} neprečítaných ›</button>` : '—'}</b></div>
<div class="kv"><span>Otvorené ponuky na tvojich hráčov</span><b>${(G.inbox || []).filter(m => m.type === 'offer' && m.status === 'open').length}</b></div>
<div class="kv"><span>Týždenná bilancia</span><b class="${weeklyBalance() < 0 ? 'neg' : 'pos'}">${U.money(weeklyBalance())}</b></div>
<div class="kv"><span>Skauti</span><b>${(G.scouts || []).length ? (G.scouts || []).map(s => '★'.repeat(s.q)).join(' · ') : '<button class="link" data-a="tab" data-t="scout">Najmi skauta ›</button>'}</b></div></div>
<div class="card club-sum"><div class="card-h">Klub</div>
<div class="kv"><span>Sila tímu</span><b>${ovr(teamRating(u))}</b></div>
<div class="kv"><span>Hráčov v kádri</span><b>${ps.length}</b></div>
${G.biz ? `<div class="kv"><span>Fanúšikovia</span><b>👥 ${G.biz.fans.toLocaleString('sk-SK')}</b></div><div class="kv"><span>Nálada · temperament</span><b>${moodTag()} ${tempTag(u)}</b></div><div class="kv"><span>Sponzori</span><b>${Object.values(G.biz.sp).filter(Boolean).length}/5 <button class="link" data-a="finGo" data-v="sponsors">›</button></b></div>` : ''}
<div class="kv"><span>Cieľ vedenia</span><b>${boardGoalTxt(board())}</b></div><div class="kv clk" data-a="tab" data-t="club" onclick="UI.clubSub='board'"><span>Úlohy vedenia</span><b>${objCount().done}/${objCount().n} ✔</b></div><div class="kv clk" data-a="tab" data-t="club" onclick="UI.clubSub='board'"><span>Dôvera vedenia</span>${confBar(board().conf)}</div>
<div class="kv"><span>Najlepší strelec</span><b>${top && top.s.g ? U.esc(pName(top)) + ' (' + top.s.g + ')' : '—'}</b></div>
<div class="kv"><span>Tréner</span><b>${U.esc(G.coach || 'Tréner')}</b></div></div>
<div class="card"><div class="card-h">Novinky</div><div class="news">${G.news.slice(0, 12).map(n => `<div class="nw ${n.type}">${U.esc(n.text)}</div>`).join('') || '<p class="muted">Žiadne správy.</p>'}</div></div>
</div></div>`;
}

// ─── Tím ────────────────────────────────────────────────────────
function slotLabel(slot) { return slotDP(slot); }

// ─── Tabuľka ────────────────────────────────────────────────────
function leagueSelect(cur, attr) {
  let o = '';
  for (let l = 1; l <= 9; l++) {
    const lgs = G.leagues.filter(x => x.lvl === l);
    o += `<optgroup label="${l}. úroveň">${lgs.map(lg => `<option value="${lg.id}" ${lg.id === cur ? 'selected' : ''}>${lg.name}</option>`).join('')}</optgroup>`;
  }
  return `<select class="inp" data-c="${attr}">${o}</select>`;
}

function tabTable() {
  const lid = UI.tableLid ?? userTeam().lid;
  const lg = G.leagues[lid], u = userTeam();
  const tbl = leagueTable(lg);
  // poradie pred posledným odohraným kolom (šípky ▲▼)
  let last = -1;
  (lg.rounds || []).forEach((rd, i) => { if (rd.some(m => m.hg != null)) last = i; });
  const prev = last > 0 ? leagueTable(lg, last).map(r => r.tid) : null;
  const played = Math.max(0, ...tbl.map(r => r.p)), total = leagueRoundCount(lg);
  const rows = tbl.map((r, i) => {
    const t = G.teams[r.tid], z = tableZone(lg, i, tbl.length), me = r.tid === G.userTid;
    const sep = lg.groupA && i === 6 ? '<tr class="lsep"><td colspan="10"><span>Skupina o udržanie</span></td></tr>' : lg.groupA && i === 0 ? '<tr class="lsep"><td colspan="10"><span>Skupina o titul</span></td></tr>' : '';
    const pi = prev ? prev.indexOf(r.tid) : -1, mv = pi < 0 ? 0 : pi - i;
    const mvh = !prev ? '' : mv > 0 ? `<i class="mv up" title="Posun o ${mv}">▲${mv}</i>` : mv < 0 ? `<i class="mv dn" title="Pád o ${-mv}">▼${-mv}</i>` : '<i class="mv eq">–</i>';
    const f5 = r.form.slice(-5), form = Array.from({ length: 5 }, (_, k) => { const fm = f5[k - (5 - f5.length)]; return fm ? `<i class="fm f-${fm} ${k === 4 ? 'last' : ''}">${fm}</i>` : '<i class="fm none"></i>'; }).join('');
    const gd = r.gf - r.ga, riv = !me && rivalry(u, t);
    return `${sep}<tr class="lrow ${z ? 'zn-' + z : ''} ${me ? 'me' : ''}">
<td class="lr-pos"><span class="pb ${z}">${i + 1}</span>${mvh}</td>
<td class="tl lr-club"><span class="tt" data-a="team" data-id="${t.id}">${crestSVG(t, 26)}<b>${U.esc(t.name)}</b></span>${riv ? `<i class="lr-riv" title="${U.esc(riv[1])}">⚔️</i>` : ''}</td>
<td>${r.p}</td><td class="hm">${r.w}</td><td class="hm">${r.d}</td><td class="hm">${r.l}</td>
<td class="hm lr-sc">${r.gf}:${r.ga}</td><td class="lr-gd ${gd > 0 ? 'p' : gd < 0 ? 'n' : ''}">${gd > 0 ? '+' : ''}${gd}</td>
<td><span class="lr-pts">${r.pts}</span>${r.ded ? `<i class="ded" title="Odpočet bodov">−${r.ded}</i>` : ''}</td>
<td class="hm lr-form">${form}</td></tr>`;
  }).join('');
  const lgd = (c, n) => `<span class="lgd"><i class="pb ${c}"></i>${n}</span>`;
  const legend = lg.lvl === 1 ? lgd('champ', 'Majster') + lgd('euro', 'Európske poháre') + lgd('down', 'Zostup') : lgd('up', 'Postup') + (lg.lvl < 9 ? lgd('down', 'Zostup') : '');
  return `<div class="card ltcard"><div class="lt-top">${leagueSelect(lid, 'tableLg')}
<div class="lt-info"><span class="lt-phase" ${lg.lvl === 1 ? 'title="Po 22. kole sa liga delí na skupinu o titul a o udržanie"' : ''}>${lg.groupA ? 'Nadstavba' : 'Základná časť'}</span>
<div class="lt-prog"><span>Kolo <b>${played}</b> / ${total}</span><div class="fb-bar"><i style="width:${Math.round(played / Math.max(1, total) * 100)}%"></i></div></div></div></div>
<table class="ltbl"><thead><tr><th>#</th><th class="tl">Klub</th><th title="Zápasy">Z</th><th class="hm" title="Výhry">V</th><th class="hm" title="Remízy">R</th><th class="hm" title="Prehry">P</th><th class="hm">Skóre</th><th title="Rozdiel skóre">+/−</th><th>Body</th><th class="hm">Forma</th></tr></thead><tbody>${rows}</tbody></table>
<div class="lt-legend">${legend}</div></div>`;
}

// ─── Zápasy ─────────────────────────────────────────────────────
function tabFixtures() {
  const u = userTeam(), lg = leagueOf(u);
  const prog = [];
  G.calendar.forEach((ev, d) => {
    let m = null, label;
    if (ev.t === 'L') { m = (lg.rounds[ev.r] || []).find(m => m.h === u.id || m.a === u.id); label = `${ev.r + 1}. kolo`; }
    else if (ev.t === 'E') { const c = userEuro().find(c => euroUserMatch(c, ev.r)); m = c ? euroUserMatch(c, ev.r) : null; label = c ? `${EURO_DEF[c.id].short} · ${euroRoundName(ev.r)}` : ''; }
    else { const c = cupsOfGrp(ev.k).find(c => cupUserMatch(c, ev.r)); m = c ? cupUserMatch(c, ev.r) : null; label = c ? `${c.id === 'sup' ? c.name : c.name + ' · ' + cupRoundName(c, ev.r)}` : ''; }
    if (m) prog.push(matchLine(m, ev.t === 'E' ? (m.g == null ? 'C' : 'L') : ev.t, `<span class="ml-r ${d === G.day ? 'now' : ''}">${label}</span>`));
  });
  const nR = lg.rounds.length;
  let r = UI.fixRound;
  if (r == null) { const ev = currentEvent(); r = ev && ev.t === 'L' ? Math.min(ev.r, nR - 1) : 0; if (seasonOver()) r = nR - 1; }
  r = U.clamp(r, 0, nR - 1);
  const rd = lg.rounds[r] || [];
  return `<div class="grid2">
<div class="card"><div class="card-h">Môj program <span class="muted">${seasonLabel()}</span></div><div class="prog">${prog.join('') || '<p class="muted">Žiadne zápasy.</p>'}</div></div>
<div class="card"><div class="card-h"><button class="btn btn-ghost sm" data-a="fixR" data-v="${r - 1}" ${r <= 0 ? 'disabled' : ''}>‹</button>
<span>${lg.name} · ${r + 1}. kolo</span><button class="btn btn-ghost sm" data-a="fixR" data-v="${r + 1}" ${r >= nR - 1 ? 'disabled' : ''}>›</button></div>
${rd.map(m => matchLine(m, 'L')).join('')}
</div></div>`;
}

// ─── Pohár ──────────────────────────────────────────────────────
function homeCups() {
  const cs = userCups();
  if (!cs.length && !userEuro().length) return '';
  const u = userTeam();
  return `<div class="card hcups"><div class="card-h">Poháre <button class="link" data-a="tab" data-t="cup">všetky ›</button></div>${homeEuroRows()}
${cs.map(c => {
    const st = c.winner === u.id ? '<b class="pos">🏆 Víťaz</b>' : c.alive.includes(u.id) ? (c.winner != null ? '' : `<b class="hc-on">v hre · ${cupRoundName(c, Math.min(c.cur, c.names.length - 1))}</b>`) : `<span class="muted">vypadol (${cupReach(c, u.id)})</span>`;
    return `<div class="hc-row" data-a="cupGo" data-v="${c.id}">${trophySVG(c.kind, 26)}<span>${c.name}</span>${st}${c.earn ? `<small class="pos">+${U.money(c.earn)}</small>` : ''}</div>`;
  }).join('')}</div>`;
}

function cupChipsHtml(k) {
  const u = userTeam(), cs = cupList();
  const order = cs.slice().sort((a, b) => (a.grp === 'reg' ? (a.entrants.includes(u.id) ? 3 : 4) : CUP_ORDER.indexOf(a.id)) - (b.grp === 'reg' ? (b.entrants.includes(u.id) ? 3 : 4) : CUP_ORDER.indexOf(b.id)));
  return euroChips(k) + order.map(x => `<button class="cupc cup-${x.kind} ${x.id === k ? 'on' : ''}" data-a="cupGo" data-v="${x.id}">${trophySVG(x.kind, 22)}<span>${x.name}</span>${x.entrants.includes(u.id) ? `<i class="${x.alive.includes(u.id) ? 'in' : 'out'}"></i>` : ''}</button>`).join('');
}

function tabCup() {
  const cs = cupList();
  if (!cs.length) return '<div class="card">Poháre sa ešte nezačali.</div>';
  const u = userTeam();
  let k = UI.cupK;
  const ue = userEuro()[0];
  if (k == null && ue) k = ue.id;
  if (G.euro && G.euro.comps[k]) return tabEuro(G.euro.comps[k], cupChipsHtml(k));
  if (!G.cups[k]) k = (G.cups.cls || G.cups.sp || cs[0]).id;
  const c = G.cups[k];
  const n = c.rounds.length;
  let r = UI.cupRound ?? Math.min(c.cur, n - 1);
  r = U.clamp(r, 0, n - 1);
  const inCup = c.entrants.includes(u.id), alive = c.alive.includes(u.id);
  let status;
  if (!inCup) status = 'Tvoj klub v tejto súťaži nehrá.';
  else if (c.winner === u.id) status = `🏆 Vyhral si ${c.name}!`;
  else if (alive) status = c.winner != null ? '' : 'Tvoj klub je stále v hre.';
  else status = `Tvoj klub vypadol (${cupReach(c, u.id)}).`;
  // poradie: Classic, Slovenský pohár, Superpohár, môj región, ostatné regióny
  const order = cs.slice().sort((a, b) => (a.grp === 'reg' ? (a.entrants.includes(u.id) ? 3 : 4) : CUP_ORDER.indexOf(a.id)) - (b.grp === 'reg' ? (b.entrants.includes(u.id) ? 3 : 4) : CUP_ORDER.indexOf(b.id)));
  const chips = `<div class="cup-chips">${euroChips(k)}${order.map(x => `<button class="cupc cup-${x.kind} ${x.id === k ? 'on' : ''}" data-a="cupGo" data-v="${x.id}">${trophySVG(x.kind, 22)}<span>${x.name}</span>${x.entrants.includes(u.id) ? `<i class="${x.alive.includes(u.id) ? 'in' : 'out'}"></i>` : ''}</button>`).join('')}</div>`;
  const path = c.id === 'sup' ? '' : `<div class="cup-path">${c.names.map((nm, i) => {
    const m = cupUserMatch(c, i);
    const won = m && m.w === u.id, lost = m && m.w != null && m.w !== u.id;
    return `<div class="cpt ${i < c.cur ? 'done' : i === c.cur && c.winner == null ? 'now' : ''} ${won ? 'won' : ''} ${lost ? 'lost' : ''}"><small>${nm}</small><b>${U.money(cupPrize(c, i))}</b>${won ? '<i>✔</i>' : lost ? '<i>✖</i>' : ''}</div>`;
  }).join('')}</div>`;
  const al = cupAliveByLvl(c);
  const pyr = c.id === 'cls' && c.winner == null ? `<div class="cup-pyr"><span class="muted small">V hre ešte:</span>${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(l => `<div class="cp-l ${u.lvl === l ? 'me' : ''} ${al[l] ? '' : 'zero'}"><b>${al[l] || 0}</b><small>${l}. liga</small></div>`).join('')}</div>` : '';
  const rd = (c.rounds[r] || []).slice();
  const best = m => Math.min(G.teams[m.h].lvl, G.teams[m.a].lvl);
  rd.sort((a, b) => ((b.h === u.id || b.a === u.id) - (a.h === u.id || a.a === u.id)) || best(a) - best(b));
  const lim = UI.cupAll ? rd.length : 24;
  const byes = c.byes[r] || [];
  const desc = {
    classic: 'Najväčší turnaj na Slovensku – hrajú všetky kluby od Niké ligy po 9. ligu. V prvých kolách sa žrebujú kluby podobnej sily, od 4. kola je žreb voľný. Za každé víťazné kolo je prémia a za vyradenie klubu z vyššej ligy bonus až +200 %. Finále sa hrá na Národnom štadióne.',
    cup: 'Hrá sa na jeden zápas, nižšie postavený tím je domáci. Pri remíze rozhodujú penalty. Finále sa hrá na neutrálnej pôde, víťaz dostane navyše 150 tis. €.',
    super: 'Majster Niké ligy proti víťazovi Slovenského pohára (alebo vicemajstrovi). Jeden zápas na štadióne majstra, víťaz berie 40 tis. €.',
    reg: 'Regionálny pohár pre kluby 4. – 9. ligy. Hrá sa vyraďovacím spôsobom, nižšie postavený tím je domáci.',
  }[c.kind];
  return `<div class="card cupcard">
${chips}
<div class="cup-hero cup-${c.kind}" title="${U.esc(desc)}">${trophySVG(c.kind, 92)}<div class="ch-t"><div class="ch-name">${c.name}</div><div class="ch-sub">${seasonLabel()} · ${c.entrants.length} klubov${status ? ' · ' + status : ''}</div></div>${c.earn ? `<div class="ch-earn"><small>Tvoje prémie</small><b>${U.money(c.earn)}</b></div>` : ''}</div>
${path}${pyr}
${c.id === 'sup' ? '' : `<div class="round-tabs">${c.rounds.map((_, i) => `<button class="chip ${i === r ? 'on' : ''}" data-a="cupR" data-v="${i}">${cupRoundName(c, i)}</button>`).join('')}</div>`}
${byes.length ? `<p class="muted small">Voľný žreb: ${byes.length}</p>` : ''}
${rd.slice(0, lim).map(m => matchLine(m, 'C')).join('')}
${rd.length > lim ? `<button class="btn btn-ghost sm cup-more" data-a="cupAll">Zobraziť všetky zápasy (${rd.length})</button>` : ''}
${c.winner != null ? `<div class="cup-win">${trophySVG(c.kind, 70)}<div>Víťaz: ${teamTag(G.teams[c.winner], 26)}</div></div>` : ''}
</div>`;
}

// ─── Štatistiky ─────────────────────────────────────────────────
function tabStats() {
  const u = userTeam();
  const lid = UI.tableLid ?? u.lid;
  const lg = G.leagues[lid];
  const set = new Set(lg.tids);
  const ps = G.players.filter(p => p && set.has(p.tid));
  const topG = ps.filter(p => p.s.g > 0).sort((a, b) => b.s.g - a.s.g || b.s.a - a.s.a).slice(0, 15);
  const topA = ps.filter(p => p.s.a > 0).sort((a, b) => b.s.a - a.s.a || b.s.g - a.s.g).slice(0, 10);
  const minRn = Math.max(2, Math.round(Math.max(0, ...ps.map(p => p.s.rn || 0)) * 0.4));
  const topR = ps.filter(p => (p.s.rn || 0) >= minRn).sort((a, b) => avgRt(b.s) - avgRt(a.s)).slice(0, 10);
  const li = (p, v) => `<div class="prow" data-a="player" data-id="${p.id}">${dpBadge(p)}<span class="pr-n">${U.esc(pFull(p))}</span><span class="pr-club">${crestSVG(G.teams[p.tid], 18)}<span>${U.esc(G.teams[p.tid].short)}</span></span><b class="pr-big">${v}</b></div>`;
  const mine = sortSquad(teamPlayers(u));
  return `<div class="grid2"><div>
<div class="card"><div class="card-h">${leagueSelect(lid, 'tableLg')}<span class="muted">Strelci</span></div><div class="plist">${topG.map(p => li(p, p.s.g)).join('') || '<p class="muted">Zatiaľ bez gólov.</p>'}</div></div>
<div class="card"><div class="card-h">Asistencie</div><div class="plist">${topA.map(p => li(p, p.s.a)).join('') || '<p class="muted">Zatiaľ bez asistencií.</p>'}</div></div>
<div class="card"><div class="card-h">Najlepšie hodnotení <span class="muted">Ø, min. ${minRn} z</span></div><div class="plist">${topR.map(p => li(p, rtPill(Math.round(avgRt(p.s))))).join('') || '<p class="muted">Zatiaľ bez zápasov.</p>'}</div></div></div>
<div><div class="card"><div class="card-h">${U.esc(u.name)} – štatistiky hráčov</div>
<table class="tbl"><tr><th>Post</th><th class="tl">Hráč</th><th>OVR</th><th>Z</th><th>G</th><th>A</th><th>🟨</th><th>🟥</th><th title="Priemerné hodnotenie">Ø</th></tr>
${mine.map(p => `<tr data-a="player" data-id="${p.id}" class="clk"><td>${dpBadge(p)}</td><td class="tl">${U.esc(pFull(p))}${p.ban > 0 ? ' <span class="neg" title="Trest">🚫</span>' : ''}${injTag(p)}</td><td>${ovr(p.r)}</td><td>${p.s.gp}</td><td>${p.s.g}</td><td>${p.s.a}</td><td>${p.s.yc || ''}</td><td>${p.s.rc || ''}</td><td>${p.s.rn ? rtPill(Math.round(avgRt(p.s))) : ''}</td></tr>`).join('')}</table></div>
${disciplineCard(lg)}${ntCard()}</div></div>`;
}

// ── Disciplína a fanúšikovia v lige ─────────────────────────────
function disciplineCard(lg) {
  const ts = lg.tids.map(id => G.teams[id]).sort((a, b) => ((b.dis ? b.dis.y + 3 * b.dis.r : 0) + (b.inc || 0) * 2) - ((a.dis ? a.dis.y + 3 * a.dis.r : 0) + (a.inc || 0) * 2) || (b.fa || 0) - (a.fa || 0));
  return `<div class="card"><div class="card-h">Disciplína a fanúšikovia</div>
<table class="tbl disc"><tr><th class="tl">Klub</th><th title="Žlté karty">🟨</th><th title="Červené karty">🟥</th><th title="Výtržnosti">🥊</th><th title="Temperament fanúšikov">🔥</th></tr>
${ts.map(t => `<tr class="${t.id === G.userTid ? 'me' : ''}"><td class="tl">${teamTag(t, 18)}</td><td>${t.dis ? t.dis.y : 0}</td><td>${t.dis ? t.dis.r : 0}</td><td>${t.inc || 0}</td><td>${tempTag(t)}</td></tr>`).join('')}</table></div>`;
}

// ─── Klub ───────────────────────────────────────────────────────
function clubMainHTML() {
  const u = userTeam();
  const tr = G.trophies;
  return `${G.biz ? `<div class="card campus-card"><div class="card-h">🏗️ Areál klubu <button class="link" data-a="finGo" data-v="invest">Stavať a vylepšovať ›</button></div><div class="campus-wrap">${campusSVG()}</div></div>` : ''}<div class="grid2"><div class="card"><div class="card-h">Sieň trofejí</div>
<div class="trophies">${tr.map(t => `<div class="trophy">${trophySVG(t.type, 72)}<b>${U.esc(t.name)}</b><small>${t.season}</small></div>`).join('') || '<p class="muted">Zatiaľ prázdna</p>'}</div></div>
<div class="card"><div class="card-h">${crestSVG(u, 28)} ${U.esc(u.name)}</div>
<div class="kv"><span>Mesto</span><b>${U.esc(u.city)}</b></div><div class="kv"><span>Štadión</span><b>${U.esc(u.stadium || '—')}</b></div>
<div class="kv"><span>Región</span><b>${REGIONS[u.reg].name}</b></div><div class="kv"><span>Rozpočet</span><b>${U.money(u.budget)}</b></div>
<div class="kv"><span>Založený</span><b>${founded(u)}</b></div><div class="kv"><span>Sezón v kariére</span><b>${G.seasonNo}</b></div></div>
</div>`;
}

// ─── Nastavenia ─────────────────────────────────────────────────
function tabSettings() {
  const s = G.settings;
  return `<div class="card narrow"><div class="card-h">Nastavenia</div>
<div class="kv"><span>Ovládanie tvojich šancí</span><b>${['manual', 'auto'].map(k => `<button class="chip ${s.control === k ? 'on' : ''}" data-a="set" data-k="control" data-v="${k}">${k === 'manual' ? 'Ja hrám' : 'Automaticky'}</button>`).join('')}</b></div>
<div class="kv"><span>Zvuk</span><b>${[true, false].map(v => `<button class="chip ${s.sound === v ? 'on' : ''}" data-a="set" data-k="sound" data-v="${v}">${v ? 'Zapnutý' : 'Vypnutý'}</button>`).join('')}</b></div>
<div class="kv"><span>Rýchlosť zápasu</span><b>${[1, 2, 4].map(v => `<button class="chip ${s.speed === v ? 'on' : ''}" data-a="set" data-k="speed" data-v="${v}">×${v}</button>`).join('')}</b></div>
<div class="m-btns left"><button class="btn btn-blue sm" data-a="saveNow">Uložiť hru</button><button class="btn btn-ghost sm" data-a="exportSave">Exportovať uloženie</button><label class="btn btn-ghost sm">Importovať<input type="file" accept=".json" data-c="importSave" hidden></label></div>
<div class="m-btns left"><button class="btn btn-ghost sm" data-a="howto">Ako hrať</button><button class="btn btn-ghost sm" data-a="toMenu">Hlavné menu</button><button class="btn btn-bad sm" data-a="deleteCareer">Zmazať kariéru</button></div></div>`;
}

// ─── Pred zápasom / po zápase ───────────────────────────────────
function screenPrematch(x) {
  const h = G.teams[x.m.h], a = G.teams[x.m.a];
  prepareTeam(h, a); prepareTeam(a, h);
  const lg = leagueOf(userTeam());
  const cup = x.comp === 'C' ? cupOfMatch(x) : x.comp === 'E' ? euroOf(x) : null;
  const comp = fixLabel(x, currentEvent().r);
  const col = t => {
    const slots = FORMATIONS[t.form];
    const rows = t.lineup.map((id, i) => { const p = G.players[id]; return p ? `<div class="pm-p">${posBadge(slots[i][0])}<span class="pm-num">${p.num}</span><span class="pm-n">${U.esc(pName(p))}</span>${ovr(p.r)}</div>` : ''; }).join('');
    const hard = teamHard(t);
    return `<div class="pm-col"><div class="pm-head">${crestSVG(t, 60)}<b>${U.esc(t.name)}</b><small>${t.form} · OVR ${teamRating(t)}</small><div class="pm-tmp">${tempTag(t)}<span title="Tvrdosť hry (agresivita hráčov)">🟨 ${hard >= 52 ? 'tvrdo' : hard >= 42 ? 'bežne' : 'čisto'}</span></div></div>${rows}</div>`;
  };
  const der = rivalry(h, a);
  const risk = (h.fa + a.fa * 0.85) / 185 * (1 + (der ? der[0] : 0) * 0.5);
  UI.root.innerHTML = `<div class="page prematch ${cup ? 'pm-cup cup-' + cup.kind : ''}"><div class="topbar"><button class="btn btn-ghost sm" data-a="tab" data-t="home">‹ Späť</button><div class="tb-title">${comp}</div><span></span></div>
${der ? `<div class="pm-derby d${der[0]}">⚔️ ${U.esc(der[1]).toUpperCase()}</div>` : ''}
<div class="pm-grid">${col(h)}<div class="pm-vs">VS<small>${x.m.neutral ? (x.comp === 'E' ? 'Neutrálna pôda' : 'Národný štadión') : U.esc(h.stadium || '')}</small>${risk > 0.55 ? `<em class="pm-risk ${risk > 0.8 ? 'hi' : ''}" title="Riziko výtržností fanúšikov">⚠️ ${risk > 0.8 ? 'vysoké riziko' : 'rizikový zápas'}</em>` : ''}</div>${col(a)}</div>
${prematchExtra(x)}
<div class="pm-btns"><button class="btn btn-ghost" data-a="tab" data-t="team">Upraviť zostavu</button><button class="btn btn-blue" data-a="simMatch">⚡ SIMULOVAŤ</button><button class="btn btn-blue" data-a="simMany">⏩ VIAC ZÁPASOV</button><button class="btn btn-go big" data-a="playMatch">HRAŤ ZÁPAS ▶</button></div>
<p class="muted center small">potiahni = strela · klik = prihrávka · podrž = beh</p></div>`;
  UI.pending = x;
  UI.introSeen = UI.introSeen || new WeakSet();
  const pc = pressPre(x);
  if (pc) setTimeout(() => openPress(pc), cup || (der && der[0] >= 2) ? 9500 : 300);
  if (cup && !UI.introSeen.has(x.m)) { UI.introSeen.add(x.m); if (x.comp === 'E') euroIntro(cup, currentEvent().r, h, a); else cupIntro(cup, currentEvent().r, h, a); }
  else if (der && der[0] >= 2 && !UI.introSeen.has(x.m)) { UI.introSeen.add(x.m); derbyIntro(der, h, a); }
}

function screenPost(x, res, info) {
  const h = G.teams[x.m.h], a = G.teams[x.m.a];
  const u = userTeam();
  const my = x.m.h === u.id ? res.hg : res.ag, op = x.m.h === u.id ? res.ag : res.hg;
  let outcome = my > op ? 'VÝHRA' : my < op ? 'PREHRA' : 'REMÍZA';
  const ko = x.comp === 'C' || x.ko;
  if (ko) outcome = x.m.w === u.id ? (x.comp === 'E' && info.ev.r === 8 ? 'VÍŤAZSTVO' : 'POSTUP ĎALEJ') : 'VYPADNUTIE';
  const cls = (ko ? x.m.w === u.id : my > op) ? 'w' : (my === op && !ko) ? 'd' : 'l';
  let others = '';
  if (info.ev.t === 'L') {
    const lg = leagueOf(u);
    const rd = lg.rounds[info.ev.r] || [];
    const tbl = leagueTable(lg);
    const pos = tbl.findIndex(r => r.tid === u.id) + 1;
    others = `<div class="card"><div class="card-h">${lg.name} · ${info.ev.r + 1}. kolo <span class="muted">Si na ${pos}. mieste</span></div>${rd.map(m => matchLine(m, 'L')).join('')}</div>`;
  } else if (x.comp === 'E') {
    const c = euroOf(x), r = info.ev.r, ms = euroStage(c, r) || [];
    if (r < 6) {
      const gi = c.groups.findIndex(g => g.includes(u.id));
      others = `<div class="grid2 post-eu"><div class="card"><div class="card-h">${c.name} · skupina ${'ABCD'[gi]}</div>${euroGroupCard(c, gi)}</div>
<div class="card"><div class="card-h">${euroRoundName(r)}</div>${ms.filter(m => m.g === gi).map(m => matchLine(m, 'L')).join('')}<div class="eu-other">${ms.filter(m => m.g !== gi).map(m => matchLine(m, 'L')).join('')}</div></div></div>`;
    } else others = `<div class="card"><div class="card-h">${euroLabel(c, r)}</div>${ms.map(m => matchLine(m, 'C')).join('')}</div>`;
  } else {
    const c = cupOfMatch(x);
    const rd = (c.rounds[info.ev.r] || []).slice().sort((p, q) => ((q.h === u.id || q.a === u.id) - (p.h === u.id || p.a === u.id)) || Math.min(G.teams[p.h].lvl, G.teams[p.a].lvl) - Math.min(G.teams[q.h].lvl, G.teams[q.a].lvl));
    const prize = x.m.w === u.id ? cupPrize(c, info.ev.r) + cupScalpBonus(c, info.ev.r, u.id, x.m.h === u.id ? x.m.a : x.m.h) : 0;
    others = `${prize ? `<div class="card cup-prize-card">💰 Prémia za postup: <b class="pos">${U.money(prize)}</b>${cupScalpBonus(c, info.ev.r, u.id, x.m.h === u.id ? x.m.a : x.m.h) ? ' <span class="muted">(vrátane bonusu za vyradenie favorita)</span>' : ''}</div>` : ''}<div class="card"><div class="card-h">${cupLabel(c, info.ev.r)}</div>${rd.slice(0, 20).map(m => matchLine(m, 'C')).join('')}${rd.length > 20 ? `<p class="muted small">… a ďalších ${rd.length - 20} zápasov v záložke Poháre.</p>` : ''}</div>`;
  }
  const der = rivalry(h, a);
  UI.root.innerHTML = `<div class="page post">
<div class="post-res ${cls}"><div class="pr-out">${outcome}</div>
<div class="pr-line"><div class="vs-t">${crestSVG(h, 64)}<b>${U.esc(h.name)}</b></div><div class="pr-score">${res.hg} : ${res.ag}${res.pen ? `<small>penalty ${res.pen.h}:${res.pen.a}</small>` : ''}</div><div class="vs-t">${crestSVG(a, 64)}<b>${U.esc(a.name)}</b></div></div>
<div class="pr-meta">${der ? `<span class="derby-chip">⚔️ ${U.esc(der[1])}</span>` : ''}<span>${U.esc(fixLabel(x, info.ev.r))}</span><span>🏟️ ${U.esc(x.m.neutral ? 'Národný štadión' : h.stadium || h.city)}</span>${x.m.wx ? `<span>${wxTxt(x.m.wx)}</span>` : ''}${x.m.ref ? `<span>🧑‍⚖️ ${U.esc(x.m.ref)}</span>` : ''}</div></div>
<div class="post-grid">${matchTimeline(x, res, h, a)}<div>${crowdCard(x, res, h, a)}${statsCard(res)}</div></div>
${ratingsCard(x, res, h, a)}
${postExtraHTML(x, res, h, a)}
${others}
<div class="pm-btns"><button class="btn btn-go big" data-a="postDone">POKRAČOVAŤ ▶</button></div></div>`;
  const pcp = pressPost(x, res);
  if (pcp) setTimeout(() => openPress(pcp), 900);
  if (x.comp === 'C') {
    const c = cupOfMatch(x);
    if (c.winner === u.id) setTimeout(() => celebrate([{ kind: c.kind, title: c.id === 'sup' ? 'VÍŤAZ SUPERPOHÁRA' : 'VÍŤAZ POHÁRA', name: c.name, sub: seasonLabel() }]), 350);
  }
  if (x.comp === 'E') {
    const c = euroOf(x);
    if (c.winner === u.id) setTimeout(() => celebrate([{ kind: c.kind, title: 'VÍŤAZ ' + c.name.toUpperCase(), name: c.name, sub: seasonLabel() }]), 350);
  }
}

// ── Priebeh zápasu: góly s asistenciami, karty, polčas ──────────
function matchTimeline(x, res, h, a) {
  const nm = id => U.esc(pName(G.players[id] || { ln: '?' }));
  const ev = [...res.ev.map(e => ({ ...e, t: 'G' })), ...(res.cards || []).map(c => ({ ...c, t: c.c })), ...(res.inj || x.m.inj || []).map(e => ({ ...e, t: 'I' })), ...(res.varx || x.m.varx || []).map(e => ({ ...e, t: 'V' }))].sort((p, q) => p.min - q.min || (p.t === 'G' ? -1 : 1));
  let g = [0, 0], half = false;
  const rows = [];
  for (const e of ev) {
    if (!half && e.min > 45) { half = true; rows.push(`<div class="tl-sep">Polčas ${g[0]} : ${g[1]}</div>`); }
    let body;
    if (e.t === 'G') {
      g[e.side]++;
      const spT = { pk: 'z penalty', fk: 'priamy kop', ck: 'po rohu' }[e.sp];
      body = `<span class="tl-ic">⚽</span><span class="tl-tx"><b>${nm(e.pid)}</b>${e.aid != null && e.aid >= 0 ? `<small>asistencia: ${nm(e.aid)}${spT ? ' · ' + spT : ''}</small>` : spT ? `<small>${spT}</small>` : ''}</span><em class="tl-sc">${g[0]}:${g[1]}</em>`;
    } else if (e.t === 'V') body = `<span class="tl-ic">📺</span><span class="tl-tx"><b>VAR: gól neplatí</b><small>${nm(e.pid)} · ${e.why}</small></span>`;
    else if (e.t === 'I') body = `<span class="tl-ic">🚑</span><span class="tl-tx"><b>${nm(e.pid)}</b><small>${INJ_TYPES[e.k][0].toLowerCase()} · ${dniTxt(e.d)}</small></span>`;
    else body = `<span class="tl-ic">${e.t === 'Y' ? '🟨' : '🟥'}</span><span class="tl-tx"><b>${nm(e.pid)}</b>${e.t === 'R' ? `<small>${e.two ? 'druhá žltá – vylúčenie' : 'vylúčenie'}</small>` : ''}</span>`;
    rows.push(`<div class="tl-row s${e.side} ${e.t === 'G' ? 'goal' : ''}"><div class="tl-side">${e.side === 0 ? body : ''}</div><div class="tl-min">${e.min}'</div><div class="tl-side r">${e.side === 1 ? body : ''}</div></div>`);
  }
  if (!half) rows.push(`<div class="tl-sep">Polčas ${g[0]} : ${g[1]}</div>`);
  rows.push(`<div class="tl-sep end">Koniec ${res.hg} : ${res.ag}${res.pen ? ` · penalty ${res.pen.h}:${res.pen.a}` : ''}</div>`);
  return `<div class="card tl-card"><div class="card-h">Priebeh zápasu</div>
<div class="tl-head"><span>${crestSVG(h, 22)} ${U.esc(h.short)}</span><span>${U.esc(a.short)} ${crestSVG(a, 22)}</span></div>
<div class="ptimeline">${rows.join('')}</div></div>`;
}
// hodnotenia hráčov oboch tímov (od najlepšieho), ★ = hráč zápasu
function ratingsCard(x, res, h, a) {
  const rt = res.rt || x.m.rt, lu = res.lu || x.m.lu, sb = res.sb || x.m.sb || [[], []];
  if (!rt || !lu) return '';
  const inj = res.inj || x.m.inj || [], ev = res.ev || x.m.ev || [], cards = res.cards || x.m.cards || [];
  const mom = momOf(rt);
  const col = side => {
    const t = side ? a : h;
    const ids = [...lu[side], ...(sb[side] || [])].filter((id, i, arr) => rt[id] != null && arr.indexOf(id) === i && G.players[id]).sort((p, q) => rt[q] - rt[p]);
    const avg = ids.length ? Math.round(U.avg(ids.map(id => rt[id]))) : 0;
    return `<div class="rt-col"><div class="rt-h">${crestSVG(t, 20)}<span class="rt-tn">${U.esc(t.short)}</span><small>Ø</small>${rtPill(avg)}</div>${ids.map(id => {
      const p = G.players[id], g = ev.filter(e => e.pid === id).length, as = ev.filter(e => e.aid === id).length, cs = cards.filter(c => c.pid === id);
      const ic = (g ? `<i title="Góly">⚽${g > 1 ? '×' + g : ''}</i>` : '') + (as ? `<i class="rt-as" title="Asistencie">A${as > 1 ? '×' + as : ''}</i>` : '')
        + (cs.some(c => c.c === 'R') ? '<i>🟥</i>' : cs.length ? '<i>🟨</i>' : '') + (inj.some(e => e.pid === id) ? '<i title="Zranenie">🚑</i>' : '') + ((sb[side] || []).includes(id) ? '<i class="rt-sub" title="Striedal">▲</i>' : '');
      return `<div class="rt-row ${id === mom ? 'mom' : ''}" data-a="player" data-id="${id}">${dpBadge(p)}<span class="rt-n">${U.esc(pName(p))}${id === mom ? '<em title="Hráč zápasu">★</em>' : ''}</span><span class="rt-ic">${ic}</span>${rtPill(rt[id])}</div>`;
    }).join('')}</div>`;
  };
  return `<div class="card rt-card"><div class="card-h">Hodnotenia hráčov${mom != null ? `<span class="muted">★ Hráč zápasu: <b>${U.esc(pName(G.players[mom]))}</b></span>` : ''}</div><div class="rt-grid">${col(0)}${col(1)}</div></div>`;
}
function crowdCard(x, res, h, a) {
  const cr = res.crowd || x.m.crowd;
  if (!cr) return '';
  const u = userTeam(), opp = x.m.h === u.id ? a : h;
  const col = t => (U.lum(t.kit.p) > 0.85 ? t.kit.s : t.kit.p);
  const pm = Math.round(cr.mine / cr.att * 100), cap = x.m.neutral ? (x.comp === 'E' ? 60000 : 22500) : x.m.h === u.id && G.biz ? capacity() : (h.cap || REAL_CAPACITY[h.key] || DEF_CAP[h.lvl]);
  return `<div class="card crowd-card"><div class="card-h">Diváci <span class="muted">${Math.min(100, Math.round(cr.att / cap * 100))} % kapacity</span></div>
<div class="cr-big">👥 ${cr.att.toLocaleString('sk-SK')}</div>
<div class="cr-bar"><i style="width:${pm}%;background:${col(u)}"></i><i style="width:${100 - pm}%;background:${col(opp)}"></i></div>
<div class="cr-leg"><span><i style="background:${col(u)}"></i>tvoji fanúšikovia <b>${cr.mine.toLocaleString('sk-SK')}</b></span><span><b>${(cr.att - cr.mine).toLocaleString('sk-SK')}</b> ${U.esc(opp.short)}<i style="background:${col(opp)}"></i></span></div>
${G.biz ? `<div class="kv"><span>Nálada fanúšikov</span><b>${moodTag()}</b></div>` : ''}</div>`;
}
function statsCard(res) {
  const st = res.stats, cy = s => (res.cards || []).filter(c => c.side === s && c.c === 'Y').length, cr = s => (res.cards || []).filter(c => c.side === s && c.c === 'R').length;
  const row = (n, l, r) => { const t = Math.max(1, l + r); return `<div class="ps-row"><b>${l}</b><div class="ps-mid"><span>${n}</span><div class="ps-bar"><i style="width:${l / t * 100}%"></i><i style="width:${r / t * 100}%"></i></div></div><b>${r}</b></div>`; };
  return `<div class="card ps-card"><div class="card-h">Štatistiky</div>
${st ? row('Držanie lopty %', st.poss, 100 - st.poss) : ''}${st && st.xg ? row('xG (očakávané góly)', st.xg[0], st.xg[1]) : ''}${row('Strely', res.shots ? res.shots[0] : 0, res.shots ? res.shots[1] : 0)}${st ? row('Na bránu', st.onT[0], st.onT[1]) : ''}${st && st.big ? row('Veľké šance', st.big[0], st.big[1]) + row('Rohy', st.ck[0], st.ck[1]) + row('Prihrávky', st.pas[0], st.pas[1]) + row('Presnosť prihrávok %', st.acc[0], st.acc[1]) + row('Vyhraté súboje %', st.duel[0], st.duel[1]) : ''}${row('Žlté karty', cy(0), cy(1))}${row('Červené karty', cr(0), cr(1))}</div>`;
}

function screenSeasonEnd(sum) {
  const u = userTeam();
  const move = sum.move ? (sum.move.dir === 'up' ? `<div class="se-move up">⬆ POSTUP do súťaže ${sum.move.to}!</div>` : `<div class="se-move down">⬇ Zostup do súťaže ${sum.move.to}</div>`) : '';
  UI.root.innerHTML = `<div class="page season-end">
<div class="se-card"><div class="se-title">Koniec sezóny ${sum.season}</div>
${crestSVG(u, 90)}
<div class="se-pos"><b>${sum.pos}.</b> miesto · ${sum.league}<small>${sum.pts} bodov</small></div>
${move}
${sum.trophies.length ? `<div class="se-troph">${sum.trophies.map(t => `<div class="trophy big">${trophySVG(t.type, 110)}<b>${U.esc(t.name)}</b></div>`).join('')}</div>` : ''}
${sum.board ? `<div class="kv"><span>🏛️ ${U.esc(sum.board.goal)}</span><b class="${sum.board.met ? 'pos' : 'neg'}">${sum.board.met ? 'splnený' : 'nesplnený'} · dôvera ${sum.board.conf} %</b></div>` : ''}
${sum.mafia ? `<div class="neg-msg">⚖️ ${U.esc(sum.mafia)}</div>` : ''}
${(sum.objs || []).map(o => `<div class="kv"><span>${o.must ? '❗' : '🎯'} ${U.esc(o.txt)}</span><b class="${o.ok ? 'pos' : 'neg'}">${o.ok ? 'splnená' : 'nesplnená'}</b></div>`).join('')}
${sum.objCash ? `<div class="kv"><span>Prémia od vedenia</span><b class="pos">+${U.money(sum.objCash)}</b></div>` : ''}${sum.coachBonus ? `<div class="kv"><span>Tvoj bonus</span><b class="pos">+${U.money(sum.coachBonus)}</b></div>` : ''}
${(sum.lic || []).map(t => `<div class="neg-msg warn">📋 ${U.esc(t)}</div>`).join('')}
<div class="kv"><span>Prémia za umiestnenie</span><b>${U.money(sum.prize)}</b></div>
${(sum.cups || []).map(c => `<div class="kv"><span>${U.esc(c.name)}</span><b>${c.reach}${c.earn ? ` <small class="pos">+${U.money(c.earn)}</small>` : ''}</b></div>`).join('')}
${sum.youth.length ? `<div class="kv"><span>Noví hráči z mládeže</span><b>${sum.youth.map(U.esc).join(', ')}</b></div>` : ''}
${sum.retired.length ? `<div class="kv"><span>Ukončili kariéru</span><b>${sum.retired.map(U.esc).join(', ')}</b></div>` : ''}
</div>
<div class="card"><div class="card-h">Víťazi súťaží</div><div class="champs">${sum.champions.map(c => `<div class="kv"><span>${c.league}</span><b>${U.esc(c.team)}</b></div>`).join('')}</div></div>
${sum.jobs && sum.jobs.length ? jobsCard(sum.jobs, board().sacked) : ''}
${board().sacked ? '' : `<div class="pm-btns"><button class="btn btn-go big" data-a="tab" data-t="home">NOVÁ SEZÓNA ${seasonLabel()} ▶</button></div>`}</div>`;
  const cel = [];
  if (sum.pos === 1) cel.push({ kind: 'league', title: 'MAJSTER LIGY', name: sum.league, sub: `${sum.season} · ${sum.pts} bodov` });
  if (sum.move && sum.move.dir === 'up') cel.push({ kind: 'promo', title: 'POSTUP!', name: sum.move.to, sub: `Od sezóny ${seasonLabel()} hráš vyššiu súťaž` });
  if (cel.length) setTimeout(() => celebrate(cel), 300);
  else if (sum.trophies.length) SFX.init(), SFX.cheer();
}

// ─── Priebeh hry ────────────────────────────────────────────────
function onContinue() {
  if (G.maf && G.maf.court) { openCourt(); return; }
  if (board().sacked) { screenSacked(); return; }
  if (seasonOver()) {
    const sum = endSeason();
    saveGame();
    screenSeasonEnd(sum);
    return;
  }
  let skipped = 0;
  while (!seasonOver() && !userMatchToday() && skipped < 60) { finishDay(); skipped++; }
  if (skipped) saveGame();
  if (seasonOver()) { toast('Sezóna sa skončila!', 'good'); screenHub('home'); return; }
  if (skipped > 1) toast(`Odohralo sa ${skipped} hracích dní bez tvojho zápasu.`);
  screenPrematch(userMatchToday());
}

function startUserMatch(x, simulate) {
  const home = G.teams[x.m.h], away = G.teams[x.m.a];
  const knockout = x.comp === 'C' || !!x.ko;
  if (simulate) {
    const res = simMatch(home, away, { knockout, neutral: x.m.neutral });
    afterUserMatch(x, res);
    return;
  }
  UI.root.innerHTML = '<div id="mroot" class="mroot"></div>';
  document.body.classList.add('in-match');
  UI.match = new LiveMatch(document.getElementById('mroot'), {
    home, away, knockout, neutral: x.m.neutral, record: true,
    onEnd: res => { document.body.classList.remove('in-match'); UI.match = null; afterUserMatch(x, res); },
  });
}

function afterUserMatch(x, res) {
  recordResult(x, res);
  const info = finishDay();
  saveGame();
  screenPost(x, res, info);
}

function screenFriendly() {
  if (!G) buildWorld();
  const f = UI.fr || (UI.fr = { lh: 0, la: 0, h: G.leagues[0].tids[0], a: G.leagues[0].tids[1] });
  const pick = (side, lid, tid) => {
    const lg = G.leagues[lid];
    return `<div class="card fr-col"><div class="card-h">${side === 'h' ? 'Tvoj tím' : 'Súper'}</div>${leagueSelect(lid, 'fr_l' + side)}
<div class="fr-teams">${lg.tids.map(id => G.teams[id]).map(t => `<button class="fr-t ${t.id === tid ? 'sel' : ''}" data-a="frTeam" data-s="${side}" data-id="${t.id}">${crestSVG(t, 30)}<span>${U.esc(t.name)}</span><small>${teamRating(t)}</small></button>`).join('')}</div></div>`;
  };
  UI.root.innerHTML = `<div class="page"><div class="topbar"><button class="btn btn-ghost sm" data-a="toMenu">‹ Menu</button><div class="tb-title">PRIATEĽSKÝ ZÁPAS</div><span></span></div>
<div class="grid2">${pick('h', f.lh, f.h)}${pick('a', f.la, f.a)}</div>
<div class="pm-btns"><button class="btn btn-go big" data-a="frPlay">HRAŤ ▶</button></div></div>`;
}

function howTo() {
  modal(`<h3>Ako hrať</h3>
<p><b>Kariéra:</b> vyber si klub v ktorejkoľvek z 9 líg. Zostavuj tím, nakupuj hráčov a postupuj vyššie. Víťaz každej skupiny postupuje, posledný zostupuje. V Niké lige sa po 22. kole hrá nadstavba.</p>
<p><b>Zápas:</b> čas beží zrýchlene a pri šanciach sa hra spomalí. Svoje šance hráš sám:</p>
<ul><li><b>Potiahni</b> (švihni) myšou alebo prstom smerom k bránke = <b>strela</b>. Dlhší ťah = silnejšia strela, oblúk = falšovaná strela.</li>
<li><b>Klikni</b> na spoluhráča = <b>prihrávka</b>, klik do voľného priestoru = prihrávka do behu.</li>
<li><b>Podrž</b> prst/myš na ihrisku alebo použi <b>šípky / WASD</b> = beh s loptou. Bez ovládania hráč beží sám k bránke.</li>
<li><b>Medzerník</b> = strela smerom ku kurzoru, <b>E</b> = prihrávka, <b>P</b> = pauza a striedania.</li></ul>
<p><b>Zostava:</b> v záložke Tím <b>potiahni</b> hráča z lavičky na post na ihrisku (alebo medzi postami) – vymenia sa. Klik na hráča len otvorí jeho detail. Na mobile hráča z lavičky podrž a potiahni.</p>
<p><b>Kondícia</b> klesá po každom zápase – striedaj hráčov. Sila hráča na ihrisku závisí aj od toho, či hrá na svojom poste.</p>
<p><b>Prestupy:</b> kupovať a predávať môžeš počas letného (1. – 7. hrací deň) a zimného okna (20. – 25. deň); voľných hráčov a predĺženia zmlúv kedykoľvek. Pošli ponuku, klub ju prijme, odmietne alebo dá protiponuku. Môžeš pridať aj hráča na výmenu. Potom sa dohodni s hráčom na plate a dĺžke zmluvy.</p>
<p><b>Skauting:</b> neznámych hráčov vidíš len s odhadom sily (napr. 48 – 57). Skauti zisťujú presnú silu, atribúty, potenciál a typ hráča. Nastav im misiu (región, ligy, post, vek, zameranie) – nájdu talenty aj lacné posily.</p>
<p><b>Biznis klubu:</b> v záložke Financie podpisuj sponzorov (vyber z 3 ponúk, môžeš skúsiť vyjednať viac), nastav cenu lístkov, investuj do štadióna, fanshopu, občerstvenia a akadémie. V Pošte prichádzajú mimoriadne ponuky (reklama, koncert, prípravný zápas…).</p>
<p><b>Financie:</b> každý týždeň dostaneš peniaze od sponzorov a platíš platy. Hráči na predajnom zozname lákajú ponuky, ktoré prídu do Pošty. Hráčom s končiacou zmluvou ju predĺž, inak odídu zadarmo.</p>
<p class="muted small">Súpisky Niké ligy a 2. ligy sú podľa Wikipédie (stav jeseň 2026), kluby 3. ligy sú reálne. Hráči v nižších súťažiach a kluby 4. – 9. ligy (z reálnych obcí) sú vymyslené.</p>
<div class="m-btns"><button class="btn btn-go" data-m="ok">Rozumiem</button></div>`);
}

function openTeam(tid) {
  const t = G.teams[tid];
  if (!t) return;
  const ps = sortSquad(teamPlayers(t));
  const lg = leagueOf(t);
  const rv = rivalsOf(t).slice(0, 3);
  const md = modal(`<div class="mt-head">${crestSVG(t, 64)}<div><h3>${U.esc(t.name)}</h3><div class="muted">${lg.name} · ${U.esc(t.city)} · OVR ${teamRating(t)}</div>
<div class="mt-fans">${tempTag(t)} <span class="muted">fanúšikovia ${tempName(t.fa)}</span>${rv.length ? ` · ⚔️ ${rv.map(([r, l, n]) => `<b title="${U.esc(n)}">${U.esc(r.short)}</b>`).join(', ')}` : ''}</div></div></div>
<div class="mr-list modal-list">${ps.map(p => marketRow(p)).join('')}</div>
<div class="m-btns"><button class="btn btn-ghost" data-m="x">Zavrieť</button></div>`, { cls: 'xwide' });
  paintFigures(md.el);
}

function rerender() {
  if (document.querySelector('.hub')) screenHub();
}

function remapFormation(t, form) {
  const ids = t.lineup.filter(id => id >= 0);
  t.form = form;
  const slots = FORMATIONS[form];
  const used = new Set();
  const out = new Array(11).fill(-1);
  for (const pos of ['GK', 'DF', 'MF', 'FW']) {
    slots.forEach((s, i) => {
      if (s[0] !== pos) return;
      let best = null, bv = -1;
      for (const id of ids) { if (used.has(id)) continue; const v = effR(G.players[id], pos, s); if (v > bv) { bv = v; best = id; } }
      if (best != null) { out[i] = best; used.add(best); }
    });
  }
  t.lineup = out;
  validateLineup(t);
}

// ─── Akcie ──────────────────────────────────────────────────────
const ACT = {
  newCareer() {
    const go = () => { buildWorld(); UI.ng = { step: 1, lvl: null, lid: null, tid: null, coach: '' }; screenNew(); };
    if (hasSave()) confirmBox('Nová kariéra', 'Uložená kariéra sa prepíše. Pokračovať?', 'Začať odznova', go, 'btn-bad');
    else go();
  },
  continueCareer() {
    if (!loadGame()) { toast('Uloženú hru sa nepodarilo načítať.', 'bad'); return; }
    migrateSave();
    UI.tab = 'home'; UI.sel = null; UI.tableLid = null; screenHub('home');
  },
  friendly() { UI.fr = null; screenFriendly(); },
  howto() { howTo(); },
  toMenu() { screenMenu(); },
  ngLvl(el) {
    const l = +el.dataset.l; UI.ng.lvl = l;
    if (l <= 2) { UI.ng.lid = G.leagues.find(x => x.lvl === l).id; UI.ng.step = 3; } else UI.ng.step = 2;
    UI.ng.tid = null; screenNew();
  },
  ngGroup(el) { UI.ng.lid = +el.dataset.id; UI.ng.step = 3; UI.ng.tid = null; screenNew(); },
  ngTeam(el) {
    const c = document.getElementById('coachName'); if (c) UI.ng.coach = c.value;
    UI.ng.tid = +el.dataset.id; screenNew();
  },
  ngBack() {
    const ng = UI.ng;
    if (ng.step === 1) { G = null; screenMenu(); return; }
    ng.step = ng.step === 3 && ng.lvl >= 3 ? 2 : 1; ng.tid = null; screenNew();
  },
  ngStart() {
    const ng = UI.ng;
    if (ng.tid == null) return;
    const c = document.getElementById('coachName');
    G.coach = (c && c.value.trim()) || 'Tréner';
    G.userTid = ng.tid;
    startSeason();
    setupCareerMarket();
    dayStartEvents();
    const t = userTeam();
    news(`${G.coach} sa stal novým trénerom klubu ${t.name}. Cieľ vedenia: ${boardGoal(t).toLowerCase()}.`, 'good');
    saveGame();
    UI.tab = 'home'; UI.sel = null; UI.tableLid = null;
    screenHub('home');
  },
  tab(el) { UI.sel = null; UI.tf.page = 0; screenHub(el.dataset.t); },
  continue() { onContinue(); },
  playMatch() { if (UI.pending) startUserMatch(UI.pending, false); },
  simMatch() { if (UI.pending) startUserMatch(UI.pending, true); },
  postDone() { UI.tab = 'home'; screenHub('home'); },
  autoXI() {
    const u = userTeam(), before = u.lineup.slice(), p0 = lineupPower(u);
    autoLineup(u);
    const p1 = lineupPower(u), ch = u.lineup.filter((id, i) => id !== before[i]).length, f1 = formFit(u, u.form);
    // porovná aj ostatné formácie
    let best = null;
    for (const f of Object.keys(FORMATIONS)) {
      if (f === u.form) continue;
      const pw = formFit(u, f);
      if (!best || pw > best.pw) best = { f, pw };
    }
    // formácia, v ktorej hráči hrajú najviac na svojich postoch
    UI.formTip = best && best.pw > f1 + 0.8 ? { f: best.f, gain: best.pw - f1, from: u.form } : null;
    UI.sel = null; saveGame(); renderTab();
    const tired = u.lineup.map(id => G.players[id]).filter(p => p && p.fit < 70).length;
    toast(ch && Math.abs(p1 - p0) >= 0.05 ? `Auto zostava: ${ch} ${ch === 1 ? 'zmena' : ch <= 4 ? 'zmeny' : 'zmien'}, sila ${p0.toFixed(1).replace('.', ',')} → ${p1.toFixed(1).replace('.', ',')}${tired ? ` · ${tired} unavení hráči ostali, lepší nie sú` : ''}` : 'Zostava je už najlepšia možná pre túto formáciu.', ch ? 'good' : '');
  },
  ment(el) { userTeam().ment = +el.dataset.v; saveGame(); renderTab(); },
  press(el) { userTeam().press = +el.dataset.v; saveGame(); renderTab(); },
  team(el, e) { e && e.stopPropagation(); openTeam(+el.dataset.id); },
  fixR(el) { UI.fixRound = +el.dataset.v; renderTab(); },
  cupR(el) { UI.cupRound = +el.dataset.v; UI.cupAll = false; renderTab(); },
  cupGo(el) { UI.cupK = el.dataset.v; UI.cupRound = null; UI.cupAll = false; UI.euroR = null; if (UI.tab !== 'cup') screenHub('cup'); else renderTab(); },
  cupAll() { UI.cupAll = true; renderTab(); },
  set(el) {
    const k = el.dataset.k; let v = el.dataset.v;
    if (k === 'sound') v = v === 'true'; if (k === 'speed') v = +v;
    G.settings[k] = v; saveGame(); renderTab();
  },
  saveNow() { toast(saveGame() ? 'Hra uložená.' : 'Uloženie zlyhalo.', 'good'); },
  exportSave() {
    const blob = new Blob([saveString()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `slovak-champs-${U.plain(userTeam().short)}-${G.year}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  deleteCareer() {
    confirmBox('Zmazať kariéru', 'Kariéra sa natrvalo zmaže. Pokračovať?', 'Zmazať', () => { deleteSave(); G = null; screenMenu(); }, 'btn-bad');
  },
  frTeam(el) { const f = UI.fr; f[el.dataset.s] = +el.dataset.id; screenFriendly(); },
  frPlay() {
    const f = UI.fr;
    if (f.h === f.a) { toast('Vyber dva rôzne tímy.', 'bad'); return; }
    const home = G.teams[f.h], away = G.teams[f.a];
    UI.root.innerHTML = '<div id="mroot" class="mroot"></div>';
    document.body.classList.add('in-match');
    const savedU = G.userTid;
    UI.match = new LiveMatch(document.getElementById('mroot'), {
      home, away, userSide: 0, record: false, control: 'manual',
      onEnd: res => {
        document.body.classList.remove('in-match'); UI.match = null;
        G.userTid = savedU;
        screenFriendly();
        modal(`<h3>Priateľský zápas</h3><div class="pr-line"><div class="vs-t">${crestSVG(home, 56)}<b>${U.esc(home.name)}</b></div><div class="pr-score">${res.hg} : ${res.ag}</div><div class="vs-t">${crestSVG(away, 56)}<b>${U.esc(away.name)}</b></div></div><div class="m-btns"><button class="btn btn-go" data-m="ok">OK</button></div>`);
      },
    });
  },
};

const CHG = {
  form(el) { remapFormation(userTeam(), el.value); UI.sel = null; saveGame(); renderTab(); },
  tableLg(el) { UI.tableLid = +el.value; renderTab(); },
  fr_lh(el) { UI.fr.lh = +el.value; UI.fr.h = G.leagues[+el.value].tids[0]; screenFriendly(); },
  fr_la(el) { UI.fr.la = +el.value; UI.fr.a = G.leagues[+el.value].tids[1] ?? G.leagues[+el.value].tids[0]; screenFriendly(); },
  importSave(el) {
    const file = el.files && el.files[0];
    if (!file) return;
    file.text().then(txt => {
      try {
        const data = restoreSave(JSON.parse(txt));
        if (!data.teams || !data.players) throw new Error('bad');
        G = data; migrateSave(); saveGame(); toast('Uloženie načítané.', 'good'); screenHub('home');
      } catch (e) { toast('Súbor nie je platné uloženie.', 'bad'); }
    });
  },
};

function initUI() {
  UI.root = document.getElementById('app');
  UI.root.addEventListener('click', e => {
    const el = e.target.closest('[data-a]');
    if (!el || el.disabled) return;
    const f = ACT[el.dataset.a];
    if (f) f(el, e);
    if (el.dataset.a === 'player') paintFigures(document);
  });
  const onChg = e => {
    const el = e.target.closest('[data-c]');
    if (!el) return;
    const f = CHG[el.dataset.c];
    if (f) f(el, e);
  };
  const LIVE = UI.live || new Set();
  UI.root.addEventListener('change', e => { if (!LIVE.has(e.target.dataset.c)) onChg(e); });
  UI.root.addEventListener('input', e => { if (LIVE.has(e.target.dataset.c)) onChg(e); });
  initTeamDnD();
  screenMenu();
}
