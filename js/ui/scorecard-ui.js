// SPDX-License-Identifier: AGPL-3.0-only
// Plan › Scorecard (Phase 3, batch 2): eleven areas, each Strong, OK or Hole from the numbers or by the coach's
// call; the holes ranked (before the client's FOO step first, then payoff over effort), each with its payoff in the
// current money view, its effort in hours (editable), its best-return score, a pick for the plan, and How we got
// this behind a caret; OK areas as rows and Strong ones as slim rows, so strengths show too.
import { h, icon, clear } from './dom.js';
import * as S from './staples.js';
import { scorecardOf } from '../math/scorecard.js';
import { parkHole, unparkHole, parkedBack, sessionCount, makeHomework } from '../program.js';
import { RATINGS } from '../registry/scorecard.js';
import { money } from '../format.js';

const head = (title, sub, ...right) => h('div.page-head', {}, h('div', {}, h('h1', {}, title), sub ? h('p', {}, sub) : null), h('div.row-line', {}, ...right));
const TAG = { Strong: 'good', OK: 'plain', Hole: 'warn' };
export const ratingTag = rating => (rating ? h(`span.tag.${TAG[rating]}`, {}, rating) : h('span.tag.plain', {}, 'Not rated'));
const fiDaysText = d => (d == null ? null : `${d.toFixed(1)} FI days`);

