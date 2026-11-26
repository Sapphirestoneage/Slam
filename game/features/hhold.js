/* ============================================================================
   SLAM the Game: features/hhold.js
   PURPOSE     Households together (run Finish everything partly built, Part 12). One sheet in the new
               look, for any number of people by their own names: (1) Same question: everyone answers
               the same money questions on one phone (pass it round) or each on their own phone (an
               answer code), and the answers that differ become talk points. (2) FI together: each
               person's FI number and date side by side, with the gap. (3) A shared home: what each
               person put in and pays, and their part of the equity. (4) When only two can marry: the
               federal tax gap for each pair. (5) Share by email: pick what each person sees; the
               email is a draft the person sends.
   INPUT       The game: G.hhx (the answers of this sheet), G.chars, G.fair (the people of Sharing
               costs fairly), G.hh.sample (the made-up household of Our household). derive(c), freeAt(c)
               (the game's FI number and date), taxvInputs(c) (pay before tax), retireTax (the 2026
               federal tables). The open sheet (W.kind): hhx.
   OUTPUT      Math: hxS, hxPeople, hxSq, hxFi, hxHome, hxMarry, hxItems, hxDraftFor, hxBook,
               hxDateStep, hxRead. Views: hhxSheet, hxSqCard, hxFiCard, hxHomeCard, hxMarryCard,
               hxMailCard, hxAmt, hxPerson, hxPartnerLink, hxSheetRow. Actions (ACT): hhx, hxsample, hxed, hxwho, hxans, hxshow,
               hxcodecopy, hxpaste, hxset, hxpad, hxtyped, hxgame, hxstep, hxfair, hxmto, hxpick,
               hxmail, hxcopy. Menu: "Households together".
   DEPENDS ON  core/hhold.js (the math: hhCompare, hhCode, hhReadCode, hhFiTogether, hhEquity,
               hhMarryGap, hhDraft), core/engine.js (derive, todayISO), screens/ui.js (money, esc,
               head, mathBox, save, drawSheet, freeAt, keypad), screens/dash.js (dkCaption, dkStatRow,
               dkTile, dkSec, dkDonut, dkProgress, dkPill, dkCard), features/fair.js (frPpl, frState,
               frCalc, frDefaultTotal), features/house.js (hsGet, hsPeople, hsSum, HS_SAMPLE),
               features/taxview.js (taxvInputs, TAXV_PAY), features/retire.js (retireTax),
               features/kit.js (kitMenu, kitScreen, kitTerms).
   RULES       The math is in core/hhold.js. The views show what it returns. No score and no right
               answer: a difference is a talk point. People by their own names. Nothing is sent: the
               email is a draft in the person's own mail app, and an item not picked for a person is not
               in their draft. The made-up household changes no real profile.
   STORED      G.hhx = { sq: { [name]: { [question id]: index } }, as: name, show, codes: [names],
               fi: { [name]: { fi, date: "YYYY-MM" } }, home: { value, owed, ppl: { [name]: { put,
               monthly, months } } }, gross: { [name]: pay a year }, mail: { [name]: { to, picks } },
               mto: name }.
   ========================================================================= */
const HX_FI = [500000, 750000, 1000000, 1500000, 2000000, 3000000];
const HX_VALUE = [200000, 300000, 400000, 500000, 750000, 1000000];
const HX_OWED = [0, 100000, 200000, 300000, 400000, 600000];
const HX_PUT = [0, 10000, 25000, 50000, 100000];
const HX_MONTHLY = [0, 500, 1000, 1500, 2000, 3000];
const HX_MONTHS = [
  [12, "1 year"],
  [24, "2 years"],
  [36, "3 years"],
  [60, "5 years"],
  [120, "10 years"],
];
const HX_MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* ---------- the state and the people ---------- */
function hxS() {
  const s = G.hhx && typeof G.hhx === "object" ? G.hhx : {};
  const o = v => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
  return {
    sq: o(s.sq),
    as: s.as || null,
    show: !!s.show,
    codes: Array.isArray(s.codes) ? s.codes : [],
    fi: o(s.fi),
    home: Object.assign({ value: null, owed: null }, o(s.home), { ppl: o(o(s.home).ppl) }),
    gross: o(s.gross),
    mail: o(s.mail),
    mto: s.mto || null,
  };
}
function hxPut(patch) {
  G.hhx = Object.assign(hxS(), patch);
  save();
}
/* The people: the made-up household of Our household, else the people of Sharing costs fairly. */
function hxPeople() {
  const sample = typeof hsGet === "function" && hsGet().sample;
  if (sample) return HS_SAMPLE.map(p => ({ n: p.n, c: null, sample: true }));
  const P = typeof frPpl === "function" ? frPpl() : [];
  return P.map(p => ({ n: String(p.n), c: p.linked ? G.chars[p.from] : null, sample: false }));
}
const hxNow = () => todayISO().slice(0, 7);
function hxAddYm(ym, n) {
  const [y, m] = ym.split("-").map(Number),
    t = y * 12 + (m - 1) + Math.round(n);
  return Math.floor(t / 12) + "-" + String((t % 12) + 1).padStart(2, "0");
}
const hxYmWords = ym => (ym ? HX_MON[+ym.slice(5, 7) - 1] + " " + ym.slice(0, 4) : "");
function hxDur(m) {
  if (m == null) return "";
  const a = Math.abs(Math.round(m)),
    y = Math.floor(a / 12),
    mo = a % 12;
  if (!y && !mo) return "the same month";
  return [y ? y + (y === 1 ? " year" : " years") : "", mo ? mo + (mo === 1 ? " month" : " months") : ""]
    .filter(Boolean)
    .join(" ");
}

