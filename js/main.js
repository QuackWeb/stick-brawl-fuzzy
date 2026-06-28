// ─────────────────────────────────────────────
// INIT FIGHTERS
// ─────────────────────────────────────────────
f1 = new Fighter({ x: 120,     y: 300, ...CHARS[0], name: 'Player 1' });
f2 = new Fighter({ x: W - 160, y: 300, ...CHARS[1], name: 'AI Wizard', isAI: true });

// ─────────────────────────────────────────────
// SCREEN SHAKE
// ─────────────────────────────────────────────
function applyShake() {
  if (screenShake > 0.3) {
    _sx = (Math.random() - 0.5) * screenShake;
    _sy = (Math.random() - 0.5) * screenShake;
    screenShake *= 0.8;
    ctx.translate(_sx, _sy);
  } else {
    screenShake = 0; _sx = 0; _sy = 0;
  }
}

// ─────────────────────────────────────────────
// MAIN GAME LOOP
// ─────────────────────────────────────────────
function tick() {
  // Hit-stop: freeze physics but keep rendering
  if (hitStop > 0) { hitStop--; requestAnimationFrame(tick); return; }

  // Slow-mo: update physics only every 6th frame
  slowMoTick++;
  const shouldUpdate = !slowMo || (slowMoTick % 6 === 0);

  // Smooth camera zoom towards target
  camZoom += (camTZ  - camZoom) * 0.06;
  camFX   += (camTFX - camFX)   * 0.08;
  camFY   += (camTFY - camFY)   * 0.08;
  if (slowMo) { slowMoTimer--; if (slowMoTimer <= 0) { slowMo = false; camTZ = 1; camTFX = W / 2; camTFY = H / 2; } }

  ctx.save();
  applyShake();

  // ── Skip rendering when game hasn't started ──
  // Single-page mode: check #page-battle.active
  // Multi-page mode (battle.html): no #page-battle element, always render
  const pageEl = document.getElementById('page-battle');
  const battleActive = !pageEl || pageEl.classList.contains('active');
  if (!battleActive || gamePhase === 'idle') {
    drawFadeOverlay();
    ctx.restore(); requestAnimationFrame(tick); return;
  }

  // ── Apply camera zoom for world rendering ────
  ctx.save();
  if (Math.abs(camZoom - 1) > 0.01) {
    ctx.translate(W / 2, H / 2);
    ctx.scale(camZoom, camZoom);
    ctx.translate(-camFX, -camFY);
  }

  // ════════════════════════════════════════════
  if (gamePhase === 'countdown') {
    phaseTimer--;
    if (phaseTimer === 190) {
      showAnnouncer('3', '#ef4444', 55);
      burst(W/2, H/2, '#ef4444', 18, 7, 40);
      ring(W/2, H/2, '#ef4444', 170, 9, 3);
      flashAlpha = 0.25; flashColor = '#ef4444';
    }
    if (phaseTimer === 130) {
      showAnnouncer('2', '#f59e0b', 55);
      burst(W/2, H/2, '#f59e0b', 18, 7, 40);
      ring(W/2, H/2, '#f59e0b', 170, 9, 3);
      flashAlpha = 0.25; flashColor = '#f59e0b';
    }
    if (phaseTimer === 65) {
      showAnnouncer('1', '#10b981', 55);
      burst(W/2, H/2, '#10b981', 18, 7, 40);
      ring(W/2, H/2, '#10b981', 170, 9, 3);
      flashAlpha = 0.25; flashColor = '#10b981';
    }
    if (phaseTimer <= 0) {
      gamePhase = 'fight';
      showAnnouncer('FIGHT!', '#22c55e', 90);
      burst(W/2, H/2, '#22c55e', 45, 13, 58);
      burst(W/2, H/2, '#fff', 22, 9, 42);
      ring(W/2, H/2, '#22c55e', 380, 15, 5);
      ring(W/2, H/2, '#fff', 250, 22, 2.5);
      flashAlpha = 0.5; flashColor = '#22c55e';
    }
    particles.forEach(p => p.update()); particles = particles.filter(p => p.life > 0);
    rings.forEach(r => r.update()); rings = rings.filter(r => r.active);
    drawBG();
    rings.forEach(r => r.draw());
    particles.forEach(p => p.draw());
    f1.draw(); f2.draw();

  // ════════════════════════════════════════════
  } else if (gamePhase === 'fight') {
    if (shouldUpdate) {
      handleP1();
      if (f2.isAI) runAI(f2, f1); else handleP2();
      f1.update(f2); f2.update(f1);
      updateMovingPlats(); carryPlats(f1); carryPlats(f2);
      projectiles.forEach(p => p.update());
      particles.forEach(p   => p.update());
      rings.forEach(r => r.update());
      // Shooting star spawner
      ssTimer++;
      if (ssTimer > 180 + Math.floor(Math.random() * 360)) {
        ssTimer = 0;
        const ml = 24 + Math.floor(Math.random() * 16);
        const spd = 10 + Math.random() * 10;
        const ang = 0.22 + Math.random() * 0.22;
        shootingStars.push({ x: -30, y: Math.random() * H * 0.42, dx: Math.cos(ang) * spd, dy: Math.sin(ang) * spd, life: ml, maxLife: ml });
      }
      shootingStars.forEach(s => { s.x += s.dx; s.y += s.dy; s.life--; });
      shootingStars = shootingStars.filter(s => s.life > 0);
      dmgNums.forEach(d     => d.update());
      if (chaosMode) {
        chaosTick++;
        const ct = Date.now() * 0.001;
        if      (mapIdx === 0) updateChaosNeon(ct);   // Neon: chaos train
        else if (mapIdx === 2) updateChaosLava(ct);   // Lava: chaos fireballs
        // Map 1 (Storm): chaos lightning handled inside drawStormPeak
        // Generic meteor chaos for any future maps
        else if (![0,1,2].includes(mapIdx) && chaosTick % 60 === 0) meteors.push(new Meteor());
      }
      meteors.forEach(m => m.update(f1, f2));
      iceWalls.forEach(w => w.update());
      powerUpTimer++; if (powerUpTimer > 720 && powerUps.length < 3) { spawnPowerUp(); powerUpTimer = 0; }
      powerUps.forEach(p => p.update([f1, f2]));
      checkMelee(); checkProjectiles(); cleanup();

      // ── VS end conditions ──────────────────
      if (gameMode === 'vs') {
        roundTimer--; if (roundTimer <= 0) { const w = f1.hp > f2.hp ? f1 : f1.hp < f2.hp ? f2 : null; endRound(w); }
        // Check simultaneous death first so it takes priority over individual checks
        if (f1.dead && f2.dead && f1.deadTimer <= 0 && f2.deadTimer <= 0) endRound(null);
        else if (f1.dead && f1.deadTimer <= 0)                             endRound(f2);
        else if (f2.dead && f2.deadTimer <= 0)                             endRound(f1);

      // ── Survival end conditions ────────────
      } else {
        if (f1.dead && f1.deadTimer <= 0) {
          if (survivalWave > survivalHighScore) { survivalHighScore = survivalWave; localStorage.setItem('sbhs', survivalHighScore); }
          gamePhase = 'survival_over'; showAnnouncer('FALLEN!', '#ef4444', 70);
          setTimeout(() => {
            if (typeof SB !== 'undefined') {
              SB.setResult({
                winnerText: 'FALLEN  —  Wave ' + survivalWave, winnerColor: '#ef4444', type: 'survival',
                p1Name: f1.name, p1Color: f1.color, p2Name: 'Enemies', p2Color: '#dc2626',
                stats: JSON.parse(JSON.stringify(totalStats)), survivalWave, survivalScore,
              });
              document.body.classList.add('out');
              setTimeout(() => { window.location.href = 'result.html'; }, 400);
            } else { showResultPage('FALLEN — Wave ' + survivalWave, '#ef4444', true); }
          }, 2200);
        }
        if (f2.dead && f2.deadTimer <= 0 && gamePhase === 'fight') survivalEnemyDied();
      }
    }

    drawBG();
    rings.forEach(r => r.draw());
    particles.forEach(p  => p.draw());
    powerUps.forEach(p   => p.draw());
    f1.draw(); f2.draw();
    projectiles.forEach(p => p.draw());
    meteors.forEach(m    => m.draw());
    dmgNums.forEach(d    => d.draw());

  // ════════════════════════════════════════════
  } else if (gamePhase === 'roundover') {
    if (shouldUpdate) { particles.forEach(p => p.update()); dmgNums.forEach(d => d.update()); }
    drawBG(); particles.forEach(p => p.draw()); f1.draw(); f2.draw(); dmgNums.forEach(d => d.draw());

  // ════════════════════════════════════════════
  } else if (gamePhase === 'survival_break') {
    if (shouldUpdate) { survivalBreakTimer--; particles.forEach(p => p.update()); }
    if (survivalBreakTimer <= 0) { startSurvivalWave(); gamePhase = 'fight'; }
    drawBG(); particles.forEach(p => p.draw()); f1.draw(); f2.draw();

  // gameover + survival_over: keep drawing game while fade/result page takes over
  } else if (gamePhase === 'gameover' || gamePhase === 'survival_over') {
    if (shouldUpdate) { particles.forEach(p => p.update()); rings.forEach(r => r.update()); rings = rings.filter(r => r.active); }
    drawBG(); rings.forEach(r => r.draw()); particles.forEach(p => p.draw()); f1.draw(); f2.draw();
  }

  ctx.restore(); // end camera transform

  // Cinematic bars (screen-space, outside camera)
  if (slowMo) { ctx.fillStyle = 'rgba(0,0,0,.85)'; ctx.fillRect(0, 0, W, 38); ctx.fillRect(0, H - 38, W, 38); }

  // HUD & announcer always on top
  if (!['modeselect','charselect'].includes(gamePhase)) drawHUD();

  // Low-HP danger vignette (pulses red on screen edges)
  if (gamePhase === 'fight') {
    [f1, f2].forEach(cf => {
      if (cf.dead || cf.hp / cf.maxHp >= 0.22) return;
      const a = 0.09 + Math.sin(Date.now() * 0.009) * 0.06;
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.15, W / 2, H / 2, H * 0.85);
      vg.addColorStop(0, 'rgba(239,68,68,0)');
      vg.addColorStop(1, `rgba(239,68,68,${a})`);
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    });
  }

  if (gamePhase === 'fight') {
    if (fuzzyView > 0) updateFuzzyPanel();
  }
  drawAnnouncer();

  // (Game-over/survival-over overlays are now handled by the HTML result page)

  // Hit-flash overlay
  if (flashAlpha > 0.01) {
    ctx.save(); ctx.globalAlpha = flashAlpha; ctx.fillStyle = flashColor;
    ctx.fillRect(-_sx, -_sy, W, H); ctx.restore();
    flashAlpha *= 0.8;
  }

  // Vignette during slow-mo
  if (slowMo) {
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.9);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }

  drawFadeOverlay();
  ctx.restore(); // end shake
  requestAnimationFrame(tick);
}

// ─────────────────────────────────────────────
// START
// ─────────────────────────────────────────────
requestAnimationFrame(tick);
