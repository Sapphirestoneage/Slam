/* ============================================================================
   SLAM the Game: data/tax2026.js
   PURPOSE     Data only. The 2026 federal income tax numbers for the tax view (features/taxview.js), the
               two paths (features/paths.js) and the simulators (features/sims/).
   SOURCE      Internal Revenue Service. Brackets, standard deduction and the 0% long-term capital gains
               limits: Revenue Procedure 2025-32 (tax year 2026). 401(k) and IRA limits: IRS Notice
               2025-67. HSA limits: Revenue Procedure 2025-19. The main SLAM app has the same brackets in
               data/reference-2026.json.
   DATE        Tax year 2026. Copied into the game on 2026-11-23.
   RULES       Each bracket row is [the start of the bracket in taxable income, the rate]. State tax is not
               here: the player gives a guess for it.
   ========================================================================= */
const TAX_2026 = {
  year: 2026,
  source: "IRS Revenue Procedure 2025-32, Notice 2025-67, Revenue Procedure 2025-19",
  checked: "2026-11-23",
  standard: { single: 16100, joint: 32200, head: 24150 },
  brackets: {
    single: [
      [0, 0.1],
      [12400, 0.12],
      [50400, 0.22],
      [105700, 0.24],
      [201775, 0.32],
      [256225, 0.35],
      [640600, 0.37],
    ],
    joint: [
      [0, 0.1],
      [24800, 0.12],
      [100800, 0.22],
      [211400, 0.24],
      [403550, 0.32],
      [512450, 0.35],
      [768700, 0.37],
    ],
    head: [
      [0, 0.1],
      [17700, 0.12],
      [67450, 0.22],
      [105700, 0.24],
      [201750, 0.32],
      [256200, 0.35],
      [640600, 0.37],
    ],
  },
  gainsZero: { single: 49450, joint: 98900, head: 66200 },
  limits: { k401: 24500, ira: 7500, hsaOne: 4400, hsaFamily: 8750 },
  payroll: { ss: 0.062, ssBase: 184500, medicare: 0.0145 },
};