/* ---------- 1. Same question ---------- */
/* Everyone who answers: the people, then the names that came by an answer code. */
function hxSq() {
  const S = hxS(),
    names = hxPeople().map(p => p.n);
  S.codes.forEach(n => {
    if (!names.includes(n)) names.push(n);
  });
  const people = names.map(n => ({ n, a: S.sq[n] || {} })),
    K = hhCompare(people),
    done = people.map(p => ({ n: p.n, k: HH_QUESTIONS.filter(q => hhAnswerOk(q, p.a[q.id])).length })),
    all = done.length >= 2 && done.every(d => d.k === HH_QUESTIONS.length);
  return { people, K, done, all, open: S.show || all };
}
const hxOpt = (q, i) => (q.money ? money(q.opts[i]) : q.opts[i]);
/* Part of gdDateSteps() in guild.js: the talk points go on the agenda of the monthly money date. */
function hxDateStep() {
  const R = hxSq();
  if (!R.K.talk.length) return null;
  return {
    t: "Talk points from Same question",
    l: R.K.talk.slice(0, 3).map(r => {
      const q = hhQuestion(r.id);
      return q.q + ": " + r.picks.map(x => x.n + " " + hxOpt(q, x.i)).join(", ");
    }),
  };
}

/* ---------- 2. FI together ---------- */
/* The game's own FI number and date of a person with a profile. */
function hxRead(c) {
  if (!c) return null;
  try {
    const d = derive(c),
      at = freeAt(c);
    return { fi: d.fi > 0 ? Math.round(d.fi) : null, date: at == null ? null : hxAddYm(hxNow(), at) };
  } catch (e) {
    report(e, "hhold.js: hxRead");
    return null;
  }
}
function hxFi() {
  const S = hxS();
  return hhFiTogether(
    hxPeople().map(p => {
      const v = S.fi[p.n] || {};
      return { n: p.n, fi: v.fi == null ? null : v.fi, date: v.date || null };
    }),
    hxNow()
  );
}

/* ---------- 3. A shared home, and when only two can marry ---------- */
function hxHome() {
  const S = hxS();
  return hhEquity({
    value: S.home.value,
    owed: S.home.owed,
    people: hxPeople().map(p => Object.assign({ n: p.n }, S.home.ppl[p.n] || {})),
  });
}
/* The federal tax a year from the game's 2026 tables (the retirement engine), single or joint. */
const hxTax = (gross, status) => retireTax(gross, 0, status === "joint" ? "joint" : "single", "", 40).federal;
function hxMarry() {
  const S = hxS(),
    P = hxPeople().map(p => ({ n: p.n, gross: S.gross[p.n] == null ? null : S.gross[p.n] }));
  return typeof retireTax === "function" ? hhMarryGap(P, hxTax) : { ready: false, pairs: [], missing: [] };
}

/* ---------- 4. Share by email ---------- */
/* Everything a draft can hold, each as lines of text. Built from the numbers the sheets already show. */
function hxItems() {
  const out = [],
    P = typeof hsPeople === "function" ? hsPeople() : [],
    H = P.length >= 2 ? hsSum(P) : null;
  if (H)
    out.push({
      id: "month",
      label: "Our month together",
      lines: [
        "Comes in: " + money(H.inc) + " a month",
        "Goes out: " + money(H.spend) + " a month",
        (H.left >= 0 ? "Left over: " : "Short: ") + money(Math.abs(H.left)) + " a month",
      ],
    });
  if (H)
    out.push({
      id: "worth",
      label: "What we have together",
      lines: ["Cash: " + money(H.cash), "Invested: " + money(H.inv), "Owed: " + money(H.debt)],
    });
  P.forEach(p =>
    out.push({
      id: "p:" + p.n,
      label: p.n + "'s own numbers",
      lines: ["Brings in " + money(p.inc) + " a month", "Spends " + money(p.spend || 0) + " a month"],
    })
  );
  const F = hxFi();
  if (F.rows.some(r => r.fi != null || r.date != null))
    out.push({
      id: "fi",
      label: "FI together",
      lines: F.rows
        .map(
          r =>
            r.n +
            ": " +
            (r.fi != null ? money(r.fi) : "no number yet") +
            (r.date ? " by " + hxYmWords(r.date) : ", no date yet")
        )
        .concat(
          F.numbers.ready ? ["The gap in the number: " + money(F.numbers.gap)] : [],
          F.dates.ready ? ["The gap in time: " + hxDur(F.dates.gap)] : []
        ),
    });
  const R = hxSq();
  if (R.open && R.K.talk.length)
    out.push({
      id: "talk",
      label: "Our talk points",
      lines: R.K.talk.map(r => {
        const q = hhQuestion(r.id);
        return q.q + " (" + r.picks.map(x => x.n + ": " + hxOpt(q, x.i)).join(", ") + ")";
      }),
    });
  const E = hxHome();
  if (E.ready)
    out.push({
      id: "home",
      label: "Our shared home",
      lines: ["Equity: " + money(E.equity)].concat(
        E.rows.map(
          r => r.n + " put in " + money(r.paid) + ", " + Math.round(r.share * 100) + "% of all, " + money(r.byPaid)
        )
      ),
    });
  const M = hxMarry();
  if (M.ready)
    out.push({
      id: "marry",
      label: "If two of us marry (federal tax a year)",
      lines: M.pairs.map(x => x.names.join(" and ") + ": " + hxGapWords(x.gap)),
    });
  return out;
}
/* The picks of one person: their own, else the first ones (the month, FI, the talk points, their own numbers). */
function hxPicksOf(name) {
  const m = hxS().mail[name];
  if (m && m.picks && typeof m.picks === "object") return m.picks;
  const o = { month: true, fi: true, talk: true };
  o["p:" + name] = true;
  return o;
}
function hxDraftFor(name) {
  const m = hxS().mail[name] || {},
    me = typeof C === "function" && !G.demo && C() ? String(C().name || "") : "";
  return hhDraft({ items: hxItems(), picks: hxPicksOf(name), to: m.to || "", who: name, from: me });
}
function hxGapWords(g) {
  return Math.abs(g) < 1
    ? "about the same"
    : money(Math.abs(Math.round(g))) + (g > 0 ? " more a year" : " less a year");
}

