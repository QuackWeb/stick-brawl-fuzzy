// ─────────────────────────────────────────────
// MAP SETUP
// ─────────────────────────────────────────────
function loadMap() {
  const m = MAPS[mapIdx];
  activeBlocks = m.blocks.map(b => ({ x: b.x, y: b.y, width: b.w, height: b.h, color: b.c, destructible: false }));
  movingPlats  = m.moving.map(p => ({
    x: p.x, y: p.y, w: p.w, h: p.h || 16, color: p.c,
    dx: p.dx || 0, dy: p.dy || 0,
    minX: p.minX ?? 0, maxX: p.maxX ?? W,
    minY: p.minY ?? 0, maxY: p.maxY ?? H,
    ldx: 0, ldy: 0,
  }));
}

// ─────────────────────────────────────────────
// MOVING PLATFORMS
// ─────────────────────────────────────────────
function updateMovingPlats() {
  for (const p of movingPlats) {
    p.ldx = p.dx; p.ldy = p.dy;
    p.x  += p.dx; p.y  += p.dy;
    if (p.dx && (p.x < p.minX || p.x + p.w > p.maxX)) { p.dx *= -1; p.x = Math.max(p.minX, Math.min(p.maxX - p.w, p.x)); }
    if (p.dy && (p.y < p.minY || p.y + p.h > p.maxY)) { p.dy *= -1; p.y = Math.max(p.minY, Math.min(p.maxY - p.h, p.y)); }
  }
}

/** Carry a fighter along with the platform they're standing on */
function carryPlats(f) {
  for (const p of movingPlats) {
    if (Math.abs(f.y + f.h - p.y) < 6 && f.x + f.w > p.x && f.x < p.x + p.w) {
      f.x = Math.max(0, Math.min(W - f.w, f.x + p.ldx));
      f.y += p.ldy;
    }
  }
}

// ─────────────────────────────────────────────
// NEON ARENA — Cyberpunk map renderer (map 0)
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// STORM PEAK — Thunder-storm map renderer (map 1)
// ─────────────────────────────────────────────

/* Storm state (lazy-init on first frame) */
let _rainDrops   = null;
let _stormClouds = null;
let _windParts   = null;
/* Lightning bolt */
let _boltPath = [], _boltPhase = 'idle';
let _boltX = -1, _boltTimer = 0, _boltFlash = 0, _lastBoltT = -12;
const _BOLT_INTERVAL = 7;   // seconds between strikes

function _initStorm() {
  _rainDrops = Array.from({length:170}, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    len: 9 + Math.random() * 14,
    spd: 7 + Math.random() * 5,
    a:   0.16 + Math.random() * 0.24,
  }));
  _stormClouds = Array.from({length:11}, (_, i) => ({
    x:    i * 130 + Math.random() * 55,
    y:    Math.random() * window.innerHeight * 0.48 + window.innerHeight * 0.03,
    w:    155 + Math.random() * 135,
    h:    48  + Math.random() * 38,
    spd:  0.12 + Math.random() * 0.24,
    dark: 0.4  + Math.random() * 0.45,
  }));
  _windParts = Array.from({length:50}, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight * 0.88 + window.innerHeight * 0.04,
    spd: 2.5 + Math.random() * 3.5,
    a:   0.06 + Math.random() * 0.09,
    r:   Math.random() * 1.4 + 0.3,
  }));
}

function _genBoltPath(bx) {
  _boltPath = [{x: bx, y: 0}];
  let px = bx, py = 0;
  while (py < H + 10) {
    px += (Math.random() - 0.5) * 48;
    py += 22 + Math.random() * 22;
    _boltPath.push({x: px, y: py});
    /* occasional branch */
    if (Math.random() < 0.3) {
      const brLen = 2 + Math.floor(Math.random() * 3);
      let bpx = px, bpy = py;
      for (let b = 0; b < brLen; b++) {
        bpx += (Math.random() - 0.5) * 35;
        bpy += 18 + Math.random() * 16;
        _boltPath.push({x: bpx, y: bpy});
      }
      _boltPath.push({x: px, y: py}); // return to main path
    }
  }
}

function _drawBoltPath(alpha) {
  if (_boltPath.length < 2 || alpha <= 0.01) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  /* outer glow */
  ctx.strokeStyle = '#7ec8e3'; ctx.lineWidth = 7;
  ctx.shadowBlur = 30; ctx.shadowColor = '#aaddff';
  ctx.beginPath(); ctx.moveTo(_boltPath[0].x, _boltPath[0].y);
  _boltPath.forEach(p => ctx.lineTo(p.x, p.y)); ctx.stroke();
  /* core white */
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.moveTo(_boltPath[0].x, _boltPath[0].y);
  _boltPath.forEach(p => ctx.lineTo(p.x, p.y)); ctx.stroke();
  ctx.shadowBlur = 0; ctx.restore();
}

function _drawCloudPlatform(b, t) {
  const numC = Math.floor(b.width / 22) + 1;
  const spc  = b.width / numC;
  const baseR = 16, topR = 11;
  const botY  = b.y + 12;   // bottom circle centre
  const topY  = b.y - 2;    // top circle centre

  ctx.save();
  /* undercloud glow */
  const ug = ctx.createRadialGradient(b.x + b.width/2, b.y + b.height + 18, 0,
                                       b.x + b.width/2, b.y + b.height + 18, b.width * 0.55);
  ug.addColorStop(0, 'rgba(180,210,255,0.18)'); ug.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = ug; ctx.fillRect(b.x - 18, b.y + b.height, b.width + 36, 38);

  /* bottom cloud circles */
  ctx.fillStyle = b.color || '#d1d5db';
  ctx.shadowBlur = 22; ctx.shadowColor = 'rgba(210,230,255,0.8)';
  for (let i = 0; i <= numC; i++) {
    ctx.beginPath(); ctx.arc(b.x + i * spc, botY, baseR, 0, Math.PI*2); ctx.fill();
  }
  /* top puffs */
  ctx.fillStyle = '#e8ecf0'; ctx.shadowBlur = 12;
  for (let i = 0; i < numC; i++) {
    ctx.beginPath(); ctx.arc(b.x + (i + 0.5) * spc, topY, topR, 0, Math.PI*2); ctx.fill();
  }
  ctx.shadowBlur = 0; ctx.restore();
}

function _drawMovingCloudPlat(p, t) {
  /* trail */
  const dir = (p.ldx || 0) > 0 ? -1 : 1;
  const spd = Math.abs(p.ldx || 0);
  if (spd > 0.05) {
    for (let i = 1; i <= 5; i++) {
      const ta = (1 - i/5) * 0.18;
      ctx.save(); ctx.globalAlpha = ta;
      ctx.fillStyle = '#94a3b8'; ctx.shadowBlur = 6; ctx.shadowColor = '#94a3b8';
      ctx.fillRect(p.x + dir * i * spd * 5, p.y, p.w, p.h);
      ctx.restore();
    }
  }
  /* draw as cloud */
  _drawCloudPlatform({x:p.x, y:p.y, width:p.w, height:p.h, color:p.color}, t);
}

