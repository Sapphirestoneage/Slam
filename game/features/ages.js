/* ============================================================================
   SLAM the Game: features/ages.js
   PURPOSE     Two ages, for each person. (1) Work optional: the age when the invested money is enough
               to live on (the freedom date of the plan). (2) Money reachable: the first age, at or after
               the first one, when the person can stop and pay each year until 59 and a half from money
               that is open by then. The gap between the two is the "middle class trap": enough money,
               but most of it in accounts that are not open yet.
   INPUT       The game: G.chars, G.coach (a household shows one column for each person). The profile of
               each person: the same numbers as the plan and as features/takeout.js. The open sheet
               (W.kind): ages.
   OUTPUT      Functions: agesOptional, agesReach, agesFor, agesPeople, agesBook, agesSheet. Actions
               (ACT): ages. Menu: "Your two ages".
   DEPENDS ON  core/engine.js (derive, goalSim), screens/ui.js, features/takeout.js (tkoInputs,
               tkoBridge), data/takeout2026.js, features/kit.js.
   RULES       The first age comes from the plan engine (goalSim), the same date as the freedom date
               on the other screens. The second age uses the four paths of "Taking money out" at each
               whole stop age. At 59 and a half the two ages are the same. In a household, each person
               is worked out on their own profile, and nothing is added together. A partner who is only
               an income line in one profile has no column. No verdict words. All amounts are in
               today's dollars.
   ========================================================================= */
