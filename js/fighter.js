// ─────────────────────────────────────────────
// FIGHTER CLASS
// ─────────────────────────────────────────────
class Fighter {
  constructor(cfg) {
    this.startX = cfg.x; this.startY = cfg.y;
    this.name   = cfg.name || 'Fighter';
    this.isAI   = cfg.isAI || false;
    this.w = 38; this.h = 76;
    this.stats = { dmg: 0, hits: 0, spells: 0, maxCombo: 0, dashes: 0, parries: 0 };
    this.applyChar(cfg);
    this.reset();
  }

  /** Apply a character definition (can be called mid-game for survival spawns) */
  applyChar(c) {
    this.color    = c.color    || '#4f46e5';
    this.accent   = c.accent   || '#818cf8';
    this.charType = c.id       || 'mage';
    this.maxHp    = c.hp       || 100;
    this.spd      = c.spd      || 4.5;
    this.jStr     = c.jStr     || -12;
    this.maxJumps = c.maxJumps || 2;
    this.dashCD_max = c.dashCD || 55;
    this.mDmg     = c.mDmg    || 1;
    this.sDmg     = c.sDmg    || 1;
  }

  get dmgMult()  { return this.dmgBoostT > 0 ? this.dmgBoost : 1; }
  get effSpd()   { return this.spd * (this.spdBoostT > 0 ? this.spdBoost : 1); }

  // ── Reset all runtime state ──────────────────
  reset() {
    this.x = this.startX; this.y = this.startY;
    this.vx = 0; this.vy = 0;
    this.hp   = this.maxHp; this.mana = 100; this.maxMana = 100;
    this.ult  = 0; this.maxUlt = 200;
    this.onGround   = false;
    this.facingRight= this.startX < W / 2;
    this.stun       = 0;
    this.atkCD      = 0;
    this.attacking  = false;
    this.shielding  = false;
    this.parryWindow= 0;
    this.cd = { fire: 0, ice: 0, burst: 0, blink: 0, heal: 0, ult: 0 };
    this.jumpsLeft  = this.maxJumps;
    this.isDashing  = false; this.dashFrames = 0;
    this.dashDir    = 1;     this.dashCD     = 0; this.dashInv = 0;
    this.lastTapDir = 0;     this.lastTapTime= 0;
    this.wallL      = false; this.wallR      = false;
    this.fireChargeTime = 0;
    this.dead       = false; this.deadVx = 0; this.deadVy = 0;
    this.deadAngle  = 0;     this.deadTimer  = 0;
    this.combo      = 0; this.comboTimer = 0; this.airHits = 0;
    this.animFrame  = 0; this.walking    = false;
    // Status effects (frames remaining)
    this.burn  = 0; this.freeze = 0; this.shock = 0;
    this.burnTick = 0; this.shockTick = 0;
    // Temporary boosts
    this.dmgBoost = 1; this.dmgBoostT = 0;
    this.spdBoost = 1; this.spdBoostT = 0;
  }

  // ── Movement helpers ─────────────────────────
  tryJump() {
    if (this.onGround) {
      this.vy = this.jStr; this.onGround = false; this.jumpsLeft = this.maxJumps - 1;
      burst(this.x + this.w / 2, this.y + this.h, '#334155', 4, 2, 10); return;
    }
    if ((this.wallL || this.wallR) && !this.onGround) {
      const dir = this.wallL ? 1 : -1;
      this.vx = dir * this.effSpd * 1.3; this.vy = this.jStr * 0.9;
      this.jumpsLeft = this.maxJumps - 1;
      burst(this.x + this.w / 2, this.y + this.h / 2, this.color, 6, 3); snd('walljump'); return;
    }
    if (this.jumpsLeft > 0) {
      this.vy = this.jStr * 0.82; this.jumpsLeft--;
      burst(this.x + this.w / 2, this.y, '#818cf8', 5, 3);
    }
  }

