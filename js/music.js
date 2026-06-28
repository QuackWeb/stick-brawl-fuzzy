/* ═══════════════════════════════════════════════
   STICK BRAWL — Procedural Music (Web Audio API)
   Themes: intro · menu/charselect · battle ×3
═══════════════════════════════════════════════ */
const MU = (() => {
  'use strict';

  let AC = null, master = null;
  let _nodes = [], _timers = [], _looping = false;

  /* Note frequencies ──────────────────────── */
  const F = {
    A1:55,   C2:65.4, E2:82.4, F2:87.3, G2:98,
    A2:110,  Bb2:116.5, B2:123.5, C3:130.8, E3:164.8, G3:196,
    A3:220,  C4:261.6, D4:293.7, Ds4:311.1, E4:329.6, G4:392,
    As4:466.2, B4:493.9,
    A4:440,  C5:523.3, D5:587.3, Ds5:622.3, E5:659.3,
    G5:784,  As5:932.3, A5:880,
  };

  /* ── Core ───────────────────────────────── */
  function boot() {
    if (AC) return;
    AC = new (window.AudioContext || window.webkitAudioContext)();
    const cmp = AC.createDynamicsCompressor();
    cmp.threshold.value = -14; cmp.ratio.value = 5;
    cmp.attack.value = 0.003; cmp.release.value = 0.22;
    master = AC.createGain(); master.gain.value = 0;
    master.connect(cmp); cmp.connect(AC.destination);
  }

  function resume() { if (AC && AC.state === 'suspended') AC.resume(); }

  function fade(v, dur) {
    if (!master) return;
    master.gain.cancelScheduledValues(AC.currentTime);
    master.gain.setValueAtTime(master.gain.value, AC.currentTime);
    master.gain.linearRampToValueAtTime(Math.max(0, v), AC.currentTime + dur);
  }

  /* ── Audio primitives ───────────────────── */
  function mkReverb(secs, decay) {
    const len = Math.floor(AC.sampleRate * secs);
    const buf = AC.createBuffer(2, len, AC.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++)
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    const cv = AC.createConvolver(); cv.buffer = buf; return cv;
  }

  function note(freq, t, dur, gain, type, dest) {
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    const att = Math.min(0.018, dur * 0.1), rel = Math.min(0.12, dur * 0.25);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + att);
    g.gain.setValueAtTime(gain, t + dur - rel);
    g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
    o.connect(g); g.connect(dest || master);
    o.start(t); o.stop(t + dur + 0.05); _nodes.push(o, g);
  }

  function noiseBuf(dur) {
    const len = Math.floor(AC.sampleRate * dur);
    const buf = AC.createBuffer(1, len, AC.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function kick(t, dest) {
    const o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(28, t + 0.3);
    g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(1e-4, t + 0.32);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.35); _nodes.push(o, g);
  }

  function snare(t, dest) {
    const src = AC.createBufferSource(), hp = AC.createBiquadFilter(), g = AC.createGain();
    hp.type = 'highpass'; hp.frequency.value = 1500; src.buffer = noiseBuf(0.14);
    g.gain.setValueAtTime(0.45, t); g.gain.exponentialRampToValueAtTime(1e-4, t + 0.14);
    src.connect(hp); hp.connect(g); g.connect(dest);
    src.start(t); src.stop(t + 0.16); _nodes.push(src, hp, g);
  }

  function hihat(t, gain, dest) {
    const src = AC.createBufferSource(), hp = AC.createBiquadFilter(), g = AC.createGain();
    hp.type = 'highpass'; hp.frequency.value = 7000; src.buffer = noiseBuf(0.04);
    g.gain.setValueAtTime(gain * 0.18, t); g.gain.exponentialRampToValueAtTime(1e-4, t + 0.04);
    src.connect(hp); hp.connect(g); g.connect(dest);
    src.start(t); src.stop(t + 0.05); _nodes.push(src, hp, g);
  }

  /* Helper: start a looping scheduler */
  function startLoop(fn, loopDur) {
    function tick(t0) {
      if (!_looping) return;
      fn(t0);
      const wait = Math.max(0, (t0 + loopDur - 0.2 - AC.currentTime) * 1000);
      _timers.push(setTimeout(() => tick(t0 + loopDur), wait));
    }
    tick(AC.currentTime + 0.06);
  }

  /* ══════════════════════════════════════════
     INTRO THEME — cinematic build
  ══════════════════════════════════════════ */
  function playIntro() {
    boot(); resume();
    const t0 = AC.currentTime + 0.05;

    const rv = mkReverb(2.5, 2), rvG = AC.createGain(); rvG.gain.value = 0.28;
    rv.connect(rvG); rvG.connect(master);
    const wet = AC.createGain(); wet.gain.value = 0.95;
    wet.connect(master); wet.connect(rv); _nodes.push(rv, rvG, wet);

    // Sub drone A1
    const drn = AC.createOscillator(), drnG = AC.createGain();
    drn.type = 'sine'; drn.frequency.value = 55;
    drnG.gain.setValueAtTime(0, t0); drnG.gain.linearRampToValueAtTime(0.20, t0 + 1.8);
    drn.connect(drnG); drnG.connect(wet); drn.start(t0); drn.stop(t0 + 90); _nodes.push(drn, drnG);

    // Am pad
    const pF = AC.createBiquadFilter(); pF.type = 'lowpass'; pF.frequency.value = 340; pF.Q.value = 2.5;
    pF.connect(wet); _nodes.push(pF);
    [F.A2, F.C3, F.E3, F.A3].forEach((f, i) => {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = i * 5 - 7;
      g.gain.setValueAtTime(0, t0 + 0.5); g.gain.linearRampToValueAtTime(0.06, t0 + 2.2);
      o.connect(g); g.connect(pF); o.start(t0 + 0.5); o.stop(t0 + 90); _nodes.push(o, g);
    });

    // Rising arp → title slam at ~2.05s
    [[F.A3,1.05],[F.C4,1.27],[F.E4,1.49],[F.A4,1.71],[F.C5,1.90],[F.E5,2.05]]
      .forEach(([f, dt]) => note(f, t0 + dt, 0.28, 0.12, 'triangle', wet));

    const sT = t0 + 2.05;
    [F.A2, F.E3, F.A3, F.E4].forEach((f, i) =>
      note(f, sT, 1.8 - i * 0.28, 0.16 / (i * 0.6 + 1), 'sine', wet));
    const nSrc = AC.createBufferSource(), nG = AC.createGain();
    nSrc.buffer = noiseBuf(0.06); nG.gain.setValueAtTime(0.35, sT); nG.gain.exponentialRampToValueAtTime(1e-4, sT + 0.06);
    nSrc.connect(nG); nG.connect(wet); nSrc.start(sT); nSrc.stop(sT + 0.08); _nodes.push(nSrc, nG);

    [[F.A5,2.15,0.65],[F.E5,2.33,0.50],[F.C5,2.50,0.38]]
      .forEach(([f, dt, d]) => note(f, t0 + dt, d, 0.055, 'sine', wet));

    // Ambient arp loop (12 reps ≈ 30s)
    const la = [F.A3, F.C4, F.E4, F.A4, F.G4, F.E4, F.C4];
    for (let r = 0; r < 12; r++)
      la.forEach((f, i) => note(f, t0 + 3.6 + (r * la.length + i) * 0.36, 0.22, 0.065, 'triangle', wet));

    fade(0.50, 1.0);
  }

  /* ══════════════════════════════════════════
     MENU / CHAR-SELECT — 120 BPM electronic
     Buses created ONCE; only notes re-schedule
  ══════════════════════════════════════════ */
  function playMenu() {
    boot(); resume(); _looping = true;

    const beat = 0.5, bar = 2.0, bars = 4;

    const rv = mkReverb(1.2, 3.5), rvG = AC.createGain(); rvG.gain.value = 0.11;
    rv.connect(rvG); rvG.connect(master);
    const dG = AC.createGain(); dG.gain.value = 0.68; dG.connect(master);
    const bF = AC.createBiquadFilter(); bF.type = 'lowpass'; bF.frequency.value = 400;
    const bG = AC.createGain(); bG.gain.value = 0.50; bG.connect(bF); bF.connect(master);
    const aF = AC.createBiquadFilter(); aF.type = 'bandpass'; aF.frequency.value = 1400; aF.Q.value = 0.8;
    const aG = AC.createGain(); aG.gain.value = 0.36; aG.connect(aF); aF.connect(master); aF.connect(rv);
    const lG = AC.createGain(); lG.gain.value = 0.32; lG.connect(master); lG.connect(rv);
    _nodes.push(rv, rvG, dG, bF, bG, aF, aG, lG);

    const leadA = [[0,F.A4,beat,0.30],[beat,F.C5,beat*.5,0.27],[beat*1.5,F.E5,beat*1.8,0.30],[beat*3.5,F.D5,beat*.5,0.22]];
    const leadB = [[0,F.E5,beat,0.28],[beat,F.D5,beat*.5,0.25],[beat*1.5,F.C5,beat,0.27],[beat*2.5,F.A4,beat*1.5,0.25]];
    const bassM = [[0,F.A2,beat*.78,0.62],[beat*1.75,F.A2,beat*.35,0.44],[beat*2,F.E2,beat*.78,0.58],[beat*3,F.G3,beat*.78,0.54]];
    const arpM  = [F.A4,F.C5,F.E5,F.A5,F.G5,F.E5,F.C5,F.A4];

    startLoop(t0 => {
      for (let b = 0; b < bars; b++) {
        const bt = t0 + b * bar;
        kick(bt, dG); kick(bt + beat*2, dG);
        snare(bt + beat, dG); snare(bt + beat*3, dG);
        for (let h = 0; h < 8; h++) hihat(bt + h*beat*.5, h%2===0?1:.5, dG);
        bassM.forEach(([off,f,d,g]) => note(f, bt+off, d, g, 'sawtooth', bG));
        arpM.forEach((f,i) => note(f, bt+i*beat*.5, beat*.36, 0.16, 'square', aG));
        (b%2===0?leadA:leadB).forEach(([off,f,d,g]) => note(f, bt+off, d, g, 'triangle', lG));
      }
    }, bars * bar);

    fade(0.44, 1.4);
  }

  /* ══════════════════════════════════════════
     BATTLE: NEON ARENA (map 0)
     Cyberpunk · 140 BPM · Tight & Aggressive
     Cm pentatonic, dry punchy, no reverb
  ══════════════════════════════════════════ */
  function playBattleNeon() {
    boot(); resume(); _looping = true;

    const beat = 60/140, bar = beat*4, bars = 4;

    const dG = AC.createGain(); dG.gain.value = 0.75; dG.connect(master);
    const bF = AC.createBiquadFilter(); bF.type = 'lowpass'; bF.frequency.value = 500;
    const bG = AC.createGain(); bG.gain.value = 0.60; bG.connect(bF); bF.connect(master);
    const aF = AC.createBiquadFilter(); aF.type = 'bandpass'; aF.frequency.value = 1900; aF.Q.value = 1.2;
    const aG = AC.createGain(); aG.gain.value = 0.40; aG.connect(aF); aF.connect(master);
    const lG = AC.createGain(); lG.gain.value = 0.30; lG.connect(master);
    _nodes.push(dG, bF, bG, aF, aG, lG);

    // Cm pentatonic: C Eb G Bb
    const bassN = [
      [0, F.C2, beat*.75, 0.68], [beat*.75, F.C2, beat*.4, 0.45],
      [beat, F.G2, beat*.4, 0.50], [beat*1.5, F.Bb2, beat*.75, 0.62],
      [beat*2, F.C2, beat*.75, 0.65], [beat*3, F.F2, beat*.4, 0.48],
      [beat*3.5, F.G2, beat*.4, 0.50],
    ];
    const arpN  = [F.C5, F.Ds5, F.G5, F.As5, F.G5, F.Ds5, F.C5, F.As4];
    const leadN  = [[0,F.C5,beat,0.28],[beat,F.Ds5,beat*.5,0.25],[beat*1.5,F.G5,beat*1.5,0.28],[beat*3,F.As5,beat,0.24]];
    const leadN2 = [[0,F.G5,beat,0.26],[beat,F.Ds5,beat*.5,0.23],[beat*1.5,F.C5,beat,0.26],[beat*2.5,F.As4,beat*1.5,0.24]];

    startLoop(t0 => {
      for (let b = 0; b < bars; b++) {
        const bt = t0 + b*bar;
        for (let k = 0; k < 4; k++) kick(bt + k*beat, dG); // kick every beat
        snare(bt + beat, dG); snare(bt + beat*3, dG);
        for (let h = 0; h < 8; h++) hihat(bt + h*beat*.5, 1, dG);
        bassN.forEach(([off,f,d,g]) => note(f, bt+off, d, g, 'sawtooth', bG));
        arpN.forEach((f,i) => note(f, bt+i*beat*.5, beat*.28, 0.17, 'square', aG));
        (b%2===0?leadN:leadN2).forEach(([off,f,d,g]) => note(f, bt+off, d, g, 'triangle', lG));
      }
    }, bars * bar);

    fade(0.38, 0.8);
  }

  /* ══════════════════════════════════════════
     BATTLE: STORM PEAK (map 1)
     Dark Storm · 105 BPM · Heavy & Ominous
     Am, deep reverb, thunder bursts, slow grind
  ══════════════════════════════════════════ */
  function playBattleStorm() {
    boot(); resume(); _looping = true;

    const beat = 60/105, bar = beat*4, bars = 4;

    const rv = mkReverb(2.8, 1.5), rvG = AC.createGain(); rvG.gain.value = 0.42;
    rv.connect(rvG); rvG.connect(master);
    const dG = AC.createGain(); dG.gain.value = 0.78; dG.connect(master); dG.connect(rv);
    const bF = AC.createBiquadFilter(); bF.type = 'lowpass'; bF.frequency.value = 260;
    const bG = AC.createGain(); bG.gain.value = 0.65; bG.connect(bF); bF.connect(master);
    const aF = AC.createBiquadFilter(); aF.type = 'lowpass'; aF.frequency.value = 700;
    const aG = AC.createGain(); aG.gain.value = 0.30; aG.connect(aF); aF.connect(master); aF.connect(rv);
    _nodes.push(rv, rvG, dG, bF, bG, aF, aG);

    // Deep Am bass (A1 sub)
    const bassS = [
      [0,      F.A1, beat*1.8, 0.74], [beat*2, F.E2, beat*.9, 0.60], [beat*3, F.G2, beat*.9, 0.55],
    ];
    // Dark Am arpeggio — slow, haunting
    const arpS = [F.A3, F.C4, F.E4, F.G4, F.E4, F.C4];

    // Thunder = low-pass noise burst
    function thunder(t) {
      const src = AC.createBufferSource(), lp = AC.createBiquadFilter(), g = AC.createGain();
      lp.type = 'lowpass'; lp.frequency.value = 280; src.buffer = noiseBuf(0.7);
      g.gain.setValueAtTime(0.55, t); g.gain.exponentialRampToValueAtTime(1e-4, t + 0.7);
      src.connect(lp); lp.connect(g); g.connect(dG); src.start(t); src.stop(t + 0.75);
      _nodes.push(src, lp, g);
    }

    startLoop(t0 => {
      for (let b = 0; b < bars; b++) {
        const bt = t0 + b*bar;
        kick(bt, dG); kick(bt + beat*2, dG);
        snare(bt + beat, dG); snare(bt + beat*3, dG);
        for (let h = 0; h < 4; h++) hihat(bt + h*beat, 0.55, dG); // sparse hihats
        bassS.forEach(([off,f,d,g]) => note(f, bt+off, d, g, 'sine', bG));
        arpS.forEach((f,i) => note(f, bt + i*beat*.65, beat*.55, 0.13, 'triangle', aG));
        if (b === 1) thunder(bt + beat*2); // thunder mid-loop
        if (b === 3) thunder(bt);          // thunder start of last bar
      }
    }, bars * bar);

    fade(0.40, 1.0);
  }

  /* ══════════════════════════════════════════
     BATTLE: VOLCANIC TEMPLE (map 2)
     Epic Fire · 130 BPM · Tribal & Intense
     Em, double kicks, lava-rumble bass, fiery
  ══════════════════════════════════════════ */
  function playBattleVolcano() {
    boot(); resume(); _looping = true;

    const beat = 60/130, bar = beat*4, bars = 4;

    const rv = mkReverb(1.4, 2.5), rvG = AC.createGain(); rvG.gain.value = 0.18;
    rv.connect(rvG); rvG.connect(master);
    const dG = AC.createGain(); dG.gain.value = 0.82; dG.connect(master);
    const bF = AC.createBiquadFilter(); bF.type = 'lowpass'; bF.frequency.value = 360;
    const bG = AC.createGain(); bG.gain.value = 0.64; bG.connect(bF); bF.connect(master);
    const aF = AC.createBiquadFilter(); aF.type = 'bandpass'; aF.frequency.value = 950; aF.Q.value = 0.9;
    const aG = AC.createGain(); aG.gain.value = 0.34; aG.connect(aF); aF.connect(master); aF.connect(rv);
    const lG = AC.createGain(); lG.gain.value = 0.30; lG.connect(master); lG.connect(rv);
    _nodes.push(rv, rvG, dG, bF, bG, aF, aG, lG);

    // Em bass: E2 B2 A2
    const bassV = [
      [0,         F.E2, beat*.72, 0.72], [beat*.75, F.E2, beat*.36, 0.50],
      [beat,      F.B2, beat*.72, 0.65], [beat*2,   F.A2, beat*.72, 0.68],
      [beat*3,    F.E2, beat*.36, 0.55], [beat*3.5, F.B2, beat*.36, 0.52],
    ];
    // Em pentatonic arp: E4 G4 B4 E5
    const arpV  = [F.E4, F.G4, F.B4, F.E5, F.B4, F.G4, F.E4, F.G4];
    const leadV  = [[0,F.E5,beat,0.28],[beat,F.G4,beat*.5,0.24],[beat*1.5,F.B4,beat*1.5,0.28],[beat*3,F.E5,beat,0.26]];
    const leadV2 = [[0,F.B4,beat,0.26],[beat,F.E5,beat*.5,0.24],[beat*1.5,F.G4,beat,0.26],[beat*2.5,F.E4,beat*1.5,0.24]];

    startLoop(t0 => {
      for (let b = 0; b < bars; b++) {
        const bt = t0 + b*bar;
        // Double kick (tribal: 1+1.5, 3+3.5)
        kick(bt, dG); kick(bt + beat*.5, dG);
        kick(bt + beat*2, dG); kick(bt + beat*2.5, dG);
        snare(bt + beat, dG); snare(bt + beat*3, dG);
        for (let h = 0; h < 8; h++) hihat(bt + h*beat*.5, h%2===0?.9:.6, dG);
        bassV.forEach(([off,f,d,g]) => note(f, bt+off, d, g, 'sawtooth', bG));
        arpV.forEach((f,i) => note(f, bt+i*beat*.5, beat*.30, 0.15, 'square', aG));
        (b%2===0?leadV:leadV2).forEach(([off,f,d,g]) => note(f, bt+off, d, g, 'triangle', lG));
      }
    }, bars * bar);

    fade(0.38, 0.8);
  }

  /* ── Stop ───────────────────────────────── */
  function stop(dur) {
    if (dur === undefined) dur = 0.85;
    if (!AC) return;
    _looping = false;
    _timers.forEach(clearTimeout); _timers = [];
    // Snapshot nodes NOW and clear array immediately so new music
    // started later won't have its nodes killed by this cleanup timeout.
    const toClean = _nodes.slice();
    _nodes = [];
    fade(0, dur);
    setTimeout(() => {
      toClean.forEach(n => {
        try { if (n.stop) n.stop(0); } catch(e) {}
        try { n.disconnect(); }       catch(e) {}
      });
    }, (dur + 0.18) * 1000);
  }

  /* ── Public API ─────────────────────────── */
  return {
    intro  : () => { try { playIntro();         } catch(e) { console.warn('MU.intro', e); } },
    menu   : () => { try { playMenu();          } catch(e) { console.warn('MU.menu',  e); } },
    battle : (m) => {
      try {
        if (m === 0) playBattleNeon();
        else if (m === 1) playBattleStorm();
        else              playBattleVolcano();
      } catch(e) { console.warn('MU.battle', e); }
    },
    resume : () => { try { resume(); } catch(e) {} },
    stop,
  };
})();
