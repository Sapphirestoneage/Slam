# game/tests: the tests of SLAM the Game

```
npm run test:game                          Run all test files.
node game/tests/run.cjs fork-theory.js     Run one file.
```

The tests need Node.js only. They need no browser and no package from npm.

## How a test file works

1. `run.cjs` runs each `.js` file of this folder in its own process.
2. `harness.cjs` makes a small stand-in for the browser. Then it loads all game scripts in the order of `index.html`. The line with the totals prints when nothing is left to run, so a check inside a promise (the retirement engine) counts too. Such a test puts its last steps, and the reset of the profile, inside its last callback.
3. The test file runs in the same global scope as the game. It makes a sample profile, sends taps, and reads the HTML of the screen.
4. At its end, the test file puts the game state back.

| Helper | What it does |
|--------|--------------|
| `X(action, v, k, extra)` | Sends one tap to `ACT[action]`. `v` and `k` are the `data-v` and `data-k` values of the button. |
| `app()` | Returns the HTML of the main screen. |
| `ov()` | Returns the HTML of the open sheet. |
| `chk(name, condition, info)` | Records one check. A failed check prints its name and `info`. |
| `clean(html)` | Returns false if the HTML shows `undefined`, `NaN` or `null`. |
| `junk(html)` | Returns the text near the first such defect. |
| `skip(why)` | Says that the file cannot run here. The runner shows the reason. |

## The test files

Each file has the name of its feature.

