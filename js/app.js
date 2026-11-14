/* ==========================================================================
   1. COURSE — 78 lessons in five levels (js/course.js, shared/course-meta.js)
   Lesson ids l1–l24 are permanent: saved progress is keyed by them.
   The number a learner sees is the position in the course (TC_META), not the id.
   ========================================================================== */
const lessons = TC_COURSE.lessons;
const LEVELS = TC_META.LEVELS;
const LEVEL_ACCENT = {1:'#4a9a68', 2:'#4a90c2', 3:'#d2704a', 4:'#c0629a', 5:'#7d7fd1'};
const TIER_ORDER = LEVELS.map(l => l.name);                      // the level filter on the dashboard
const TIER_ACCENT = Object.fromEntries(LEVELS.map(l => [l.name, LEVEL_ACCENT[l.n]]));
const levelOf = (lesson) => LEVELS.find(l => l.n === lesson.level) || LEVELS[0];

let reviewLesson = null;   // synthetic lesson built from the person's weak keys
let specialLesson = null;  // the placement test
function getLessonById(id){
  if(id === 'review') return reviewLesson;
  if(id === 'placement') return specialLesson;
  return TC_COURSE.byId(id);
}
function lessonNumber(lesson){ const m = TC_META.BY_ID[lesson.id]; return m ? m.n : 0; }

/* ==========================================================================
   2. TEXT FOR EACH STEP (generators live in js/course.js)
   ========================================================================== */
function randInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
function pick(arr){ return arr[randInt(0, arr.length-1)]; }
const STEP_LABEL = TC_COURSE.STEP_LABEL;
const FLOW_STEPS = new Set(['challenge', 'timed', 'sprint', 'exam']);
function getStagesForLesson(lesson){
  if(lesson.isReview) return (lesson.wordDrill && lesson.wordDrill.length) ? ['character','word'] : ['character'];
  if(lesson.isPlacement) return ['timed'];
  return TC_COURSE.steps(lesson);
}
function getStageText(lesson, step){
  if(lesson.isReview) return step === 'word' ? TC_COURSE.gen.generateFromPool(lesson.wordDrill) : TC_COURSE.gen.generateFromTokens(lesson.charDrill);
  if(lesson.isPlacement) return TC_COURSE.placementText();
  return TC_COURSE.stepText(lesson, step);
}
/* seconds a step lasts when it is timed (0 = untimed) */
function stepLimit(lesson, step){
  if(!lesson) return 0;
  if(lesson.isPlacement) return 120;
  if(step === 'timed' || step === 'exam') return lesson.timed || 60;
  if(step === 'sprint') return lesson.timed || 15;
  if(step === 'challenge') return 30;
  return 0;
}

/* ==========================================================================
   3. DOM RENDERING
   ========================================================================== */
const textDisplay = document.getElementById('textDisplay');
let exerciseText = ''; let letters = [];
function renderText(text){
  textDisplay.innerHTML = '';
  const frag = document.createDocumentFragment();
  let word = null; // letters are grouped per word, so a line never breaks in the middle of one
  for(const ch of text){
    const span = document.createElement('span');
    span.className = 'letter default';
    if(ch === '\n'){ span.textContent=''; frag.appendChild(span); frag.appendChild(document.createElement('br')); word = null; continue; }
    span.textContent = (ch === ' ') ? '\u00A0' : ch;
    if(!word){ word = document.createElement('span'); word.className = 'word'; frag.appendChild(word); }
    word.appendChild(span);
    if(ch === ' ') word = null; // a space closes the word it follows, so no line starts with a blank
  }
  textDisplay.appendChild(frag);
  letters = Array.from(textDisplay.querySelectorAll('.letter'));
  if(letters.length) letters[0].classList.add('current');
}

/* ==========================================================================
   4. KEYBOARD ENGINE + LIVE METRICS + STAGE FLOW
   ========================================================================== */
const IGNORED_KEYS = new Set(['Shift','CapsLock','Control','Alt','Meta','Escape','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown','Insert','Delete','F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12']);
const shiftMap = {'!':'1','@':'2','#':'3','$':'4','%':'5','^':'6','&':'7','*':'8','(':'9',')':'0',':':';','"':"'",'<':',','>':'.','?':'/','_':'-','+':'='};
const FINGER_MAP = {'1':'lp','q':'lp','a':'lp','z':'lp','2':'lr','w':'lr','s':'lr','x':'lr','3':'lm','e':'lm','d':'lm','c':'lm',
  '4':'li','r':'li','f':'li','v':'li','5':'li','t':'li','g':'li','b':'li','6':'ri','y':'ri','h':'ri','n':'ri','7':'ri','u':'ri','j':'ri','m':'ri',
  '8':'rm','i':'rm','k':'rm',',':'rm','9':'rr','o':'rr','l':'rr','.':'rr','0':'rp','p':'rp',';':'rp',"'":'rp','/':'rp','-':'rp','=':'rp',' ':'thumb'};
const FINGER_LABEL = {lp:'Left pinky', lr:'Left ring', lm:'Left middle', li:'Left index', ri:'Right index', rm:'Right middle', rr:'Right ring', rp:'Right pinky', thumb:'Either thumb'};

let currentLessonId = null;
let currentStage = 0; let stages = [];
// correctKeystrokes = correct characters currently on the sheet (plus finished stages);
// backspacing over a correct letter takes it back off, so retyping can't inflate WPM
let currentIndex=0, totalKeystrokes=0, correctKeystrokes=0, errorCount=0, startTime=null, sampleIntervalHandle=null, clockHandle=null, wpmSamples=[], lessonFinished=false;
const wpmValueEl=document.getElementById('statWpm'), accValueEl=document.getElementById('statAcc'), errValueEl=document.getElementById('statErr'), timeValueEl=document.getElementById('statTime');
function timedLimit(){ return stepLimit(getLessonById(currentLessonId), stages[currentStage]); }
/* per-step snapshot, so each finished step reports its own speed and accuracy */
let stepStart = null, sprintResults = [], challengeResult = null, uncorrectedTotal = 0;
function markStepStart(){ stepStart = { t: null, correct: correctKeystrokes, total: totalKeystrokes, errors: errorCount }; }
function stepStats(){
  const st = stepStart || { t:startTime, correct:0, total:0, errors:0 };
  const t0 = st.t || startTime || Date.now();
  const secs = Math.max(0.001, (Date.now() - t0) / 1000);
  const correct = correctKeystrokes - st.correct, total = totalKeystrokes - st.total, errors = errorCount - st.errors;
  const limit = timedLimit();
  const usedSecs = limit ? Math.min(limit, secs) : secs;
  return { wpm: Math.min(400, Math.round((correct / 5) / (usedSecs / 60))), accuracy: total ? Math.max(0, Math.round((total - errors) / total * 100)) : 100, errors, seconds: Math.round(usedSecs) };
}
function elapsedSeconds(){ return startTime ? (Date.now()-startTime)/1000 : 0; }
/* the Time keycap: counts up, or down from the limit in the timed challenge (which ends at zero) */
function updateClock(){
  const limit = timedLimit(), elapsed = elapsedSeconds();
  const stepElapsed = stepStart && stepStart.t ? (Date.now() - stepStart.t) / 1000 : 0;
  timeValueEl.textContent = (limit ? Math.max(0, limit-stepElapsed) : elapsed).toFixed(1)+'s';
  if(limit){
    updateCarriage();
    const st = stepStart && stepStart.t ? (Date.now() - stepStart.t) / 1000 : elapsed;
    if(st >= limit && !lessonFinished) stepTimeUp();
  }
}
/* a timed step ran out: sprints repeat, a Challenge in the middle moves on, the last step finishes the lesson */
function stepTimeUp(){
  const step = stages[currentStage];
  if(step === 'sprint'){
    const r = stepStats(); sprintResults.push(r);
    const lesson = getLessonById(currentLessonId);
    if(sprintResults.length < (lesson.sprints || 5)){
      stopTimers(); startTime = null; currentIndex = 0;
      correctKeystrokes = totalKeystrokes = errorCount = 0;
      showStepNote(`Sprint ${sprintResults.length} done: ${r.wpm} wpm at ${r.accuracy}%. Sprint ${sprintResults.length+1} of ${lesson.sprints || 5} starts when you type.`);
      loadStage(); return;
    }
    return finishLesson();
  }
  finishStep();
}
function showStepNote(text){ const n=document.getElementById('stepNote'); n.textContent=text||''; n.hidden=!text; }

function currentWpm(){ if(!startTime) return 0; const m=(Date.now()-startTime)/60000; return m<=0?0:Math.round((correctKeystrokes/5)/m); }
function currentAccuracy(){ if(totalKeystrokes===0) return 100; return Math.max(0, Math.round(((totalKeystrokes-errorCount)/totalKeystrokes)*100)); }
function updateStatsDisplay(){ wpmValueEl.textContent=currentWpm(); accValueEl.textContent=currentAccuracy()+'%'; errValueEl.textContent=errorCount; machineReadings(); }
function updateCaretPosition(){ letters.forEach(l=>l.classList.remove('current')); if(currentIndex<letters.length) letters[currentIndex].classList.add('current'); }
function startTimerIfNeeded(){
  if(startTime) return;
  startTime = Date.now(); wpmSamples = [];
  sampleIntervalHandle = setInterval(()=>{ wpmSamples.push({t:(Date.now()-startTime)/1000, wpm: currentWpm()}); }, 5000);
  clockHandle = setInterval(updateClock, 100);
}
function stopTimers(){ clearInterval(sampleIntervalHandle); clearInterval(clockHandle); }

/* ---- per-character weak-key tracking (in-memory during session, flushed to localStorage) ---- */
let keyStats = {};
function recordKeyResult(ch, isCorrect){
  if(ch === ' ' || ch === '\n') return;
  if(!keyStats[ch]) keyStats[ch] = {attempts:0, errors:0};
  keyStats[ch].attempts++;
  if(!isCorrect) keyStats[ch].errors++;
}
// kvGet / kvSet (section 13) read and write this browser's storage, or the account when signed in
function saveKeyStats(){ kvSet('typingMasterKeyStats', JSON.stringify(keyStats)); saveAnalytics(); }
function loadKeyStats(){ try{ keyStats = JSON.parse(kvGet('typingMasterKeyStats') || '{}'); }catch(e){ keyStats = {}; } }

function updateHands(fingerKey){
  document.querySelectorAll('.finger, .thumb').forEach(el => el.classList.remove('active'));
  if(!fingerKey) return;
  if(fingerKey === 'thumb'){ document.querySelectorAll('[data-finger="thumb-l"], [data-finger="thumb-r"]').forEach(el=>el.classList.add('active')); }
  else{ const el = document.querySelector(`.hands-stage [data-finger="${fingerKey}"]`); if(el) el.classList.add('active'); }
}
function nextExpectedChar(){ if(currentIndex>=letters.length) return null; return exerciseText[currentIndex]; }
function updateFingerGuide(){
  const fingerCaption = document.getElementById('fingerCaption');
  const ch = nextExpectedChar();
  if(ch === null){ fingerCaption.innerHTML='&nbsp;'; updateHands(null); return; }
  let target = ch.toLowerCase();
  let needsShift = ch !== ch.toLowerCase() && ch.toLowerCase() !== ch.toUpperCase();
  if(target === ' ') target = ' ';
  if(shiftMap[ch]){ target = shiftMap[ch]; needsShift = true; }
  const fingerKey = FINGER_MAP[target] || 'thumb';
  fingerCaption.innerHTML = `Reach with: <b>${FINGER_LABEL[fingerKey]}${needsShift ? ' + Shift' : ''}</b>`;
  updateHands(fingerKey);
}

function updateCarriage(){
  const railEl = document.querySelector('.rail'); const carriageEl = document.getElementById('carriage');
  const limit = timedLimit();
  const stepElapsed = stepStart && stepStart.t ? (Date.now() - stepStart.t) / 1000 : 0;
  const pct = limit ? Math.min(1, stepElapsed/limit) : (letters.length ? Math.min(1, currentIndex/letters.length) : 0);
  const railWidth = railEl.clientWidth - 26;
  carriageEl.style.left = (pct*railWidth)+'px';
}

function renderStageRow(){
  const row = document.getElementById('stageRow');
  const labels = Object.assign({}, STEP_LABEL, { timed: (getLessonById(currentLessonId)||{}).isPlacement ? '2-minute placement test' : STEP_LABEL.timed });
  row.innerHTML = stages.map((s,i)=>{
    const cls = i===currentStage ? 'current' : (i<currentStage ? 'done' : '');
    return `<span class="stage-pill ${cls}" data-stage-index="${i}" style="cursor:pointer;">${i+1}. ${labels[s]}</span>`;
  }).join('');
  // all stages are freely selectable — click any pill to jump straight to Words or Paragraph
  row.querySelectorAll('.stage-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      currentStage = parseInt(pill.dataset.stageIndex, 10);
      resetLessonState();
      loadStage();
    });
  });
}

let watchTimer = null, bossHandle = null;
function loadStage(){
  flushPendingSkip();
  const lesson = getLessonById(currentLessonId);
  const step = stages[currentStage];
  clearInterval(watchTimer);
  document.getElementById('watchPanel').hidden = step !== 'watch';
  document.getElementById('bossMount').hidden = step !== 'boss';
  lessonView.classList.toggle('mode-watch', step === 'watch');
  lessonView.classList.toggle('mode-boss', step === 'boss');
  if(bossHandle && step !== 'boss'){ bossHandle.destroy(); bossHandle = null; }
  if(step === 'watch') return startWatch(lesson);
  if(step === 'boss') return startBoss(lesson);
  exerciseText = getStageText(lesson, step);
  renderText(exerciseText);
  currentIndex = 0;
  markStepStart();
  if(lessonMachine){ lessonMachine.setText(exerciseText); lessonMachine.setPosition(0); machineMeta(); machineReadings(); }
  updateCaretPosition(); updateCarriage(); updateFingerGuide(); renderStageRow();
  if(!lesson.isReview && !lesson.isPlacement) notePosition(currentLessonId, currentStage);
}
/* Watch: about five seconds, not scored, with Skip — which finger presses each new key */
function startWatch(lesson){
  renderStageRow();
  const w = lesson.watch || { keys: lesson.keys || [], note: '' };
  const keys = (w.keys || []).filter(k => typeof k === 'string' && k.length === 1);
  document.getElementById('watchKeys').innerHTML = keys.length ? keys.map(k => {
    const t = shiftMap[k] || k.toLowerCase(); const f = FINGER_MAP[t] || 'thumb';
    return `<div class="watch-key"><kbd>${k === ' ' ? 'space' : esc(k)}</kbd><span>${FINGER_LABEL[f]}${(k !== k.toLowerCase() || shiftMap[k]) ? ' + Shift' : ''}</span></div>`;
  }).join('') : `<div class="watch-key wide"><kbd>${esc(lesson.title)}</kbd></div>`;
  document.getElementById('watchNote').textContent = w.note || '';
  const bar = document.getElementById('watchBar'); const t0 = Date.now();
  bar.style.width = '0%';
  watchTimer = setInterval(() => { const p = Math.min(1, (Date.now()-t0)/5000); bar.style.width = (p*100)+'%'; if(p >= 1) endWatch(); }, 100);
  if(!lesson.isReview) notePosition(currentLessonId, currentStage);
}
function endWatch(){ clearInterval(watchTimer); if(stages[currentStage] !== 'watch') return; currentStage++; resetStepOnly(); loadStage(); }
document.getElementById('watchSkip').addEventListener('click', endWatch);
/* the boss fight runs the arcade's boss engine inside the lesson */
function startBoss(lesson){
  renderStageRow();
  const el = document.getElementById('bossMount'); el.innerHTML = '';
  const b = TC_COURSE.bossWords(lesson);
  bossHandle = TC_GAMES.get('boss').mount(el, Object.assign(arcadeCtx('boss'), {
    bossLesson: { id: lesson.id, title: lesson.title, words: b },
    onEnd: (r) => finishBoss(lesson, r || {}),
    onBack: backToDashboard,
  }));
}
function resetStepOnly(){ stopTimers(); startTime = null; showStepNote(''); }

/* ---- keyboard adjacency map, for classifying "adjacent key" errors ---- */
const KEY_ROWS = ["1234567890","qwertyuiop","asdfghjkl;","zxcvbnm,./"];
function keyCoord(ch){
  const c = (ch||'').toLowerCase();
  for(let r=0;r<KEY_ROWS.length;r++){ const idx=KEY_ROWS[r].indexOf(c); if(idx!==-1) return {row:r, col:idx}; }
  return null;
}
function isAdjacentKey(a,b){
  const pa=keyCoord(a), pb=keyCoord(b);
  if(!pa||!pb) return false;
  return Math.abs(pa.row-pb.row)<=1 && Math.abs(pa.col-pb.col)<=1 && !(pa.row===pb.row && pa.col===pb.col);
}

/* ---- error-pattern classification + key-transition latency (feeds the Typing Coach) ----
   Every error is classified exactly once. Typing the NEXT letter in place of the
   current one is ambiguous until the following keystroke: if that keystroke is the
   skipped letter it was a transposition (one swap, counted once); if it carries on
   with the letter after, a letter was skipped (omission); otherwise it is judged
   as an ordinary slip. */
let bigramLatency = {};   // "a>b" -> {count, totalMs}
let errorClasses = {adjacent:0, transposition:0, omission:0, other:0};
let lastKeyTime = null, lastExpectedChar = null, lastKeystrokeWasCorrect = true, pendingSkip = null;