  tryDash(dir) {
    const now = Date.now();
    if (dir === this.lastTapDir && now - this.lastTapTime < 220 && this.dashCD <= 0) {
      this.isDashing = true; this.dashFrames = 14; this.dashDir = dir;
      this.dashCD = this.dashCD_max; this.dashInv = 9;
      this.vx = dir * 14; this.vy = Math.min(this.vy, 1);
      burst(this.x + this.w / 2, this.y + this.h / 2, this.color, 8, 4); snd('dash');
      this.stats.dashes++;
      totalStats[this === f1 ? 'p1' : 'p2'].dashes++;
    }
    this.lastTapDir = dir; this.lastTapTime = now;
  }

  // ── Take damage ──────────────────────────────
  takeHit(atk, attacker, color) {
    if (this.dead || this.dashInv > 0) return false;
    const dc = color || (attacker ? attacker.color : '#ef4444');

    // Parry
    if (this.parryWindow > 0 && atk.type !== 'ult') {
      this.parryWindow = 0;
      if (attacker) {
        attacker.stun = 30; attacker.vy = -4;
        attacker.hp = Math.max(0, attacker.hp - atk.dmg * 0.7);
        dmgNums.push(new DmgNum(this.x + this.w / 2, this.y - 5, 'PARRY!', '#fbbf24', true));
        burst(this.x + this.w / 2, this.y + this.h / 2, '#fbbf24', 14, 5);
        hitStop = 8; snd('parry');
        this.stats.parries++;
        totalStats[this === f1 ? 'p1' : 'p2'].parries++;
      }
      return false;
    }

    // Shield
    if (this.shielding && atk.type !== 'ult') {
      this.mana = Math.max(0, this.mana - atk.dmg * 0.4);
      burst(this.x + this.w / 2, this.y + this.h / 2, '#60a5fa', 6, 3);
      dmgNums.push(new DmgNum(this.x + this.w / 2, this.y, 'BLOCK', '#60a5fa'));
      snd('block'); return false;
    }

    const d   = Math.min(atk.dmg, this.hp);
    this.hp   = Math.max(0, this.hp - atk.dmg);
    const inAir = !this.onGround;
    this.stun   = inAir ? Math.max(8, atk.stun - 6) : (atk.stun || 15);
    if (inAir) this.airHits++; else this.airHits = 0;
    const dir = attacker ? (attacker.x < this.x ? 1 : -1) : (Math.random() < 0.5 ? 1 : -1);
    this.vx = dir * (atk.knock || 5) * (1 - Math.min(0.4, this.airHits * 0.1));
    this.vy = inAir ? -2 : -3.5;

    bloodBurst(this.x + this.w / 2, this.y + this.h / 2, dc);
    ring(this.x + this.w / 2, this.y + this.h / 2, dc,
      atk.type === 'ult' ? 200 : 70 + atk.dmg * 1.5,
      atk.type === 'ult' ? 8   : 5,
      atk.type === 'ult' ? 4   : 2);
    dmgNums.push(new DmgNum(this.x + this.w / 2, this.y, Math.round(d), dc));

    // Wall splat bonus
    if ((this.x <= 3 || this.x >= W - this.w - 3) && Math.abs(this.vx) > 7) {
      dmgNums.push(new DmgNum(this.x + this.w / 2, this.y - 20, 'WALL!', '#f59e0b', true));
      this.hp = Math.max(0, this.hp - 8);
      burst(this.x + this.w / 2, this.y + this.h / 2, '#f59e0b', 12, 5);
      screenShake = Math.max(screenShake, 12);
    }

    // Apply status effect from attack
    if (atk.status === 'burn')   this.burn   = Math.max(this.burn,   atk.statusDur || 240);
    if (atk.status === 'shock')  this.shock  = Math.max(this.shock,  atk.statusDur || 240);
    if (atk.status === 'freeze') this.freeze = Math.max(this.freeze, atk.statusDur || 200);

    // Stats tracking
    if (attacker) {
      attacker.combo++; attacker.comboTimer = 130;
      attacker.ult = Math.min(attacker.maxUlt, attacker.ult + d * 1.6);
      attacker.stats.dmg += Math.round(d); attacker.stats.hits++;
      if (attacker.combo > attacker.stats.maxCombo) attacker.stats.maxCombo = attacker.combo;
      const sk = this === f1 ? 'p2' : 'p1';
      totalStats[sk].dmg += Math.round(d); totalStats[sk].hits++;
      if (attacker.combo > totalStats[sk].maxCombo) totalStats[sk].maxCombo = attacker.combo;
    }
    this.ult = Math.min(this.maxUlt, this.ult + d * 0.8);
    screenShake = Math.min(15, screenShake + d * 0.35);
    flashAlpha  = Math.min(0.4, flashAlpha + 0.09); flashColor = dc;
    hitStop     = atk.type === 'ult' ? 12 : 4;

    // Death + slow-mo kill cam
    if (this.hp <= 0 && !this.dead) {
      this.dead     = true;
      this.deadVx   = this.vx * 1.8; this.deadVy = -9; this.deadTimer = 90;
      burst(this.x + this.w / 2, this.y + this.h / 2, this.color, 30, 8);
      snd('ko');
      slowMo    = true; slowMoTimer = 150;
      camTFX    = ((this.x + this.w / 2) + (attacker ? attacker.x + attacker.w / 2 : W / 2)) / 2;
      camTFY    = ((this.y + this.h / 2) + (attacker ? attacker.y + attacker.h / 2 : H / 2)) / 2;
      camTZ     = 1.55;
      flashAlpha = 0.7; flashColor = dc;
    }
    return true;
  }