/* The spreadsheet of the plan: the FI gap and the equity of the shared home, each with its formula. */
function hxBook() {
  const F = hxFi(),
    E = hxHome(),
    rows = [];
  if (F.numbers.ready) {
    rows.push({ id: "hx_fi_hi", label: "The largest FI number (" + F.numbers.high.n + ")", v: F.numbers.high.fi });
    rows.push({ id: "hx_fi_lo", label: "The smallest FI number (" + F.numbers.low.n + ")", v: F.numbers.low.fi });
    rows.push({ id: "hx_fi_gap", label: "The gap in the FI number", v: F.numbers.gap, f: "={hx_fi_hi}-{hx_fi_lo}" });
  }
  if (F.dates.ready)
    rows.push({
      id: "hx_fi_months",
      label: "The gap in FI dates, months",
      v: F.dates.gap,
      note: F.dates.latest.n + " " + hxYmWords(F.dates.latest.date) + " less " + F.dates.earliest.n,
    });
  if (E.ready) {
    rows.push({ id: "hx_value", label: "The shared home: worth today", v: E.value });
    rows.push({ id: "hx_owed", label: "The shared home: loan left", v: E.owed });
    rows.push({ id: "hx_equity", label: "The shared home: equity", v: E.equity, f: "={hx_value}-{hx_owed}" });
    E.rows.forEach((r, i) => {
      rows.push({ id: "hx_put" + i, label: r.n + ": put in at the start", v: r.put || 0 });
      rows.push({ id: "hx_mo" + i, label: r.n + ": a month toward it", v: r.monthly || 0 });
      rows.push({ id: "hx_n" + i, label: r.n + ": months paid", v: r.months || 0 });
      rows.push({
        id: "hx_paid" + i,
        label: r.n + ": put in, all of it",
        v: r.paid,
        f: "={hx_put" + i + "}+{hx_mo" + i + "}*{hx_n" + i + "}",
      });
    });
    rows.push({
      id: "hx_paid",
      label: "Everyone, put in",
      v: E.total,
      f: "=" + E.rows.map((r, i) => "{hx_paid" + i + "}").join("+"),
    });
    E.rows.forEach((r, i) =>
      rows.push({
        id: "hx_part" + i,
        label: r.n + ": part of the equity, by what they put in",
        v: r.byPaid,
        f: "={hx_equity}*{hx_paid" + i + "}/{hx_paid}",
      })
    );
  }
  return { title: "Households together", rows };
}