function recordBigramLatency(pairKey, ms){
  if(ms <= 0 || ms > 3000) return; // ignore pauses (not meaningful "rhythm" data)
  if(!bigramLatency[pairKey]) bigramLatency[pairKey] = {count:0, totalMs:0};
  bigramLatency[pairKey].count++; bigramLatency[pairKey].totalMs += ms;
}
function isOmissionPattern(position, typedChar){
  for(let look=2; look<=3; look++){
    if(exerciseText[position+look] && typedChar.toLowerCase()===exerciseText[position+look].toLowerCase()) return true;
  }
  return false;
}
function bumpErrorClass(category){ errorClasses[category] = (errorClasses[category]||0) + 1; }
function slipCategory(expectedChar, typedChar){ return isAdjacentKey(expectedChar, typedChar) ? 'adjacent' : 'other'; }
function flushPendingSkip(){
  if(!pendingSkip) return;
  bumpErrorClass(slipCategory(pendingSkip.expected, pendingSkip.typed));
  pendingSkip = null;
}
function classifyKeystroke(expectedChar, typedChar, position, isCorrect){
  const same = (a,b) => !!a && !!b && a.toLowerCase()===b.toLowerCase();
  if(pendingSkip){
    const p = pendingSkip; pendingSkip = null;
    if(position === p.expectPos && !isCorrect && same(typedChar, p.expected)){ bumpErrorClass('transposition'); return; }
    // carrying on with the letter after means one letter was skipped: one omission, and this keystroke is part of it
    if(position === p.expectPos && same(typedChar, exerciseText[position+1])){ bumpErrorClass('omission'); return; }
    bumpErrorClass(slipCategory(p.expected, p.typed));
  }
  if(isCorrect) return;
  if(same(typedChar, exerciseText[position+1])){ pendingSkip = { expectPos: position+1, expected: expectedChar, typed: typedChar }; return; }
  if(isOmissionPattern(position, typedChar)) bumpErrorClass('omission');
  else bumpErrorClass(slipCategory(expectedChar, typedChar));
}
function saveAnalytics(){
  kvSet('typingMasterBigramLatency', JSON.stringify(bigramLatency));
  kvSet('typingMasterErrorClasses', JSON.stringify(errorClasses));
}
function loadAnalytics(){
  try{ bigramLatency = JSON.parse(kvGet('typingMasterBigramLatency')||'{}'); }catch(e){ bigramLatency={}; }
  try{ errorClasses = JSON.parse(kvGet('typingMasterErrorClasses')||'{"adjacent":0,"transposition":0,"omission":0,"other":0}'); }catch(e){ errorClasses={adjacent:0,transposition:0,omission:0,other:0}; }
  // tallies saved in this browser before v2 over-counted transpositions, so that tally restarts once
  if(!Account.user) try{
    if(localStorage.getItem('typingMasterErrorClassesVersion') !== '2'){
      errorClasses = {adjacent:0, transposition:0, omission:0, other:0};
      localStorage.setItem('typingMasterErrorClassesVersion', '2');
      localStorage.setItem('typingMasterErrorClasses', JSON.stringify(errorClasses));
    }
  }catch(e){}
}

/* keys meant for something else: Ctrl/Cmd/Alt shortcuts (AltGr, which Windows reports as
   Ctrl+Alt, still types), and anything typed while the feedback box or another field is in use */
function isShortcut(e){ return e.metaKey || (e.ctrlKey && !e.altKey) || (e.altKey && !e.ctrlKey); }
const CAPTURE_IDS = new Set(['typer']);
function typingElsewhere(e){
  for(const id of ['feedbackModal','authModal','importModal']) if(!document.getElementById(id).classList.contains('hidden')) return true;
  const t = e.target;
  if(!t || !t.tagName) return false;
  const field = t.tagName==='TEXTAREA' || t.tagName==='INPUT' || t.tagName==='SELECT' || t.isContentEditable;
  return field && !CAPTURE_IDS.has(t.id);
}

function handleKeydown(e){
  const lessonOpen = lessonView.style.display !== 'none';
  if(!lessonOpen || typingElsewhere(e) || isShortcut(e)) return;
  if(e.key === 'Tab'){ e.preventDefault(); resetLesson(); return; }
  if(stages[currentStage] === 'boss') return;                       // the boss game has its own keys
  if(stages[currentStage] === 'watch'){ if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); endWatch(); } return; }

  if(document.activeElement !== typer){
    typer.focus();
    // a Space before the run starts just takes focus; any other key is typed straight away
    if(e.key === ' ' && !startTime){ e.preventDefault(); return; }
  }
  if(lessonFinished) return;
  if(e.key === ' '){ e.preventDefault(); }
  if(e.key === 'Backspace'){
    e.preventDefault();
    if(currentIndex>0){
      currentIndex--;
      if(letters[currentIndex].classList.contains('correct')) correctKeystrokes--;
      letters[currentIndex].className='letter default';
      lastKeystrokeWasCorrect = false; // the next interval includes a correction, so it isn't rhythm data
      updateCaretPosition(); updateCarriage(); updateFingerGuide(); updateStatsDisplay();
      if(lessonMachine) lessonMachine.setPosition(currentIndex);
    }
    return;
  }
  if(IGNORED_KEYS.has(e.key)) return;
  if(e.key.length>1 && e.key!=='Enter') return;
  if(currentIndex>=letters.length) return;
  e.preventDefault();

  const inputChar = (e.key==='Enter') ? '\n' : e.key;
  const expectedChar = exerciseText[currentIndex];
  startTimerIfNeeded(); if(stepStart && !stepStart.t) stepStart.t = Date.now(); totalKeystrokes++;

  const isCorrect = (inputChar === expectedChar);
  recordKeyResult(expectedChar, isCorrect);
  classifyKeystroke(expectedChar, inputChar, currentIndex, isCorrect);

  // rhythm/latency tracking between consecutive CLEAN keystrokes
  const now = Date.now();
  if(lastKeyTime !== null && lastExpectedChar !== null && isCorrect && lastKeystrokeWasCorrect){
    recordBigramLatency(lastExpectedChar.toLowerCase()+'>'+expectedChar.toLowerCase(), now - lastKeyTime);
  }
  lastKeyTime = now; lastExpectedChar = expectedChar; lastKeystrokeWasCorrect = isCorrect;

  if(isCorrect){ letters[currentIndex].className='letter correct'; correctKeystrokes++; playSound('correct'); }
  else{
    errorCount++; playSound('incorrect');
    if(stages[currentStage] === 'lock'){ lockBack(); if(lessonMachine){ lessonMachine.pressKey(inputChar, false); lessonMachine.setPosition(currentIndex, { wrong:true }); } return; }
    // practice: a slip turns the key and the letter red and the caret waits for the right key.
    // Challenge, timed, sprint and exam steps measure real speed, so they move on past mistakes.
    if(lessonMachine && !FLOW_STEPS.has(stages[currentStage])){ lessonMachine.pressKey(inputChar, false); lessonMachine.setPosition(currentIndex, { wrong:true }); updateStatsDisplay(); return; }
    letters[currentIndex].className='letter incorrect';
  }
  if(lessonMachine) lessonMachine.pressKey(inputChar, isCorrect);

  currentIndex++; updateCaretPosition(); updateStatsDisplay(); updateCarriage(); updateFingerGuide();
  if(lessonMachine) lessonMachine.setPosition(currentIndex);

  if(currentIndex === letters.length){
    if(timedLimit()){ countUncorrected(); const keep = stepStart; loadStage(); stepStart = keep; }   // timed: the clock ends it, so finishing the text brings more
    else finishStep();
  }
}
document.addEventListener('keydown', handleKeydown);

/* ==========================================================================
   5. AUDIO FEEDBACK
   ========================================================================== */
let audioCtx=null;
const SOUND_KEY='typingMasterSound';
const SOUND_LEVELS=[
  {label:'sound', gain:1,    waves:'<path d="M10.2 5.6a3.3 3.3 0 0 1 0 4.8M12.1 3.7a6 6 0 0 1 0 8.6"/>'},
  {label:'quiet', gain:0.35, waves:'<path d="M10.2 5.6a3.3 3.3 0 0 1 0 4.8"/>'},
  {label:'muted', gain:0,    waves:'<path d="M10.5 6l3.5 4M14 6l-3.5 4"/>'}
];
let soundLevel = 0;
function applySoundLevel(i){
  soundLevel = (i>=0 && i<SOUND_LEVELS.length) ? i : 0;
  const lv = SOUND_LEVELS[soundLevel];
  document.getElementById('soundToggle').innerHTML = `<svg class="nb-svg" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6h2.4L7.6 3.2v9.6L4.4 10H2z"/>${lv.waves}</svg>${lv.label}`;
  try{ localStorage.setItem(SOUND_KEY, String(soundLevel)); }catch(e){}
}
function volume(){ return SOUND_LEVELS[soundLevel].gain; }
function initAudioContext(){ if(audioCtx) return; const Ctx=window.AudioContext||window.webkitAudioContext; if(Ctx) audioCtx=new Ctx(); }
document.addEventListener('keydown', initAudioContext, {once:true});
function playSound(type){
  const vol = volume();
  if(!audioCtx || vol===0) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(audioCtx.destination);
  if(type==='correct'){
    osc.type='square'; osc.frequency.setValueAtTime(1250, now);
    gain.gain.setValueAtTime(0.06*vol, now); gain.gain.exponentialRampToValueAtTime(0.0001, now+0.05);
    osc.start(now); osc.stop(now+0.06);
  } else {
    osc.type='sawtooth'; osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(70, now+0.15);
    gain.gain.setValueAtTime(0.1*vol, now); gain.gain.exponentialRampToValueAtTime(0.0001, now+0.18);
    osc.start(now); osc.stop(now+0.2);
  }
}

/* ==========================================================================
   6. STREAK + LESSON PROGRESS + PROBLEM-KEY REVIEW (all localStorage)
   ========================================================================== */
const STREAK_KEY='typingMasterStreak', PROGRESS_KEY='typingMasterProgress';
let progress = {};
function todayString(){ const d=new Date(); d.setHours(0,0,0,0); return d.toISOString().slice(0,10); }
function loadStreak(){
  let data = null;
  try{ data = JSON.parse(kvGet(STREAK_KEY)||'null'); }catch(e){}
  // more than one day since the last practice means the streak is already broken
  if(data && data.lastDate && data.count > 0){
    const diff = Math.round((new Date(todayString())-new Date(data.lastDate))/86400000);
    if(diff > 1){ data.count = 0; kvSet(STREAK_KEY, JSON.stringify(data)); }
  }
  document.getElementById('streakCount').textContent = data ? data.count : 0;
}
function recordStreak(){
  const today = todayString(); let data;
  try{ data = JSON.parse(kvGet(STREAK_KEY) || 'null'); }catch(e){ data=null; }
  if(!data){ data={lastDate:today, count:1}; }
  else if(data.lastDate===today){ /* already counted */ }
  else{ const diff=Math.round((new Date(today)-new Date(data.lastDate))/86400000); data.count=(diff===1)?data.count+1:1; data.lastDate=today; }
  kvSet(STREAK_KEY, JSON.stringify(data));
  document.getElementById('streakCount').textContent = data.count;
}
function loadProgress(){ try{ progress = JSON.parse(kvGet(PROGRESS_KEY)||'{}'); }catch(e){ progress={}; } }
function saveProgress(){ kvSet(PROGRESS_KEY, JSON.stringify(progress)); }
function starGlyphs(n){ let s=''; for(let i=0;i<3;i++) s += i<n ? '★' : '<span class="empty">★</span>'; return s; }

function computeProblemKeys(){
  return Object.entries(keyStats)
    .map(([ch, s]) => ({ char: ch, attempts: s.attempts, errors: s.errors, rate: s.errors/s.attempts }))
    .filter(k => k.attempts >= 5 && k.errors > 0)
    .sort((a,b) => b.rate - a.rate || b.errors - a.errors)
    .slice(0, 6);
}
function buildReviewLesson(problemKeys){
  const chars = problemKeys.map(p => p.char);
  const fragTokens = [];
  for(let i=0;i<14;i++){
    const len = randInt(2,3); let frag='';
    for(let j=0;j<len;j++) frag += chars[randInt(0,chars.length-1)];
    fragTokens.push(frag);
  }
  const allWords = new Set();
  lessons.forEach(l => { if(Array.isArray(l.wordDrill)) l.wordDrill.forEach(w => allWords.add(w)); });
  const matched = Array.from(allWords).filter(w => chars.some(c => w.toLowerCase().includes(c.toLowerCase())));
  return {
    id:'review', tier:'Review — Problem Keys', isReview:true,
    keys: chars.map(c => c===' ' ? 'space' : c),
    title:'Problem Key Practice',
    charDrill: fragTokens.join(' '),
    wordDrill: matched.slice(0,12),
    paragraphDrill: ''
  };
}
function renderReviewPanel(){
  const panel = document.getElementById('reviewPanel');
  const problemKeys = computeProblemKeys();
  if(problemKeys.length === 0){
    panel.innerHTML = `<div class="review-info"><div class="review-title">problem keys</div><div class="review-empty">Complete a few lessons and your weakest keys will show up here.</div></div>`;
    return;
  }
  // recordKeyResult() skips spaces and newlines, so every char here is printable
  panel.innerHTML = `
    <div class="review-info">
      <div class="review-title">problem keys</div>
      <div class="review-keys">${problemKeys.map(k => `<span class="review-key-chip">${k.char} · ${Math.round((1-k.rate)*100)}%</span>`).join('')}</div>
    </div>
    <button class="btn danger" id="practiceProblemBtn">Practice these keys</button>
  `;
  document.getElementById('practiceProblemBtn').addEventListener('click', () => {
    reviewLesson = buildReviewLesson(problemKeys);
    openLesson('review');
  });
}

/* ==========================================================================
   6b. TYPING COACH — the analytics bot
   Reads bigramLatency (rhythm) + errorClasses (error pattern) and produces
   plain-language, targeted feedback, plus a generator for a custom drill.
   ========================================================================== */
function getExtremeBigram(wantSlow){
  let best = null;
  Object.entries(bigramLatency).forEach(([pair, d]) => {
    if(d.count < 3 || pair.length !== 3 || /\s/.test(pair[0]+pair[2])) return; // "a>b"; transitions into or out of a space are skipped

    const avg = d.totalMs / d.count;
    if(!best || (wantSlow ? avg > best.avg : avg < best.avg)) best = {pair, avg, count:d.count};
  });
  return best;
}
function dominantErrorCategory(){
  const entries = Object.entries(errorClasses).filter(([k]) => k !== 'other');
  entries.sort((a,b) => b[1]-a[1]);
  return (entries.length && entries[0][1] > 0) ? entries[0] : null;
}
function totalAnalyticsSamples(){
  const latencyTotal = Object.values(bigramLatency).reduce((sum,d) => sum+d.count, 0);
  const errorTotal = Object.values(errorClasses).reduce((sum,v) => sum+v, 0);
  return latencyTotal + errorTotal;
}
function generateBotMessage(){
  const slow = getExtremeBigram(true);
  const fast = getExtremeBigram(false);
  const dom = dominantErrorCategory();
  const parts = [];
  if(slow && fast && slow.pair !== fast.pair){
    const sa = slow.pair[0], sb = slow.pair[2], fa = fast.pair[0], fb = fast.pair[2];
    parts.push(`You type '${fa}' to '${fb}' quickly, but your rhythm stumbles moving from '${sa}' to '${sb}'.`);
  } else if(slow){
    const sa = slow.pair[0], sb = slow.pair[2];
    parts.push(`Your rhythm stumbles moving from '${sa}' to '${sb}'.`);
  }
  if(dom){
    const [cat] = dom;
    if(cat === 'adjacent') parts.push(`Most of your misses are adjacent-key slips — focus on accuracy over raw speed for a bit.`);
    else if(cat === 'transposition') parts.push(`You're mostly swapping letter order — try typing in a steady, metronome-like flow instead of rushing ahead.`);
    else if(cat === 'omission') parts.push(`You seem to be skipping ahead of yourself — slow down slightly so every letter actually lands.`);
  }
  return parts.length ? parts.join(' ') : null;
}
function buildSmartPracticeLesson(){
  const slow = getExtremeBigram(true);
  const problemKeys = computeProblemKeys();
  const targetChars = problemKeys.length ? problemKeys.map(p=>p.char) : (slow ? [slow.pair[0], slow.pair[2]] : ['a','s']);
  const targetPair = slow ? slow.pair[0]+slow.pair[2] : targetChars.slice(0,2).join('');

  const allWords = new Set();
  lessons.forEach(l => { if(Array.isArray(l.wordDrill)) l.wordDrill.forEach(w=>allWords.add(w)); });
  let matched = Array.from(allWords).filter(w => w.toLowerCase().includes(targetPair));
  if(matched.length < 6){
    const extra = Array.from(allWords).filter(w => targetChars.some(c => w.toLowerCase().includes(c.toLowerCase())));
    matched = Array.from(new Set([...matched, ...extra]));
  }

  const fragTokens = [];
  for(let i=0;i<14;i++){
    const len = randInt(2,3); let frag='';
    for(let j=0;j<len;j++) frag += targetChars[randInt(0,targetChars.length-1)];
    fragTokens.push(frag);
  }

  // say what the drill is actually built from
  const reasons = [];
  if(problemKeys.length) reasons.push(`your least accurate keys (${problemKeys.slice(0,3).map(p => `${p.char} ${Math.round((1-p.rate)*100)}%`).join(', ')})`);
  if(slow) reasons.push(`your slowest key transition, '${slow.pair[0]}' to '${slow.pair[2]}' (about ${Math.round(slow.avg)} ms)`);
  const intro = reasons.length ? `A custom drill built from ${reasons.join(' and ')}.` : 'A general precision drill on the home row.';
  return {
    id:'smart', tier:'Coach — Smart Practice', isReview:true,
    keys: targetChars.map(c => c===' ' ? 'space' : c),
    title:'Smart Practice Drill',
    botIntro: intro,
    charDrill: fragTokens.join(' '),
    wordDrill: matched.slice(0,12),
    paragraphDrill: ''
  };
}
function renderCoachPanel(){
  const panel = document.getElementById('coachPanel');
  if(totalAnalyticsSamples() < 15){
    panel.innerHTML = `<div class="review-info"><div class="review-title">typing coach</div><div class="review-empty">Keep practicing — your coach starts spotting patterns after a bit more data.</div></div>`;
    return;
  }
  const msg = generateBotMessage() || "You're typing pretty evenly — no strong weak spots yet.";
  panel.innerHTML = `
    <div class="review-info">
      <div class="review-title">typing coach</div>
      <div class="coach-message">${msg}</div>
    </div>
    <button class="btn primary" id="smartPracticeBtn">Generate smart practice</button>
  `;
  document.getElementById('smartPracticeBtn').addEventListener('click', () => {
    reviewLesson = buildSmartPracticeLesson();
    openLesson('review');
  });
}

