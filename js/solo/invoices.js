// SPDX-License-Identifier: AGPL-3.0-only
// Standalone: "Who still owes me?" (run Not built, groups 1 to 5, Part 5). An invoice and late-payment tracker for
// work on your own. The list is kept with the page's answers (settings.start.invoices_list, in the plan on this device
// and in the link you choose to share), so it needs no new table. The math is gigInvoicesOf in js/math/gig.js (M8G);
// this page only shows what it returns. Calm words: a late payment is a date that passed, never a judgment.
import { boot, h, btn, chip, money, numBox, copyLink, foot } from './shell.js';
import { pack } from '../start/link.js';
import { gigInvoicesOf, gigNudgeOf, GIG_TERMS } from '../math/gig.js';

const $ = id => document.getElementById(id);
const KEY = 'invoices_list', DRAFT = 'invoices_draft';
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const day = iso => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const days = n => `${n} ${n === 1 ? 'day' : 'days'}`;
const termWords = t => (t === 0 ? 'On receipt' : `${t} days`);
// The words of each step of the reminder rhythm (gigNudgeOf picks the step; the words are yours to change).
const NUDGE = {
  note: ['A friendly note', 'Hi, a quick note that invoice [number] for [amount] was due on [date]. Here it is again in case it got buried. Thank you!'],
  second: ['A second note, with the invoice attached', 'Hi, following up on invoice [number] for [amount], due [date]. Could you let me know when it is scheduled to be paid? Happy to resend anything you need.'],
  call: ['A short call or message to the person who pays', 'Hi, I am checking on invoice [number] for [amount], now a month past its date. Is there anything holding it up on your side? I would like to get it settled this week.'],
  pause: ['A pause on new work, said plainly', 'Hi, invoice [number] for [amount] is still open from [date]. I will hold off on new work until it is settled, and I am glad to set up a payment plan if that helps.'],
};
const STATUS = { past: 'Past its date', open: 'Not due yet', paid: 'Paid' };

