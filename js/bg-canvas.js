/* ═══════════════════════════════════════════════
   bg-canvas.js  —  Shared animated background
   Draws behind every HTML page (NOT battle.html).
   Features: twinkling stars · floating particles
             drifting nebula · lightning bolts
═══════════════════════════════════════════════ */
(function () {
  'use strict';

  const cv = document.createElement('canvas');
  cv.id = 'bgCanvas';
  cv.style.cssText =
    'position:fixed;inset:0;z-index:0;pointer-events:none;opacity:0;transition:opacity 1s';
  document.body.prepend(cv);

  const ctx = cv.getContext('2d');
  let W, H, tick = 0;

  function resize() {
    W = cv.width  = window.innerWidth;
    H = cv.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);
  // Fade canvas in after render starts
  requestAnimationFrame(() => { cv.style.opacity = '1'; });

  /* ── Stars ──────────────────────────────────── */
  const STARS = Array.from({ length: 220 }, () => ({
    x:  Math.random() * window.innerWidth,
    y:  Math.random() * window.innerHeight,
    r:  Math.random() * 1.7 + 0.2,
    tw: Math.random() * Math.PI * 2,
    ts: 0.008 + Math.random() * 0.022,
  }));

  /* ── Floating color particles ───────────────── */
  const PALETTE = ['#4f46e5','#818cf8','#7c3aed','#a855f7','#6366f1'];
  function mkParticle() {
    return {
      x:       Math.random() * window.innerWidth,
      y:       window.innerHeight + Math.random() * 80,
      dx:      (Math.random() - 0.5) * 0.55,
      dy:      -(0.25 + Math.random() * 0.65),
      r:       Math.random() * 2.2 + 0.4,
      c:       PALETTE[Math.floor(Math.random() * PALETTE.length)],
      a:       0.35 + Math.random() * 0.45,
      life:    0,
      maxLife: 130 + Math.random() * 180,
    };
  }
  const PARTS = Array.from({ length: 55 }, mkParticle);

  /* ── Nebula ─────────────────────────────────── */
  const NEBULAE = [
    { ox: 0.14, oy: 0.30, r: 290, c: '#4f46e5', s: 0.000033, d: 0.0   },
    { ox: 0.78, oy: 0.38, r: 260, c: '#dc2626', s: 0.000027, d: 1.8   },
    { ox: 0.50, oy: 0.08, r: 205, c: '#7c3aed', s: 0.000041, d: 3.4   },
    { ox: 0.25, oy: 0.75, r: 180, c: '#0ea5e9', s: 0.000029, d: 5.1   },
  ];

  /* ── Lightning bolts ────────────────────────── */
  let bolt = null, bTimer = 0;

  function mkBolt() {
    return {
      x1: Math.random() * W * 0.38,
      y1: Math.random() * H * 0.35,
      x2: W * 0.52 + Math.random() * W * 0.4,
      y2: H * 0.18 + Math.random() * H * 0.55,
      life: 0, max: 26,
    };
  }

  function drawBolt(b) {
    const n = 10, pts = [{ x: b.x1, y: b.y1 }];
    for (let i = 1; i < n; i++) {
      const t = i / n;
      pts.push({
        x: b.x1 + (b.x2 - b.x1) * t + (Math.random() - 0.5) * 62,
        y: b.y1 + (b.y2 - b.y1) * t + (Math.random() - 0.5) * 62,
      });
    }
    pts.push({ x: b.x2, y: b.y2 });

    const alpha = (1 - b.life / b.max) * 0.52;
    ctx.save();
    ctx.globalAlpha = alpha;

    // Glow pass
    ctx.strokeStyle = '#4f46e5'; ctx.lineWidth = 3;
    ctx.shadowBlur = 22; ctx.shadowColor = '#4f46e5';
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y)); ctx.stroke();

    // Bright core
    ctx.strokeStyle = '#c7d2fe'; ctx.lineWidth = 1;
    ctx.shadowBlur = 6; ctx.shadowColor = '#fff';
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y)); ctx.stroke();

    ctx.restore();
  }

  /* ── Shooting stars ─────────────────────────── */
  let ssTimer = 0, ss = null;
  function mkSS() {
    return {
      x: -30, y: Math.random() * H * 0.45,
      dx: 12 + Math.random() * 10, dy: 2 + Math.random() * 4,
      life: 0, max: 22 + Math.floor(Math.random() * 14),
    };
  }

  function drawSS(s) {
    const a = Math.max(0, 1 - s.life / s.max) * 0.8;
    const len = 7;
    ctx.save();
    ctx.globalAlpha = a;
    const g = ctx.createLinearGradient(s.x, s.y, s.x - s.dx * len, s.y - s.dy * len);
    g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = g; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.shadowBlur = 6; ctx.shadowColor = '#fff';
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x - s.dx * len, s.y - s.dy * len);
    ctx.stroke();
    ctx.restore();
  }

  /* ── Main render loop ───────────────────────── */
  function frame() {
    tick++;
    ctx.clearRect(0, 0, W, H);

    /* nebula */
    NEBULAE.forEach(n => {
      const nx = W * n.ox + Math.sin(tick * n.s + n.d) * 32;
      const ny = H * n.oy + Math.cos(tick * n.s * 0.7 + n.d) * 22;
      const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, n.r);
      g.addColorStop(0, n.c + '1c');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    });

    /* stars */
    STARS.forEach(s => {
      s.tw += s.ts;
      const a = 0.12 + Math.sin(s.tw) * 0.28;
      ctx.save(); ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });

    /* particles */
    PARTS.forEach((p, i) => {
      p.x += p.dx; p.y += p.dy; p.life++;
      if (p.life > p.maxLife) { PARTS[i] = mkParticle(); return; }
      const a = Math.sin(p.life / p.maxLife * Math.PI) * p.a;
      ctx.save(); ctx.globalAlpha = a;
      ctx.fillStyle = p.c; ctx.shadowBlur = 7; ctx.shadowColor = p.c;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });

    /* shooting stars */
    ssTimer++;
    if (ssTimer > 180 + Math.random() * 280 && !ss) { ss = mkSS(); ssTimer = 0; }
    if (ss) {
      drawSS(ss); ss.x += ss.dx; ss.y += ss.dy; ss.life++;
      if (ss.life >= ss.max) ss = null;
    }

    /* lightning */
    bTimer++;
    if (bTimer > 160 + Math.random() * 200 && !bolt) { bolt = mkBolt(); bTimer = 0; }
    if (bolt) {
      drawBolt(bolt); bolt.life++;
      if (bolt.life >= bolt.max) bolt = null;
    }

    requestAnimationFrame(frame);
  }
  frame();
})();
