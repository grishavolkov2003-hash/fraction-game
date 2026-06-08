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
  if (f1.whole !== undefined || f2.whole !== undefined) {
    return (f1.whole || 0) === (f2.whole || 0) && f1.n === f2.n && f1.d === f2.d;
  }
  const a = simplify(f1.n, f1.d);
  const b = simplify(f2.n, f2.d);
  return a.n === b.n && a.d === b.d;
}

function fracToStr(f) {
  if (f.whole !== undefined) return `${f.whole}+${f.n}/${f.d}`;
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

const OPERATIONS = ['multiply', 'divide', 'add', 'subtract', 'simplify', 'mixed'];

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
    else if (operation === 'subtract') {
      const a = randomFrac(min, max);
      const b = randomFrac(min, max);
      const l = lcm(a.d, b.d);
      const an = a.n * (l / a.d);
      const bn = b.n * (l / b.d);
      // ensure positive result — swap if needed
      const [left, right, bigN, smallN] = an >= bn
        ? [a, b, an, bn] : [b, a, bn, an];
      const raw = { n: bigN - smallN, d: l };
      answer = simplify(raw.n, raw.d);
      problem = { type: 'binary', op: '−', left, right };
    }
    else if (operation === 'mixed') {
      let n, d;
      let innerAttempts = 0;
      do {
        d = randInt(min, Math.min(max, 9));
        n = randInt(d + 1, d * 3);
        innerAttempts++;
      } while ((n % d === 0) && innerAttempts < 30);
      if (n % d === 0) n += 1;
      const whole = Math.floor(n / d);
      const remN = n % d;
      const g = gcd(remN, d);
      answer = { whole, n: remN / g, d: d / g };
      problem = { type: 'single', label: 'Смешанное число', frac: { n, d } };
    }
    else if (operation === 'simplify') {
      const f = randomUnsimplifiedFrac(min, max);
      answer = simplify(f.n, f.d);
      problem = { type: 'single', label: 'Сократи дробь', frac: f };
    }
  } while (
    attempts < 20 &&
    operation !== 'simplify' &&
    operation !== 'mixed' &&
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
      simplify(a.n + b.n, a.d + b.d),
      simplify(a.n * b.d + b.n, a.d * b.d),
      simplify(a.n + b.n * (a.d / gcd(a.d, b.d)), lcm(a.d, b.d)),
      { n: correct.n + 1, d: correct.d },
      { n: correct.n, d: correct.d + 1 },
    ];
  } else if (operation === 'subtract' && problem?.left && problem?.right) {
    const { left: a, right: b } = problem;
    smartCandidates = [
      simplify(a.n + b.n, lcm(a.d, b.d)),       // сложил вместо вычел
      simplify(Math.abs(a.n - b.n), a.d + b.d), // вычел но сложил знам
      simplify(a.n * b.d - b.n * a.d, a.d + b.d),
      { n: correct.n + 1, d: correct.d },
      { n: correct.n, d: correct.d + 1 },
    ];
  } else if (operation === 'mixed') {
    const { whole, n: cn, d: cd } = correct;
    const mSeen = new Set([fracToStr(correct)]);
    const choices = [correct];
    const candidates = [
      { whole: whole + 1, n: cn, d: cd },
      { whole: Math.max(1, whole - 1), n: cn, d: cd },
      { whole, n: Math.min(cd - 1, cn + 1), d: cd },
      { whole, n: Math.max(1, cn - 1), d: cd },
      { whole: whole + 2, n: cn, d: cd },
      { whole: whole + 1, n: Math.min(cd - 1, cn + 1), d: cd },
    ];
    for (const c of candidates) {
      if (choices.length >= 4) break;
      if (c.whole <= 0 || c.n <= 0 || c.n >= c.d) continue;
      const key = fracToStr(c);
      if (mSeen.has(key)) continue;
      mSeen.add(key);
      choices.push(c);
    }
    // fallback: just bump whole number
    let off = 3;
    while (choices.length < 4) {
      const c = { whole: whole + off, n: cn, d: cd };
      const key = fracToStr(c);
      if (!mSeen.has(key)) { mSeen.add(key); choices.push(c); }
      off++;
    }
    return shuffle(choices);
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

// ── Mixed Number Element Builders ─────────────────
function makeMixedEl(whole, n, d) {
  const wrap = document.createElement('div');
  wrap.className = 'mixed-num';
  const w = document.createElement('span');
  w.className = 'mixed-whole';
  w.textContent = whole;
  wrap.appendChild(w);
  wrap.appendChild(makeFracEl({ n, d }));
  return wrap;
}

function hMixed(whole, n, d) {
  return `<div class="av-mixed-final">
    <span class="av-whole-result">${whole}</span>
    ${hFrac(n, d, '', null, null)}
  </div>`;
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

// ── Pre-render HTML builders ──────────────────────
// All animation timings are baked into inline styles as animation-delay.
// stage.innerHTML is set ONCE so layout never shifts.

const S = 1.0; // seconds per step

function hSlot(id, val, opts) {
  // opts: { hlAnim, strikeDelay, newVal }
  let inner;
  if (opts && opts.strikeDelay != null) {
    const sd = opts.strikeDelay;
    inner = `
      <span class="av-val" style="animation:dimVal 0.5s ease ${sd}s forwards">${val}
        <div class="av-strikeline" style="animation:strikeGrow 0.65s linear ${sd}s forwards"></div>
      </span>
      <span class="av-rarrow" style="opacity:0;animation:gentleFade 0.4s ease ${sd+0.55}s both">→</span>
      <span class="av-new-val" style="opacity:0;animation:gentleSlideIn 0.55s cubic-bezier(0.4,0,0.2,1) ${sd+0.6}s both">${opts.newVal}</span>`;
  } else if (opts && opts.hlAnim) {
    inner = `<span class="av-val" style="animation:${opts.hlAnim}">${val}</span>`;
  } else {
    inner = `<span class="av-val">${val}</span>`;
  }
  return `<div class="av-slot"${id ? ` id="${id}"` : ''}>${inner}</div>`;
}

function hFrac(n, d, prefix, nOpts, dOpts) {
  return `<div class="av-frac">
    ${hSlot(prefix ? prefix+'n' : '', n, nOpts)}
    <div class="av-fline"></div>
    ${hSlot(prefix ? prefix+'d' : '', d, dOpts)}
  </div>`;
}

function hCalc(content, delayS) {
  return `<div class="av-calc-row" data-appear="${delayS}" style="opacity:0;animation:gentleRise 0.55s cubic-bezier(0.4,0,0.2,1) ${delayS}s both">${content}</div>`;
}

function hRes(fracHTML, delayS) {
  return `<div class="av-res-row" data-appear="${delayS}" style="opacity:0;animation:gentleRise 0.6s cubic-bezier(0.4,0,0.2,1) ${delayS}s both">
    <span class="av-eq-sym">=</span>${fracHTML}</div>`;
}

function hFinal(answer, delayS) {
  const s = simplify(answer.n, answer.d);
  const inner = s.d === 1
    ? `<span class="av-whole-result">${s.n}</span>`
    : `<div class="av-frac av-frac-final">
        <div class="av-slot"><span class="av-val">${s.n}</span></div>
        <div class="av-fline av-fline-green"></div>
        <div class="av-slot"><span class="av-val">${s.d}</span></div>
      </div>`;
  return `<div class="av-final-row" data-appear="${delayS}" style="opacity:0;animation:gentleRise 0.7s cubic-bezier(0.4,0,0.2,1) ${delayS}s both">
    <span class="av-eq-sym">=</span>${inner}</div>`;
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
    else if (op === '−') animSubtract(stage, a, b, answer);
  } else {
    if (problem.label === 'Смешанное число') animMixed(stage, problem.frac, answer);
    else animSimplify(stage, problem.frac, answer);
  }
}

function animMultiply(stage, a, b, answer) {
  const rawN = a.n * b.n, rawD = a.d * b.d;
  const g = gcd(rawN, rawD);

  const tProb = 0.1, tHlN = 0.5, tCalcN = 0.9, tHlD = 1.7, tCalcD = 2.1, tRes = 2.9;
  const tCalcG = 3.7, tStrike = 4.5, tFinal = g > 1 ? 5.7 : 3.7;

  const probRow = `<div class="av-prob-row" style="opacity:0;animation:gentleRise 0.55s ease ${tProb}s both">
    ${hFrac(a.n, a.d, '', {hlAnim:`hlNum 0.4s ease ${tHlN}s both`}, {hlAnim:`hlDen 0.4s ease ${tHlD}s both`})}
    <span class="av-op-sym">×</span>
    ${hFrac(b.n, b.d, '', {hlAnim:`hlNum 0.4s ease ${tHlN}s both`}, {hlAnim:`hlDen 0.4s ease ${tHlD}s both`})}
  </div>`;
  const calcNRow = hCalc(`<span class="hl-n">${a.n} × ${b.n}</span> = <strong>${rawN}</strong> <span class="av-tag">числители</span>`, tCalcN);
  const calcDRow = hCalc(`<span class="hl-d">${a.d} × ${b.d}</span> = <strong>${rawD}</strong> <span class="av-tag">знаменатели</span>`, tCalcD);
  const resRow = g > 1
    ? hRes(hFrac(rawN, rawD, '', {strikeDelay: tStrike, newVal: answer.n}, {strikeDelay: tStrike, newVal: answer.d}), tRes)
    : hRes(hFrac(rawN, rawD, '', null, null), tRes);
  const calcGRow = g > 1 ? hCalc(`НОД(${rawN}, ${rawD}) = <strong>${g}</strong> — сокращаем`, tCalcG) : '';

  stage.innerHTML = probRow + calcNRow + calcDRow + resRow + calcGRow + hFinal(answer, tFinal);
  at((tFinal + 1.3) * 1000, () => document.getElementById('btn-hint-ok').classList.add('visible'));
}

function animDivide(stage, a, b, answer) {
  const rawN = a.n * b.d, rawD = a.d * b.n;
  const g = gcd(rawN, rawD);

  const tProb = 0.1, tCalcFlip = 0.5, tFlipped = 1.3, tHlN = 1.7, tCalcN = 2.1;
  const tHlD = 2.9, tCalcD = 3.3, tRes = 4.1, tCalcG = 4.9, tStrike = 5.7;
  const tFinal = g > 1 ? 6.9 : 4.9;

  const probRow = `<div class="av-prob-row" style="opacity:0;animation:gentleRise 0.55s ease ${tProb}s both">
    ${hFrac(a.n, a.d, '', null, null)}
    <span class="av-op-sym">÷</span>
    ${hFrac(b.n, b.d, '', null, null)}
  </div>`;
  const calcFlipRow = hCalc('Переворачиваем вторую дробь', tCalcFlip);
  const flippedRow = `<div class="av-calc-row" style="opacity:0;animation:gentleRise 0.55s ease ${tFlipped}s both">
    <div class="av-prob-row">
      ${hFrac(a.n, a.d, '', {hlAnim:`hlNum 0.4s ease ${tHlN}s both`}, {hlAnim:`hlDen 0.4s ease ${tHlD}s both`})}
      <span class="av-op-sym">×</span>
      ${hFrac(b.d, b.n, '', {hlAnim:`hlNum 0.4s ease ${tHlN}s both`}, {hlAnim:`hlDen 0.4s ease ${tHlD}s both`})}
    </div>
  </div>`;
  const calcNRow = hCalc(`<span class="hl-n">${a.n} × ${b.d}</span> = <strong>${rawN}</strong> <span class="av-tag">числители</span>`, tCalcN);
  const calcDRow = hCalc(`<span class="hl-d">${a.d} × ${b.n}</span> = <strong>${rawD}</strong> <span class="av-tag">знаменатели</span>`, tCalcD);
  const resRow = g > 1
    ? hRes(hFrac(rawN, rawD, '', {strikeDelay: tStrike, newVal: answer.n}, {strikeDelay: tStrike, newVal: answer.d}), tRes)
    : hRes(hFrac(rawN, rawD, '', null, null), tRes);
  const calcGRow = g > 1 ? hCalc(`НОД(${rawN}, ${rawD}) = <strong>${g}</strong> — сокращаем`, tCalcG) : '';

  stage.innerHTML = probRow + calcFlipRow + flippedRow + calcNRow + calcDRow + resRow + calcGRow + hFinal(answer, tFinal);
  at((tFinal + 1.3) * 1000, () => document.getElementById('btn-hint-ok').classList.add('visible'));
}

function animAdd(stage, a, b, answer) {
  const l = lcm(a.d, b.d);
  const an = a.n * (l / a.d);
  const bn = b.n * (l / b.d);
  const rawN = an + bn;
  const g = gcd(rawN, l);

  const tProb = 0.1, tCalcLCM = 0.5, tNewProb = 1.4, tCalcSum = 2.6, tRes = 3.5;
  const tCalcG = 4.3, tStrike = 5.1, tFinal = g > 1 ? 6.3 : 4.3;

  const probRow = `<div class="av-prob-row" style="opacity:0;animation:gentleRise 0.55s ease ${tProb}s both">
    ${hFrac(a.n, a.d, '', null, null)}
    <span class="av-op-sym">+</span>
    ${hFrac(b.n, b.d, '', null, null)}
  </div>`;
  const calcLCMRow = hCalc(`НОК(${a.d}, ${b.d}) = <strong>${l}</strong>`, tCalcLCM);
  const newProbRow = `<div class="av-calc-row" style="opacity:0;animation:gentleRise 0.55s ease ${tNewProb}s both">
    <div class="av-prob-row">
      ${hFrac(an, l, '', {hlAnim:`hlNum 0.4s ease ${tNewProb+0.3}s both`}, null)}
      <span class="av-op-sym">+</span>
      ${hFrac(bn, l, '', {hlAnim:`hlNum 0.4s ease ${tNewProb+0.3}s both`}, null)}
    </div>
  </div>`;
  const calcSumRow = hCalc(`<span class="hl-n">${an} + ${bn}</span> = <strong>${rawN}</strong>`, tCalcSum);
  const resRow = g > 1
    ? hRes(hFrac(rawN, l, '', {strikeDelay: tStrike, newVal: answer.n}, {strikeDelay: tStrike, newVal: answer.d}), tRes)
    : hRes(hFrac(rawN, l, '', null, null), tRes);
  const calcGRow = g > 1 ? hCalc(`НОД(${rawN}, ${l}) = <strong>${g}</strong> — сокращаем`, tCalcG) : '';

  stage.innerHTML = probRow + calcLCMRow + newProbRow + calcSumRow + resRow + calcGRow + hFinal(answer, tFinal);
  at((tFinal + 1.3) * 1000, () => document.getElementById('btn-hint-ok').classList.add('visible'));
}

function animSimplify(stage, f, answer) {
  const g = gcd(f.n, f.d);

  const tProb = 0.1, tCalcG = 0.5, tCalcN = 1.3, tCalcD = 2.1, tStrike = 2.9, tFinal = 4.1;

  const probRow = `<div class="av-prob-row" style="opacity:0;animation:gentleRise 0.55s ease ${tProb}s both">
    ${hFrac(f.n, f.d, '', {strikeDelay: tStrike, newVal: answer.n}, {strikeDelay: tStrike, newVal: answer.d})}
  </div>`;
  const calcGRow = hCalc(`НОД(${f.n}, ${f.d}) = <strong>${g}</strong>`, tCalcG);
  const calcNRow = hCalc(`<span class="hl-n">${f.n}</span> ÷ ${g} = <strong>${answer.n}</strong> <span class="av-tag">числитель</span>`, tCalcN);
  const calcDRow = hCalc(`<span class="hl-d">${f.d}</span> ÷ ${g} = <strong>${answer.d}</strong> <span class="av-tag">знаменатель</span>`, tCalcD);

  stage.innerHTML = probRow + calcGRow + calcNRow + calcDRow + hFinal(answer, tFinal);
  at((tFinal + 1.3) * 1000, () => document.getElementById('btn-hint-ok').classList.add('visible'));
}

function animSubtract(stage, a, b, answer) {
  const l = lcm(a.d, b.d);
  const an = a.n * (l / a.d);
  const bn = b.n * (l / b.d);
  const rawN = an - bn;
  const g = gcd(rawN, l);

  const tProb = 0.1, tCalcLCM = 0.5, tNewProb = 1.4, tCalcDiff = 2.6, tRes = 3.5;
  const tCalcG = 4.3, tStrike = 5.1, tFinal = g > 1 ? 6.3 : 4.3;

  const probRow = `<div class="av-prob-row" style="opacity:0;animation:gentleRise 0.55s ease ${tProb}s both">
    ${hFrac(a.n, a.d, '', null, null)}
    <span class="av-op-sym">−</span>
    ${hFrac(b.n, b.d, '', null, null)}
  </div>`;
  const calcLCMRow = hCalc(`НОК(${a.d}, ${b.d}) = <strong>${l}</strong>`, tCalcLCM);
  const newProbRow = `<div class="av-calc-row" style="opacity:0;animation:gentleRise 0.55s ease ${tNewProb}s both">
    <div class="av-prob-row">
      ${hFrac(an, l, '', {hlAnim:`hlNum 0.4s ease ${tNewProb+0.3}s both`}, null)}
      <span class="av-op-sym">−</span>
      ${hFrac(bn, l, '', {hlAnim:`hlNum 0.4s ease ${tNewProb+0.3}s both`}, null)}
    </div>
  </div>`;
  const calcDiffRow = hCalc(`<span class="hl-n">${an} − ${bn}</span> = <strong>${rawN}</strong>`, tCalcDiff);
  const resRow = g > 1
    ? hRes(hFrac(rawN, l, '', {strikeDelay: tStrike, newVal: answer.n}, {strikeDelay: tStrike, newVal: answer.d}), tRes)
    : hRes(hFrac(rawN, l, '', null, null), tRes);
  const calcGRow = g > 1 ? hCalc(`НОД(${rawN}, ${l}) = <strong>${g}</strong> — сокращаем`, tCalcG) : '';

  stage.innerHTML = probRow + calcLCMRow + newProbRow + calcDiffRow + resRow + calcGRow + hFinal(answer, tFinal);
  at((tFinal + 1.3) * 1000, () => document.getElementById('btn-hint-ok').classList.add('visible'));
}

function animMixed(stage, f, answer) {
  const tProb = 0.1, tCalcDiv = 0.5, tCalcRem = 1.4, tFinal = 2.5;
  const rem = f.n - f.d * answer.whole;

  const probRow = `<div class="av-prob-row" style="opacity:0;animation:gentleRise 0.55s ease ${tProb}s both">
    ${hFrac(f.n, f.d, '', null, null)}
  </div>`;
  const calcDivRow = hCalc(`${f.n} ÷ ${f.d} = <strong>${answer.whole}</strong> <span class="av-tag">целая часть</span>`, tCalcDiv);
  const calcRemRow = hCalc(`${f.n} − ${f.d} × ${answer.whole} = <strong>${rem}</strong> <span class="av-tag">остаток → числитель</span>`, tCalcRem);
  const finalRow = `<div class="av-final-row" style="opacity:0;animation:gentleRise 0.7s ease ${tFinal}s both">
    <span class="av-eq-sym">=</span>${hMixed(answer.whole, answer.n, answer.d)}
  </div>`;

  stage.innerHTML = probRow + calcDivRow + calcRemRow + finalRow;
  at((tFinal + 1.3) * 1000, () => document.getElementById('btn-hint-ok').classList.add('visible'));
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
let _scrollInterval = null;
let _animStartTime = 0;
let _lastScrolledEl = null;

function showHint(problem, answer) {
  document.getElementById('hint-overlay').classList.add('active');
  _animStartTime = Date.now();
  _lastScrolledEl = null;
  playAnimation(problem, answer);

  clearInterval(_scrollInterval);
  _scrollInterval = setInterval(() => {
    const stage = document.getElementById('anim-stage');
    if (!stage) return;
    const elapsed = (Date.now() - _animStartTime) / 1000;
    let lastEl = null;
    stage.querySelectorAll('[data-appear]').forEach(el => {
      if (parseFloat(el.dataset.appear) <= elapsed) lastEl = el;
    });
    if (lastEl && lastEl !== _lastScrolledEl) {
      _lastScrolledEl = lastEl;
      lastEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, 150);
}

function hideHint() {
  document.getElementById('hint-overlay').classList.remove('active');
  clearAnimTimers();
  clearInterval(_scrollInterval);
  _scrollInterval = null;
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

    document.querySelectorAll('.choice-btn').forEach(b => {
      if (b._fracData && fracEqual(b._fracData, correct)) b.classList.add('reveal');
    });

    setTimeout(() => {
      overlay.className = 'feedback-overlay';
      nextQuestion();
    }, 1200);
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

    if (frac.whole !== undefined) {
      btn.appendChild(makeMixedEl(frac.whole, frac.n, frac.d));
    } else {
      const s = simplify(frac.n, frac.d);
      if (s.d === 1) {
        const span = document.createElement('span');
        span.className = 'whole-num';
        span.textContent = s.n;
        btn.appendChild(span);
      } else {
        btn.appendChild(makeFracEl(frac));
      }
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
      nextQuestion();
    }, 1200);
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
function initTheme() {
  const saved = localStorage.getItem('frac_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  document.getElementById('btn-theme').textContent = saved === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('frac_theme', next);
  document.getElementById('btn-theme').textContent = next === 'dark' ? '☀️' : '🌙';
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  document.getElementById('btn-theme').addEventListener('click', toggleTheme);

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
