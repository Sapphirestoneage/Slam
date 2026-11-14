// SPDX-License-Identifier: AGPL-3.0-only
// A private link: the whole plan, squeezed into the link itself. Nothing is uploaded; whoever has the link has the plan.
// start.html opens one at #/open/<text>; every standalone page (js/solo) keeps its answers in its own address the same
// way and hands them to the next page as one of these.
import { exportFile, importFile } from '../records.js';
export const LINK = '#/open/';
export async function pack(doc) {
  const file = exportFile(doc); file.household = { ...file.household, history: [], snapshots: [] };
  const zipped = new Uint8Array(await new Response(new Blob([JSON.stringify(file)]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
  let bin = ''; for (const b of zipped) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export async function unpack(text) {
  const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return importFile(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text());
}