function drawStormPeak() {
  if (!_rainDrops) _initStorm();
  const t = Date.now() * 0.001;

  /* ── Very dark stormy sky ─────────────────── */
  const flashA = _boltPhase === 'strike' ? _boltFlash * 0.45 : 0;
  const skyCol0 = flashA > 0 ? `rgba(${Math.round(4+flashA*60)},${Math.round(4+flashA*70)},${Math.round(12+flashA*80)},1)` : '#04040c';
  const skyCol1 = flashA > 0 ? `rgba(${Math.round(6+flashA*50)},${Math.round(8+flashA*60)},${Math.round(18+flashA*70)},1)` : '#060812';
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, skyCol0); sky.addColorStop(1, skyCol1);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

  /* ── Moving storm clouds ──────────────────── */
  _stormClouds.forEach(c => {
    c.x -= c.spd;
    if (c.x + c.w < -60) c.x = W + 60;
    ctx.save(); ctx.globalAlpha = c.dark * 0.72;
    const cg = ctx.createRadialGradient(c.x+c.w/2, c.y+c.h/2, 0, c.x+c.w/2, c.y+c.h/2, c.w/2);
    cg.addColorStop(0, '#14141e'); cg.addColorStop(1, 'rgba(8,8,14,0)');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.ellipse(c.x+c.w/2, c.y+c.h/2, c.w/2, c.h/2, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  });

  /* ── Rain ─────────────────────────────────── */
  ctx.save(); ctx.strokeStyle = 'rgba(170,210,240,0.22)'; ctx.lineWidth = 1;
  _rainDrops.forEach(r => {
    r.x += 1.6; r.y += r.spd;
    if (r.y > H + 20) { r.y = -20; r.x = Math.random() * W; }
    if (r.x > W + 20) { r.x = -20; }
    ctx.save(); ctx.globalAlpha = r.a;
    ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x + 1.4, r.y + r.len); ctx.stroke();
    ctx.restore();
  });
  ctx.restore();

  /* ── Lightning bolt logic ─────────────────── */
  /* Chaos shortens lightning interval */
  const _bInt = (chaosMode && mapIdx === 1) ? 3 : _BOLT_INTERVAL;
  if (_boltPhase === 'idle' && t - _lastBoltT > _bInt) {
    _boltX = W * (0.18 + Math.random() * 0.64);
    _boltPhase = 'warning'; _boltTimer = 0;
    _genBoltPath(_boltX);
  }
  if (_boltPhase === 'warning') {
    _boltTimer += 1/60;
    /* flickering warning column (brighter in chaos) */
    const warnA = (chaosMode && mapIdx===1) ? 0.15 : 0.08;
    if (Math.sin(_boltTimer * 40) > 0) {
      ctx.save(); ctx.globalAlpha = warnA;
      ctx.fillStyle = '#ffffaa';
      ctx.fillRect(_boltX - 4, 0, 8, H);
      ctx.restore();
    }
    if (_boltTimer > 0.85) {
      _boltPhase = 'strike'; _boltTimer = 0; _boltFlash = 1;
      if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 10);
      /* Chaos lightning damage — fires at the exact strike moment */
      if (chaosMode && mapIdx === 1) {
        [f1, f2].forEach(f => {
          if (!f || f.dead) return;
          if (Math.abs(f.x + f.w/2 - _boltX) < 42) {
            f.takeHit({dmg:22, stun:32, knock:4, type:'thunder', status:'shock', statusDur:200}, null, '#7ec8e3');
            burst(f.x+f.w/2, f.y+f.h/2, '#7ec8e3', 12, 6, 28);
            if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 14);
          }
        });
      }
    }
  }
  if (_boltPhase === 'strike') {
    _boltTimer += 1/60;
    _boltFlash = Math.max(0, _boltFlash - 0.06);
    /* draw bolt while flash still strong */
    if (_boltFlash > 0.05) _drawBoltPath(_boltFlash);
    if (_boltTimer > 0.55) { _boltPhase = 'idle'; _lastBoltT = t; _boltPath = []; }
  }

  /* ── Wind particles ───────────────────────── */
  ctx.save();
  _windParts.forEach(p => {
    p.x += p.spd; if (p.x > W + 10) p.x = -10;
    ctx.save(); ctx.globalAlpha = p.a;
    ctx.fillStyle = '#aab4c0'; ctx.shadowBlur = 3; ctx.shadowColor = '#aab4c0';
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  });
  ctx.restore();

  /* ── Cloud platforms ──────────────────────── */
  for (const b of activeBlocks)  _drawCloudPlatform(b, t);
  for (const p of movingPlats)   _drawMovingCloudPlat(p, t);

  /* ── Ice walls ────────────────────────────── */
  for (const w of iceWalls) w.draw();

  /* ── Rocky mountain floor ─────────────────── */
  /* jagged rock silhouette */
  ctx.fillStyle = '#0e0c14';
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 18) {
    const jag = Math.sin(x * 0.09) * 5 + Math.sin(x * 0.04) * 3;
    ctx.lineTo(x, H - 18 + jag);
  }
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  /* rock highlight line */
  ctx.strokeStyle = 'rgba(70,65,85,0.35)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, H - 18);
  for (let x = 0; x <= W; x += 18) {
    ctx.lineTo(x, H - 18 + Math.sin(x * 0.09) * 5 + Math.sin(x * 0.04) * 3);
  }
  ctx.stroke();
}

// ─────────────────────────────────────────────
// VOLCANIC TEMPLE — Fire & Lava map (map 2)
// ─────────────────────────────────────────────

let _embers      = null;
let _smokeClouds = null;
let _ashParts    = null;
let _geyserParts = [];
let _lastGeyserT = -16;
const _GEYSER_INT = 11;

/* ── Per-map chaos state ─────────────────────── */
let _chaosTrainX   = null, _lastChaosTrainT   = -30;  // Map 0 chaos train
let _chaosFireballs = [],  _lastChaosFireballT = -5;   // Map 2 chaos fireballs

/* Pre-computed temple debris (deterministic) */
const _TDEBRIS = Array.from({length:9}, (_, i) => ({
  x: 55 + i * 118 + (i*17)%48,
  w: 18 + (i*11)%22,
  h:  7 + (i*7)%12,
}));

function _initVolcano() {
  /* Ash eruption particles from caldera */
  _ashParts = Array.from({length:38}, () => ({
    x: W/2 + (Math.random()-0.5)*30,
    y: H*0.22,
    vx: (Math.random()-0.5)*2.8,
    vy: -(1.0+Math.random()*4.0),
    r:  Math.random()*3+0.6,
    a:  0.35+Math.random()*0.55,
    col: ['#ff8800','#ff4400','#cc3300','#885500','#553333'][Math.floor(Math.random()*5)],
    life: Math.random()*80,
    maxLife: 55+Math.random()*95,
    grav: 0.016+Math.random()*0.014,
  }));
  _embers = Array.from({length:90}, () => ({
    x: Math.random() * W,
    y: H - 20 + Math.random() * 20,
    vx: (Math.random() - 0.5) * 1.8,
    vy: -(0.7 + Math.random() * 2.8),
    r:  Math.random() * 2.5 + 0.5,
    a:  0.35 + Math.random() * 0.55,
    life: Math.random() * 100,
    maxLife: 85 + Math.random() * 125,
    col: ['#ff6600','#ff3300','#ffaa00','#ff8800'][Math.floor(Math.random()*4)],
  }));
  _smokeClouds = Array.from({length:22}, () => ({
    x: Math.random() * W,
    y: H - 30,
    r:  10 + Math.random() * 22,
    vy: -(0.25 + Math.random() * 0.45),
    a:  0.055 + Math.random() * 0.065,
    life: 0,
    maxLife: 160 + Math.random() * 110,
  }));
}