/* ==========================================================================
   7. WPM GRAPH (Canvas)
   ========================================================================== */
const wpmChart = document.getElementById('wpmChart');
function drawWpmGraph(samples, avgAccuracy){
  const ctx = wpmChart.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const cssW = wpmChart.clientWidth||600, cssH = wpmChart.clientHeight||200;
  wpmChart.width=cssW*dpr; wpmChart.height=cssH*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
  const w=cssW,h=cssH,padding=22; ctx.clearRect(0,0,w,h);
  const { sub, accent } = themePalette();
  if(samples.length===0){ ctx.fillStyle=sub; ctx.font='13px "IBM Plex Mono", monospace'; ctx.textAlign='center'; ctx.fillText('not enough data for a curve — nice and fast', w/2, h/2); return; }
  const maxWpm = Math.max(...samples.map(s=>s.wpm), 10);
  const stepX = (w-padding*2)/Math.max(samples.length-1,1);
  ctx.strokeStyle=sub; ctx.globalAlpha=0.18; ctx.lineWidth=1;
  for(let i=0;i<=3;i++){ const y=padding+(h-padding*2)*(i/3); ctx.beginPath(); ctx.moveTo(padding,y); ctx.lineTo(w-padding,y); ctx.stroke(); }
  ctx.globalAlpha=1;
  ctx.strokeStyle=accent; ctx.lineWidth=2.5; ctx.lineJoin='round'; ctx.beginPath();
  samples.forEach((s,i)=>{ const x=padding+i*stepX; const y=h-padding-(s.wpm/maxWpm)*(h-padding*2); if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); });
  ctx.stroke();
  ctx.lineTo(padding+(samples.length-1)*stepX, h-padding); ctx.lineTo(padding,h-padding); ctx.closePath();
  ctx.fillStyle=accent; ctx.globalAlpha=0.12; ctx.fill(); ctx.globalAlpha=1;
  const accY = h-padding-(avgAccuracy/100)*(h-padding*2);
  ctx.strokeStyle=sub; ctx.setLineDash([5,4]); ctx.lineWidth=2; ctx.beginPath();
  ctx.moveTo(padding,accY); ctx.lineTo(w-padding,accY); ctx.stroke(); ctx.setLineDash([]);
}

/* ==========================================================================
   8. VIEW SWITCHING / LESSON LIFECYCLE
   ========================================================================== */
const cardDashboard = document.getElementById('cardDashboard');
const homeView = document.getElementById('homeView');
const lessonView = document.getElementById('lessonView');
const resultsView = document.getElementById('resultsView');
const paper = document.getElementById('paper');
const typer = document.getElementById('typer');
const startHint = document.getElementById('startHint');

/* ---- home: tier filter, headline stats, lesson grid ---- */
let activeTier = 'all';
function tierShortLabel(tier){ const parts = tier.split('—'); return (parts[1] || parts[0]).trim().toLowerCase(); }
function dotGlyphs(n){ let s=''; for(let i=0;i<3;i++) s += i<n ? '●' : '<span class="empty">●</span>'; return s; }

function renderTierFilter(){
  const bar = document.getElementById('tierFilter');
  const items = [{key:'all', label:'all levels'}].concat(LEVELS.map(l => ({key:l.name, label:l.name.toLowerCase()})));
  bar.innerHTML = items.map((it,i) =>
    `${i===1 ? '<span class="config-sep"></span>' : ''}<button class="config-item${activeTier===it.key?' active':''}" data-tier="${it.key}">${it.label}</button>`
  ).join('');
  bar.querySelectorAll('.config-item').forEach(b => b.addEventListener('click', () => {
    activeTier = b.dataset.tier; renderTierFilter(); renderDashboard(); renderCourseMap();
  }));
}

function renderHomeStats(){
  const v = Progress.view, t = v ? v.totals : null;
  const entries = Object.values(progress).filter(p => !p.status || p.attempts > 0 || p.status === 'completed');
  const done = t ? t.lessonsDone : entries.filter(p => p.stars > 0).length;
  const starsEarned = t ? t.stars : entries.reduce((s,p) => s + (p.stars||0), 0);
  const bestWpm = t ? t.bestWpm : entries.reduce((m,p) => Math.max(m, p.bestWpm||0), 0);
  const avgAcc = t ? Math.round(t.avgAccuracy) : 0;
  const stat = (label,value,sub) => `<div class="hstat"><div class="hs-label">${label}</div><div class="hs-value">${value}</div><div class="hs-sub">${sub}</div></div>`;
  document.getElementById('homeStats').innerHTML =
    stat('lessons done', `${done}<span style="font-size:15px;color:var(--sub)">/${lessons.length}</span>`, 'completed') +
    stat('stars', `${starsEarned}<span style="font-size:15px;color:var(--sub)">/${lessons.length*3}</span>`, (t && t.crowns ? t.crowns + ' crowns' : 'accuracy rating')) +
    stat('best speed', bestWpm ? bestWpm + '<span style="font-size:15px;color:var(--sub)"> wpm</span>' : '—', 'personal record') +
    stat('avg accuracy', avgAcc ? avgAcc+'%' : '—', 'across runs');
}

/* the course map: five levels as one route, each a glowing keycap marker on a path that draws itself as you progress */
function renderCourseMap(){
  const el = document.getElementById('courseMap'); if(!el) return;
  const W = 1000, H = 120, xs = [70, 290, 500, 710, 930], ys = [70, 40, 78, 38, 70];
  const pct = l => { const ls = lessons.filter(x => x.level === l.n); return ls.filter(x => lessonDone(x.id)).length / ls.length; };
  const total = lessons.filter(x => lessonDone(x.id)).length / lessons.length;
  let d = `M${xs[0]} ${ys[0]}`; for(let i=1;i<5;i++){ const cx = (xs[i-1]+xs[i])/2; d += ` C${cx} ${ys[i-1]} ${cx} ${ys[i]} ${xs[i]} ${ys[i]}`; }
  const next = nextLessonInfo();
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path class="route-bg" d="${d}"/><path class="route-fg" d="${d}" pathLength="100" style="stroke-dashoffset:${(100 - total*100).toFixed(1)}"/></svg>` +
    LEVELS.map((L,i) => `<button class="route-node${activeTier===L.name?' active':''}${next && next.lesson.level===L.n?' next':''}" style="left:${(xs[i]/W*100).toFixed(1)}%;top:${(ys[i]/H*100).toFixed(1)}%" data-level="${esc(L.name)}" title="${esc(L.name)}: ${Math.round(pct(L)*100)}% done">
      <b>${L.n}</b><span>${esc(L.name)}</span><small>${Math.round(pct(L)*100)}%</small></button>`).join('');
  el.querySelectorAll('.route-node').forEach(b => b.addEventListener('click', () => { activeTier = activeTier === b.dataset.level ? 'all' : b.dataset.level; renderTierFilter(); renderDashboard(); renderCourseMap(); }));
}

function renderDashboard(){
  cardDashboard.innerHTML = '';
  const next = nextLessonInfo();
  LEVELS.filter(L => activeTier === 'all' || L.name === activeTier).forEach(L => {
    const accent = LEVEL_ACCENT[L.n];
    const levelLessons = lessons.filter(l => l.level === L.n);
    const cleared = levelLessons.filter(l => lessonDone(l.id)).length;
    const block = document.createElement('div'); block.className='tier-block';
    block.innerHTML = `<div class="tier-head"><div class="tier-dot" style="background:${accent}"></div><div class="tier-title">Level ${L.n} · ${esc(L.name)} <span class="tier-sub">${esc(L.sub)}</span></div><div class="tier-meta">${cleared}/${levelLessons.length} · target ${L.target} wpm</div></div>`;
    const grid = document.createElement('div'); grid.className='card-grid';
    levelLessons.forEach(l=>{
      const p = progress[l.id]; const stars = p?p.stars:0;
      const card = document.createElement('button'); card.type='button';
      card.className='lesson-card' + (l.kind === 'boss' ? ' boss' : '') + (next && next.lesson === l ? ' recommended' : '');
      card.style.setProperty('--tier-accent', accent);
      const best = p && p.bestWpm ? `${p.bestWpm} wpm` : (l.kind === 'boss' ? 'Boss' : '');
      const state = (p && p.status === 'in_progress') ? '<div class="lstate">in progress</div>' : (next && next.lesson === l ? '<div class="lstate">next</div>' : '');
      card.innerHTML = `<div class="lnum">L${lessonNumber(l)}${best ? ' · ' + best : ''}</div><div class="ltitle">${esc(l.title)}</div>${state}<div class="lstars">${dotGlyphs(stars)}${p && p.crown ? '<span class="lcrown" title="Crown">♛</span>' : ''}</div>`;
      card.addEventListener('click', () => openLesson(l.id));
      grid.appendChild(card);
    });
    block.appendChild(grid); cardDashboard.appendChild(block);
  });
}
function renderPlacementOffer(){
  const el = document.getElementById('placementOffer');
  let placed = null; try{ placed = JSON.parse(localStorage.getItem(PLACEMENT_KEY) || 'null'); }catch(e){}
  const dismissed = (() => { try{ return localStorage.getItem('typingMasterPlacementDismissed') === '1'; }catch(e){ return false; } })();
  const fresh = !Object.keys(progress).length && !(Progress.view && Progress.view.placement);
  if(!fresh || placed || dismissed){ el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = `<div class="review-info"><div class="review-title">new here?</div><div class="coach-message"><b>Take a 2-minute placement test</b> and we'll suggest where to start. Or skip it and begin at lesson 1.</div></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn primary" id="placementGo">Take the test</button><button class="btn secondary" id="placementSkip">Skip</button></div>`;
  document.getElementById('placementGo').addEventListener('click', openPlacement);
  document.getElementById('placementSkip').addEventListener('click', () => { try{ localStorage.setItem('typingMasterPlacementDismissed','1'); }catch(e){} el.hidden = true; });
}
function renderHome(){ renderTierFilter(); renderHomeStats(); renderPlacementOffer(); renderContinuePanel(); renderRewardBits(); renderCourseMap(); renderDashboard(); renderReviewPanel(); renderCoachPanel(); }

function openLesson(lessonId, startStage){
  document.documentElement.classList.add('in-lesson');
  hideExtraViews(); setNavCurrent('homeView'); closeThemeMenu();
  currentLessonId = lessonId;
  document.getElementById('accountView').style.display='none';
  const l = getLessonById(lessonId);
  document.getElementById('lessonTier').textContent = l.botIntro || l.tier;
  document.getElementById('lessonTitle').textContent = l.title;
  document.getElementById('keyChips').innerHTML = l.keys.map(k=>`<span class="chip">${k}</span>`).join('');
  stages = getStagesForLesson(l);
  currentStage = Math.max(0, Math.min(stages.length-1, startStage|0)); // resume at a saved stage
  homeView.style.display='none';
  lessonView.style.display='flex'; resultsView.classList.add('hidden');
  resetLessonState();
  loadStage();
}
function backToDashboard(){
  document.documentElement.classList.remove('in-lesson');
  hideExtraViews(); setNavCurrent('homeView'); closeThemeMenu();
  lessonView.style.display='none'; resultsView.classList.add('hidden');
  document.getElementById('accountView').style.display='none';
  document.getElementById('funSelectView').style.display='none';
  stopArcade();
  homeView.style.display='flex';
  stopTimers();
  saveKeyStats();
  if(Account.pendingServerData){ const d = Account.pendingServerData; Account.pendingServerData = null; applyServerProgress(d); }
  renderHome();
}
function openFunMode(){
  document.documentElement.classList.remove('in-lesson');
  hideExtraViews(); setNavCurrent('funSelectView'); closeThemeMenu();
  homeView.style.display='none';
  document.getElementById('accountView').style.display='none';
  lessonView.style.display='none'; resultsView.classList.add('hidden');
  stopArcade(); renderArcade();
  document.getElementById('funSelectView').style.display='flex';
}
/* Accuracy lock: one mistake sends the learner back to the start of the line on screen */
function lockBack(){
  const top = letters[currentIndex].offsetTop;
  let start = currentIndex;
  while(start > 0 && letters[start-1].offsetTop === top) start--;
  for(let i = start; i <= currentIndex && i < letters.length; i++){ if(letters[i].classList.contains('correct')) correctKeystrokes--; letters[i].className = 'letter default'; }
  currentIndex = start; updateCaretPosition(); updateStatsDisplay(); updateFingerGuide();
  if(lessonMachine) lessonMachine.setPosition(currentIndex);
  showStepNote('Accuracy lock: a mistake sends you back to the start of the line.');
}
function countUncorrected(){ uncorrectedTotal += letters.filter(l => l.classList.contains('incorrect')).length; }
/* one step done: report it, then go on to the next step or finish the lesson */
function finishStep(){
  const lesson = getLessonById(currentLessonId), step = stages[currentStage];
  const st = stepStats();
  if(step === 'challenge') challengeResult = st;
  if(!lesson.isReview && !lesson.isPlacement && step !== 'watch') emitEvent({ type:'step', lessonId:lesson.id, step:currentStage, kind:step, wpm:st.wpm, accuracy:st.accuracy, errors:st.errors, seconds:st.seconds });
  if(currentStage < stages.length - 1){ currentStage++; stopTimers(); startTime = null; showStepNote(''); loadStage(); }
  else finishLesson();
}
function resetLessonState(){
  stopTimers(); pendingSkip = null; lastKeyTime = null; lastExpectedChar = null; lastKeystrokeWasCorrect = true;
  currentIndex=0; totalKeystrokes=0; correctKeystrokes=0; errorCount=0; startTime=null; wpmSamples=[]; lessonFinished=false;
  sprintResults=[]; challengeResult=null; uncorrectedTotal=0; stepStart=null; showStepNote('');
  updateStatsDisplay(); updateClock(); paper.style.opacity='1'; startHint.style.display='flex'; paper.classList.remove('focused');
  typer.value='';
}
function resetLesson(){
  // the results card is a fixed overlay — it must be dismissed here, or Retry /
  // Tab restarts the lesson underneath a still-visible scrim
  resultsView.classList.add('hidden');
  if(bossHandle){ bossHandle.destroy(); bossHandle = null; }
  currentStage=0; resetLessonState(); loadStage();
  typer.focus();
}

