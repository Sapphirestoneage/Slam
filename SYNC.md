# SYNC.md: Google Sheets as the shared store between coach and client

A design note for software engineers who do not need to know personal finance. Written overnight on Nov 6 2026; nothing in it is built yet. It ends with the questions engineers should answer before anyone writes code.

## What SLAM is today

SLAM is a static site (HTML, CSS, ES modules, no build, no server) served from GitHub Pages. One client's data is one JSON document (the "household file") held in the browser's localStorage and exported as a JSON backup and as an Excel workbook. The workbook is generated from registries in code: every stored field (`js/registry/fields.js`) is a column on a tab, every formula (`js/registry/math.js`) is a named range on a Math tab, and the app's own numbers sit beside the formulas as a check. A change log on every edit (`doc.history`: field, old value, new value, who, time) and dated snapshots (`doc.snapshots`) live inside the same document.

Today only the coach types, on the coach's machine. The client sees the screen during a session and gets a workbook, a one-pager and homework by email. The goal of this design is to let the client log things between sessions (a spending line's actual, a balance, homework done, a Joy rating) without SLAM growing a server, and without the coach losing the single source of truth.

## The shape: one Google Sheet per client

- **One spreadsheet per client**, created by SLAM from the workbook export it already makes. The coach owns it. The client gets edit access to exactly one tab and a Google Form.
- **Tabs and their single owner.** Every tab has one writer; everything else is protected.
  - `Inputs` tabs (Income, Debt, Assets, Spending lines, Profile, Assumptions): written by SLAM on export. Protected range: the whole tab. The client can read them.
  - `Math`, `Statements`, `FOO`, `Projections`, `Scorecard`, `Program`, `Captured`, `Proposed`: written by SLAM. Protected.
  - `Responses`: written only by the Google Form (append-only by construction). SLAM reads it. The coach never edits it; if a row is wrong, the coach fixes the household file in SLAM and the row is marked reconciled (see the change log below).
  - `Meta`: one cell `schema_version` (an integer SLAM bumps when the registries change shape; today the app already has a format version and a hash of the registry shape in `js/sheet/format.js`), `client_id`, `exported_at`, `last_import_row`. Protected.
- **The Form.** A Google Form attached to the sheet, one question group per thing a client can log: a spending actual (which line, month, amount), an account balance (which account, as of, amount), homework done (which item), Joy (1 to 10), a category joy rating (category, 1 to 5), a Trip tag, a note. Each submission appends one row to `Responses` with a timestamp, the respondent's email and the answers. The Form's dropdowns (which line, which account) are rebuilt by SLAM on each export from the household file, so the client picks from the real lines and never types an id.

## How SLAM reads it

- **Incremental, append-only.** `Responses` rows are never edited or deleted. SLAM keeps `last_import_row` in `Meta` and in the household file. An import reads rows after that number, applies each one, and advances the pointer. Re-running an import is safe: a row is also keyed by its timestamp plus respondent plus a hash of the answers, and the change log refuses a row it has already applied.
- **What a row becomes.** The same code path the CSV statement import uses tonight (`js/import/csv.js`): a value lands on its field through the store, so it is logged in `doc.history` with `who: 'Client'`, `source: 'sheet'`, the Form row number, and the time of the submission (not the time of the import). A spending actual adds to that line's month actual and marks it `actualFrom: 'sheet'`; a balance updates the account with `asOf`; homework done sets the status to `Client says done` with `by: 'client'` (the review gate already confirms or sends it back); Joy and category joy append dated ratings.
- **Coach review.** Every client-entered change is in the change log with `who: Client`. The History screen's change log and the agenda's "Suggested for today" surface them: "3 things the client logged since last session". A client-entered balance is a level below a coach-confirmed one (Estimate, not Actual) until the coach ticks Looks right in the review gate, exactly as a Rough number is today. Nothing the client logs can delete or overwrite a coach-locked (Actual) number; it becomes a suggested change the coach accepts.
- **Conflicts.** The household file in SLAM is the truth. If the coach changed the same field after the client's submission time, the import keeps the coach's value and files the client's as a note on the field ("Client logged $412 on Nov 3; you set $400 on Nov 5"). There is no three-way merge; the sheet is never merged back wholesale.

## SLAM stays the source of truth

