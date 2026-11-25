/* ============================================================================
   SLAM the Game, test: tests/live-fill-number-reader.js
   PURPOSE     Examine the number reader of Live Session Mode (Part 3): each form of spoken money and
               rates that the build assumes a speech recognizer writes, the rough numbers and the
               ranges (the middle, marked rough), the pay rhythm, how often an amount comes, and each
               thing that the reader must refuse (a phone number, a year, a time of day, a date, an
               age, a count, "one" as a pronoun). Each expected value was worked out by hand.
   INPUT       account/live.js and account/livefill.js, loaded here. Text only: no microphone.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: account/livefill.js (lfNums, lfOne, lfRhythm, lfTokens).
   ========================================================================= */
{
  const fs = require("fs"),
    vm = require("vm");
  ["account/live.js", "account/livefill.js"].forEach(f =>
    vm.runInThisContext(fs.readFileSync(GAME_DIR + f, "utf8"), { filename: f })
  );
  /* the numbers of a line as short text: "1850", "450~" (rough), "24.99%" */
  const read = t =>
      lfNums(t)
        .map(n => n.v + (n.rough ? "~" : "") + (n.pct ? "%" : "") + (n.per ? "/" + n.per : ""))
        .join(" "),
    is = (t, want) => chk('reads "' + t + '" as ' + (want || "nothing"), read(t) === want, read(t));

  /* ---------- 1. money, each form ---------- */
  is("$1,850", "1850");
  is("1850", "1850");
  is("1,850.50", "1850.5");
  is("eighteen fifty", "1850");
  is("eighteen hundred", "1800");
  is("1.8k", "1800");
  is("two grand", "2000");
  is("a grand", "1000");
  is("a hundred", "100");
  is("four fifty", "450");
  is("twenty four hundred", "2400");
  is("two thousand one hundred", "2100");
  is("two thousand and fifty", "2050");
  is("two thousand five hundred fifty", "2550");
  is("three hundred and fifty", "350");
  is("fifteen hundred dollars", "1500");
  is("3 thousand", "3000");
  is("3 and a half thousand", "3500");
  is("twenty five", "25");
  is("1,250,000", "1250000");
  is("Rent is 1850.", "1850");
  is("one dollar", "1");

  /* ---------- 2. rates ---------- */
  is("24.99 percent", "24.99%");
  is("24.99%", "24.99%");
  is("twenty four percent", "24%");
  is("twenty four point nine nine percent", "24.99%");
  is("one percent", "1%");
  chk(
    "a plain number up to 60 answers a question about a rate; a number with $ does not",
    lfOne(lfNums("about 25"), "pct").n.v === 25 && !lfOne(lfNums("$25"), "pct").n && !lfOne(lfNums("1850"), "pct").n
  );

  /* ---------- 3. rough numbers and ranges: the middle, marked rough ---------- */
  is("about 400", "400~");
  is("around two grand", "2000~");
  is("roughly 1,850", "1850~");
  is("I think it's 1850", "1850~");
  is("1850 or so", "1850~");
  is("1850 give or take", "1850~");
  is("400-ish", "400~");
  is("400-ish, maybe 500", "450~");
  is("between 3 and 4 thousand", "3500~");
  is("400 to 500", "450~");
  is("400-500", "450~");
  is("four or five hundred", "450~");
  is("between 24 and 26 percent", "25~%");
  {
    const n = lfNums("400-ish, maybe 500")[0],
      m = lfNums("between 3 and 4 thousand")[0];
    chk("a range keeps its two ends: 400 and 500", n.lo === 400 && n.hi === 500 && n.range === true);
    chk("between 3 and 4 thousand: both ends are thousands", m.lo === 3000 && m.hi === 4000);
  }
  chk(
    "two ends more than 3 times apart are not one range: two numbers stay",
    read("100 or 900") === "100 900" && lfOne(lfNums("100 or 900"), "money").many === true
  );
  chk(
    "two amounts in one line are two numbers, not a range",
    read("rent is 1850 and utilities are 150") === "1850 150"
  );
  chk("a plain number is not rough", lfNums("1850")[0].rough === false);

  /* ---------- 4. how often the amount comes ---------- */
  is("about 4,200 a month", "4200~/month");
  is("2,100 every two weeks", "2100/pay");
  is("two thousand one hundred each time", "2100/pay");
  is("1,200 twice a month", "1200/pay");
  is("900 a week", "900/week");
  is("60,000 a year", "60000/year");
  is("twenty four hundred a month", "2400/month");

  /* ---------- 5. the pay rhythm: the game's own answers ---------- */
  const rh = (t, want) => chk('rhythm of "' + t + '" is ' + want, lfRhythm(t) === want, String(lfRhythm(t)));
  rh("every two weeks", "Every 2 weeks");
  rh("I get paid every other Friday", "Every 2 weeks");
  rh("biweekly", "Every 2 weeks");
  rh("bi-weekly", "Every 2 weeks");
  rh("twice a month", "Twice a month");
  rh("on the 1st and the 15th", "Twice a month");
  rh("semi-monthly", "Twice a month");
  rh("every week", "Weekly");
  rh("weekly", "Weekly");
  rh("once a month", "Monthly");
  rh("monthly", "Monthly");
  rh("my rent is 1850", null);
  chk(
    "each rhythm is an answer that the game already has for payFreq",
    ["Every 2 weeks", "Twice a month", "Weekly", "Monthly"].every(f => periods(f) !== 12 || f === "Monthly")
  );

  /* ---------- 6. what the reader refuses ---------- */
  is("my number is 555-123-4567", "");
  is("call me at 5551234567", "");
  is("it's five five five one two three four", "");
  is("555 1234", "");
  is("I moved in 2019", "");
  is("since twenty twenty", "");
  is("back in two thousand twenty four", "");
  is("let's talk at 3 pm", "");
  is("at 3", "");
  is("around 3:30", "");
  is("it is due on the 1st", "");
  is("that one is fine", "");
  is("which one", "");
  is("I'm 34", "");
  is("I am 34", "");
  is("two kids", "");
  is("5 years", "");
  is("every two weeks", "");
  is("3 of them", "");
  is("option 2", "");
  is("a few hundred", "");
  is("a couple thousand", "");
  is("my 401k", "");
  is("a 401(k) and a 529", "");
  is("the 1099 form", "");
  chk(
    '"one card, about three thousand two hundred on it": the count is refused, the amount is read',
    read("One card, about three thousand two hundred on it.") === "3200~"
  );
  chk('"my 401k has 12,000": the k of 401(k) is not a thousand', read("my 401k has 12,000") === "12000");
  chk('"I have 2000 in savings" is money, not a year (no "in" before it)', read("I have 2000 in savings") === "2000");
  chk('"$2,000 in 2019": the money is read, the year is refused', read("I had $2,000 in 2019") === "2000");
  chk(
    "one number of a kind: exactly one gives it, two give many, none gives nothing",
    lfOne(lfNums("rent is 1850"), "money").n.v === 1850 &&
      lfOne(lfNums("1850 and 150"), "money").many === true &&
      !lfOne(lfNums("no idea"), "money").n &&
      !lfOne(lfNums("no idea"), "money").many
  );
  chk(
    "the reader never gives NaN or a negative number",
    ["", "   ", "$", "-", "k", "point five", "hundred", "and a half", "1,,2", "$ 5 5", "ish"].every(t =>
      lfNums(t).every(n => isFinite(n.v) && n.v >= 0)
    )
  );
}
