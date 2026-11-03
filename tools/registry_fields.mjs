// SPDX-License-Identifier: AGPL-3.0-only
// Prints every field in js/registry/fields.js as JSON, for tools/spec_link.py (which adds a spec row for each field
// the spec does not name yet). Run: node tools/registry_fields.mjs > /tmp/fields.json
import { AREAS } from '../js/registry/fields.js';

const out = AREAS.flatMap(a => a.fields.filter(f => !f.unused).map(f => ({ id: f.id, area: a.id, tab: a.tab, label: f.label, type: f.type, sheet: f.sheet === true ? 'column' : f.sheet.skip })));
process.stdout.write(JSON.stringify(out, null, 1));