/* The age when work is optional: now, when the era says so, else the month from the plan engine. */
function agesOptional(c) {
  const d = derive(c);
  if (d.era >= 8) return c.age;
  const m = goalSim(c).eraAt[8];
  return m == null ? null : c.age + m / 12;
}
/* The first stop age, at or after the optional age, when one path covers each year to 59 and a half. */
function agesReach(c, optional) {
  const E = TAKEOUT_2026.early;
  if (optional == null) return null;
  if (optional >= E.accessAge) return { age: optional, path: null, same: true };
  const P = tkoInputs(c);
  for (let a = Math.max(c.age, Math.ceil(optional)); a < E.accessAge; a++) {
    const B = tkoBridge(c, a, P),
      hit = B.paths.filter(p => p.ok && p.state !== "short").sort((x, y) => x.tax - y.tax)[0];
    if (hit) return { age: a, path: hit, same: a - optional < 1, B };
  }
  return { age: E.accessAge, path: null, same: false };
}
/* The two ages of one person. */
function agesFor(c) {
  const opt = agesOptional(c),
    reach = agesReach(c, opt),
    P = tkoInputs(c),
    B = opt != null && opt < TAKEOUT_2026.early.accessAge ? tkoBridge(c, Math.max(c.age, Math.ceil(opt)), P) : null;
  return {
    name: c.name || "You",
    age: c.age,
    plan: Math.max(c.age, c.ret),
    optional: opt == null ? null : Math.round(opt * 10) / 10,
    reach: reach ? Math.round(reach.age * 10) / 10 : null,
    gap: reach && opt != null ? Math.max(0, Math.round((reach.age - opt) * 10) / 10) : null,
    path: reach && reach.path ? reach.path : null,
    same: !!(reach && reach.same),
    atOptional: B,
    st: P.st,
  };
}
/* The persons to show: each profile of a household, or the open profile. */
function agesPeople() {
  return !G.coach && (G.chars || []).length > 1 ? G.chars : [C()];
}
/* The rows for the spreadsheet of the plan (book.js): the open profile. */
function agesBook(c) {
  const A = agesFor(c);
  if (A.optional == null || A.reach == null) return { title: "Your two ages", rows: [] };
  return {
    title: "Your two ages",
    rows: [
      { id: "ag_now", label: "Age now", v: A.age, note: "Your number" },
      {
        id: "ag_opt",
        label: "Work optional at",
        v: A.optional,
        note: "Worked out by the game: the plan, month by month",
      },
      {
        id: "ag_reach",
        label: "Money reachable at",
        v: A.reach,
        note: "Worked out by the game: the four paths of Taking money out, at each stop age",
      },
      {
        id: "ag_gap",
        label: "Years between the two",
        v: Math.max(0, A.reach - A.optional),
        f: "=MAX(0,{ag_reach}-{ag_opt})",
      },
      {
        id: "ag_wait",
        label: "Years until work is optional",
        v: Math.max(0, A.optional - A.age),
        f: "=MAX(0,{ag_opt}-{ag_now})",
      },
    ],
  };
}
function agesCol(A, many) {
  const age = v => (v == null ? "Past 50 years" : String(v));
  return {
    title: many ? A.name : "You",
    guess: A.st === "Guess",
    big:
      A.optional == null
        ? "Not in sight yet"
        : A.same
          ? "Age " + age(A.optional)
          : age(A.optional) + " and " + age(A.reach),
    rows: [
      ["Work optional at " + kitInfo("ag_opt"), age(A.optional)],
      ["Money reachable at " + kitInfo("ag_reach"), A.optional == null ? "after that" : age(A.reach)],
      A.gap != null && !A.same ? ["Years between the two " + kitInfo("ag_gap"), String(A.gap)] : null,
      A.path ? ["How the years are paid " + kitInfo("tko_paths"), esc(A.path.n)] : null,
      A.atOptional && A.atOptional.needed
        ? [
            "Reachable at " + A.atOptional.stop + " " + kitInfo("tko_bridge"),
            money(A.atOptional.have) + " of " + money(A.atOptional.need),
          ]
        : null,
      ["The stop age in the plan", String(A.plan)],
    ],
    foot:
      A.optional == null
        ? "At this pace the money does not reach the freedom number in 50 years."
        : A.same
          ? "If these assumptions hold, both ages are the same: the money is open when it is enough."
          : "If these assumptions hold, the money is enough at " +
            age(A.optional) +
            ", and it can pay each year from " +
            age(A.reach) +
            ".",
    html: kitPill(A.st),
  };
}
function agesSheet() {
  const L = agesPeople().map(agesFor),
    many = L.length > 1,
    gapOne = L.find(a => a.gap > 0 && !a.same);
  return (
    head("Plan", "Your two ages") +
    `<div class="small muted">Enough money, and money you can reach, are two different days. ${many ? "Each person is worked out on their own numbers." : ""}</div>` +
    kitColumns(L.map(a => agesCol(a, many))) +
    (gapOne
      ? `<div class="tile small"><b>What closes the gap:</b> more money in places with no age on them (a regular account, Roth deposits, cash), or a Roth ladder started 5 years before you stop.</div>`
      : "") +
    `<div class="row" style="gap:8px"><button class="primary" style="flex:1" data-a="takeout" data-v="bridge">See the years before 59½</button><button class="ghost" style="flex:1" data-a="simopen" data-v="stop">Stop earlier or later</button></div>` +
    mathBox([
      "Work optional: the plan engine runs your money month by month. The age is the month when the invested money covers your spending for good (the freedom date).",
      "Money reachable: for each whole age from there, the game runs the four paths of Taking money out (bridge accounts, Roth ladder, 72(t) payments, Rule of 55). The first age where one path pays each year to 59 and a half is the answer.",
      "At 59 and a half the pre-tax accounts open, so the two ages are the same from there.",
      many
        ? "A household: each person uses their own profile. Nothing is added together."
        : "One person: your profile.",
      "All amounts are in today's dollars. Arithmetic on your numbers, not advice.",
    ])
  );
}
kitTerms({
  ag_opt: [
    "Work optional",
    "The age when your invested money can pay for your life for good. Working after that is a choice. It is the same date as the freedom date in your plan.",
  ],
  ag_reach: [
    "Money reachable",
    "The first age when you can stop and pay each year until 59 and a half with money that is open: cash, regular accounts, Roth deposits, or one of the legal early ways.",
  ],
  ag_gap: [
    "The gap (the middle class trap)",
    "Years when you have enough money on paper, but most of it is in retirement accounts that are not open yet.",
  ],
});
kitScreen(
  "ages",
  "Your two ages",
  "The age when work is optional, and the age when you can reach the money, for each person.",
  "A gap between the two means the money is enough but not open yet."
);
Object.assign(ACT, {
  ages: () => {
    W = { kind: "ages", o: {} };
    sheet(agesSheet);
  },
});
kitMenu("Your two ages", "ages", "Work optional, and money reachable, for each person", "takeout");
