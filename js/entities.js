// ─────────────────────────────────────────────
// PARTICLE
// ─────────────────────────────────────────────
class Particle {
  constructor(x, y, dx, dy, size, color, life, grav = 0.07) {
    Object.assign(this, { x, y, dx, dy, size, color, life, ml: life, grav });
  }
  update() { this.x += this.dx; this.y += this.dy; this.dy += this.grav; this.life--; }
  draw() {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life / this.ml);
    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function burst(x, y, color, n = 12, spd = 5, life = 25) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = spd * 0.4 + Math.random() * spd;
    particles.push(new Particle(x, y, Math.cos(a) * s, Math.sin(a) * s - 1, 2 + Math.random() * 3, color, life + Math.random() * 12));
  }
}

function bloodBurst(x, y, color) {
  for (let i = 0; i < 20; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 2 + Math.random() * 8;
    particles.push(new Particle(x, y, Math.cos(a) * s, Math.sin(a) * s - 2, 2 + Math.random() * 4, color, 35 + Math.random() * 20, 0.18));
  }
}

// ─────────────────────────────────────────────
// FLOATING DAMAGE NUMBER
// ─────────────────────────────────────────────
class DmgNum {
  constructor(x, y, txt, color, big = false) {
    Object.assign(this, { x, y, txt, color, big, life: 60 });
  }
  update() { this.y -= 1.1; this.life--; }
  draw() {
    ctx.save();
    ctx.globalAlpha = Math.min(1, this.life / 15);
    ctx.font = `900 ${this.big ? 34 : 18}px Segoe UI`;
    ctx.textAlign = 'center';
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 12; ctx.shadowColor = this.color;
    ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
    ctx.strokeText(this.txt, this.x, this.y);
    ctx.fillText(this.txt, this.x, this.y);
    ctx.restore();
  }
}

// ─────────────────────────────────────────────
// PROJECTILE
// ─────────────────────────────────────────────
class Projectile {
  constructor(x, y, dx, dy, color, dmg, owner, size = 8, status = null, statusDur = 0) {
    Object.assign(this, { x, y, dx, dy, color, dmg, owner, size, status, statusDur, active: true });
  }

  update() {
    this.prevX = this.x; this.prevY = this.y;
    this.x += this.dx; this.y += this.dy;

    // Particle tail (denser, with slight spread)
    if (Math.random() < 0.7)
      particles.push(new Particle(this.x, this.y, -this.dx * 0.18 + (Math.random()-0.5)*0.8, -this.dy * 0.18 + (Math.random()-0.5)*0.8, 2 + Math.random()*2, this.color, 12, 0));

    // Out of bounds
    if (this.x < -20 || this.x > W + 20 || this.y < -20 || this.y > H + 20) { this.active = false; return; }

    // Block collision
    const all = [
      ...activeBlocks,
      ...movingPlats.map(p => ({ x: p.x, y: p.y, width: p.w, height: p.h })),
      ...iceWalls.map(w  => ({ x: w.x, y: w.y, width: w.width, height: w.height })),
    ];
    for (const b of all) {
      if (this.x > b.x && this.x < b.x + b.width && this.y > b.y && this.y < b.y + b.height) {
        this.active = false; burst(this.x, this.y, this.color, 6, 3); break;
      }
    }
  }

