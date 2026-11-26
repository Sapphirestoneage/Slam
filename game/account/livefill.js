/* ============================================================================
   SLAM the Game: account/livefill.js
   PURPOSE     Live Session Mode, Parts 3, 4 and 5: what one line of the call means. Rules only: no AI, no
               screen, no database, no profile. (1) The number reader: money, rates and the pay rhythm as
               speech recognition writes them, and what it refuses. (2) The fields and their words.
               (3) The topic: the coach's line sets it, the client's next line gives the value.
               (4) "Confirming <field> <number>" on the coach's line, and the client's yes or no.
               (5) The cue words of a what-if. lfHear() reads one line and gives a list of what was
               heard. account/liveland.js puts that on the profile.
   INPUT       Values only: the text of a line, its side ("coach" or "client"), a time in milliseconds,
               and the small state of one call (lfStateNew).
   OUTPUT      Constants LF, LF_FIELDS, LF_TYPES. Functions lfClean, lfTokens, lfNums, lfOne, lfRhythm,
               lfFieldsIn, lfField, lfTopicOf, lfCue, lfAskOf, lfYesNo, lfStateNew, lfHear.
   DEPENDS ON  account/live.js (lvWords). session.html loads this file. index.html does not.
   RULES       Only the client's words give a value. The coach's words set the topic, or open a
               "Confirming". When the reader is not sure, it gives nothing: a value that is not heard is
               fine, a wrong value is not. A rough number ("about", "-ish", "maybe", a range) is the
               middle of what was said and is marked rough.
   NOT SEEN    Nobody here saw what a real speech recognizer writes. The forms that this file reads are
               assumptions. docs/LIVE-SESSION-BUILD.md lists them and what a real call must examine.
   ========================================================================= */
/* The times and the class names, in one place. */
const LF = {
  TOPIC_MS: 20000 /* a topic of the coach stays open for 20 seconds */,
  FIX_MS: 8000 /* a new number for the same field in 8 seconds is a correction */,
  ASK_MS: 10000 /* the client answers a "Confirming" in 10 seconds */,
  ECHO_MS: 3000 /* a yes that repeats a coach's line of the last 3 seconds is an echo */,
  KIND_MS: 60000 /* "the rate on that": the debt that was named in the last 60 seconds */,
  GLOW_MS: 4000 /* the glow of a new value on the screen (Part 6) */,
  TAG: "lf-heard" /* the class of the small tag "heard" */,
  GLOW: "lf-glow" /* the class of the short glow */,
  PULSE: "lf-pulse" /* the class of the pulse of "confirmed out loud" */,
};
const LF_TYPES = [
  ["ceiling", "Ceiling"],
  ["floor", "Floor"],
  ["scenario", "Scenario"],
  ["life", "Life transition"],
  ["goal", "Goal or wish"],
];

/* ---------- 1. the number reader ---------- */
const LF_SMALL = Object.assign(Object.create(null), {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
});
const LF_TENS = Object.assign(Object.create(null), {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fourty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
});
const LF_SCALE = Object.assign(Object.create(null), {
  hundred: 100,
  thousand: 1000,
  grand: 1000,
  k: 1000,
  million: 1000000,
});
const lfSet = words => {
  const o = Object.create(null);
  words.split(" ").forEach(w => (o[w] = 1));
  return o;
};
/* A number in front of one of these words is a count, an age or a time, not money. */
const LF_UNIT = lfSet(
  "year years yr yrs month months week weeks day days hour hours minute minutes time times card cards kid kids child children people person job jobs account accounts loan loans payment payments paycheck paychecks check checks mile miles bedroom bedrooms roommate roommates am pm oclock"
);
const LF_LABEL = lfSet(
  "number option step question part session level era chapter apartment unit floor room route line page"
);
const LF_YEAR_PRE = lfSet("in since of by until during year from");
const LF_AGE_PRE = lfSet("im age aged turned turning");
const LF_ROUGH_PRE = lfSet(
  "about around roughly approximately approx maybe probably like almost nearly ballpark guess guessing think somewhere close would could might perhaps possibly estimate"
);
const LF_ROUGH_POST = lfSet("ish maybe probably roughly approximately perhaps possibly");
/* The words of a line, ready to read. "$1,850" stays one piece. "401(k)" becomes one word, so its "k" is not
   a thousand. A phone number, a time of day and "the 1st" become a mark that is not a number. */
