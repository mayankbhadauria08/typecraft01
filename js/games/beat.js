/* Beat Keys — today's Metronome, rebuilt as a lane in perspective.
   Each character rides to the hit line on its beat. Perfect within 60 ms,
   Good within 160 ms, otherwise Miss. BPM 60/80/100/120/140. Combo, on-beat %. */
(function(){
  'use strict';
  var G = window.TC_GAMES, U = G.util;
  var PERFECT = 60, GOOD = 160, WINDOW = 400, NOTES = 48, LEAD = 4;

  var SCENE = '<svg class="tcg-scene" viewBox="0 0 240 120" aria-hidden="true">' +
    '<path class="pl" d="M98 8h44l62 104H36z"/><path class="ln2" d="M113 8 92 112M127 8l21 104"/><path class="ts" d="M47 94h146"/>' +
    '<rect class="tl" x="108" y="20" width="9" height="7" rx="2"/><rect class="tl" x="124" y="44" width="15" height="11" rx="3"/>' +
    '<rect class="br" x="62" y="84" width="26" height="18" rx="4"/><text x="75" y="97" class="on">f</text><text x="204" y="30" class="lbl">perfect</text></svg>';

  function mount(el, ctx){
    var sh = U.shell(el, {
      id: 'beat', title: 'Beat Keys', accent: 'violet', ctx: ctx,
      blurb: 'Letters ride down the lane. Type each one as it crosses the line, on the beat.',
      how: [
        'Four count-in clicks, then the letters arrive one per beat.',
        'Press the key as the letter touches the glowing line.',
        'Within 60 ms is <b>Perfect</b>, within 160 ms is <b>Good</b>, otherwise <b>Miss</b>.',
        'A run of hits builds your combo. A wide bar means Space.'
      ],
      options: [{ key: 'bpm', label: 'Speed', value: 80, values: [[60, '60'], [80, '80'], [100, '100'], [120, '120'], [140, '140 bpm']] }],
      onStart: start
    });
    var fx = sh.fx, scr = U.canvas(sh.stage, 0.62, 300, 460), c = scr.c, pal = U.palette(sh.root);
    var words = U.words(ctx), S = null, loop = U.loop(step);

    function start(ch){
      pal = U.palette(sh.root);
      var bpm = +ch.bpm || 80, beat = 60000 / bpm;
      var text = '';
      while(text.length < NOTES) text += (text ? ' ' : '') + U.pick(words);
      text = text.slice(0, NOTES).replace(/ +$/, '');
      var notes = [];
      for(var i = 0; i < text.length; i++) notes.push({ ch: text[i], t: (LEAD + i) * beat, res: null });
      S = { bpm: bpm, beat: beat, notes: notes, next: 0, tickK: 0, score: 0, combo: 0, bestCombo: 0, perfect: 0, good: 0, miss: 0,
        pops: [], pulse: 0, tally: U.tally(), done: false, endAt: 0 };
      loop.reset(); loop.start(); hud();
    }
    function onBeatPct(){ var n = S.perfect + S.good + S.miss; return n ? Math.round((S.perfect + S.good) / n * 100) : 100; }
    function hud(){
      sh.setHud('<span class="tcg-chip">Score <b>' + S.score + '</b></span><span class="tcg-chip v">Combo <b>' + S.combo + '</b></span>' +
        '<span class="tcg-chip">On beat <b>' + onBeatPct() + '%</b></span><span class="tcg-chip b">' + S.bpm + ' bpm</span>');
    }
    function judge(n, kind){
      n.res = kind; S.next++;
      if(kind === 'perfect'){ S.perfect++; S.combo++; S.score += 10 * Math.min(S.combo, 10); }
      else if(kind === 'good'){ S.good++; S.combo++; S.score += 5 * Math.min(S.combo, 10); }
      else { S.miss++; S.combo = 0; }
      S.bestCombo = Math.max(S.bestCombo, S.combo);
      S.pops.push({ text: kind === 'perfect' ? 'Perfect' : kind === 'good' ? 'Good' : 'Miss', kind: kind, age: 0 });
      if(S.pops.length > 4) S.pops.shift();
      if(S.next >= S.notes.length){ S.done = true; S.endAt = loop.now() + S.beat * 1.5; }
      hud();
    }
    function onKey(e){
      if(sh.key(e)) return false;
      if(!S || S.done || e.key.length !== 1) return;
      var n = S.notes[S.next]; if(!n) return;
      var now = loop.now(), d = now - n.t;
      if(d < -WINDOW) return; /* far too early: ignore, nothing is waiting at the line */
      var ok = e.key === n.ch;
      S.tally.hit(ok, now);
      if(!ok){ U.sound(ctx, 'error'); judge(n, 'miss'); return; }
      var ad = Math.abs(d);
      if(ad <= PERFECT){ U.sound(ctx, 'ding'); judge(n, 'perfect'); }
      else if(ad <= GOOD){ U.sound(ctx, 'key'); judge(n, 'good'); }
      else { U.sound(ctx, 'key'); judge(n, 'miss'); }
    }
    var offKeys = U.keys(onKey);

    function step(dt, now){
      if(S){
        /* metronome click on every beat (count-in and song) */
        while(!S.done && S.tickK * S.beat <= now){ S.tickK++; S.pulse = 1; U.sound(ctx, 'tick'); }
        if(S.pulse > 0) S.pulse = Math.max(0, S.pulse - dt * 4);
        while(!S.done && S.notes[S.next] && now - S.notes[S.next].t > GOOD) judge(S.notes[S.next], 'miss');
        S.pops.forEach(function(p){ p.age += dt; });
        if(S.done && now >= S.endAt) finish();
      }
      draw(now);
    }
    function draw(now){
      var w = scr.w, h = scr.h; c.clearRect(0, 0, w, h);
      if(!S){ return; }
      var vy = h * 0.06, hitY = h * 0.8, hw = Math.min(w * 0.3, 150), cx = w / 2, L = S.beat * LEAD;
      function sc(d){ return 1 / (1 + 3 * d); }
      function yAt(d){ return vy + (hitY - vy) * sc(d); }
      var dBottom = ((hitY - vy) / (h - vy) - 1) / 3; /* depth at the bottom edge (negative) */
      var dFar = 2.4;
      /* lane */
      var gy0 = yAt(dFar), gy1 = h, s0 = sc(dFar), s1 = sc(dBottom);
      var grad = c.createLinearGradient(0, gy0, 0, gy1);
      grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, pal.surface);
      c.fillStyle = grad; c.beginPath();
      c.moveTo(cx - hw * s0, gy0); c.lineTo(cx + hw * s0, gy0); c.lineTo(cx + hw * s1, gy1); c.lineTo(cx - hw * s1, gy1); c.closePath(); c.fill();
      c.strokeStyle = pal.violet; c.globalAlpha = 0.55; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(cx - hw * s0, gy0); c.lineTo(cx - hw * s1, gy1); c.moveTo(cx + hw * s0, gy0); c.lineTo(cx + hw * s1, gy1); c.stroke();
      /* beat lines */
      c.lineWidth = 1; c.strokeStyle = pal.line;
      var kFirst = Math.floor((now + dBottom * L) / S.beat), kLast = Math.ceil((now + dFar * L) / S.beat);
      for(var k = Math.max(0, kFirst); k <= kLast; k++){
        var d = (k * S.beat - now) / L; if(d < dBottom || d > dFar) continue;
        var y = yAt(d), s = sc(d); c.globalAlpha = 0.25 + 0.35 * Math.min(1, s);
        c.beginPath(); c.moveTo(cx - hw * s, y); c.lineTo(cx + hw * s, y); c.stroke();
      }
      c.globalAlpha = 1;
      /* hit line */
      var glow = fx === 'off' ? 0 : S.pulse;
      c.strokeStyle = pal.teal; c.lineWidth = 3 + glow * 2;
      if(fx === 'full'){ c.shadowColor = pal.teal; c.shadowBlur = 8 + glow * 18; }
      c.beginPath(); c.moveTo(cx - hw * 1.08, hitY); c.lineTo(cx + hw * 1.08, hitY); c.stroke();
      c.shadowBlur = 0; c.lineWidth = 1;
      /* notes, far first */
      for(var i = S.notes.length - 1; i >= 0; i--){
        var n = S.notes[i];
        if(n.res === 'perfect' || n.res === 'good') continue;
        var dd = (n.t - now) / L; if(dd > dFar || dd < dBottom) continue;
        var ny = yAt(dd), ns = sc(dd), space = n.ch === ' ';
        var nw = (space ? hw * 1.6 : Math.min(hw * 0.9, 64)) * ns, nh = 34 * ns;
        c.globalAlpha = n.res === 'miss' ? 0.35 : Math.min(1, 0.35 + ns);
        c.fillStyle = n.res === 'miss' ? pal.red : i === S.next ? pal.teal : pal.violet;
        U.roundRect(c, cx - nw / 2, ny - nh / 2, nw, nh, 7 * ns); c.fill();
        c.fillStyle = pal.tealInk; c.font = '600 ' + Math.max(8, Math.round((space ? 13 : 22) * ns)) + 'px ' + pal.mono;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(space ? 'space' : n.ch, cx, ny + 1);
      }
      c.globalAlpha = 1;
      /* count-in */
      var first = S.notes[0];
      if(first && now < first.t){
        var left = Math.ceil((first.t - now) / S.beat);
        c.fillStyle = pal.text; c.font = '600 46px ' + pal.display; c.textAlign = 'center';
        c.fillText(String(left), cx, h * 0.38);
      }
      /* judgement and combo */
      var p = S.pops[S.pops.length - 1];
      if(p && p.age < 0.7){
        var col = p.kind === 'perfect' ? pal.teal : p.kind === 'good' ? pal.violet : pal.red;
        c.globalAlpha = 1 - p.age / 0.7; c.fillStyle = col; c.textAlign = 'center';
        c.font = '600 ' + (fx === 'off' ? 22 : Math.round(22 + 8 * (1 - p.age / 0.7))) + 'px ' + pal.display;
        c.fillText(p.text, cx, hitY + 34 - (fx === 'off' ? 0 : p.age * 20)); c.globalAlpha = 1;
      }
      if(S.combo >= 2){ c.fillStyle = pal.brass; c.font = '600 13px ' + pal.mono; c.textAlign = 'right'; c.fillText(S.combo + ' combo', w - 12, 20); }
      c.textAlign = 'left';
    }
    function finish(){
      loop.stop();
      var pct = onBeatPct(), acc = S.tally.accuracy(), secs = Math.round(S.notes.length * S.beat / 1000);
      var badges = S.bestCombo >= 30 ? ['beat_30'] : [];
      var xp = pct * 0.3 + Math.min(20, S.bestCombo / 2);
      var isBest = sh.showEnd({ title: pct >= 90 ? 'Right on the beat' : 'Session complete', score: S.score, xp: xp, badgeNames: U.badgeNames(badges),
        rows: [['On beat', pct + '%'], ['Best combo', S.bestCombo], ['Perfect', S.perfect], ['Good', S.good], ['Miss', S.miss], ['BPM', S.bpm]] });
      sh.end(U.result(S.score, isBest, xp, { wpm: Math.round(S.bpm / 5), accuracy: acc, onBeat: pct, bestCombo: S.bestCombo,
        perfect: S.perfect, good: S.good, miss: S.miss, bpm: S.bpm, seconds: secs }, badges));
      S.done = true;
    }
    sh.showStart();
    return { destroy: function(){ offKeys(); loop.destroy(); scr.destroy(); S = null; sh.destroy(); } };
  }

  G.register({ id: 'beat', title: 'Beat Keys', accent: 'violet', trains: 'even rhythm',
    blurb: 'Letters ride a 3D lane to the hit line. Perfect, Good or Miss.', scene: SCENE, mount: mount });
})();
