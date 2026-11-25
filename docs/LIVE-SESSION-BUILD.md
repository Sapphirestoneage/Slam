# Live Session Mode: notes for the next parts of the build

Run "Live Session Mode (Nov 25 2026)". All 9 parts are built, with the tests and the report. This page is for a
worker who changes the feature, and its last section is for Eli: "For Eli: before the first real call". It is not
for the player.

## The switches

`AI_PASS_READY` (Part 8), next to it, is `false` too: with it off the review has no AI button and everything else
works. `aiOn()` is true only when both are on. Turn it on only after docs/AI-PASS-SETUP.md.

`LIVE_SESSION_READY` in `game/account/liveflag.js`. It is `false`. While it is false: the coach page shows the two
buttons as one "Coming soon" card, `game/session.html` shows "Coming soon", the game loads `liveflag.js` only, and
nothing of the feature runs. The tests set it on by themselves. Set it to `true` only when the tests of the last
part pass AND Eli ran the database file.

## The database file

`supabase/migrations/20261125210000_live_sessions.sql`, NOT APPLIED. Tables: `live_invites`, `coach_clients`,
`live_sessions`, `live_lines`. Functions: `live_invite_make`, `live_invite_check` (the only one open to a visitor),
`live_invite_use`, `live_session_open`, `live_session_set`, `live_member`, `live_can_write`. A session, its invite
and its lines are for that coach, that client and the admin. `delete_my_account()` (20261125200000) names the four
tables. Realtime: nothing to switch on with default settings; see the top of the SQL file.

## The files and what the later parts build on

| File | What |
|------|------|
| `game/account/liveflag.js` | The switch. `liveOn`, `liveTokenClean`, `liveTokenKeep`, `liveToken`, `liveTokenDone`, `liveBack`. |
| `game/account/live.js` | The rules, values only (no screen, no database). |
| `game/account/liveio.js` | The adapters and the room controller. |
| `game/account/livesim.js` | A stand-in for each adapter; a simulated pair of devices. |
| `game/account/liveroom.js`, `game/session.html` | The session page: the invite screen, the room. |
| `game/account/livecoach.js` | The coach's card on `coach.html`. |
| `game/account/livefill.js` | Parts 3 to 5, what one line means: the number reader, the fields, the topic, "Confirming", the cue words. No profile. |
| `game/account/liveland.js` | Parts 3 to 5 on the profile: a value lands, protection, corrections, the handshake, what-ifs, the heard list, `lfAttach`. |
| `game/account/livegame.js` | Part 6: the join to the client's SAVED game (`lgAttach`, `lgClient`, `lgCoach`, `lgFirst`). |
| `game/account/livescreen.js` | Part 6: the two screens during the call, and the plan (`lsView`, `lsNext`, `lsNums`, `lsRecalc`, `lsPlan`, `livePartCoach`, `livePartClient`). |
| `game/account/livereview.js` | Part 7: the review after End (`lrvCounts`, `lrvGroups`, `lrvApprove`, `lrvApproveGroup`, `lrvFix`, `lrvOut`, `lrvWhatif`, `livePartEnded`, `livePartClick`). |
| `game/account/liveai.js` | Part 8: the recorder's file (`laiFileRead`), the speaker match (`laiMatch`, `laiMapSet`), the request (`laiAsk`), the answer checked (`laiParse`), the proposals into the review (`laiMerge`), the AI card and the draft notes (`laiCardHTML`, `laiNotesHTML`), the run (`laiRun`), Save (`laiSaveNotes`). |
| `game/account/liveforget.js` | Part 9: Delete this transcript (`lvfForget`, `lvfGone`, `lvfCardHTML`, `lvfRun`, `lvfClick`). |
| `supabase/functions/live-ai-pass/index.ts` | Part 8: the Edge Function, NOT DEPLOYED. |
| `game/data/askwords.js` | The words of "one small question at a time" (ASK, ASK_NONE), for the game and for the card "Next question to ask". |

Rules in `live.js`:

- The room: `lvRoomNew`, `lvRoomDo(room, side, what, now, flag)` (the steps seen, ok, headphones, listens, start,
  pause, resume, end; the same rules as `live_session_set` in the SQL file), `lvStage` (consent, ready, live, paused,
  ended), `lvOk`, `lvBothOk`, `lvCanStart`, `lvWaitLine`, `lvHere`, `lvEchoSet`.
- The pill: `lvElapsed`, `lvClock`, `lvPill`.
- The microphone: `lvMicNew`, `lvMicOn(mic, event, code)`, `lvRestartWait`, `lvLight`, `lvStopLine`, `lvCanListen`,
  `lvFallbackLine`.
- The lines: `lvBufNew`, `lvBufKey`, `lvBufAdd`, `lvBufDue`, `lvBufConfirm`, `lvBufDrop`, `lvBufPack`,
  `lvBufUnpack`, `lvLineRow`, `lvRowLine`, `lvLabel`, `lvMerge`.
