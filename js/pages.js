// ─────────────────────────────────────────────
// PAGE NAVIGATION
// ─────────────────────────────────────────────

let _currentMode = 'vs';   // 'vs' | 'survival' | 'versus'
let _p1CharIdx   = 0;
let _p2CharIdx   = 1;
let _p1Locked    = false;
let _p2Locked    = false;

// Show a page by id, hide all others
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

// ─────────────────────────────────────────────
// INTRO PAGE
// ─────────────────────────────────────────────

// Any keydown on the intro page → go to menu
(function attachIntroListeners() {
  document.getElementById('introBtn').addEventListener('click', goToMenu);
  window.addEventListener('keydown', e => {
    if (document.getElementById('page-intro').classList.contains('active'))
      goToMenu();
  });
})();

function goToMenu() {
  fadeTransition(() => { showPage('page-menu'); });
}

// ─────────────────────────────────────────────
// CHARACTER SELECT PAGE
// ─────────────────────────────────────────────

const CHAR_SVGS = [
  // Mage: attacking, staff forward
  `<svg viewBox="0 0 80 120" xmlns="http://www.w3.org/2000/svg">
    <circle cx="38" cy="12" r="12" fill="#0f172a" stroke="#4f46e5" stroke-width="2.5"/>
    <circle cx="43" cy="10" r="2" fill="#818cf8"/><circle cx="48" cy="10" r="2" fill="#818cf8"/>
    <line x1="38" y1="24" x2="38" y2="54" stroke="#e2e8f0" stroke-width="2.5"/>
    <polyline points="38,32 60,18 74,6" stroke="#cbd5e1" stroke-width="2" fill="none"/>
    <polyline points="38,32 18,40 12,52" stroke="#cbd5e1" stroke-width="2" fill="none"/>
    <line x1="38" y1="54" x2="24" y2="84" stroke="#94a3b8" stroke-width="2.5"/>
    <line x1="38" y1="54" x2="54" y2="84" stroke="#94a3b8" stroke-width="2.5"/>
    <line x1="54" y1="44" x2="74" y2="4" stroke="#4f46e5" stroke-width="3.5"/>
    <circle cx="74" cy="4" r="8" fill="#4f46e5"/>
  </svg>`,
  // Brawler: wide stance, fists raised
  `<svg viewBox="0 0 80 120" xmlns="http://www.w3.org/2000/svg">
    <circle cx="40" cy="13" r="14" fill="#0f172a" stroke="#dc2626" stroke-width="2.5"/>
    <circle cx="45" cy="11" r="2" fill="#f87171"/><circle cx="50" cy="11" r="2" fill="#f87171"/>
    <line x1="40" y1="27" x2="40" y2="57" stroke="#e2e8f0" stroke-width="3"/>
    <polyline points="40,35 62,28 68,18" stroke="#cbd5e1" stroke-width="2.5" fill="none"/>
    <polyline points="40,35 16,28 10,18" stroke="#cbd5e1" stroke-width="2.5" fill="none"/>
    <line x1="40" y1="57" x2="22" y2="88" stroke="#94a3b8" stroke-width="3"/>
    <line x1="40" y1="57" x2="60" y2="88" stroke="#94a3b8" stroke-width="3"/>
    <circle cx="68" cy="20" r="10" fill="#dc2626"/>
    <circle cx="10" cy="20" r="10" fill="#dc2626"/>
  </svg>`,
  // Ninja: crouched, blade ready
  `<svg viewBox="0 0 80 120" xmlns="http://www.w3.org/2000/svg">
    <circle cx="40" cy="14" r="11" fill="#0f172a" stroke="#a855f7" stroke-width="2.5"/>
    <circle cx="44" cy="12" r="2" fill="#d8b4fe"/><circle cx="49" cy="12" r="2" fill="#d8b4fe"/>
    <line x1="40" y1="25" x2="40" y2="52" stroke="#e2e8f0" stroke-width="2.2"/>
    <polyline points="40,32 64,24 72,30" stroke="#cbd5e1" stroke-width="2" fill="none"/>
    <polyline points="40,32 18,26 12,20" stroke="#cbd5e1" stroke-width="2" fill="none"/>
    <line x1="40" y1="52" x2="20" y2="78" stroke="#94a3b8" stroke-width="2.2"/>
    <line x1="40" y1="52" x2="58" y2="80" stroke="#94a3b8" stroke-width="2.2"/>
    <line x1="64" y1="24" x2="76" y2="38" stroke="#a855f7" stroke-width="3"/>
    <line x1="72" y1="30" x2="80" y2="14" stroke="#a855f7" stroke-width="2"/>
  </svg>`
];