function draw(api) {
  foot(); const step = $('step'); if (step) step.textContent = 'On its own';
  const list = () => api.mine()[KEY] || [], keep = next => { api.remember({ [KEY]: next }); api.render(); };
  const fresh = () => ({ client: '', amount: null, sent: today(), terms: 30, ...(api.mine()[DRAFT] || {}) }), draft = fresh();
  // read the kept draft each time: a name typed, then an amount tapped, keeps both
  const setDraft = (patch, redraw = false) => { api.remember({ [DRAFT]: { ...fresh(), ...patch } }); if (redraw) api.render(); else api.save(); };
  const R = gigInvoicesOf(list(), today());
  let undo = api.mine().invoices_undo || null;

  const box = (label, input, help) => h('div.st-field', {}, h('div.st-flabel', {}, label), h('div.st-box.narrow', {}, h('div.in', {}, input)), help ? h('div.st-small.st-soft', { style: { marginTop: '4px' } }, help) : null);
  const add = h('div.st-card', {}, h('h2', { style: { marginTop: 0 } }, 'Add an invoice'),
    box('Who it is for', h('input', { type: 'text', id: 'f_client', autocomplete: 'off', placeholder: 'A short name', 'aria-label': 'Who it is for', value: draft.client, onInput: e => setDraft({ client: e.target.value }) })),
    numBox('The amount', draft.amount, [100, 250, 500, 1000, 2500], (v, typing) => setDraft({ amount: v }, !typing), { id: 'f_amount' }),
    box('The day you sent it', h('input', { type: 'date', id: 'f_sent', style: 'width:100%;flex:1', 'aria-label': 'The day you sent it', value: draft.sent, onChange: e => setDraft({ sent: e.target.value }) })),
    h('div.st-field', {}, h('div.st-flabel', {}, 'When it is due'), h('div.st-chips', {}, GIG_TERMS.map(t => chip(termWords(t), draft.terms === t, () => setDraft({ terms: t }, true))))),
    h('div.st-row', { style: { marginTop: '10px' } }, btn('Add it', () => {
      const d = fresh();
      if (!(d.amount > 0) || !d.sent) { $('f_amount')?.closest('.in')?.classList.add('st-pulse'); return; }
      const id = `i${Date.now().toString(36)}`;
      api.remember({ [DRAFT]: { client: '', amount: null, sent: today(), terms: d.terms }, invoices_undo: null });
      keep([...list(), { id, client: (d.client || '').trim(), amount: d.amount, sent: d.sent, terms: d.terms, paid: null }]);
    }, 'primary')));

  const change = (id, patch) => keep(list().map(i => (i.id === id ? { ...i, ...patch } : i)));
  const row = r => {
    const nudge = r.status === 'past' ? gigNudgeOf(r.daysPast) : null;
    return h('div', { style: { padding: '10px 0', borderTop: '2px solid var(--border-row)' } },
      h('div.st-row', { style: { justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } }, h('b', {}, `${r.client || 'No name'} · ${money(r.amount)}`), h('span.st-tag', { class: r.status === 'paid' ? 'yours' : null }, STATUS[r.status])),
      h('div.st-small.st-soft', { style: { margin: '4px 0 8px' } },
        r.status === 'paid' ? `Paid ${day(r.paid)}, ${days(r.daysToPay)} after it was sent${r.paidLate ? `, ${days(r.paidLate)} after its date` : ''}` : r.status === 'past' ? `Was due ${day(r.dueDate)}, ${days(r.daysPast)} ago. Next: ${NUDGE[nudge.id][0].toLowerCase()}` : `Due ${day(r.dueDate)}, in ${days(r.daysToDue)}`),
      h('div.st-row', { style: { gap: '8px' } },
        r.status === 'paid' ? btn('Not paid yet', () => change(r.id, { paid: null }), 'slim') : btn('Mark paid', () => change(r.id, { paid: today() }), 'slim'),
        btn('Remove', () => { api.remember({ invoices_undo: list().find(i => i.id === r.id) }); keep(list().filter(i => i.id !== r.id)); }, 'slim')));
  };
  const answer = R.ready
    ? h('div.st-card.hero', { id: 'answer', 'aria-live': 'polite' }, h('div.st-eyebrow', {}, 'Your answer'), h('div.st-soft', {}, 'Still coming to you'), h('div.st-big', {}, money(Math.round(R.waiting))),
      h('p', { style: { fontWeight: 700 } }, R.pastCount ? `${money(Math.round(R.past))} of it is past its date, on ${R.pastCount} ${R.pastCount === 1 ? 'invoice' : 'invoices'}; the oldest by ${days(R.oldest)}.${R.notDue ? ` ${money(Math.round(R.notDue))} is not due yet.` : ''}` : R.waiting > 0 ? `Nothing is past its date. ${money(Math.round(R.next30))} is due in the next 30 days.` : 'Everything you sent is paid.'),
      h('div', {}, R.rows.map(row)),
      undo ? h('div.st-row', { style: { marginTop: '8px' } }, btn(`Undo: put back ${undo.client || 'the invoice'} (${money(undo.amount)})`, () => { api.remember({ invoices_undo: null }); keep([...list(), undo]); }, 'slim')) : null,
      R.pastCount ? h('details.st-fold', {}, h('summary', {}, 'Past its date, by how long'), h('ul.st-list', {}, R.ages.filter(a => a.count).map(a => h('li', {}, h('span.dot', {}, String(a.count)), h('span', {}, a.label), h('span.when', {}, money(Math.round(a.total))))))) : null,
      R.clients.length > 1 || R.paidCount ? h('details.st-fold', {}, h('summary', {}, 'How fast each client pays'), h('ul.st-list', {}, R.clients.map(c => h('li', {}, h('span.dot', {}, String(c.count)), h('span', {}, c.client, h('small', { style: { display: 'block' } }, c.avgDaysToPay == null ? 'No paid invoice yet' : `Pays in ${Math.round(c.avgDaysToPay)} days on average${c.avgDaysLate >= 1 ? `, ${Math.round(c.avgDaysLate)} after the date` : ''}`)), h('span.when', {}, c.waiting ? `${money(Math.round(c.waiting))} open` : 'Nothing open'))))) : null,
      h('details.st-fold', {}, h('summary', {}, 'A calm reminder rhythm, with words to copy'), h('p.st-small', {}, 'A rhythm many people who work on their own use; change the words to sound like you. Most late payments are a busy inbox, not a refusal.'),
        Object.entries(NUDGE).map(([id, [title, words]]) => h('div', { style: { marginTop: '8px' } }, h('p.st-small', { style: { fontWeight: 700, marginBottom: '2px' } }, `${title} (from ${days(({ note: 1, second: 14, call: 30, pause: 60 })[id])} past the date)`), h('p.st-small', {}, words)))))
    : h('div.st-card', { id: 'answer' }, h('h2', { style: { marginTop: 0 } }, 'Your list shows here'), h('p.st-soft', { style: { marginBottom: 0 } }, 'Add the first invoice above: who it is for, the amount, the day you sent it.'));
  const carry = h('div.st-card', { id: 'carry' }, h('h2', { style: { marginTop: 0 } }, 'Take it with you'), h('p.st-small', {}, 'The list stays on this device with your plan, and in your link. Anyone with the link sees the names and amounts.'),
    h('div.st-row', {}, copyLink(api), btn('All the steps', async () => { location.href = `one.html#/d/${await pack(api.store.doc)}`; }, 'slim')));
  $('main').replaceChildren(h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'One thing, done right'), h('h1', {}, 'Who still owes me?'), h('p', { style: { marginBottom: 0 } }, 'Every invoice you sent, what is still coming, and what is past its date, with a calm next step for each.')), add, answer, carry);
}
boot('invoices', draw);
