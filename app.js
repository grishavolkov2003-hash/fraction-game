'use strict';

// ── Telegram WebApp Init ──────────────────────────
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  try { tg.setHeaderColor('#F5F5F7'); } catch(e) {}
  try { tg.setBackgroundColor('#F5F5F7'); } catch(e) {}
}

// ── Math Utils ────────────────────────────────────
function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

function lcm(a, b) {
  return (a * b) / gcd(a, b);
}

function simplify(n, d) {
  if (d === 0) return { n: 0, d: 1 };
  const g = gcd(Math.abs(n), Math.abs(d));
  return { n: n / g, d: d / g };
}

function fracEqual(f1, f2) {
  const a = simplify(f1.n, f1.d);
  const b = simplify(f2.n, f2.d);
  return a.n === b.n && a.d === b.d;
}

function fracToStr(f) {
  return `${f.n}/${f.d}`;
}

// ── Random Helpers ────────────────────────────────
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Level Config ──────────────────────────────────
const LEVELS = {
  beginner: { min: 2, max: 5 },
  easy:     { min: 2, max: 9 },
  hard:     { min: 5, max: 30 },
};

const MAX_ANSWER = { beginner: 8, easy: 20, hard: 50 };

const OPERATIONS = ['multiply', 'divide', 'add', 'simplify'];

// ── Fraction Generation ───────────────────────────
function randomFrac(min, max) {
  let n, d;
  do {
    n = randInt(min, max);
    d = randInt(min, max);
  } while (n === d);
  return { n, d };
}

function randomUnsimplifiedFrac(min, max) {
  let n, d, g;
  let attempts = 0;
  do {
    n = randInt(min, max);
    d = randInt(min, max);
    g = gcd(n, d);
    attempts++;
  } while ((g === 1 || n === d) && attempts < 50);

  if (g === 1) {
    const factor = randInt(2, Math.max(2, Math.floor(max / 3)));
    n = randInt(2, Math.max(2, Math.floor(max / factor)));
    d = randInt(2, Math.max(2, Math.floor(max / factor)));
    n *= factor;
    d *= factor;
    if (n === d) d += factor;
  }
  return { n, d };
}

// ── Task Generator ────────────────────────────────
function generateTask(operation, level) {
  const { min, max } = LEVELS[level];
  const maxAns = MAX_ANSWER[level];

  let problem, answer;
  let attempts = 0;

  do {
    attempts++;
    if (operation === 'multiply') {
      const a = randomFrac(min, max);
      const b = randomFrac(min, max);
      const raw = { n: a.n * b.n, d: a.d * b.d };
      answer = simplify(raw.n, raw.d);
      problem = { type: 'binary', op: '×', left: a, right: b };
    }
    else if (operation === 'divide') {
      const a = randomFrac(min, max);
      const b = randomFrac(min, max);
      const raw = { n: a.n * b.d, d: a.d * b.n };
      answer = simplify(raw.n, raw.d);
      problem = { type: 'binary', op: '÷', left: a, right: b };
    }
    else if (operation === 'add') {
      const a = randomFrac(min, max);
      const b = randomFrac(min, max);
      const l = lcm(a.d, b.d);
      const raw = { n: a.n * (l / a.d) + b.n * (l / b.d), d: l };
      answer = simplify(raw.n, raw.d);
      problem = { type: 'binary', op: '+', left: a, right: b };
    }
    else if (operation === 'simplify') {
      const f = randomUnsimplifiedFrac(min, max);
      answer = simplify(f.n, f.d);
      problem = { type: 'single', label: 'Сократи дробь', frac: f };
    }
  } while (
    attempts < 20 &&
    operation !== 'simplify' &&
    (answer.n > maxAns || answer.d > maxAns)
  );

  const choices = generateChoices(answer, operation, problem);
  return { problem, answer, choices };
}

