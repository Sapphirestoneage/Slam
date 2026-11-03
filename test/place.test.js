// keepPlace (fix pass item 1): a redraw keeps the window scroll, each list's scroll and the control you were on.
// A tiny fake DOM: just what keepPlace touches.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keepPlace, focusKey } from '../js/ui/place.js';

class El {
  constructor(tag, { focus = null, id = null, scrollKey = null, cls = '', top = 0 } = {}, kids = []) {
    this.tagName = tag.toUpperCase(); this.cls = cls; this.top = top; this.scrollTop = 0; this.parent = null; this.kids = [];
    this.dataset = {}; if (focus) this.dataset.focus = focus; if (id) this.dataset.id = id; if (scrollKey) this.dataset.scrollKey = scrollKey;
    kids.forEach(k => this.add(k));
  }
  add(k) { k.parent = this; this.kids.push(k); return k; }
  get isConnected() { let e = this; while (e.parent) e = e.parent; return !!e.isRoot; }
  matches(sel) {
    if (sel === '[data-id]') return !!this.dataset.id;
    if (sel === 'tr[data-id]') return this.tagName === 'TR' && !!this.dataset.id;
    if (sel === '.list-scroll[data-scroll-key]') return this.cls === 'list-scroll' && !!this.dataset.scrollKey;
    if (sel === '[data-focus]') return !!this.dataset.focus;
    return false; // [hidden]: nothing is hidden here
  }
  closest(sel) { let e = this; while (e && !e.isRoot) { if (e.matches(sel)) return e; e = e.parent; } return null; }
  contains(x) { while (x) { if (x === this) return true; x = x.parent; } return false; }
  all(sel, out = []) { for (const k of this.kids) { if (k.matches(sel)) out.push(k); k.all(sel, out); } return out; }
  // A row's top on screen moves with the scroll of the list it sits in.
  getBoundingClientRect() { let t = this.top, e = this.parent; while (e && !e.isRoot) { t -= e.scrollTop; e = e.parent; } return { top: t }; }
  get nextElementSibling() { const s = this.parent?.kids; return s ? s[s.indexOf(this) + 1] ?? null : null; }
  get previousElementSibling() { const s = this.parent?.kids; return s ? s[s.indexOf(this) - 1] ?? null : null; }
  focus() { doc.activeElement = this; }
}
let doc;
function listOf(rows, listTop = 100) {
  const list = new El('div', { scrollKey: 'lines', cls: 'list-scroll', top: listTop });
  rows.forEach(([id, top]) => list.add(new El('tr', { id, top }, [new El('button', { focus: 'more', top }), new El('input', { focus: 'name', top })])));
  return list;
}
function page(rows) {
  const body = new El('body'); body.isRoot = true;
  const list = body.add(listOf(rows));
  doc = { body, activeElement: body, querySelectorAll: sel => body.all(sel) };
  return { body, list };
}
const win = () => { const w = { scrollY: 0, calls: [], scrollTo(o) { w.calls.push(o.top); w.scrollY = o.top; } }; return w; };
// A redraw: the old list leaves the page and a fresh one (scroll 0) takes its place.
const rebuild = (body, rows) => () => { body.kids.forEach(k => { k.parent = null; }); body.kids = []; return { list: body.add(listOf(rows)) }; };

test('focusKey: a control is named by its row and its data-focus', () => {
  const { list } = page([['r1', 0]]);
  assert.equal(focusKey(list.kids[0].kids[0]), 'r1|more');
  assert.equal(focusKey(list), null);
});

test('keepPlace: list scroll, window scroll and the focused control come back after a full redraw', () => {
  const rows = [['r1', 100], ['r2', 144], ['r3', 188], ['r4', 232]];
  const { body, list } = page(rows);
  list.scrollTop = 88;
  list.kids[2].kids[0].focus(); // More in r3
  const w = win(); w.scrollY = 400;
  let after;
  keepPlace(() => { after = rebuild(body, rows)(); w.scrollY = 0; }, { doc, win: w }); // the rebuild reset everything
  assert.equal(w.scrollY, 400);
  assert.equal(after.list.scrollTop, 88);
  assert.equal(focusKey(doc.activeElement), 'r3|more');
  assert.notEqual(doc.activeElement, list.kids[2].kids[0], 'a new element, same control');
});

test('keepPlace: when the row leaves (Not for me, Delete), focus lands on the same control in the next row, at the same spot', () => {
  const { body, list } = page([['r1', 100], ['r2', 144], ['r3', 188]]);
  list.scrollTop = 40;
  list.kids[1].kids[0].focus(); // More in r2
  const before = list.kids[1].getBoundingClientRect().top;
  let after;
  keepPlace(() => { after = rebuild(body, [['r1', 100], ['r3', 144]])(); }, { doc, win: win() });
  assert.equal(focusKey(doc.activeElement), 'r3|more');
  assert.ok(Math.abs(after.list.kids[1].getBoundingClientRect().top - before) <= 10);
});

test('keepPlace: content above the row grew, so the list scroll moves by the same amount', () => {
  const { body, list } = page([['r1', 100], ['r2', 144]]);
  list.scrollTop = 20;
  list.kids[1].kids[1].focus(); // name box in r2
  const before = list.kids[1].getBoundingClientRect().top;
  let after;
  keepPlace(() => { after = rebuild(body, [['r1', 100], ['r2', 304]])(); }, { doc, win: win() }); // a 160px panel opened above
  assert.equal(after.list.scrollTop, 180);
  assert.equal(after.list.kids[1].getBoundingClientRect().top, before);
});

test('keepPlace: with no document it just runs the redraw', () => {
  assert.equal(keepPlace(() => 7, { doc: null, win: null }), 7);
});
