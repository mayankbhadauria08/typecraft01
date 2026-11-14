/* ==========================================================================
   TYPECRAFT NEXT — the 3D typewriter and keyboard guide (stand-alone part)
   Classic script, no framework. Attaches window.TC_TYPEWRITER.

     var m = TC_TYPEWRITER.create(container, {
       demo:false,                      // home-screen demo typist
       meta:{left:'Level 3 · All 26 letters', right:'Step 4 of 5 · Sentences'},
       skin:'ink',                      // ink | ivory | signal | blueprint
       showGuide:true,                  // next-key glow, reach line, finger caption
       effects:'full',                  // full | light | off (default: :root[data-fx], else reduced motion -> light)
       sound:function(name){},          // 'key' | 'error' | 'ding'
       autoNext:true,                   // setPosition() also calls setNext(text[index])
       demoKeys:'document'              // demo only: 'document' or 'focus' (keys only while the machine has focus)
     });
     m.setText(text); m.setPosition(i, {wrong:false}); m.pressKey(ch, correct); m.setNext(ch);
     m.readings({wpm, accuracy, seconds, errors}); m.setMeta(l, r); m.setHint(text);
     m.setSkin(name); m.setEffects(level); m.setGuide(on); m.destroy();
     m.el (the whole part), m.machineEl, m.readingsEl (move it anywhere you like)

   Hot path rule: setPosition / pressKey / setNext never read layout. They only
   write a few text nodes, classes and custom properties. Layout is read only on
   create, setText and resize (ResizeObserver).
   ========================================================================== */