| Test file | Feature | Script that it examines |
|-----------|---------|-------------------------|
| `addon-sealed-files.js` | The sealed add-on files (needs private files) | `account/addon.js`, `x1.json`, `x2.json` |
| `ask-front-door.js` | The Ask front door on Home | `features/ask3.js` |
| `insurance-needs.js` | Insurance needs | `features/cover.js` |
| `investment-mix-and-fees.js` | Investment mix and fees, and the key number Stock share | `features/mix.js` |
| `plan-spreadsheet.js` | The spreadsheet of the plan: each formula worked out and compared with the game | `features/book.js` |
| `plan-summary.js` | My plan on one page | `features/plan.js` |
| `ledger-and-statements.js` | The giant ledger and the three statements: each total against derive() | `features/ledger.js` |
| `card-library-admin.js` | The card template, and Add a card on the admin page | `data/cardtemplate.js`, `account/cardadmin.js` |
| `card-vault.js` | The card vault: the 5/24 count, the credit band, offers against the budget | `features/vault.js`, `data/cards2026.js` |
| `retirement-engine.js` | The retirement engine and its adapter: same seed, same result | `vendor/retire-engine.js`, `features/retire.js` |
| `retirement-odds.js` | Retirement odds | `features/odds.js`, `data/market.js` (some checks wait for the engine) |
| `life-event-blocks.js` | Life event blocks: the stack on top of the simulators | `features/blocks.js` |
| `simulators.js` | The simulator engine and the 12 simulators, with each flip point | `features/sim.js`, `features/sims/*.js` |
| `spreadsheet-extras.js` | The savings rate by month, the quotas, next year's budget | `features/quota.js` |
| `tax-view.js` | The tax view | `features/taxview.js`, `features/retire.js` (retireTax) |
| `two-paths.js` | The two paths | `features/paths.js` |
| `windfall.js` | The windfall: extra money down the order of the two paths | `features/windfall.js` |
| `taking-money-out.js` | Taking money out: the order, guardrails, the years before 59 and a half, health cover | `features/takeout.js`, `data/takeout2026.js` |
| `two-ages.js` | Two ages: work optional and money reachable, for each person | `features/ages.js` |
| `while-you-slept.js` | While you slept | `features/slept.js` |
| `fi-ratio-and-coast-card.js` | The FI ratio on Key numbers, and the card "You can stop sprinting" | `features/coast.js` |
| `before-you-sign.js` | Before you sign | `features/sign.js` |
| `famous-money-ideas.js` | Famous money ideas | `features/ideas.js` to `ideas5.js`, `ideasz.js`, `roof.js` |
| `fire-drills.js` | Money fire drills, the ladder, one-way doors, the tour | `features/drills.js` |
| `fork-theory.js` | Fork Theory | `features/fork.js` |
| `how-it-connects.js` | How it all connects | `features/connect.js` |
| `later-eras-and-account-line.js` | The later eras and the account line | `features/eras.js` |
| `meet-your-character.js` | Meet your character | `features/reveal.js` |
| `mission-board.js` | The mission board | `features/missions.js` |
| `money-and-values.js` | Is my money going where I want? | `features/values.js` |
| `money-chart-group.js` | The Money Chart for more than two | `features/together.js` |
| `money-log-and-give-a-game.js` | The money log, and "give a person their game" | `features/moneylog.js` |
| `multipliers-board.js` | The multipliers board | `features/mult.js` |
| `next-steps-one-list.js` | One list on Next Steps | `features/fold.js` |
| `our-household.js` | Our household | `features/house.js` |
| `one-question-at-a-time.js` | Make your numbers real, one question on each screen | `features/ask.js` |
| `one-question-debts-and-key-numbers.js` | The same pattern for debts, Key numbers, the match and the tax accounts | `features/ask2.js` |
| `questlog.js` | Where am I (the Quest Log), with a walk for three players | `features/questlog.js` |
| `countdowns.js` | Countdowns on My Goals: any goal, a down payment, a quit fund, a wedding | `features/countdown.js` |
| `two-job-offers.js` | Two job offers side by side | `features/offers.js` |
| `which-account-next.js` | Which account next, up to each limit | `features/nextacct.js` |
| `quick-math.js` | Quick math | `features/quick.js` |
| `recalculating.js` | Recalculating: the kept plan and the new date, the short month, the cushion refill, the safe-to-fail line, the letter exercise, the optional Mistake audit | `core/recalc.js`, `features/recalc.js`, `features/exletter.js`, `features/audit.js` |
| `save-status.js` | The save status | `account/cloud.js` |
| `sharing-costs-fairly.js` | Sharing costs fairly | `features/fair.js` |
| `sheet-navigation.js` | Back, Forward, Close and "i" on each sheet | `screens/nav.js` |
| `side-by-side.js` | Side by side, and the fee screen | `features/compare.js` |
| `spending-plan-and-audit-score.js` | The Conscious Spending Plan and the money audit score | `features/csp.js` |
| `stars.js` | The Galaxy: star states, lanes from real links, gateway stars, Do this | `features/stars.js` |
| `stress-testing.js` | The stress test: real history and random markets as one result (one check waits for the engine) | `features/stress.js` |
| `student-loan-plans.js` | Student loan plans | `features/study.js` |
| `usability-repairs.js` | The repairs from the usability audit | `screens/tidy.js` |
| `welcome-back-card.js` | The welcome-back card | `features/back.js` |
| `what-depends-on-what.js` | What depends on what | `features/dep.js` |
| `what-each-debt-costs.js` | What each debt costs you | `features/owed.js` |
| `what-you-already-know.js` | What you already know (D.A.I.T.E.) | `features/know.js` |
| `whats-built.js` | The list "What's built" | `features/built.js` |
| `which-lever-matters-most.js` | Which lever matters most | `features/lever.js` |
| `working-for-yourself.js` | Working for yourself | `features/gig.js` |
| `your-people.js` | Your people | `features/people.js` |

These scripts have no test file of their own: `core/engine.js`, `core/engine2.js`, `core/metrics.js`, `account/supa.js`, `account/gate.js`, `screens/ui.js`, `screens/ux.js`, `screens/planner.js`, `screens/smart.js`, `screens/profiles.js`, `features/games.js`, `features/games2.js`, `features/year.js`, `features/chart.js`, `features/debts.js`, `features/import.js`, `features/house.js`, `features/home.js`, `features/testkit.js`. The test files of other features use many of their functions, but no file examines them directly. `KNOWN-WEAK.md`, section B, lists the weak points of the tests.

