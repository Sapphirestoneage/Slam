# The public site: the branch `release`, and how to promote

SLAM has two lines of work in one repository.

| Branch | What it is | Who changes it |
|--------|------------|----------------|
| `main` | The work in progress. Each run pushes here, many times a day. | Each run |
| `release` | The public site. It only moves when a promote runs. `/game/` and the rest only change when all tests pass. It also holds the test build, the folder `game-next/`. | `tools/promote.sh`, nothing else |

So a half-built feature, or a test that does not pass on `main`, never reaches the people who use the site.

## Eli: switch the public site to `release` (one time, about a minute)

1. Open https://github.com/Sapphirestoneage/Slam in a browser, signed in.
2. Click **Settings** (the last tab in the row under the repository name).
3. In the left column, under "Code and automation", click **Pages**.
4. Under "Build and deployment", **Source** stays "Deploy from a branch".
5. Under **Branch**, open the first box (it says `main`) and choose **release**.
6. The second box stays **/ (root)**.
7. Click **Save**.
8. Wait about a minute, then open https://play.stresslessaboutmoney.com/game/ and reload.

What changes for you:

- **The link for the slide and its QR code** are in `docs/LAUNCH-LINK.md` (the picture is `docs/qr-slam.png`).
- **The public link stays the same**: https://play.stresslessaboutmoney.com/game/ for the game, and
  https://sapphirestoneage.github.io/Slam/ for the web app. A QR code or a slide with that link keeps working.
- **The site only changes when a promote runs.** A push to `main` no longer changes what people see. Each run ends
  with a promote and says so in its summary: "release is now ..." or "not promoted: ..." with the reason.
- To see the newest work before it is public, open the test build: https://play.stresslessaboutmoney.com/game-next/
  (see "The test build" below). It has an amber strip "TEST BUILD" at the top.
- To go back: the same steps, and choose `main` in step 5.

If `release` is not in the list in step 5, the branch was deleted. Run the promote command below: it makes the
branch again.

## Promote: the one command

From the repository folder:

```
bash tools/promote.sh
```

What it does, in order:

1. Reads where `main` and `release` are on GitHub.
2. **Stage 1, the test build.** Puts the game of `main` on `release` as the folder `game-next/`. `/game/` and the rest
   of the public site do not change. It prints `game-next is now <commit> (the test build)`.
3. Checks out that exact `main` commit in a temporary folder. The folder you start it from plays no part: work that
   is not committed there is not tested, not published and not touched.
4. Runs `node --test` and `npm run test:game` on that commit. The math checks are part of the first one
   (`test/mathchecks.test.js`: FI number, Coast FI, Quiet Quitting FI, Rule of 5, little e, the order of debts, the
   8% rule, the 7/4/2 defaults).
5. **Stage 2, only when both pass.** `release` gets the files of `main`. So `/game/` is now what `/game-next/` was.
   `game-next/` stays, with the same build. No pull request is needed.

The last line it prints says what happened:

| Last line | Meaning |
|-----------|---------|
| `release is now <commit of main>` | The public site holds that commit of `main` (GitHub takes about a minute to publish). |
| `release is already at main (<commit>): nothing to promote` | Nothing to do. |
| `game-next is now <commit>: the test build only, /game/ is as it was` | You asked for the test build only (see below). |
| `not promoted: <why>` | `/game/` and the rest of the public site stay as they were. The lines above say which test did not pass. The test build stays at `/game-next/`, so the build that did not pass can be looked at. |

How `release` is made: it is a branch that the script builds. Each stage adds one commit on top of `release` with a
plain push. The commit of stage 2 has `main` as its second parent, so `git log release` shows what was published.
The script never forces or rewrites, and it changes no working folder. If somebody commits on `release` directly,
that commit stays in the history, and the next promote puts the files of `main` in place again. So make each change
on `main`.

## The test build: `/game-next/`

- Address: https://play.stresslessaboutmoney.com/game-next/ (and `/game-next/admin.html`, `/game-next/coach.html`).
- Each page of the test build shows an amber strip, "TEST BUILD", at its top (`game/core/testbuild.js`). The strip
  shows only when the address has `/game-next/` in it.
- To renew only the test build, with no tests and no change of `/game/`:

  ```
  bash tools/promote.sh --next
  ```

- The same two choices are a button on GitHub: **Actions**, then **publish**, then **Run workflow**
  (`.github/workflows/publish.yml`). Choose "Test build only" or "Test build, then /game/ when the checks pass".
- Each address inside the game is relative, so the same files work in both folders. A test examines this
  (`game/tests/whats-new-note-and-test-build.js`).

Know these three things about the test build:

1. **It uses the real saved games.** `/game/` and `/game-next/` are on one website, so a browser gives both the
   same storage, and a signed-in account saves to the same database. A change of the test build to a saved game is
   a real change. Try a new build with a test account.
2. **Sign-in emails need the address on the allow list.** In Supabase: Authentication, then URL Configuration,
   then Redirect URLs. Add `https://play.stresslessaboutmoney.com/game-next/**`. Until then, a link in an email to
   confirm an address or to set a new password, asked for from the test build, opens the main address `/game/`.
   Sign-in with email and password works without this.
3. **The share links and the QR code** in the game name `/game/` on purpose (`FD_SITE`, `DOOR_LINK`, `QR_URL`): a
   link sent from the test build takes a friend to the real game.

## When to run it

- **At the end of every run**, after the last push to `main`. Say the last line of the script in the run's summary.
- After a repair that people are waiting for, when both suites pass.
- Not in the middle of a run, and not to try something out: `release` is what people use.

The promote takes as long as the two test suites (about ten minutes on the build machine).

## What keeps a half-built part off the screen

A part that reaches `release` before it is finished shows one calm card, "Coming soon", and never a broken or blank
screen:

| Where | What happens | Code |
|-------|--------------|------|
| The game: a button whose action is not built | The card, in a sheet, with "Back to the game" | `game/core/soon.js`, `soonTap` |
| The game: a Menu row whose action is not built | The row says "Coming soon"; a tap shows the card | `game/screens/planner.js` |
| The game: a sheet or a main screen that cannot draw | The card in its place | `soonDraw`, `soonRun` |
| The game: a row of "What's built" whose code is missing | "Missing from this version", with no button | `game/features/built.js` |
| The web app: a route with no screen, or a screen that cannot draw | The card, with "Go to Home" | `js/ui/soon.js`, `guardScreen` |

The card hides nothing from the people who repair the app. Each error is recorded first (in the game: type `ERRLOG`
in the browser console; in the web app: `slam.errors`), and the same error is thrown again after the card is on the
screen, so the console and the test tools that listen for page errors still see it. In the game tests the card is
off (`SOON_AFTER = "now"` in `game/tests/harness.cjs`): the error is thrown at once, so a test fails on a real
defect.

Not covered: the stand-alone calculator pages (`afford.html`, `cards.html` and the others at the top of the
repository), `game/admin.html` and `game/coach.html`. Each has its own small script and no shared router.

## Tests

- `test/promote.test.js`: the decisions of the script, with a local repository as the remote (no network): the two
  stages, the test build only, a suite that does not pass, a commit made on `release` directly.
- `test/mathchecks.test.js`: the math checks that a publish needs.
- `game/tests/coming-soon.js` and `test/soon.test.js`: a missing action and a screen that throws both end in the card.