- The echo filter: `lvWords`, `lvAlike`, `lvNear`, `lvEchoOf`, `lvEchoKeep`, the settings `LV_ECHO`.
- The invite: `lvInviteUrl`, `lvInviteState`, `lvInviteRows`, `lvInviteSays`, `lvCoachName`.
- The words: `LV_CONSENT`, `LV_JOIN_LINE`, `LV_BEST_LINE`.

Adapters in `liveio.js` (stand-in in `livesim.js`): `lioDb` (`simDb`), `lioChan` (`simHub`), `lioSpeech`
(`simSpeech`), `lioWake` (`simWake`), `lioStore` (`simStore`), `lioClock` (`simClock`), `lioId` (`simId`).
`lioAnswer` turns a database answer into `{ ok, data }`, `{ wait }` (the file has not run), `{ net }` or `{ why }`.

The room controller: `lioRoom({ sid, side, db, chan, speech, wake, store, clock, id, change })` gives `R`:

- `R.room` (the row), `R.lines` (each line this device knows: `{ id, side, text, at }`, the oldest first),
  `R.mic`, `R.their`, `R.here`, `R.interim` (never saved), `R.buf`, `R.wait`, `R.link`.
- `R.hooks.line` (a function gets each line that stays, of both sides: this is where Part 3, 4 and 5 listen),
  `R.hooks.drop` (the id of a line that the echo filter took back), `R.hooks.room` (after each change of the room).
- `R.join()`, `R.act(what, flag)`, `R.micCheck()`, `R.reconnect()`, `R.flush(hold)`, `R.leave()`.
- `simPair({ clock, db, hub, sid, coach, client, clientCan })` gives two controllers for a test.

Screens (`liveroom.js`). The body of the room is plain. A later file defines a named part and the room calls it:
`livePartCoach(R)` and `livePartClient(R)` (Part 6), `livePartEnded(R)` (Part 7), and `livePartClick(a, t, R)` for
its taps. Do not replace `lrRoomHTML`. `session.html?sim=coach` and `?sim=client` (switch on) play a made-up call
on one device.

## Things the next parts must know

- A new account has no saved game until the game saves one time. The mark `su_coach` is set at sign-up, so that
  first save has "Share with my coach" on. Part 3 writes into the client's game: when no game exists yet, it has to
  make the first one (`cpPack` in `coachpage.js` shows the shape of the rows).
- The name typed on the invite screen is in the account (`user_metadata.name`) and on the device
  (`slam_live_name`).
- Part 4: with the strong echo setting a line of one word ("yes") is never dropped, so an echo of the coach's own
  "yes" can arrive as a client line. Ask for the client's word after the coach's "Confirming" line, not next to a
  coach's "yes".
- A line is saved 2 seconds (4 with no headphones) after it was heard, so the echo filter can still take it back.
  It is on the device from the first moment.
- Part 9 (privacy text), true as built: the page never opens the microphone itself. The browser's speech
  recognition asks for it. In Chrome that service sends the sound to Google to turn it into words; SLAM gets words
  only and keeps no sound. The words go over a Supabase realtime channel named by the session id, and into
  `live_lines`. Who can read them: the coach of the session, the client, the admin. `live_lines` has no delete right
  yet: "Delete this transcript" needs one (a function for the two members).

## Parts 3, 4 and 5: the live fill, the spoken confirmation, the what-ifs

Rules only, no AI. `livefill.js` reads a line; `liveland.js` puts it on a profile `c`. Both are tested with
scripted lines (`game/tests/live-fill-*.js`). The numbers are in `LF`: a topic lasts 20 seconds
(`TOPIC_MS`), a correction is a new number in 8 seconds (`FIX_MS`), a "Confirming" waits 10 seconds (`ASK_MS`),
a yes that repeats a coach's line of the last 3 seconds is an echo (`ECHO_MS`).

### The client's real game (wired in Part 6: see "Parts 6 and 7" below)

Before Part 6, `session.html` held no game. On the page `lfAttach(LR.R, { clock })` runs with no game, so each device only
shows what the other device sends, and today nothing sends. To switch the fill on, the client's device calls
`lfAttach(R, { game, clock })` with an adapter of the client's saved game:

- `game.get()` gives the profile `c` of the client (`G.chars[...]`), or null.
- `game.save(c, out)` saves it. With the whole game loaded that is `afterMoney(c, realm before, false)` (the
  era, the snapshot, the badges, then `save()`, which also sends it to the account). `lfLine` itself already
  calls `allocFillAll(c)` or `syncAll(c)`.
- The page needs `core/engine.js` (as `coach.html` has) for `applyTypical`, `syncAll`, `periods`. With no
  engine a value is kept with the reason "The game is not loaded on this device".
