/* Safe Cracker — type codes of digits and symbols the learner knows. Each
   correct code turns the dial; three codes open a safe; the time per safe
   shrinks. Letters-only easy mode when the number row is not learned yet. */
(function(){
  'use strict';
  var G = window.TC_GAMES, U = G.util;
  var CODES = 3;

  var SCENE = '<svg class="tcg-scene" viewBox="0 0 240 120" aria-hidden="true">' +
    '<circle class="pl" cx="78" cy="60" r="42"/><circle class="ticks" cx="78" cy="60" r="34"/><path class="needle" d="M78 60V30"/>' +
    '<circle class="br" cx="78" cy="60" r="9"/><rect class="pl" x="142" y="42" width="82" height="36" rx="8"/>' +
    '<text x="183" y="65" class="code">74 # 2_</text></svg>';

  function mount(el, ctx){
    var chars = U.chars(ctx);
    var digits = chars.filter(function(c){ return /[0-9]/.test(c); });
    if(ctx.digits && !digits.length) digits = '0123456789'.split('');
    var hasDigits = !!ctx.digits && digits.length > 0;
    var symbols = String(ctx.symbols || '').split('').filter(function(c){ return c.trim() && !/[a-zA-Z0-9]/.test(c); });
    var letters = U.letters(ctx);
    var opts = hasDigits
      ? [{ key: 'mode', label: 'Codes', value: 'num', values: [['num', symbols.length ? 'Numbers and symbols' : 'Numbers'], ['abc', 'Letters (easy)']] }]
      : [{ key: 'mode', label: 'Codes', value: 'abc', values: [['abc', 'Letters (easy)']] }];
    var sh = U.shell(el, {
      id: 'safe', title: 'Safe Cracker', accent: 'red', ctx: ctx,
      blurb: 'Type each code to turn the dial. Three codes open the safe, before the alarm.',
      how: [
        'Type the code shown on the display. Each correct code turns the dial.',
        'Three codes open a safe. The next safe gives you a little less time.',
        'A wrong key costs one second. When the clock runs out the alarm ends the run.',
        hasDigits ? 'Choose letters for an easier warm-up.' : 'You have not reached the number row yet, so the codes use letters you know.'
      ],
      options: opts,
      onStart: start
    });
    var fx = sh.fx, S = null, loop = U.loop(step);
    var ticks = '', labels = '';
    for(var k = 0; k < 10; k++){
      var a = k * 36 * Math.PI / 180, x = 100 + Math.sin(a) * 62, y = 100 - Math.cos(a) * 62;
      labels += '<text x="' + x.toFixed(1) + '" y="' + (y + 4).toFixed(1) + '">' + (k * 10) + '</text>';
    }
    var wrap = U.h('div', 'safe-wrap');
    wrap.innerHTML =
      '<div class="safe-box">' +
        '<div class="safe-door">' +
          '<svg class="safe-dial" viewBox="0 0 200 200" aria-hidden="true">' +
            '<circle class="ring" cx="100" cy="100" r="92"/><path class="mark" d="M100 2v14"/>' +
            '<g class="safe-rot"><circle class="face" cx="100" cy="100" r="80"/><circle class="ticks" cx="100" cy="100" r="74"/>' + labels +
            '<circle class="knob" cx="100" cy="100" r="26"/><path class="grip" d="M100 78v12"/></g>' +
          '</svg>' +
          '<div class="safe-lights"><i></i><i></i><i></i></div>' +
        '</div>' +
        '<div class="safe-inside" aria-hidden="true"></div>' +
      '</div>' +
      '<div class="safe-panel">' +
        '<p class="safe-label">Code <span class="safe-n">1</span> of 3 &middot; Safe <span class="safe-s">1</span></p>' +
        '<div class="safe-code" aria-live="off"></div>' +
        '<div class="safe-time"><i class="safe-bar"><i></i></i><b class="safe-secs">0</b></div>' +
      '</div>';
    sh.stage.appendChild(wrap);
    var rot = wrap.querySelector('.safe-rot'), lights = wrap.querySelectorAll('.safe-lights i'), codeEl = wrap.querySelector('.safe-code');
    var barEl = wrap.querySelector('.safe-bar i'), secsEl = wrap.querySelector('.safe-secs'), box = wrap.querySelector('.safe-box');
    var nEl = wrap.querySelector('.safe-n'), sEl = wrap.querySelector('.safe-s'), panel = wrap.querySelector('.safe-panel');

    function makeCode(){
      var len = Math.min(7, 3 + Math.floor(S.safes / 2)), out = '';
      for(var i = 0; i < len; i++){
        if(S.mode === 'abc') out += U.pick(letters);
        else if(symbols.length && i > 0 && Math.random() < 0.28) out += U.pick(symbols);
        else out += U.pick(digits);
      }
      return out;
    }
    function start(ch){
      S = { mode: hasDigits ? (ch.mode || 'num') : 'abc', safes: 0, codeN: 0, code: '', i: 0, limit: 0, left: 0, pause: 0, angle: 0, score: 0,
        tally: U.tally(), over: false, codesDone: 0, lastSec: -1 };
      newSafe(true);
      loop.reset(); loop.start();
    }
    function newSafe(first){
      S.codeN = 0; S.limit = Math.max(8, 24 - S.safes * 1.6); S.left = S.limit; S.pause = first ? 0.6 : 1.3;
      box.classList.remove('open');
      lights.forEach(function(l){ l.classList.remove('on'); });
      S.code = makeCode(); S.i = 0; render(); timer(); hud();
      sEl.textContent = S.safes + 1;
    }
    function hud(){ sh.setHud('<span class="tcg-chip">Score <b>' + S.score + '</b></span><span class="tcg-chip r">Safes <b>' + S.safes + '</b></span>'); }
    function render(bad){
      var h = '';
      for(var k = 0; k < S.code.length; k++) h += '<span class="' + (k < S.i ? 'ok' : k === S.i ? 'cur' + (bad ? ' bad' : '') : '') + '">' + U.esc(S.code[k]) + '</span>';
      codeEl.innerHTML = h; nEl.textContent = S.codeN + 1;
    }
    function timer(){
      var s = Math.ceil(S.left);
      if(s !== S.lastSec){ S.lastSec = s; secsEl.textContent = s + ' s'; }
      barEl.style.transform = 'scaleX(' + U.clamp(S.left / S.limit, 0, 1).toFixed(3) + ')';
      panel.classList.toggle('low', S.left < 4);
    }
    function turn(deg){ S.angle += deg; rot.style.transform = 'rotate(' + S.angle + 'deg)'; }
    function onKey(e){
      if(sh.key(e)) return false;
      if(!S || S.over || S.pause > 0 || e.key.length !== 1 || e.key === ' ') return;
      var now = loop.now();
      if(e.key === S.code[S.i]){
        S.tally.hit(true, now); S.i++; U.sound(ctx, 'key'); turn(S.codeN % 2 ? -6 : 6);
        if(S.i >= S.code.length){
          lights[S.codeN].classList.add('on'); S.codeN++; S.codesDone++;
          turn(S.codeN % 2 ? 120 : -120); U.sound(ctx, 'ding');
          if(S.codeN >= CODES){ open(); return; }
          S.code = makeCode(); S.i = 0;
        }
        render();
      } else {
        S.tally.hit(false, now); U.sound(ctx, 'error'); S.left = Math.max(0.01, S.left - 1); render(true); U.shake(panel, fx); timer();
      }
    }
    var offKeys = U.keys(onKey);
    function open(){
      S.safes++; S.score += 100 + Math.floor(S.left) * 5;
      box.classList.add('open'); U.sound(ctx, 'win'); hud();
      sh.banner('Safe ' + S.safes + ' open', '+' + (100 + Math.floor(S.left) * 5));
      S.pause = 99; /* hold until newSafe sets the next pause */
      S.wait = 1.1;
    }
    function step(dt){
      if(!S || S.over) return;
      if(S.wait > 0){ S.wait -= dt; if(S.wait <= 0){ S.wait = 0; newSafe(false); } return; }
      if(S.pause > 0){ S.pause -= dt; return; }
      S.left -= dt;
      if(S.left <= 0){ S.left = 0; timer(); alarm(); return; }
      timer();
    }
    function alarm(){
      S.over = true; loop.stop();
      U.pulse(box, 'alarm'); U.sound(ctx, 'lose');
      var acc = S.tally.accuracy(), wpm = S.tally.wpm(loop.now() - (S.tally.start || 0)), badges = S.safes >= 10 ? ['safe_10'] : [], xp = S.safes * 6 + S.codesDone;
      setTimeout(function(){
        if(!S) return;
        var isBest = sh.showEnd({ title: S.safes ? 'The alarm went off after ' + S.safes + (S.safes === 1 ? ' safe' : ' safes') : 'The alarm went off', score: S.score, xp: xp,
          badgeNames: U.badgeNames(badges), rows: [['Safes', S.safes], ['Codes', S.codesDone], ['Accuracy', acc + '%'], ['Mode', S.mode === 'abc' ? 'Letters' : 'Numbers']] });
        sh.end(U.result(S.score, isBest, xp, { accuracy: acc, wpm: wpm, safes: S.safes, codes: S.codesDone, mode: S.mode }, badges));
      }, fx === 'off' ? 0 : 700);
    }
    sh.showStart();
    return { destroy: function(){ offKeys(); loop.destroy(); S = null; sh.destroy(); } };
  }

  G.register({ id: 'safe', title: 'Safe Cracker', accent: 'red', trains: 'numbers and symbols',
    blurb: 'Type number and symbol codes to turn the dial before the alarm goes off.', scene: SCENE, mount: mount });
})();
