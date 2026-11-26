/* ============================================================================
   SLAM the Game: features/estate.js
   PURPOSE     Estate and marriage (run Finish everything partly built, Part 11). One sheet in the new
               look with three tabs: (1) Estate basics: the estate checklist of My plan on one page (a
               will, beneficiaries on each account, a power of attorney and a health care directive),
               why the form on an account beats the will, and the private summary for a lawyer in the
               web app. (2) What your people receive: the inheritance simulator (who gets what, the
               step-up in basis, the rule of each inherited account, the federal and New York estate
               lines) and the 10 years of an inherited account, three ways, with the federal tax. (3)
               Married or partners?: two single returns or one joint return, the tax on partner cover,
               the Social Security spousal top-up and survivor benefit, and what changes, New York first.
   INPUT       The open sheet (W.kind): estate, with W.tab and W.o (the taps while the sheet is open).
               c.x.summary.estate (the checklist, through summaryX and the action summaryestate of
               features/plan.js).
   OUTPUT      Views: estateSheet, esBasicsTab, esHeirsTab, esTenCard, esMarriedTab. Math reads: esRead,
               esTaxOf. Actions (ACT): estate, estab, esadd, esset, esdel. Menu: "Estate and marriage".
   DEPENDS ON  core/estate.js (the math and the rules: esHeirs, esTenYear, esCompare, ES_RULES, ES_REF,
               ES_SS, spousalExcess), features/retire.js (retireTax: the game's one tax engine),
               features/plan.js (SUMMARY_ESTATE, summaryX, the action summaryestate), screens/ui.js (money,
               esc, head, mathBox, save, drawSheet, sheet), screens/dash.js (dkCaption, dkStatRow, dkTile,
               dkCard, dkPill), features/kit.js (kitMenu, kitScreen, kitTerms).
   RULES       The math is in core/estate.js (the same code as the web app). The views show what it
               returns. Names and amounts are taps; nothing is kept when the sheet closes, so the people
               and amounts never reach a coach or the spreadsheet of the plan (the private summary with
               names is in the web app, kin.html, where nothing is kept unless the person turns it on).
               Not legal advice: every tab says to bring it to a lawyer. No verdict words.
   ========================================================================= */
const ES_TABS = [
  ["basics", "Estate basics"],
  ["heirs", "What your people receive"],
  ["married", "Married or partners?"],
];
const ES_ROLES = [
  ["Spouse", "spouse"],
  ["Partner", "other"],
  ["Child", "child"],
  ["Friend", "other"],
  ["Sibling", "other"],
  ["Parent", "other"],
];
const ES_THINGS = [
  ["Savings", "cash"],
  ["Brokerage", "taxable"],
  ["Home", "home"],
  ["401(k) or IRA", "pretax"],
  ["Roth IRA", "roth"],
  ["Life insurance", "life"],
];
const ES_VALUES = [5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];
const ES_PAID = [
  [0.25, "A quarter"],
  [0.5, "Half"],
  [0.75, "Three quarters"],
  [null, "Not sure"],
];
const ES_PAY = [0, 30000, 50000, 75000, 100000, 150000, 250000];
const ES_PIA = [1000, 1500, 2000, 2500, 3000, 3500];
const ES_COVER = [3000, 6000, 9000, 12000];
const ES_RULE_WORDS = {
  own: () => "As a spouse, they can treat it as their own account.",
  life: () => "They may take it out over their own life expectancy (or within the 10 years).",
  child: r => "Over their life expectancy until " + r.childAge + ", then 10 more years to empty it.",
  ten: r => "Emptied by December 31 " + r.lastYear + (r.yearly ? ", with a withdrawal every year until then." : "."),
};
/* The game's one tax engine: the federal income tax on a year's income before taxes (features/retire.js). */
function esTaxOf(gross, status) {
  return typeof retireTax === "function" ? retireTax(gross, 0, status, "", 40).federal : 0;
}
/* The taps while the sheet is open. */
function esO() {
  W.o = W.o || {};
  W.o.h = W.o.h || { people: [], items: [], started: false, ten: {} };
  W.o.m = W.o.m || { p: [{}, {}], coverBy: null, cover: null };
  return W.o;
}
/* Everything the sheet shows, from the one engine. */
function esRead() {
  const O = esO(),
    year = new Date().getFullYear(),
    H = esHeirs({ items: O.h.items, people: O.h.people, deathYear: year, started: O.h.started }, ES_RULES),
    M = O.m,
    cmp = esCompare(
      {
        people: M.p.map((p, i) => ({ name: i ? "Your person" : "You", pay: p.pay, pia: p.pia })),
        cover: M.coverBy == null ? 0 : M.cover || 0,
        coverBy: M.coverBy === 1 ? 1 : 0,
      },
      { taxOf: esTaxOf, spousalOf: (a, b) => spousalExcess(a, b, ES_SS) }
    );
  return { O, year, H, cmp };
}
const esF = k => ES_REF.facts[k];
const esFact = k =>
  `<div class="tiny muted" style="margin-top:4px">${esc(esF(k).text)} <i>${esc(esF(k).source)}, checked ${esc(esF(k).checked)}.</i></div>`;
