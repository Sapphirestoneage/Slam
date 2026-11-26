/* ============================================================================
   SLAM the Game: features/peers.js
   PURPOSE     You and people like you (run Finish everything partly built, Part 9). One private sheet:
               your net worth next to the middle household of your age, your savings rate next to the
               whole country's, your household's pay next to the middle household's, the next milestone
               of the journey, and "people like you" lines from the published shares. Each source is
               named on the screen, with its date. Nothing leaves this device.
   INPUT       The profile (derive: nw, rate; c.age), the answer c.x.pe.gross ({ v, cf }, kit.js), the
               journey (features/trip.js, tpgJourney). The open sheet (W.kind): peers.
   OUTPUT      Math of the feature: pgNums, peBook. Views: peSheet. Actions (ACT): peers, pecoach. Menu: "You and
               people like you" (My money). Quest mode's Where you rank links here (qvRankBody).
   DEPENDS ON  core/peers.js (the one engine, a copy of js/math/peers.js of the web app, with PE_PRIORS),
               core/engine.js (derive), screens/ui.js (money, esc, head, mathBox, sheet), screens/dash.js
               (dkCaption, dkStatRow, dkTile, dkCard, dkProgress, dkPill), features/kit.js (kitAsk,
               kitValue, kitState, kitSharp, kitScreen, kitMenu), features/trip.js (tpgJourney),
               features/exletter.js (exLetterMine), screens/ui.js (onoff).
   RULES       The math is in core/peers.js. This file reads the numbers from the game's own engines and
               hands them in. A rank is where you start from, never a verdict. Private: the sheet shares
               nothing and goes to no guild or share card. When a coach or an admin opens the game of a
               player (exLetterMine), the sheet shows only that it is private, unless the player turned on
               Let my coach see this.
   STORED      c.x.pe = { gross: { v, cf }, coach: true when the player lets a coach see the sheet }.
   ========================================================================= */
