/* ============================================================================
   SLAM the Game: account/cardadmin.js
   PURPOSE     "Add a card" on the admin page. The admin fills in one template (data/cardtemplate.js):
               the basics, the welcome offer, the yes / no switches, the earn rates, the yearly
               credits, and the free list "What is unique". The card is saved in the database table
               card_library. Each player gets it in the card vault (features/vault.js) the next time
               the game starts. A saved card with the id of a card of data/cards2026.js takes its place.
   INPUT       admin.html: sb (the database client), S (the state of the page), esc, draw. The
               template and its functions (data/cardtemplate.js). The cards of the file
               (data/cards2026.js).
   OUTPUT      Functions: caSet, caRate, caDraft, caRows, caNeeds, caLoad, caSave, caRemove, caField,
               caFormHTML, caHTML, caClick, caInput. State: CA.
   DEPENDS ON  data/cardtemplate.js, data/cards2026.js. admin.html loads this file. The game
               (index.html) does not load it.
   RULES       The database checks each write again: only the admin can add, change or remove a card.
               A card cannot be saved without its source and the date that a person looked at it.
               Empty is not zero: an empty number field stays empty. Remove asks one time, and the card
               of the file comes back when a replacement is removed.
   ========================================================================= */
const CA = { rows: [], edit: null, was: null, msg: "", ask: null, ready: false, missing: false };
/* Put one value in the draft. The path is the data-f of the field:
   "bank", "earn.base", "earn.words", "rate.dining", "has.rental", "words.rental",
   "credits.0.name", "unique.1.words". */
