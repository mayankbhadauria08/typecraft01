// Allowed-characters check for the TypeCraft course. No dependencies.
// Run: node tests/check-lessons.mjs   (exit code 1 on any failure)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ctx = vm.createContext({ console, Math, Date, Set, Map, Array, Object, String, JSON });
for (const f of ['shared/course-meta.js', 'js/course.js']) {
  vm.runInContext(readFileSync(join(root, f), 'utf8'), ctx, { filename: f });
}
const META = ctx.TC_META, C = ctx.TC_COURSE;
const RUNS = 50;
const failures = [];
const fail = (msg) => { if (failures.length < 200) failures.push(msg); else failures.length++; };
const show = (c) => JSON.stringify(c);

// Today's titles for the permanent ids (from index.html, version 1).
const TODAY = {
  l1: 'Home Base', l2: 'Adding D & K', l3: 'Adding S & L', l4: 'Adding A & ;', l5: 'Filling In G & H',
  l6: 'Home Row Fluency', l7: 'Reaching for E & I', l8: 'Reaching for R & T', l9: 'Reaching for W & O',
  l10: 'Reaching for U & P', l11: 'Reaching for Y & Q', l12: 'Number Row: 1–5', l13: 'Number Row: 6–0',
  l14: 'Reaching for V & M', l18: 'Reaching for B & N', l15: 'Reaching for C & ,', l16: 'Reaching for X & .',
  l17: 'Reaching for Z & /', l19: 'Shift & Capitals', l20: 'Punctuation & Symbols', l21: 'Common Words Sprint',
  l22: 'Sentence Fluency', l23: 'Paragraph Practice', l24: 'Timed Challenge',
};

if (!C) { console.error('TC_COURSE not defined'); process.exit(1); }

// ---- structure ----
const ids = C.lessons.map((l) => l.id);
if (ids.length !== 78) fail(`expected 78 lessons, got ${ids.length}`);
if (new Set(ids).size !== ids.length) fail('lesson ids are not unique');
if (ids.join() !== META.ORDER.join()) fail('lessons are not in TC_META.ORDER');
for (const [id, title] of Object.entries(TODAY)) {
  const l = C.byId(id);
  if (!l) fail(`${id} missing`);
  else if (l.title !== title) fail(`${id} title is ${show(l.title)}, expected ${show(title)}`);
}
for (const l of C.lessons) {
  const m = META.BY_ID[l.id];
  if (!m || m.level !== l.level || m.unit !== l.unit || m.kind !== l.kind) fail(`${l.id} level/unit/kind differ from TC_META`);
  if (!l.watch || !Array.isArray(l.watch.keys) || typeof l.watch.note !== 'string') fail(`${l.id} has no watch {keys, note}`);
  if (!(l.allowed instanceof ctx.Set)) fail(`${l.id} has no allowed set`);
  if (l.numpad && !l.note) fail(`${l.id} numpad lesson has no note`);
  for (const c of l.teach || '') if (/[A-Z]/.test(c) && !l.allowShift) fail(`${l.id} teaches capital ${c} without shift`);
}
const firstShift = C.lessons.find((l) => l.allowShift);
if (!firstShift || firstShift.id !== 'l50') fail(`first Shift lesson is ${firstShift && firstShift.id}, expected l50`);

// ---- characters ----
const violations = {};
function checkText(l, where, text) {
  if (typeof text !== 'string') { fail(`${l.id} ${where}: not a string`); return; }
  for (const c of text) {
    const capital = c !== c.toLowerCase();
    if (!l.allowed.has(c) || (capital && !l.allowShift)) {
      const key = `${l.id} ${where}`;
      violations[key] = violations[key] || new Set();
      violations[key].add(c);
    }
  }
}
let generated = 0, stepCount = 0;
for (const l of C.lessons) {
  // the static drill content
  checkText(l, 'charDrill', l.charDrill || '');
  (l.wordDrill || []).forEach((w) => checkText(l, 'wordDrill', w));
  [l.paragraphDrill || ''].concat(l.paragraphs || []).forEach((p) => checkText(l, 'paragraphs', p));
  const steps = C.steps(l);
  if (!steps.length) fail(`${l.id} has no steps`);
  stepCount += steps.length;
  for (const step of steps) {
    if (!C.STEP_LABEL[step]) fail(`${l.id} step ${step} has no label`);
    for (let i = 0; i < RUNS; i++) {
      const t = C.stepText(l, step); generated++;
      if (step !== 'watch' && !t.trim()) { fail(`${l.id} ${step}: empty text`); break; }
      if (step === 'challenge' && t.split(' ').length < 30) fail(`${l.id} challenge too short (${t.split(' ').length} words)`);
      if (step === 'timed' && t.length < (l.timed / 60) * 300) fail(`${l.id} timed text too short for ${l.timed}s`);
      checkText(l, step, t);
    }
  }
  if (l.kind === 'boss') {
    for (let i = 0; i < RUNS; i++) {
      const b = C.bossWords(l);
      for (const p of ['phase1', 'phase2', 'phase3']) {
        if (!b[p] || !b[p].length) fail(`${l.id} boss ${p} empty`);
        else b[p].forEach((w) => { if (/\s/.test(w)) fail(`${l.id} boss word has a space`); checkText(l, 'bossWords', w); });
      }
    }
  }
}
for (const [k, set] of Object.entries(violations)) fail(`${k}: not allowed ${[...set].map(show).join(' ')}`);

// ---- arcade, placement, daily ----
const none = C.allowedThrough(null), l6 = C.byId('l6');
if ([...none.chars].sort().join('') !== [...l6.allowed].sort().join('')) fail('allowedThrough(null) is not l6\'s set');
for (const l of C.lessons) {
  const a = C.allowedThrough(l.id);
  a.words.forEach((w) => { for (const c of w) if (!l.allowed.has(c)) fail(`allowedThrough(${l.id}) word ${w} uses ${c}`); });
}
if (C.placementText().split(' ').length < 200) fail('placement text shorter than 2 minutes at 100 wpm');
if (/[^A-Za-z .,']/.test(C.placementText())) fail('placement text uses rare symbols');
if (C.dailyText('2026-11-14') !== C.dailyText('2026-11-14')) fail('dailyText not deterministic');
const days = new Set(); for (let d = 1; d <= 28; d++) days.add(C.dailyText(`2026-02-${String(d).padStart(2, '0')}`));
if (days.size < 10) fail(`dailyText varies too little (${days.size} of 28)`);
if (C.WORDS.TOP100.length !== 100 || C.WORDS.TOP300.length !== 300) fail('TOP100/TOP300 sizes');

// ---- summary ----
const kinds = {}; C.lessons.forEach((l) => { kinds[l.kind] = (kinds[l.kind] || 0) + 1; });
console.log(`lessons: ${C.lessons.length} (${Object.entries(kinds).map(([k, n]) => `${k} ${n}`).join(', ')})`);
console.log(`steps: ${stepCount}, texts generated: ${generated} (${RUNS} per step)`);
if (failures.length) {
  console.log(`FAIL: ${failures.length} problem(s)`);
  failures.filter(Boolean).forEach((f) => console.log('  - ' + f));
  process.exit(1);
}
console.log('OK: every step of every lesson uses only allowed characters');
