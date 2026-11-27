# Audit of the field registry (flag only, nothing was fixed)

Audited commit of `main`: `bfe3db3e125ff2e5670b9db15eb000a5da86702a` (2026-11-27). The onboarding lane was still changing files after this commit.
This run changed no game file. It added the files in `game/registry/` only.

How it was made: the game's own lists were read as the game loads them (the test harness, `game/tests/harness.cjs`), the five tabs
were drawn for one sample player, and the source was scanned for questions, typed inputs, tiles and "i" texts. The helper scripts are
not in the repository. The four big data files (`skills.js`, `skillthemes.js`, `quizskins.js`, `cards2026.js`) were not opened.

Counts: 249 facts, 712 fields, 122 screens. 535 fields are marked `"confidence": "low"`.

## The 5 biggest problems

1. **The same thing is asked in several places, in different words, and sometimes kept in different places.** The share of pay that
   goes to taxes has four wordings (`setup.taxQ`, `knask.tax`, `askkn.tax`, `life.taxwhen`). The number of kids is kept twice: `setup.kid_count`
   writes `c.kidCount` and `life.kids` writes `c.x.kids`. Who you combine money with is kept twice: `c.share` (`setup.share`) and
   `G.house.share` (Profiles, More options). The credit score has three homes (`c.x.vault.score`, `c.caught.score`, the answer of Moves to try).
2. **Setup can be answered with "I don't know".** Four questions offer it: `setup.taxQ`, `setup.matchQ`, `setup.taxAcctQ` and
   `setup.debt_rate`. Moves to try adds "I don't know it" (`stg.score`). `STATUS.md` still says setup has no such question.
3. **Two setup pages come before the answer that orders their choices.** "Where your money lives" (page 5 of 14) is ordered by the kind
   of work, and work is asked on page 8. "What you owe" (page 3) is ordered by where you live, and home is asked on page 11. And
   `SM_DEP` still names `payFreq`, a question that setup no longer asks (see Dangling ids).
4. **Most questions and numbers have no "i".** 640 of 703 live fields have no "i" text of their own. The opening and all of setup have a
   help line under the question but no "i". (Each sheet has one "i" for the whole screen: 159 screens have it.)
5. **Words mean different things in different places.** "Home" is a tab, a button, a setup page, a spending group and a kind of goal.
   "Demo" has four meanings. The code still calls Next Steps "Plan" and The big picture "Skills". The glossary says "Freedom number"
   where the opening says "FI number". See Term conflicts, and `GLOSSARY.md`.

Close behind: an old bottom bar and nine old setup questions are still in the code but never shown (status `dead`); the four
always-on top numbers (`home.stat.free_to_spend` and its three neighbors) exist but a placed player does not see them, because the Results cards
take their place; Kids mode is open to every player, not behind an add-on switch.

## Duplicates: the same fact asked in more than one place

Checked by hand:

| Fact | Asked by | Note |
|------|----------|------|
| Age | `open.age`, `setup.age_decade` + `setup.age_exact`, the demo page `game/era/index.html` | Three sets of chips: 5-year ranges, decades then single years, and the demo's own. The age of the opening is kept when setup opens. |
| Taxes off the top | `setup.taxQ`, `knask.tax`, `askkn.tax`, `life.taxwhen` | Different words and different choices (6 chips to 30% in setup, 7 chips to 40% in Key numbers). All write `c.x.taxPct`. |
| Job match | `setup.matchQ`, `asksh.match`, "Does your job do that?" (`game/screens/ui.js:1887`), `knask.matchAmt` | Yes / no in three places; the amount in a fourth. |
| Tax-friendly accounts | `setup.taxAcctQ`, "How full are yours each year?" (`game/screens/ui.js:1894`) | Same store (`c.tax`). |
| Social Security | `setup.ssq`, `life.ss`, `open.way_ss` | Three sets of words: "Yes, at three quarters, to be careful / Yes, in full / No, leave it out", the list of Make it exact, and the three presets of the opening. |
| Kids | `setup.kid_count` (`c.kidCount`), `life.kids` (`c.x.kids`), `setup.deps` ("Kids"), `setup.live` ("Kids") | Two counts in two places, plus two yes / no chips. |
| Who you combine money with | `setup.share`, Profiles "Who you combine money with" (`game/screens/profiles.js:75`, `game/screens/ui.js:2551`) | `c.share` for one person, `G.house.share` for the game. |
| Where you live | `setup.homeQ` (I rent / I own / No cost), `stg.home` (I rent / I own / With family) | The second is asked only when setup has no answer. The third choice has two names. |
| Debt rate | `setup.debt_rate`, "What rate does it charge a year?" (`game/screens/ui.js:2625`, `game/features/debts.js:220`), `askdb.apr` | Four wordings: "interest rate (APR)", "rate does it charge a year", "yearly rate". |
| How often money comes in | `setup.income_freq`, the income row editor (`game/screens/smart.js:397`) | The row editor has "Daily". Setup has "Paid by the shift or gig" and no "Daily". |
| Spending and invested | `open.spend`, `open.inv`, then `setup.spend_groups`, `setup.acct_each`, then `ask.spend`, `ask.inv` | By design (a range first, then line by line), but the player is asked three times. |
| Do you invest | `open.save` sets `c.invest`, then `setup.invest` asks it | The opening already answered it. |
| Pension, mortgage payment, years left | `life.pension`, `life.homepmt`, `life.homeyrs`, and `open.way_later` | Same store; the opening asks them again when empty. |
| Card limits | `knask.limit` (all cards together), "What is this card's limit?" (`game/features/debts.js:236`) | A total and a per-card number. |
| Credit score | `stg.score`, the card vault | Three stores (see problem 1). |
| Monthly debt payments | `knask.debtPay`, `askkn.debtPay`, "What do you pay on it each month?" (`game/features/debts.js:227`) | A total and a per-debt number. |
| Car payment, giving | `knask.carPay`, `knask.give` and the spending line "Car payment", the Giving screen | cant_tell if they are joined. |

Found by the scan (the same label on more than one question; not checked by hand):

- "Choose a file": `book.input.choose_a_file`, `games2.input.choose_a_file`, `import.input.choose_a_file`
- "How old are you?": `open.age`, `setup.age_decade`
- "How many kids?": `setup.kid_count`, `life.kids`
- "How often does it come in?": `setup.income_freq`, `smart.how_often_does_it_come_in`
- "Who you combine money with": `profiles.who_you_combine_money_with`, `ui.who_you_combine_money_with`
- "What rate does it charge a year?": `ui.what_rate_does_it_charge_a_year`, `debts.what_rate_does_it_charge_a_year`
- "How much of your money is in stocks?": `odds.odds.stock`, `ways.odds.stock`

## Orphans

A text scan cannot follow every write (see `evidence_note` in facts.json). Read these as places to look, not as proof.

Written but never read (the scan found a write and no read):

- `benefit_limit_sure` (`c.x.limitSure`), written in core/engine.js

Also: `c.tpa` is written once in `screens/ui.js` and read nowhere (not in facts.json).

Read but never written by a question (a default of `newChar()` that no field asks for and no shared action sets):

- `same_page` (`c.samePage`): 2 reads in 1 files
- `chapter` (`c.chapter`): 2 reads in 1 files
- `legacy` (`c.legacy`): 1 reads in 1 files
- `compost` (`c.compost`): 6 reads in 1 files
- `cross7` (`c.cross7`): 5 reads in 1 files
- `goal_share` (`c.goalShare`): 6 reads in 2 files

Feature stores that are read but where the scan found no write (most are written through a helper; low confidence):

- `x_cal` (`c.x.cal`)
- `x_coast` (`c.x.coast`)
- `x_later` (`c.x.later`)
- `x_rng` (`c.x.rng`)
- `x_rolled` (`c.x.rolled`)
- `x_stress` (`c.x.stress`)
- `x_subs` (`c.x.subs`)
- `x_takeout` (`c.x.takeout`)

Facts with no field in fields.json that asks or shows them: 49 of 249. Most are game state (streaks, badges, history), not answers.

Old code that is never shown (status `dead`):

