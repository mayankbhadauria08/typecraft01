/* ==========================================================================
   1. LESSON PLAN — 24 lessons, 6 tiers.
      `teach` lists the characters a lesson introduces; a lesson may only use
      characters taught by itself or an earlier lesson (capitals only after
      the Shift lesson). Lesson ids are permanent: saved progress is keyed by
      them, so lessons can be reordered but never renumbered.
   ========================================================================== */
const lessons = [
  { id:'l1', tier:'Beginner — Home Row', keys:['F','J'], teach:'fj', title:'Home Base',
    charDrill:"fff jjj fj fj jf jf fjf jfj ff jj fjfj jfjf" },
  { id:'l2', tier:'Beginner — Home Row', keys:['D','K'], teach:'dk', title:'Adding D & K',
    charDrill:"ddd kkk dk dk kd kd dkd kdk fjdk kdjf" },
  { id:'l3', tier:'Beginner — Home Row', keys:['S','L'], teach:'sl', title:'Adding S & L',
    charDrill:"sss lll sl sl ls ls sls lsl fjdksl lskdjf" },
  { id:'l4', tier:'Beginner — Home Row', keys:['A',';'], teach:'a;', title:'Adding A & ;',
    charDrill:"aaa ;;; a; a; ;a ;a a;a ;a; fjdksla ;alskdjf",
    wordDrill:["dad","sad","lad","ask","add","fads","flask","salad","salsa","alfalfa"],
    paragraphDrill:"a lad asks a dad; a sad lad adds a flask; salad falls; salsa falls; a lass asks a lad; alfalfa falls; add a flask; ask a lass" },
  { id:'l5', tier:'Beginner — Home Row', keys:['G','H'], teach:'gh', title:'Filling In G & H',
    charDrill:"ggg hhh gh gh hg hg ghg hgh half glass flash",
    wordDrill:["half","glass","flash","gala","gash","hall","lag","gas","ask","flask"],
    paragraphDrill:"a lad has a flask; a gala had a glass; glass falls; a flash; a gash; ask a lass; half a salad falls; add a dash salsa" },
  { id:'l6', tier:'Beginner — Home Row', keys:['fluency'], teach:'', title:'Home Row Fluency',
    charDrill:"asdfghjkl; ;lkjhgfdsa asdf jkl; fdsa lkj;",
    wordDrill:["flask","glass","salad","salsa","alfalfa","half","flash","gala","ask","lass"],
    paragraphDrill:"dad had a flask; a lad asks a lass; glass falls; salsa gala; ask dad; a sad lad had a glass flask; all glass falls; add salsa; ask a lass" },

  { id:'l7', tier:'Intermediate — Top Row', keys:['E','I'], teach:'ei', title:'Reaching for E & I',
    charDrill:"eee iii ei ei ie ie eie iei fjdksl eifj iehg",
    wordDrill:["side","hide","life","aide","die","lid","kid","field","shield","dial"],
    paragraphDrill:"a kid hides a die; a shield aids a lad; life is a gas; a field lies; a lass hides a lid; a die falls; a kid slides" },
  { id:'l8', tier:'Intermediate — Top Row', keys:['R','T'], teach:'rt', title:'Reaching for R & T',
    charDrill:"rtrt trtr rt tr rat tar art trade dirt",
    wordDrill:["rat","tar","art","dirt","trail","start","stare","tire","tired","state"],
    paragraphDrill:"the star has light; dirt hides the tale; a trail leads a kid; a rat starts a fire; a lid falls; her sister stares; she stirs the salad; a tired girl rests" },
  { id:'l9', tier:'Intermediate — Top Row', keys:['W','O'], teach:'wo', title:'Reaching for W & O',
    charDrill:"wo ow wow low tow flow slow throw shadow",
    wordDrill:["low","tow","flow","slow","throw","shadow","word","grow","glow","wood"],
    paragraphDrill:"the old fowl was slow to grow; a low tide throws a shadow; a word of gold falls; she rows to shore; a girl trades a dirt trail for a low road" },
  { id:'l10', tier:'Intermediate — Top Row', keys:['U','P'], teach:'up', title:'Reaching for U & P',
    charDrill:"up pu pup put pat pot pet pit pull push",
    wordDrill:["put","pup","pull","push","pure","pour","plus","pile","upset","output","spout","path"],
    paragraphDrill:"she put the pup out; a pilot pours a hot drip; the plot was set apart; push the pail up the path; the spot was pale" },
  { id:'l11', tier:'Intermediate — Top Row', keys:['Y','Q'], teach:'yq', title:'Reaching for Y & Q',
    charDrill:"yq qy yes yet quit quiet quest year",
    wordDrill:["your","yes","yet","quit","quiet","quest","quote","query","story","study","sturdy","truly"],
    paragraphDrill:"your quiet quest stays true at dusk; a study of trust guides you truly; a story tours the world; she tries to quote it slowly" },
  { id:'l12', tier:'Intermediate — Numbers', keys:['1','2','3','4','5'], teach:'12345', title:'Number Row: 1–5',
    charDrill:"1 2 3 4 5 11 22 33 a1 s2 d3 f4 g5",
    wordDrill:["12","34","51","23","45","142","215","314","521","413"],
    paragraphDrill:"flight 415 departs at gate 23; the door is 512; she has 21 keys; 34 pages hold a total of 125" },
  { id:'l13', tier:'Intermediate — Numbers', keys:['6','7','8','9','0'], teach:'67890', title:'Number Row: 6–0',
    charDrill:"6 7 8 9 0 67 89 90 606 707",
    wordDrill:["67","89","90","1990","2024","60","78","906","1000","250"],
    paragraphDrill:"the year 1990 had 60 hot days; 78 people saw 90 stars; she kept a diary of 250 pages; a total of 1000 words" },

  { id:'l14', tier:'Advanced — Bottom Row', keys:['V','M'], teach:'vm', title:'Reaching for V & M',
    charDrill:"vm mv move have make time game visit",
    wordDrill:["move","have","make","time","game","mile","visit","vivid","value","smile"],
    paragraphDrill:"we move a mile every visit; make more time; a vivid memory stays; she gives a warm smile; a movie starts the same day" },
  { id:'l18', tier:'Advanced — Bottom Row', keys:['B','N'], teach:'bn', title:'Reaching for B & N',
    charDrill:"bn nb ban bun born barn bank bright",
    wordDrill:["ban","bun","born","barn","bank","bright","bunny","between","brand","begin"],
    paragraphDrill:"a bright bunny ran between the barn and the bank; a new brand began; she will begin a new plan now" },
  { id:'l15', tier:'Advanced — Bottom Row', keys:['C',','], teach:'c,', title:'Reaching for C & ,',
    charDrill:"c, ,c cat, cot, cut, come, care,",
    wordDrill:["cat","cot","cut","come","care","voice","place","close","office","race"],
    paragraphDrill:"come here, watch closely, then act, please; a cat sat, a cot moved, a voice spoke clearly, calm, slow, quiet" },
  { id:'l16', tier:'Advanced — Bottom Row', keys:['X','.'], teach:'x.', title:'Reaching for X & .',
    charDrill:"x. .x fox. box. mix. fix. next. exit.",
    wordDrill:["fox","box","mix","fix","exit","next","text","sixty","taxi","relax"],
    paragraphDrill:"the fox sat next to a box. it was fixed. a text was mailed. sixty taxis exit at rest." },
  { id:'l17', tier:'Advanced — Bottom Row', keys:['Z','/'], teach:'z/', title:'Reaching for Z & /',
    charDrill:"z/ /z size zone maze/ lazy hazy dozer",
    wordDrill:["size","zone","maze","lazy","hazy","zero","amaze","gaze","haze","doze"],
    paragraphDrill:"a lazy fox grazed near the size of a maze. a hazy haze filled the zone at dusk. a dozer moves slowly, a gaze holds steady." },
  { id:'l19', tier:'Advanced — Shift & Symbols', keys:['Shift'], teach:'', shift:true, title:'Shift & Capitals',
    charDrill:"The Cat The Dog A Big Apple New York",
    wordDrill:["The","Cat","Monday","New York","London","Tokyo","Begins","Now","Capital","Title"],
    paragraphDrill:"The Cat Sat. Monday Begins Now. New York, London, and Tokyo are big cities. Every Title deserves a Capital Letter.",
    paragraphs:["Paris, Rome, and Berlin are old cities. Maria and James met in Lisbon on a Friday in June. The Atlantic Ocean lies between Europe and North America."] },
  { id:'l20', tier:'Advanced — Shift & Symbols', keys:['!','@','#','$','%','&','*','(',')','-','_','=','+',"'",'"','?',':'], teach:`!@#$%&*()-_=+'"?:`, title:'Punctuation & Symbols',
    charDrill:`! @ # $ % & * ( ) - _ = + ' " ? : it's don't why? note: (a) 2+2=4 50%`,
    wordDrill:["$12.50","8%","(about)","name@example.com","555-123-4567","\"Wait!\"","he said,","costs $5","call now:","email me","don't","it's","why?","#1","a&b","x=y+1","snake_case"],
    paragraphDrill:`He said, "Wait!" then left; it costs $12.50, about 8%. Isn't that odd? Email me at name@example.com or call 555-123-4567.`,
    paragraphs:[`Don't panic: the file (report_v2) is 98% done & due at 5 pm. Can you check it? Use #urgent if it's late, or email ops@example.com.`] },

  { id:'l21', tier:'Mastery — Fluency', keys:['speed'], teach:'', title:'Common Words Sprint',
    charDrill:"th he in er an re nd at on nt ha es",
    wordDrill:["the","and","for","you","are","with","this","that","from","have","they","will","one","all","can"],
    paragraphDrill:"The most common words in English carry most of everyday writing. Once they are automatic, your hands barely pause between them, and your speed climbs on its own.",
    paragraphs:[
      "People often think good typists move their fingers quickly, but the real secret is that they never stop to search for a key. Every word you use each day is a chance to practice that calm, steady flow.",
      "Short words like the, and, for, and with appear in almost every sentence you write. When your hands know them by heart, longer words feel easier, because there is less to think about between them."] },
  { id:'l22', tier:'Mastery — Fluency', keys:['sentences'], teach:'', title:'Sentence Fluency',
    charDrill:"th he in er an re nd at on",
    wordDrill:["market","customers","coffee","brewed","quiet","street","busy","minutes","early","arrive"],
    paragraphDrill:"The market opens early, and the first customers arrive before the coffee is even brewed. A quiet street turns busy within minutes.",
    paragraphs:[
      "The train left the station a few minutes late, but nobody seemed to mind. Most passengers had a book, a coffee, or a window to look out of, and the morning light made the fields glow.",
      "A good recipe tells you what to do, but a good cook knows why. Taste as you go, keep your knife sharp, and clean up while the water boils, so the kitchen never gets ahead of you."] },
  { id:'l23', tier:'Mastery — Fluency', keys:['paragraph'], teach:'', title:'Paragraph Practice',
    charDrill:"th he in er an re nd at on nt",
    wordDrill:["rhythm","fingers","keyboard","mechanics","disappear","practice","fluency","goal","mind","free"],
    paragraphDrill:"Learning to type well is less about speed and more about rhythm. Once your fingers know the keyboard, your mind is free to think about the words instead of where your hands need to go. That is the real goal of practice: to make the mechanics disappear.",
    paragraphs:[
      "Every skill has a stage where progress feels slow and the gains are hard to see. That is usually the moment when the most important change is happening, because your habits are being rebuilt underneath the surface. Keep showing up, and one day the new way will simply feel normal.",
      "Look at the screen, not at your hands. At first this makes you slower and you will make more mistakes, which is frustrating. But each time you resist the urge to glance down, your fingers learn the map a little better, until the keyboard becomes something you feel rather than see."] },
  { id:'l24', tier:'Mastery — Fluency', keys:['60 seconds'], teach:'', timed:60, title:'Timed Challenge',
    charDrill:"th he in er an re nd at on nt ha",
    wordDrill:["wrists","relaxed","reach","accurate","automatic","favor","clean","messy","daily","lasting"],
    paragraphDrill:"Keep both wrists low and relaxed, let your fingers return to the home row after every reach, and resist the urge to look down at the keys. Speed follows naturally once accuracy becomes automatic, so favor a slow, clean pass over a fast, messy one. Small daily sessions build more lasting skill than one long, exhausting sprint.",
    paragraphs:["A typing test measures two things at once: how fast you move and how often you are right. The second matters more, because every error costs time to notice and fix. Aim for a pace you can hold without stumbling, then let it climb on its own."] }
];

