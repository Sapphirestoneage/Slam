# Live Session Mode: notes for the next parts of the build

Run "Live Session Mode (Nov 25 2026)". Parts 1 and 2 are built. This page is for the worker of each later part
and for the part "Tests, checks and report". It is not for the player.

## The switch

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
