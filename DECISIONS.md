# Decisions of the overnight build (2026-11-24)

One line each: the call, then the reason.

1. Work that was already built was left alone. Reason: the prompt says to skip it, and `game/features/built.js` plus the code show what is there.
2. Pushed to `main` with no pull request, and to the session branch too. Reason: `CLAUDE.md` says so, and the phone can only open the live site.
3. The Tier 7 tools were built outside the repository and handed over as a zip file. Reason: `CLAUDE.md` forbids add-on words in this public repository, and a push cannot be taken back. One word from the owner moves them in.
4. The US vs Israel calculator is a page of the web app (`aliyah.html`), not a screen of the game. Reason: the roadmap already puts it there (Run 8) with its data file, and the game keeps that subject for an add-on.
5. Extra calendars in the game were not touched. Reason: they come from an add-on that this repository cannot open. The web app's own calendar code already has tests.
6. The three client names of the prompt appear only as first names of invented test personas. Reason: no real client data in the repository.
