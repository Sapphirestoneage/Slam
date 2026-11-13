// SPDX-License-Identifier: AGPL-3.0-only
// The books (start.html): what you owe, what you have, what comes in and what goes out, each as a short list sorted by
// kind. A section has its own Add button; a row asks the few things the plan needs first and keeps the rest behind
// More. No math here: every field is one the coach app already keeps on the same record (js/registry/fields.js), so
// both apps read one file and nothing is asked twice.
import { applyFastTrack } from './fasttrack.js';

const has = v => v !== null && v !== undefined && v !== '';
const num = v => (has(v) && Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : null);
const ymAt = (months, now = new Date()) => { const d = new Date(now.getFullYear(), now.getMonth() + months, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const monthsTo = (ym, now = new Date()) => { const [y, m] = String(ym).slice(0, 7).split('-').map(Number); return (y - now.getFullYear()) * 12 + (m - 1 - now.getMonth()); };
const yn = [['Yes', 'Yes'], ['No', 'No']];
const pickOf = list => list.map(x => (Array.isArray(x) ? x : [x, String(x)]));

// A field: { id (the record's own value), label, type: money | pct | pick | count, picks (tap amounts), options
// ([value, label]), unsure (a "Not sure" tap that lets a typical figure stand in), get/set (when it is not one value) }.
const balance = (picks = null, label = 'What you owe') => ({ id: 'balance', label, type: 'money', picks });
const apr = options => ({ id: 'apr', label: 'Interest rate', type: 'pct', options, unsure: true });
const payment = picks => ({ id: 'payment', label: 'What you pay a month', type: 'money', picks });
const promo = { id: 'promo', label: 'A 0% offer on it?', type: 'pick', options: [[0, 'No'], [3, '3 more months'], [6, '6 more months'], [12, '12 more months'], [18, '18 more months']],
  get: (r, now) => (r.values.promoEnd ? Math.max(0, monthsTo(r.values.promoEnd, now)) : has(r.values.apr) ? 0 : null),
  set: (store, r, v, now) => store.update(r.id, num(v) > 0 ? { promoApr: 0, promoEnd: ymAt(Math.round(num(v)), now) } : { promoApr: null, promoEnd: null }) };
const DAYS = [1, 5, 10, 15, 20, 25, 28];

const CARD_MORE = [promo,
  { id: 'payChoice', label: 'Each month you pay', type: 'pick', options: [['In full', 'All of it'], ['Custom', 'A set amount'], ['Minimum', 'The minimum']] },
  { id: 'limit', label: 'Credit limit', type: 'money', picks: [1000, 3000, 5000, 10000, 20000] },
  { id: 'minimum', label: 'Minimum payment', type: 'money', picks: [25, 35, 50, 100] },
  { id: 'dueDay', label: 'Due on day', type: 'pick', options: pickOf(DAYS) },
  { id: 'autopay', label: 'Autopay', type: 'pick', options: [['Full', 'Yes, in full'], ['Minimum', 'Yes, the minimum'], ['No', 'No']] },
  { id: 'annualFee', label: 'Yearly fee', type: 'money', picks: [0, 95, 250, 550] },
  { id: 'use', label: 'Personal or business', type: 'pick', options: pickOf(['Personal', 'Business']) }];
const LOAN_MORE = [
  { id: 'federal', label: 'Federal or private', type: 'pick', options: pickOf(['Federal', 'Private']) },
  { id: 'plan', label: 'Repayment plan', type: 'pick', options: pickOf(['Standard', 'IBR', 'RAP', 'PAYE', 'ICR', 'Graduated', 'Extended']), when: r => r.values.federal !== 'Private' },
  { id: 'pslf', label: 'Working toward Public Service Loan Forgiveness?', type: 'pick', options: pickOf(['Yes', 'No', 'Not sure']), when: r => r.values.federal !== 'Private' },
  { id: 'firstBorrowed', label: 'When you first borrowed', type: 'pick', options: pickOf(['Before July 2014', 'July 2014 to June 2026', 'July 2026 or later']), when: r => r.values.federal !== 'Private' },
  { id: 'forbearance', label: 'Paused right now?', type: 'pick', options: [['None', 'No, paying'], ['Forbearance', 'Forbearance'], ['Deferment', 'Deferment']] },
  { id: 'yearsLeft', label: 'Years left', type: 'pick', options: pickOf([2, 5, 8, 10, 15, 20, 25]) },
  { id: 'rateType', label: 'Fixed or adjustable rate', type: 'pick', options: pickOf(['Fixed', 'Adjustable']), when: r => r.values.federal === 'Private' }];
const TERM_MORE = years => [
  { id: 'yearsLeft', label: 'Years left', type: 'pick', options: pickOf(years) },
  { id: 'rateType', label: 'Fixed or adjustable rate', type: 'pick', options: pickOf(['Fixed', 'Adjustable']) },
  { id: 'dueDay', label: 'Due on day', type: 'pick', options: pickOf(DAYS) },
  { id: 'autopay', label: 'Autopay', type: 'pick', options: yn }];
const OTHER_TYPES = ['Personal loan', 'Medical', 'Family or friend', 'Buy now, pay later', 'Payday or cash advance', 'Tax debt', '401(k) loan', 'Business'];
const OTHER_MORE = [
  { id: 'monthsLeft', label: 'Months left', type: 'pick', options: pickOf([3, 6, 12, 24, 36, 60]) },
  { id: 'collections', label: 'In collections?', type: 'pick', options: [[true, 'Yes'], [false, 'No']] },
  { id: 'taxPlan', label: 'A payment plan in place?', type: 'pick', options: [[true, 'Yes'], [false, 'No']], when: r => r.type === 'Tax debt' },
  { id: 'dueDay', label: 'Due on day', type: 'pick', options: pickOf(DAYS) },
  { id: 'autopay', label: 'Autopay', type: 'pick', options: yn }];

export const DEBT_BOOK = {
  id: 'debt', kind: 'debt', title: 'What you owe', main: 'balance', empty: 'Nothing here.',
  sections: [
    { id: 'cards', title: 'Credit cards', one: 'Card', add: 'Add a credit card', types: ['Credit card'], names: ['Chase', 'Amex', 'Capital One', 'Citi', 'Discover', 'Bank of America', 'Wells Fargo', 'Store card'],
      front: [balance([500, 1000, 2500, 5000, 10000]), apr([0.17, 0.2, 0.22, 0.25, 0.29]), payment([50, 100, 200, 300, 500])], more: CARD_MORE },
    { id: 'student', title: 'Student loans', one: 'Student loan', add: 'Add a student loan', types: ['Student loan'], names: ['Federal', 'Nelnet', 'MOHELA', 'Aidvantage', 'EdFinancial', 'Sallie Mae', 'Private'],
      front: [balance([5000, 10000, 20000, 30000, 50000]), apr([0.03, 0.045, 0.055, 0.065, 0.08]), payment([100, 200, 300, 400, 600])], more: LOAN_MORE },
    { id: 'car', title: 'Car loans', one: 'Car loan', add: 'Add a car loan', types: ['Car loan'], names: [],
      front: [balance([5000, 10000, 15000, 20000, 30000]), apr([0.03, 0.05, 0.07, 0.09, 0.12]), payment([200, 300, 400, 500, 600])], more: TERM_MORE([1, 2, 3, 4, 5, 6]) },
    { id: 'home', title: 'Home loans', one: 'Mortgage', add: 'Add a mortgage', types: ['Mortgage'], names: [],
      front: [balance([100000, 200000, 300000, 400000, 600000]), apr([0.03, 0.04, 0.05, 0.06, 0.07]), payment([1200, 1800, 2400, 3000, 4000])], more: TERM_MORE([5, 10, 15, 20, 25, 30]) },
    { id: 'other', title: 'Other debts', one: 'Debt', add: 'Add another debt', types: OTHER_TYPES, names: [],
      front: [{ id: 'type', label: 'What kind', type: 'pick', options: pickOf(OTHER_TYPES), top: true }, balance([500, 1000, 2500, 5000, 10000]), apr([0, 0.05, 0.1, 0.15, 0.25]), payment([50, 100, 200, 300, 500])], more: OTHER_MORE },
  ],
};
export const BOOKS = { debt: DEBT_BOOK };

// ---------- reading ----------
const sectionOf = (book, r) => book.sections.find(s => s.types.includes(r.type)) ?? book.sections.find(s => s.id === 'other') ?? null;
const rowsIn = (doc, book, sec) => (doc.records || []).filter(r => r.kind === book.kind && sectionOf(book, r) === sec && (book.keep ? book.keep(r) : true));
export const fieldValue = (r, f, now = new Date()) => (f.get ? f.get(r, now) : f.top ? r[f.id] ?? null : f.id === 'apr' && r.fieldStatus?.apr === 'Not sure' ? null : r.values?.[f.id] ?? null);
const unsureOn = (r, f) => !!f.unsure && r.fieldStatus?.[f.id] === 'Not sure';
const shown = (r, f) => !f.when || f.when(r);
// One row as the screen shows it: what is answered, what the plan still wants (todo), and how many extras are filled.
export function rowOf(r, sec, book, now = new Date()) {
  const front = sec.front.filter(f => shown(r, f)), more = sec.more.filter(f => shown(r, f));
  const todo = front.filter(f => fieldValue(r, f, now) == null && !unsureOn(r, f)).map(f => f.id);
  return { id: r.id, name: r.name, type: r.type, linked: !!r.linkedTo, main: num(r.values?.[book.main]), todo, ready: todo.length === 0, guessed: front.filter(f => unsureOn(r, f)).map(f => f.id),
    extras: more.filter(f => fieldValue(r, f, now) != null).length, of: more.length, rec: r };
}
// The whole book: [{ ...section, rows, total }], and totals across it.
export function bookOf(doc, book, { now = new Date() } = {}) {
  const sections = book.sections.map(sec => { const rows = rowsIn(doc, book, sec).map(r => rowOf(r, sec, book, now)); return { ...sec, rows, total: rows.reduce((s, r) => s + (r.main ?? 0), 0) }; });
  const rows = sections.flatMap(s => s.rows);
  return { sections, count: rows.length, total: rows.reduce((s, r) => s + (r.main ?? 0), 0), todo: rows.filter(r => !r.ready).length, next: rows.find(r => !r.ready)?.id ?? null };
}

// ---------- writing ----------
const totalName = name => /\(total\)$/.test(name ?? '');
// Add one row to a section. A total typed earlier ("Credit cards (total)") becomes the first of them, so a second card
// sits beside it. A car loan or a mortgage is kept on the car or the home, as the coach app keeps it.
export function addRow(store, book, sectionId, { name = null } = {}) {
  const sec = book.sections.find(s => s.id === sectionId);
  return store.transaction(`Add: ${sec.one}`, () => {
    const rows = rowsIn(store.doc, book, sec);
    const first = rows.find(r => totalName(r.name)); if (first) store.update(first.id, { name: `${sec.one} 1` });
    const label = name ?? `${sec.one}${rows.length || sec.id === 'cards' || sec.id === 'student' ? ` ${rows.length + 1}` : ''}`;
    if (book.kind === 'debt' && (sec.id === 'car' || sec.id === 'home') && !rows.some(r => r.linkedTo)) {
      applyFastTrack(store, sec.id === 'car' ? { hasCar: true, carLoanBalance: 0 } : { housing: 'Own', homeLoan: 'Mortgage' });
      const asset = store.doc.records.find(r => r.kind === 'asset' && r.type === (sec.id === 'car' ? 'Car' : 'Home'));
      const made = store.doc.records.find(r => r.kind === 'debt' && r.linkedTo === asset?.id);
      if (made) { store.update(made.id, { balance: null }); return made; }
    }
    const made = store.add(book.kind, { name: label, values: {} }, { type: sec.types[0] });
    if (book.kind === 'debt') { store.setDoc('profile', { areas: { ...(store.doc.profile.areas || {}), debt: true } }); }
    return made;
  });
}
// One answer on one row. A rate that is typed is known; a card with a set payment is carried, not paid in full.
export function setField(store, id, f, value, { now = new Date() } = {}) {
  const r = store.doc.records.find(x => x.id === id); if (!r) return;
  store.transaction('Edit', () => {
    if (f.set) return f.set(store, r, value, now);
    if (f.top) return store.update(id, { [f.id]: value });
    const v = f.type === 'money' || f.type === 'pct' || f.type === 'count' ? num(value) : value;
    store.update(id, { [f.id]: v });
    if (f.unsure) store.setFieldStatus(id, f.id, v == null ? null : 'Know it');
    if (r.kind === 'debt' && r.type === 'Credit card' && f.id === 'payment' && v != null && r.values.payChoice == null) store.update(id, { payChoice: 'Custom' });
  });
}
// "Not sure": a typical figure stands in, marked as a guess, until the real one is known.
export function setUnsure(store, id, f) { store.transaction('Not sure', () => { store.update(id, { [f.id]: null }); store.setFieldStatus(id, f.id, 'Not sure'); }); }
export function renameRow(store, id, name) { if (has(name)) store.update(id, { name }); }
// Take a row off. A loan on a home or car comes off with the home or car marked paid off.
export function removeRow(store, id) {
  const r = store.doc.records.find(x => x.id === id); if (!r) return;
  store.transaction('Deleted', () => { if (r.linkedTo) store.update(r.linkedTo, { financed: 'Paid off' }); store.remove(id); });
}
