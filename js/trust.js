// SPDX-License-Identifier: AGPL-3.0-only
// Trust: the one line every footer of the web app shows, and the way to the privacy page. The game shows the same
// line (game/account/trust.js, TRUST_LINE); test/trust.test.js fails when the two differ. The page is game/privacy.html:
// what is stored, where, who can see it, and how to delete it.
import { h } from './ui/dom.js';
export const TRUST_LINE = 'Education and tools, not financial advice.';
export const PRIVACY_URL = 'game/privacy.html';
// The line and the link, for a footer. `rest` is what the page adds about its own storage.
export const trustFoot = (rest = '') => h('p.st-small', {}, `${TRUST_LINE} ${rest}${rest ? ' ' : ''}`, h('a', { href: PRIVACY_URL }, 'Privacy'));
