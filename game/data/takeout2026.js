/* ============================================================================
   SLAM the Game: data/takeout2026.js
   PURPOSE     Data only. The reference numbers for "Taking money out" (features/takeout.js): the rules for
               reaching retirement money before age 59 and a half, and the health-plan credit of the
               marketplace (ACA) for plan year 2026.
   INPUT       Nothing.
   OUTPUT      One constant: window.TAKEOUT_2026.
   DEPENDS ON  Nothing.
   SOURCES     Each table, its source, and the result of the check on 2026-11-23. The build machine could
               not open irs.gov, hhs.gov or kff.org directly (the network refused them). Each check was
               made through web search results that quote the document. "Quoted" means a search result
               showed the number from that document. "Agrees" means more than one independent copy of
               the table shows the same numbers.
               1. The 10% extra tax before 59 and a half (IRC 72(t)(1)): IRS, "Retirement topics:
                  Exceptions to tax on early distributions" and Tax Topic 558. Quoted. Correct.
               2. The Rule of 55 (IRC 72(t)(2)(A)(v)): the same IRS page. Separation in or after the
                  year of age 55, plans at work only, not an IRA. Quoted. Correct.
               3. 72(t) payments (IRS Notice 2022-6): the rate limit is the greater of 5% and 120% of the
                  federal mid-term rate, and the payments go on for 5 years or to 59 and a half, the
                  longer of the two. Agrees (Kitces, Stifel, and others that cite the Notice). The IRS
                  page itself was not quoted in a search result.
               4. The single life expectancy table (26 CFR 1.401(a)(9)-9(b), also IRS Publication 590-B
                  Table I), ages 40 to 65. Ages 40 to 57 quoted from the eCFR. Ages 59, 60 and 65 quoted
                  from Publication 590-B. Ages 58 and 61 to 64 agree in the copies of Fidelity, Morgan
                  Stanley and FindLaw. All 26 values were correct. No value changed.
               5. The 5-year wait for a Roth conversion (IRC 408A(d)(3)(F), 26 CFR 1.408A-6, Publication
                  590-B): each conversion has its own 5 years. Quoted. Correct.
               6. The poverty line: HHS 2025 poverty guidelines, Federal Register of 2025-01-17 (document
                  2025-01377), 48 states and DC: $15,650 for one person, $5,500 for each more. Quoted.
                  Correct. Marketplace cover for 2026 uses the guidelines of the year before (2025).
               7. The share of income that a household pays (the applicable percentage table for 2026):
                  IRS Rev. Proc. 2025-25. CHANGED on 2026-11-23. The earlier numbers (2.07% to 8.66%, one
                  number for each band) were not the 2026 table. The 2026 table goes from 2.10% to 9.96%
                  and rises inside each band. The numbers agree in a CMS table for 2026 and in other
                  copies. The top value, 9.96%, was quoted from the IRS text. The IRS PDF table itself
                  was not quoted in a search result.
               8. The credit stops above 4 times the poverty line in 2026: the larger credits of 2021 to
                  2025 ended on 2025-12-31 and Congress did not renew them (KFF, 2026). Quoted. Correct.
                  The 8.5% of income limit (capNoCliff) is the 2021 to 2025 rule. The game keeps it only
                  to show what a renewal would change.
   RULES       basisShare (60% of a regular account is what the player put in) and thinYears are
               assumptions of the game, not law. Alaska and Hawaii have higher poverty lines, and the
               game does not use them.
   ========================================================================= */
window.TAKEOUT_2026 = {
  version: "2026.1",
  asOf: "2026-01-01",
  checked: "2026-11-23",
  /* What the screen says about the checks. how: "quoted" or "agrees" (see SOURCES above). */
  checks: {
    early: [
      [
        "The 10% extra tax, the Rule of 55 and the 5-year wait for a conversion",
        "the IRS pages and Publication 590-B",
        "quoted",
      ],
      ["The 72(t) payment rule", "IRS Notice 2022-6", "agrees"],
      ["The life expectancy table", "the IRS regulation and Publication 590-B", "quoted"],
    ],
    aca: [
      ["The poverty line", "the HHS 2025 guidelines", "quoted"],
      ["The share of income you pay", "IRS Rev. Proc. 2025-25", "agrees"],
      ["The credit stops above the line in 2026", "KFF", "quoted"],
    ],
  },
  early: {
    accessAge: 59.5,
    penaltyRate: 0.1,
    seasoningYears: 5,
    seppMaxRate: 0.05,
    rule55Age: 55,
    thinYears: 1,
    basisShare: 0.6,
    /* The single life expectancy table, ages 40 to 65 */
    life: {
      40: 45.7,
      41: 44.8,
      42: 43.8,
      43: 42.9,
      44: 41.9,
      45: 41.0,
      46: 40.0,
      47: 39.0,
      48: 38.1,
      49: 37.1,
      50: 36.2,
      51: 35.3,
      52: 34.3,
      53: 33.4,
      54: 32.5,
      55: 31.6,
      56: 30.6,
      57: 29.8,
      58: 28.9,
      59: 28.0,
      60: 27.1,
      61: 26.2,
      62: 25.4,
      63: 24.5,
      64: 23.7,
      65: 22.9,
    },
  },
  aca: {
    medicareAge: 65,
    fplBase: 15650,
    fplPerPerson: 5500,
    cliffMultiple: 4,
    /* [from this multiple of the poverty line, to this multiple, the share of income at the start of the
       band, the share at the end]. Inside a band the share rises in a straight line. */
    percent: [
      [0, 1.33, 0.021, 0.021],
      [1.33, 1.5, 0.0314, 0.0419],
      [1.5, 2, 0.0419, 0.066],
      [2, 2.5, 0.066, 0.0844],
      [2.5, 3, 0.0844, 0.0996],
      [3, 4, 0.0996, 0.0996],
    ],
    capNoCliff: 0.085,
  },
};