// ── Wrong Answer Generator ────────────────────────
function generateChoices(correct, operation, problem) {
  const seen = new Set([fracToStr(correct)]);
  const wrongs = [];

  // School-mistake candidates based on operation
  let smartCandidates = [];

  if (operation === 'multiply' && problem?.left && problem?.right) {
    const { left: a, right: b } = problem;
    smartCandidates = [
      simplify(a.n + b.n, a.d + b.d),          // добавил вместо умножил
      simplify(a.n * b.n, a.d + b.d),           // числители умножил, знам сложил
      simplify(a.n + b.n, a.d * b.d),           // числители сложил, знам умножил
      simplify(a.n * b.d, a.d * b.n),           // перепутал порядок
      { n: correct.n + 1, d: correct.d },
      { n: correct.n, d: correct.d + 1 },
    ];
  } else if (operation === 'divide' && problem?.left && problem?.right) {
    const { left: a, right: b } = problem;
    smartCandidates = [
      simplify(a.n * b.n, a.d * b.d),           // умножил вместо деления
      simplify(a.n * b.d, a.d * b.n),           // перевернул не ту дробь
      simplify(a.d * b.d, a.n * b.n),           // оба перевернул
      { n: correct.n + 1, d: correct.d },
      { n: correct.n, d: correct.d + 1 },
    ];
  } else if (operation === 'add' && problem?.left && problem?.right) {
    const { left: a, right: b } = problem;
    smartCandidates = [
      simplify(a.n + b.n, a.d + b.d),           // классика: сложил знам
      simplify(a.n * b.d + b.n, a.d * b.d),     // только один привёл
      simplify(a.n + b.n * (a.d / gcd(a.d, b.d)), lcm(a.d, b.d)), // ошибка в приведении
      { n: correct.n + 1, d: correct.d },
      { n: correct.n, d: correct.d + 1 },
    ];
  } else if (operation === 'simplify' && problem?.frac) {
    const f = problem.frac;
    const g = gcd(f.n, f.d);
    smartCandidates = [
      { n: f.n / gcd(f.n, f.d) + 1, d: f.d / gcd(f.n, f.d) },  // чуть мимо
      { n: f.n, d: f.d },                                          // вообще не сократил
      simplify(f.n, f.d + g),                                       // частично сократил
      { n: correct.n + 1, d: correct.d },
      { n: correct.n, d: correct.d + 1 },
    ];
  } else {
    smartCandidates = [
      { n: correct.n + 1, d: correct.d },
      { n: correct.n - 1, d: correct.d },
      { n: correct.n, d: correct.d + 1 },
      { n: correct.n, d: correct.d - 1 },
      { n: correct.d, d: correct.n },
      { n: correct.n + 2, d: correct.d },
    ];
  }

  for (const c of smartCandidates) {
    if (wrongs.length >= 3) break;
    if (!c || c.n <= 0 || c.d <= 0 || isNaN(c.n) || isNaN(c.d)) continue;
    const s = simplify(Math.round(c.n), Math.round(c.d));
    if (s.n <= 0 || s.d <= 0) continue;
    const key = fracToStr(s);
    if (seen.has(key)) continue;
    seen.add(key);
    wrongs.push(s);
  }

  // fallback random
  while (wrongs.length < 3) {
    const r = { n: randInt(1, 15), d: randInt(2, 15) };
    const key = fracToStr(simplify(r.n, r.d));
    if (!seen.has(key)) {
      seen.add(key);
      wrongs.push(r);
    }
  }

  return shuffle([correct, ...wrongs]);
}

// ── Solution Video Animation ──────────────────────
let _animTimers = [];

function clearAnimTimers() {
  _animTimers.forEach(clearTimeout);
  _animTimers = [];
}

function at(ms, fn) {
  _animTimers.push(setTimeout(fn, ms));
}

function makeAVFrac(n, d, prefix) {
  return `
    <div class="av-frac">
      <div class="av-slot" id="${prefix}n"><span class="av-val">${n}</span></div>
      <div class="av-fline"></div>
      <div class="av-slot" id="${prefix}d"><span class="av-val">${d}</span></div>
    </div>`;
}

function avHighlight(slotId, cls) {
  const el = document.getElementById(slotId);
  if (el) el.querySelector('.av-val')?.classList.add(cls);
}

function avStrike(slotId) {
  const slot = document.getElementById(slotId);
  if (!slot) return;
  const val = slot.querySelector('.av-val');
  if (!val) return;
  const line = document.createElement('div');
  line.className = 'av-strikeline';
  val.style.position = 'relative';
  val.appendChild(line);
  setTimeout(() => {
    val.style.opacity = '0.3';
    val.style.transition = 'opacity 0.3s';
  }, 380);
}

