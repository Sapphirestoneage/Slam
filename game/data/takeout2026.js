/* ============================================================================
   SLAM the Game: data/takeout2026.js
   PURPOSE     Data only. The reference numbers for "Taking money out" (features/takeout.js): the rules for
               reaching retirement money before age 59 and a half, and the health-plan credit of the
               marketplace (ACA) for 2026 cover.
   INPUT       Nothing.
   OUTPUT      One constant: window.TAKEOUT_2026.
   DEPENDS ON  Nothing.
   SOURCE      Copied on 2026-11-23 from the SPARKS reference files data/early_access_rules_2026.json and
               data/aca_2026.json (version 2026.0, as of 2026-01-01). Early access: IRC 72(t), IRS Notice
               2022-6, IRC 408A(d)(3)(F), IRS Publication 590-B Table I. Health plan: the HHS 2025 poverty
               guidelines (they govern 2026 cover) and the applicable-percentage table.
   RULES       The two source files say "unverified": the numbers were written from memory and not
               compared line by line with the official documents. The screen says so. The rule that the
               credit stops above 4 times the poverty line can change with new law, so the screen shows
               the cost with that rule and without it.
   ========================================================================= */
window.TAKEOUT_2026 = {
  version: "2026.0",
  asOf: "2026-01-01",
  verified: false,
  early: {
    accessAge: 59.5,
    penaltyRate: 0.1,
    seasoningYears: 5,
    seppMaxRate: 0.05,
    rule55Age: 55,
    thinYears: 1,
    basisShare: 0.6,
    /* IRS Publication 590-B Table I (single life expectancy), ages 40 to 65 */
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
    /* [up to this multiple of the poverty line, the share of income that the household pays] */
    percent: [
      [1.33, 0.0207],
      [1.5, 0.0311],
      [2, 0.0493],
      [2.5, 0.0654],
      [3, 0.0824],
      [4, 0.0866],
    ],
    capNoCliff: 0.085,
  },
};
