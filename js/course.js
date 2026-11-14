/* TypeCraft course engine: all 78 lessons in course order and the text
   generators for every step. Classic script, no imports: attaches
   window.TC_COURSE (globalThis.TC_COURSE in Node). Needs TC_META from
   shared/course-meta.js loaded first.

   Rule kept for every lesson: a step may only produce characters taught by
   that lesson or an earlier one in course order (TC_META.ORDER). Capitals are
   taught like any other key (l50 right-hand capitals, l51 left-hand capitals)
   and need allowShift. tests/check-lessons.mjs enforces it. */
(function (root) {
  'use strict';
  const META = root.TC_META;
  if (!META) throw new Error('course.js needs shared/course-meta.js (TC_META) loaded first');

/* ==========================================================================
   1. TODAY'S 24 LESSONS, copied unchanged from index.html section 1.
      Ids are permanent. Only l20.teach changes below (l53-l55 now teach its
      symbols, so it becomes their mixed review).
   ========================================================================== */
const BASE = [
  { id:'l1', tier:'Beginner — Home Row', keys:['F','J'], teach:'fj', title:'Home Base',
    charDrill:"fff jjj fj fj jf jf fjf jfj ff jj fjfj jfjf" },
  { id:'l2', tier:'Beginner — Home Row', keys:['D','K'], teach:'dk', title:'Adding D & K',
    charDrill:"ddd kkk dk dk kd kd dkd kdk fjdk kdjf" },
  { id:'l3', tier:'Beginner — Home Row', keys:['S','L'], teach:'sl', title:'Adding S & L',
    charDrill:"sss lll sl sl ls ls sls lsl fjdksl lskdjf" },
  { id:'l4', tier:'Beginner — Home Row', keys:['A',';'], teach:'a;', title:'Adding A & ;',
    charDrill:"aaa ;;; a; a; ;a ;a a;a ;a; fjdksla ;alskdjf",
    wordDrill:["dad","sad","lad","ask","add","fads","flask","salad","salsa","alfalfa"],
    paragraphDrill:"a lad asks a dad; a sad lad adds a flask; salad falls; salsa falls; a lass asks a lad; alfalfa falls; add a flask; ask a lass" },
  { id:'l5', tier:'Beginner — Home Row', keys:['G','H'], teach:'gh', title:'Filling In G & H',
    charDrill:"ggg hhh gh gh hg hg ghg hgh half glass flash",
    wordDrill:["half","glass","flash","gala","gash","hall","lag","gas","ask","flask"],
    paragraphDrill:"a lad has a flask; a gala had a glass; glass falls; a flash; a gash; ask a lass; half a salad falls; add a dash salsa" },
  { id:'l6', tier:'Beginner — Home Row', keys:['fluency'], teach:'', title:'Home Row Fluency',
    charDrill:"asdfghjkl; ;lkjhgfdsa asdf jkl; fdsa lkj;",
    wordDrill:["flask","glass","salad","salsa","alfalfa","half","flash","gala","ask","lass"],
    paragraphDrill:"dad had a flask; a lad asks a lass; glass falls; salsa gala; ask dad; a sad lad had a glass flask; all glass falls; add salsa; ask a lass" },

  { id:'l7', tier:'Intermediate — Top Row', keys:['E','I'], teach:'ei', title:'Reaching for E & I',
    charDrill:"eee iii ei ei ie ie eie iei fjdksl eifj iehg",
    wordDrill:["side","hide","life","aide","die","lid","kid","field","shield","dial"],
    paragraphDrill:"a kid hides a die; a shield aids a lad; life is a gas; a field lies; a lass hides a lid; a die falls; a kid slides" },
  { id:'l8', tier:'Intermediate — Top Row', keys:['R','T'], teach:'rt', title:'Reaching for R & T',
    charDrill:"rtrt trtr rt tr rat tar art trade dirt",
    wordDrill:["rat","tar","art","dirt","trail","start","stare","tire","tired","state"],
    paragraphDrill:"the star has light; dirt hides the tale; a trail leads a kid; a rat starts a fire; a lid falls; her sister stares; she stirs the salad; a tired girl rests" },
  { id:'l9', tier:'Intermediate — Top Row', keys:['W','O'], teach:'wo', title:'Reaching for W & O',
    charDrill:"wo ow wow low tow flow slow throw shadow",
    wordDrill:["low","tow","flow","slow","throw","shadow","word","grow","glow","wood"],
    paragraphDrill:"the old fowl was slow to grow; a low tide throws a shadow; a word of gold falls; she rows to shore; a girl trades a dirt trail for a low road" },
  { id:'l10', tier:'Intermediate — Top Row', keys:['U','P'], teach:'up', title:'Reaching for U & P',
    charDrill:"up pu pup put pat pot pet pit pull push",
    wordDrill:["put","pup","pull","push","pure","pour","plus","pile","upset","output","spout","path"],
    paragraphDrill:"she put the pup out; a pilot pours a hot drip; the plot was set apart; push the pail up the path; the spot was pale" },
  { id:'l11', tier:'Intermediate — Top Row', keys:['Y','Q'], teach:'yq', title:'Reaching for Y & Q',
    charDrill:"yq qy yes yet quit quiet quest year",
    wordDrill:["your","yes","yet","quit","quiet","quest","quote","query","story","study","sturdy","truly"],
    paragraphDrill:"your quiet quest stays true at dusk; a study of trust guides you truly; a story tours the world; she tries to quote it slowly" },
  { id:'l12', tier:'Intermediate — Numbers', keys:['1','2','3','4','5'], teach:'12345', title:'Number Row: 1–5',
    charDrill:"1 2 3 4 5 11 22 33 a1 s2 d3 f4 g5",
    wordDrill:["12","34","51","23","45","142","215","314","521","413"],
    paragraphDrill:"flight 415 departs at gate 23; the door is 512; she has 21 keys; 34 pages hold a total of 125" },
  { id:'l13', tier:'Intermediate — Numbers', keys:['6','7','8','9','0'], teach:'67890', title:'Number Row: 6–0',
    charDrill:"6 7 8 9 0 67 89 90 606 707",
    wordDrill:["67","89","90","1990","2024","60","78","906","1000","250"],
    paragraphDrill:"the year 1990 had 60 hot days; 78 people saw 90 stars; she kept a diary of 250 pages; a total of 1000 words" },

  { id:'l14', tier:'Advanced — Bottom Row', keys:['V','M'], teach:'vm', title:'Reaching for V & M',
    charDrill:"vm mv move have make time game visit",
    wordDrill:["move","have","make","time","game","mile","visit","vivid","value","smile"],
    paragraphDrill:"we move a mile every visit; make more time; a vivid memory stays; she gives a warm smile; a movie starts the same day" },
  { id:'l18', tier:'Advanced — Bottom Row', keys:['B','N'], teach:'bn', title:'Reaching for B & N',
    charDrill:"bn nb ban bun born barn bank bright",
    wordDrill:["ban","bun","born","barn","bank","bright","bunny","between","brand","begin"],
    paragraphDrill:"a bright bunny ran between the barn and the bank; a new brand began; she will begin a new plan now" },
  { id:'l15', tier:'Advanced — Bottom Row', keys:['C',','], teach:'c,', title:'Reaching for C & ,',
    charDrill:"c, ,c cat, cot, cut, come, care,",
    wordDrill:["cat","cot","cut","come","care","voice","place","close","office","race"],
    paragraphDrill:"come here, watch closely, then act, please; a cat sat, a cot moved, a voice spoke clearly, calm, slow, quiet" },
  { id:'l16', tier:'Advanced — Bottom Row', keys:['X','.'], teach:'x.', title:'Reaching for X & .',
    charDrill:"x. .x fox. box. mix. fix. next. exit.",
    wordDrill:["fox","box","mix","fix","exit","next","text","sixty","taxi","relax"],
    paragraphDrill:"the fox sat next to a box. it was fixed. a text was mailed. sixty taxis exit at rest." },
  { id:'l17', tier:'Advanced — Bottom Row', keys:['Z','/'], teach:'z/', title:'Reaching for Z & /',
    charDrill:"z/ /z size zone maze/ lazy hazy dozer",
    wordDrill:["size","zone","maze","lazy","hazy","zero","amaze","gaze","haze","doze"],
    paragraphDrill:"a lazy fox grazed near the size of a maze. a hazy haze filled the zone at dusk. a dozer moves slowly, a gaze holds steady." },
  { id:'l19', tier:'Advanced — Shift & Symbols', keys:['Shift'], teach:'', shift:true, title:'Shift & Capitals',
    charDrill:"The Cat The Dog A Big Apple New York",
    wordDrill:["The","Cat","Monday","New York","London","Tokyo","Begins","Now","Capital","Title"],
    paragraphDrill:"The Cat Sat. Monday Begins Now. New York, London, and Tokyo are big cities. Every Title deserves a Capital Letter.",
    paragraphs:["Paris, Rome, and Berlin are old cities. Maria and James met in Lisbon on a Friday in June. The Atlantic Ocean lies between Europe and North America."] },
  { id:'l20', tier:'Advanced — Shift & Symbols', keys:['!','@','#','$','%','&','*','(',')','-','_','=','+',"'",'"','?',':'], teach:`!@#$%&*()-_=+'"?:`, title:'Punctuation & Symbols',
    charDrill:`! @ # $ % & * ( ) - _ = + ' " ? : it's don't why? note: (a) 2+2=4 50%`,
    wordDrill:["$12.50","8%","(about)","name@example.com","555-123-4567","\"Wait!\"","he said,","costs $5","call now:","email me","don't","it's","why?","#1","a&b","x=y+1","snake_case"],
    paragraphDrill:`He said, "Wait!" then left; it costs $12.50, about 8%. Isn't that odd? Email me at name@example.com or call 555-123-4567.`,
    paragraphs:[`Don't panic: the file (report_v2) is 98% done & due at 5 pm. Can you check it? Use #urgent if it's late, or email ops@example.com.`] },

  { id:'l21', tier:'Mastery — Fluency', keys:['speed'], teach:'', title:'Common Words Sprint',
    charDrill:"th he in er an re nd at on nt ha es",
    wordDrill:["the","and","for","you","are","with","this","that","from","have","they","will","one","all","can"],
    paragraphDrill:"The most common words in English carry most of everyday writing. Once they are automatic, your hands barely pause between them, and your speed climbs on its own.",
    paragraphs:[
      "People often think good typists move their fingers quickly, but the real secret is that they never stop to search for a key. Every word you use each day is a chance to practice that calm, steady flow.",
      "Short words like the, and, for, and with appear in almost every sentence you write. When your hands know them by heart, longer words feel easier, because there is less to think about between them."] },
  { id:'l22', tier:'Mastery — Fluency', keys:['sentences'], teach:'', title:'Sentence Fluency',
    charDrill:"th he in er an re nd at on",
    wordDrill:["market","customers","coffee","brewed","quiet","street","busy","minutes","early","arrive"],
    paragraphDrill:"The market opens early, and the first customers arrive before the coffee is even brewed. A quiet street turns busy within minutes.",
    paragraphs:[
      "The train left the station a few minutes late, but nobody seemed to mind. Most passengers had a book, a coffee, or a window to look out of, and the morning light made the fields glow.",
      "A good recipe tells you what to do, but a good cook knows why. Taste as you go, keep your knife sharp, and clean up while the water boils, so the kitchen never gets ahead of you."] },
  { id:'l23', tier:'Mastery — Fluency', keys:['paragraph'], teach:'', title:'Paragraph Practice',
    charDrill:"th he in er an re nd at on nt",
    wordDrill:["rhythm","fingers","keyboard","mechanics","disappear","practice","fluency","goal","mind","free"],
    paragraphDrill:"Learning to type well is less about speed and more about rhythm. Once your fingers know the keyboard, your mind is free to think about the words instead of where your hands need to go. That is the real goal of practice: to make the mechanics disappear.",
    paragraphs:[
      "Every skill has a stage where progress feels slow and the gains are hard to see. That is usually the moment when the most important change is happening, because your habits are being rebuilt underneath the surface. Keep showing up, and one day the new way will simply feel normal.",
      "Look at the screen, not at your hands. At first this makes you slower and you will make more mistakes, which is frustrating. But each time you resist the urge to glance down, your fingers learn the map a little better, until the keyboard becomes something you feel rather than see."] },
  { id:'l24', tier:'Mastery — Fluency', keys:['60 seconds'], teach:'', timed:60, title:'Timed Challenge',
    charDrill:"th he in er an re nd at on nt ha",
    wordDrill:["wrists","relaxed","reach","accurate","automatic","favor","clean","messy","daily","lasting"],
    paragraphDrill:"Keep both wrists low and relaxed, let your fingers return to the home row after every reach, and resist the urge to look down at the keys. Speed follows naturally once accuracy becomes automatic, so favor a slow, clean pass over a fast, messy one. Small daily sessions build more lasting skill than one long, exhausting sprint.",
    paragraphs:["A typing test measures two things at once: how fast you move and how often you are right. The second matters more, because every error costs time to notice and fix. Aim for a pace you can hold without stumbling, then let it climb on its own."] }
];
BASE.find(l => l.id === 'l20').teach = '';

/* ==========================================================================
   2. WORD LISTS
   ========================================================================== */
const COMMON_WORDS = ("a about above across act add after again age ago air all almost alone along also always am among an and animal another answer any appear are area arm around art as ask at away baby back bad bag ball bank base be bear beat beautiful became because become bed been before began begin behind being believe below best better between big bird black blue boat body book both bottom box boy bread break bring brother brought build built busy but buy by call came can car care carry case cat catch caught cause cell center certain chair chance change check child choose city class clean clear close cloud cold color come common cook cool copy corner could count country course cover cross cup cut dark day dear deep desk did die different dinner do does dog done door down draw dream dress drink drive drop dry during each early earth easy eat edge egg eight either else end enough even evening ever every eye face fact fair fall family far farm fast father fear feel feet few field fight fill final find fine fire first fish five floor flower fly follow food foot for force form found four free fresh friend from front fruit full game garden gave get girl give glad glass go gold gone good got grass great green ground group grow had hair half hall hand happen happy hard has hat have he head hear heard heart heat heavy held help her here high hill him his hit hold hole home hope horse hot hour house how huge idea if in inch inside into iron is island it its job join joy jump just keep kept key kind king kitchen knew know lake land large last late laugh lay lead learn least leave led left leg less let letter level lie life lift light like line list listen little live long look lost lot loud love low made main make man many map mark market may me mean meet men middle might mile milk mind minute miss moment money month moon more morning most mother mountain move much music must my name near need never new next nice night nine no noise north nose not note nothing notice now number object of off office often oil old on once one only open or order other our out over own page paint pair paper park part pass past path pay people pick picture piece place plan plant play please point poor post pull push put quick quiet quite rain ran rather reach read ready real red remember rest rich ride right ring river road rock roll room round row rule run safe said sail salt same sand sat save saw say school sea seat second see seed seem seen sell send sent set seven shall shape share sharp she ship shoe shop short should show shut side sign silent simple since sing sister sit six size skin sky sleep slow small smell smile snow so soft soil some song soon sound south space speak special speed spell spend spring square stand star start state station stay step still stone stood stop store storm story straight strange street strong study such sugar summer sun sure surface sweet swim table tail take talk tall teach team tell ten than thank that the their them then there these they thick thin thing think third this those though thought three through throw tie time tiny to today together told tomorrow too took top total touch toward town track trade train tree trip true try turn two under until up upon us use usual valley very visit voice wait walk wall want war warm was wash watch water wave way we wear weather week well went were west what wheel when where which while white who whole why wide wild will win wind window winter wish with without woman wonder wood word work world would write wrong yard year yellow yes yet you young your").split(' ');

/* The most frequent English words, in rough frequency order. */
const TOP100 = ("the be to of and a in that have I it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us").split(' ');
const NEXT_WORDS = ("is was are been has had were said did made find where much too very still being going why before never here more always those tell really something nothing while last might great old off came since against right used three himself few house world course however home small through between both during school own every number part place case week company system program question night point hand high must thing man life child woman down may long little each same another should around again many under does feel seem leave call keep let begin help show hear play run move live believe hold bring happen write provide sit stand lose pay meet include continue set learn change lead understand watch follow stop create speak read allow add spend grow open walk win offer remember love consider appear buy wait serve send expect build stay fall cut reach remain suggest raise pass sell require report decide pull family money water story fact month lot book eye job word business issue side kind head far black important large next early young public bad able late hard major better strong possible whole free true full special easy clear recent certain personal red difficult available likely short single current wrong private past fine common poor natural similar hot central happy serious ready simple left general blue dark various close cold final main green nice huge popular city friend north south air food door paper music road table").split(' ');
const TOP300 = Array.from(new Set(TOP100.concat(NEXT_WORDS))).slice(0, 300);

/* Original prose (written for TypeCraft) for timed tests, placement and the
   Daily Challenge. Letters, spaces and . , ' only. */
const PROSE = [
  "A small garden can teach patience. Seeds do not care how often you check on them, and the soil keeps its own calendar. You water, you wait, and one morning there is a green line where yesterday there was only dirt. Typing grows the same way, quietly and under the surface, until it suddenly shows.",
  "The old lighthouse on the point has not guided a ship in years, but people still walk out to it at sunset. They sit on the warm rocks, watch the gulls ride the wind, and talk about nothing in particular. Some places are useful because they ask nothing of us.",
  "When you learn a new route through a city, the first trip feels long. You read every sign and doubt every turn. By the tenth trip you are thinking about dinner, and your feet simply know the way. Good practice turns careful steps into easy habits.",
  "Rain arrived just after lunch, light at first and then heavy enough to drum on the roof. The children pressed their faces to the window and counted the seconds between lightning and thunder. By evening the storm had moved east, and the whole street smelled clean.",
  "A good letter does not need to be long. It needs a clear reason, a kind word, and an ending that tells the reader what happens next. Read it aloud once before you send it, and cut any sentence that does not earn its place.",
  "The baker starts work while the town is still asleep. Flour, water, salt and time are all she needs, along with hands that know when the dough is ready. By six o'clock the first loaves are cooling on the rack, and a queue has already formed outside.",
  "Most mistakes at the keyboard come from rushing, not from a lack of skill. When you notice your errors climbing, slow down for a few lines. Let each key land cleanly, keep your eyes on the text, and the speed will return on its own, steadier than before.",
  "The museum keeps a room full of old clocks. None of them agree on the time, and each one ticks with its own small voice. Visitors laugh at first, then grow quiet, listening to a hundred seconds pass in a hundred different ways.",
  "On long train rides she liked to sketch the other passengers. A man asleep against the window, a child sorting stones from her pocket, two friends sharing a sandwich. She never showed anyone the drawings, but she kept every notebook.",
  "Every team has a member who remembers the details, such as where the spare keys are kept, which supplier is always late, and why the printer on the second floor jams on Fridays. Value that person. Small knowledge, shared freely, saves a great deal of time.",
  "Learning anything new follows a familiar pattern. At first the steps feel strange and slow. Then they become possible, though they still need thought. Finally they become automatic, and you forget that you ever had to learn them at all.",
  "The river was low that summer, and the old stepping stones showed again for the first time in years. People came from the village to cross them, slowly and carefully, laughing when someone slipped. It felt like a small holiday that nobody had planned.",
  "Before a long session, take a moment to sit well. Keep your feet flat on the floor, your shoulders loose, and your wrists floating above the keys rather than resting on the desk. A comfortable body types longer and makes fewer errors, and it will thank you tomorrow.",
  "A map is a promise that someone has been here before. Each line on it was walked, measured or flown over, and every name was chosen by a person. When you unfold one on a kitchen table, you are borrowing the patience of many strangers.",
  "The workshop at the end of the lane smells of oil and cut wood. Tools hang on the wall in the order they are used, and each one has a painted outline so it always finds its way home. Order like that is not fussy. It is how a busy person keeps their mind free for the work.",
  "Our neighbour keeps bees at the bottom of her garden. She moves slowly around the hives, never waving her hands, and the bees ignore her completely. She says the secret is simple. Be calm, be patient, and never open a hive on a cold, windy day."
];
const PROVERBS = [
  "Actions speak louder than words.", "A stitch in time saves nine.", "Many hands make light work.",
  "Practice makes perfect.", "Slow and steady wins the race.", "Rome was not built in a day.",
  "Where there's a will, there's a way.", "The early bird catches the worm.", "Look before you leap.",
  "Better late than never.", "Every cloud has a silver lining.", "Don't count your chickens before they hatch.",
  "Still waters run deep.", "A journey of a thousand miles begins with a single step.", "Fortune favours the bold.",
  "When in doubt, slow down.", "A calm hand types faster than a hurried one.", "Mistakes are lessons that arrive early.",
  "Good habits are built one quiet day at a time.", "The keys you fear are the keys you should practise."
];

/* ==========================================================================
   3. THE 54 NEW LESSONS (l25-l78). Fields as BASE, plus:
      focus      letters a review or words lesson is about (word pool prefers them)
      ownWords   the word step uses only wordDrill (no common-word extras)
      noWords    key drills only (Keys, Mixed, Challenge)
      mixKeys    keys the Mixed step may use (default: every letter learned)
      boss       {phase1, phase2, phase3} for boss lessons
   ========================================================================== */
const NEW = [
  /* ---- Level 1: home row ---- */
  { id:'l25', keys:['F','J','Space'], teach:'fj',
    intro:"f j f j fj jf ff jj f j",
    charDrill:"f j fj jf ff jj", wordDrill:[], paragraphDrill:"",
    watch:{ keys:['f','j',' '], note:'Sit tall, feet flat. Feel the bumps on F and J: your index fingers rest there. Thumbs hover over the space bar. Press F, J and space to begin.' } },
  { id:'l26', keys:['F','J','D','K'], teach:'', focus:'fjdk', mixKeys:'fjdk',
    charDrill:"fd jk df kj fdk jkd dfj kjf fjdk kdjf dkfj jfkd ffdd jjkk fdfd jkjk",
    wordDrill:[], paragraphDrill:"",
    watch:{ keys:['f','j','d','k'], note:'No new keys. Index fingers on F and J, middle fingers on D and K. Keep them resting there between strokes.' } },
  { id:'l27', keys:['A','S','D','F','J','K','L',';'], teach:'', focus:'asl;',
    charDrill:"asdf jkl; fdsa ;lkj as df jk l; sad lad ask all fall a;sl dk;a",
    wordDrill:["ask","all","fall","sad","dad","lad","add","flask","salad","lass","alas","fads"],
    paragraphDrill:"a lad asks dad; all lads fall; a sad lass asks; add a salad; dad falls; ask all lads; a flask falls",
    watch:{ keys:['a','s','d','f','j','k','l',';'], note:'All eight home keys. Each finger owns one key; the little fingers take A and ;.' } },
  { id:'l28', keys:['words'], teach:'', ownWords:true,
    charDrill:"dad sad lad ask add all fall lass as ad",
    wordDrill:["dad","sad","lad","ask","add","all","fall","flask","salad","lass","alfalfa"],
    paragraphDrill:"dad adds salad; a lad asks; all lads fall; a lass asks dad; a sad lad adds alfalfa; ask a lass; a flask falls",
    paragraphs:["a sad dad asks a lad; all salad falls; add a flask; a lass adds alfalfa; dad asks all lads"],
    watch:{ keys:['a','s','d','f','j','k','l'], note:'Your first real words, made only from home row keys. Keep every finger on its home key.' } },
  { id:'l29', keys:['A','S','D','F','G'], teach:'', ownWords:true, mixKeys:'asdfg',
    charDrill:"asdfg gfdsa ag fg sg dg gas sag gad fad sad",
    wordDrill:["sad","dad","fad","gas","sag","add","saga","dads","fads","sagas","adds","gags"],
    paragraphDrill:"dad adds gas; sad dads sag; a saga adds fads; add gas; sad sagas; dads add a saga",
    watch:{ keys:['a','s','d','f','g'], note:'Left hand only. The left index finger stretches right to G and comes back to F.' } },
  { id:'l30', keys:['H','J','K','L',';'], teach:'', noWords:true, mixKeys:'hjkl;',
    charDrill:"hjkl; ;lkjh hj jk kl l; hh jj kk ll ;; hjk jkl kl; ;lk lkj kjh h;h j;j",
    wordDrill:[], paragraphDrill:"",
    watch:{ keys:['h','j','k','l',';'], note:'Right hand only. No real words use just these keys, so this is a key drill. The right index finger reaches left to H.' } },
  { id:'l31', keys:['Space'], teach:'', ownWords:true,
    charDrill:"a s d f j k l a s ha as ad has had",
    wordDrill:["as","ad","ha","has","had","add","ask","lad","gas","dad","sad","all","ash","half","flag","glad","lag","dash","shall","fall","hall"],
    paragraphDrill:"a lad has a flag; dad had half a glass; ask dad; all lads dash; a sad lass has gas; shall dad ask",
    watch:{ keys:[' '], note:'Tap the space bar with your thumb at a steady beat, like a clock. Short words, even rhythm.' } },
  { id:'l32', keys:['sentences'], teach:'',
    charDrill:"asdf jkl; gh hg as; ha; ask; all; has;",
    wordDrill:["flags","glass","shall","halls","flask","dash","salsa","lads","asks","has","gala","flash"],
    paragraphDrill:"a lad has a flask; dad shall ask a lass; all glass flasks fall; a sad lad has half a salad; ask dad; dad asks all lads; a flag falls; dash",
    paragraphs:["a lass has a glass flask; half a salsa falls; dad shall dash; all lads ask a gal",
      "dad has a flag; a lad asks dad; all halls flash; a sad lass adds salsa; ask a lad"],
    watch:{ keys:['a','s','d','f','g','h','j','k','l',';'], note:'Longer phrases joined with ; on the right little finger. Keep a steady pace across the whole line.' } },
  { id:'l33', keys:['30 seconds'], teach:'', timed:30,
    charDrill:"as ad ha has had all ask",
    wordDrill:["ask","all","fall","sad","dad","lad","add","flask","salad","glass","half","flash","has","had","gas","shall","hall","dash"],
    paragraphDrill:"a lad has a flask; dad had half a glass; ask a lass",
    watch:{ keys:['a','s','d','f','g','h','j','k','l',';'], note:'Thirty seconds of home row words. Go steady first, then push.' } },
  { id:'l34', keys:['boss'], teach:'',
    boss:{ phase1:["as","ad","ha","had","has","lad","dad","sad","gas","all","ask","fall"],
      phase2:["flask","glass","shall","flash","salad","halls","flags","lads","dash","gala"],
      phase3:["alfalfa","flasks","salads","glass;","flash;","half;","falls;","salsas","shall;","gaffs"] },
    charDrill:"asdfg hjkl;", wordDrill:[], paragraphDrill:"",
    watch:{ keys:['a','s','d','f','g','h','j','k','l',';'], note:'Boss: home row words only. Each word hits the boss; mistakes heal it.' } },

  /* ---- Level 2: top row ---- */
  { id:'l35', keys:['E','I','R','T'], teach:'', focus:'eirt',
    charDrill:"ei ie rt tr er re it ti ier tire edit riser",
    wordDrill:["tire","tried","stir","rest","tide","edit","site","tier","their","trade","first","heart","ride","dirt","great","straight"],
    paragraphDrill:"her sister edits a tale; a tired girl rides a trail; their first great heart starts; fire is red; she sits; a tide rises at the shed",
    watch:{ keys:['e','i','r','t'], note:'No new keys. E and I are middle-finger reaches up; R and T belong to the left index finger.' } },
  { id:'l36', keys:['W','O','U','P'], teach:'', focus:'woup',
    charDrill:"wo ow up pu wop pow out our pour wore",
    wordDrill:["pour","word","work","group","sport","would","power","house","should","proud","output","sweep","outside","sure"],
    paragraphDrill:"the group would work up a proud sweat; pour the hot soup; a power tower stood out; she wrote a short word to her pal",
    watch:{ keys:['w','o','u','p'], note:'No new keys. W and O are ring-finger reaches; U is the right index, P the right little finger.' } },
  { id:'l37', keys:['top row'], teach:'', focus:'qwertyuiop',
    charDrill:"qwert yuiop poiuy trewq qw er ty ui op",
    wordDrill:["typewriter","property","pottery","quiet","require","equity","priority","territory","proper","poetry","tower","quote","route","youth","prepare","repeat","quality","write","report","quarter","purpose","request","utility","story"],
    paragraphDrill:"the typewriter sat quiet; her poetry was proper; a tower rose past the territory; repeat the quote; write a short report for the quarter",
    watch:{ keys:['q','w','e','r','t','y','u','i','o','p'], note:'Every top row key. Reach up and come straight back to the home row.' } },
  { id:'l38', keys:['double letters'], teach:'', ownWords:true,
    charDrill:"ee oo ll ss pp tt ff dd rr gg",
    wordDrill:["tree","pool","letter","hill","pass","puppy","sorry","egg","see","feet","keep","sleep","wood","food","root","good","look","took","too","off","staff","still","tell","well","yell","will","fill","door","floor","pretty","little","apple","happy","sweet","three","street","yellow","follow","jelly","kitty","grass","dress","press","guess"],
    paragraphDrill:"a little puppy sat at the door; three sweet apples fell off the tree; she was sorry to see the pool so still; good food keeps you happy; look at the yellow hill",
    watch:{ keys:['e','o','l','s','p','t'], note:'Double letters: press the same key twice with a quick, even bounce.' } },
  { id:'l39', keys:['th','he','er','ou'], teach:'', ownWords:true,
    charDrill:"th he er ou re at es it is or to st ea ti ha se",
    wordDrill:["the","there","other","their","her","here","hour","our","out","you","outer","either","weather","father","rather","sour","pour","tough","proud","three","those","house","hotel","path","health","theory","south","youth","route","teeth","tower","their","first"],
    paragraphDrill:"the weather at our house was rough; her father rather liked the south; those three hours passed; either path leads out there",
    watch:{ keys:['t','h','e','r','o','u'], note:'Common letter pairs. Type th, he, er and ou as one quick roll, not two separate keys.' } },
  { id:'l40', keys:['sentences'], teach:'',
    charDrill:"the they there here were where your ours",
    wordDrill:["weather","quiet","girl","edge","pier","wrote","short","story","light","faded","slowly","father","stood","still","stayed","outside","stars","rise"],
    paragraphDrill:"the weather was quiet; a girl sat at the edge of the pier; she wrote a short story; the light faded slowly; her father stood still; they stayed outside to see the stars rise",
    paragraphs:["a tired walker rested at the top of the hill; the path was steep; she poured hot tea; the old tower stood tall at the far edge of the lake",
      "our group set off at first light; the road was wet; we told stories as we walked; at the top of the ridge the air was still"],
    watch:{ keys:['q','w','e','r','t','y','u','i','o','p'], note:'Sentences from home and top row letters. Look at the text, not your hands.' } },
  { id:'l41', keys:['boss'], teach:'',
    boss:{ phase1:["the","top","ride","quit","wet","pet","toy","you","your","yes","it","row","tip","pie"],
      phase2:["water","quiet","tower","people","outer","tried","pretty","typed","writer","poetry","proper","toward","quote","story"],
      phase3:["typewriter","properly","territory","equipped","prototype","requested","liquidity","hospitality","quarterly","repository","pottery","priority"] },
    charDrill:"qwert yuiop", wordDrill:[], paragraphDrill:"",
    watch:{ keys:['q','w','e','r','t','y','u','i','o','p'], note:'Boss: words built from home and top row keys.' } },

  /* ---- Level 2: numbers ---- */
  { id:'l42', keys:['0–9'], teach:'', ownWords:true,
    charDrill:"1 2 3 4 5 6 7 8 9 0 10 29 38 47 56 1234 5678 90 13579 24680",
    wordDrill:["2468","1357","90","2024","1066","314","7","88","505","100","19","650","42","3000"],
    paragraphDrill:"door 214 has 36 seats; flight 709 left at 8; 1500 people saw 42 kites; 3 trees grew 9 feet",
    watch:{ keys:['1','2','3','4','5','6','7','8','9','0'], note:'All ten digits. Reach up from the home row and come back after each number.' } },
  { id:'l43', keys:['numbers','words'], teach:'', ownWords:true,
    charDrill:"1 day 2 keys 3 pots 4 pies 5 trees 10 rows",
    wordDrill:["12 keys","45 pots","7 days","3 trees","10 tries","99 sheep","8 apples","20 kids","6 rows","4 pies","1 hour","30 sheets","2 dogs","5 roads","11 eggs","50 years"],
    paragraphDrill:"she has 12 keys; 45 pots sit to the left; 7 days per week; 3 trees grew 9 feet tall; 20 kids wait for 2 hours",
    paragraphs:["a shop sold 45 pots; 12 jugs sat there; 8 apples fell; 30 sheets of paper lay to the left; it took 6 hours to get to the top"],
    watch:{ keys:['1','2','3','4','5','6','7','8','9','0'], note:'Numbers mixed with words. Keep your hands anchored on the home row between them.' } },
  { id:'l44', keys:['60 seconds'], teach:'', timed:60, ownWords:true,
    charDrill:"12 34 56 78 90 2024 1999",
    wordDrill:["12","34","56","78","90","123","456","789","2024","1999","305","4410","68","17","250","9000","31","802","5150","64"],
    paragraphDrill:"12 34 56 78 90",
    watch:{ keys:['1','2','3','4','5','6','7','8','9','0'], note:'One minute of numbers. Accuracy first.' } },
  { id:'l45', keys:['boss'], teach:'',
    boss:{ phase1:["7","42","19","88","30","5","61","93","24","70","16","58"],
      phase2:["305","1984","720","4096","2048","611","8080","3141","999","1200","5280","404"],
      phase3:["16384","27182","90210","314159","65536","1000000","48151","86753","123456","24680"] },
    charDrill:"1 2 3 4 5 6 7 8 9 0", wordDrill:[], paragraphDrill:"",
    watch:{ keys:['1','2','3','4','5','6','7','8','9','0'], note:'Boss: numbers only, longer and longer.' } },

  /* ---- Level 3: bottom row ---- */
  { id:'l46', keys:['V','M','B','N'], teach:'', focus:'vmbn',
    charDrill:"vm mv bn nb vb bv mn nm vim ban mob vibe numb",
    wordDrill:["move","name","brave","number","member","bonus","nimble","begin","between","morning","brown","moving","oven","novel","bank","given","remember"],
    paragraphDrill:"remember the number; a brave member began moving on; the brown bunny ran in the morning; give him time; the novel is on the shelf",
    watch:{ keys:['v','m','b','n'], note:'No new keys. V and B are left index reaches down; N and M are right index.' } },
  { id:'l47', keys:['C','X','Z',',','.','/'], teach:'', focus:'cxz',
    charDrill:"c, x. z/ cx xz zc ,./ cozy, exact. zinc/ jazz, box. quiz/",
    wordDrill:["cozy","exact","zinc","jazz","excuse","complex","dozen","quiz","fix","zebra","axe","box","calm","extra","cabin"],
    paragraphDrill:"the cozy cabin was exact. a dozen zebras ran by the box, then fixed the zinc gate. the jazz quiz was complex. use and/or.",
    watch:{ keys:['c','x','z',',','.','/'], note:'No new keys. The bottom row reaches down and slightly left; comma, period and slash are right-hand keys.' } },
  { id:'l48', keys:['a–z'], teach:'', ownWords:true,
    charDrill:"abc def ghi jkl mno pqr stu vwx yz qz xj vk",
    wordDrill:["quick","brown","fox","jumps","lazy","dog","zebra","jacket","exquisite","vex","sphinx","quartz","wizard","jinx","oxygen","jigsaw","buzz","quiz"],
    paragraphDrill:"the quick brown fox jumps over the lazy dog. pack my box with five dozen liquor jugs. how vexingly quick daft zebras jump.",
    paragraphs:["sphinx of black quartz, judge my vow. the five boxing wizards jump quickly. jackdaws love my big sphinx of quartz.",
      "waltz, bad nymph, for quick jigs vex. a quick movement of the enemy will jeopardize six gunboats."],
    watch:{ keys:['q','z','x','j','v','k'], note:'Pangrams use every letter. Watch for the rare ones: Q, Z, X, J.' } },
  { id:'l49', keys:['boss'], teach:'',
    boss:{ phase1:["cab","mix","zen","ban","vim","cub","nab","ox","by","men","zip","web"],
      phase2:["brave","zebra","cabin","venom","comb,","mixer","buzz","maze.","dozen","bench","vixen","climb"],
      phase3:["combination","maximum","vacuum","benchmark","mechanism","zigzag","convenience","exam/quiz","bronze.","complex,"] },
    charDrill:"zxcvbnm,./", wordDrill:[], paragraphDrill:"",
    watch:{ keys:['z','x','c','v','b','n','m',',','.','/'], note:'Boss: every word uses the bottom row.' } },

  /* ---- Level 3: capitals ---- */
  { id:'l50', keys:['Left Shift'], teach:'HJKLNMYUIOP', shift:true, ownWords:true,
    charDrill:"Hh Jj Kk Ll Nn Mm Yy Uu Ii Oo Pp Hi Joy Kit Lot",
    wordDrill:["Hi","Just","Kate","Lisa","Nora","Mark","Paris","Oslo","York","Utah","India","Japan","Kenya","Lima","Milan","Nepal","Peru","Iowa","Ohio","John","Mary","Paul","Mike","Lucy","Omar","Yuki","Ivan","Jane","Hugo","Leo","Nick","Pete"],
    paragraphDrill:"Mary and John live in York. Lisa flew to Lima, then to Peru. Paul met Yuki in Japan. Hugo, Ivan and Nora visit Milan in June.",
    paragraphs:["Kate and Mike drove to Ohio. Lucy wrote to Omar in India. Nick spent July in Nepal. Jane likes Oslo in the snow."],
    watch:{ keys:['shift','h','j','k','l','n','m','y','u','i','o','p'], note:'Capitals of right-hand letters: hold Left Shift with the left little finger, press the letter with the right hand, release.' } },
  { id:'l51', keys:['Right Shift'], teach:'QWERTASDFGZXCVB', ownWords:true,
    charDrill:"Aa Ss Dd Ff Gg Qq Ww Ee Rr Tt Zz Xx Cc Vv Bb Ann Bob Tom",
    wordDrill:["Anna","Bob","Carl","Dave","Emma","Fred","Grace","Rome","Texas","Wales","Spain","Greece","Egypt","Berlin","Cairo","Dublin","Tokyo","Zurich","Sara","Tom","Vera","Alex","Zoe","Quebec","Chile","Ghana","Cuba","Fiji","Wendy","Rita","Dan","Eva"],
    paragraphDrill:"Anna and Bob flew to Rome. Sara met Tom in Berlin, then went to Cairo. Dave and Emma live in Texas. Grace visits Quebec in August.",
    paragraphs:["Zoe likes Fiji. Carl drove across Wales with Vera. Fred and Rita spent a week in Ghana. Eva wrote to Alex from Dublin."],
    watch:{ keys:['shift','a','s','d','f','g','q','w','e','r','t','z','x','c','v','b'], note:'Capitals of left-hand letters: hold Right Shift with the right little finger, press the letter with the left hand.' } },
  { id:'l52', keys:['names','places'], teach:'', ownWords:true,
    charDrill:"London Sydney Mumbai Toronto Lagos Seoul Maria Ahmed",
    wordDrill:["London","Sydney","Mumbai","Toronto","Nairobi","Lagos","Seoul","Madrid","Oslo","Lisbon","Maria","Ahmed","Priya","Chen","Olivia","Lucas","Fatima","Kenji","Sofia","Diego","Monday","Friday","April","October","Canada","Brazil"],
    paragraphDrill:"Priya flew from Mumbai to London on Monday. Kenji and Sofia met in Lisbon in April. Ahmed lives in Nairobi, and Olivia lives in Toronto.",
    paragraphs:["On Friday, Lucas drove from Madrid to Seoul. No, that is not possible. He flew to Seoul, and Fatima met him there in October.",
      "Diego grew up in Brazil, studied in Canada and now teaches in Sydney. Maria visits him every winter."],
    watch:{ keys:['shift'], note:'Names and places start with a capital. Use the Shift key on the opposite hand to the letter.' } },

  /* ---- Level 3: symbols ---- */
  { id:'l53', keys:['?','!',"'",'"'], teach:`?!'"`, ownWords:true,
    charDrill:`? ! ' " ?? !! '' "" why? yes! it's don't "hi" can't`,
    wordDrill:["why?","how?","yes!","wow!","it's","don't","can't","I'm","we're","\"hi\"","\"no\"","you'll","stop!","ready?","isn't","what?"],
    paragraphDrill:`"Are you ready?" she asked. "Yes!" he said. It's late, isn't it? Don't worry, we'll make it. "Go!"`,
    paragraphs:[`Who left the door open? I don't know, but it wasn't me! "Close it, please," said Mum. "It's cold in here."`],
    watch:{ keys:['?','!',"'",'"'], note:'? and ! need Shift. The apostrophe is right of ;, and " is Shift with the same key.' } },
  { id:'l54', keys:['(',')','-','_','=','+'], teach:'()-_=+', ownWords:true,
    charDrill:"( ) - _ = + () -- __ == ++ (a) x-ray a_b 2+2 x=1",
    wordDrill:["(yes)","x-ray","well-known","e-mail","file_name","user_id","a=b","1+1=2","3-1=2","(note)","high-tech","top_score","n+1","x+y","(2+3)"],
    paragraphDrill:"Add the two (2+3=5), then take one away (5-1=4). A well-known rule (x+y=y+x) helps. Save it as my_notes_v2 and keep a back-up.",
    paragraphs:["The x-ray (taken at 9) was clear. Set total=0, then add 4+6+10. Name the file score_list and the copy score_list-old."],
    watch:{ keys:['(',')','-','_','=','+'], note:'Brackets are Shift with 9 and 0. Minus and equals sit at the top right; with Shift they give _ and +.' } },
  { id:'l55', keys:['@','#','$','%','&','*',':'], teach:'@#$%&*:', ownWords:true,
    charDrill:"@ # $ % & * : @@ ## $$ %% && ** :: #1 $5 50% A&B 2*3 10:30",
    wordDrill:["@home","#1","#tag","$5","$9.99","20%","100%","Q&A","R&D","5*4","9:15","note:","total:","B&B","*star*"],
    paragraphDrill:"Note: the sale is 25% off, so the $40 lamp costs $30. Tag it #deal and send it to sam@example.com by 9:30. Q&A starts at 10:15; bring 2*3 copies.",
    watch:{ keys:['@','#','$','%','&','*',':'], note:'Shift with the number row gives @ # $ % & *. The colon is Shift with ;.' } },
  { id:'l56', keys:['dates','phones','prices'], teach:'', ownWords:true,
    charDrill:"12/05 31/12 555-0142 $4.99 $12.50 07:45 2026-01-31",
    wordDrill:["12/05/2025","2026-01-31","1 March","Mon 4 May","555-0142","(555) 555-0177","+1 555 0199","$4.99","$12.50","$1,250","19.95","07:45","3:30 pm","No. 42","31 Dec"],
    paragraphDrill:"The meeting moved from 14/03 to 21/03/2026 at 3:30 pm. Call 555-0187 or (555) 555-0121 to book. Tickets cost $18.50 each, or $65.00 for four.",
    paragraphs:["Rent of $1,200.00 is due on 01/09. The plumber said 555-0164, then 555-0146; check before you call. Bread is $2.49 and milk $1.15."],
    watch:{ keys:['/','-','$','.',':'], note:'Real-world numbers mix digits with / - $ . and :. Keep your eyes on the text.' } },
  { id:'l57', keys:['@','.com'], teach:'', ownWords:true,
    charDrill:"@ . / : www. .com https:// @example.com",
    wordDrill:["anna@example.com","info@example.com","sales@example.com","tom.lee@example.com","help@example.com","www.example.com","example.com/about","https://example.com","https://www.example.com/help","example.com/shop?id=42","j_smith@example.com","team+news@example.com"],
    paragraphDrill:"Write to help@example.com or visit https://www.example.com/support for answers. Send your order number to orders@example.com. The new page is at example.com/news?id=7.",
    paragraphs:["Our office address is office@example.com. Forms are at https://example.com/forms, and the price list is at www.example.com/prices."],
    watch:{ keys:['@','.','/',':'], note:'Addresses have no spaces. Every example uses example.com.' } },
  { id:'l58', keys:['boss'], teach:'',
    boss:{ phase1:["Hi","Yes!","Go?","Ok.","Tom","Ann","Max!","Why?","It's","Run!","Leo","Zoe"],
      phase2:["(maybe)","don't","$5.99","50%","A&B","x=1","Wait!","\"Now\"","#tag","10:30","Q&A","we'll"],
      phase3:["anna@example.com","555-0199","$1,250.00","\"Ready?\"","snake_case","x+y=z","(Monday)","Dr.Patel's","#1:Win!","50%-off"] },
    charDrill:"! ? ' \" ( ) - _ = + @ # $ % & * :", wordDrill:[], paragraphDrill:"",
    watch:{ keys:['shift','?','!','@','#','$','%'], note:'Boss: capitals and symbols. Words get harder in three phases.' } },

  /* ---- Level 4: mastery ---- */
  { id:'l59', keys:['top 100'], teach:'', ownWords:true, wordDrill:TOP100,
    charDrill:"the be to of and in that have it for",
    paragraphDrill:"People think about the time they have, and some want more of it. Look at what you can do now, not what you could do one day. Give your work your first and best time, and the rest will come.",
    paragraphs:["We all know that a good day can come out of a bad one. Take the time to look back, think about what you want, and then get to work. It will not take as long as you think.",
      "If you want to know how good you are, look at your work over a year, not a day. Most people can do more than they think, and they also know it."],
    watch:{ keys:['speed'], note:'The hundred most used words in English. Learn them as whole shapes, not letters.' } },
  { id:'l60', keys:['top 300'], teach:'', ownWords:true, wordDrill:TOP300,
    charDrill:"is was are been has had were said did made",
    paragraphDrill:"Every family has a story about a long journey, a hard year or a lucky day. Some tell it often, and some keep it close. Ask an older friend about their first job, and listen to the whole thing.",
    paragraphs:["The city was quiet early in the morning. A few people walked to work, a small black dog waited by a door, and the light on the river was clear and cold.",
      "It is possible to learn a great deal in a short time if you stay with one thing. Choose a simple goal, follow it every day for a month, and remember to write down what you find."],
    watch:{ keys:['speed'], note:'Three hundred common words cover most everyday writing. Keep a steady rhythm.' } },
  { id:'l61', keys:['ing','tion','ed','ly'], teach:'', ownWords:true,
    charDrill:"ing tion ed ly ing tion ed ly ning tion led ally",
    wordDrill:["running","making","thinking","nation","station","action","motion","question","walked","played","needed","started","quickly","slowly","really","finally","moving","reading","decision","attention","jumped","carefully","clearly","solution","waiting"],
    paragraphDrill:"She walked slowly to the station, thinking carefully about the question. The train was waiting, and she finally jumped on, really pleased with her decision.",
    paragraphs:["Reading quickly is useful, but reading with attention is better. The solution started with one action: he stopped, looked carefully, and listened."],
    watch:{ keys:['i','n','g','t','o','e','d','l','y'], note:'Common endings. Type ing, tion, ed and ly as one smooth movement.' } },
  { id:'l62', keys:['tricky words'], teach:'', ownWords:true,
    charDrill:"rhy thm nec ess ary sep ara te def ini tely rec eive",
    wordDrill:["rhythm","necessary","separate","definitely","receive","through","accommodate","occurrence","embarrass","conscience","believe","weird","queue","foreign","government","environment","privilege","recommend","tomorrow","beginning","calendar","February","Wednesday","restaurant","schedule","although","thorough"],
    paragraphDrill:"It is definitely necessary to separate the two lists. We will receive the calendar on Wednesday, although the restaurant may change the schedule tomorrow.",
    paragraphs:["I believe the queue at the foreign office was weird. A thorough check of the government schedule is recommended before the beginning of February."],
    watch:{ keys:['speed'], note:'Words people often misspell. Slow down for the tricky part, then keep going.' } },
  { id:'l63', keys:['accuracy'], teach:'', lockLine:true,
    charDrill:"the and for you are with",
    wordDrill:["steady","careful","clean","exact","calm","precise","patient","focus"],
    paragraphDrill:"Take your time on this line. One wrong key sends you back to the start. Keep your eyes on the words and let each key land cleanly.",
    paragraphs:["A clean line is worth more than a fast one. Read a word ahead, breathe out, and type it exactly as it is written.",
      "Accuracy is a habit, not a mood. Every careful line you finish makes the next one easier and a little faster."],
    watch:{ keys:['accuracy'], note:'Accuracy lock: one mistake sends you back to the start of the line. Slow and exact wins.' } },
  { id:'l64', keys:['15 seconds'], teach:'', sprints:5, timed:15, ownWords:true, wordDrill:TOP300,
    charDrill:"the and you that with have",
    paragraphDrill:"",
    watch:{ keys:['speed'], note:'Five sprints of fifteen seconds. Rest between them; your best sprint counts.' } },
  { id:'l65', keys:['proverbs'], teach:'', ownWords:true,
    charDrill:"a an the in on at to of",
    wordDrill:["actions","louder","stitch","saves","hands","light","practice","perfect","steady","journey","single","step","fortune","favours","bold","cloud","silver","lining","habits","patience"],
    paragraphDrill:PROVERBS.slice(0, 6).join(' '),
    paragraphs:[PROVERBS.slice(6, 12).join(' '), PROVERBS.slice(12, 20).join(' ')],
    watch:{ keys:['sentences'], note:'Old proverbs and new sayings. Read the whole sentence, then type it in one flow.' } },
  { id:'l66', keys:['3 minutes'], teach:'', timed:180,
    charDrill:"th he in er an re", wordDrill:[], paragraphDrill:PROSE[0],
    watch:{ keys:['speed'], note:'A three-minute test. Find a pace you can hold to the end.' } },
  { id:'l67', keys:['5 minutes'], teach:'', timed:300,
    charDrill:"th he in er an re", wordDrill:[], paragraphDrill:PROSE[1],
    watch:{ keys:['speed'], note:'A five-minute test. Steady beats fast; keep your shoulders loose.' } },
  { id:'l68', keys:['boss'], teach:'',
    boss:{ phase1:["the","and","with","have","from","they","will","time","work","good","like","word"],
      phase2:["people","because","another","between","without","question","business","remember","possible","children"],
      phase3:["necessary,","rhythm.","definitely","separate","Wednesday","accommodate","conscientious","acknowledgement","throughout.","responsibility","\"Quickly!\"","it's"] },
    charDrill:"th he in er", wordDrill:[], paragraphDrill:"",
    watch:{ keys:['speed'], note:'Final boss: everything you have learned, faster and longer.' } },

  /* ---- Level 5: pro tracks ---- */
  { id:'l69', keys:['4','5','6'], teach:'', numpad:true, ownWords:true,
    note:'Number pad lesson. No number pad on your laptop? The same digits on the main keyboard count too.',
    charDrill:"4 5 6 44 55 66 45 56 64 456 654 546 465",
    wordDrill:["4","5","6","45","56","64","456","654","546","465","4455","6655","5656","4646","45654"],
    paragraphDrill:"456 654 465 546 564 645 44 55 66 4565 6545 5456",
    watch:{ keys:['4','5','6'], note:'Numpad home row: index on 4, middle on 5 (it has a bump), ring on 6. No number pad? Use the main digits; they count too.' } },
  { id:'l70', keys:['0–9','numpad'], teach:'', numpad:true, ownWords:true,
    note:'Number pad lesson. No number pad on your laptop? The same digits on the main keyboard count too.',
    charDrill:"7 8 9 4 5 6 1 2 3 0 147 258 369 0 741 852 963",
    wordDrill:["147","258","369","741","852","963","1000","2025","3690","7410","8520","90","105","4096","12345","67890"],
    paragraphDrill:"147 258 369 741 852 963 100 2025 3690 7410 8520 1590 7530",
    watch:{ keys:['7','8','9','1','2','3','0'], note:'Reach up for 7 8 9 and down for 1 2 3; the thumb takes 0. Main-keyboard digits are accepted too.' } },
  { id:'l71', keys:['.','+','-','*','/'], teach:'', numpad:true, ownWords:true,
    note:'Number pad lesson. No number pad? Type . + - * / with the main keyboard; they count too. Enter is shown as a space here.',
    charDrill:". + - * / 1.5 2+3 9-4 3*4 8/2 0.25",
    wordDrill:["12.5","0.75","3.14","99.99","3*4","10/2","7-3","1.5+2.5","100/4","2.5*4","45.5-0.5","8+8","64/8","0.1+0.2"],
    paragraphDrill:"12.5 + 4.5 - 2 * 3 / 1.5 0.25 + 0.75 99.99 - 9.99 64 / 8 * 2",
    paragraphs:["1.5 + 2.5 + 3.5 7 * 8 - 6 100 / 4 + 0.5 45.6 - 12.3"],
    watch:{ keys:['.','+','-','*','/'], note:'Decimals and sums: + - * / sit around the numpad, . is under 3. The main keyboard keys work too.' } },
  { id:'l72', keys:['{','}','[',']','<','>','|','\\','`','~','^'], teach:'{}[]<>|\\`~^', ownWords:true,
    charDrill:"{ } [ ] < > | \\ ` ~ ^ {} [] <> || ~/ a^2 `x`",
    wordDrill:["{}","[]","<>","a[0]","{x}","a||b","x^2","~/docs","C:\\temp","`code`","<b>","[1,2]","{a:1}","!=","<=",">=","a|b","~5"],
    paragraphDrill:"if (a <= b || c >= d) { x[0] = y ^ 2; } else { z = ~z; } Run `npm test` in ~/app or in C:\\work\\app.",
    paragraphs:["let list = [1, 2, 3]; let map = { a: 1, b: [4, 5] }; if (n > 0 && n < 10) { echo $n | sort }"],
    watch:{ keys:['{','}','[',']','<','>','|','\\','`','~','^'], note:'Square brackets are right of P, braces are Shift with them. < and > are Shift with , and .; | is Shift with \; ~ is Shift with `.' } },
  { id:'l73', keys:['HTML','CSS'], teach:'', ownWords:true,
    charDrill:"< > </ /> = \" { } : ; #",
    wordDrill:["<p>","</p>","<div>","</div>","class=\"box\"","<a href=\"/\">","color: red;","margin: 0;","#main","h1 {","<ul>","<li>","</li>","font-size: 16px;","display: flex;","<br>"],
    paragraphDrill:"<h1 class=\"title\">Hello</h1> <p>Welcome to the site.</p> <a href=\"https://example.com\">Read more</a> .card { padding: 12px; color: #333; } body { margin: 0; font-family: sans-serif; }",
    paragraphs:["<ul class=\"menu\"> <li><a href=\"/about\">About</a></li> </ul> .menu li { display: inline-block; margin-right: 8px; } #main { max-width: 640px; }",
      "<img src=\"cat.png\" alt=\"A cat\"> <button type=\"submit\">Send</button> button:hover { background: #2e9a89; } @media (max-width: 400px) { .card { padding: 4px; } }"],
    watch:{ keys:['<','>','/','=','"','{','}'], note:'HTML tags and CSS rules. Each space here stands for the end of a line.' } },
  { id:'l74', keys:['JS','Python'], teach:'', ownWords:true,
    charDrill:"( ) { } [ ] = ; : . , ' \" =>",
    wordDrill:["const","let","return","=>","===","i++","def","print()","len(x)","import","None","True","[]","{}","x += 1","if (ok)"],
    paragraphDrill:"const total = items.length; let sum = 0; for (let i = 0; i < 10; i++) { sum += i; } if (x === 3) return [x, y]; const add = (a, b) => a + b;",
    paragraphs:["def greet(name): return f\"Hi {name}\" print(len([1, 2, 3])) nums = [n * 2 for n in range(5)] if nums and nums[0] == 0: print(\"zero\")",
      "const user = { name: 'Ana', age: 31 }; console.log(`Hi ${user.name}`); while (n > 1) { n = n % 2 === 0 ? n / 2 : 3 * n + 1; }"],
    watch:{ keys:['(',')','{','}','[',']','=',';'], note:'Short lines of JavaScript and Python. Each space here stands for the end of a line.' } },
  { id:'l75', keys:['emails','letters'], teach:'', ownWords:true,
    charDrill:"Dear Hi Regards, Sincerely, Thanks, Re: Cc:",
    wordDrill:["Dear","Hello","Regards,","Sincerely,","Thank you","attached","meeting","schedule","invoice","Re:","Cc:","Best wishes,","Kind regards,","please","confirm","follow up"],
    paragraphDrill:"Dear Ms. Patel, Thank you for your letter of 3 June. I am pleased to confirm our meeting on Tuesday at 10:00. Please find the agenda attached. Kind regards, Sam Rivera",
    paragraphs:["Hi team, A quick reminder that reports are due on Friday. If you need more time, let me know by Wednesday. Thanks, Jo",
      "Dear Mr. Okafor, I am writing to follow up on invoice #2041, which is now 14 days overdue. Could you confirm when payment will be made? Sincerely, Lee Chen"],
    watch:{ keys:['shift',',','.',':'], note:'Office writing: greetings, short clear sentences, and a sign-off.' } },
  { id:'l76', keys:['names','addresses','amounts'], teach:'', ownWords:true,
    charDrill:"Mr. Ms. Dr. St. Rd. No. $ , .",
    wordDrill:["Mr. Daniel Okafor","Ms. Ana Silva","Dr. R. Mehta","27 Elm Road","Flat 4B","12 Harbour Street","$2,450.00","$89.95","Invoice #1042","PO Box 310","Suite 200","ZIP 90210","Order No. 5531"],
    paragraphDrill:"Ship to: Ms. Ana Silva, Flat 4B, 27 Elm Road, Springfield. Amount due: $2,450.00 by 30/11. Ref: Invoice #1042.",
    paragraphs:["Mr. Daniel Okafor, 12 Harbour Street, Suite 200, Bayview. Paid $89.95 on 14 March (Order No. 5531). Balance: $0.00.",
      "Dr. R. Mehta, PO Box 310, Lakeside. Fees: $120.00 + $15.50 = $135.50. Please quote ref. A-77 when paying."],
    watch:{ keys:['shift','$',',','.','#'], note:'Names, addresses and money. Check every digit; amounts must be exact.' } },
  { id:'l77', keys:['10 minutes'], teach:'', timed:600,
    charDrill:"th he in er an re", wordDrill:[], paragraphDrill:PROSE[2],
    watch:{ keys:['speed'], note:'A ten-minute passage, like a real exam. Pace yourself.' } },
  { id:'l78', keys:['exam'], teach:'', timed:600, exam:true,
    charDrill:"th he in er an re", wordDrill:[], paragraphDrill:PROSE[3],
    watch:{ keys:['exam'], note:'Strict rules: ten minutes, no pause. You will see gross speed, net speed (minus one word per minute for each uncorrected error per minute), accuracy and key depressions per hour.' } },
];

/* ==========================================================================
   4. BUILD THE COURSE in TC_META.ORDER, then the cumulative allowed sets.
   ========================================================================== */
const TIER = { home:'Beginner — Home Row', top:'Intermediate — Top Row', numbers:'Intermediate — Numbers',
  bottom:'Advanced — Bottom Row', capitals:'Advanced — Shift & Symbols', symbols:'Advanced — Shift & Symbols',
  mastery:'Mastery — Fluency', pro:'Pro — Tracks' };
const SOURCE = {};
BASE.concat(NEW).forEach(l => { SOURCE[l.id] = l; });

/* Watch step for today's 24 lessons (new lessons carry their own). */
const BASE_WATCH = {
  l1:'Index fingers rest on F and J. Feel the bumps.', l2:'Middle fingers rest on D and K.',
  l3:'Ring fingers rest on S and L.', l4:'Little fingers rest on A and ;.',
  l5:'Index fingers stretch inward to G and H, then come back.', l6:'The whole home row, both directions.',
  l7:'Middle fingers reach up to E and I.', l8:'The left index finger reaches up to R and T.',
  l9:'Ring fingers reach up to W and O.', l10:'Right index reaches up to U; right little finger to P.',
  l11:'Right index reaches up and left to Y; left little finger to Q.', l12:'Reach up two rows for 1 to 5 with the left hand.',
  l13:'Reach up two rows for 6 to 0 with the right hand.', l14:'Left index reaches down to V; right index down to M.',
  l18:'Left index reaches down and right to B; right index down to N.', l15:'Left middle finger reaches down to C; right middle to the comma.',
  l16:'Left ring finger reaches down to X; right ring to the period.', l17:'Left little finger reaches down to Z; right little to the slash.',
  l19:'Hold Shift with the little finger of the opposite hand, press the letter, release.',
  l20:'A mixed review of every sentence mark and symbol from the last three lessons.',
  l21:'The most common words, typed as whole shapes.', l22:'Full sentences at a steady rhythm.',
  l23:'Longer paragraphs. Read a word ahead.', l24:'One minute against the clock.',
};

const lessons = META.ORDER.map(id => {
  const src = SOURCE[id]; const m = META.BY_ID[id];
  if (!src) throw new Error('course.js: no lesson data for ' + id);
  const l = Object.assign({}, src);
  l.level = m.level; l.unit = m.unit; l.kind = m.kind; l.n = m.n;
  if (!l.title) l.title = m.title;
  if (!l.tier) l.tier = TIER[m.unit];
  if (l.boss) l.wordDrill = l.boss.phase1.concat(l.boss.phase2, l.boss.phase3);
  if (!l.watch) {
    const keys = l.teach ? Array.from(new Set([...l.teach].map(c => c.toLowerCase()))) : l.keys.map(k => k.toLowerCase());
    l.watch = { keys, note: BASE_WATCH[id] || '' };
  }
  return l;
});

/* what each lesson may use: everything taught by it and every lesson before it (course order) */
(function computeAllowedKeys(){
  const allowed = new Set([' ']); let shift = false;
  lessons.forEach(l => {
    for (const c of (l.teach || '')) allowed.add(c);
    if (l.shift) shift = true;
    l.allowed = new Set(allowed); l.allowShift = shift;
    l.newLetters = [...(l.teach || '')].filter(c => /[a-z]/.test(c));
  });
})();

const BY_ID = Object.fromEntries(lessons.map(l => [l.id, l]));
function byId(id){ return BY_ID[id] || null; }

/* ==========================================================================
   5. TEXT GENERATORS (today's, extended for the five steps)
   ========================================================================== */
function randInt(min, max, rnd){ return Math.floor((rnd || Math.random)() * (max - min + 1)) + min; }
function pick(arr, rnd){ return arr[randInt(0, arr.length - 1, rnd)]; }
function shuffled(arr, rnd){ const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = randInt(0, i, rnd); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function mulberry32(seed){ return function(){ seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hashStr(s){ let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const fitsIn = (set) => (w) => [...w].every(c => set.has(c));

function generateFromTokens(tokenString){
  const tokens = tokenString.split(' ').filter(Boolean);
  const itemCount = randInt(20, 30);
  const items = [];
  for (let i = 0; i < itemCount; i++) items.push(pick(tokens));
  return items.join(' ');
}
function generateFromPool(pool){
  const itemCount = randInt(16, 24);
  const items = [];
  for (let i = 0; i < itemCount; i++) items.push(pick(pool));
  return items.join(' ');
}
function focusLetters(lesson){ return lesson.focus ? [...lesson.focus] : lesson.newLetters; }
/* letter groups from the keys in play, half of them led by this lesson's new (or focus) keys */
function mixedGroup(lesson){
  const letters = lesson.mixKeys ? [...lesson.mixKeys] : [...lesson.allowed].filter(c => /[a-z;]/.test(c));
  const f = focusLetters(lesson).filter(c => letters.includes(c));
  const fresh = f.length ? f : letters;
  const len = randInt(2, 5); let g = Math.random() < 0.5 ? pick(fresh) : pick(letters);
  while (g.length < len) g += pick(letters);
  return g;
}
function generateMixed(lesson){
  const groups = []; const count = randInt(18, 24);
  for (let i = 0; i < count; i++) groups.push(mixedGroup(lesson));
  return groups.join(' ');
}

const wordPoolCache = {};
function wordPool(lesson){
  if (lesson.isReview) return lesson.wordDrill || [];
  if (wordPoolCache[lesson.id]) return wordPoolCache[lesson.id];
  const own = lesson.wordDrill || [];
  let extra = [];
  if (lesson.noWords) { wordPoolCache[lesson.id] = []; return []; }
  if (!lesson.ownWords && !lesson.boss) {
    const fits = fitsIn(lesson.allowed);
    const focus = focusLetters(lesson);
    // lessons that teach only digits or symbols keep to their own drill words
    const usesNew = w => focus.length ? focus.some(c => w.includes(c)) : !lesson.teach;
    extra = COMMON_WORDS.filter(w => fits(w) && usesNew(w));
    if (lesson.shift) extra = extra.map(w => (Math.random() < 0.4 && lesson.allowed.has(w[0].toUpperCase())) ? w[0].toUpperCase() + w.slice(1) : w);
  }
  const pool = Array.from(new Set(own.concat(extra)));
  wordPoolCache[lesson.id] = pool;
  return pool;
}

/* a run of sentences from the lesson's word pool, punctuated only with keys already taught */
function generateParagraph(lesson){
  const pool = wordPool(lesson);
  const period = lesson.allowed.has('.'), comma = lesson.allowed.has(','), semi = lesson.allowed.has(';');
  const sentences = []; const count = randInt(4, 5);
  for (let i = 0; i < count; i++) {
    const words = []; const len = randInt(4, 8);
    for (let j = 0; j < len; j++) words.push(pick(pool));
    if (comma && len > 5 && Math.random() < 0.5) words[randInt(1, len - 3)] += ',';
    let s = words.join(' ');
    if (lesson.allowShift && lesson.allowed.has(s[0].toUpperCase())) s = s[0].toUpperCase() + s.slice(1);
    sentences.push(s);
  }
  return sentences.join(period ? '. ' : (semi ? '; ' : ' ')) + (period ? '.' : '');
}
function writtenParagraphs(lesson){ return [lesson.paragraphDrill].concat(lesson.paragraphs || []).filter(Boolean); }
function pickParagraph(lesson){
  const written = writtenParagraphs(lesson);
  // before Shift, freshly generated text joins the hand-written paragraphs so every run differs
  const canGenerate = !lesson.allowShift && wordPool(lesson).length >= 8;
  if (!written.length) return canGenerate ? generateParagraph(lesson) : generateFromPool(wordPool(lesson));
  const choice = canGenerate ? randInt(0, written.length) : randInt(0, written.length - 1);
  return choice < written.length ? written[choice] : generateParagraph(lesson);
}

/* Words-per-minute assumed when sizing text: plenty for a fast typist. */
const CHARS_PER_MIN = 500;   // 100 wpm
/* Prose for timed tests from Mastery on: Mastery paragraphs plus the prose bank. */
function proseBank(){
  const out = PROSE.slice();
  lessons.filter(l => l.unit === 'mastery' && l.kind !== 'boss').forEach(l => writtenParagraphs(l).forEach(p => out.push(p)));
  return Array.from(new Set(out));
}
function proseRun(minChars, bank, rnd){
  let order = shuffled(bank, rnd), i = 0; const parts = []; let len = 0;
  while (len < minChars) {
    if (i >= order.length) { order = shuffled(bank, rnd); i = 0; }
    const p = order[i++]; parts.push(p); len += p.length + 1;
  }
  return parts.join(' ');
}
function wordRun(lesson, minChars, minTokens){
  const pool = wordPool(lesson); const own = (lesson.wordDrill || []).filter(Boolean);
  const items = []; let len = 0;
  while (len < minChars || items.length < (minTokens || 0)) {
    const w = (own.length && Math.random() < 0.6) ? pick(own) : pick(pool);
    items.push(w); len += w.length + 1;
  }
  return items.join(' ');
}
/* Timed text. Beginner to Advanced: only the lesson's own allowed words. Mastery and Pro: prose. */
function timedText(lesson){
  const secs = lesson.timed || 60;
  const need = Math.ceil(secs / 60 * CHARS_PER_MIN);
  if (lesson.level >= 4) return proseRun(need, proseBank());
  return wordRun(lesson, need, 0);
}
/* Challenge: about 30 seconds of the lesson's own words (at least 30 words, 150+ characters = 30 s at 60 wpm). */
function challengeText(lesson){
  if (lesson.noWords || wordPool(lesson).length < 4) {
    const tokens = (lesson.charDrill || '').split(' ').filter(Boolean);
    const items = []; let len = 0;
    while (items.length < 32 || len < 160) {
      const t = (tokens.length && Math.random() < 0.5) ? pick(tokens) : mixedGroup(lesson);
      items.push(t); len += t.length + 1;
    }
    return items.join(' ');
  }
  return wordRun(lesson, 160, 32);
}
/* One 15-second sprint: enough words for 15 s at 100+ wpm. */
function sprintText(lesson){ return wordRun(lesson, Math.ceil((lesson.timed || 15) / 60 * CHARS_PER_MIN) + 60, 0); }

function bossWords(lesson){
  const b = lesson && lesson.boss;
  if (!b) return { phase1: [], phase2: [], phase3: [] };
  return { phase1: shuffled(b.phase1), phase2: shuffled(b.phase2), phase3: shuffled(b.phase3) };
}

function steps(lesson){
  if (!lesson) return [];
  if (lesson.kind === 'intro') return ['intro'];
  if (lesson.kind === 'boss') return ['boss'];
  if (lesson.sprints) return ['sprint'];
  if (lesson.exam) return ['exam'];
  if (lesson.timed) return ['timed'];
  if (lesson.lockLine) return ['watch', 'lock'];
  if (lesson.noWords || wordPool(lesson).length < 4) return ['watch', 'character', 'mixed', 'challenge'];
  return ['watch', 'character', 'word', 'paragraph', 'challenge'];
}
function introText(lesson){
  const base = lesson.intro || 'f j f j';
  return Math.random() < 0.5 ? base : 'j f j f jf fj jj ff j f';
}
function stepText(lesson, step){
  switch (step) {
    case 'watch': return '';
    case 'intro': return introText(lesson);
    case 'character': return generateFromTokens(lesson.charDrill);
    case 'mixed': return generateMixed(lesson);
    case 'word': return generateFromPool(wordPool(lesson));
    case 'paragraph': return pickParagraph(lesson);
    case 'lock': return pickParagraph(lesson);
    case 'challenge': return challengeText(lesson);
    case 'sprint': return sprintText(lesson);
    case 'timed': case 'exam': return timedText(lesson);
    case 'boss': { const w = bossWords(lesson); return w.phase1.concat(w.phase2, w.phase3).join(' '); }
    default: return pickParagraph(lesson);
  }
}

/* ==========================================================================
   6. ARCADE, PLACEMENT, DAILY CHALLENGE
   ========================================================================== */
const DEFAULT_ARCADE = 'l6';
const arcadeCache = {};
function allowedThrough(lessonId){
  const l = byId(lessonId) || byId(DEFAULT_ARCADE);
  if (arcadeCache[l.id]) return arcadeCache[l.id];
  const upto = lessons.slice(0, lessons.indexOf(l) + 1);
  const fits = fitsIn(l.allowed);
  const cand = COMMON_WORDS.concat(TOP300);
  upto.forEach(x => (x.wordDrill || []).forEach(w => cand.push(w)));
  const words = Array.from(new Set(cand.filter(w => /^[a-z]+$/.test(w) && fits(w))));
  const out = { chars: new Set(l.allowed), shift: l.allowShift, words, lessonId: l.id };
  arcadeCache[l.id] = out;
  return out;
}
const PLAIN = PROSE.filter(p => /^[A-Za-z .,']+$/.test(p));
/* 2-minute placement passage: plain prose, enough for 2 minutes at about 120 wpm. */
function placementText(){ return proseRun(1300, PLAIN); }
/* Daily Challenge: chosen from the date alone (YYYY-MM-DD), the same everywhere. */
function todayStr(){ const d = new Date(); const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
function dailyText(dateStr){
  const rnd = mulberry32(hashStr('typecraft-daily:' + (dateStr || todayStr())));
  const a = pick(PROSE, rnd);
  const proverbs = shuffled(PROVERBS, rnd).slice(0, 2).join(' ');
  return rnd() < 0.5 ? a + ' ' + proverbs : proverbs + ' ' + a;
}

const STEP_LABEL = { watch:'Watch', character:'Keys', mixed:'Mixed', word:'Words', paragraph:'Sentences', challenge:'Challenge', timed:'Timed test', sprint:'Sprints', boss:'Boss', intro:'Meet the keyboard', lock:'Accuracy lock', exam:'Exam' };

root.TC_COURSE = {
  lessons, byId, steps, stepText, bossWords, wordPool, allowedThrough, placementText, dailyText, STEP_LABEL,
  WORDS: { COMMON: COMMON_WORDS, TOP100, TOP300, PROVERBS, PROSE },
  gen: { generateFromTokens, generateFromPool, generateMixed, generateParagraph, pickParagraph, timedText, challengeText, sprintText },
};
})(typeof globalThis !== 'undefined' ? globalThis : window);