/* ---------- views ---------- */
kitTerms({
  hxsame: [
    "Same question",
    "Everyone answers the same money question. Where the answers differ, it becomes a talk point. There is no score and no right answer.",
  ],
  hxequity: [
    "Equity",
    "What the home is worth today less the loan left on it. It is the part of the home that is yours together.",
  ],
  hxmarry: [
    "Marriage penalty or bonus",
    "Married people file one federal return together, with brackets about twice as wide. Some pairs pay more tax that way (a penalty), some pay less (a bonus). Only two people can be married to each other.",
  ],
});
kitScreen(
  "hhx",
  "Households together",
  "Money questions everyone answers, FI numbers side by side, a shared home and an email you send yourself.",
  "For a couple, a polycule, housemates or a chosen family, by your own names."
);
/* A money answer by taps: the chips, the game's own value, and the keypad. k: the key of the answer. */
function hxAmt(label, k, opts, cur, o) {
  o = o || {};
  const pk = "hxk_" + k.replace(/:/g, "_"),
    open = W && W.pad === pk;
  return `<div class="field"><div class="small">${esc(label)}</div><div class="val ${cur == null ? "muted" : ""}">${cur == null ? "Not in yet" : money(cur)}</div><div class="chips">${opts
    .map(
      v =>
        `<button class="chip sm ${cur === v[0] ? "on" : ""}" data-a="hxset" data-k="${k}" data-v="${v[0]}">${esc(v[1])}</button>`
    )
    .join(
      ""
    )}${o.game != null ? `<button class="chip sm" data-a="hxset" data-k="${k}" data-v="${o.game}">Use the game's: ${money(o.game)}</button>` : ""}<button class="chip sm know ${open ? "on" : ""}" data-a="hxpad" data-k="${k}">Type it</button></div>${open ? `<div class="val">${money((W.o && W.o[pk]) || 0)}</div>${keypad(pk)}<div class="row" style="gap:8px"><button class="primary slim" data-a="hxtyped" data-k="${k}">Use this number</button><button class="ghost slim" data-a="padclose">Cancel</button></div>` : ""}${o.help ? `<div class="tiny muted">${esc(o.help)}</div>` : ""}</div>`;
}
const hxM = list => list.map(v => [v, money(v)]);
/* One person at a time (slim by default): a row with what is in and a Change button; the open one shows its taps. */
function hxPerson(key, name, sum, body) {
  return W && W.hxed === key
    ? `<div class="tile stack" style="gap:6px"><div class="row between"><b>${esc(name)}</b><button class="ghost slim" data-a="hxed" data-v="">Done</button></div>${body}</div>`
    : `<div class="row between small" style="gap:8px;min-height:44px"><span><b>${esc(name)}</b> <span class="muted">${esc(sum)}</span></span><button class="ghost slim" data-a="hxed" data-v="${esc(key)}">Change</button></div>`;
}
function hxSqCard() {
  const S = hxS(),
    R = hxSq(),
    as = R.people.some(p => p.n === S.as) ? S.as : R.people.length ? R.people[0].n : null,
    mine = (as && S.sq[as]) || {},
    W1 = W || {};
  const who = `<div class="small">Who is answering now? Pass the phone, or each of you answers on your own phone.</div><div class="chips">${R.people
    .map(
      (p, i) =>
        `<button class="chip ${p.n === as ? "on" : ""}" data-a="hxwho" data-v="${i}">${esc(p.n)} · ${R.done[i].k} of ${HH_QUESTIONS.length}</button>`
    )
    .join("")}</div>`;
  const qs = as
    ? HH_QUESTIONS.map(
        q =>
          `<div class="tile stack" style="gap:6px"><b class="small">${esc(q.q)}</b><div class="chips">${q.opts
            .map(
              (o, i) =>
                `<button class="chip sm ${mine[q.id] === i ? "on" : ""}" data-a="hxans" data-k="${q.id}" data-v="${i}">${esc(hxOpt(q, i))}</button>`
            )
            .join("")}</div></div>`
      ).join("")
    : "";
  const res = !R.open
    ? `<div class="tile small">The answers stay hidden until everyone has answered, so nobody leans on anyone. <button class="ghost slim" data-a="hxshow">Show what we have so far</button></div>`
    : !R.K.ready
      ? `<div class="tile small">Two people need to answer the same question first.</div>`
      : `<div class="row" style="gap:6px;flex-wrap:wrap">${dkPill(R.K.same + " the same", "okp")}${dkPill(R.K.near + " close")}${dkPill(R.K.apart + " further apart")}${R.K.open ? dkPill(R.K.open + " still open") : ""}</div>${
          R.K.talk.length
            ? `<b class="small">Talk points</b><div class="stack" style="gap:6px">${R.K.talk
                .map(r => {
                  const q = hhQuestion(r.id);
                  return `<div class="tile stack" style="gap:4px"><b class="small">${esc(q.q)}</b><div class="small">${r.picks.map(x => `${esc(x.n)}: <b>${esc(hxOpt(q, x.i))}</b>`).join(" · ")}</div><div class="tiny muted">${esc(q.talk)}</div></div>`;
                })
                .join(
                  ""
                )}</div><div class="tiny muted">These go on the agenda of your guild's monthly money date too.</div>`
            : `<div class="tile small">Everyone who answered picked the same on every question so far.</div>`
        }`;
  const code = as ? hhCode(as, mine) : "";
  const phones = `<details class="math"><summary>Answer on two phones</summary><div class="inner stack" style="gap:6px"><div class="tiny muted">Answer on your own phone, then send your code in any chat. On the other phone, paste it here. Only the answers travel, no money numbers.</div>${as ? `<div class="tile tiny" style="word-break:break-all">${esc(code)}</div><button class="ghost slim" data-a="hxcodecopy">${W1.copied === "code" ? "Copied ✓" : "Copy " + esc(as) + "'s code"}</button>` : ""}<label class="small" for="hxpastebox">Paste their code</label><textarea id="hxpastebox" rows="2" style="font:inherit;width:100%;min-height:44px;font-size:16px;border:2px solid var(--muted);background:var(--ink);color:var(--text);border-radius:10px;padding:8px 12px" placeholder="SLAM-SQ1 ..."></textarea><button class="ghost slim" data-a="hxpaste">Add their answers</button>${W1.msgx ? `<div class="tiny">${esc(W1.msgx)}</div>` : ""}</div></details>`;
  return dkSec(
    "hx-same",
    "?",
    "Same question",
    "Everyone answers, then see where you differ",
    R.K.ready && R.open ? String(R.K.talk.length) : "",
    who + `<div class="stack" style="gap:6px">${qs}</div>` + res + phones,
    [
      "Each question has options in order. Two picks next to each other are close; further apart, or any different pick on a question with no order (how bills are split), is a talk point.",
      "The talk points are listed the furthest apart first. Nobody is scored.",
    ]
  );
}
function hxFiCard() {
  const S = hxS(),
    P = hxPeople(),
    F = hxFi();
  const rows = P.map((p, i) => {
    const v = S.fi[p.n] || {},
      g = hxRead(p.c),
      d = v.date || null;
    return hxPerson(
      "fi:" + i,
      p.n,
      (v.fi == null ? "no number yet" : money(v.fi)) + ", " + (d ? hxYmWords(d) : "no date yet"),
      `${hxAmt("FI number", "fi:" + i, hxM(HX_FI), v.fi == null ? null : v.fi, { game: g && g.fi != null ? g.fi : null })}<div class="field"><div class="small">FI date</div><div class="val ${d ? "" : "muted"}">${d ? hxYmWords(d) : "Not in yet"}</div><div class="row wrap" style="gap:6px"><button class="ghost slim" data-a="hxstep" data-k="${i}" data-v="-12" aria-label="One year sooner">- 1 year</button><button class="ghost slim" data-a="hxstep" data-k="${i}" data-v="12" aria-label="One year later">+ 1 year</button><button class="ghost slim" data-a="hxstep" data-k="${i}" data-v="-1" aria-label="One month sooner">- 1 month</button><button class="ghost slim" data-a="hxstep" data-k="${i}" data-v="1" aria-label="One month later">+ 1 month</button>${g && g.date ? `<button class="chip sm" data-a="hxgame" data-k="${i}">Use the game's: ${hxYmWords(g.date)}</button>` : ""}</div></div>`
    );
  }).join("");
  const top = Math.max(1, ...F.rows.map(r => r.fi || 0));
  const side =
    F.numbers.ready || F.dates.ready
      ? `<b class="small">Side by side</b><div class="stack" style="gap:6px">${F.rows
          .map(
            r =>
              `<div><div class="row between small"><span>${esc(r.n)}</span><b>${r.fi != null ? money(r.fi) : "no number yet"}${r.date ? " · " + hxYmWords(r.date) : ""}</b></div>${r.fi != null ? dkProgress((r.fi / top) * 100) : ""}</div>`
          )
          .join(
            ""
          )}</div><div class="tile small">${F.numbers.ready ? "The gap in the number: <b>" + money(F.numbers.gap) + "</b>. " : ""}${F.dates.ready ? "The gap in time: <b>" + hxDur(F.dates.gap) + "</b>, from " + esc(F.dates.earliest.n) + " to " + esc(F.dates.latest.n) + "." : ""}</div><div class="tiny muted">A gap is a talk point: what does each of you picture in that life, and when?</div>`
      : `<div class="tile small">When two people have a number or a date, they show here side by side with the gap.</div>`;
  return dkSec(
    "hx-fi",
    "◎",
    "FI together",
    "Each person's FI number and date, and the gap",
    F.dates.ready ? hxDur(F.dates.gap) : F.numbers.ready ? money(F.numbers.gap) : "",
    rows + side,
    [
      "Each person writes their own number and date, or uses the game's: 25 times a year of their spending, and the month the game's plan reaches it.",
      "The gap in the number: the largest number less the smallest.",
      "The gap in time: the latest date less the earliest, in months.",
    ]
  );
}
function hxHomeCard() {
  const S = hxS(),
    P = hxPeople(),
    E = hxHome();
  const top =
    hxAmt("What the home is worth today", "home:value", hxM(HX_VALUE), S.home.value) +
    hxAmt("The loan left on it", "home:owed", hxM(HX_OWED), S.home.owed, { help: "Tap $0 when there is no loan." });
  const ppl = P.map((p, i) => {
    const v = S.home.ppl[p.n] || {};
    return hxPerson(
      "home:" + i,
      p.n,
      v.put == null && v.monthly == null
        ? "nothing in yet"
        : "put in " +
            money(v.put || 0) +
            ", " +
            money(v.monthly || 0) +
            " a month" +
            (v.months ? " for " + v.months + " months" : ""),
      `${hxAmt("Put in at the start", "put:" + i, hxM(HX_PUT), v.put == null ? null : v.put, { help: "The down payment, closing costs or a big repair." })}${hxAmt("Pays toward it each month", "monthly:" + i, hxM(HX_MONTHLY), v.monthly == null ? null : v.monthly)}<div class="field"><div class="small">For how long so far</div><div class="chips">${HX_MONTHS.map(m => `<button class="chip sm ${v.months === m[0] ? "on" : ""}" data-a="hxset" data-k="months:${i}" data-v="${m[0]}">${m[1]}</button>`).join("")}</div></div>`
    );
  }).join("");
  const fair = P.some(p => p.sample)
    ? ""
    : `<button class="ghost wide slim" data-a="hxfair">Use each person's part from Sharing costs fairly</button>`;
  const res = E.ready
    ? `<b class="small">Who owns how much</b>${dkDonut(
        E.rows.map(r => ({ l: r.n, v: r.paid })),
        { label: "What each person put in", amt: true }
      )}<div class="stack" style="gap:6px">${E.rows
        .map(
          r =>
            `<div class="tile small"><b>${esc(r.n)}</b>: put in ${money(r.paid)}. By what they put in: <b>${money(r.byPaid)}</b>. Split equally: ${money(r.equal)}.${r.blank.length ? ' <span class="muted">Some boxes are blank and count as nothing yet.</span>' : ""}</div>`
        )
        .join(
          ""
        )}</div><div class="tiny muted">Neither way is the right one. Many households write down which one they use, in A money agreement on Our household.</div>`
    : `<div class="tile small">${E.equity == null ? "Tap what the home is worth and the loan left." : "Tap what each person put in."} At least two people are needed.</div>`;
  return dkSec(
    "hx-home",
    "⌂",
    "A shared home",
    "What each person put in, and their part of the equity",
    E.equity != null ? money(E.equity) : "",
    top + ppl + fair + res,
    [
      "Equity: what the home is worth today less the loan left.",
      "Put in, all of it: put in at the start + each month x the months.",
      "By what they put in: the equity x their share of everything everyone put in.",
      "Split equally: the equity / the number of people.",
    ]
  );
}
/* The named place for Estate and marriage (run Finish everything partly built, Part 11): domestic partnership
   next to marriage. It opens that screen once it is in the game. */