/* what each lesson may use: everything taught by it and every lesson before it */
(function computeAllowedKeys(){
  const allowed = new Set([' ']); let shift = false;
  lessons.forEach(l => {
    for(const c of (l.teach || '')) allowed.add(c);
    if(l.shift) shift = true;
    l.allowed = new Set(allowed); l.allowShift = shift;
    l.newLetters = [...(l.teach || '')].filter(c => /[a-z]/.test(c));
  });
})();

const TIER_ORDER = [];
lessons.forEach(l => { if(!TIER_ORDER.includes(l.tier)) TIER_ORDER.push(l.tier); });
const TIER_ACCENT = {
  'Beginner — Home Row':'#4a9a68', 'Intermediate — Top Row':'#4a90c2', 'Intermediate — Numbers':'#7d7fd1',
  'Advanced — Bottom Row':'#b8862b', 'Advanced — Shift & Symbols':'#d2704a', 'Mastery — Fluency':'#c0629a'
};

/* Common English words. Each lesson's word stage draws from the ones it can
   type with the keys taught so far, preferring words with its new letters. */
const COMMON_WORDS = ("a about above across act add after again age ago air all almost alone along also always am among an and animal another answer any appear are area arm around art as ask at away baby back bad bag ball bank base be bear beat beautiful became because become bed been before began begin behind being believe below best better between big bird black blue boat body book both bottom box boy bread break bring brother brought build built busy but buy by call came can car care carry case cat catch caught cause cell center certain chair chance change check child choose city class clean clear close cloud cold color come common cook cool copy corner could count country course cover cross cup cut dark day dear deep desk did die different dinner do does dog done door down draw dream dress drink drive drop dry during each early earth easy eat edge egg eight either else end enough even evening ever every eye face fact fair fall family far farm fast father fear feel feet few field fight fill final find fine fire first fish five floor flower fly follow food foot for force form found four free fresh friend from front fruit full game garden gave get girl give glad glass go gold gone good got grass great green ground group grow had hair half hall hand happen happy hard has hat have he head hear heard heart heat heavy held help her here high hill him his hit hold hole home hope horse hot hour house how huge idea if in inch inside into iron is island it its job join joy jump just keep kept key kind king kitchen knew know lake land large last late laugh lay lead learn least leave led left leg less let letter level lie life lift light like line list listen little live long look lost lot loud love low made main make man many map mark market may me mean meet men middle might mile milk mind minute miss moment money month moon more morning most mother mountain move much music must my name near need never new next nice night nine no noise north nose not note nothing notice now number object of off office often oil old on once one only open or order other our out over own page paint pair paper park part pass past path pay people pick picture piece place plan plant play please point poor post pull push put quick quiet quite rain ran rather reach read ready real red remember rest rich ride right ring river road rock roll room round row rule run safe said sail salt same sand sat save saw say school sea seat second see seed seem seen sell send sent set seven shall shape share sharp she ship shoe shop short should show shut side sign silent simple since sing sister sit six size skin sky sleep slow small smell smile snow so soft soil some song soon sound south space speak special speed spell spend spring square stand star start state station stay step still stone stood stop store storm story straight strange street strong study such sugar summer sun sure surface sweet swim table tail take talk tall teach team tell ten than thank that the their them then there these they thick thin thing think third this those though thought three through throw tie time tiny to today together told tomorrow too took top total touch toward town track trade train tree trip true try turn two under until up upon us use usual valley very visit voice wait walk wall want war warm was wash watch water wave way we wear weather week well went were west what wheel when where which while white who whole why wide wild will win wind window winter wish with without woman wonder wood word work world would write wrong yard year yellow yes yet you young your").split(' ');

