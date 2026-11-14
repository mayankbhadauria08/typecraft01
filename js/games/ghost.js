/* Ghost Race — race a replay of your own best run plus three bots on a track
   drawn in perspective. Key timings of the best run per passage length are
   kept through ctx.saveGhost/loadGhost (delta-encoded, capped at 20 KB). With
   no saved run, race the bots and that run becomes the ghost. */
(function(){
  'use strict';
  var G = window.TC_GAMES, U = G.util;
  var LENGTHS = { short: 12, medium: 25, long: 45 }, CAP = 20000, COUNT = 3;

  var SCENE = '<svg class="tcg-scene" viewBox="0 0 240 120" aria-hidden="true">' +
    '<path class="ln2" d="M14 34h200M14 60h200M14 86h200"/><path class="ln2" d="M214 20v80" stroke-dasharray="4 4"/>' +
    '<rect class="pl" x="92" y="23" width="30" height="22" rx="6"/><text x="107" y="38">bot</text>' +
    '<rect class="ghost" x="138" y="49" width="36" height="22" rx="6"/><text x="156" y="64" class="dim">best</text>' +
    '<rect class="tl" x="160" y="75" width="30" height="22" rx="6"/><text x="175" y="90" class="on">you</text></svg>';

  function key(len){ return 'ghost-' + len; }
  function load(ctx, len){
    try{
      var g = ctx.loadGhost ? ctx.loadGhost(key(len)) : null;
      if(!g || !Array.isArray(g.t) || !g.t.length) return null;
      var T = [], acc = 0;
      for(var i = 0; i < g.t.length; i++){ acc += +g.t[i] || 0; T.push(acc); }
      return { wpm: +g.wpm || 0, accuracy: +g.accuracy || 0, at: g.at || '', T: T, n: +g.n || T.length };
    }catch(e){ return null; }
  }
  function save(ctx, len, times, wpm, accuracy){
    if(!ctx.saveGhost) return false;
    var d = [], prev = 0;
    for(var i = 0; i < times.length; i++){ var v = Math.round(times[i]); d.push(v - prev); prev = v; }
    var obj = { v: 1, n: times.length, t: d, wpm: wpm, accuracy: accuracy, at: new Date().toISOString().slice(0, 10) };
    /* stay under the cap: merge neighbouring timings until it fits */
    while(JSON.stringify(obj).length > CAP && obj.t.length > 8){
      var m = [];
      for(var j = 0; j < obj.t.length; j += 2) m.push(obj.t[j] + (obj.t[j + 1] || 0));
      obj.t = m;
    }
    try{ ctx.saveGhost(key(len), obj); return true; }catch(e){ return false; }
  }

  function mount(el, ctx){
    var sh = U.shell(el, {
      id: 'ghost', title: 'Ghost Race', accent: 'red', ctx: ctx,
      blurb: 'Race a replay of your own best run, key for key, and three bots.',
      how: [
        'After the count of three, type the passage. Your runner moves with every correct key.',
        'The dashed runner is your ghost: your best run at this length, replayed.',
        'No ghost yet? Race the bots and this run becomes your ghost.',
        'A wrong key does not move you on. Fix it and keep going.'
      ],
      options: [{ key: 'len', label: 'Passage', value: 'short', values: [['short', 'Short'], ['medium', 'Medium'], ['long', 'Long']] }],
      onChoice: function(){ note(); },
      onStart: start
    });
    var fx = sh.fx, words = U.words(ctx), S = null, line = null, pal = U.palette(sh.root);
    var wrap = U.h('div', 'ghost-wrap'); sh.stage.appendChild(wrap);
    var scr = U.canvas(wrap, 0.42, 220, 340), c = scr.c;
    var lineHost = U.h('div', 'ghost-line'); wrap.appendChild(lineHost);
    var loop = U.loop(step);

    function note(){
      var info = sh.root.querySelector('.ghost-note'); if(!info) return;
      var g = load(ctx, sh.choices.len || 'short');
      info.innerHTML = g ? 'Your ghost at this length: <b>' + g.wpm + ' wpm</b>' + (g.at ? ' (' + U.esc(g.at) + ')' : '') : 'No ghost at this length yet. This run will record one.';
    }

    function start(ch){
      pal = U.palette(sh.root);
      var len = ch.len || 'short', ghost = load(ctx, len);
      var text = U.passage(words, LENGTHS[len] || 12);
      var base = Math.max(8, ghost ? ghost.wpm : (typeof ctx.best === 'number' && ctx.best > 0 ? ctx.best : 18));
      var bots = [['Pip', 0.78, '#'], ['Rook', 0.94, '#'], ['Vega', 1.08, '#']].map(function(b, i){
        return { name: b[0], wpm: Math.round(base * b[1]), p: 0, fin: 0, phase: Math.random() * 6, col: [pal.violet, pal.brass, pal.muted][i] };
      });
      S = { ratio: ghost ? text.length / ghost.n : 1, len: len, text: text, i: 0, times: [], ghost: ghost, bots: bots, go: COUNT * 1000, fin: 0, tally: U.tally(), over: false, gp: 0, scroll: 0 };
      if(line) line.destroy();
      line = U.typeLine(lineHost, text);
      loop.reset(); loop.start(); hud(0);
    }
    function hud(now){
      var t = S && now > S.go ? now - S.go : 0;
      var wpm = t > 800 ? Math.round(S.i / 5 / (t / 60000)) : 0;
      sh.setHud('<span class="tcg-chip">Speed <b>' + wpm + '</b> wpm</span><span class="tcg-chip r">Place <b>' + place() + '</b></span>' +
        (S && S.ghost ? '<span class="tcg-chip v">Ghost <b>' + S.ghost.wpm + '</b></span>' : ''));
    }
    function ghostP(t){
      var g = S.ghost; if(!g || t <= 0) return 0;
      /* replay at the recorded pace, stretched to this passage's length */
      t = t / S.ratio;
      var T = g.T, n = 0;
      /* binary search: number of timings <= t */
      var lo = 0, hi = T.length;
      while(lo < hi){ var mid = (lo + hi) >> 1; if(T[mid] <= t) lo = mid + 1; else hi = mid; }
      n = lo;
      return n / T.length;
    }
    function place(){
      if(!S) return 1;
      var me = S.i / S.text.length, p = 1;
      S.bots.forEach(function(b){ if(b.p > me) p++; });
      if(S.ghost && S.gp > me) p++;
      return p;
    }
    function onKey(e){
      if(sh.key(e)) return false;
      if(!S || S.over || e.key.length !== 1) return;
      var now = loop.now();
      if(now < S.go) return;
      if(e.key === S.text[S.i]){
        S.tally.hit(true, now); line.advance(S.i); S.times.push(now - S.go); S.i++; U.sound(ctx, 'key');
        if(S.i >= S.text.length){ S.fin = now - S.go; S.over = true; setTimeout(finish, fx === 'off' ? 0 : 700); }
      } else { S.tally.hit(false, now); line.miss(S.i); U.sound(ctx, 'error'); }
    }
    var offKeys = U.keys(onKey), lastHud = 0;

    function step(dt, now){
      if(S){
        var t = now - S.go, n = S.text.length;
        if(t > 0){
          S.bots.forEach(function(b){
            if(b.fin) return;
            var wob = 1 + 0.12 * Math.sin(t / 900 + b.phase);
            b.p = Math.min(1, b.p + (b.wpm * 5 / 60) * wob * dt / n);
            if(b.p >= 1) b.fin = t;
          });
          S.gp = ghostP(t);
        }
        if(now - lastHud > 250){ lastHud = now; hud(now); }
        if(fx !== 'off') S.scroll += dt;
      }
      draw(now);
    }
    function draw(now){
      var w = scr.w, h = scr.h; c.clearRect(0, 0, w, h);
      if(!S) return;
      var lanes = 5, cx = w / 2, y0 = h * 0.1, y1 = h * 0.96, hwMax = w * 0.47;
      var E = [];
      for(var j = 0; j <= lanes; j++){
        var f = j / lanes, ease = f * (0.7 + 0.3 * f);
        E.push({ y: y0 + (y1 - y0) * ease, hw: hwMax * (0.6 + 0.4 * f) });
      }
      /* track */
      var gr = c.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, pal.surface); gr.addColorStop(1, pal.raise);
      c.fillStyle = gr; c.globalAlpha = 0.85; c.beginPath();
      c.moveTo(cx - E[0].hw, E[0].y); c.lineTo(cx + E[0].hw, E[0].y); c.lineTo(cx + E[lanes].hw, E[lanes].y); c.lineTo(cx - E[lanes].hw, E[lanes].y); c.closePath(); c.fill();
      c.globalAlpha = 1; c.strokeStyle = pal.line; c.lineWidth = 1;
      for(j = 0; j <= lanes; j++){ c.beginPath(); c.moveTo(cx - E[j].hw, E[j].y); c.lineTo(cx + E[j].hw, E[j].y); c.stroke(); }
      /* moving tick marks give a sense of speed */
      var sx = 0.06, ex = 0.94;
      c.strokeStyle = pal.line; c.globalAlpha = 0.4;
      for(var m = 0; m < 10; m++){
        var fx0 = ((m / 10) + (S.scroll * 0.02)) % 1;
        c.beginPath(); c.moveTo(cx - E[0].hw + 2 * E[0].hw * fx0, E[0].y); c.lineTo(cx - E[lanes].hw + 2 * E[lanes].hw * fx0, E[lanes].y); c.stroke();
      }
      c.globalAlpha = 1;
      function xAt(edge, p){ var e = E[edge]; return cx - e.hw + 2 * e.hw * (sx + (ex - sx) * p); }
      /* start and finish lines */
      c.strokeStyle = pal.text; c.globalAlpha = 0.5; c.setLineDash([5, 5]);
      c.beginPath(); c.moveTo(xAt(0, 0), E[0].y); c.lineTo(xAt(lanes, 0), E[lanes].y); c.stroke();
      c.strokeStyle = pal.teal; c.globalAlpha = 0.9; c.lineWidth = 2;
      c.beginPath(); c.moveTo(xAt(0, 1), E[0].y); c.lineTo(xAt(lanes, 1), E[lanes].y); c.stroke();
      c.setLineDash([]); c.globalAlpha = 1; c.lineWidth = 1;
      var runners = S.bots.map(function(b){ return { label: b.name, p: b.p, col: b.col, kind: 'bot' }; });
      runners.push(S.ghost ? { label: 'ghost', p: S.gp, col: pal.muted, kind: 'ghost' } : { label: 'no ghost', p: 0, col: pal.muted, kind: 'empty' });
      runners.push({ label: 'you', p: S.i / S.text.length, col: pal.teal, kind: 'you' });
      runners.forEach(function(r, k){
        var yTop = E[k].y, yBot = E[k + 1].y, ym = (yTop + yBot) / 2, sc = 0.7 + 0.3 * (k + 1) / lanes;
        var xm = (xAt(k, r.p) + xAt(k + 1, r.p)) / 2, bw = 46 * sc, bh = Math.min(22 * sc, (yBot - yTop) * 0.8);
        if(r.kind === 'empty'){
          c.fillStyle = pal.muted; c.font = '500 ' + Math.round(10 * sc) + 'px ' + pal.mono; c.textAlign = 'left'; c.textBaseline = 'middle';
          c.fillText('no ghost yet: this run records one', xAt(k, 0) + 6, ym); return;
        }
        if(r.kind === 'you' && fx === 'full'){ c.shadowColor = pal.teal; c.shadowBlur = 16; }
        c.fillStyle = r.kind === 'you' ? pal.teal : r.kind === 'ghost' ? pal.raise : pal.surface;
        c.globalAlpha = r.kind === 'ghost' ? 0.75 : 1;
        U.roundRect(c, xm - bw, ym - bh / 2, bw, bh, 6 * sc); c.fill(); c.shadowBlur = 0;
        c.strokeStyle = r.col; c.lineWidth = 1.5; if(r.kind === 'ghost') c.setLineDash([3, 3]);
        U.roundRect(c, xm - bw, ym - bh / 2, bw, bh, 6 * sc); c.stroke(); c.setLineDash([]); c.globalAlpha = 1; c.lineWidth = 1;
        c.fillStyle = r.kind === 'you' ? pal.tealInk : r.kind === 'ghost' ? pal.muted : pal.text;
        c.font = '600 ' + Math.round(10 * sc + 1) + 'px ' + pal.mono; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(r.label, xm - bw / 2, ym + 1);
      });
      if(now < S.go){
        c.fillStyle = pal.text; c.font = '600 44px ' + pal.display; c.textAlign = 'center';
        c.fillText(String(Math.ceil((S.go - now) / 1000)), cx, h * 0.5);
      }
      c.textAlign = 'left';
    }
    function finish(){
      if(!S) return;
      loop.stop();
      var t = S.fin, wpm = Math.round(S.text.length / 5 / (t / 60000)), acc = S.tally.accuracy();
      var others = S.bots.map(function(b){ return b.fin || Infinity; });
      var beat = false, gT = S.ghost ? S.ghost.T[S.ghost.T.length - 1] * S.ratio : 0;
      if(S.ghost){ others.push(gT); beat = t < gT; }
      var pl = 1 + others.filter(function(x){ return x < t; }).length;
      var saved = false;
      if(!S.ghost || wpm > S.ghost.wpm) saved = save(ctx, S.len, S.times, wpm, acc);
      var badges = beat ? ['ghost_beat'] : [];
      var xp = wpm * 0.6 + (pl === 1 ? 10 : 0);
      U.sound(ctx, pl === 1 ? 'win' : 'ding');
      var isBest = sh.showEnd({ title: pl === 1 ? 'First across the line' : 'Finished in place ' + pl, score: wpm, scoreLabel: 'Speed (wpm)', xp: xp,
        badgeNames: U.badgeNames(badges), rows: [['Place', pl + ' of ' + (S.ghost ? 5 : 4)], ['Accuracy', acc + '%'], ['Time', (t / 1000).toFixed(1) + ' s'],
          ['Ghost', S.ghost ? (beat ? 'beaten' : 'ahead') : 'recorded']],
        note: saved ? 'This run is now your ghost for ' + S.len + ' passages.' : '' });
      sh.end(U.result(wpm, isBest, xp, { wpm: wpm, accuracy: acc, place: pl, ghostBeaten: beat, ghostSaved: saved, length: S.len, seconds: Math.round(t / 1000) }, badges));
    }
    sh.showStart('<p class="tcg-note ghost-note"></p>'); note();
    return { destroy: function(){ offKeys(); loop.destroy(); scr.destroy(); if(line) line.destroy(); S = null; sh.destroy(); } };
  }

  G.register({ id: 'ghost', title: 'Ghost Race', accent: 'red', trains: 'beating your record',
    blurb: 'Race a replay of your own best run, key for key, plus three bots.', scene: SCENE, mount: mount });
})();