function hxPartnerLink() {
  const k = ["dpvm", "marriage", "estate"].find(a => typeof ACT !== "undefined" && typeof ACT[a] === "function");
  return k
    ? `<button class="ghost wide slim" data-a="${k}">Domestic partnership next to marriage</button>`
    : `<div class="tiny muted">Domestic partnership next to marriage (benefits, Social Security, New York first) comes with Estate and marriage.</div>`;
}
function hxMarryCard() {
  const S = hxS(),
    P = hxPeople(),
    M = hxMarry();
  const pay = P.map((p, i) => {
    let g = null;
    try {
      g = p.c && typeof taxvInputs === "function" ? taxvInputs(p.c).gross.v : null;
    } catch (e) {
      report(e, "hhold.js: hxMarryCard");
    }
    const v = S.gross[p.n];
    return hxPerson(
      "gross:" + i,
      p.n,
      v == null ? "no pay yet" : money(v) + " a year",
      hxAmt("Pay before tax, a year", "gross:" + i, hxM(TAXV_PAY), v == null ? null : v, { game: g > 0 ? g : null })
    );
  }).join("");
  const res = M.ready
    ? `<div class="stack" style="gap:6px">${M.pairs
        .map(
          x =>
            `<div class="tile small">If <b>${esc(x.names[0])}</b> and <b>${esc(x.names[1])}</b> marry: federal tax ${money(x.married)} a year, next to ${money(M.allSingle)} with everyone single. <b>${hxGapWords(x.gap)}</b>.</div>`
        )
        .join("")}</div>`
    : `<div class="tile small">Tap everyone's pay first.</div>`;
  return dkSec(
    "hx-marry",
    "⚖",
    "When only two can marry",
    "The federal tax gap for each pair, next to everyone single",
    "",
    `<div class="tiny muted">Only two people can be married to each other. Here the others file as single.</div>` +
      pay +
      res +
      hxPartnerLink(),
    [
      "Everyone single: each person's federal tax on their own pay, added up.",
      "A pair married: the two pays added up on one joint return, plus everyone else single.",
      "The gap: married less everyone single. More is a marriage penalty, less a bonus.",
      "Federal income tax only, with the 2026 standard deduction and brackets. Not counted: head of household, children, state tax, payroll tax and benefits.",
    ]
  );
}
function hxMailCard() {
  const S = hxS(),
    P = hxPeople(),
    to = P.some(p => p.n === S.mto) ? S.mto : P.length ? P[0].n : null;
  if (!to) return "";
  const items = hxItems(),
    picks = hxPicksOf(to),
    D = hxDraftFor(to),
    m = S.mail[to] || {};
  const who = `<div class="chips">${P.map((p, i) => `<button class="chip ${p.n === to ? "on" : ""}" data-a="hxmto" data-v="${i}">${esc(p.n)}</button>`).join("")}</div>`;
  const list = `<div class="stack" style="gap:6px">${items
    .map(it => {
      const on = picks[it.id] === true;
      return `<button class="rowbtn" data-a="hxpick" data-v="${esc(it.id)}" aria-pressed="${on}"><span><b class="small">${on ? "✓ " : "○ "}${esc(it.label)}</b><div class="tiny muted">${esc(it.lines[0] || "")}</div></span><span class="pill ${on ? "okp" : ""}" style="flex:none">${on ? esc(to) + " sees it" : "Not in it"}</span></button>`;
    })
    .join("")}</div>`;
  return dkSec(
    "hx-mail",
    "✉",
    "Share by email",
    "Pick what each person sees. You send the email yourself",
    D.ids.length ? String(D.ids.length) : "",
    `<div class="small">Who is this email for?</div>` +
      who +
      `<label class="small" for="hxtobox">${esc(to)}'s email (you can also add it in your mail app)</label><input id="hxtobox" class="mnfind" type="email" value="${esc(m.to || "")}" placeholder="name@example.com" style="min-height:44px;width:100%">` +
      list +
      `<details class="math"><summary>Read the draft</summary><div class="inner tiny" style="white-space:pre-wrap">${esc(D.body)}</div></details>` +
      `<div class="row" style="gap:8px;flex-wrap:wrap"><button class="primary" data-a="hxmail">Open the email draft</button><button class="ghost" data-a="hxcopy">${W && W.copied === "mail" ? "Copied ✓" : "Copy the text"}</button></div><div class="tiny muted">The draft opens in your own mail app. Nothing is sent until you send it. SLAM sends nothing.</div>`,
    null
  );
}
function hhxSheet() {
  const P = hxPeople(),
    R = hxSq(),
    F = hxFi(),
    E = hxHome();
  return (
    head("People", "Households together") +
    dkCaption("Money questions, FI dates and a shared home, for any number of people.") +
    `<div class="row wrap" style="gap:6px;align-items:center">${P.map(p => dkPill(p.n)).join("")}<button class="ghost slim" data-a="fair">Change the people</button>${P.some(p => p.sample) ? "" : `<button class="ghost slim" data-a="hxsample" data-v="1">Try a made-up household</button>`}</div>` +
    (P.some(p => p.sample)
      ? `<div class="banner small"><b>Made-up household.</b> Rin, Sol and Tay are invented. <button class="ghost slim" data-a="hxsample" data-v="0">Clear it</button></div>`
      : "") +
    dkStatRow([
      dkTile("People", String(P.length), { sub: "by their own names" }),
      dkTile("Talk points", R.open && R.K.ready ? String(R.K.talk.length) : "–", {
        sub: R.open && R.K.ready ? "from Same question" : "answer first",
      }),
      dkTile("FI gap", F.dates.ready ? hxDur(F.dates.gap) : "–", {
        sub: F.numbers.ready ? money(F.numbers.gap) + " in the number" : "two dates needed",
      }),
      dkTile("Home equity", E.equity != null ? money(E.equity) : "–", { sub: E.ready ? "shared" : "tap the home" }),
    ]) +
    hxSqCard() +
    hxFiCard() +
    hxHomeCard() +
    hxMarryCard() +
    hxMailCard() +
    `<button class="ghost wide slim" data-a="house">Our household</button>`
  );
}
/* Part of hsSheet() in house.js: the row that opens this sheet. */
function hxSheetRow() {
  return `<button class="rowbtn" data-a="hhx"><span><b>Households together</b><div class="tiny muted">Same question, FI together, a shared home, share by email</div></span><span class="caret">›</span></button>`;
}

