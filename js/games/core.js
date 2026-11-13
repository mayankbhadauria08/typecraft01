/* TypeCraft arcade core: window.TC_GAMES
   Registry plus the small helpers every game shares (keyboard, game clock that
   pauses with the tab, particles, effects level, word pickers, the start/end
   screen shell). Classic script, no imports. See docs/CONTRACTS.md "Arcade". */
(function(){
  'use strict';
  var games = [], byId = {};

  var G = window.TC_GAMES = {
    register: function(def){
      if(!def || !def.id || typeof def.mount !== 'function') throw new Error('TC_GAMES.register: id and mount required');
      if(byId[def.id]){ games = games.filter(function(g){ return g.id !== def.id; }); }
      byId[def.id] = def; games.push(def);
      return def;
    },
    list: function(){ return games.slice(); },
    get: function(id){ return byId[id] || null; },
    ORDER: ['storm','beat','tug','ghost','pop','tower','safe','boss']
  };
  var U = G.util = {};

  /* ---------- small utils ---------- */
  U.clamp = function(v, a, b){ return v < a ? a : v > b ? b : v; };
  U.rand = function(a, b){ return a + Math.random() * (b - a); };
  U.randInt = function(a, b){ return Math.floor(a + Math.random() * (b - a + 1)); };
  U.pick = function(arr){ return arr[Math.floor(Math.random() * arr.length)]; };
  U.shuffle = function(arr){ var a = arr.slice(); for(var i = a.length - 1; i > 0; i--){ var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  U.esc = function(s){ return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
  U.h = function(tag, cls, html){ var e = document.createElement(tag); if(cls) e.className = cls; if(html != null) e.innerHTML = html; return e; };
  U.xp = function(v){ return Math.round(U.clamp(v || 0, 0, 50)); };
  U.sound = function(ctx, name){ try{ if(ctx && typeof ctx.sound === 'function') ctx.sound(name); }catch(e){} };
  /* 'full' | 'light' | 'off' — ctx wins, then the page setting, then reduced motion */
  U.fx = function(ctx){
    var v = ctx && ctx.effects;
    if(v !== 'full' && v !== 'light' && v !== 'off'){
      v = document.documentElement.getAttribute('data-fx');
      if(v !== 'full' && v !== 'light' && v !== 'off'){
        v = (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) ? 'light' : 'full';
      }
    }
    return v;
  };
  /* Particle count multiplier for an effects level */
  U.fxScale = function(fx){ return fx === 'full' ? 1 : fx === 'light' ? 0.35 : 0; };

  /* ---------- words ---------- */
  /* Clean list of typeable words (no whitespace), deduped. Falls back to
     pseudo-words built from the learner's letters so every game can run. */
  U.words = function(ctx){
    var seen = {}, out = [];
    (ctx && ctx.words || []).forEach(function(w){
      w = String(w || '').trim();
      if(!w || /\s/.test(w) || seen[w]) return;
      seen[w] = 1; out.push(w);
    });
    if(out.length < 6){
      var letters = U.letters(ctx);
      for(var i = 0; out.length < 24 && i < 200; i++){
        var n = U.randInt(2, 4), w = '';
        for(var k = 0; k < n; k++) w += U.pick(letters);
        if(!seen[w]){ seen[w] = 1; out.push(w); }
      }
    }
    return out;
  };
  /* Learned single characters, excluding whitespace. Defaults to the home row. */
  U.chars = function(ctx){
    var s = (ctx && ctx.chars) || 'asdfghjkl;', seen = {}, out = [];
    for(var i = 0; i < s.length; i++){ var c = s[i]; if(c.trim() && !seen[c]){ seen[c] = 1; out.push(c); } }
    return out.length ? out : 'asdfjkl'.split('');
  };
  U.letters = function(ctx){
    var l = U.chars(ctx).filter(function(c){ return /[a-z]/.test(c); });
    return l.length ? l : 'asdfjkl'.split('');
  };
  U.byLen = function(words, min, max){
    var r = words.filter(function(w){ return w.length >= min && w.length <= max; });
    return r;
  };
  /* Pick a word, avoiding recent repeats */
  U.picker = function(list){
    var recent = [];
    return function(){
      if(!list.length) return '';
      var w, tries = 0;
      do { w = U.pick(list); tries++; } while(recent.indexOf(w) >= 0 && tries < 8);
      recent.push(w); if(recent.length > Math.min(6, Math.floor(list.length / 2))) recent.shift();
      return w;
    };
  };
  U.passage = function(words, n){
    var p = U.picker(words), out = [];
    for(var i = 0; i < n; i++) out.push(p());
    return out.join(' ');
  };
  /* Deterministic hash for date strings (FNV-1a) */
  U.hash = function(str){
    var h = 2166136261;
    for(var i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };

  /* ---------- keyboard ---------- */
  /* Attach one keydown listener for a mounted game. fn(e) runs synchronously.
     Ignores Ctrl/Cmd/Alt combos, IME composition and keys typed into fields.
     Printable keys, Space and Backspace are prevented so the page never scrolls. */
  U.keys = function(fn){
    function onKey(e){
      if(e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      var t = e.target;
      if(t && t !== document.body && t.nodeType === 1){
        var tag = t.tagName;
        if(tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable) return;
      }
      if(e.key && (e.key.length === 1 || e.key === 'Backspace')){
        /* let Space/Enter activate a focused button when the game is not listening */
        if(fn(e) !== false) e.preventDefault();
        return;
      }
      fn(e);
    }
    document.addEventListener('keydown', onKey);
    return function(){ document.removeEventListener('keydown', onKey); };
  };

  /* ---------- game clock ---------- */
  /* requestAnimationFrame loop with its own clock (ms) that stops while the tab
     is hidden, so timers, bots and beats all pause together.
     step(dtSeconds, nowMs). loop.now() is the clock right now (for key timing). */
  U.loop = function(step){
    var acc = 0, last = 0, raf = 0, on = false, hidden = document.hidden;
    function tick(ts){
      raf = 0;
      if(!on || hidden) return;
      var dt = last ? ts - last : 16; if(dt > 100) dt = 100; if(dt < 0) dt = 0;
      last = ts; acc += dt;
      step(dt / 1000, acc);
      if(on && !hidden && !raf) raf = requestAnimationFrame(tick);
    }
    function vis(){
      hidden = document.hidden;
      if(hidden){ if(raf) cancelAnimationFrame(raf); raf = 0; last = 0; }
      else if(on && !raf){ last = 0; raf = requestAnimationFrame(tick); }
    }
    document.addEventListener('visibilitychange', vis);
    var api = {
      start: function(){ if(on) return api; on = true; last = 0; if(!hidden) raf = requestAnimationFrame(tick); return api; },
      stop: function(){ on = false; if(raf) cancelAnimationFrame(raf); raf = 0; last = 0; return api; },
      reset: function(){ acc = 0; last = 0; return api; },
      now: function(){
        if(!on || hidden || !last) return acc;
        var d = performance.now() - last; if(d > 100) d = 100; if(d < 0) d = 0;
        return acc + d;
      },
      running: function(){ return on; },
      destroy: function(){ api.stop(); document.removeEventListener('visibilitychange', vis); }
    };
    return api;
  };

  /* ---------- canvas ---------- */
  /* A canvas that fills its parent's width, sized for the device pixel ratio.
     ratio = height/width, clamped between minH and maxH css px. */
  U.canvas = function(parent, ratio, minH, maxH){
    var cv = document.createElement('canvas'); cv.className = 'tcg-canvas';
    parent.appendChild(cv);
    var c2d = cv.getContext('2d');
    var api = { cv: cv, c: c2d, w: 0, h: 0, dpr: 1, onresize: null };
    function size(){
      var w = parent.clientWidth || 600, h = Math.round(U.clamp(w * ratio, minH || 240, maxH || 480));
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      if(w === api.w && h === api.h && dpr === api.dpr) return;
      api.w = w; api.h = h; api.dpr = dpr;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      cv.style.height = h + 'px';
      c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      if(api.onresize) api.onresize(w, h);
    }
    size();
    var ro = window.ResizeObserver ? new ResizeObserver(size) : null;
    if(ro) ro.observe(parent); else window.addEventListener('resize', size);
    api.resize = size;
    api.destroy = function(){ if(ro) ro.disconnect(); else window.removeEventListener('resize', size); };
    return api;
  };
  /* Theme colours read from CSS tokens (canvas cannot read var()) */
  U.palette = function(el){
    var cs = getComputedStyle(el || document.documentElement);
    function v(n, f){ var x = cs.getPropertyValue(n).trim(); return x || f; }
    return {
      bg: v('--bg', '#101716'), surface: v('--surface', '#172120'), raise: v('--raise', '#1e2a28'),
      text: v('--text', '#ece7d9'), muted: v('--muted', '#96a39e'), line: v('--line-strong', 'rgba(236,231,217,.26)'),
      teal: v('--teal', '#5fd6c0'), tealInk: v('--teal-ink', '#0b1514'), violet: v('--violet', '#a594ff'),
      brass: v('--brass', '#e2b65f'), red: v('--red', '#ff7b6e'), mono: v('--mono', 'monospace') || 'monospace',
      display: v('--display', 'Georgia, serif')
    };
  };
  U.roundRect = function(c, x, y, w, h, r){
    r = Math.min(r, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  };

  /* ---------- particles ---------- */
  U.particles = function(fx){
    var list = [], scale = U.fxScale(fx);
    return {
      burst: function(x, y, color, n, speed){
        n = Math.round((n || 16) * scale); speed = speed || 160;
        for(var i = 0; i < n && list.length < 400; i++){
          var a = Math.random() * Math.PI * 2, s = speed * (0.35 + Math.random() * 0.8);
          list.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * 0.2, life: 0.5 + Math.random() * 0.5, age: 0, r: 1.2 + Math.random() * 2.4, color: color });
        }
      },
      step: function(dt){
        for(var i = list.length - 1; i >= 0; i--){
          var p = list[i]; p.age += dt;
          if(p.age >= p.life){ list.splice(i, 1); continue; }
          p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt; p.vx *= 0.985;
        }
      },
      draw: function(c){
        for(var i = 0; i < list.length; i++){
          var p = list[i]; c.globalAlpha = 1 - p.age / p.life; c.fillStyle = p.color;
          c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.283); c.fill();
        }
        c.globalAlpha = 1;
      },
      clear: function(){ list.length = 0; },
      count: function(){ return list.length; }
    };
  };

  /* Short shake of an element; nothing unless effects are full */
  U.shake = function(el, fx){
    if(fx !== 'full' || !el) return;
    el.classList.remove('tcg-shake'); void el.offsetWidth; el.classList.add('tcg-shake');
  };
  /* Restartable CSS class pulse */
  U.pulse = function(el, cls){ if(!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

  /* ---------- typing tally ---------- */
  U.tally = function(){
    var t = { ok: 0, bad: 0, start: 0, end: 0,
      hit: function(good, now){ if(!t.start) t.start = now || 1; if(good) t.ok++; else t.bad++; },
      accuracy: function(){ var n = t.ok + t.bad; return n ? Math.round(t.ok / n * 1000) / 10 : 100; },
      wpm: function(ms){ return ms > 500 ? Math.round(t.ok / 5 / (ms / 60000)) : 0; }
    };
    return t;
  };

  /* ---------- typing line (tug, ghost, daily) ---------- */
  /* Renders a passage as spans; advance(i) marks char i typed, miss(i) flashes
     the char red. Keeps the caret line in view without moving finished text
     while typing (it scrolls one line only when the caret wraps). */
  U.typeLine = function(parent, text){
    var box = U.h('div', 'tcg-text'), inner = U.h('div', 'tcg-text-in');
    box.appendChild(inner); parent.appendChild(box);
    var spans = [], frag = document.createDocumentFragment(), word = null;
    for(var i = 0; i < text.length; i++){
      var ch = text[i];
      if(!word){ word = U.h('span', 'tcg-w'); frag.appendChild(word); }
      var s = document.createElement('span'); s.className = 'tcg-c';
      s.textContent = ch === ' ' ? ' ' : ch;
      word.appendChild(s); spans.push(s);
      if(ch === ' ') word = null;
    }
    inner.appendChild(frag);
    var cur = 0, lastBad = -1, lineTop = 0;
    if(spans[0]) spans[0].classList.add('cur');
    function follow(){
      var s = spans[cur]; if(!s) return;
      var top = s.offsetTop;
      if(top !== lineTop){ lineTop = top; inner.style.transform = 'translateY(' + (-Math.max(0, top - s.offsetHeight * 0.1 - 0)) + 'px)'; }
    }
    return {
      el: box,
      advance: function(i){
        if(lastBad >= 0 && spans[lastBad]){ spans[lastBad].classList.remove('bad'); lastBad = -1; }
        if(spans[i]){ spans[i].classList.remove('cur'); spans[i].classList.add('ok'); }
        cur = i + 1;
        if(spans[cur]){ spans[cur].classList.add('cur'); if(text[i] === ' ' || spans[cur].offsetTop !== lineTop) follow(); }
      },
      miss: function(i){
        var s = spans[i]; if(!s) return;
        s.classList.add('bad', 'was'); lastBad = i;
      },
      reset: function(){ inner.style.transform = ''; lineTop = 0; },
      destroy: function(){ if(box.parentNode) box.parentNode.removeChild(box); }
    };
  };

  /* ---------- the shell: start screen, HUD, stage, end screen ---------- */
  /* opts: { id, title, accent, how:[...lines], options:[{key,label,values:[[v,label]],value}],
            ctx, onStart(choices), onBack } */
  U.shell = function(el, opts){
    var ctx = opts.ctx || {}, fx = U.fx(ctx);
    var root = U.h('div', 'tcg tcg-' + opts.id);
    root.setAttribute('data-fx', fx);
    root.setAttribute('data-accent', opts.accent || 'teal');
    root.innerHTML =
      '<div class="tcg-bar">' +
        '<button type="button" class="tcg-back" aria-label="Back to the arcade">&larr; Arcade</button>' +
        '<h2 class="tcg-title">' + U.esc(opts.title) + '</h2>' +
        '<div class="tcg-hud" aria-live="off"></div>' +
      '</div>' +
      '<div class="tcg-stage"></div>' +
      '<div class="tcg-over" hidden><div class="tcg-panel" role="dialog" aria-modal="false"></div></div>';
    el.innerHTML = ''; el.appendChild(root);
    var stage = root.querySelector('.tcg-stage'), hud = root.querySelector('.tcg-hud');
    var over = root.querySelector('.tcg-over'), panel = root.querySelector('.tcg-panel');
    var choices = {}, sessionBest = (typeof ctx.best === 'number') ? ctx.best : null;
    var mode = 'start', primary = null;
    (opts.options || []).forEach(function(o){ choices[o.key] = o.value; });

    function back(){ if(typeof ctx.onBack === 'function') ctx.onBack(); else if(typeof opts.onBack === 'function') opts.onBack(); }
    root.querySelector('.tcg-back').addEventListener('click', back);

    function optionsHtml(){
      return (opts.options || []).filter(function(o){ return o.values && o.values.length > 1; }).map(function(o){
        return '<div class="tcg-opt"><span class="tcg-opt-l">' + U.esc(o.label) + '</span><div class="tcg-seg" role="group" aria-label="' + U.esc(o.label) + '">' +
          o.values.map(function(v){
            return '<button type="button" data-k="' + U.esc(o.key) + '" data-v="' + U.esc(v[0]) + '" aria-pressed="' + (String(choices[o.key]) === String(v[0])) + '">' + U.esc(v[1]) + '</button>';
          }).join('') + '</div></div>';
      }).join('');
    }
    function showPanel(html){
      panel.innerHTML = html; over.hidden = false;
      /* grow the frame so the whole panel (and its buttons) fits without scrolling */
      fit();
      panel.querySelectorAll('.tcg-seg button').forEach(function(b){
        b.addEventListener('click', function(){
          var k = b.getAttribute('data-k'), raw = b.getAttribute('data-v');
          var o = (opts.options || []).filter(function(x){ return x.key === k; })[0];
          var val = o.values.filter(function(v){ return String(v[0]) === raw; })[0];
          choices[k] = val ? val[0] : raw;
          b.parentNode.querySelectorAll('button').forEach(function(x){ x.setAttribute('aria-pressed', String(x === b)); });
          if(opts.onChoice) opts.onChoice(k, choices[k], choices);
        });
      });
      var bk = panel.querySelector('[data-act="back"]'); if(bk) bk.addEventListener('click', back);
      primary = panel.querySelector('[data-act="go"]');
      if(primary){ primary.addEventListener('click', go); try{ primary.focus({ preventScroll: true }); }catch(e){} }
    }
    function fit(){
      root.style.minHeight = '';
      var need = panel.scrollHeight + 28;
      if(need > root.clientHeight) root.style.minHeight = need + 'px';
    }
    function go(){
      over.hidden = true; panel.innerHTML = ''; mode = 'play'; primary = null; root.style.minHeight = '';
      try{ root.focus && stage.focus({ preventScroll: true }); }catch(e){}
      opts.onStart(choices);
    }
    var api = {
      root: root, stage: stage, hud: hud, fx: fx, ctx: ctx, choices: choices,
      mode: function(){ return mode; },
      /* Enter on start / end screens; returns true if consumed */
      key: function(e){
        if(mode !== 'play' && e.key === 'Enter' && primary){ e.preventDefault(); primary.click(); return true; }
        return mode !== 'play';
      },
      setHud: function(html){ hud.innerHTML = html; },
      fit: fit,
      showStart: function(extraHtml){
        mode = 'start';
        var how = (opts.how || []).map(function(l){ return '<li>' + l + '</li>'; }).join('');
        showPanel(
          '<p class="tcg-eyebrow">Arcade</p><h3 class="tcg-h">' + U.esc(opts.title) + '</h3>' +
          (opts.blurb ? '<p class="tcg-lede">' + U.esc(opts.blurb) + '</p>' : '') +
          (how ? '<ul class="tcg-how">' + how + '</ul>' : '') +
          (extraHtml || '') + optionsHtml() +
          '<div class="tcg-actions"><button type="button" class="tcg-btn" data-act="go">Start</button>' +
          (sessionBest != null ? '<span class="tcg-best">Best <b>' + sessionBest + '</b></span>' : '') + '</div>' +
          '<p class="tcg-tip">Press Enter to start</p>'
        );
      },
      /* res: { title, score, scoreLabel, xp, rows:[[label,value]], badges:[], note } — returns isBest */
      showEnd: function(res){
        mode = 'end';
        var isBest = res.score > 0 && (sessionBest == null || res.score > sessionBest);
        if(isBest) sessionBest = res.score;
        var rows = (res.rows || []).map(function(r){ return '<div class="tcg-stat"><span>' + U.esc(r[0]) + '</span><b>' + U.esc(r[1]) + '</b></div>'; }).join('');
        var badges = (res.badgeNames || []).map(function(b){ return '<span class="tcg-badge">' + U.esc(b) + '</span>'; }).join('');
        showPanel(
          '<p class="tcg-eyebrow">' + U.esc(res.eyebrow || 'Run complete') + '</p>' +
          '<h3 class="tcg-h">' + U.esc(res.title || 'Game over') + '</h3>' +
          '<div class="tcg-score"><span>' + U.esc(res.scoreLabel || 'Score') + '</span><b>' + U.esc(res.score) + '</b>' +
            (isBest ? '<em class="tcg-new">New best</em>' : '') + '</div>' +
          '<div class="tcg-stats"><div class="tcg-stat"><span>Best</span><b>' + (sessionBest != null ? sessionBest : res.score) + '</b></div>' +
            '<div class="tcg-stat xp"><span>XP</span><b>+' + U.xp(res.xp) + '</b></div>' + rows + '</div>' +
          (badges ? '<div class="tcg-badges" aria-label="Badges earned">' + badges + '</div>' : '') +
          (res.note ? '<p class="tcg-note">' + U.esc(res.note) + '</p>' : '') +
          '<div class="tcg-actions"><button type="button" class="tcg-btn" data-act="go">' + U.esc(res.again || 'Play again') + '</button>' +
          '<button type="button" class="tcg-btn ghost" data-act="back">Back</button></div>' +
          '<p class="tcg-tip">Press Enter to play again</p>'
        );
        return isBest;
      },
      /* A small overlay message between rounds; no buttons */
      banner: function(text, sub){
        var b = U.h('div', 'tcg-banner', '<b>' + U.esc(text) + '</b>' + (sub ? '<span>' + U.esc(sub) + '</span>' : ''));
        stage.appendChild(b);
        setTimeout(function(){ if(b.parentNode) b.parentNode.removeChild(b); }, 1500);
      },
      end: function(payload){ try{ if(typeof ctx.onEnd === 'function') ctx.onEnd(payload); }catch(e){ if(window.console) console.error(e); } },
      destroy: function(){ el.innerHTML = ''; }
    };
    return api;
  };

  /* Common onEnd payload builder */
  U.result = function(score, isBest, xp, stats, badges, extra){
    var r = { score: score, best: !!isBest, xp: U.xp(xp), stats: stats || {}, badges: badges || [] };
    if(extra) for(var k in extra) r[k] = extra[k];
    return r;
  };
  U.BADGE_NAMES = { storm_1000: 'Storm Chaser', beat_30: 'On the Beat', tug_80: 'Rope Burn', ghost_beat: 'Ghost Beaten', tower_25: 'Sky High', safe_10: 'Safe Hands' };
  U.badgeNames = function(ids){ return (ids || []).map(function(i){ return U.BADGE_NAMES[i] || i; }); };
})();