  // ── Spells ───────────────────────────────────
  fireCharged(charge) {
    if (this.cd.fire > 0) return;
    const pw   = Math.min(1, charge / 80);
    const cost = Math.round(18 + pw * 22);
    if (this.mana < cost) return;
    this.mana -= cost; this.cd.fire = Math.round(38 + pw * 30);
    const dmg  = Math.round((10 + pw * 18) * this.sDmg * this.dmgMult);
    const spd  = 9 + pw * 5;
    const size = 7 + pw * 8;
    const px   = this.x + (this.facingRight ? this.w + 8 : -12), py = this.y + 28;
    projectiles.push(new Projectile(px, py, this.facingRight ? spd : -spd, 0, this.color, dmg, this, size, 'burn', 240));
    burst(px, py, this.color, pw > 0.5 ? 14 : 6, pw > 0.5 ? 5 : 3);
    snd(pw > 0.5 ? 'bigfire' : 'fire');
    this.stats.spells++; totalStats[this === f1 ? 'p1' : 'p2'].spells++;
  }

  ice() {
    if (this.mana < 28 || this.cd.ice > 0) return;
    this.mana -= 28; this.cd.ice = 160;
    const wx = this.x + (this.facingRight ? this.w + 10 : -32);
    iceWalls.push(new IceWall(wx));
    burst(wx + 11, H - 130, '#93c5fd', 10, 3);
    this.stats.spells++; totalStats[this === f1 ? 'p1' : 'p2'].spells++;
  }

  burstSpell(target) {
    if (this.mana < 25 || this.cd.burst > 0) return;
    this.mana -= 25; this.cd.burst = 80;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    burst(cx, cy, '#f43f5e', 25, 7);
    if (Math.hypot((target.x + target.w / 2) - cx, (target.y + target.h / 2) - cy) < 130)
      target.takeHit({ dmg: Math.round(18 * this.sDmg * this.dmgMult), stun: 18, knock: 9, type: 'burst' }, this, '#f43f5e');
    snd('fire');
    this.stats.spells++; totalStats[this === f1 ? 'p1' : 'p2'].spells++;
  }

