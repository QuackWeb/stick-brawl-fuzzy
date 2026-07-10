// ─────────────────────────────────────────────
// SCREEN FADE OVERLAY
// Called at the end of every tick() branch so the
// black fade renders on top of all game content.
// ─────────────────────────────────────────────
function drawFadeOverlay() {
  if (fadeDir !== 0) {
    fadeAlpha = Math.max(0, Math.min(1, fadeAlpha + fadeDir * 0.055));
    if (fadeDir === 1 && fadeAlpha >= 1) {
      if (_fadeFn) { _fadeFn(); _fadeFn = null; }
      fadeDir = -1;
    } else if (fadeDir === -1 && fadeAlpha <= 0) {
      fadeAlpha = 0; fadeDir = 0;
    }
  }
  if (fadeAlpha > 0.005) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);   // screen-space — ignores shake/camera
    ctx.globalAlpha = fadeAlpha;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

// ─────────────────────────────────────────────
// INTRO / SPLASH SCREEN
// ─────────────────────────────────────────────
function drawIntro() {
  const t  = Date.now();
  const nt = t * 0.00005;

  // ── Background gradient ───────────────────
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#050810'); bg.addColorStop(1, '#0d0820');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // ── Drifting nebula glows ─────────────────
  [
    { cx: W*0.15 + Math.sin(nt)*28,      cy: H*0.38 + Math.cos(nt*0.7)*16,  r: 290, c: '#4f46e5' },
    { cx: W*0.85 + Math.cos(nt*0.8)*22,  cy: H*0.42 + Math.sin(nt*0.5)*18, r: 270, c: '#dc2626' },
    { cx: W*0.50 + Math.sin(nt*0.6)*35,  cy: H*0.10 + Math.cos(nt*0.9)*10, r: 200, c: '#7c3aed' },
  ].forEach(n => {
    const ng = ctx.createRadialGradient(n.cx, n.cy, 0, n.cx, n.cy, n.r);
    ng.addColorStop(0, n.c + '22'); ng.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ng; ctx.fillRect(0, 0, W, H);
  });

  // ── Stars (reuse bgLayers) ────────────────
  for (const l of bgLayers) for (const s of l.stars) {
    s.tw += 0.022;
    ctx.save(); ctx.globalAlpha = 0.28 + Math.sin(s.tw) * 0.28;
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ── Pulsing energy rings at VS centre ─────
  for (let i = 0; i < 3; i++) {
    const phase = (t * 0.0007 / 1 + i / 3) % 1;
    const r = phase * 185;
    const a = (1 - phase) * 0.52;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = i % 2 === 0 ? '#4f46e5' : '#dc2626';
    ctx.lineWidth = 2.2;
    ctx.shadowBlur = 12; ctx.shadowColor = ctx.strokeStyle;
    ctx.beginPath(); ctx.arc(W / 2, H / 2 + 48, r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  // ── Fighters ─────────────────────────────
  const bob = Math.sin(t * 0.0017) * 10;
  _drawIntroFighter(W / 2 - 298, H / 2 + 42 + bob,  '#4f46e5', '#818cf8', true);
  _drawIntroFighter(W / 2 + 298, H / 2 + 42 - bob,  '#dc2626', '#f87171', false);

  // ── VS ────────────────────────────────────
  const vsp = 1 + Math.sin(t * 0.003) * 0.055;
  ctx.save();
  ctx.translate(W / 2, H / 2 + 48); ctx.scale(vsp, vsp);
  ctx.font = '900 44px Segoe UI'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 10;
  ctx.strokeText('VS', 0, 0);
  ctx.shadowBlur = 32; ctx.shadowColor = '#f1f5f9'; ctx.fillStyle = '#f1f5f9';
  ctx.fillText('VS', 0, 0);
  ctx.restore();

  // ── Title "STICK BRAWL" ───────────────────
  const tp = 1 + Math.sin(t * 0.0009) * 0.018;
  ctx.save();
  ctx.translate(W / 2, 178); ctx.scale(tp, tp);
  ctx.font = '900 92px Segoe UI'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.strokeStyle = '#1e1b4b'; ctx.lineWidth = 16;
  ctx.strokeText('STICK BRAWL', 0, 0);
  const tg = ctx.createLinearGradient(-390, 0, 390, 0);
  tg.addColorStop(0, '#818cf8'); tg.addColorStop(0.5, '#f1f5f9'); tg.addColorStop(1, '#818cf8');
  ctx.shadowBlur = 50; ctx.shadowColor = '#4f46e5';
  ctx.fillStyle = tg; ctx.fillText('STICK BRAWL', 0, 0);
  ctx.restore();

  // ── Subtitle ─────────────────────────────
  ctx.save();
  ctx.font = 'bold 17px Segoe UI'; ctx.textAlign = 'center'; ctx.shadowBlur = 0;
  ctx.fillStyle = '#475569'; ctx.fillText('ULTIMATE EDITION  v4', W / 2, 232);
  ctx.restore();

  // ── Course label ─────────────────────────
  ctx.save();
  ctx.font = 'bold 11px Segoe UI'; ctx.textAlign = 'center';
  ctx.fillStyle = '#2d3748';
  ctx.fillText('ISP568  —  Fuzzy Logic Systems', W / 2, 255);
  ctx.restore();

  // ── Blinking "Press any key" ──────────────
  const blink = Math.sin(t * 0.0033) > 0.08;
  ctx.save();
  ctx.font = 'bold 15px Segoe UI'; ctx.textAlign = 'center';
  ctx.globalAlpha = blink ? 1 : 0.22;
  ctx.fillStyle = '#94a3b8';
  ctx.shadowBlur = 12; ctx.shadowColor = '#4f46e5';
  ctx.fillText('PRESS ANY KEY  OR  CLICK TO ENTER', W / 2, H - 52);
  ctx.restore();

  // ── Footer ────────────────────────────────
  ctx.save();
  ctx.font = '10px Segoe UI'; ctx.textAlign = 'center';
  ctx.fillStyle = '#1e293b';
  ctx.fillText('Fuzzy Logic AI  ·  3 Characters  ·  3 Maps  ·  VS & Survival Mode', W / 2, H - 20);
  ctx.restore();
}

function _drawIntroFighter(x, y, color, accent, facingRight) {
  const dir = facingRight ? 1 : -1;
  ctx.save();
  ctx.translate(x, y); ctx.scale(1.55, 1.55);
  ctx.shadowBlur = 24; ctx.shadowColor = color;

  // Aura glow behind fighter
  const aura = ctx.createRadialGradient(0, -20, 5, 0, -20, 62);
  aura.addColorStop(0, color + '35'); aura.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = aura;
  ctx.beginPath(); ctx.arc(0, -20, 62, 0, Math.PI * 2); ctx.fill();

  // Head
  ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.fillStyle = '#0f172a';
  ctx.beginPath(); ctx.arc(0, -53, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = accent;
  ctx.beginPath(); ctx.arc(dir*4, -55, 2.5, 0, Math.PI * 2);
  ctx.arc(dir*9, -55, 2.5, 0, Math.PI * 2); ctx.fill();

  // Body
  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(0, -15); ctx.stroke();

  // Arms
  ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2.2;
  if (facingRight) {
    // Attack: arm extended forward-up
    ctx.beginPath(); ctx.moveTo(0, -35); ctx.lineTo(dir*28, -50); ctx.lineTo(dir*44, -62); ctx.stroke();
  } else {
    // Defend: arm raised in block
    ctx.beginPath(); ctx.moveTo(0, -35); ctx.lineTo(dir*22, -27); ctx.lineTo(dir*26, -18); ctx.stroke();
  }

  // Legs (wide stance)
  ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(-14, 12); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(dir*18, 12); ctx.stroke();

  // Staff / weapon
  ctx.strokeStyle = color; ctx.lineWidth = 3.5;
  if (facingRight) {
    ctx.beginPath(); ctx.moveTo(dir*16, -20); ctx.lineTo(dir*44, -60); ctx.stroke();
    ctx.shadowBlur = 24; ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(dir*44, -60, 8, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.beginPath(); ctx.moveTo(dir*14, -32); ctx.lineTo(dir*26, -18); ctx.stroke();
    ctx.shadowBlur = 24; ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(dir*26, -18, 8, 0, Math.PI * 2); ctx.fill();
  }

  ctx.restore();
}

// ─────────────────────────────────────────────
// ANNOUNCER
// ─────────────────────────────────────────────
function showAnnouncer(txt, color = '#fff', size = 60) {
  annoText = txt; annoTimer = 110; annoSize = size; annoColor = color;
}

function drawAnnouncer() {
  if (annoTimer <= 0) return;
  annoTimer--;
  const a = Math.min(1, annoTimer / 18) * Math.min(1, (110 - annoTimer) / 10 + 0.15);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.max(0, a);
  ctx.translate(W / 2, H / 2);
  ctx.scale(1 + (110 - annoTimer) * 0.004, 1 + (110 - annoTimer) * 0.004);
  ctx.font = `900 ${annoSize}px Segoe UI`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.strokeStyle = '#000'; ctx.lineWidth = 9; ctx.strokeText(annoText, 0, 0);
  ctx.shadowBlur = 35; ctx.shadowColor = annoColor; ctx.fillStyle = annoColor;
  ctx.fillText(annoText, 0, 0);
  ctx.restore();
}

// ─────────────────────────────────────────────
// HUD (drawn at screen-space, no camera transform)
// ─────────────────────────────────────────────
function drawHUD() {
  const bw = 240;

  // ── P1 bars ──────────────────────────────
  ctx.fillStyle = '#0f172a'; ctx.fillRect(20, 22, bw, 16);
  ctx.fillStyle = `hsl(${f1.hp * 1.2},85%,45%)`; ctx.fillRect(20, 22, bw * (f1.hp / f1.maxHp), 16);
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.strokeRect(20, 22, bw, 16);
  ctx.fillStyle = '#0f172a'; ctx.fillRect(20, 42, 180, 7);
  ctx.fillStyle = '#6366f1';  ctx.fillRect(20, 42, 180 * (f1.mana / 100), 7); ctx.strokeRect(20, 42, 180, 7);
  ctx.fillStyle = '#0f172a'; ctx.fillRect(20, 53, 180, 6);
  ctx.fillStyle  = f1.ult >= f1.maxUlt ? f1.color : '#312e81';
  ctx.fillRect(20, 53, 180 * (f1.ult / f1.maxUlt), 6);
  if (f1.ult >= f1.maxUlt) { ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = f1.color; ctx.strokeStyle = f1.color; ctx.lineWidth = 1; ctx.strokeRect(20, 53, 180, 6); ctx.restore(); }
  ctx.fillStyle = '#f1f5f9'; ctx.font = 'bold 12px Segoe UI'; ctx.textAlign = 'left'; ctx.fillText(f1.name, 20, 16);

  // P1 status tags
  let sx = 210;
  if (f1.burn   > 0) { ctx.fillStyle = '#f97316'; ctx.font = 'bold 9px Segoe UI'; ctx.fillText('BURN',  sx, 16); sx += 34; }
  if (f1.freeze > 0) { ctx.fillStyle = '#93c5fd'; ctx.fillText('ICE',  sx, 16); sx += 26; }
  if (f1.shock  > 0) { ctx.fillStyle = '#fbbf24'; ctx.fillText('ZAP',  sx, 16); }
  if (f1.dmgBoostT > 0) { ctx.fillStyle = '#ef4444'; ctx.font = '9px Segoe UI'; ctx.fillText('ATK+', 20, 62); }
  if (f1.spdBoostT > 0) { ctx.fillStyle = '#f59e0b'; ctx.font = '9px Segoe UI'; ctx.fillText('SPD+', 52, 62); }

  // ── P2 bars ──────────────────────────────
  const p2x = W - 20 - bw;
  ctx.fillStyle = '#0f172a'; ctx.fillRect(p2x, 22, bw, 16);
  const p2f = bw * (f2.hp / f2.maxHp);
  ctx.fillStyle = `hsl(${f2.hp * 1.2},85%,45%)`; ctx.fillRect(p2x + bw - p2f, 22, p2f, 16);
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.strokeRect(p2x, 22, bw, 16);
  ctx.fillStyle = '#0f172a'; ctx.fillRect(p2x + 60, 42, 180, 7);
  const p2mf = 180 * (f2.mana / 100);
  ctx.fillStyle = '#f59e0b'; ctx.fillRect(p2x + 60 + 180 - p2mf, 42, p2mf, 7); ctx.strokeRect(p2x + 60, 42, 180, 7);
  ctx.fillStyle = '#0f172a'; ctx.fillRect(p2x + 60, 53, 180, 6);
  const p2uf = 180 * (f2.ult / f2.maxUlt);
  ctx.fillStyle = f2.ult >= f2.maxUlt ? f2.color : '#78350f';
  ctx.fillRect(p2x + 60 + 180 - p2uf, 53, p2uf, 6);
  if (f2.ult >= f2.maxUlt) { ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = f2.color; ctx.strokeStyle = f2.color; ctx.lineWidth = 1; ctx.strokeRect(p2x + 60, 53, 180, 6); ctx.restore(); }
  ctx.fillStyle = '#f1f5f9'; ctx.font = 'bold 12px Segoe UI'; ctx.textAlign = 'right'; ctx.fillText(f2.name, W - 20, 16);

  // P2 status tags
  ctx.textAlign = 'right'; let sx2 = p2x - 4;
  if (f2.burn   > 0) { ctx.fillStyle = '#f97316'; ctx.font = 'bold 9px Segoe UI'; ctx.fillText('BURN', sx2, 16); sx2 -= 34; }
  if (f2.freeze > 0) { ctx.fillStyle = '#93c5fd'; ctx.fillText('ICE',  sx2, 16); sx2 -= 26; }
  if (f2.shock  > 0) { ctx.fillStyle = '#fbbf24'; ctx.fillText('ZAP',  sx2, 16); }

  // ── Centre: VS mode or Survival ──────────
  ctx.textAlign = 'center';
  if (gameMode === 'vs') {
    for (let i = 0; i < 2; i++) { ctx.fillStyle = i < p1Wins ? f1.color : '#1e293b'; ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(W / 2 - 24 + i * 18, 20, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    for (let i = 0; i < 2; i++) { ctx.fillStyle = i < p2Wins ? f2.color : '#1e293b'; ctx.beginPath(); ctx.arc(W / 2 + 10 + i * 18, 20, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    ctx.font = 'bold 10px Segoe UI'; ctx.fillStyle = '#475569'; ctx.fillText('VS', W / 2, 24);
    if (gamePhase === 'fight') {
      const secs = Math.ceil(roundTimer / 60);
      ctx.font = `bold 20px Segoe UI`; ctx.fillStyle = secs <= 10 ? '#ef4444' : secs <= 20 ? '#f59e0b' : '#e2e8f0';
      if (secs <= 10) { ctx.shadowBlur = 12; ctx.shadowColor = '#ef4444'; }
      ctx.fillText(secs, W / 2, 56); ctx.shadowBlur = 0;
    }
  } else {
    ctx.font = '900 16px Segoe UI'; ctx.fillStyle = '#22c55e'; ctx.shadowBlur = 10; ctx.shadowColor = '#22c55e';
    ctx.fillText(`WAVE ${survivalWave}`, W / 2, 20); ctx.shadowBlur = 0;
    ctx.font = 'bold 12px Segoe UI'; ctx.fillStyle = '#94a3b8'; ctx.fillText(`Score: ${survivalScore}`, W / 2, 36);
    ctx.fillStyle = '#475569'; ctx.font = '10px Segoe UI'; ctx.fillText(`Best: Wave ${survivalHighScore}`, W / 2, 50);
    ctx.fillStyle = '#64748b'; ctx.fillText(`Enemies left: ${survivalEnemiesLeft}`, W / 2, 63);
  }

  // Cinematic bars during slow-mo
  if (slowMo) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 38); ctx.fillRect(0, H - 38, W, 38);
    ctx.font = 'bold 13px Segoe UI'; ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.textAlign = 'center'; ctx.fillText('K . O . ! ! !', W / 2, H - 14);
  }

  // Bottom label
  ctx.textAlign = 'center'; ctx.font = '9px Segoe UI'; ctx.fillStyle = '#334155';
  ctx.fillText(`${MAPS[mapIdx].name}  ·  ${gameMode === 'vs' ? (vsAI ? 'vs AI' : '2P') : 'SURVIVAL'}${chaosMode ? '  ·  CHAOS' : ''}`, W / 2, H - 3);
}

// ─────────────────────────────────────────────
// MODE SELECT SCREEN
// ─────────────────────────────────────────────
function drawModeSelect() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#050810'); g.addColorStop(1, '#0f0a1e');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (const l of bgLayers) for (const s of l.stars) { s.tw += 0.02; ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }

  ctx.save();
  ctx.font = '900 58px Segoe UI'; ctx.textAlign = 'center'; ctx.shadowBlur = 30; ctx.shadowColor = '#4f46e5';
  ctx.fillStyle = '#f1f5f9'; ctx.fillText('STICK BRAWL', W / 2, 100);
  ctx.font = 'bold 16px Segoe UI'; ctx.shadowBlur = 0; ctx.fillStyle = '#64748b';
  ctx.fillText('ULTIMATE EDITION v4', W / 2, 132);

  _drawModeCard(W / 2 - 320, 210, 280, 200, 'VS MODE',    '[V] or [1]', 'Battle a friend or AI\nBest of 3 Rounds',          '#4f46e5');
  _drawModeCard(W / 2 +  40, 210, 280, 200, 'SURVIVAL',   '[S] or [2]', 'Fight endless waves\nHow long can you last?',      '#22c55e');

  ctx.font = 'bold 13px Segoe UI'; ctx.fillStyle = '#475569';
  ctx.fillText(`Survival Best Wave: ${survivalHighScore}`, W / 2, H - 30);
  ctx.restore();
}

function _drawModeCard(x, y, w, h, title, keyHint, desc, color) {
  ctx.save();
  ctx.fillStyle = color + '18'; ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.shadowBlur = 16; ctx.shadowColor = color;
  rr(x, y, w, h, 14); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 12; ctx.font = '900 22px Segoe UI'; ctx.textAlign = 'center'; ctx.fillStyle = color;
  ctx.fillText(title, x + w / 2, y + 40);
  ctx.shadowBlur = 0; ctx.font = 'bold 13px Segoe UI'; ctx.fillStyle = '#475569';
  ctx.fillText(keyHint, x + w / 2, y + 66);
  ctx.font = '13px Segoe UI'; ctx.fillStyle = '#94a3b8';
  desc.split('\n').forEach((l, i) => ctx.fillText(l, x + w / 2, y + 100 + i * 22));
  ctx.restore();
}

// ─────────────────────────────────────────────
// CHARACTER SELECT SCREEN
// ─────────────────────────────────────────────
function drawCharSelect() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0f172a'); g.addColorStop(1, '#1e1b4b');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (const l of bgLayers) for (const s of l.stars) { ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }

  ctx.save();
  ctx.font = '900 38px Segoe UI'; ctx.textAlign = 'center'; ctx.shadowBlur = 20; ctx.shadowColor = '#4f46e5';
  ctx.fillStyle = '#f1f5f9'; ctx.fillText('SELECT FIGHTER', W / 2, 65); ctx.restore();

  const cw = 280, gap = 40, sx = (W - (cw * 3 + gap * 2)) / 2;
  CHARS.forEach((c, i) => {
    const cx = sx + i * (cw + gap), cy = 125;
    const p1s = p1CharIdx === i, p2s = p2CharIdx === i;
    ctx.save();
    ctx.fillStyle   = p1s || p2s ? c.color + '18' : 'rgba(15,23,42,.9)';
    ctx.strokeStyle = p1s || p2s ? c.color : '#334155';
    ctx.lineWidth   = p1s || p2s ? 3 : 1.5;
    ctx.shadowBlur  = p1s || p2s ? 20 : 0; ctx.shadowColor = c.color;
    rr(cx, cy, cw, 320, 14); ctx.fill(); ctx.stroke();

    ctx.font = '900 15px Segoe UI'; ctx.textAlign = 'center'; ctx.fillStyle = c.color; ctx.shadowBlur = 8; ctx.shadowColor = c.color;
    ctx.fillText(c.name, cx + cw / 2, cy + 28);

    _drawPreviewStick(cx + cw / 2, cy + 115, c, i);

    const statDefs = [['POWER', c.r.pow, '#ef4444'], ['SPEED', c.r.spd, '#22c55e'], ['MAGIC', c.r.mag, '#6366f1'], ['DEF', c.r.def, '#f59e0b']];
    statDefs.forEach(([l, v, col], si) => {
      const sy = cy + 215 + si * 22, bx = cx + 20;
      ctx.shadowBlur = 0; ctx.fillStyle = '#1e293b'; ctx.fillRect(bx, sy, cw - 40, 8);
      ctx.fillStyle = col; ctx.fillRect(bx, sy, (cw - 40) * (v / 5), 8);
      ctx.font = 'bold 9px Segoe UI'; ctx.fillStyle = '#64748b'; ctx.textAlign = 'left';  ctx.fillText(l, bx, sy - 2);
      ctx.textAlign = 'right'; ctx.fillStyle = col; ctx.fillText(v + '/5', cx + cw - 20, sy - 2);
    });

    ctx.font = '10px Segoe UI'; ctx.textAlign = 'center'; ctx.fillStyle = '#64748b'; ctx.shadowBlur = 0;
    ctx.fillText(c.desc, cx + cw / 2, cy + 310);

    if (p1s) { ctx.fillStyle = c.color; ctx.font = 'bold 11px Segoe UI'; ctx.shadowBlur = 8; ctx.shadowColor = c.color; ctx.fillText(p1Locked ? 'P1 READY' : 'P1', cx + cw / 2 - (gameMode === 'vs' ? 20 : 0), cy + 340); }
    if (p2s && gameMode === 'vs') { ctx.fillStyle = c.color; ctx.font = 'bold 11px Segoe UI'; ctx.fillText(p2Locked ? 'P2 READY' : 'P2', cx + cw / 2 + 20, cy + 340); }
    ctx.restore();
  });

  ctx.save(); ctx.font = 'bold 12px Segoe UI'; ctx.textAlign = 'center'; ctx.fillStyle = '#475569';
  ctx.fillText('P1: [A/D] browse  [W] lock in' + (gameMode === 'vs' ? '    P2: [←/→] browse  [↑] lock in' : ''), W / 2, H - 18);
  ctx.restore();
}

function _drawPreviewStick(cx, cy, c, idx) {
  ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = c.color;
  ctx.strokeStyle = c.color; ctx.lineWidth = 3; ctx.fillStyle = '#0f172a';
  ctx.beginPath(); ctx.arc(cx, cy - 30, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = c.accent;
  ctx.beginPath(); ctx.arc(cx + 4, cy - 33, 2.5, 0, Math.PI * 2); ctx.arc(cx + 9, cy - 33, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(cx, cy - 17); ctx.lineTo(cx, cy + 8); ctx.stroke();
  if (idx === 1) { // Brawler
    ctx.beginPath(); ctx.moveTo(cx, cy - 12); ctx.lineTo(cx + 22, cy - 22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - 12); ctx.lineTo(cx - 22, cy - 22); ctx.stroke();
    ctx.fillStyle = c.color; ctx.beginPath(); ctx.arc(cx + 24, cy - 22, 9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx - 24, cy - 22, 9, 0, Math.PI * 2); ctx.fill();
  } else if (idx === 2) { // Ninja
    ctx.beginPath(); ctx.moveTo(cx, cy - 12); ctx.lineTo(cx + 18, cy - 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - 12); ctx.lineTo(cx - 12, cy - 6); ctx.stroke();
    ctx.strokeStyle = c.color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx + 20, cy + 4); ctx.lineTo(cx + 28, cy - 20); ctx.stroke();
    ctx.fillStyle = c.color; ctx.beginPath(); ctx.arc(cx + 28, cy - 20, 6, 0, Math.PI * 2); ctx.fill();
  } else { // Mage
    ctx.beginPath(); ctx.moveTo(cx, cy - 8); ctx.lineTo(cx + 16, cy - 2); ctx.lineTo(cx + 20, cy + 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - 8); ctx.lineTo(cx - 10, cy - 2); ctx.lineTo(cx - 14, cy + 6); ctx.stroke();
    ctx.strokeStyle = c.color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx + 16, cy + 6); ctx.lineTo(cx + 24, cy - 18); ctx.stroke();
    ctx.fillStyle = c.color; ctx.beginPath(); ctx.arc(cx + 24, cy - 18, 6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(cx, cy + 8); ctx.lineTo(cx - 10, cy + 32); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy + 8); ctx.lineTo(cx + 10, cy + 32); ctx.stroke();
  ctx.restore();
}

// ─────────────────────────────────────────────
// VS GAME OVER — STATS SCREEN
// ─────────────────────────────────────────────
function drawGameOverStats() {
  ctx.save(); ctx.fillStyle = 'rgba(5,8,16,.88)'; ctx.fillRect(0, 0, W, H);
  const wn = p1Wins > p2Wins ? f1.name : f2.name;
  const wc = p1Wins > p2Wins ? f1.color : f2.color;
  ctx.font = '900 54px Segoe UI'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.strokeStyle = '#000'; ctx.lineWidth = 10; ctx.strokeText(wn + ' WINS!', W / 2, 30);
  ctx.shadowBlur = 30; ctx.shadowColor = wc; ctx.fillStyle = wc; ctx.fillText(wn + ' WINS!', W / 2, 30);

  const bx = W / 2 - 300, by = 110;
  ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(15,23,42,.95)'; ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.5;
  rr(bx, by, 600, 300, 12); ctx.fill(); ctx.stroke();

  ctx.font = 'bold 13px Segoe UI'; ctx.textAlign = 'center';
  ctx.fillStyle = f1.color; ctx.fillText(f1.name, bx + 150, by + 18);
  ctx.fillStyle = '#475569'; ctx.fillText('STATS', bx + 300, by + 18);
  ctx.fillStyle = f2.color; ctx.fillText(f2.name, bx + 450, by + 18);

  [['Damage Dealt','dmg'],['Hits Landed','hits'],['Spells Cast','spells'],['Max Combo','maxCombo'],['Dashes','dashes'],['Parries','parries']].forEach(([l, k], i) => {
    const ry = by + 50 + i * 38;
    ctx.font = '12px Segoe UI'; ctx.fillStyle = '#475569'; ctx.textAlign = 'center'; ctx.fillText(l, bx + 300, ry + 4);
    ctx.font = 'bold 20px Segoe UI';
    ctx.fillStyle = f1.color; ctx.fillText(totalStats.p1[k] + (k === 'maxCombo' ? 'x' : ''), bx + 120, ry + 6);
    ctx.fillStyle = f2.color; ctx.fillText(totalStats.p2[k] + (k === 'maxCombo' ? 'x' : ''), bx + 480, ry + 6);
  });
  ctx.font = 'bold 12px Segoe UI'; ctx.fillStyle = '#4f46e5'; ctx.fillText('[R] Play Again   [Esc] Menu', W / 2, by + 312);
  ctx.restore();
}

// ─────────────────────────────────────────────
// MEMBERSHIP FUNCTION GRAPHS  (fuzzyView = 2)
// Shows triangular / trapezoidal MF shapes for
// all 4 input variables. White dashed line marks
// the AI's current crisp input value each tick.
// ─────────────────────────────────────────────
function drawMFGraphs() {
  if (!f2 || !f2.isAI || !f2.fuzzyDebug) return;
  const d = f2.fuzzyDebug;

  const PX = 10, PY = 75, PW = 1080, PH = 535;
  ctx.save();
  ctx.fillStyle = 'rgba(5,8,20,0.95)';
  ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 1.5;
  rr(PX, PY, PW, PH, 12); ctx.fill(); ctx.stroke();

  ctx.font = '900 13px Segoe UI'; ctx.textAlign = 'center';
  ctx.fillStyle = '#a78bfa'; ctx.shadowBlur = 10; ctx.shadowColor = '#7c3aed';
  ctx.fillText('MEMBERSHIP FUNCTION GRAPHS  —  Fuzzy Input Variables', PX + PW / 2, PY + 22);
  ctx.shadowBlur = 0;

  const graphs = [
    {
      label: 'INPUT 1: DISTANCE  (0 – 700 px)',
      color: '#f59e0b', maxVal: 700, curVal: d.inputs.dist,
      curves: [
        { label: 'CLOSE',  color: '#60a5fa', fn: x => trapMF(x, 0,    0,    80,  200) },
        { label: 'MEDIUM', color: '#a3e635', fn: x => triMF (x, 80,   200,  350)       },
        { label: 'FAR',    color: '#f87171', fn: x => trapMF(x, 280,  400,  700, 700)  },
      ],
      xTickPos: [0, 1/7, 2/7, 3/7, 4/7, 5/7, 6/7, 1],
      xTickLabels: ['0', '100', '200', '300', '400', '500', '600', '700'],
    },
    {
      label: 'INPUT 2: HEALTH  (0 – 100 %)',
      color: '#22c55e', maxVal: 1, curVal: d.inputs.hp,
      curves: [
        { label: 'LOW',    color: '#f87171', fn: x => trapMF(x, 0,    0,    0.20, 0.35) },
        { label: 'MEDIUM', color: '#fbbf24', fn: x => triMF (x, 0.25, 0.50, 0.72)       },
        { label: 'HIGH',   color: '#4ade80', fn: x => trapMF(x, 0.60, 0.75, 1.0,  1.0)  },
      ],
      xTickPos: [0, 0.25, 0.5, 0.75, 1],
      xTickLabels: ['0%', '25%', '50%', '75%', '100%'],
    },
    {
      label: 'INPUT 3: MANA  (0 – 100 %)',
      color: '#6366f1', maxVal: 1, curVal: d.inputs.mana,
      curves: [
        { label: 'LOW',    color: '#f87171', fn: x => trapMF(x, 0,    0,    0.20, 0.35) },
        { label: 'MEDIUM', color: '#fbbf24', fn: x => triMF (x, 0.25, 0.50, 0.72)       },
        { label: 'HIGH',   color: '#818cf8', fn: x => trapMF(x, 0.60, 0.75, 1.0,  1.0)  },
      ],
      xTickPos: [0, 0.25, 0.5, 0.75, 1],
      xTickLabels: ['0%', '25%', '50%', '75%', '100%'],
    },
    {
      label: 'INPUT 4: THREAT  (0 – 100 %)',
      color: '#ef4444', maxVal: 1, curVal: d.inputs.threat,
      curves: [
        { label: 'NONE',     color: '#4ade80', fn: x => trapMF(x, 0,    0,    0.20, 0.40) },
        { label: 'MODERATE', color: '#fbbf24', fn: x => triMF (x, 0.30, 0.50, 0.70)       },
        { label: 'HIGH',     color: '#f87171', fn: x => trapMF(x, 0.55, 0.75, 1.0,  1.0)  },
      ],
      xTickPos: [0, 0.25, 0.5, 0.75, 1],
      xTickLabels: ['0%', '25%', '50%', '75%', '100%'],
    },
  ];

  // 2 × 2 grid
  const padX = 14, padY = 34, gapX = 12, gapY = 10;
  const gw = (PW - 2 * padX - gapX) / 2;
  const gh = (PH - padY - 26 - gapY) / 2;

  graphs.forEach((g, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    _drawOneMFGraph(
      PX + padX + col * (gw + gapX),
      PY + padY + row * (gh + gapY),
      gw, gh, g
    );
  });

  ctx.font = '9px Segoe UI'; ctx.textAlign = 'center'; ctx.fillStyle = '#334155';
  ctx.fillText('[P] cycle views  —  white dashed line = current AI crisp input value', PX + PW / 2, PY + PH - 8);
  ctx.restore();
}

function _drawOneMFGraph(gx, gy, gw, gh, g) {
  // Box background
  ctx.fillStyle = '#070c18'; ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 0.8;
  rr(gx, gy, gw, gh, 6); ctx.fill(); ctx.stroke();

  // Margins inside the box
  const ml = 34, mr = 10, mt = 22, mb = 30;
  const pw = gw - ml - mr;
  const ph = gh - mt - mb;
  const ox = gx + ml;       // plot origin x (left)
  const oy = gy + mt + ph;  // plot origin y (bottom baseline)

  // Title
  ctx.font = 'bold 9px Segoe UI'; ctx.textAlign = 'left';
  ctx.fillStyle = g.color; ctx.shadowBlur = 4; ctx.shadowColor = g.color;
  ctx.fillText(g.label, gx + 6, gy + 14);
  ctx.shadowBlur = 0;

  // Y-axis grid + labels (0%, 25%, 50%, 75%, 100%)
  ctx.setLineDash([2, 4]); ctx.lineWidth = 0.5;
  [0, 0.25, 0.5, 0.75, 1].forEach(v => {
    const py = oy - v * ph;
    ctx.strokeStyle = '#1e293b';
    ctx.beginPath(); ctx.moveTo(ox, py); ctx.lineTo(ox + pw, py); ctx.stroke();
    ctx.font = '7px Segoe UI'; ctx.fillStyle = '#475569'; ctx.textAlign = 'right';
    ctx.fillText((v * 100).toFixed(0) + '%', ox - 3, py + 3);
  });
  ctx.setLineDash([]);

  // Draw each MF curve
  for (const curve of g.curves) {
    ctx.strokeStyle = curve.color; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let p = 0; p <= pw; p++) {
      const crisp = (p / pw) * g.maxVal;
      const mu    = curve.fn(crisp);
      const x = ox + p, y = oy - mu * ph;
      p === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Axes
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(ox, gy + mt); ctx.lineTo(ox, oy);
  ctx.lineTo(ox + pw, oy);
  ctx.stroke();

  // Current-value needle (white dashed vertical line)
  const cvX = ox + Math.min(1, g.curVal / g.maxVal) * pw;
  ctx.strokeStyle = 'rgba(255,255,255,0.88)'; ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(cvX, gy + mt); ctx.lineTo(cvX, oy); ctx.stroke();
  ctx.setLineDash([]);
  const dispVal = g.maxVal > 1 ? Math.round(g.curVal) + 'px' : Math.round(g.curVal * 100) + '%';
  ctx.font = 'bold 8px Segoe UI'; ctx.textAlign = 'center';
  ctx.fillStyle = '#fff'; ctx.shadowBlur = 3; ctx.shadowColor = '#000';
  ctx.fillText(dispVal, cvX, gy + mt - 3);
  ctx.shadowBlur = 0;

  // X-axis ticks + labels
  ctx.font = '7px Segoe UI'; ctx.fillStyle = '#475569'; ctx.textAlign = 'center';
  g.xTickPos.forEach((pos, i) => {
    const x = ox + pos * pw;
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(x, oy); ctx.lineTo(x, oy + 3); ctx.stroke();
    ctx.fillText(g.xTickLabels[i], x, oy + 11);
  });

  // Legend (bottom of each graph)
  let lx = ox;
  for (const curve of g.curves) {
    ctx.fillStyle = curve.color;
    ctx.fillRect(lx, oy + 15, 14, 3);
    ctx.font = '7.5px Segoe UI'; ctx.fillStyle = curve.color; ctx.textAlign = 'left';
    ctx.fillText(curve.label, lx + 17, oy + 20);
    lx += ctx.measureText(curve.label).width + 30;
  }
}

// ─────────────────────────────────────────────
// FUZZY EXPERT SYSTEM MODEL DIAGRAM (fuzzyView = 3)
// Shows the full system architecture as a flow chart:
//   Knowledge Acquisition → Knowledge Base
//   Knowledge Base → Inference Engine
//   Crisp Inputs → Fuzzify → Infer → Aggregate → Defuzzify → Action
// ─────────────────────────────────────────────
function drawSystemDiagram() {
  if (!f2 || !f2.isAI || !f2.fuzzyDebug) return;
  const d = f2.fuzzyDebug;

  const PX = 200, PY = 45, PW = 700, PH = 535;
  ctx.save();
  ctx.fillStyle = 'rgba(5,8,20,0.96)';
  ctx.strokeStyle = '#10b981'; ctx.lineWidth = 1.5;
  rr(PX, PY, PW, PH, 12); ctx.fill(); ctx.stroke();

  ctx.font = '900 13px Segoe UI'; ctx.textAlign = 'center';
  ctx.fillStyle = '#34d399'; ctx.shadowBlur = 10; ctx.shadowColor = '#10b981';
  ctx.fillText('FUZZY EXPERT SYSTEM MODEL', PX + PW / 2, PY + 22);
  ctx.shadowBlur = 0;

  const actionCol = d.action === 'defend' ? '#3b82f6'
                  : d.action === 'harass' ? '#f59e0b' : '#ef4444';

  // ── Main vertical flow (centre column) ───
  const bw = 300, bh = 50, gap = 14;
  const cx = PX + PW / 2;
  const startY = PY + 36;

  const boxes = [
    {
      label: 'CRISP INPUTS  (Game State)',
      sub:   `dist=${d.inputs.dist.toFixed(0)}px    hp=${(d.inputs.hp*100).toFixed(0)}%    mana=${(d.inputs.mana*100).toFixed(0)}%    threat=${(d.inputs.threat*100).toFixed(0)}%`,
      col:   '#64748b',
    },
    {
      label: 'FUZZIFICATION',
      sub:   'triMF() & trapMF()  —  Convert crisp values to fuzzy membership degrees',
      col:   '#6366f1',
    },
    {
      label: 'FUZZY INFERENCE ENGINE',
      sub:   `Evaluate ${FUZZY_RULES.length} rules  •  MIN for AND  •  ${d.fired.length} rules fired this tick`,
      col:   '#0ea5e9',
    },
    {
      label: 'AGGREGATION',
      sub:   'Combine all fired rule outputs into a single fuzzy set',
      col:   '#10b981',
    },
    {
      label: 'DEFUZZIFICATION  (Centre of Gravity)',
      sub:   `COG = Σ(wᵢ × outᵢ) / Σwᵢ   =   ${d.value.toFixed(2)} / 100`,
      col:   '#f59e0b',
    },
    {
      label: `CRISP OUTPUT  →  ACTION: ${d.action.toUpperCase()}`,
      sub:   '0–33 = DEFEND     34–66 = HARASS     67–100 = MELEE',
      col:   actionCol,
    },
  ];

  boxes.forEach((box, i) => {
    const bx = cx - bw / 2;
    const by = startY + i * (bh + gap);

    // Downward arrow from previous box
    if (i > 0) {
      const arTopY = by - gap;
      const arBotY = by - 3;
      const arMidY = (arTopY + arBotY) / 2;
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx, arTopY + 3); ctx.lineTo(cx, arBotY - 5); ctx.stroke();
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.moveTo(cx, arBotY); ctx.lineTo(cx - 5, arBotY - 8); ctx.lineTo(cx + 5, arBotY - 8);
      ctx.closePath(); ctx.fill();
    }

    const isLast = i === boxes.length - 1;
    ctx.fillStyle = box.col + (isLast ? '30' : '18');
    ctx.strokeStyle = box.col; ctx.lineWidth = isLast ? 2.5 : 1;
    ctx.shadowBlur = isLast ? 14 : 0; ctx.shadowColor = box.col;
    rr(bx, by, bw, bh, 8); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.font = '900 10px Segoe UI'; ctx.textAlign = 'center'; ctx.fillStyle = box.col;
    ctx.fillText(box.label, cx, by + 16);
    ctx.font = '8px Segoe UI'; ctx.fillStyle = '#94a3b8';
    ctx.fillText(box.sub, cx, by + 32);
  });

  // ── Knowledge Acquisition box (left top) ─
  const kaX = PX + 14, kaY = startY, kaW = 150, kaH = 72;
  ctx.fillStyle = '#0ea5e918'; ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 1;
  rr(kaX, kaY, kaW, kaH, 8); ctx.fill(); ctx.stroke();
  ctx.font = '900 9px Segoe UI'; ctx.textAlign = 'center'; ctx.fillStyle = '#38bdf8';
  ctx.fillText('KNOWLEDGE', kaX + kaW / 2, kaY + 15);
  ctx.fillText('ACQUISITION', kaX + kaW / 2, kaY + 27);
  ctx.font = '8px Segoe UI'; ctx.fillStyle = '#64748b'; ctx.textAlign = 'left';
  ['• Game design analysis', '• Expert AI rules', '• Rule testing'].forEach((ln, i) => {
    ctx.fillText(ln, kaX + 8, kaY + 42 + i * 12);
  });

  // ── Knowledge Base box (left, below KA) ──
  const kbX = kaX, kbY = kaY + kaH + 12, kbW = 150, kbH = 118;
  ctx.fillStyle = '#7c3aed18'; ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 1;
  rr(kbX, kbY, kbW, kbH, 8); ctx.fill(); ctx.stroke();
  ctx.font = '900 9px Segoe UI'; ctx.textAlign = 'center'; ctx.fillStyle = '#a78bfa';
  ctx.fillText('KNOWLEDGE BASE', kbX + kbW / 2, kbY + 15);
  ctx.font = '8px Segoe UI'; ctx.fillStyle = '#64748b'; ctx.textAlign = 'left';
  ['• 10 Fuzzy IF-THEN Rules', '• 4 Input variables', '• 3 MF terms each', '• triMF + trapMF shapes', '• Output scale: 0–100'].forEach((ln, i) => {
    ctx.fillText(ln, kbX + 8, kbY + 30 + i * 16);
  });

  // ── Arrow: KA → KB (vertical down) ───────
  const kaCx = kaX + kaW / 2;
  ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 1.2; ctx.setLineDash([4, 3]);
  ctx.beginPath(); ctx.moveTo(kaCx, kaY + kaH); ctx.lineTo(kaCx, kbY - 3); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#0ea5e9';
  ctx.beginPath(); ctx.moveTo(kaCx, kbY); ctx.lineTo(kaCx - 4, kbY - 8); ctx.lineTo(kaCx + 4, kbY - 8); ctx.closePath(); ctx.fill();

  // ── Arrow: KB → Inference Engine (L-shape right) ─
  const infBoxIdx = 2;
  const infBy = startY + infBoxIdx * (bh + gap);
  const infCy  = infBy + bh / 2;
  const kbCy   = kbY + kbH / 2;
  const kbRight = kbX + kbW;
  const infLeft = cx - bw / 2;
  const midX   = (kbRight + infLeft) / 2;

  ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 1.2; ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(kbRight, kbCy);
  ctx.lineTo(midX,    kbCy);
  ctx.lineTo(midX,    infCy);
  ctx.lineTo(infLeft, infCy);
  ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#7c3aed';
  ctx.beginPath(); ctx.moveTo(infLeft + 1, infCy); ctx.lineTo(infLeft - 6, infCy - 4); ctx.lineTo(infLeft - 6, infCy + 4); ctx.closePath(); ctx.fill();

  // ── KB label on the arrow ─────────────────
  ctx.font = 'bold 7px Segoe UI'; ctx.textAlign = 'center'; ctx.fillStyle = '#7c3aed';
  ctx.fillText('rules + MF', midX, kbCy - 4);

  // ── Footer ────────────────────────────────
  ctx.font = '9px Segoe UI'; ctx.textAlign = 'center'; ctx.fillStyle = '#334155';
  ctx.fillText('[P] cycle views', PX + PW / 2, PY + PH - 10);
  ctx.restore();
}

// ── Sidebar: MF Graphs ────────────────────────
function _drawMFSidebar(sc, SW, SH, d) {
  sc.clearRect(0, 0, SW, SH);

  sc.font = '900 9px Segoe UI'; sc.textAlign = 'center';
  sc.fillStyle = '#a78bfa'; sc.shadowBlur = 6; sc.shadowColor = '#7c3aed';
  sc.fillText('MEMBERSHIP FUNCTION GRAPHS', SW / 2, 13);
  sc.shadowBlur = 0;

  const graphs = [
    {
      label: 'DISTANCE  (0–700px)', col: '#f59e0b', maxVal: 700, curVal: d.inputs.dist,
      curves: [
        { lbl: 'CLOSE',  col: '#60a5fa', fn: x => trapMF(x, 0, 0, 80, 200) },
        { lbl: 'MEDIUM', col: '#a3e635', fn: x => triMF(x, 80, 200, 350) },
        { lbl: 'FAR',    col: '#f87171', fn: x => trapMF(x, 280, 400, 700, 700) },
      ],
    },
    {
      label: 'HEALTH  (0–100%)', col: '#22c55e', maxVal: 1, curVal: d.inputs.hp,
      curves: [
        { lbl: 'LOW',    col: '#f87171', fn: x => trapMF(x, 0, 0, .20, .35) },
        { lbl: 'MEDIUM', col: '#fbbf24', fn: x => triMF(x, .25, .50, .72) },
        { lbl: 'HIGH',   col: '#4ade80', fn: x => trapMF(x, .60, .75, 1, 1) },
      ],
    },
    {
      label: 'MANA  (0–100%)', col: '#818cf8', maxVal: 1, curVal: d.inputs.mana,
      curves: [
        { lbl: 'LOW',    col: '#f87171', fn: x => trapMF(x, 0, 0, .20, .35) },
        { lbl: 'MEDIUM', col: '#fbbf24', fn: x => triMF(x, .25, .50, .72) },
        { lbl: 'HIGH',   col: '#818cf8', fn: x => trapMF(x, .60, .75, 1, 1) },
      ],
    },
    {
      label: 'THREAT  (0–100%)', col: '#ef4444', maxVal: 1, curVal: d.inputs.threat,
      curves: [
        { lbl: 'NONE',     col: '#4ade80', fn: x => trapMF(x, 0, 0, .20, .40) },
        { lbl: 'MODERATE', col: '#fbbf24', fn: x => triMF(x, .30, .50, .70) },
        { lbl: 'HIGH',     col: '#f87171', fn: x => trapMF(x, .55, .75, 1, 1) },
      ],
    },
  ];

  const topPad = 18, graphH = Math.floor((SH - topPad - 4) / 4);
  graphs.forEach((g, i) => {
    _drawMFGraphSB(sc, 4, topPad + i * graphH, SW - 8, graphH - 3, g);
  });
}

function _drawMFGraphSB(sc, gx, gy, gw, gh, g) {
  sc.fillStyle = '#07111e'; sc.strokeStyle = '#1e293b'; sc.lineWidth = 0.7;
  sc.beginPath(); sc.rect(gx, gy, gw, gh); sc.fill(); sc.stroke();

  const ml = 6, mr = 6, mt = 13, mb = 16;
  const pw = gw - ml - mr, ph = gh - mt - mb;
  const ox = gx + ml, oy = gy + mt + ph;

  sc.font = 'bold 7px Segoe UI'; sc.textAlign = 'left'; sc.fillStyle = g.col;
  sc.fillText(g.label, gx + ml, gy + 9);

  sc.strokeStyle = '#1e293b'; sc.lineWidth = 0.6;
  sc.beginPath(); sc.moveTo(ox, oy); sc.lineTo(ox + pw, oy); sc.stroke();
  sc.beginPath(); sc.moveTo(ox, gy + mt); sc.lineTo(ox, oy); sc.stroke();

  for (const curve of g.curves) {
    sc.strokeStyle = curve.col; sc.lineWidth = 1.5; sc.beginPath();
    for (let px = 0; px <= pw; px++) {
      const y = curve.fn((px / pw) * g.maxVal);
      const sx = ox + px, sy = oy - y * ph;
      px === 0 ? sc.moveTo(sx, sy) : sc.lineTo(sx, sy);
    }
    sc.stroke();
  }

  const markerX = ox + Math.min(1, g.curVal / g.maxVal) * pw;
  sc.strokeStyle = 'rgba(255,255,255,.5)'; sc.lineWidth = 1; sc.setLineDash([2, 3]);
  sc.beginPath(); sc.moveTo(markerX, gy + mt); sc.lineTo(markerX, oy); sc.stroke();
  sc.setLineDash([]);

  let lx = ox;
  for (const curve of g.curves) {
    sc.fillStyle = curve.col; sc.fillRect(lx, oy + 4, 10, 3);
    sc.font = '6px Segoe UI'; sc.textAlign = 'left'; sc.fillStyle = '#64748b';
    sc.fillText(curve.lbl, lx + 12, oy + 10);
    lx += 12 + sc.measureText(curve.lbl).width + 7;
  }
}

// ── Sidebar: System Diagram ───────────────────
function _drawSystemSidebar(sc, SW, SH, d) {
  sc.clearRect(0, 0, SW, SH);

  const actionCol = d.action === 'defend' ? '#3b82f6' : d.action === 'harass' ? '#f59e0b' : '#ef4444';

  sc.font = '900 9px Segoe UI'; sc.textAlign = 'center';
  sc.fillStyle = '#34d399'; sc.shadowBlur = 6; sc.shadowColor = '#10b981';
  sc.fillText('FUZZY EXPERT SYSTEM MODEL', SW / 2, 14);
  sc.shadowBlur = 0;

  const ruleCount = typeof FUZZY_RULES !== 'undefined' ? FUZZY_RULES.length : '?';
  const boxes = [
    { label: 'CRISP INPUTS  (Game State)',
      sub:   `dist=${d.inputs.dist.toFixed(0)}px  hp=${(d.inputs.hp*100).toFixed(0)}%  mana=${(d.inputs.mana*100).toFixed(0)}%  threat=${(d.inputs.threat*100).toFixed(0)}%`,
      col:   '#64748b' },
    { label: 'FUZZIFICATION',
      sub:   'triMF() & trapMF()  —  convert crisp values → degrees',
      col:   '#6366f1' },
    { label: 'FUZZY INFERENCE ENGINE',
      sub:   `Evaluate ${ruleCount} rules  ·  MIN for AND  ·  ${d.fired.length} rules fired`,
      col:   '#0ea5e9' },
    { label: 'AGGREGATION',
      sub:   'Combine all fired rule outputs into fuzzy set',
      col:   '#10b981' },
    { label: 'DEFUZZIFICATION  (Centre of Gravity)',
      sub:   `COG = Σ(wᵢ × outᵢ) / Σwᵢ   =   ${d.value.toFixed(2)}`,
      col:   '#f59e0b' },
    { label: `CRISP OUTPUT  →  ACTION: ${d.action.toUpperCase()}`,
      sub:   '0–33 = DEFEND     34–66 = HARASS     67–100 = MELEE',
      col:   actionCol },
  ];

  const bw = SW - 26, bh = 40, gap = 9;
  const cx = SW / 2;
  const totalH = boxes.length * (bh + gap) - gap;
  const startY = Math.max(22, Math.round((SH - totalH) / 2));

  boxes.forEach((box, i) => {
    const bx = (SW - bw) / 2;
    const by = startY + i * (bh + gap);

    if (i > 0) {
      sc.strokeStyle = '#475569'; sc.lineWidth = 1.2;
      sc.beginPath(); sc.moveTo(cx, by - gap + 1); sc.lineTo(cx, by - 5); sc.stroke();
      sc.fillStyle = '#475569';
      sc.beginPath(); sc.moveTo(cx, by - 1); sc.lineTo(cx - 4, by - 8); sc.lineTo(cx + 4, by - 8); sc.closePath(); sc.fill();
    }

    const isLast = i === boxes.length - 1;
    sc.fillStyle = box.col + (isLast ? '2e' : '18');
    sc.strokeStyle = box.col; sc.lineWidth = isLast ? 2 : 1;
    if (isLast) { sc.shadowBlur = 12; sc.shadowColor = box.col; }
    sc.beginPath(); sc.rect(bx, by, bw, bh); sc.fill(); sc.stroke();
    sc.shadowBlur = 0;

    sc.font = '900 9px Segoe UI'; sc.textAlign = 'center'; sc.fillStyle = box.col;
    sc.fillText(box.label, cx, by + 15);
    sc.font = '7px Segoe UI'; sc.fillStyle = '#64748b';
    sc.fillText(box.sub, cx, by + 30);
  });

  sc.font = '8px Segoe UI'; sc.textAlign = 'center'; sc.fillStyle = '#1e293b';
  sc.fillText('[P] cycle views', cx, SH - 5);
}

function updateFuzzyPanel() {
  if (!f2 || !f2.isAI || !f2.fuzzyDebug) return;
  const d = f2.fuzzyDebug;

  // Badge always visible regardless of view
  const badge = document.getElementById('fpBadge');
  if (badge) {
    const aMap = { defend:['DEFEND','#3b82f6'], harass:['HARASS','#f59e0b'], melee:['MELEE','#ef4444'] };
    const [txt, col] = aMap[d.action] || ['–','#64748b'];
    badge.textContent = txt; badge.style.color = col; badge.style.boxShadow = `0 0 10px ${col}55`;
  }

  const inner   = document.getElementById('fpInner');
  const fpCv    = document.getElementById('fpCanvas');

  // Chart views (2 = MF Graphs, 3 = System Diagram) draw into sidebar canvas
  if (fuzzyView !== 1) {
    if (inner) inner.classList.add('view-chart');
    if (fpCv) {
      const sc = fpCv.getContext('2d');
      if (fuzzyView === 2) _drawMFSidebar(sc, fpCv.width, fpCv.height, d);
      else if (fuzzyView === 3) _drawSystemSidebar(sc, fpCv.width, fpCv.height, d);
    }
    return;
  }

  // Brain view (1): update all DOM elements
  if (inner) inner.classList.remove('view-chart');

  const setBar = (bId, vId, pct, txt) => {
    const b = document.getElementById(bId), v = document.getElementById(vId);
    if (b) b.style.width = (Math.min(1, Math.max(0, pct)) * 100).toFixed(1) + '%';
    if (v) v.textContent = txt;
  };

  const needle = document.getElementById('fpNeedle');
  if (needle) needle.style.left = Math.min(100, Math.max(0, d.value)) + '%';
  const cogNum = document.getElementById('fpCOGNum');
  if (cogNum) {
    const aCol = d.action === 'defend' ? '#3b82f6' : d.action === 'harass' ? '#f59e0b' : '#ef4444';
    cogNum.textContent = `COG = ${d.value.toFixed(1)}`; cogNum.style.color = aCol;
  }

  setBar('bIDist',   'vIDist',   d.inputs.dist / 700,  d.inputs.dist.toFixed(0) + 'px');
  setBar('bIHP',     'vIHP',     d.inputs.hp,           (d.inputs.hp * 100).toFixed(0) + '%');
  setBar('bIMana',   'vIMana',   d.inputs.mana,         (d.inputs.mana * 100).toFixed(0) + '%');
  setBar('bIThreat', 'vIThreat', d.inputs.threat,       (d.inputs.threat * 100).toFixed(0) + '%');

  const setMF = (bId, vId, val) => setBar(bId, vId, val, val.toFixed(2));
  setMF('mDC','vDC',d.fuzz.dist.close);   setMF('mDM','vDM',d.fuzz.dist.medium); setMF('mDF','vDF',d.fuzz.dist.far);
  setMF('mHL','vHL',d.fuzz.hp.low);       setMF('mHM','vHM',d.fuzz.hp.medium);   setMF('mHH','vHH',d.fuzz.hp.high);
  setMF('mML','vML',d.fuzz.mana.low);     setMF('mMM','vMM',d.fuzz.mana.medium); setMF('mMH','vMH',d.fuzz.mana.high);
  setMF('mTN','vTN',d.fuzz.threat.none);  setMF('mTM','vTM',d.fuzz.threat.moderate); setMF('mTH','vTH',d.fuzz.threat.high);

  const rcEl = document.getElementById('fpRC');
  if (rcEl) rcEl.textContent = d.fired.length;
  const rulesEl = document.getElementById('fpRules');
  if (rulesEl) {
    const maxW = d.fired.reduce((m, r) => Math.max(m, r.w), 0.001);
    rulesEl.innerHTML = d.fired.length === 0
      ? '<div style="font-size:9px;color:#334155;padding:4px 2px">No rules fired this tick.</div>'
      : d.fired.map(r => {
          const col = r.out < 33 ? '#3b82f6' : r.out < 67 ? '#f59e0b' : '#ef4444';
          const pct = Math.round(r.w / maxW * 100);
          return `<div class="fp-rule" style="border-left-color:${col}"><div class="fp-rb"><div class="fp-rbf" style="width:${pct}%;background:${col}"></div></div><span class="fp-rw" style="color:${col}">${r.w.toFixed(3)}</span><span class="fp-rl">${r.label}</span></div>`;
        }).join('');
  }
}

// ─────────────────────────────────────────────
// FUZZY LOGIC DEBUG PANEL
// Press [P] in-game to toggle. Shows:
//   • Crisp inputs + membership degrees
//   • Mini membership-function graphs
//   • Fired rules + weights
//   • Defuzzified output + current action
// ─────────────────────────────────────────────
function drawFuzzyPanel() {
  updateFuzzyPanel();
}

// ─────────────────────────────────────────────
// SURVIVAL GAME OVER SCREEN
// ─────────────────────────────────────────────
function drawSurvivalOver() {
  ctx.save(); ctx.fillStyle = 'rgba(5,8,16,.9)'; ctx.fillRect(0, 0, W, H);
  ctx.font = '900 60px Segoe UI'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.strokeStyle = '#000'; ctx.lineWidth = 10; ctx.strokeText('GAME OVER', W / 2, 40);
  ctx.shadowBlur = 30; ctx.shadowColor = '#ef4444'; ctx.fillStyle = '#ef4444'; ctx.fillText('GAME OVER', W / 2, 40);

  const bx = W / 2 - 220, by = 130;
  ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(15,23,42,.95)'; ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.5;
  rr(bx, by, 440, 240, 12); ctx.fill(); ctx.stroke();

  [
    ['Waves Survived', survivalWave],
    ['Total Score',    survivalScore],
    ['Damage Dealt',   totalStats.p1.dmg],
    ['Max Combo',      totalStats.p1.maxCombo + 'x'],
    ['Spells Cast',    totalStats.p1.spells],
  ].forEach(([l, v], i) => {
    const ry = by + 30 + i * 40;
    ctx.font = '13px Segoe UI'; ctx.fillStyle = '#64748b'; ctx.textAlign = 'left';  ctx.fillText(l, bx + 30, ry);
    ctx.font = 'bold 18px Segoe UI'; ctx.fillStyle = '#22c55e'; ctx.textAlign = 'right'; ctx.fillText(v, bx + 410, ry);
  });

  const isNew = survivalWave >= survivalHighScore;
  ctx.font = 'bold 14px Segoe UI'; ctx.textAlign = 'center';
  ctx.fillStyle = isNew ? '#fbbf24' : '#475569';
  ctx.fillText(isNew ? `NEW RECORD!  Best Wave: ${survivalWave}` : `Best Wave: ${survivalHighScore}`, W / 2, by + 228);
  ctx.font = 'bold 12px Segoe UI'; ctx.fillStyle = '#4f46e5';
  ctx.fillText('[R] Try Again   [Esc] Menu', W / 2, by + 255);
  ctx.restore();
}
