/* ============================================================================
   SLAM the Game: features/mix.js
   PURPOSE     Investment mix and fees, by taps for each investment account: what is inside, and a fee
               preset, plus an advisor fee. The result: the household mix of every account next to a
               target (yours, or an age guide), the three-fund check, employer stock and any one company,
               every fund and fee in dollars (the fee and product X-ray: funds one by one, sales charges,
               account fees), the fees over 30 years in dollars and in days of freedom, and "your path"
               next to "the low-fee path". The stock share is also a live key number. Run Finish
               everything partly built, Part 13: the household math is core/invest.js (ivMix, ivFees).
   INPUT       The profile: c.invs (or c.inv), c.age, c.ret, c.take, c.spend, c.x.mix (the answers). The
               open sheet (W.kind): mix. The taps of the player.
   OUTPUT      Functions: mixGuide, mixParts, mixTaxGuess, mixAccounts, mixCalc, mixYearsTo, knMetricsMix,
               mixAcctSec, mixSheet, mixBook. Actions (ACT): mix, mixfadd, mixfdel. Parts of functions in other files: knMetricsMix (knMetrics in
               metrics.js). Menu: "Investment mix and fees".
   DEPENDS ON  core/invest.js (ivMix, ivFees, IV_CLASSES, IV_RULES, IV_SOURCES), screens/dash.js (dkCard,
               dkStatRow, dkTile, dkDonut, dkSec, dkPill, dkCaption), core/engine.js, screens/ui.js,
               core/metrics.js, features/compare.js (cpFv),
               features/kit.js, features/retire.js (retireGlideStock: the glide-path code of the retirement
               engine). Each account's mix goes into the engine through retireAccounts in retire.js.
   RULES       The age guide is the glide path of the Vanguard Target Retirement funds, as Vanguard
               publishes it: 90% stocks until 25 years before the stop age, then less each year to 50% at
               the stop age, and 30% seven years after. Growth is 7% a year after inflation, minus the
               fees, compounded once a year (the same sum as the Fee X-ray). "I don't know" is a Guess.
               A fund added one by one with no fee tapped counts no fee and says "no fee yet": the game
               never makes up a fund's fee. The three-fund check is a comparison, not advice.
   ========================================================================= */
const MIX_INSIDE = [
  ["td", "Target-date fund"],
  ["sp", "S&P 500 or US total market"],
  ["intl", "International stocks"],
  ["bond", "Bonds"],
  ["cash", "Cash"],
  ["single", "Single stocks"],
  ["crypto", "Crypto"],
  ["unk", "I don't know"],
];
const MIX_FEES = [
  ["0.05", "0.05%"],
  ["0.2", "0.2%"],
  ["0.5", "0.5%"],
  ["1", "1%"],
  ["1.5", "1.5% or more"],
  ["unk", "I don't know"],
];
const MIX_ADVISOR = [
  ["0", "No advisor fee"],
  ["0.5", "0.5%"],
  ["1", "1%"],
  ["1.5", "1.5%"],
];
/* the fee the game assumes for "I don't know", by what is inside */
const MIX_FEE_GUESS = { td: 0.12, sp: 0.05, bond: 0.05, cash: 0, single: 0, crypto: 1, unk: 0.5 };
const MIX_LOW = 0.05;
const MIX_YEARS = 30;
const MIX_FUNDS = 3; /* funds one by one, in each account */
const MIX_SHARE = [
  [0.1, "10%"],
  [0.25, "25%"],
  [0.5, "50%"],
  [0.75, "75%"],
  [1, "All of it"],
];
const MIX_LOADS = [
  ["0", "None"],
  ["3", "3%"],
  ["5.75", "5.75%"],
  ["unk", "I don't know"],
];
const MIX_EMP = [
  [0, "None"],
  [0.1, "10%"],
  [0.25, "25%"],
  [0.5, "50%"],
  [1, "All of it"],
];
const MIX_AFEE = [
  [0, "$0"],
  [25, "$25"],
  [50, "$50"],
  [100, "$100"],
];
const MIX_TAX = [
  ["plan", "Plan at work"],
  ["ira", "Traditional IRA"],
  ["roth", "Roth IRA"],
  ["hsa", "HSA"],
  ["taxable", "Regular account"],
  ["unk", "Not sure"],
];
const MIX_TARGET = [
  ["", "The age guide"],
  ["0.6", "60%"],
  ["0.7", "70%"],
  ["0.8", "80%"],
  ["0.9", "90%"],
  ["1", "100%"],
];
/* THE AGE GUIDE: the Vanguard Target Retirement glide path, set to the stop age of the player. */
function mixGuide(age, ret) {
  ret = ret || 65;
  /* retire.js: the glide-path code of the retirement engine, on the Vanguard points; core/invest.js (ivGuide) has
     the same rule in words, for the web app and when the engine is not ready. tests/retirement-engine.js holds
     the two together. */
  const g = typeof retireGlideStock === "function" ? retireGlideStock(age, ret) : null,
    G2 = ivGuide(age, ret);
  return g != null ? { stock: g, bond: 1 - g, source: G2.source } : G2;
}
/* What is inside, as the parts of the household mix (core/invest.js, ivMix). A target-date fund and
   "I don't know" use the age guide: its stock part has no known US and international split. */
