# TypeCraft next version — contracts between the parts

Read `docs/BUILD-PROMPT.txt` (features, rules) and `docs/design-preview.html` (the look) first.
Several workers build parts in parallel; these interfaces are what lets them join up.
Plain HTML/CSS/JS, no framework, no build step. Browser files are classic scripts
(no `import`), each attaching to one global. Worker code (`src/`) is ES modules.

## File layout (target)

```
index.html                 app shell: markup + <link>/<script> tags only (owner: lead)
css/app.css                tokens, themes, glass, top bar, every screen (lead)
css/games.css              arcade styles (games worker)
js/app.js                  app core: views, lesson engine, sync, accounts (lead)
js/course.js               lesson data for all 78 lessons + text generators (course worker)
js/games/*.js              one file per arcade game + boss.js + daily.js (games worker)
js/rewards-ui.js           progress screen, heatmap, calendar, charts, medals, certificates (rewards worker)
shared/course-meta.js      lesson ids, levels, units, kinds, stars/XP/rank rules (lead; read-only for others)
shared/rewards-rules.js    badges, quests, XP awarding rules (server worker writes; browser reads)
src/*.js                   Cloudflare Worker (server worker)
migrations/0002_*.sql      new tables, additive only (server worker)
```

Script order in index.html: `shared/course-meta.js`, `shared/rewards-rules.js`, `js/course.js`,
`js/games/*.js`, `js/rewards-ui.js`, `js/app.js`.

## Design tokens (CSS custom properties, from design-preview.html)

Use these names only; themes change their values on `:root[data-bg="…"]`:
`--bg --surface --raise --text --muted --line --line-strong --teal --teal-deep --teal-ink
--teal-soft --violet --brass --brass-ink --brass-soft --red --red-soft --g1 --g2 --g3 --glass
--glass-2 --glass-line --deep --display --sans --mono` and the machine set
`--mach --mach-hi --mach-lo --mach-text --mach-muted --mach-brass --sheet --sheet-ink`.
`--teal` is "the accent" (it is pink in Neon, gold in Black and gold). Glass panel recipe:
`background:linear-gradient(160deg,var(--glass-2),var(--glass)); border:1px solid var(--glass-line);
box-shadow:0 30px 50px -34px var(--deep), inset 0 1px 0 var(--glass-line); backdrop-filter:blur(16px)`.
Effects level is `:root[data-fx="full|light|off"]`: in `light` no ambient animation and no tilt;
in `off` no animation at all except a caret, no filters, no blur. Respect it in every component.

## Course engine — `js/course.js` → `window.TC_COURSE`

```
TC_COURSE.lessons              // array in course order (TC_META.ORDER), each:
  { id, level, unit, kind, title, keys:[chip labels], teach:'chars introduced', shift?:true,
    charDrill, wordDrill:[...], paragraphDrill, paragraphs:[...],
    timed?:seconds, sprints?:n, lockLine?:true, exam?:true, numpad?:true,
    watch:{keys:['f','j'], note:'...'},          // what the Watch step shows
    allowed:Set, allowShift:bool, newLetters:[...] }   // filled by computeAllowedKeys()
TC_COURSE.byId(id)
TC_COURSE.steps(lesson)        // e.g. ['watch','character','word','paragraph','challenge'],
                               // early no-word lessons: ['watch','character','mixed','challenge'],
                               // timed: ['timed'], sprint: ['sprint'], boss: ['boss'], intro: ['intro']
TC_COURSE.stepText(lesson, step)   // string to type (boss -> words joined by spaces)
TC_COURSE.bossWords(lesson)    // {phase1:[...], phase2:[...], phase3:[...]} from the unit's keys only
TC_COURSE.wordPool(lesson)     // real words typeable at that lesson
TC_COURSE.allowedThrough(lessonId)  // {chars:Set, shift:bool, words:[...]} for the arcade
TC_COURSE.placementText()      // 2-minute placement passage (mixed, no rare symbols)
TC_COURSE.dailyText(dateStr)   // Daily Challenge passage chosen from the date (YYYY-MM-DD)
TC_COURSE.STEP_LABEL           // {watch:'Watch', character:'Keys', mixed:'Mixed', word:'Words', paragraph:'Sentences', challenge:'Challenge', timed:'Timed test', sprint:'Sprints', boss:'Boss', intro:'Meet the keyboard', lock:'Accuracy lock', exam:'Exam'}
```
Rules: every character a step can produce must be in that lesson's `allowed` set (capitals only
when `allowShift`). `tests/check-lessons.mjs` (node, no deps) loads `shared/course-meta.js` and
`js/course.js` in a vm and generates every step of every lesson 50 times; exit code 1 on any
violation. l1–l24 keep their ids, titles and today's drill text.

## Arcade — `js/games/*.js` → `window.TC_GAMES`

```
TC_GAMES.register({ id, title, blurb, trains, accent:'teal|violet|brass|red', scene:'<svg…>', mount })
mount(el, ctx) -> { destroy() }
ctx = {
  words:[...], chars:'asdf…', digits:bool, symbols:'…',   // only what the learner has learned
  best: number|null, effects:'full|light|off',
  sound(name),                                            // 'key','error','ding','win','lose','pop'
  loadGhost(key) -> obj|null, saveGhost(key, obj),        // Ghost Race replays (cap 20 KB)
  onEnd({ score, best:bool, xp:0..50, stats:{wpm, accuracy, ...}, badges:['storm_1000', …] })
}
```
Game ids: `storm` (Word Storm), `beat` (Beat Keys), `tug` (Tug-of-War), `ghost` (Ghost Race),
`pop` (Key Pop), `tower` (Word Tower), `safe` (Safe Cracker), `boss` (Boss Battles; also mounted by
the course for boss lessons with `ctx.bossLesson = {id, title, words:{phase1,phase2,phase3}}` and
`onEnd({won, accuracy, hearts, xp})`). A game owns its keyboard listener while mounted, removes it on
destroy, ignores Ctrl/Cmd/Alt combos and keys typed in inputs/textareas. `games-dev.html` is a
stand-alone harness to try every game.

## Server — events and state (Phase 2)

Every write is an event with a browser-made id (`crypto.randomUUID()`):
```
{ id, type:'step'|'run'|'game'|'quest'|'placement'|'feedback', at:<device ISO time>,
  lessonId?, step?, gameId?, wpm, accuracy, errors, seconds, stars?, crown?, score?, data?:{} }
```
`GET /api/user/state` returns
```
{ lessons:{ [id]:{status,step,stars,crown,bestWpm,bestAccuracy,attempts,lastPlayed} },
  position:{lessonId,step,at}, totals:{lessonsDone,stars,crowns,bestWpm,avgAccuracy,minutes},
  xp, rank:{name,min,next:[name,min]}, streak:{count,lastDate,freezesUsedThisWeek},
  quests:{date,items:[{id,title,progress,goal,done}]}, badges:[{id,at}], certificates:[{wpm,accuracy,seconds,at}],
  unlocks:[...], settings:{bg,effects,sound,dailyGoal,fingerGuide,keycaps,ink,paper,keySound},
  games:{ [gameId]:{best, runs} }, placement:{level,wpm,accuracy,at}|null }
```
`POST /api/user/events {events:[…]}` answers with the same shape (fresh totals).