- A new client has no game: make `G` with one `newChar({ name })`. The first heard value calls
  `applyTypical(c)` (the game's first rows, each a guess of the game) and marks `c.x.live.fresh`.
- `simGame(c)` in `livesim.js` is the stand-in; `simPair({ ..., game })` attaches both devices.

Only ONE device writes: the one with the game (the client's). The coach's device gets each item over the
room's channel. If the client's device cannot listen (a phone), there are no client lines, so nothing fills:
the coach's words never fill. The AI pass (Part 8) is what fills such a call.

### Names and shapes

The room (`liveio.js`) got two hooks and two functions: `R.hooks.fill`, `R.hooks.hello`, `R.tell(p)` (send a
signal), `R.fire(k, v)` (run the hooks `k`).

`lfAttach(R, { game, clock })` gives `R.fill = { on, write, heard, n, last, S }`:

- `R.fill.heard`: the heard list of this session, the oldest first, the same on both devices.
- `R.fill.n`: `{ heard, filled, confirmed, kept, waiting, whatifs, check, line }`; `line` is "3 what-ifs heard".
- `R.hooks.fill` gets `{ ev: { k, item }, n }` on BOTH devices for each thing heard. `k`: `filled`, `corrected`,
  `kept`, `same`, `asked`, `confirmed`, `waiting`, `timeout`, `whatif`. Pulse on `confirmed`; glow on `filled`
  and `corrected`. A signal with `all` (the whole list) comes after a reload and after an echo was taken back.
- Class names: `LF.TAG` ("lf-heard") for the tag, `LF.GLOW` ("lf-glow") for `LF.GLOW_MS` after a value landed,
  `LF.PULSE` ("lf-pulse") for the confirmation. No CSS exists for them yet.
- `lfTag(c, fieldId, now)` gives `{ text: "heard" | "confirmed out loud" | "waiting for your next Confirming",
  cls, glow, pulse, wait, lv, rough, quote, side, at }` or null.

One item of the heard list: `{ id, sid, line, side, quote, at, st, key, label, area, v, show, rough, why, lv,
skip, unsure, fixes, was, by, answer, ref, cls, echo }`.

| `st` | Meaning |
|------|---------|
| `filled` | A Guess landed. `fixes` and `was`: it took the place of an older item. `unsure` with `why`: two different numbers, far apart in time. |
| `corrected` | A later item took its place (`by`). Kept for the review; left out of the groups. |
| `kept` | Nothing was set. `why` says it: "You already entered this.", "More than one number in this line.", and so on (`LF_WHY`). |
| `same` | The profile already said this. `skip` is true. |
| `asked` | An open "Confirming". It becomes one of the next three. |
| `confirmed` | Confirmed out loud. `skip` is true when the value is Close: the review of Part 7 can leave it out. `answer` is the client's line. |
| `waiting` | The client said no, or the coach gave no field or number. Nothing changed. |
| `timeout` | No answer in 10 seconds, or a new "Confirming" came first. Nothing changed. |
| `whatif` | `ref` is the id of the what-if. |

`area` is `income`, `housing`, `debts`, `accounts`, `bills` or `whatifs`: the groups of Part 7.
`lfGroups(c, sid)` gives them in that order with what is not sure first; `lfCounts(c, sid)` gives the counts
for "Heard X things. Y confirmed out loud. Z to check." (`heard`, `confirmed`, `check`).

Field ids (`LF_FIELDS`, `lfField(id)`): `pay.freq`, `inc:A main job`, `inc:A second job`, `inc:Side gigs`,
`spend:Home/rent`, `spend:Home/utilities`, `spend:Food/groceries`, `spend:Food/eating out`, `spend:Food/all`,
`spend:Getting around/car payment` (also `car insurance`, `gas`, `transit`), `spend:Bills and
subscriptions/phone` (also `internet`, `subscriptions`, `insurance`), `cash:Checking`, `cash:Savings`,
`cash:Cash at home`, `inv:Retirement plan at work`, `inv:IRA or Roth IRA`, `inv:HSA`, `inv:Other
investments`, `debt:<kind>` and `rate:<kind>` for the 8 debt kinds of the game, `names:Credit card balance`.
The part after "/" is one piece of a row: the row is the sum of the pieces heard.

### Where a value lands, and the stored shape (compatibility note)

A value lands in the game's own row, never in a copy. In the game a row with `s: false` is a Guess, `s: true`
is Close, `cf: 3` is Exact. Income is stored for one month: one paycheck becomes `amount x periods(payFreq) /
12` with the game's `periods()`.

New keys, added Nov 25 2026. Old saves have none of them and read as "no live session"; no other file of
the game reads `c.x.live`; nothing was renamed or removed.

- On a row (`c.incs`, `c.spends`, `c.cashes`, `c.invs`, `c.debts`): `h: 1`, "a live session set this". Three
  places of the game now leave such a row alone: `allocFill` (`features/alloc.js`) does not re-scale or remove
  it, and `applyTypical` (`core/engine.js`) keeps it when setup runs again.
- On a debt row: `ratecf`, `0` (a heard rate, a Guess) or `2` (confirmed out loud, Close). `dbRate`
  (`features/debts.js`) reads it; with no `ratecf` a typed rate is Exact as before. A rate typed by hand or a
  band tapped by hand removes `ratecf` (`ruse`, `dans`, `dbset`).
- `c.x.live = { v: 1, fresh, heard: [items], marks: {}, rows: {}, whatifs: [], wait: {}, limits: {}, names: [],
  pend, n }`.
  - `marks[fieldId]`, the record of a value: `{ id, v, lv: "guess" | "close", by: "heard" | "voice", rough, side,
    quote, at, t, line, sid, item, yes: { at, line, quote }, all: [{ v, at, line, side, quote, rough, how }] }`.
    `all` has each number ever heard for the field, so a correction keeps both.
  - `rows[rowKey]`: `{ parts: { rent: 1850 }, sum, voice, base: { v, s, had } }`. `base` is the row before the
    call (for the review: "was $1,250 before the call").
  - `whatifs[]`: `{ id, sid, line, side, quote, at, cues, type, by, sug, sugBy, ok, link }`.
  - `wait[fieldId]`: the field waits for the next "Confirming". `limits[fieldId]`: `{ hi, lo, from }`.
    `names`: card names heard. `pend`: one paycheck that waits for the pay rhythm.
- A goal that a what-if added has `live: <what-if id>`.

Size: about 300 bytes for each item. A call with 100 items adds about 30 KB to the saved game. Part 9
("Delete this transcript") should also say what happens to `c.x.live.heard` (the quotes are transcript text).

### The rules, as built

1. Only the client's words give a value. A coach's line sets the topic (the last field that it names), opens a
   "Confirming", or is a what-if. A coach's line of 4 words or more that names no field ends the topic.
2. A client's line that names its own field next to one number fills it with no topic ("my rent is 1,850",
   "1,850 for rent"). With no field in the line, one number goes to the open topic. A topic is used one time.
3. Not sure means nothing is set and the line is kept for the review: two numbers that are not one range, a
   number next to "went up", "under", "more than", a number below 10, an income with no month or paycheck
   said, an income for a year, a paycheck before the pay rhythm is known on a new profile (it lands when the
   rhythm is heard).
4. Who made a Guess. The game has no mark for "the person typed this Guess": each number that a person saves
   is `s: true`. So: `s: true` (or `cf: 3`) was entered or confirmed by the person and is never changed
   ("You already entered this."). `s: false` with `h: 1` and the amount that the call wrote is a Guess of the
   call: a later line can change it. `s: false` with `h: 1` and another amount was changed by hand: not
   changed. `s: false` with no `h` is a guess of the game: the call can set it, and `rows[...].base` keeps the
   old amount. (One case looks like a guess of the game: a person typed an amount in "one question at a time"
   and tapped "I don't know yet". The game itself re-scales that row. See QUESTIONS.)
5. The pay rhythm has no Guess / Close in the game. On a profile whose first rows came from the call
   (`fresh`), the call can set it. On a profile with a finished setup it is the person's answer.
6. Corrections. In 8 seconds: a line that is only a number, or has "no wait", "sorry", "I mean", "actually",
   "scratch that", "make that" before the number, or names the same field. Later: a line that names the same
   field with another number still takes the place (the last one stays), and the item is `unsure`.
7. Nothing is deleted. A row is added the way the action `rowaddk` does it.
8. The handshake. Only a coach's line with "confirm" or "confirming", a field and one number opens it. A
   "Confirming" in a client's line is the coach's echo and is not read at all. The yes must be a client's
   line in 10 seconds: "confirmed", "yes", "yep", "yeah", "yup", "correct", "right", "that's right". "Okay",
   "sure" and "uh huh" are not a yes. The echo rule: when the coach said a line AFTER the "Confirming" line,
   in the 3 seconds before the client's word, and that line has each word of the client's line, the client's
   word is an echo and is ignored (the question stays open). The words of the "Confirming" line itself do not
   count, so "is that right?" then "that's right" works. On yes: the value is set, the row gets `s: true`
   (Close, the same as the game's own "Yes, that's right"), never `cf: 3`. "No", "nope", "nah", "actually",
   "wait", "not quite", "not exactly", "hold on": nothing changes, `wait[field]` is set. A "no, it is 650" also
   lands 650 as a Guess. A field that the person entered, or an Exact one: nothing changes, the item says why.
9. A value confirmed out loud is changed only by a new "Confirming" with a yes, not by plain speech.
10. A rough number never goes above Guess: when the coach confirms the same number that came from a rough
    answer (450 from "400-ish, maybe 500"), the item says confirmed and the value stays a Guess, in the
    review. A different, firm number makes it Close. (See QUESTIONS.)
11. A row with pieces (Home is rent plus utilities) is Close only when each piece heard is confirmed.
12. What-ifs. The cue words are in the comment of `lfCue`. "maybe 500", "it would be about 1,850" and "could
    be 400" are a rough number, not a what-if, ONLY when the line answers an open question of the coach. With
    no open question the same line is a what-if. After a coach's what-if, the client's lines with a number are
    what-ifs too, until the coach's next plain line or 20 seconds. A what-if changes no value.
13. Types: `lfWhatifSuggest(c, id, type, "ai")` only writes `sug` and `sugBy`. `lfWhatifSet(c, id, type,
    "coach", o)` sets `type`, `by`, `ok` and `link`: Ceiling and Floor write `limits[field]` (`lfWhatifLimit`;
    with no field or number in the quote the link is `open` for the review, which passes `o.key` and `o.v`);
    Scenario links to a simulator (`simopen` with its id, or `sims`), and adds no block (`lfWhatifScenario`);
    Life transition links to "Break in case of emergency", the action `transit` (`lfWhatifLife`: the one named
    function for the later Life Transitions run); Goal or wish adds one goal to `c.goals` with the game's
    shape (`lfWhatifGoal`). These run on a profile object: on the coach's device that is a copy, so Part 7
    has to save the client's game the way the admin view does.
14. The echo filter takes a line back (`R.hooks.drop`): `lfUndo` puts the profile back as it was before that
    line when no later line changed it; if a later line did, the items are flagged `unsure` and `echo`.
15. A reload of the client's page ends the short memory of the call (topic, open "Confirming", the 8 seconds).
    The values and the list are on the profile. Lines that arrive while the page loads are not read by the
    fill; they are in the transcript for the review and the AI pass.

### What the number reader assumes (nobody here saw real output)

No one on the build saw what Chrome's speech recognizer writes. The reader was written for these forms, and
each is in `game/tests/live-fill-number-reader.js`:

- Money: `$1,850`, `1850`, `1,850.50`, `eighteen fifty`, `four fifty`, `eighteen hundred`, `twenty four
  hundred`, `two thousand one hundred`, `three hundred and fifty`, `1.8k`, `two grand`, `a grand`.
- Rates: `24.99 percent`, `24.99%`, `twenty four percent`, `twenty four point nine nine percent`; a plain
  number up to 60 as the answer to a question about a rate.
- Rough: `about`, `around`, `roughly`, `maybe`, `probably`, `like`, `I think`, `400-ish`, `or so`, `give or
  take`; ranges `400-ish, maybe 500`, `between 3 and 4 thousand`, `400 to 500`, `400-500`, `four or five
  hundred` (the middle; the ends at most 3 times apart).
- Rhythm: `every two weeks`, `every other Friday`, `biweekly` (read as every 2 weeks), `twice a month`,
  `semi-monthly`, `on the 1st and the 15th`, `weekly`, `once a month`, `monthly`.
- Refused: phone numbers, times of day, dates, a year after "in / since / of / by / until / during / from",
  ages, counts (`two cards`, `5 years`), `option 2`, the word `one` alone, `401(k)`, `403(b)`, `529`, `1099`,
  `a few hundred`.

Known weak points: "two hundred fifty thousand" is read as two numbers (so it is kept, not set). "in 2,000"
written with no comma after "in" is refused as a year. The word lists are English only. A recognizer that
writes "18 50" for "eighteen fifty" gives two numbers (kept, not set).

## Parts 6 and 7: the screens and the review (as built Nov 25 2026)

### The join to the saved game (`livegame.js`)

- `session.html` now loads the game's own files that work with no game screen: `core/engine.js`, `core/recalc.js`,
  `data/askwords.js`, `features/alloc.js`, `screens/dash.js`, `account/cloud.js` (`clSig`, `clMergePerson`),
  `account/coachpage.js` (`cpGame`, `cpPack`, `cpSaveGame`). Their few lines that touch the game's menus (`ACT`,
  `MENU`, `GLOSS`) run only when those exist. No function is copied onto the page.
- `lrRoom` calls `lgAttach(R, { sb, uid, name, owner, store, clock, change })` before `R.join()`.
  - The client's device (`lgClient`): reads the client's saved game; a new client gets `lgFirst(name)` (the shape of
    `fresh()`, one `newChar` with the typed name, saved at once with "Share with my coach" on: `cpSaveGame` inserts
    rows with `share_with_coach: true`). Each change of the call: `c.mod` (the stamp), a copy in the device store
    (`slam_live_game_<uid>`), and `cpSaveGame` 0.8 seconds later (again each 15 seconds while the server is out of
    reach). A copy left on the device by a reload is merged by the stamps (`clMergePerson`).
  - The coach's device (`lgCoach`): reads the client's shared game; after End it reads it again and the review saves
    each tap through `A.act(fn)`, which is `cpSaveGame` plus the mark `g.coachEdit` and one line `audit_write`.
  - After a load the whole heard list goes to the other device once the room is joined (a reload is whole again).
- What the page does NOT do: `afterMoney()` of the game (the snapshot of today and the badges). The game does it at
  its next change of a money number. The totals are the game's own (`allocFillAll`).

### The screens (`livescreen.js`)

- The client's device works out the view (`lsView`: the profile by area, the four numbers, the next question, the
  plan) after each thing heard and sends it with the fill signal; the coach's device shows what arrives, or its own
  read of the shared game before the client's device is in the room.
