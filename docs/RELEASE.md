# The public site: the branch `release`, and how to promote

SLAM has two lines of work in one repository.

| Branch | What it is | Who changes it |
|--------|------------|----------------|
| `main` | The work in progress. Each run pushes here, many times a day. | Each run |
| `release` | The public site. It only moves when a promote runs, and a promote only runs when all tests pass. | `tools/promote.sh`, nothing else |

So a half-built feature, or a test that does not pass on `main`, never reaches the people who use the site.

## Eli: switch the public site to `release` (one time, about a minute)

1. Open https://github.com/Sapphirestoneage/Slam in a browser, signed in.
2. Click **Settings** (the last tab in the row under the repository name).
3. In the left column, under "Code and automation", click **Pages**.
4. Under "Build and deployment", **Source** stays "Deploy from a branch".
5. Under **Branch**, open the first box (it says `main`) and choose **release**.
6. The second box stays **/ (root)**.
7. Click **Save**.
8. Wait about a minute, then open https://sapphirestoneage.github.io/Slam/game/ and reload.

What changes for you:

- **The link for the slide and its QR code** are in `docs/LAUNCH-LINK.md` (the picture is `docs/qr-slam.png`).
- **The public link stays the same**: https://sapphirestoneage.github.io/Slam/game/ for the game, and
  https://sapphirestoneage.github.io/Slam/ for the web app. A QR code or a slide with that link keeps working.
- **The site only changes when a promote runs.** A push to `main` no longer changes what people see. Each run ends
  with a promote and says so in its summary: "release is now ..." or "not promoted: ..." with the reason.
- To see the newest work before it is public, ask for it in a session (it runs from `main` on the build machine).
  There is no second public address for `main`.
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
2. Checks out that exact `main` commit in a temporary folder. The folder you start it from plays no part: work that
   is not committed there is not tested, not published and not touched.
3. Runs `node --test` and `npm run test:game` on that commit.
4. Only when both pass, moves `release` forward to that commit and pushes it. No pull request is needed.

The last line it prints says what happened:

| Last line | Meaning |
|-----------|---------|
| `release is now <commit>` | The public site moves to that commit (GitHub takes about a minute to publish). |
| `release is already at main (<commit>): nothing to promote` | Nothing to do. |
| `not promoted: <why>` | Nothing was changed. The public site stays as it was. The lines above say which test did not pass. |

It never forces, merges or rewrites. If somebody committed on `release` directly, so that `release` has a commit
that `main` does not have, the script stops and says so. The repair is to bring that commit into `main` (a merge of
`release` into `main`, tested and pushed), then promote again.

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

- `test/promote.test.js`: the decisions of the script, with a local repository as the remote (no network).
- `game/tests/coming-soon.js` and `test/soon.test.js`: a missing action and a screen that throws both end in the card.