function finishLesson(){
  lessonFinished = true; stopTimers(); flushPendingSkip();
  const lesson = getLessonById(currentLessonId);
  const step = stages[currentStage];
  let finalWpm = currentWpm(), finalAcc = currentAccuracy();
  const limit = timedLimit();
  let elapsedSec = startTime ? Math.round(limit && stages.length === 1 ? Math.min(limit, elapsedSeconds()) : elapsedSeconds()) : 0;
  if(step === 'sprint' && sprintResults.length){
    const best = sprintResults.slice().sort((a,b) => b.wpm - a.wpm)[0];   // five sprints, the best one counts
    finalWpm = best.wpm; finalAcc = best.accuracy; elapsedSec = sprintResults.reduce((s,r) => s + r.seconds, 0);
  }
  if(limit && stages.length === 1){ const st = stepStats(); finalWpm = st.wpm; finalAcc = st.accuracy; elapsedSec = st.seconds; }
  finalWpm = Math.min(400, finalWpm);
  updateClock();
  wpmSamples.push({t: elapsedSec, wpm: finalWpm});
  saveKeyStats();

  if(lesson.isPlacement) return finishPlacement(finalWpm, finalAcc, elapsedSec);

  const stars = TC_META.starsFor(finalAcc);
  const target = levelOf(lesson).target;
  const crown = !!challengeResult && challengeResult.wpm >= target && challengeResult.accuracy >= TC_META.CROWN_ACCURACY;
  let earned = { xp:0, badges:[], xpBefore:(Progress.view && Progress.view.xp) || 0 };
  let extra = null;
  if(lesson.exam){
    // exam rules: gross speed, net speed (one word a minute off per uncorrected error a minute), key depressions per hour
    countUncorrected();
    const mins = Math.max(elapsedSec, 1) / 60;
    const gross = Math.round((totalKeystrokes / 5) / mins);
    const net = Math.max(0, Math.round(gross - uncorrectedTotal / mins));
    extra = { gross, net, kdph: Math.round(totalKeystrokes / (Math.max(elapsedSec,1) / 3600)) };
  }
  if(!lesson.isReview){
    const prev = progress[currentLessonId];
    const entry = Object.assign({}, prev || {}, { stars: Math.max(stars, prev?prev.stars:0), bestWpm: Math.max(finalWpm, prev?prev.bestWpm:0), bestAcc: Math.max(finalAcc, prev?prev.bestAcc:0) });
    if(crown || (prev && prev.crown)) entry.crown = 1;
    entry.status = (entry.stars >= 1 || (prev && prev.status === 'completed')) ? 'completed' : 'in_progress';
    entry.attempts = ((prev && prev.attempts) || 0) + 1; entry.stage = 0;
    progress[currentLessonId] = entry;
    saveProgress();
    earned = emitEvent({ type:'run', lessonId:lesson.id, step:Math.max(0, stages.length-1), kind:step, wpm:finalWpm, accuracy:finalAcc, errors:Math.min(errorCount,100000),
      seconds:Math.max(1, Math.min(elapsedSec, 7200)), stars, crown, data: challengeResult ? { challenge:{ wpm:challengeResult.wpm, accuracy:challengeResult.accuracy } } : {} });
  } else {
    emitEvent({ type:'quest', data:{ action:'drill' } });   // the problem-keys drill counts for its daily quest
  }
  recordStreak();
  paper.style.opacity='0';
  showResults({ title: lesson.isReview ? 'Drill complete' : null, stars: lesson.isReview ? 0 : stars, crown, wpm:finalWpm, accuracy:finalAcc, errors:errorCount, seconds:elapsedSec,
    samples:wpmSamples, earned, extra, nextLabel: nextLessonAfter(lesson) ? 'Next lesson' : null });
}
/* the boss fight finished inside the lesson */
function finishBoss(lesson, r){
  const won = !!r.won, acc = Math.round(r.accuracy || 0), wpm = Math.min(400, Math.round(r.wpm || (r.stats && r.stats.wpm) || 0));
  const stars = won ? TC_META.starsFor(acc) : 0;
  const prev = progress[lesson.id];
  if(won){ progress[lesson.id] = Object.assign({}, prev || {}, { stars: Math.max(stars, prev?prev.stars:0), bestWpm: Math.max(wpm, prev?prev.bestWpm||0:0), bestAcc: Math.max(acc, prev?prev.bestAcc||0:0), status:'completed', attempts:((prev&&prev.attempts)||0)+1 }); saveProgress(); }
  const earned = emitEvent({ type:'run', lessonId:lesson.id, kind:'boss', wpm, accuracy:acc, errors:r.errors||0, seconds:Math.max(1, Math.round(r.seconds || (r.stats && r.stats.seconds) || 1)), stars, data:{ won, hearts:r.hearts } });
  recordStreak();
  if(bossHandle){ bossHandle.destroy(); bossHandle = null; }
  showResults({ title: won ? 'Boss beaten' : 'The boss escaped', stars, crown:false, wpm, accuracy:acc, errors:r.errors||0, seconds:Math.round(r.seconds||0), samples:[], earned, nextLabel: won && nextLessonAfter(lesson) ? 'Next lesson' : null });
}
function nextLessonAfter(lesson){ const i = lessons.indexOf(lesson); return i >= 0 && i < lessons.length - 1 ? lessons[i+1] : null; }
let lastResultsLesson = null;
function showResults(d){
  lastResultsLesson = getLessonById(currentLessonId);
  const body = document.getElementById('resultsBody');
  let html = TC_REWARDS_UI.resultsCard({ title:d.title, stars:d.stars, crown:d.crown, wpm:d.wpm, accuracy:d.accuracy, errors:d.errors, seconds:d.seconds,
    samples:(d.samples||[]).map(s => ({ t:s.t, wpm:s.wpm })), xpBefore:d.earned ? d.earned.xpBefore : 0, xpGained:d.earned ? d.earned.xp : 0,
    newBadges:(d.earned && d.earned.badges) || [], nextLabel:d.nextLabel, defs:TC_RULES.BADGES });
  if(d.extra) html = html.replace('</article>', `<p class="exam-line">Gross <b>${d.extra.gross}</b> wpm · Net <b>${d.extra.net}</b> wpm · ${d.extra.kdph.toLocaleString()} key depressions per hour</p></article>`);
  if(d.placement) html = d.placement;
  body.innerHTML = html;
  TC_REWARDS_UI.enhance(body);
  resultsView.classList.remove('hidden');
  if(d.earned && d.earned.rankUp && Settings.effects !== 'off') document.body.insertAdjacentHTML('beforeend', TC_REWARDS_UI.rankUpCelebration({ name:d.earned.rankUp }));
}
document.getElementById('resultsBody').addEventListener('click', (e) => {
  const b = e.target.closest('[data-action]'); if(!b) return;
  const a = b.getAttribute('data-action');
  if(a === 'retry') resetLesson();
  else if(a === 'map') backToDashboard();
  else if(a === 'next'){ const n = lastResultsLesson && nextLessonAfter(lastResultsLesson); if(n) openLesson(n.id); else backToDashboard(); }
  else if(a === 'level'){ backToDashboard(); activeTier = b.getAttribute('data-level'); renderHome(); }
});
document.addEventListener('click', (e) => { const o = e.target.closest('.rw-rankup'); if(o && (e.target.closest('[data-action="close"]') || e.target === o)) o.remove(); });
/* Enter = next lesson on the Results screen (Tab = retry is handled by the lesson key handler) */
document.addEventListener('keydown', (e) => {
  if(e.key !== 'Enter' || resultsView.classList.contains('hidden') || typingElsewhere(e)) return;
  e.preventDefault(); const n = resultsView.querySelector('[data-action="next"]') || resultsView.querySelector('[data-action="map"]'); if(n) n.click();
});

/* ---- placement test: a 2-minute run that suggests where to start ---- */
function openPlacement(){
  specialLesson = { id:'placement', isPlacement:true, title:'Placement test', tier:'Two minutes · find your level', keys:[], level:1 };
  openLesson('placement');
}
function finishPlacement(wpm, acc, secs){
  const level = TC_RULES.placementLevel(wpm, acc);
  try{ localStorage.setItem(PLACEMENT_KEY, JSON.stringify({ level, wpm, accuracy:acc, at:new Date().toISOString() })); }catch(e){}
  emitEvent({ type:'placement', wpm, accuracy:acc, seconds:Math.max(1, secs) });
  const L = LEVELS.find(l => l.n === level);
  showResults({ placement: `<article class="results-card rw-card placement-card"><p class="eyebrow">Placement test</p><h2>Start at Level ${level}: ${esc(L.name)}</h2>
    <p class="lede">You typed <b>${wpm} wpm</b> at <b>${acc}%</b> accuracy. This is only a suggestion: every lesson stays open.</p>
    <div class="results-actions"><button class="btn primary" data-action="level" data-level="${esc(L.name)}">Show Level ${level}</button><button class="btn secondary" data-action="map">Back to the course</button></div></article>` });
}

/* ==========================================================================
   9–11. ARCADE — eight games (js/games/*.js) and the Daily Challenge
   Every game uses only the keys of the furthest lesson completed (with no
   progress, the home row) and reports its score as a 'game' event.
   ========================================================================== */
let arcadeHandle = null, arcadeGame = null;
function furthestCompleted(){
  let last = null;
  for(const l of lessons){ const p = progress[l.id]; if(p && (p.status ? p.status === 'completed' : p.stars > 0)) last = l.id; }
  return last;
}
function readGhosts(){ try{ return JSON.parse(localStorage.getItem(GHOST_KEY) || '{}'); }catch(e){ return {}; } }
function arcadeCtx(id){
  const allowed = TC_COURSE.allowedThrough(furthestCompleted() || 'l6');
  const chars = Array.from(allowed.chars).filter(c => c !== ' ').join('');
  const g = Progress.view && Progress.view.games && Progress.view.games[id];
  const bosses = lessons.filter(l => l.kind === 'boss' && progress[l.id]).map(l => ({ id:l.id, title:l.title, words:TC_COURSE.bossWords(l) }));
  return {
    words: allowed.words.length ? allowed.words : chars.split(''), chars, digits: /\d/.test(chars), symbols: chars.replace(/[a-z0-9;,./]/gi, ''),
    best: g ? g.best : null, effects: Settings.effects, bosses,
    sound: (name) => playSound(name === 'error' || name === 'lose' ? 'incorrect' : 'correct'),
    loadGhost: (key) => readGhosts()[key] || null,
    saveGhost: (key, obj) => { const all = readGhosts(); all[key] = obj; try{ localStorage.setItem(GHOST_KEY, JSON.stringify(all)); }catch(e){} },
    onBack: openFunMode,
    onEnd: (r) => {
      r = r || {}; const st = r.stats || {};
      const earned = emitEvent({ type:'game', gameId:id, score:Math.max(0, Math.round(r.score || 0)), xp:Math.min(TC_RULES.XP.gameMax, Math.max(0, Math.round(r.xp || 0))),
        wpm:Math.min(400, Math.round(st.wpm || 0)), accuracy:Math.min(100, Math.round(st.accuracy || 0)), seconds:Math.round(st.seconds || 0), data:Object.assign({}, st, { won:r.won }) });
      if(earned.badges && earned.badges.length) toast('Badge earned: ' + earned.badges.map(badgeName).join(', '));
    },
  };
}
function siStop(){} function metStop(){} function towStop(){}   // the old games are replaced by js/games
function stopArcade(){ if(arcadeHandle){ arcadeHandle.destroy(); arcadeHandle = null; } arcadeGame = null; document.getElementById('arcadePlay').style.display = 'none'; }
function renderArcade(){
  const best = (Progress.view && Progress.view.games) || {};
  document.getElementById('arcadeCards').innerHTML = TC_GAMES.ORDER.map(TC_GAMES.get).filter(Boolean).map(g =>
    `<button type="button" class="tcg-card" data-game="${g.id}" data-accent="${g.accent || 'teal'}" aria-label="${esc(g.title)}. ${esc(g.blurb)}">${g.scene}<div class="tcg-card-body"><div class="tcg-card-top"><h3>${esc(g.title)}</h3><span class="tcg-card-best">Best <b>${best[g.id] ? best[g.id].best : '-'}</b></span></div><p>${esc(g.blurb)}</p><div class="tcg-trains"><span>Trains</span> ${esc(g.trains)}</div></div></button>`).join('');
  const today = localDay(); const done = !!(best.daily && Progress.rules && Progress.rules.daily && Progress.rules.daily[today]);
  document.getElementById('dailyBanner').innerHTML = `<div><p class="eyebrow">Daily Challenge · ${today}</p><h2>One passage a day</h2><p class="lede">${done ? 'Today is counted. You can still practise the passage.' : 'Your first finished run today counts and is compared with your earlier days.'}</p></div><button class="btn primary" data-game="daily">${done ? 'Practise today' : 'Play today'}</button>`;
}
function playGame(id){
  stopArcade();
  document.getElementById('funSelectView').style.display = 'none';
  const play = document.getElementById('arcadePlay'); play.style.display = 'flex';
  const el = document.getElementById('arcadeStage'); el.innerHTML = ''; arcadeGame = id;
  if(id === 'daily'){
    const date = localDay(), hist = Object.entries((Progress.rules && Progress.rules.daily) || {}).map(([d,v]) => ({ date:d, wpm:v.wpm, accuracy:v.accuracy }));
    arcadeHandle = TC_GAMES.daily.mount(el, Object.assign(arcadeCtx('daily'), { date, text:TC_COURSE.dailyText(date), done:hist.some(h => h.date === date), history:hist }));
  } else arcadeHandle = TC_GAMES.get(id).mount(el, arcadeCtx(id));
  window.scrollTo(0,0);
}
document.getElementById('funSelectView').addEventListener('click', (e) => { const b = e.target.closest('[data-game]'); if(b) playGame(b.dataset.game); });
document.getElementById('arcadeBackBtn').addEventListener('click', openFunMode);
document.getElementById('funSelectView').addEventListener('pointermove', (e) => {
  if(Settings.effects !== 'full' || (e.pointerType && e.pointerType !== 'mouse')) return;
  const card = e.target.closest('.tcg-card'); if(!card) return;
  const r = card.getBoundingClientRect(), x = (e.clientX-r.left)/r.width, y = (e.clientY-r.top)/r.height;
  card.style.setProperty('--tcg-ry', ((x-.5)*10).toFixed(2)+'deg'); card.style.setProperty('--tcg-rx', ((.5-y)*8).toFixed(2)+'deg');
  card.style.setProperty('--tcg-gx', (x*100).toFixed(0)+'%'); card.style.setProperty('--tcg-gy', (y*100).toFixed(0)+'%'); card.style.setProperty('--tcg-go', 1);
});

/* ==========================================================================
   12. FEEDBACK BOX (stored locally — this app has no backend/server)
   ========================================================================== */
const FEEDBACK_KEY = 'typingMasterFeedback';
let feedbackRating = 0;
function loadFeedback(){ try{ return JSON.parse(localStorage.getItem(FEEDBACK_KEY)||'[]'); }catch(e){ return []; } }
function saveFeedbackEntry(entry){
  const all = loadFeedback(); all.unshift(entry);
  try{ localStorage.setItem(FEEDBACK_KEY, JSON.stringify(all.slice(0,50))); }catch(e){}
}
function renderFeedbackHistory(){
  const all = loadFeedback();
  const el = document.getElementById('feedbackHistory');
  if(all.length===0){ el.innerHTML=''; return; }
  el.innerHTML = '<div style="font-size:11px; color:var(--text-muted); font-weight:700; text-transform:uppercase; margin-bottom:4px;">Your previous feedback</div>' +
    all.map(f => `<div class="feedback-entry"><span class="fe-stars">${'★'.repeat(f.rating)}${'☆'.repeat(5-f.rating)}</span><span class="fe-date">${f.date}</span><div>${f.text.replace(/</g,'&lt;')}</div></div>`).join('');
}
function setFeedbackStars(n){
  feedbackRating = n;
  document.querySelectorAll('#feedbackStars span').forEach(s => {
    s.classList.toggle('active', parseInt(s.dataset.star,10) <= n);
  });
}
document.querySelectorAll('#feedbackStars span').forEach(s => {
  s.addEventListener('click', () => setFeedbackStars(parseInt(s.dataset.star,10)));
});
document.getElementById('feedbackBtn').addEventListener('click', () => {
  document.getElementById('feedbackModal').classList.remove('hidden');
  renderFeedbackHistory();
});
document.getElementById('feedbackCloseBtn').addEventListener('click', () => document.getElementById('feedbackModal').classList.add('hidden'));
document.getElementById('feedbackModal').addEventListener('click', (e) => {
  if(e.target.id === 'feedbackModal') e.currentTarget.classList.add('hidden'); // click the scrim to dismiss
});
document.addEventListener('keydown', (e) => {
  if(e.key !== 'Escape') return;
  document.getElementById('feedbackModal').classList.add('hidden');
});
document.getElementById('feedbackSubmitBtn').addEventListener('click', () => {
  const text = document.getElementById('feedbackText').value.trim();
  if(!text && feedbackRating===0) return;
  saveFeedbackEntry({ rating: feedbackRating, text: text || '(no comment)', date: new Date().toLocaleDateString() });
  document.getElementById('feedbackText').value=''; setFeedbackStars(0);
  renderFeedbackHistory();
});

typer.addEventListener('focus', () => { startHint.style.display='none'; paper.classList.add('focused'); });
typer.addEventListener('blur', () => { paper.classList.remove('focused'); if(!lessonFinished && currentIndex===0) startHint.style.display='flex'; });
startHint.addEventListener('click', () => typer.focus());
paper.addEventListener('click', () => typer.focus());

document.getElementById('brandHome').addEventListener('click', backToDashboard);
document.getElementById('backBtn').addEventListener('click', backToDashboard);
document.getElementById('restartBtn').addEventListener('click', resetLesson);


/* ==========================================================================
   13. ACCOUNTS — sign in, profile, and progress saved to the server
   Without an account everything works as before, saved in this browser.
   Signed in, the server (Cloudflare D1) is the source of truth: progress is
   loaded from it, every change is sent to it automatically, and this browser
   only keeps a copy so the page can open while offline. Guest progress in
   this browser is never touched while signed in, and comes back on sign-out.
   ========================================================================== */
const Account = { available:false, user:null, emailEnabled:false, data:{}, summary:null, resetToken:null, hiddenAt:0 };
const ACCOUNT_CACHE_KEY = 'typingMasterAccountCache';
const ACCOUNT_STATE_KEYS = { typingMasterKeyStats:'keyStats', typingMasterBigramLatency:'bigramLatency', typingMasterErrorClasses:'errorClasses', typingMasterStreak:'streak' };
const STAGE_LABEL = {character:'Characters', mixed:'Mixed', word:'Words', paragraph:'Paragraph', timed:'60-second test'};