- The next question: `lsAskOrder(c)` is `sharpList(c)` of the game (plus the plain first question for debt and
  investing when there are none), the words are `ASK` / `ASK_NONE`. A line is skipped when it is made real (Close or
  Exact), set by a call (`h`), or heard in this call. The handshake card shows the words for the oldest firm Guess,
  checked with the reader of the call (`lsConfirmSay`: "Confirming rent 1,850"); a rough Guess asks for a firm number.
- The four numbers: free to spend (`freeToSpend`), next goal date (`goalSim`), net worth (`derive().nw`),
  high-interest debt-free (`debtOutlook`), each with its mark, as stat tiles of `screens/dash.js`. When one moves:
  one line with the words of Recalculating (`rcRoute`, `rcWords`: sooner is "New route", later is calm), 20 seconds.
- The plan ("Show plan" after End, both screens): `ERAS[derive(c).era]`, the first 3 of `candidates()`, and
  `paySuggest()` for the next payday, each with the Guess mark when the plan rests on a Guess.

### The review (`livereview.js`)

- Stored: `c.x.live.review[itemId] = { st: "ok" | "fixed" | "out", by, at, v, was, how, back, gone, quote, type, link,
  with }`; `rows[rowKey].out` and `marks[fieldId].out = { by, at }` after "Leave it out". Compatibility: new keys only,
  added Nov 25 2026; a profile without them reads as "nothing reviewed"; nothing was renamed or removed.
