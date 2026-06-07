'use strict';

// ── Telegram WebApp Init ──────────────────────────
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  tg.setHeaderColor('#F5F5F7');
  tg.setBackgroundColor('#F5F5F7');
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
  easy: { min: 2, max: 19 },
  hard: { min: 5, max: 99 },
};

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

// Generate a fraction that can be simplified (has GCD > 1)
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
    // force it — multiply both by a factor
    const factor = randInt(2, 5);
    n = randInt(2, Math.floor(max / factor));
    d = randInt(2, Math.floor(max / factor));
    n *= factor;
    d *= factor;
    if (n === d) d += factor;
  }
  return { n, d };
}

// ── Task Generator ────────────────────────────────
function generateTask(operation, level) {
  const { min, max } = LEVELS[level];

  let problem, answer;

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

  const choices = generateChoices(answer, operation);
  return { problem, answer, choices };
}

// ── Wrong Answer Generator ────────────────────────
function generateChoices(correct, operation) {
  const seen = new Set([fracToStr(correct)]);
  const wrongs = [];

  const candidates = [
    { n: correct.n + 1, d: correct.d },
    { n: correct.n - 1, d: correct.d },
    { n: correct.n, d: correct.d + 1 },
    { n: correct.n, d: correct.d - 1 },
    { n: correct.d, d: correct.n },          // flipped
    { n: correct.n + 2, d: correct.d },
    { n: correct.n, d: correct.d + 2 },
    { n: correct.n * 2, d: correct.d * 2 },  // unsimplified
    { n: correct.n + 1, d: correct.d + 1 },
    { n: correct.n - 1, d: correct.d + 1 },
  ];

  for (const c of candidates) {
    if (wrongs.length >= 3) break;
    if (c.n <= 0 || c.d <= 0) continue;
    const key = fracToStr(simplify(c.n, c.d));
    if (seen.has(key)) continue;
    seen.add(key);
    wrongs.push(c);
  }

  // fill remaining with random fracs if needed
  while (wrongs.length < 3) {
    const r = { n: randInt(1, 20), d: randInt(1, 20) };
    const key = fracToStr(simplify(r.n, r.d));
    if (!seen.has(key) && r.d !== 0) {
      seen.add(key);
      wrongs.push(r);
    }
  }

  return shuffle([correct, ...wrongs]);
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

  // re-trigger animation
  wrap.style.animation = 'none';
  wrap.offsetHeight; // reflow
  wrap.style.animation = '';
}

function renderChoices(choices, correct, onAnswer) {
  const grid = document.getElementById('choices-grid');
  grid.innerHTML = '';

  choices.forEach((frac, i) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';

    // check if answer is a whole number (denominator = 1)
    const s = simplify(frac.n, frac.d);
    if (s.d === 1) {
      const span = document.createElement('span');
      span.className = 'whole-num';
      span.textContent = s.n;
      btn.appendChild(span);
    } else {
      btn.appendChild(makeFracEl(frac));
    }

    btn.addEventListener('click', () => onAnswer(frac, btn, correct), { once: true });
    grid.appendChild(btn);
  });
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
  bar.offsetHeight; // reflow

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

// ── Answer Handler ────────────────────────────────
function handleAnswer(chosen, btn, correct) {
  if (state.answered) return;
  state.answered = true;
  stopTimer();

  const isCorrect = fracEqual(chosen, correct);
  const overlay = document.getElementById('feedback-overlay');

  if (isCorrect) {
    btn.classList.add('correct');
    btn.classList.add('pop');
    overlay.className = 'feedback-overlay show-correct';
    state.correct++;
    state.combo++;
    if (state.combo > state.maxCombo) state.maxCombo = state.combo;
    const bonus = getTimeBonus();
    addScore(10, bonus);
  } else {
    btn.classList.add('wrong');
    overlay.className = 'feedback-overlay show-wrong';
    state.combo = 0;
    // reveal correct answer
    revealCorrect(correct);
  }

  setTimeout(() => {
    overlay.className = 'feedback-overlay';
    nextQuestion();
  }, 900);
}

function revealCorrect(correct) {
  const btns = document.querySelectorAll('.choice-btn');
  btns.forEach(btn => {
    const frac = btn._fracData;
    if (!frac) return;
    if (fracEqual(frac, correct)) btn.classList.add('reveal');
  });
}

// ── Question Flow ─────────────────────────────────
function loadQuestion() {
  const op = state.ops[state.currentQ % state.ops.length];
  const task = generateTask(op, state.level);
  state.currentTask = task;

  // update header
  document.getElementById('q-counter').textContent = `${state.currentQ + 1} / ${state.totalQ}`;
  const pct = ((state.currentQ) / state.totalQ) * 100;
  document.getElementById('progress-bar').style.width = `${pct}%`;

  renderProblem(task.problem);

  // render choices and store frac data on buttons
  const grid = document.getElementById('choices-grid');
  grid.innerHTML = '';
  task.choices.forEach((frac, i) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn._fracData = frac;
    btn.style.animationDelay = `${i * 0.04}s`;

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
    // time's up
    state.combo = 0;
    const overlay = document.getElementById('feedback-overlay');
    overlay.className = 'feedback-overlay show-wrong';
    revealCorrect(task.answer);
    setTimeout(() => {
      overlay.className = 'feedback-overlay';
      nextQuestion();
    }, 900);
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
    // mix: 3 each of multiply/divide/add, 1 simplify repeated
    const pool = [];
    OPERATIONS.forEach(op => {
      const count = op === 'simplify' ? 1 : 3;
      for (let i = 0; i < count; i++) pool.push(op);
    });
    // pad to totalQ
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

  if (tg?.BackButton) tg.BackButton.hide();
}

function showHome() {
  stopTimer();
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
});