function avReplace(slotId, newVal) {
  const slot = document.getElementById(slotId);
  if (!slot) return;
  const arrow = document.createElement('span');
  arrow.className = 'av-rarrow';
  arrow.textContent = '→';
  const newEl = document.createElement('span');
  newEl.className = 'av-new-val';
  newEl.textContent = newVal;
  slot.appendChild(arrow);
  slot.appendChild(newEl);
}

function addCalcRow(stage, html, delay) {
  at(delay, () => {
    const row = document.createElement('div');
    row.className = 'av-calc-row';
    row.innerHTML = html;
    stage.appendChild(row);
    stage.scrollTop = stage.scrollHeight;
  });
}

function showFinalResult(stage, answer, delay) {
  at(delay, () => {
    const s = simplify(answer.n, answer.d);
    const final = document.createElement('div');
    final.className = 'av-final-row';
    if (s.d === 1) {
      final.innerHTML = `<span class="av-eq-sym">=</span><span class="av-whole-result">${s.n}</span>`;
    } else {
      final.innerHTML = `<span class="av-eq-sym">=</span>
        <div class="av-frac av-frac-final">
          <div class="av-slot"><span class="av-val">${s.n}</span></div>
          <div class="av-fline av-fline-green"></div>
          <div class="av-slot"><span class="av-val">${s.d}</span></div>
        </div>`;
    }
    stage.appendChild(final);
    stage.scrollTop = stage.scrollHeight;
    document.getElementById('btn-hint-ok').classList.add('visible');
  });
}

function playAnimation(problem, answer) {
  clearAnimTimers();
  const stage = document.getElementById('anim-stage');
  stage.innerHTML = '';
  document.getElementById('btn-hint-ok').classList.remove('visible');

  if (problem.type === 'binary') {
    const { left: a, right: b, op } = problem;
    if (op === '×') animMultiply(stage, a, b, answer);
    else if (op === '÷') animDivide(stage, a, b, answer);
    else if (op === '+') animAdd(stage, a, b, answer);
  } else {
    animSimplify(stage, problem.frac, answer);
  }
}

function animMultiply(stage, a, b, answer) {
  const probRow = document.createElement('div');
  probRow.className = 'av-prob-row';
  probRow.innerHTML =
    makeAVFrac(a.n, a.d, 'ma') +
    `<span class="av-op-sym">×</span>` +
    makeAVFrac(b.n, b.d, 'mb');
  stage.appendChild(probRow);

  let t = 350;

  at(t, () => { avHighlight('man', 'hl-n'); avHighlight('mbn', 'hl-n'); });
  addCalcRow(stage, `<span class="hl-n">${a.n} × ${b.n}</span> = <strong>${a.n * b.n}</strong> <span class="av-tag">числители</span>`, t + 200);
  t += 800;

  at(t, () => { avHighlight('mad', 'hl-d'); avHighlight('mbd', 'hl-d'); });
  addCalcRow(stage, `<span class="hl-d">${a.d} × ${b.d}</span> = <strong>${a.d * b.d}</strong> <span class="av-tag">знаменатели</span>`, t + 200);
  t += 800;

  const rawN = a.n * b.n, rawD = a.d * b.d;
  const g = gcd(rawN, rawD);

  const resRow = document.createElement('div');
  resRow.className = 'av-res-row av-hidden';
  resRow.id = 'av-res';
  resRow.innerHTML = `<span class="av-eq-sym">=</span>` + makeAVFrac(rawN, rawD, 'mr');
  stage.appendChild(resRow);
  at(t, () => { document.getElementById('av-res')?.classList.remove('av-hidden'); stage.scrollTop = stage.scrollHeight; });
  t += 600;

  if (g > 1) {
    addCalcRow(stage, `НОД(${rawN}, ${rawD}) = <strong>${g}</strong> — сокращаем`, t);
    t += 700;
    at(t, () => { avStrike('mrn'); avStrike('mrd'); });
    t += 500;
    at(t, () => { avReplace('mrn', answer.n); avReplace('mrd', answer.d); });
    t += 600;
  }

  showFinalResult(stage, answer, t + 200);
}