- Approve writes who and when only. A fix lands through `lfPut` as a Guess (never Close, never Exact), and only where
  the call may set a value (`lfOpen`). "Leave it out" puts a row back to `rows[rowKey].base` when the row still holds
  the amount of the call (a row the call added is taken away again; a game's guess row is then re-fitted by the
  game's own `allocFillAll`, as any guess row is). The quote stays in the record and in the heard list.

## For Parts 8 and 9 (where they plug in)

- **The AI pass and the Samsung file go into the SAME review.** Put each proposed value as one item of
  `c.x.live.heard` (`lfItem` shape) with `src: "ai"` or `src: "file"`, `st: "kept"`, `key`, `label`, `area`, `v`, `show`,
  `quote` (the words it came from), `why` ("Proposed by the AI pass"), `sid` of the session. `lrvSource` already says
  "the AI pass" / "the Samsung file"; `lrvGroups` puts them in their area, not sure first; Approve marks them; "This is
  right" does NOT set the value (a kept item has no value on the profile): a proposed value lands only by the fix
  "Use a number they said" (add the proposed number to `marks[key].all`, or give `lrvChoices` a `pick` from the item),
  so nothing applies without the coach. A proposed what-if type: `lfWhatifSuggest(c, id, type, "ai")`; "Approve all"
  then sets it (`lrvApprove`). Session notes and the next-call agenda: a new card in `lrvReviewHTML`, above "By area".
  The button "Drop in your recording's text file" goes in `lrvReviewHTML` under the summary line.
- **"Delete this transcript"** (Part 9): after the review, in `lrvReviewHTML` (the coach) and in `lrvClientEndHTML`
  (the client), one tap with a confirm. Transcript text is kept in these places, and the delete must clear each:
  1. the table `live_lines` (needs a delete right or a function for the two members: none exists yet);
  2. the device store of each side: `lvBufPack` under the session key (lines that wait), and `slam_live_game_<uid>`
     (a copy of the profile while a save waits);
  3. the client's saved game: `c.x.live.heard[].quote` and `.answer.quote`, `c.x.live.marks[].quote` and
     `.all[].quote`, `c.x.live.whatifs[].quote`, `c.x.live.review[].quote`. Clearing the quotes must keep the values,
     the levels and the records (who, when): blank the text, do not delete the items;
  4. the Realtime channel keeps nothing.
- Coach-side reminder after the AI pass ("Delete the recording from your phone"): under the drop-in button.

## What a real dry run must check (not possible from the build machine)

1. Eli runs the SQL file. Then on the coach page: "Start session with a new client" makes a link.
2. The link in a private window on a second device: the invite screen, the sign-up, "Check your email" if
   confirmation is on, the link in the email, and the arrival in the room (also when the email link opens the
   game and not `session.html`).
3. Both devices show the other as in the room within a few seconds. If not: Dashboard, Realtime, Settings.
4. OK on both, the microphone step on both (Chrome shows its prompt one time), headphones, Start.
5. Chrome on two laptops, 20 minutes: both lights stay green; after a silence the light goes amber for a moment
   and green again by itself; the clock does not stop; the screens stay awake.
6. Does speech recognition start on the client's device at Start with no tap there, and after a reload? If Chrome
   refuses, the light says Stopped and Reconnect is one tap; say so in the report.
7. With headphones on both: no line two times. With no headphones on one side and "No" tapped: how many echo lines
   get through, and how many real lines are lost. The numbers in `LV_ECHO` are a first setting.
8. Who is "You" and who is "Them" on each screen, for ten lines.
9. Reload the client's tab in the middle: it comes back live, with no second Start and no line lost.
10. Turn the wifi off for 30 seconds on one device, speak, turn it on: the lines arrive.
11. A phone (Safari on an iPhone, Chrome on Android) and Firefox as the client: what the screen says. Safari has
    a speech recognizer of its own, so it may listen; the fallback shows only where the browser has none.
12. Pause, Resume and End from each side. After End: the lines in `live_lines`, read as the coach, as the client,
    and NOT as a second coach account.
13. A second account opens the used link; a link older than 7 days.
14. Parts 3 to 5, with the fill wired to a real game (Part 6): say each form of the list "What the number
    reader assumes" one time and write down what the recognizer wrote. Most of all: does it write "eighteen
    fifty" as 1850, "1,850", "$1,850" or "18 50"? Does it write "percent" or "%"? "401k" or "401 K"? Does it
    put a period or a question mark at the end of a line, and commas inside it?
15. How long is one line? If the recognizer cuts a sentence in two ("my rent is" / "1,850"), the second half
    has no field. With a topic open it still lands; with no topic it does not. Count how often this happens.
16. How often is a number misheard (15 for 50, 1,500 for 1,050)? Ten numbers said, ten checked.
17. The handshake: "Confirming rent 1,850" then "yes" from the client, ten times. Count the times it works,
    the times the "yes" is not heard as its own line (a one-word line may be dropped or joined to the next
    one), and the times 10 seconds is too short.
18. With no headphones on the client's side: does the coach's "Confirming ... right?" come back as a client
    line, and does any coach's number land as a client value? (`lfUndo` and the echo rule of the yes cover the
    cases the build could think of.)