const esChip = (act, k, v, on, label) =>
  `<button class="chip sm ${on ? "on" : ""}" data-a="${act}" data-k="${esc(k)}" data-v="${esc(String(v))}" aria-pressed="${!!on}">${esc(label)}</button>`;
const esLawyer = () => `<div class="tiny muted" style="margin-top:8px">${esc(ES_REF.lawyer)}</div>`;

/* (1) Estate basics */
function esBasicsTab(c) {
  const E = summaryX(c).estate,
    list = SUMMARY_ESTATE.map(
      x =>
        `<button class="rowbtn ${E[x[0]] ? "okrow" : ""}" data-a="summaryestate" data-v="${x[0]}"><span>${esc(x[1])}</span><b class="tiny">${E[x[0]] ? "Done ✓" : "Tap when done"}</b></button>`
    ).join(""),
    done = SUMMARY_ESTATE.filter(x => E[x[0]]).length;
  return (
    dkStatRow([
      dkTile("Papers done", done + " of " + SUMMARY_ESTATE.length, { sub: "the same list as My plan on one page" }),
    ]) +
    dkCard("The papers", list + esFact("beneficiaryWins") + esFact("noWillNy"), {
      cap: "A will, the forms on each account, and who decides if you cannot.",
    }) +
    dkCard(
      "A summary for a lawyer, in your words",
      `<div class="small">Who decides about your health care, who handles your money, who gets what, and who is named on each account, written in plain English with your chosen family by name. It lives in the web app, where nothing is kept unless you turn it on.</div><a class="btn ghost slim" style="margin-top:8px" href="../kin.html" target="_blank" rel="noopener">Write the summary</a>` +
        esLawyer()
    )
  );
}

