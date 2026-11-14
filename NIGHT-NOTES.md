# Night notes — TypeCraft next version

Questions, blockers and decisions taken while you slept. Newest at the bottom of each section.

## Decisions taken for you (change any of them)
- Built on `main` without the sign-in gate (PR #4): the build prompt and the preview both say the app works without an account. PR #4 is left open; close it if you agree.
- New lessons get ids l25–l78 in the order the build prompt lists them (`shared/course-meta.js`).
- Testing is light, as you asked: page loads without errors, key flows once, and the allowed-characters check.

## Questions for the morning
- Rank chip in the top bar stays hidden until XP exists (joined in with the server part), so it never shows a made-up number.
- Reset progress resets this browser only for now; resetting an account's data needs a server route (not in the prompt's API list). Add `POST /api/user/reset`?

## Blockers
- None so far. Cloudflare's `wrangler` can't be installed in this workspace, so the Worker was tested with a local stand-in (Node + SQLite), not on Cloudflare itself.

## Known rough edges (to tidy after your review)
- Fixed: badge ids on the Progress page now match the rules (16 were named differently); the "practise 10 minutes" quest shows minutes.
- In lessons a wrong key now waits for the right one (as on the design's typewriter): the error still counts against accuracy, but the caret doesn't move on. Today's app moved on past mistakes. Say if you want the old way back.
- Placement result and the speed on the very first key of a run can read oddly (e.g. a huge wpm after one key) — today's app does the same.
- Ghost replays are kept in this browser only (not yet sent with game events).

## Progress by phase
- Workers (parallel), each a PR into `next/base`: #5 rewards UI, #6 course (78 lessons, allowed-characters check passes), #7 server (events, totals, APIs, nightly rebuild, owner page), #8 arcade (8 games + Daily Challenge).
- Integration (lead, PR #10 — the one to review): everything joined: five-step lessons, bosses in lessons, placement test, events + XP + quests + badges for guests and accounts, Results and Progress screens, course map, the eight games + Daily Challenge, Workshop (keycaps, ink, paper, key sounds by rank), offline service worker with "Update ready", web app manifest.
- Phase 1 (lead): `index.html` split into `css/app.css`, `css/next.css`, `js/app.js`; 8 themes, Effects Full/Light/Off (reduced motion starts at Light), glass top bar with Learn / Arcade / Progress / Workshop / Settings, Settings page (theme, effects, sound, daily goal, finger guide, Reset by typing RESET), floating letters and stars canvas, tilting cards, new look on existing screens. Old saves load (stars, best speed, the old light theme becomes Paper). No sideways scrolling at 400 px.
- Phase 3 (lead): the 3D typewriter is on the home screen (a demo that types by itself) and in every lesson (keys press, the sheet moves, the next key and finger glow; speed, accuracy, time and errors beside it). Workshop keycaps, ink and paper apply to it. The animated background holds still while a lesson is open, so each keystroke shows in the next frame (it was ~80–120 ms in a GPU-less test browser with the background moving).
- Phase 7: offline (service worker + manifest), nightly rebuild (Cron 21:17 UTC), owner health page `/admin` (needs the `OWNER_EMAILS` secret). Checks run: lesson allowed-characters check passes; 45 server tests pass; page smoke test with no console errors at 1440 / 768 / 400 px; first load ~156 KB gzipped (budget 350 KB).
