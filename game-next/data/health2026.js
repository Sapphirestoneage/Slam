/* ============================================================================
   SLAM the Game: data/health2026.js
   PURPOSE     Data only. What health cover costs in 2026 with no job, for the quit fund countdown
               (features/countdown.js). No logic.
   SOURCE      KFF, 2026 Employer Health Benefits Survey (released 2026-10-22): the average yearly
               premium of a plan at work, for one person and for a family
               (https://www.kff.org/health-costs/report/2026-employer-health-benefits-survey/).
               COBRA is the full premium plus 2% for administration (the most the law allows).
               KFF, Marketplace Average Monthly Benchmark Premiums, 2026: the national average of the
               second-lowest-cost silver plan for a 40-year-old, before any tax credit
               (https://www.kff.org/affordable-care-act/state-indicator/marketplace-average-benchmark-premiums/).
   DATE        Plan year 2026. Checked on 2026-11-23.
   RULES       National averages. The price where the player lives, and at their age, can be far from
               these. A tax credit can lower the marketplace price.
   ========================================================================= */
const HEALTH_2026 = {
  year: 2026,
  source: "KFF 2026 Employer Health Benefits Survey, and KFF marketplace benchmark premiums for 2026",
  checked: "2026-11-23",
  employerSingleYear: 9804,
  employerFamilyYear: 28303,
  cobraFactor: 1.02,
  marketplace40Month: 625,
};
