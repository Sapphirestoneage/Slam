# Decisions of the overnight build (2026-11-24)

One line each: the call, then the reason.

1. Work that was already built was left alone. Reason: the prompt says to skip it, and `game/features/built.js` plus the code show what is there.
2. Pushed to `main` with no pull request, and to the session branch too. Reason: `CLAUDE.md` says so, and the phone can only open the live site.
3. The Tier 7 tools were built outside the repository and handed over as a zip file. Reason: `CLAUDE.md` forbids add-on words in this public repository, and a push cannot be taken back. One word from the owner moves them in.
4. The US vs Israel calculator is a page of the web app (`aliyah.html`), not a screen of the game. Reason: the roadmap already puts it there (Run 8) with its data file, and the game keeps that subject for an add-on.
5. Extra calendars in the game were not touched. Reason: they come from an add-on that this repository cannot open. The web app's own calendar code already has tests.
6. The three client names of the prompt appear only as first names of invented test personas. Reason: no real client data in the repository.
7. The money element comes from the Money Chart when it is done, then the player's own pick, then a guess from setup taps. Reason: the quiz already has five elements, so no second quiz was added.
8. Strengths and weak spots are an order of five literal numbers, each marked Guess until the numbers are real. Reason: a number is checkable, and the house rule gives no verdict on a guess.
9. Unemployment pay has no typical value in Break in case of emergency. Reason: each state sets its own amount, and a made-up figure would be wrong for most people.
10. Family help counts at 100%, 75% or 50% by how sure it is. Reason: YNAB and Monarch do not count money that is not in hand; counting a share keeps it an asset with a risk. The shares are the game's own rule and the screen says so.
11. A kid profile is not a player and holds no money numbers. Reason: Duolingo-style lessons need a name and a streak only, and a kid must not change household math.
12. The lesson streak forgives one missed day. Reason: "never miss twice" keeps a kid coming back after a gap; a streak that resets punishes.
13. The fire drill for a missed payment has no real dose that misses a payment. Reason: a late mark lasts seven years. The dose is a reminder and a payment by hand.
14. Safe to spend and the money log use one list of amounts ($20 to $1,000, with $200). Reason: one answer for one thing, and the usability walk hit the gap.
15. The spreadsheet comes back as a CSV file or pasted rows, not through a Google sign-in. Reason: no keys in the repository and no new permission to ask a beginner for.
16. The product X-ray never says to cancel. Reason: ending cover or an annuity can cost a surrender charge or leave people uncovered; eMoney shows two paths and leaves the call to the planner.
17. In the card plan, a point is worth its cash value by default; the fine-tune chips for a higher value were left in. Reason: removing a working control is the owner's call (question 4).