function mixParts(kind, g) {
  if (kind === "td" || kind === "unk") return { stocks: g.stock, bonds: g.bond };
  if (kind === "sp") return { us: 1 };
  if (kind === "intl") return { intl: 1 };
  if (kind === "single") return { single: 1 };
  if (kind === "bond") return { bonds: 1 };
  if (kind === "cash") return { cash: 1 };
  if (kind === "crypto") return { crypto: 1 };
  return { other: 1 };
}
/* The tax kind of an account by its name, until the player taps one (core/invest.js, ivTaxKind). */
function mixTaxGuess(k) {
  return /roth/i.test(k)
    ? "roth"
    : /plan at work|401|403|457|tsp/i.test(k)
      ? "plan"
      : /\bira\b/i.test(k)
        ? "ira"
        : /hsa/i.test(k)
          ? "hsa"
          : /brokerage|regular|taxable/i.test(k)
            ? "taxable"
            : "unk";
}
/* The investment accounts, each with its answers: what is inside, its fee, the funds one by one (up to
   MIX_FUNDS), a sales charge, an account fee, the employer's stock, the biggest one company, the tax kind. */
function mixAccounts(c) {
  const rows = c.led && (c.invs || []).length ? c.invs : [{ k: "Your investments", amt: c.inv || 0 }],
    g = mixGuide(c.age, c.ret);
  return rows.map((r, i) => {
    const val = (k, fb) => kitValue(c, "mix", k + "_" + i, fb),
      inside = val("in", "unk"),
      fee = val("fee", "unk"),
      kind = inside.v,
      amt = +r.amt || 0,
      nf = Math.max(0, Math.min(MIX_FUNDS, +((kitStore(c, "mix")["nf_" + i] || {}).v || 0))),
      funds = [];
    for (let n = 0; n < nf; n++) {
      const fin = kitValue(c, "mix", "f" + i + "_" + n + "_in", "unk"),
        fsh = kitValue(c, "mix", "f" + i + "_" + n + "_sh", 0.25),
        fer = kitValue(c, "mix", "f" + i + "_" + n + "_er", "unk"),
        fld = kitValue(c, "mix", "f" + i + "_" + n + "_ld", "0");
      funds.push({
        n,
        name: "Fund " + (n + 1),
        kind: fin.v,
        share: +fsh.v,
        erPct: fer.v === "unk" ? null : +fer.v,
        load: fld.v === "unk" ? null : +fld.v / 100,
        inside: fin,
        shareA: fsh,
        er: fer,
        ld: fld,
      });
    }
    const sum = funds.reduce((t, f) => t + f.share, 0),
      wOf = f => (sum > 1 ? f.share / sum : f.share),
      rest = Math.max(0, 1 - sum),
      restPct = fee.v === "unk" ? (MIX_FEE_GUESS[kind] != null ? MIX_FEE_GUESS[kind] : MIX_FEE_GUESS.unk) : +fee.v,
      /* the account's fee: each fund's own (a fund with no fee yet counts none), the rest at the account answer */
      feePct = funds.reduce((t, f) => t + wOf(f) * (f.erPct || 0), 0) + rest * restPct,
      parts = {};
    funds.forEach(f => {
      const p = mixParts(f.kind, g),
        w = wOf(f);
      Object.keys(p).forEach(k => (parts[k] = (parts[k] || 0) + w * p[k]));
    });
    const pr = mixParts(kind, g);
    Object.keys(pr).forEach(k => (parts[k] = (parts[k] || 0) + rest * pr[k]));
    const emp = val("emp", 0),
      big = val("big", 0),
      afee = val("afee", 0),
      tax = val("tax", mixTaxGuess(r.k)),
      holdings = [];
    if (+emp.v > 0) holdings.push({ name: "Your employer's stock", v: amt * +emp.v, kind: "employer" });
    if (kind === "single" && +big.v > 0)
      holdings.push({ name: "One company in " + r.k, v: amt * rest * +big.v, kind: "stock" });
    return {
      i,
      k: r.k,
      amt,
      inside,
      fee,
      kind,
      feePct,
      restPct,
      rest,
      funds: funds.map(f => Object.assign(f, { w: wOf(f) })),
      parts,
      holdings,
      emp,
      big,
      afee,
      tax,
      st: kitState([inside.v === "unk" ? { cf: 1 } : inside, fee.v === "unk" && rest > 0 ? { cf: 1 } : fee]),
    };
  });
}
/* Years until the money reaches the goal, at a yearly rate. Null after 100 years. */
function mixYearsTo(inv, add, goal, rate) {
  if (inv >= goal) return 0;
  let v = inv;
  for (let y = 1; y <= 100; y++) {
    const nv = v * (1 + rate) + add * 12;
    if (nv >= goal) return y - 1 + (goal - v) / Math.max(1e-9, nv - v);
    v = nv;
  }
  return null;
}
function mixCalc(c) {
  const A = mixAccounts(c),
    adv = kitValue(c, "mix", "adv", "0"),
    advPct = +adv.v,
    total = A.reduce((s, a) => s + a.amt, 0),
    g = mixGuide(c.age, c.ret),
    tgt = kitValue(c, "mix", "target", ""),
    /* core/invest.js: the household mix, the three-fund check and concentration, in one function */
    H = ivMix(
      A.map(a => ({ name: a.k, amt: a.amt, parts: a.parts, holdings: a.holdings })),
      { target: tgt.given && tgt.v !== "" ? +tgt.v : null, guide: { stock: g.stock, source: "the age guide" }, money }
    ),
    /* core/invest.js: the fee and product X-ray, every fund and every fee in dollars */
    F = ivFees(
      A.map(a => ({
        name: a.k,
        amt: a.amt,
        accountFee: +a.afee.v || 0,
        funds: a.funds
          .map(f => ({
            name: f.name + " in " + a.k,
            v: a.amt * f.w,
            er: f.erPct == null ? null : f.erPct / 100,
            load: f.load,
          }))
          .concat(
            a.rest > 0
              ? [{ name: a.k + (a.funds.length ? ", the rest" : ""), v: a.amt * a.rest, er: a.restPct / 100 }]
              : []
          ),
      })),
      { advisor: advPct / 100, money }
    ),
    sh = H.shares;
  const stock = H.ready ? H.stock : 0,
    feeYear = F.year,
    avg = total > 0 ? (feeYear / total) * 100 : MIX_FEE_GUESS.unk + advPct,
    add = Math.max(0, (c.take || 0) - (c.spend || 0)),
    yours = cpFv(total, add, MIX_YEARS, R - avg / 100),
    low = cpFv(total, add, MIX_YEARS, R - MIX_LOW / 100),
    d = derive(c),
    yFee = mixYearsTo(total, add, d.fi, R - avg / 100),
    yLow = mixYearsTo(total, add, d.fi, R - MIX_LOW / 100),
    days = yFee == null || yLow == null ? null : Math.round((yFee - yLow) * 365);
  return {
    A,
    adv,
    advPct,
    total,
    guide: g,
    target: tgt,
    H,
    F,
    stock,
    bond: H.ready ? sh.bonds : 0,
    cash: H.ready ? sh.cash : 0,
    other: H.ready ? sh.crypto + sh.realEstate + sh.commodities + sh.other : 0,
    single: H.ready ? sh.single : 0,
    feeYear,
    avg,
    add,
    yours,
    low,
    lost: Math.max(0, low - yours),
    days,
    fi: d.fi,
    st: kitState(
      A.map(a => (a.st === "Guess" ? { cf: 1 } : { cf: a.st === "Exact" ? 3 : 2 })).concat([adv, kitSharp(c, "inv")])
    ),
  };
}
/* Part of knMetrics() in metrics.js. The stock share as a live key number. */
function knMetricsMix(c, add) {
  try {
    const M = mixCalc(c);
    if (!(M.total > 0)) return;
    const gap = M.stock - M.guide.stock;
    add({
      id: "stockshare",
      g: "grow",
      n: "Stock share",
      what: "How much of your invested money is in stocks, next to an age guide.",
      num: M.stock,
      val: knPct(M.stock),
      st: M.st,
      zone:
        Math.abs(gap) <= 0.1
          ? ["Near the age guide", "good"]
          : gap > 0
            ? ["More in stocks than the age guide", "ok"]
            : ["Less in stocks than the age guide", "ok"],
      bar: { p: M.stock * 100, marks: [[M.guide.stock * 100, "Guide " + Math.round(M.guide.stock * 100) + "%"]] },
      rule: [
        "The " +
          M.guide.source +
          ": 90% stocks until 25 years before you stop, then less each year to 50% when you stop, and 30% seven years after.",
        "A guide, not a grade. Your own comfort with ups and downs counts too.",
      ],
      math: [
        "Stocks: " + knPct(M.stock) + " of " + money(M.total),
        "The age guide for " + c.age + " with a stop age of " + c.ret + ": " + knPct(M.guide.stock),
      ],
      moves: [],
      go: ["Open my investment mix", "mix", ""],
    });
  } catch (e) {
    report(e, "mix.js: knMetricsMix");
  }
}
function mixBook(c) {
  const M = mixCalc(c),
    rows = [];
  M.A.forEach(a => {
    rows.push({ id: "mx_amt" + a.i, label: a.k + ": amount", v: a.amt });
    rows.push({
      id: "mx_fee" + a.i,
      label: a.k + ": fee (percent)",
      v: a.feePct,
      note: a.funds.length ? "From its funds, one by one" : a.fee.v === "unk" ? "Guess" : "Your answer",
    });
    rows.push({ id: "mx_afee" + a.i, label: a.k + ": account fee a year", v: +a.afee.v || 0 });
  });
  rows.push({ id: "mx_adv", label: "Advisor fee (percent)", v: M.advPct });
  rows.push({
    id: "mx_total",
    label: "Invested, all accounts",
    v: M.total,
    f: "=" + M.A.map(a => "{mx_amt" + a.i + "}").join("+"),
  });
  rows.push({
    id: "mx_feeyear",
    label: "Fees a year, in dollars",
    v: M.feeYear,
    f:
      "=(" +
      M.A.map(a => "{mx_amt" + a.i + "}*({mx_fee" + a.i + "}+{mx_adv})").join("+") +
      ")/100+" +
      M.A.map(a => "{mx_afee" + a.i + "}").join("+"),
  });
  rows.push({ id: "mx_avg", label: "Average fee (percent)", v: M.avg, f: "={mx_feeyear}/{mx_total}*100" });
  rows.push({ id: "mx_add", label: "Invested each month", v: M.add });
  rows.push({ id: "mx_ret", label: "Growth a year after inflation", v: R });
  rows.push({
    id: "mx_yours",
    label: "Your path after 30 years",
    v: M.yours,
    f: "=FV({mx_ret}-{mx_avg}/100,30,-{mx_add}*12,-{mx_total})",
  });
  rows.push({
    id: "mx_low",
    label: "Low-fee path after 30 years (0.05%)",
    v: M.low,
    f: "=FV({mx_ret}-0.0005,30,-{mx_add}*12,-{mx_total})",
  });
  rows.push({ id: "mx_lost", label: "What the fees take over 30 years", v: M.lost, f: "=MAX(0,{mx_low}-{mx_yours})" });
  rows.push({ id: "mx_stock", label: "Stock share", v: M.stock, note: "From what is inside each account" });
  rows.push({ id: "mx_guide", label: "Age guide stock share", v: M.guide.stock, note: M.guide.source });
  if (M.H.ready) {
    rows.push({
      id: "mx_three",
      label: "Share in the three kinds of a three-fund mix",
      v: M.H.inside,
      note: "US stocks, international stocks, bonds",
    });
    rows.push({
      id: "mx_emp",
      label: "Employer stock, share of all investments",
      v: M.H.conc.employerShare || 0,
      note: "Your taps",
    });
  }
  return { title: "Investment mix and fees", rows };
}
/* One account, behind a closed section: what is inside, its fee, its funds one by one, the sales charge,
   the account fee, the employer's stock, the biggest one company and the tax kind. */