- `dead.setup_v1.work` "What's your work right now?" (`game/screens/ui.js:1598`)
- `dead.setup_v1.incKinds` "Where does your money come from? Tap all that fit" (`game/screens/ui.js:1607`)
- `dead.setup_v1.payFreq` "How often does money come in?" (`game/screens/ui.js:1608`)
- `dead.setup_v1.steady` "Is it about the same each time?" (`game/screens/ui.js:1612`)
- `dead.setup_v1.homeQ` "Where do you live?" (`game/screens/ui.js:1618`)
- `dead.setup_v1.live` "Who lives there with you? Tap all that fit" (`game/screens/ui.js:1619`)
- `dead.setup_v1.rel` "Relationship" (`game/screens/ui.js:1628`)
- `dead.setup_v1.deps` "Does anyone rely on you for money?" (`game/screens/ui.js:1632`)
- `dead.setup_v1.share` "Do you combine money with anyone?" (`game/screens/ui.js:1637`)
- `bar.bottom_old` Old bottom bar (Home, Plan, + Log, Money, Skills) (`game/screens/planner.js:1000`)

## Order breaks: shown before something they depend on

- `setup.accts` (page 5 of 14) is ordered and faded by the kind of work (`SM_DEP.work` lists `accts`), and `setup.work` is on page 8.
- `setup.debt_kinds` (page 3) is ordered by where you live (`SM_DEP.homeQ` lists `debtKinds`), and `setup.homeQ` is on page 11.
- `setup.steady` depends on `payFreq` in `SM_DEP`, and setup no longer has that question (each source gets its own rhythm on page 9).
- `setup.taxQ` asks for the share of pay that goes to taxes one page after the player gave take-home amounts (`setup.income_amt`). The order works, but the amounts are "after taxes" before the game knows the tax share.
- `setup.invest` is asked after `open.save` already set it.
- Key numbers tiles (5 of 38 for a new profile) show before their question is answered. This is by design: the tile says "Tap to unlock" and "Needs one answer", never a 0.
- `home.your_numbers` and the reveal show typical values before the player gave their own. By design: greyed, tagged "typical".
- Not checked: the order inside the roughly 100 tool screens of the menu.

## Missing "i": fields with a null why

Live fields with no "i" text, by place (of all live fields there):

- Menu: 356 of 397
- My Money: 100 of 120
- Home: 50 of 51
- Setup: 35 of 35
- Opening: 17 of 18
- Admin page: 17 of 17
- Me: 15 of 15
- Next Steps: 13 of 13
- Every tab: 11 of 11
- Live Session: 10 of 10
- Coach page: 9 of 9
- My Goals: 4 of 4
- Sign-in: 3 of 3

What exists: 585 words in the game's glossary, 159 screens with a screen-level "i" (`NV_INFO`), and 209 "i" buttons in the source of 47 files.
Fields with an "i" or a "why the game asks" line: 63. The full list of the others is every entry of fields.json with `"why": null` (the viewer has a filter for it).

Places with no "i" at all on the question: the four questions of the opening, every question of the rest of setup (each has a help
line under it), the list Make it exact (`life.*`), the admin page and the coach page.

## Typing: places that make the player type

55 fields are a text box, a number box or a slider. "I know it" boxes are optional: a range chip does the same job.

