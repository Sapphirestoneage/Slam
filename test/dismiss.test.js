// Click away and Escape (fix pass item 2): one shared mechanism for popovers, row More panels and More carets.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { opened, clickedAt, escapeFrom, typingInPanel, openCount, closeAll } from '../js/ui/dismiss.js';

// A node is a plain object; contains() walks parents.
const node = (parent = null, extra = {}) => ({ parent, isConnected: true, contains(x) { while (x) { if (x === this) return true; x = x.parent; } return false; }, ...extra });
const page = node();
const panel = (opts = {}) => {
  const el = node(page);
  const e = { el, closed: 0, close() { e.closed++; }, ...opts };
  e.forget = opened(e);
  return e;
};

test('one row More open at a time per list', () => {
  closeAll();
  const a = panel({ group: 'more:lines' });
  const b = panel({ group: 'more:lines' });
  assert.equal(a.closed, 1, 'opening B closed A');
  assert.equal(b.closed, 0);
  const other = panel({ group: 'more:debts' });
  assert.equal(b.closed, 0, 'another list keeps its own');
  assert.equal(other.closed, 0);
  assert.equal(openCount(), 2);
});

test('a click outside closes; a click inside, or on what opened it, keeps it', () => {
  closeAll();
  const anchor = node(page);
  const p = panel({ anchor });
  clickedAt(node(p.el));
  clickedAt(anchor);
  assert.equal(p.closed, 0);
  clickedAt(node(page));
  assert.equal(p.closed, 1);
  assert.equal(openCount(), 0);
});

test('a pick inside a popover opened from a panel keeps the panel', () => {
  closeAll();
  const p = panel();
  const pop = panel({ pop: true });
  clickedAt(node(pop.el));
  assert.equal(p.closed, 0);
  assert.equal(pop.closed, 0);
});

test('never closes while you are typing inside it; the next click away does', () => {
  closeAll();
  const p = panel();
  const box = node(p.el, { tagName: 'INPUT', type: 'text' });
  assert.equal(typingInPanel(box), true);
  assert.equal(typingInPanel(node(p.el, { tagName: 'INPUT', type: 'checkbox' })), false, 'a checkbox is not typing');
  clickedAt(node(page), { typed: typingInPanel(box) });
  assert.equal(p.closed, 0);
  clickedAt(node(page), { typed: typingInPanel(null) });
  assert.equal(p.closed, 1);
});

test('Escape closes the popover first, then the panels you are not typing in', () => {
  closeAll();
  const a = panel(), b = panel();
  const pop = panel({ pop: true });
  escapeFrom(null);
  assert.deepEqual([pop.closed, a.closed, b.closed], [1, 0, 0]);
  const typingIn = node(b.el, { tagName: 'TEXTAREA' });
  escapeFrom(typingIn);
  assert.deepEqual([a.closed, b.closed], [1, 0]);
});

test('a panel a redraw took off the page is forgotten, not closed', () => {
  closeAll();
  const p = panel();
  clickedAt(node(p.el)); // seen on the page
  p.el.isConnected = false;
  assert.equal(openCount(), 0);
  assert.equal(p.closed, 0);
});
