# AI pass setup: let the AI fill in the rest after a live session

After a Live Session Mode call, the review screen can have one more button: "Run the AI pass". It sends the saved
words of the call (and, if you add it, the text file of your phone's recorder) to Anthropic's AI, and puts what the
AI proposes into the same review you already use. Nothing changes in your client's profile until you approve it.
It also drafts session notes and a next-call agenda for you.

The AI pass runs in a small program on Supabase, called an Edge Function. This page sets it up: an API key from
Anthropic, the key stored in Supabase, the function deployed, and the switch in the game turned on.

Time: about 20 minutes. A laptop is easier than a phone, because you copy long text between two tabs.

**No key, password or secret goes in the repository, ever.** Not in a file, not in a commit, not in a chat with
Claude, not in a note or an email. The one key on this page goes from the Anthropic screen straight into the
Supabase screen and nowhere else. If a key was ever pasted anywhere else, delete it in the Anthropic Console
(Part 1, step 7) and make a new one.

Before you start: Live Session Mode itself must work. That means
`supabase/migrations/20261125210000_live_sessions.sql` ran one time in the Supabase SQL Editor (it is the file for
the whole build; run the newest copy of it, it is safe to run two times), and the switch `LIVE_SESSION_READY` is on.
The AI pass is a second, separate switch.

## Part 1. Get an Anthropic API key

1. Open https://platform.claude.com in your browser.
   You should see: the Claude Console, with a page to sign up or sign in.
2. Sign up, or sign in if you have an account. Use the email you want the bills to go to.
   You should see: the Console dashboard.
3. Add a way to pay. Open https://platform.claude.com/settings/billing (in the Console: Settings, then Billing;
   the labels are on the screen). Add a card or buy a small amount of credit, for example 5 dollars.
   You should see: a balance or a payment method on the Billing page.
   If you see this instead: a message that the account is new. New accounts get a small free credit to test with;
   it is enough to try the simulated call.
4. Open https://platform.claude.com/settings/keys (in the Console: Settings, then API keys).
   You should see: a list of keys (empty at first) and a button to make a new key (its label is on the screen).
5. Make a key. Give it a name you will recognize, for example `slam-ai-pass`.
   You should see: the new key, a long line of letters and numbers, with a button to copy it.
6. Copy the key. Keep this tab open. Do not paste it anywhere but the Supabase field in Part 2.
   Treat the key as shown only once: if you close the tab before Part 2, make a new key.
7. To stop a key later (or if it was pasted somewhere it should not be): on the same API keys page, the key's menu
   has a way to delete or disable it (the label is on the screen).

## Part 2. Put the key in Supabase, as a secret of the Edge Functions

1. Open https://supabase.com/dashboard and sign in. Click the project of the game.
2. In the left sidebar, click **Edge Functions**. Then open its **Secrets** page (the address is
   https://supabase.com/dashboard/project/_/functions/secrets; the label of the menu item is on the screen).
   You should see: a form with a Key field and a Value field, and a list of secrets.
3. In **Key**, type exactly: `ANTHROPIC_API_KEY`
4. In **Value**, paste the key from Part 1, step 6.
5. Press **Save**.
   You should see: `ANTHROPIC_API_KEY` in the list. Supabase shows a short fingerprint, not the key.
6. Close the Anthropic tab. The key now lives only in Supabase.

You do not need to deploy again after you change a secret: Supabase gives a new value to the function at once.

(If your site's address is not `https://sapphirestoneage.github.io`, add one more secret: Key `SITE_ORIGIN`, Value
the address of the site, for example `https://www.example.com`, with no slash at the end. The function answers
only that address.)

## Part 3. Deploy the function

Supabase can make a function from the dashboard, with no program to install.

1. Still in **Edge Functions**, click **Deploy a new function**, then **Via Editor**.
   You should see: a code editor, maybe with a template ("Hello World").
2. Set the name of the function to exactly: `live-ai-pass`
   The game calls the function by this name. Another name does not work.
3. In GitHub, open the file `supabase/functions/live-ai-pass/index.ts` of the repository, and click the button to
   see the plain text (the label is "Raw" on GitHub). Select all of it and copy it.
4. In the Supabase editor, select all of the template and delete it. Paste the file.
5. Click **Deploy function** (at the bottom of the editor). Wait 10 to 30 seconds.
   You should see: a message that the deployment is finished, and `live-ai-pass` in the list of functions.
   If you see this instead: an error about an import. The file loads two packages from npm (the Anthropic
   SDK 1.14.0 and supabase-js 2.119.2). Wait a minute and press Deploy again. If it stays, copy the error into
   QUESTIONS for the next run (not the key: the error only).
6. Leave the function's setting that checks the sign-in on (Supabase calls it "Enforce JWT" or "Verify JWT"; the
   label is on the screen). The function also checks the sign-in itself.