let reviewLesson = null; // synthetic lesson built from the person's weak keys
function getLessonById(id){ return id === 'review' ? reviewLesson : lessons.find(l => l.id === id); }
function lessonNumber(lesson){ return lessons.indexOf(lesson) + 1; }

/* ==========================================================================
   2. PROCEDURAL TEXT GENERATORS (per stage)
   ========================================================================== */
function randInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
function pick(arr){ return arr[randInt(0, arr.length-1)]; }
function shuffled(arr){ const a = arr.slice(); for(let i=a.length-1;i>0;i--){ const j=randInt(0,i); [a[i],a[j]]=[a[j],a[i]]; } return a; }

function generateFromTokens(tokenString){
  const tokens = tokenString.split(' ').filter(Boolean);
  const itemCount = randInt(20,30);
  const items = [];
  for(let i=0;i<itemCount;i++){ items.push(pick(tokens)); }
  return items.join(' ');
}
function generateFromPool(pool){
  const itemCount = randInt(16,24);
  const items = [];
  for(let i=0;i<itemCount;i++){ items.push(pick(pool)); }
  return items.join(' ');
}
/* letter groups from every key learned so far, half of them led by this lesson's new keys */
function generateMixed(lesson){
  const letters = [...lesson.allowed].filter(c => /[a-z;]/.test(c));
  const fresh = lesson.newLetters.length ? lesson.newLetters : letters;
  const groups = [];
  const count = randInt(18,24);
  for(let i=0;i<count;i++){
    const len = randInt(2,5); let g = Math.random() < 0.5 ? pick(fresh) : pick(letters);
    while(g.length < len) g += pick(letters);
    groups.push(g);
  }
  return groups.join(' ');
}

const wordPoolCache = {};
function wordPool(lesson){
  if(lesson.isReview) return lesson.wordDrill || [];
  if(wordPoolCache[lesson.id]) return wordPoolCache[lesson.id];
  const own = lesson.wordDrill || [];
  const fits = w => [...w].every(c => lesson.allowed.has(c));
  // lessons that teach only digits or symbols keep to their own drill words
  const usesNew = w => lesson.newLetters.length ? lesson.newLetters.some(c => w.includes(c)) : !lesson.teach;
  let extra = COMMON_WORDS.filter(w => fits(w) && usesNew(w));
  if(lesson.shift) extra = extra.map(w => Math.random() < 0.4 ? w[0].toUpperCase()+w.slice(1) : w);
  const pool = Array.from(new Set(own.concat(extra)));
  wordPoolCache[lesson.id] = pool;
  return pool;
}

/* a run of sentences from the lesson's word pool, punctuated only with keys already taught */
function generateParagraph(lesson){
  const pool = wordPool(lesson);
  const period = lesson.allowed.has('.'), comma = lesson.allowed.has(','), semi = lesson.allowed.has(';');
  const sentences = [];
  const count = randInt(4,5);
  for(let i=0;i<count;i++){
    const words = []; const len = randInt(4,8);
    for(let j=0;j<len;j++) words.push(pick(pool));
    if(comma && len > 5 && Math.random() < 0.5) words[randInt(1,len-3)] += ',';
    let s = words.join(' ');
    if(lesson.allowShift) s = s[0].toUpperCase() + s.slice(1);
    sentences.push(s);
  }
  return sentences.join(period ? '. ' : (semi ? '; ' : ' ')) + (period ? '.' : '');
}
function pickParagraph(lesson){
  const written = [lesson.paragraphDrill].concat(lesson.paragraphs || []).filter(Boolean);
  // before the Shift lesson, freshly generated text joins the hand-written paragraph so every run differs
  const canGenerate = !lesson.allowShift && wordPool(lesson).length >= 8;
  const choice = canGenerate ? randInt(0, written.length + 1) : randInt(0, written.length - 1);
  return choice < written.length ? written[choice] : generateParagraph(lesson);
}
/* the timed challenge: one prose paragraph from the Mastery tier at a time (keeps the clock on screen); reaching the end loads another */
function generateTimedText(){
  const prose = [];
  lessons.filter(l => l.tier.startsWith('Mastery')).forEach(l => {
    [l.paragraphDrill].concat(l.paragraphs || []).forEach(p => { if(p) prose.push(p); });
  });
  return pick(prose);
}

function getStagesForLesson(lesson){
  if(lesson.isReview) return (lesson.wordDrill && lesson.wordDrill.length) ? ['character','word'] : ['character'];
  if(lesson.timed) return ['timed'];
  // lessons 1-3 have no vowels yet, so there are no real words to type: drill the keys instead
  if(wordPool(lesson).length < 4) return ['character','mixed'];
  return ['character','word','paragraph'];
}
function getStageText(lesson, stageType){
  if(stageType === 'character') return generateFromTokens(lesson.charDrill);
  if(stageType === 'mixed') return generateMixed(lesson);
  if(stageType === 'word') return generateFromPool(wordPool(lesson));
  if(stageType === 'timed') return generateTimedText();
  return pickParagraph(lesson);
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
function timedLimit(){ const l = getLessonById(currentLessonId); return (l && l.timed && stages[currentStage]==='timed') ? l.timed : 0; }
function elapsedSeconds(){ return startTime ? (Date.now()-startTime)/1000 : 0; }
/* the Time keycap: counts up, or down from the limit in the timed challenge (which ends at zero) */
function updateClock(){
  const limit = timedLimit(), elapsed = elapsedSeconds();
  timeValueEl.textContent = (limit ? Math.max(0, limit-elapsed) : elapsed).toFixed(1)+'s';
  if(limit){
    updateCarriage();
    if(elapsed >= limit && !lessonFinished) finishLesson();
  }
}

function currentWpm(){ if(!startTime) return 0; const m=(Date.now()-startTime)/60000; return m<=0?0:Math.round((correctKeystrokes/5)/m); }
function currentAccuracy(){ if(totalKeystrokes===0) return 100; return Math.max(0, Math.round(((totalKeystrokes-errorCount)/totalKeystrokes)*100)); }
function updateStatsDisplay(){ wpmValueEl.textContent=currentWpm(); accValueEl.textContent=currentAccuracy()+'%'; errValueEl.textContent=errorCount; }
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
  const pct = limit ? Math.min(1, elapsedSeconds()/limit) : (letters.length ? Math.min(1, currentIndex/letters.length) : 0);
  const railWidth = railEl.clientWidth - 26;
  carriageEl.style.left = (pct*railWidth)+'px';
}

