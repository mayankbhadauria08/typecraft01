/* Tug-of-War — race a bot typist, best of three rounds, animated rope and flag.
   Bots: Steady, Sprinter (fast start, then fades), Late Surger (slow start,
   fast finish), at 30/45/60/80 wpm as today. The bot starts on your first key. */
(function(){
  'use strict';
  var G = window.TC_GAMES, U = G.util;
  var BOTS = {
    steady: { name: 'Steady', rate: function(p){ return 1; } },
    sprinter: { name: 'Sprinter', rate: function(p){ return 1.45 - 0.9 * p; } },
    surger: { name: 'Late Surger', rate: function(p){ return 0.55 + 0.9 * p; } }
  };

  var SCENE = '<svg class="tcg-scene" viewBox="0 0 240 120" aria-hidden="true">' +
    '<path class="ln2" d="M120 20v70" stroke-dasharray="3 5"/><path class="bs" d="M46 62h148"/><path class="ts" d="M100 64V30"/><path class="tl" d="M100 30l18 7-18 7z"/>' +
    '<rect class="pl" x="14" y="46" width="32" height="32" rx="7"/><text x="30" y="66">you</text>' +
    '<rect class="pl" x="194" y="46" width="32" height="32" rx="7"/><text x="210" y="66">bot</text>' +
    '<text x="120" y="110" class="dim">round 2 of 3</text></svg>';

  function mount(el, ctx){
    var sh = U.shell(el, {
      id: 'tug', title: 'Tug-of-War', accent: 'brass', ctx: ctx,
      blurb: 'Out-type the bot to pull the flag to your side. Best of three rounds.',
      how: [
        'Each correct key pulls the rope your way. A wrong key does not move you on: fix it and keep going.',
        'The bot starts pulling on your first key. Finish the passage before it does.',
        'Win two rounds to take the match.'
      ],
      options: [
        { key: 'bot', label: 'Opponent', value: 'steady', values: [['steady', 'Steady'], ['sprinter', 'Sprinter'], ['surger', 'Late Surger']] },
        { key: 'wpm', label: 'Bot speed', value: 45, values: [[30, '30'], [45, '45'], [60, '60'], [80, '80 wpm']] }
      ],
      onStart: start
    });
    var fx = sh.fx, words = U.words(ctx), S = null, line = null, loop = U.loop(step);
    var arena = U.h('div', 'tug-arena');
    arena.innerHTML =
      '<div class="tug-top"><span class="tug-round"></span><span class="tug-pips"></span></div>' +
      '<svg class="tug-svg" viewBox="0 0 600 150" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' +
        '<path class="tug-ground" d="M10 118H590"/>' +
        '<path class="tug-zone you" d="M150 30V128"/><path class="tug-zone bot" d="M450 30V128"/><path class="tug-mid" d="M300 40V128"/>' +
        '<g class="tug-move">' +
          '<path class="tug-rope" d="M80 86Q300 96 520 86"/>' +
          '<g class="tug-flag"><path class="tug-pole" d="M300 92V44"/><path class="tug-cloth" d="M300 44l30 10-30 10z"/></g>' +
          '<g class="tug-you"><rect x="34" y="62" width="50" height="48" rx="10"/><text x="59" y="91">you</text></g>' +
          '<g class="tug-bot"><rect x="516" y="62" width="50" height="48" rx="10"/><text x="541" y="91">bot</text></g>' +
        '</g>' +
      '</svg>' +
      '<div class="tug-line"></div>';
    sh.stage.appendChild(arena);
    var mover = arena.querySelector('.tug-move'), rope = arena.querySelector('.tug-rope'), cloth = arena.querySelector('.tug-cloth');
    var botText = arena.querySelector('.tug-bot text'), lineHost = arena.querySelector('.tug-line');

    function passage(){
      var t = '';
      while(t.length < 72) t += (t ? ' ' : '') + U.pick(words);
      return t;
    }
    function start(ch){
      var bot = BOTS[ch.bot] || BOTS.steady;
      S = { bot: bot, botKey: ch.bot, wpm: +ch.wpm || 45, round: 0, you: 0, them: 0, tally: U.tally(), activeMs: 0, typedChars: 0, over: false };
      botText.textContent = 'bot';
      nextRound();
      loop.reset(); loop.start();
    }
    function nextRound(){
      S.round++;
      S.text = passage(); S.i = 0; S.b = 0; S.started = false; S.pause = 0; S.roundStart = 0;
      if(line) line.destroy();
      line = U.typeLine(lineHost, S.text);
      arena.querySelector('.tug-round').textContent = 'Round ' + S.round + ' of 3';
      pips(); hud(); place(0);
    }
    function pips(){
      var h = '';
      for(var i = 0; i < 2; i++) h += '<i class="' + (i < S.you ? 'win' : '') + '"></i>';
      h += '<span>vs</span>';
      for(var j = 0; j < 2; j++) h += '<i class="' + (j < S.them ? 'loss' : '') + '"></i>';
      arena.querySelector('.tug-pips').innerHTML = h;
    }
    function liveWpm(){ return S.activeMs > 800 ? Math.round(S.typedChars / 5 / (S.activeMs / 60000)) : 0; }
    function hud(){
      sh.setHud('<span class="tcg-chip">You <b>' + liveWpm() + '</b> wpm</span><span class="tcg-chip b">' + U.esc(S.bot.name) + ' <b>' + S.wpm + '</b> wpm</span>');
    }
    var lastHud = 0, wig = 0;
    function place(o){
      /* o in [-1,1]: positive means you are ahead, flag moves left toward you */
      var dx = -o * 150;
      mover.setAttribute('transform', 'translate(' + dx.toFixed(1) + ' 0)');
      if(fx !== 'off'){
        var sag = 10 + Math.sin(wig * 5) * (fx === 'full' ? 4 : 0);
        rope.setAttribute('d', 'M80 86Q300 ' + (86 + sag).toFixed(1) + ' 520 86');
        cloth.setAttribute('d', 'M300 44l30 ' + (10 + (fx === 'full' ? Math.sin(wig * 9) * 3 : 0)).toFixed(1) + '-30 10z');
      }
    }
    function onKey(e){
      if(sh.key(e)) return false;
      if(!S || S.over || S.pause > 0 || e.key.length !== 1) return;
      var now = loop.now();
      if(!S.started){ S.started = true; S.roundStart = now; }
      var exp = S.text[S.i];
      if(e.key === exp){
        S.tally.hit(true, now); line.advance(S.i); S.i++; S.typedChars++;
        U.sound(ctx, 'key');
        if(S.i >= S.text.length) endRound(true);
      } else {
        S.tally.hit(false, now); line.miss(S.i); U.sound(ctx, 'error');
      }
    }
    var offKeys = U.keys(onKey);
    function endRound(won){
      if(won) S.you++; else S.them++;
      pips();
      U.sound(ctx, won ? 'ding' : 'error');
      if(S.you >= 2 || S.them >= 2){ S.over = true; setTimeout(finish, fx === 'off' ? 0 : 900); return; }
      sh.banner(won ? 'Round to you' : 'Round to the bot', 'Round ' + (S.round + 1) + ' next');
      S.pause = 1.6; S.started = false;
    }
    function step(dt, now){
      if(!S) return;
      wig += dt;
      if(S.pause > 0){ S.pause -= dt; if(S.pause <= 0 && !S.over) nextRound(); return; }
      if(S.started && !S.over){
        S.activeMs += dt * 1000;
        var len = S.text.length, cps = S.wpm * 5 / 60;
        S.b = Math.min(len, S.b + cps * S.bot.rate(S.b / len) * dt);
        var o = (S.i - S.b) / len * 1.6;
        place(U.clamp(o, -1, 1));
        if(now - lastHud > 250){ lastHud = now; hud(); }
        if(S.b >= len) endRound(false);
      } else if(fx === 'full' && !S.over){ place(0); }
    }
    function finish(){
      if(!S) return;
      loop.stop();
      var won = S.you >= 2, wpm = liveWpm(), acc = S.tally.accuracy();
      var badges = won && S.wpm >= 80 ? ['tug_80'] : [];
      var xp = won ? 20 + wpm / 3 : 5 + wpm / 4;
      U.sound(ctx, won ? 'win' : 'lose');
      var isBest = sh.showEnd({ title: won ? 'You pulled the flag' : 'The bot out-pulled you', score: wpm, scoreLabel: 'Your speed (wpm)', xp: xp,
        badgeNames: U.badgeNames(badges), rows: [['Rounds', S.you + ' - ' + S.them], ['Bot', S.bot.name + ' ' + S.wpm + ' wpm'], ['Accuracy', acc + '%']] });
      sh.end(U.result(wpm, isBest, xp, { wpm: wpm, accuracy: acc, won: won, rounds: [S.you, S.them], bot: S.botKey, botWpm: S.wpm, seconds: Math.round(S.activeMs / 1000) }, badges));
    }
    sh.showStart();
    return { destroy: function(){ offKeys(); loop.destroy(); if(line) line.destroy(); S = null; sh.destroy(); } };
  }

  G.register({ id: 'tug', title: 'Tug-of-War', accent: 'brass', trains: 'holding a pace',
    blurb: 'Best of three rounds against bots that type differently: steady, sprinter, late surger.', scene: SCENE, mount: mount });
})();