19. Two people who talk at the same time: which line gets the number?
20. Count the what-ifs of a real call against what a person would call a what-if: the cue "would", "could"
    and "want to" may catch too much.

## Parts 8 and 9 (as built Nov 25 2026)

### Start waits for the client (a fix from the last walk)

The room has one more step, `mic` (`coach_mic`, `client_mic`: the answer to "Allow the microphone"; the device sends
it when the check ends). `lvCanStart(room, "coach")` now needs both OKs AND the client's steps done (`lvSetDone`: OK,
headphones answered, the microphone step answered or a browser that cannot listen). While the client is not done the
coach's card says "Waiting for them to allow the microphone." (or the headphones question, `lvClientWait`) and offers
"Start with my side only" (`R.act("start", true)`). `live_session_set` in the SQL file has the same rule (`flag is
true` = side only) and the step `mic`; the two columns are added with `add column if not exists`.

### Part 8: the AI pass

- The Edge Function `supabase/functions/live-ai-pass/index.ts` (Deno, NOT DEPLOYED). The key comes only from its
  secret `ANTHROPIC_API_KEY`. It checks the caller with their own sign-in (a supabase client with the caller's JWT):
  the coach of the session or the admin, and the session must be ended. It reads `live_lines` itself; from the
  browser it takes only the field list, the what-if ids (with their line ids, never their words) and the optional
  file text. One request to the Messages API (`claude-opus-5-5`, effort medium, server-side fallbacks on refusal),
  a strict tool `session_result` as the structured output, caps (200,000 characters in for the lines and for the
  file, 16,000 tokens out), a 2-minute time limit, typed errors in calm words. It stores nothing. CORS: the site only.
- The request and the answer: `laiAsk` and `laiParse` (each field id must be a field of `LF_FIELDS`, each value in
  range, each type one of the five). The stand-in is `simAi` / `simAiReply` in `livesim.js`; a test or the made-up
  call sets `R.aiFn`. On the real page `laiAdapter` calls `sb.functions.invoke("live-ai-pass")`.
- The proposals enter the SAME review (`laiMerge`): one kept item each, `src` "ai" or "file", `pass`, `per`, `why`
  ("Proposed by the AI pass." plus "Only in the Samsung file.", "A rough number.", "Only you said this number.",
  "The call heard ..."), `unsure` for each of those. A proposal the profile already holds adds nothing. An earlier
  pass's unreviewed proposals become `corrected` (left out). In the review: not sure first (`lrvUnsureFirst`), the
  label "Not sure", the primary button "Use this number". **Approve of a proposal uses its number, as a Guess,
  through `lrvFix` (how "ai"), only where the call may set it; "Approve all" leaves a not-sure proposal for its own
  tap.** What-if types are `lfWhatifSuggest(..., "ai")`; Approve sets them.
- Stored: `c.x.live.ai[sid].passes = [{ id, at, tokens: { in, out }, model, n, same, typed, file }]`. The notes and
  the agenda are NOT on the profile (the client can read their game): the draft is on the coach's device
  (`slam_live_ai_<sid>`) and goes into `coach_notes` (kind "note", through `cpNote`) only on Save.
- The coach's view: the card "The AI pass" under the summary line (drop-in, the speaker line, Run, each pass with
  "About 18,200 tokens (15,800 in, 2,300 out)", the reminder "Delete the recording from your phone."), and the
  closed card "Session notes and the next call".