  blink() {
    if (this.mana < 18 || this.cd.blink > 0) return;
    this.mana -= 18; this.cd.blink = 90;
    burst(this.x + this.w / 2, this.y + this.h / 2, '#8b5cf6', 12, 5);
    this.x = Math.max(0, Math.min(W - this.w, this.x + (this.facingRight ? 175 : -175)));
    this.y = Math.max(0, this.y - 15);
    burst(this.x + this.w / 2, this.y + this.h / 2, '#8b5cf6', 12, 5);
    snd('blink');
    this.stats.spells++; totalStats[this === f1 ? 'p1' : 'p2'].spells++;
  }

  heal() {
    if (this.mana < 35 || this.cd.heal > 0) return;
    this.mana -= 35; this.cd.heal = 280;
    const ha = 18;
    this.hp = Math.min(this.maxHp, this.hp + ha);
    // Clear one status
    if      (this.burn  > 0) this.burn  = 0;
    else if (this.freeze > 0) this.freeze = 0;
    else if (this.shock > 0) this.shock  = 0;
    burst(this.x + this.w / 2, this.y + this.h / 2, '#22c55e', 16, 4);
    dmgNums.push(new DmgNum(this.x + this.w / 2, this.y, '+' + ha, '#22c55e', true));
    snd('heal');
    this.stats.spells++; totalStats[this === f1 ? 'p1' : 'p2'].spells++;
  }