(function(){
'use strict';

var doc = document, html = doc.documentElement;
var NS = 'http://www.w3.org/2000/svg';
var reduceMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

/* ---------- keyboard model (from docs/design-preview.html) ---------- */
// [label, width in 60ths, kind, id]
var ROWS = [
  [['`',4],['1',4],['2',4],['3',4],['4',4],['5',4],['6',4],['7',4],['8',4],['9',4],['0',4],['-',4],['=',4],['back',8,'mod','back']],
  [['tab',6,'mod','tab'],['q',4],['w',4],['e',4],['r',4],['t',4],['y',4],['u',4],['i',4],['o',4],['p',4],['[',4],[']',4],['\\',6]],
  [['caps',7,'mod','caps'],['a',4],['s',4],['d',4],['f',4],['g',4],['h',4],['j',4],['k',4],['l',4],[';',4],["'",4],['enter',9,'mod','enter']],
  [['shift',9,'mod','shiftL'],['z',4],['x',4],['c',4],['v',4],['b',4],['n',4],['m',4],[',',4],['.',4],['/',4],['shift',11,'mod','shiftR']],
  [['',16,'gap'],['',26,'space',' '],['',18,'gap']]
];
var SHIFTED = {'~':'`','!':'1','@':'2','#':'3','$':'4','%':'5','^':'6','&':'7','*':'8','(':'9',')':'0','_':'-','+':'=',
  '{':'[','}':']','|':'\\',':':';','"':"'",'<':',','>':'.','?':'/'};
var FINGER = {};
function assign(keys, f){ for(var i = 0; i < keys.length; i++) FINGER[keys[i]] = f; }
assign('`1qaz', 'lp'); assign('2wsx', 'lr'); assign('3edc', 'lm'); assign('45rtfgvb', 'li');
assign('67yuhjnm', 'ri'); assign('8ik,', 'rm'); assign('9ol.', 'rr'); assign("0-=p[];'/\\", 'rp');
FINGER[' '] = 'th'; FINGER.enter = 'rp'; FINGER.tab = 'lp'; FINGER.back = 'rp'; FINGER.shiftL = 'lp'; FINGER.shiftR = 'rp';
var HOME = {lp:'a', lr:'s', lm:'d', li:'f', ri:'j', rm:'k', rr:'l', rp:';'};
var FNAME = {lp:'left little finger', lr:'left ring finger', lm:'left middle finger', li:'left index finger',
  ri:'right index finger', rm:'right middle finger', rr:'right ring finger', rp:'right little finger', th:'either thumb'};
var NEIGHBOUR = {};
['qwertyuiop', 'asdfghjkl', 'zxcvbnm'].forEach(function(r){ for(var i = 0; i < r.length; i++) NEIGHBOUR[r[i]] = r[i + 1] || r[i - 1]; });

// character -> {base key id, shift key id or '', caption label}; cached so the hot path allocates nothing
var KF = {};
function keyFor(ch){
  var c = KF[ch];
  if(c) return c;
  var base = ch, shift = false, label;
  if(ch === '\n' || ch === '\r'){ base = 'enter'; label = 'Enter'; }
  else if(ch === '\t'){ base = 'tab'; label = 'Tab'; }
  else if(ch === ' '){ label = 'Space'; }
  else if(SHIFTED[ch]){ base = SHIFTED[ch]; shift = true; label = ch; }
  else if(ch.toLowerCase() !== ch){ base = ch.toLowerCase(); shift = true; label = ch; }
  else label = ch.toUpperCase();
  var f = FINGER[base] || '';
  var shiftId = shift ? (f.charAt(0) === 'l' ? 'shiftR' : 'shiftL') : '';
  var finger = FNAME[f] || '';
  if(shift && finger) finger += ', ' + (shiftId === 'shiftR' ? 'right' : 'left') + ' little finger on Shift';
  c = KF[ch] = {base:base, shift:shiftId, label:(shift ? 'Shift + ' : '') + label, finger:finger, f:f};
  return c;
}

var DEMO_LINES = ['the quick brown fox jumps over the lazy dog.', 'pack my box with five dozen liquor jugs.',
  'how vexingly quick daft zebras jump!', 'the five boxing wizards jump quickly.', 'sphinx of black quartz, judge my vow.'];

/* ---------- the #ink filter, injected once per page ---------- */
function injectInk(){
  if(doc.getElementById('ink')) return;
  var svg = doc.createElementNS(NS, 'svg');
  svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  svg.innerHTML = '<defs><filter id="ink" x="-4%" y="-25%" width="108%" height="150%">' +
    '<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" result="n"></feTurbulence>' +
    '<feDisplacementMap in="SourceGraphic" in2="n" scale="1.7" xChannelSelector="R" yChannelSelector="G"></feDisplacementMap></filter></defs>';
  (doc.body || html).appendChild(svg);
}

function el(tag, cls, parent, text){
  var e = doc.createElement(tag);
  if(cls) e.className = cls;
  if(text != null) e.textContent = text;
  if(parent) parent.appendChild(e);
  return e;
}
function disp(s){ return s.indexOf('\n') === -1 ? s : s.replace(/\n/g, '\u21b5'); }

/* word-wrap text into lines of at most cpl characters; a line keeps its trailing space */
function wrap(text, cpl){
  var lines = [], starts = [], i = 0, n = text.length;
  cpl = Math.max(8, cpl | 0);
  while(i < n){
    var end = Math.min(n, i + cpl), nl = text.indexOf('\n', i), cut;
    if(nl !== -1 && nl < end) cut = nl + 1;
    else if(end >= n) cut = n;
    else { var sp = text.lastIndexOf(' ', end - 1); cut = sp >= i ? sp + 1 : end; }
    lines.push(text.slice(i, cut)); starts.push(i); i = cut;
  }
  if(!lines.length){ lines.push(''); starts.push(0); }
  starts.push(n); // sentinel
  return {lines:lines, starts:starts};
}

function create(container, opts){
  opts = opts || {};
  injectInk();
  var api = {};
  var isDemo = !!opts.demo;
  var soundFn = typeof opts.sound === 'function' ? opts.sound : null;
  var autoNext = opts.autoNext !== false;
  var followRoot = !opts.effects;
  var fx = opts.effects || html.getAttribute('data-fx') || (reduceMQ && reduceMQ.matches ? 'light' : 'full');
  var guide = opts.showGuide !== false;
  var destroyed = false;

  /* ---------- DOM ---------- */
  var rootEl = el('div', 'tw');
  rootEl.setAttribute('data-skin', opts.skin || 'ink');
  rootEl.setAttribute('data-fx', fx);
  if(!guide) rootEl.classList.add('tw-noguide');
  var bench = el('div', 'tw-bench', rootEl);
  var machine = el('div', 'tw-machine', bench);
  machine.setAttribute('role', 'group');
  machine.setAttribute('aria-label', isDemo ? 'Typing demo. Click here, then type the highlighted line.' : 'Typewriter');
  if(isDemo) machine.tabIndex = 0;
  el('div', 'tw-sheen', machine).setAttribute('aria-hidden', 'true');
  var paperZone = el('div', 'tw-paper', machine);
  var sheet = el('div', 'tw-sheet', paperZone);
  var metaEl = el('div', 'tw-meta', sheet);
  var metaL = el('span', '', metaEl), metaR = el('span', '', metaEl);
  var view = el('div', 'tw-view', sheet);
  var linesEl = el('div', 'tw-lines', view);
  var slots = [];
  for(var s = 0; s < 5; s++) slots.push(el('div', 'tw-ln' + (s < 2 ? ' tw-done' : s > 2 ? ' tw-ahead' : ' tw-live'), linesEl));
  var live = slots[2];
  var dryEl = el('span', 'tw-dry', live), wetEl = el('span', 'tw-w', live), curEl = el('span', 'tw-c', live), restEl = el('span', 'tw-rest', live);
  var probe = el('span', 'tw-probe', view, 'MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM');
  probe.setAttribute('aria-hidden', 'true');
  el('div', 'tw-platen', machine);
  var rail = el('div', 'tw-rail', machine);
  var marker = el('div', 'tw-marker', rail);
  var well = el('div', 'tw-well', machine);
  well.setAttribute('aria-hidden', 'true');
  var deckWrap = el('div', 'tw-deckwrap', well);
  var deck = el('div', 'tw-deck', deckWrap);
  var KEYS = {};
  ROWS.forEach(function(r, ri){
    var row = el('div', 'tw-row', deck), col = 0;
    r.forEach(function(def){
      var label = def[0], w = def[1], kind = def[2], id = def[3] || label;
      var k = el('div', 'tw-k' + (kind ? ' tw-' + kind : ''), row);
      k.style.setProperty('--w', w);
      if(kind !== 'gap'){
        el('b', '', k, kind === 'space' ? '' : label);
        KEYS[id] = {el:k, cx:(col + w / 2) / 60, cy:ri + 0.5};
      }
      if(label === 'f' || label === 'j') k.classList.add('tw-home');
      col += w;
    });
  });
  var reach = doc.createElementNS(NS, 'svg');
  reach.setAttribute('class', 'tw-reach');
  var rPath = doc.createElementNS(NS, 'path'), rHome = doc.createElementNS(NS, 'circle');
  rPath.setAttribute('d', 'M0 0'); rHome.setAttribute('r', '0');
  reach.appendChild(rPath); reach.appendChild(rHome); deck.appendChild(reach);
  var foot = el('div', 'tw-foot', machine);
  var capEl = el('span', 'tw-cap', foot);
  var capPre = el('span', '', capEl, 'Next key '), capKey = el('b', '', capEl), capFin = el('span', 'tw-fin', capEl);
  capEl.style.visibility = 'hidden';
  var hintEl = el('span', 'tw-hint', foot);

  // readings panel
  var readingsEl = el('aside', 'tw-readings', bench);
  readingsEl.setAttribute('aria-label', 'Live readings');
  var gSpeed = el('div', 'tw-g', readingsEl);
  el('div', 'tw-g-label', gSpeed, 'Speed');
  var odo = el('div', 'tw-odo', gSpeed); odo.setAttribute('aria-hidden', 'true');
  var wheels = [];
  for(var w = 0; w < 3; w++){
    var wheel = el('span', 'tw-wheel', odo), strip = el('i', '', wheel);
    for(var d = 0; d < 10; d++) el('span', '', strip, String(d));
    wheels.push(strip);
  }
  var speedSr = el('span', 'tw-sr', gSpeed, '0 words per minute');
  el('div', 'tw-g-unit', gSpeed, 'words per minute');
  var gAcc = el('div', 'tw-g', readingsEl);
  el('div', 'tw-g-label', gAcc, 'Accuracy');
  var ringRow = el('div', 'tw-ringrow', gAcc);
  ringRow.insertAdjacentHTML('afterbegin', '<svg viewBox="0 0 64 64" aria-hidden="true"><circle class="tw-ring-bg" cx="32" cy="32" r="26"></circle><circle class="tw-ring-fg" cx="32" cy="32" r="26"></circle></svg>');
  var ring = ringRow.querySelector('.tw-ring-fg');
  var accVal = el('div', 'tw-g-big', ringRow, '100%');
  var gTime = el('div', 'tw-g tw-g-sm', readingsEl);
  el('div', 'tw-g-label', gTime, 'Time');
  var timeVal = el('div', 'tw-g-big', gTime, '0:00');
  var gErr = el('div', 'tw-g tw-g-sm', readingsEl);
  el('div', 'tw-g-label', gErr, 'Errors');
  var errVal = el('div', 'tw-g-big', gErr, '0');

  container.appendChild(rootEl);

  /* ---------- state ---------- */
  var text = '', W = {lines:[''], starts:[0, 0]}, cpl = 48, curLine = -1, lastIndex = -1, curIndex = 0, curWrong = false;
  var quietFeed = false, wetFlip = false, badFlip = false, dryTimer = 0, retTimer = 0, feedAnim = null;
  var nextCh = null, nextEls = [], deckW = 0;
  var downTimers = {}, wrongTimers = {};
  var typingTimer = 0, typing = false;
  var visible = true, paused = false;
  var RING_C = 2 * Math.PI * 26;
  var last = {wpm:-1, acc:-1, sec:-1, err:-1};

  function snd(name){ if(soundFn){ try{ soundFn(name); }catch(e){} } }

  /* ---------- measuring (never on the hot path) ---------- */
  function measure(){
    var avail = view.clientWidth, cw = probe.offsetWidth / 50; // layout sizes: not skewed by the sheet's 3D tilt
    if(!avail || !cw) return false;
    var n = Math.max(8, Math.floor(avail / cw - 0.02));
    if(n !== cpl){ cpl = n; return true; }
    return false;
  }
  function rewrap(){
    W = wrap(text, cpl);
    curLine = -1;
    place(curIndex, curWrong, false);
  }

  /* ---------- the sheet ---------- */
  function lineOf(i){
    var L = curLine < 0 ? 0 : curLine, st = W.starts, n = W.lines.length;
    while(L < n - 1 && i >= st[L + 1]) L++;
    while(L > 0 && i < st[L]) L--;
    return L;
  }
  function lineText(L){ return L >= 0 && L < W.lines.length ? disp(W.lines[L]) : ''; }
  function renderSlots(L){
    slots[0].textContent = lineText(L - 2);
    slots[1].textContent = lineText(L - 1);
    slots[3].textContent = lineText(L + 1);
    slots[4].textContent = lineText(L + 2);
  }
  function dryNow(){
    dryTimer = 0;
    if(!wetEl.firstChild || !wetEl.textContent) return;
    dryEl.textContent = dryEl.textContent + wetEl.textContent;
    wetEl.textContent = '';
  }
  function renderLive(col, fresh, wrong){
    var ln = lineText(curLine);
    if(fresh && col > 0){
      dryEl.textContent = ln.slice(0, col - 1);
      wetEl.textContent = ln.charAt(col - 1);
      wetFlip = !wetFlip;
      wetEl.className = wetFlip ? 'tw-w tw-wa' : 'tw-w tw-wb';
      if(dryTimer) clearTimeout(dryTimer);
      dryTimer = setTimeout(dryNow, 500);
    } else {
      dryEl.textContent = ln.slice(0, col);
      wetEl.textContent = '';
    }
    curEl.textContent = ln.charAt(col);
    restEl.textContent = ln.slice(col + 1);
    if(wrong){ badFlip = !badFlip; curEl.className = badFlip ? 'tw-c tw-bad tw-ba' : 'tw-c tw-bad tw-bb'; }
    else if(curEl.className !== 'tw-c') curEl.className = 'tw-c';
    var len = ln.length;
    marker.style.setProperty('--p', len ? (col / len).toFixed(4) : '0');
  }
  function feed(){
    if(!quietFeed) snd('ding');
    marker.classList.add('tw-ret');
    if(retTimer) clearTimeout(retTimer);
    retTimer = setTimeout(function(){ retTimer = 0; marker.classList.remove('tw-ret'); }, 320);
    if(fx === 'off' || paused || !linesEl.animate) return;
    if(feedAnim) feedAnim.cancel();
    feedAnim = linesEl.animate([{transform:'translateY(2.05em)'}, {transform:'translateY(0)'}],
      {duration:280, easing:'cubic-bezier(.3,.7,.2,1)'});
  }
  // index = characters typed correctly so far; the char at index is the live one
  function place(index, wrong, allowFeed){
    var n = text.length;
    if(index < 0) index = 0; else if(index > n) index = n;
    var L = lineOf(index), changed = L !== curLine, forward = curLine >= 0 && L === curLine + 1;
    if(changed){
      if(dryTimer){ clearTimeout(dryTimer); dryTimer = 0; }
      curLine = L; renderSlots(L);
    }
    var col = index - W.starts[L];
    renderLive(col, !changed && index === lastIndex + 1, wrong);
    if(changed && forward && allowFeed) feed();
    lastIndex = index; curIndex = index; curWrong = wrong;
    if(autoNext) setNext(index < n ? text.charAt(index) : '');
  }

  /* ---------- the guide ---------- */
  function drawReach(base){
    var c = keyFor(base), k = KEYS[c.base], h = KEYS[HOME[c.f]], Wd = deckW, u = Wd / 15;
    if(!k || !h || h === k || !Wd){ rPath.setAttribute('d', 'M0 0'); rHome.setAttribute('r', '0'); return; }
    var ax = h.cx * Wd, ay = h.cy * u, tx = k.cx * Wd, ty = k.cy * u;
    var bx = ax + (tx - ax) * 0.76, by = ay + (ty - ay) * 0.76, dx = bx - ax, dy = by - ay;
    rPath.setAttribute('d', 'M' + ax.toFixed(1) + ' ' + ay.toFixed(1) + ' Q' + ((ax + bx) / 2 - dy * 0.25).toFixed(1) + ' ' +
      ((ay + by) / 2 + dx * 0.25).toFixed(1) + ' ' + bx.toFixed(1) + ' ' + by.toFixed(1));
    rHome.setAttribute('cx', ax.toFixed(1)); rHome.setAttribute('cy', ay.toFixed(1)); rHome.setAttribute('r', (u * 0.2).toFixed(1));
  }
  function setNext(ch){
    ch = ch == null ? '' : String(ch).charAt(0);
    if(ch === nextCh) return;
    nextCh = ch;
    for(var i = 0; i < nextEls.length; i++) nextEls[i].classList.remove('tw-next');
    nextEls.length = 0;
    if(!ch){ capEl.style.visibility = 'hidden'; drawReach(''); return; }
    var c = keyFor(ch), k = KEYS[c.base];
    if(k){ k.el.classList.add('tw-next'); nextEls.push(k.el); }
    if(c.shift){ KEYS[c.shift].el.classList.add('tw-next'); nextEls.push(KEYS[c.shift].el); }
    capKey.textContent = c.label;
    capFin.textContent = c.finger ? ' \u00b7 ' + c.finger : '';
    capEl.style.visibility = '';
    drawReach(ch);
  }
  function flash(id, cls, ms, store){
    var k = KEYS[id];
    if(!k) return;
    if(store[id]) clearTimeout(store[id]);
    else k.el.classList.add(cls);
    store[id] = setTimeout(function(){ store[id] = 0; k.el.classList.remove(cls); }, ms);
  }
  function markTyping(){
    if(!typing){ typing = true; rootEl.classList.add('tw-typing'); }
    if(typingTimer) clearTimeout(typingTimer);
    typingTimer = setTimeout(function(){ typingTimer = 0; typing = false; rootEl.classList.remove('tw-typing'); }, 1500);
  }
  function pressKey(ch, correct, quiet){
    ch = ch == null ? '' : String(ch).charAt(0);
    if(!ch) return;
    var c = keyFor(ch);
    flash(c.base, 'tw-down', 110, downTimers);
    if(c.shift) flash(c.shift, 'tw-down', 110, downTimers);
    if(correct === false) flash(c.base, 'tw-wrong', 280, wrongTimers);
    if(!quiet){ snd(correct === false ? 'error' : 'key'); markTyping(); }
  }

  /* ---------- readings ---------- */
  function readings(r){
    if(!r) return;
    if(r.wpm != null){
      var v = Math.max(0, Math.min(999, Math.round(r.wpm) || 0));
      if(v !== last.wpm){
        last.wpm = v;
        var s3 = ('00' + v).slice(-3);
        for(var i = 0; i < 3; i++) wheels[i].style.transform = 'translateY(' + (-10 * Number(s3.charAt(i))) + '%)';
        speedSr.textContent = v + ' words per minute';
      }
    }
    if(r.accuracy != null){
      var a = Math.max(0, Math.min(100, Math.round(r.accuracy) || 0));
      if(a !== last.acc){ last.acc = a; accVal.textContent = a + '%'; ring.style.strokeDashoffset = (RING_C * (1 - a / 100)).toFixed(1); }
    }
    if(r.seconds != null){
      var sec = Math.max(0, Math.floor(r.seconds));
      if(sec !== last.sec){ last.sec = sec; var ss = sec % 60; timeVal.textContent = Math.floor(sec / 60) + ':' + (ss < 10 ? '0' : '') + ss; }
    }
    if(r.errors != null){
      var e = Math.max(0, r.errors | 0);
      if(e !== last.err){ last.err = e; errVal.textContent = String(e); }
    }
  }

  /* ---------- effects, skin, guide ---------- */
  function setEffects(level){
    fx = level === 'off' || level === 'light' ? level : 'full';
    rootEl.setAttribute('data-fx', fx);
    if(fx !== 'full'){ deck.style.removeProperty('--tx'); deck.style.removeProperty('--ty'); }
    if(isDemo) demoRefresh();
  }
  var rootObs = null;
  if(followRoot && window.MutationObserver){
    rootObs = new MutationObserver(function(){ var v = html.getAttribute('data-fx'); if(v && v !== fx) setEffects(v); });
    rootObs.observe(html, {attributes:true, attributeFilter:['data-fx']});
  }

  var tiltRaf = 0, tiltX = 0, tiltY = 0;
  function onPointerMove(e){
    if(fx !== 'full' || (e.pointerType && e.pointerType !== 'mouse')) return;
    var r = machine.getBoundingClientRect();
    tiltX = (e.clientX - r.left) / r.width - 0.5; tiltY = (e.clientY - r.top) / r.height - 0.5;
    if(!tiltRaf) tiltRaf = requestAnimationFrame(function(){
      tiltRaf = 0;
      deck.style.setProperty('--ty', (tiltX * 8).toFixed(2) + 'deg'); deck.style.setProperty('--tx', (-tiltY * 6).toFixed(2) + 'deg');
    });
  }
  function onPointerLeave(){ deck.style.setProperty('--ty', '0deg'); deck.style.setProperty('--tx', '0deg'); }
  machine.addEventListener('pointermove', onPointerMove);
  machine.addEventListener('pointerleave', onPointerLeave);

  /* ---------- pause when hidden or off screen ---------- */
  function updatePaused(){
    var p = !visible || doc.hidden;
    if(p === paused) return;
    paused = p;
    rootEl.classList.toggle('tw-paused', p);
    if(isDemo) demoRefresh();
  }
  var io = null;
  if(window.IntersectionObserver){
    io = new IntersectionObserver(function(ents){ visible = ents[ents.length - 1].isIntersecting; updatePaused(); });
    io.observe(rootEl);
  }
  doc.addEventListener('visibilitychange', updatePaused);

  /* ---------- resize: re-measure, re-wrap, redraw the reach line ---------- */
  var ro = null;
  function onResize(){
    if(destroyed) return;
    var dw = deck.clientWidth;
    if(measure()) rewrap();
    if(dw !== deckW){ deckW = dw; var c = nextCh; nextCh = null; setNext(c); }
  }
  if(window.ResizeObserver){ ro = new ResizeObserver(onResize); ro.observe(view); ro.observe(deck); }
  else window.addEventListener('resize', onResize);
  if(doc.fonts && doc.fonts.ready) doc.fonts.ready.then(onResize, function(){});

  /* ---------- public API ---------- */
  api.el = rootEl; api.machineEl = machine; api.readingsEl = readingsEl;
  api.setText = function(t){
    text = t == null ? '' : String(t);
    measure();
    W = wrap(text, cpl); curLine = -1; lastIndex = -1; curIndex = 0; curWrong = false; nextCh = null;
    if(feedAnim){ feedAnim.cancel(); feedAnim = null; }
    place(0, false, false);
  };
  api.setPosition = function(index, o){ place(index | 0, !!(o && o.wrong), true); };
  api.pressKey = function(ch, correct){ pressKey(ch, correct !== false, false); };
  api.setNext = setNext;
  api.readings = readings;
  api.setMeta = function(l, r){ metaL.textContent = l || ''; metaR.textContent = r || ''; };
  api.setHint = function(t){ hintEl.textContent = t || ''; };
  api.setSkin = function(name){ rootEl.setAttribute('data-skin', name || 'ink'); };
  api.setEffects = function(level){ followRoot = false; setEffects(level); };
  api.setGuide = function(on){ guide = !!on; rootEl.classList.toggle('tw-noguide', !guide); };
  api.destroy = function(){
    if(destroyed) return;
    destroyed = true;
    demoStop(); clearTimeout(demoIdle);
    [dryTimer, retTimer, typingTimer].forEach(clearTimeout);
    Object.keys(downTimers).forEach(function(k){ clearTimeout(downTimers[k]); });
    Object.keys(wrongTimers).forEach(function(k){ clearTimeout(wrongTimers[k]); });
    if(tiltRaf) cancelAnimationFrame(tiltRaf);
    if(ro) ro.disconnect(); else window.removeEventListener('resize', onResize);
    if(io) io.disconnect();
    if(rootObs) rootObs.disconnect();
    doc.removeEventListener('visibilitychange', updatePaused);
    doc.removeEventListener('keydown', onDemoKey);
    if(rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
    if(readingsEl.parentNode) readingsEl.parentNode.removeChild(readingsEl);
  };

  /* ---------- demo mode (home screen): types by itself until the visitor types ---------- */
  var demoTimer = 0, demoIdle = 0, demoUser = false, demoIdx = 0, strokes = 0, run = null;
  var demoText = DEMO_LINES.concat(DEMO_LINES).join(' ');
  var demoKeys = opts.demoKeys === 'focus' ? 'focus' : 'document';
  function demoReadings(){
    var mins = run.t0 ? (performance.now() - run.t0) / 60000 : 0, tot = run.ok + run.err;
    readings({wpm:run.ok > 5 && mins > 0.02 ? Math.min(199, run.ok / 5 / mins) : 0,
      accuracy:tot ? run.ok / tot * 100 : 100, seconds:mins * 60, errors:run.err});
  }
  function demoPress(ch, auto){
    var expected = text.charAt(demoIdx), ok = ch === expected;
    pressKey(ch, ok, auto);
    if(!run.t0) run.t0 = performance.now();
    if(ok){
      run.ok++; demoIdx++;
      if(demoIdx >= text.length){ demoIdx = 0; api.setText(demoText); demoReadings(); return; }
    } else run.err++;
    quietFeed = auto; place(demoIdx, !ok, true); quietFeed = false;
    demoReadings();
  }
  function demoStep(){
    if(demoUser) return;
    strokes++;
    var expected = text.charAt(demoIdx);
    if(strokes % 31 === 0 && NEIGHBOUR[expected]){ demoPress(NEIGHBOUR[expected], true); return; } // an occasional slip shows the error state
    demoPress(expected, true);
  }
  function demoStop(){ if(demoTimer){ clearInterval(demoTimer); demoTimer = 0; } }
  function demoRefresh(){
    if(!isDemo || destroyed) return;
    var canAuto = !demoUser && !paused && fx !== 'off';
    if(canAuto && !demoTimer) demoTimer = setInterval(demoStep, 210);
    else if(!canAuto) demoStop();
    if(!demoUser) api.setHint(fx === 'off' ? 'Click the machine and type the line.' :
      (demoKeys === 'focus' ? 'The demo is typing. Click the machine and press any letter to take over.' : 'The demo is typing. Press any letter to take over.'));
  }
  function demoResume(){
    demoIdle = 0; demoUser = false; run = {t0:0, ok:0, err:0};
    place(demoIdx, false, false); demoReadings(); demoRefresh();
  }
  function onDemoKey(e){
    if(e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if(demoKeys === 'focus' ? !machine.contains(doc.activeElement) : !visible) return;
    if(t && t.closest && t.closest('input,textarea,select,[contenteditable="true"]')) return;
    if((e.key === ' ' || e.key === 'Enter') && t && t !== machine && t.closest && t.closest('button,a,summary')) return;
    var ch = e.key;
    if(!ch || ch.length !== 1) return;
    if(!demoUser){
      if(ch === ' ') return;
      demoUser = true; demoStop(); run = {t0:0, ok:0, err:0};
      api.setHint('You are typing. The demo comes back after 10 quiet seconds.');
    }
    if(ch === ' ' || ch === "'" || ch === '/') e.preventDefault();
    if(ch.toLowerCase() === text.charAt(demoIdx)) ch = ch.toLowerCase(); // the demo line is lower case; caps lock is forgiven
    demoPress(ch, false);
    if(demoIdle) clearTimeout(demoIdle);
    demoIdle = setTimeout(demoResume, 10000);
  }

  /* ---------- start ---------- */
  api.setMeta(opts.meta && opts.meta.left, opts.meta && opts.meta.right);
  deckW = deck.clientWidth;
  if(isDemo){
    if(!opts.meta) api.setMeta('Demo · home row and beyond', 'Press any letter to type');
    api.setText(demoText);
    demoIdx = 16; run = {t0:performance.now() - 16 * 210, ok:16, err:0};
    place(demoIdx, false, false); demoReadings();
    doc.addEventListener('keydown', onDemoKey);
    demoRefresh();
  } else {
    api.setText(opts.text || '');
    readings({wpm:0, accuracy:100, seconds:0, errors:0});
  }
  return api;
}

window.TC_TYPEWRITER = {create:create, keyFor:keyFor, wrap:wrap};
})();
