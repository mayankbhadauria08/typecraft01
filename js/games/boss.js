/* Boss Battles — the engine for the course bosses and the arcade.
   Health bar; each correct word hits by its length; a mistake heals a little and
   shakes the screen; the timer bar is the boss's attack and costs one of three
   hearts when it fills; three phases of harder words. Won at health 0 with 90%
   accuracy or better, otherwise the boss escapes and you can retry.
   ctx.bossLesson = {id,title,words:{phase1,phase2,phase3}} (course) → onEnd({won,accuracy,hearts,xp,...})
   Arcade: ctx.bosses = [same shape] to choose from, else a practice boss from ctx.words. */
(function(){
  'use strict';
  var G = window.TC_GAMES, U = G.util;
  var HEAL = 2, ATTACK = [9, 7.5, 6], WORDS_PER_PHASE = 8, PASS = 90;

  var SCENE = '<svg class="tcg-scene" viewBox="0 0 240 120" aria-hidden="true">' +
    '<rect class="pl" x="50" y="12" width="140" height="9" rx="4.5"/><rect class="rd" x="51.5" y="13.5" width="84" height="6" rx="3"/>' +
    '<rect class="pl boss" x="82" y="30" width="76" height="60" rx="14"/><rect class="br" x="98" y="48" width="12" height="12" rx="3"/><rect class="br" x="130" y="48" width="12" height="12" rx="3"/>' +
    '<path class="bs" d="M102 74h36"/><text x="120" y="110">between</text></svg>';

  function clean(list){ return (list || []).map(function(w){ return String(w).trim(); }).filter(function(w){ return w && !/\s/.test(w); }); }
  function practiceBoss(ctx){
    var all = U.words(ctx);
    var p1 = U.byLen(all, 1, 4), p2 = U.byLen(all, 4, 6), p3 = U.byLen(all, 6, 30);
    return { id: 'practice', title: 'Practice boss', words: { phase1: p1.length ? p1 : all, phase2: p2.length ? p2 : all, phase3: p3.length ? p3 : all } };
  }
  function norm(b, ctx){
    var w = b.words || {}, all = U.words(ctx);
    var p1 = clean(w.phase1), p2 = clean(w.phase2), p3 = clean(w.phase3);
    if(!p1.length) p1 = all; if(!p2.length) p2 = p1; if(!p3.length) p3 = p2;
    return { id: b.id || 'boss', title: b.title || 'Boss', words: { phase1: p1, phase2: p2, phase3: p3 } };
  }

  function mount(el, ctx){
    var course = !!ctx.bossLesson;
    var list = course ? [norm(ctx.bossLesson, ctx)] : (Array.isArray(ctx.bosses) && ctx.bosses.length ? ctx.bosses.map(function(b){ return norm(b, ctx); }) : [practiceBoss(ctx)]);
    var options = list.length > 1 ? [{ key: 'boss', label: 'Boss', value: list[0].id, values: list.map(function(b){ return [b.id, b.title.replace(/^Boss:\s*/i, '')]; }) }] : [];
    var sh = U.shell(el, {
      id: 'boss', title: course ? list[0].title : 'Boss Battles', accent: 'red', ctx: ctx,
      blurb: course ? 'The checkpoint at the end of the unit. Beat it with 90% accuracy or better.' : (list.length > 1 ? 'Replay the bosses you have met.' : 'A practice boss made from the words you know.'),
      how: [
        'Each word you finish hits the boss as hard as the word is long.',
        'A wrong key heals the boss a little.',
        'The bar under the boss is its attack. When it fills you lose a heart; finishing words pushes it back.',
        'Three phases, each with harder words. Bring its health to zero with 90% accuracy or better to win.'
      ],
      options: options,
      onStart: start
    });
    var fx = sh.fx, S = null, loop = U.loop(step);
    var wrap = U.h('div', 'boss-wrap');
    wrap.innerHTML =
      '<div class="boss-top"><span class="boss-name"></span><span class="boss-phase"></span></div>' +
      '<div class="boss-hp" role="img" aria-label="Boss health"><i></i><b></b></div>' +
      '<div class="boss-arena">' +
        '<svg class="boss-mon" viewBox="0 0 160 130" aria-hidden="true">' +
          '<ellipse class="boss-shadow" cx="80" cy="122" rx="56" ry="6"/>' +
          '<g class="boss-body"><rect class="boss-shell" x="22" y="14" width="116" height="96" rx="26"/>' +
          '<path class="boss-horn" d="M40 20 30 2 56 16zM120 20l10-18-26 14z"/>' +
          '<rect class="boss-eye" x="46" y="44" width="18" height="18" rx="4"/><rect class="boss-eye" x="96" y="44" width="18" height="18" rx="4"/>' +
          '<path class="boss-mouth" d="M54 90l8-8 9 8 9-8 9 8 9-8 8 8"/></g>' +
        '</svg>' +
      '</div>' +
      '<div class="boss-attack" aria-hidden="true"><i></i><span>attack</span></div>' +
      '<div class="boss-type"><div class="boss-word" aria-live="off"></div><div class="boss-next"></div></div>';
    sh.stage.appendChild(wrap);
    var hpEl = wrap.querySelector('.boss-hp i'), hpTxt = wrap.querySelector('.boss-hp b'), atkEl = wrap.querySelector('.boss-attack i');
    var wordEl = wrap.querySelector('.boss-word'), nextEl = wrap.querySelector('.boss-next'), mon = wrap.querySelector('.boss-mon');
    var phaseEl = wrap.querySelector('.boss-phase'), nameEl = wrap.querySelector('.boss-name');

    function start(ch){
      var b = list[0];
      if(list.length > 1) b = list.filter(function(x){ return x.id === ch.boss; })[0] || list[0];
      var pk = [U.picker(b.words.phase1), U.picker(b.words.phase2), U.picker(b.words.phase3)];
      function avg(a){ return a.reduce(function(s, w){ return s + w.length; }, 0) / Math.max(1, a.length); }
      var ph = [b.words.phase1, b.words.phase2, b.words.phase3].map(function(a){ return Math.max(8, Math.round(avg(a) * WORDS_PER_PHASE)); });
      var max = ph[0] + ph[1] + ph[2];
      S = { boss: b, pk: pk, max: max, hp: max, cut: [ph[1] + ph[2], ph[2]], phase: 0, hearts: 3, charge: 0, word: '', next: '', i: 0,
        tally: U.tally(), dealt: 0, over: false, startAt: 0 };
      nameEl.textContent = b.title;
      S.word = pk[0](); S.next = pk[0]();
      mon.setAttribute('data-phase', '1');
      render(); bars(); hud();
      loop.reset(); loop.start();
    }
    function hud(){
      var h = '';
      for(var k = 0; k < 3; k++) h += '<i class="' + (k < S.hearts ? '' : 'lost') + '"></i>';
      sh.setHud('<span class="tcg-chip r" aria-label="' + S.hearts + ' hearts"><span class="tcg-hearts">' + h + '</span></span>' +
        '<span class="tcg-chip">Accuracy <b>' + S.tally.accuracy() + '%</b></span>');
    }
    function render(bad){
      var w = S.word, h = '';
      for(var k = 0; k < w.length; k++) h += '<span class="' + (k < S.i ? 'ok' : k === S.i ? 'cur' + (bad ? ' bad' : '') : '') + '">' + U.esc(w[k]) + '</span>';
      wordEl.innerHTML = h; nextEl.textContent = 'next: ' + S.next;
      phaseEl.textContent = 'Phase ' + (S.phase + 1) + ' of 3';
    }
    function bars(){
      var f = S.hp / S.max;
      hpEl.style.transform = 'scaleX(' + U.clamp(f, 0, 1).toFixed(3) + ')';
      hpTxt.textContent = Math.max(0, Math.ceil(f * 100)) + '%';
      atkEl.style.transform = 'scaleX(' + U.clamp(S.charge, 0, 1).toFixed(3) + ')';
    }
    function setPhase(){
      var p = S.hp > S.cut[0] ? 0 : S.hp > S.cut[1] ? 1 : 2;
      if(p !== S.phase){
        S.phase = p; mon.setAttribute('data-phase', String(p + 1));
        sh.banner('Phase ' + (p + 1), p === 2 ? 'Final phase' : 'Harder words');
        S.next = S.pk[p]();
      }
    }
    function onKey(e){
      if(sh.key(e)) return false;
      if(!S || S.over || e.key.length !== 1) return;
      if(e.key === ' ' && S.i === 0) return;
      var now = loop.now();
      if(!S.startAt) S.startAt = now || 1;
      if(e.key === S.word[S.i]){
        S.tally.hit(true, now); S.i++; U.sound(ctx, 'key');
        if(S.i >= S.word.length){
          var dmg = S.word.length;
          S.hp -= dmg; S.dealt += dmg; S.charge = Math.max(0, S.charge - 0.4);
          U.pulse(mon, 'hit'); U.sound(ctx, 'ding');
          if(S.hp <= 0){ S.hp = 0; bars(); end(); return; }
          setPhase();
          S.word = S.next; S.next = S.pk[S.phase](); S.i = 0;
        }
        render(); bars();
      } else {
        S.tally.hit(false, now); U.sound(ctx, 'error');
        S.hp = Math.min(S.max, S.hp + HEAL); setPhase();
        U.shake(sh.stage, fx); render(true); bars();
      }
      hud();
    }
    var offKeys = U.keys(onKey);
    function step(dt){
      if(!S || S.over || !S.startAt) return;
      S.charge += dt / ATTACK[S.phase];
      if(S.charge >= 1){
        S.charge = 0; S.hearts--; U.pulse(mon, 'lunge'); U.shake(sh.stage, fx); U.sound(ctx, 'error'); hud();
        if(S.hearts <= 0){ bars(); end(); return; }
      }
      bars();
    }
    function end(){
      S.over = true; loop.stop();
      var acc = S.tally.accuracy(), ms = loop.now() - S.startAt, wpm = S.tally.wpm(ms);
      var downed = S.hp <= 0, won = downed && acc >= PASS && S.hearts > 0;
      var title = won ? S.boss.title.replace(/^Boss:\s*/i, '') + ' is beaten' : downed ? 'The boss escaped' : 'The boss won this time';
      var note = won ? '' : downed ? 'You brought it down, but accuracy was ' + acc + '%. You need ' + PASS + '% or better. Try again.' : 'You ran out of hearts. Finish words quickly to push its attack back.';
      var score = S.dealt + S.hearts * 50 + (won ? 300 : 0);
      var xp = course ? (won ? 100 : 0) : (won ? 30 + S.hearts * 5 + Math.min(5, wpm / 10) : Math.min(10, S.dealt / 20));
      U.sound(ctx, won ? 'win' : 'lose');
      if(won && fx !== 'off') U.pulse(mon, 'down');
      setTimeout(function(){
        if(!S) return;
        var isBest = sh.showEnd({ eyebrow: course ? 'Boss battle' : 'Arcade', title: title, score: score, xp: course ? 0 : xp, again: won ? 'Fight again' : 'Try again',
          rows: [['Result', won ? 'Won' : 'Lost'], ['Accuracy', acc + '%'], ['Hearts left', S.hearts], ['Speed', wpm + ' wpm']], note: note });
        if(course){ var x = sh.root.querySelector('.tcg-stat.xp b'); if(x) x.textContent = won ? '+100' : '+0'; }
        var res = U.result(score, isBest, xp, { wpm: wpm, accuracy: acc, hearts: S.hearts, seconds: Math.round(ms / 1000), damage: S.dealt },
          [], { won: won, accuracy: acc, hearts: S.hearts, bossId: S.boss.id });
        if(course){ res.xp = won ? 100 : 0; res.lessonId = ctx.bossLesson.id || S.boss.id; }
        sh.end(res);
      }, fx === 'off' ? 0 : 800);
    }
    sh.showStart();
    return { destroy: function(){ offKeys(); loop.destroy(); S = null; sh.destroy(); } };
  }

  G.register({ id: 'boss', title: 'Boss Battles', accent: 'red', trains: 'the whole unit',
    blurb: 'The checkpoint that ends each unit. Correct words hit the boss, mistakes heal it.', scene: SCENE, mount: mount });
})();