- SLAM can regenerate the whole sheet at any time from the household file: delete every tab but `Responses` and `Meta`, write them again, rebuild the Form's choices. A sheet that drifted (a client who unprotected a range, a coach who pasted) is fixed by export, never by hand.
- The workbook export already carries the app's values beside the formulas with a Check column; the same check tells the coach when a sheet and the file disagree.
- `schema_version` in `Meta` guards every read: SLAM refuses to import from a sheet whose version is newer than the app and warns on an older one (it still reads `Responses`, since the Form's columns are versioned by the question ids).

## Couple modes

The household mode (Solo, Dating, Living together, Engaged, Married separate, Married merged) decides what each person can see and log.

- **One Form per person.** Each person gets their own Form link; a submission carries the respondent's email, which maps to Person A or Person B (or is refused). The Form's dropdowns list only the rows that person may log: their own rows and the Joint ones. In Dating and Living together that is all they see; in Engaged the combined totals are a preview the coach shows in session, not a tab; in Married separate each can see the other's accounts (read), and in Married merged both see everything.
- **Tabs per person.** Input tabs carry an Owner column already. The sheet can hold a filtered view per person (a protected tab with a `FILTER` on Owner) so each sees their own rows and the Joint rows, matching the app's person view. The retirement and health accounts are always one person's; the Form will not offer them to the other person.
- A mode switch regenerates the sheet and the Forms; it never deletes a row or a tag (the app keeps everything; only defaults change).

## How a static GitHub Pages site could connect

| Option | How it works | Pros | Cons | Security and OAuth |
|---|---|---|---|---|
| **A. Google sign-in in the browser + Sheets API** | The coach signs in with Google in SLAM (Google Identity Services); the browser calls the Sheets and Drive APIs directly with an access token; SLAM creates the sheet, writes tabs, sets protections, reads `Responses`. | No server at all; fits a static site; the coach's own Google account owns every sheet; works offline except for the sync itself. | A Google Cloud project with an OAuth client id and a verified consent screen (the Drive and Sheets scopes are "sensitive"; unverified apps show a warning and cap at 100 users); tokens expire after an hour, so a long session re-prompts; every client sheet must be shared by hand or by API; the Form API (Forms API) is separate and newer; CORS is fine (Google APIs allow it). | The access token lives in the browser tab only (never stored); scopes should be the narrowest (`drive.file` creates and reads only files SLAM made, which avoids the broadest Drive scope and most of the verification burden). No client data leaves the coach's Google account. |
| **B. An Apps Script web app** | A script bound to a template sheet (or standalone) exposes `doGet`/`doPost`; SLAM calls it with `fetch`. The script runs as the coach, reads and writes the sheet, builds the Form. | One place for sheet logic in Google's own environment; no OAuth dance in the browser (the script runs as its owner); easy Form building (FormApp); can send email. | A deployed script URL is a secret that anyone with it can call unless SLAM adds its own token; "execute as me, anyone can access" is the only mode that works from a static site without Google sign-in, which means the script must authenticate SLAM itself; CORS needs the script to return the right headers and only simple requests work (no custom headers, so the token goes in the body); quotas (e.g. about 20,000 URL fetches a day, 6 minutes per run); the script version must be redeployed on every change. | Treat the web app URL plus a per-client secret as credentials; rotate them; the script should validate every field it writes. Data stays in the coach's account. |
| **C. File passing (no connection)** | Today's flow, formalized: SLAM exports the workbook; the coach uploads it to Drive and shares a tab or Form; the client's `Responses` CSV is downloaded and imported through the statement import. | Nothing to build beyond the import; no OAuth, no secrets, no quotas; works with any spreadsheet tool. | Manual every time; easy to skip; no incremental read without the row pointer (the import dedupes by hash, so it is safe but noisier). | No new surface. |

**Recommendation for a first version:** C now (the CSV import and the change log make it safe today), then A with the `drive.file` scope. B only if the Form building turns out to need Apps Script, in which case A can call a small Apps Script for Form creation while the browser does the reads and writes.

## When it outgrows Sheets

- More than a few hundred clients (one sheet each, one Form each, rebuilt on every export): Drive quotas and the coach's own account become the bottleneck.
- Two coaches, or a client who logs daily: concurrent writes to one sheet and the hour-long tokens get in the way.
- Anything the client should see live (their own dashboard, not a sheet): a real backend with per-user auth.
- Privacy: a sheet shared with a client is a copy of their data outside SLAM; a real store with row-level access would be needed before any regulated use.

At that point the household JSON, the change log and the registries are already the schema; a small service that stores the household document per client and serves the same JSON to a client view is the natural next step, and the sheet becomes an export again.

## Open questions for engineers

1. Can the `drive.file` scope cover everything (create the sheet, protect ranges, read `Responses`, build the Form), or does Form creation force the broader scope or an Apps Script?
2. Verification: does a coach's single-user app need Google's OAuth verification at all if the consent screen stays in Testing with named test users (the coach and a few clients)?
3. Should `Responses` live in the client's sheet, or in one coach-owned sheet with a client id column (one Form, one import, simpler quotas, but one place with every client's rows)?
4. Protected ranges: the client needs edit on nothing but the Form; is "view only" on the whole sheet plus the Form enough, which removes protections entirely?
5. The change log carries `who`; should client submissions be signed (the Form's collected email) and shown as such on the History screen, and do we store the respondent's email in the household file (privacy) or only Person A or B?
6. Schema version: when SLAM bumps the format, old `Responses` rows refer to old line ids; do we keep an id-to-id map in `Meta`, or forbid renaming lines that have ever been logged?
7. Offline: the coach often works without a connection in session; the sync is explicit (an Import button), never automatic. Is that acceptable to engineers who would prefer a background sync?
8. Secrets in a static site: for option B, where does the per-client token live (the household file is exported and emailed), and is a token in a URL ever acceptable?
9. Testing: a sandbox Google account with synthetic clients, and a recorded-response test double for the Sheets API so `node --test` stays offline.
10. The point at which to stop: which of the "outgrows Sheets" lines above would an engineer draw first, and what is the smallest backend that keeps the household JSON as the contract?