/* (2) What your people receive */
function esHeirsTab(R) {
  const O = R.O.h,
    H = R.H,
    people = O.people
      .map(
        (p, i) =>
          `<div class="stack" style="gap:4px;margin-top:8px"><div class="row between small"><b>${esc(p.name)}</b><button class="ghost slim" data-a="esdel" data-k="person" data-v="${i}">Remove</button></div><div class="chips">${Object.keys(
            ES_HEIRS
          )
            .map(k => esChip("esset", "heir|" + i, k, p.heir === k, ES_HEIRS[k]))
            .join("")}</div></div>`
      )
      .join(""),
    things = O.items
      .map(
        (it, i) =>
          `<div class="stack" style="gap:4px;margin-top:10px;border-top:1px solid var(--line);padding-top:8px"><div class="row between small"><b>${esc(it.name)}</b><button class="ghost slim" data-a="esdel" data-k="item" data-v="${i}">Remove</button></div><div class="tiny muted">What it is worth</div><div class="chips">${ES_VALUES.map(
            v => esChip("esset", "value|" + i, v, it.value === v, money(v))
          ).join("")}</div>${
            ES_BASIS.includes(it.kind)
              ? `<div class="tiny muted">What you paid for it, of that</div><div class="chips">${ES_PAID.map(([v, l]) => esChip("esset", "paid|" + i, v, it.paid === v, l)).join("")}</div>`
              : ""
          }<div class="tiny muted">Who gets it (more than one shares it equally)</div><div class="chips">${
            O.people.length
              ? O.people.map(p => esChip("esset", "to|" + i, p.id, !!(it.to || {})[p.id], p.name)).join("")
              : `<span class="tiny muted">Add your people first.</span>`
          }</div></div>`
      )
      .join("");
  const rows = H.ready
    ? H.people
        .map(
          r =>
            `<div class="row between small" style="margin-top:8px;gap:8px;align-items:flex-start"><span style="min-width:0"><b>${esc(r.name)}</b>${[
              r.pretax
                ? money(r.pretax) +
                  " from a traditional account: income tax when they take it out. " +
                  ES_RULE_WORDS[r.rule](r)
                : "",
              r.roth ? money(r.roth) + " from a Roth account: no tax on it. " + ES_RULE_WORDS[r.rule](r) : "",
              r.erased ? "The step-up wipes out " + money(r.erased) + " of gain." : "",
              r.life ? money(r.life) + " of life insurance: not income for them." : "",
            ]
              .filter(Boolean)
              .map(t => `<div class="tiny muted">${esc(t)}</div>`)
              .join("")}</span><b>${money(r.gets)}</b></div>`
        )
        .join("")
    : "";
  const E = H.estate;
  return (
    dkStatRow([
      dkTile("Your people receive", H.ready ? money(H.assigned) : "–", {
        sub: H.ready ? H.people.length + (H.people.length === 1 ? " person" : " people") : "add a person and a thing",
      }),
      dkTile("Step-up wipes out", H.ready ? money(H.erased) : "–", { sub: "gain never taxed as income" }),
      dkTile(
        H.ready && E.federal.state === "over" ? "Over the federal line" : "Room to the federal line",
        H.ready
          ? money(E.federal.state === "over" ? E.federal.over : E.federal.room)
          : money(ES_RULES.federalExclusion),
        { sub: "the line is " + money(ES_RULES.federalExclusion) + " for 2026" }
      ),
      dkTile(
        "New York line",
        H.ready && E.ny.state === "under"
          ? money(E.ny.room) + " to go"
          : H.ready
            ? "Past the line"
            : money(ES_RULES.nyExclusion),
        {
          sub: H.ready
            ? E.ny.state === "under"
              ? "the line is " + money(ES_RULES.nyExclusion)
              : E.ny.state === "cliff"
                ? "near the cliff: bring it to a lawyer"
                : "over the cliff: bring it to a lawyer"
            : "for 2026",
        }
      ),
    ]) +
    dkCard(
      "Your people",
      `<div class="chips">${ES_ROLES.map(([l, k]) => esChip("esadd", "person", l + "|" + k, false, "+ " + l)).join("")}</div>` +
        people,
      { cap: "Chosen family counts. Tap who they are to you: it sets the rule of an inherited account." }
    ) +
    dkCard(
      "What you would leave",
      `<div class="chips">${ES_THINGS.map(([l, k]) => esChip("esadd", "item", l + "|" + k, false, "+ " + l)).join("")}</div>` +
        things +
        `<div class="tiny muted" style="margin-top:10px">Had you started your required withdrawals?</div><div class="chips">${esChip("esset", "started", "no", !O.started, "Not yet")}${esChip("esset", "started", "yes", O.started, "Yes")}</div>`,
      { cap: "Rough values are fine. Nothing here is kept when you close it." }
    ) +
    (H.ready
      ? dkCard(
          "If it happened in " + R.year,
          rows +
            mathBox([
              "Each thing is shared equally among the people tapped for it.",
              "The step-up: its value less what you paid, for shares and a home. That gain is not taxed as income for them.",
              "The 10 years: December 31 of the 10th year after the year of death.",
              "The federal line: everything (" +
                money(E.total) +
                ") less what goes to a spouse (" +
                money(E.toSpouse) +
                "), against " +
                money(ES_RULES.federalExclusion) +
                ". New York: " +
                money(E.total) +
                " against " +
                money(ES_RULES.nyExclusion) +
                ", the cliff at " +
                money(E.ny.cliff) +
                ". Before debts, costs and gifts: a lawyer works out the real estate.",
            ]) +
            esFact("stepUp") +
            esFact("tenYear") +
            esFact("nyCliff") +
            esLawyer()
        ) + esTenCard(R)
      : "") +
    `<button class="ghost wide slim" data-a="hard" data-v="grief">After a death: the first 90 days</button>`
  );
}
/* The 10 years, for the first person with a traditional account. */
function esTenCard(R) {
  const O = R.O.h,
    who = R.H.people.filter(r => r.pretax > 0),
    T = O.ten || {},
    p = who.find(r => r.id === T.who) || who[0];
  if (!p) return "";
  const status = T.status || "single",
    growth = T.growth || 0,
    X = esTenYear(
      {
        balance: p.pretax,
        growth,
        other: T.other,
        status,
        deathYear: R.year,
        started: R.H.started && p.rule === "ten",
      },
      esTaxOf
    );
  return dkCard(
    "The 10 years of an inherited account",
    (who.length > 1
      ? `<div class="chips">${who.map(r => esChip("esset", "tenwho", r.id, r.id === p.id, r.name)).join("")}</div>`
      : "") +
      `<div class="tiny muted">${esc(p.name)}'s own income a year, before taxes</div><div class="chips">${ES_PAY.map(v => esChip("esset", "tenother", v, T.other === v, money(v))).join("")}</div>` +
      `<div class="tiny muted">They file</div><div class="chips">${[
        ["single", "Single"],
        ["joint", "Married, jointly"],
        ["head", "Head of household"],
      ]
        .map(([v, l]) => esChip("esset", "tenstatus", v, status === v, l))
        .join("")}</div>` +
      `<div class="tiny muted">It grows a year, after inflation</div><div class="chips">${[0, 0.04, 0.07].map(v => esChip("esset", "tengrowth", v, growth === v, Math.round(v * 100) + "%")).join("")}</div>` +
      (X.ready
        ? Object.keys(ES_WAYS)
            .map(w => {
              const Y = X.ways[w];
              return `<div class="row between small" style="margin-top:6px;gap:8px"><span>${esc(ES_WAYS[w])}${X.best === w ? " " + dkPill("least tax", "okp") : ""}<div class="tiny muted">${Y.ready ? money(Y.out) + " out, " + money(Y.kept) + " kept" : "Not open: a withdrawal comes out every year."}</div></span><b>${Y.ready ? money(Y.tax) : ""}</b></div>`;
            })
            .join("") +
          `<div class="small" style="margin-top:6px">${X.saves > 0 ? esc(ES_WAYS[X.best]) + " keeps " + money(X.saves) + " more than the costliest way." : "The three ways come out the same here."}</div>` +
          mathBox([
            "Each year it grows, then the withdrawal comes out at the end of the year. Spread: the balance divided by the years left.",
            "The tax on a withdrawal: the federal tax on their income plus it, less the tax on their income alone (2026 tables, in today's dollars). No state tax here.",
          ]) +
          (X.started ? esFact("tenYearYearly") : esFact("eligible"))
        : `<div class="small muted" style="margin-top:6px">Tap their own income, and the three ways appear.</div>`),
    { cap: "Taken out all at once, spread out, or at the end: the federal tax on each." }
  );
}