function renderStageRow(){
  const row = document.getElementById('stageRow');
  const labels = {character:'Characters', mixed:'Mixed', word:'Words', paragraph:'Paragraph', timed:'60-second test'};
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

function loadStage(){
  flushPendingSkip();
  const lesson = getLessonById(currentLessonId);
  exerciseText = getStageText(lesson, stages[currentStage]);
  renderText(exerciseText);
  currentIndex = 0;
  updateCaretPosition(); updateCarriage(); updateFingerGuide(); renderStageRow();
  if(!lesson.isReview) notePosition(currentLessonId, currentStage);
}

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
const CAPTURE_IDS = new Set(['typer','metroTyper','towTyper']);
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
    }
    return;
  }
  if(IGNORED_KEYS.has(e.key)) return;
  if(e.key.length>1 && e.key!=='Enter') return;
  if(currentIndex>=letters.length) return;
  e.preventDefault();

  const inputChar = (e.key==='Enter') ? '\n' : e.key;
  const expectedChar = exerciseText[currentIndex];
  startTimerIfNeeded(); totalKeystrokes++;

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
  else{ letters[currentIndex].className='letter incorrect'; errorCount++; playSound('incorrect'); }

  currentIndex++; updateCaretPosition(); updateStatsDisplay(); updateCarriage(); updateFingerGuide();

  if(currentIndex === letters.length){
    if(timedLimit()){ loadStage(); }   // timed challenge: the clock ends it, so finishing the text just brings more
    else if(currentStage < stages.length - 1){ currentStage++; loadStage(); }
    else{ finishLesson(); }
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
  const items = [{key:'all', label:'all lessons'}].concat(TIER_ORDER.map(t => ({key:t, label:tierShortLabel(t)})));
  bar.innerHTML = items.map((it,i) =>
    `${i===1 ? '<span class="config-sep"></span>' : ''}<button class="config-item${activeTier===it.key?' active':''}" data-tier="${it.key}">${it.label}</button>`
  ).join('');
  bar.querySelectorAll('.config-item').forEach(b => b.addEventListener('click', () => {
    activeTier = b.dataset.tier; renderTierFilter(); renderDashboard();
  }));
}

function renderHomeStats(){
  // a lesson only opened (signed in, the server records that) doesn't count as attempted
  const entries = Object.values(progress).filter(p => !p.status || p.attempts > 0 || p.status === 'completed');
  const started = entries.length;
  const starsEarned = entries.reduce((s,p) => s + (p.stars||0), 0);
  const bestWpm = entries.reduce((m,p) => Math.max(m, p.bestWpm||0), 0);
  const accs = entries.map(p => p.bestAcc||0).filter(Boolean);
  const avgAcc = accs.length ? Math.round(accs.reduce((a,b)=>a+b,0)/accs.length) : 0;
  const stat = (label,value,sub) => `<div class="hstat"><div class="hs-label">${label}</div><div class="hs-value">${value}</div><div class="hs-sub">${sub}</div></div>`;
  document.getElementById('homeStats').innerHTML =
    stat('lessons', `${started}<span style="font-size:15px;color:var(--sub)">/${lessons.length}</span>`, 'attempted') +
    stat('stars', `${starsEarned}<span style="font-size:15px;color:var(--sub)">/${lessons.length*3}</span>`, 'accuracy rating') +
    stat('best wpm', bestWpm || '—', 'personal record') +
    stat('avg accuracy', avgAcc ? avgAcc+'%' : '—', 'across lessons');
}

function renderDashboard(){
  cardDashboard.innerHTML = '';
  const tiers = TIER_ORDER.filter(t => activeTier === 'all' || t === activeTier);
  tiers.forEach(tier => {
    const accent = TIER_ACCENT[tier] || 'var(--accent)';
    const tierLessons = lessons.filter(l => l.tier === tier);
    const cleared = tierLessons.filter(l => progress[l.id] && progress[l.id].stars > 0).length;
    const block = document.createElement('div'); block.className='tier-block';
    block.innerHTML = `<div class="tier-head"><div class="tier-dot" style="background:${accent}"></div><div class="tier-title">${tier}</div><div class="tier-meta">${cleared}/${tierLessons.length}</div></div>`;
    const grid = document.createElement('div'); grid.className='card-grid';
    tierLessons.forEach(l=>{
      const p = progress[l.id]; const stars = p?p.stars:0;
      const card = document.createElement('div'); card.className='lesson-card';
      card.style.setProperty('--tier-accent', accent);
      const best = p && p.bestWpm ? `${p.bestWpm} wpm` : 'L'+lessonNumber(l);
      const state = (p && p.status === 'in_progress') ? '<div class="lstate">in progress</div>' : '';
      card.innerHTML = `<div class="lnum">${best}</div><div class="ltitle">${l.title}</div>${state}<div class="lstars">${dotGlyphs(stars)}</div>`;
      card.addEventListener('click', () => openLesson(l.id));
      grid.appendChild(card);
    });
    block.appendChild(grid); cardDashboard.appendChild(block);
  });
}
function renderHome(){ renderTierFilter(); renderHomeStats(); renderContinuePanel(); renderDashboard(); renderReviewPanel(); renderCoachPanel(); }

