// SPDX-License-Identifier: AGPL-3.0-only
// Beta feedback (B9): the notes that "Report this screen" saved in the client file (session.feedback) before
// Nov 25 2026. They stay readable here and still go out in the export. New reports use the one Report sheet
// (js/report/page.js): the button "Report a bug or idea" in the top bar, and the same item in the More menu.
import { h } from './dom.js';

// Coach tools › Session: the notes so far.
export function feedbackCard(ctx) {
  const list = ctx.store.doc.session?.feedback || [];
  return h('div.card', {}, h('h3', {}, `Beta notes (${list.length})`), list.length
    ? h('table.rows.mini', {}, h('tbody', {}, [...list].reverse().map(f => h('tr', {}, h('td', {}, new Date(f.at).toLocaleString()), h('td', {}, f.title || f.screen), h('td', { style: { whiteSpace: 'normal' } }, f.note)))))
    : h('p.muted.small', {}, 'None in this file. New reports go through Report a bug or idea, in the top bar, and reach the admin inbox.'));
}
