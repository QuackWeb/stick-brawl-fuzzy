// ─────────────────────────────────────────────
// FUZZY LOGIC ENGINE — Mamdani Inference System
// ─────────────────────────────────────────────

// Triangular membership function — peaks at b, zero at a and c
function triMF(x, a, b, c) {
  if (x <= a || x >= c) return 0;
  if (x <= b) return (x - a) / (b - a);
  return (c - x) / (c - b);
}

// Trapezoidal membership function — full at [b,c], rises from a, falls to d
function trapMF(x, a, b, c, d) {
  if (x <= a || x >= d) return 0;
  if (x >= b && x <= c) return 1;
  if (x < b) return (x - a) / (b - a);
  return (d - x) / (d - c);
}

// ─────────────────────────────────────────────
// FUZZIFICATION
// Convert crisp inputs → fuzzy membership degrees
// ─────────────────────────────────────────────
//
// Input variables:
//   dist   — pixel distance to opponent (0–700)
//   hp     — AI health ratio (0.0–1.0)
//   mana   — AI mana ratio  (0.0–1.0)
//   threat — incoming projectile danger (0.0–1.0)
//
function fuzzifyAI(dist, hp, mana, threat) {
  return {
    dist: {
      // CLOSE  : fully close below 80px, fades out at 200px
      close:  trapMF(dist,   0,   0,  80, 200),
      // MEDIUM : peaks at 200px, between 80px–350px
      medium: triMF (dist,  80, 200, 350),
      // FAR    : starts rising at 280px, fully far above 400px
      far:    trapMF(dist, 280, 400, 700, 700),
    },
    hp: {
      // LOW    : fully low below 20%, fades to 0 at 35%
      low:    trapMF(hp, 0,    0,    0.20, 0.35),
      // MEDIUM : peaks at 50%, between 25%–72%
      medium: triMF (hp, 0.25, 0.50, 0.72),
      // HIGH   : starts rising at 60%, fully high above 75%
      high:   trapMF(hp, 0.60, 0.75, 1.0,  1.0),
    },
    mana: {
      // LOW    : fully low below 20%, fades to 0 at 35%
      low:    trapMF(mana, 0,    0,    0.20, 0.35),
      // MEDIUM : peaks at 50%, between 25%–72%
      medium: triMF (mana, 0.25, 0.50, 0.72),
      // HIGH   : starts rising at 60%, fully high above 75%
      high:   trapMF(mana, 0.60, 0.75, 1.0,  1.0),
    },
    threat: {
      // NONE     : fully no-threat below 20%, fades to 0 at 40%
      none:     trapMF(threat, 0,    0,    0.20, 0.40),
      // MODERATE : peaks at 50%, between 30%–70%
      moderate: triMF (threat, 0.30, 0.50, 0.70),
      // HIGH     : starts rising at 55%, fully high above 75%
      high:     trapMF(threat, 0.55, 0.75, 1.0,  1.0),
    },
  };
}

// ─────────────────────────────────────────────
// FUZZY RULE BASE
// ─────────────────────────────────────────────
//
// Output space: numeric scale 0–100
//   0–33  → DEFEND
//  34–66  → HARASS
//  67–100 → MELEE
//
// Each rule: f(fuzz) → { w: firing_strength, out: singleton, label }
// Antecedent uses MIN for AND (Mamdani intersection)
//
const FUZZY_RULES = [
  // ── MELEE rules ─────────────────────────────
  // R1: IF dist IS CLOSE AND hp IS HIGH → MELEE RUSH
  f => ({ w: Math.min(f.dist.close,  f.hp.high),               out: 100, label: 'R1: Close + HighHP → MELEE RUSH' }),
  // R2: IF dist IS CLOSE AND hp IS MEDIUM → MELEE
  f => ({ w: Math.min(f.dist.close,  f.hp.medium),             out:  85, label: 'R2: Close + MedHP  → MELEE' }),
  // R3: IF mana IS LOW AND hp IS HIGH → MELEE (conserve mana)
  f => ({ w: Math.min(f.mana.low,    f.hp.high),               out:  80, label: 'R3: LowMana + HighHP → MELEE' }),
  // R4: IF dist IS MEDIUM AND hp IS HIGH AND mana IS LOW → MELEE
  f => ({ w: Math.min(f.dist.medium, f.hp.high, f.mana.low),   out:  75, label: 'R4: Mid + HighHP + LowMana → MELEE' }),

  // ── HARASS rules ────────────────────────────
  // R5: IF dist IS FAR AND mana IS HIGH → RANGED HARASS
  f => ({ w: Math.min(f.dist.far,    f.mana.high),             out:  50, label: 'R5: Far + HighMana → HARASS' }),
  // R6: IF dist IS MEDIUM AND mana IS HIGH AND hp IS HIGH → HARASS
  f => ({ w: Math.min(f.dist.medium, f.mana.high, f.hp.high),  out:  60, label: 'R6: Mid + HighMana + HighHP → HARASS' }),
  // R7: IF threat IS MODERATE AND hp IS MEDIUM → CAUTIOUS HARASS
  f => ({ w: Math.min(f.threat.moderate, f.hp.medium),         out:  45, label: 'R7: ModThreat + MedHP → HARASS' }),

  // ── DEFEND rules ────────────────────────────
  // R8: IF threat IS HIGH → DEFEND
  f => ({ w: f.threat.high,                                    out:   5, label: 'R8: HighThreat → DEFEND' }),
  // R9: IF hp IS LOW → DEFEND
  f => ({ w: f.hp.low,                                         out:  10, label: 'R9: LowHP → DEFEND' }),
  // R10: IF hp IS LOW AND threat IS MODERATE → FULL DEFEND
  f => ({ w: Math.min(f.hp.low, f.threat.moderate),            out:   0, label: 'R10: LowHP + ModThreat → FULL DEFEND' }),
];

