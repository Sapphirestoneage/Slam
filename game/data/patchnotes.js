/* ============================================================================
   SLAM the Game: data/patchnotes.js
   PURPOSE     The patch notes: what changed, in plain words, for the person who plays. The game shows
               them in the Menu as "What's new" (features/founding.js), the newest first. The web app
               shows the same list in its More menu (js/ui/whatsnew-ui.js).
   INPUT       None. Data only.
   OUTPUT      PATCH_NOTES: a list of entries. d is the date (YYYY-MM-DD). t is the title. l is a few
               short lines.
   DEPENDS ON  Nothing.
   RULES       Each run adds ONE entry at the END of the list, from its summary (CONTRIBUTING.md). The
               screen sorts by date, and for one date it shows the later entry first.
               Write from the side of the person: what they can do now, and where it is. No file names,
               no jargon. Never "bug", "broken" or "failed" about the person. "Fixed" for the app is
               fine. No money numbers of a real person. No em dashes.
   ========================================================================= */
const PATCH_NOTES = [
  {
    d: "2026-11-23",
    t: "The Galaxy",
    l: [
      "Every skill in the game is now a star on one map. It starts in the middle and spirals outward as you learn.",
      "Tap a star to see what it teaches and what it opens next.",
      "Where am I, in the Menu, shows where you left off and every place you can go.",
    ],
  },
  {
    d: "2026-11-23",
    t: "Ten more tools",
    l: [
      "Taking money out, and the two ages that matter for it.",
      "A stress test for your plan, life event blocks, and what to do with a windfall.",
      "Countdowns on My Goals, two job offers side by side, and which account gets your next dollar.",
      "A ledger with three statements, and the card vault.",
    ],
  },
  {
    d: "2026-11-24",
    t: "The card vault and a card library that grows",
    l: [
      "The card vault looks at your spending by category and shows what each card gives back for it.",
      "It counts the credits of each card, and it asks a few questions about one airline, one hotel brand or one store.",
      "The library has 93 cards now, and new ones can be added without waiting for an update.",
    ],
  },
  {
    d: "2026-11-24",
    t: "Your character, Kids mode and Next Steps",
    l: [
      "After setup you meet your character: strengths, weak spots and your money element, in plain numbers.",
      "Next Steps opens on Today and This week.",
      "Kids mode: a separate profile for a kid, with 20 short daily lessons.",
      "A plan spreadsheet you edit can come back into the game.",
    ],
  },
  {
    d: "2026-11-25",
    t: "A page for coaches, and safer saving",
    l: [
      "If you work with a coach, they now have their own page with your shared game, their notes and your results over time.",
      "Sharing with your coach is on when you start. You can turn it off in Menu, then My account.",
      "The game keeps each change when you play on two devices. The later copy wins and nothing open is lost.",
    ],
  },
  {
    d: "2026-11-25",
    t: "FI destinations",
    l: [
      "Five places you can aim for: Lean, Barista, Regular, Chubby and Fat. Each one has its number and its date.",
      "Key numbers has a new one: your FI ratio.",
      "When you reach the point where your money can grow by itself, Home shows the card You can stop sprinting.",
    ],
  },
  {
    d: "2026-11-25",
    t: "Recalculating",
    l: [
      "When real numbers move your plan, the game says Recalculating. It shows the new date and the one next turn.",
      "No blame, and no looking back unless you ask for it.",
      "If you do want to look back, the optional audit in the Menu shows what past choices cost in time. It stays off until you open it.",
    ],
  },
  {
    d: "2026-11-25",
    t: "Coming soon cards",
    l: [
      "A part of the game that is not ready now shows one calm card, Coming soon, with a way back.",
      "The public site only gets a new version after every check passes, so it stays steady while we build.",
    ],
  },
  {
    d: "2026-11-25",
    t: "Founding Testers, your own link, and this page",
    l: [
      "The first 50 people who finish setup become Founding Testers, with a mark on Me and on the character sheet.",
      "Share SLAM, in the Menu, gives you your own link to send to a friend. It carries no money numbers. There are no rewards yet.",
      "What's new, in the Menu, is this page. Each update adds a few lines here.",
    ],
  },
];
/* The web app reads this file as a module (js/ui/whatsnew-ui.js). A module keeps its names to itself, thus
   the list is also put on the global object. */
if (typeof globalThis !== "undefined") globalThis.PATCH_NOTES = PATCH_NOTES;
