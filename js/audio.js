// ─────────────────────────────────────────────
// WEB AUDIO — procedural sound effects
// ─────────────────────────────────────────────
let AC = null;

function snd(type) {
  try {
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator();
    const g = AC.createGain();
    o.connect(g);
    g.connect(AC.destination);
    const t = AC.currentTime;

    const sounds = {
      punch:    () => { o.type='sawtooth'; o.frequency.setValueAtTime(200,t); o.frequency.exponentialRampToValueAtTime(55,t+.1);   g.gain.setValueAtTime(.4,t); g.gain.exponentialRampToValueAtTime(.001,t+.12); o.start(t); o.stop(t+.12); },
      fire:     () => { o.type='square';   o.frequency.setValueAtTime(350,t); o.frequency.exponentialRampToValueAtTime(80,t+.18);   g.gain.setValueAtTime(.3,t); g.gain.exponentialRampToValueAtTime(.001,t+.2);  o.start(t); o.stop(t+.2);  },
      bigfire:  () => { o.type='sawtooth'; o.frequency.setValueAtTime(140,t); o.frequency.exponentialRampToValueAtTime(35,t+.3);    g.gain.setValueAtTime(.6,t); g.gain.exponentialRampToValueAtTime(.001,t+.35); o.start(t); o.stop(t+.35); },
      thunder:  () => { o.type='sawtooth'; o.frequency.setValueAtTime(90,t);  o.frequency.setValueAtTime(320,t+.01); o.frequency.exponentialRampToValueAtTime(28,t+.38); g.gain.setValueAtTime(.7,t); g.gain.exponentialRampToValueAtTime(.001,t+.42); o.start(t); o.stop(t+.42); },
      blink:    () => { o.type='sine';     o.frequency.setValueAtTime(700,t); o.frequency.exponentialRampToValueAtTime(2200,t+.1);  g.gain.setValueAtTime(.2,t); g.gain.exponentialRampToValueAtTime(.001,t+.15); o.start(t); o.stop(t+.15); },
      block:    () => { o.type='triangle'; o.frequency.setValueAtTime(700,t);                                                         g.gain.setValueAtTime(.3,t); g.gain.exponentialRampToValueAtTime(.001,t+.09); o.start(t); o.stop(t+.09); },
      parry:    () => { o.type='triangle'; o.frequency.setValueAtTime(1200,t); o.frequency.exponentialRampToValueAtTime(600,t+.15); g.gain.setValueAtTime(.5,t); g.gain.exponentialRampToValueAtTime(.001,t+.2);  o.start(t); o.stop(t+.2);  },
      heal:     () => { o.type='sine';     o.frequency.setValueAtTime(400,t); o.frequency.exponentialRampToValueAtTime(800,t+.3);   g.gain.setValueAtTime(.2,t); g.gain.exponentialRampToValueAtTime(.001,t+.35); o.start(t); o.stop(t+.35); },
      ult:      () => { o.type='sawtooth'; o.frequency.setValueAtTime(180,t); o.frequency.exponentialRampToValueAtTime(900,t+.25); o.frequency.exponentialRampToValueAtTime(55,t+.7); g.gain.setValueAtTime(.6,t); g.gain.exponentialRampToValueAtTime(.001,t+.8); o.start(t); o.stop(t+.8); },
      ko:       () => { o.type='sawtooth'; o.frequency.setValueAtTime(440,t); o.frequency.exponentialRampToValueAtTime(44,t+.9);    g.gain.setValueAtTime(.5,t); g.gain.exponentialRampToValueAtTime(.001,t+1);   o.start(t); o.stop(t+1);   },
      dash:     () => { o.type='sine';     o.frequency.setValueAtTime(600,t); o.frequency.exponentialRampToValueAtTime(200,t+.08);  g.gain.setValueAtTime(.2,t); g.gain.exponentialRampToValueAtTime(.001,t+.1);  o.start(t); o.stop(t+.1);  },
      walljump: () => { o.type='triangle'; o.frequency.setValueAtTime(300,t); o.frequency.exponentialRampToValueAtTime(600,t+.1);   g.gain.setValueAtTime(.25,t);g.gain.exponentialRampToValueAtTime(.001,t+.15); o.start(t); o.stop(t+.15); },
      powerup:  () => { o.type='sine';     o.frequency.setValueAtTime(500,t); o.frequency.exponentialRampToValueAtTime(1200,t+.2);  g.gain.setValueAtTime(.3,t); g.gain.exponentialRampToValueAtTime(.001,t+.25); o.start(t); o.stop(t+.25); },
      wave:     () => { o.type='triangle'; o.frequency.setValueAtTime(300,t); o.frequency.exponentialRampToValueAtTime(600,t+.15); o.frequency.exponentialRampToValueAtTime(300,t+.3); g.gain.setValueAtTime(.4,t); g.gain.exponentialRampToValueAtTime(.001,t+.35); o.start(t); o.stop(t+.35); },
    };

    if (sounds[type]) sounds[type]();
  } catch (e) { /* audio not critical */ }
}
