// Keep your place across a redraw (R165): the window scroll, the scroll inside every list, and the control
// you were on. Every redraw that rebuilds DOM (app.render, a record list, a chart panel) runs inside keepPlace.
// No DOM import here, so the Node tests can drive it with a small fake document.

// A control's key: its data-focus, scoped by the row it sits in (so 'more' in row A is not 'more' in row B).
export function focusKey(el) {
  const k = el?.dataset?.focus;
  if (!k) return null;
  const row = el.closest?.('[data-id]')?.dataset?.id;
  return row ? `${row}|${k}` : k;
}
const shown = el => !el.closest?.('[hidden]') && (el.getClientRects ? el.getClientRects().length > 0 : true);
export function findByKey(doc, key) {
  if (!key) return null;
  for (const el of doc.querySelectorAll('[data-focus]')) if (focusKey(el) === key && shown(el)) return el;
  return null;
}
const rowOf = el => el?.closest?.('tr[data-id]') ?? null;
// The rows next to this one, nearest first: where focus goes when the row itself left (Not for me, Delete).
function neighbours(row) {
  const out = [];
  for (const dir of ['nextElementSibling', 'previousElementSibling']) {
    let r = row[dir];
    while (r && !(r.dataset?.id && r.matches?.('tr[data-id]'))) r = r[dir];
    if (r) out.push(r.dataset.id);
  }
  return out;
}
const scrollers = doc => [...doc.querySelectorAll('.list-scroll[data-scroll-key]')];
const topOf = el => el?.getBoundingClientRect?.().top ?? null;

export function keepPlace(fn, { doc = globalThis.document, win = globalThis.window } = {}) {
  if (!doc?.querySelectorAll || !win) return fn();
  const y = win.scrollY;
  const inner = new Map(scrollers(doc).map(el => [el.dataset.scrollKey, el.scrollTop]));
  const active = doc.activeElement;
  const key = focusKey(active);
  const row = rowOf(active);
  const near = row ? neighbours(row) : [];
  const anchor = row || (key ? active : null);
  const anchorTop = topOf(anchor);
  const box = anchor?.closest?.('.list-scroll[data-scroll-key]');
  const boxKey = box?.dataset.scrollKey ?? null;
  const boxTop = topOf(box);
  let caret = null;
  try { if (active && typeof active.selectionStart === 'number') caret = [active.selectionStart, active.selectionEnd]; } catch { /* not a text box */ }

  const out = fn();

  if (win.scrollY !== y) win.scrollTo({ top: y, behavior: 'instant' });
  for (const el of scrollers(doc)) if (inner.has(el.dataset.scrollKey) && el.scrollTop !== inner.get(el.dataset.scrollKey)) el.scrollTop = inner.get(el.dataset.scrollKey);

  // Focus: the same control; if its row left, the same control in the row below (or above).
  const stayed = !!active?.isConnected && active !== doc.body;
  let target = stayed ? active : findByKey(doc, key);
  if (!target && key && row) {
    const suffix = key.slice(row.dataset.id.length + 1);
    for (const id of near) if ((target = findByKey(doc, `${id}|${suffix}`))) break;
  }
  if (target && !stayed) {
    target.focus?.({ preventScroll: true });
    if (caret && typeof target.setSelectionRange === 'function') { try { target.setSelectionRange(...caret); } catch { /* number box */ } }
  }

  // The row you were on stays where it was on screen: first undo any move of its list box, then of the row inside it.
  const now = target ? (rowOf(target) || target) : null;
  if (anchorTop !== null && now) {
    const newBox = boxKey ? scrollers(doc).find(el => el.dataset.scrollKey === boxKey) : null;
    const dBox = boxTop !== null && newBox ? topOf(newBox) - boxTop : 0;
    if (Math.abs(dBox) > 1) win.scrollTo({ top: win.scrollY + dBox, behavior: 'instant' });
    const d = topOf(now) - anchorTop;
    if (Math.abs(d) > 1) {
      if (newBox && newBox.contains(now)) newBox.scrollTop += d;
      else win.scrollTo({ top: win.scrollY + d, behavior: 'instant' });
    }
  }
  return out;
}
