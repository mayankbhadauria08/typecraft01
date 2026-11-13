/* Rewards rules for TypeCraft next version: badges, daily quests, XP, streak
   with freezes, certificates, placement and Workshop unlocks. Pure functions,
   shared by the browser (classic <script>, after shared/course-meta.js) and the
   Worker (import './shared/course-meta.js' then './shared/rewards-rules.js',
   read globalThis.TC_RULES). The Worker uses apply() both for every event batch
   and for the nightly rebuild, so one set of rules decides every number.

   Event (normalised, as the server stores it):
     { id, type:'step'|'run'|'game'|'quest'|'placement'|'feedback'|'import',
       lessonId, gameId, step, kind, wpm, accuracy, errors, seconds, stars, crown,
       score, xpClaim, data:{}, day:'YYYY-MM-DD' (learner's local date),
       hour:0-23 (learner's local hour), at:ISO, legacy:bool }
   'import' is made by the server only (guest progress and old saved progress). */
(function (root) {
  const META = () => root.TC_META;

  /* ---------------- dates ---------------- */
  const DAY_MS = 86400000;
  const dayNum = (d) => Math.round(Date.parse(d + 'T00:00:00Z') / DAY_MS);
  const dayStr = (n) => new Date(n * DAY_MS).toISOString().slice(0, 10);
  const addDays = (d, k) => dayStr(dayNum(d) + k);
  /** Monday of the week the date falls in (weeks run Monday to Sunday). */
  const weekOf = (d) => { const n = dayNum(d); const dow = (new Date(n * DAY_MS).getUTCDay() + 6) % 7; return dayStr(n - dow); };
  const isDay = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z'));

  /* ---------------- XP ---------------- */
  const XP = { step: 10, firstStar: 20, crown: 50, boss: 100, quest: 30, gameMax: 50 };
  const UNSCORED_STEPS = ['watch'];

  /* ---------------- badges (36) ---------------- */
  const B = (id, group, name, how) => ({ id, group, name, how });
  const BADGES = [
    B('speed_20', 'speed', 'First 20', 'Reach 20 words per minute in a lesson or test.'),
    B('speed_30', 'speed', 'Thirty Club', 'Reach 30 words per minute in a lesson or test.'),
    B('speed_40', 'speed', 'Forty Flat', 'Reach 40 words per minute in a lesson or test.'),
    B('speed_50', 'speed', 'Fifty Up', 'Reach 50 words per minute in a lesson or test.'),
    B('speed_60', 'speed', 'Sixty Plus', 'Reach 60 words per minute in a lesson or test.'),
    B('speed_80', 'speed', 'Eighty Ace', 'Reach 80 words per minute in a lesson or test.'),
    B('clean_sheet', 'accuracy', 'Clean Sheet', 'Finish a lesson at 100% accuracy.'),
    B('triple_clean', 'accuracy', 'Triple Clean', 'Three 100% runs in a row.'),
    B('sharp_shooter', 'accuracy', 'Sharp Shooter', '98% or better on ten lessons.'),
    B('no_slip', 'accuracy', 'No Slip', 'A Sentences step with no mistake.'),
    B('steady_hand', 'accuracy', 'Steady Hand', '95% or better on a 5-minute test.'),
    B('streak_3', 'streak', 'Three Days', 'Practise three days in a row.'),
    B('streak_7', 'streak', 'Seven Days', 'Practise seven days in a row.'),
    B('streak_14', 'streak', 'Two Weeks', 'Practise fourteen days in a row.'),
    B('streak_30', 'streak', 'Thirty Days', 'Practise thirty days in a row.'),
    B('streak_100', 'streak', 'Hundred Days', 'Practise a hundred days in a row.'),
    B('home_hero', 'course', 'Home Row Hero', 'Three stars on every home row lesson.'),
    B('top_climber', 'course', 'Top Row Climber', 'Finish every top row lesson.'),
    B('number_cruncher', 'course', 'Number Cruncher', 'Finish every number row lesson.'),
    B('bottom_diver', 'course', 'Bottom Row Diver', 'Finish every bottom row lesson.'),
    B('capital_idea', 'course', 'Capital Idea', 'Finish every capitals lesson.'),
    B('symbol_master', 'course', 'Symbol Master', 'Finish every symbols lesson.'),
    B('all_26', 'course', 'All 26', 'The All 26 letters lesson at 95% or better.'),
    B('master_typist', 'course', 'Master Typist', 'Beat the final boss.'),
    B('boss_1', 'boss', 'Boss Down', 'Beat a boss.'),
    B('boss_3', 'boss', 'Boss Hunter', 'Beat three bosses.'),
    B('boss_6', 'boss', 'Boss Slayer', 'Beat all six bosses.'),
    B('storm_1000', 'arcade', 'Storm Chaser', 'Score 1,000 points in Word Storm.'),
    B('beat_30', 'arcade', 'On the Beat', 'A 30 combo in Beat Keys.'),
    B('rope_burn', 'arcade', 'Rope Burn', 'Beat the 80 words-per-minute bot in Tug-of-War.'),
    B('ghost_beaten', 'arcade', 'Ghost Beaten', 'Beat your own replay in Ghost Race.'),
    B('sky_high', 'arcade', 'Sky High', 'Build a tower of 25 in Word Tower.'),
    B('safe_hands', 'arcade', 'Safe Hands', 'Open ten safes in one run of Safe Cracker.'),
    B('early_bird', 'habit', 'Early Bird', 'Practise before 8 am.'),
    B('night_owl', 'habit', 'Night Owl', 'Practise after 10 pm.'),
    B('daily_dozen', 'habit', 'Daily Dozen', 'Finish all three daily quests on twelve different days.'),
  ];
  const SPEED_BADGES = [[20, 'speed_20'], [30, 'speed_30'], [40, 'speed_40'], [50, 'speed_50'], [60, 'speed_60'], [80, 'speed_80']];
  const STREAK_BADGES = [[3, 'streak_3'], [7, 'streak_7'], [14, 'streak_14'], [30, 'streak_30'], [100, 'streak_100']];
  const UNIT_BADGES = { top: 'top_climber', numbers: 'number_cruncher', bottom: 'bottom_diver', capitals: 'capital_idea', symbols: 'symbol_master' };
  const FIVE_MINUTE_TEST = 'l67', ALL_26 = 'l48', FINAL_BOSS = 'l68';

  /* ---------------- games ---------------- */
  const GAMES = ['storm', 'beat', 'tug', 'ghost', 'pop', 'tower', 'safe', 'boss', 'daily'];

  /* ---------------- daily quests ---------------- */
  // inc(e, ctx) says how much an event moves the quest on; ctx.pb is true when
  // a run beat that lesson's earlier best speed.
  const isPractice = (e) => e.type === 'step' || e.type === 'run' || e.type === 'game' || e.type === 'placement';
  const scoredStep = (e) => e.type === 'step' && !UNSCORED_STEPS.includes(e.kind);
  const Q = (id, title, goal, inc, unit) => ({ id, title, goal, inc, unit: unit || 'count' });
  const QUESTS = [
    Q('lessons2', 'Finish two lessons', 2, (e) => (e.type === 'run' && e.stars >= 1 ? 1 : 0)),
    Q('acc95', 'One run at 95% or better', 1, (e) => (e.type === 'run' && e.accuracy >= 95 ? 1 : 0)),
    Q('game', 'Play any game', 1, (e) => (e.type === 'game' ? 1 : 0)),
    Q('drill', 'Do the problem-keys drill', 1, (e) => (e.type === 'quest' && e.data && e.data.action === 'drill' ? 1 : 0)),
    Q('pb', 'Beat a personal best', 1, (e, ctx) => (ctx.pb ? 1 : 0)),
    Q('minutes10', 'Practise for 10 minutes', 600, (e) => (secondsOf(e)), 'seconds'),
    Q('steps5', 'Finish five steps', 5, (e) => (scoredStep(e) ? 1 : 0)),
    Q('stars3', 'Three stars in one run', 1, (e) => (e.type === 'run' && e.stars === 3 ? 1 : 0)),
    Q('daily', 'Play the Daily Challenge', 1, (e) => (e.type === 'game' && e.gameId === 'daily' ? 1 : 0)),
    Q('clean', 'A step with no mistakes', 1, (e) => (scoredStep(e) && e.errors === 0 && e.wpm > 0 ? 1 : 0)),
    Q('games3', 'Play three games', 3, (e) => (e.type === 'game' ? 1 : 0)),
  ];
  const QUEST_BY_ID = Object.fromEntries(QUESTS.map((q) => [q.id, q]));
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  /** The three quests of a date (YYYY-MM-DD), the same everywhere without a server. */
  function questsFor(day) {
    const pool = QUESTS.map((q) => q.id);
    const out = [];
    let seed = hash('typecraft-quests-' + day);
    while (out.length < 3) {
      seed = Math.imul(seed ^ (seed >>> 15), 2246822519) >>> 0;
      const id = pool.splice(seed % pool.length, 1)[0];
      if ((id === 'game' && out.includes('games3')) || (id === 'games3' && out.includes('game'))) continue;
      out.push(id);
    }
    return out.map((id) => QUEST_BY_ID[id]);
  }

  /* ---------------- certificates, placement, workshop ---------------- */
  const CERT_LEVELS = [20, 30, 40, 50, 60];
  const CERT_MIN_SECONDS = 60, CERT_MIN_ACCURACY = 95;
  function placementLevel(wpm, accuracy) {
    if (wpm < 15 || accuracy < 85) return 1;
    if (wpm < 25) return 2;
    if (wpm > 35 && accuracy >= 92) return 4;
    return 3;
  }
  const RANK_XP = (name) => { const r = META().RANKS.find((x) => x[0] === name); return r ? r[1] : 0; };
  // All cosmetic. Background themes are free and not listed here.
  const W = (id, kind, name, rank) => ({ id, kind, name, rank });
  const WORKSHOP = [
    W('keycaps:standard', 'keycaps', 'Standard issue', 'Apprentice'),
    W('keycaps:ivory', 'keycaps', 'Ivory and brass', 'Copyist'),
    W('keycaps:signal', 'keycaps', 'Signal red', 'Clerk'),
    W('keycaps:blueprint', 'keycaps', 'Blueprint', 'Stenographer'),
    W('keycaps:midnight', 'keycaps', 'Midnight lacquer', 'Editor'),
    W('keycaps:gilded', 'keycaps', 'Gilded master', 'Master Typist'),
    W('ink:black', 'ink', 'Carbon black', 'Apprentice'),
    W('ink:navy', 'ink', 'Navy', 'Copyist'),
    W('ink:oxblood', 'ink', 'Oxblood', 'Clerk'),
    W('ink:violet', 'ink', 'Copying violet', 'Correspondent'),
    W('paper:cream', 'paper', 'Cream bond', 'Apprentice'),
    W('paper:onionskin', 'paper', 'Onionskin', 'Stenographer'),
    W('paper:ledger', 'paper', 'Green ledger', 'Editor'),
    W('keySound:typewriter', 'keySound', 'Typewriter', 'Apprentice'),
    W('keySound:off', 'keySound', 'Off', 'Apprentice'),
    W('keySound:soft', 'keySound', 'Soft', 'Copyist'),
    W('keySound:click', 'keySound', 'Click', 'Clerk'),
  ];
  const unlocksFor = (xp) => WORKSHOP.filter((w) => xp >= RANK_XP(w.rank)).map((w) => w.id);
  const THEMES = ['letters', 'aurora', 'neon', 'space', 'sunset', 'ocean', 'gold', 'paper'];
  const DEFAULT_SETTINGS = { bg: 'letters', effects: 'full', sound: 'on', dailyGoal: 10, fingerGuide: true,
    keycaps: 'standard', ink: 'black', paper: 'cream', keySound: 'typewriter' };

  /* ---------------- streak (today's rule plus one freeze a week) ---------------- */
  /** days: active dates. Consecutive days build the streak; one missed day per
      week (Monday to Sunday, by the missed day) is forgiven by a freeze. */
  function streakOf(days, today) {
    const list = Array.from(new Set(days)).filter(isDay).sort();
    let count = 0, best = 0, prev = null;
    const freezes = [], used = new Set();
    for (const d of list) {
      if (prev === null) count = 1;
      else {
        const gap = dayNum(d) - dayNum(prev);
        if (gap === 1) count++;
        else if (gap === 2 && !used.has(weekOf(addDays(prev, 1)))) { used.add(weekOf(addDays(prev, 1))); freezes.push(addDays(prev, 1)); count++; }
        else count = 1;
      }
      if (count > best) best = count;
      prev = d;
    }
    const out = { count, best, lastDate: prev, freezes };
    if (today && prev) {
      const gap = dayNum(today) - dayNum(prev);
      let current = count;
      if (gap === 2) { if (used.has(weekOf(addDays(prev, 1)))) current = 0; }
      else if (gap > 2) current = 0;
      out.current = current;
      out.freezesUsedThisWeek = freezes.filter((f) => weekOf(f) === weekOf(today)).length +
        (gap === 2 && current > 0 && weekOf(addDays(prev, 1)) === weekOf(today) ? 1 : 0);
    } else if (today) { out.current = 0; out.freezesUsedThisWeek = 0; }
    return out;
  }

  /* ---------------- the engine ---------------- */
  const secondsOf = (e) => (e.type === 'step' || e.type === 'game' || e.type === 'placement' || (e.type === 'run' && e.legacy) ? e.seconds || 0 : 0);

  function emptyState() {
    return { lessons: {}, days: {}, xp: 0, cleanTail: 0, badges: {}, quests: {}, certificates: {}, games: {},
      daily: {}, placement: null, unlocks: {}, streak: { count: 0, best: 0, lastDate: null, freezes: [] } };
  }
  function lessonOf(state, id) {
    return state.lessons[id] || (state.lessons[id] = { status: 'not_started', step: 0, stars: 0, crown: 0, bestWpm: 0,
      bestAccuracy: 0, attempts: 0, lastWpm: null, lastAccuracy: null, lastPlayed: null, completedAt: null, bossWon: 0 });
  }
  function dayOf(state, d) {
    return state.days[d] || (state.days[d] = { seconds: 0, runs: 0, steps: 0, bestWpm: 0, accSum: 0, accCount: 0, xp: 0, questsDone: 0, active: 0 });
  }
  /** Stars and crown the server allows for a run (or imported result). */
  function judgeRun(e) {
    const meta = META().BY_ID[e.lessonId];
    const byAcc = META().starsFor(e.accuracy || 0);
    const stars = Math.min(e.stars == null ? byAcc : e.stars, byAcc);
    const lvl = meta ? META().LEVELS.find((l) => l.n === meta.level) : null;
    const ch = (e.data && e.data.challenge) || {};
    const cw = ch.wpm != null ? +ch.wpm : e.wpm, ca = ch.accuracy != null ? +ch.accuracy : e.accuracy;
    const crown = !!e.crown && !!lvl && cw >= lvl.target && ca >= META().CROWN_ACCURACY ? 1 : 0;
    const won = meta && meta.kind === 'boss' ? ((e.accuracy || 0) >= 90 && !(e.data && e.data.won === false) ? 1 : 0) : 0;
    return { stars, crown, won, meta };
  }

  /**
   * Applies one event to the state (mutates it) and returns what it earned:
   * { xp, ledger:[{source,ref,xp}], badges:[ids], quests:[ids done], certificates:[levels], pb, unlocks:[ids] }.
   * The event's stars/crown are replaced by the judged values (e.stars, e.crown).
   */
  function apply(state, e) {
    const out = { xp: 0, ledger: [], badges: [], quests: [], certificates: [], pb: false, unlocks: [] };
    const M = META();
    const meta = e.lessonId ? M.BY_ID[e.lessonId] : null;
    const award = (id) => { if (!state.badges[id]) { state.badges[id] = { at: e.at, eventId: e.id }; out.badges.push(id); } };
    let xp = 0;
    let newDay = false;

    // lesson progress
    if ((e.type === 'step' || e.type === 'run' || e.type === 'import') && meta) {
      const L = lessonOf(state, e.lessonId);
      if (e.type === 'step') {
        e.stars = null; e.crown = 0;
        if (!UNSCORED_STEPS.includes(e.kind)) xp += XP.step;
        if (L.status === 'not_started') L.status = 'in_progress';
        if (Number.isInteger(e.step) && L.status !== 'completed') L.step = e.step + 1;
        L.lastPlayed = e.at;
      } else {
        const j = judgeRun(e);
        e.stars = j.stars; e.crown = j.crown;
        const real = e.type === 'run';
        out.pb = real && L.attempts > 0 && e.wpm > L.bestWpm;
        if (real && e.legacy) xp += XP.step;
        if (j.stars > L.stars) { xp += (j.stars - L.stars) * XP.firstStar; L.stars = j.stars; }
        if (j.crown && !L.crown) { xp += XP.crown; L.crown = 1; }
        if (j.won && !L.bossWon && real) { xp += XP.boss; L.bossWon = 1; }
        L.bestWpm = Math.max(L.bestWpm, e.wpm || 0);
        L.bestAccuracy = Math.max(L.bestAccuracy, e.accuracy || 0);
        const done = meta.kind === 'boss' ? (real ? j.won : j.stars >= 1) : meta.kind === 'intro' ? true : j.stars >= 1;
        if (done && L.status !== 'completed') { L.status = 'completed'; L.completedAt = e.at; }
        else if (L.status === 'not_started') L.status = 'in_progress';
        if (real) { L.attempts++; L.lastWpm = e.wpm; L.lastAccuracy = e.accuracy; L.lastPlayed = e.at; L.step = 0; }
        else if (!L.lastPlayed) L.lastPlayed = e.at;
      }
    }

    // games, daily challenge, placement
    if (e.type === 'game') {
      xp += Math.max(0, Math.min(XP.gameMax, Math.round(e.xpClaim || 0)));
      const g = state.games[e.gameId] || (state.games[e.gameId] = { best: 0, runs: 0, bestAt: null });
      g.runs++;
      if ((e.score || 0) > g.best || g.bestAt === null) { g.best = Math.max(g.best, e.score || 0); g.bestAt = e.at; }
      if (e.gameId === 'daily') {
        const d = e.data && isDay(e.data.date) ? e.data.date : e.day;
        if (!state.daily[d]) state.daily[d] = { score: e.score || 0, wpm: e.wpm || 0, accuracy: e.accuracy || 0, at: e.at, eventId: e.id };
      }
    }
    if (e.type === 'placement') {
      state.placement = { level: placementLevel(e.wpm || 0, e.accuracy || 0), wpm: e.wpm || 0, accuracy: e.accuracy || 0, seconds: e.seconds || 0, at: e.at, eventId: e.id };
    }

    // daily totals
    const D = dayOf(state, e.day);
    const active = isPractice(e) || e.type === 'quest' || (e.type === 'import' && !e.lessonId);
    if (active && !D.active) { D.active = 1; newDay = true; }
    D.seconds += secondsOf(e);
    if (e.type === 'run' || e.type === 'game') D.runs++;
    if (scoredStep(e)) D.steps++;
    if ((e.type === 'run' || e.type === 'step') && (e.accuracy || 0) >= 80) D.bestWpm = Math.max(D.bestWpm, e.wpm || 0);
    if (e.type === 'run') { D.accSum += e.accuracy || 0; D.accCount++; }

    // XP for the event itself
    e.xp = xp;
    if (xp) out.ledger.push({ source: 'event', ref: e.id, xp, day: e.day, at: e.at });

    // quests of that day
    if (e.type !== 'import' && e.type !== 'feedback') {
      const dq = state.quests[e.day] || (state.quests[e.day] = {});
      for (const q of questsFor(e.day)) {
        const cur = dq[q.id] || (dq[q.id] = { progress: 0, goal: q.goal, doneAt: null });
        const inc = q.inc(e, out);
        if (inc > 0 && !cur.doneAt) {
          cur.progress = Math.min(q.goal, cur.progress + inc);
          if (cur.progress >= q.goal) {
            cur.doneAt = e.at; D.questsDone++; out.quests.push(q.id);
            out.ledger.push({ source: 'quest', ref: e.day + ':' + q.id, xp: XP.quest, day: e.day, at: e.at });
            xp += XP.quest;
          }
        }
      }
    }
    out.xp = xp;
    D.xp += xp;
    state.xp += xp;

    // certificates
    if (e.type === 'run' && meta && (meta.kind === 'timed' || meta.kind === 'exam') && (e.seconds || 0) >= CERT_MIN_SECONDS && (e.accuracy || 0) >= CERT_MIN_ACCURACY) {
      for (const lv of CERT_LEVELS) {
        if ((e.wpm || 0) >= lv && !state.certificates[lv]) {
          state.certificates[lv] = { wpm: e.wpm, accuracy: e.accuracy, seconds: e.seconds, at: e.at, eventId: e.id, lessonId: e.lessonId };
          out.certificates.push(lv);
        }
      }
    }

    // streak
    if (newDay) state.streak = streakOf(Object.keys(state.days).filter((d) => state.days[d].active));

    // badges
    const lessonRun = (e.type === 'run' || e.type === 'step' || e.type === 'import') && meta;
    if (lessonRun && (e.accuracy || 0) >= 80) for (const [w, id] of SPEED_BADGES) if ((e.wpm || 0) >= w) award(id);
    if (e.type === 'run' && meta) {
      if (e.accuracy >= 100) award('clean_sheet');
      state.cleanTail = e.accuracy >= 100 ? state.cleanTail + 1 : 0;
      if (state.cleanTail >= 3) award('triple_clean');
      if (e.lessonId === FIVE_MINUTE_TEST && e.accuracy >= 95) award('steady_hand');
      if (e.lessonId === ALL_26 && e.accuracy >= 95) award('all_26');
    }
    if (e.type === 'step' && e.kind === 'paragraph' && e.errors === 0 && e.wpm > 0) award('no_slip');
    if (meta && (e.type === 'run' || e.type === 'import')) {
      if (Object.values(state.lessons).filter((l) => l.bestAccuracy >= 98).length >= 10) award('sharp_shooter');
      const scored = (unit) => M.LESSONS.filter((l) => l.unit === unit && l.kind !== 'intro');
      if (meta.unit === 'home' && scored('home').every((l) => state.lessons[l.id] && state.lessons[l.id].stars >= 3)) award('home_hero');
      if (UNIT_BADGES[meta.unit] && scored(meta.unit).every((l) => state.lessons[l.id] && state.lessons[l.id].status === 'completed')) award(UNIT_BADGES[meta.unit]);
      const bosses = M.BOSSES.filter((b) => state.lessons[b] && state.lessons[b].bossWon).length;
      if (bosses >= 1) award('boss_1');
      if (bosses >= 3) award('boss_3');
      if (bosses >= M.BOSSES.length) award('boss_6');
      if (state.lessons[FINAL_BOSS] && state.lessons[FINAL_BOSS].bossWon) award('master_typist');
    }
    if (e.type === 'game') {
      const d = e.data || {};
      if (e.gameId === 'storm' && e.score >= 1000) award('storm_1000');
      if (e.gameId === 'beat' && Math.max(+d.combo || 0, +d.maxCombo || 0) >= 30) award('beat_30');
      if (e.gameId === 'tug' && d.won === true && +d.botWpm >= 80) award('rope_burn');
      if (e.gameId === 'ghost' && d.beatGhost === true) award('ghost_beaten');
      if (e.gameId === 'tower' && Math.max(e.score || 0, +d.height || 0) >= 25) award('sky_high');
      if (e.gameId === 'safe' && +d.safes >= 10) award('safe_hands');
    }
    if (isPractice(e) && Number.isInteger(e.hour)) {
      if (e.hour < 8) award('early_bird');
      if (e.hour >= 22) award('night_owl');
    }
    if (out.quests.length && Object.values(state.days).filter((d) => d.questsDone >= 3).length >= 12) award('daily_dozen');
    if (newDay) for (const [n, id] of STREAK_BADGES) if (state.streak.best >= n) award(id);

    // Workshop unlocks follow the rank
    if (xp) for (const id of unlocksFor(state.xp)) if (!state.unlocks[id]) { state.unlocks[id] = e.at; out.unlocks.push(id); }
    return out;
  }

  /** Summary numbers for tiles: lessons done, stars, crowns, best speed, average accuracy, minutes. */
  function totalsOf(state) {
    const ls = Object.values(state.lessons), ds = Object.values(state.days);
    const accSum = ds.reduce((s, d) => s + d.accSum, 0), accCount = ds.reduce((s, d) => s + d.accCount, 0);
    return {
      lessonsDone: ls.filter((l) => l.status === 'completed').length,
      stars: ls.reduce((s, l) => s + l.stars, 0),
      crowns: ls.reduce((s, l) => s + (l.crown ? 1 : 0), 0),
      bestWpm: ls.reduce((m, l) => Math.max(m, l.bestWpm), 0),
      avgAccuracy: accCount ? Math.round((accSum / accCount) * 10) / 10 : 0,
      minutes: Math.round(ds.reduce((s, d) => s + d.seconds, 0) / 60),
      runs: ds.reduce((s, d) => s + d.runs, 0),
    };
  }

  root.TC_RULES = {
    VERSION: 1, XP, BADGES, QUESTS, GAMES, CERT_LEVELS, CERT_MIN_SECONDS, CERT_MIN_ACCURACY, WORKSHOP, THEMES, DEFAULT_SETTINGS,
    questsFor, streakOf, unlocksFor, placementLevel, judgeRun, emptyState, apply, totalsOf,
    weekOf, addDays, isDay,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