function animDivide(stage, a, b, answer) {
  const probRow = document.createElement('div');
  probRow.className = 'av-prob-row';
  probRow.innerHTML =
    makeAVFrac(a.n, a.d, 'da') +
    `<span class="av-op-sym" id="av-div-op">÷</span>` +
    `<div class="av-flip-wrap" id="av-flip">` + makeAVFrac(b.n, b.d, 'db') + `</div>`;
  stage.appendChild(probRow);

  let t = 400;
  addCalcRow(stage, 'Переворачиваем вторую дробь', t);
  t += 700;

  at(t, () => {
    const wrap = document.getElementById('av-flip');
    if (wrap) wrap.classList.add('flipping');
    setTimeout(() => {
      const bn = document.querySelector('#dbn .av-val');
      const bd = document.querySelector('#dbd .av-val');
      if (bn) bn.textContent = b.d;
      if (bd) bd.textContent = b.n;
      const op = document.getElementById('av-div-op');
      if (op) { op.textContent = '×'; op.classList.add('op-switched'); }
    }, 250);
  });
  t += 700;

  at(t, () => { avHighlight('dan', 'hl-n'); avHighlight('dbn', 'hl-n'); });
  addCalcRow(stage, `<span class="hl-n">${a.n} × ${b.d}</span> = <strong>${a.n * b.d}</strong> <span class="av-tag">числители</span>`, t + 200);
  t += 800;

  at(t, () => { avHighlight('dad', 'hl-d'); avHighlight('dbd', 'hl-d'); });
  addCalcRow(stage, `<span class="hl-d">${a.d} × ${b.n}</span> = <strong>${a.d * b.n}</strong> <span class="av-tag">знаменатели</span>`, t + 200);
  t += 800;

  const rawN = a.n * b.d, rawD = a.d * b.n;
  const g = gcd(rawN, rawD);

  const resRow = document.createElement('div');
  resRow.className = 'av-res-row av-hidden';
  resRow.id = 'av-res';
  resRow.innerHTML = `<span class="av-eq-sym">=</span>` + makeAVFrac(rawN, rawD, 'dr');
  stage.appendChild(resRow);
  at(t, () => { document.getElementById('av-res')?.classList.remove('av-hidden'); stage.scrollTop = stage.scrollHeight; });
  t += 600;

  if (g > 1) {
    addCalcRow(stage, `НОД(${rawN}, ${rawD}) = <strong>${g}</strong> — сокращаем`, t);
    t += 700;
    at(t, () => { avStrike('drn'); avStrike('drd'); });
    t += 500;
    at(t, () => { avReplace('drn', answer.n); avReplace('drd', answer.d); });
    t += 600;
  }

  showFinalResult(stage, answer, t + 200);
}

function animAdd(stage, a, b, answer) {
  const probRow = document.createElement('div');
  probRow.className = 'av-prob-row';
  probRow.innerHTML =
    makeAVFrac(a.n, a.d, 'aa') +
    `<span class="av-op-sym">+</span>` +
    makeAVFrac(b.n, b.d, 'ab');
  stage.appendChild(probRow);

  const l = lcm(a.d, b.d);
  const an = a.n * (l / a.d);
  const bn = b.n * (l / b.d);

  let t = 400;
  addCalcRow(stage, `НОК(${a.d}, ${b.d}) = <strong>${l}</strong>`, t);
  t += 800;

  at(t, () => { avStrike('aad'); avStrike('abd'); });
  t += 480;
  at(t, () => { avReplace('aad', l); avReplace('abd', l); });
  t += 600;

  at(t, () => { avStrike('aan'); avStrike('abn'); });
  t += 480;
  at(t, () => { avReplace('aan', an); avReplace('abn', bn); });
  t += 700;

  addCalcRow(stage, `<span class="hl-n">${an}</span> + <span class="hl-n">${bn}</span> = <strong>${an + bn}</strong>`, t);
  t += 800;

  const rawN = an + bn;
  const g = gcd(rawN, l);

  const resRow = document.createElement('div');
  resRow.className = 'av-res-row av-hidden';
  resRow.id = 'av-res';
  resRow.innerHTML = `<span class="av-eq-sym">=</span>` + makeAVFrac(rawN, l, 'ar');
  stage.appendChild(resRow);
  at(t, () => { document.getElementById('av-res')?.classList.remove('av-hidden'); stage.scrollTop = stage.scrollHeight; });
  t += 600;

  if (g > 1) {
    addCalcRow(stage, `НОД(${rawN}, ${l}) = <strong>${g}</strong> — сокращаем`, t);
    t += 700;
    at(t, () => { avStrike('arn'); avStrike('ard'); });
    t += 500;
    at(t, () => { avReplace('arn', answer.n); avReplace('ard', answer.d); });
    t += 600;
  }

  showFinalResult(stage, answer, t + 200);
}