export function scorecardScreen(app, ctx) {
  const doc = ctx.store.doc;
  const sc = scorecardOf(doc, ctx.ref, { now: ctx.now(), flags: app.flags });
  const setArea = (id, patch) => ctx.store.setIn('scorecard', ['areas', id], { ...(doc.scorecard?.areas?.[id] || {}), ...patch }, 'Scorecard');
  const clearArea = (id, keys) => { const cur = { ...(doc.scorecard?.areas?.[id] || {}) }; for (const k of keys) delete cur[k]; ctx.store.setIn('scorecard', ['areas', id], Object.keys(cur).length ? cur : undefined, 'Scorecard'); };
  const choose = (id, on) => ctx.store.setIn('scorecard', ['chosen'], on ? [...(doc.scorecard?.chosen || []), id] : (doc.scorecard?.chosen || []).filter(x => x !== id), 'Top holes');
  // The rating: the coach's call wins; Auto puts the numbers' call back.
  const picker = a => h('div.row-line.coach-only', { style: { gap: '6px', flexWrap: 'nowrap' } }, app.prefs.clientView ? null : ratingTag(a.rating),
    S.toggle(RATINGS.map(r => [r, r]), a.rating, v => (v ? setArea(a.id, { rating: v }) : clearArea(a.id, ['rating', 'reason'])), { label: `${a.name} rating` }),
    a.override ? S.button('Auto', { size: 'small', tip: a.auto ? `Back to the numbers' call: ${a.auto.rating}` : 'The numbers cannot rate this one', onClick: () => clearArea(a.id, ['rating', 'reason']) }) : null);
  const reasonBox = a => (a.override
    ? h('span.coach-only', {}, S.textInput(a.coachReason, v => setArea(a.id, { reason: v }), { hint: 'Why, in a few words', width: 320, key: `score:${a.id}:reason` }))
    : h('span.reason', {}, a.reason));
  const clientTag = a => (app.prefs.clientView ? ratingTag(a.rating) : null); // Client view: the rating as a tag, no picker
  const source = a => h('span.muted.small', {}, a.source === 'coach' ? "The coach's call" : a.source === 'auto' ? 'From the numbers' : 'Not rated yet');
  const how = a => S.moreBlock(`score:how:${a.id}`, () => h('ul.how-list', {}, a.math.map(t => h('li', {}, t))), { label: 'How we got this' });
  // A hole: rank, name, the rating picker, the reason, payoff (in the money view), effort, score, in the plan, how.
  // Park it: not now, and when we come back (next session, in N sessions, or a date), plus a note.
  const park = (anchor, a) => { let kind = 'next', n = 2; const date = h('input', { type: 'date', 'aria-label': 'Back on' }); const note = h('input', { placeholder: 'Why (optional)', 'aria-label': 'Why park it' });
    const box = h('div.stack', { style: { gap: '8px' } });
    const draw = () => clear(box, h('strong', {}, `Park ${a.name}`), h('span.muted.small', {}, 'Not now. It drops to the bottom and comes back to Suggested for today when it is due.'),
      S.labelled('Back', S.toggle([['next', 'Next session'], ['sessions', 'In N sessions'], ['date', 'A date']], kind, v => { kind = v; draw(); }, { label: 'When it comes back' })),
      kind === 'sessions' ? h('div.row-line', { style: { gap: '8px' } }, S.stepper(n, v => { n = v ?? 2; }, { min: 1, max: 12, label: 'Sessions' }), h('span.muted.small', {}, 'sessions from now')) : null,
      kind === 'date' ? h('label.field', { style: { width: '170px' } }, date) : null,
      h('label.field', { style: { width: '280px' } }, note),
      h('div.row-line', {}, S.button('Park it', { kind: 'primary', onClick: () => { if (kind === 'date' && !date.value) { S.toast('Pick the date it comes back.'); return; } S.closePop(); parkHole(ctx.store, a.id, { note: note.value.trim() || null, back: kind === 'date' ? { kind, date: date.value } : kind === 'sessions' ? { kind, n } : { kind } }); S.toast(`${a.name} parked.`, { undo: () => ctx.store.undo() }); } }), S.button('Keep it', { onClick: S.closePop })));
    draw(); S.popover(anchor, box, { width: 360 }); };
  const addPayoff = (anchor, a) => S.popover(anchor, h('div.stack', { style: { gap: '8px' } }, h('strong', {}, `${a.name}: payoff a year`), h('span.muted.small', {}, 'No rule for this area: your estimate of what filling it is worth a year.'),
    S.moneyInput(null, v => { S.closePop(); if (v != null) setArea(a.id, { payoff: v }); }, { hint: 'Add a year', key: `score:${a.id}:payoff` })), { width: 320 });
  const holeRow = a => h(`div.card.hole-row${a.parked ? '.parked' : ''}`, {},
    h('div.hole-head', {}, h('span.rank', {}, `#${a.rank}`), h('strong.hole-name', {}, a.name), a.parked ? h('span.tag.plain', {}, 'Parked') : null, a.beforeHere ? h('span.tag.plain', {}, `Before FOO step ${sc.here}`) : null, h('span.tag.plain', { title: a.fooWords }, `FOO step ${a.foo}`), h('span.spacer'), clientTag(a), picker(a)),
    a.parked ? h('div.row-line.coach-only', { style: { gap: '8px', marginTop: '6px' } }, h('span.muted.small', {}, `Parked ${new Date(a.parked.at).toLocaleDateString()}${a.parked.note ? `: ${a.parked.note}` : ''}. Back: ${parkedBack(a.parked, { n: sessionCount(doc), now: ctx.now() }).when}${parkedBack(a.parked, { n: sessionCount(doc), now: ctx.now() }).due ? ' (due now)' : ''}`), S.button('Unpark', { size: 'small', onClick: () => unparkHole(ctx.store, a.id) }), S.button('Make homework', { size: 'small', onClick: () => { makeHomework(ctx.store, `S${sessionCount(doc)}`, `Fill the ${a.name} hole`, { link: { kind: 'hole', areaId: a.id, route: '#/plan/scorecard' } }); S.toast('Homework made.', { undo: () => ctx.store.undo() }); } })) : null,
    h('div.hole-body', {},
      h('div.stack', { style: { gap: '4px', minWidth: 0, flex: '1 1 260px' } }, reasonBox(a), source(a)),
      h('div.hole-num', {}, h('span.label', {}, 'Payoff'), a.payoff ? [a.fiDays != null ? h('strong', {}, fiDaysText(a.fiDays)) : null, h('span.muted.small', {}, [S.amount(ctx, a.payoff.value), ' a year'])]
        : [S.button('Add payoff', { size: 'small', iconName: 'plus', onClick: e => addPayoff(e.currentTarget, a) }), h('span.muted.small', {}, 'No rule: ranks last until typed')]),
      a.payoff?.typed ? h('div.hole-num', {}, h('span.label', {}, 'Your payoff'), h('span.row-line', { style: { gap: '6px' } }, S.moneyInput(a.payoff.value, v => (v == null ? clearArea(a.id, ['payoff']) : setArea(a.id, { payoff: v })), { hint: 'A year', key: `score:${a.id}:payoff` }))) : null,
      h('div.hole-num', {}, h('span.label', {}, 'Effort, hours'), S.textInput(a.effort == null ? null : String(a.effort), v => { const n = v == null ? null : Number(v); n == null || Number.isNaN(n) ? clearArea(a.id, ['effort']) : setArea(a.id, { effort: n }); }, { hint: 'Hours', width: 90, key: `score:${a.id}:effort` })),
      h('div.hole-num', {}, h('span.label', {}, 'Best return'), a.score != null ? h('strong', {}, `${money(a.score)} a year per hour`) : h('span.muted', {}, 'Needs a payoff')),
      h('div.hole-num', {}, S.checkbox('In the plan (top 3)', a.chosen, v => choose(a.id, v), { key: `score:${a.id}:chosen` })),
      h('a', { href: a.route }, 'Open where it lives ›'),
      a.parked ? null : S.button('Park it', { size: 'small', onClick: e => park(e.currentTarget, a) })),
    how(a));
  const okRow = a => h('div.card.ok-row', {}, h('div.hole-head', {}, h('strong.hole-name', {}, a.name), h('span.spacer'), clientTag(a), picker(a)),
    h('div.row-line', { style: { gap: '12px' } }, reasonBox(a), source(a), h('a', { href: a.route }, 'Open ›')), how(a));
  const strongRow = a => h('div.strong-row', {}, ratingTag(a.rating), h('strong', {}, a.name), h('span.reason.muted', {}, a.override ? (a.coachReason || "The coach's call") : a.reason),
    h('span.spacer'), app.prefs.clientView ? null : S.button('Change', { size: 'small', onClick: e => S.popover(e.currentTarget, h('div.stack', { style: { gap: '10px' } }, h('strong', {}, a.name), picker(a), a.override ? S.textInput(a.coachReason, v => setArea(a.id, { reason: v }), { hint: 'Why, in a few words', width: 280 }) : null), { width: 360 }) }));
  // Item 35: an area the data cannot rate yet shows the one to three inputs it needs, right here.
  const p = doc.profile, setP = (part, patch) => ctx.store.setDoc('profile', { [part]: { ...(p[part] || {}), ...patch } });
  const needsOf = a => {
    if (a.id === 'taxes') { const t = p.taxes || {}; return [S.labelled("Last year: refund (+) or owed (-)", S.moneyInput(t.lastYear ?? null, v => setP('taxes', { lastYear: v }), { hint: 'e.g. 1,200 or -800', key: 'score:taxes:lastYear' })),
      S.labelled('Withholding changed since?', S.toggle(['Yes', 'No'], t.withholdingChanged === true ? 'Yes' : t.withholdingChanged === false ? 'No' : null, v => setP('taxes', { withholdingChanged: v === 'Yes' }), { label: 'Withholding changed', clearable: true }))]; }
    if (a.id === 'income') { const f = p.incomeFacts || {}; const d = h('input', { type: 'month', value: f.lastRaiseDate || '', 'aria-label': 'Last raise' }); d.onchange = () => setP('incomeFacts', { lastRaiseDate: d.value || null });
      return [S.labelled('Last raise', h(`label.field${f.lastRaiseDate ? '.filled' : ''}`, { style: { width: '150px' } }, d)), S.labelled('Raise amount (a year)', S.moneyInput(f.lastRaiseAmount ?? null, v => setP('incomeFacts', { lastRaiseAmount: v }), { hint: 'Add amount', key: 'score:income:raise' })),
        S.labelled('Paid at market rate?', S.toggle(['Yes', 'No', 'Unsure'], f.marketRate ?? null, v => setP('incomeFacts', { marketRate: v }), { label: 'Paid at market rate', clearable: true }))]; }
    if (a.id === 'credit') { const c = p.credit || {}; return [S.labelled('Credit score', S.textInput(c.score == null ? null : String(c.score), x => { const n = Number(x); setP('credit', { score: Number.isInteger(n) && n >= 300 && n <= 900 ? n : null }); }, { hint: '300 to 850', width: 110, key: 'score:credit:score' })),
      S.labelled('Late payments in 2 years?', S.toggle(['Yes', 'No'], c.latePayments === true ? 'Yes' : c.latePayments === false ? 'No' : null, v => setP('credit', { latePayments: v === 'Yes' }), { label: 'Late payments', clearable: true })), h('a', { href: '#/net-worth/credit-cards' }, 'More under Credit ›')]; }
    if (a.id === 'mindset') return [h('span.muted.small', {}, 'Rated from Confidence, asked at the start of each session. '), h('a', { href: '#/home/session' }, 'Start the session ›')];
    if (a.id === 'protection') return [h('a', { href: a.route }, 'Add the usual coverage list ›')];
    return null;
  };
  const unratedRow = a => { const needs = needsOf(a); return h('div.card.ok-row', {}, h('div.hole-head', {}, h('strong.hole-name', {}, a.name), ratingTag(null), h('span.spacer'), picker(a)),
    needs ? h('div.row-line', { style: { gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' } }, h('span.muted.small', {}, 'Needs: '), ...needs) : h('div.row-line', { style: { gap: '12px' } }, h('span.reason.muted', {}, a.reason), h('a', { href: a.route }, 'Open ›'))); };
  const section = (title, list, row, note = null) => (list.length ? h('section.section', {}, h('div.section-title.area-goals', {}, h('h2', {}, title), h('span.muted', {}, note ?? `${list.length}`)), list.map(row)) : null);
  const rescore = () => { ctx.store.setIn('scorecard', ['reviewedAt'], ctx.now().toISOString(), 'Re-scored'); S.toast('Marked as re-scored today.'); };
  const confirm = () => { ctx.store.setIn('program', ['fooConfirmed'], sc.here, 'FOO step'); S.toast(`FOO step ${sc.here} confirmed.`); };
  return [head('Scorecard', 'Eleven areas: Strong, OK or Hole; the holes ranked by what filling them pays for the effort',
      S.button('Re-scored today', { iconName: 'check', tip: 'Marks the Revisit session\'s re-score', onClick: rescore })),
    S.summaryStrip(ctx, [
      { label: 'Areas Strong or OK', result: { id: 'M74', value: sc.okCount, needs: [], unit: 'count', text: `${sc.okCount} of ${sc.of} areas rated Strong or OK; ${sc.holes.length} ${sc.holes.length === 1 ? 'hole' : 'holes'}; ${sc.unrated.length} not rated yet.` }, render: r => `${r.value} of ${sc.of}` },
      { label: 'Holes', result: { id: 'M74', value: sc.holes.length, needs: [], unit: 'count', text: 'The areas rated Hole, ranked below.' }, render: r => (sc.unrated.length ? `${r.value} found so far · ${sc.unrated.length} not rated yet` : String(r.value)) }, // item 36
      { label: 'In the plan', result: { id: 'M74', value: sc.chosen.length, needs: [], unit: 'count', text: 'Holes picked for the top 3.' }, render: r => (sc.holes.length ? `${r.value} of ${Math.min(3, sc.holes.length)}` : sc.unrated.length ? 'pick after rating' : 'no hole to pick') },
      { label: 'FOO step', result: { id: 'M69', value: sc.here == null ? null : Number(sc.here) || 0, needs: sc.here == null ? ['a surplus'] : [], unit: 'count', text: 'The step you are on (Plan › FOO). Holes before it rank first.' }, render: () => `${sc.here}`,
        note: doc.program?.fooConfirmed === sc.here ? 'Confirmed' : null }]),
    sc.here != null && doc.program?.fooConfirmed !== sc.here ? h('div.row-line', { style: { marginBottom: '16px', gap: '10px' } }, S.button(`Confirm FOO step ${sc.here}`, { iconName: 'check', onClick: confirm }), h('span.muted.small', {}, 'Session 5 asks for it; the step comes from Plan › FOO.')) : null,
    section('Holes, ranked', sc.holes, holeRow, sc.holes.length ? `${sc.holes.length} · before your FOO step first${sc.holes.some(x => x.waits) ? ', heavy debt before what comes after it' : ''}, then best return${sc.parkedHoles.length ? `; ${sc.parkedHoles.length} parked at the bottom` : ''}` : 'None'),
    section('Not rated yet', sc.unrated, unratedRow),
    section('OK', sc.ok, okRow),
    section('Strong', sc.strong, strongRow),
    !sc.open.length ? h('div.card', {}, h('strong', {}, 'No hole left.'), h('span.muted', {}, ' The next chapter opens on Home.'), sc.unrated.length ? h('span.muted', {}, ` Rate ${sc.unrated.map(a => a.name).join(', ')} to be sure.`) : null) : null];
}
