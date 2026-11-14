/* Key Pop — balloons carry single letters upward; press the letter to pop it.
   Five escaped balloons end the game. Speed rises slowly. Built for beginners. */
(function(){
  'use strict';
  var G = window.TC_GAMES, U = G.util;

  var SCENE = '<svg class="tcg-scene" viewBox="0 0 240 120" aria-hidden="true">' +
    '<g class="bob"><path class="ln2" d="M62 62q-6 18 2 40"/><circle class="tl" cx="62" cy="42" r="20"/><text x="62" y="48" class="on big">f</text></g>' +
    '<g class="bob b2"><path class="ln2" d="M122 54q6 20-2 46"/><circle class="br" cx="122" cy="34" r="20"/><text x="122" y="40" class="on big">j</text></g>' +
    '<g class="bob b3"><path class="ln2" d="M184 70q-5 14 1 34"/><circle class="rd" cx="184" cy="50" r="20"/><text x="184" y="56" class="on big">k</text></g></svg>';

  function mount(el, ctx){
    var sh = U.shell(el, {
      id: 'pop', title: 'Key Pop', accent: 'teal', ctx: ctx,
      blurb: 'Letters float up in balloons. Pop each one before it flies away.',
      how: [
        'Press the letter on a balloon to pop it.',
        'If two balloons share a letter, the higher one pops first.',
        'Five balloons may escape. The fifth ends the game.',
        'Balloons rise a little faster as you go.'
      ],
      onStart: start
    });
    var fx = sh.fx, scr = U.canvas(sh.stage, 0.6, 300, 470), c = scr.c, pal = U.palette(sh.root);
    var parts = U.particles(fx), chars = U.chars(ctx), S = null, loop = U.loop(step);

    function start(){
      pal = U.palette(sh.root); parts.clear();
      S = { b: [], pops: 0, esc: 0, spawnT: 0.4, gap: 1.7, speed: 34, tally: U.tally(), over: false, flash: 0, lastX: -1 };
      loop.reset(); loop.start(); hud();
    }
    function hud(){
      sh.setHud('<span class="tcg-chip">Popped <b>' + S.pops + '</b></span><span class="tcg-chip r">Escaped <b>' + S.esc + '</b> of 5</span>');
    }
    function spawn(){
      var cols = [pal.teal, pal.violet, pal.brass, pal.red], r = U.clamp(scr.w / 22, 20, 28);
      var slots = Math.max(3, Math.floor((scr.w - 20) / (r * 2.6))), slot;
      do { slot = U.randInt(0, slots - 1); } while(slot === S.lastX && slots > 1);
      S.lastX = slot;
      var x = 10 + r * 1.3 + slot * ((scr.w - 20 - r * 2.6) / Math.max(1, slots - 1));
      var on = S.b.map(function(b){ return b.ch; }), ch, tries = 0;
      do { ch = U.pick(chars); tries++; } while(on.indexOf(ch) >= 0 && tries < 6);
      S.b.push({ ch: ch, x: x, y: scr.h + r + 4, r: r, vy: S.speed * U.rand(0.85, 1.15), col: U.pick(cols), sway: Math.random() * 6.28 });
    }
    function onKey(e){
      if(sh.key(e)) return false;
      if(!S || S.over || e.key.length !== 1 || e.key === ' ') return;
      var now = loop.now(), hit = null;
      S.b.forEach(function(b){ if(b.ch === e.key && (!hit || b.y < hit.y)) hit = b; });
      if(hit){
        S.tally.hit(true, now); S.b.splice(S.b.indexOf(hit), 1); S.pops++;
        parts.burst(hit.x, hit.y, hit.col, 22, 170); U.sound(ctx, 'pop');
        S.speed = Math.min(120, S.speed * 1.012); S.gap = Math.max(0.55, S.gap * 0.988);
      } else {
        S.tally.hit(false, now); U.sound(ctx, 'error'); U.shake(scr.cv, fx);
      }
      hud();
    }
    var offKeys = U.keys(onKey);
    function step(dt){
      if(S && !S.over){
        S.spawnT -= dt;
        if(S.spawnT <= 0){ spawn(); S.spawnT = S.gap * U.rand(0.8, 1.2); }
        if(S.flash > 0) S.flash -= dt;
        for(var i = S.b.length - 1; i >= 0; i--){
          var b = S.b[i]; b.y -= b.vy * dt; b.sway += dt;
          if(b.y < -b.r - 10){ S.b.splice(i, 1); S.esc++; S.flash = 0.3; U.sound(ctx, 'error'); hud(); }
        }
        if(S.esc >= 5){ S.over = true; finish(); }
      }
      parts.step(dt); draw();
    }
    function draw(){
      var w = scr.w, h = scr.h; c.clearRect(0, 0, w, h);
      if(!S) return;
      if(S.flash > 0){ c.fillStyle = pal.red; c.globalAlpha = S.flash * 0.4; c.fillRect(0, 0, w, 6); c.globalAlpha = 1; }
      S.b.forEach(function(b){
        var sx = fx === 'full' ? Math.sin(b.sway * 1.6) * 4 : 0, x = b.x + sx, y = b.y;
        c.strokeStyle = pal.line; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x, y + b.r);
        c.quadraticCurveTo(x - sx * 2 - 6, y + b.r * 1.8, x, y + b.r * 2.6); c.stroke();
        if(fx === 'full'){ c.shadowColor = b.col; c.shadowBlur = 14; }
        c.fillStyle = b.col; c.beginPath(); c.ellipse(x, y, b.r, b.r * 1.12, 0, 0, 6.283); c.fill(); c.shadowBlur = 0;
        c.beginPath(); c.moveTo(x - 4, y + b.r * 1.12); c.lineTo(x + 4, y + b.r * 1.12); c.lineTo(x, y + b.r * 1.12 + 6); c.closePath(); c.fill();
        c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(x - b.r * 0.38, y - b.r * 0.45, b.r * 0.22, b.r * 0.32, -0.5, 0, 6.283); c.fill();
        c.fillStyle = pal.tealInk; c.font = '700 ' + Math.round(b.r * 1.05) + 'px ' + pal.mono; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(b.ch, x, y + 1);
      });
      parts.draw(c);
    }
    function finish(){
      var ms = loop.now() - (S.tally.start || 0), acc = S.tally.accuracy(), kpm = ms > 1000 ? Math.round(S.pops / (ms / 60000)) : 0;
      var xp = S.pops / 2;
      U.sound(ctx, 'lose');
      setTimeout(function(){
        if(!S) return;
        loop.stop();
        var isBest = sh.showEnd({ title: 'Five got away', score: S.pops, scoreLabel: 'Balloons popped', xp: xp,
          rows: [['Accuracy', acc + '%'], ['Keys a minute', kpm], ['Time', Math.round(ms / 1000) + ' s']] });
        sh.end(U.result(S.pops, isBest, xp, { wpm: Math.round(kpm / 5), accuracy: acc, popped: S.pops, keysPerMinute: kpm, seconds: Math.round(ms / 1000) }, []));
      }, fx === 'off' ? 0 : 600);
    }
    sh.showStart();
    return { destroy: function(){ offKeys(); loop.destroy(); scr.destroy(); S = null; sh.destroy(); } };
  }

  G.register({ id: 'pop', title: 'Key Pop', accent: 'teal', trains: 'finding keys',
    blurb: 'Letters float up in balloons. Pop each one with the right finger. Playable from the first lesson.', scene: SCENE, mount: mount });
})();