function animSimplify(stage, f, answer) {
  const probRow = document.createElement('div');
  probRow.className = 'av-prob-row';
  probRow.innerHTML = makeAVFrac(f.n, f.d, 'sa');
  stage.appendChild(probRow);

  const g = gcd(f.n, f.d);
  let t = 400;

  addCalcRow(stage, `НОД(${f.n}, ${f.d}) = <strong>${g}</strong>`, t);
  t += 800;

  at(t, () => { avHighlight('san', 'hl-n'); });
  addCalcRow(stage, `<span class="hl-n">${f.n}</span> ÷ ${g} = <strong>${answer.n}</strong>`, t + 150);
  t += 700;

  at(t, () => { avHighlight('sad', 'hl-d'); });
  addCalcRow(stage, `<span class="hl-d">${f.d}</span> ÷ ${g} = <strong>${answer.d}</strong>`, t + 150);
  t += 700;

  at(t, () => { avStrike('san'); avStrike('sad'); });
  t += 480;
  at(t, () => { avReplace('san', answer.n); avReplace('sad', answer.d); });
  t += 600;

  showFinalResult(stage, answer, t + 200);
}

// ── Sounds (Web Audio API) ────────────────────────
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playSound(type) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'correct') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } else if (type === 'wrong') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(180, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'timeout') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.setValueAtTime(200, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'win') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(550, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    }
  } catch(e) {}
}

// ── Record (localStorage) ─────────────────────────
function getRecordKey() {
  return `frac_record_${state.level}_${state.operation}`;
}

function getRecord() {
  return parseInt(localStorage.getItem(getRecordKey()) || '0');
}

function saveRecord(score) {
  const prev = getRecord();
  if (score > prev) {
    localStorage.setItem(getRecordKey(), score);
    return { isNew: true, value: score };
  }
  return { isNew: false, value: prev };
}

// ── Render Helpers ────────────────────────────────
function makeFracEl(frac) {
  const wrap = document.createElement('div');
  wrap.className = 'fraction';

  const num = document.createElement('span');
  num.className = 'frac-num';
  num.textContent = frac.n;

  const line = document.createElement('div');
  line.className = 'frac-line';

  const den = document.createElement('span');
  den.className = 'frac-den';
  den.textContent = frac.d;

  wrap.appendChild(num);
  wrap.appendChild(line);
  wrap.appendChild(den);
  return wrap;
}

function renderProblem(problem) {
  const wrap = document.getElementById('problem-wrap');
  wrap.innerHTML = '';

  if (problem.type === 'binary') {
    wrap.appendChild(makeFracEl(problem.left));
    const op = document.createElement('span');
    op.className = 'op-symbol';
    op.textContent = problem.op;
    wrap.appendChild(op);
    wrap.appendChild(makeFracEl(problem.right));
  } else {
    const lbl = document.createElement('div');
    lbl.className = 'problem-label';
    lbl.textContent = problem.label;
    wrap.appendChild(lbl);
    wrap.appendChild(makeFracEl(problem.frac));
  }

  wrap.style.animation = 'none';
  wrap.offsetHeight;
  wrap.style.animation = '';
}

// ── Game State ────────────────────────────────────
const state = {
  level: 'easy',
  operation: 'all',
  currentQ: 0,
  totalQ: 10,
  score: 0,
  correct: 0,
  combo: 0,
  maxCombo: 0,
  answered: false,
  hintUsed: false,
  timerInterval: null,
  timerStart: null,
  timerDuration: 20000,
  currentTask: null,
  ops: [],
};

// ── Timer ─────────────────────────────────────────
function startTimer(onExpire) {
  clearInterval(state.timerInterval);
  const bar = document.getElementById('timer-bar');
  bar.style.transition = 'none';
  bar.style.width = '100%';
  bar.classList.remove('urgent');
  bar.offsetHeight;

  state.timerStart = Date.now();
  state.answered = false;

  bar.style.transition = `width ${state.timerDuration}ms linear`;
  bar.style.width = '0%';

  state.timerInterval = setInterval(() => {
    const elapsed = Date.now() - state.timerStart;
    const remaining = state.timerDuration - elapsed;
    if (remaining <= 5000) bar.classList.add('urgent');
    if (remaining <= 0) {
      clearInterval(state.timerInterval);
      if (!state.answered) {
        state.answered = true;
        onExpire();
      }
    }
  }, 100);
}