function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ---- storage: this browser for guests, the account (via Sync) when signed in ---- */
function kvGet(key){
  if(Account.user) return Object.prototype.hasOwnProperty.call(Account.data, key) ? Account.data[key] : null;
  try{ return localStorage.getItem(key); }catch(e){ return null; }
}
function kvSet(key, value){
  if(Account.user){
    Account.data[key] = value; saveAccountCache();
    if(ACCOUNT_STATE_KEYS[key]) Sync.stateChanged();
    return;
  }
  try{ localStorage.setItem(key, value); }catch(e){}
}
function saveAccountCache(){
  if(!Account.user) return;
  try{ localStorage.setItem(ACCOUNT_CACHE_KEY, JSON.stringify({ user:Account.user, data:Account.data, savedAt:Date.now() })); }catch(e){}
}
function readAccountCache(){ try{ return JSON.parse(localStorage.getItem(ACCOUNT_CACHE_KEY) || 'null'); }catch(e){ return null; } }

/* ---- where you are: the lesson and stage to resume ---- */
function notePosition(lessonId, stage){
  kvSet('typingMasterPosition', JSON.stringify({ lessonId, stage, at:new Date().toISOString() }));
  if(Account.user) Sync.position(lessonId, stage);
}
function lessonDone(id){ const p = progress[id]; return !!p && (p.status ? p.status === 'completed' : p.stars > 0); }
function nextLessonInfo(){
  let pos = null; try{ pos = JSON.parse(kvGet('typingMasterPosition') || 'null'); }catch(e){}
  if(pos && lessons.some(l => l.id === pos.lessonId) && !lessonDone(pos.lessonId)){
    return { lesson:getLessonById(pos.lessonId), stage:pos.stage || 0, resuming:true };
  }
  const l = lessons.find(x => !lessonDone(x.id));
  return l ? { lesson:l, stage:0, resuming:false } : null;
}
function stageName(lesson, stage){ const st = getStagesForLesson(lesson); return STAGE_LABEL[st[Math.min(stage, st.length-1)]] || ''; }

function renderContinuePanel(){
  const panel = document.getElementById('continuePanel');
  const next = nextLessonInfo();
  const anyProgress = Object.keys(progress).length > 0;
  if(!next){
    panel.hidden = false;
    panel.innerHTML = `<div class="review-info"><div class="review-title">all done</div><div class="coach-message">You've completed all ${lessons.length} lessons. Keep your speed up with the Timed Challenge or Fun Mode.</div></div>`;
    return;
  }
  const where = next.resuming && next.stage > 0 ? ` · ${stageName(next.lesson, next.stage)}` : '';
  const heading = next.resuming ? 'pick up where you left off' : (anyProgress ? 'up next' : 'start here');
  const signInHint = (Account.available && !Account.user) ? `<div class="review-empty" style="margin-top:2px;">Progress is saved in this browser only. <button class="link-btn" id="continueSignIn">Sign in</button> to keep it in your account, on any device.</div>` : '';
  panel.hidden = false;
  panel.innerHTML = `
    <div class="review-info">
      <div class="review-title">${heading}</div>
      <div class="coach-message"><b>L${lessonNumber(next.lesson)} · ${esc(next.lesson.title)}</b>${esc(where)}</div>
      ${signInHint}
    </div>
    <button class="btn primary" id="continueBtn">${next.resuming ? 'Continue' : 'Start lesson'}</button>`;
  document.getElementById('continueBtn').addEventListener('click', () => openLesson(next.lesson.id, next.stage));
  const si = document.getElementById('continueSignIn'); if(si) si.addEventListener('click', () => openAuth('signin'));
}

/* ---- talking to the server ---- */
async function api(method, path, body){
  const opts = { method, credentials:'same-origin', headers:{} };
  if(body !== undefined){ opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  let res;
  try{ res = await fetch(path, opts); }
  catch(e){ return { ok:false, status:0, network:true, error:{ code:'network', message:"Can't reach the TypeCraft server. Check your connection and try again." } }; }
  let data = null;
  try{ data = await res.json(); }catch(e){}
  if(!data || typeof data !== 'object') return { ok:false, status:res.status, error:{ code:'no_backend', message:"Accounts aren't available on this copy of TypeCraft." } };
  return Object.assign({}, data, { ok:res.ok, status:res.status });
}
function newEventId(){
  if(window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
}

/* ---- the save queue: every change is sent in order, retried until the server has it ----
   Ops are kept in this browser until the server confirms them, so closing the tab
   or losing the connection never loses a finished lesson. Each finished run has its
   own id, so a retry can't count it twice. */
const Sync = {
  queue:[], inFlight:null, timer:null, retryDelay:0, stateTimer:null, posTimer:null, pendingPos:null,
  key(){ return 'typingMasterOutbox:' + (Account.user ? Account.user.id : ''); },
  load(){ try{ this.queue = JSON.parse(localStorage.getItem(this.key()) || '[]'); }catch(e){ this.queue = []; } },
  persist(){
    try{ if(this.queue.length) localStorage.setItem(this.key(), JSON.stringify(this.queue)); else localStorage.removeItem(this.key()); }catch(e){}
  },
  enqueue(op){
    // a newer state or position replaces one still waiting; finished runs always queue
    if(op.kind !== 'complete') this.queue = this.queue.filter(q => q.kind !== op.kind || q === this.inFlight);
    this.queue.push(op); this.persist(); this.kick();
  },
  kick(){ if(this.inFlight || !Account.user || !this.queue.length) return; clearTimeout(this.timer); this.run(); },
  async run(){
    while(this.queue.length && Account.user){
      const op = this.queue[0];
      this.inFlight = op; setSyncStatus('saving');
      const res = await api(op.method, op.path, op.body);
      this.inFlight = null;
      if(res.network || res.status >= 500 || res.status === 429){
        this.retryDelay = Math.min(60000, (this.retryDelay || 1000) * 2);
        setSyncStatus('retrying');
        clearTimeout(this.timer); this.timer = setTimeout(() => this.kick(), this.retryDelay);
        return;
      }
      this.retryDelay = 0;
      if(res.status === 401){ handleSessionEnded(); return; }
      this.queue.shift(); this.persist();
      if(!res.ok){ console.warn('TypeCraft: the server refused a save', op.path, res.error && res.error.code); continue; }
      if(op.kind === 'complete' && res.lesson) applyLessonRow(res.lesson);
      if(op.kind === 'complete' && res.lessons) applyServerState(res);
    }
    if(!this.queue.length) setSyncStatus('saved');
  },
  stateChanged(){ clearTimeout(this.stateTimer); this.stateTimer = setTimeout(() => this.queueState(), 2000); },
  queueState(){
    clearTimeout(this.stateTimer); this.stateTimer = null;
    if(!Account.user) return;
    const body = {};
    for(const [k, name] of Object.entries(ACCOUNT_STATE_KEYS)){
      const v = Account.data[k];
      if(v){ try{ body[name] = JSON.parse(v); }catch(e){} }
    }
    if(Object.keys(body).length) this.enqueue({ kind:'state', method:'PUT', path:'/api/user/progress/state', body });
  },
  position(lessonId, stage){ this.pendingPos = { lessonId, stage }; clearTimeout(this.posTimer); this.posTimer = setTimeout(() => this.queuePosition(), 800); },
  queuePosition(){
    clearTimeout(this.posTimer); this.posTimer = null;
    if(!this.pendingPos || !Account.user) return;
    this.enqueue({ kind:'position', method:'PUT', path:'/api/user/position', body:{ lessonId:this.pendingPos.lessonId, step:this.pendingPos.stage, at:new Date().toISOString() } });
    this.pendingPos = null;
  },
  complete(run){ this.enqueue({ kind:'complete', method:'POST', path:'/api/user/progress/lesson-complete', body:Object.assign({ eventId:newEventId() }, run) }); },
  flushTimers(){ if(this.stateTimer) this.queueState(); if(this.posTimer) this.queuePosition(); },
  /** Sends everything waiting; resolves true once the server has it all, false after timeoutMs. */
  async flush(timeoutMs){
    this.flushTimers();
    const end = Date.now() + timeoutMs;
    while(this.queue.length && Account.user && Date.now() < end){
      if(!this.inFlight){ clearTimeout(this.timer); this.run(); }
      await new Promise(r => setTimeout(r, 150));
    }
    return this.queue.length === 0;
  },
  reset(){ clearTimeout(this.timer); clearTimeout(this.stateTimer); clearTimeout(this.posTimer); this.stateTimer = this.posTimer = null; this.pendingPos = null; this.queue = []; this.inFlight = null; this.retryDelay = 0; }
};

let syncFadeTimer = null;
function setSyncStatus(state){
  const el = document.getElementById('syncStatus');
  clearTimeout(syncFadeTimer);
  el.classList.remove('fade','warn');
  if(!Account.user){ el.textContent = ''; return; }
  if(state === 'saving') el.textContent = 'saving…';
  else if(state === 'retrying'){ el.textContent = 'unable to sync — retrying'; el.classList.add('warn'); }
  else if(state === 'saved'){ el.textContent = 'saved'; syncFadeTimer = setTimeout(() => el.classList.add('fade'), 2500); }
  else el.textContent = '';
}

/* ---- account data in and out ---- */
function applyServerProgress(body){
  const map = {};
  for(const [id, r] of Object.entries(body.lessons || {})){
    map[id] = { stars:r.stars, bestWpm:r.bestWpm, bestAcc:r.bestAccuracy, status:r.status, stage:r.currentStage, pct:r.completionPercentage, attempts:r.attempts, lastActivityAt:r.lastActivityAt };
  }
  const st = body.state || {};
  Account.data = {
    typingMasterProgress: JSON.stringify(map),
    typingMasterKeyStats: JSON.stringify(st.keyStats || {}),
    typingMasterBigramLatency: JSON.stringify(st.bigramLatency || {}),
    typingMasterErrorClasses: JSON.stringify(st.errorClasses || {adjacent:0, transposition:0, omission:0, other:0}),
  };
  if(st.streak) Account.data.typingMasterStreak = JSON.stringify(st.streak);
  if(st.position) Account.data.typingMasterPosition = JSON.stringify(st.position);
  Account.summary = body.summary || null;
  saveAccountCache();
  reloadLearningState();
}
function applyLessonRow(r){
  progress[r.lessonId] = { stars:r.stars, bestWpm:r.bestWpm, bestAcc:r.bestAccuracy, status:r.status, stage:r.currentStage, pct:r.completionPercentage, attempts:r.attempts, lastActivityAt:r.lastActivityAt };
  saveProgress();
  if(homeView.style.display !== 'none') renderHome();
}
function reloadLearningState(){
  loadProgress(); loadStreak(); loadKeyStats(); loadAnalytics();
  if(homeView.style.display !== 'none') renderHome();
}
async function refreshAccountData(){
  if(!Account.user) return false;
  await Sync.flush(4000); // what this browser still has to send goes first, so the server's copy includes it
  const res = await api('GET', '/api/user/progress');
  if(res.status === 401){ handleSessionEnded(); return false; }
  if(!res.ok){ setSyncStatus('retrying'); Account.needsRefresh = true; return false; }
  Account.needsRefresh = false;
  // a lesson being typed right now keeps its in-memory state; the rest comes from the server
  if(lessonView.style.display !== 'none' && startTime && !lessonFinished){ Account.pendingServerData = res; return true; }
  applyServerProgress(res);
  await loadServerState();
  Account.loaded = true; // the server's copy is on screen
  if(!Sync.queue.length) setSyncStatus('');
  return true;
}

async function enterAccount(user){
  Account.user = user; Account.loaded = false;
  const cache = readAccountCache();
  Account.data = (cache && cache.user && cache.user.id === user.id && cache.data) ? cache.data : {};
  saveAccountCache();
  Sync.reset(); Sync.load();
  renderAccountUi();
  reloadLearningState();
  await refreshAccountData();
  Sync.kick();
  maybeOfferImport();
}
function leaveAccount(){
  Sync.reset();
  Account.user = null; Account.data = {}; Account.summary = null; Account.pendingServerData = null;
  try{ localStorage.removeItem(ACCOUNT_CACHE_KEY); }catch(e){}
  setSyncStatus('');
  renderAccountUi();
  if(document.getElementById('accountView').style.display !== 'none') backToDashboard();
  reloadLearningState();
  rebuildGuestProgress(); renderRewardBits();
}
function handleSessionEnded(){
  if(!Account.user) return;
  const email = Account.user.email;
  leaveAccount(); // the save queue stays in this browser and is sent after you sign in again
  toast('Your session has ended. Sign in again to keep saving to your account.');
  openAuth('signin');
  const f = document.querySelector('#authModal form[data-mode="signin"]');
  f.elements.email.value = email;
}
async function signOut(force){
  closeAccountMenu();
  const synced = await Sync.flush(4000);
  if(!synced && !force){
    toast("Some progress hasn't reached the server yet. Check your connection, or choose Sign out again to sign out anyway (it will be sent the next time you sign in here).");
    Account.forceNextSignOut = true;
    return;
  }
  Account.forceNextSignOut = false;
  await api('POST', '/api/auth/logout', {});
  leaveAccount();
  toast('Signed out. Your progress is saved in your account.');
}

/* ---- header: sign-in button / account menu ---- */
function renderAccountUi(){
  document.getElementById('accountWrap').hidden = !Account.available;
  const btn = document.getElementById('accountBtn');
  if(!Account.user){
    btn.innerHTML = `<svg class="nb-svg" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="5.5" r="2.75"/><path d="M2.75 14a5.25 5.25 0 0 1 10.5 0"/></svg>sign in`;
    btn.title = 'Sign in to save your progress to your account';
    closeAccountMenu();
  } else {
    const first = Account.user.fullName.split(' ')[0];
    btn.innerHTML = `<span class="avatar">${esc(first.charAt(0))}</span>${esc(first)}`;
    btn.title = 'Your account';
    document.getElementById('amName').textContent = Account.user.fullName;
    document.getElementById('amEmail').textContent = Account.user.email;
  }
  if(homeView.style.display !== 'none') renderContinuePanel();
}
function closeAccountMenu(){
  document.getElementById('accountMenu').classList.add('hidden');
  document.getElementById('accountBtn').setAttribute('aria-expanded','false');
}

let toastTimer = null;
function toast(message){
  const el = document.getElementById('toast');
  el.textContent = message; el.classList.remove('hidden');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.add('hidden'), 6000);
}

/* ---- forms ---- */
const V = {
  email: v => !v.trim() ? 'Enter your email address.' : (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || v.trim().length > 254 ? 'Enter a valid email address.' : null),
  name: v => !v.trim() ? 'Enter your name.' : (v.trim().length > 100 ? 'Keep your name under 100 characters.' : null),
  phone: v => { const d = v.replace(/\D/g,''); return !v.trim() ? 'Enter your phone number.' : ((!/^\+?[\d\s().-]+$/.test(v.trim()) || d.length < 7 || d.length > 15) ? 'Enter a valid phone number (7–15 digits, optionally starting with +).' : null); },
  password: (v, email) => v.length < 8 ? 'Use at least 8 characters.' : v.length > 128 ? 'Keep your password under 128 characters.'
    : (!/[A-Za-z]/.test(v) || !/\d/.test(v)) ? 'Use at least one letter and one number.'
    : (email && v.toLowerCase() === email.trim().toLowerCase()) ? "Your password can't be your email address." : null,
  same: (a, b) => a !== b ? "The two passwords don't match." : null,
};
function onlyErrors(checks){ const out = {}; for(const [k, m] of Object.entries(checks)) if(m) out[k] = m; return out; }
function formValues(form){
  const o = {};
  for(const el of form.elements){ if(!el.name) continue; o[el.name] = el.type === 'checkbox' ? el.checked : el.value; }
  return o;
}
function showForm(form, fields, message, isError){
  fields = fields || {};
  form.querySelectorAll('.field-error').forEach(e => { e.textContent = ''; });
  form.querySelectorAll('input').forEach(i => i.removeAttribute('aria-invalid'));
  let first = null;
  for(const [k, v] of Object.entries(fields)){
    const e = form.querySelector(`.field-error[data-for="${k}"]`); if(e) e.textContent = v;
    const i = form.elements[k]; if(i){ i.setAttribute('aria-invalid','true'); if(!first) first = i; }
  }
  const msg = form.querySelector('[data-msg]');
  if(msg){ msg.textContent = message || ''; msg.classList.toggle('error', !!message && isError !== false); }
  if(first) first.focus();
}
function showApiError(form, res){
  const e = res.error || {};
  showForm(form, e.fields, e.fields ? '' : (e.message || 'Something went wrong. Please try again.'), true);
}
async function busy(form, label, fn){
  const btn = form.querySelector('button[type="submit"]');
  const original = btn.textContent;
  btn.disabled = true; btn.textContent = label;
  try{ await fn(); } finally{ btn.disabled = false; btn.textContent = original; }
}

/* ---- sign in / sign up / forgot / reset ---- */
const AUTH_TEXT = {
  signin: ['Sign in', 'Your progress is saved to your account, so it follows you to any browser or device.'],
  signup: ['Create your account', 'Your lessons, stars and stats will be saved to your account as you practice.'],
  forgot: ['Reset your password', "Enter the email you signed up with and we'll send you a link to choose a new password."],
  reset:  ['Choose a new password', 'At least 8 characters, with a letter and a number. You will be signed out everywhere and can then sign in with it.'],
};
function authForm(mode){ return document.querySelector(`#authModal form[data-mode="${mode}"]`); }
function setAuthMode(mode){
  document.getElementById('authTitle').textContent = AUTH_TEXT[mode][0];
  let sub = AUTH_TEXT[mode][1];
  if(mode === 'forgot' && !Account.emailEnabled) sub = "Password reset emails aren't set up for this site yet, so a reset link can't be sent. Ask the site's owner to set up email (see SETUP.md).";
  document.getElementById('authSub').textContent = sub;
  document.querySelectorAll('#authModal form').forEach(f => { f.classList.toggle('hidden', f.dataset.mode !== mode); showForm(f, {}, ''); });
  authForm('forgot').querySelector('button[type="submit"]').disabled = mode === 'forgot' && !Account.emailEnabled;
  const first = authForm(mode).querySelector('input'); if(first) setTimeout(() => first.focus(), 30);
}
function openAuth(mode){
  closeAccountMenu();
  document.getElementById('authModal').classList.remove('hidden');
  setAuthMode(mode);
}
function closeAuth(){
  document.getElementById('authModal').classList.add('hidden');
  document.querySelectorAll('#authModal input[type="password"]').forEach(i => { i.value = ''; });
}

authForm('signin').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const form = ev.currentTarget, v = formValues(form);
  const errs = onlyErrors({ email:V.email(v.email), password: v.password ? null : 'Enter your password.' });
  if(Object.keys(errs).length) return showForm(form, errs);
  busy(form, 'Signing in…', async () => {
    const res = await api('POST', '/api/auth/login', { email:v.email, password:v.password, remember:v.remember });
    if(!res.ok) return showApiError(form, res);
    closeAuth();
    await enterAccount(res.user);
    toast(`Signed in as ${res.user.email}.`);
  });
});
authForm('signup').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const form = ev.currentTarget, v = formValues(form);
  const errs = onlyErrors({ fullName:V.name(v.fullName), email:V.email(v.email), phoneNumber:V.phone(v.phoneNumber),
    password:V.password(v.password, v.email), confirmPassword:V.same(v.password, v.confirmPassword) });
  if(Object.keys(errs).length) return showForm(form, errs);
  busy(form, 'Creating account…', async () => {
    const res = await api('POST', '/api/auth/signup', v);
    if(!res.ok) return showApiError(form, res);
    closeAuth();
    await enterAccount(res.user);
    toast(res.verificationSent ? `Account created. We've sent a link to ${res.user.email} to confirm your email.` : 'Account created. Your progress now saves to your account.');
  });
});
authForm('forgot').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const form = ev.currentTarget, v = formValues(form);
  const errs = onlyErrors({ email:V.email(v.email) });
  if(Object.keys(errs).length) return showForm(form, errs);
  busy(form, 'Sending…', async () => {
    const res = await api('POST', '/api/auth/forgot-password', { email:v.email });
    if(!res.ok) return showApiError(form, res);
    showForm(form, {}, res.message, false);
  });
});
authForm('reset').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const form = ev.currentTarget, v = formValues(form);
  const errs = onlyErrors({ password:V.password(v.password), confirmPassword:V.same(v.password, v.confirmPassword) });
  if(Object.keys(errs).length) return showForm(form, errs);
  busy(form, 'Saving…', async () => {
    const res = await api('POST', '/api/auth/reset-password', { token:Account.resetToken, password:v.password, confirmPassword:v.confirmPassword });
    if(!res.ok) return showApiError(form, res);
    Account.resetToken = null;
    if(Account.user) leaveAccount();
    setAuthMode('signin');
    showForm(authForm('signin'), {}, res.message, false);
  });
});
document.querySelectorAll('#authModal [data-goto]').forEach(b => b.addEventListener('click', () => setAuthMode(b.dataset.goto)));
document.getElementById('authCloseBtn').addEventListener('click', closeAuth);
document.getElementById('authModal').addEventListener('click', (e) => { if(e.target.id === 'authModal') closeAuth(); });