function _drawVolcano(t) {
  const VCX  = W * 0.50;          // volcano center X
  const VPY  = H * 0.20;          // peak Y
  const VBHW = W * 0.29;          // half-width at base
  const VBY  = H - 16;            // base Y

  ctx.save();
  ctx.globalAlpha = 0.72;

  /* ── Mountain body ──────────────────────── */
  const mg = ctx.createLinearGradient(VCX, VPY, VCX, VBY);
  mg.addColorStop(0, '#1c0a04'); mg.addColorStop(0.45, '#2d0e06'); mg.addColorStop(1, '#1a0804');
  ctx.fillStyle = mg;
  ctx.beginPath();
  ctx.moveTo(VCX - VBHW, VBY);
  ctx.lineTo(VCX - VBHW*0.32, VPY + 28);
  ctx.lineTo(VCX - 22, VPY + 2);
  ctx.lineTo(VCX,       VPY - 6);        // true peak
  ctx.lineTo(VCX + 22, VPY + 2);
  ctx.lineTo(VCX + VBHW*0.32, VPY + 28);
  ctx.lineTo(VCX + VBHW, VBY);
  ctx.closePath(); ctx.fill();

  /* Slope ridges */
  ctx.strokeStyle = 'rgba(40,14,4,0.55)'; ctx.lineWidth = 2;
  [[-0.16,-0.02],[0.16,0.02]].forEach(([sx,ex]) => {
    ctx.beginPath();
    ctx.moveTo(VCX + sx*VBHW, VBY);
    ctx.lineTo(VCX + ex*VBHW*0.5, VPY + (VBY-VPY)*0.5);
    ctx.lineTo(VCX, VPY); ctx.stroke();
  });

  /* ── Caldera glow ───────────────────────── */
  ctx.globalAlpha = 0.85;
  const calY = VPY - 5;
  const cg = ctx.createRadialGradient(VCX, calY, 0, VCX, calY, 95);
  cg.addColorStop(0,   'rgba(255,220,30,0.98)');
  cg.addColorStop(0.18,'rgba(255,100,0,0.85)');
  cg.addColorStop(0.45,'rgba(255,40,0,0.40)');
  cg.addColorStop(0.75,'rgba(180,15,0,0.14)');
  cg.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = cg;
  ctx.fillRect(VCX - 95, calY - 65, 190, 70);

  /* Eruption column above caldera */
  ctx.globalAlpha = 0.38 + Math.sin(t*2.2)*0.14;
  const ew = 55 + Math.sin(t*3.5)*12;
  const eg = ctx.createLinearGradient(VCX, calY - 90, VCX, calY - 5);
  eg.addColorStop(0, 'rgba(255,80,0,0)');
  eg.addColorStop(1, 'rgba(255,160,0,0.65)');
  ctx.fillStyle = eg;
  ctx.fillRect(VCX - ew, calY - 90, ew*2, 90);

  /* ── Lava streams ───────────────────────── */
  ctx.globalAlpha = (0.6 + Math.sin(t*1.5)*0.3) * 0.72;
  ctx.strokeStyle = '#ff5500'; ctx.lineWidth = 3.5;
  ctx.shadowBlur = 12; ctx.shadowColor = '#ff6600'; ctx.lineCap = 'round';
  const span = VBY - VPY;
  /* Left stream */
  ctx.beginPath(); ctx.moveTo(VCX - 20, VPY + 12);
  ctx.bezierCurveTo(VCX-VBHW*0.10, VPY+span*0.28, VCX-VBHW*0.20, VPY+span*0.54, VCX-VBHW*0.38, VPY+span*0.72);
  ctx.stroke();
  /* Right stream */
  ctx.beginPath(); ctx.moveTo(VCX + 20, VPY + 12);
  ctx.bezierCurveTo(VCX+VBHW*0.12, VPY+span*0.26, VCX+VBHW*0.22, VPY+span*0.50, VCX+VBHW*0.36, VPY+span*0.68);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.restore();
}

/* ════════════════════════════════════════════
   MAP-SPECIFIC CHAOS LOGIC
   updateChaosNeon / updateChaosLava are called
   from main.js inside the shouldUpdate block.
   Storm chaos is handled inside drawStormPeak.
════════════════════════════════════════════ */

/* ── MAP 0: Danger red chaos train ────────── */
function _drawChaosTrain(tx) {
  const ty = Math.round(H * 0.65), th = 26;
  const tf = Math.sin(Date.now() * 0.012) > 0; // blink flag
  ctx.save(); ctx.lineCap = 'round';
  /* motion blur */
  for (let i=1;i<=6;i++){
    ctx.globalAlpha=(1-i/6)*0.2;ctx.fillStyle='#ff2200';
    ctx.fillRect(tx+i*14,ty,_TRAIN_LEN,th);
  }
  ctx.globalAlpha=1;
  /* body */
  ctx.fillStyle='#1a0000';ctx.fillRect(tx,ty,_TRAIN_LEN,th);
  /* warning diagonal stripes */
  ctx.save();ctx.beginPath();ctx.rect(tx,ty,_TRAIN_LEN,th);ctx.clip();
  for(let x=-th;x<_TRAIN_LEN+th;x+=20){
    ctx.fillStyle=x%40<20?'rgba(255,0,0,0.30)':'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.moveTo(tx+x,ty);ctx.lineTo(tx+x+th,ty);
    ctx.lineTo(tx+x+th,ty+th);ctx.lineTo(tx+x,ty+th);
    ctx.closePath();ctx.fill();
  }
  ctx.restore();
  /* red windows */
  for(let wx=tx+14;wx<tx+_TRAIN_LEN-14;wx+=34){
    ctx.fillStyle=tf?'#ff3300':'#aa0000';
    ctx.shadowBlur=tf?14:6;ctx.shadowColor='#ff0000';
    ctx.fillRect(wx,ty+5,22,11);
  }
  ctx.shadowBlur=0;
  /* danger neon strip */
  ctx.strokeStyle=tf?'#ff0000':'#ff6600';
  ctx.lineWidth=2.5;ctx.shadowBlur=18;ctx.shadowColor='#ff0000';
  ctx.beginPath();ctx.moveTo(tx+2,ty+th-2);ctx.lineTo(tx+_TRAIN_LEN-2,ty+th-2);ctx.stroke();
  /* nose */
  ctx.fillStyle='#1a0000';ctx.shadowBlur=22;ctx.shadowColor='#ff2200';
  ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(tx,ty+th);ctx.lineTo(tx-40,ty+th*.5);ctx.closePath();ctx.fill();
  /* headlight (red) */
  const hx=tx-40,hy=ty+th*.5;
  const hg=ctx.createRadialGradient(hx,hy,0,hx,hy,88);
  hg.addColorStop(0,'rgba(255,0,0,0.72)');hg.addColorStop(1,'rgba(255,0,0,0)');
  ctx.globalAlpha=0.8;ctx.fillStyle=hg;ctx.fillRect(hx-88,hy-56,88,112);
  ctx.globalAlpha=1;ctx.shadowBlur=0;
  /* mag-lev glow */
  const lg=ctx.createLinearGradient(0,ty+th,0,ty+th+12);
  lg.addColorStop(0,'rgba(255,40,0,0.5)');lg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=lg;ctx.fillRect(tx-40,ty+th,_TRAIN_LEN+40,12);
  ctx.restore();
}

function updateChaosNeon(t) {
  if (!chaosMode || mapIdx !== 0) { _chaosTrainX = null; return; }
  /* spawn danger train every 8s */
  if (_chaosTrainX === null && t - _lastChaosTrainT > 8) {
    _chaosTrainX = W + 80; _lastChaosTrainT = t;
  }
  if (_chaosTrainX !== null) {
    _chaosTrainX -= 3.5;
    const ty = Math.round(H * 0.65), th = 26;
    /* Only the FRONT nose (80px) deals damage — body is safe */
    const frontL = _chaosTrainX - 40;
    const frontR = _chaosTrainX + 80;
    [f1, f2].forEach(f => {
      if (!f || f.dead || f.dashInv > 0) return;
      /* Standing ON TOP of train = safe */
      const onTop = f.y + f.h <= ty + 5;
      if (!onTop && f.x+f.w > frontL && f.x < frontR && f.y+f.h > ty && f.y < ty+th) {
        /* Small damage, big knockback — just a shove */
        f.takeHit({dmg:2, stun:10, knock:8, type:'ranged'}, null, '#ff4444');
        burst(f.x+f.w/2, f.y+f.h/2, '#ff2222', 8, 6, 20);
      }
    });
    if (_chaosTrainX < -(_TRAIN_LEN + 80)) _chaosTrainX = null;
  }
}

