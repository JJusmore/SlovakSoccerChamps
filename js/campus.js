'use strict';
// ─── Areál klubu v 3D pohľade (zhora pod uhlom): budovy s výškou, tribúny, stožiare ───

function campusRand(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const PLOT_NAME = { family: 'Rodinná zóna', scout: 'Skauting', youth: 'Akadémia', recov: 'Regenerácia', train: 'Tréningové centrum', park: 'Parkovisko', shop: 'Fanshop', cater: 'Občerstvenie', mkt: 'Marketing', heat: 'Vyhrievanie', fanzone: 'Fanzóna', museum: 'Múzeum', video: 'Videoanalytika', medical: 'Zdravotné stredisko', dorm: 'Internát', solar: 'Solárne panely', resto: 'Reštaurácia', media: 'Mediálne centrum' };

function campusSVG(opts = {}) {
  const u = userTeam(), b = G.biz;
  bizEnsure();
  const f = b.fac, building = new Set((b.build || []).map(x => x.k));
  const k = u.kit;
  const seat = U.lum(k.p) > 0.8 ? k.s : k.p;
  const seat2 = U.shade(seat, -0.28), seatL = U.shade(seat, 0.2);
  const wallC = U.lum(k.p) > 0.85 ? U.shade(k.s, -0.05) : U.shade(k.p, -0.12);
  const alt = U.colorDist(k.s, seat) > 90 ? k.s : U.shade(seat, 0.35);
  const R = campusRand(U.hash(u.name));
  const GND = [], OBJ = [], T = [];
  const lvl = key => f[key] || 0;
  const grp = (key, inner, title) => `<g class="cp-b" data-a="facFocus" data-v="${key}"><title>${U.esc(title)}</title>${inner}</g>`;
  const ttl = (key, extra) => `${FAC[key].name} – úroveň ${lvl(key)}${extra ? ', ' + extra : ''}`;
  const add = (z, s) => OBJ.push([z, s]);

  // ── pomocné kreslenie
  const SH = (x, y, w, d, H) => { const sx = H * 0.6, sy = H * 0.3; return `<path d="M${x + w} ${y}L${x + w + sx} ${y + sy}L${x + w + sx} ${y + d + sy}L${x + sx} ${y + d + sy}L${x} ${y + d}L${x + w} ${y + d}Z" fill="rgba(0,0,0,.24)"/>`; };
  // kváder: (x, y, w, d) = pôdorys na zemi, H = výška
  const box = (x, y, w, d, H, roof, o = {}) => {
    const wall = o.wall || U.shade(roof, -0.32), top = y - H, fy = y + d - H;
    let s = o.noShadow ? '' : SH(x, y, w, d, H);
    s += `<rect x="${x}" y="${fy}" width="${w}" height="${H}" fill="${wall}"/><rect x="${x}" y="${fy}" width="${w}" height="${H}" fill="url(#cpWallG)"/>`;
    if (o.win !== false && H >= 12) {
      const rows = Math.max(1, Math.floor((H - 5) / 11));
      for (let r = 0; r < rows; r++) for (let i = x + 6; i + 7 <= x + w - 5; i += 12) s += `<rect x="${i}" y="${fy + 4 + r * 11}" width="7" height="6" rx="1" fill="${o.winC || '#cfe9ff'}" opacity=".9"/>`;
    }
    if (o.door) s += `<rect x="${x + w / 2 - 6}" y="${y + d - Math.min(11, H - 2)}" width="12" height="${Math.min(11, H - 2)}" fill="${U.shade(wall, -0.45)}"/>`;
    s += `<rect x="${x}" y="${top}" width="${w}" height="${d}" fill="${roof}"/>`;
    if (o.pitched) s += `<rect x="${x}" y="${top + d * 0.5}" width="${w}" height="${d * 0.5}" fill="rgba(0,0,0,.14)"/><line x1="${x}" y1="${top + d * 0.5}" x2="${x + w}" y2="${top + d * 0.5}" stroke="rgba(255,255,255,.4)" stroke-width="1.2"/>`;
    s += `<rect x="${x}" y="${top}" width="${w}" height="${d}" fill="url(#cpRoofG)"/><rect x="${x + 0.5}" y="${top + 0.5}" width="${w - 1}" height="${d - 1}" fill="none" stroke="rgba(0,0,0,.22)"/><line x1="${x}" y1="${fy}" x2="${x + w}" y2="${fy}" stroke="rgba(255,255,255,.45)"/>`;
    if (o.ac) for (let i = 0; i < o.ac; i++) s += `<rect x="${x + 8 + i * 16}" y="${top + 6}" width="10" height="6" fill="#aeb4c0"/><rect x="${x + 8 + i * 16}" y="${top + 12}" width="10" height="3" fill="#7d8494"/>`;
    if (o.solar) for (let i = 0; i < o.solar; i++) s += `<rect x="${x + w - 16 - i * 18}" y="${top + 5}" width="13" height="${Math.max(6, d - 12)}" fill="#24356f" stroke="#8fb4ff" stroke-width=".6"/>`;
    return s;
  };
  const tree = (x, y, r) => `<ellipse cx="${x + r * 0.8}" cy="${y + 2}" rx="${r * 1.15}" ry="${r * 0.42}" fill="rgba(0,0,0,.25)"/><rect x="${x - 2}" y="${y - 9}" width="4" height="10" fill="#6b4a2b"/><circle cx="${x}" cy="${y - r - 5}" r="${r}" fill="url(#cpTree)"/>`;
  const car = (x, y, c, v) => v
    ? `<rect x="${x + 3}" y="${y + 3}" width="14" height="24" rx="4" fill="rgba(0,0,0,.25)"/><rect x="${x}" y="${y}" width="14" height="24" rx="4" fill="${c}"/><rect x="${x + 2}" y="${y + 6}" width="10" height="11" rx="2" fill="rgba(20,30,60,.55)"/><rect x="${x + 3}" y="${y + 1}" width="8" height="3" rx="1" fill="rgba(255,255,255,.5)"/>`
    : `<rect x="${x + 3}" y="${y + 3}" width="26" height="13" rx="4" fill="rgba(0,0,0,.25)"/><rect x="${x}" y="${y}" width="26" height="13" rx="4" fill="${c}"/><rect x="${x + 7}" y="${y + 2}" width="12" height="9" rx="2" fill="rgba(20,30,60,.55)"/>`;
  const crane = (x, y, s = 1) => `<g class="cp-crane" transform="translate(${x},${y}) scale(${s})"><line x1="0" y1="0" x2="50" y2="22" stroke="rgba(0,0,0,.25)" stroke-width="6"/><rect x="-4" y="-80" width="8" height="80" fill="#f4b400"/><path d="M-4 -80 L4 -72 M4 -80 L-4 -72 M-4 -60 L4 -52 M4 -60 L-4 -52 M-4 -40 L4 -32 M4 -40 L-4 -32" stroke="#a87b00" stroke-width="1"/><rect x="-4" y="-86" width="78" height="7" fill="#f4b400"/><rect x="-28" y="-86" width="24" height="7" fill="#c98f00"/><rect x="-32" y="-80" width="12" height="13" fill="#555"/><line x1="60" y1="-79" x2="60" y2="-44" stroke="#ddd" stroke-width="1.5"/><rect x="54" y="-44" width="12" height="9" fill="#888"/><line x1="0" y1="-86" x2="32" y2="-104" stroke="#f4b400" stroke-width="2"/><line x1="32" y1="-104" x2="74" y2="-86" stroke="#f4b400" stroke-width="1.5"/></g>`;
  const works = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="rgba(244,180,0,.12)" stroke="#f4b400" stroke-width="2" stroke-dasharray="6 5"/>`;
  const plot = (key, x, y, w, h) => {
    const nm = PLOT_NAME[key] || FAC[key].name, small = w < 90, tall = h > 52;
    const cx = small || tall ? x + w / 2 : x + w / 2 - nm.length * 3.3 - 8, cy = tall && !small ? y + h / 2 - 8 : y + h / 2;
    return grp(key, `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="9" class="cp-plot"/><circle cx="${cx}" cy="${cy}" r="10" class="cp-pc"/><path d="M${cx - 4.5} ${cy}h9M${cx} ${cy - 4.5}v9" class="cp-pp"/>${small ? '' : `<text x="${tall ? cx : cx + 16}" y="${tall ? cy + 25 : cy + 4.5}" class="cp-plus" text-anchor="${tall ? 'middle' : 'start'}">${U.esc(nm)}</text>`}`, `${FAC[key].name} – voľný pozemok, klikni a postav`);
  };
  const tag = (key, x, y, name, alignR) => {
    const lv = lvl(key), mx = FAC[key].max, bl = building.has(key);
    const sp = mx > 8 ? 6 : 9, nw = Math.round(name.length * 7.3 + 8), tw = nw + 22 + mx * sp + (bl ? 18 : 0);
    const tx = alignR ? x - tw : x;
    let p = '';
    for (let i = 0; i < mx; i++) p += `<circle cx="${tx + 14 + nw + i * sp}" cy="${y + 10}" r="${mx > 8 ? 2.3 : 3.2}" class="${i < lv ? 'on' : bl && i === lv ? 'bl' : ''}"/>`;
    T.push(`<g class="cp-tag" data-a="facFocus" data-v="${key}"><rect x="${tx}" y="${y}" width="${tw}" height="20" rx="10"/><text x="${tx + 10}" y="${y + 14}">${U.esc(name)}</text>${p}${bl ? `<text x="${tx + tw - 16}" y="${y + 14}" class="cp-tw">⚒</text>` : ''}</g>`);
  };
  const flat = (x, y, w, d, fill, rx = 6) => `<rect x="${x + 2}" y="${y + 3}" width="${w}" height="${d}" rx="${rx}" fill="rgba(0,0,0,.18)"/><rect x="${x}" y="${y}" width="${w}" height="${d}" rx="${rx}" fill="${fill}"/>`;
  const pitch = (x, y, w, h, fence) => {
    let s = `<rect x="${x - 5}" y="${y - 5}" width="${w + 10}" height="${h + 10}" rx="3" fill="#3f8a2e"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#cpPitch)"/>`;
    s += `<g fill="none" stroke="rgba(255,255,255,.85)" stroke-width="1.3"><rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="${h - 4}"/><line x1="${x + w / 2}" y1="${y + 2}" x2="${x + w / 2}" y2="${y + h - 2}"/><circle cx="${x + w / 2}" cy="${y + h / 2}" r="${Math.min(12, h / 6)}"/><rect x="${x + 2}" y="${y + h / 2 - h / 5}" width="${w / 9}" height="${h * 0.4}"/><rect x="${x + w - 2 - w / 9}" y="${y + h / 2 - h / 5}" width="${w / 9}" height="${h * 0.4}"/></g>`;
    s += `<rect x="${x - 4}" y="${y + h / 2 - 7}" width="4" height="14" fill="#fff"/><rect x="${x + w}" y="${y + h / 2 - 7}" width="4" height="14" fill="#fff"/>`;
    if (fence) s += `<rect x="${x - 8}" y="${y - 8}" width="${w + 16}" height="${h + 16}" rx="3" fill="none" stroke="rgba(230,235,245,.55)" stroke-width="1.4" stroke-dasharray="2 3"/>`;
    return s;
  };

  // ── terén
  const defs = `<defs>
<linearGradient id="cpG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f6c29"/><stop offset="1" stop-color="#3b8232"/></linearGradient>
<pattern id="cpMow" width="44" height="44" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="22" height="44" fill="rgba(255,255,255,.03)"/></pattern>
<pattern id="cpPitch" width="32" height="200" patternUnits="userSpaceOnUse"><rect width="16" height="200" fill="#4fa83a"/><rect x="16" width="16" height="200" fill="#5cb544"/></pattern>
<pattern id="cpSeatH" width="8" height="5" patternUnits="userSpaceOnUse"><rect width="8" height="5" fill="${seat}"/><rect y="3" width="8" height="2" fill="${seat2}"/></pattern>
<pattern id="cpSeatV" width="5" height="8" patternUnits="userSpaceOnUse"><rect width="5" height="8" fill="${seat}"/><rect x="3" width="2" height="8" fill="${seat2}"/></pattern>
<pattern id="cpSeatH2" width="8" height="10" patternUnits="userSpaceOnUse"><rect width="8" height="5" fill="${seat}"/><rect y="3" width="8" height="2" fill="${seat2}"/><rect y="5" width="8" height="5" fill="${alt}"/><rect y="8" width="8" height="2" fill="${U.shade(alt, -0.25)}"/></pattern>
<pattern id="cpSeatV2" width="10" height="8" patternUnits="userSpaceOnUse"><rect width="5" height="8" fill="${seat}"/><rect x="3" width="2" height="8" fill="${seat2}"/><rect x="5" width="5" height="8" fill="${alt}"/><rect x="8" width="2" height="8" fill="${U.shade(alt, -0.25)}"/></pattern>
<pattern id="cpPave" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#bdb6a0"/><path d="M0 7h14M7 0v7M0 14h14" stroke="#aaa38c" stroke-width="1"/></pattern>
<pattern id="cpHeat" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="2" fill="#ff8a3a"/></pattern>
<linearGradient id="cpWallG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".14"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>
<linearGradient id="cpRoofG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="cpOver" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".35"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
<radialGradient id="cpTree" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#5cbf55"/><stop offset=".55" stop-color="#2e7d32"/><stop offset="1" stop-color="#1a4a1e"/></radialGradient>
<radialGradient id="cpLight"><stop offset="0" stop-color="#fffbd0" stop-opacity=".95"/><stop offset="1" stop-color="#fffbd0" stop-opacity="0"/></radialGradient>
<radialGradient id="cpDome" cx=".4" cy=".3"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#aab6cc"/></radialGradient>
<linearGradient id="cpWater" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7fdcff"/><stop offset="1" stop-color="#2a8ee0"/></linearGradient>
<linearGradient id="cpSolar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a5bbf"/><stop offset="1" stop-color="#1c2c66"/></linearGradient>
<filter id="cpGlow" x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="1.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<linearGradient id="cpSlab" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a5532"/><stop offset=".5" stop-color="#5a3d22"/><stop offset="1" stop-color="#3a2614"/></linearGradient>
</defs>`;
  GND.push(`<rect x="0" y="0" width="1200" height="672" rx="18" fill="url(#cpG)"/><rect x="0" y="0" width="1200" height="672" rx="18" fill="url(#cpMow)"/>
<rect x="0" y="648" width="1200" height="24" fill="url(#cpPave)"/><rect x="0" y="672" width="1200" height="6" fill="#8f8d82"/>
<rect x="0" y="678" width="1200" height="54" fill="#3a3f4a"/><line x1="0" y1="705" x2="1200" y2="705" stroke="#e8e8e8" stroke-width="3" stroke-dasharray="26 18"/>
<path d="M0 732 H1200 V748 Q1200 760 1188 760 H12 Q0 760 0 748 Z" fill="url(#cpSlab)"/><path d="M0 732 H1200" stroke="rgba(255,255,255,.18)" stroke-width="2"/>`);
  const trees = [[22, 128], [22, 430], [292, 122], [584, 128], [840, 506], [1186, 160], [1186, 452], [962, 534], [900, 528], [22, 650], [352, 128]];
  for (const [x, y] of trees) add(y, tree(x, y, 11 + R() * 6));

  // ── štadión
  const st = lvl('stad');
  const PX = 440, PY = 250, PW = 320, PH = 196;
  // úrovne 8 – 15: veľký štadión – vyššie tribúny, viac poschodí, membránová strecha, LED pás, oblúk
  const dep = [16, 22, 28, 34, 40, 46, 46, 46, 48, 48, 50, 50, 52, 52, 54, 54][st], HS = [8, 14, 18, 24, 30, 36, 38, 40, 44, 48, 52, 56, 60, 64, 68, 72][st];
  const mega = st >= 8;
  const bowl = st >= 5, ext = bowl ? dep : 0;
  const rf = lvl('roof'), seatsL = lvl('seats'), ko = lvl('kotol'), fa = lvl('facade'), ld = lvl('led');
  const roofS = st >= 4 || rf >= 1, roofN = st >= 4 || rf >= 2, roofW = st >= 4 || rf >= 3;
  const seatFH = seatsL >= 2 ? 'url(#cpSeatH2)' : 'url(#cpSeatH)', seatFV = seatsL >= 3 ? 'url(#cpSeatV2)' : 'url(#cpSeatV)';
  const nS = st >= 2 ? { x: PX - ext, y: PY - dep - 6, w: PW + 2 * ext, d: dep, H: HS + 8 } : null;
  const sS = st >= 1 ? { x: PX - ext, y: PY + PH + 6, w: PW + 2 * ext, d: dep + (st >= 3 ? 4 : 0), H: Math.min(56, HS + 4) } : { x: PX + 100, y: PY + PH + 6, w: 120, d: 16, H: 8 };
  const wS = st >= 3 ? { x: PX - dep - 6, y: PY, w: dep, d: PH, H: HS } : null;
  const eS = st >= 3 ? { x: PX + PW + 6, y: PY, w: dep, d: PH, H: HS } : null;
  const ox = PX - (st >= 3 ? dep + 14 : 18), oy = PY - (st >= 2 ? dep + 14 : 18), ox2 = PX + PW + (st >= 3 ? dep + 14 : 18), oy2 = sS.y + sS.d + 8;
  const attRatio = b.attLast ? U.clamp(b.attLast / capacity(), 0, 1) : U.clamp(b.fans / capacity(), 0, 1) * 0.8;
  const crowd = (x, y, w, h) => {
    let c = '';
    const n = Math.round(w * h / 50 * attRatio), cols = ['#ffffff', seatL, '#ffd200', '#f2c9a0', '#e8b88a', '#222'];
    for (let i = 0; i < n; i++) c += `<rect x="${(x + R() * (w - 2)).toFixed(1)}" y="${(y + R() * (h - 2)).toFixed(1)}" width="2" height="2" fill="${cols[(R() * cols.length) | 0]}"/>`;
    return c;
  };
  // zem štadióna a ihrisko
  let sg = `<rect x="${ox + 3}" y="${oy + 4}" width="${ox2 - ox}" height="${oy2 - oy}" rx="${bowl ? 40 : 12}" fill="rgba(0,0,0,.2)"/><rect x="${ox}" y="${oy}" width="${ox2 - ox}" height="${oy2 - oy}" rx="${bowl ? 40 : 12}" fill="${st >= 1 ? '#767b70' : '#5e6a4f'}"/>`;
  sg += pitch(PX, PY, PW, PH);
  if (lvl('heat')) sg += `<rect x="${PX}" y="${PY}" width="${PW}" height="${PH}" fill="url(#cpHeat)" opacity=".14"/>`;
  if (lvl('lights')) sg += `<ellipse cx="${PX + PW / 2}" cy="${PY + PH / 2}" rx="${PW * 0.55}" ry="${PH * 0.55}" fill="#fffbd0" opacity=".1"/>`;
  if (st === 0) sg += `<rect x="${PX - 10}" y="${PY - 10}" width="${PW + 20}" height="${PH + 20}" fill="none" stroke="#c8b78a" stroke-width="2" stroke-dasharray="3 3"/>`;
  GND.push(grp('stad', sg, ttl('stad', `${capacity().toLocaleString('sk-SK')} miest`)));
  if (ld) {
    const cols = ['#ffd200', '#1d4fa3', '#2ecc71', k.p, '#ff5a5f', '#ffffff'];
    const segs = (x, y, len, vert) => { let o = ''; for (let i = 0; i * 26 + 24 <= len; i++) o += vert ? `<rect x="${x}" y="${y + i * 26}" width="4" height="24" fill="${cols[i % 6]}"/>` : `<rect x="${x + i * 26}" y="${y}" width="24" height="4" fill="${cols[i % 6]}"/>`; return o; };
    let lg = segs(PX + 6, PY + PH + 3, PW - 12);
    if (ld >= 2) lg += segs(PX + 6, PY - 7, PW - 12);
    if (ld >= 3) lg += segs(PX - 8, PY + 8, PH - 16, true) + segs(PX + PW + 4, PY + 8, PH - 16, true);
    GND.push(grp('led', `<g filter="url(#cpGlow)">${lg}</g>`, ttl('led')));
  }
  // vstupná alej
  GND.push(`<rect x="570" y="${oy2 - 4}" width="60" height="${652 - oy2 + 4}" fill="url(#cpPave)"/>${Array.from({ length: Math.max(0, Math.floor((640 - oy2) / 34)) }, (_, i) => `<circle cx="563" cy="${oy2 + 16 + i * 34}" r="3" fill="#fff8c0"/><circle cx="637" cy="${oy2 + 16 + i * 34}" r="3" fill="#fff8c0"/>`).join('')}`);

  if (fa >= 3) {
    let fl = '';
    for (let fy2 = oy2 + 24; fy2 < 640; fy2 += 40) for (const fx of [556, 644]) fl += `<line x1="${fx}" y1="${fy2}" x2="${fx + 12}" y2="${fy2 + 5}" stroke="rgba(0,0,0,.2)" stroke-width="2"/><rect x="${fx - 1}" y="${fy2 - 34}" width="2" height="34" fill="#ccc"/><rect x="${fx + 1}" y="${fy2 - 34}" width="14" height="10" fill="${(fy2 / 40 | 0) % 2 ? k.p : k.s}" stroke="rgba(0,0,0,.2)" stroke-width=".5"/>`;
    add(oy2 + 30, grp('facade', fl, ttl('facade')));
  }
  const fm = lvl('family');
  if (fm) {
    GND.push(grp('family', flat(322, 296, 48, 80, '#e3d3a0', 8) + (fm >= 2 ? '<circle cx="358" cy="360" r="9" fill="#f2e6c2" stroke="#c9b88a"/>' : ''), ttl('family')));
    let fs = box(328, 304, 14, 22, 14, '#ff5a5f', { win: false }) + `<path d="M342 ${326 - 6} L352 326" stroke="#ffd23f" stroke-width="3"/>`;
    fs += `<path d="M346 336 V318 H366 V336" fill="none" stroke="#7d8597" stroke-width="2"/><line x1="352" y1="318" x2="352" y2="330" stroke="#aaa"/><line x1="360" y1="318" x2="360" y2="330" stroke="#aaa"/><rect x="349" y="330" width="6" height="2" fill="#3fa4ff"/><rect x="357" y="330" width="6" height="2" fill="#ff7bd5"/>`;
    if (fm >= 2) fs += `<rect x="330" y="356" width="18" height="5" rx="1" fill="#8a5a2a"/><circle cx="358" cy="357" r="4" fill="#2ecc71"/>`;
    add(376, grp('family', fs, ttl('family')));
  } else GND.push(plot('family', 322, 296, 48, 80));
  if (building.has('family')) add(380, crane(360, 380, 0.45));
  for (const kk of ['roof', 'seats', 'led', 'facade', 'kotol']) if (building.has(kk)) add(oy2 + 2, crane(kk === 'facade' ? PX + 40 : PX + PW - 40, oy2 + 2, 0.6));

  // stožiare osvetlenia
  const L = lvl('lights');
  const mast = (bx, by) => {
    const MH = 92;
    return `<line x1="${bx}" y1="${by}" x2="${bx + MH * 0.55}" y2="${by + MH * 0.26}" stroke="rgba(0,0,0,.22)" stroke-width="3"/><rect x="${bx - 2}" y="${by - MH}" width="4" height="${MH}" fill="#b9bfcc"/><rect x="${bx - 1}" y="${by - MH}" width="1.4" height="${MH}" fill="#eef1f6"/>
<circle cx="${bx}" cy="${by - MH - 4}" r="30" fill="url(#cpLight)"/><rect x="${bx - 12}" y="${by - MH - 10}" width="24" height="12" rx="2" fill="#f2f4f8" stroke="#7d8597"/>${[-7, 0, 7].map(dx => `<circle cx="${bx + dx}" cy="${by - MH - 4}" r="2.4" fill="#fff6a0"/>`).join('')}`;
  };
  const corners = [[ox + 8, oy + 8], [ox2 - 8, oy + 8], [ox + 8, oy2 - 8], [ox2 - 8, oy2 - 8]];
  if (!L) GND.push(grp('lights', corners.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="8" class="cp-plot"/>`).join(''), 'Osvetlenie – zatiaľ nepostavené'));

  let sd = '';
  if (L) sd += grp('lights', mast(corners[0][0], corners[0][1]) + mast(corners[1][0], corners[1][1]), ttl('lights'));
  // severná tribúna (vidno sedadlá smerom k ihrisku)
  let stand = '', kot = '', fac = '';
  const tiers = st >= 13 ? 5 : st >= 10 ? 4 : st >= 7 ? 3 : st >= 6 ? 2 : 1;
  const mosC = U.colorDist(k.s, seat) > 120 ? k.s : U.lum(seat) > 0.6 ? '#1a1a2e' : '#ffffff';
  const kotol = (x, y, w, h) => {
    let o = '';
    if (ko >= 2) o += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${k.p}" opacity=".9"/><path d="${Array.from({ length: Math.ceil(w / 12) }, (_, i) => `M${x + i * 12} ${y + h}l8 ${-h}h4l-8 ${h}z`).join('')}" fill="${k.s}" opacity=".85"/>`;
    if (ko >= 3) o += `<text x="${x + w / 2}" y="${y + h * 0.72}" font-size="${Math.round(h * 0.62)}" class="cp-mosaic" fill="#fff" text-anchor="middle">${U.esc(u.short)}</text>${[0, 1, 2].map(i => `<circle cx="${x + 10 + i * (w - 20) / 2}" cy="${y - 6 - i % 2 * 4}" r="${7 + i}" fill="#d9dce6" opacity=".45"/>`).join('')}`;
    for (let i = 0; i < 4; i++) o += `<line x1="${x + 6 + i * (w - 12) / 3}" y1="${y + 4}" x2="${x + 6 + i * (w - 12) / 3}" y2="${y - 12}" stroke="#ddd" stroke-width="1.2"/><rect x="${x + 6 + i * (w - 12) / 3}" y="${y - 12}" width="10" height="7" fill="${i % 2 ? k.s : k.p}" stroke="rgba(0,0,0,.25)" stroke-width=".5"/>`;
    return o;
  };
  if (nS) {
    const { x, y, w, d, H } = nS, fy = y + d - H;
    stand += `<rect x="${x}" y="${fy}" width="${w}" height="${H}" fill="${seatFH}"/>${crowd(x + 1, fy + 1, w - 2, H - 2)}`;
    if (seatsL >= 1 && H >= 16) stand += `<text x="${x + w * 0.3}" y="${fy + Math.min(H * 0.8, H / 2 + 17)}" font-size="${Math.round(Math.min(H * 0.78, 46))}" class="cp-mosaic" fill="${mosC}" stroke="rgba(0,0,0,.45)" stroke-width="1.2" paint-order="stroke" text-anchor="middle">${U.esc(u.short)}</text>`;
    for (let t = 1; t < tiers; t++) stand += `<rect x="${x}" y="${fy + H * t / tiers - 1.5}" width="${w}" height="3" fill="#5a6070"/>`;
    stand += `<rect x="${x}" y="${fy}" width="${w}" height="${H}" fill="url(#cpWallG)" opacity=".6"/>`;
    if (ko) kot += kotol(x + w * 0.6, fy + 3, w * 0.34, H - 6);
    stand += `<rect x="${x}" y="${y - H}" width="${w}" height="${d}" fill="${roofN ? '#dfe3ec' : '#4d5262'}"/>`;
    if (roofN) stand += `<rect x="${x - 4}" y="${y - H + d - 2}" width="${w + 8}" height="8" fill="#cfd5e2"/><rect x="${x}" y="${y - H + d + 6}" width="${w}" height="12" fill="url(#cpOver)"/><rect x="${x - 4}" y="${y - H - 2}" width="${w + 8}" height="${d + 10}" fill="none" stroke="#9aa1b5"/>`;
  }
  // bočné tribúny
  for (const S of [wS, eS]) {
    if (!S) continue;
    const { x, y, w, d, H } = S;
    stand += SH(x, y, w, d, H) + `<rect x="${x}" y="${y - H}" width="${w}" height="${d}" fill="${seatFV}"/>${crowd(x + 1, y - H + 1, w - 2, d - 2)}`;
    stand += `<rect x="${x}" y="${y + d - H}" width="${w}" height="${H}" fill="#8a8f9b"/><rect x="${x}" y="${y + d - H}" width="${w}" height="${H}" fill="url(#cpWallG)"/>`;
    if (st >= 9) {
      // konzolová strecha nad vonkajšou polovicou tribúny, sedadlá pri ihrisku ostanú vidieť
      const rw = Math.round(w * 0.5), rx0 = S === wS ? x - 2 : x + w - rw + 2;
      stand += `<rect x="${rx0}" y="${y - H - 2}" width="${rw}" height="${d + 4}" fill="#dfe3ec" stroke="#9aa1b5"/><rect x="${S === wS ? rx0 + rw : rx0 - 6}" y="${y - H - 2}" width="6" height="${d + 4}" fill="url(#cpOver)" opacity=".7"/>`;
      for (let ry = y - H + 14; ry < y - H + d - 4; ry += 18) stand += `<line x1="${rx0}" y1="${ry}" x2="${rx0 + rw}" y2="${ry}" stroke="#b8bfcd" stroke-width="1"/>`;
    } else if (roofW) stand += `<rect x="${S === wS ? x - 2 : x + w - 10}" y="${y - H - 2}" width="12" height="${d + 4}" fill="#dfe3ec" stroke="#9aa1b5"/>`;
  }
  // južná tribúna (vidno vonkajšiu fasádu)
  {
    const { x, y, w, d, H } = sS, fy = y + d - H;
    stand += SH(x, y, w, d, H);
    if (st === 0) stand += `<rect x="${x}" y="${y - H}" width="${w}" height="${d}" fill="#b07a42"/><path d="M${x} ${y - H + 5}h${w}M${x} ${y - H + 10}h${w}" stroke="#8a5a2a"/><rect x="${x}" y="${fy}" width="${w}" height="${H}" fill="#7a5230"/>`;
    else {
      stand += roofS ? `<rect x="${x - 4}" y="${y - H - 3}" width="${w + 8}" height="${d + 3}" fill="#dfe3ec"/>${Array.from({ length: Math.floor(w / 24) }, (_, i) => `<line x1="${x + 12 + i * 24}" y1="${y - H - 3}" x2="${x + 12 + i * 24}" y2="${y - H + d}" stroke="#b8bfcd"/>`).join('')}`
        : `<rect x="${x}" y="${y - H}" width="${w}" height="${d}" fill="${seatFH}"/>${crowd(x + 1, y - H + 1, w - 2, d - 2)}`;
      if (ko && !nS) kot += kotol(x + w * 0.6, y - H + 3, w * 0.34, d - 6);
      stand += `<rect x="${x}" y="${fy}" width="${w}" height="${H}" fill="${wallC}"/><rect x="${x}" y="${fy}" width="${w}" height="${H}" fill="url(#cpWallG)"/>`;
      if (st >= 6) for (const ry of mega ? [0.3, 0.52, 0.72] : [0.34]) for (let wx = x + 8; wx < x + w - 10; wx += 16) stand += `<rect x="${wx}" y="${fy + H * ry}" width="9" height="5" rx="1" fill="#cfe9ff" opacity=".8"/>`;
      // fasáda: pás vo farbách klubu, LED, sklo, erb
      if (fa >= 2) for (let gx = x + 10; gx < x + w - 24; gx += 30) fac += `<rect x="${gx}" y="${fy + 6}" width="22" height="${H - 10}" rx="2" fill="rgba(170,220,255,.32)" stroke="rgba(230,245,255,.6)" stroke-width=".8"/>`;
      if (fa >= 1) fac += `<rect x="${x}" y="${fy}" width="${w}" height="4" fill="${k.s}"/><rect x="${x}" y="${fy + H - 4}" width="${w}" height="1.6" fill="#8fe9ff" opacity=".95"/>`;
      if (fa >= 3) { const r = Math.min(H * 0.42, 17); fac += `<circle cx="${x + w * 0.18}" cy="${fy + H / 2}" r="${r}" fill="${k.p}" stroke="${k.s}" stroke-width="3"/><text x="${x + w * 0.18}" y="${fy + H / 2 + r * 0.32}" font-size="${Math.round(r * 0.8)}" class="cp-mosaic" fill="${U.lum(k.p) > 0.6 ? '#1a1a2e' : '#fff'}" text-anchor="middle">${U.esc(u.short)}</text>`; }
      for (let gx = x + 30; gx < x + w - 20; gx += 64) stand += `<path d="M${gx} ${y + d}v${-Math.min(10, H * 0.45)}a6 6 0 0 1 12 0v${Math.min(10, H * 0.45)}z" fill="${U.shade(wallC, -0.5)}"/>`;
      if (st >= 3) stand += `<text x="${x + w / 2}" y="${fy + 9 + (fa ? 3 : 0)}" class="cp-sname" text-anchor="middle">${U.esc((u.stadium || '').toUpperCase().slice(0, 34))}</text>`;
    }
  }
  if (mega && nS) {
    // obvodový pás okolo strechy (vnútorný okraj nad ihriskom)
    const ny = nS.y - nS.H + nS.d, sy0 = sS.y - sS.H, lx = wS ? wS.x + wS.w : PX, rx = eS ? eS.x : PX + PW;
    const ring = `M${lx} ${ny} H${rx} M${lx} ${sy0} H${rx}` + (wS ? ` M${lx} ${wS.y - wS.H} V${wS.y - wS.H + wS.d}` : '') + (eS ? ` M${rx} ${eS.y - eS.H} V${eS.y - eS.H + eS.d}` : '');
    if (st >= 11) stand += `<g filter="url(#cpGlow)"><path d="${ring}" stroke="${k.p}" stroke-width="4" fill="none"/><path d="${ring}" stroke="${U.lum(k.p) > 0.7 ? k.s : '#ffffff'}" stroke-width="1.4" stroke-dasharray="10 8" fill="none" opacity=".9"/></g>`;
    else stand += `<path d="${ring}" stroke="rgba(255,255,255,.75)" stroke-width="2" fill="none"/>`;
    if (st >= 15) stand += `<rect x="${nS.x - 4}" y="${nS.y - nS.H - 3}" width="${nS.w + 8}" height="${nS.d + 10}" fill="none" stroke="#e2c27a" stroke-width="2.5"/><rect x="${sS.x - 4}" y="${sS.y - sS.H - 3}" width="${sS.w + 8}" height="${sS.d + 3}" fill="none" stroke="#e2c27a" stroke-width="2.5"/>`;
    // reflektory pozdĺž strechy
    if (st >= 14) for (let i = 0; i < 9; i++) { const xx = lx + 14 + i * (rx - lx - 28) / 8; stand += `<circle cx="${xx}" cy="${ny - 3}" r="2.6" fill="#fff8d0"/><circle cx="${xx}" cy="${ny - 3}" r="9" fill="url(#cpLight)" opacity=".6"/>`; }
  }
  sd += grp('stad', stand, ttl('stad', `${capacity().toLocaleString('sk-SK')} miest`));
  // oblúk nad štadiónom (ako na Wembley) s lanami k streche
  if (st >= 12 && nS) {
    const ax0 = ox + 6, ax1 = ox2 - 6, ay = oy + 26, top = nS.y - nS.H - (st >= 13 ? 92 : 70), mx = (ax0 + ax1) / 2;
    const arc = `M${ax0} ${ay} Q${mx} ${2 * top - ay} ${ax1} ${ay}`;
    let a = `<path d="M${ax0 + 30} ${ay + 18} Q${mx + 30} ${2 * top - ay + 60} ${ax1 + 30} ${ay + 18}" stroke="rgba(0,0,0,.18)" stroke-width="7" fill="none"/>`;
    for (let i = 1; i < 12; i++) {
      const t = i / 12, px = (1 - t) * (1 - t) * ax0 + 2 * t * (1 - t) * mx + t * t * ax1, py = (1 - t) * (1 - t) * ay + 2 * t * (1 - t) * (2 * top - ay) + t * t * ay;
      a += `<line x1="${px.toFixed(1)}" y1="${py.toFixed(1)}" x2="${px.toFixed(1)}" y2="${nS.y - nS.H + 2}" stroke="rgba(230,235,245,.55)" stroke-width=".8"/>`;
    }
    a += `<path d="${arc}" stroke="#c9ced9" stroke-width="7" fill="none" stroke-linecap="round"/><path d="${arc}" stroke="#f4f6fa" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
    if (st >= 15) a += `<path d="${arc}" stroke="#e2c27a" stroke-width="1.2" fill="none" stroke-dasharray="3 5"/>`;
    sd += grp('stad', a, ttl('stad', `${capacity().toLocaleString('sk-SK')} miest`));
  }
  if (fac) sd += grp('facade', fac, ttl('facade'));
  if (kot) sd += grp('kotol', kot, ttl('kotol'));
  if (rf) sd += `<g class="cp-b" data-a="facFocus" data-v="roof"><title>${U.esc(ttl('roof'))}</title><rect x="${sS.x}" y="${sS.y - sS.H - 3}" width="${sS.w}" height="4" fill="transparent"/></g>`;
  // obrazovka na severnej tribúne
  if (L >= 2) {
    const sy = (nS ? nS.y - nS.H : PY - 20) - 30, sx = PX + PW / 2 - 36;
    sd += grp('lights', `<rect x="${sx + 14}" y="${sy + 26}" width="4" height="${nS ? 8 : 30}" fill="#555"/><rect x="${sx + 54}" y="${sy + 26}" width="4" height="${nS ? 8 : 30}" fill="#555"/><rect x="${sx + 4}" y="${sy + 4}" width="72" height="26" rx="3" fill="rgba(0,0,0,.3)"/><rect x="${sx}" y="${sy}" width="72" height="26" rx="3" fill="#111" stroke="#666" stroke-width="2"/><text x="${sx + 36}" y="${sy + 18}" class="cp-screen" text-anchor="middle">${U.esc(u.short)} 2:0</text>`, ttl('lights'));
  }
  // VIP lóže na fasáde
  const vip = lvl('vip');
  if (st >= 1) {
    const vy = sS.y + sS.d - sS.H + 3, vh = Math.max(5, Math.min(9, sS.H - 10));
    if (vip) {
      const vw = [0, 110, 180, 260][vip];
      sd += grp('vip', `<rect x="${PX + PW / 2 - vw / 2}" y="${vy}" width="${vw}" height="${vh}" rx="2" fill="#9fd8ff" stroke="#e7f6ff"/>${Array.from({ length: Math.floor(vw / 18) }, (_, i) => `<line x1="${PX + PW / 2 - vw / 2 + 18 * (i + 1)}" y1="${vy}" x2="${PX + PW / 2 - vw / 2 + 18 * (i + 1)}" y2="${vy + vh}" stroke="#5aa8d8"/>`).join('')}`, ttl('vip'));
    } else if (st >= 2) sd += grp('vip', `<rect x="${PX + PW / 2 - 40}" y="${vy}" width="80" height="${vh}" rx="2" class="cp-plot"/>`, 'VIP lóže – zatiaľ nepostavené');
  }
  if (L) sd += grp('lights', mast(corners[2][0], corners[2][1]) + mast(corners[3][0], corners[3][1]), ttl('lights'));
  add(oy2, sd);
  const tagY = Math.max(124, (nS ? nS.y - nS.H : oy) - 28);
  tag('stad', ox, tagY, 'Štadión');
  tag('lights', ox2, tagY, 'Osvetlenie', true);
  if (building.has('stad')) { GND.push(works(ox - 8, oy - 8, ox2 - ox + 16, oy2 - oy + 16)); add(oy + 80, crane(ox2 - 30, oy + 80, 1)); }
  if (building.has('vip')) add(oy2 + 6, crane(PX + PW / 2 + 60, oy2 + 6, 0.7));
  if (building.has('lights')) add(oy + 30, crane(ox + 24, oy + 30, 0.6));

  // ── vľavo hore: skauting a videoanalytika
  const sc = lvl('scout');
  if (sc) {
    const H = 20 + sc * 5;
    let s = box(40, 44, 112, 46, H, '#d6cbb8', { door: true, ac: 1 });
    for (let i = 0; i < sc; i++) s += `<ellipse cx="${66 + i * 22}" cy="${44 - H + 26}" rx="8" ry="5" fill="#f4f6fa" stroke="#9aa1ad"/><line x1="${66 + i * 22}" y1="${44 - H + 26}" x2="${70 + i * 22}" y2="${44 - H + 20}" stroke="#6f7682" stroke-width="1.5"/>`;
    add(90, grp('scout', s, ttl('scout'))); tag('scout', 40, 98, 'Skauting');
  } else GND.push(plot('scout', 40, 40, 112, 52));
  if (building.has('scout')) add(96, crane(150, 96, 0.45));
  const vd = lvl('video');
  if (vd) {
    const H = 18 + vd * 5;
    let s = box(172, 44, 106, 46, H, '#c9d3e6', { door: true });
    s += `<rect x="190" y="${44 - H + 6}" width="44" height="24" rx="2" fill="#1d6b3a" stroke="#e8eef8" stroke-width="1.5"/><path d="M196 ${44 - H + 26} l10 -10 l10 6 l12 -12" stroke="#ffd23f" stroke-width="1.6" fill="none"/>`;
    if (vd >= 3) s += `<line x1="262" y1="${44 - H + 30}" x2="262" y2="${44 - H - 4}" stroke="#9aa1ad" stroke-width="2"/><rect x="255" y="${44 - H - 10}" width="14" height="8" rx="2" fill="#333"/>`;
    add(90, grp('video', s, ttl('video'))); tag('video', 172, 98, 'Videoanalytika');
  } else GND.push(plot('video', 172, 40, 106, 52));
  if (building.has('video')) add(96, crane(270, 96, 0.45));

  // ── vľavo: mládežnícka akadémia a internát
  const ya = lvl('youth');
  if (ya) {
    GND.push(grp('youth', pitch(40, 150, 150, 84, true) + (ya >= 3 ? pitch(40, 252, 150, 84, true) : ''), ttl('youth')));
    if (ya >= 5) add(146, grp('youth', box(40, 136, 150, 8, 6, seat, { win: false, wall: seat2 }), ttl('youth')));
    if (ya >= 2) add(214, grp('youth', box(210, 156, ya >= 4 ? 108 : 82, 58, 26, '#e8d9b5', { door: true, ac: 1, pitched: true, solar: ya >= 4 ? 1 : 0 }), ttl('youth')));
    tag('youth', 40, ya >= 3 ? 344 : 242, 'Akadémia');
  } else GND.push(plot('youth', 40, 150, 150, 84));
  if (building.has('youth')) { GND.push(works(32, 140, 290, 204)); add(260, crane(250, 260, 0.8)); }
  const dl = lvl('dorm');
  if (dl) { add(310, grp('dorm', box(210, 252, 108, 58, [0, 24, 32, 40][dl], '#cfd8e6', { door: true, ac: dl }), ttl('dorm'))); tag('dorm', 210, 316, 'Internát'); }
  else GND.push(plot('dorm', 210, 252, 108, 58));
  if (building.has('dorm')) add(316, crane(300, 316, 0.55));

  // ── vyhrievanie (kotolňa) a parkovisko
  const ht = lvl('heat');
  if (ht) {
    let s = box(296, 398, 64, 40, 22, '#b8b1a4', { door: true, win: false }) + box(338, 400, 14, 12, 46, '#8a8478', { win: false, noShadow: true });
    for (let i = 0; i < ht; i++) s += `<circle cx="${346 + i * 6}" cy="${352 - i * 12}" r="${5 + i * 2}" fill="#fff" opacity="${0.55 - i * 0.12}"/>`;
    add(438, grp('heat', s, ttl('heat'))); tag('heat', 296, 446, 'Vyhrievanie');
  } else GND.push(plot('heat', 296, 398, 64, 40));
  if (building.has('heat')) add(444, crane(350, 444, 0.5));
  const pk = lvl('park');
  if (pk) {
    const pw = [0, 150, 200, 250][pk];
    let g = flat(40, 476, pw, 150, '#4b505a', 8);
    for (let i = 0; i * 22 + 50 < 40 + pw - 10; i++) g += `<line x1="${50 + i * 22}" y1="480" x2="${50 + i * 22}" y2="514" stroke="#ddd"/><line x1="${50 + i * 22}" y1="588" x2="${50 + i * 22}" y2="622" stroke="#ddd"/>`;
    g += `<line x1="46" y1="551" x2="${34 + pw}" y2="551" stroke="#e8e8e8" stroke-width="2" stroke-dasharray="10 8"/>`;
    GND.push(grp('park', g, ttl('park')));
    const cc = ['#c8102e', '#1d4fa3', '#ffffff', '#222', '#f4b400', '#9e9e9e', '#2e9e57'];
    let n = 0, cars = '';
    for (let x = 52; x < 40 + pw - 16; x += 22) for (const yy of [484, 592]) if (R() < 0.75) cars += car(x, yy, cc[(n++) % cc.length], true);
    cars += `<rect x="${32 + pw}" y="452" width="3" height="26" fill="#ccc"/><rect x="${24 + pw}" y="440" width="20" height="18" rx="4" fill="#1d4fa3" stroke="#fff" stroke-width="2"/><text x="${34 + pw}" y="454" class="cp-p" text-anchor="middle">P</text>`;
    add(626, grp('park', cars, ttl('park')));
    tag('park', 40, 452, 'Parkovisko');
  } else GND.push(plot('park', 40, 476, 200, 150));
  if (building.has('park')) { GND.push(works(32, 468, 270, 166)); add(600, crane(190, 600, 0.7)); }

  // ── dole: fanzóna, stánky, fanshop, múzeum
  const fz = lvl('fanzone');
  if (fz) {
    GND.push(grp('fanzone', flat(300, 524, 160, 112, 'url(#cpPave)', 10), ttl('fanzone')));
    let s = '';
    for (let i = 0; i < 3; i++) s += box(310 + i * 34, 600, 26, 22, 14, i % 2 ? k.s : k.p, { win: false, pitched: true, wall: '#f4f4f4' });
    for (let i = 0; i < 4; i++) s += `<circle cx="${318 + i * 26}" cy="582" r="6" fill="#fff" stroke="#b9b09a"/>`;
    if (fz >= 2) s += box(390, 536, 60, 30, 16, '#3a3f4a', { win: false }) + `<circle cx="402" cy="526" r="2.5" fill="#ffd23f"/><circle cx="438" cy="526" r="2.5" fill="#ffd23f"/>`;
    if (fz >= 3) s += `<rect x="318" y="508" width="3" height="30" fill="#666"/><rect x="368" y="508" width="3" height="30" fill="#666"/><rect x="310" y="494" width="68" height="26" rx="3" fill="#111" stroke="#666" stroke-width="2"/><text x="344" y="512" class="cp-screen" text-anchor="middle">GÓÓÓL</text>`;
    add(622, grp('fanzone', s, ttl('fanzone')));
    tag('fanzone', 300, 640, 'Fanzóna');
  } else GND.push(plot('fanzone', 300, 524, 160, 112));
  if (building.has('fanzone')) add(630, crane(440, 630, 0.55));
  const ct = lvl('cater');
  if (ct) {
    const pos = [[476, 540], [520, 540], [476, 584], [520, 584], [498, 622]];
    let s = '';
    for (let i = 0; i < ct; i++) {
      const [x, y] = pos[i];
      s += box(x, y, 34, 18, 16, i % 2 ? '#c8102e' : '#ffd200', { win: false, wall: '#ffffff' }) + `<rect x="${x + 4}" y="${y + 9}" width="26" height="5" fill="#6b4a2b"/>`;
    }
    add(640, grp('cater', s, ttl('cater')));
    tag('cater', 470, 640, 'Občerstvenie');
  } else GND.push(plot('cater', 470, 534, 94, 100));
  if (building.has('cater')) add(640, crane(550, 640, 0.5));
  const sh = lvl('shop');
  if (sh) {
    const w = [0, 72, 82, 92, 100, 106][sh];
    let s = box(642, 546, w, 56, 18 + sh * 2, '#f2efe6', { door: true, ac: sh >= 3 ? 2 : 1 });
    for (let i = 0; i < w; i += 10) s += `<rect x="${642 + i}" y="588" width="5" height="6" fill="${k.p}"/><rect x="${647 + i}" y="588" width="5" height="6" fill="${k.s}"/>`;
    s += `<rect x="${642 + w - 6}" y="506" width="2" height="24" fill="#ccc"/><rect x="${642 + w - 4}" y="506" width="16" height="10" fill="${k.p}" stroke="${k.s}"/>`;
    add(602, grp('shop', s, ttl('shop'))); tag('shop', 642, 610, 'Fanshop');
  } else GND.push(plot('shop', 642, 546, 104, 56));
  if (building.has('shop')) add(608, crane(730, 608, 0.6));
  const mu = lvl('museum');
  if (mu) {
    const w = [0, 96, 108, 120][mu], H = 26 + mu * 3;
    let s = box(762, 534, w, 64, H, '#ece6d6', { win: false, wall: '#d9d0bb' });
    for (let i = 762 + 8; i < 762 + w - 6; i += 14) s += `<rect x="${i}" y="${598 - H + 4}" width="5" height="${H - 6}" fill="#f8f4ea"/>`;
    s += `<path d="M${760} ${534 - H} L${762 + w / 2} ${534 - H - 14} L${764 + w} ${534 - H} Z" fill="#e2dac6" stroke="#bdb39b"/>`;
    if (mu >= 3) s += `<rect x="${762 + w / 2 - 6}" y="610" width="12" height="8" fill="#bdb39b"/><circle cx="${762 + w / 2}" cy="598" r="5" fill="#c9a24a"/><rect x="${762 + w / 2 - 3}" y="602" width="6" height="9" fill="#c9a24a"/>`;
    add(600, grp('museum', s, ttl('museum'))); tag('museum', 762, 610, 'Múzeum');
  } else GND.push(plot('museum', 762, 534, 120, 66));
  if (building.has('museum')) add(606, crane(860, 606, 0.6));

  // ── vpravo: tréningové centrum, reštaurácia, billboardy
  const tr = lvl('train');
  if (tr) {
    const pitches = tr >= 5 ? 3 : tr >= 3 ? 2 : 1;
    let g = '';
    for (let i = 0; i < pitches; i++) g += pitch(852, 166 + i * 104, 170, 90, true);
    GND.push(grp('train', g, ttl('train')));
    if (tr >= 2) add(240, grp('train', box(1046, 166, 114, 74, tr >= 4 ? 34 : 26, '#b8c4d8', { door: true, ac: 2, solar: tr >= 4 ? 2 : 0 }), ttl('train')));
    if (tr >= 5) add(424, grp('train', `<ellipse cx="1110" cy="430" rx="64" ry="12" fill="rgba(0,0,0,.25)"/><rect x="1046" y="270" width="114" height="156" rx="57" fill="url(#cpDome)" stroke="#9aa1b5"/><path d="M1103 272v152M1050 348h106" stroke="rgba(120,130,150,.45)" stroke-width="1.5"/><rect x="1094" y="408" width="18" height="16" fill="#6f7a90"/>`, ttl('train')));
    tag('train', 852, 136, 'Tréningové centrum');
  } else GND.push(plot('train', 852, 166, 170, 90));
  if (building.has('train')) { GND.push(works(840, 154, 330, 290)); add(330, crane(1000, 330, 0.9)); }
  const rs = lvl('resto');
  if (rs) {
    let s = box(1034, 470, 126, 58, 20 + rs * 3, '#e3c9a8', { door: true, ac: 1, winC: '#ffe8b0', pitched: true });
    for (let i = 0; i < rs + 1; i++) s += `<rect x="${1046 + i * 30}" y="548" width="2" height="10" fill="#777"/><ellipse cx="${1047 + i * 30}" cy="546" rx="12" ry="5" fill="${i % 2 ? k.p : '#ffffff'}" stroke="rgba(0,0,0,.2)"/>`;
    add(560, grp('resto', s, ttl('resto'))); tag('resto', 1034, 566, 'Reštaurácia');
  } else GND.push(plot('resto', 1034, 470, 126, 58));
  if (building.has('resto')) add(540, crane(1140, 540, 0.55));
  const mk = lvl('mkt');
  if (mk) {
    const sp = b.sp && b.sp.main ? b.sp.main.name : u.name;
    let s = '';
    for (let i = 0; i < mk; i++) {
      const x = 900 + i * 92;
      s += `<path d="M${x + 6} 640 L${x + 96} 640 L${x + 110} 646 L${x + 20} 646 Z" fill="rgba(0,0,0,.22)"/><rect x="${x + 14}" y="616" width="3" height="26" fill="#bbb"/><rect x="${x + 68}" y="616" width="3" height="26" fill="#bbb"/><rect x="${x}" y="592" width="86" height="28" rx="2" fill="${i % 2 ? '#1d4fa3' : '#ffd200'}" stroke="#fff" stroke-width="2"/><text x="${x + 43}" y="610" class="cp-bb ${i % 2 ? '' : 'dark'}" text-anchor="middle">${U.esc(sp.slice(0, 14))}</text>`;
    }
    add(642, grp('mkt', s, ttl('mkt'))); tag('mkt', 900, 568, 'Marketing');
  } else GND.push(plot('mkt', 900, 596, 140, 44));
  if (building.has('mkt')) add(642, crane(1000, 642, 0.5));

  // ── hore: solárne panely, mediálne centrum, zdravotné stredisko, regenerácia
  const so = lvl('solar');
  if (so) {
    let s = '';
    for (let i = 0; i < so * 2; i++) {
      const y = 34 + i * 13;
      s += `<path d="M398 ${y + 12} L546 ${y + 12} L552 ${y + 15} L404 ${y + 15} Z" fill="rgba(0,0,0,.22)"/><path d="M400 ${y + 10} L544 ${y + 10} L540 ${y} L404 ${y} Z" fill="url(#cpSolar)" stroke="#8fb4ff" stroke-width=".7"/>${[1, 2, 3, 4, 5].map(j => `<line x1="${404 + j * 23}" y1="${y}" x2="${400 + j * 23.6}" y2="${y + 10}" stroke="#8fb4ff" stroke-width=".5"/>`).join('')}`;
    }
    add(34 + so * 26, grp('solar', s, ttl('solar'))); tag('solar', 396, 8, 'Solárne panely');
  } else GND.push(plot('solar', 396, 30, 150, 74));
  if (building.has('solar')) add(110, crane(540, 110, 0.5));
  const md = lvl('media');
  if (md) {
    const w = [0, 110, 135, 160][md], H = 26 + md * 3;
    let s = box(630, 36, w, 60, H, '#c3cbe0', { door: true, ac: 1 });
    s += `<ellipse cx="650" cy="${36 - H + 22}" rx="10" ry="7" fill="#f4f6fa" stroke="#9aa1ad"/><line x1="650" y1="${36 - H + 22}" x2="656" y2="${36 - H + 14}" stroke="#6f7682" stroke-width="1.5"/><line x1="${630 + w - 14}" y1="${36 - H + 30}" x2="${630 + w - 14}" y2="${36 - H - 10}" stroke="#9aa1ad" stroke-width="2"/><circle cx="${630 + w - 14}" cy="${36 - H - 10}" r="3" fill="#ff5a5f"/>`;
    if (md >= 3) s += car(630 + w + 6, 70, '#ffffff', false) + `<circle cx="${630 + w + 19}" cy="68" r="4" fill="#ddd"/>`;
    add(96, grp('media', s, ttl('media'))); tag('media', 650, 102, 'Mediálne centrum');
  } else GND.push(plot('media', 630, 36, 160, 60));
  if (building.has('media')) add(100, crane(760, 100, 0.5));
  const me = lvl('medical');
  if (me) {
    const H = 22 + me * 3;
    let s = box(836, 44, 122, 54, H, '#f4f6fa', { door: true, wall: '#d4dbe6' });
    const cy = 44 - H + 27;
    s += `<rect x="891" y="${cy - 11}" width="8" height="22" fill="#e2474e"/><rect x="884" y="${cy - 4}" width="22" height="8" fill="#e2474e"/>`;
    if (me >= 3) s += car(966, 70, '#ffffff', false) + `<rect x="974" y="73" width="8" height="3" fill="#e2474e"/>`;
    add(98, grp('medical', s, ttl('medical'))); tag('medical', 836, 104, 'Zdravotné stredisko');
  } else GND.push(plot('medical', 836, 44, 122, 54));
  if (building.has('medical')) add(104, crane(940, 104, 0.5));
  const rc = lvl('recov');
  if (rc) {
    add(104, grp('recov', box(1064, 46, 96, 58, 24, '#e6eef8', { door: true, ac: 2 }), ttl('recov')));
    if (rc >= 2) GND.push(grp('recov', `${flat(986, 50, 70, 46, '#f0f4f8', 6)}<rect x="990" y="54" width="62" height="38" rx="4" fill="url(#cpWater)"/><path d="M990 66h62M990 79h62" stroke="rgba(255,255,255,.55)" stroke-width="1.2" stroke-dasharray="4 3"/>`, ttl('recov')));
    if (rc >= 3) GND.push(grp('recov', `<circle cx="1022" cy="114" r="13" fill="#f0f4f8"/><circle cx="1022" cy="114" r="10" fill="url(#cpWater)"/>`, ttl('recov')));
    tag('recov', 1160, 108, 'Regenerácia', true);
  } else GND.push(plot('recov', 1050, 46, 110, 58));
  if (building.has('recov')) add(108, crane(1130, 108, 0.5));

  GND.push(`<text x="600" y="724" class="cp-club" text-anchor="middle">${U.esc(u.name.toUpperCase())}</text>`);
  OBJ.sort((a, c) => a[0] - c[0]);
  return `<svg class="campus campus3d ${opts.small ? 'small' : ''}" viewBox="0 0 1200 760" role="img" aria-label="Areál klubu">${defs}${GND.join('')}${OBJ.map(o => o[1]).join('')}${T.join('')}</svg>`;
}