| Field | Label | Where | Source |
|-------|-------|-------|--------|
| `open.wants_own` | Add my own | Opening › What it is / What it could be | `game/features/goalrank.js:118` |
| `setup.name` | A name for your character | Setup › Round E: Expenses | `game/screens/smart.js:517` |
| `money.rows.cashes` | Cash | My Money › Cash | `game/screens/ui.js:2591` |
| `money.rows.invs` | Investments | My Money › Investments | `game/screens/ui.js:2591` |
| `money.rows.debts` | What you owe | My Money › What you owe | `game/screens/ui.js:2591` |
| `money.rows.incs` | Money coming in each month | My Money › Money coming in each month | `game/screens/ui.js:2591` |
| `money.rows.spends` | Money going out each month | My Money › Money going out each month | `game/screens/ui.js:2591` |
| `admin.card_library_add_a_card` | Card library: Add a card | Admin page › Card library | `game/account/cardadmin.js:171` |
| `coach.a_note_from_this_session` | A note from this session | Coach page › Roster | `game/account/coachpage.js:366` |
| `coach.their_email_address` | Their email address | Coach page › Roster | `game/account/coachpage.js:409` |
| `coach.find_a_client_by_name` | Find a client by name | Coach page › Search, sort and pipeline | `game/account/coachplus.js:387` |
| `account.email` | Email | Sign-in › Create your account / Sign in | `game/account/supa.js:370` |
| `account.password` | Password (at least 6 letters or numbers) | Sign-in › Create your account / Sign in | `game/account/supa.js:371` |
| `kids.add` | Kids mode: add a kid | Menu › People and home | `game/features/kids.js:72` |
| `dash.input.done_in` | Done in | My Money › What you owe | `game/screens/dash.js:449` |
| `dash.input.extra_each_month` | Extra each month | My Money › What you owe | `game/screens/dash.js:452` |
| `planner.input.mnfind` | Find a tool | Menu › Search | `game/screens/planner.js:944` |
| `ui.input.note` | Anything to add? (optional) | Home › Check in | `game/screens/ui.js:2066` |
| `ui.input.exp` | Your game as text | Menu › Settings and account | `game/screens/ui.js:2570` |
| `ui.input.imp` | Paste the copied text here | Menu › Settings and account | `game/screens/ui.js:2570` |
| `ui.input.gn` | Give it a name | My Goals › Add a goal | `game/screens/ui.js:5592` |
| `book.input.choose_a_file` | Choose a file | Menu › My money | `game/features/book.js:470` |
| `book.input.bookpaste` | Or paste the rows here | Menu › My money | `game/features/book.js:474` |
| `exercises.input.exstext` | cant_tell (label is built in code: ${esc(E.title)}: your words) | Menu › Tools and calculators | `game/features/exercises.js:55` |
| `exletter.input.exlown` | Your own words | Menu › My money | `game/features/exletter.js:69` |
| `games.input.pyn` | Name (optional) | Home › Your people | `game/features/games.js:159` |
| `games2.input.choose_a_file` | Choose a file | Home › Games | `game/features/games2.js:879` |
| `gig.input.gxinvn` | Who it is for | Menu › Tools and calculators | `game/features/gig.js:680` |
| `guild.input.gdname` | The guild's name | Menu › People and home | `game/features/guild.js:167` |
| `hhold.input.hxpastebox` | Paste their code | Menu › Tools and calculators | `game/features/hhold.js:395` |
| `hhold.input.hxtobox` | cant_tell (label is built in code: ${esc(to)}'s email (you can also add it in your mail app)) | Menu › Tools and calculators | `game/features/hhold.js:580` |
| `import.input.choose_a_file` | Choose a file | My Money › Money going out each month | `game/features/import.js:216` |
| `joy.input.jyown` | Your own | Menu › Tools and calculators | `game/features/joy.js:274` |
| `life.input.pfnum` | The number you see | Menu › Games and quizzes | `game/features/life.js:255` |
| `moneylog.input.the_code` | The code | Menu › People and home | `game/features/moneylog.js:160` |
| `moneylog.input.imp` | Paste the code | Menu › People and home | `game/features/moneylog.js:178` |
| `mycards.input.cdnick` | Or type a short name | My Money › What you owe | `game/features/mycards.js:488` |
| `mycards.input.rownick` | A short name | My Money › Row editor | `game/features/mycards.js:580` |
| `thinkaloud.input.ta_note` | What are you thinking? (optional) | Menu › Admin | `game/features/thinkaloud.js:163` |
| `values.input.vlown` | Add your own | Menu › My money | `game/features/values.js:213` |
| `ways.input.cmprate` | The share in year one, in percent | Menu › Plans and what-ifs | `game/features/ways.js:334` |
| `ways.input.cmpratetyped` | Type the share, in percent | Menu › Plans and what-ifs | `game/features/ways.js:338` |
| `cardadmin.input.id_2` | cant_tell (label is built in code: ${esc(label)}) | Admin page › Card library | `game/account/cardadmin.js:159` |
| `liveai.input.laifile` | Drop in your recording's text file | Live Session › After the call | `game/account/liveai.js:478` |
| `liveai.input.lai_k` | cant_tell (label is built in code: ${label}) | Live Session › After the call | `game/account/liveai.js:509` |
| `livecoach.input.lcn` | Their first name (optional) | Coach page › Live Session card | `game/account/livecoach.js:119` |
| `livecoach.input.lcme` | Your name, as your client sees it | Coach page › Live Session card | `game/account/livecoach.js:119` |
| `livereview.input.rvin_id` | cant_tell (label is built in code: Type the number${ch.per ? ", " + ch.per : ch.kind === "rate" ? ", in p) | Live Session › Review | `game/account/livereview.js:374` |
| `livereview.input.rvin_id_2` | The limit | Live Session › Review | `game/account/livereview.js:394` |
| `liveroom.input.lre` | Email | Live Session › Session page: invite and sign-up | `game/account/liveroom.js:71` |
| `liveroom.input.lrp` | Password | Live Session › Session page: invite and sign-up | `game/account/liveroom.js:72` |
| `liveroom.input.lrn` | Your first name | Live Session › Session page: invite and sign-up | `game/account/liveroom.js:78` |
| `liveroom.input.lre_2` | Email | Live Session › Session page: invite and sign-up | `game/account/liveroom.js:79` |
| `liveroom.input.lrp_2` | Password | Live Session › Session page: invite and sign-up | `game/account/liveroom.js:80` |
| `supa.input.supw` | New password | Sign-in › Set a new password | `game/account/supa.js:453` |

Where taps could work:

- `account.email`, `account.password`: the only typing a new player must do. A sign-in link by email or a passkey would be taps (App lock already has passkeys).
- `ui.input.gn` "Give it a name" and `open.wants_own` "Add my own": a goal name. The kinds of goal are already chips.
- `ways.input.cmpratetyped` "Type the share, in percent": next to a slider for the same number.
- `life.input.pfnum` "The number you see" (a proof of a done step): could be a range chip.
- `gig.input.gxinvn` "Who it is for", `guild.input.gdname` "The guild's name", `mycards.input.cdnick` and `mycards.input.rownick` (short names): free text by nature, optional.
- The setup boxes "The amount, in dollars" and "The rate, in %" (`game/features/amounts.js:761`) and "Your age" / "The amount, in dollars" (`game/features/couldbe.js:1016`) use the phone keyboard. The plan screens use a keypad on screen (`kitAsk`, "Type the exact number"). Two ways to enter an exact number.
- Sliders: `dash.input.done_in`, `dash.input.extra_each_month`, `ways.input.cmprate`. `DESIGN.md` allows a slider only for a what-if.
- Writing by design, left alone: Money exercises, the letter, think-aloud notes, coach notes, the backup text, the admin's card form.

## Term conflicts: one word, more than one meaning

| Word | Meanings found | Where |
|------|----------------|-------|
| Home | (1) the first tab; (2) the Home button on every screen; (3) the setup page "Your home" and the answer `c.home`; (4) the spending group "Home"; (5) a kind of goal "Home"; (6) "Rearrange Home"; (7) "put the game on the home screen" | `screens/ux.js` UX_TABS, `features/results.js` topbarHome, `screens/ui.js` SETUP, `core/engine.js` SPEND_K and GOAL_K, `features/home.js` |
| Plan | (1) the old name of the tab Next Steps (`TAB_N.plan = "Plan"`, action `plan`); (2) "My plan on one page"; (3) "Your first plan" at the end of setup; (4) the debt plan; (5) "Plan it" (give a task a day); (6) the Conscious Spending Plan; (7) "Retirement plan at work"; (8) the spreadsheet of the plan | `screens/planner.js`, `features/plan.js`, `features/spiral.js`, `features/debts.js`, `features/csp.js`, `features/book.js` |
| Step | (1) a step of an era on "Your path"; (2) Next Steps (the tab, a list of tasks); (3) a page of setup ("page 3 of 14"); (4) a screen of the opening (`CB_STEPS`), where five of them are called "Way 1 of 5"; (5) the 7 steps of "My plan on one page"; (6) the nine steps of Your Money or Your Life; (7) the Baby Steps | `core/engine.js`, `screens/planner.js`, `screens/ui.js`, `features/couldbe.js`, `features/plan.js`, `features/canon.js` |
| Dashboard | (1) the action `dash` is "Rearrange Home" and `DASH` is the list of Home cards; (2) "My Money as a dashboard" (the four tiles and the big three); (3) "the dashboard look" of `DESIGN.md`. The word is not on any screen. | `screens/ui.js` DASH, `features/tally.js`, `screens/dash.js` |
| Level | Eli: the era is the only level. In the game: (1) "Level 1" of an area ("Debt 4 of 12, Level 1"); (2) "Level N" bands in the skill list; (3) "Fill in Level 2" (more detail on My Money); (4) "Layer 1 to 4" of the data games; (5) "How far to freedom", the glossary key `level` | `core/engine.js` areaLevel, `screens/ui.js`, `core/engine2.js` |
| Era, stage, chapter, status, round, layer | Six words for "where you are": 10 eras; "which money stage you are in" (the "i" of Find your era); a life chapter (`c.chapter`); 6 FIRE statuses; 5 setup rounds (D, A, I, T, E); 4 layers of data games, and "layers" again for what pays each year in the opening chart | `core/engine.js` ERAS, `core/statuses.js`, `features/spiral.js`, `core/engine2.js`, `core/paylayers.js` |
| Quest | (1) "Where am I" has the action `quest` and is called the Quest Log; (2) Quest mode (the character sheet); (3) Health and insurance quests; (4) the coach can "assign a quest" into Next Steps; (5) Eli's "recurring quests" are "Schedules" (`c.routines`) in the game | `features/questlog.js`, `features/quest.js`, `features/careq.js`, `account/coachpage.js`, `screens/ui.js` |
| Freedom number, FI number, What it is | One number, three names. Glossary and Key numbers: "Freedom number", "Freedom date", "Years to freedom". The opening: "Your FI number", "What it is". Home: "FI progress". | `screens/ui.js` GLOSS.fi, `core/metrics.js`, `features/couldbe.js`, `features/results.js` |
| Net worth, Own minus owe | The same number. Glossary key `ownowe` says "Some call it net worth"; tiles say "Net worth" with "own minus owe" under it. Two more glossary entries define "Net worth" with other words (`bl_networth`, `lg_networth`). | `screens/ui.js`, `features/look.js` |
| Free to spend | (1) a week, on the old Home box; (2) this month, on the stat row; (3) the glossary: what is left after bills and goals; (4) "Safe to spend?" is the question about one purchase. Two glossary entries (`free`, `bl_free`). | `screens/ux.js` homeQuad, `features/look.js`, `screens/ui.js` |
| Cushion, runway, emergency fund, Big E fund | "Runway" (glossary), "Months of cushion" (Home), "Cushion" and "Big E fund" (Key numbers), "Cash cushion" (two entries, one about retirement), "The small cushion" and "The full cushion", "emergency fund" in the tips | `screens/ui.js`, `core/metrics.js`, `features/windfall.js` |
| Demo | (1) `G.demo`: the sample characters before a real game; (2) "Demo mode" (`G.plain`): the standard look with no add-ons; (3) the coach page's demo with made-up clients; (4) the 60-second demo Find your era | `screens/ui.js`, `account/gate.js`, `account/coachplus.js`, `era/` |
| Coach | (1) the role and the coach page; (2) "People I coach" mode inside one game (`G.coach`); (3) the constant `COACH`: one hint line for each tab; (4) "your coach" in sharing | `account/roles.js`, `screens/profiles.js`, `screens/ux.js` |
| Add-on, pack, extra | The same thing. The game says "Add-on"; the admin page and the database say "pack"; comments say "extra". | `account/addon.js`, `admin.html` |
| Person, profile, character, player, account | "Add a person", "Profiles", "Name your character", "Player" hat, "account". One account holds many people. | `screens/profiles.js`, `screens/ui.js`, `account/roles.js` |
| Move | (1) a logged money move (`c.moves`); (2) "Moves to try" (bigger strategies); (3) "Try a move" in What if; (4) "your first move" on the last screen of the opening | `core/engine.js`, `features/strat.js`, `screens/ui.js`, `features/cbreveal.js` |
| Round | (1) the five setup rounds; (2) the "Payday round" of Check in | `features/spiral.js`, `screens/ui.js` |
| Check in | (1) the sub-tab under Home ("Home › Check in": daily check, payday round, monthly session); (2) "the paycheck check-in"; (3) the Same question choice "without checking in first" | `screens/ux.js`, `screens/planner.js`, `core/hhold.js` |
| Skills, The big picture, life map, Galaxy | The old tab "Skills" (`TAB_N.map`) is now "Next Steps › The big picture", which shows "Your life map" and links to "Galaxy" | `screens/planner.js`, `screens/ux.js`, `features/lifemap.js`, `features/stars.js` |
| Path | "Your path" (the steps card), "Two paths" (two plans), "A typical path" (a rival), "path packs" (Quest mode), and the web app's own-path pages | `screens/ui.js`, `features/paths.js`, `features/quest.js` |
| Guess, typical, rough | "Guess" is a certainty level. "typical" tags a guess from sourced data. "Rough numbers" is a switch that shows ranges. Two glossary entries define "Guess, Close, Exact" (`chips`, `gce`). | `features/kit.js`, `features/results.js`, `core/enough.js` |
| Kids | Three yes / no chips and two counts in setup and Make it exact, and "Kids mode" (lessons for a kid, no money) | `screens/smart.js`, `features/kids.js` |
| Sheet | In the code a "sheet" is a screen that opens over a tab. On screen, "sheet" is a spreadsheet ("Export to a sheet"). | `screens/ui.js`, `account/coachpage.js` |

The game's glossary also has 31 words that are defined more than once under different keys. `GLOSSARY.md` lists them.

## Other things seen (not fixed)

- `SM_DEP` names `payFreq`, which is not a setup question any more (`game/screens/smart.js:152`).
- Kids mode (`features/kids.js`) is a menu row for every player. The request log treats it as an add-on.
- The four top numbers of R-009 are in `homeStatRow` (`game/features/look.js:329`), and `homeQuadTop` shows it only when the Results cards are not shown.
- "Share with my coach" starts off for a new account, on only through a coach's invite link (`game/account/supa.js:57`). R-020 asks for on by default.
- The sign-in screen still says "Create my account" and "I'm new. Create an account" (`game/account/supa.js:372`), which R-022 asks to replace.
- The token `--bad` is pink (`#ff7aa5`) at `game/index.html:18` and is set to amber further down (`game/index.html:289`). The first value is never seen, but it is still in the file.
- `--muted` is a pale blue (`#8fa3e6`). R-029 asks for no light blue and no grey.
- One function with no reason given is still in the code map: `stgCredit` (`CODE-MAP.md`, section 3).

## Dangling ids

Every id in asked_by, used_by, facts, depends_on and feeds_into was checked against the three lists. Not found:

- `setup.steady . depends_on -> setup.payFreq` (left in on purpose: the code names a question that does not exist)

## What this audit did not cover

- **Buttons and chips drawn by a feature's own code.** A scan found about 400 groups of tap controls (a chip, a segment or a row with an action) in the source. Fields.json has the ones that go through `q()`, `kitAsk()` or a named list. The others are not listed one by one. The biggest gaps: `screens/ui.js` (65 groups), `screens/planner.js` (14), `features/quest.js`, `features/couldbe.js`, `features/year.js`, `features/hhold.js`, `features/strat.js`, `features/gig.js`.
- **The yearly stage.** The Yearly Review (`features/year.js`) is a screen in the list, but its questions are not listed.
- **The two add-ons.** Sealed. Nothing inside them can be listed here.
- **Quizzes and the Money Chart.** Their questions are in a big data file that was not opened.
- **The 20 kid lessons, the 625 skills, the 93 cards.** Data, not fields.
- **The web app** (the pages at the top of the repository). This registry is the game only.
- **A real browser.** Nothing was clicked in a browser. The tabs were drawn in Node for one sample player, so a card that shows only for another kind of player may be missing.
- **The viewer page on the live site.** GitHub Pages turns `REQUESTS.md` into a web page. The viewer reads that page when the plain file is not there. This was not tried on the live site.