/* ── MAP 2: Chaos fireballs ────────────────── */
function updateChaosLava(t) {
  if (!chaosMode || mapIdx !== 2) { _chaosFireballs = []; return; }
  if (t - _lastChaosFireballT > 2.5) {
    _lastChaosFireballT = t;
    _chaosFireballs.push({
      x: W * (0.1 + Math.random() * 0.8),
      y: -38, vy: 4 + Math.random() * 3,
      r: 16 + Math.random() * 9, hit: false,
    });
  }
  for (let i = _chaosFireballs.length - 1; i >= 0; i--) {
    const fb = _chaosFireballs[i];
    fb.y += fb.vy;
    if (fb.y > H + 45) { _chaosFireballs.splice(i, 1); continue; }
    [f1, f2].forEach(f => {
      if (!f || f.dead || fb.hit) return;
      if (Math.hypot(f.x+f.w/2 - fb.x, f.y+f.h/2 - fb.y) < fb.r + 22) {
        fb.hit = true;
        f.takeHit({dmg:16, stun:28, knock:5, type:'ranged', status:'burn', statusDur:200}, null, '#ff6600');
        burst(fb.x, fb.y, '#ff8800', 14, 7, 28);
        if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 8);
      }
    });
    if (fb.hit) _chaosFireballs.splice(i, 1);
  }
}

function _drawTempleRuins() {
  ctx.save(); ctx.globalAlpha = 0.48;
  /* Pillars */
  const pillars = [
    {x:18,  w:32, frac:0.52},
    {x:118, w:22, frac:0.42},
    {x:960, w:32, frac:0.52},
    {x:1050,w:22, frac:0.42},
    {x:310, w:18, frac:0.30},
    {x:772, w:18, frac:0.30},
  ];
  pillars.forEach(p => {
    const ph = H * p.frac;
    const by = H - 16 - ph;
    const pg = ctx.createLinearGradient(0, by, 0, H-16);
    pg.addColorStop(0, '#1c0a04'); pg.addColorStop(1, '#330e06');
    ctx.fillStyle = pg;
    ctx.fillRect(p.x, by, p.w, ph);
    /* capital */
    ctx.fillStyle = '#251006';
    ctx.fillRect(p.x - 5, by - 9, p.w + 10, 10);
    /* lava-lit edge */
    ctx.strokeStyle = 'rgba(210,60,0,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(p.x, by, p.w, ph);
  });
  /* Stone debris on floor */
  ctx.fillStyle = '#1c0a04';
  _TDEBRIS.forEach(d => ctx.fillRect(d.x, H - 16 - d.h, d.w, d.h));
  ctx.restore();
}

function _drawLavaFloor(t) {
  const baseY = H * 0.92;

  /* Lava glow upward */
  const lg = ctx.createLinearGradient(0, baseY - 55, 0, baseY);
  lg.addColorStop(0, 'rgba(255,50,0,0)');
  lg.addColorStop(1, 'rgba(255,50,0,0.38)');
  ctx.fillStyle = lg; ctx.fillRect(0, baseY - 55, W, 55);

  /* Lava hot-spots */
  for (let i = 0; i < 6; i++) {
    const hx = (i / 5) * W;
    const hy = baseY + Math.sin(hx * 0.045 + t * 1.8) * 8;
    const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, 85);
    hg.addColorStop(0, 'rgba(255,200,0,0.55)');
    hg.addColorStop(0.3, 'rgba(255,90,0,0.25)');
    hg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hg; ctx.fillRect(hx - 85, hy - 45, 170, 90);
  }

  /* Lava surface (wavy fill) */
  const grad = ctx.createLinearGradient(0, baseY, 0, H);
  grad.addColorStop(0, '#ff4400'); grad.addColorStop(0.4, '#cc2200'); grad.addColorStop(1, '#660000');
  ctx.fillStyle = grad;
  ctx.shadowBlur = 22; ctx.shadowColor = '#ff6600';
  ctx.beginPath(); ctx.moveTo(0, baseY);
  for (let x = 0; x <= W; x += 6) {
    const y = baseY + Math.sin(x * 0.048 + t * 2.2) * 9 + Math.sin(x * 0.022 + t * 1.4) * 4;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;

  /* Bright lava crust line */
  ctx.strokeStyle = '#ff9900'; ctx.lineWidth = 2;
  ctx.shadowBlur = 14; ctx.shadowColor = '#ffcc00';
  ctx.beginPath(); ctx.moveTo(0, baseY);
  for (let x = 0; x <= W; x += 6) {
    ctx.lineTo(x, baseY + Math.sin(x * 0.048 + t * 2.2) * 9 + Math.sin(x * 0.022 + t * 1.4) * 4);
  }
  ctx.stroke(); ctx.shadowBlur = 0;
}