Supabase's own note: the dashboard editor keeps no history of versions. The file in the repository is the master
copy; to change the function, change the file and paste it again.

### The other way: the Supabase command line

Only if the dashboard way does not work. On a laptop with the Supabase CLI installed, in the folder of the
repository:

```
supabase login
supabase link --project-ref <the id of your project, from the dashboard address>
supabase functions deploy live-ai-pass
```

To set the secret from the command line (type the key in the terminal only, never in a file of the repository):

```
supabase secrets set ANTHROPIC_API_KEY=<the key>
```

## Part 4. Turn the switch on

The switch is one line in `game/account/liveflag.js`:

```
let AI_PASS_READY = false;
```

Ask Claude in a new session: "Turn on AI_PASS_READY in game/account/liveflag.js, run the tests, and push." (Or
change `false` to `true` in that file yourself on GitHub.) The game picks it up the next time the page loads.

The switch does nothing while `LIVE_SESSION_READY` is off: the AI pass is a part of Live Session Mode.

## Part 5. Test it

### First, the simulated call (no real person, no microphone)

The simulated call answers the AI pass from a stand-in: no word is sent to Anthropic, and it costs nothing. It
shows what the screens look like.

1. Open `https://sapphirestoneage.github.io/Slam/game/session.html?sim=coach` in Chrome on a laptop.
2. Tap OK, Allow the microphone (a stand-in), Yes for headphones, and Start when it lights up.
3. Let the made-up call play (about a minute), then tap End, and "Yes, end the session".
   You should see: "Check what was heard", and a card "The AI pass" with "Drop in your recording's text file"
   and "Run the AI pass".
4. Tap **Run the AI pass**.
   You should see: "Pass 1" with a token count, the reminder "Delete the recording from your phone.", proposals
   marked "From the AI pass" or "From the Samsung file" in the groups, and the card "Session notes and the next
   call".

### Then a real test, with your own second account

1. Run a short real session with a test account of yours as the client (two laptops or two browsers). Say a few
   numbers: rent, a card balance, how often you get paid. End the session.
2. On the review, tap **Run the AI pass**. It can take up to two minutes.
   You should see: the same as in the simulated call, with real proposals.
   If you see this instead:
   - "The AI pass is not set up yet": the function is not deployed, or its name is not exactly `live-ai-pass`.
   - "The AI pass has no API key yet": the secret is missing, or its Key is not exactly `ANTHROPIC_API_KEY`.
   - "The API key was refused": the key was deleted, or was copied with a piece missing. Make a new key (Part 1)
     and save it again (Part 2).
   - "The AI service is busy": wait a minute and try again.
   - "This address may not call the AI pass": the site address is not the one the function answers (Part 2,
     the note on `SITE_ORIGIN`).
3. Optional: record the same test call with Samsung Voice Recorder, turn on its transcript, share it as a .txt
   file to the laptop, and use **Drop in your recording's text file** before you run the pass. The review says which
   speaker is you; if it is not sure, tap "Speaker 1 is me" or "Speaker 2 is me".
4. Approve one proposal and check that it shows in the test client's game as a Guess.
5. In Supabase, **Edge Functions**, `live-ai-pass`, the logs (the label is on the screen) show one call for each
   pass. They do not show the words.

## What it costs, roughly

Each pass is one request to the model Claude Opus 5.5. The price of that model, read on 2026-11-25 on Anthropic's
pricing page (https://platform.claude.com/docs/en/about-claude/pricing): **4 dollars for each million input tokens
and 20 dollars for each million output tokens.**

The review shows the count of each pass ("About 18,200 tokens (15,800 in, 2,300 out)"). The cost of that pass is:

```
(tokens in x 4 + tokens out x 20) / 1,000,000 dollars
```

For the example: 15,800 x 4 + 2,300 x 20 = 109,200, so about 11 cents.

A guess for a whole call, before any real call was measured: a 45-minute call is about 10,000 to 15,000 tokens of
words; with the recorder's file it is about double. The answer (with the AI's own thinking) is about 3,000 to
6,000 tokens. That is about **10 to 30 cents for each pass.** The function caps the answer at 16,000 tokens, so one
pass cannot cost more than about 32 cents for the answer, plus the input. Running the pass a second time costs the
same again.