  draw() {
    // Streak line from previous position
    if (this.prevX !== undefined) {
      ctx.save();
      ctx.strokeStyle = this.color; ctx.lineWidth = this.size * 1.8;
      ctx.globalAlpha = 0.28; ctx.lineCap = 'round';
      ctx.shadowBlur = 8; ctx.shadowColor = this.color;
      ctx.beginPath(); ctx.moveTo(this.prevX, this.prevY); ctx.lineTo(this.x, this.y); ctx.stroke();
      ctx.restore();
    }
    // Main glowing orb
    ctx.save();
    ctx.shadowBlur = 22; ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
    // Bright core
    ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.45;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.size * 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// ─────────────────────────────────────────────
// ICE WALL
// ─────────────────────────────────────────────
class IceWall {
  constructor(x) {
    this.x = x; this.y = H - 110 - 16;
    this.width = 22; this.height = 110;
    this.hp = 40; this.maxHp = 40;
    this.life = 500; this.active = true;
  }
  update() {
    this.life--;
    if (this.life <= 0 || this.hp <= 0) { this.active = false; burst(this.x + 11, this.y + 55, '#93c5fd', 10, 4); }
  }
  draw() {
    ctx.save();
    ctx.shadowBlur = 14; ctx.shadowColor = '#60a5fa';
    ctx.fillStyle   = 'rgba(96,165,250,.2)';
    ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.strokeRect(this.x, this.y, this.width, this.height);
    // HP bar
    ctx.fillStyle = '#1e3a8a'; ctx.fillRect(this.x, this.y - 9, this.width, 5);
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(this.x, this.y - 9, this.width * (this.hp / this.maxHp), 5);
    ctx.restore();
  }
}

// ─────────────────────────────────────────────
// POWER-UP
// ─────────────────────────────────────────────
const PU_TYPES = {
  health: { color: '#22c55e', icon: 'HP',  label: '+30 HP'     },
  mana:   { color: '#6366f1', icon: 'MP',  label: '+50 MP'     },
  damage: { color: '#ef4444', icon: 'ATK', label: 'DMG UP!'    },
  speed:  { color: '#f59e0b', icon: 'SPD', label: 'SPEED UP!'  },
};

class PowerUp {
  constructor(x, y, type) {
    Object.assign(this, { x, y, type, active: true, bob: Math.random() * Math.PI * 2, pulse: 0 });
  }
  get cfg() { return PU_TYPES[this.type]; }

  update(fighters) {
    this.bob   += 0.05;
    this.pulse  = (this.pulse + 0.08) % (Math.PI * 2);
    for (const f of fighters) {
      if (f.dead) continue;
      if (Math.hypot(this.x - (f.x + f.w / 2), this.y - (f.y + f.h / 2)) < 28) {
        this._collect(f); break;
      }
    }
  }

  _collect(f) {
    if (this.type === 'health') f.hp   = Math.min(f.maxHp,   f.hp   + 30);
    if (this.type === 'mana')   f.mana = Math.min(f.maxMana, f.mana + 50);
    if (this.type === 'damage') { f.dmgBoost = 1.5; f.dmgBoostT = 600; }
    if (this.type === 'speed')  { f.spdBoost = 1.5; f.spdBoostT = 480; }
    dmgNums.push(new DmgNum(this.x, this.y - 10, this.cfg.label, this.cfg.color, true));
    burst(this.x, this.y, this.cfg.color, 14, 5);
    snd('powerup');
    this.active = false;
  }

  draw() {
    const by = this.y + Math.sin(this.bob) * 5;
    const r  = 20 + Math.sin(this.pulse) * 2;
    ctx.save();
    ctx.shadowBlur = 18 + Math.sin(this.pulse) * 6;
    ctx.shadowColor = this.cfg.color;
    ctx.fillStyle   = this.cfg.color;
    ctx.beginPath(); ctx.arc(this.x, by, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.font = 'bold 11px Segoe UI'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowBlur = 0;
    ctx.fillText(this.cfg.icon, this.x, by);
    ctx.restore();
  }
}

function spawnConfetti(winColor) {
  const cols = [winColor, '#fbbf24', '#f1f5f9', '#4ade80', '#f87171', '#60a5fa', '#a78bfa'];
  for (let i = 0; i < 80; i++) {
    setTimeout(() => {
      const c = cols[Math.floor(Math.random() * cols.length)];
      particles.push(new Particle(
        Math.random() * W, -10,
        (Math.random() - 0.5) * 4,
        4 + Math.random() * 6,
        3 + Math.random() * 4,
        c, 140 + Math.random() * 70, 0.04
      ));
    }, i * 28);
  }
}

function spawnPowerUp() {
  if (powerUps.length >= 3) return;
  const types = Object.keys(PU_TYPES);
  const type  = types[Math.floor(Math.random() * types.length)];
  const spots = [
    { x: 120 + Math.random() * 80, y: H - 45 },
    { x: W / 2 - 40 + Math.random() * 80, y: H - 45 },
    { x: W - 200 + Math.random() * 80, y: H - 45 },
  ];
  const sp = spots[Math.floor(Math.random() * spots.length)];
  powerUps.push(new PowerUp(sp.x, sp.y, type));
}

// ─────────────────────────────────────────────
// RING  (expanding shockwave)
// ─────────────────────────────────────────────
class Ring {
  constructor(x, y, color, maxR = 120, spd = 5, lw = 2.5) {
    Object.assign(this, { x, y, color, r: 2, maxR, spd, lw, active: true });
  }
  update() { this.r += this.spd; if (this.r >= this.maxR) this.active = false; }
  draw() {
    const t = this.r / this.maxR;
    ctx.save();
    ctx.globalAlpha  = (1 - t) * 0.72;
    ctx.strokeStyle  = this.color;
    ctx.lineWidth    = this.lw * (1 - t * 0.55);
    ctx.shadowBlur   = 14; ctx.shadowColor = this.color;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

function ring(x, y, color, maxR = 120, spd = 5, lw = 2.5) {
  rings.push(new Ring(x, y, color, maxR, spd, lw));
}

// ─────────────────────────────────────────────
// METEOR (Chaos Mode)
// ─────────────────────────────────────────────
class Meteor {
  constructor() { this.x = Math.random() * W; this.y = -30; this.spd = 7 + Math.random() * 7; this.active = true; }

  update(p1, p2) {
    this.y += this.spd;
    if (Math.random() < 0.3)
      particles.push(new Particle(this.x, this.y, (Math.random() - .5) * 2, -Math.random() * 2, 3, '#f97316', 12, 0));
    if (this.y > H + 20) { this.active = false; return; }
    for (const f of [p1, p2]) {
      if (!f.dead && Math.hypot(this.x - (f.x + f.w / 2), this.y - (f.y + f.h / 2)) < 28) {
        f.takeHit({ dmg: 9, stun: 9, knock: 4 }, null, '#f97316');
        burst(this.x, this.y, '#f97316', 10, 5);
        this.active = false; return;
      }
    }
  }

  draw() {
    ctx.save();
    ctx.shadowBlur = 20; ctx.shadowColor = '#f97316';
    ctx.fillStyle  = '#f97316';
    ctx.beginPath(); ctx.arc(this.x, this.y, 11, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}
