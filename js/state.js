// ─────────────────────────────────────────────
// GAME MODE / OPTIONS
// ─────────────────────────────────────────────
let gameMode = 'vs';   // 'vs' | 'survival'
let vsAI     = true;
let chaosMode= false;
let chaosTick= 0;
let mapIdx   = 0;

// ─────────────────────────────────────────────
// PHASE
// ─────────────────────────────────────────────
// modeselect | charselect | countdown | fight |
// roundover  | gameover   | survival_break | survival_over
let gamePhase  = 'idle';    // HTML pages handle intro/menu/charselect; canvas handles fight phases
let phaseTimer = 0;

// ─────────────────────────────────────────────
// CHARACTER SELECT
// ─────────────────────────────────────────────
let p1CharIdx = 0;
let p2CharIdx = 1;
let p1Locked  = false;
let p2Locked  = false;

// ─────────────────────────────────────────────
// VS MODE ROUND STATE
// ─────────────────────────────────────────────
let p1Wins   = 0;
let p2Wins   = 0;
let roundNum = 1;
let roundTimer = 0;

// ─────────────────────────────────────────────
// SURVIVAL STATE
// ─────────────────────────────────────────────
let survivalWave       = 0;
let survivalScore      = 0;
let survivalEnemiesLeft= 0;
let survivalBreakTimer = 0;
let survivalHighScore  = parseInt(localStorage.getItem('sbhs') || '0');

// ─────────────────────────────────────────────
// ANNOUNCER
// ─────────────────────────────────────────────
let annoText  = '';
let annoTimer = 0;
let annoSize  = 60;
let annoColor = '#fff';

// ─────────────────────────────────────────────
// ENTITY ARRAYS
// ─────────────────────────────────────────────
let particles  = [];
let projectiles= [];
let iceWalls   = [];
let meteors    = [];
let dmgNums    = [];
let powerUps   = [];
let rings      = [];

// ─────────────────────────────────────────────
// SHOOTING STAR SYSTEM
// ─────────────────────────────────────────────
let shootingStars = [];
let ssTimer       = 0;

// ─────────────────────────────────────────────
// MAP RUNTIME
// ─────────────────────────────────────────────
let activeBlocks = [];
let movingPlats  = [];

// ─────────────────────────────────────────────
// SCREEN EFFECTS
// ─────────────────────────────────────────────
let screenShake = 0;
let flashAlpha  = 0;
let flashColor  = '#fff';
let hitStop     = 0;
let _sx = 0, _sy = 0;  // current shake offset

// ─────────────────────────────────────────────
// CAMERA / SLOW-MO
// ─────────────────────────────────────────────
let slowMo     = false;
let slowMoTimer= 0;
let slowMoTick = 0;
let camZoom = 1,  camTZ  = 1;
let camFX   = W / 2, camFY = H / 2;
let camTFX  = W / 2, camTFY= H / 2;

// ─────────────────────────────────────────────
// POWER-UP SPAWN TIMER
// ─────────────────────────────────────────────
let powerUpTimer = 0;

// ─────────────────────────────────────────────
// CUMULATIVE MATCH STATS
// ─────────────────────────────────────────────
let totalStats = {
  p1: { dmg: 0, hits: 0, spells: 0, maxCombo: 0, dashes: 0, parries: 0 },
  p2: { dmg: 0, hits: 0, spells: 0, maxCombo: 0, dashes: 0, parries: 0 },
};

// ─────────────────────────────────────────────
// PARALLAX BACKGROUND LAYERS
// ─────────────────────────────────────────────
const bgLayers = [
  { stars: [], spd: 0.012 },
  { stars: [], spd: 0.028 },
];
for (const l of bgLayers)
  for (let i = 0; i < 50; i++)
    l.stars.push({ x: Math.random() * W, y: Math.random() * H * 0.75, r: Math.random() * 1.6 + 0.3, tw: Math.random() * Math.PI * 2 });

let bgLight = { timer: 0, x: 0, alpha: 0 };

// ─────────────────────────────────────────────
// SCREEN FADE TRANSITION
// ─────────────────────────────────────────────
let fadeAlpha = 0;
let fadeDir   = 0;    // 1 = fade to black,  -1 = fade from black,  0 = idle
let _fadeFn   = null; // callback fired when screen is fully black

function fadeTransition(fn) {
  if (fadeDir !== 0) return;
  _fadeFn = fn || null;
  fadeDir = 1;
}

// ─────────────────────────────────────────────
// FUZZY PANEL VIEW  (cycled with [P])
// 0 = OFF  1 = Debug  2 = MF Graphs  3 = System Diagram
// ─────────────────────────────────────────────
let fuzzyView = 0;

// ─────────────────────────────────────────────
// INPUT STATE
// ─────────────────────────────────────────────
const keys = {};
let p1JumpQ = false;
let p2JumpQ = false;

// ─────────────────────────────────────────────
// FIGHTER REFERENCES (assigned in main.js)
// ─────────────────────────────────────────────
let f1, f2;