If the AI declines a request for safety reasons, the API runs it again on another model it picks (this is switched
on in the function); that model's own price applies to that pass. The Billing page of the Console shows the real
spend. You can set a limit there (the label is on the screen).

## How to turn it off

- To hide it from the review: set `AI_PASS_READY` back to `false` (Part 4). Live Session Mode keeps working
  without it.
- To stop all calls to Anthropic, even from an old open page: in the Anthropic Console, delete the key (Part 1,
  step 7). The function then answers "The API key was refused" and nothing is sent.
- To remove the function: Supabase, **Edge Functions**, `live-ai-pass`, its settings, delete (the label is on the
  screen). Then delete the secret `ANTHROPIC_API_KEY` on the Secrets page.

## What the function does and does not do

- It checks that the person who taps the button is signed in and is the coach of that session (or you, the admin).
- It reads the saved lines of the session from the database itself. It does not trust lines sent by the browser.
  The one text the browser sends is the recorder's file you dropped in, with the speakers you checked.
- It sends one request to Anthropic for each pass, with a size cap on the way in (about 200,000 characters of
  words, and the same for the file) and on the way out, and a time limit of 2 minutes.
- It stores nothing. The browser puts the proposals in the review, and only what you approve is saved, in the
  client's game. The draft notes stay on your laptop until you tap Save; then they go into your notes on the coach
  page. Your client never sees them.
- No audio is ever sent: SLAM has text only.

## Checklist

- [ ] An Anthropic Console account with a way to pay (Part 1).
- [ ] An API key, pasted only into Supabase as the secret `ANTHROPIC_API_KEY` (Part 2).
- [ ] The function `live-ai-pass` deployed from `supabase/functions/live-ai-pass/index.ts` (Part 3).
- [ ] `AI_PASS_READY` set to `true` (Part 4), with `LIVE_SESSION_READY` on.
- [ ] The simulated call shows a pass with a token count (Part 5).
- [ ] One real test call, one proposal approved (Part 5).
- [ ] A spend limit set in the Console, if you want one.

## Check on the screen

These could not be confirmed from where this was written. Read them from the screen itself.

- The labels of the Console's buttons to make, copy and delete a key, and the menu names Settings, Billing and API
  keys (Part 1). The two addresses come from Anthropic's own documentation.
- Whether the Console shows a key only once. Treat it as shown once.
- The name of the Secrets page in the Edge Functions menu (Part 2). Supabase's documentation gives its address.
- The exact label of the sign-in setting of a function ("Enforce JWT" or "Verify JWT") and of the logs (Part 3 and
  Part 5).
- Not tried from here: deploying this file in the dashboard editor. The file was written for Deno, the way
  Supabase's own examples import packages (`npm:`); it was not run on Supabase before this page was written.

## Sources

All read on 2026-11-25.

- The price of Claude Opus 5.5, 4 dollars a million input tokens and 20 dollars a million output tokens:
  Anthropic, "Pricing", https://platform.claude.com/docs/en/about-claude/pricing
- The Console's sign-up and the API keys page (https://platform.claude.com/settings/keys): Anthropic, "Get started
  with Claude", https://platform.claude.com/docs/en/get-started
- The Billing page (https://platform.claude.com/settings/billing) and the free test credits of new accounts:
  Anthropic, "Pricing", the same page, "Billing and payment" and "Are there free tiers or trials?"
- Edge Functions in the dashboard: "Deploy a new function", "Via Editor", "Deploy function", no version history in
  the editor: Supabase, "Getting Started with Edge Functions (Dashboard)",
  https://supabase.com/docs/guides/functions/quickstart-dashboard
- Secrets: the Edge Function Secrets page, "Add the Key and Value for your secret and press Save", no deploy needed
  after a change, `supabase secrets set`, and the values `SUPABASE_URL` and `SUPABASE_ANON_KEY` that each function
  gets by itself: Supabase, "Environment Variables", https://supabase.com/docs/guides/functions/secrets
