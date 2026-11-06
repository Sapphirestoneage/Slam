// SPDX-License-Identifier: AGPL-3.0-only
// Batch 31 (Phase 4, Track 1 groundwork): typical at your age on the money boxes, from one hook in moneyInput.
// Coach view: a blank core box fades in the typical range ("4.9K to 12K", the basis in its tip), never counted as a
// number; a typed total far outside typical gets a calm one-line note under the box, with an X that hides it for
// this box (remembered in the client file, settings.typicalOff). Client view: the notes only when Coach tools ›
// Session › Typical at your age is on (settings.typicalInClient); the faded ranges stay coach-only for now.
// The numbers and words are js/math/priors.js's (M9E); this file only finds the box and places them.
import { h } from './dom.js';
import { setMoneyHook, iconButton, toast } from './staples.js';
import { priorsData, loadPriors } from '../priorslib.js';
import { ageOf } from '../math/metrics.js';
import { typicalOf, typicalChecks, typicalBoxes, shortRange } from '../math/priors.js';

// Which typical field a money box is, from its key: a row's balance (cash account, card, student loan), the gut
// spending number (Budget and Fast Track), Fast Track's debt totals. Anything else: no typical.
function fieldOf(ctx, key) {
  if (key === 'gut' || key === 'ft:gut') return 'spending';
  if (key === 'ft:Credit card:bal') return 'card';
  if (key === 'ft:Student loan:bal') return 'studentLoans';
  const m = /^(.+):balance$/.exec(key);
  const r = m ? ctx.store.get(m[1]) : null;
  if (!r) return null;
  if (r.kind === 'account' && r.values?.group === 'cash') return 'cash';
  if (r.kind === 'debt' && r.type === 'Credit card') return 'card';
  if (r.kind === 'debt' && r.type === 'Student loan') return 'studentLoans';
  return null;
}

let memo = { rev: null, doc: null, checks: [] };
function checksOf(ctx, data) {
  const doc = ctx.store.doc;
  if (memo.doc !== doc || memo.rev !== doc._rev) memo = { rev: doc._rev, doc, checks: typicalChecks(data, { age: ageOf(doc.profile, ctx.now()), place: doc.profile?.state ?? null, boxes: typicalBoxes(ctx.visible(() => true)) }) };
  return memo.checks;
}

export const typicalInClient = doc => doc?.settings?.typicalInClient === true;
export const hiddenNotes = doc => Object.keys(doc?.settings?.typicalOff || {}).filter(k => doc.settings.typicalOff[k]);

export function startTypical(app) {
  loadPriors(() => app.renderSoon?.());
  setMoneyHook((key, value, box, input, { width }) => {
    const ctx = app.ctx, data = priorsData();
    if (!app.hasClient || !ctx || !data) return null;
    const field = fieldOf(ctx, key);
    if (!field) return null;
    const doc = ctx.store.doc, coach = !app.prefs.clientView;
    if (value == null) { // fill the blank: a faded range, coach view only
      if (!coach) return null;
      const r = typicalOf(data, field, { age: ageOf(doc.profile, ctx.now()), place: doc.profile?.state ?? null });
      if (!r) return null;
      input.placeholder = width >= 200 ? `Typical ${shortRange(r)}` : shortRange(r);
      box.classList.add('typical-ph');
      box.title = `${r.basis}. Faded: not a number until one is typed`;
      return null;
    }
    if (!coach && !typicalInClient(doc)) return null;
    if (doc.settings?.typicalOff?.[key]) return null;
    const c = checksOf(ctx, data).find(x => x.key === key);
    if (!c) return null;
    const tip = `${c.tip}${c.boxes > 1 ? ` (all ${c.boxes} boxes together)` : ''}`;
    const hide = iconButton('x', 'Hide this note', () => {
      ctx.store.setIn('settings', ['typicalOff', key], true, 'Hide a typical-at-your-age note');
      toast('Note hidden for this box.', { undo: () => ctx.store.undo() });
    }, { tiny: true });
    hide.title = 'Hide this note for this box';
    return h('span.typical-wrap', {}, box, h('span.typical-note', { title: tip, 'data-typical': c.field }, h('span', {}, c.text), hide));
  });
}
