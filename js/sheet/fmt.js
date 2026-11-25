// SPDX-License-Identifier: AGPL-3.0-only
// The number formats of a workbook cell, by unit. A file of its own: the writer (js/sheet/excel.js) needs only this,
// so the game can load the writer without the web app's registries (js/sheet/planbook.js).
export const FMT = { money: '"$"#,##0', cents: '"$"#,##0.00', pct: '0.0#%', months: '0', number: 'General', years: '0.0', day: '0', date: 'yyyy-mm-dd', month: 'yyyy-mm', text: '@', choice: '@', yesno: '@', list: '@' };
