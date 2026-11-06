// SPDX-License-Identifier: AGPL-3.0-only
// X of Y filled (batch 14, item 8): one slim counter for a screen's boxes, core and full detail together, so 99% is
// something you can see. Click it for what is left, each with Fix it (lands on the box).
import { h } from './dom.js';
import { leftPopover } from './arrive.js';

export function fillCounter(app, c, { label = 'filled' } = {}) {
  if (!c?.full?.of) return null;
  const left = c.full.of - c.full.done;
  const items = [...(c.core.items || []), ...(c.full.items || [])].filter((it, i, all) => all.findIndex(x => x.focus === it.focus && x.id === it.id) === i);
  return left
    ? h('button.btn.small.count-btn.fill-count', { type: 'button', 'aria-label': `${c.full.done} of ${c.full.of} ${label}; see what is left`, onclick: e => leftPopover(app, e.currentTarget, items.map(it => ({ ...it, route: it.route ?? location.hash })), { title: `${left} left` }) }, `${c.full.done} of ${c.full.of} ${label}`)
    : h('span.tag.good.fill-count', { title: 'Every box on this screen has an answer' }, `${c.full.of} of ${c.full.of} ${label}`);
}
