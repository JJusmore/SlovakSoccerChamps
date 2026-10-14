'use strict';
// ─── Kreslenie: postavičky, lopta, erby, trofeje ─────────────────

function rrect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Kreslí kreslenú postavičku hráča. (x, y) = päty, u = pixely na jednotku (~1 meter)
function drawFigure(ctx, x, y, u, kit, look, o = {}) {
  const ph = o.phase || 0, face = o.face || 1;
  const sw = o.moving ? Math.sin(ph) : 0;
  const skin = look.skin;
  const socks = kit.so || kit.p;

  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath(); ctx.ellipse(x, y, 0.44 * u, 0.14 * u, 0, 0, Math.PI * 2); ctx.fill();
  if (o.ring) {
    ctx.strokeStyle = o.ring; ctx.lineWidth = Math.max(2, 0.09 * u);
    ctx.beginPath(); ctx.ellipse(x, y, 0.66 * u, 0.24 * u, 0, 0, Math.PI * 2); ctx.stroke();
  }
  const lean = (o.dive || 0) * 0.5 * u;

  // nohy
  const legW = 0.17 * u, legH = 0.42 * u;
  [[-0.2, 1], [0.03, -1]].forEach(([lx, s]) => {
    const lift = Math.max(0, sw * s) * 0.1 * u;
    const off = sw * s * 0.08 * u * face;
    const X = x + lx * u + off, Y = y - legH - lift;
    ctx.fillStyle = skin; ctx.fillRect(X, Y, legW, legH * 0.3);
    ctx.fillStyle = socks; ctx.fillRect(X, Y + legH * 0.3, legW, legH * 0.62);
    ctx.fillStyle = '#151515';
    ctx.fillRect(face > 0 ? X : X - 0.05 * u, Y + legH - 0.09 * u, legW + 0.05 * u, 0.1 * u);
  });

  ctx.save();
  if (lean) ctx.translate(lean, 0);
  // trenírky
  ctx.fillStyle = kit.sh;
  rrect(ctx, x - 0.31 * u, y - 0.66 * u, 0.62 * u, 0.28 * u, 0.07 * u); ctx.fill();

  // ruky
  const armSw = sw * 0.09 * u;
  const sleeve = kit.pat === 'sleeves' ? kit.s : kit.p;
  [[-0.49, armSw], [0.34, -armSw]].forEach(([ax, dy]) => {
    const X = x + ax * u, Y = y - 1.2 * u + dy;
    ctx.fillStyle = sleeve; rrect(ctx, X, Y, 0.15 * u, 0.24 * u, 0.05 * u); ctx.fill();
    ctx.fillStyle = skin; ctx.fillRect(X + 0.015 * u, Y + 0.22 * u, 0.12 * u, 0.16 * u);
    ctx.fillStyle = o.gloves || skin;
    ctx.beginPath(); ctx.arc(X + 0.075 * u, Y + 0.42 * u, (o.gloves ? 0.1 : 0.075) * u, 0, Math.PI * 2); ctx.fill();
  });

  // trup s dresom
  const tx = x - 0.36 * u, ty = y - 1.26 * u, tw = 0.72 * u, th = 0.66 * u;
  ctx.fillStyle = kit.p;
  rrect(ctx, tx, ty, tw, th, 0.15 * u); ctx.fill();
  if (u > 5 && kit.pat !== 'plain' && kit.pat !== 'sleeves') {
    ctx.save();
    rrect(ctx, tx, ty, tw, th, 0.15 * u); ctx.clip();
    ctx.fillStyle = kit.s;
    if (kit.pat === 'stripes') for (let i = 0; i < 3; i++) ctx.fillRect(tx + (0.1 + i * 0.22) * u, ty, 0.11 * u, th);
    else if (kit.pat === 'hoops') for (let i = 0; i < 3; i++) ctx.fillRect(tx, ty + (0.08 + i * 0.22) * u, tw, 0.1 * u);
    else if (kit.pat === 'half') ctx.fillRect(x, ty, tw / 2, th);
    else if (kit.pat === 'sash') {
      ctx.beginPath(); ctx.moveTo(tx, ty + 0.05 * u); ctx.lineTo(tx + 0.2 * u, ty); ctx.lineTo(tx + tw, ty + th - 0.05 * u);
      ctx.lineTo(tx + tw - 0.2 * u, ty + th); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  // golier
  ctx.fillStyle = kit.pat === 'plain' || kit.pat === 'sleeves' ? kit.s : U.shade(kit.p, -0.25);
  ctx.fillRect(x - 0.13 * u, ty, 0.26 * u, 0.06 * u);
  if (o.num && (u > 15 || (o.back && u > 7))) {
    ctx.fillStyle = U.lum(kit.p) > 0.6 ? '#1a1a2e' : '#ffffff';
    ctx.font = `bold ${Math.round((o.back ? 0.42 : 0.3) * u)}px Arial`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(o.num, o.back ? x : x + 0.1 * u, ty + (o.back ? 0.34 : 0.36) * u);
  }

  // hlava
  const hx = x + face * 0.02 * u, hy = y - 1.6 * u, r = 0.37 * u;
  ctx.fillStyle = skin; ctx.fillRect(x - 0.08 * u, hy + r * 0.6, 0.16 * u, 0.14 * u);
  ctx.beginPath(); ctx.arc(hx, hy, r, 0, Math.PI * 2); ctx.fill();
  // vlasy
  ctx.fillStyle = look.hair;
  if (o.back) {
    // pohľad zozadu: vlasy prekryjú temeno, bez tváre
    ctx.globalAlpha = look.style === 1 ? 0.75 : look.style === 4 ? 0.5 : 1;
    ctx.beginPath(); ctx.arc(hx, hy - r * 0.04, r * 1.03, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    if (look.style === 4) { ctx.beginPath(); ctx.ellipse(hx, hy - r * 0.72, r * 0.38, r * 0.42, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    return;
  }
  switch (look.style) {
    case 0:
      ctx.beginPath(); ctx.arc(hx, hy, r * 1.05, Math.PI * 0.92, Math.PI * 2.08); ctx.closePath(); ctx.fill(); break;
    case 1:
      ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(hx, hy, r * 1.01, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; break;
    case 2:
      ctx.beginPath(); ctx.arc(hx, hy, r * 1.05, Math.PI * 0.95, Math.PI * 2.05); ctx.closePath(); ctx.fill();
      for (let i = 0; i < 5; i++) { const a = Math.PI * (1.05 + i * 0.22); ctx.beginPath(); ctx.arc(hx + Math.cos(a) * r, hy + Math.sin(a) * r, r * 0.3, 0, Math.PI * 2); ctx.fill(); }
      break;
    case 3:
      ctx.beginPath(); ctx.arc(hx, hy, r * 1.07, Math.PI * 0.85, Math.PI * 2.15); ctx.closePath(); ctx.fill();
      ctx.fillRect(hx - r * 1.07, hy - r * 0.1, r * 0.28, r * 0.95); ctx.fillRect(hx + r * 0.79, hy - r * 0.1, r * 0.28, r * 0.95); break;
    default:
      ctx.beginPath(); ctx.ellipse(hx, hy - r * 0.72, r * 0.38, r * 0.42, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.45; ctx.beginPath(); ctx.arc(hx, hy, r * 1.0, Math.PI * 1.0, Math.PI * 2.0); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
  }
  if (look.beard && u > 7) {
    ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.arc(hx, hy + r * 0.15, r * 0.85, Math.PI * 0.1, Math.PI * 0.9); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
  }
  if (u > 6) {
    ctx.fillStyle = '#1b1b1b';
    const er = Math.max(0.8, 0.05 * u);
    ctx.beginPath(); ctx.arc(hx - 0.12 * u + face * 0.06 * u, hy + 0.03 * u, er, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(hx + 0.12 * u + face * 0.06 * u, hy + 0.03 * u, er, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawBall(ctx, x, y, r, rot) {
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = Math.max(1, r * 0.12); ctx.stroke();
  if (r < 2.5) return;
  ctx.fillStyle = '#222';
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
  const cx = x + Math.cos(rot) * r * 0.25, cy = y + Math.sin(rot * 0.7) * r * 0.25;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 4; i++) {
    const a = rot + i * Math.PI / 2;
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r * 0.85, cy + Math.sin(a) * r * 0.85, r * 0.26, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// ─── Erb klubu (SVG) ─────────────────────────────────────────────
function crestSVG(t, size = 40) {
  const k = t.kit;
  const h = U.hash(t.name);
  const shape = h % 4;
  const p = k.p, s = k.s;
  const ring = U.lum(p) > 0.75 ? s : '#ffffff';
  const txt = U.esc(t.short.slice(0, 3));
  const id = 'c' + t.id + '_' + size;
  let outline;
  if (shape === 0) outline = 'M50 4 L92 16 L88 62 Q82 84 50 98 Q18 84 12 62 L8 16 Z';
  else if (shape === 1) outline = 'M50 3 A47 47 0 1 1 49.9 3 Z';
  else if (shape === 2) outline = 'M50 3 L91 26 L91 74 L50 97 L9 74 L9 26 Z';
  else outline = 'M14 6 L86 6 Q92 6 92 12 L92 56 Q92 82 50 97 Q8 82 8 56 L8 12 Q8 6 14 6 Z';
  const band = (h >> 3) % 3;
  let deco = '';
  if (band === 0) deco = `<rect x="0" y="40" width="100" height="22" fill="${s}" opacity="0.95"/>`;
  else if (band === 1) deco = `<path d="M0 0 L50 0 L50 100 L0 100 Z" fill="${s}" opacity="0.9"/>`;
  else deco = `<path d="M0 30 L100 70 L100 90 L0 50 Z" fill="${s}" opacity="0.9"/>`;
  return `<svg class="crest" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">
<defs><clipPath id="${id}"><path d="${outline}"/></clipPath></defs>
<path d="${outline}" fill="${p}" stroke="${ring}" stroke-width="5"/>
<g clip-path="url(#${id})">${deco}</g>
<path d="${outline}" fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="2"/>
<text x="50" y="59" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="26" fill="#ffffff" stroke="rgba(10,14,40,0.85)" stroke-width="5" stroke-linejoin="round" paint-order="stroke">${txt}</text>
</svg>`;
}

// Trofeje: league (zlatá), cup (Slovenský pohár – strieborný), super (Superpohár), reg (regionálny – bronz), classic (Slovak Classic)
let TROPHY_N = 0;
const METAL = {
  gold: ['#7a4d00', '#e0a92a', '#fff6c9', '#f7d36b', '#8a5a00'],
  silver: ['#5d6474', '#b5bccb', '#ffffff', '#d9dee8', '#6d7585'],
  bronze: ['#5a2e0f', '#b0672e', '#f5c79a', '#d48a4a', '#6b3a14'],
};
function metalGrad(id, m) {
  const c = METAL[m];
  return `<linearGradient id="${id}" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="${c[0]}"/><stop offset=".28" stop-color="${c[1]}"/><stop offset=".45" stop-color="${c[2]}"/><stop offset=".62" stop-color="${c[3]}"/><stop offset="1" stop-color="${c[4]}"/></linearGradient>`;
}
function trophySVG(type, size = 64) {
  const n = ++TROPHY_N, g = 'tg' + n, s = 'ts' + n;
  const wrap = (defs, body) => `<svg class="trophy-svg" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><defs>${defs}</defs>${body}</svg>`;
  const base = (fill, plate) => `<rect x="19" y="50" width="26" height="9" rx="1.6" fill="${fill}"/><rect x="25" y="52.4" width="14" height="4.2" rx="1" fill="url(#${plate})"/>`;
  if (type === 'cup') {
    return wrap(metalGrad(s, 'silver'), `
<circle cx="32" cy="3.6" r="2.2" fill="url(#${s})"/><path d="M22 10c0-3.4 4.4-5.6 10-5.6S42 6.6 42 10z" fill="url(#${s})"/>
<path d="M21 12c-5.5-1.2-7.6 2-7.6 5.2 0 4.2 4 6.6 8.6 7.3M43 12c5.5-1.2 7.6 2 7.6 5.2 0 4.2-4 6.6-8.6 7.3" fill="none" stroke="url(#${s})" stroke-width="2.6" stroke-linecap="round"/>
<path d="M20.5 10.5h23c0 10.5-3.5 18.5-11.5 21.5-8-3-11.5-11-11.5-21.5z" fill="url(#${s})"/>
<rect x="21.2" y="15.5" width="21.6" height="2.6" fill="#2b58c9" opacity=".85"/>
<path d="M29 31.5h6v3h-6z" fill="url(#${s})"/><ellipse cx="32" cy="35.5" rx="4.6" ry="1.8" fill="url(#${s})"/><path d="M30 36.5h4l3.4 8.5H26.6z" fill="url(#${s})"/>
<rect x="22" y="45" width="20" height="5" rx="1" fill="url(#${s})"/>${base('#1e2a4a', s)}
<path d="M24 12h2.6c0 7 1 12 3.6 16-3.8-2.4-6.2-8-6.2-16z" fill="#fff" opacity=".45"/>`);
  }
  if (type === 'super') {
    return wrap(metalGrad(s, 'silver') + metalGrad(g, 'gold'), `
<circle cx="32" cy="22" r="17.5" fill="url(#${s})"/><circle cx="32" cy="22" r="14" fill="none" stroke="url(#${g})" stroke-width="2.4"/>
<circle cx="32" cy="22" r="9.5" fill="#24306f" opacity=".85"/>
<path d="M32 14.2l2.3 4.7 5.2.8-3.8 3.6.9 5.1L32 26l-4.6 2.4.9-5.1-3.8-3.6 5.2-.8z" fill="url(#${g})"/>
<path d="M18 16c2-6 8-10 14-10" fill="none" stroke="#fff" stroke-width="1.6" opacity=".6" stroke-linecap="round"/>
<path d="M28.5 39.5h7l1 3h-9z" fill="url(#${g})"/><path d="M26 42.5h12l3 7.5H23z" fill="url(#${g})"/>${base('#2a1b40', g)}`);
  }
  if (type === 'cl') {
    // veľké uši, hviezdy
    return wrap(metalGrad(s, 'silver'), `
<path d="M20 9c-11-3-15 6-12 13 3 7 10 9 14 9M44 9c11-3 15 6 12 13-3 7-10 9-14 9" fill="none" stroke="url(#${s})" stroke-width="4.2" stroke-linecap="round"/>
<path d="M19.5 6h25c0 13-5 22-12.5 25-7.5-3-12.5-12-12.5-25z" fill="url(#${s})"/>
<ellipse cx="32" cy="6.2" rx="12.5" ry="1.8" fill="#ffffff" opacity=".8"/>
${[0, 1, 2, 3, 4].map(i => { const a = -Math.PI / 2 + i * Math.PI * 2 / 5, x = 32 + Math.cos(a) * 5.5, y = 17 + Math.sin(a) * 5.5; return `<path d="M${(x).toFixed(1)} ${(y - 1.6).toFixed(1)}l.5 1.1 1.2.1-.9.8.3 1.2-1.1-.6-1.1.6.3-1.2-.9-.8 1.2-.1z" fill="#1e2a6e"/>`; }).join('')}
<path d="M23 9h2.6c0 8 1.2 13.5 4.4 17.5-4.4-2.6-7-8.6-7-17.5z" fill="#fff" opacity=".45"/>
<path d="M29 31h6l-.6 7h-4.8z" fill="url(#${s})"/><ellipse cx="32" cy="39" rx="5.5" ry="1.8" fill="url(#${s})"/>
<path d="M25 40.5h14l2.4 9H22.6z" fill="url(#${s})"/>${base('#13183a', s)}`);
  }
  if (type === 'el') {
    return wrap(metalGrad(s, 'silver') + metalGrad(g, 'gold'), `
<path d="M17 4h30l-4 6c-1.5 10-5 18-11 21-6-3-9.5-11-11-21z" fill="url(#${s})"/>
<path d="M17 4h30l-2.5 3.6H19.5z" fill="url(#${g})" opacity=".85"/>
<path d="M21.5 10c1.5 8 4 14 8 18.5-5-2.5-7.4-9-8-18.5z" fill="#fff" opacity=".45"/>
<path d="M29.5 31h5l-.4 9h-4.2z" fill="url(#${s})"/><path d="M27 40h10l1.2 3H25.8z" fill="url(#${g})"/>
<path d="M24 43h16l2 6.5H22z" fill="url(#${s})"/>${base('#2a1606', g)}`);
  }
  if (type === 'ecl') {
    return wrap(metalGrad(s, 'silver'), `
<path d="M24 5h16l-1 10 4 4-4 5-1 7h-12l-1-7-4-5 4-4z" fill="url(#${s})"/>
<path d="M24 5h16l-.4 3.4H24.4z" fill="#2ecc71" opacity=".9"/><path d="M27 13h10v3H27z" fill="#2ecc71" opacity=".75"/>
<path d="M26 8h2.4c0 9 .5 15 2 20-3-3-4.2-10-4.4-20z" fill="#fff" opacity=".45"/>
<path d="M29 31h6l-.5 8h-5z" fill="url(#${s})"/><ellipse cx="32" cy="40" rx="5.4" ry="1.7" fill="url(#${s})"/>
<path d="M24.5 41.5h15l2.2 8H22.3z" fill="url(#${s})"/>${base('#0b2a1c', s)}`);
  }
  if (type === 'classic') {
    return wrap(metalGrad(g, 'gold'), `
<path d="M16.5 8c-8-1.4-11.5 3.6-10.6 9 .9 6.4 7.2 9.2 12.6 9.4M47.5 8c8-1.4 11.5 3.6 10.6 9-.9 6.4-7.2 9.2-12.6 9.4" fill="none" stroke="url(#${g})" stroke-width="3.4" stroke-linecap="round"/>
<path d="M15.5 5.5h33c0 13.5-6 22.5-16.5 25-10.5-2.5-16.5-11.5-16.5-25z" fill="url(#${g})"/>
<ellipse cx="32" cy="5.6" rx="16.5" ry="2.1" fill="#fff6c9" opacity=".75"/>
<path d="M26.6 9.6h10.8v6.4c0 4.4-2.7 7-5.4 8.1-2.7-1.1-5.4-3.7-5.4-8.1z" fill="#d6262f" stroke="#fff" stroke-width=".9"/>
<path d="M31.3 11h1.4v9.4h-1.4zM29.3 13.2h5.4v1.2h-5.4zM28.7 15.8h6.6v1.3h-6.6z" fill="#fff"/>
<path d="M27.3 19.8c1.2-1.4 2.5-1.4 3.3-.4.8-1.2 2.6-1.2 3.4 0 .8-1 2.1-1 3.3.4-.9 1.8-2.9 3.2-5.3 4-2.4-.8-4.4-2.2-4.7-4z" fill="#1e4fc2"/>
<path d="M20 9h2.8c0 8 1.4 13.5 4.6 17.4-4.6-2.4-7.4-8.6-7.4-17.4z" fill="#fff" opacity=".4"/>
<path d="M29 30.5h6l-.8 4.5h-4.4z" fill="url(#${g})"/><ellipse cx="32" cy="35.6" rx="5.4" ry="2" fill="url(#${g})"/>
<path d="M23.5 37.5h17l3 8.5h-23z" fill="url(#${g})"/>
<rect x="18" y="46" width="28" height="2.3" fill="#fff"/><rect x="18" y="48.3" width="28" height="2.3" fill="#1e4fc2"/><rect x="18" y="50.6" width="28" height="2.3" fill="#d6262f"/>
<rect x="17" y="52.9" width="30" height="7" rx="1.6" fill="#2a1b0e"/><rect x="25" y="54.5" width="14" height="3.8" rx="1" fill="url(#${g})"/>`);
  }
  const m = type === 'reg' ? 'bronze' : 'gold';
  return wrap(metalGrad(g, m), `
<path d="M17 9c-6.5-.8-8.6 3-8.2 6.6.5 5 5.4 7.6 10.2 8M47 9c6.5-.8 8.6 3 8.2 6.6-.5 5-5.4 7.6-10.2 8" fill="none" stroke="url(#${g})" stroke-width="3" stroke-linecap="round"/>
<path d="M16.5 6.5h31v4c0 12.5-6.5 21.5-15.5 22-9-.5-15.5-9.5-15.5-22z" fill="url(#${g})"/>
<ellipse cx="32" cy="6.8" rx="15.5" ry="2.1" fill="${type === 'reg' ? '#f5c79a' : '#fff6c9'}" opacity=".7"/>
${type === 'reg' ? '<circle cx="32" cy="17" r="4.2" fill="none" stroke="#fff" stroke-width="1.2" opacity=".6"/>' : '<path d="M32 12l1.9 3.9 4.2.6-3 3 .7 4.2-3.8-2-3.8 2 .7-4.2-3-3 4.2-.6z" fill="#fff6c9" opacity=".9"/>'}
<path d="M20.5 10h2.8c0 7.5 1.2 12.6 4.2 16.6-4.3-2.3-7-8.2-7-16.6z" fill="#fff" opacity=".38"/>
<path d="M29 32.5h6l-1 6h-4z" fill="url(#${g})"/><ellipse cx="32" cy="39.5" rx="5" ry="1.9" fill="url(#${g})"/>
<path d="M24 41h16l2.4 9H21.6z" fill="url(#${g})"/>${base(type === 'reg' ? '#3a2412' : '#3b2a1a', g)}`);
}

// Malý dres pre zoznamy
function shirtSVG(kit, size = 26, num = '') {
  const p = kit.p, s = kit.s;
  let pat = '';
  if (kit.pat === 'stripes') pat = `<path d="M13 6h4v26h-4zM21 6h4v26h-4z" fill="${s}"/>`;
  else if (kit.pat === 'hoops') pat = `<path d="M8 12h22v4H8zM8 21h22v4H8z" fill="${s}"/>`;
  else if (kit.pat === 'half') pat = `<path d="M19 4h11v28H19z" fill="${s}"/>`;
  else if (kit.pat === 'sash') pat = `<path d="M8 8l4-3 18 22-4 4z" fill="${s}"/>`;
  const sl = kit.pat === 'sleeves' ? s : p;
  const nc = U.lum(p) > 0.6 ? '#1a1a2e' : '#fff';
  return `<svg width="${size}" height="${size}" viewBox="0 0 38 36" aria-hidden="true">
<path d="M1 9l7-6 3 4h16l3-4 7 6-5 7-3-2v-1z" fill="${sl}" stroke="rgba(0,0,0,.35)"/>
<clipPath id="sh${U.hash(p + s + kit.pat)}"><path d="M8 5h22v28H8z"/></clipPath>
<path d="M8 5h22v28H8z" fill="${p}" stroke="rgba(0,0,0,.35)"/>
<g clip-path="url(#sh${U.hash(p + s + kit.pat)})">${pat}</g>
<path d="M15 5h8l-4 4z" fill="${s}"/>
${num !== '' ? `<text x="19" y="25" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="11" fill="${nc}">${num}</text>` : ''}
</svg>`;
}
