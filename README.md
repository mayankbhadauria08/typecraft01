# ⌨️ TypeCraft

An intelligent, gamified typing tutor that turns repetitive finger drills into a structured course *and* an arcade experience. It tracks precise typing behavior — not just WPM — to give personalized coaching, then lets you burn off the practice as an actual game.

The whole app is a single `index.html` file with no build step and no dependencies. It runs entirely in the browser; an optional Cloudflare Worker + D1 backend (`src/`) adds accounts, so progress follows you to any browser or device. See [SETUP.md](SETUP.md).

---

## 🚀 Core Features

### 🎓 Structured Lesson Plan
* **24 lessons across 4 levels** — Beginner (home row), Intermediate (top row + numbers), Advanced (bottom row + shift/symbols), Mastery (fluency).
* Lessons only use keys that have already been taught; capitals appear only after the Shift lesson, and `'` and `?` are taught in the symbols lesson.
* Most lessons run three stages in sequence — **Characters → Words → Paragraph** — and any stage can be jumped to directly at any time. Lessons 1–3 (no vowels yet) run **Characters → Mixed** instead of fake words.
* Word stages draw from a built-in list of common English words filtered to the keys you know; paragraph stages mix hand-written text with freshly generated sentences, so runs don't repeat.
* The **Timed Challenge** is a real 60-second test with a countdown.
* An animated on-screen pair of hands highlights the exact finger for the next key as you type.
* Lessons are fully unlocked from the start; a **3-star rating** (based on accuracy) is saved per lesson so you can track mastery over time.

### 🤖 Typing Coach & Telemetry Engine
* **Latency Mapping:** Tracks the millisecond gap between specific key-to-key transitions (e.g. `j → u`) to find exactly where your rhythm breaks down.
* **Error Classification:** Every mistake is auto-tagged as an **adjacent-key** slip, a **transposition** (e.g. typing "teh" for "the"), or an **omission**, using real-time pattern detection.
* **Plain-language coaching:** The bot turns that data into a specific sentence, e.g. *"You type 'e' and 'r' quickly, but your rhythm stumbles moving from 'j' to 'u'."*
* **Smart Practice Generator:** One click builds a custom drill targeting your single weakest letter cluster, pulling real words from the lesson bank that contain it.
* **Problem Key Review:** A running per-key accuracy log surfaces your worst keys on the dashboard, with a one-click drill built just for them.

### 🕹️ Arcade "Fun Mode" Mini-Games
* **Space Invaders:** Words fall like ships on an HTML5 Canvas; type them to fire. Long words spawn as multi-hit "boss" ships with a health bar; short words are fast single-hit scouts.
* **Metronome Rhythm Challenge:** A selectable-BPM click track (60–120 BPM) sets the beat — typing within the timing window builds a combo multiplier; drifting off-beat resets it.
* **Tug-of-War:** Race a bot typist at a speed you choose (30–80 WPM). Every correct keystroke pulls a rope-and-flag visual toward you in real time; the bot pulls back at a steady pace.

### 👤 Accounts (optional)
* Sign up / sign in with email and password; profile, change password, forgot password (email via Resend), sign out everywhere, delete account.
* **My learning** page: completed / in progress / remaining lessons, overall progress, last activity, recent runs, and a Continue button.
* Progress saves to the server automatically as you type: lessons, stars, best WPM, per-key stats, streak, and the lesson and stage you were on. Sign in on another device and carry on where you left off.
* Without signing in, everything works as before. Guest progress can be added to a new account once, and is never overwritten.

