// ─────────────────────────────────────────────
// CANVAS SETUP
// ─────────────────────────────────────────────
const C   = document.getElementById('C');
const ctx = C.getContext('2d');
const W   = 1100;
const H   = 620;
const GRAV = 0.62;
const TVEL = 16;

// ─────────────────────────────────────────────
// CHARACTER DEFINITIONS
// ─────────────────────────────────────────────
const CHARS = [
  {
    id: 'mage',    name: 'ARCANE MAGE',
    color: '#4f46e5', accent: '#818cf8',
    hp: 100, spd: 4.5, jStr: -12,   maxJumps: 2, dashCD: 55,  mDmg: 1.0, sDmg: 1.0,
    desc: 'Balanced. Master of all spells.',
    r: { pow: 3, spd: 3, mag: 5, def: 2 },
  },
  {
    id: 'brawler', name: 'IRON BRAWLER',
    color: '#dc2626', accent: '#f87171',
    hp: 145, spd: 3.4, jStr: -11,   maxJumps: 2, dashCD: 75,  mDmg: 2.0, sDmg: 0.6,
    desc: 'Slow but devastating melee.',
    r: { pow: 5, spd: 2, mag: 1, def: 5 },
  },
  {
    id: 'ninja',   name: 'SHADOW NINJA',
    color: '#a855f7', accent: '#d8b4fe',
    hp: 72,  spd: 6.2, jStr: -13.5, maxJumps: 2, dashCD: 28,  mDmg: 0.9, sDmg: 1.3,
    desc: 'Elusive. Blink in, blink out.',
    r: { pow: 2, spd: 5, mag: 3, def: 2 },
  },
];

// ─────────────────────────────────────────────
// MAP DEFINITIONS
// ─────────────────────────────────────────────
const MAPS = [
  {
    name: 'NEON ARENA',
    bgA: '#000208', bgB: '#000a1e',
    blocks: [
      { x:  75, y: 418, w: 185, h: 18, c: '#00eeff' },   // left  — reachable with double jump from floor
      { x: 840, y: 418, w: 185, h: 18, c: '#a855f7' },   // right — same
      { x: 365, y: 290, w: 370, h: 18, c: '#00eeff' },   // centre — reachable from side platforms
    ],
    moving:  [{ x: 340, y: 475, w: 150, h: 16, c: '#f59e0b', dx: 2.2, minX: 210, maxX: 640 }],
    hazards: [{ x: 0,   y: 590, w: 1100, h: 14, type: 'electric' }],  // decorative only
  },
  {
    name: 'STORM PEAK',
    bgA: '#04040c', bgB: '#060812',
    blocks: [
      { x:  85, y: 418, w: 175, h: 20, c: '#d1d5db' },  // left cloud
      { x: 840, y: 418, w: 175, h: 20, c: '#d1d5db' },  // right cloud
      { x: 415, y: 250, w: 270, h: 20, c: '#e4e4e7' },  // centre cloud
    ],
    moving:  [{ x: 330, y: 478, w: 148, h: 18, c: '#94a3b8', dx: 1.7, minX: 190, maxX: 605 }],
    hazards: [],
  },
  {
    name: 'VOLCANIC TEMPLE',
    bgA: '#0d0200', bgB: '#1a0400',
    blocks: [
      { x:  80, y: 418, w: 178, h: 22, c: '#7c2d12' },  // left stone altar
      { x: 842, y: 418, w: 178, h: 22, c: '#7c2d12' },  // right stone altar
      { x: 408, y: 250, w: 284, h: 22, c: '#92400e' },  // centre temple top
    ],
    moving:  [{ x: 305, y: 475, w: 152, h: 20, c: '#78350f', dx: 2.0, minX: 195, maxX: 615 }],
    hazards: [{ x: 0, y: 590, w: 1100, h: 14, type: 'lava_deco' }],  // decorative only
  },
];

// ─────────────────────────────────────────────
// SHARED DRAW HELPERS
// ─────────────────────────────────────────────

/** Lighten a hex colour for stroke highlights */
function lc(hex) {
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${Math.min(255, r + 50)},${Math.min(255, g + 50)},${Math.min(255, b + 50)},.7)`;
  } catch { return '#475569'; }
}

/** Draw a rounded rectangle path (call fill/stroke after) */
function rr(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