// ─────────────────────────────────────────────
// AGGREGATION + DEFUZZIFICATION (COG)
// Centre of Gravity — weighted average of singleton outputs
// ─────────────────────────────────────────────
function defuzzifyCOG(firedRules) {
  let num = 0, den = 0;
  for (const r of firedRules) {
    num += r.w * r.out;
    den += r.w;
  }
  const value = den < 0.001 ? 50 : num / den;   // default: HARASS if no rules fire
  return { value, num, den };
}

// Map crisp output value to action label
function crispToAction(v) {
  if (v < 33) return 'defend';
  if (v < 67) return 'harass';
  return 'melee';
}

// ─────────────────────────────────────────────
// AI MAIN LOOP
// ─────────────────────────────────────────────
let aiTick = 0;

function runAI(ai, opp) {
  aiTick++; if (aiTick % (window._aiDiffMultiplier || 7) !== 0) return;
  if (ai.dead) return;

  // ── Crisp Inputs ─────────────────────────
  const dist   = Math.abs(ai.x - opp.x);
  const aiHp   = ai.hp   / ai.maxHp;
  const aiMana = ai.mana / ai.maxMana;

  // Incoming projectile threat (0–1)
  let threat = 0;
  for (const p of projectiles) {
    if (p.owner !== opp) continue;
    const dx = ai.x - p.x;
    if (((p.dx > 0 && dx > 0) || (p.dx < 0 && dx < 0)) && Math.abs(dx) < 380)
      threat = Math.max(threat, 1 - Math.abs(dx) / 380);
  }

  // ── Fuzzy Inference ──────────────────────
  const fuzz   = fuzzifyAI(dist, aiHp, aiMana, threat);
  const fired  = FUZZY_RULES.map(r => r(fuzz)).filter(r => r.w > 0.01);
  const defy   = defuzzifyCOG(fired);
  const action = crispToAction(defy.value);

  // Store debug state for the fuzzy panel (ui.js reads this)
  ai.fuzzyDebug = {
    inputs:  { dist, hp: aiHp, mana: aiMana, threat },
    fuzz,
    fired,
    value:   defy.value,
    action,
  };

  // ── Obstacle Detection ───────────────────
  const fwdX = ai.x + (ai.facingRight ? ai.w + 8 : -18);
  const fwdY = ai.y + ai.h - 6;
  const allB = [
    ...activeBlocks,
    ...movingPlats.map(p => ({ x: p.x, y: p.y, width: p.w, height: p.h })),
    ...iceWalls.map(w    => ({ x: w.x, y: w.y, width: w.width, height: w.height })),
  ];
  const obsF = allB.some(b =>
    fwdX > b.x && fwdX < b.x + b.width &&
    fwdY > b.y && fwdY < b.y + b.height + 18
  );

  ai.shielding = false;
  let pathDir = 0, doJump = false;

  // ── Execute Defuzzified Action ───────────
  const oppHigher = opp.y < ai.y - 55;   // opponent significantly above AI

  if (action === 'defend') {
    if (threat > 0.6 && Math.random() < 0.2) ai.parryWindow = 12;
    ai.shielding = threat > 0.5;
    pathDir = ai.x < opp.x ? -1 : 1;          // retreat from opponent
    // FIX: only jump when ON GROUND — prevents double-jump spamming upward
    if ((ai.x < 55 || ai.x > W - 95 || obsF) && ai.onGround) doJump = true;
    // Occasionally jump onto a platform to escape when HP very low
    if (aiHp < 0.3 && oppHigher && ai.onGround && Math.random() < 0.25) doJump = true;
    if (aiMana > 0.3 && Math.random() < 0.15) ai.ice();

  } else if (action === 'melee') {
    pathDir = ai.x < opp.x ? 1 : -1;
    if (dist < 68) { ai.melee(); if (Math.random() < 0.2) ai.burstSpell(opp); }
    // Jump when blocked OR when chasing opponent on a higher platform
    if ((obsF || (oppHigher && ai.onGround && Math.random() < 0.55))) doJump = true;
    if (ai.ult >= ai.maxUlt && dist < 300) ai.ultimate(opp);

  } else { // harass
    pathDir = ai.x < opp.x ? 1 : -1;
    if (dist < 210) pathDir = -pathDir;        // maintain ranged distance

    if (ai.ult >= ai.maxUlt && dist < 290) {
      ai.ultimate(opp);
    } else if (aiMana >= 0.5 && Math.random() < 0.22) {
      ai.burstSpell(opp);
    } else {
      if (ai.fireChargeTime > 0) {
        if (Math.random() < 0.1) { ai.fireCharged(ai.fireChargeTime); ai.fireChargeTime = 0; }
        else ai.fireChargeTime++;
      } else {
        ai.fireChargeTime = 1 + Math.floor(Math.random() * 35);
      }
    }

    if (aiHp < 0.25 && aiMana > 0.35) ai.heal();
    // FIX: also jump to reach opponent on higher platforms, not only when blocked
    if (obsF || (oppHigher && ai.onGround && Math.random() < 0.40)) doJump = true;
  }

  // Opportunistic power-up collection
  for (const pu of powerUps) {
    if (!pu.active) continue;
    if (Math.abs(ai.x - pu.x) < 200) { pathDir = ai.x < pu.x ? 1 : -1; break; }
  }

  ai.vx = pathDir * ai.effSpd;
  if (doJump) ai.tryJump();
}