function stopTimer() {
  clearInterval(state.timerInterval);
}

function getTimeBonus() {
  const elapsed = Date.now() - state.timerStart;
  if (elapsed < 5000) return 5;
  if (elapsed < 10000) return 3;
  return 0;
}

// ── Score ─────────────────────────────────────────
function addScore(base, bonus) {
  state.score += base + bonus;
  document.getElementById('score-display').textContent = `${state.score} очков`;
}

// ── Hint Popup ────────────────────────────────────
function showHint(problem, answer) {
  document.getElementById('hint-overlay').classList.add('active');
  playAnimation(problem, answer);
}

function hideHint() {
  document.getElementById('hint-overlay').classList.remove('active');
  clearAnimTimers();
}

// ── Answer Handler ────────────────────────────────
function handleAnswer(chosen, btn, correct) {
  if (state.answered) return;
  state.answered = true;
  stopTimer();

  const isCorrect = fracEqual(chosen, correct);
  const overlay = document.getElementById('feedback-overlay');

  // disable all buttons
  document.querySelectorAll('.choice-btn').forEach(b => b.disabled = true);

  if (isCorrect) {
    btn.classList.add('correct');
    overlay.className = 'feedback-overlay show-correct';
    state.correct++;
    state.combo++;
    if (state.combo > state.maxCombo) state.maxCombo = state.combo;
    const bonus = getTimeBonus();
    addScore(10, bonus);
    playSound('correct');

    setTimeout(() => {
      overlay.className = 'feedback-overlay';
      nextQuestion();
    }, 700);
  } else {
    btn.classList.add('wrong');
    overlay.className = 'feedback-overlay show-wrong';
    state.combo = 0;
    playSound('wrong');

    // reveal correct
    document.querySelectorAll('.choice-btn').forEach(b => {
      if (b._fracData && fracEqual(b._fracData, correct)) b.classList.add('reveal');
    });

    setTimeout(() => {
      overlay.className = 'feedback-overlay';
      showHint(state.currentTask.problem, correct);
    }, 700);
  }
}

// ── Question Flow ─────────────────────────────────
function loadQuestion() {
  state.hintUsed = false;
  document.getElementById('btn-hint-trigger').disabled = false;
  document.getElementById('btn-hint-trigger').classList.remove('used');

  const op = state.ops[state.currentQ % state.ops.length];
  const task = generateTask(op, state.level);
  state.currentTask = task;

  document.getElementById('q-counter').textContent = `${state.currentQ + 1} / ${state.totalQ}`;
  const pct = (state.currentQ / state.totalQ) * 100;
  document.getElementById('progress-bar').style.width = `${pct}%`;

  renderProblem(task.problem);

  const grid = document.getElementById('choices-grid');
  grid.innerHTML = '';

  task.choices.forEach((frac, i) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn._fracData = frac;
    btn.style.animationDelay = `${i * 0.05}s`;

    const s = simplify(frac.n, frac.d);
    if (s.d === 1) {
      const span = document.createElement('span');
      span.className = 'whole-num';
      span.textContent = s.n;
      btn.appendChild(span);
    } else {
      btn.appendChild(makeFracEl(frac));
    }

    btn.addEventListener('click', () => handleAnswer(frac, btn, task.answer), { once: true });
    grid.appendChild(btn);
  });

  startTimer(() => {
    state.combo = 0;
    playSound('timeout');
    const overlay = document.getElementById('feedback-overlay');
    overlay.className = 'feedback-overlay show-wrong';

    document.querySelectorAll('.choice-btn').forEach(b => {
      b.disabled = true;
      if (b._fracData && fracEqual(b._fracData, task.answer)) b.classList.add('reveal');
    });

    setTimeout(() => {
      overlay.className = 'feedback-overlay';
      showHint(task.problem, task.answer);
    }, 700);
  });
}

function nextQuestion() {
  state.currentQ++;
  if (state.currentQ >= state.totalQ) {
    showResults();
  } else {
    loadQuestion();
  }
}