/* ---------- actions ---------- */
function hxSetVal(k, v) {
  const [kind, si] = String(k).split(":"),
    S = hxS(),
    P = hxPeople(),
    i = +si,
    n = P[i] ? P[i].n : null;
  if (!(typeof v === "number" && isFinite(v) && v >= 0)) return false;
  if (kind === "home" && (si === "value" || si === "owed")) S.home[si] = v;
  else if (!n) return false;
  else if (kind === "fi") S.fi[n] = Object.assign({}, S.fi[n] || {}, { fi: v > 0 ? v : null });
  else if (kind === "gross") S.gross[n] = v;
  else if (["put", "monthly", "months"].includes(kind))
    S.home.ppl[n] = Object.assign({}, S.home.ppl[n] || {}, { [kind]: v });
  else return false;
  hxPut(S);
  return true;
}
Object.assign(ACT, {
  hhx: () => {
    W = { kind: "hhx", o: {} };
    sheet(hhxSheet);
  },
  hxwho: t => {
    const R = hxSq(),
      p = R.people[+t.dataset.v];
    if (!p) return;
    hxPut({ as: p.n });
    drawSheet();
  },
  hxans: t => {
    const S = hxS(),
      R = hxSq(),
      as = R.people.some(p => p.n === S.as) ? S.as : R.people.length ? R.people[0].n : null,
      q = hhQuestion(t.dataset.k),
      v = +t.dataset.v;
    if (!as || !hhAnswerOk(q, v)) return;
    const a = Object.assign({}, S.sq[as] || {});
    if (a[q.id] === v) delete a[q.id]; /* a second tap clears it */
    else a[q.id] = v;
    S.sq[as] = a;
    hxPut({ sq: S.sq, as });
    drawSheet();
  },
  hxsample: t => {
    if (typeof hsPut !== "function") return;
    hsPut({ sample: t.dataset.v === "1" });
    drawSheet();
  },
  hxed: t => {
    W.hxed = String(t.dataset.v || "") || null;
    W.pad = null;
    drawSheet();
  },
  hxshow: () => {
    hxPut({ show: true });
    drawSheet();
  },
  hxcodecopy: () => {
    const S = hxS(),
      R = hxSq(),
      as = R.people.some(p => p.n === S.as) ? S.as : R.people.length ? R.people[0].n : null;
    if (!as) return;
    try {
      navigator.clipboard.writeText(hhCode(as, S.sq[as] || {}));
    } catch (e) {
      report(e, "hhold.js: hxcodecopy");
    }
    W.copied = "code";
    drawSheet();
  },
  hxpaste: () => {
    const el =
        typeof document !== "undefined" && document.getElementById ? document.getElementById("hxpastebox") : null,
      r = hhReadCode((el && el.value) || (W && W.paste) || "");
    if (r.err) {
      W.msgx = r.err;
      drawSheet();
      return;
    }
    const S = hxS();
    S.sq[r.n] = r.a;
    if (!hxPeople().some(p => p.n === r.n) && !S.codes.includes(r.n)) S.codes.push(r.n);
    hxPut({ sq: S.sq, codes: S.codes });
    W.msgx = "Added " + r.n + "'s " + r.count + (r.count === 1 ? " answer." : " answers.");
    drawSheet();
  },
  hxset: t => {
    if (hxSetVal(t.dataset.k, +t.dataset.v)) drawSheet();
  },
  hxpad: t => {
    if (!W) return;
    W.o = W.o || {};
    W.pad = "hxk_" + String(t.dataset.k).replace(/:/g, "_");
    W.fresh = true;
    drawSheet();
  },
  hxtyped: t => {
    if (!W) return;
    const pk = "hxk_" + String(t.dataset.k).replace(/:/g, "_"),
      v = +((W.o && W.o[pk]) || 0);
    if (hxSetVal(t.dataset.k, v)) {
      W.pad = null;
      drawSheet();
    }
  },
  hxgame: t => {
    const P = hxPeople(),
      p = P[+t.dataset.k],
      g = p ? hxRead(p.c) : null;
    if (!g || !g.date) return;
    const S = hxS();
    S.fi[p.n] = Object.assign({}, S.fi[p.n] || {}, { date: g.date });
    hxPut({ fi: S.fi });
    drawSheet();
  },
  hxstep: t => {
    const P = hxPeople(),
      p = P[+t.dataset.k],
      n = +t.dataset.v;
    if (!p || ![-12, 12, -1, 1].includes(n)) return;
    const S = hxS(),
      g = hxRead(p.c),
      cur = (S.fi[p.n] && S.fi[p.n].date) || (g && g.date) || hxAddYm(hxNow(), 120);
    S.fi[p.n] = Object.assign({}, S.fi[p.n] || {}, { date: hxAddYm(cur, n) });
    hxPut({ fi: S.fi });
    drawSheet();
  },
  hxfair: () => {
    if (typeof frPpl !== "function" || typeof frCalc !== "function") return;
    const F = frState(),
      P = frPpl(),
      T = F.total == null ? frDefaultTotal() : F.total,
      R = frCalc(P, T, F.rate),
      pay = R[F.pick || "equal"] || R.equal,
      S = hxS();
    P.forEach((p, i) => {
      S.home.ppl[p.n] = Object.assign({}, S.home.ppl[p.n] || {}, { monthly: Math.round(pay[i]) });
    });
    hxPut({ home: S.home });
    drawSheet();
  },
  hxmto: t => {
    const p = hxPeople()[+t.dataset.v];
    if (!p) return;
    hxPut({ mto: p.n });
    drawSheet();
  },
  hxpick: t => {
    const S = hxS(),
      P = hxPeople(),
      to = P.some(p => p.n === S.mto) ? S.mto : P.length ? P[0].n : null,
      id = String(t.dataset.v || "");
    if (!to || !hxItems().some(it => it.id === id)) return;
    const picks = Object.assign({}, hxPicksOf(to));
    if (picks[id] === true) delete picks[id];
    else picks[id] = true;
    S.mail[to] = Object.assign({}, S.mail[to] || {}, { picks });
    hxPut({ mail: S.mail, mto: to });
    drawSheet();
  },
  hxmail: () => {
    const S = hxS(),
      P = hxPeople(),
      to = P.some(p => p.n === S.mto) ? S.mto : P.length ? P[0].n : null;
    if (!to) return;
    const el = typeof document !== "undefined" && document.getElementById ? document.getElementById("hxtobox") : null;
    if (el) {
      S.mail[to] = Object.assign({}, S.mail[to] || {}, {
        to: String(el.value || "")
          .trim()
          .slice(0, 120),
      });
      hxPut({ mail: S.mail });
    }
    const D = hxDraftFor(to);
    W.mailto = D.mailto;
    if (typeof location !== "undefined" && location.href !== undefined && typeof window !== "undefined")
      location.href = D.mailto;
  },
  hxcopy: () => {
    const S = hxS(),
      P = hxPeople(),
      to = P.some(p => p.n === S.mto) ? S.mto : P.length ? P[0].n : null;
    if (!to) return;
    try {
      navigator.clipboard.writeText(hxDraftFor(to).body);
    } catch (e) {
      report(e, "hhold.js: hxcopy");
    }
    W.copied = "mail";
    drawSheet();
  },
});
kitMenu(
  "Households together",
  "hhx",
  "Same question, FI together, a shared home, when two can marry, share by email",
  "house"
);