function lfClean(text) {
  return String(text == null ? "" : text)
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/\b(?:four oh one|401)\s*\(?k\)?(?![a-z])/g, " #k401 ")
    .replace(/\b403\s*\(?b\)?(?![a-z])/g, " #b403 ")
    .replace(/\b(529|1099)\b/g, " #form ")
    .replace(/\b\d{3}[-. ]\d{3}[-. ]\d{4}\b/g, " #phone ")
    .replace(/\b\d{3}[-. ]\d{4}\b/g, " #phone ")
    .replace(/\b\d{1,2}:\d{2}\b/g, " #time ")
    .replace(/\b([ap])\.m\.?/g, "$1m")
    .replace(/\b\d+(?:st|nd|rd|th)\b/g, " #ord ")
    .replace(/(\d)\s*%/g, "$1 percent ")
    .replace(/\bper cent\b/g, "percent")
    .replace(/(\d)\s*-?\s*ish\b/g, "$1 ish")
    .replace(/(\d)\s*[-–]\s*(?=\$?\d)/g, "$1 to ")
    .replace(/\blet's\b/g, "lets")
    .replace(/([a-z])'s\b/g, "$1 is")
    .replace(/([a-z])'d\b/g, "$1 would")
    .replace(/([a-z])'ll\b/g, "$1 will")
    .replace(/'/g, "")
    .replace(/([a-z])-(?=[a-z])/g, "$1 ");
}
/* The pieces of a line: { t: the word } and, for digits, { n: the value, d: true, m: true with a "$" }. */
function lfTokens(text) {
  const out = [],
    re = /#[a-z0-9]+|\$?\s?\d{1,3}(?:,\d{3})+(?:\.\d+)?|\$?\s?\d+(?:\.\d+)?|[a-z]+|[,.;?!]/g,
    s = lfClean(text);
  let m;
  while ((m = re.exec(s))) {
    const t = m[0];
    if (/\d/.test(t) && t[0] !== "#") {
      const raw = t.replace(/[$\s,]/g, "");
      out.push({
        t: raw,
        n: parseFloat(raw),
        d: true,
        m: t.indexOf("$") >= 0,
        long: raw.replace(/\..*$/, "").length >= 7 && t.indexOf(",") < 0,
      });
    } else out.push({ t });
  }
  return out;
}
const lfW = (T, i) => (T[i] && !T[i].d ? T[i].t : "");
/* A number below 100 in words at place i: "seven", "seventeen", "seventy", "seventy four". */
function lfSub(T, i) {
  const a = lfW(T, i);
  if (a && a in LF_TENS) {
    const b = lfW(T, i + 1);
    if (b && b in LF_SMALL && LF_SMALL[b] >= 1 && LF_SMALL[b] <= 9) return { v: LF_TENS[a] + LF_SMALL[b], n: 2 };
    return { v: LF_TENS[a], n: 1 };
  }
  if (a && a in LF_SMALL) return { v: LF_SMALL[a], n: 1 };
  return null;
}
const lfBig = w => w === "thousand" || w === "grand" || w === "k" || w === "million";
/* One number that starts at place i, or null. Gives { v, i0, i1, mant, fac, digits, m, word1 }.
   mant and fac: "4 thousand" is mant 4, fac 1000 (a range uses them: "between 3 and 4 thousand"). */
function lfNumAt(T, i) {
  const t = T[i];
  if (!t) return null;
  let j = i,
    v,
    digits = false,
    money = false,
    pair = false;
  if (t.d) {
    if (t.long) return null;
    v = t.n;
    digits = true;
    money = !!t.m;
    j++;
  } else if ((t.t === "a" || t.t === "an") && lfW(T, i + 1) in LF_SCALE && lfW(T, i + 1) !== "k") {
    v = 1;
    j++;
  } else {
    const s = lfSub(T, j);
    if (!s) return null;
    v = s.v;
    j += s.n;
    /* "eighteen fifty" is 1,850 and "four fifty" is 450: a second number of two digits follows */
    const p = lfSub(T, j);
    if (p && p.v >= 10 && v >= 1 && v <= 99 && !(lfW(T, j + p.n) in LF_SCALE)) {
      v = v * 100 + p.v;
      j += p.n;
      pair = true;
    }
    /* "twenty four point nine nine" */
    if (lfW(T, j) === "point") {
      let k = j + 1,
        frac = "";
      while (lfW(T, k) in LF_SMALL && LF_SMALL[lfW(T, k)] <= 9) frac += LF_SMALL[lfW(T, k++)];
      if (frac) {
        v = parseFloat(v + "." + frac);
        j = k;
      }
    }
  }
  const word1 = !digits && j === i + 1 && T[i].t === "one";
  if (lfW(T, j) === "and" && lfW(T, j + 1) === "a" && lfW(T, j + 2) === "half" && lfW(T, j + 3) in LF_SCALE) {
    v += 0.5;
    j += 3;
  }
  let mant = v,
    fac = 1;
  if (lfW(T, j) === "hundred") {
    v *= 100;
    fac = 100;
    j++;
    const k = lfW(T, j) === "and" ? j + 1 : j,
      s2 = lfSub(T, k);
    /* "three hundred and fifty", "three hundred fifty"; not "three hundred and four thousand" */
    if (s2 && !(lfW(T, k + s2.n) in LF_SCALE) && (k > j || s2.v >= 10)) {
      v += s2.v;
      j = k + s2.n;
      fac = 1;
    }
  }
  if (lfBig(lfW(T, j))) {
    const f = LF_SCALE[lfW(T, j)];
    v *= f;
    fac = fac === 1 && mant * f === v ? f : 1;
    if (fac === 1) mant = v;
    j++;
    /* "two thousand one hundred", "two thousand and fifty", "two thousand five hundred fifty" */
    const k = lfW(T, j) === "and" ? j + 1 : j,
      s = lfSub(T, k);
    if (s && f >= 1000) {
      let add = null,
        e = k + s.n;
      if (lfW(T, e) === "hundred") {
        add = s.v * 100;
        e++;
        const k2 = lfW(T, e) === "and" ? e + 1 : e,
          s3 = lfSub(T, k2);
        if (s3 && !(lfW(T, k2 + s3.n) in LF_SCALE) && (k2 > e || s3.v >= 10)) {
          add += s3.v;
          e = k2 + s3.n;
        }
      } else if (!(lfW(T, e) in LF_SCALE) && s.v >= 10) add = s.v;
      if (add != null && add < f) {
        v += add;
        j = e;
        fac = 1;
        mant = v;
      }
    }
  } else if (fac === 1) mant = v;
  return { v, i0: i, i1: j, mant, fac, digits, m: money, word1, pair };
}
const lfStop = t => t === "." || t === "?" || t === "!" || t === ";";
/* How often the money comes, from the words after a number: "a month", "every two weeks", "each time". */
function lfPer(words) {
  const s = " " + words.join(" ") + " ",
    list = [
      [
        "pay",
        / (every (two|2|other|couple of) weeks?|bi ?weekly|(a|per|each|every) (paycheck|check|pay period|payday)|each time|every time|twice a month|semi ?monthly|every other (week|friday|thursday)) /,
      ],
      ["week", / ((a|per|each|every) week|weekly) /],
      ["month", / ((a|per|each|every) month|monthly) /],
      ["year", / ((a|per|each|every) year|yearly|annually|annual) /],
    ];
  let best = null;
  list.forEach(p => {
    const m = p[1].exec(s);
    if (m && (!best || m.index < best.at)) best = { per: p[0], at: m.index };
  });
  return best ? best.per : null;
}
/* THE NUMBERS OF ONE LINE. Each one: { v, lo, hi, rough, pct, money, per, i0, i1 }.
   READS    "$1,850", "1850", "1,850.50", "eighteen fifty", "four fifty", "eighteen hundred", "twenty four
            hundred", "two thousand one hundred", "three hundred and fifty", "1.8k", "two grand", "a grand",
            "24.99 percent", "24.99%", "twenty four percent", "twenty four point nine nine percent".
   ROUGH    "about 400", "around", "roughly", "maybe", "probably", "like", "I think", "400-ish", "or so",
            "give or take". A range is rough and gives its middle: "400-ish, maybe 500" (450), "between 3
            and 4 thousand" (3,500), "400 to 500", "400-500", "four or five hundred". The larger end of a
            range is at most 3 times the smaller end; if not, the two numbers stay two numbers.
   REFUSES  A phone number ("555-123-4567", seven digits or more with no comma, three single digits in a
            row). A time of day ("3:30", "3 pm", "at 3"). A date ("the 1st"). A year after in, since, of,
            by, until, during, from ("in 2019"). An age ("I'm 34"). A count ("two cards", "3 kids",
            "5 years", "every two weeks"). A label ("option 2"). The word "one" with no "dollars",
            "percent", "hundred" or "thousand" after it ("that one"). "401(k)", "403(b)", "529", "1099".
            "a few hundred" and "a couple thousand" give only the round number with no count: refused. */
function lfNums(text) {
  const T = lfTokens(text),
    raw = [];
  for (let i = 0; i < T.length; ) {
    const n = lfNumAt(T, i);
    if (n) {
      raw.push(n);
      i = n.i1;
    } else i++;
  }
  /* three small numbers side by side are the digits of a phone number, not three amounts */
  const run = {};
  for (let a = 0; a < raw.length; ) {
    let b = a;
    while (b + 1 < raw.length && raw[b + 1].i0 === raw[b].i1 && raw[b + 1].i1 - raw[b + 1].i0 === 1) b++;
    if (b - a + 1 >= 3 || (b > a && raw.slice(a, b + 1).every(x => x.digits))) for (let k = a; k <= b; k++) run[k] = 1;
    a = b + 1;
  }
  const kept = [];
  raw.forEach((n, idx) => {
    if (run[idx]) return;
    const prev = lfW(T, n.i0 - 1),
      prev2 = lfW(T, n.i0 - 2),
      next = lfW(T, n.i1),
      next2 = lfW(T, n.i1 + 1),
      unit = next === "dollars" || next === "dollar" || next === "bucks" || next === "buck",
      pct = next === "percent",
      money = n.m || unit;
    if (prev === "few" || prev === "couple" || (prev === "of" && prev2 === "couple")) return;
    if (n.word1 && !money && !pct) return; /* "one" with nothing after it is a pronoun */
    if (!money && next in LF_UNIT && !(next === "check" && n.v >= 20)) return;
    if (!money && !pct && next === "of" && next2 === "them") return;
    if (!money && prev in LF_LABEL) return;
    if (!money && !pct && n.v < 120 && (prev in LF_AGE_PRE || (prev === "am" && prev2 === "i"))) return;
    if (!money && !pct && prev === "at" && n.v <= 12 && n.fac === 1 && n.v === Math.floor(n.v)) return;
    if (
      !money &&
      !pct &&
      n.v >= 1900 &&
      n.v <= 2100 &&
      n.v === Math.floor(n.v) &&
      prev in LF_YEAR_PRE &&
      ["a", "per", "each", "every"].indexOf(next) < 0
    )
      return;
    let rough = false;
    for (let k = n.i0 - 1; k >= 0 && k >= n.i0 - 4; k--) {
      if (T[k].d || lfStop(T[k].t)) break;
      if (T[k].t in LF_ROUGH_PRE) rough = true;
    }
    const after = [];
    for (let k = n.i1; k < T.length && k < n.i1 + 4; k++) {
      if (T[k].d || lfStop(T[k].t)) break;
      after.push(T[k].t);
    }
    const as = " " + after.join(" ") + " ";
    if (after[0] in LF_ROUGH_POST || after[1] in LF_ROUGH_POST) rough = true;
    if (/ (or so|give or take|more or less|i think|i guess|something like that) /.test(as)) rough = true;
    kept.push(Object.assign({}, n, { pct, money, rough, lo: n.v, hi: n.v }));
  });
  /* ranges: two numbers with only a joining word between them */
  const out = [];
  for (let a = 0; a < kept.length; a++) {
    const x = kept[a],
      y = kept[a + 1];
    if (y && (x.pct === y.pct || (y.pct && !x.money))) {
      const mid = T.slice(x.i1 + (x.pct ? 1 : 0), y.i0).map(t => t.t),
        soft = mid.filter(w => w === "maybe" || w === "possibly" || w === "even" || w === "perhaps").length > 0,
        rest = mid.filter(
          w =>
            [
              "ish",
              ",",
              "maybe",
              "possibly",
              "even",
              "perhaps",
              "dollars",
              "bucks",
              "percent",
              "like",
              "about",
            ].indexOf(w) < 0
        ),
        between = [1, 2, 3].some(k => lfW(T, x.i0 - k) === "between"),
        join =
          (rest.length === 0 && soft) ||
          (rest.length === 1 && (rest[0] === "to" || rest[0] === "or")) ||
          (rest.length === 1 && rest[0] === "and" && between);
      if (join) {
        let lo = x.v;
        if (x.fac === 1 && y.fac > 1 && x.v < y.mant) lo = x.v * y.fac;
        const hi = y.v;
        if (lo > 0 && hi > lo && hi / lo <= 3) {
          out.push(
            Object.assign({}, x, {
              v: Math.round(((lo + hi) / 2) * 100) / 100,
              lo,
              hi,
              rough: true,
              range: true,
              money: x.money || y.money,
              pct: y.pct,
              i1: y.i1,
            })
          );
          a++;
          continue;
        }
      }
    }
    out.push(x);
  }
  out.forEach((n, k) => {
    const end = out[k + 1] ? out[k + 1].i0 : T.length,
      words = T.slice(n.i1, Math.min(end, n.i1 + 8)).map(t => t.t);
    n.per = lfPer(words);
  });
  return out;
}
/* The one number of a line, of one kind ("money" or "pct"). Gives { n } when the line has exactly one,
   { many: true } when it has more, {} when it has none. With kind "pct", a plain number up to 60 counts when
   the line has no number with "percent" (the answer "about 25" to "what is the rate?"). */
function lfOne(nums, kind) {
  let list = nums.filter(n => (kind === "pct" ? n.pct : !n.pct));
  if (kind === "pct" && !list.length) list = nums.filter(n => !n.money && n.v > 0 && n.v <= 60);
  if (kind === "pct") list = list.filter(n => n.v >= 0 && n.v <= 60);
  if (list.length === 1) return { n: list[0] };
  return list.length ? { many: true } : {};
}

/* ---------- 2. the pay rhythm ---------- */
/* One of the game's own answers for c.payFreq, or null. "Biweekly" is read as every 2 weeks, the usual
   meaning for pay. "It varies" is never set from speech. */
function lfRhythm(text) {
  const t =
    " " +
    lfTokens(text)
      .map(x => x.t)
      .join(" ") +
    " ";
  if (
    / (every (two|2|other|second|couple of) weeks?|bi ?weekly|every other (week|monday|tuesday|wednesday|thursday|friday)|fortnightly|every fortnight) /.test(
      t
    )
  )
    return "Every 2 weeks";
  if (
    / (twice a month|two times a month|2 times a month|semi ?monthly|(#ord|first) and (on )?(the )?(#ord|fifteenth)|fifteenth and (the )?(last|thirtieth|end)) /.test(
      t
    )
  )
    return "Twice a month";
  if (/ (every week|each week|weekly|once a week|every (monday|tuesday|wednesday|thursday|friday)) /.test(t))
    return "Weekly";
  if (
    / (once a month|monthly|every month|each month|end of (the|each|every) month|(#ord|first|last day) of (the|each|every) month) /.test(
      t
    )
  )
    return "Monthly";
  return null;
}
const LF_PAY_WORDS = / (paid|paycheck|paychecks|payday|pay|direct deposit|check comes|checks come) /;

/* ---------- 3. the fields ---------- */
/* Each field that a call can fill. key: the row of the profile ("spend:Home" is the row Home of c.spends).
   part: one piece of a row that holds more than one thing (rent and utilities are both in Home; the row is
   the sum of the pieces heard). w: the words that name the field, for both sides. */
const LF_DEBTS = [
  ["Credit card balance", "Credit card", "credit cards?|cards?|visa|mastercard|amex|american express"],
  ["Student loans", "Student loans", "student loans?|student debt|school loans?"],
  ["Car loan", "Car loan", "car loan|auto loan|car note|owe on (the|my) car"],
  ["Medical bills", "Medical bills", "medical (bills?|debt)|hospital bills?|doctor bills?"],
  ["Personal loan", "Personal loan", "personal loans?"],
  ["Payday loan or cash advance", "Payday loan", "payday loans?|cash advance"],
  ["Buy now, pay later", "Buy now, pay later", "buy now pay later|pay later|afterpay|klarna|affirm"],
  [
    "Owed to family or friends",
    "Owed to family or friends",
    "owe (my|our) (mom|dad|parents|brother|sister|friend|family|aunt|uncle)|(mom|dad|parents|family) (lent|loaned)",
  ],
];
const LF_ISSUERS = [
  "chase",
  "discover",
  "amex",
  "american express",
  "capital one",
  "citi",
  "citibank",
  "wells fargo",
  "bank of america",
  "barclays",
  "synchrony",
  "apple card",
  "us bank",
  "navy federal",
  "usaa",
];
const LF_FIELDS = [
  {
    key: "pay.freq",
    area: "income",
    label: "How often you get paid",
    kind: "rhythm",
    w: "how often (do|are) you (get )?paid|how often (does|is) (the|your) (pay|paycheck|check)( come)?|when (do|are) you (get )?paid|pay (schedule|period|rhythm|frequency)",
  },
  {
    key: "inc:A main job",
    area: "income",
    label: "Money coming in, main job",
    kind: "money",
    w: "take home|takehome|bring home|bringing home|brings? in|income|paychecks?|pay check|(i|you|we) (make|earn)|get paid|your pay|my pay|each check|per check|comes? in",
  },
  {
    key: "inc:A second job",
    area: "income",
    label: "Money coming in, second job",
    kind: "money",
    w: "second job|other job|part time job",
  },
  {
    key: "inc:Side gigs",
    area: "income",
    label: "Money coming in, side gigs",
    kind: "money",
    w: "side (gigs?|hustles?|jobs?|work)|freelanc[a-z]*|gig work",
  },
  {
    key: "spend:Home",
    part: "rent",
    area: "housing",
    label: "Rent or housing",
    kind: "money",
    w: "rent|mortgage|housing",
  },
  {
    key: "spend:Home",
    part: "utilities",
    area: "housing",
    label: "Utilities",
    kind: "money",
    w: "utilit[a-z]+|electric[a-z]*|power bill|water bill|gas bill|heating",
  },
  { key: "spend:Food", part: "groceries", area: "bills", label: "Groceries", kind: "money", w: "grocer[a-z]+" },
  {
    key: "spend:Food",
    part: "eating out",
    area: "bills",
    label: "Eating out",
    kind: "money",
    w: "eating out|restaurants?|take ?out|food delivery",
  },
  { key: "spend:Food", part: "all", area: "bills", label: "Food", kind: "money", w: "food" },
  {
    key: "spend:Getting around",
    part: "car payment",
    area: "bills",
    label: "Car payment",
    kind: "money",
    w: "car (payment|note)",
  },
  {
    key: "spend:Getting around",
    part: "car insurance",
    area: "bills",
    label: "Car insurance",
    kind: "money",
    w: "(car|auto) insurance",
  },
  { key: "spend:Getting around", part: "gas", area: "bills", label: "Gas", kind: "money", w: "gas|fuel" },
  {
    key: "spend:Getting around",
    part: "transit",
    area: "bills",
    label: "Transit",
    kind: "money",
    w: "transit|bus pass|metro ?card|subway|train pass",
  },
  {
    key: "spend:Bills and subscriptions",
    part: "phone",
    area: "bills",
    label: "Phone",
    kind: "money",
    w: "(cell ?)?phone( bill)?|cell bill",
  },
  {
    key: "spend:Bills and subscriptions",
    part: "internet",
    area: "bills",
    label: "Internet",
    kind: "money",
    w: "internet|wi ?fi|cable",
  },
  {
    key: "spend:Bills and subscriptions",
    part: "subscriptions",
    area: "bills",
    label: "Subscriptions",
    kind: "money",
    w: "subscriptions?|streaming|memberships?",
  },
  {
    key: "spend:Bills and subscriptions",
    part: "insurance",
    area: "bills",
    label: "Other insurance",
    kind: "money",
    w: "(health|renters|life|home) insurance",
  },
  { key: "cash:Checking", area: "accounts", label: "Checking", kind: "money", w: "checking" },
  {
    key: "cash:Savings",
    area: "accounts",
    label: "Savings",
    kind: "money",
    w: "savings?|emergency fund|rainy day fund",
  },
  { key: "cash:Cash at home", area: "accounts", label: "Cash at home", kind: "money", w: "cash (at home|on hand)" },
  {
    key: "inv:Retirement plan at work",
    area: "accounts",
    label: "Retirement plan at work",
    kind: "money",
    w: "#k401|#b403|retirement (plan|account)|tsp",
  },
  { key: "inv:IRA or Roth IRA", area: "accounts", label: "IRA or Roth IRA", kind: "money", w: "roth ira|roth|ira" },
  { key: "inv:HSA", area: "accounts", label: "HSA", kind: "money", w: "hsa|health savings( account)?" },
  {
    key: "inv:Other investments",
    area: "accounts",
    label: "Other investments",
    kind: "money",
    w: "brokerage|stocks?|invested|investments?|crypto",
  },
  {
    key: "names:Credit card balance",
    area: "debts",
    label: "Card names",
    kind: "names",
    w: "which cards?|what cards?|which banks?|who (is|are) (it|they|the cards?|the card) with|card names?|names? of (the|your) cards?",
  },
]
  .concat(
    LF_DEBTS.map(d => ({ key: "debt:" + d[0], area: "debts", label: d[1] + ": what you owe", kind: "money", w: d[2] })),
    LF_DEBTS.map(d => ({ key: "rate:" + d[0], area: "debts", label: d[1] + ": the rate", kind: "rate", w: null }))
  )
  .map(f =>
    Object.assign(f, {
      id: f.key + (f.part ? "/" + f.part : ""),
      re: f.w ? new RegExp("(?:^| )(" + f.w + ")(?= |$)", "g") : null,
    })
  );
const LF_RATE_WORDS = / (rate|rates|apr|interest|percent) /;
/* One field by its id ("spend:Home/rent", "debt:Car loan"), or null. */
function lfField(id) {
  return LF_FIELDS.find(f => f.id === id) || null;
}
/* The fields that the words of a line name, in the order of the line: [{ f, pos, end }]. A short name inside
   a longer name is left out ("gas" in "gas bill", "savings" in "health savings"). With a rate word in the
   line ("rate", "APR", "interest", "percent"), a debt means its rate, and no other field counts. */
function lfFieldsIn(text, kind) {
  const T = lfTokens(text),
    s = T.map(x => x.t).join(" ");
  let hits = [];
  LF_FIELDS.forEach(f => {
    if (!f.re) return;
    f.re.lastIndex = 0;
    let m;
    while ((m = f.re.exec(s))) {
      const pos = m.index + (m[0][0] === " " ? 1 : 0);
      hits.push({ f, pos, end: pos + m[1].length });
      if (f.re.lastIndex === m.index) f.re.lastIndex++;
    }
  });
  if (/ debit cards? /.test(" " + s + " ")) hits = hits.filter(h => h.f.key !== "debt:Credit card balance");
  hits = hits.filter(
    h => !hits.some(o => o !== h && o.pos <= h.pos && o.end >= h.end && o.end - o.pos > h.end - h.pos)
  );
  hits.sort((a, b) => a.pos - b.pos || b.end - a.end);
  hits = hits.filter((h, i) => !i || hits[i - 1].pos !== h.pos);
  const rate = LF_RATE_WORDS.test(" " + s + " ");
  if (rate) {
    hits = hits
      .filter(h => h.f.key.indexOf("debt:") === 0)
      .map(h => ({ f: lfField("rate:" + h.f.key.slice(5)), pos: h.pos, end: h.end }));
    if (!hits.length && kind)
      hits = [{ f: lfField("rate:" + kind), pos: s.search(/(^| )(rate|rates|apr|interest)( |$)/), end: 0 }];
    hits = hits.filter(h => h.f && h.pos >= 0);
  }
  /* the place of each hit as a count of words, so it can be put next to the place of a number */
  return hits.map(h => ({
    f: h.f,
    at: s.slice(0, h.pos).split(" ").filter(Boolean).length,
    to: s
      .slice(0, h.end || h.pos)
      .split(" ")
      .filter(Boolean).length,
  }));
}
/* The topic that a coach's line sets: the last field that the line names, or null.
   mode (income only): "pay" when the coach asks for one paycheck, "month" for a month, "year" for a year. */
function lfTopicOf(text, kind) {
  const hits = lfFieldsIn(text, kind);
  if (!hits.length) return null;
  const f = hits[hits.length - 1].f,
    s =
      " " +
      lfTokens(text)
        .map(x => x.t)
        .join(" ") +
      " ";
  let mode = null;
  if (f.area === "income" && f.kind === "money")
    mode = / (paychecks?|pay check|each check|per check|a check|every check|each time|each payday) /.test(s)
      ? "pay"
      : / (month|monthly) /.test(s)
        ? "month"
        : / (year|yearly|annual|annually|salary) /.test(s)
          ? "year"
          : null;
  return { id: f.id, mode };
}

/* ---------- 4. what-ifs ---------- */
/* THE CUE WORDS. A line with one of them is not a fact.
   HARD   if, what if, worst case, best case, suppose, supposing, thinking about, thinking of, let's say,
          hypothetically, someday, some day, one day, I wish, hoping to, hope to, dream, in case, would love
          to, would like to, want to.
   SOFT   maybe, perhaps, possibly, would, could, might (so also "would be", "could be", "might be").
   NOT A CUE
   - "if" in "see if", "know if", "sure if", "check if", "as if", "if I remember", "if I recall", "if that
     makes sense", "if you want", "if so", "if not", "if any".
   - A polite question: "could you tell me", "can you walk me through", "would you say", "would you mind".
   - A soft cue right before a number ("maybe 500", "it would be about 1,850", "could be 400") or right
     after it ("500 maybe"), WHEN the line answers a direct question of the coach (a topic is open). Then
     the number is a rough number and the line is a fact. With no open question the same line is a what-if.
   - A line of fewer than 3 words ("maybe", "I could").
   Gives { whatif: true, cues: [...] } or { whatif: false, rough: true or false }. */
function lfCue(text, answering) {
  const T = lfTokens(text),
    words = T.filter(t => /^[a-z0-9#]/.test(t.t)).length;
  let s = " " + T.map(t => t.t).join(" ") + " ";
  s = s
    .replace(/ (see|know|sure|check|ask|asked|as) if /g, " ")
    .replace(
      / if (i remember|i recall|memory serves|that makes sense|you know what i mean|you want|you like|you can|so|not|any|anything|possible) /g,
      " "
    )
    .replace(
      / (could|would|can) (you|i|we) (please |just )?(tell|say|share|give|ask|walk|go|start|move|repeat|speak|hear|see|confirm|check|look|pull|open) /g,
      " "
    )
    .replace(/ would you (say|mind) /g, " ");
  const cues = [],
    hard =
      / (what if|if|worst case|best case|suppose|supposing|thinking about|thinking of|lets say|hypothetically|someday|some day|one day|i wish|we wish|hoping to|hope to|dream|dreams|in case|would love to|would like to|want to) /g;
  let m;
  while ((m = hard.exec(s))) {
    cues.push(m[1]);
    hard.lastIndex = m.index + 1;
  }
  /* soft cues: by place, so each one can be put next to a number */
  const nums = lfNums(text),
    softW = lfSet("maybe perhaps possibly would could might"),
    fill = lfSet("be say like about around roughly its it is a guess , probably just at");
  let rough = false,
    soft = 0;
  const S2 = " " + T.map(t => t.t).join(" ") + " ";
  const polite =
    / (could|would|can) (you|i|we) (please |just )?(tell|say|share|give|ask|walk|go|start|move|repeat|speak|hear|see|confirm|check|look|pull|open) | would you (say|mind) /.test(
      S2
    );
  T.forEach((t, i) => {
    if (t.d || !(t.t in softW)) return;
    if (polite && (t.t === "could" || t.t === "would")) return;
    if (/ (would love to|would like to) /.test(" " + [t.t, lfW(T, i + 1), lfW(T, i + 2)].join(" ") + " ")) return;
    let k = i + 1,
      near = nums.some(n => i >= n.i0 && i < n.i1); /* the "maybe" inside a range: "400-ish, maybe 500" */
    while (k < T.length && k <= i + 4) {
      if (nums.some(n => n.i0 === k)) {
        near = true;
        break;
      }
      if (T[k].d || !(T[k].t in fill)) break;
      k++;
    }
    if (!near && nums.some(n => n.i1 === i || (n.i1 === i - 1 && (lfW(T, i - 1) === "," || lfW(T, i - 1) === "ish"))))
      near = true;
    if (near && answering) rough = true;
    else {
      soft++;
      cues.push(t.t);
    }
  });
  if (cues.length && words >= 3) return { whatif: true, cues };
  return { whatif: false, rough };
}

/* ---------- 5. "Confirming" and the answer ---------- */
/* A coach's line "Confirming <field> <number>": also "confirming your rent at 1,850", "confirm rent eighteen
   fifty", "confirming the card rate 24.99 percent", "confirming you get paid every two weeks".
   Gives null (no "confirm" in the line), { bad: why } (no field or no number was heard after it), or
   { id, v, per, pct, rhythm }. */
function lfAskOf(text, kind) {
  const m = /\bconfirm(?:ing)?\b([\s\S]*)$/i.exec(String(text || ""));
  if (!m) return null;
  const rest = m[1],
    hits = lfFieldsIn(rest, kind),
    rh = lfRhythm(rest),
    s =
      " " +
      lfTokens(rest)
        .map(x => x.t)
        .join(" ") +
      " ";
  if (rh && (LF_PAY_WORDS.test(s) || hits.some(h => h.f.id === "pay.freq")) && !lfNums(rest).length)
    return { id: "pay.freq", rhythm: rh };
  const f = hits.length ? hits[0].f : null;
  if (!f || f.kind === "names" || f.kind === "rhythm") return { bad: "Say the field and the number after Confirming." };
  const one = lfOne(lfNums(rest), f.kind === "rate" ? "pct" : "money");
  if (!one.n) return { bad: "Say the field and one number after Confirming.", id: f.id };
  let per = one.n.per;
  if (f.area === "income" && !per) per = / (paychecks?|pay check|each check|per check|a check) /.test(s) ? "pay" : null;
  return { id: f.id, v: one.n.v, per, pct: f.kind === "rate" };
}
const LF_YES = lfSet("yes yep yeah yup confirmed confirm correct right");
const LF_YES_MORE = lfSet("thats that is it its all so and exactly");
const LF_FILLER = lfSet("um uh oh so well ok okay hmm mm");
/* The client's answer to a "Confirming": "yes", "no" or null (anything else).
   YES  each word is one of: confirmed, yes, yep, yeah, yup, correct, right, with only "that's", "that is",
        "it is", "exactly" around it ("that's right", "yes that's correct", "yep").
   NO   the line has: no, nope, nah, actually, wait, "not quite", "not exactly", "not right", "hold on".
   "Okay", "sure" and "uh huh" are not a yes: people say them to show they listen. */
function lfYesNo(text) {
  const w = lvWords(text).filter(x => !(x in LF_FILLER)),
    s = " " + w.join(" ") + " ";
  if (!w.length) return null;
  if (/ (no|nope|nah|actually|wait|not quite|not exactly|not right|not correct|hold on) /.test(s)) return "no";
  if (w.length <= 5 && w.some(x => x in LF_YES) && w.every(x => x in LF_YES || x in LF_YES_MORE)) return "yes";
  return null;
}

/* ---------- 6. one line ---------- */
/* The state of one call on one device. topic: the field that the coach asked for. ask: the open
   "Confirming". last: the last field that got a value (for a correction). kind: the last debt named.
   hypo: the time of the coach's last what-if. coach: the coach's last lines (for the echo of a yes). */
function lfStateNew(sid) {
  return { sid: sid || "", topic: null, ask: null, last: null, kind: null, hypo: 0, coach: [] };
}
const LF_FIX = / (no wait|wait|sorry|i mean|actually|scratch that|make that|more like|correction) /;
/* Words that say the number is a change or a limit, not the amount ("it went up 200", "under 2,000"). */
const LF_UNSURE =
  / (went up|gone up|go up|goes up|going up|went down|gone down|goes down|more than|less than|extra|another|used to|increase|increased|raise|raised|at least|at most|up to|under|over|above|below|minus|plus|off) /;
const LF_LINK = lfSet(
  "is are runs costs comes to about around roughly approximately maybe probably like i think its it at of the a right now currently just only , has have got on in for pay we balance total altogether sits sitting each month monthly every per would be say id guess something almost nearly close still owe owed left there so and that my our me dollars bucks ish or with toward towards goes going #ord two other weeks week biweekly twice"
);
/* True when each word between two places of a line is a joining word. */
function lfJoined(T, a, b) {
  if (b - a > 7) return false;
  for (let k = a; k < b; k++) if (T[k].d || !(T[k].t in LF_LINK)) return false;
  return true;
}
/* WHAT ONE LINE MEANS. S: the state of the call (lfStateNew), changed here. line: { id, side, text }.
   now: the time on this device when the line arrived. ctx: { kinds: the debt rows of the profile }.
   Gives a list of things heard. Each one has "do":
     value   { id, v, lo, hi, rough, per, pct, how: "own" | "topic" | "fix" }   a value for one field
     rhythm  { id: "pay.freq", v: "Every 2 weeks" }
     names   { id, list }            card names, kept for the review
     hold    { id, why, v }          heard, and not sure enough to set
     whatif  { cues }
     ask     { id, v, per, pct, rhythm }     the coach's "Confirming"
     askbad  { id, why }
     yes, no, echo                   the client's answer to the open "Confirming"
   THE RULES
   - A coach's line never gives a value. It sets the topic (the last field that it names), opens a
     "Confirming", or is a what-if. A coach's line of 4 words or more that names no field ends the topic.
   - A client's line that names its own field next to one number gives that field ("my rent is 1,850",
     "1,850 for rent"). With no field in the line, one number goes to the open topic. The topic is open for
     LF.TOPIC_MS after the coach's line and is used one time.
   - Two numbers that are not one range, or a number next to a word of change ("went up", "under"): hold.
   - A correction: in LF.FIX_MS after a value, a line that is only a number, or has "no wait", "sorry",
     "I mean", "actually" before the number, gives the same field again.
   - A line with "confirming" on the client's side is the echo of the coach: it is not read at all.
   - After a coach's what-if, the client's lines are what-ifs too until the coach's next plain line or
     LF.TOPIC_MS. */
function lfHear(S, line, now, ctx) {
  const text = String((line && line.text) || ""),
    side = line && line.side,
    T = lfTokens(text),
    s = " " + T.map(t => t.t).join(" ") + " ",
    words = lvWords(text),
    out = [];
  ctx = ctx || {};
  if (S.kind && now - S.kind.t > LF.KIND_MS) S.kind = null;
  if (S.topic && now - S.topic.t > LF.TOPIC_MS) S.topic = null;
  S.coach = S.coach.filter(c => now - c.t <= LF.ECHO_MS);
  const lone = ctx.kinds && ctx.kinds.length === 1 ? ctx.kinds[0] : null,
    kind = S.kind ? S.kind.k : lone,
    noteKind = () => {
      const d = lfFieldsIn(text, null).find(h => /^(debt|rate):/.test(h.f.key));
      if (d) S.kind = { k: d.f.key.slice(5), t: now };
    };
  if (side === "coach") {
    S.coach.push({ t: now, words, id: line.id });
    const ask = lfAskOf(text, kind);
    if (ask) {
      noteKind();
      S.topic = null;
      if (ask.bad) return [{ do: "askbad", id: ask.id || null, why: ask.bad }];
      return [Object.assign({ do: "ask" }, ask)];
    }
    const cue = lfCue(text, false),
      topic = lfTopicOf(text, kind);
    /* a question that names a field is a question, with "would" or "could" in it or not */
    const hardCue = cue.whatif && cue.cues.some(c => !/^(would|could|might|maybe|perhaps|possibly)$/.test(c));
    if (cue.whatif && (hardCue || !topic)) {
      S.topic = null;
      S.hypo = now;
      return [{ do: "whatif", cues: cue.cues }];
    }
    noteKind();
    if (topic) {
      S.topic = { id: topic.id, mode: topic.mode, t: now, line: line.id };
      S.hypo = 0;
    } else if (words.length >= 4) {
      S.topic = null;
      S.hypo = 0;
    }
    return out;
  }
  if (side !== "client") return out;
  if (/ confirming /.test(s)) return out; /* the coach's "Confirming", heard by the client's microphone */
  /* the answer to an open "Confirming" */
  let topic = S.topic;
  if (S.ask && now - S.ask.t <= LF.ASK_MS) {
    const yn = lfYesNo(text);
    if (yn) {
      const after = S.coach.filter(c => c.id !== S.ask.line && c.t >= S.ask.t);
      if (yn === "yes" && after.some(c => words.every(w => c.words.indexOf(w) >= 0))) return [{ do: "echo" }];
      out.push({ do: yn });
      if (yn === "yes") return out;
      /* "no, it is 1,900": the number can still land as a Guess for that field */
      topic = { id: S.ask.id, mode: S.ask.per || null, t: now, fix: true };
    }
  }
  const hypo = S.hypo && now - S.hypo <= LF.TOPIC_MS,
    cue = lfCue(text, !!topic);
  if (cue.whatif || (hypo && lfNums(text).length)) {
    out.push({ do: "whatif", cues: cue.whatif ? cue.cues : ["after a what-if"] });
    return out;
  }
  noteKind();
  const kind2 = S.kind ? S.kind.k : lone,
    nums = lfNums(text),
    hits = lfFieldsIn(text, kind2),
    rh = lfRhythm(text);
  /* the pay rhythm */
  let rhythmSet = false;
  if (rh && ((topic && topic.id === "pay.freq") || LF_PAY_WORDS.test(s))) {
    out.push({ do: "rhythm", id: "pay.freq", v: rh });
    rhythmSet = true;
    if (topic && topic.id === "pay.freq") S.topic = topic = null;
  }
  /* card names */
  const issuers = LF_ISSUERS.filter(n => s.indexOf(" " + n + " ") >= 0);
  if (issuers.length && ((topic && topic.id === "names:Credit card balance") || / cards? /.test(s))) {
    out.push({ do: "names", id: "names:Credit card balance", list: issuers });
    if (topic && topic.id === "names:Credit card balance") S.topic = topic = null;
  }
  if (!nums.length) return out;
  const unsure = LF_UNSURE.test(s),
    put = (f, n, how) => {
      const o = { do: "value", id: f.id, v: n.v, lo: n.lo, hi: n.hi, rough: !!n.rough || !!cue.rough, per: n.per, how };
      if (f.kind === "rate") o.pct = true;
      if (f.area === "income" && !o.per)
        o.per = rhythmSet ? "pay" : how === "own" ? null : (topic && topic.mode) || null;
      if (f.area === "income" && !o.per && topic && topic.id === f.id) o.per = topic.mode || null;
      out.push(o);
    },
    fits = (f, n) => (f.kind === "rate" ? n.pct || (!n.money && n.v <= 60) : f.kind === "money" && !n.pct);
  /* the line names its own field or fields */
  const named = hits.filter(h => h.f.kind === "money" || h.f.kind === "rate");
  if (named.length) {
    const money = nums.filter(n => !n.pct),
      pct = nums.filter(n => n.pct),
      mf = named.filter(h => h.f.kind === "money"),
      rf = named.filter(h => h.f.kind === "rate"),
      pairs = [];
    let ok = true;
    [
      [mf, money],
      [rf, pct.length ? pct : rf.length && !mf.length ? nums.filter(n => !n.money && n.v <= 60) : pct],
    ].forEach(g => {
      const F = g[0],
        N = g[1];
      if (!F.length || !N.length) return;
      if (F.length !== N.length) {
        ok = false;
        return;
      }
      F.forEach((h, i) => {
        const n = N[i],
          near = h.to <= n.i0 ? lfJoined(T, h.to, n.i0) : lfJoined(T, n.i1 + (n.pct ? 1 : 0), h.at);
        if (near) pairs.push([h.f, n]);
        else ok = false;
      });
    });
    const usedN = pairs.map(p => p[1]);
    if (ok && pairs.length && !unsure && nums.every(n => usedN.indexOf(n) >= 0)) {
      pairs.forEach(p => put(p[0], p[1], "own"));
      return out;
    }
    /* the line names the field of the open topic, with one number: the topic takes it */
    if (
      topic &&
      named.length === 1 &&
      named[0].f.id === topic.id &&
      nums.length === 1 &&
      !unsure &&
      fits(named[0].f, nums[0])
    ) {
      put(named[0].f, nums[0], "topic");
      if (S.topic === topic) S.topic = null;
      return out;
    }
    out.push({
      do: "hold",
      id: named[0].f.id,
      v: nums.length === 1 ? nums[0].v : null,
      why:
        nums.length > 1 && !(ok && pairs.length)
          ? "More than one number in this line."
          : "A number near this, and not sure that it is the amount.",
    });
    return out;
  }
  /* no field in the line: the open topic, or a correction of the last value */
  const bare = T.every(
      (t, i) =>
        nums.some(n => i >= n.i0 && i < n.i1 + (n.pct ? 1 : 0)) ||
        t.t in LF_LINK ||
        t.t in LF_FILLER ||
        lfStop(t.t) ||
        t.t in LF_ROUGH_PRE ||
        /^(no|wait|sorry|mean|actually|scratch|make|more|correction|a|year|week|paycheck|check|time|dollars|bucks|percent|after|taxes|tax)$/.test(
          t.t
        )
    ),
    fixCue = LF_FIX.test(s) || / no /.test(s);
  if (topic) {
    const f = lfField(topic.id);
    if (!f || (f.kind !== "money" && f.kind !== "rate")) return out;
    const one = lfOne(nums, f.kind === "rate" ? "pct" : "money");
    if (one.many) out.push({ do: "hold", id: f.id, v: null, why: "More than one number in this line." });
    else if (one.n && unsure)
      out.push({ do: "hold", id: f.id, v: one.n.v, why: "A number near this, and not sure that it is the amount." });
    else if (one.n) put(f, one.n, topic.fix ? "fix" : "topic");
    if (one.n || one.many) if (S.topic === topic) S.topic = null;
    return out;
  }
  if (S.last && now - S.last.t <= LF.FIX_MS && (fixCue || bare) && !unsure) {
    const f = lfField(S.last.id);
    if (f && (f.kind === "money" || f.kind === "rate")) {
      const one = lfOne(nums, f.kind === "rate" ? "pct" : "money");
      if (one.n) {
        const n = Object.assign({}, one.n);
        if (f.area === "income" && !n.per) n.per = S.last.per || null;
        put(f, n, "fix");
      }
    }
  }
  return out;
}
