/* ============================================================================
   SLAM the Game: data/limits2026.js
   PURPOSE     Data only. The 2026 limits of the tax-favored accounts, for the two paths (features/paths.js).
               The tax brackets, the standard deduction, the payroll tax and the state tax come from the
               retirement engine (vendor/retire-engine.js, data/retire-*.json), not from this file.
   SOURCE      Internal Revenue Service. 401(k) and IRA limits: IRS Notice 2025-67. HSA limits: Revenue
               Procedure 2025-19.
   DATE        Tax year 2026. Copied into the game on 2026-11-23.
   ========================================================================= */
const LIMITS_2026 = {
  year: 2026,
  source: "IRS Notice 2025-67 and Revenue Procedure 2025-19",
  checked: "2026-11-23",
  k401: 24500,
  ira: 7500,
  hsaOne: 4400,
  hsaFamily: 8750,
};