  ultimate(target) {
    if (this.ult < this.maxUlt || this.cd.ult > 0) return;
    this.ult = 0; this.cd.ult = 60;
    snd('ult');
    this.stats.spells++; totalStats[this === f1 ? 'p1' : 'p2'].spells++;

    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    const ultNames = { mage: 'ARCANE NOVA!!', brawler: 'GROUND SLAM!!', ninja: 'SHADOW RUSH!!' };
    dmgNums.push(new DmgNum(W / 2, H / 2 - 20, ultNames[this.charType] || 'ULTIMATE!!', this.color, true));

    switch (this.charType) {

      case 'mage': {
        // Arcane Nova — 8 magic bolts radiate in all directions
        burst(cx, cy, this.color, 55, 11, 58);
        ring(cx, cy, this.color, 300, 13, 5);
        ring(cx, cy, '#fff',     190, 20, 2.5);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          projectiles.push(new Projectile(cx, cy, Math.cos(a) * 9, Math.sin(a) * 9,
            this.color, Math.round(18 * this.sDmg * this.dmgMult), this, 9, 'shock', 180));
        }
        break;
      }

      case 'brawler': {
        // Ground Slam — massive shockwave from ground level
        burst(cx, H - 16, this.color, 60, 14, 58);
        ring(cx, H - 16, this.color, 480, 18, 5);
        ring(cx, H - 16, '#f87171', 310, 26, 3);
        screenShake = Math.max(screenShake, 24);
        flashAlpha  = Math.min(0.55, flashAlpha + 0.3); flashColor = this.color;
        const dSlam = Math.abs(target.x + target.w / 2 - cx);
        if (dSlam < 440 && Math.abs(target.y - this.y) < 220)
          target.takeHit({ dmg: 40, stun: 62, knock: 26, type: 'ult' }, this, this.color);
        break;
      }

      case 'ninja': {
        // Shadow Rush — teleport to target + 3 rapid strikes
        burst(cx, cy, this.color, 16, 6, 30);
        const tx = target.x + (this.x < target.x ? -this.w - 6 : target.w + 6);
        this.x = Math.max(0, Math.min(W - this.w, tx));
        this.y = target.y;
        burst(this.x + this.w / 2, cy, this.color, 22, 9, 38);
        ring(this.x + this.w / 2, cy, this.color, 130, 9, 3);
        const self = this;
        [0, 130, 260].forEach((delay, i) => {
          setTimeout(() => {
            if (target.dead || gamePhase !== 'fight') return;
            target.takeHit({ dmg: Math.round([9, 11, 15][i] * self.sDmg * self.dmgMult), stun: 14, knock: 7, type: 'ult' }, self, self.color);
            burst(target.x + target.w / 2, target.y + target.h / 2, self.color, 10, 5, 22);
          }, delay);
        });
        break;
      }

      default: {
        burst(cx, cy, this.color, 70, 12, 60);
        ring(cx, cy, this.color, 320, 12, 5);
        ring(cx, cy, '#fff', 200, 18, 2.5);
        if (Math.hypot((target.x + target.w / 2) - cx, (target.y + target.h / 2) - cy) < 320)
          target.takeHit({ dmg: 32, stun: 50, knock: 15, type: 'ult' }, this, this.color);
      }
    }
  }

  melee() {
    if (this.atkCD > 0) return;
    this.attacking = true; this.atkCD = 22; snd('punch');
    setTimeout(() => this.attacking = false, 110);
  }

  // ── Physics update ───────────────────────────
  update(opp) {
    this.animFrame++;

    // Death animation
    if (this.dead) {
      this.deadAngle += 0.22 + Math.abs(this.deadVx) * 0.01;
      this.deadVy += 0.45;
      this.x += this.deadVx; this.y += this.deadVy;
      this.deadVx *= 0.96; this.deadTimer--; return;
    }

    // Cooldown ticks
    if (this.atkCD > 0)      this.atkCD--;
    if (this.stun > 0)       this.stun--;
    if (this.parryWindow > 0)this.parryWindow--;
    if (this.comboTimer > 0) this.comboTimer--; else this.combo = 0;
    if (this.dashCD > 0)     this.dashCD--;
    if (this.dashInv > 0)    this.dashInv--;
    Object.keys(this.cd).forEach(k => { if (this.cd[k] > 0) this.cd[k]--; });
    if (this.dmgBoostT > 0)  this.dmgBoostT--;
    if (this.spdBoostT > 0)  this.spdBoostT--;

    this.mana = Math.min(this.maxMana, this.mana + (this.shielding ? 0.42 : 0.18));
    this.ult  = Math.min(this.maxUlt, this.ult + 0.07);

    if (this.isDashing) { this.dashFrames--; if (this.dashFrames <= 0) { this.isDashing = false; this.vx *= 0.3; } }

    // ── Status effect ticks ──────────────────
    if (this.burn > 0) {
      this.burn--; this.burnTick++;
      if (this.burnTick % 40 === 0) { this.hp = Math.max(0, this.hp - 3); dmgNums.push(new DmgNum(this.x + this.w / 2, this.y, 'BURN', '#f97316')); }
      if (Math.random() < 0.25) particles.push(new Particle(this.x + Math.random() * this.w, this.y + Math.random() * this.h, (Math.random() - .5) * 1.5, -2 - Math.random() * 2, 3, '#f97316', 18, -0.05));
      if (this.hp <= 0 && !this.dead) { this.dead = true; this.deadVx = this.vx * 1.5; this.deadVy = -8; this.deadTimer = 90; snd('ko'); slowMo = true; slowMoTimer = 55; camTZ = 1.45; camTFX = this.x + this.w / 2; camTFY = this.y + this.h / 2; flashAlpha = 0.4; flashColor = '#f97316'; }
    }
    if (this.freeze > 0) {
      this.freeze--;
      if (Math.random() < 0.08) particles.push(new Particle(this.x + Math.random() * this.w, this.y + Math.random() * this.h, (Math.random() - .5), Math.random() - .5, 2, '#93c5fd', 20, 0.02));
    }
    if (this.shock > 0) {
      this.shock--; this.shockTick++;
      if (this.shockTick % 30 === 0) { this.mana = Math.max(0, this.mana - 5); dmgNums.push(new DmgNum(this.x + this.w / 2, this.y, 'SHOCK', '#a78bfa')); }
      if (Math.random() < 0.15) particles.push(new Particle(this.x + (Math.random() - .5) * 20, this.y + (Math.random() - .5) * 30, (Math.random() - .5) * 4, -Math.random() * 3, 2, '#fbbf24', 12, 0));
    }
    // Ice wall proximity freeze
    for (const w of iceWalls)
      if (Math.abs(this.x + this.w / 2 - (w.x + w.width / 2)) < 60 && Math.abs(this.y + this.h / 2 - (w.y + w.height / 2)) < 90)
        if (this.freeze < 30) this.freeze = 30;

    // ── Physics ──────────────────────────────
    const wasOnGround = this.onGround;
    const prevVy = this.vy;
    this.vy += GRAV; if (this.vy > TVEL) this.vy = TVEL;
    this.x  += this.vx; this.y += this.vy;
    this.walking = Math.abs(this.vx) > 0.5;
    const friction = this.freeze > 0 ? 0.65 : this.onGround ? 0.78 : 0.95;
    this.vx *= friction;

    // Reset flags
    this.wallL = false; this.wallR = false; this.onGround = false;

    // Floor
    if (this.y + this.h >= H - 16) { this.y = H - 16 - this.h; this.vy = 0; this.onGround = true; this.jumpsLeft = this.maxJumps; this.airHits = 0; }
    // Side walls
    if (this.x < 0) { this.x = 0; this.vx = 0; }
    else if (this.x + this.w > W) { this.x = W - this.w; this.vx = 0; }
    // Canvas edge wall detection
    if (this.x <= 2 && !this.onGround)          this.wallL = true;
    if (this.x >= W - this.w - 2 && !this.onGround) this.wallR = true;

    // Block collisions
    const allB = [
      ...activeBlocks,
      ...movingPlats.map(p => ({ x: p.x, y: p.y, width: p.w, height: p.h })),
      ...iceWalls.map(w    => ({ x: w.x, y: w.y, width: w.width, height: w.height })),
    ];
    for (const b of allB) this._resolveBlock(b);

    // Hard landing — ring + dust
    if (!wasOnGround && this.onGround && prevVy > 5) {
      const intensity = Math.min(1, (prevVy - 5) / 8);
      const lcx = this.x + this.w / 2, lcy = this.y + this.h;
      ring(lcx, lcy, this.color, 45 + intensity * 80, 3.5 + intensity * 3, 2);
      for (let i = 0; i < Math.round(3 + intensity * 6); i++) {
        const a = Math.PI + (Math.random() - 0.5) * Math.PI * 0.8;
        particles.push(new Particle(lcx, lcy, Math.cos(a) * (1.5 + Math.random() * 3.5), Math.sin(a) * (1 + Math.random() * 2) - 0.5, 1.5 + Math.random(), '#64748b', 20 + Math.random() * 12, 0.1));
      }
    }

    // Hazard damage ('electric' & 'lava_deco' are decorative — no damage)
    for (const hz of MAPS[mapIdx].hazards) {
      if (hz.type === 'electric' || hz.type === 'lava_deco') continue;
      if (this.x + this.w > hz.x && this.x < hz.x + hz.w && this.y + this.h > hz.y && this.y < hz.y + hz.h) {
        this.hp = Math.max(0, this.hp - 1.8); this.vy = -4;
        const hzCol = hz.type === 'lava' ? '#f97316' : '#94a3b8';
        burst(this.x + this.w / 2, this.y + this.h / 2, hzCol, 3, 3, 8);
        if (this.hp <= 0 && !this.dead) { this.dead = true; this.deadVx = this.vx; this.deadVy = -8; this.deadTimer = 90; snd('ko'); }
      }
    }

    if (this.stun <= 0 && opp) this.facingRight = this.x < opp.x;
  }

  _resolveBlock(b) {
    const fl = this.x, fr = this.x + this.w, ft = this.y, fb = this.y + this.h;
    const bl = b.x, br = b.x + b.width, bt = b.y, bb = b.y + b.height;
    if (fr > bl && fl < br && fb > bt && ft < bb) {
      const ox = Math.min(fr - bl, br - fl), oy = Math.min(fb - bt, bb - ft);
      if (ox < oy) {
        if (fr - bl < br - fl) { this.x -= ox; this.wallR = true; }
        else                   { this.x += ox; this.wallL = true; }
        this.vx = 0;
      } else {
        if (fb - bt < bb - ft) {
          // One-way platform: only land when moving DOWN (vy >= 0).
          // While moving up (vy < 0), character passes through — allows double-jump access.
          if (this.vy >= 0) { this.y -= oy; this.vy = 0; this.onGround = true; this.jumpsLeft = this.maxJumps; this.airHits = 0; }
        } else {
          this.y += oy; this.vy = 0.5;
        }
      }
    }
  }

  // ── Rendering ────────────────────────────────
  draw() {
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    ctx.save(); ctx.translate(cx, cy);

    if (this.dead) {
      ctx.rotate(this.deadAngle);
      ctx.globalAlpha = Math.max(0, this.deadTimer / 90);
    } else if (this.stun > 0 && Math.floor(this.animFrame / 3) % 2 === 0) {
      ctx.globalAlpha = 0.3;
    }
    if (this.dashInv > 0) ctx.globalAlpha = 0.55;

    const top = -this.h / 2; // = -38

    // ── Status auras (drawn behind body) ────
    if (!this.dead) {
      if (this.burn > 0)   { ctx.save(); ctx.globalAlpha = 0.3 + Math.sin(this.animFrame * 0.15) * 0.1; ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.arc(0, top + 36, 42, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      if (this.freeze > 0) {
        ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#93c5fd'; ctx.beginPath(); ctx.arc(0, top + 36, 42, 0, Math.PI * 2); ctx.fill();
        for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + this.animFrame * 0.02; ctx.globalAlpha = 0.8; ctx.fillStyle = '#bfdbfe'; ctx.beginPath(); ctx.arc(Math.cos(a) * 32, top + 36 + Math.sin(a) * 22, 4, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      }
      if (this.shock > 0)  { ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(0, top + 36, 42, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      if (this.dmgBoostT > 0) { ctx.save(); ctx.globalAlpha = 0.4 + Math.sin(this.animFrame * 0.2) * 0.2; ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, top + 36, 50, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
      if (this.spdBoostT > 0) { ctx.save(); ctx.globalAlpha = 0.4 + Math.sin(this.animFrame * 0.2) * 0.2; ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(0, top + 36, 50, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    }

    // ── Head ─────────────────────────────────
    ctx.shadowBlur = this.shielding ? 22 : 6; ctx.shadowColor = this.color;
    ctx.strokeStyle = this.color; ctx.lineWidth = 3; ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.arc(0, top + 14, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0; ctx.fillStyle = this.shielding ? '#60a5fa' : this.accent;
    const eo = this.facingRight ? 1 : -1;
    ctx.beginPath(); ctx.arc(eo * 4, top + 12, 2.5, 0, Math.PI * 2); ctx.arc(eo * 9, top + 12, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 5; ctx.shadowColor = this.color;

    // ── Body ─────────────────────────────────
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, top + 27); ctx.lineTo(0, top + 52); ctx.stroke();

    // ── Arms ─────────────────────────────────
    const dir = this.facingRight ? 1 : -1;
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2.2;
    ctx.beginPath();
    if      (this.attacking) { ctx.moveTo(0, top + 32); ctx.lineTo(dir * 30, top + 18); ctx.lineTo(dir * 44, top + 6); }
    else if (this.shielding) { ctx.moveTo(0, top + 32); ctx.lineTo(dir * 24, top + 28); ctx.lineTo(dir * 28, top + 20); }
    else                     { ctx.moveTo(0, top + 32); ctx.lineTo(dir * 14, top + 37); ctx.lineTo(dir * 19, top + 48); }
    ctx.stroke();

    // Charge-fire orb
    if (this.fireChargeTime > 0) { ctx.shadowBlur = 16; ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(dir * 22, top + 14, 3 + Math.min(10, this.fireChargeTime / 8), 0, Math.PI * 2); ctx.fill(); }

    // ── Legs (animated walk) ─────────────────
    const sw = Math.sin(this.animFrame * 0.22) * (this.walking ? 12 : 0);
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, top + 52); ctx.lineTo(-10 - sw, top + 76); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, top + 52); ctx.lineTo( 10 + sw, top + 76); ctx.stroke();

    // ── Staff ────────────────────────────────
    ctx.strokeStyle = this.color; ctx.lineWidth = 3.5; ctx.shadowBlur = 10;
    const tx  = this.attacking ? dir * 46 : dir * 26;
    const ty_ = this.attacking ? top +  4 : top + 13;
    const bx_ = this.attacking ? dir * 22 : dir * 14;
    const by_ = this.attacking ? top + 26 : top + 47;
    ctx.beginPath(); ctx.moveTo(bx_, by_); ctx.lineTo(tx, ty_); ctx.stroke();
    ctx.shadowBlur = 20; ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.arc(tx, ty_, 7, 0, Math.PI * 2); ctx.fill();

    // ── Slash arc (melee attack glow) ────────
    if (this.attacking) {
      const arcCX = dir * 10, arcCY = top + 20;
      const arcR  = 50;
      const arcS  = this.facingRight ? -Math.PI * 0.33 : Math.PI * 0.67;
      const arcE  = this.facingRight ?  Math.PI * 0.33 : Math.PI * 1.33;
      ctx.save();
      ctx.globalAlpha = 0.70;
      ctx.strokeStyle = this.color; ctx.lineWidth = 5;
      ctx.shadowBlur  = 26; ctx.shadowColor = this.color; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(arcCX, arcCY, arcR, arcS, arcE); ctx.stroke();
      ctx.globalAlpha = 0.28; ctx.lineWidth = 11;
      ctx.beginPath(); ctx.arc(arcCX, arcCY, arcR, arcS, arcE); ctx.stroke();
      ctx.restore();
    }

    // ── Shield dome ──────────────────────────
    if (this.shielding) {
      ctx.globalAlpha = (ctx.globalAlpha || 1) * 0.4;
      ctx.fillStyle = this.color + '25'; ctx.strokeStyle = this.color; ctx.lineWidth = 2; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(0, top + 36, 52, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    if (this.parryWindow > 0) { ctx.globalAlpha = this.parryWindow / 12 * 0.6; ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(0, top + 36, 55, 0, Math.PI * 2); ctx.fill(); }

    // ── Dash trail ───────────────────────────
    if (this.isDashing) for (let i = 1; i <= 3; i++) {
      ctx.save(); ctx.globalAlpha = 0.15 * i; ctx.translate(-this.dashDir * i * 12, 0);
      ctx.strokeStyle = this.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, top + 27); ctx.lineTo(0, top + 52); ctx.stroke();
      ctx.restore();
    }

    ctx.restore();

    // ── ULT ready glow (world-space) ─────────
    if (this.ult >= this.maxUlt && !this.dead) {
      ctx.save(); ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.007) * 0.3;
      ctx.strokeStyle = this.color; ctx.lineWidth = 3; ctx.shadowBlur = 24; ctx.shadowColor = this.color;
      ctx.beginPath(); ctx.arc(cx, cy, 58, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }

    // ── Combo label ──────────────────────────
    if (this.combo >= 2 && this.comboTimer > 0) {
      ctx.save();
      ctx.font = `900 ${11 + this.combo}px Segoe UI`; ctx.textAlign = 'center';
      ctx.fillStyle = `hsl(${30 + this.combo * 6},100%,60%)`; ctx.shadowBlur = 12; ctx.shadowColor = ctx.fillStyle;
      ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
      ctx.strokeText(`${this.combo}x COMBO!`, cx, this.y - 14);
      ctx.fillText(`${this.combo}x COMBO!`, cx, this.y - 14);
      ctx.restore();
    }
  }
}
