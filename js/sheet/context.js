// The app's own numbers for one household, worked out once for the workbook: the metrics, which rows the math counts,
// the FOO, the cash layers and the statements. The registries' app() functions read from this. Pure: no DOM.
import { metrics } from '../math/metrics.js';
import { gatesOf, visible } from '../gates.js';
import { foo } from '../math/foo.js';
import { layersOf } from '../math/layers.js';
import { fiTargets } from '../plan.js';
import { statements, netWorthStatement, periodOf } from '../math/statements.js';
import { taxRates } from '../math/income.js';

export function sheetContext(doc, ref, { now = new Date(), flags = [] } = {}) {
  const m = metrics(doc, ref, { now });
  const x = m.inputs;
  const live = visible(doc.records, gatesOf(doc.profile, doc.client), ref);
  const liveIds = new Set(live.map(r => r.id));
  const once = f => { let done = false, v; return () => { if (!done) { v = f(); done = true; } return v; }; };
  const safe = f => once(() => { try { return f(); } catch { return null; } });
  return {
    doc, ref, now, m, x, live, flags,
    // In the math: No when a gate hides the row (R001), Counted once when it is the same as a debt or premium.
    inMath: rec => (!liveIds.has(rec.id) ? 'No' : x.dupOf?.[rec.id] ? 'Counted once' : 'Yes'),
    foo: once(() => foo(doc, ref, { now, flags })),
    layers: once(() => layersOf(doc, ref, now)),
    targets: once(() => fiTargets(m, doc)),
    statements: safe(() => statements(doc, ref, periodOf('month', now), { now })),
    nwStatement: once(() => netWorthStatement(doc, { live })),
    taxRates: once(() => (x.grossAnnual ? taxRates({ gross: x.grossAnnual, filingStatus: x.filingStatus, place: x.place }, ref) : null)),
  };
}