function openLesson(lessonId, startStage){
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
  hideExtraViews(); setNavCurrent('homeView'); closeThemeMenu();
  lessonView.style.display='none'; resultsView.classList.add('hidden');
  document.getElementById('accountView').style.display='none';
  document.getElementById('funSelectView').style.display='none';
  document.getElementById('spaceInvadersView').style.display='none';
  document.getElementById('metronomeView').style.display='none';
  document.getElementById('tugOfWarView').style.display='none';
  document.getElementById('metroResultsOverlay').classList.add('hidden');
  document.getElementById('towResultsOverlay').classList.add('hidden');
  siStop(); metStop(); towStop();
  homeView.style.display='flex';
  stopTimers();
  saveKeyStats();
  if(Account.pendingServerData){ const d = Account.pendingServerData; Account.pendingServerData = null; applyServerProgress(d); }
  renderHome();
}
function openFunMode(){
  hideExtraViews(); setNavCurrent('funSelectView'); closeThemeMenu();
  homeView.style.display='none';
  document.getElementById('accountView').style.display='none';
  document.getElementById('metroResultsOverlay').classList.add('hidden');
  document.getElementById('towResultsOverlay').classList.add('hidden');
  lessonView.style.display='none'; resultsView.classList.add('hidden');
  document.getElementById('spaceInvadersView').style.display='none';
  document.getElementById('metronomeView').style.display='none';
  document.getElementById('tugOfWarView').style.display='none';
  document.getElementById('funSelectView').style.display='flex';
}
function resetLessonState(){
  stopTimers(); pendingSkip = null; lastKeyTime = null; lastExpectedChar = null; lastKeystrokeWasCorrect = true;
  currentIndex=0; totalKeystrokes=0; correctKeystrokes=0; errorCount=0; startTime=null; wpmSamples=[]; lessonFinished=false;
  updateStatsDisplay(); updateClock(); paper.style.opacity='1'; startHint.style.display='flex'; paper.classList.remove('focused');
  typer.value='';
}
function resetLesson(){
  // the results card is a fixed overlay — it must be dismissed here, or Retry /
  // Tab restarts the lesson underneath a still-visible scrim
  resultsView.classList.add('hidden');
  currentStage=0; resetLessonState(); loadStage();
  typer.focus();
}

function finishLesson(){
  lessonFinished = true; stopTimers(); flushPendingSkip();
  const finalWpm = currentWpm(); const finalAcc = currentAccuracy();
  const limit = timedLimit();
  const elapsedSec = startTime ? Math.round(limit ? Math.min(limit, elapsedSeconds()) : elapsedSeconds()) : 0;
  updateClock();
  wpmSamples.push({t: elapsedSec, wpm: finalWpm});

  let stars = 0;
  if(finalAcc>=98) stars=3; else if(finalAcc>=92) stars=2; else if(finalAcc>=80) stars=1;
  if(!getLessonById(currentLessonId).isReview){
    const prev = progress[currentLessonId];
    const entry = { stars: Math.max(stars, prev?prev.stars:0), bestWpm: Math.max(finalWpm, prev?prev.bestWpm:0), bestAcc: Math.max(finalAcc, prev?prev.bestAcc:0) };
    if(Account.user){
      // completed = every stage finished with at least 80% accuracy (1 star); it never goes back
      entry.status = (entry.stars >= 1) ? 'completed' : 'in_progress';
      entry.attempts = ((prev && prev.attempts) || 0) + 1; entry.stage = 0;
      Sync.complete({ lessonId:currentLessonId, stars, wpm:Math.min(finalWpm, 400), accuracy:finalAcc, errors:Math.min(errorCount, 100000), seconds:Math.min(elapsedSec, 36000) });
    }
    progress[currentLessonId] = entry;
    saveProgress();
  }
  saveKeyStats();

  document.getElementById('finalWpm').textContent = finalWpm;
  document.getElementById('finalAcc').textContent = finalAcc+'%';
  document.getElementById('finalErr').textContent = errorCount;
  document.getElementById('finalTime').textContent = elapsedSec+'s';
  document.getElementById('resultsStars').innerHTML = starGlyphs(stars);
  recordStreak();
  paper.style.opacity='0'; resultsView.classList.remove('hidden');
  drawWpmGraph(wpmSamples, finalAcc);
}

/* ==========================================================================
   9. FUN MODE — Space Invaders
   Words fall like ships; typing the full word destroys it. Long words spawn
   as multi-hit "boss" ships. Short words are fast, low-health "scouts".
   ========================================================================== */
const SI = { canvas:null, ctx:null, running:false, ships:[], score:0, lives:3, buffer:'', spawnTimer:0, spawnInterval:1800, animHandle:null, lastTs:0 };
let SI_SHORT_WORDS = [], SI_LONG_WORDS = [];

function siGatherWords(){
  const set = new Set();
  lessons.forEach(l => { if(Array.isArray(l.wordDrill)) l.wordDrill.forEach(w => { if(/^[a-zA-Z]+$/.test(w)) set.add(w.toLowerCase()); }); });
  const all = Array.from(set);
  SI_SHORT_WORDS = all.filter(w => w.length <= 4);
  SI_LONG_WORDS = all.filter(w => w.length >= 6);
  if(SI_SHORT_WORDS.length === 0) SI_SHORT_WORDS = ['cat','dog','sun','run','fox','pit','ask'];
  if(SI_LONG_WORDS.length === 0) SI_LONG_WORDS = ['keyboard','practice','accuracy','fluency'];
}
function siSpawnShip(){
  const isBoss = Math.random() < 0.16;
  const word = isBoss ? SI_LONG_WORDS[randInt(0,SI_LONG_WORDS.length-1)] : SI_SHORT_WORDS[randInt(0,SI_SHORT_WORDS.length-1)];
  SI.ships.push({ word, x: randInt(60, SI.canvas.width-60), y:-30, speed: isBoss?16:38, isBoss, hp: isBoss?3:1, maxHp: isBoss?3:1, hitFlash:0 });
}
function siStart(){
  siGatherWords();
  SI.canvas = document.getElementById('siCanvas'); SI.ctx = SI.canvas.getContext('2d');
  SI.ships=[]; SI.score=0; SI.lives=3; SI.buffer=''; SI.spawnTimer=0; SI.spawnInterval=1800; SI.running=true; SI.lastTs=performance.now();
  siUpdateHud();
  document.getElementById('siGameOver').classList.add('hidden');
  cancelAnimationFrame(SI.animHandle);
  SI.animHandle = requestAnimationFrame(siLoop);
}
function siStop(){ SI.running=false; cancelAnimationFrame(SI.animHandle); }
function siLoop(ts){
  if(!SI.running) return;
  const dt = ts - SI.lastTs; SI.lastTs = ts;
  SI.spawnTimer += dt;
  if(SI.spawnTimer > SI.spawnInterval){ SI.spawnTimer = 0; siSpawnShip(); if(SI.spawnInterval > 700) SI.spawnInterval -= 25; }
  SI.ships.forEach(s => { s.y += s.speed*(dt/1000); if(s.hitFlash>0) s.hitFlash -= dt; });
  const bottom = SI.canvas.height - 24;
  const survivors = [];
  SI.ships.forEach(s => { if(s.y >= bottom){ SI.lives--; SI.buffer=''; } else survivors.push(s); });
  SI.ships = survivors;
  if(SI.lives <= 0){ siGameOver(); return; }
  siRender(); siUpdateHud();
  SI.animHandle = requestAnimationFrame(siLoop);
}
/* canvas can't read CSS variables directly, so the active theme is sampled and
   cached, then invalidated whenever applyTheme() runs */
