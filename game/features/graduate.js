/* ============================================================================
   SLAM the Game: features/graduate.js
   PURPOSE     The Graduate page (run CC-1, item 20, Nov 28 2026): the three kinds of professional a
               player may need after the game: a CPA, an estate attorney, a fee-only CFP. One plain
               line for each on when you need one, what to ask, and the names the owner adds.
   INPUT       GRAD_NAMES below (empty until the owner fills it). The open sheet (W.kind): gradpage.
   OUTPUT      Data: GRAD_TYPES, GRAD_NAMES. Views: gradSheet, gradNames. Actions (ACT): gradpage.
               Menu: "Graduate: who to call next".
   DEPENDS ON  screens/ui.js (head, esc, sheet), screens/dash.js (dkCaption, dkCard, dkPill),
               features/kit.js (kitTerms, kitScreen, kitMenu, kitInfo).
   RULES       No name of a real person or firm is in this file until the owner types it in. An empty
               slot shows as a placeholder and says so. No link pays SLAM (privacy.html says there are
               no affiliates), and the page says it. The page names kinds of professional, never one
               provider as the default. No number is worked out here.
   ========================================================================= */
/* THE NAMES. PLACEHOLDER FOR THE OWNER: each list is empty. To add one, put a line in the list of its kind:
   { name: "the person or the firm", place: "the city or Online", link: "https://..." (or "" for none) }.
   Add only people you would send a client to, and never one who pays for the mention. */
const GRAD_NAMES = { cpa: [], estate: [], cfp: [] };
const GRAD_SLOTS = 2; /* the placeholder lines shown for a kind with no name yet */
const GRAD_TYPES = [
  {
    id: "cpa",
    term: "gradcpa",
    n: "A CPA",
    what: "A licensed accountant who prepares tax returns and plans around them.",
    when: "You need one when your taxes stop being simple: your own business, a rental, stock from an employer, a move to a new state, or a letter from the IRS.",
    ask: "Ask: Do you do tax planning during the year, or only the return? What do you charge, and for what?",
  },
  {
    id: "estate",
    term: "gradestate",
    n: "An estate attorney",
    what: "A lawyer who writes wills, trusts and the papers that say who decides for you.",
    when: "You need one when someone depends on you, when you own a home, or when you want to choose who gets what and who decides if you cannot.",
    ask: "Ask: Is this a flat fee? What papers are in it? What do I do after I sign?",
  },
  {
    id: "cfp",
    term: "gradcfp",
    n: "A fee-only CFP",
    what: "A certified financial planner you pay directly, by the hour or by the project, who earns nothing from the products you buy.",
    when: "You need one when a decision is bigger than this game: a large sum of money, stock options, or the plan to stop work.",
    ask: "Ask: Are you fee-only, in writing? Do you act as a fiduciary all the time? What will I pay in dollars a year?",
  },
];
kitTerms({
  gradcpa: [
    "CPA",
    "Certified Public Accountant: an accountant with a state license. Many prepare tax returns and plan around them.",
  ],
  gradestate: [
    "Estate attorney",
    "A lawyer for wills, trusts, powers of attorney and health care papers: who gets what, and who decides for you if you cannot.",
  ],
  gradcfp: [
    "Fee-only CFP",
    "CFP means Certified Financial Planner. Fee-only means you pay the planner directly and the planner earns no commission from a product. Fee-based is a different thing: it can include commissions.",
  ],
});
kitScreen(
  "gradpage",
  "Graduate: who to call next",
  "The three kinds of professional for the questions that are bigger than a game.",
  "One line on when you need each one, and what to ask."
);
/* The names of one kind, or the placeholder lines while the owner has added none. */
function gradNames(id) {
  const L = (GRAD_NAMES[id] || []).filter(x => x && x.name);
  if (!L.length)
    return Array.from(
      { length: GRAD_SLOTS },
      (x, i) =>
        `<div class="row between small gradph" style="gap:8px" data-gradph="${id}"><span class="muted">Name ${i + 1}: to come</span>${dkPill("Placeholder")}</div>`
    ).join("");
  return L.map(
    x =>
      `<div class="small gradname" data-gradname="${id}"><b>${esc(x.name)}</b>${x.place ? ` <span class="muted">${esc(x.place)}</span>` : ""}${x.link ? ` <a href="${esc(x.link)}" target="_blank" rel="noopener">Their site</a>` : ""}</div>`
  ).join("");
}
function gradSheet() {
  const any = GRAD_TYPES.some(T => (GRAD_NAMES[T.id] || []).length);
  return (
    head("Me", "Graduate: who to call next") +
    dkCaption("For the questions that are bigger than a game.") +
    GRAD_TYPES.map(T =>
      dkCard(
        T.n,
        `<div class="stack" style="gap:6px" data-grad="${T.id}"><div class="small">${esc(T.what)}</div><div class="small"><b>When:</b> ${esc(T.when.replace(/^You need one when /, "").replace(/^./, m => m.toUpperCase()))}</div><details class="math"><summary>What to ask, and names</summary><div class="inner stack" style="gap:6px"><div class="small">${esc(T.ask)}</div>${gradNames(T.id)}</div></details></div>`,
        { right: kitInfo(T.term) }
      )
    ).join("") +
    `<div class="tiny muted" data-fid="grad:foot">${any ? "" : "The names are placeholders for now: Eli has not added any yet. "}No one pays to be on this page, and SLAM earns nothing if you call them. This is a list of kinds of help, not advice to hire anyone.</div>` +
    `<button class="primary wide" data-a="close">Done</button>`
  );
}
Object.assign(ACT, {
  gradpage: () => {
    W = { kind: "gradpage" };
    sheet(gradSheet);
  },
});
kitMenu(
  "Graduate: who to call next",
  "gradpage",
  "A CPA, an estate attorney, a fee-only CFP: when you need each one",
  "cj"
);