function mixAcctSec(c, a) {
  const ask = (k, label, opts, fb, o) => kitAsk(c, "mix", k + "_" + a.i, label, opts, fb, o || {}),
    fund = f => {
      const fk = (x, label, opts, fb, o) => kitAsk(c, "mix", "f" + a.i + "_" + f.n + "_" + x, label, opts, fb, o || {});
      return (
        `<div class="tile stack" style="gap:6px"><div class="row between" style="gap:8px"><b class="small">${esc(f.name)}</b>${f.n === a.funds.length - 1 ? `<button class="ghost slim" data-a="mixfdel" data-v="${a.i}" aria-label="Remove ${esc(f.name)}">Remove</button>` : ""}</div>` +
        fk("in", "What is inside this fund?", MIX_INSIDE, f.kind, { term: "mx_" + f.kind }) +
        fk("sh", "Its share of the account", MIX_SHARE, f.share) +
        fk("er", "Its fee a year (expense ratio)", MIX_FEES, f.er.v, {
          term: "expense",
          help: f.erPct == null ? "No fee yet: the fund page lists it. Until then it counts no fee." : "",
        }) +
        fk("ld", "A sales charge when you buy (load)", MIX_LOADS, f.ld.v, { term: "load" }) +
        `</div>`
      );
    };
  const body =
    ask("in", a.funds.length ? "What is inside the rest?" : "What is inside?", MIX_INSIDE, a.inside.v, {
      term: "mx_" + a.kind,
    }) +
    ask("fee", a.funds.length ? "The fee of the rest, a year" : "Its fee a year", MIX_FEES, a.fee.v, {
      term: "expense",
      help:
        a.fee.v === "unk"
          ? "The game uses " + a.restPct + "% for now. The fee is on the fund page as the expense ratio."
          : "",
    }) +
    `<div class="stack" style="gap:6px">${a.funds.map(fund).join("")}</div>` +
    (a.funds.length < MIX_FUNDS
      ? `<button class="ghost slim" data-a="mixfadd" data-v="${a.i}">Add a fund, one by one</button>`
      : "") +
    ask("afee", "An account fee a year, in dollars", MIX_AFEE, +a.afee.v) +
    ask("emp", "How much of it is your employer's stock?", MIX_EMP, +a.emp.v, { term: "empstock" }) +
    (a.kind === "single" ? ask("big", "The biggest one company, of these single stocks", MIX_EMP, +a.big.v) : "") +
    ask("tax", "What kind of account is it for taxes?", MIX_TAX, a.tax.v, { term: "taxkind" });
  return dkSec("mixa" + a.i, "▤", a.k, "What is inside, its funds and fees", money(a.amt), body);
}
function mixSheet() {
  const c = C(),
    M = mixCalc(c),
    H = M.H,
    F = M.F,
    P = v => Math.round(v * 100) + "%",
    guess = M.st === "Guess";
  const donut = H.ready
    ? dkDonut(
        IV_CLASSES.filter(k => H.dollars[k[0]] > 0.5).map(k => ({ l: k[1], v: H.dollars[k[0]] })),
        { label: "Your mix, all accounts", center: P(H.stock) + " stocks", amt: true }
      )
    : "";
  const mixCard = dkCard(
    "Your mix, all accounts",
    donut +
      `<div class="stack" style="gap:4px">${H.lines
        .slice(0, 2)
        .map(t => `<div class="small">${esc(t)}</div>`)
        .join("")}</div>` +
      kitAsk(c, "mix", "target", "Your target stock share", MIX_TARGET, M.target.v, {
        help: "The age guide is the " + M.guide.source + ", set to your stop age of " + c.ret + ".",
      }),
    { right: dkPill(M.st), cap: "Every account added up by what is inside." }
  );
  const threeCard = dkCard(
    "Three-fund check",
    H.ready
      ? `<div class="stack" style="gap:6px">${H.three
          .map(
            t =>
              `<div class="row between small" style="gap:8px"><span>${esc(t.label)}</span><b>${t.share > 0 ? P(t.share) : t.maybe ? "maybe, inside a broad fund" : "none yet"}</b></div>`
          )
          .join(
            ""
          )}${H.outside.length ? `<div class="tiny muted">Outside the three: ${esc(H.outside.map(o => o.label + " " + P(o.share)).join(", "))}.</div>` : `<div class="tiny muted">Nothing sits outside the three.</div>`}</div>` +
          `<div class="tiny muted" style="margin-top:6px">A plain comparison with the three kinds a three-fund mix holds. Not advice: many mixes fit a plan. Source: ${esc(IV_SOURCES.threeFund)}.</div>`
      : `<div class="small muted">Tap what is inside an account below to see this.</div>`,
    { cap: "What you hold next to a three-fund mix." }
  );
  const C1 = H.conc,
    oneCard = dkCard(
      "One company",
      `<div class="stack" style="gap:6px"><div class="row between small"><span>Your employer's stock</span><b>${C1.employerShare ? P(C1.employerShare) + " · " + money(Math.round(C1.employer)) : "none on file"}</b></div>` +
        (C1.biggest
          ? `<div class="row between small"><span>The biggest one company</span><b>${P(C1.biggest.share)}</b></div>`
          : "") +
        (C1.single > 0
          ? `<div class="row between small"><span>Single company stocks, all together</span><b>${P(C1.single)}</b></div>`
          : "") +
        C1.over
          .map(o =>
            esc(
              (o.employer ? "Your employer's stock" : o.name) +
                " is " +
                P(o.share) +
                " of all your investments. " +
                (o.employer
                  ? "Your pay and these shares then ride on one company."
                  : "One company can rise or fall a long way on its own.")
            )
          )
          .map(t => `<div class="tile small">${t}</div>`)
          .join("") +
        `<div class="tiny muted">The line is ${P(IV_RULES.oneStock)} of all your investments. Source: ${esc(IV_SOURCES.oneStock)}.</div></div>`,
      { cap: "Employer stock and any one company, of everything invested." }
    );
  const feeCard = dkCard(
    "Every fund and fee",
    `<div class="stack" style="gap:4px">${F.rows
      .map(
        r =>
          r.funds
            .map(
              f =>
                `<div class="row between small" style="gap:8px"><span style="min-width:0;overflow-wrap:anywhere">${esc(f.name)}</span><b>${f.year == null ? "no fee yet" : money(Math.round(f.year)) + " a year"}</b></div>`
            )
            .join("") +
          (r.accountFee
            ? `<div class="row between small"><span>${esc(r.name)}: account fee</span><b>${money(r.accountFee)} a year</b></div>`
            : "") +
          (r.advisor
            ? `<div class="row between small"><span>${esc(r.name)}: advisor fee</span><b>${money(Math.round(r.advisor))} a year</b></div>`
            : "")
      )
      .join(
        ""
      )}</div>${F.loads.map(f => `<div class="tile small">${esc(f.name)} has a sales charge of ${(f.load * 100).toFixed(2)}%: of each ${money(1000)} put in, ${money(Math.round(f.per1000))} goes to the charge.</div>`).join("")}` +
      (F.missing.length
        ? `<div class="tiny muted">No fee yet for ${esc(F.missing.join(", "))}. The fund page lists it as the expense ratio.</div>`
        : "") +
      `<div class="row wrap" style="gap:8px;margin-top:6px"><button class="ghost slim" data-a="compare" data-v="fee">Open the Fee X-ray</button><button class="ghost slim" data-a="xray">Insurance or a product: Product X-ray</button></div>`,
    { cap: "The fee and product X-ray: each fund, its fee in dollars, and the charges on top." }
  );
  return (
    head("Plan", "Investment mix and fees") +
    dkCaption(
      "Every account added up: what is inside, what it costs you a year, and how it sits next to a three-fund mix."
    ) +
    dkStatRow([
      dkTile("Stocks", H.ready ? P(H.stock) : "No mix yet", {
        sub: H.aim ? "target " + P(H.aim.stock) : "",
        guess,
      }),
      dkTile("Fees a year", money(Math.round(M.feeYear)), {
        sub: "about " + Math.round(M.avg * 100) / 100 + "% of " + money(M.total),
        guess,
      }),
      dkTile("Fees over 30 years", money(Math.round(M.lost)), {
        sub:
          /* with nothing invested yet, the 30 years are on what you add each month (Krug walk, Nov 26 2026) */
          (M.total > 0 ? "" : "on the " + money(Math.round(M.add)) + " a month you add, ") +
          (M.days != null && M.days > 0
            ? "about " + M.days.toLocaleString() + " days later to freedom"
            : "no change to your freedom date"),
        guess,
      }),
      H.ready ? dkTile("In the three kinds", P(H.inside), { sub: "of a three-fund mix", guess }) : "",
    ]) +
    `<div class="stack" style="gap:10px">${mixCard}${threeCard}${oneCard}` +
    `<div class="small muted">Tap what is inside each account and what it costs. "I don't know" is fine. It shows as a guess.</div>` +
    M.A.map(a => mixAcctSec(c, a)).join("") +
    kitAsk(c, "mix", "adv", "An advisor fee on top, a year", MIX_ADVISOR, M.adv.v, { term: "advfee" }) +
    feeCard +
    kitColumns([
      {
        title: "Your path, " + Math.round(M.avg * 100) / 100 + "% a year",
        big: money(Math.round(M.yours)),
        guess,
        foot: "after 30 years, in today's dollars",
      },
      {
        title: "The low-fee path, " + MIX_LOW + "% a year",
        big: money(Math.round(M.low)),
        hot: true,
        foot: "the same money in a low-cost index fund",
      },
    ]) +
    `<div class="tiny muted">Age guide: the ${esc(M.guide.source)}, set to your stop age of ${c.ret}.</div>` +
    `<div class="row wrap" style="gap:8px"><button class="ghost slim" data-a="ivheat">Invest or pay debt</button><button class="ghost slim" data-a="ivroth">Roth or traditional, by account</button></div>` +
    mathBox(
      H.math
        .concat(F.math)
        .concat([
          "Fees a year: each fund x its fee, plus each account fee, plus the advisor fee of " +
            M.advPct +
            "% on each account = " +
            money(Math.round(M.feeYear)) +
            ".",
          "30 years: start with " +
            money(M.total) +
            ", add " +
            money(M.add) +
            " a month, grow 7% minus the fee each year. The same sum as the Fee X-ray.",
          "Days of freedom: the years until you reach " +
            money(Math.round(M.fi)) +
            " at your fee, minus the years at " +
            MIX_LOW +
            "%, × 365.",
          "Growth of 7% a year after inflation is a long-run average, not a promise.",
        ])
    ) +
    `</div>`
  );
}
kitTerms({
  expense: [
    "Fund fee (expense ratio)",
    "What a fund charges each year, as a percent of what you have in it. It comes out quietly, so you never see a bill.",
  ],
  advfee: [
    "Advisor fee",
    "What an advisor charges each year, often about 1% of what they manage, on top of the fund fees.",
  ],
  mx_td: ["Target-date fund", "One fund that holds stocks and bonds and moves toward bonds as its year gets close."],
  mx_sp: ["S&P 500 or total market fund", "One fund that holds the biggest US companies, or all of them. All stocks."],
  mx_bond: ["Bond fund", "Loans to governments and companies. Steadier than stocks, and lower growth."],
  mx_cash: ["Cash", "Money market or cash inside the account. Safe, and it grows slowly."],
  mx_single: ["Single stocks", "Shares of one company at a time. One company can rise or fall a long way."],
  mx_crypto: ["Crypto", "Digital coins such as bitcoin. Prices can swing a long way in a short time."],
  mx_intl: ["International stock fund", "One fund that holds companies outside the US, often thousands of them."],
  load: [
    "Sales charge (load)",
    "A cut some funds take when you buy, as a percent of what you put in. A 5.75% load keeps $57.50 of each $1,000.",
  ],
  empstock: [
    "Employer stock",
    "Shares of the company you work for, often from a stock plan or a match. Your pay already rides on that company.",
  ],
  taxkind: [
    "Tax kind",
    "Pre-tax (traditional) money gets a tax break now and is taxed when taken out. Roth is taxed now and tax-free later. A regular account has neither.",
  ],
  mx_unk: [
    "Not sure what is inside",
    "The account's app or statement lists its holdings. Until then the game uses the age guide.",
  ],
});
kitScreen(
  "mix",
  "Investment mix and fees",
  "What is inside each account, and what it costs you a year.",
  "It puts your path next to the low-fee path."
);
Object.assign(ACT, {
  mix: () => {
    W = { kind: "mix", o: {} };
    sheet(mixSheet);
  },
  /* add or remove one fund of an account (up to MIX_FUNDS) */
  mixfadd: t => {
    const S = kitStore(C(), "mix"),
      k = "nf_" + t.dataset.v;
    S[k] = { v: Math.min(MIX_FUNDS, ((S[k] && S[k].v) || 0) + 1), cf: 3 };
    kitRedraw();
  },
  mixfdel: t => {
    const S = kitStore(C(), "mix"),
      k = "nf_" + t.dataset.v,
      n = Math.max(0, ((S[k] && S[k].v) || 0) - 1);
    ["in", "sh", "er", "ld"].forEach(x => delete S["f" + t.dataset.v + "_" + n + "_" + x]);
    S[k] = { v: n, cf: 3 };
    kitRedraw();
  },
});
kitMenu("Investment mix and fees", "mix", "Your stock share and what your fees cost, in dollars and days", "cover");