let paletteCache = null;
function themePalette(){
  if(paletteCache) return paletteCache;
  const cs = getComputedStyle(document.documentElement);
  const pick = (n,f) => cs.getPropertyValue(n).trim() || f;
  paletteCache = { bg:pick('--sub-alt','#2c2e31'), sub:pick('--sub','#646669'),
    accent:pick('--accent','#e2b714'), text:pick('--text','#d1d0c5'), error:pick('--error','#ca4754') };
  return paletteCache;
}
function siRender(){
  const ctx = SI.ctx, c = SI.canvas;
  const { bg, sub, accent, text, error } = themePalette();
  ctx.fillStyle = bg; ctx.fillRect(0,0,c.width,c.height);
  ctx.fillStyle = sub; ctx.globalAlpha = 0.35;
  for(let i=0;i<30;i++){ ctx.fillRect((i*53)%c.width, (i*97)%c.height, 2, 2); }
  ctx.globalAlpha = 1;
  SI.ships.forEach(s => {
    const w = s.isBoss?52:26, h = s.isBoss?32:18;
    ctx.fillStyle = s.hitFlash>0 ? text : (s.isBoss ? accent : sub);
    ctx.fillRect(s.x-w/2, s.y-h/2, w, h);
    const matched = (SI.buffer && s.word.startsWith(SI.buffer)) ? SI.buffer.length : 0;
    ctx.font='14px "IBM Plex Mono", monospace'; ctx.textAlign='left';
    const typedPart = s.word.slice(0,matched), restPart = s.word.slice(matched);
    const totalWidth = ctx.measureText(s.word).width;
    const startX = s.x - totalWidth/2;
    ctx.fillStyle = accent; ctx.fillText(typedPart, startX, s.y-h/2-8);
    ctx.fillStyle = text; ctx.fillText(restPart, startX+ctx.measureText(typedPart).width, s.y-h/2-8);
    if(s.isBoss){
      ctx.fillStyle=sub; ctx.globalAlpha=0.4; ctx.fillRect(s.x-26, s.y-h/2-22, 52, 4); ctx.globalAlpha=1;
      ctx.fillStyle=error; ctx.fillRect(s.x-26, s.y-h/2-22, 52*(s.hp/s.maxHp), 4);
    }
  });
}
function siUpdateHud(){
  document.getElementById('siScore').textContent = SI.score;
  document.getElementById('siLives').textContent = '❤️'.repeat(Math.max(0,SI.lives)) || '💀';
}
function siGameOver(){
  siStop();
  document.getElementById('siFinalScore').textContent = SI.score;
  document.getElementById('siGameOver').classList.remove('hidden');
}
function siHandleChar(ch){
  if(!SI.running) return;
  const candidate = SI.buffer + ch;
  const target = SI.ships.find(s => s.word.startsWith(candidate));
  if(target){
    SI.buffer = candidate;
    if(SI.buffer === target.word){
      target.hp -= 1; target.hitFlash = 120;
      playSound('correct');
      if(target.hp <= 0){ SI.ships = SI.ships.filter(s => s !== target); SI.score += target.isBoss ? 50 : 10; }
      SI.buffer = '';
    }
  } else {
    SI.buffer = '';
    playSound('incorrect');
  }
}
document.addEventListener('keydown', (e) => {
  if(document.getElementById('spaceInvadersView').style.display === 'none') return;
  if(typingElsewhere(e) || isShortcut(e)) return;
  if(e.key === ' ') e.preventDefault();
  if(e.key.length === 1){ e.preventDefault(); siHandleChar(e.key.toLowerCase()); }
});
document.getElementById('funModeBtn').addEventListener('click', openFunMode);
document.getElementById('funBackBtn').addEventListener('click', backToDashboard);
document.getElementById('playSiBtn').addEventListener('click', () => {
  document.getElementById('funSelectView').style.display='none';
  document.getElementById('spaceInvadersView').style.display='flex';
  siStart();
});
document.getElementById('siBackBtn').addEventListener('click', () => { siStop(); openFunMode(); });
document.getElementById('siExitBtn').addEventListener('click', () => { siStop(); openFunMode(); });
document.getElementById('siReplayBtn').addEventListener('click', siStart);

/* ==========================================================================
   10. FUN MODE — Metronome Rhythm Challenge
   A steady click sets the beat; typing near a beat builds a combo multiplier.
   ========================================================================== */
const MET = { bpm:80, beatMs:750, running:false, beatTimes:[], score:0, combo:0, bestCombo:0, onBeatHits:0, totalHits:0, tickHandle:null, text:'', index:0, letters:[] };
const TOLERANCE_MS = 160; // how close to a beat counts as "on time"

function metPlayClick(){
  const vol = volume();
  if(!audioCtx || vol===0) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.type='sine'; osc.frequency.setValueAtTime(880, now);
  gain.gain.setValueAtTime(0.08*vol, now); gain.gain.exponentialRampToValueAtTime(0.0001, now+0.08);
  osc.start(now); osc.stop(now+0.08);
}
function metBeatPulse(){
  const dot = document.getElementById('beatDot');
  dot.classList.add('pulse'); setTimeout(() => dot.classList.remove('pulse'), 120);
}
function metTick(){
  if(!MET.running) return;
  MET.beatTimes.push(Date.now());
  if(MET.beatTimes.length > 8) MET.beatTimes.shift();
  metPlayClick(); metBeatPulse();
}
function metText(){
  const pool = []; lessons.forEach(l => { if(Array.isArray(l.wordDrill)) l.wordDrill.forEach(w => { if(/^[a-zA-Z]+$/.test(w)) pool.push(w.toLowerCase()); }); });
  const items = []; for(let i=0;i<28;i++) items.push(pool[randInt(0,pool.length-1)]);
  return items.join(' ');
}
function metRender(){
  const disp = document.getElementById('metroTextDisplay');
  disp.innerHTML = '';
  const frag = document.createDocumentFragment();
  let word = null; // same per-word grouping as renderText()
  for(const ch of MET.text){
    const span = document.createElement('span'); span.className='letter default';
    span.textContent = (ch===' ') ? '\u00A0' : ch;
    if(!word){ word = document.createElement('span'); word.className='word'; frag.appendChild(word); }
    word.appendChild(span);
    if(ch===' ') word = null;
  }
  disp.appendChild(frag);
  MET.letters = Array.from(disp.querySelectorAll('.letter'));
  if(MET.letters.length) MET.letters[0].classList.add('current');
}
function metStart(){
  MET.bpm = parseInt(document.getElementById('metroBpmSelect').value, 10) || 80;
  MET.beatMs = 60000 / MET.bpm;
  MET.running = true; MET.beatTimes=[]; MET.score=0; MET.combo=0; MET.bestCombo=0; MET.onBeatHits=0; MET.totalHits=0;
  MET.text = metText(); MET.index = 0;
  metRender(); metUpdateHud();
  document.getElementById('metroResultsOverlay').classList.add('hidden');
  clearInterval(MET.tickHandle);
  metTick(); // immediate first beat so the user isn't waiting
  MET.tickHandle = setInterval(metTick, MET.beatMs);
  document.getElementById('metroTyper').value='';
  document.getElementById('metroStartHint').style.display='flex';
}
function metStop(){ MET.running=false; clearInterval(MET.tickHandle); }
function metUpdateHud(){
  document.getElementById('metroScore').textContent = MET.score;
  document.getElementById('metroCombo').textContent = MET.combo;
  const pct = MET.totalHits ? Math.round((MET.onBeatHits/MET.totalHits)*100) : 100;
  document.getElementById('metroOnBeat').textContent = pct;
}
function metClosestBeatDelta(now){
  if(MET.beatTimes.length===0) return 99999;
  let best = 99999;
  MET.beatTimes.forEach(t => { const d = Math.abs(now-t); if(d<best) best=d; });
  return best;
}
function metHandleKey(e){
  if(!MET.running || isShortcut(e)) return;
  if(e.key===' ') e.preventDefault();
  if(e.key.length!==1) return;
  if(MET.index>=MET.letters.length) return;
  e.preventDefault();
  const expected = MET.text[MET.index];
  const isCorrect = e.key===expected;
  const delta = metClosestBeatDelta(Date.now());
  const onBeat = isCorrect && delta<=TOLERANCE_MS;
  MET.totalHits++;
  if(onBeat) MET.onBeatHits++;

  if(isCorrect){
    MET.letters[MET.index].className='letter correct';
    if(onBeat){ MET.combo++; MET.score += 10*Math.min(MET.combo,10); playSound('correct'); }
    else{ MET.combo=0; MET.score += 2; playSound('correct'); }
    MET.bestCombo = Math.max(MET.bestCombo, MET.combo);
  } else {
    MET.letters[MET.index].className='letter incorrect';
    MET.combo=0; playSound('incorrect');
  }
  MET.letters.forEach(l=>l.classList.remove('current'));
  MET.index++;
  if(MET.index<MET.letters.length) MET.letters[MET.index].classList.add('current');
  metUpdateHud();
  if(MET.index>=MET.letters.length) metFinish();
}
function metFinish(){
  metStop();
  document.getElementById('metroFinalScore').textContent = MET.score;
  document.getElementById('metroBestCombo').textContent = MET.bestCombo;
  const pct = MET.totalHits ? Math.round((MET.onBeatHits/MET.totalHits)*100) : 100;
  document.getElementById('metroFinalOnBeat').textContent = pct+'%';
  document.getElementById('metroFinalBpm').textContent = MET.bpm;
  document.getElementById('metroResultsOverlay').classList.remove('hidden');
}
document.getElementById('metroTyper').addEventListener('focus', () => { document.getElementById('metroStartHint').style.display='none'; document.getElementById('metroPaper').classList.add('focused'); });
document.getElementById('metroTyper').addEventListener('blur', () => { document.getElementById('metroPaper').classList.remove('focused'); if(MET.index===0) document.getElementById('metroStartHint').style.display='flex'; });
document.getElementById('metroStartHint').addEventListener('click', () => document.getElementById('metroTyper').focus());
document.getElementById('metroPaper').addEventListener('click', () => document.getElementById('metroTyper').focus());
document.getElementById('metroTyper').addEventListener('keydown', metHandleKey);
document.addEventListener('keydown', (e) => {
  if(document.getElementById('metronomeView').style.display==='none') return;
  if(typingElsewhere(e) || isShortcut(e)) return;
  // not focused yet: take focus and count this key too, instead of swallowing it
  if(document.activeElement!==document.getElementById('metroTyper') && e.key.length===1){ document.getElementById('metroTyper').focus(); metHandleKey(e); }
});
document.getElementById('playMetroBtn').addEventListener('click', () => {
  document.getElementById('funSelectView').style.display='none';
  document.getElementById('metronomeView').style.display='flex';
  metStart();
});
document.getElementById('metroBackBtn').addEventListener('click', () => { metStop(); openFunMode(); });
document.getElementById('metroExitBtn').addEventListener('click', () => { metStop(); openFunMode(); });
document.getElementById('metroReplayBtn').addEventListener('click', metStart);

