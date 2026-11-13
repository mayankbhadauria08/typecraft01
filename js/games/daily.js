/* Daily Challenge — TC_GAMES.daily
   One passage a day, chosen from the date so it needs no server. The first
   finished run of the day counts; later runs that day are practice. The result
   is compared with the learner's own earlier days (ctx.history).

   TC_GAMES.daily.pick(texts, 'YYYY-MM-DD') -> passage
   TC_GAMES.daily.today() -> local 'YYYY-MM-DD'
   TC_GAMES.daily.mount(el, ctx) -> { destroy() }
   ctx = { date?, text? | texts?:[...], done?:bool (today's counted run exists),
           history?:[{date,wpm,accuracy}], best?, effects, sound(name), onBack(),
           onEnd({ date, counted, score, best, xp, stats:{wpm,accuracy,errors,seconds,chars}, badges:[] }) } */
(function(){
  'use strict';
  var G = window.TC_GAMES, U = G.util;

  function today(){
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function pick(texts, dateStr){
    var list = (texts || []).filter(function(t){ return typeof t === 'string' && t.trim(); });
    if(!list.length) return '';
    return list[U.hash('typecraft-daily-' + (dateStr || today())) % list.length].trim().replace(/\s+/g, ' ');
  }

  function mount(el, ctx){
    ctx = ctx || {};
    var date = ctx.date || today();
    var text = (ctx.text && String(ctx.text).trim().replace(/\s+/g, ' ')) || pick(ctx.texts, date);
    if(!text){
      /* last resort: a seeded passage from the learner's words */
      var w = U.words(ctx), seed = U.hash(date), out = [];
      for(var i = 0; i < 30; i++){ seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; out.push(w[seed % w.length]); }
      text = out.join(' ');
    }
    var counted = !ctx.done;
    var history = (Array.isArray(ctx.history) ? ctx.history : []).filter(function(h){ return h && h.date && h.date !== date; })
      .sort(function(a, b){ return a.date < b.date ? -1 : 1; });
    var sh = U.shell(el, {
      id: 'daily', title: 'Daily Challenge', accent: 'brass', ctx: ctx,
      blurb: 'One passage for everyone today. Your first finished run counts.',
      how: [
        'Type the passage once through. The clock starts with your first key.',
        'A wrong key does not move you on. Fix it and keep going.',
        'Your result is compared with your own earlier days.'
      ],
      onStart: start
    });
    var S = null, line = null, loop = U.loop(step), host = U.h('div', 'daily-wrap');
    sh.stage.appendChild(host);
    var head = U.h('div', 'daily-head', '<span class="daily-date">' + U.esc(date) + '</span><span class="daily-kind"></span>');
    var lineHost = U.h('div', 'daily-line');
    host.appendChild(head); host.appendChild(lineHost);

    function kind(){ head.querySelector('.daily-kind').textContent = counted ? 'Counted run' : 'Practice run (today is already counted)'; }
    function start(){
      S = { i: 0, startAt: 0, tally: U.tally(), over: false, errs: 0 };
      if(line) line.destroy();
      line = U.typeLine(lineHost, text); kind();
      loop.reset(); loop.start(); hud(0);
    }
    function hud(now){
      var t = S && S.startAt ? now - S.startAt : 0;
      sh.setHud('<span class="tcg-chip">Speed <b>' + S.tally.wpm(t) + '</b> wpm</span><span class="tcg-chip v">Accuracy <b>' + S.tally.accuracy() + '%</b></span>' +
        '<span class="tcg-chip b">' + Math.floor(t / 1000) + ' s</span>');
    }
    function onKey(e){
      if(sh.key(e)) return false;
      if(!S || S.over || e.key.length !== 1) return;
      var now = loop.now();
      if(!S.startAt) S.startAt = now || 1;
      if(e.key === text[S.i]){
        S.tally.hit(true, now); line.advance(S.i); S.i++; U.sound(ctx, 'key');
        if(S.i >= text.length){ S.over = true; finish(now); }
      } else { S.tally.hit(false, now); S.errs++; line.miss(S.i); U.sound(ctx, 'error'); }
    }
    var offKeys = U.keys(onKey), lastHud = 0;
    function step(dt, now){ if(S && S.startAt && !S.over && now - lastHud > 250){ lastHud = now; hud(now); } }
    function chart(wpm){
      var rows = history.slice(-6).concat([{ date: date, wpm: wpm, today: true }]);
      var max = Math.max.apply(null, rows.map(function(r){ return +r.wpm || 0; }).concat([10]));
      return '<div class="daily-chart" role="img" aria-label="Speed on your last ' + rows.length + ' daily challenges">' + rows.map(function(r){
        return '<div class="daily-col' + (r.today ? ' today' : '') + '"><b style="height:' + Math.max(4, Math.round((+r.wpm || 0) / max * 100)) + '%"></b>' +
          '<span>' + (+r.wpm || 0) + '</span><em>' + U.esc(r.today ? 'today' : String(r.date).slice(5)) + '</em></div>';
      }).join('') + '</div>';
    }
    function finish(now){
      loop.stop();
      var ms = now - S.startAt, wpm = S.tally.wpm(ms), acc = S.tally.accuracy();
      var prevBest = history.reduce(function(m, h){ return Math.max(m, +h.wpm || 0); }, 0);
      var last7 = history.slice(-7), avg = last7.length ? Math.round(last7.reduce(function(s, h){ return s + (+h.wpm || 0); }, 0) / last7.length) : 0;
      var wasCounted = counted, xp = wasCounted ? 20 + wpm / 2 : 0;
      var cmp = !history.length ? 'Your first Daily Challenge. Come back tomorrow to compare.' :
        wpm > prevBest ? 'Your best daily result so far (previous best ' + prevBest + ' wpm).' :
        'Your recent average is ' + avg + ' wpm; your best day is ' + prevBest + ' wpm.';
      U.sound(ctx, 'win');
      var isBest = sh.showEnd({ eyebrow: wasCounted ? 'Counted run' : 'Practice run', title: 'Daily Challenge done', score: wpm, scoreLabel: 'Speed (wpm)', xp: xp,
        rows: [['Accuracy', acc + '%'], ['Errors', S.errs], ['Time', (ms / 1000).toFixed(1) + ' s']], note: cmp, again: 'Practise again' });
      var panel = sh.root.querySelector('.tcg-panel .tcg-note');
      if(panel){ panel.insertAdjacentHTML('afterend', chart(wpm)); sh.fit(); }
      if(wasCounted){ history.push({ date: date, wpm: wpm, accuracy: acc }); }
      counted = false;
      sh.end(U.result(wpm, isBest, xp, { wpm: wpm, accuracy: acc, errors: S.errs, seconds: Math.round(ms / 1000), chars: text.length }, [], { date: date, counted: wasCounted }));
    }
    sh.showStart('<p class="tcg-note">' + (counted ? 'Today\'s run has not been played yet: this one counts.' : 'You have already played today. This run is practice.') + '</p>' +
      '<p class="daily-preview">' + U.esc(text.length > 120 ? text.slice(0, 117) + '...' : text) + '</p>');
    return { destroy: function(){ offKeys(); loop.destroy(); if(line) line.destroy(); S = null; sh.destroy(); } };
  }

  G.daily = { pick: pick, today: today, mount: mount, title: 'Daily Challenge' };
})();
