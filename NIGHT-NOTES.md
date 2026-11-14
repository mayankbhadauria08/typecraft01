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

## Progress by phase
- Workers (parallel), each a PR into `next/base`: #5 rewards UI, #6 course (78 lessons, allowed-characters check passes), #7 server (events, totals, APIs, nightly rebuild, owner page), #8 arcade (8 games + Daily Challenge).
- Phase 1 (lead): `index.html` split into `css/app.css`, `css/next.css`, `js/app.js`; 8 themes, Effects Full/Light/Off (reduced motion starts at Light), glass top bar with Learn / Arcade / Progress / Workshop / Settings, Settings page (theme, effects, sound, daily goal, finger guide, Reset by typing RESET), floating letters and stars canvas, tilting cards, new look on existing screens. Old saves load (stars, best speed, the old light theme becomes Paper). No sideways scrolling at 400 px.