/* ==========================================================================
   11. FUN MODE — Tug-of-War (Bot vs Human)
   ========================================================================== */
const TOW = { running:false, botWpm:45, text:'', index:0, letters:[], startTime:null, correctChars:0, animHandle:null, finished:false };
function towText(){
  const pool = lessons.map(l=>l.paragraphDrill).filter(Boolean);
  return pool[randInt(0,pool.length-1)] || "Practice makes the mechanics disappear, one steady keystroke at a time.";
}
function towRender(){
  const disp = document.getElementById('towTextDisplay');
  disp.innerHTML=''; const frag = document.createDocumentFragment();
  let word = null; // same per-word grouping as renderText()
  for(const ch of TOW.text){
    const span=document.createElement('span'); span.className='letter default';
    span.textContent=(ch===' ')?'\u00A0':ch;
    if(!word){ word=document.createElement('span'); word.className='word'; frag.appendChild(word); }
    word.appendChild(span);
    if(ch===' ') word=null;
  }
  disp.appendChild(frag);
  TOW.letters = Array.from(disp.querySelectorAll('.letter'));
  if(TOW.letters.length) TOW.letters[0].classList.add('current');
}
function towStart(){
  TOW.botWpm = parseInt(document.getElementById('towBotSpeedSelect').value,10) || 45;
  TOW.text = towText(); TOW.index=0; TOW.correctChars=0; TOW.startTime=null; TOW.finished=false; TOW.running=true;
  document.getElementById('towBotWpmLabel').textContent = TOW.botWpm;
  document.getElementById('towUserWpm').textContent = 0;
  document.getElementById('towFlag').style.left = '50%';
  document.getElementById('towResultsOverlay').classList.add('hidden');
  towRender();
  document.getElementById('towTyper').value='';
  document.getElementById('towStartHint').style.display='flex';
  cancelAnimationFrame(TOW.animHandle);
  TOW.animHandle = requestAnimationFrame(towLoop);
}
function towStop(){ TOW.running=false; cancelAnimationFrame(TOW.animHandle); }
function towLoop(){
  if(!TOW.running) return;
  if(TOW.startTime){
    const elapsedMin = (Date.now()-TOW.startTime)/60000;
    const userWpm = elapsedMin>0 ? Math.round((TOW.correctChars/5)/elapsedMin) : 0;
    document.getElementById('towUserWpm').textContent = userWpm;

    const userProgress = Math.min(1, TOW.correctChars/TOW.text.length);
    const botCharsPerSec = (TOW.botWpm*5)/60;
    const botProgress = Math.min(1, ((Date.now()-TOW.startTime)/1000*botCharsPerSec)/TOW.text.length);
    const flagPct = Math.max(4, Math.min(96, 50 + (userProgress-botProgress)*50));
    document.getElementById('towFlag').style.left = flagPct+'%';

    if(!TOW.finished && botProgress>=1){ towFinish(false); }
    else if(!TOW.finished && userProgress>=1){ towFinish(true); }
  }
  TOW.animHandle = requestAnimationFrame(towLoop);
}
function towHandleKey(e){
  if(!TOW.running || TOW.finished || isShortcut(e)) return;
  if(e.key===' ') e.preventDefault();
  if(e.key.length!==1) return;
  if(TOW.index>=TOW.letters.length) return;
  e.preventDefault();
  if(!TOW.startTime) TOW.startTime = Date.now();
  const expected = TOW.text[TOW.index];
  const isCorrect = e.key===expected;
  if(isCorrect){ TOW.letters[TOW.index].className='letter correct'; TOW.correctChars++; playSound('correct'); }
  else{ TOW.letters[TOW.index].className='letter incorrect'; playSound('incorrect'); }
  TOW.letters.forEach(l=>l.classList.remove('current'));
  TOW.index++;
  if(TOW.index<TOW.letters.length) TOW.letters[TOW.index].classList.add('current');
}
function towFinish(userWon){
  TOW.finished = true; towStop();
  const elapsedMin = TOW.startTime ? (Date.now()-TOW.startTime)/60000 : 0.001;
  const userWpm = Math.round((TOW.correctChars/5)/Math.max(elapsedMin,0.001));
  document.getElementById('towResultTitle').textContent = userWon ? '🏆 You pulled the flag!' : '🤖 The bot out-typed you';
  document.getElementById('towFinalUserWpm').textContent = userWpm;
  document.getElementById('towFinalBotWpm').textContent = TOW.botWpm;
  document.getElementById('towResultsOverlay').classList.remove('hidden');
}
document.getElementById('towTyper').addEventListener('focus', () => { document.getElementById('towStartHint').style.display='none'; document.getElementById('towPaper').classList.add('focused'); });
document.getElementById('towTyper').addEventListener('blur', () => { document.getElementById('towPaper').classList.remove('focused'); if(TOW.index===0) document.getElementById('towStartHint').style.display='flex'; });
document.getElementById('towStartHint').addEventListener('click', () => document.getElementById('towTyper').focus());
document.getElementById('towPaper').addEventListener('click', () => document.getElementById('towTyper').focus());
document.getElementById('towTyper').addEventListener('keydown', towHandleKey);
document.addEventListener('keydown', (e) => {
  if(document.getElementById('tugOfWarView').style.display==='none') return;
  if(typingElsewhere(e) || isShortcut(e)) return;
  if(document.activeElement!==document.getElementById('towTyper') && e.key.length===1){ document.getElementById('towTyper').focus(); towHandleKey(e); }
});
document.getElementById('playTowBtn').addEventListener('click', () => {
  document.getElementById('funSelectView').style.display='none';
  document.getElementById('tugOfWarView').style.display='flex';
  towStart();
});
document.getElementById('towBackBtn').addEventListener('click', () => { towStop(); openFunMode(); });
document.getElementById('towExitBtn').addEventListener('click', () => { towStop(); openFunMode(); });
document.getElementById('towReplayBtn').addEventListener('click', towStart);

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
document.getElementById('dashboardBtn').addEventListener('click', backToDashboard);
document.getElementById('restartBtn').addEventListener('click', resetLesson);
document.getElementById('retryBtn').addEventListener('click', resetLesson);

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
    this.enqueue({ kind:'position', method:'PUT', path:'/api/user/progress/position', body:this.pendingPos });
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
  const payload = { progress:prog, state:{ keyStats:ks, bigramLatency:get('typingMasterBigramLatency') || {}, errorClasses:get('typingMasterErrorClasses') || {}, streak:get('typingMasterStreak') || undefined } };
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
  const res = await api('POST', '/api/user/progress/import', Object.assign({ importId:pendingImport.importId }, pendingImport.payload));
  btn.disabled = false; btn.textContent = 'Add to my account';
  if(!res.ok){ const m = document.getElementById('importMsg'); m.textContent = (res.error && res.error.message) || 'Could not add it just now. Please try again.'; m.classList.add('error'); return; }
  logImport(pendingImport.importId, 'added');
  pendingImport = null;
  document.getElementById('importModal').classList.add('hidden');
  await refreshAccountData();
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
  ['homeView','lessonView','funSelectView','spaceInvadersView','metronomeView','tugOfWarView','settingsView','progressView','workshopView'].forEach(id => { document.getElementById(id).style.display = 'none'; });
  setNavCurrent('accountView');
  resultsView.classList.add('hidden');
  siStop(); metStop(); towStop(); stopTimers();
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
const VIEW_IDS=['homeView','lessonView','funSelectView','spaceInvadersView','metronomeView','tugOfWarView','accountView','settingsView','progressView','workshopView'];
function setNavCurrent(id){
  const map={homeView:'navLearn',lessonView:'navLearn',funSelectView:'funModeBtn',spaceInvadersView:'funModeBtn',metronomeView:'funModeBtn',tugOfWarView:'funModeBtn',progressView:'navProgress',workshopView:'navWorkshop',settingsView:'navSettings'};
  ['navLearn','funModeBtn','navProgress','navWorkshop','navSettings'].forEach(b=>{ const el=document.getElementById(b); if(el) el.toggleAttribute('aria-current', map[id]===b); if(el && map[id]===b) el.setAttribute('aria-current','page'); });
}
function hideExtraViews(){ ['settingsView','progressView','workshopView'].forEach(id=>{ document.getElementById(id).style.display='none'; }); }
function openPage(id){
  siStop(); metStop(); towStop(); stopTimers(); resultsView.classList.add('hidden'); closeAccountMenu(); closeThemeMenu();
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

/* reset progress, confirmed by typing RESET (this browser's data; account data is reset through the server in a later phase) */
const resetInput=document.getElementById('resetInput'), resetBtn=document.getElementById('resetBtn');
resetInput.addEventListener('input', ()=>{ resetBtn.disabled = resetInput.value.trim()!=='RESET' || !!Account.user; });
resetBtn.addEventListener('click', ()=>{
  if(resetInput.value.trim()!=='RESET' || Account.user) return;
  ['typingMasterProgress','typingMasterStreak','typingMasterKeyStats','typingMasterBigramLatency','typingMasterErrorClasses','typingMasterPosition']
    .forEach(k=>{ try{ localStorage.removeItem(k); }catch(e){} });
  resetInput.value=''; resetBtn.disabled=true;
  loadProgress(); loadStreak(); loadKeyStats(); loadAnalytics();
  const m=document.getElementById('resetMsg'); m.textContent='Progress in this browser has been reset.'; m.classList.remove('error');
});
function renderSettingsPage(){
  paintThemeControls();
  const signedIn=!!Account.user;
  document.getElementById('resetText').innerHTML = signedIn
    ? 'Resetting an account’s saved progress arrives with the new server. For now, progress saved in your account stays as it is.'
    : 'Clears every lesson, star, streak and statistic saved in this browser. This can’t be undone. Type <b>RESET</b> to confirm.';
  resetBtn.disabled = true; resetInput.disabled = signedIn;
}
document.getElementById('navLearn').addEventListener('click', backToDashboard);
document.getElementById('navSettings').addEventListener('click', ()=>{ openPage('settingsView'); renderSettingsPage(); });
document.getElementById('navProgress').addEventListener('click', ()=>openPage('progressView'));
document.getElementById('navWorkshop').addEventListener('click', ()=>openPage('workshopView'));
window.addEventListener('beforeunload', saveKeyStats);

/* ---- init ---- */
(function init(){
  loadSettings();
  document.documentElement.setAttribute('data-fx', Settings.effects);
  applyTheme(Settings.bg);
  let savedSound = 0; try{ savedSound = parseInt(localStorage.getItem(SOUND_KEY)||'0', 10) || 0; }catch(e){}
  applySoundLevel(savedSound);
  applyFingerGuide(Settings.fingerGuide);
  loadProgress(); loadStreak(); loadKeyStats(); loadAnalytics();
  homeView.style.display='flex'; lessonView.style.display='none';
  document.getElementById('funSelectView').style.display='none';
  document.getElementById('spaceInvadersView').style.display='none';
  document.getElementById('metronomeView').style.display='none';
  document.getElementById('tugOfWarView').style.display='none';
  document.getElementById('accountView').style.display='none';
  hideExtraViews(); setNavCurrent('homeView');
  renderHome();
  initAccount(); // async: signs you back in and loads your account's progress, if there is a server
})();