### 📊 Progress & Feedback
* Live **time / WPM / accuracy / error** stats updated as you type (WPM counts only correct characters still on the page, so backspacing and retyping can't inflate it), plus an end-of-lesson **WPM-over-time graph** (Canvas-drawn) with an accuracy overlay.
* A **daily streak counter** that tracks consecutive practice days.
* A built-in **feedback box** (5-star rating + comments) so you can log impressions as you go.
* Ink (dark) / paper (light) theme toggle, and a sound button that cycles key sounds between on, quiet, and muted.

---

## 🛠️ Tech Stack & Architecture

* **Frontend:** Vanilla HTML5 + CSS3 (no framework, no Tailwind — hand-written custom properties for theming)
* **Game & Graph Engine:** Vanilla JavaScript (ES6+), HTML5 Canvas API (Space Invaders rendering, WPM graph)
* **Audio:** Web Audio API — mechanical-click and error sounds are synthesized oscillators, no audio files
* **State & Persistence:** `localStorage` — lesson progress/stars, streak, per-key accuracy stats, key-transition latency, error classifications, theme, and feedback all persist locally in your browser
* **Backend (optional, for accounts):** a Cloudflare Worker (`src/`) with a Cloudflare D1 database (`migrations/`). Without it, everything runs client-side and nothing leaves your machine. With it, signed-in progress lives in D1. Feedback always stays local.

### 📂 File Structure

Unlike a typical multi-file project, TypeCraft is intentionally a **single self-contained file** — easier to share, host, or drop into any static site with zero setup:

```text
├── index.html       # The entire app — markup, styles, and all JS logic in one file
├── src/             # Cloudflare Worker: /api/* for accounts and progress
├── migrations/      # D1 database tables
├── tests/           # API tests + a local test server (Node 22.13+)
├── wrangler.jsonc   # Worker config (static assets + D1 binding)
├── SETUP.md         # How to switch on accounts
└── README.md        # This file
```

Everything that would normally live in `src/components`, `src/games`, `src/telemetry`, and `src/bot` in a larger app instead lives as clearly commented sections inside `index.html`'s single `<script>` block:

```text
index.html
 ├─ 1. Lesson data (24 lessons, 3 drill types each)
 ├─ 2–3. Text generators + DOM rendering
 ├─ 4. Keyboard engine + live metrics
 ├─ 5. Audio feedback (Web Audio API)
 ├─ 6. Streak, progress & problem-key tracking
 ├─ 6b. Typing Coach (latency mapping + error classification + smart practice)
 ├─ 7. WPM graph (Canvas)
 ├─ 8. View switching / lesson lifecycle
 ├─ 9. Fun Mode — Space Invaders
 ├─ 10. Fun Mode — Metronome Rhythm Challenge
 ├─ 11. Fun Mode — Tug-of-War
 ├─ 12. Feedback box
 └─ 13. Accounts (sign in, profile, automatic progress sync)
```

---

## ⚡ Quick Start

No installation, no `npm install` — this is plain HTML/CSS/JS.

**Run it locally:**
1. Download `index.html`.
2. Double-click it (or right-click → Open with → your browser).

**Host it for a real shareable link (GitHub Pages):**
1. Create a new repo (e.g. `typecraft`) on GitHub.
2. Upload `index.html` to the repo root (**Add file → Upload files**).
3. Go to **Settings → Pages** → Source: **Deploy from a branch** → branch `main`, folder `/ (root)` → **Save**.
4. Your live link appears at `https://yourusername.github.io/typecraft/` within about a minute.

Progress (streak, stars, coach data) is tied to the browser + origin you use, so bookmark whichever URL you settle on to keep building on the same history.

---

## 📈 Future Roadmap

Ideas not yet built, in rough order of interest:

- [ ] **Sudden Death mode** — one wrong key ends the run.
- [ ] **Blind Ink mode** — text stays hidden until time's up, forcing pure touch-typing.
- [ ] **Bomb Defusal mode** — symbol-heavy strings under a countdown; errors cut time.
- [ ] **Ghost/Shadow racing** — race your own historical average instead of (or alongside) the bot.
- [ ] **Fatigue detection** — flag accuracy drops mid-session and suggest a break.
- [ ] Custom mechanical-keyboard sound profiles (blue/red/brown switch clicks).