- The file: read in the browser (300 KB), labels on their own line or in front of the words, with or without a time,
  names given in the recorder ("Eli 00:12"). `laiMatch` looks for each file line of 3 words or more in the app's lines
  in order (a share of 0.5 of the words), votes the speaker's side, and gives the mapping with a confidence; sure at
  0.8 when at least 3 lines and a fifth of the file match. Not sure: the coach taps "Speaker 1 is me". No labels: a
  matching line gets the side of the call, the rest "Not sure". The text sent says "Coach:", "Client:", "Not sure:".

### Part 9: privacy

- `game/privacy.html#live`: text only; Chrome sends the sound to Google; the AI pass sends the words to Anthropic only
  when the coach runs it (and only when it is switched on); who sees the words (the client, that coach, the admin; the
  quotes in the game follow the game's own rule); kept until deleted.
- One line under the consent words of the brief (`LV_CONSENT_MORE`), with a link to the privacy page.
- Delete this transcript (`liveforget.js`), on the coach's review and on the client's calm screen after the plan:
  one tap, one confirm. `R.forget()` (liveio.js) removes the session's lines (new rule "the two members delete the
  lines" and `grant ... delete` in the SQL file: the coach or the client, after End; not the admin from the app, not
  another coach), the lines that wait on the device, and this page's lines. Then each side's `act` (the client got
  `lgClient.act`: send what waits, read the saved game again, change, save, drop the device copy) runs `lvfForget`:
  the quotes of the heard list, the answer, the marks and their `all`, the what-ifs and the review records are made
  empty; values, levels and records stay; `c.x.live.forgot[sid] = { at, by, n }` gives "Transcript deleted on <date>".
  When the database still has lines afterwards (a device that was offline sends late: `live_can_write` allows an hour
  after End), the card says so and offers to delete again.