// ── Build ops array ───────────────────────────────
function buildOps() {
  if (state.operation === 'all') {
    const pool = [];
    OPERATIONS.forEach(op => {
      const count = op === 'simplify' ? 1 : 3;
      for (let i = 0; i < count; i++) pool.push(op);
    });
    while (pool.length < state.totalQ) pool.push(OPERATIONS[pool.length % OPERATIONS.length]);
    state.ops = shuffle(pool.slice(0, state.totalQ));
  } else {
    state.ops = Array(state.totalQ).fill(state.operation);
  }
}

// ── Screens ───────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function startGame() {
  state.currentQ = 0;
  state.score = 0;
  state.correct = 0;
  state.combo = 0;
  state.maxCombo = 0;
  state.hintUsed = false;
  document.getElementById('score-display').textContent = '0 очков';
  buildOps();
  showScreen('screen-game');
  if (tg?.BackButton) { tg.BackButton.show(); tg.BackButton.onClick(() => showHome()); }
  loadQuestion();
}

function showResults() {
  stopTimer();
  showScreen('screen-results');

  const pct = state.correct / state.totalQ;
  const emoji = pct >= 0.9 ? '🏆' : pct >= 0.7 ? '🎉' : pct >= 0.5 ? '👍' : '💪';

  document.getElementById('result-emoji').textContent = emoji;
  document.getElementById('result-score').textContent = state.score;
  document.getElementById('stat-correct').textContent = `${state.correct}/${state.totalQ}`;
  document.getElementById('stat-combo').textContent = state.maxCombo;

  const record = saveRecord(state.score);
  const recordEl = document.getElementById('record-display');
  if (record.isNew && state.score > 0) {
    recordEl.textContent = '🎯 Новый рекорд!';
    recordEl.className = 'record-display new-record';
    playSound('win');
  } else if (record.value > 0) {
    recordEl.textContent = `Рекорд: ${record.value}`;
    recordEl.className = 'record-display';
  } else {
    recordEl.textContent = '';
  }

  if (tg?.BackButton) tg.BackButton.hide();
}

function showHome() {
  stopTimer();
  hideHint();
  showScreen('screen-home');
  if (tg?.BackButton) tg.BackButton.hide();
}

// ── Toggle Buttons ────────────────────────────────
function initToggles(groupId, onSelect) {
  const group = document.getElementById(groupId);
  group.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onSelect(btn.dataset.value);
    });
  });
}

// ── Init ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initToggles('level-group', val => { state.level = val; });
  initToggles('op-group', val => { state.operation = val; });

  document.getElementById('btn-start').addEventListener('click', startGame);
  document.getElementById('btn-restart').addEventListener('click', startGame);
  document.getElementById('btn-home').addEventListener('click', showHome);
  document.getElementById('btn-hint-ok').addEventListener('click', () => {
    hideHint();
    nextQuestion();
  });

  document.getElementById('btn-skip').addEventListener('click', () => {
    if (!state.currentTask) return;
    clearAnimTimers();
    const stage = document.getElementById('anim-stage');
    stage.innerHTML = '';
    const s = simplify(state.currentTask.answer.n, state.currentTask.answer.d);
    const final = document.createElement('div');
    final.className = 'av-final-row';
    if (s.d === 1) {
      final.innerHTML = `<span class="av-whole-result">${s.n}</span>`;
    } else {
      final.innerHTML = `
        <div class="av-frac av-frac-final">
          <div class="av-slot"><span class="av-val">${s.n}</span></div>
          <div class="av-fline av-fline-green"></div>
          <div class="av-slot"><span class="av-val">${s.d}</span></div>
        </div>`;
    }
    stage.appendChild(final);
    document.getElementById('btn-hint-ok').classList.add('visible');
  });

  document.getElementById('btn-hint-trigger').addEventListener('click', () => {
    if (state.answered || state.hintUsed || !state.currentTask) return;
    state.hintUsed = true;
    state.answered = true;
    state.combo = 0;
    stopTimer();
    document.querySelectorAll('.choice-btn').forEach(b => {
      b.disabled = true;
      if (b._fracData && fracEqual(b._fracData, state.currentTask.answer)) b.classList.add('reveal');
    });
    document.getElementById('btn-hint-trigger').classList.add('used');
    showHint(state.currentTask.problem, state.currentTask.answer);
  });
});