/* ---- links from emails: #reset=… and #verify=… ---- */
function readHashAction(){
  const m = location.hash.match(/^#(reset|verify)=([\w-]{20,100})$/);
  if(!m) return null;
  history.replaceState(null, '', location.pathname + location.search); // the token leaves the address bar at once
  return { kind:m[1], token:m[2] };
}
// a link opened in a tab that already shows TypeCraft changes only the #… part, without a reload
window.addEventListener('hashchange', () => { if(!Account.available) return; const a = readHashAction(); if(a) handleHashAction(a); });
async function handleHashAction(action){
  if(action.kind === 'reset'){ Account.resetToken = action.token; openAuth('reset'); return; }
  const res = await api('POST', '/api/auth/verify-email', { token:action.token });
  toast(res.ok ? res.message : ((res.error && res.error.message) || 'That confirmation link did not work.'));
  if(res.ok && Account.user){
    const me = await api('GET', '/api/auth/me');
    if(me.ok && me.user){ Account.user = me.user; saveAccountCache(); renderAccountUi(); }
  }
}

/* ---- bring guest progress into the account ---- */
function guestSnapshot(){
  const get = k => { try{ return JSON.parse(localStorage.getItem(k) || 'null'); }catch(e){ return null; } };
  const prog = get('typingMasterProgress') || {};
  const ks = get('typingMasterKeyStats') || {};
  const payload = { progress:prog, state:{ keyStats:ks, bigramLatency:get('typingMasterBigramLatency') || {}, errorClasses:get('typingMasterErrorClasses') || {}, streak:get('typingMasterStreak') || undefined } , events: (get('typingMasterEvents') || []).filter(e => e && e.type !== 'import').slice(-1000) };
  return { payload, lessons:Object.keys(prog).length, stars:Object.values(prog).reduce((s, p) => s + (p.stars || 0), 0), hasAny:Object.keys(prog).length > 0 || Object.keys(ks).length > 0 };
}
async function fingerprint(text){
  if(window.crypto && crypto.subtle){
    const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(d), b => b.toString(16).padStart(2,'0')).join('').slice(0, 32);
  }
  let h = 5381; for(let i=0;i<text.length;i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16).padStart(8,'0');
}
function importLog(){ try{ return JSON.parse(localStorage.getItem('typingMasterGuestImports') || '{}'); }catch(e){ return {}; } }
function logImport(importId, outcome){ const log = importLog(); log[`${Account.user.id}:${importId}`] = outcome; try{ localStorage.setItem('typingMasterGuestImports', JSON.stringify(log)); }catch(e){} }
let pendingImport = null;
async function maybeOfferImport(){
  if(!Account.user) return;
  const g = guestSnapshot();
  if(!g.hasAny) return;
  const importId = 'guest-' + await fingerprint(JSON.stringify(g.payload));
  if(importLog()[`${Account.user.id}:${importId}`]) return; // added or declined already
  pendingImport = { importId, payload:g.payload };
  const what = g.lessons ? `${g.lessons} lesson${g.lessons === 1 ? '' : 's'} and ${g.stars} star${g.stars === 1 ? '' : 's'}` : 'key accuracy and rhythm stats';
  document.getElementById('importText').textContent =
    `This browser has progress from before you signed in: ${what}. Add it to ${Account.user.email}? Nothing in your account is lowered: best scores and stars are kept, and completed lessons stay completed. This browser's own copy is left as it is.`;
  document.getElementById('importMsg').textContent = '';
  document.getElementById('importModal').classList.remove('hidden');
}
document.getElementById('importYesBtn').addEventListener('click', async (ev) => {
  if(!pendingImport || !Account.user) return;
  const btn = ev.currentTarget; btn.disabled = true; btn.textContent = 'Adding…';
  const res = await api('POST', '/api/user/import', Object.assign({ importId:pendingImport.importId, today:localDay() }, pendingImport.payload));
  btn.disabled = false; btn.textContent = 'Add to my account';
  if(!res.ok){ const m = document.getElementById('importMsg'); m.textContent = (res.error && res.error.message) || 'Could not add it just now. Please try again.'; m.classList.add('error'); return; }
  logImport(pendingImport.importId, 'added');
  pendingImport = null;
  document.getElementById('importModal').classList.add('hidden');
  await refreshAccountData(); await loadServerState();
  toast(res.imported ? 'Your earlier progress has been added to your account.' : 'That progress was already in your account.');
});
document.getElementById('importNoBtn').addEventListener('click', () => {
  if(pendingImport && Account.user) logImport(pendingImport.importId, 'declined');
  pendingImport = null;
  document.getElementById('importModal').classList.add('hidden');
});

/* ---- account page: My learning / Profile / Settings ---- */
function openAccount(tab){
  closeAccountMenu();
  if(!Account.user) return openAuth('signin');
  ['homeView','lessonView','funSelectView','arcadePlay','settingsView','progressView','workshopView'].forEach(id => { document.getElementById(id).style.display = 'none'; });
  setNavCurrent('accountView');
  resultsView.classList.add('hidden');
  stopArcade(); stopTimers();
  document.getElementById('accountView').style.display = 'flex';
  setAccountTab(tab === 'password' ? 'settings' : tab);
  if(tab === 'password') setTimeout(() => { document.getElementById('passwordSection').scrollIntoView({ behavior:'smooth', block:'start' }); document.querySelector('#changePasswordForm input').focus(); }, 60);
  else window.scrollTo(0, 0);
}
function setAccountTab(tab){
  document.querySelectorAll('#acctTabs .config-item').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('#accountView .acct-panel').forEach(p => p.classList.toggle('hidden', p.dataset.panel !== tab));
  if(tab === 'learning') renderLearningPanel();
  if(tab === 'profile') renderProfilePanel();
  if(tab === 'settings') document.querySelectorAll('#accountView form').forEach(f => showForm(f, {}, ''));
}
document.querySelectorAll('#acctTabs .config-item').forEach(b => b.addEventListener('click', () => setAccountTab(b.dataset.tab)));
document.getElementById('acctBackBtn').addEventListener('click', backToDashboard);

function when(iso){
  if(!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { day:'numeric', month:'short', year:'numeric', hour:'numeric', minute:'2-digit' });
}
async function renderLearningPanel(){
  const stats = document.getElementById('learnStats');
  stats.innerHTML = '<div class="hstat"><div class="hs-label">loading</div><div class="hs-value">…</div><div class="hs-sub">from your account</div></div>';
  await Sync.flush(3000);
  const res = await api('GET', '/api/user/progress/summary');
  if(res.status === 401) return handleSessionEnded();
  if(!res.ok){
    stats.innerHTML = `<div class="hstat" style="grid-column:1/-1"><div class="hs-label">couldn't load</div><div class="hs-sub">${esc((res.error && res.error.message) || 'Please try again.')}</div></div>`;
    return;
  }
  const s = res.summary;
  const stat = (label, value, sub) => `<div class="hstat"><div class="hs-label">${label}</div><div class="hs-value">${value}</div><div class="hs-sub">${sub}</div></div>`;
  stats.innerHTML = stat('total lessons', s.totalLessons, 'in the course') + stat('completed', s.completed, 'with ≥ 80% accuracy') +
    stat('in progress', s.inProgress, 'started, not yet passed') + stat('remaining', s.remaining, 'to complete');
  document.getElementById('learnMeter').style.width = s.overallPercentage + '%';
  document.getElementById('learnOverallText').textContent = `${s.overallPercentage}% of the course`;
  const last = s.lastLessonId && getLessonById(s.lastLessonId);
  document.getElementById('learnLast').textContent = s.lastActivityAt ? `${when(s.lastActivityAt)}${last ? ` · L${lessonNumber(last)} ${last.title}` : ''}` : 'No activity yet';
  const btn = document.getElementById('learnContinueBtn');
  if(s.next){
    const nl = getLessonById(s.next.lessonId);
    document.getElementById('learnNext').textContent = `L${lessonNumber(nl)} · ${nl.title}${s.next.stage > 0 ? ' · ' + stageName(nl, s.next.stage) : ''}`;
    btn.hidden = false; btn.textContent = s.completed || s.inProgress ? 'Continue learning' : 'Start learning';
    btn.onclick = () => openLesson(s.next.lessonId, s.next.stage);
  } else {
    document.getElementById('learnNext').textContent = 'Every lesson is completed';
    btn.hidden = true;
  }
  const runs = (res.recent || []).filter(r => r.type === 'lesson_completed');
  document.getElementById('learnRecent').innerHTML = runs.length ? runs.map(r => {
    const l = getLessonById(r.lessonId); const d = r.data || {};
    return `<li><span>L${l ? lessonNumber(l) : '?'} ${esc(l ? l.title : r.lessonId)} — ${d.wpm} wpm · ${d.accuracy}% · ${'★'.repeat(d.stars || 0) || 'no stars'}</span><span class="when">${esc(when(r.at))}</span></li>`;
  }).join('') : '<li><span>No finished runs yet. Complete a lesson and it shows up here.</span></li>';
}
function renderProfilePanel(){
  const u = Account.user;
  document.getElementById('profEmail').innerHTML = `${esc(u.email)}<span class="badge ${u.emailVerified ? 'ok' : 'warn'}">${u.emailVerified ? 'confirmed' : 'not confirmed'}</span>`;
  document.getElementById('profSince').textContent = new Date(u.createdAt).toLocaleDateString(undefined, { day:'numeric', month:'long', year:'numeric' });
  const vm = document.getElementById('verifyMsg');
  vm.classList.remove('error');
  if(!u.emailVerified && Account.emailEnabled){
    vm.innerHTML = `Your email isn't confirmed yet. <button class="link-btn" id="resendVerifyBtn">Send a new confirmation link</button>`;
    document.getElementById('resendVerifyBtn').addEventListener('click', async () => {
      const res = await api('POST', '/api/auth/resend-verification', {});
      vm.textContent = res.ok ? res.message : ((res.error && res.error.message) || 'Could not send it just now.');
      vm.classList.toggle('error', !res.ok);
    });
  } else vm.textContent = '';
  const pf = document.getElementById('profileForm');
  pf.elements.fullName.value = u.fullName; pf.elements.phoneNumber.value = u.phoneNumber || '';
  showForm(pf, {}, '');
  const ef = document.getElementById('emailChangeForm');
  showForm(ef, {}, Account.emailEnabled ? '' : "Email sending isn't set up for this site yet, so your email can't be changed.", !Account.emailEnabled);
  ef.querySelector('button[type="submit"]').disabled = !Account.emailEnabled;
}
document.getElementById('profileForm').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const form = ev.currentTarget, v = formValues(form);
  const errs = onlyErrors({ fullName:V.name(v.fullName), phoneNumber:V.phone(v.phoneNumber) });
  if(Object.keys(errs).length) return showForm(form, errs);
  busy(form, 'Saving…', async () => {
    const res = await api('PUT', '/api/user/profile', v);
    if(res.status === 401) return handleSessionEnded();
    if(!res.ok) return showApiError(form, res);
    Account.user = res.user; saveAccountCache(); renderAccountUi();
    showForm(form, {}, res.message, false);
  });
});
document.getElementById('emailChangeForm').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const form = ev.currentTarget, v = formValues(form);
  const errs = onlyErrors({ newEmail:V.email(v.newEmail), password: v.password ? null : 'Enter your current password.' });
  if(Object.keys(errs).length) return showForm(form, errs);
  busy(form, 'Sending…', async () => {
    const res = await api('POST', '/api/user/email-change', v);
    if(res.status === 401) return handleSessionEnded();
    if(!res.ok) return showApiError(form, res);
    form.reset(); showForm(form, {}, res.message, false);
  });
});
document.getElementById('changePasswordForm').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const form = ev.currentTarget, v = formValues(form);
  const errs = onlyErrors({ currentPassword: v.currentPassword ? null : 'Enter your current password.',
    newPassword: V.password(v.newPassword, Account.user && Account.user.email) || (v.newPassword === v.currentPassword ? 'Choose a password different from your current one.' : null),
    confirmPassword: V.same(v.newPassword, v.confirmPassword) });
  if(Object.keys(errs).length) return showForm(form, errs);
  busy(form, 'Saving…', async () => {
    const res = await api('POST', '/api/auth/change-password', v);
    if(res.status === 401) return handleSessionEnded();
    if(!res.ok) return showApiError(form, res);
    form.reset(); showForm(form, {}, res.message, false);
  });
});
document.getElementById('signOutAllBtn').addEventListener('click', async () => {
  const synced = await Sync.flush(4000);
  const msg = document.getElementById('signOutAllMsg');
  if(!synced){ msg.textContent = "Some progress hasn't reached the server yet. Check your connection and try again."; msg.classList.add('error'); return; }
  const res = await api('POST', '/api/auth/logout-all', {});
  if(!res.ok && res.status !== 401){ msg.textContent = (res.error && res.error.message) || 'Please try again.'; msg.classList.add('error'); return; }
  leaveAccount();
  toast('Signed out on every device.');
});
let deleteArmedUntil = 0;
document.getElementById('deleteAccountForm').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const form = ev.currentTarget, v = formValues(form);
  const btn = form.querySelector('button[type="submit"]');
  if(!v.password) return showForm(form, { password:'Enter your password.' });
  if(Date.now() > deleteArmedUntil){
    deleteArmedUntil = Date.now() + 8000;
    btn.textContent = 'Click again to delete permanently';
    setTimeout(() => { if(Date.now() > deleteArmedUntil) btn.textContent = 'Delete my account'; }, 8100);
    return;
  }
  deleteArmedUntil = 0;
  busy(form, 'Deleting…', async () => {
    const res = await api('POST', '/api/user/delete', { password:v.password });
    if(res.status === 401) return handleSessionEnded();
    if(!res.ok) return showApiError(form, res);
    try{ localStorage.removeItem(Sync.key()); }catch(e){}
    form.reset();
    leaveAccount();
    toast(res.message);
  });
  btn.textContent = 'Delete my account';
});