function caSet(d, path, v) {
  const p = String(path).split(".");
  if (p[0] === "rate") return caRate(d, p[1], v);
  if (p[0] === "has") {
    d.has = d.has || {};
    if (v === true || v === "1") d.has[p[1]] = true;
    else delete d.has[p[1]];
    return d;
  }
  if (p[0] === "words") {
    d.hasWords = d.hasWords || {};
    d.hasWords[p[1]] = v;
    return d;
  }
  if (p[0] === "earn") {
    d.earn = d.earn || { base: 1, rates: [], words: "" };
    d.earn[p[1]] = v;
    return d;
  }
  if (p[0] === "credits" || p[0] === "unique") {
    d[p[0]] = d[p[0]] || [];
    const i = +p[1];
    d[p[0]][i] = d[p[0]][i] || {};
    d[p[0]][i][p[2]] = v;
    return d;
  }
  d[p[0]] = v;
  return d;
}
/* The earn rate of one category: a number sets it, an empty field takes it away. */
function caRate(d, cat, v) {
  d.earn = d.earn || { base: 1, rates: [], words: "" };
  d.earn.rates = (d.earn.rates || []).filter(r => r.cat !== cat);
  if (String(v == null ? "" : v).trim() !== "") d.earn.rates.push({ cat, x: v });
  return d;
}
/* A draft to edit: a new card, or a copy of a card of the library. */
function caDraft(card) {
  const d = Object.assign(cardBlank(), JSON.parse(JSON.stringify(card || {})));
  d.has = Object.assign({}, d.has || {});
  if (d.biz) d.has.biz = true;
  if (d.upTo) d.has.upTo = true;
  d.hasWords = d.hasWords || {};
  d.earn = Object.assign({ base: 1, rates: [], words: "" }, d.earn || {});
  d.credits = d.credits || [];
  d.unique = d.unique || [];
  return d;
}
/* The cards of the file, and the units (the kinds of points). */
function caFile() {
  return typeof CARDS2026 !== "undefined" && CARDS2026 ? CARDS2026 : { offers: [], units: { cash: { n: "dollars" } } };
}
/* The rows of the list: each card that the admin saved, with what it does to the library. */
function caRows() {
  const file = {};
  caFile().offers.forEach(o => (file[o.id] = o));
  return CA.rows.map(r => ({
    id: r.id,
    card: r.data,
    at: r.updated_at,
    kind: r.data.hidden ? "hidden" : file[r.id] ? "replaces" : "new",
  }));
}
/* What the draft still needs, in plain words. */
function caNeeds(d) {
  return cardCheck(d, caFile().units);
}
/* Read the saved cards. A database with no table yet gives CA.missing. */
async function caLoad() {
  const q = await sb.from("card_library").select("id,data,updated_at").order("id");
  CA.ready = true;
  CA.missing = !!q.error;
  CA.rows = q.error ? [] : (q.data || []).filter(r => r && r.id && r.data);
}
async function caSave() {
  const need = caNeeds(CA.edit);
  if (need.length) return;
  const c = cardClean(CA.edit);
  if (CA.was && CA.was !== c.id) c.id = CA.was; /* an edit keeps the id: saved games name a card by its id */
  const q = await sb.from("card_library").upsert({ id: c.id, data: c, updated_at: new Date().toISOString() });
  CA.msg = q.error
    ? "That did not save. Only the admin account can change the card library."
    : "Saved: " + c.bank + " " + c.n + ". Players get it the next time the game starts.";
  if (!q.error) {
    CA.edit = null;
    CA.was = null;
  }
  await caLoad();
}
async function caRemove(id) {
  const q = await sb.from("card_library").delete().eq("id", id);
  CA.msg = q.error ? "That did not remove. Try again." : "Removed. The library is back to the file for that card.";
  CA.ask = null;
  await caLoad();
}
/* ---------- the form ---------- */
/* One field: the label above, a box with a border, and a hint. */
function caField(path, label, value, o) {
  o = o || {};
  const v = value === null || value === undefined ? "" : value,
    id = "ca_" + path.replace(/\W/g, "_"),
    hint = o.hint ? `<span class="muted">${esc(o.hint)}</span>` : "";
  if (o.opts)
    return `<div><label for="${id}">${esc(label)}</label><select id="${id}" data-f="${path}">${o.opts.map(x => `<option value="${esc(x[0])}"${String(x[0]) === String(v) ? " selected" : ""}>${esc(x[1])}</option>`).join("")}</select>${hint}</div>`;
  return `<div><label for="${id}">${esc(label)}</label><input id="${id}" data-f="${path}" type="${o.type || "text"}"${o.num ? ' inputmode="decimal"' : ""} value="${esc(v)}" placeholder="${esc(o.ph || "")}">${hint}</div>`;
}
function caSwitch(d, t) {
  const on = !!(d.has && d.has[t.k]);
  return `<div class="row"><span>${esc(t.l)}${t.help ? `<br><span class="muted">${esc(t.help)}</span>` : ""}</span><span class="seg"><button class="${on ? "on" : ""}" data-a="catog" data-k="${t.k}" data-v="1" aria-pressed="${on}">Yes</button><button class="${on ? "" : "on"}" data-a="catog" data-k="${t.k}" data-v="0" aria-pressed="${!on}">No</button></span></div>${on ? caField("words." + t.k, "The detail (optional)", (d.hasWords || {})[t.k], { ph: "One line, in plain words" }) : ""}`;
}
function caNeedsHTML(d) {
  const need = caNeeds(d);
  return need.length
    ? `<b>Still needed before you can save:</b><ul>${need.map(n => `<li>${esc(n)}</li>`).join("")}</ul>`
    : `<span class="ok">Ready to save.</span>`;
}
function caFormHTML(d) {
  const T = window.CARD_TEMPLATE,
    F = caFile(),
    groups = [];
  T.toggles.forEach(t => {
    if (!groups.includes(t.g)) groups.push(t.g);
  });
  const rate = cat => ((d.earn.rates || []).find(r => r.cat === cat) || {}).x,
    units = Object.keys(F.units).map(k => [k, F.units[k].n || k]);
  return (
    `<div class="card"><div class="row"><b>${CA.was ? "Change a card" : "Add a card"}</b><button data-a="cacancel">Cancel</button></div>` +
    `<p class="muted">Fill in what you know. An empty box means "not known", not zero.</p>` +
    `<b>The card</b>` +
    caField("bank", "Bank", d.bank, { ph: "Chase" }) +
    caField("n", "Card name", d.n, { ph: "Sapphire Preferred" }) +
    caField("network", "Network", d.network, { opts: [["", "Not known"]].concat(T.networks.map(n => [n, n])) }) +
    caField("fee", "Yearly fee, in dollars", d.fee, { num: 1, ph: "95", hint: "Type 0 for no fee." }) +
    caField("fee1", "Fee in the first year, when it is different", d.fee1, { num: 1, ph: "0" }) +
    `<b>The welcome offer</b>` +
    caField("amt", "How much", d.amt, {
      num: 1,
      ph: "75000",
      hint: "Points, miles or dollars. Leave empty when there is none.",
    }) +
    caField("unit", "The kind of points", d.unit, { opts: units }) +
    caField("spend", "Spending it needs, in dollars", d.spend, { num: 1, ph: "5000" }) +
    caField("months", "Months to do that spending", d.months, { num: 1, ph: "3" }) +
    caField("min", "Credit it usually needs", d.min, { opts: T.bands }) +
    caField("ends", "The offer ends on (optional)", d.ends, { type: "date" }) +
    groups
      .map(
        g =>
          `<details${T.toggles.some(t => t.g === g && d.has[t.k]) || g === "The card" ? " open" : ""}><summary>Switches: ${esc(g)}</summary><div class="tools">${T.toggles
            .filter(t => t.g === g)
            .map(t => caSwitch(d, t))
            .join("")}</div></details>`
      )
      .join("") +
    `<details${(d.earn.rates || []).length ? " open" : ""}><summary>What it earns</summary><div class="tools">` +
    caField("earn.base", "On everything else (1 means 1x or 1%)", d.earn.base, { num: 1, ph: "1" }) +
    T.cats
      .map(c => caField("rate." + c[0], c[1], rate(c[0]), { num: 1, ph: "Empty: the same as everything else" }))
      .join("") +
    caField("earn.words", "In one line (optional)", d.earn.words, { ph: "3x dining, 2x travel, 1x everything else" }) +
    `</div></details>` +
    `<details${d.credits.length ? " open" : ""}><summary>Yearly credits</summary><div class="tools">${d.credits
      .map(
        (r, i) =>
          `<div class="who">${caField("credits." + i + ".name", "Credit " + (i + 1), r.name, { ph: "Hotel credit" })}${caField("credits." + i + ".value", "Worth a year, in dollars", r.value, { num: 1, ph: "100" })}${caField("credits." + i + ".words", "The detail", r.words, { ph: "Up to $100 a year on hotels booked with the bank" })}<button data-a="carowdel" data-k="credits" data-v="${i}">Take this credit out</button></div>`
      )
      .join("")}<button class="wide" data-a="carowadd" data-k="credits">Add a credit</button></div></details>` +
    `<details open><summary>What is unique</summary><div class="tools"><p class="muted">Anything about this card that fits no switch. One row for each thing.</p>${d.unique
      .map(
        (r, i) =>
          `<div class="who">${caField("unique." + i + ".label", "Thing " + (i + 1), r.label, { ph: "Companion pass" })}${caField("unique." + i + ".words", "In plain words", r.words, { ph: "A second ticket for the taxes only, one time a year" })}${caField("unique." + i + ".value", "Worth a year, in dollars (optional)", r.value, { num: 1 })}<button data-a="carowdel" data-k="unique" data-v="${i}">Take this row out</button></div>`
      )
      .join("")}<button class="wide" data-a="carowadd" data-k="unique">Add a unique thing</button></div></details>` +
    `<b>Where this comes from</b>` +
    caField("source", "Where you read this", d.source, { ph: "The page of the bank, or a link" }) +
    caField("checked", "The date you looked at it", d.checked, { type: "date" }) +
    `<div id="caneed" class="muted">${caNeedsHTML(d)}</div>` +
    `<button class="primary wide" data-a="casave">Save this card to the library</button></div>`
  );
}
/* The section "Card library" of the admin page. */
function caHTML() {
  if (!CA.ready) return "";
  const F = caFile();
  if (CA.missing)
    return `<div class="card"><b>Card library</b><p class="muted">The database has no table for added cards yet. Run the last block of docs/game-addons.sql in Supabase one time, then tap "Check for new accounts".</p></div>`;
  if (CA.edit) return caFormHTML(CA.edit);
  const rows = caRows(),
    word = { new: "Added by you", replaces: "Replaces the card of the file", hidden: "Hidden from players" };
  return (
    `<div class="card"><b>Card library</b><p class="muted">${F.offers.length} cards come with the game (as of ${esc(F.asOf || "")}). You added or changed ${rows.length}.</p>${CA.msg ? `<p class="ok">${esc(CA.msg)}</p>` : ""}` +
    `<button class="primary wide" data-a="canew">Add a card</button>` +
    `<div><label for="ca_from">Or start from a card of the library, to change it</label><select id="ca_from" data-f="@from"><option value="">Pick a card</option>${F.offers.map(o => `<option value="${esc(o.id)}">${esc(o.bank + " " + o.n)}</option>`).join("")}</select></div>` +
    rows
      .map(r =>
        CA.ask === r.id
          ? `<div class="who"><p><b>Remove ${esc(r.card.bank + " " + r.card.n)} from your cards?</b> ${r.kind === "new" ? "Players will not see it any more." : "The card of the file comes back."}</p><div class="row"><button data-a="caaskno">Keep it</button><button data-a="cadel" data-k="${esc(r.id)}">Yes, remove</button></div></div>`
          : `<div class="who"><div class="row"><span><b>${esc(r.card.bank + " " + r.card.n)}</b><br><span class="muted">${word[r.kind]}. Looked at ${esc(r.card.checked || "")}.</span></span></div><div class="row"><button data-a="caedit" data-k="${esc(r.id)}">Change</button><button data-a="cahide" data-k="${esc(r.id)}">${r.card.hidden ? "Show to players" : "Hide from players"}</button><button data-a="caask" data-k="${esc(r.id)}">Remove</button></div></div>`
      )
      .join("") +
    `</div>`
  );
}
/* One tap in the section. Returns after the page is drawn again. */
async function caClick(t) {
  const a = t.dataset.a,
    k = t.dataset.k,
    row = CA.rows.find(r => r.id === k);
  CA.msg = "";
  if (a === "canew") {
    CA.edit = caDraft(null);
    CA.edit.checked = new Date().toISOString().slice(0, 10);
    CA.was = null;
  } else if (a === "caedit" && row) {
    CA.edit = caDraft(row.data);
    CA.was = row.id;
  } else if (a === "cacancel") {
    CA.edit = null;
    CA.was = null;
  } else if (a === "catog" && CA.edit) caSet(CA.edit, "has." + k, t.dataset.v);
  else if (a === "carowadd" && CA.edit) CA.edit[k].push({});
  else if (a === "carowdel" && CA.edit) CA.edit[k].splice(+t.dataset.v, 1);
  else if (a === "casave" && CA.edit) {
    if (caNeeds(CA.edit).length) {
      const el = document.getElementById("caneed");
      if (el && el.scrollIntoView) el.scrollIntoView({ block: "center" });
      return;
    }
    await caSave();
  } else if (a === "caask") CA.ask = k;
  else if (a === "caaskno") CA.ask = null;
  else if (a === "cadel") await caRemove(k);
  else if (a === "cahide" && row) {
    const c = Object.assign({}, row.data);
    if (c.hidden) delete c.hidden;
    else c.hidden = true;
    const q = await sb.from("card_library").upsert({ id: row.id, data: c, updated_at: new Date().toISOString() });
    CA.msg = q.error ? "That did not save. Try again." : c.hidden ? "Hidden from players." : "Players see it again.";
    await caLoad();
  }
  draw();
}
/* Typing in a field: keep the value in the draft, and write the list "Still needed" again. The page is
   not drawn again, so the field keeps the cursor. */
function caInput(el) {
  const f = el && el.dataset && el.dataset.f;
  if (!f) return;
  if (f === "@from") {
    const o = caFile().offers.find(x => x.id === el.value);
    if (!o) return;
    CA.edit = caDraft(o);
    CA.edit.checked = new Date().toISOString().slice(0, 10);
    CA.was = o.id;
    draw();
    return;
  }
  if (!CA.edit) return;
  caSet(CA.edit, f, el.value);
  const need = document.getElementById("caneed");
  if (need) need.innerHTML = caNeedsHTML(CA.edit);
}
