/* ═══════════════════════════════════════════════
   shared.js  —  State management & utilities
   Loaded on every page EXCEPT battle.html
   (battle.html loads the full game stack instead)
═══════════════════════════════════════════════ */

// ── Character display data (display only, no gameplay) ──────────────
const CHARS_INFO = [
  {
    name:  'ARCANE MAGE',
    color: '#4f46e5', accent: '#818cf8',
    desc:  'Balanced. Master of all spells.',
    stats: { pow:3, spd:3, mag:5, def:2 },
    svg: `<svg viewBox="0 0 80 120" xmlns="http://www.w3.org/2000/svg">
      <circle cx="38" cy="12" r="12" fill="#0f172a" stroke="#4f46e5" stroke-width="2.5"/>
      <circle cx="43" cy="10" r="2" fill="#818cf8"/><circle cx="48" cy="10" r="2" fill="#818cf8"/>
      <line x1="38" y1="24" x2="38" y2="54" stroke="#e2e8f0" stroke-width="2.5"/>
      <polyline points="38,32 60,18 74,6" stroke="#cbd5e1" stroke-width="2" fill="none"/>
      <polyline points="38,32 18,40 12,52" stroke="#cbd5e1" stroke-width="2" fill="none"/>
      <line x1="38" y1="54" x2="24" y2="84" stroke="#94a3b8" stroke-width="2.5"/>
      <line x1="38" y1="54" x2="54" y2="84" stroke="#94a3b8" stroke-width="2.5"/>
      <line x1="54" y1="44" x2="74" y2="4" stroke="#4f46e5" stroke-width="3.5"/>
      <circle cx="74" cy="4" r="8" fill="#4f46e5"/>
    </svg>`,
  },
  {
    name:  'IRON BRAWLER',
    color: '#dc2626', accent: '#f87171',
    desc:  'Slow but devastating melee.',
    stats: { pow:5, spd:2, mag:1, def:5 },
    svg: `<svg viewBox="0 0 80 120" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="13" r="14" fill="#0f172a" stroke="#dc2626" stroke-width="2.5"/>
      <circle cx="45" cy="11" r="2" fill="#f87171"/><circle cx="50" cy="11" r="2" fill="#f87171"/>
      <line x1="40" y1="27" x2="40" y2="57" stroke="#e2e8f0" stroke-width="3"/>
      <polyline points="40,35 62,28 68,18" stroke="#cbd5e1" stroke-width="2.5" fill="none"/>
      <polyline points="40,35 16,28 10,18" stroke="#cbd5e1" stroke-width="2.5" fill="none"/>
      <line x1="40" y1="57" x2="22" y2="88" stroke="#94a3b8" stroke-width="3"/>
      <line x1="40" y1="57" x2="60" y2="88" stroke="#94a3b8" stroke-width="3"/>
      <circle cx="68" cy="20" r="10" fill="#dc2626"/><circle cx="10" cy="20" r="10" fill="#dc2626"/>
    </svg>`,
  },
  {
    name:  'SHADOW NINJA',
    color: '#a855f7', accent: '#d8b4fe',
    desc:  'Elusive. Blink in, blink out.',
    stats: { pow:2, spd:5, mag:3, def:2 },
    svg: `<svg viewBox="0 0 80 120" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="14" r="11" fill="#0f172a" stroke="#a855f7" stroke-width="2.5"/>
      <circle cx="44" cy="12" r="2" fill="#d8b4fe"/><circle cx="49" cy="12" r="2" fill="#d8b4fe"/>
      <line x1="40" y1="25" x2="40" y2="52" stroke="#e2e8f0" stroke-width="2.2"/>
      <polyline points="40,32 64,24 72,30" stroke="#cbd5e1" stroke-width="2" fill="none"/>
      <polyline points="40,32 18,26 12,20" stroke="#cbd5e1" stroke-width="2" fill="none"/>
      <line x1="40" y1="52" x2="20" y2="78" stroke="#94a3b8" stroke-width="2.2"/>
      <line x1="40" y1="52" x2="58" y2="80" stroke="#94a3b8" stroke-width="2.2"/>
      <line x1="64" y1="24" x2="76" y2="38" stroke="#a855f7" stroke-width="3"/>
      <line x1="72" y1="30" x2="80" y2="14" stroke="#a855f7" stroke-width="2"/>
    </svg>`,
  },
];

// ── Session-storage state ────────────────────────────────────────────
const SB = {
  _k: (k) => 'sb_' + k,

  set: (k, v) => sessionStorage.setItem('sb_' + k, JSON.stringify(v)),
  get: (k, d) => { const v = sessionStorage.getItem('sb_' + k); return v !== null ? JSON.parse(v) : d; },

  // Game mode: 'vs' | 'survival' | 'versus'
  setMode:   (m) => SB.set('mode', m),
  getMode:   ()  => SB.get('mode', 'vs'),

  // Selected character indices
  setP1:     (i) => SB.set('p1', i),
  setP2:     (i) => SB.set('p2', i),
  getP1:     ()  => SB.get('p1', 0),
  getP2:     ()  => SB.get('p2', 1),

  // Selected map index
  setMap: (i) => SB.set('map', i),
  getMap: ()  => SB.get('map', 0),

  // Settings: { difficulty, chaos, timer }
  setSettings: (s) => SB.set('cfg', s),
  getSettings: ()  => SB.get('cfg', { difficulty:'medium', chaos:false, timer:99 }),

  // Match result (written by battle.html, read by result.html)
  setResult:   (r) => { SB.set('result', r); SB.addHistory(r); },
  getResult:   ()  => SB.get('result', null),

  // Match history (localStorage, persists across sessions)
  addHistory: (r) => {
    const h = SB.getHistory();
    h.push({ ...r, mode: SB.getMode(), ts: Date.now() });
    if (h.length > 50) h.shift();
    localStorage.setItem('sb_history', JSON.stringify(h));
  },
  getHistory:   () => { try { return JSON.parse(localStorage.getItem('sb_history') || '[]'); } catch(e) { return []; } },
  clearHistory: () => localStorage.removeItem('sb_history'),

  // ── Navigation with fade-out ─────────────────
  navigate: (url, ms = 380) => {
    document.body.classList.add('out');
    setTimeout(() => { window.location.href = url; }, ms);
  },
};

// ── Fade-in on every page load ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Body fade-in is handled by CSS animation (pgFadeIn)
});
