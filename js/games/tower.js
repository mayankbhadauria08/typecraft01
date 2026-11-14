/* Word Tower — sixty seconds. Each correct word stacks a block on a 3D CSS
   tower; a mistake makes it wobble and knocks the top block off. Height is the score. */
(function(){
  'use strict';
  var G = window.TC_GAMES, U = G.util;
  var SECONDS = 60, BH = 28;

  var SCENE = '<svg class="tcg-scene" viewBox="0 0 240 120" aria-hidden="true">' +
    '<path class="ln2" d="M40 108h160"/><rect class="pl" x="84" y="88" width="72" height="20" rx="4"/><text x="120" y="102">with</text>' +
    '<rect class="pl" x="90" y="68" width="68" height="20" rx="4"/><text x="124" y="82">from</text>' +
    '<rect class="pl" x="80" y="48" width="70" height="20" rx="4"/><text x="115" y="62">have</text>' +
    '<g class="wob"><rect class="tl" x="92" y="28" width="66" height="20" rx="4"/><text x="125" y="42" class="on">they</text></g>' +
    '<text x="204" y="42" class="lbl">4 high</text></svg>';

  function mount(el, ctx){
    var sh = U.shell(el, {
      id: 'tower', title: 'Word Tower', accent: 'brass', ctx: ctx,
      blurb: 'Stack a block for every word you type correctly. You have sixty seconds.',
      how: [
        'Type the word shown. When it is done, a block lands on the tower.',
        'A wrong key shakes the tower and knocks off the top block.',
        'The clock starts with your first key. Height is your score.'
      ],
      onStart: start
    });
    var fx = sh.fx, words = U.words(ctx), next = U.picker(words), S = null, loop = U.loop(step);
    var wrap = U.h('div', 'tower-wrap');
    wrap.innerHTML =
      '<div class="tower-side">' +
        '<div class="tower-time"><span>Time</span><b class="tower-secs">60</b><i class="tower-bar"><i></i></i></div>' +
        '<div class="tower-word" aria-live="off"></div><div class="tower-next"></div>' +
        '<div class="tower-h"><span>Height</span><b class="tower-hn">0</b></div>' +
      '</div>' +
      '<div class="tower-scene"><div class="tower-cam"><div class="tower-world"><div class="tower-ground"></div><div class="tower-stack"></div></div></div></div>';
    sh.stage.appendChild(wrap);
    var stack = wrap.querySelector('.tower-stack'), cam = wrap.querySelector('.tower-cam'), wordEl = wrap.querySelector('.tower-word');
    var nextEl = wrap.querySelector('.tower-next'), secsEl = wrap.querySelector('.tower-secs'), barEl = wrap.querySelector('.tower-bar i'), hEl = wrap.querySelector('.tower-hn');
    var world = wrap.querySelector('.tower-world');

    function start(){
      stack.innerHTML = '';
      S = { blocks: [], word: next(), nextWord: next(), i: 0, left: SECONDS, started: false, over: false, tally: U.tally(), words: 0, peak: 0, drops: 0, lastSec: -1 };
      renderWord(); setHeight(); timer();
      loop.reset(); loop.start(); hud();
    }
    function hud(){ sh.setHud('<span class="tcg-chip">Height <b>' + S.blocks.length + '</b></span><span class="tcg-chip b">Best tower <b>' + S.peak + '</b></span>'); }
    function renderWord(bad){
      var w = S.word, h = '';
      for(var k = 0; k < w.length; k++){
        h += '<span class="' + (k < S.i ? 'ok' : k === S.i ? 'cur' + (bad ? ' bad' : '') : '') + '">' + U.esc(w[k]) + '</span>';
      }
      wordEl.innerHTML = h;
      nextEl.textContent = 'next: ' + S.nextWord;
    }
    function setHeight(){
      var n = S.blocks.length; hEl.textContent = n;
      var lift = Math.max(0, n - 6) * BH;
      cam.style.transform = 'translateY(' + lift + 'px)';
    }
    function timer(){
      var s = Math.ceil(S.left);
      if(s !== S.lastSec){ S.lastSec = s; secsEl.textContent = s; }
      barEl.style.transform = 'scaleX(' + (S.left / SECONDS).toFixed(3) + ')';
    }
    function addBlock(word){
      var n = S.blocks.length, b = U.h('div', 'tw-block');
      var wpx = U.clamp(70 + word.length * 9, 84, 170), dx = U.randInt(-10, 10);
      b.style.setProperty('--w', wpx + 'px'); b.style.setProperty('--y', (n * BH) + 'px'); b.style.setProperty('--dx', dx + 'px');
      b.setAttribute('data-c', String(n % 4));
      b.innerHTML = '<i class="f">' + U.esc(word) + '</i><i class="t"></i><i class="s"></i>';
      if(fx !== 'off') b.classList.add('drop');
      stack.appendChild(b); S.blocks.push(b);
      S.peak = Math.max(S.peak, S.blocks.length);
      setHeight(); hud();
    }
    function knock(){
      U.pulse(world, 'wobble');
      var b = S.blocks.pop();
      if(b){
        S.drops++;
        if(fx === 'off') b.parentNode.removeChild(b);
        else { b.classList.add('fall'); setTimeout(function(){ if(b.parentNode) b.parentNode.removeChild(b); }, 600); }
      }
      setHeight(); hud();
    }
    function onKey(e){
      if(sh.key(e)) return false;
      if(!S || S.over || e.key.length !== 1) return;
      if(e.key === ' ' && S.i === 0) return; /* a habit space between words is harmless */
      var now = loop.now();
      if(!S.started) S.started = true;
      if(e.key === S.word[S.i]){
        S.tally.hit(true, now); S.i++; U.sound(ctx, 'key');
        if(S.i >= S.word.length){
          addBlock(S.word); S.words++; U.sound(ctx, 'ding');
          S.word = S.nextWord; S.nextWord = next(); S.i = 0;
        }
        renderWord();
      } else {
        S.tally.hit(false, now); U.sound(ctx, 'error'); knock(); renderWord(true);
      }
    }
    var offKeys = U.keys(onKey);
    function step(dt){
      if(!S || S.over || !S.started) return;
      S.left -= dt;
      if(S.left <= 0){ S.left = 0; timer(); S.over = true; finish(); return; }
      timer();
    }
    function finish(){
      loop.stop();
      var height = S.blocks.length, acc = S.tally.accuracy(), wpm = S.tally.wpm(SECONDS * 1000);
      var badges = height >= 25 ? ['tower_25'] : [];
      var xp = height * 2;
      U.sound(ctx, height > 0 ? 'win' : 'lose');
      var isBest = sh.showEnd({ title: 'Time! The tower stands ' + height + ' high', score: height, scoreLabel: 'Height', xp: xp, badgeNames: U.badgeNames(badges),
        rows: [['Words', S.words], ['Blocks lost', S.drops], ['Speed', wpm + ' wpm'], ['Accuracy', acc + '%']] });
      sh.end(U.result(height, isBest, xp, { wpm: wpm, accuracy: acc, height: height, words: S.words, dropped: S.drops, peak: S.peak, seconds: SECONDS }, badges));
    }
    sh.showStart();
    return { destroy: function(){ offKeys(); loop.destroy(); S = null; sh.destroy(); } };
  }

  G.register({ id: 'tower', title: 'Word Tower', accent: 'brass', trains: 'accuracy under pressure',
    blurb: 'Each correct word stacks a block. A mistake shakes the tower. Build as high as you can in 60 seconds.', scene: SCENE, mount: mount });
})();