### Tests

`game/tests/live-ai-pass.js` (Parts 8 and 9) and `game/tests/live-checklist.js` (the list of the build, one check
each). The two-device files call `simReady(P)` (the client's microphone and headphones steps) before Start.
`tools/game_walk/live.cjs` walks `session.html?sim=coach` and `?sim=client` at 1280 and 390 in Chromium, with both
switches on in the test page only.

## For Eli: before the first real call

### What landed

All 9 parts, behind two switches that are both OFF: `LIVE_SESSION_READY` and `AI_PASS_READY` in
`game/account/liveflag.js`. The invite link that is the sign-up; the session room (both OK, the microphone and
headphones steps, one Start, Pause and End, text only); the live fill by rules (Guess, corrections, never over a
value you or they entered); "Confirming" plus their yes (Close, never Exact); the what-ifs list; your screen and the
client's calm screen; the review after End with Show plan; the AI pass with the recorder's file; the privacy page and
Delete this transcript. Start now waits until the client allowed the microphone and answered the headphones question
(or you tap "Start with my side only").

### What was not built

A button inside the game for an existing client to join a session (they open the session page; QUESTIONS 592 (h)); a
screen that shows ceilings and floors (593 (l)); one line for each credit card in the live fill (593 (j)).

### Not checked in a real browser with real things

Two real devices, real microphones, Chrome's real speech recognition, the real Realtime link, the SQL file in the
database, the Edge Function on Supabase (it was not run anywhere: no Deno here), a real Samsung Voice Recorder
file, a real Anthropic answer. Checked: the simulated call in Chromium at 1280 and 390, as the coach and as the
client, through the AI pass (a stand-in answers) and Delete this transcript: no console error, no sideways scroll,
no "undefined" or "NaN".

### What you do by hand, in this order

1. Run `supabase/migrations/20261125210000_live_sessions.sql` in the Supabase SQL Editor (the newest copy: it has
   the microphone step and the delete rule; safe to run two times).
2. Optional, for Delete my account to remove sessions too: `supabase/migrations/20261125200000_delete_my_account.sql`.
3. Switch on `LIVE_SESSION_READY` (ask Claude), and do the dry run below.
4. For the AI pass: each step of `docs/AI-PASS-SETUP.md` (an Anthropic key pasted only into Supabase, the function
   deployed, then `AI_PASS_READY`).

### The real dry run, as a checklist

- [ ] The coach page: "Start session with a new client" makes a link.
- [ ] The link in a private window on a second laptop: the invite screen, the sign-up, the email link, the room.
- [ ] Both devices show the other as in the room within a few seconds (if not: Supabase, Realtime, Settings).
- [ ] OK on both, the microphone step on both, headphones: your Start waits until their steps are done.
- [ ] 20 minutes in Chrome on two laptops: both lights stay green, a silence goes amber and back by itself, the
      clock runs, the screens stay awake.
- [ ] Their speech recognition starts at Start with no tap on their side (and after a reload). If not: Reconnect.
- [ ] Headphones on both: no line two times. No headphones on one side and "No": count echo lines and lost lines.
- [ ] Ten lines: You and Them are right on each screen.
- [ ] Reload their tab in the middle: it comes back live, no second Start, no line lost.
- [ ] Wifi off for 30 seconds on one side, talk, wifi on: the lines arrive.
- [ ] A phone (Safari, Chrome on Android) and Firefox as the client: what the screen says.
- [ ] Pause, Resume and End from each side; after End the lines are readable as you and as the client, NOT as a
      second coach account.
- [ ] A second account opens a used link; a link older than 7 days.
- [ ] Say each money form of "What the number reader assumes" once and write down what Chrome wrote ("eighteen
      fifty", "percent", "401k", periods and commas).
- [ ] How often a sentence is cut in two lines; how often a number is misheard (ten numbers).
- [ ] "Confirming rent 1,850" and their "yes", ten times: how many work.
- [ ] With the AI pass set up: drop in the Samsung file, check the speaker line, run the pass, approve one proposal,
      Save the notes, and check the token count against the Billing page.
- [ ] Delete this transcript as the client in one session and as you in another: the lines are gone in the table
      `live_lines`, the numbers stay.