const PE_GROSS = [
  [40000, "$40k"],
  [60000, "$60k"],
  [80000, "$80k"],
  [100000, "$100k"],
  [150000, "$150k"],
  [200000, "$200k"],
];
/* The plain numbers the engine reads, all from the game's own engines. */
function pgNums(c) {
  const d = derive(c),
    g = kitValue(c, "pe", "gross", "");
  return {
    d,
    gross: g.given ? g.v : null,
    grossSt: g.given ? kitState([{ cf: g.cf }]) : null,
    nwSt: kitState([kitSharp(c, "cash"), kitSharp(c, "inv"), kitSharp(c, "debt")]),
    rateSt: kitState([kitSharp(c, "take"), kitSharp(c, "spend")]),
  };
}
/* One line for a source, with its date. */
function pgSource(S) {
  return S ? `<div class="tiny muted">Source: ${esc(S.line)}.</div>` : "";
}
function pgCap(w) {
  return w.charAt(0).toUpperCase() + w.slice(1);
}
/* True when the player opens the sheet, or a coach or an admin opens it with the player's yes. */
function pgShown(c) {
  const mine = typeof exLetterMine !== "function" || exLetterMine();
  return mine || !!(c.x && c.x.pe && c.x.pe.coach);
}
function peSheet() {
  const c = C();
  if (!pgShown(c))
    return (
      head("Menu", "You and people like you") +
      dkCard(
        "Private",
        `<div class="small muted">This comparison shows to the player only. They can let a coach see it.</div>`
      )
    );
  const mine = typeof exLetterMine !== "function" || exLetterMine(),
    X = pgNums(c),
    d = X.d,
    N = peNetWorth({ nw: d.nw, age: c.age, rows: PE_PRIORS.rows }, money),
    S = peSaving({ rate: c.take > 0 ? d.rate : null, data: PE_PRIORS }),
    I = peIncome({ gross: X.gross, data: PE_PRIORS }, money),
    P = pePatterns({ age: c.age, data: PE_PRIORS }, money);
  let J = null;
  try {
    J = tpgJourney(c).J;
  } catch (e) {
    report(e, "peers.js: peSheet");
  }
  const Nx = peNext(J || {}, money),
    scf = PE_PRIORS.sources.scf2025;
  const nwCard = N.ready
    ? dkCard(
        "Net worth at your age",
        `<div class="small">${esc(N.line)}</div>` +
          (N.quarter
            ? `<div class="tiny muted" style="margin-top:6px">Among all households: ${esc(N.quarterWords)}${N.top10 ? ", over the 90th too" : ""}.</div>`
            : "") +
          mathBox(N.math.concat([PE_NOT_YET.netWorthPct])) +
          pgSource({
            line:
              "Federal Reserve Board, " + scf.name + ", Table 2 and Table A.2 (2025, released " + scf.released + ")",
          }),
        { cap: "A rank is where you start from, not a grade.", right: dkPill(X.nwSt) }
      )
    : dkCard("Net worth at your age", `<div class="small muted">Put in your age and your numbers to see this.</div>`);
  const saveCard = dkCard(
    "Savings rate",
    (S.ready
      ? `<div class="small">${esc(S.line)}</div>` + mathBox(S.math)
      : `<div class="small muted">Put in what comes in and what goes out a month to see this.</div>`) +
      `<div class="tiny muted" style="margin-top:6px">${esc(S.notYet)}</div>` +
      pgSource(S.source),
    S.ready ? { right: dkPill(X.rateSt) } : {}
  );
  const payCard = dkCard(
    "Household pay",
    kitAsk(c, "pe", "gross", "Your household's pay in a year, before taxes", PE_GROSS, "", {
      typed: true,
      help: "Everyone in the household, added up. Optional, and it stays on this device.",
    }) +
      (I.ready
        ? `<div class="small" style="margin-top:6px">${esc(I.line)}</div>` + mathBox(I.math)
        : I.row
          ? `<div class="small muted">The middle household had ${money(I.middle)} a year before taxes in ${esc(I.row.year)}. Tap yours to place it.</div>`
          : "") +
      `<div class="tiny muted" style="margin-top:6px">${esc(I.notYet)}</div>` +
      pgSource(I.source),
    I.ready ? { right: dkPill(X.grossSt) } : {}
  );
  const nextCard = dkCard(
    "Your next milestone",
    Nx.ready
      ? `<div class="small">${esc(Nx.line)}</div>` +
          (Nx.pct != null && !Nx.past ? dkProgress(Nx.pct * 100, { text: Nx.name }) : "") +
          (Nx.done.length ? `<div class="tiny muted">Done: ${esc(Nx.done.join(", "))}.</div>` : "")
      : `<div class="small muted">Put in your cash, what you owe and what you have invested to place you on the journey.</div>`,
    { right: `<button class="ghost slim" data-a="trips" data-v="journey">The journey</button>` }
  );
  const likeCard = dkCard(
    "People like you",
    `<div class="stack" style="gap:6px">${P.map(p => `<div class="tile tiny"><div class="small">${esc(p.text)}</div><div class="muted">${p.byAge ? "Your age group" : "All households"}. ${esc(p.source.publisher + ", " + p.source.name + " (" + p.source.year + ")")}</div></div>`).join("")}</div>`,
    {
      cap: "Published shares and middles, at your age where the table has an age split. What is common, not what anyone should be.",
    }
  );
  const coachCard = mine
    ? dkCard(
        "Who sees this",
        `<div class="row between" style="gap:8px"><span class="small">Let my coach see this</span>${onoff("pecoach", !!(c.x.pe && c.x.pe.coach))}</div><div class="tiny muted">Off: only you. A guild, a share card or a shared link never shows it.</div>`
      )
    : "";
  return (
    head("Menu", "You and people like you") +
    dkCaption(
      "Your numbers next to published ones for people your age, with where each comes from. Private: nothing here leaves this device."
    ) +
    (N.ready || S.ready
      ? dkStatRow([
          N.ready
            ? dkTile("Net worth", pgCap(PE_WORDS[N.where]), {
                sub: "the middle at your age: " + money(N.median),
                guess: X.nwSt === "Guess",
              })
            : "",
          S.ready
            ? dkTile("Savings rate", Math.round(S.yours * 100) + "%", {
                sub: "the country: " + (S.country * 100).toFixed(1) + "%",
                guess: X.rateSt === "Guess",
              })
            : "",
          Nx.ready && !Nx.past ? dkTile("Next milestone", esc(Nx.name), { sub: money(Nx.left) + " to go" }) : "",
        ])
      : "") +
    `<div class="stack" style="gap:10px">${nwCard}${saveCard}${payCard}${nextCard}${likeCard}${coachCard}</div>`
  );
}
/* The plan's spreadsheet (book.js): the net worth and the pay next to their published middles. */
function peBook(c) {
  const rows = [],
    d = derive(c),
    N = peNetWorth({ nw: d.nw, age: c.age, rows: PE_PRIORS.rows }),
    I = peIncome({ gross: pgNums(c).gross, data: PE_PRIORS });
  if (N.ready) {
    rows.push({ id: "pe_nw", label: "Net worth", v: d.nw });
    rows.push({ id: "pe_mid", label: "The middle net worth at your age (SCF 2025)", v: N.median });
    rows.push({ id: "pe_ratio", label: "Your net worth, of the middle", v: N.ratio, f: "={pe_nw}/{pe_mid}" });
  }
  if (I.ready) {
    rows.push({ id: "pe_gross", label: "Household pay a year, before taxes", v: I.gross });
    rows.push({ id: "pe_incmid", label: "The middle household's pay (Census 2025)", v: I.middle });
    rows.push({ id: "pe_incratio", label: "Your pay, of the middle", v: I.ratio, f: "={pe_gross}/{pe_incmid}" });
  }
  return { title: "You and people like you", rows };
}
kitScreen(
  "peers",
  "You and people like you",
  "Your net worth, savings rate and pay next to published numbers for people your age.",
  "Each source shows with its date. Private: nothing here leaves this device."
);
Object.assign(ACT, {
  peers: () => {
    W = { kind: "peers", o: {} };
    sheet(peSheet);
  },
  pecoach: t => {
    const c = C();
    c.x = c.x || {};
    c.x.pe = c.x.pe || {};
    c.x.pe.coach = t.dataset.v === "1";
    save();
    drawSheet();
  },
});
kitMenu("You and people like you", "peers", "Your numbers next to people your age, with the sources", "qmode");