/* (3) Married or partners? */
function esMarriedTab(R) {
  const M = R.O.m,
    K = R.cmp,
    who = i => (i ? "Your person" : "You"),
    person = i =>
      `<div class="tiny muted" style="margin-top:6px">${who(i)}: pay a year, before taxes</div><div class="chips">${ES_PAY.map(v => esChip("esset", "pay|" + i, v, M.p[i].pay === v, money(v))).join("")}</div><div class="tiny muted">${who(i)}: Social Security at full retirement age, a month</div><div class="chips">${ES_PIA.map(v => esChip("esset", "pia|" + i, v, M.p[i].pia === v, money(v))).join("")}</div>`;
  const F = ES_REF.facts,
    diff = [
      ["Filing taxes", "File jointly or separately as married.", F.dpFederal.text],
      ["Job health cover", "Tax-free for a spouse.", F.dpCover.text + " " + F.dpCoverNy.text],
      ["Social Security", F.ssSpouse.text + " " + F.ssSurvivor.text, F.ssPartner.text],
      ["With no will", "A spouse is first on New York's list.", F.noWillNy.text],
      ["Estate and gift tax", F.marital.text, "No marital deduction. " + F.giftAnnual.text],
      ["An inherited IRA", "A spouse can treat it as their own.", F.eligible.text],
      ["Making it official in New York", "A marriage license, statewide.", F.nycRegister.text],
    ];
  const d = K.ready ? K.taxDiff : null;
  return (
    dkStatRow([
      dkTile("Married, federal tax", K.ready ? (Math.abs(d) < 1 ? "the same" : money(Math.abs(d))) : "–", {
        sub: K.ready
          ? Math.abs(d) < 1
            ? "a year"
            : d > 0
              ? "less a year, joint"
              : "more a year, joint"
          : "tap both pays",
      }),
      dkTile("Tax on partner cover", K.ready && M.coverBy != null ? money(K.coverTax) : "–", {
        sub: M.coverBy != null ? "a year, unmarried" : "no cover tapped",
      }),
      dkTile("Spousal top-up", K.ready && K.ss ? money(K.ssYear) : "–", {
        sub: K.ready && K.ss ? "a year, married" : "tap both amounts",
      }),
      dkTile("Survivor keeps", K.ready && K.ss ? money(Math.max(K.ss[0].survivor, K.ss[1].survivor)) : "–", {
        sub: K.ready && K.ss ? "a month, married" : "tap both amounts",
      }),
    ]) +
    dkCard(
      "Two people",
      person(0) +
        person(1) +
        `<div class="tiny muted" style="margin-top:6px">Does one job cover the other person?</div><div class="chips">${esChip("esset", "coverby", "no", M.coverBy == null, "No")}${esChip("esset", "coverby", 0, M.coverBy === 0, "Your job")}${esChip("esset", "coverby", 1, M.coverBy === 1, "Your person's job")}</div>` +
        (M.coverBy == null
          ? ""
          : `<div class="tiny muted">What the employer pays for that cover, a year</div><div class="chips">${ES_COVER.map(v => esChip("esset", "cover", v, M.cover === v, money(v))).join("")}</div>`),
      { cap: "Your taps stay on this screen only." }
    ) +
    (K.ready
      ? dkCard(
          "Federal income tax, 2026",
          `<div class="row between small"><span>Two single returns</span><b>${money(K.single[0] + K.single[1])}</b></div>` +
            (K.coverTax
              ? `<div class="row between small"><span>Tax on the partner cover</span><b>${money(K.coverTax)}</b></div>`
              : "") +
            `<div class="row between small"><span>One joint return</span><b>${money(K.joint)}</b></div>` +
            (K.ss
              ? `<div class="small" style="margin-top:6px">Married: the spousal top-up is ${money(K.ss[0].spousal)} a month for you and ${money(K.ss[1].spousal)} for your person; a survivor keeps the larger benefit. As domestic partners in New York: none of it.</div>`
              : "") +
            mathBox([
              "Each tax is the game's federal tax on pay before taxes, with the 2026 standard deduction and brackets. Credits and state tax are left out.",
              "The partner cover: the tax on the pay plus the cover, less the tax on the pay alone, on a single return.",
              "The spousal top-up at full retirement age: half the other person's amount, less your own, never below 0.",
            ]) +
            esLawyer()
        )
      : "") +
    dkCard(
      "What changes, New York first",
      diff
        .map(
          ([t, a, b]) =>
            `<details class="math"><summary>${esc(t)}</summary><div class="inner stack" style="gap:4px"><div class="small"><b>Married:</b> ${esc(a)}</div><div class="small"><b>Domestic partners:</b> ${esc(b)}</div></div></details>`
        )
        .join("") +
        `<div class="tiny muted" style="margin-top:6px">Sources: ${esc(["dpFederal", "dpCover", "ssSpouse", "ssSurvivor", "ssPartner", "nycRegister"].map(k => F[k].source).join("; "))}. Checked ${esc(ES_REF.checked)}.</div>`
    )
  );
}
function estateSheet() {
  const c = C(),
    R = esRead(),
    tab = W.tab || "basics";
  return (
    head("Plan", "Estate and marriage") +
    dkCaption("Who gets what, who decides, and what marriage changes. Bring it to a lawyer.") +
    `<div class="chips">${ES_TABS.map(t => `<button class="chip sm ${t[0] === tab ? "on" : ""}" data-a="estab" data-v="${t[0]}">${esc(t[1])}</button>`).join("")}</div>` +
    (tab === "heirs" ? esHeirsTab(R) : tab === "married" ? esMarriedTab(R) : esBasicsTab(c))
  );
}
kitTerms({
  stepup: [
    "Step-up in basis",
    "For something inherited, the starting point for tax is its value on the date of death. The gain while the person owned it is not taxed as income.",
  ],
  tenyear: [
    "The 10-year rule",
    "Most people who inherit a traditional IRA or 401(k) must empty it by the end of the 10th year after the year of death.",
  ],
});
kitScreen(
  "estate",
  "Estate and marriage",
  "Your estate papers, what your people would receive, and what marriage changes next to a domestic partnership.",
  "Nothing here is kept when you close it. Not legal advice: bring it to a lawyer."
);
Object.assign(ACT, {
  estate: t => {
    W = { kind: "estate", tab: (t && t.dataset && t.dataset.v) || "basics", o: {} };
    sheet(estateSheet);
  },
  estab: t => {
    if (!ES_TABS.some(x => x[0] === t.dataset.v)) return;
    W.tab = t.dataset.v;
    drawSheet();
  },
  esadd: t => {
    const O = esO().h,
      [label, kind] = String(t.dataset.v || "").split("|");
    if (t.dataset.k === "person") {
      if (!ES_ROLES.some(x => x[0] === label)) return;
      const n = O.people.filter(p => p.role === label).length;
      O.people.push({
        id: "p" + O.people.length + Date.now().toString(36),
        role: label,
        name: n ? label + " " + (n + 1) : label,
        heir: kind,
      });
    } else {
      if (!ES_THINGS.some(x => x[0] === label)) return;
      O.items.push({
        id: "i" + O.items.length + Date.now().toString(36),
        name: label,
        kind,
        value: null,
        paid: null,
        basis: null,
        to: {},
      });
    }
    drawSheet();
  },
  esset: t => {
    const O = esO(),
      [f, i] = String(t.dataset.k || "").split("|"),
      raw = t.dataset.v,
      n = Number(raw),
      it = O.h.items[Number(i)];
    if (f === "heir") {
      const p = O.h.people[Number(i)];
      if (p && ES_HEIRS[raw]) p.heir = raw;
    } else if (f === "value" && it) {
      it.value = it.value === n ? null : n;
      it.basis = it.paid == null || it.value == null ? null : it.value * it.paid;
    } else if (f === "paid" && it) {
      it.paid = raw === "null" ? null : n;
      it.basis = it.paid == null || it.value == null ? null : it.value * it.paid;
    } else if (f === "to" && it) {
      it.to = Object.assign({}, it.to);
      if (it.to[raw]) delete it.to[raw];
      else it.to[raw] = 1;
    } else if (f === "started") O.h.started = raw === "yes";
    else if (f === "tenwho") O.h.ten.who = raw;
    else if (f === "tenother") O.h.ten.other = O.h.ten.other === n ? null : n;
    else if (f === "tenstatus") O.h.ten.status = raw;
    else if (f === "tengrowth") O.h.ten.growth = n;
    else if (f === "pay" || f === "pia") {
      const p = O.m.p[Number(i)];
      if (p) p[f] = p[f] === n ? null : n;
    } else if (f === "coverby") O.m.coverBy = raw === "no" ? null : n;
    else if (f === "cover") O.m.cover = O.m.cover === n ? null : n;
    else return;
    drawSheet();
  },
  esdel: t => {
    const O = esO().h,
      k = Number(t.dataset.v);
    if (t.dataset.k === "person") {
      const p = O.people[k];
      if (!p) return;
      O.people.splice(k, 1);
      O.items.forEach(it => {
        if (it.to) delete it.to[p.id];
      });
    } else if (O.items[k]) O.items.splice(k, 1);
    drawSheet();
  },
});
kitMenu(
  "Estate and marriage",
  "estate",
  "Your estate papers, what your people would receive, married or partners",
  "hard"
);