/* ---- header wiring ---- */
document.getElementById('accountBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  if(!Account.user) return openAuth('signin');
  const menu = document.getElementById('accountMenu');
  const open = menu.classList.toggle('hidden') === false;
  e.currentTarget.setAttribute('aria-expanded', String(open));
});
document.querySelectorAll('#accountMenu [data-acct]').forEach(b => b.addEventListener('click', () => openAccount(b.dataset.acct)));
document.getElementById('signOutBtn').addEventListener('click', () => signOut(!!Account.forceNextSignOut));
document.addEventListener('click', (e) => { if(!e.target.closest('#accountWrap')) closeAccountMenu(); });
document.addEventListener('keydown', (e) => {
  if(e.key !== 'Escape') return;
  closeAccountMenu();
  if(!document.getElementById('authModal').classList.contains('hidden')) closeAuth();
});

/* ---- keep the server in step when the page is hidden, closed or back online ---- */
window.addEventListener('online', () => { if(!Account.user) return; Sync.kick(); if(Account.needsRefresh) refreshAccountData(); });
document.addEventListener('visibilitychange', () => {
  if(!Account.user) return;
  if(document.visibilityState === 'hidden'){ Account.hiddenAt = Date.now(); Sync.flushTimers(); }
  // back after a while: another device may have saved progress meanwhile
  else if(Date.now() - Account.hiddenAt > 60000 && lessonView.style.display === 'none') refreshAccountData();
});
window.addEventListener('pagehide', () => { if(Account.user) Sync.flushTimers(); });

async function initAccount(){
  if(location.protocol === 'file:'){ renderAccountUi(); return; } // opened as a file: no server, guest mode only
  const action = readHashAction();
  const res = await api('GET', '/api/auth/me');
  if(res.network){
    // offline: show the last copy of the account, and send what's waiting once back online
    const cache = readAccountCache();
    if(cache && cache.user){ Account.available = true; Account.needsRefresh = true; Account.user = cache.user; Account.data = cache.data || {}; Sync.load(); renderAccountUi(); reloadLearningState(); setSyncStatus('retrying'); }
    return;
  }
  if(!res.ok || !('user' in res)){ Account.available = false; renderAccountUi(); return; } // no accounts backend here: guest mode only
  Account.available = true; Account.emailEnabled = !!res.emailEnabled;
  if(res.user) await enterAccount(res.user);
  else { try{ localStorage.removeItem(ACCOUNT_CACHE_KEY); }catch(e){} renderAccountUi(); }
  if(action) handleHashAction(action);
}


/* ==========================================================================
   15. PROGRESS ENGINE — events, XP, ranks, quests, badges (shared/rewards-rules.js)
   Every finished step, lesson, test, boss and game is an event with an id made
   here. Guests: events are kept in this browser (typingMasterEvents) and the
   totals are worked out from them with the same rules the server uses.
   Signed in: events go to POST /api/user/events through the save queue, and the
   server's answer replaces the totals shown here.
   ========================================================================== */
const EVENTS_KEY = 'typingMasterEvents', PLACEMENT_KEY = 'typingMasterPlacement', GHOST_KEY = 'typingMasterGhosts';
const Progress = { rules:null, view:null };
function localDay(d){ d = d || new Date(); const p = n => String(n).padStart(2,'0'); return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()); }
function readEvents(){ try{ return JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]'); }catch(e){ return []; } }
function writeEvents(list){ try{ localStorage.setItem(EVENTS_KEY, JSON.stringify(list.slice(-4000))); }catch(e){} }
/* what the server's normalizeEvent does, for the copy kept in this browser */
function prepEvent(raw){
  const at = new Date(raw.at);
  return Object.assign({ lessonId:null, gameId:null, step:null, kind:null, wpm:0, accuracy:0, errors:0, seconds:0, stars:null, crown:0, score:null, data:{} },
    raw, { day: localDay(at), hour: at.getHours(), xpClaim: raw.type === 'game' ? Math.min(TC_RULES.XP.gameMax, Math.max(0, raw.xp|0)) : 0,
      crown: raw.crown === true ? 1 : 0, data: Object.assign({}, raw.data || {}) });
}
/* the same shape as GET /api/user/state, made from the rules state */
function viewOf(st){
  const today = localDay();
  const lessonsView = {};
  for(const [id, L] of Object.entries(st.lessons)) lessonsView[id] = { status:L.status, step:L.step, stars:L.stars, crown:!!L.crown, bestWpm:L.bestWpm, bestAccuracy:L.bestAccuracy, attempts:L.attempts, lastPlayed:L.lastPlayed, lastWpm:L.lastWpm, lastAccuracy:L.lastAccuracy };
  const streak = TC_RULES.streakOf(Object.keys(st.days).filter(d => st.days[d].active), today);
  const dq = st.quests[today] || {};
  const rank = TC_META.rankFor(st.xp);
  const td = st.days[today];
  return {
    lessons: lessonsView, totals: TC_RULES.totalsOf(st), xp: st.xp, rank: { name:rank.name, min:rank.min, next:rank.next },
    streak: { count: streak.current || 0, best: streak.best, lastDate: streak.lastDate, freezesUsedThisWeek: streak.freezesUsedThisWeek || 0 },
    today: { date: today, minutes: td ? Math.round(td.seconds/60) : 0, goal: Settings.dailyGoal, xp: td ? td.xp : 0 },
    quests: { date: today, items: TC_RULES.questsFor(today).map(q => ({ id:q.id, title:q.title, unit:q.unit, goal:q.goal, progress: dq[q.id] ? dq[q.id].progress : 0, done: !!(dq[q.id] && dq[q.id].doneAt) })) },
    badges: Object.entries(st.badges).map(([id,b]) => ({ id, at:b.at })),
    certificates: Object.entries(st.certificates).map(([lv,c]) => ({ level:+lv, wpm:c.wpm, accuracy:c.accuracy, seconds:c.seconds, at:c.at })),
    unlocks: TC_RULES.unlocksFor(st.xp), games: Object.fromEntries(Object.entries(st.games).map(([id,g]) => [id, { best:g.best, runs:g.runs }])),
    placement: st.placement, settings: Settings,
    history: Object.entries(st.days).sort().map(([date,d]) => ({ date, minutes: Math.round(d.seconds/60), runs:d.runs, bestWpm:d.bestWpm || null, avgAccuracy: d.accCount ? Math.round(d.accSum/d.accCount) : null, xp:d.xp, quests:d.questsDone })),
  };
}
/* guests: rebuild the totals from the events kept here; old saves become import events once */
function rebuildGuestProgress(){
  let evs = readEvents();
  if(!evs.length){
    let legacy = {}; try{ legacy = JSON.parse(localStorage.getItem('typingMasterProgress') || '{}'); }catch(e){}
    const now = new Date().toISOString();
    evs = Object.entries(legacy).filter(([id]) => TC_META.BY_ID[id]).map(([id, p]) => ({ id:'legacy-'+id, type:'import', lessonId:id, stars:p.stars||0, wpm:p.bestWpm||0, accuracy:p.bestAcc||0, at:now }));
    if(evs.length) writeEvents(evs);
  }
  const st = TC_RULES.emptyState();
  for(const e of evs){ try{ TC_RULES.apply(st, prepEvent(e)); }catch(err){} }
  Progress.rules = st; Progress.view = viewOf(st);
}
/* a rules state rebuilt from the server's view, to show what an event earns before the server answers */
function scratchFromView(v){
  const st = TC_RULES.emptyState(); if(!v) return st;
  st.xp = v.xp || 0;
  for(const [id,L] of Object.entries(v.lessons || {})) st.lessons[id] = { status:L.status, step:L.step||0, stars:L.stars||0, crown:L.crown?1:0, bestWpm:L.bestWpm||0, bestAccuracy:L.bestAccuracy||0, attempts:L.attempts||0, lastWpm:L.lastWpm, lastAccuracy:L.lastAccuracy, lastPlayed:L.lastPlayed, completedAt:null, bossWon: (TC_META.BY_ID[id] && TC_META.BY_ID[id].kind === 'boss' && L.status === 'completed') ? 1 : 0 };
  (v.badges || []).forEach(b => { st.badges[b.id] = { at:b.at }; });
  return st;
}
/** Records one event. Returns what it earned (xp, badges, quests, certificates, rank-up), for the screen. */
function emitEvent(ev){
  const e = Object.assign({ id:newEventId(), at:new Date().toISOString(), tz:-new Date().getTimezoneOffset() }, ev);
  const xpBefore = (Progress.view && Progress.view.xp) || 0;
  let out = { xp:0, badges:[], quests:[], certificates:[] };
  if(Account.user){
    try{ out = TC_RULES.apply(scratchFromView(Progress.view), prepEvent(e)); }catch(err){}
    Sync.event(e);
  } else {
    const list = readEvents(); list.push(e); writeEvents(list);
    try{ out = TC_RULES.apply(Progress.rules, prepEvent(e)); }catch(err){}
    Progress.view = viewOf(Progress.rules);
  }
  const before = TC_META.rankFor(xpBefore), after = TC_META.rankFor(xpBefore + (out.xp || 0));
  out.xpBefore = xpBefore; out.rankUp = after.name !== before.name ? after.name : null;
  if(!Account.user) renderRewardBits();
  if(out.badges && out.badges.length && !(ev.type === 'run' || ev.type === 'game')) toast('Badge earned: ' + out.badges.map(badgeName).join(', '));
  return out;
}
function badgeName(id){ const b = (TC_RULES.BADGES || []).find(x => x.id === id); return b ? b.name : id; }
/* signed in: the server's answer is the truth */
function applyServerState(v){
  if(!v || !v.lessons) return;
  const view = Object.assign({}, v); delete view.sync; delete view.awarded;
  Progress.view = view;
  // lesson cards and Continue read `progress`: keep it in step with the server's lessons
  for(const [id, L] of Object.entries(v.lessons)){
    if(L.status === 'not_started' && !progress[id]) continue;
    progress[id] = Object.assign(progress[id] || {}, { stars:L.stars, bestWpm:L.bestWpm, bestAcc:L.bestAccuracy, status:L.status, crown:L.crown?1:0, attempts:L.attempts, stage:L.step });
  }
  if(v.position && TC_META.BY_ID[v.position.lessonId]) Account.data.typingMasterPosition = JSON.stringify({ lessonId:v.position.lessonId, stage:v.position.step||0, at:v.position.at });
  saveProgress();
  renderRewardBits();
  if(homeView.style.display !== 'none') renderHome();
}
async function loadServerState(){
  const res = await api('GET', '/api/user/state?today=' + localDay());
  if(res.ok) applyServerState(res);
  return res.ok;
}
Sync.event = function(e){ this.enqueue({ kind:'complete', method:'POST', path:'/api/user/events', body:{ events:[e], today:localDay() } }); };
/* rank chip in the top bar, quests on the home screen */
function renderRewardBits(){
  const v = Progress.view; if(!v) return;
  const chip = document.getElementById('rankChip');
  chip.hidden = false; chip.innerHTML = TC_REWARDS_UI.rankBar(v);
  const streakN = Math.max(v.streak ? v.streak.count : 0, +document.getElementById('streakCount').textContent || 0);
  document.getElementById('streakCount').textContent = streakN;
  const q = document.getElementById('questsPanel');
  if(q) q.innerHTML = TC_REWARDS_UI.questsPanel(v.quests, { goal: Settings.dailyGoal, minutes: v.today ? v.today.minutes : 0 });
}

/* ==========================================================================
   14. LOOK: themes, effects, settings, navigation (next version, phase 1)
   Settings are saved under typingMasterSettings. typingMasterTheme keeps its
   old meaning ('dark'/'light') so older saves still load.
   ========================================================================== */
const THEME_KEY='typingMasterTheme', SETTINGS_KEY='typingMasterSettings';
const THEMES=[
  ['letters','Floating letters','#e9e5d8','#5fd6c0'],['aurora','Aurora','#5fd6c0','#7e6cff'],['neon','Neon grid','#ff5fd2','#4de3ff'],
  ['space','Deep space','#8fc7ff','#27348b'],['sunset','Sunset','#ff9d5c','#ff5e8a'],['ocean','Ocean','#4fe0e6','#2b62d9'],
  ['gold','Black and gold','#e9c46a','#7a5a1e'],['paper','Paper (light)','#faf7ef','#c9bfa6']
];
const themeToggle=document.getElementById('themeToggle');
const Settings={ bg:'letters', effects:'full', dailyGoal:10, fingerGuide:true };
function loadSettings(){
  let saved=null; try{ saved=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'null'); }catch(e){}
  if(saved && typeof saved==='object') Object.assign(Settings, saved);
  else{
    let old='dark'; try{ old=localStorage.getItem(THEME_KEY)||'dark'; }catch(e){}
    Settings.bg = old==='light' ? 'paper' : 'letters';
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    Settings.effects = reduce ? 'light' : 'full';
  }
  if(!THEMES.some(t=>t[0]===Settings.bg)) Settings.bg='letters';
  if(!['full','light','off'].includes(Settings.effects)) Settings.effects='full';
}
function saveSettings(){ try{ localStorage.setItem(SETTINGS_KEY, JSON.stringify(Settings)); }catch(e){} }
function themeChip(t){ return `<button type="button" class="theme-chip" data-bg="${t[0]}" style="--sw:${t[2]};--sw2:${t[3]}" aria-pressed="false"><i></i>${t[1]}</button>`; }
function paintThemeControls(){
  document.querySelectorAll('.theme-chip').forEach(b=>b.setAttribute('aria-pressed', String(b.dataset.bg===Settings.bg)));
  const t=THEMES.find(x=>x[0]===Settings.bg);
  themeToggle.innerHTML=`<svg class="nb-svg" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.25"/><path d="M8 1.75a6.25 6.25 0 0 1 0 12.5z" fill="currentColor" stroke="none"/></svg><span class="nav-label">${t?t[1].replace(' (light)',''):'theme'}</span>`;
  const seg=(id,v)=>document.querySelectorAll(`#${id} button`).forEach(b=>b.setAttribute('aria-pressed', String(b.dataset.v===String(v))));
  seg('setEffects', Settings.effects); seg('setSound', soundLevel); seg('setGoal', Settings.dailyGoal); seg('setGuide', Settings.fingerGuide?'on':'off');
}
function applyTheme(bg){
  if(bg==='dark') bg='letters'; if(bg==='light') bg='paper'; // older callers
  Settings.bg=bg; saveSettings();
  const root=document.documentElement;
  root.setAttribute('data-bg', bg);
  root.setAttribute('data-theme', bg==='paper'?'light':'dark');
  try{ localStorage.setItem(THEME_KEY, bg==='paper'?'light':'dark'); }catch(e){}
  paletteCache = null; // canvas colours are sampled from CSS variables
  paintThemeControls(); BgFx.start();
}
function applyEffects(level){
  Settings.effects=level; saveSettings();
  document.documentElement.setAttribute('data-fx', level);
  paintThemeControls(); BgFx.start();
}
function applyFingerGuide(on){
  Settings.fingerGuide=!!on; saveSettings();
  const hc=document.querySelector('.hands-card'); if(hc) hc.style.display = on ? '' : 'none';
  if(lessonMachine) lessonMachine.setGuide(!!on);
  paintThemeControls();
}

/* floating letters / stars on a canvas behind the page; paused when hidden or effects are not Full */
const BgFx={ el:document.getElementById('bgfx'), ctx:null, raf:0, parts:[], w:0, h:0, mode:'', c1:'#fff', c2:'#5fd6c0',
  start(){
    cancelAnimationFrame(this.raf);
    const mode = Settings.effects==='full' && (Settings.bg==='letters'||Settings.bg==='space') ? Settings.bg : '';
    this.mode=mode;
    if(!mode || !this.el.getContext){ this.el.hidden=true; return; }
    this.ctx=this.ctx||this.el.getContext('2d'); this.el.hidden=false; this.size(); this.seed();
    this.raf=requestAnimationFrame(t=>this.loop(t));
  },
  size(){ const d=Math.min(1.5, window.devicePixelRatio||1); this.w=innerWidth; this.h=innerHeight; this.el.width=Math.round(this.w*d); this.el.height=Math.round(this.h*d); this.ctx.setTransform(d,0,0,d,0,0); },
  seed(){
    const cs=getComputedStyle(document.documentElement), n=this.mode==='space'?170:44, G='abcdefghijklmnopqrstuvwxyz;,./';
    this.c1=cs.getPropertyValue('--text').trim()||'#fff'; this.c2=cs.getPropertyValue('--teal').trim()||'#5fd6c0';
    this.parts=[]; for(let i=0;i<n;i++) this.parts.push({x:Math.random()*this.w, y:Math.random()*this.h, z:.3+Math.random(), p:Math.random()*6.28, c:G[Math.floor(Math.random()*G.length)]});
  },
  loop(t){
    if(!this.mode || document.hidden) return;
    const c=this.ctx; c.clearRect(0,0,this.w,this.h);
    for(let i=0;i<this.parts.length;i++){
      const s=this.parts[i];
      if(this.mode==='space'){
        s.x-=s.z*.06; if(s.x<-2) s.x=this.w+2;
        c.globalAlpha=.35+.65*Math.abs(Math.sin(t/900*s.z+s.p)); c.fillStyle=i%9===0?this.c2:this.c1;
        c.beginPath(); c.arc(s.x,s.y,s.z*1.25,0,6.2832); c.fill();
      } else {
        s.y-=s.z*.35; s.x+=Math.sin(t/1600+s.p)*.25; if(s.y<-50){ s.y=this.h+50; s.x=Math.random()*this.w; }
        c.globalAlpha=.07+s.z*.2; c.fillStyle=i%4===0?this.c2:this.c1;
        c.font='600 '+Math.round(12+s.z*30)+'px "IBM Plex Mono", monospace'; c.fillText(s.c,s.x,s.y);
      }
    }
    c.globalAlpha=1; this.raf=requestAnimationFrame(tt=>this.loop(tt));
  }
};
window.addEventListener('resize', ()=>{ if(BgFx.mode){ BgFx.size(); BgFx.seed(); } });
document.addEventListener('visibilitychange', ()=>{ if(!document.hidden && BgFx.mode){ cancelAnimationFrame(BgFx.raf); BgFx.raf=requestAnimationFrame(t=>BgFx.loop(t)); } });

