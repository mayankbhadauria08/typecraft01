/* TypeCraft rewards and progress UI -> window.TC_REWARDS_UI
   Classic script, no imports, no fetching. Every renderer takes plain data and
   returns an HTML string; TC_REWARDS_UI.enhance(rootEl) adds the small bits of
   behaviour (medal flip on click, XP count-up, certificate print buttons).
   Styles live in css/rewards.css (class prefix "rw-").
   Data shapes follow docs/CONTRACTS.md (GET /api/user/state) and today's
   browser stats: keyStats {ch:{attempts,errors}}, bigramLatency {"a>b":{count,totalMs}},
   errorClasses {adjacent,transposition,omission,other}, run samples [{t,wpm}],
   history [{date:'YYYY-MM-DD', minutes, runs, bestWpm, avgAccuracy, xp, quests, freeze?}]. */
(function (root) {
  'use strict';

  /* ---------- helpers ---------- */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : (d === undefined ? 0 : d));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const round = (v) => Math.round(num(v));
  const fmtInt = (v) => round(v).toLocaleString('en-GB');
  let uid = 0;
  const nextId = (p) => 'rw' + p + (++uid);

  function parseDate(v) {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) { const [y, m, d] = v.split('-').map(Number); return new Date(y, m - 1, d); }
    const d = new Date(v); return isNaN(d) ? null : d;
  }
  function fmtDate(v) {
    const d = parseDate(v); if (!d) return '';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function fmtClock(sec) { sec = Math.max(0, round(sec)); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }
  function fmtMinutes(min) {
    min = Math.max(0, round(min));
    if (min < 60) return min + ' min';
    const h = Math.floor(min / 60), m = min % 60;
    return h + ' h' + (m ? ' ' + m + ' min' : '');
  }
  function testLength(sec) {
    sec = round(sec);
    if (sec >= 60 && sec % 60 === 0) return (sec / 60) + '-minute test';
    return sec + '-second test';
  }
  function plural(n, one, many) { return n === 1 ? one : (many || one + 's'); }

  /* Motion: the CSS does most of it; JS only needs to know for count-ups. */
  function motionLevel() {
    const fx = document.documentElement.getAttribute('data-fx') || 'full';
    const reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (fx === 'off' || reduce) return 'off';
    return fx;
  }

  /* ---------- ranks ---------- */
  const DEFAULT_RANKS = [['Apprentice', 0], ['Copyist', 300], ['Clerk', 900], ['Stenographer', 2000], ['Correspondent', 4000], ['Editor', 7000], ['Master Typist', 11000]];
  const RANKS = () => (root.TC_META && root.TC_META.RANKS) || DEFAULT_RANKS;
  function rankFor(xp) {
    const list = RANKS(); let i = 0;
    for (let k = 0; k < list.length; k++) if (xp >= list[k][1]) i = k;
    const next = list[i + 1] || [null, null];
    return { index: i, name: list[i][0], min: list[i][1], next };
  }
  function rankInfo(state) {
    const xp = num(state && state.xp);
    const r = rankFor(xp);
    const nextMin = r.next[1];
    const pct = nextMin == null ? 100 : clamp(((xp - r.min) / (nextMin - r.min)) * 100, 0, 100);
    return { xp, index: r.index, name: r.name, min: r.min, nextName: r.next[0], nextMin, pct, toGo: nextMin == null ? 0 : nextMin - xp };
  }
  /* Rank emblem: a small keycap with the rank number (1-7). */
  function rankEmblem(index, size) {
    const s = size || 28;
    return '<svg class="rw-emblem" width="' + s + '" height="' + s + '" viewBox="0 0 32 32" aria-hidden="true">' +
      '<rect x="2" y="5" width="28" height="25" rx="7" class="rw-em-base"/>' +
      '<rect x="4" y="2" width="24" height="22" rx="6" class="rw-em-top"/>' +
      '<text x="16" y="17.5" text-anchor="middle" class="rw-em-text">' + (index + 1) + '</text></svg>';
  }

  function rankBar(state) {
    const r = rankInfo(state);
    const label = r.nextName ? fmtInt(r.xp) + ' of ' + fmtInt(r.nextMin) + ' XP to ' + r.nextName : fmtInt(r.xp) + ' XP, top rank';
    return '<div class="rw-rankbar" title="' + esc(label) + '">' + rankEmblem(r.index, 22) +
      '<span class="rw-rankbar-text"><span class="rw-rankbar-name">' + esc(r.name) + '</span>' +
      '<span class="rw-xpbar" role="progressbar" aria-label="' + esc(label) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + round(r.pct) + '">' +
      '<i style="width:' + r.pct.toFixed(1) + '%"></i></span></span>' +
      '<span class="rw-rankbar-xp">' + fmtInt(r.xp) + '<small> XP</small></span></div>';
  }

  function rankCard(state) {
    const r = rankInfo(state);
    const chips = RANKS().map((x, i) => {
      const cls = i < r.index ? 'got' : i === r.index ? 'here' : '';
      const sr = i < r.index ? ' (reached)' : i === r.index ? ' (your rank)' : ' (' + fmtInt(x[1]) + ' XP)';
      return '<li class="' + cls + '"' + (i === r.index ? ' aria-current="step"' : '') + '><span>' + esc(x[0]) + '</span><span class="rw-sr">' + esc(sr) + '</span>' +
        (i > r.index ? '<small aria-hidden="true">' + fmtInt(x[1]) + '</small>' : '') + '</li>';
    }).join('');
    const next = r.nextName
      ? '<b>' + fmtInt(r.toGo) + ' XP</b> to ' + esc(r.nextName)
      : 'Top rank reached. Every XP from here is for the record.';
    return '<section class="rw-card rw-rankcard" aria-label="Rank">' +
      '<div class="rw-rankcard-head">' + rankEmblem(r.index, 44) +
      '<div><p class="rw-eyebrow">Rank ' + (r.index + 1) + ' of ' + RANKS().length + '</p><h3>' + esc(r.name) + '</h3></div>' +
      '<p class="rw-rankcard-xp"><span class="rw-big">' + fmtInt(r.xp) + '</span> XP</p></div>' +
      '<div class="rw-xpbar rw-xpbar-lg" role="progressbar" aria-label="Progress to the next rank" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + round(r.pct) + '"><i style="width:' + r.pct.toFixed(1) + '%"></i></div>' +
      '<p class="rw-muted">' + next + '</p>' +
      '<ol class="rw-ranks">' + chips + '</ol></section>';
  }

  /* ---------- badges ---------- */
  /* Fallback list (the real one comes from shared/rewards-rules.js). Names and
     how-earned text follow the build prompt. glyph = text on the medal. */
  const B = (id, cat, name, glyph, how) => ({ id, cat, name, glyph, how });
  const FALLBACK_BADGES = [
    B('first_20', 'speed', 'First 20', '20', 'Reach 20 words per minute in a lesson or test.'),
    B('thirty_club', 'speed', 'Thirty Club', '30', 'Reach 30 words per minute in a lesson or test.'),
    B('forty_flat', 'speed', 'Forty Flat', '40', 'Reach 40 words per minute in a lesson or test.'),
    B('fifty_up', 'speed', 'Fifty Up', '50', 'Reach 50 words per minute in a lesson or test.'),
    B('sixty_plus', 'speed', 'Sixty Plus', '60', 'Reach 60 words per minute in a lesson or test.'),
    B('eighty_ace', 'speed', 'Eighty Ace', '80', 'Reach 80 words per minute in a lesson or test.'),
    B('clean_sheet', 'accuracy', 'Clean Sheet', '100', 'A lesson at 100%.'),
    B('triple_clean', 'accuracy', 'Triple Clean', '3x', 'Three 100% runs in a row.'),
    B('sharp_shooter', 'accuracy', 'Sharp Shooter', '98', '98% or better on ten lessons.'),
    B('no_slip', 'accuracy', 'No Slip', '0', 'A Sentences step with no mistake.'),
    B('steady_hand', 'accuracy', 'Steady Hand', '95', '95% or better on a 5-minute test.'),
    B('three_days', 'streak', 'Three Days', '3', 'Practise three days in a row.'),
    B('seven_days', 'streak', 'Seven Days', '7', 'Practise seven days in a row.'),
    B('two_weeks', 'streak', 'Two Weeks', '14', 'Practise fourteen days in a row.'),
    B('thirty_days', 'streak', 'Thirty Days', '30', 'Practise thirty days in a row.'),
    B('hundred_days', 'streak', 'Hundred Days', '100', 'Practise a hundred days in a row.'),
    B('home_row_hero', 'course', 'Home Row Hero', 'FJ', 'Three stars on every home row lesson.'),
    B('top_row_climber', 'course', 'Top Row Climber', 'ER', 'Finish the top row unit.'),
    B('number_cruncher', 'course', 'Number Cruncher', '12', 'Finish the numbers unit.'),
    B('bottom_row_diver', 'course', 'Bottom Row Diver', 'VM', 'Finish the bottom row unit.'),
    B('capital_idea', 'course', 'Capital Idea', 'Aa', 'Finish the capitals unit.'),
    B('symbol_master', 'course', 'Symbol Master', '#?', 'Finish the symbols unit.'),
    B('all_26', 'course', 'All 26', 'AZ', 'The All 26 letters lesson at 95% or better.'),
    B('master_typist', 'course', 'Master Typist', 'MT', 'Beat the final boss.'),
    B('boss_down', 'bosses', 'Boss Down', 'KO', 'Beat one boss.'),
    B('boss_hunter', 'bosses', 'Boss Hunter', 'KO3', 'Beat three bosses.'),
    B('boss_slayer', 'bosses', 'Boss Slayer', 'KO6', 'Beat all six bosses.'),
    B('storm_chaser', 'arcade', 'Storm Chaser', '1K', '1,000 points in Word Storm.'),
    B('on_the_beat', 'arcade', 'On the Beat', '30x', 'A 30 combo in Beat Keys.'),
    B('rope_burn', 'arcade', 'Rope Burn', '80', 'Beat the 80 words-per-minute bot in Tug-of-War.'),
    B('ghost_beaten', 'arcade', 'Ghost Beaten', 'PB', 'Beat your own replay in Ghost Race.'),
    B('sky_high', 'arcade', 'Sky High', '25', 'A tower of 25 in Word Tower.'),
    B('safe_hands', 'arcade', 'Safe Hands', '10', 'Ten safes in one run of Safe Cracker.'),
    B('early_bird', 'habit', 'Early Bird', '8am', 'Practise before 8 am.'),
    B('night_owl', 'habit', 'Night Owl', '10pm', 'Practise after 10 pm.'),
    B('daily_dozen', 'habit', 'Daily Dozen', '12', 'All three quests on twelve different days.'),
  ];
  /* Ids other parts may use for the same badge (CONTRACTS example: storm_1000). */
  const ALIASES = { storm_1000: 'storm_chaser', beat_30: 'on_the_beat', tug_80: 'rope_burn', ghost_pb: 'ghost_beaten', tower_25: 'sky_high', safe_10: 'safe_hands' };
  const CATS = [['speed', 'Speed'], ['accuracy', 'Accuracy'], ['streak', 'Streak'], ['course', 'Course'], ['bosses', 'Bosses'], ['arcade', 'Arcade'], ['habit', 'Habit']];
  /* Ribbon colours are part of the physical medal, like the preview's red ribbon. */
  const RIBBON = { speed: ['#c2452f', '#8f2f22'], accuracy: ['#1f8a7a', '#14615a'], streak: ['#d0702a', '#9a4e19'], course: ['#3d6fc4', '#29508f'], bosses: ['#7a4fc2', '#56368c'], arcade: ['#c23d8a', '#8c2a63'], habit: ['#4f8f3a', '#386628'] };

  function normDef(d) {
    if (!d) return null;
    const how = d.how || d.description || d.desc || d.text || '';
    return { id: d.id, cat: d.cat || d.category || d.group || 'course', name: d.name || d.title || d.id, glyph: d.glyph || d.icon || (d.name || d.id || '?').replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase(), how };
  }
  function defsOr(defs) {
    const list = Array.isArray(defs) && defs.length ? defs : (root.TC_RULES && Array.isArray(root.TC_RULES.BADGES) ? root.TC_RULES.BADGES : FALLBACK_BADGES);
    return list.map(normDef).filter(Boolean);
  }
  /* earned: [{id, at}] or {id: at} or [id] -> Map id -> at (or true) */
  function earnedMap(earned) {
    const m = new Map();
    const put = (id, at) => { if (!id) return; m.set(id, at || true); if (ALIASES[id]) m.set(ALIASES[id], at || true); };
    if (Array.isArray(earned)) earned.forEach((e) => (typeof e === 'string' ? put(e) : e && put(e.id, e.at)));
    else if (earned && typeof earned === 'object') Object.keys(earned).forEach((k) => put(k, earned[k]));
    return m;
  }
  function findDef(id, defs) {
    const list = defsOr(defs);
    const want = ALIASES[id] || id;
    return list.find((d) => d.id === id || d.id === want) || normDef({ id, name: id });
  }

  function medalSvg(badge, earned) {
    const g = nextId('g');
    const rib = earned ? (RIBBON[badge.cat] || RIBBON.course) : ['#77756d', '#5b5a54'];
    const stops = earned ? ['#f7e0a0', '#d9a84a', '#9c7223'] : ['#d6d3ca', '#a8a59c', '#76736b'];
    const ring = earned ? '#7a5a1e' : '#5f5d57';
    const ink = earned ? '#3a2a08' : '#2e2d2a';
    const glyph = String(badge.glyph || '');
    const fs = glyph.length > 3 ? 9.5 : glyph.length > 2 ? 11 : 14;
    return '<svg class="rw-medal-svg" viewBox="0 0 64 72" aria-hidden="true" focusable="false">' +
      '<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + stops[0] + '"/><stop offset=".5" stop-color="' + stops[1] + '"/><stop offset="1" stop-color="' + stops[2] + '"/></linearGradient></defs>' +
      '<path d="M21 40 15 69l9-6 7 7 2-28z" fill="' + rib[0] + '"/><path d="M43 40l6 29-9-6-7 7-2-28z" fill="' + rib[1] + '"/>' +
      '<circle cx="32" cy="28" r="22" fill="url(#' + g + ')"/>' +
      '<circle cx="32" cy="28" r="20" fill="none" stroke="' + ring + '" stroke-width=".8" stroke-dasharray="1 2.2" opacity=".7"/>' +
      '<circle cx="32" cy="28" r="16.5" fill="none" stroke="' + ring + '" stroke-width="1.5"' + (earned ? '' : ' stroke-dasharray="3 2"') + '/>' +
      '<path d="M18 16a18 18 0 0 1 14-6" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.6" stroke-linecap="round"/>' +
      '<text x="32" y="' + (28 + fs * 0.36).toFixed(1) + '" text-anchor="middle" font-family="IBM Plex Mono, ui-monospace, monospace" font-weight="600" font-size="' + fs + '" fill="' + ink + '">' + esc(glyph) + '</text></svg>';
  }

  /* One medal as a flip button. earned: boolean; at: ISO date string (optional). */
  function medal(badge, earned, at, opts) {
    const b = normDef(badge) || FALLBACK_BADGES[0];
    const o = opts || {};
    const isNew = !!o.isNew;
    const when = earned ? (at && at !== true ? 'Earned ' + fmtDate(at) : 'Earned') : 'Not earned yet';
    const label = b.name + '. ' + when + '. ' + b.how;
    const style = o.index != null ? ' style="--i:' + o.index + '"' : '';
    return '<button type="button" class="rw-medal' + (earned ? ' is-earned' : ' is-locked') + (isNew ? ' is-new' : '') + '" aria-pressed="false" aria-label="' + esc(label) + '" data-badge="' + esc(b.id) + '"' + style + '>' +
      '<span class="rw-flip" aria-hidden="true">' +
      '<span class="rw-face rw-front">' + medalSvg(b, earned) + '<span class="rw-bn">' + esc(b.name) + '</span>' +
      (earned ? '' : '<span class="rw-lock">Locked</span>') + '</span>' +
      '<span class="rw-face rw-back"><span class="rw-how">' + esc(b.how) + '</span><span class="rw-when' + (earned ? ' got' : '') + '">' + esc(when) + '</span></span>' +
      '</span></button>';
  }

  /* All badges, grouped by category, earned first within each group is NOT
     done: the order stays fixed so learners can find a badge again. */
  function badgeGrid(defs, earned, opts) {
    const list = defsOr(defs), got = earnedMap(earned), o = opts || {};
    const count = list.filter((d) => got.has(d.id)).length;
    const groups = CATS.map(([cat, title]) => [title, list.filter((d) => d.cat === cat)]);
    const known = new Set(CATS.map((c) => c[0]));
    const other = list.filter((d) => !known.has(d.cat));
    if (other.length) groups.push(['More', other]);
    const body = (o.grouped === false)
      ? '<div class="rw-medals">' + list.map((d) => medal(d, got.has(d.id), got.get(d.id))).join('') + '</div>'
      : groups.filter((g) => g[1].length).map(([title, items]) => {
        const n = items.filter((d) => got.has(d.id)).length;
        return '<div class="rw-badge-group"><h4>' + esc(title) + ' <span class="rw-muted">' + n + ' of ' + items.length + '</span></h4>' +
          '<div class="rw-medals">' + items.map((d) => medal(d, got.has(d.id), got.get(d.id))).join('') + '</div></div>';
      }).join('');
    return '<div class="rw-badgegrid"><p class="rw-muted rw-badge-count"><b>' + count + '</b> of ' + list.length + ' badges earned. Select a medal to turn it over.</p>' + body + '</div>';
  }

  /* ---------- certificate ---------- */
  function sealSvg(wpm) {
    let s = '';
    for (let i = 0; i < 12; i++) s += '<ellipse rx="17" ry="6.5" fill="none" stroke="#0b6e63" stroke-width=".7" transform="rotate(' + (i * 15) + ')"/>';
    return s + '<circle r="11" fill="#0b6e63"/><circle r="9.2" fill="none" stroke="#f6f0e1" stroke-width=".5"/>' +
      '<text y="3.4" text-anchor="middle" font-family="IBM Plex Mono, ui-monospace, monospace" font-weight="600" font-size="9" fill="#f6f0e1">' + esc(round(wpm)) + '</text>';
  }
  function certificate(c) {
    const cert = c || {};
    const name = (cert.name || '').trim() || 'Your name';
    const wpm = round(cert.wpm), acc = round(cert.accuracy);
    const date = fmtDate(cert.date || cert.at) || fmtDate(new Date());
    const len = testLength(num(cert.seconds, 60));
    const label = 'Certificate of typing speed: ' + wpm + ' words per minute at ' + acc + '% accuracy on a ' + len + ', awarded to ' + name + ' on ' + date;
    const nameSize = name.length > 26 ? 12 : name.length > 18 ? 13.5 : 15;
    return '<svg class="rw-cert" viewBox="0 0 320 210" role="img" aria-label="' + esc(label) + '" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="1" y="1" width="318" height="208" rx="6" fill="#f6f0e1" stroke="#cfc4aa"/>' +
      '<rect x="12" y="12" width="296" height="186" rx="3" fill="none" stroke="#0b6e63" stroke-width="1.5"/>' +
      '<rect x="17" y="17" width="286" height="176" rx="2" fill="none" stroke="#0b6e63" stroke-width=".6" stroke-dasharray="2 3"/>' +
      '<g fill="#0b6e63">' + [[12, 12], [308, 12], [12, 198], [308, 198]].map((p) => '<path transform="translate(' + p[0] + ' ' + p[1] + ')" d="M-3 0 0-3 3 0 0 3z"/>').join('') + '</g>' +
      '<text x="160" y="40" text-anchor="middle" font-family="IBM Plex Mono, ui-monospace, monospace" font-weight="500" font-size="8.5" letter-spacing="2.4" fill="#0b6e63">CERTIFICATE OF TYPING SPEED</text>' +
      '<text x="160" y="57" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-style="italic" font-size="10" fill="#6a6250">typecraft</text>' +
      '<text x="160" y="92" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-weight="560" font-size="24" fill="#26221b">' + wpm + ' words per minute</text>' +
      '<text x="160" y="113" text-anchor="middle" font-family="IBM Plex Sans, system-ui, sans-serif" font-size="10" fill="#5f5848">' + acc + '% accuracy · ' + esc(len) + '</text>' +
      '<text x="140" y="140" text-anchor="middle" font-family="IBM Plex Sans, system-ui, sans-serif" font-size="9.5" fill="#5f5848">awarded to</text>' +
      '<text x="140" y="164" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-style="italic" font-weight="500" font-size="' + nameSize + '" fill="#26221b">' + esc(name) + '</text>' +
      '<path d="M70 171h140" fill="none" stroke="#26221b" stroke-width=".8"/>' +
      '<text x="140" y="184" text-anchor="middle" font-family="IBM Plex Sans, system-ui, sans-serif" font-size="8.5" fill="#5f5848">' + esc(date) + '</text>' +
      '<g transform="translate(262 156)">' + sealSvg(wpm) + '</g></svg>';
  }
  /* Prints only the certificate: a temporary host + html.rw-printing (see print CSS). */
  function printCertificate(cert) {
    const doc = document, html = doc.documentElement;
    const host = doc.createElement('div');
    host.className = 'rw-print-host';
    host.innerHTML = certificate(cert);
    doc.body.appendChild(host);
    html.classList.add('rw-printing');
    let done = false;
    const cleanup = () => { if (done) return; done = true; html.classList.remove('rw-printing'); host.remove(); root.removeEventListener('afterprint', cleanup); };
    root.addEventListener('afterprint', cleanup);
    try { root.print(); } finally { setTimeout(cleanup, 1000); }
  }

  /* ---------- keyboard heatmap ---------- */
  const HEAT_ROWS = [['1234567890', 0], ['qwertyuiop', 0.5], ['asdfghjkl;', 0.75], ['zxcvbnm,./', 1.25]];
  const HEAT_LEVELS = [
    { cls: 'h0', word: 'not enough data' },
    { cls: 'h1', word: 'accurate', min: 96 },
    { cls: 'h2', word: 'shaky', min: 90 },
    { cls: 'h3', word: 'most mistakes', min: 0 },
  ];
  function keyAcc(stats, ch) {
    let a = 0, e = 0;
    [ch, ch.toUpperCase()].filter((v, i, arr) => arr.indexOf(v) === i).forEach((k) => { const s = stats[k]; if (s) { a += num(s.attempts); e += num(s.errors); } });
    return a ? { attempts: a, acc: ((a - e) / a) * 100 } : { attempts: 0, acc: null };
  }
  function heatLevel(acc, attempts, minAttempts) {
    if (acc == null || attempts < minAttempts) return 0;
    return acc >= 96 ? 1 : acc >= 90 ? 2 : 3;
  }
  function heatmap(keyStats, opts) {
    const stats = keyStats || {}, o = opts || {}, minA = o.minAttempts || 5;
    const rows = HEAT_ROWS.map(([keys, shift]) => '<div class="rw-hrow" style="--s:' + shift + '">' + keys.split('').map((ch) => {
      const k = keyAcc(stats, ch), lv = heatLevel(k.acc, k.attempts, minA);
      const pct = lv ? Math.floor(k.acc) + '%' : '·';
      const lab = ch.toUpperCase() + ': ' + (lv ? Math.floor(k.acc) + '% accurate over ' + k.attempts + ' presses, ' + HEAT_LEVELS[lv].word : 'not enough data');
      return '<span class="rw-hk ' + HEAT_LEVELS[lv].cls + '" role="img" aria-label="' + esc(lab) + '" title="' + esc(lab) + '"><b>' + esc(ch) + '</b><small>' + pct + '</small>' + (lv === 3 ? '<i class="rw-hk-flag" aria-hidden="true">!</i>' : '') + '</span>';
    }).join('') + '</div>').join('');
    const weak = [];
    HEAT_ROWS.forEach(([keys]) => keys.split('').forEach((ch) => { const k = keyAcc(stats, ch); if (heatLevel(k.acc, k.attempts, minA) === 3) weak.push([ch, k.acc]); }));
    weak.sort((a, b) => a[1] - b[1]);
    const summary = weak.length ? 'Most mistakes on ' + weak.slice(0, 5).map((w) => w[0].toUpperCase() + ' (' + Math.floor(w[1]) + '%)').join(', ') + '.' : 'No problem keys yet.';
    return '<div class="rw-heat" role="group" aria-label="Keyboard coloured by accuracy">' + rows + '</div>' +
      '<div class="rw-legend"><span><i class="rw-dot h1"></i>96% or better</span><span><i class="rw-dot h2"></i>90–95%, shaky</span><span><i class="rw-dot h3"></i>below 90%, marked !</span><span><i class="rw-dot h0"></i>· too few presses</span></div>' +
      '<p class="rw-muted">' + esc(summary) + '</p>';
  }

  /* ---------- slowest pairs and mistake types ---------- */
  function slowPairs(bigramLatency, opts) {
    const o = opts || {}, n = o.limit || 6, minCount = o.minCount || 3;
    const rows = Object.keys(bigramLatency || {}).map((k) => {
      const v = bigramLatency[k] || {}; const c = num(v.count);
      const parts = k.split('>');
      return { a: parts[0], b: parts[1] == null ? '' : parts[1], count: c, ms: c ? num(v.totalMs) / c : 0 };
    }).filter((r) => r.count >= minCount && r.ms > 0).sort((x, y) => y.ms - x.ms).slice(0, n);
    if (!rows.length) return '<p class="rw-empty">Type a few more lessons and your slowest key pairs show up here.</p>';
    const max = rows[0].ms;
    const show = (c) => (c === ' ' ? 'space' : c);
    return '<ol class="rw-bars rw-pairs">' + rows.map((r) => '<li><span class="rw-bar-label"><kbd>' + esc(show(r.a)) + '</kbd><span aria-hidden="true">→</span><span class="rw-sr"> then </span><kbd>' + esc(show(r.b)) + '</kbd></span>' +
      '<span class="rw-bar" aria-hidden="true"><i style="width:' + ((r.ms / max) * 100).toFixed(1) + '%"></i></span>' +
      '<span class="rw-bar-val">' + round(r.ms) + ' ms</span></li>').join('') + '</ol>' +
      '<p class="rw-muted">Average time from the first key to the second. Lower is smoother.</p>';
  }

  const ERROR_LABELS = [['adjacent', 'Hit a neighbouring key'], ['transposition', 'Swapped two letters'], ['omission', 'Skipped a letter'], ['other', 'Other slips']];
  function mistakeTypes(errorClasses) {
    const ec = errorClasses || {};
    const total = ERROR_LABELS.reduce((s, [k]) => s + num(ec[k]), 0);
    if (!total) return '<p class="rw-empty">No mistakes recorded yet.</p>';
    const top = ERROR_LABELS.slice().sort((a, b) => num(ec[b[0]]) - num(ec[a[0]]))[0];
    const tip = { adjacent: 'Slow down slightly and let each finger return to its home key.', transposition: 'Your fingers race each other: keep an even rhythm.', omission: 'Read a word ahead and press every key on purpose.', other: 'Short, careful drills on your problem keys help most.' }[top[0]];
    return '<ul class="rw-bars rw-mistakes">' + ERROR_LABELS.map(([k, label]) => {
      const v = num(ec[k]), p = (v / total) * 100;
      return '<li><span class="rw-bar-label">' + esc(label) + '</span><span class="rw-bar" aria-hidden="true"><i class="m-' + k + '" style="width:' + p.toFixed(1) + '%"></i></span><span class="rw-bar-val">' + Math.round(p) + '% <small>(' + fmtInt(v) + ')</small></span></li>';
    }).join('') + '</ul><p class="rw-muted">Most common: <b>' + esc(top[1].toLowerCase()) + '</b>. ' + esc(tip) + '</p>';
  }

  /* ---------- chart ---------- */
  function normPoints(points) {
    return (points || []).map((p, i) => {
      if (typeof p === 'number') return { x: i, y: p };
      if (!p) return null;
      if ('y' in p) return { x: num(p.x, i), y: num(p.y), label: p.label };
      if ('wpm' in p) return { x: num(p.t, i), y: num(p.wpm), label: p.label };
      if ('value' in p) return { x: i, y: num(p.value), label: p.label || p.date };
      return null;
    }).filter((p) => p && isFinite(p.y));
  }
  function niceMax(v) {
    if (v <= 0) return 10;
    const mag = Math.pow(10, Math.floor(Math.log10(v)));
    for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * mag >= v) return m * mag;
    return 10 * mag;
  }
  /* chart(points, {area, unit, label, yMin, yMax, tone:'teal|violet|brass', xFirst, xLast, height})
     Path layers stretch (preserveAspectRatio none, non-scaling strokes); labels are HTML so
     text stays readable at 360 px. */
  function chart(points, opts) {
    const o = opts || {}, pts = normPoints(points), unit = o.unit || '', tone = o.tone || 'teal';
    const label = o.label || 'Chart';
    if (pts.length < 2) return '<div class="rw-chart rw-chart-empty" style="--h:' + (o.height || 160) + 'px"><p>' + esc(o.empty || 'Not enough data for a curve yet.') + '</p></div>';
    const W = 600, H = 200;
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
    const yMin = o.yMin != null ? o.yMin : 0;
    const yMax = o.yMax != null ? o.yMax : niceMax(Math.max.apply(null, ys) * 1.08);
    const X = (x) => (x1 === x0 ? 0 : ((x - x0) / (x1 - x0)) * W);
    const Y = (y) => H - ((clamp(y, yMin, yMax) - yMin) / (yMax - yMin || 1)) * H;
    const line = pts.map((p, i) => (i ? 'L' : 'M') + X(p.x).toFixed(1) + ' ' + Y(p.y).toFixed(1)).join('');
    const area = line + 'L' + X(pts[pts.length - 1].x).toFixed(1) + ' ' + H + 'L' + X(pts[0].x).toFixed(1) + ' ' + H + 'Z';
    const gid = nextId('a');
    const grid = [0.25, 0.5, 0.75].map((f) => '<path d="M0 ' + (H * f) + 'H' + W + '" class="rw-grid"/>').join('');
    const last = pts[pts.length - 1], peak = Math.max.apply(null, ys);
    const desc = label + ': ' + pts.length + ' points, from ' + round(pts[0].y) + ' to ' + round(last.y) + ' ' + unit + ', highest ' + round(peak) + ' ' + unit + '.';
    const xFirst = o.xFirst != null ? o.xFirst : (pts[0].label || ''), xLast = o.xLast != null ? o.xLast : (last.label || '');
    return '<figure class="rw-chart rw-tone-' + esc(tone) + '" style="--h:' + (o.height || 160) + 'px">' +
      '<div class="rw-chart-plot" role="img" aria-label="' + esc(desc) + '">' +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="rw-area-top"/><stop offset="1" class="rw-area-bot"/></linearGradient></defs>' +
      grid + (o.area !== false ? '<path d="' + area + '" fill="url(#' + gid + ')" class="rw-area"/>' : '') +
      '<path d="' + line + '" class="rw-line" vector-effect="non-scaling-stroke"/></svg>' +
      '<span class="rw-chart-dot" style="left:' + (X(last.x) / W * 100).toFixed(2) + '%;top:' + (Y(last.y) / H * 100).toFixed(2) + '%"></span>' +
      '<span class="rw-chart-y rw-chart-ymax">' + fmtInt(yMax) + (unit ? ' ' + esc(unit) : '') + '</span>' +
      '<span class="rw-chart-y rw-chart-ymin">' + fmtInt(yMin) + '</span></div>' +
      ((xFirst || xLast) ? '<div class="rw-chart-x"><span>' + esc(xFirst) + '</span><span>' + esc(xLast) + '</span></div>' : '') +
      (o.caption ? '<figcaption class="rw-muted">' + esc(o.caption) + '</figcaption>' : '') + '</figure>';
  }

  /* ---------- history, calendar, goal ring, quests ---------- */
  function normHistory(history) {
    const list = Array.isArray(history) ? history : (history && Array.isArray(history.days) ? history.days : history && typeof history === 'object' ? Object.keys(history).map((k) => Object.assign({ date: k }, history[k])) : []);
    return list.filter((d) => d && d.date).map((d) => ({
      date: String(d.date).slice(0, 10), minutes: num(d.minutes), runs: num(d.runs), bestWpm: num(d.bestWpm, null), avgAccuracy: num(d.avgAccuracy, null), xp: num(d.xp), quests: num(d.quests != null ? d.quests : d.questsDone), freeze: !!d.freeze,
    })).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }
  function calendar(history, weeks, opts) {
    const w = weeks || 12, o = opts || {}, goal = o.goal || 10;
    const by = new Map(normHistory(history).map((d) => [d.date, d]));
    const today = parseDate(o.today) || new Date(); today.setHours(0, 0, 0, 0);
    const dow = (today.getDay() + 6) % 7; // Monday = 0
    const start = new Date(today); start.setDate(today.getDate() - dow - (w - 1) * 7);
    let cells = '', active = 0, total = 0;
    const months = [];
    for (let i = 0; i < w * 7; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      if (i % 7 === 0) { const m = d.toLocaleDateString('en-GB', { month: 'short' }); months.push(i === 0 || d.getDate() <= 7 ? m : ''); }
      const key = ymd(d), rec = by.get(key), future = d > today;
      const min = rec ? rec.minutes : 0;
      let lv = 0;
      if (min > 0) lv = min >= goal ? 3 : min >= goal / 2 ? 2 : 1;
      if (min > 0) { active++; total += min; }
      const nice = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
      const text = future ? '' : nice + ': ' + (min > 0 ? fmtMinutes(min) + (lv === 3 ? ', goal met' : '') : rec && rec.freeze ? 'streak freeze used' : 'no practice');
      const cls = 'a' + lv + (rec && rec.freeze && !min ? ' fz' : '') + (future ? ' fut' : '') + (key === ymd(today) ? ' today' : '');
      cells += '<i class="' + cls + '"' + (text ? ' title="' + esc(text) + '"' : '') + '>' + (lv === 3 ? '<b aria-hidden="true"></b>' : '') + '</i>';
    }
    const streak = o.streak != null ? o.streak : null;
    const summary = active + ' ' + plural(active, 'day') + ' practised in the last ' + w + ' weeks, ' + fmtMinutes(total) + ' in all' + (streak != null ? ', current streak ' + streak + ' ' + plural(streak, 'day') : '') + '.';
    return '<div class="rw-calwrap"><div class="rw-cal-months" aria-hidden="true" style="--w:' + w + '">' + months.map((m) => '<span>' + esc(m) + '</span>').join('') + '</div>' +
      '<div class="rw-cal" style="--w:' + w + '" role="img" aria-label="' + esc('Practice calendar. ' + summary) + '">' + cells + '</div>' +
      '<div class="rw-legend"><span><i class="rw-cdot a0"></i>none</span><span><i class="rw-cdot a1"></i>a little</span><span><i class="rw-cdot a2"></i>half the goal</span><span><i class="rw-cdot a3"><b></b></i>goal met (dot)</span><span><i class="rw-cdot fz"></i>freeze</span></div>' +
      '<p class="rw-muted">' + esc(summary) + '</p></div>';
  }

  function dailyGoalRing(minutes, goal) {
    const g = Math.max(1, num(goal, 10)), m = Math.max(0, num(minutes));
    const p = clamp((m / g) * 100, 0, 100), done = m >= g;
    const label = done ? 'Daily goal met: ' + round(m) + ' of ' + g + ' minutes' : round(m) + ' of ' + g + ' minutes practised today';
    return '<div class="rw-goal' + (done ? ' is-done' : '') + '" role="img" aria-label="' + esc(label) + '">' +
      '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="42" class="rw-goal-track"/>' +
      '<circle cx="50" cy="50" r="42" class="rw-goal-fill" pathLength="100" stroke-dasharray="' + p.toFixed(1) + ' 100" transform="rotate(-90 50 50)"/></svg>' +
      '<span class="rw-goal-text"><b>' + round(m) + '</b><small>of ' + g + ' min</small>' + (done ? '<small class="rw-goal-done">Done</small>' : '') + '</span></div>';
  }

  function questsPanel(quests, opts) {
    const o = opts || {};
    const items = (quests && (quests.items || (Array.isArray(quests) ? quests : []))) || [];
    const xpEach = (root.TC_META && root.TC_META.XP && root.TC_META.XP.quest) || 30;
    const doneN = items.filter((q) => q.done).length;
    const list = items.length ? '<ul class="rw-quests">' + items.map((q) => {
      const goal = Math.max(1, num(q.goal, 1)), prog = clamp(num(q.progress), 0, goal), done = !!q.done || prog >= goal;
      return '<li class="' + (done ? 'is-done' : '') + '"><span class="rw-qcheck" aria-hidden="true">' + (done ? '<svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' : '') + '</span>' +
        '<span class="rw-qbody"><span class="rw-qtitle">' + esc(q.title) + '</span>' +
        '<span class="rw-bar" aria-hidden="true"><i style="width:' + ((prog / goal) * 100).toFixed(1) + '%"></i></span></span>' +
        '<span class="rw-qmeta">' + (done ? '<b>Done</b>' : prog + ' / ' + goal) + '<small>+' + xpEach + ' XP</small></span>' +
        '<span class="rw-sr">' + (done ? 'Done.' : 'Progress ' + prog + ' of ' + goal + '.') + '</span></li>';
    }).join('') + '</ul>' : '<p class="rw-empty">Today\'s quests appear here.</p>';
    return '<section class="rw-card rw-questcard" aria-label="Daily quests"><div class="rw-card-head"><h3>' + esc(o.title || 'Today\'s quests') + '</h3><span class="rw-pill">' + doneN + ' of ' + items.length + '</span></div>' +
      (o.goal != null ? '<div class="rw-questgoal">' + dailyGoalRing(o.minutes, o.goal) + '<p class="rw-muted">Daily goal: ' + o.goal + ' minutes. Quests and the goal keep your streak going.</p></div>' : '') +
      list + '</section>';
  }

  /* ---------- results ---------- */
  const STAR_PATH = 'M12 2.6l2.85 5.95 6.55.85-4.8 4.55 1.2 6.5L12 17.3l-5.8 3.15 1.2-6.5L2.6 9.4l6.55-.85z';
  function starsRow(n) {
    let s = '';
    for (let i = 0; i < 3; i++) s += '<svg class="rw-star' + (i < n ? ' on' : '') + '" style="--i:' + i + '" viewBox="0 0 24 24" aria-hidden="true"><path d="' + STAR_PATH + '"/></svg>';
    return '<div class="rw-stars" role="img" aria-label="' + n + ' of 3 stars">' + s + '</div>';
  }
  const CROWN_SVG = '<svg class="rw-crown" viewBox="0 0 40 28" aria-hidden="true"><path d="M4 24 2 7l10 8 8-13 8 13 10-8-2 17z" class="rw-crown-body"/><rect x="4" y="23" width="32" height="4" rx="1.5" class="rw-crown-band"/><circle cx="20" cy="15" r="2.4" class="rw-crown-gem"/></svg>';

  function resultsCard(r) {
    const d = r || {};
    const stars = clamp(round(d.stars), 0, 3);
    const xpBefore = num(d.xpBefore), gained = Math.max(0, num(d.xpGained)), after = xpBefore + gained;
    const rb = rankFor(xpBefore), ra = rankFor(after), rankUp = ra.index > rb.index;
    const nextMin = ra.next[1];
    const span = nextMin == null ? 1 : nextMin - ra.min;
    const fromPct = rankUp || nextMin == null ? 0 : clamp(((xpBefore - ra.min) / span) * 100, 0, 100);
    const toPct = nextMin == null ? 100 : clamp(((after - ra.min) / span) * 100, 0, 100);
    const title = d.title || (stars ? 'Well typed' : 'Run complete');
    const sub = stars === 3 ? 'Three stars. Clean work.' : stars ? 'Reach ' + ({ 1: '92%', 2: '98%' }[stars]) + ' accuracy for the next star.' : 'Reach 80% accuracy for your first star.';
    const newBadges = (d.newBadges || []).map((b) => (typeof b === 'string' ? findDef(b, d.defs) : normDef(b))).filter(Boolean);
    const errs = round(d.errors);
    const stat = (k, v, u) => '<div class="rw-stat"><span class="rw-stat-k">' + k + '</span><span class="rw-stat-v">' + v + (u ? '<small>' + u + '</small>' : '') + '</span></div>';
    const delayBase = stars + (d.crown ? 1 : 0);
    const tid = nextId('t');
    return '<section class="rw-card rw-results" aria-labelledby="' + tid + '" style="--sd:' + delayBase + '">' +
      '<div class="rw-res-top">' +
      '<div class="rw-res-medal">' + starsRow(stars) + (d.crown ? '<div class="rw-crownwrap" role="img" aria-label="Crown earned">' + CROWN_SVG + '<span>Crown</span></div>' : '') + '</div>' +
      '<div class="rw-res-head"><p class="rw-eyebrow">Results</p><h2 id="' + tid + '">' + esc(title) + '</h2><p class="rw-muted">' + esc(d.crown ? 'Crown earned: 95% or better at the level\'s target speed.' : sub) + '</p></div></div>' +
      '<div class="rw-stats">' + stat('Speed', round(d.wpm), ' wpm') + stat('Accuracy', round(d.accuracy), '%') +
      stat('Errors', errs + (errs ? '' : ' <span class="rw-ok">✓</span>'), '') + stat('Time', fmtClock(d.seconds), '') + '</div>' +
      '<div class="rw-xp">' +
      '<p class="rw-xp-gain"><span class="rw-plus">+</span><span class="rw-count" data-countup-from="0" data-countup-to="' + gained + '">' + fmtInt(gained) + '</span> XP</p>' +
      '<div class="rw-xpline"><span>' + esc(ra.name) + '</span>' +
      '<div class="rw-xpbar rw-xpbar-lg rw-xpbar-grow" role="progressbar" aria-label="XP towards ' + esc(ra.next[0] || 'the top rank') + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + round(toPct) + '" style="--from:' + fromPct.toFixed(1) + '%;--to:' + toPct.toFixed(1) + '%"><i></i></div>' +
      '<span>' + (ra.next[0] ? fmtInt(after) + ' / ' + fmtInt(nextMin) : fmtInt(after)) + '</span></div>' +
      (rankUp ? '<p class="rw-rankup-note" data-rank-up="' + esc(ra.name) + '">' + rankEmblem(ra.index, 22) + 'New rank: <b>' + esc(ra.name) + '</b></p>' : '') + '</div>' +
      '<div class="rw-res-chart"><h3>Speed through the run</h3>' + chart(d.samples, { area: true, unit: 'wpm', label: 'Speed through the run', xFirst: '0:00', xLast: fmtClock(d.seconds), empty: 'Not enough data for a curve. Nice and quick.' }) + '</div>' +
      (newBadges.length ? '<div class="rw-res-badges"><h3>New ' + plural(newBadges.length, 'badge') + '</h3><div class="rw-medals rw-medals-new">' + newBadges.map((b, i) => medal(b, true, d.at || new Date().toISOString(), { isNew: true, index: i })).join('') + '</div></div>' : '') +
      '<div class="rw-actions">' +
      '<button type="button" class="rw-btn" data-action="next">' + esc(d.nextLabel || 'Next lesson') + ' <kbd>Enter</kbd></button>' +
      '<button type="button" class="rw-btn ghost" data-action="retry">Retry <kbd>Tab</kbd></button>' +
      '<button type="button" class="rw-btn ghost" data-action="map">Back to the map</button></div></section>';
  }

  const RANK_UNLOCKS = { Copyist: 'Ivory and brass keycaps', Clerk: 'Signal red keycaps', Stenographer: 'Blueprint keycaps', Editor: 'A new keycap set', 'Master Typist': 'The final keycap set' };
  function rankUpCelebration(rank, opts) {
    const o = opts || {};
    const name = typeof rank === 'string' ? rank : (rank && rank.name) || rankFor(num(rank && rank.xp)).name;
    const idx = Math.max(0, RANKS().findIndex((x) => x[0] === name));
    const unlock = o.unlock || RANK_UNLOCKS[name];
    let bits = '';
    for (let i = 0; i < 18; i++) bits += '<i style="--i:' + i + ';--x:' + ((i * 37) % 100) + '%;--r:' + ((i * 53) % 360) + 'deg"></i>';
    return '<div class="rw-rankup" role="dialog" aria-modal="false" aria-labelledby="rw-rankup-title">' +
      '<div class="rw-confetti" aria-hidden="true">' + bits + '</div>' +
      '<div class="rw-rankup-emblem">' + rankEmblem(idx, 84) + '</div>' +
      '<p class="rw-eyebrow">Rank up</p><h2 id="rw-rankup-title">You are now ' + (/^[AEIOU]/.test(name) ? 'an ' : 'a ') + esc(name) + '</h2>' +
      '<p class="rw-muted">Rank ' + (idx + 1) + ' of ' + RANKS().length + '.' + (unlock ? ' Unlocked in the Workshop: <b>' + esc(unlock) + '</b>.' : '') + '</p>' +
      '<div class="rw-actions"><button type="button" class="rw-btn" data-action="close-rankup">Carry on</button>' + (unlock ? '<button type="button" class="rw-btn ghost" data-action="workshop">Open the Workshop</button>' : '') + '</div></div>';
  }

  /* ---------- progress screen ---------- */
  const CERT_TIERS = [20, 30, 40, 50, 60];
  function certificatesBlock(certs, name) {
    const list = (certs || []).slice().sort((a, b) => num(a.wpm) - num(b.wpm));
    const have = new Set(list.map((c) => round(c.wpm)));
    const earned = list.map((c, i) => {
      const data = { name, wpm: c.wpm, accuracy: c.accuracy, seconds: c.seconds, date: c.at || c.date };
      return '<figure class="rw-certitem">' + certificate(data) + '<figcaption><span>' + round(c.wpm) + ' wpm · ' + esc(fmtDate(c.at || c.date)) + '</span>' +
        '<button type="button" class="rw-btn ghost small" data-action="print-certificate" data-cert-index="' + i + '" data-cert="' + esc(JSON.stringify(data)) + '">Print</button></figcaption></figure>';
    }).join('');
    const todo = CERT_TIERS.filter((t) => !have.has(t));
    return (earned ? '<div class="rw-certs">' + earned + '</div>' : '<p class="rw-empty">No certificates yet.</p>') +
      (todo.length ? '<p class="rw-muted">Still to earn: ' + todo.map((t) => '<span class="rw-pill">' + t + ' wpm</span>').join(' ') + '. Take a timed test of one minute or longer at 95% accuracy or better.</p>' : '');
  }

  function progressScreen(state, history, extra) {
    const s = state || {}, x = extra || {}, st = s.stats || {};
    const keyStats = x.keyStats || st.keyStats || {}, bigram = x.bigramLatency || st.bigramLatency || {}, errs = x.errorClasses || st.errorClasses || {};
    const days = normHistory(history);
    const t = s.totals || {};
    const goal = (s.settings && s.settings.dailyGoal) || 10;
    const today = parseDate(x.today) || new Date(); today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 6);
    const weekMin = days.filter((d) => parseDate(d.date) >= weekAgo).reduce((a, d) => a + d.minutes, 0);
    const totalMin = t.minutes != null ? t.minutes : days.reduce((a, d) => a + d.minutes, 0);
    const todayRec = days.find((d) => d.date === ymd(today));
    const runDays = days.filter((d) => d.runs > 0 && d.bestWpm != null).slice(-30);
    const short = (iso) => (parseDate(iso) || new Date()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const tile = (k, v, sub) => '<div class="rw-tile"><span class="rw-stat-k">' + k + '</span><span class="rw-tile-v">' + v + '</span>' + (sub ? '<span class="rw-muted">' + sub + '</span>' : '') + '</div>';
    const streak = (s.streak && s.streak.count) || 0;
    const card = (cls, title, body, sub) => '<section class="rw-card ' + cls + '"><div class="rw-card-head"><h3>' + title + '</h3>' + (sub || '') + '</div>' + body + '</section>';
    return '<div class="rw-progress">' +
      '<div class="rw-p-rank">' + rankCard(s) + '</div>' +
      '<div class="rw-tiles rw-p-tiles">' +
      tile('Time practised', esc(fmtMinutes(totalMin)), esc(fmtMinutes(weekMin)) + ' in the last 7 days') +
      tile('Lessons done', fmtInt(t.lessonsDone), fmtInt(t.stars) + ' stars · ' + fmtInt(t.crowns) + ' crowns') +
      tile('Best speed', fmtInt(t.bestWpm) + '<small> wpm</small>', '') +
      tile('Accuracy', fmtInt(t.avgAccuracy) + '<small>%</small>', 'average') +
      tile('Streak', streak + '<small> ' + plural(streak, 'day') + '</small>', s.streak && s.streak.freezesUsedThisWeek ? 'freeze used this week' : '1 freeze a week') +
      '</div>' +
      card('rw-p-heat', 'Your keyboard, coloured by accuracy', heatmap(keyStats)) +
      '<div class="rw-p-goal">' + questsPanel(s.quests, { goal, minutes: todayRec ? todayRec.minutes : 0 }) + '</div>' +
      card('rw-p-pairs', 'Slowest key pairs', slowPairs(bigram)) +
      card('rw-p-mist', 'Mistake types', mistakeTypes(errs)) +
      card('rw-p-speed', 'Speed over time', chart(runDays.map((d) => ({ y: d.bestWpm, label: short(d.date) })), { area: true, unit: 'wpm', label: 'Best speed per day', tone: 'teal', empty: 'Practise on a few days to see your speed trend.' }) + '<p class="rw-muted">Best speed on each day you practised.</p>') +
      card('rw-p-acc', 'Accuracy over time', chart(runDays.map((d) => ({ y: d.avgAccuracy, label: short(d.date) })), { area: true, unit: '%', label: 'Average accuracy per day', tone: 'violet', yMin: Math.max(0, Math.floor((Math.min.apply(null, runDays.map((d) => d.avgAccuracy).concat([100])) - 5) / 10) * 10), yMax: 100, empty: 'Practise on a few days to see your accuracy trend.' }) + '<p class="rw-muted">Average accuracy on each day you practised.</p>') +
      card('rw-p-cal', 'Practice calendar', calendar(days, 12, { goal, today, streak })) +
      card('rw-p-certs', 'Certificates', certificatesBlock(s.certificates, x.name || '')) +
      card('rw-p-badges', 'Badges', badgeGrid(x.defs, s.badges)) +
      '</div>';
  }

  /* ---------- behaviour ---------- */
  function countUp(el) {
    const to = num(parseFloat(el.getAttribute('data-countup-to'))), from = num(parseFloat(el.getAttribute('data-countup-from')));
    if (motionLevel() === 'off' || to === from) { el.textContent = fmtInt(to); return; }
    const delay = parseFloat(getComputedStyle(el.closest('.rw-results') || el).getPropertyValue('--sd')) || 0;
    const dur = 1100, t0 = performance.now() + delay * 300 + 250;
    el.textContent = fmtInt(from);
    const tick = (now) => {
      const k = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmtInt(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  function enhance(el, opts) {
    const host = el || document;
    const o = opts || {};
    host.querySelectorAll('[data-countup-to]:not([data-rw-done])').forEach((n) => { n.setAttribute('data-rw-done', ''); countUp(n); });
    if (host.__rwWired) return host;
    host.__rwWired = true;
    host.addEventListener('click', (ev) => {
      const m = ev.target.closest('.rw-medal');
      if (m && host.contains(m)) { m.classList.remove('is-new'); m.setAttribute('aria-pressed', String(m.getAttribute('aria-pressed') !== 'true')); return; }
      const p = ev.target.closest('[data-action="print-certificate"]');
      if (p && host.contains(p) && !o.noPrint) {
        let c = {}; try { c = JSON.parse(p.getAttribute('data-cert') || '{}'); } catch (e) { /* keep {} */ }
        if (o.name && !c.name) c.name = o.name;
        printCertificate(c);
      }
    });
    return host;
  }

  root.TC_REWARDS_UI = {
    rankBar, rankCard, rankFor, rankEmblem,
    medal, badgeGrid, FALLBACK_BADGES, BADGE_ALIASES: ALIASES, BADGE_CATEGORIES: CATS,
    certificate, printCertificate,
    heatmap, slowPairs, mistakeTypes,
    chart, calendar, questsPanel, dailyGoalRing,
    resultsCard, rankUpCelebration, progressScreen,
    enhance, helpers: { esc, fmtDate, fmtClock, fmtMinutes, testLength, normHistory },
  };
})(typeof window !== 'undefined' ? window : globalThis);
