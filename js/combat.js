// ─────────────────────────────────────────────
// COLLISION DETECTION
// ─────────────────────────────────────────────
function bHit(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function checkMelee() {
  for (const [atk, def] of [[f1, f2], [f2, f1]]) {
    if (!atk.attacking) continue;
    const rx = atk.facingRight ? atk.x + atk.w : atk.x - 64;
    if (bHit(rx, atk.y + 8, 64, 44, def.x, def.y, def.w, def.h))
      if (def.takeHit({ dmg: Math.round(14 * atk.mDmg * atk.dmgMult), stun: 18, knock: 9, type: 'melee' }, atk, atk.color))
        atk.attacking = false;
  }
}

function checkProjectiles() {
  for (const p of projectiles) {
    if (!p.active) continue;
    const def = p.owner === f1 ? f2 : f1;
    if (bHit(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2, def.x, def.y, def.w, def.h))
      if (def.takeHit({ dmg: p.dmg, stun: 15, knock: 6, type: 'ranged', status: p.status, statusDur: p.statusDur }, p.owner, p.color)) {
        p.active = false; burst(p.x, p.y, p.color, 10);
      }
  }
}

/** Remove expired/dead objects from all arrays */
function cleanup() {
  projectiles = projectiles.filter(p => p.active);
  particles   = particles.filter(p => p.life > 0);
  dmgNums     = dmgNums.filter(d => d.life > 0);
  meteors     = meteors.filter(m => m.active);
  powerUps    = powerUps.filter(p => p.active);
  rings       = rings.filter(r => r.active);
  iceWalls.filter(w => !w.active).forEach(w => burst(w.x + w.width / 2, w.y + w.height / 2, '#93c5fd', 8, 4));
  iceWalls    = iceWalls.filter(w => w.active);
}

// ─────────────────────────────────────────────
// VS ROUND MANAGEMENT
// ─────────────────────────────────────────────
function startRound() {
  f1.reset(); f2.reset();
  projectiles = []; particles = []; iceWalls = []; meteors = []; dmgNums = []; powerUps = []; rings = []; shootingStars = [];
  powerUpTimer = 0;
  loadMap();
  roundTimer = (window.getRoundTime ? window.getRoundTime() : 5940);
  gamePhase  = 'countdown';
  phaseTimer = 260;             // extended for 3-2-1-FIGHT sequence
  slowMo = false; camTZ = 1; camTFX = W / 2; camTFY = H / 2;
  showAnnouncer(`ROUND ${roundNum}`, '#f1f5f9', 68);
}

// Switch battle music to match current mapIdx (only when music is on)
function _switchBattleMusic() {
  if (typeof MU === 'undefined' || !sessionStorage.getItem('sbMusicOn')) return;
  MU.stop(0.3);
  setTimeout(() => { MU.battle(mapIdx); }, 380);
}

function endRound(winner) {
  if (gamePhase !== 'fight') return;
  gamePhase = 'roundover';
  if      (!winner)       showAnnouncer('DRAW',  '#f59e0b', 80);
  else if (winner === f1) { p1Wins++; showAnnouncer('K.O.!', '#ef4444', 90); spawnConfetti(f1.color); }
  else                    { p2Wins++; showAnnouncer('K.O.!', '#ef4444', 90); spawnConfetti(f2.color); }
  screenShake = 16;
  setTimeout(() => {
    if (p1Wins >= 2 || p2Wins >= 2) {
      // Training mode: reset dummy instead of ending match
      if (window.trainingMode) {
        p1Wins = 0; p2Wins = 0; roundNum = 1;
        if (typeof SB === 'undefined' || SB.getMap() === -1) {
          mapIdx = (mapIdx + 1) % MAPS.length;
          _switchBattleMusic();
        }
        showAnnouncer('DUMMY RESET', '#f59e0b', 68);
        fadeTransition(() => startRound());
        return;
      }
      const winName = p1Wins > p2Wins ? f1.name : f2.name;
      const winCol  = p1Wins > p2Wins ? f1.color : f2.color;
      spawnConfetti(winCol);
      // Save result and navigate to result page
      if (typeof SB !== 'undefined') {
        SB.setResult({
          winnerText: winName + ' WINS!', winnerColor: winCol, type: 'vs',
          p1Name: f1.name, p1Color: f1.color,
          p2Name: f2.name, p2Color: f2.color,
          stats: JSON.parse(JSON.stringify(totalStats)),
        });
        document.body.classList.add('out');
        setTimeout(() => { window.location.href = 'result.html'; }, 400);
      } else {
        showResultPage(winName + ' WINS!', winCol, false);
      }
    } else {
      roundNum++;
      if (typeof SB === 'undefined' || SB.getMap() === -1) {
        mapIdx = (mapIdx + 1) % MAPS.length;
        _switchBattleMusic();
      }
      fadeTransition(() => { startRound(); });
    }
  }, 2000);
}

// ─────────────────────────────────────────────
// SURVIVAL WAVE MANAGEMENT
// ─────────────────────────────────────────────
function startSurvivalWave() {
  survivalWave++;
  survivalEnemiesLeft = Math.min(survivalWave, 5);
  // Partial HP/MP restore between waves
  f1.hp   = Math.min(f1.maxHp,   f1.hp   + 25);
  f1.mana = Math.min(f1.maxMana, f1.mana + 40);
  // Rotate map between waves only in random mode
  if (typeof SB === 'undefined' || SB.getMap() === -1) {
    mapIdx = (mapIdx + 1) % MAPS.length;
    _switchBattleMusic();
  }
  loadMap();
  spawnSurvivalEnemy();
  showAnnouncer(`WAVE ${survivalWave}!`, `hsl(${200 - survivalWave * 12},90%,60%)`, 72);
  snd('wave');
}

function spawnSurvivalEnemy() {
  const ci   = Math.floor(Math.random() * 3);
  const base = CHARS[ci];
  const scale= 1 + (survivalWave - 1) * 0.18;
  f2.applyChar(base);
  f2.maxHp  = Math.round(base.hp * scale);
  f2.mDmg   = base.mDmg * (1 + (survivalWave - 1) * 0.08);
  f2.sDmg   = base.sDmg * (1 + (survivalWave - 1) * 0.08);
  f2.name   = `Wave ${survivalWave} ${base.name}`;
  f2.isAI   = true;
  f2.reset();
  showAnnouncer(base.name, base.color, 44);
}

function survivalEnemyDied() {
  survivalScore += 100 + Math.floor(f1.hp * 0.5) + survivalWave * 20;
  survivalEnemiesLeft--;

  if (survivalEnemiesLeft <= 0) {
    // Wave complete
    survivalScore += survivalWave * 50;
    gamePhase = 'survival_break'; survivalBreakTimer = 180;
    showAnnouncer(`WAVE ${survivalWave} CLEAR!`, '#22c55e', 72); snd('wave');
    if (survivalWave > survivalHighScore) {
      survivalHighScore = survivalWave; localStorage.setItem('sbhs', survivalHighScore);
    }
  } else {
    setTimeout(() => { if (gamePhase !== 'fight') return; spawnSurvivalEnemy(); showAnnouncer('NEXT!', '#f59e0b', 60); }, 1200);
  }
}

// ─────────────────────────────────────────────
// GAME START / RESTART
// ─────────────────────────────────────────────
function beginGame() {
  // Read character choices from sessionStorage when in multi-page mode
  if (typeof SB !== 'undefined' && p1CharIdx === undefined) {
    p1CharIdx = SB.getP1(); p2CharIdx = SB.getP2();
    const rawMode = SB.getMode();
    gameMode = rawMode === 'survival' ? 'survival' : 'vs';
    vsAI     = rawMode !== 'versus';
  }
  f1.applyChar(CHARS[p1CharIdx]); f1.startX = 120;  f1.name = 'Player 1'; f1.reset();
  f2.applyChar(CHARS[p2CharIdx]); f2.startX = W - 160; f2.isAI = vsAI || (gameMode === 'survival'); f2.name = vsAI ? 'AI Wizard' : CHARS[p2CharIdx].name; f2.reset();
  p1Wins = 0; p2Wins = 0; roundNum = 1;
  survivalWave = 0; survivalScore = 0; survivalEnemiesLeft = 0;
  totalStats = { p1: { dmg: 0, hits: 0, spells: 0, maxCombo: 0, dashes: 0, parries: 0 }, p2: { dmg: 0, hits: 0, spells: 0, maxCombo: 0, dashes: 0, parries: 0 } };
  loadMap();
  if (gameMode === 'survival') { startSurvivalWave(); gamePhase = 'fight'; }
  else startRound();
}

function restartAll() {
  p1Locked = false; p2Locked = false;
  slowMo = false; camZoom = 1; camTZ = 1;
  if (typeof SB !== 'undefined') {
    document.body.classList.add('out');
    setTimeout(() => { window.location.href = 'main-menu.html'; }, 360);
  } else {
    fadeTransition(() => { gamePhase = 'modeselect'; });
  }
}
