// ─────────────────────────────────────────────
// KEYBOARD EVENTS
// ─────────────────────────────────────────────
window.addEventListener('keydown', e => {
  if (keys[e.code]) return;      // ignore key repeat
  keys[e.code] = true;
  if (['Space','ArrowUp','ArrowLeft','ArrowRight','ArrowDown'].includes(e.code)) e.preventDefault();

  // Jump queues (edge-triggered so double-jump works)
  if (e.code === 'KeyW')     p1JumpQ = true;
  if (e.code === 'ArrowUp')  p2JumpQ = true;

  // ── Global in-game shortcuts ─────────────
  if (e.code === 'Escape' && (gamePhase === 'survival_over' || gamePhase === 'gameover' || gamePhase === 'roundover')) {
    restartAll(); return;
  }
  if (e.code === 'KeyM') { mapIdx = (mapIdx + 1) % MAPS.length; if (gamePhase === 'fight') loadMap(); return; }
  if (e.code === 'KeyP') { fuzzyView = (fuzzyView + 1) % 4; _syncFuzzyBtn(); return; }

  // ── Fight controls ───────────────────────
  if (gamePhase !== 'fight') return;

  // P1 spells/actions
  if (e.code === 'Space')  f1.melee();
  if (e.code === 'KeyF')   f1.burstSpell(f2);
  if (e.code === 'KeyE')   f1.blink();
  if (e.code === 'KeyK')   f1.ice();
  if (e.code === 'KeyG')   f1.heal();
  if (e.code === 'KeyI')   f1.ultimate(f2);
  if (e.code === 'KeyA')   f1.tryDash(-1);
  if (e.code === 'KeyD')   f1.tryDash(1);
  if (e.code === 'KeyS' && f1.parryWindow <= 0) f1.parryWindow = 12;

  // P2 (2-player mode only)
  if (!vsAI && gameMode === 'vs') {
    if (e.code === 'Enter')   f2.melee();
    if (e.code === 'Digit1')  f2.fireCharged(80);
    if (e.code === 'Digit2')  f2.ice();
    if (e.code === 'Digit3')  f2.heal();
    if (e.code === 'Digit4')  f2.ultimate(f1);
    if (e.code === 'ArrowLeft')  f2.tryDash(-1);
    if (e.code === 'ArrowRight') f2.tryDash(1);
    if (e.code === 'ArrowDown' && f2.parryWindow <= 0) f2.parryWindow = 12;
  }
});

window.addEventListener('keyup', e => {
  keys[e.code] = false;
  // Release charge fire
  if (e.code === 'KeyJ' && gamePhase === 'fight' && f1.fireChargeTime > 0) {
    f1.fireCharged(f1.fireChargeTime); f1.fireChargeTime = 0;
  }
});

// ─────────────────────────────────────────────
// PER-FRAME PLAYER CONTROL HANDLERS
// ─────────────────────────────────────────────
function handleP1() {
  if (f1.stun > 0 || f1.dead) return;
  if (!f1.isDashing) {
    if      (keys['KeyA']) { f1.vx = -f1.effSpd; f1.facingRight = false; }
    else if (keys['KeyD']) { f1.vx =  f1.effSpd; f1.facingRight = true;  }
  }
  if (p1JumpQ) { p1JumpQ = false; f1.tryJump(); }
  f1.shielding = !!(keys['KeyS'] && f1.parryWindow <= 0);
  // Build charge fire
  if (keys['KeyJ']) f1.fireChargeTime = Math.min(90, f1.fireChargeTime + 1);
}

function handleP2() {
  if (f2.stun > 0 || f2.dead) return;
  if (!f2.isDashing) {
    if      (keys['ArrowLeft'])  { f2.vx = -f2.effSpd; f2.facingRight = false; }
    else if (keys['ArrowRight']) { f2.vx =  f2.effSpd; f2.facingRight = true;  }
  }
  if (p2JumpQ) { p2JumpQ = false; f2.tryJump(); }
  f2.shielding = !!(keys['ArrowDown'] && f2.parryWindow <= 0);
}

// ─────────────────────────────────────────────
// UI BUTTONS
// ─────────────────────────────────────────────
// Click on canvas during intro → enter game
C.addEventListener('click', () => {
  if (gamePhase === 'intro')
    fadeTransition(() => { showAnnouncer('STICK BRAWL!', '#818cf8', 72); gamePhase = 'modeselect'; });
});

document.getElementById('chaosBtn').addEventListener('click', () => {
  chaosMode = !chaosMode;
  const btn = document.getElementById('chaosBtn');
  btn.textContent = chaosMode ? 'Chaos ON' : 'Chaos OFF';
  btn.classList.toggle('on', chaosMode);
});

function _syncFuzzyBtn() {
  const labels = ['Fuzzy OFF', 'Fuzzy: Debug', 'Fuzzy: MF Graphs', 'Fuzzy: System Model'];
  const btn = document.getElementById('fuzzyBtn');
  if (btn) {
    btn.textContent = labels[fuzzyView];
    btn.classList.toggle('on', fuzzyView > 0);
  }
  _syncPanel();
}

function _syncPanel() {
  const ba = document.getElementById('battleArea');
  if (!ba) return;
  if (fuzzyView > 0) {
    ba.classList.add('fp-open');
  } else {
    ba.classList.remove('fp-open');
  }
  document.querySelectorAll('.fp-tab').forEach((t, i) => {
    t.classList.toggle('fp-ton', i === fuzzyView - 1);
  });
}

window._fpTab = function(v) {
  fuzzyView = v;
  _syncFuzzyBtn();
};

document.getElementById('fuzzyBtn').addEventListener('click', () => {
  fuzzyView = (fuzzyView + 1) % 4;
  _syncFuzzyBtn();
});