function _drawVolcanoBlock(b, t) {
  const col   = b.color || '#7c2d12';
  const pulse = 0.5 + Math.sin(t * 1.6 + b.x * 0.007) * 0.5;

  /* Stone body */
  const sg = ctx.createLinearGradient(0, b.y, 0, b.y + b.height);
  sg.addColorStop(0, '#3d1506'); sg.addColorStop(1, '#220a03');
  ctx.fillStyle = sg;
  ctx.fillRect(b.x, b.y, b.width, b.height);

  /* Glowing cracks */
  const crackA = (0.5 + pulse * 0.5) * 0.75;
  ctx.strokeStyle = `rgba(255,${Math.round(60 + pulse*80)},0,${crackA})`;
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 9 * pulse; ctx.shadowColor = '#ff4400';
  const cCount = Math.floor(b.width / 90) + 2;
  for (let i = 0; i < cCount; i++) {
    const cx_ = b.x + (i + 0.5) * b.width / cCount;
    ctx.beginPath();
    ctx.moveTo(cx_, b.y);
    ctx.lineTo(cx_ + (i%2?4:-4), b.y + b.height * 0.5);
    ctx.lineTo(cx_ + (i%2?-3:3), b.y + b.height);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  /* Top glowing edge */
  ctx.strokeStyle = `rgba(255,${Math.round(80+pulse*70)},0,${0.55+pulse*0.35})`;
  ctx.lineWidth = 2.5;
  ctx.shadowBlur = 16 * pulse; ctx.shadowColor = '#ff6600';
  ctx.beginPath();
  ctx.moveTo(b.x, b.y + 1); ctx.lineTo(b.x + b.width, b.y + 1);
  ctx.stroke(); ctx.shadowBlur = 0;

  /* Underflow lava glow */
  const ug = ctx.createLinearGradient(0, b.y + b.height, 0, b.y + b.height + 42);
  ug.addColorStop(0, 'rgba(255,70,0,0.24)'); ug.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = ug; ctx.fillRect(b.x - 8, b.y + b.height, b.width + 16, 42);

  /* Corner fire embers */
  [b.x + 4, b.x + b.width - 4].forEach(ex => {
    ctx.save();
    ctx.globalAlpha = 0.5 + pulse * 0.4;
    ctx.fillStyle = '#ff8800'; ctx.shadowBlur = 10; ctx.shadowColor = '#ff4400';
    ctx.beginPath(); ctx.arc(ex, b.y - 2, 3 + pulse * 2.5, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  });
}

function _drawVolcanoMovingPlat(p, t) {
  const spd = Math.abs(p.ldx || 0);
  const dir = (p.ldx || 0) > 0 ? -1 : 1;
  /* fire trail */
  if (spd > 0.05) {
    for (let i = 1; i <= 6; i++) {
      const ta = (1 - i/6) * 0.22;
      ctx.save(); ctx.globalAlpha = ta;
      ctx.fillStyle = '#ff4400'; ctx.shadowBlur = 8; ctx.shadowColor = '#ff4400';
      ctx.fillRect(p.x + dir * i * spd * 4.5, p.y, p.w, p.h);
      ctx.restore();
    }
  }
  _drawVolcanoBlock({x:p.x, y:p.y, width:p.w, height:p.h, color:p.color}, t);
}

function drawVolcanicTemple() {
  if (!_embers) _initVolcano();
  const t = Date.now() * 0.001;

  /* ── Sky: dark with lava glow from below ── */
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0,   '#0d0200');
  sky.addColorStop(0.55,'#1a0400');
  sky.addColorStop(0.80,'#3d0800');
  sky.addColorStop(1,   '#6b1200');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

  /* Ambient lava light on everything */
  const ambG = ctx.createRadialGradient(W/2, H, 0, W/2, H, H * 1.1);
  ambG.addColorStop(0, 'rgba(255,60,0,0.22)');
  ambG.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = ambG; ctx.fillRect(0, 0, W, H);

  /* ── Volcano (far background) ─────────────── */
  _drawVolcano(t);

  /* ── Ash eruption particles from caldera ──── */
  _ashParts.forEach(a => {
    a.x += a.vx; a.y += a.vy; a.vy += a.grav; a.life++;
    if (a.life > a.maxLife) {
      a.x = W/2 + (Math.random()-0.5)*30; a.y = H*0.22;
      a.vx = (Math.random()-0.5)*2.8; a.vy = -(1.0+Math.random()*4.0);
      a.grav = 0.016+Math.random()*0.014;
      a.life = 0; a.maxLife = 55+Math.random()*95;
    }
    const aa = (1 - a.life/a.maxLife) * a.a;
    ctx.save(); ctx.globalAlpha = aa;
    ctx.fillStyle = a.col; ctx.shadowBlur = 6; ctx.shadowColor = a.col;
    ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  });

  /* ── Temple ruins (background) ────────────── */
  _drawTempleRuins();

  /* ── Smoke clouds ─────────────────────────── */
  _smokeClouds.forEach((s, i) => {
    s.y += s.vy; s.r += 0.04; s.life++;
    if (s.life > s.maxLife || s.y + s.r < -20) {
      s.x = Math.random() * W; s.y = H - 22;
      s.r = 10 + Math.random() * 18; s.vy = -(0.22 + Math.random() * 0.42);
      s.a = 0.05 + Math.random() * 0.06; s.life = 0;
    }
    const la = Math.sin(s.life / s.maxLife * Math.PI) * s.a;
    ctx.save(); ctx.globalAlpha = la;
    const sg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
    sg.addColorStop(0, '#2a1410'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  });

  /* ── Lava floor ───────────────────────────── */
  _drawLavaFloor(t);

  /* ── Geyser logic ─────────────────────────── */
  if (t - _lastGeyserT > _GEYSER_INT) {
    _lastGeyserT = t;
    const gx = W * (0.12 + Math.random() * 0.76);
    for (let i = 0; i < 18; i++) {
      const a = -Math.PI/2 + (Math.random()-0.5)*0.9;
      const spd = 6 + Math.random() * 9;
      _geyserParts.push({
        x: gx, y: H - 20,
        vx: Math.cos(a)*spd, vy: Math.sin(a)*spd,
        r: Math.random()*3+1.5,
        col: Math.random()<0.5?'#ff6600':'#ffaa00',
        life:0, max:38+Math.random()*28, grav:0.28,
      });
    }
  }
  /* update & draw geyser */
  for (let i = _geyserParts.length-1; i>=0; i--) {
    const gp = _geyserParts[i];
    gp.x += gp.vx; gp.y += gp.vy; gp.vy += gp.grav; gp.life++;
    if (gp.life > gp.max) { _geyserParts.splice(i,1); continue; }
    const ga = (1 - gp.life/gp.max) * 0.88;
    ctx.save(); ctx.globalAlpha = ga;
    ctx.fillStyle = gp.col; ctx.shadowBlur = 10; ctx.shadowColor = '#ff4400';
    ctx.beginPath(); ctx.arc(gp.x, gp.y, gp.r, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  /* ── Ember particles ──────────────────────── */
  _embers.forEach(e => {
    e.x += e.vx; e.y += e.vy; e.vy += 0.022; e.life++;
    if (e.life > e.maxLife || e.y < -15) {
      e.x = Math.random()*W; e.y = H-18+Math.random()*10;
      e.vx = (Math.random()-0.5)*1.8; e.vy = -(0.7+Math.random()*2.8);
      e.life = 0; e.maxLife = 85+Math.random()*125;
    }
    const ea = (1 - e.life/e.maxLife) * e.a;
    ctx.save(); ctx.globalAlpha = ea;
    ctx.fillStyle = e.col; ctx.shadowBlur = 7; ctx.shadowColor = e.col;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r*(0.4+0.6*(1-e.life/e.maxLife)), 0, Math.PI*2); ctx.fill();
    ctx.restore();
  });

  /* ── Stone platforms ──────────────────────── */
  for (const b of activeBlocks) _drawVolcanoBlock(b, t);
  for (const p of movingPlats)  _drawVolcanoMovingPlat(p, t);

  /* Lava hazard zone boundary glow (decorative — no damage) */
  for (const hz of MAPS[mapIdx].hazards) {
    if (hz.type === 'lava' || hz.type === 'lava_deco') {
      ctx.fillStyle = 'rgba(255,50,0,0.10)';
      ctx.fillRect(hz.x, hz.y - 10, hz.w, 10);
    }
  }

  /* ── Chaos: falling fireballs ─────────────── */
  if (chaosMode) {
    _chaosFireballs.forEach(fb => {
      if (fb.hit) return;
      ctx.save();
      /* fire trail (above fireball — where it came from) */
      for (let j = 0; j < 4; j++) {
        ctx.globalAlpha = (1 - j/4) * 0.28;
        ctx.fillStyle = '#ff4400';
        ctx.beginPath(); ctx.arc(fb.x, fb.y - fb.r - j*11, fb.r*(0.75 - j*0.16), 0, Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      /* outer fire ball */
      ctx.shadowBlur = 26; ctx.shadowColor = '#ff4400';
      ctx.fillStyle = '#ff8800';
      ctx.beginPath(); ctx.arc(fb.x, fb.y, fb.r, 0, Math.PI*2); ctx.fill();
      /* hot core */
      ctx.fillStyle = '#ffee00'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(fb.x, fb.y, fb.r * 0.42, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0; ctx.restore();
    });
  }

  /* ── Ice walls ────────────────────────────── */
  for (const w of iceWalls) w.draw();

  /* ── Stone floor strip ───────────────────── */
  const fg = ctx.createLinearGradient(0, H-16, 0, H);
  fg.addColorStop(0,'#2a0c04'); fg.addColorStop(1,'#150602');
  ctx.fillStyle = fg; ctx.fillRect(0, H-16, W, 16);
  /* molten edge */
  ctx.strokeStyle = 'rgba(255,100,0,0.6)'; ctx.lineWidth = 1.5;
  ctx.shadowBlur = 10; ctx.shadowColor = '#ff6600';
  ctx.beginPath(); ctx.moveTo(0,H-16); ctx.lineTo(W,H-16); ctx.stroke();
  ctx.shadowBlur = 0;
}

/* Futuristic train state */
let _trainX    = null;   // current X (null = not yet initialized)
let _lastTrainT = -30;   // timestamp of last spawn (start <0 so first train spawns immediately)
const _TRAIN_LEN      = 420;
const _TRAIN_INTERVAL = 18;   // seconds between trains

function _drawNeonTrain(tx) {
  const ty  = Math.round(H * 0.30);  // above all platforms
  const th  = 26;
  const t   = Date.now() * 0.001;

  ctx.save();
  ctx.lineCap = 'round';

  /* Motion blur trail (fading copies to the RIGHT = where it came from) */
  for (let i = 1; i <= 10; i++) {
    const blurA = (1 - i / 10) * 0.14;
    ctx.globalAlpha = blurA;
    ctx.fillStyle = '#00eeff';
    ctx.fillRect(tx + i * 14, ty, _TRAIN_LEN, th);
  }
  ctx.globalAlpha = 1;

  /* Carriage helper */
  function carriage(cx, cw, isHead) {
    /* Body gradient */
    const bg = ctx.createLinearGradient(0, ty, 0, ty + th);
    bg.addColorStop(0, '#001a28');
    bg.addColorStop(0.5, '#00223a');
    bg.addColorStop(1, '#000e1c');
    ctx.fillStyle = bg;
    ctx.fillRect(cx, ty, cw, th);

    /* Side stripe */
    ctx.fillStyle = '#002840';
    ctx.fillRect(cx, ty + 2, cw, 4);

    /* Windows */
    for (let wx = cx + 14; wx < cx + cw - 14; wx += 34) {
      const blink = Math.sin(t * 0.55 + wx * 0.09) < -0.92;
      ctx.fillStyle    = blink ? '#003344' : '#00eeff';
      ctx.shadowBlur   = blink ? 3 : 12;
      ctx.shadowColor  = '#00eeff';
      ctx.fillRect(wx, ty + 6, 22, 11);
    }
    ctx.shadowBlur = 0;

    /* Bottom neon strip */
    ctx.strokeStyle = '#00eeff';
    ctx.lineWidth   = 2.5;
    ctx.shadowBlur  = 16; ctx.shadowColor = '#00eeff';
    ctx.beginPath();
    ctx.moveTo(cx + 2, ty + th - 2);
    ctx.lineTo(cx + cw - 2, ty + th - 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    /* Top accent line */
    ctx.strokeStyle = '#00445a';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(cx, ty + 1); ctx.lineTo(cx + cw, ty + 1);
    ctx.stroke();
  }

  /* Three carriages */
  carriage(tx,           160, true);   // front
  carriage(tx + 168,     130, false);  // middle
  carriage(tx + 306,     114, false);  // rear

  /* Connector gaps (darker) */
  ctx.fillStyle = '#000508';
  ctx.fillRect(tx + 160, ty + 4, 8, th - 8);
  ctx.fillRect(tx + 298, ty + 4, 8, th - 8);

  /* Aerodynamic nose (front = LEFT side, since moving left) */
  ctx.fillStyle = '#001a28';
  ctx.shadowBlur = 18; ctx.shadowColor = '#00eeff';
  ctx.beginPath();
  ctx.moveTo(tx,      ty);
  ctx.lineTo(tx,      ty + th);
  ctx.lineTo(tx - 40, ty + th * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  /* Headlight cone (projects forward = left) */
  const hx = tx - 40, hy = ty + th * 0.5;
  const headG = ctx.createRadialGradient(hx, hy, 0, hx, hy, 90);
  headG.addColorStop(0, 'rgba(0,238,255,0.60)');
  headG.addColorStop(0.4, 'rgba(0,238,255,0.18)');
  headG.addColorStop(1,   'rgba(0,238,255,0)');
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = headG;
  ctx.fillRect(hx - 90, hy - 55, 90, 110);
  ctx.globalAlpha = 1;

  /* Magnetic levitation glow beneath train */
  const levG = ctx.createLinearGradient(0, ty + th, 0, ty + th + 14);
  levG.addColorStop(0, 'rgba(0,238,255,0.45)');
  levG.addColorStop(1, 'rgba(0,238,255,0)');
  ctx.fillStyle = levG;
  ctx.fillRect(tx - 40, ty + th, _TRAIN_LEN + 40, 14);

  /* Speed dots above (pantograph sparks) */
  for (let i = 0; i < 5; i++) {
    const sx = tx + i * 80 + 20 + Math.sin(t * 40 + i) * 8;
    const sy = ty - 3 - Math.abs(Math.sin(t * 35 + i * 0.7)) * 6;
    ctx.save();
    ctx.globalAlpha = 0.6 + Math.sin(t * 30 + i) * 0.4;
    ctx.fillStyle = '#00eeff';
    ctx.shadowBlur = 8; ctx.shadowColor = '#00eeff';
    ctx.beginPath(); ctx.arc(sx, sy, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

/* Pre-defined city buildings — stable positions every frame */
const _BLDGS = [
  { x:0,   w:88,  h:165, col:'#001020', neon:'#00eeff' },
  { x:98,  w:62,  h:245, col:'#0a0015', neon:'#a855f7' },
  { x:170, w:95,  h:150, col:'#001020', neon:'#00eeff' },
  { x:275, w:72,  h:215, col:'#0a0015', neon:'#f59e0b' },
  { x:358, w:88,  h:130, col:'#001020', neon:'#00eeff' },
  { x:456, w:64,  h:268, col:'#0a0015', neon:'#a855f7' },
  { x:530, w:82,  h:180, col:'#001020', neon:'#f59e0b' },
  { x:622, w:78,  h:230, col:'#0a0015', neon:'#00eeff' },
  { x:710, w:88,  h:162, col:'#001020', neon:'#a855f7' },
  { x:808, w:72,  h:210, col:'#0a0015', neon:'#00eeff' },
  { x:890, w:92,  h:142, col:'#001020', neon:'#f59e0b' },
  { x:992, w:108, h:258, col:'#0a0015', neon:'#a855f7' },
];

function drawNeonArena() {
  const t   = Date.now() * 0.001;
  const pcx = f1 && f2 ? (f1.x + f2.x) / 2 / W : 0.5; // parallax centre

  /* ── Sky ──────────────────────────────────── */
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#000208'); sky.addColorStop(0.65, '#000a1e'); sky.addColorStop(1, '#001020');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

  /* ── City skyline ─────────────────────────── */
  const hY = H * 0.62;   // horizon Y
  const ox = (pcx - 0.5) * -28;  // parallax offset

  _BLDGS.forEach(b => {
    const bx = b.x + ox, by = hY - b.h;
    ctx.save();

    /* Building body */
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = b.col;
    ctx.fillRect(bx, by, b.w, H - by);

    /* Lit windows (deterministic) */
    ctx.shadowBlur = 5; ctx.shadowColor = b.neon;
    for (let wy = by + 8; wy < hY - 5; wy += 14) {
      for (let wx = bx + 5; wx < bx + b.w - 4; wx += 10) {
        const hash = ((Math.round(wx) * 17 + Math.round(wy) * 7)) % 100;
        const blink = Math.sin(t * 0.35 + hash * 0.28) < -0.88;
        if (hash > 28 && !blink) {
          ctx.fillStyle = b.neon + '88';
          ctx.fillRect(wx, wy, 4, 4);
        }
      }
    }

    /* Neon roof line */
    ctx.globalAlpha = 0.3 + Math.sin(t * 0.5 + b.x * 0.02) * 0.15;
    ctx.strokeStyle = b.neon; ctx.lineWidth = 1.5;
    ctx.shadowBlur = 10; ctx.shadowColor = b.neon;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + b.w, by); ctx.stroke();
    ctx.restore();
  });

  /* ── Horizon glow ─────────────────────────── */
  const hg = ctx.createLinearGradient(0, hY - 25, 0, hY + 50);
  hg.addColorStop(0, 'rgba(0,110,200,0)');
  hg.addColorStop(0.5, 'rgba(0,110,200,0.14)');
  hg.addColorStop(1, 'rgba(0,110,200,0)');
  ctx.fillStyle = hg; ctx.fillRect(0, hY - 25, W, 75);

  /* ── Floating neon particles ──────────────── */
  const pcols = ['#00eeff', '#a855f7', '#f59e0b', '#4f46e5'];
  for (let i = 0; i < 28; i++) {
    const px = (Math.sin(t * 0.38 + i * 2.1) * 0.5 + 0.5) * W;
    const py = (Math.cos(t * 0.27 + i * 1.7) * 0.5 + 0.5) * H * 0.55 + H * 0.04;
    const pa = 0.06 + Math.sin(t * 1.8 + i) * 0.05;
    const pc = pcols[i % 4];
    ctx.save(); ctx.globalAlpha = pa;
    ctx.fillStyle = pc; ctx.shadowBlur = 9; ctx.shadowColor = pc;
    ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  /* ── Scanlines ────────────────────────────── */
  ctx.save(); ctx.globalAlpha = 0.022; ctx.fillStyle = '#000';
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 2);
  ctx.restore();

  /* ── Futuristic maglev train ──────────────── */
  if (_trainX === null) _trainX = W + 100;
  if (t - _lastTrainT > _TRAIN_INTERVAL) {
    _trainX = W + 100;
    _lastTrainT = t;
  }
  if (_trainX > -(_TRAIN_LEN + 80)) {
    _drawNeonTrain(_trainX);
    _trainX -= 5;  // moves left at 5px/frame (~300px/s at 60fps)
  }

  /* ── Neon static platforms ────────────────── */
  for (const b of activeBlocks)  _drawNeonBlock(b, t);

  /* ── Neon moving platform ─────────────────── */
  for (const p of movingPlats)   _drawNeonMovingPlat(p, t);

  /* ── Electric floor hazard (decorative) ──── */
  for (const hz of MAPS[mapIdx].hazards) {
    if (hz.type === 'electric') _drawElectricFloor(hz, t);
  }

  /* ── Ice walls ────────────────────────────── */
  for (const w of iceWalls) w.draw();

  /* ── Chaos: warning + danger red train ────── */
  if (chaosMode && _chaosTrainX !== null) {
    const ty_ = Math.round(H * 0.65);

    /* Warning indicator — visible while train is still approaching */
    if (_chaosTrainX > W * 0.18) {
      const wa = 0.45 + Math.sin(Date.now() * 0.018) * 0.42;
      ctx.save();
      /* pulsing danger bar at train height */
      ctx.globalAlpha = wa * 0.14;
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, ty_, W, 26);
      ctx.globalAlpha = wa;
      /* warning text */
      ctx.font = 'bold 13px Segoe UI';
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ff2200';
      ctx.shadowBlur = 14; ctx.shadowColor = '#ff0000';
      ctx.fillText('⚠  DANGER TRAIN  ◄', W - 14, ty_ - 8);
      /* arrow chevrons pointing left */
      ctx.strokeStyle = '#ff2200'; ctx.lineWidth = 2.5; ctx.shadowBlur = 8;
      for (let i = 0; i < 3; i++) {
        const ax = W - 90 - i * 22;
        ctx.beginPath();
        ctx.moveTo(ax + 10, ty_ + 7);
        ctx.lineTo(ax,      ty_ + 13);
        ctx.lineTo(ax + 10, ty_ + 19);
        ctx.stroke();
      }
      ctx.shadowBlur = 0; ctx.restore();
    }

    _drawChaosTrain(_chaosTrainX);
  }

  /* ── Neon floor strip ─────────────────────── */
  const fg = ctx.createLinearGradient(0, H - 16, 0, H);
  fg.addColorStop(0, '#001828'); fg.addColorStop(1, '#000a16');
  ctx.fillStyle = fg; ctx.fillRect(0, H - 16, W, 16);
  ctx.strokeStyle = 'rgba(0,238,255,0.5)'; ctx.lineWidth = 1.5;
  ctx.shadowBlur = 10; ctx.shadowColor = '#00eeff';
  ctx.beginPath(); ctx.moveTo(0, H - 16); ctx.lineTo(W, H - 16); ctx.stroke();
  ctx.shadowBlur = 0;
}

function _drawNeonBlock(b, t) {
  const col   = b.color || '#00eeff';
  const pulse = 0.65 + Math.sin(t * 1.8 + b.x * 0.005) * 0.35;

  /* Dark base */
  ctx.fillStyle = 'rgba(0,10,25,0.92)';
  ctx.fillRect(b.x, b.y, b.width, b.height);

  /* Underflow glow */
  const ug = ctx.createLinearGradient(0, b.y + b.height, 0, b.y + b.height + 38);
  ug.addColorStop(0, col + '2c'); ug.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = ug;
  ctx.fillRect(b.x - 8, b.y + b.height, b.width + 16, 38);

  /* Top neon edge */
  ctx.strokeStyle = col; ctx.lineWidth = 2.5;
  ctx.shadowBlur = 18 * pulse; ctx.shadowColor = col;
  ctx.beginPath(); ctx.moveTo(b.x, b.y + 1); ctx.lineTo(b.x + b.width, b.y + 1); ctx.stroke();

  /* Side & bottom (dim) */
  ctx.globalAlpha = 0.22; ctx.lineWidth = 1; ctx.shadowBlur = 4;
  ctx.strokeRect(b.x, b.y, b.width, b.height);
  ctx.globalAlpha = 1; ctx.shadowBlur = 0;

  /* Corner glow dots */
  ctx.fillStyle = col; ctx.shadowBlur = 12; ctx.shadowColor = col;
  [b.x, b.x + b.width].forEach(cx => {
    ctx.beginPath(); ctx.arc(cx, b.y, 3.5, 0, Math.PI * 2); ctx.fill();
  });
  ctx.shadowBlur = 0;
}

function _drawNeonMovingPlat(p, t) {
  const col   = p.color || '#f59e0b';
  const pulse = 0.7 + Math.sin(t * 3 + p.x * 0.008) * 0.3;
  const spd   = Math.abs(p.ldx || 0);

  /* Light trail */
  if (spd > 0.05) {
    const dir = (p.ldx || 0) > 0 ? -1 : 1;
    for (let i = 1; i <= 7; i++) {
      const ta = (1 - i / 7) * 0.24;
      ctx.save(); ctx.globalAlpha = ta;
      ctx.fillStyle = col; ctx.shadowBlur = 7; ctx.shadowColor = col;
      ctx.fillRect(p.x + dir * i * spd * 4.5, p.y, p.w, p.h);
      ctx.restore();
    }
  }

  /* Body */
  ctx.fillStyle = 'rgba(18,8,0,0.92)';
  ctx.fillRect(p.x, p.y, p.w, p.h);

  /* Underflow glow */
  const ug = ctx.createLinearGradient(0, p.y + p.h, 0, p.y + p.h + 30);
  ug.addColorStop(0, col + '32'); ug.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = ug; ctx.fillRect(p.x - 6, p.y + p.h, p.w + 12, 30);

  /* Top neon edge */
  ctx.strokeStyle = col; ctx.lineWidth = 2.5;
  ctx.shadowBlur = 15 * pulse; ctx.shadowColor = col;
  ctx.beginPath(); ctx.moveTo(p.x, p.y + 1); ctx.lineTo(p.x + p.w, p.y + 1); ctx.stroke();

  /* Border (dim) */
  ctx.globalAlpha = 0.25; ctx.lineWidth = 1; ctx.shadowBlur = 3;
  ctx.strokeRect(p.x, p.y, p.w, p.h);
  ctx.globalAlpha = 1; ctx.shadowBlur = 0;

  /* Direction chevrons */
  ctx.strokeStyle = col + '55'; ctx.lineWidth = 1;
  for (let ix = p.x + 8; ix < p.x + p.w - 8; ix += 18) {
    ctx.beginPath();
    ctx.moveTo(ix, p.y + 3); ctx.lineTo(ix + 7, p.y + p.h / 2); ctx.lineTo(ix, p.y + p.h - 3);
    ctx.stroke();
  }
}

function _drawElectricFloor(hz, t) {
  const pulse = 0.5 + Math.sin(t * 11) * 0.5;
  const zap   = 0.5 + Math.sin(t * 23) * 0.5;

  /* Warning stripes */
  ctx.save();
  ctx.beginPath(); ctx.rect(hz.x, hz.y, hz.w, hz.h); ctx.clip();
  for (let x = -hz.h; x < hz.w + hz.h; x += 20) {
    ctx.fillStyle = x % 40 < 20 ? 'rgba(255,200,0,0.22)' : 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.moveTo(hz.x + x,        hz.y);
    ctx.lineTo(hz.x + x + hz.h, hz.y);
    ctx.lineTo(hz.x + x + hz.h, hz.y + hz.h);
    ctx.lineTo(hz.x + x,        hz.y + hz.h);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  /* Cyan overlay */
  ctx.fillStyle = `rgba(0,238,255,${0.05 + pulse * 0.07})`;
  ctx.fillRect(hz.x, hz.y, hz.w, hz.h);

  /* Electric arcs (rapid flicker — intentional random) */
  ctx.strokeStyle = `rgba(0,238,255,${0.55 + zap * 0.45})`;
  ctx.lineWidth = 1.3; ctx.shadowBlur = 12; ctx.shadowColor = '#00eeff';
  for (let i = 0; i < 7; i++) {
    const ax = hz.x + Math.random() * hz.w;
    ctx.save(); ctx.globalAlpha = 0.45 + Math.random() * 0.55;
    ctx.beginPath(); ctx.moveTo(ax, hz.y);
    ctx.lineTo(ax + (Math.random() - 0.5) * 28, hz.y + hz.h * 0.45);
    ctx.lineTo(ax + (Math.random() - 0.5) * 18, hz.y + hz.h);
    ctx.stroke(); ctx.restore();
  }
  ctx.shadowBlur = 0;

  /* Top glow line */
  ctx.strokeStyle = `rgba(0,238,255,${0.88 + pulse * 0.12})`;
  ctx.lineWidth = 2; ctx.shadowBlur = 18; ctx.shadowColor = '#00eeff';
  ctx.beginPath(); ctx.moveTo(hz.x, hz.y); ctx.lineTo(hz.x + hz.w, hz.y); ctx.stroke();
  ctx.shadowBlur = 0;

  /* Flash at peak zap */
  if (zap > 0.88) {
    ctx.fillStyle = `rgba(0,238,255,${(zap - 0.88) * 3 * 0.18})`;
    ctx.fillRect(hz.x, hz.y - 22, hz.w, hz.h + 22);
  }
}

// ─────────────────────────────────────────────
// DRAW BACKGROUND (called every frame)
// ─────────────────────────────────────────────
function drawBG() {
  if (mapIdx === 0) { drawNeonArena();      return; }
  if (mapIdx === 1) { drawStormPeak();     return; }
  if (mapIdx === 2) { drawVolcanicTemple(); return; }

  const m  = MAPS[mapIdx];
  const cx = (f1.x + f2.x) / 2 / W;   // 0..1 parallax factor

  // Sky gradient
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, m.bgA); g.addColorStop(1, m.bgB);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // Ambient nebula clouds (slow drift using time)
  const nt = Date.now() * 0.00005;
  const nebPos = [
    { x: W * 0.18 + Math.sin(nt)        * 22, y: H * 0.28 + Math.cos(nt * 0.7) * 14, r: 230 },
    { x: W * 0.82 + Math.cos(nt * 0.8)  * 18, y: H * 0.42 + Math.sin(nt * 0.5) * 16, r: 200 },
    { x: W * 0.50 + Math.sin(nt * 0.6)  * 32, y: H * 0.12 + Math.cos(nt * 0.9) *  8, r: 165 },
  ];
  for (const n of nebPos) {
    const ng = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
    ng.addColorStop(0,   m.bgA + '2a');
    ng.addColorStop(0.5, m.bgB + '12');
    ng.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = ng;
    ctx.fillRect(Math.max(0, n.x - n.r), Math.max(0, n.y - n.r), n.r * 2, n.r * 2);
  }

  // Shooting stars
  for (const s of shootingStars) {
    const a = Math.max(0, s.life / s.maxLife) * 0.85;
    if (a < 0.02) continue;
    ctx.save();
    ctx.globalAlpha = a;
    const tailX = s.x - s.dx * 6, tailY = s.y - s.dy * 6;
    const sg = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
    sg.addColorStop(0, '#ffffff'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = sg; ctx.lineWidth = 1.6;
    ctx.shadowBlur = 6; ctx.shadowColor = '#e2e8f0'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(tailX, tailY); ctx.stroke();
    ctx.restore();
  }

  // Parallax star layers
  for (const layer of bgLayers) {
    const shift = (cx - 0.5) * W * layer.spd;
    for (const s of layer.stars) {
      s.tw += 0.025;
      ctx.save();
      ctx.globalAlpha = 0.35 + Math.sin(s.tw) * 0.35;
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath(); ctx.arc(s.x + shift, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  // Background lightning
  bgLight.timer--;
  if (bgLight.timer <= 0 && Math.random() < 0.005) { bgLight.timer = 10; bgLight.x = Math.random() * W; bgLight.alpha = 0.22; }
  if (bgLight.alpha > 0) {
    ctx.save(); ctx.globalAlpha = bgLight.alpha; ctx.strokeStyle = '#c4b5fd'; ctx.lineWidth = 1;
    let ly = 0, lx = bgLight.x;
    while (ly < H) { ctx.beginPath(); ctx.moveTo(lx, ly); lx += (Math.random() - .5) * 22; ly += 32; ctx.lineTo(lx, ly); ctx.stroke(); }
    bgLight.alpha -= 0.035; ctx.restore();
  }

  // Chaos mode tint
  if (chaosMode) { ctx.fillStyle = `rgba(239,68,68,${0.04 + Math.sin(Date.now() * .004) * 0.02})`; ctx.fillRect(0, 0, W, H); }

  // Subtle grid
  ctx.strokeStyle = 'rgba(255,255,255,.03)'; ctx.lineWidth = 1;
  for (let i = 0; i < H; i += 40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke(); }
  for (let i = 0; i < W; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke(); }

  // Static blocks
  for (const b of activeBlocks) {
    ctx.save();
    ctx.fillStyle = b.color; ctx.shadowBlur = 4; ctx.shadowColor = b.color;
    ctx.fillRect(b.x, b.y, b.width, b.height);
    ctx.strokeStyle = lc(b.color); ctx.lineWidth = 1.5;
    ctx.strokeRect(b.x, b.y, b.width, b.height);
    ctx.restore();
  }

  // Moving platforms
  for (const p of movingPlats) {
    ctx.save();
    ctx.fillStyle = p.color; ctx.shadowBlur = 10; ctx.shadowColor = p.color;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = lc(p.color); ctx.lineWidth = 1.5;
    ctx.strokeRect(p.x, p.y, p.w, p.h);
    // Direction chevrons
    ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 1;
    for (let ix = p.x + 6; ix < p.x + p.w - 6; ix += 20) {
      ctx.beginPath(); ctx.moveTo(ix, p.y + 4); ctx.lineTo(ix + 8, p.y + p.h / 2); ctx.lineTo(ix, p.y + p.h - 4); ctx.stroke();
    }
    ctx.restore();
  }

  // Hazards
  for (const h of MAPS[mapIdx].hazards) {
    ctx.save();
    if (h.type === 'spikes') {
      ctx.fillStyle = '#64748b';
      for (let x = h.x; x < h.x + h.w; x += 10) {
        ctx.beginPath(); ctx.moveTo(x, h.y + h.h); ctx.lineTo(x + 5, h.y); ctx.lineTo(x + 10, h.y + h.h); ctx.fill();
      }
    } else if (h.type === 'lava') {
      const pulse = Math.sin(Date.now() * .008) * 3;
      ctx.fillStyle = '#f97316'; ctx.shadowBlur = 14; ctx.shadowColor = '#ea580c';
      ctx.fillRect(h.x, h.y + pulse, h.w, h.h - pulse);
    }
    ctx.restore();
  }

  // Ice walls
  for (const w of iceWalls) w.draw();

  // Floor strip
  const fg = ctx.createLinearGradient(0, H - 16, 0, H);
  fg.addColorStop(0, '#334155'); fg.addColorStop(1, '#1e293b');
  ctx.fillStyle = fg; ctx.fillRect(0, H - 16, W, 16);
}