/* cards tilt toward the pointer (Effects: Full, mouse only) */
document.addEventListener('pointermove', (e)=>{
  if(Settings.effects!=='full' || (e.pointerType && e.pointerType!=='mouse')) return;
  const card=e.target.closest && e.target.closest('.lesson-card,.fun-card'); if(!card) return;
  const r=card.getBoundingClientRect(), x=(e.clientX-r.left)/r.width, y=(e.clientY-r.top)/r.height;
  card.style.setProperty('--ry',((x-.5)*10).toFixed(2)+'deg'); card.style.setProperty('--rx',((.5-y)*8).toFixed(2)+'deg');
  card.style.setProperty('--gx',(x*100).toFixed(0)+'%'); card.style.setProperty('--gy',(y*100).toFixed(0)+'%'); card.style.setProperty('--go',1);
}, {passive:true});
document.addEventListener('pointerout', (e)=>{
  const card=e.target.closest && e.target.closest('.lesson-card,.fun-card');
  if(card && !card.contains(e.relatedTarget)){ card.style.setProperty('--rx','0deg'); card.style.setProperty('--ry','0deg'); card.style.setProperty('--go',0); }
});

/* views: one shown at a time */
const VIEW_IDS=['homeView','lessonView','funSelectView','arcadePlay','accountView','settingsView','progressView','workshopView'];
function setNavCurrent(id){
  const map={homeView:'navLearn',lessonView:'navLearn',funSelectView:'funModeBtn',arcadePlay:'funModeBtn',progressView:'navProgress',workshopView:'navWorkshop',settingsView:'navSettings'};
  ['navLearn','funModeBtn','navProgress','navWorkshop','navSettings'].forEach(b=>{ const el=document.getElementById(b); if(el) el.toggleAttribute('aria-current', map[id]===b); if(el && map[id]===b) el.setAttribute('aria-current','page'); });
}
function hideExtraViews(){ ['settingsView','progressView','workshopView'].forEach(id=>{ document.getElementById(id).style.display='none'; }); }
function openPage(id){
  document.documentElement.classList.toggle('in-lesson', id === 'lessonView');
  stopArcade(); stopTimers(); resultsView.classList.add('hidden'); closeAccountMenu(); closeThemeMenu();
  VIEW_IDS.forEach(v=>{ document.getElementById(v).style.display = v===id ? 'flex' : 'none'; });
  setNavCurrent(id); window.scrollTo(0,0);
}
function closeThemeMenu(){ document.getElementById('themeMenu').classList.add('hidden'); themeToggle.setAttribute('aria-expanded','false'); }

/* settings page */
document.getElementById('setThemes').innerHTML = THEMES.map(themeChip).join('');
document.getElementById('themeMenu').innerHTML = THEMES.map(themeChip).join('');
document.getElementById('homeThemes').insertAdjacentHTML('beforeend', THEMES.map(themeChip).join(''));
document.addEventListener('click', (e)=>{
  const chip=e.target.closest && e.target.closest('.theme-chip'); if(chip){ applyTheme(chip.dataset.bg); return; }
  if(!e.target.closest('.theme-wrap')) closeThemeMenu();
});
themeToggle.addEventListener('click', (e)=>{ e.stopPropagation(); const m=document.getElementById('themeMenu'); const open=m.classList.toggle('hidden')===false; themeToggle.setAttribute('aria-expanded', String(open)); });
document.querySelectorAll('#setEffects button').forEach(b=>b.addEventListener('click',()=>applyEffects(b.dataset.v)));
document.querySelectorAll('#setSound button').forEach(b=>b.addEventListener('click',()=>{ applySoundLevel(+b.dataset.v); paintThemeControls(); }));
document.querySelectorAll('#setGoal button').forEach(b=>b.addEventListener('click',()=>{ Settings.dailyGoal=+b.dataset.v; saveSettings(); paintThemeControls(); }));
document.querySelectorAll('#setGuide button').forEach(b=>b.addEventListener('click',()=>applyFingerGuide(b.dataset.v==='on')));
document.getElementById('soundToggle').addEventListener('click', () => { applySoundLevel((soundLevel+1) % SOUND_LEVELS.length); paintThemeControls(); });

/* reset progress, confirmed by typing RESET: this browser's data, or (signed in) the account's progress on the server */
const resetInput=document.getElementById('resetInput'), resetBtn=document.getElementById('resetBtn');
const RESET_KEYS = ['typingMasterProgress','typingMasterStreak','typingMasterKeyStats','typingMasterBigramLatency','typingMasterErrorClasses','typingMasterPosition', EVENTS_KEY, PLACEMENT_KEY, GHOST_KEY];
resetInput.addEventListener('input', ()=>{ resetBtn.disabled = resetInput.value.trim()!=='RESET'; });
resetBtn.addEventListener('click', async ()=>{
  if(resetInput.value.trim()!=='RESET') return;
  const m=document.getElementById('resetMsg');
  resetBtn.disabled=true;
  if(Account.user){
    // runs still waiting to be sent would bring the old progress back, so they go first
    Sync.queue = Sync.queue.filter(q => q === Sync.inFlight || q.kind === 'position'); Sync.persist();
    const res = await api('POST', '/api/user/reset', { confirm:'RESET', today:localDay() });
    if(!res.ok){ m.textContent = (res.error && res.error.message) || 'The reset didn\u2019t go through. Try again.'; m.classList.add('error'); resetBtn.disabled=false; return; }
    RESET_KEYS.forEach(k=>{ delete Account.data[k]; try{ localStorage.removeItem(k); }catch(e){} }); saveAccountCache();
    applyServerState(res);
    m.textContent='Your account\u2019s progress has been reset on every device.';
  } else {
    RESET_KEYS.forEach(k=>{ try{ localStorage.removeItem(k); }catch(e){} });
    m.textContent='Progress in this browser has been reset.';
  }
  resetInput.value='';
  if(!Account.user) rebuildGuestProgress();
  reloadLearningState(); renderRewardBits();
  m.classList.remove('error');
});
function renderSettingsPage(){
  paintThemeControls();
  const signedIn=!!Account.user;
  document.getElementById('resetText').innerHTML = signedIn
    ? 'Clears every lesson, star, XP, badge, streak and statistic in your account, on every device. Your account, sign-in and look settings stay. This can’t be undone. Type <b>RESET</b> to confirm.'
    : 'Clears every lesson, star, streak and statistic saved in this browser. This can’t be undone. Type <b>RESET</b> to confirm.';
  resetBtn.disabled = true; resetInput.disabled = false;
}
document.getElementById('navLearn').addEventListener('click', backToDashboard);
document.getElementById('navSettings').addEventListener('click', ()=>{ openPage('settingsView'); renderSettingsPage(); });
document.getElementById('navProgress').addEventListener('click', ()=>{ openPage('progressView'); renderProgressPage(); });
async function renderProgressPage(){
  const body = document.getElementById('progressBody'); body.className = 'progress-body';
  let history = (Progress.view && Progress.view.history) || [];
  if(Account.user){ const r = await api('GET', '/api/user/history?today=' + localDay()); if(r.ok && r.days) history = r.days.map(d => Object.assign({}, d, { quests:d.questsDone })); }
  body.innerHTML = TC_REWARDS_UI.progressScreen(Object.assign({}, Progress.view || {}, { settings: Settings }), history,
    { keyStats, bigramLatency, errorClasses, today: localDay(), name: Account.user ? Account.user.fullName : '', defs: TC_RULES.BADGES });
  TC_REWARDS_UI.enhance(body, { name: Account.user ? Account.user.fullName : '' });
}
document.getElementById('navWorkshop').addEventListener('click', ()=>{ openPage('workshopView'); renderWorkshop(); });

/* ---- Workshop: keycaps, ink, paper and key sounds, unlocked by rank (all cosmetic) ---- */
const WS_KIND = { keycaps:'Keycap sets', ink:'Ink colours', paper:'Paper stocks', keySound:'Key sounds' };
const WS_LOOK = {
  'keycaps:standard':{kt:'#253532',hi:'#364c46',ks:'#060b0a',kl:'#ece7d9'}, 'keycaps:ivory':{kt:'#e9dfc8',hi:'#fffaf0',ks:'#9a8a63',kl:'#2a2418'},
  'keycaps:signal':{kt:'#b3372c',hi:'#dc5a4d',ks:'#571510',kl:'#fff3e6'}, 'keycaps:blueprint':{kt:'#1f3f7a',hi:'#3260b0',ks:'#0b1a38',kl:'#eaf2ff'},
  'keycaps:midnight':{kt:'#14141c',hi:'#2a2a3a',ks:'#000',kl:'#c9c3ff'}, 'keycaps:gilded':{kt:'#3a2c10',hi:'#7a5a1e',ks:'#140e03',kl:'#ffe9a8'},
  'ink:black':'#26221b', 'ink:navy':'#1d2f5c', 'ink:oxblood':'#6b1d1d', 'ink:violet':'#4b2a7a',
  'paper:cream':'#f6f0e1', 'paper:onionskin':'#eef0ea', 'paper:ledger':'#e3eedf',
};
function applyWorkshopLook(){
  const r = document.documentElement.style, k = WS_LOOK['keycaps:' + (Settings.keycaps || 'standard')];
  if(k){ r.setProperty('--kt', k.kt); r.setProperty('--kt-hi', k.hi); r.setProperty('--ks', k.ks); r.setProperty('--kl', k.kl); }
  r.setProperty('--sheet-ink', WS_LOOK['ink:' + (Settings.ink || 'black')] || '#26221b');
  r.setProperty('--sheet', WS_LOOK['paper:' + (Settings.paper || 'cream')] || '#f6f0e1');
  [homeMachine, lessonMachine].forEach(m => { if(m){ m.setSkin(Settings.keycaps || 'standard');
    m.el.style.setProperty('--sheet', WS_LOOK['paper:' + (Settings.paper || 'cream')] || '#f6f0e1'); m.el.style.setProperty('--sheet-ink', WS_LOOK['ink:' + (Settings.ink || 'black')] || '#26221b'); } });
}
function renderWorkshop(){
  const xp = (Progress.view && Progress.view.xp) || 0, open = new Set(TC_RULES.unlocksFor(xp));
  const body = document.getElementById('workshopBody'); body.className = 'workshop-body';
  const preview = `<div class="ws-preview glass"><div class="ws-sheet"><span class="ws-typed">the quick brown fox</span><span class="ws-cur">j</span><span class="ws-rest">umps</span></div>
    <div class="ws-keys">${'asdfjkl;'.split('').map(c => `<span class="ws-key${c==='j'?' next':''}"><b>${c}</b></span>`).join('')}</div></div>`;
  body.innerHTML = preview + Object.entries(WS_KIND).map(([kind, label]) => `<section class="set-card"><h2>${label}</h2><div class="ws-items">` +
    TC_RULES.WORKSHOP.filter(w => w.kind === kind).map(w => {
      const id = w.id.split(':')[1], locked = !open.has(w.id), inUse = (Settings[kind] || TC_RULES.DEFAULT_SETTINGS[kind]) === id;
      const look = WS_LOOK[w.id], sw = look ? (typeof look === 'string' ? look : look.kt) : 'var(--raise)';
      return `<button class="ws-item${inUse?' in-use':''}" data-kind="${kind}" data-id="${id}" ${locked?'disabled':''} aria-pressed="${inUse}"><i style="background:${sw}"></i><span>${esc(w.name)}</span><small>${locked ? 'Unlocks at ' + esc(w.rank) : (inUse ? 'In use' : 'Use')}</small></button>`;
    }).join('') + `</div></section>`).join('') + `<p class="lede">Background themes are free and live in Settings. Everything here is cosmetic and unlocked by rank: nothing is sold.</p>`;
}
document.getElementById('workshopView').addEventListener('click', (e) => {
  const b = e.target.closest('.ws-item'); if(!b || b.disabled) return;
  Settings[b.dataset.kind] = b.dataset.id; saveSettings(); applyWorkshopLook();
  if(b.dataset.kind === 'keySound') applySoundLevel(b.dataset.id === 'off' ? 2 : b.dataset.id === 'soft' ? 1 : 0);
  if(Account.user) api('PUT', '/api/user/settings', { settings: { keycaps:Settings.keycaps, ink:Settings.ink, paper:Settings.paper, keySound:Settings.keySound, bg:Settings.bg, effects:Settings.effects, dailyGoal:Settings.dailyGoal, fingerGuide:Settings.fingerGuide } });
  renderWorkshop();
});
let homeMachine = null, lessonMachine = null;
/* the 3D typewriter (js/typewriter.js): a demo on the home screen, the real thing in every lesson */
function setupMachines(){
  if(!window.TC_TYPEWRITER) return;
  homeMachine = TC_TYPEWRITER.create(document.getElementById('homeMachineSlot'), { demo:true, skin:Settings.keycaps || 'standard', showGuide:true,
    meta:{ left:'Level 3 · All 26 letters', right:'Demo' } });
  lessonMachine = TC_TYPEWRITER.create(document.getElementById('lessonMachine'), { demo:false, skin:Settings.keycaps || 'standard', showGuide:Settings.fingerGuide, autoNext:true });
  document.documentElement.classList.add('has-machine');
}
function machineMeta(){
  if(!lessonMachine) return;
  const l = getLessonById(currentLessonId); if(!l) return;
  const left = l.isPlacement ? 'Placement test' : l.isReview ? 'Problem keys drill' : `Level ${l.level} · ${l.title}`;
  lessonMachine.setMeta(left, `Step ${currentStage+1} of ${stages.length} · ${STEP_LABEL[stages[currentStage]] || ''}`);
}
function machineReadings(){ if(lessonMachine) lessonMachine.readings({ wpm:(startTime && Date.now()-startTime > 2000) ? currentWpm() : 0, accuracy:currentAccuracy(), seconds:parseFloat(timeValueEl.textContent)||0, errors:errorCount }); }

/* ---- works offline: a service worker caches the app's own files (never /api) ---- */
if('serviceWorker' in navigator && location.protocol !== 'file:'){
  navigator.serviceWorker.register('sw.js').then(reg => {
    const ready = (w) => { if(!w) return; w.addEventListener('statechange', () => { if(w.state === 'installed' && navigator.serviceWorker.controller) showUpdateReady(reg); }); };
    if(reg.waiting && navigator.serviceWorker.controller) showUpdateReady(reg);
    reg.addEventListener('updatefound', () => ready(reg.installing));
  }).catch(() => {});
  // reload only when the learner chose "Reload" (a first install also changes the controller)
  navigator.serviceWorker.addEventListener('controllerchange', () => { if(window.__tcUpdateChosen){ window.__tcUpdateChosen = false; location.reload(); } });
}
function showUpdateReady(reg){
  const el = document.getElementById('toast');
  el.innerHTML = 'Update ready. <button class="link-btn" id="updateReload">Reload</button>';
  el.classList.remove('hidden');
  document.getElementById('updateReload').addEventListener('click', () => { window.__tcUpdateChosen = true; if(reg.waiting) reg.waiting.postMessage('skipWaiting'); else location.reload(); });
}
window.addEventListener('beforeunload', saveKeyStats);

/* ---- init ---- */
(function init(){
  loadSettings();
  document.documentElement.setAttribute('data-fx', Settings.effects);
  applyTheme(Settings.bg);
  let savedSound = 0; try{ savedSound = parseInt(localStorage.getItem(SOUND_KEY)||'0', 10) || 0; }catch(e){}
  applySoundLevel(savedSound);
  setupMachines();
  applyFingerGuide(Settings.fingerGuide);
  applyWorkshopLook();
  loadProgress(); loadStreak(); loadKeyStats(); loadAnalytics();
  homeView.style.display='flex'; lessonView.style.display='none';
  document.getElementById('funSelectView').style.display='none';
  document.getElementById('accountView').style.display='none';
  hideExtraViews(); setNavCurrent('homeView');
  document.getElementById('arcadePlay').style.display='none';
  rebuildGuestProgress();
  renderHome();
  initAccount(); // async: signs you back in and loads your account's progress, if there is a server
})();