## Rules for a new test file

- Make one file for each feature. Give the file the name of the feature, in small letters, with hyphens between the words.
- Do not end a name with `.test.js`, `-test.js` or `_test.js`. Do not start a name with `test-`. The command `node --test` at the top of the repository runs the tests of the main app, and it would run a file with such a name.
- Start the file with the header: PURPOSE, INPUT, OUTPUT, DEPENDS ON.
- Put the code in one block (`{ ... }`), so that its names do not stay in the global scope.
- At the end, put the game state back: `G.chars.length`, `G.active`, `G.demo`.
- Format the file with Prettier.

## Known failures

`known-failures.json` lists each failure that is known, with the reason. The runner shows these failures on each run, and they do not make the run fail. A new failure makes the run fail.

On 2026-11-22 the list is empty: all checks pass. Add a failure to the list only when it cannot be repaired now, and write the reason. The format of one entry is:

```
"mission-board.js": { "count": 1, "why": "one sentence with the reason" }
```

## Private tests

The add-on source is not in this repository. Thus the tests of the add-on content are not here.

- `addon-sealed-files.js` has two parts. Part 1 runs in each copy: a sealed file shows no readable word and opens to nothing with a made-up key, no file that a new account loads names a sealed file, the database rules (read as text) give a key only to an account with permission or to the admin, and a new account with a stand-in database gets no add-on in the menu, the glossary, the themes or the built list. Part 2 needs the private folder with the add-on source (the environment variable `SLAM_PACKS_DIR` gives its path). With no such folder, part 2 prints `SKIP`.
- To load the add-ons for the other tests, set the environment variable `SLAM_PACKS_BOOT` (see the header of `harness.cjs`).
| `character-reveal-and-element.js` | The character reveal after setup: strengths, weak spots, the money element, two questions | `features/element.js` |
| `gear-slots.js` | The states of a gear slot: want, need, not interested, can't have, inactive | `core/engine2.js`, `features/games.js` |
| `product-xray.js` | The product X-ray: the path you are on next to the alternative | `features/xray.js` |
| `life-transitions.js` | Break in case of emergency: a layoff as a number, tripwires, family help, quick income, slots | `features/transit.js` |
| `kids-mode.js` | Kids mode: a kid profile, 20 lessons, the run that forgives one missed day | `features/kids.js`, `data/kidlessons.js` |
| `spreadsheet-round-trip.js` | The spreadsheet comes back in: one list of fields for the export and the import | `features/book.js` |
| `math-audit-core-numbers.js` | The math audit: the FI number, Coast FI, debt payoff and runway, each worked out a second way | `core/engine.js`, `features/debts.js`, `features/drills.js` |
| `strategy-engine.js` | The Strategy Engine ("Moves to try"): the template, the loop of each strategy, the house hack and the balance transfer by hand, the ranking | `features/strat.js`, `data/strategies.js`, `data/metros.js` |
| `coach-demo-and-results.js` | The coach page: the demo with made-up clients, milestones and days to a first win, before and after, the pipeline, search and sort | `account/coachplus.js` |
| `roles-coach-admin.js` | The hats (Player, Coach, Admin), the coach page, the admin sections, the sign-up line, and the database file read as text | `account/roles.js`, `account/coachpage.js`, `account/adminmore.js`, `coach.html`, `admin.html` |
| `trust-and-privacy.js` | Trust: the one line, the privacy page and its links, calm words for each answer of the sign-in service (a stand-in), the switch EMAIL_READY, how sharing starts for a public link and for an invite, Delete my account (a stand-in database), and the database file read as text | `account/trust.js`, `account/supa.js`, `account/coachpage.js`, `privacy.html` |
| `sync-no-change-lost.js` | The sync of two devices and a coach: a stamp for each person, the later copy wins, no open task is lost, a failed save is sent again | `account/cloud.js`, `account/coachpage.js` |
