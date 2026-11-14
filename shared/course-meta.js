/* Shared course map for TypeCraft next version: used by the browser (classic
   <script>) and by the Worker (import './shared/course-meta.js', then read
   globalThis.TC_META). Ids l1-l24 are permanent; l25-l78 are new, numbered in
   the order the build prompt lists them. The ORDER array is the course order. */
(function (root) {
  const L = (id, level, unit, kind, title) => ({ id, level, unit, kind, title });
  const LESSONS = [
    // Level 1, Beginner: home row (unit "home", boss l34)
    L('l25',1,'home','intro','Meet the keyboard'), L('l1',1,'home','lesson','Home Base'), L('l2',1,'home','lesson','Adding D & K'),
    L('l26',1,'home','review','Review: F J D K'), L('l3',1,'home','lesson','Adding S & L'), L('l4',1,'home','lesson','Adding A & ;'),
    L('l27',1,'home','review','Review: all eight home keys'), L('l28',1,'home','words','First words'), L('l5',1,'home','lesson','Filling In G & H'),
    L('l29',1,'home','words','Left hand only'), L('l30',1,'home','review','Right hand only'), L('l31',1,'home','words','Space bar rhythm'),
    L('l6',1,'home','lesson','Home Row Fluency'), L('l32',1,'home','words','Home row sentences'), L('l33',1,'home','timed','Speed burst: 30 seconds'),
    L('l34',1,'home','boss','Boss: Home row'),
    // Level 2, Intermediate: top row (unit "top", boss l41) and numbers (unit "numbers", boss l45)
    L('l7',2,'top','lesson','Reaching for E & I'), L('l8',2,'top','lesson','Reaching for R & T'), L('l35',2,'top','review','Review: E I R T'),
    L('l9',2,'top','lesson','Reaching for W & O'), L('l10',2,'top','lesson','Reaching for U & P'), L('l36',2,'top','review','Review: W O U P'),
    L('l11',2,'top','lesson','Reaching for Y & Q'), L('l37',2,'top','words','Top row words'), L('l38',2,'top','words','Double letters'),
    L('l39',2,'top','words','Common pairs: th he er ou'), L('l40',2,'top','words','Home and top row sentences'), L('l41',2,'top','boss','Boss: Top row'),
    L('l12',2,'numbers','lesson','Number Row: 1–5'), L('l13',2,'numbers','lesson','Number Row: 6–0'), L('l42',2,'numbers','review','Review: all ten digits'),
    L('l43',2,'numbers','words','Numbers with words'), L('l44',2,'numbers','timed','Number speed drill'), L('l45',2,'numbers','boss','Boss: Numbers'),
    // Level 3, Advanced: bottom row (unit "bottom", boss l49), capitals ("capitals"), symbols ("symbols", boss l58)
    L('l14',3,'bottom','lesson','Reaching for V & M'), L('l18',3,'bottom','lesson','Reaching for B & N'), L('l46',3,'bottom','review','Review: V M B N'),
    L('l15',3,'bottom','lesson','Reaching for C & ,'), L('l16',3,'bottom','lesson','Reaching for X & .'), L('l17',3,'bottom','lesson','Reaching for Z & /'),
    L('l47',3,'bottom','review','Review: C X Z and , . /'), L('l48',3,'bottom','words','All 26 letters'), L('l49',3,'bottom','boss','Boss: Bottom row'),
    L('l50',3,'capitals','lesson','Left Shift capitals'), L('l51',3,'capitals','lesson','Right Shift capitals'), L('l19',3,'capitals','lesson','Shift & Capitals'),
    L('l52',3,'capitals','words','Names and places'),
    L('l53',3,'symbols','lesson','Sentence marks'), L('l54',3,'symbols','lesson','Brackets and maths'), L('l55',3,'symbols','lesson','Web and money'),
    L('l20',3,'symbols','review','Punctuation & Symbols'), L('l56',3,'symbols','words','Dates, phone numbers, prices'),
    L('l57',3,'symbols','words','Emails and web addresses'), L('l58',3,'symbols','boss','Boss: Capitals and symbols'),
    // Level 4, Mastery (unit "mastery", final boss l68)
    L('l21',4,'mastery','lesson','Common Words Sprint'), L('l59',4,'mastery','words','Top 100 words'), L('l60',4,'mastery','words','Top 300 words'),
    L('l61',4,'mastery','words','Word endings: ing, tion, ed, ly'), L('l62',4,'mastery','words','Tricky words'), L('l22',4,'mastery','lesson','Sentence Fluency'),
    L('l23',4,'mastery','lesson','Paragraph Practice'), L('l63',4,'mastery','lock','Accuracy lock'), L('l64',4,'mastery','sprint','Speed bursts: 15 seconds'),
    L('l65',4,'mastery','words','Quotes and proverbs'), L('l24',4,'mastery','timed','Timed Challenge'), L('l66',4,'mastery','timed','3-minute test'),
    L('l67',4,'mastery','timed','5-minute test'), L('l68',4,'mastery','boss','Final boss: Master Typist'),
    // Level 5, Pro tracks (optional, any order; unit "pro")
    L('l69',5,'pro','pro','Numpad: 4 5 6 home'), L('l70',5,'pro','pro','Numpad: all digits'), L('l71',5,'pro','pro','Numpad: decimals and sums'),
    L('l72',5,'pro','pro','Code: brackets and operators'), L('l73',5,'pro','pro','Code: HTML and CSS lines'), L('l74',5,'pro','pro','Code: JavaScript and Python lines'),
    L('l75',5,'pro','pro','Office: emails and letters'), L('l76',5,'pro','pro','Office: names, addresses, amounts'),
    L('l77',5,'pro','timed','Exam practice: 10-minute passage'), L('l78',5,'pro','exam','Exam practice: strict rules'),
  ];
  const LEVELS = [
    { n: 1, name: 'Beginner', sub: 'Home row', target: 12 },
    { n: 2, name: 'Intermediate', sub: 'Top row and numbers', target: 18 },
    { n: 3, name: 'Advanced', sub: 'Bottom row, capitals and symbols', target: 24 },
    { n: 4, name: 'Mastery', sub: 'Speed and fluency', target: 35 },
    { n: 5, name: 'Pro tracks', sub: 'Optional, in any order', target: 30 },
  ];
  const STARS = [[98, 3], [92, 2], [80, 1]];                 // accuracy % -> stars
  const CROWN_ACCURACY = 95;                                   // plus Challenge wpm >= level target
  const RANKS = [['Apprentice', 0], ['Copyist', 300], ['Clerk', 900], ['Stenographer', 2000], ['Correspondent', 4000], ['Editor', 7000], ['Master Typist', 11000]];
  const XP = { step: 10, firstStar: 20, crown: 50, boss: 100, quest: 30, gameMax: 50 };
  const BOSSES = LESSONS.filter((l) => l.kind === 'boss').map((l) => l.id); // 6
  const META = { LESSONS, LEVELS, ORDER: LESSONS.map((l) => l.id), BY_ID: Object.fromEntries(LESSONS.map((l, i) => [l.id, { ...l, n: i + 1 }])), STARS, CROWN_ACCURACY, RANKS, XP, BOSSES };
  META.starsFor = (acc) => { for (const [min, s] of STARS) if (acc >= min) return s; return 0; };
  META.rankFor = (xp) => { let r = RANKS[0]; for (const x of RANKS) if (xp >= x[1]) r = x; return { name: r[0], min: r[1], next: (RANKS[RANKS.indexOf(r) + 1] || [null, null]) }; };
  root.TC_META = META;
})(typeof globalThis !== 'undefined' ? globalThis : window);