function generateCharCards() {
  const container = document.getElementById('charCards');
  if (!container || !window.CHARS) return;

  container.innerHTML = CHARS.map((c, i) => `
    <div class="char-card" id="cc${i}" data-idx="${i}">
      <div class="char-name" style="color:${c.color}">${c.name}</div>
      <div class="char-svg-wrap">${CHAR_SVGS[i] || ''}</div>
      <div class="char-stats">
        ${[['POWER',c.r.pow,'#ef4444'],['SPEED',c.r.spd,'#22c55e'],['MAGIC',c.r.mag,'#6366f1'],['DEF',c.r.def,'#f59e0b']]
          .map(([lbl,val,col]) => `
          <div class="stat-row">
            <span>${lbl}</span>
            <div class="stat-bar"><div class="stat-fill" style="width:${val*20}%;background:${col}"></div></div>
          </div>`).join('')}
      </div>
      <p class="char-desc">${c.desc}</p>
    </div>
  `).join('');

  // Left-click = P1, Right-click = P2
  container.querySelectorAll('.char-card').forEach(card => {
    const idx = +card.dataset.idx;
    card.addEventListener('click',       () => selectChar(1, idx));
    card.addEventListener('contextmenu', e => { e.preventDefault(); selectChar(2, idx); });
  });
}

function goToCharSelect(mode) {
  _currentMode = mode;
  _p1CharIdx = -1; _p2CharIdx = -1;
  _p1Locked  = false; _p2Locked = false;

  const modeLabels = { vs:'VS AI', survival:'SURVIVAL', versus:'2 PLAYER' };
  document.getElementById('modeBadge').textContent = modeLabels[mode] || mode.toUpperCase();

  const hint = document.getElementById('csHint');
  if (mode === 'versus') {
    hint.textContent = 'Left-click = P1  ·  Right-click = P2  ·  Both must select';
  } else {
    hint.textContent = 'Click a fighter to play  ·  AI picks the other';
  }

  document.getElementById('p1SelName').textContent = '— Choose —';
  document.getElementById('p2SelName').textContent = mode === 'versus' ? '— Choose —' : '(AI)';
  document.getElementById('btnStartBattle').disabled = true;

  // Reset card states
  document.querySelectorAll('.char-card').forEach(c =>
    c.classList.remove('sel-p1','sel-p2','sel-both')
  );
  document.querySelectorAll('.char-badge').forEach(b => b.remove());

  fadeTransition(() => { showPage('page-charselect'); });
}

function selectChar(player, idx) {
  const c = CHARS[idx];
  if (player === 1) {
    _p1CharIdx = idx; _p1Locked = true;
    document.getElementById('p1SelName').textContent = c.name;
    if (_currentMode !== 'versus') {
      _p2CharIdx = (idx + 1) % CHARS.length; _p2Locked = true;
      document.getElementById('p2SelName').textContent = '(AI) ' + CHARS[_p2CharIdx].name;
    }
  } else {
    _p2CharIdx = idx; _p2Locked = true;
    document.getElementById('p2SelName').textContent = c.name;
  }

  // Update card visual states
  document.querySelectorAll('.char-card').forEach((card, i) => {
    card.classList.remove('sel-p1','sel-p2','sel-both');
    card.querySelectorAll('.char-badge').forEach(b => b.remove());
    const isP1 = i === _p1CharIdx && _p1Locked;
    const isP2 = i === _p2CharIdx && _p2Locked && _currentMode === 'versus';
    if (isP1 && isP2) { card.classList.add('sel-both'); _addBadge(card,'P1','p1'); _addBadge(card,'P2','p2'); }
    else if (isP1)    { card.classList.add('sel-p1');   _addBadge(card,'P1','p1'); }
    else if (isP2)    { card.classList.add('sel-p2');   _addBadge(card,'P2','p2'); }
  });

  const ready = _p1Locked && (_currentMode !== 'versus' || _p2Locked);
  document.getElementById('btnStartBattle').disabled = !ready;
}

function _addBadge(card, label, cls) {
  const b = document.createElement('div');
  b.className = `char-badge ${cls}`;
  b.textContent = label;
  card.appendChild(b);
}

// ─────────────────────────────────────────────
// START BATTLE
// ─────────────────────────────────────────────

