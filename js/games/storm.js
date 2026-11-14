/* Word Storm — falling words (today's Space Invaders, rebuilt).
   Waves speed up every 10 words, gold power-up words (freeze / clear), combo
   multiplier, boss words that take several hits, starfield with depth, 3 lives. */
(function(){
  'use strict';
  var G = window.TC_GAMES, U = G.util;

  var SCENE = '<svg class="tcg-scene" viewBox="0 0 240 120" aria-hidden="true">' +
    '<g class="st"><circle cx="18" cy="16" r="1.3"/><circle cx="64" cy="74" r="1"/><circle cx="102" cy="26" r="1.4"/><circle cx="208" cy="88" r="1.2"/><circle cx="226" cy="44" r="1"/><circle cx="30" cy="98" r="1.1"/><circle cx="172" cy="102" r="1"/></g>' +
    '<g class="drift"><rect class="pl" x="26" y="18" width="56" height="20" rx="10"/><text x="54" y="32">glass</text></g>' +
    '<g class="drift d2"><rect class="pl boss" x="140" y="10" width="78" height="22" rx="11"/><text x="179" y="25">shadow</text></g>' +
    '<g class="drift d3"><rect class="pl" x="112" y="50" width="48" height="20" rx="10"/><text x="136" y="64"><tspan class="hit">di</tspan>al</text></g>' +
    '<path class="ts" d="M121 92l12-18" stroke-dasharray="3 4"/><path class="tl" d="M110 110l10-18 10 18z"/></svg>';

  function mount(el, ctx){
    var sh = U.shell(el, {
      id: 'storm', title: 'Word Storm', accent: 'teal', ctx: ctx,
      blurb: 'Words fall from the sky. Type one to blast it before it lands.',
      how: [
        'Start typing any falling word; the turret locks onto it.',
        'Long words with a brass ring are bosses: type them several times.',
        'Gold words are power-ups: <b>freeze</b> slows the storm for 5 s, <b>clear</b> empties the sky.',
        'Clear words without a wrong key to raise your combo multiplier.',
        'Three words may land. The fourth ends the run. Every 10 words a faster wave begins.'
      ],
      onStart: start
    });
    var fx = sh.fx, scr = U.canvas(sh.stage, 0.56, 280, 480), c = scr.c;
    var pal = U.palette(sh.root), parts = U.particles(fx);
    var all = U.words(ctx);
    var shortW = U.byLen(all, 1, 5), longW = U.byLen(all, 7, 30);
    if(!shortW.length) shortW = all.slice();
    if(!longW.length){ longW = all.slice().sort(function(a, b){ return b.length - a.length; }).slice(0, Math.max(1, Math.ceil(all.length / 5))); }
    var pickShort = U.picker(shortW), pickLong = U.picker(longW);
    var S = null, stars = [], loop = U.loop(step);

    function makeStars(){
      stars = [];
      var n = fx === 'off' ? 40 : 90;
      for(var i = 0; i < n; i++) stars.push({ x: Math.random(), y: Math.random(), z: 0.2 + Math.random() * 0.8 });
    }
    makeStars();

    function start(){
      pal = U.palette(sh.root); parts.clear();
      S = { ships: [], score: 0, lives: 3, buffer: '', target: null, spawnT: 0.6, gap: 1.9, wave: 1, waveKills: 0,
        speed: 1, combo: 0, bestCombo: 0, kills: 0, freeze: 0, flash: 0, banner: 1.6, tally: U.tally(), laser: 0, laserTo: null, over: false };
      loop.reset(); loop.start(); hud();
    }
    function mult(){ return Math.min(5, 1 + Math.floor(S.combo / 5)); }
    function hud(){
      sh.setHud('<span class="tcg-chip">Score <b>' + S.score + '</b></span><span class="tcg-chip">Wave <b>' + S.wave + '</b></span>' +
        '<span class="tcg-chip v">Combo <b>x' + mult() + '</b></span><span class="tcg-chip r" aria-label="' + S.lives + ' lives">' +
        '<span class="tcg-hearts">' + '<i></i>'.repeat(Math.max(0, S.lives)) + '<i class="lost"></i>'.repeat(Math.max(0, 3 - S.lives)) + '</span></span>');
    }
    function measure(w){ c.font = '600 15px ' + pal.mono; return c.measureText(w).width; }
    function spawn(){
      var boss = S.wave >= 2 && Math.random() < 0.14 + Math.min(0.1, S.wave * 0.01);
      var word = boss ? pickLong() : pickShort();
      if(!word) return;
      /* avoid two words with the same first letter on screen when possible */
      for(var t = 0; t < 4 && S.ships.some(function(s){ return s.word[0] === word[0]; }); t++) word = boss ? pickLong() : pickShort();
      var gold = !boss && S.kills > 3 && Math.random() < 0.07 ? (Math.random() < 0.5 ? 'freeze' : 'clear') : null;
      var wpx = measure(word) + 24, x = U.rand(wpx / 2 + 8, scr.w - wpx / 2 - 8);
      var base = (boss ? 18 : 30) + Math.min(36, word.length * 0.6);
      S.ships.push({ word: word, x: x, y: -20, vy: base * S.speed, boss: boss, hp: boss ? (word.length >= 10 ? 3 : 2) : 1,
        maxHp: boss ? (word.length >= 10 ? 3 : 2) : 1, gold: gold, flash: 0, wpx: wpx, drift: Math.random() * 6.28 });
    }
    function kill(s, viaClear){
      S.ships.splice(S.ships.indexOf(s), 1);
      var pts = s.word.length * 10 * mult() + (s.boss ? 50 * mult() : 0);
      S.score += pts; S.kills++; S.waveKills++;
      parts.burst(s.x, s.y, s.boss ? pal.brass : s.gold ? pal.brass : pal.teal, s.boss ? 34 : 18, s.boss ? 220 : 160);
      if(!viaClear){
        if(s.gold === 'freeze'){ S.freeze = 5; U.sound(ctx, 'ding'); }
        else if(s.gold === 'clear'){ U.sound(ctx, 'ding'); S.flash = 0.35; S.ships.slice().forEach(function(o){ kill(o, true); }); }
        else U.sound(ctx, 'pop');
      }
      if(S.waveKills >= 10){
        S.waveKills = 0; S.wave++; S.speed *= 1.12; S.gap = Math.max(0.65, S.gap * 0.88); S.banner = 1.6;
        S.ships.forEach(function(o){ o.vy *= 1.12; });
      }
    }
    function onKey(e){
      if(sh.key(e)) return false;
      if(!S || S.over) return false;
      if(e.key === 'Escape'){ S.buffer = ''; S.target = null; return; }
      if(e.key === 'Backspace'){ return; }
      if(e.key.length !== 1 || e.key === ' ') return;
      var ch = e.key, cand = S.buffer + ch, now = loop.now(), tgt = null;
      if(S.target && S.ships.indexOf(S.target) >= 0 && S.target.word.indexOf(cand) === 0) tgt = S.target;
      else {
        var best = null;
        S.ships.forEach(function(s){ if(s.word.indexOf(cand) === 0 && (!best || s.y > best.y)) best = s; });
        tgt = best;
      }
      if(tgt){
        S.tally.hit(true, now); S.buffer = cand; S.target = tgt; S.laser = 0.12; S.laserTo = tgt;
        U.sound(ctx, 'key');
        if(S.buffer === tgt.word){
          tgt.hp--; tgt.flash = 0.15; S.buffer = ''; S.target = null;
          if(tgt.hp <= 0){ S.combo++; S.bestCombo = Math.max(S.bestCombo, S.combo); kill(tgt); }
          else parts.burst(tgt.x, tgt.y, pal.brass, 10, 120);
        }
      } else {
        S.tally.hit(false, now); S.combo = 0; S.buffer = ''; S.target = null;
        U.sound(ctx, 'error'); U.shake(scr.cv, fx);
      }
      hud();
    }
    var offKeys = U.keys(onKey);

    function step(dt){
      if(S && !S.over){
        var slow = S.freeze > 0 ? 0.35 : 1;
        if(S.freeze > 0) S.freeze -= dt;
        if(S.banner > 0) S.banner -= dt;
        if(S.flash > 0) S.flash -= dt;
        if(S.laser > 0) S.laser -= dt;
        S.spawnT -= dt * slow;
        if(S.spawnT <= 0){ spawn(); S.spawnT = S.gap * U.rand(0.8, 1.2); }
        var floor = scr.h - 34, lost = false;
        for(var i = S.ships.length - 1; i >= 0; i--){
          var s = S.ships[i]; s.y += s.vy * dt * slow; if(s.flash > 0) s.flash -= dt;
          if(fx === 'full') s.drift += dt;
          if(s.y >= floor){
            S.ships.splice(i, 1); S.lives--; lost = true;
            if(S.target === s){ S.target = null; S.buffer = ''; }
            parts.burst(s.x, floor, pal.red, 22, 180);
          }
        }
        if(lost){ S.combo = 0; U.sound(ctx, 'error'); U.shake(scr.cv, fx); hud(); }
        if(S.lives <= 0){ finish(); }
      }
      parts.step(dt);
      draw(dt);
    }
    function draw(dt){
      var w = scr.w, h = scr.h;
      c.clearRect(0, 0, w, h);
      /* starfield with depth: near stars are larger, brighter and faster */
      var moving = fx !== 'off', sp = S ? S.speed * (S.freeze > 0 ? 0.35 : 1) : 0.4;
      c.fillStyle = pal.text;
      for(var i = 0; i < stars.length; i++){
        var st = stars[i];
        if(moving){ st.y += dt * st.z * st.z * 0.12 * sp; if(st.y > 1){ st.y -= 1; st.x = Math.random(); } }
        c.globalAlpha = 0.15 + st.z * 0.55;
        var r = st.z * 1.6;
        c.fillRect(st.x * w, st.y * h, r, r * (moving && fx === 'full' ? 1 + st.z * 2.5 : 1));
      }
      c.globalAlpha = 1;
      if(!S){ return; }
      if(S.freeze > 0){ c.fillStyle = pal.violet; c.globalAlpha = 0.08 + 0.04 * Math.sin(S.freeze * 6); c.fillRect(0, 0, w, h); c.globalAlpha = 1; }
      if(S.flash > 0){ c.fillStyle = pal.brass; c.globalAlpha = S.flash; c.fillRect(0, 0, w, h); c.globalAlpha = 1; }
      /* ground line */
      c.strokeStyle = pal.red; c.globalAlpha = 0.35; c.setLineDash([4, 6]); c.beginPath(); c.moveTo(0, h - 34); c.lineTo(w, h - 34); c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
      /* turret */
      var tx = w / 2, ty = h - 10;
      c.fillStyle = pal.teal; c.beginPath(); c.moveTo(tx - 12, ty); c.lineTo(tx, ty - 20); c.lineTo(tx + 12, ty); c.closePath(); c.fill();
      if(S.laser > 0 && S.laserTo){
        c.strokeStyle = pal.teal; c.lineWidth = 2; c.globalAlpha = S.laser / 0.12;
        c.beginPath(); c.moveTo(tx, ty - 20); c.lineTo(S.laserTo.x, S.laserTo.y + 12); c.stroke(); c.globalAlpha = 1; c.lineWidth = 1;
      }
      c.font = '600 15px ' + pal.mono; c.textBaseline = 'middle';
      S.ships.forEach(function(s){
        var bw = s.wpx, bh = 26, x = s.x + (fx === 'full' ? Math.sin(s.drift * 1.3) * 3 : 0), y = s.y;
        var locked = S.target === s;
        c.fillStyle = s.flash > 0 ? pal.text : pal.surface;
        c.globalAlpha = 0.92; U.roundRect(c, x - bw / 2, y - bh / 2, bw, bh, 13); c.fill(); c.globalAlpha = 1;
        c.lineWidth = s.boss ? 2.2 : s.gold ? 2 : 1.2;
        c.strokeStyle = s.gold ? pal.brass : s.boss ? pal.brass : locked ? pal.teal : pal.line;
        if(fx === 'full' && (s.gold || locked)){ c.shadowColor = s.gold ? pal.brass : pal.teal; c.shadowBlur = 14; }
        U.roundRect(c, x - bw / 2, y - bh / 2, bw, bh, 13); c.stroke(); c.shadowBlur = 0; c.lineWidth = 1;
        var matched = locked ? S.buffer.length : 0, tx0 = x - measure(s.word) / 2;
        c.font = '600 15px ' + pal.mono; c.textAlign = 'left';
        if(matched){ c.fillStyle = pal.teal; c.fillText(s.word.slice(0, matched), tx0, y + 1); }
        c.fillStyle = s.gold ? pal.brass : pal.text;
        c.fillText(s.word.slice(matched), tx0 + (matched ? c.measureText(s.word.slice(0, matched)).width : 0), y + 1);
        if(s.gold){ c.font = '600 10px ' + pal.mono; c.fillStyle = pal.brass; c.textAlign = 'center'; c.fillText(s.gold.toUpperCase(), x, y - bh / 2 - 8); }
        if(s.boss){
          c.fillStyle = pal.line; c.fillRect(x - 26, y - bh / 2 - 9, 52, 4);
          c.fillStyle = pal.red; c.fillRect(x - 26, y - bh / 2 - 9, 52 * (s.hp / s.maxHp), 4);
        }
      });
      parts.draw(c);
      c.textAlign = 'center';
      if(S.banner > 0){
        c.globalAlpha = Math.min(1, S.banner); c.fillStyle = pal.teal; c.font = '600 28px ' + pal.display;
        c.fillText('Wave ' + S.wave, w / 2, h * 0.42); c.globalAlpha = 1;
      }
      if(S.freeze > 0){ c.fillStyle = pal.violet; c.font = '600 12px ' + pal.mono; c.fillText('FREEZE ' + Math.ceil(S.freeze) + 's', w / 2, 18); }
      if(S.buffer){ c.fillStyle = pal.teal; c.font = '600 13px ' + pal.mono; c.fillText(S.buffer, w / 2, h - 44); }
      c.textAlign = 'left';
    }
    function finish(){
      S.over = true;
      var ms = loop.now() - (S.tally.start || 0), wpm = S.tally.wpm(ms), acc = S.tally.accuracy();
      var badges = S.score >= 1000 ? ['storm_1000'] : [];
      var xp = Math.round(S.score / 30) + Math.min(10, S.wave * 2);
      setTimeout(function(){
        if(!S) return;
        loop.stop();
        var isBest = sh.showEnd({ title: 'The storm got through', score: S.score, xp: xp, badgeNames: U.badgeNames(badges),
          rows: [['Wave', S.wave], ['Words', S.kills], ['Best combo', S.bestCombo], ['Speed', wpm + ' wpm'], ['Accuracy', acc + '%']] });
        sh.end(U.result(S.score, isBest, xp, { wpm: wpm, accuracy: acc, words: S.kills, wave: S.wave, bestCombo: S.bestCombo, seconds: Math.round(ms / 1000) }, badges));
      }, fx === 'off' ? 0 : 700);
      U.sound(ctx, 'lose');
    }
    sh.showStart();
    loop.start();
    return {
      destroy: function(){ offKeys(); loop.destroy(); scr.destroy(); S = null; sh.destroy(); },
      /* test hook: words on screen */
      _words: function(){ return S ? S.ships.map(function(s){ return s.word; }) : []; }
    };
  }

  G.register({ id: 'storm', title: 'Word Storm', accent: 'teal', trains: 'word speed',
    blurb: 'Falling words in waves, with boss words, power-ups and a combo meter.', scene: SCENE, mount: mount });
})();