function startBattle() {
  const mode = _currentMode;
  fadeTransition(() => {
    // Map HTML mode → game mode
    gameMode = (mode === 'survival') ? 'survival' : 'vs';
    vsAI     = (mode !== 'versus');
    chaosMode = false;

    // Apply character choices
    p1CharIdx = _p1CharIdx;
    p2CharIdx = _p2CharIdx >= 0 ? _p2CharIdx : (_p1CharIdx + 1) % CHARS.length;
    p1Locked  = true;
    p2Locked  = true;

    showPage('page-battle');
    beginGame();
  });
}

// ─────────────────────────────────────────────
// RESULT PAGE
// ─────────────────────────────────────────────

function showResultPage(winnerName, winnerColor, isSurvival) {
  const el = document.getElementById('resultWinner');
  el.textContent = winnerName;
  el.style.color = winnerColor || '#f1f5f9';

  document.getElementById('resultSub').textContent = isSurvival
    ? `Wave ${survivalWave} · Score ${survivalScore}`
    : `Best of 3 · Match Complete`;

  document.getElementById('rtP1Name').textContent = f1 ? f1.name : 'Player 1';
  document.getElementById('rtP2Name').textContent = f2 ? f2.name : 'Player 2';
  document.getElementById('rtP1Name').style.color  = f1 ? f1.color : '#4f46e5';
  document.getElementById('rtP2Name').style.color  = f2 ? f2.color : '#dc2626';

  const s1 = totalStats.p1, s2 = totalStats.p2;
  document.getElementById('rtP1Dmg').textContent   = s1.dmg;
  document.getElementById('rtP1Hits').textContent  = s1.hits;
  document.getElementById('rtP1Spells').textContent= s1.spells;
  document.getElementById('rtP1Combo').textContent = s1.maxCombo + '×';
  document.getElementById('rtP1Parry').textContent = s1.parries;
  document.getElementById('rtP2Dmg').textContent   = s2.dmg;
  document.getElementById('rtP2Hits').textContent  = s2.hits;
  document.getElementById('rtP2Spells').textContent= s2.spells;
  document.getElementById('rtP2Combo').textContent = s2.maxCombo + '×';
  document.getElementById('rtP2Parry').textContent = s2.parries;

  // Glow color matches winner
  const glow = document.getElementById('resultGlow');
  if (glow) glow.style.background = `radial-gradient(circle, ${winnerColor || '#4f46e5'}20, transparent 70%)`;

  fadeTransition(() => { showPage('page-result'); });
}

function playAgain() {
  fadeTransition(() => { showPage('page-charselect'); });
}

// ─────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────

let _aiDiff    = 'medium';
let _roundTime = 99;

function setDiff(d) {
  _aiDiff = d;
  ['easy','medium','hard'].forEach(x =>
    document.getElementById('d' + x.charAt(0).toUpperCase() + x.slice(1)).classList.toggle('active', x === d)
  );
  const descs = {
    easy:   'AI reacts slowly — good for learning.',
    medium: 'AI reacts normally to distance, HP, and threat.',
    hard:   'AI reacts fast with aggressive fuzzy weights.',
  };
  document.getElementById('diffDesc').textContent = descs[d];

  // Adjust AI tick rate based on difficulty
  window._aiDiffMultiplier = { easy: 14, medium: 7, hard: 4 }[d] || 7;
}

function setChaos(on) {
  chaosMode = on;
  document.getElementById('chaosOn').classList.toggle('active',  on);
  document.getElementById('chaosOff').classList.toggle('active', !on);
  const cb = document.getElementById('chaosBtn');
  if (cb) { cb.textContent = on ? 'Chaos ON' : 'Chaos OFF'; cb.classList.toggle('on', on); }
}

function setTimer(secs) {
  _roundTime = secs;
  ['60','99','999'].forEach(s => document.getElementById('t' + s).classList.toggle('active', +s === secs));
}

// ─────────────────────────────────────────────
// EXIT
// ─────────────────────────────────────────────

function exitGame() {
  fadeTransition(() => {
    document.body.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                  height:100vh;gap:16px;color:#334155;font-family:Segoe UI">
        <p style="font-size:18px;font-weight:700">Thanks for playing STICK BRAWL!</p>
        <p style="font-size:12px">You can close this tab now.</p>
      </div>`;
  });
}

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  generateCharCards();
  // Expose round time for combat.js to read
  window.getRoundTime = () => _roundTime * 60;
});
