# Email setup: make sign-up and password emails reach real people

Today the game sends three kinds of email through Supabase: the "confirm your email" link at sign-up, the "set a new
password" link, and the same link when you tap "Email them a link to set a new password" on the admin page. Supabase's
built-in sender is only for testing: it sends to the addresses of your own Supabase team and nobody else, and only a
couple of messages an hour, so real sign-ups need a mail service of your own. This page connects one, Resend, on its
free plan.

Time: about 30 minutes, plus a wait while your domain is checked (often 15 minutes, sometimes up to 3 days).
A laptop is easier than a phone for Part 2, because you copy long values between two tabs.

**No key, password or secret goes in the repository, ever.** Not in a file, not in a commit, not in a chat with
Claude, not in a note or an email. The one key on this page goes from the Resend screen straight into the Supabase
screen and nowhere else.

What the free plan gives you (read on 2026-11-25): 100 emails a day and 3,000 a month. The day count starts again at
midnight UTC. When the limit is reached the next email is not sent and is not kept for later. That is enough for a
soft launch: each sign-up uses one email.

## Before you start: the From address

Resend only sends from a domain you own and have proved is yours. Two things follow.

- **A Gmail address cannot be the From address.** stresslessaboutmoney@gmail.com belongs to Google's domain,
  gmail.com, and only Google can prove it owns that. So the emails cannot say they come from your Gmail address.
- **Your own domain can.** The app already links to stresslessaboutmoney.com. If that domain is yours, the emails can
  come from an address on it, for example `hello@mail.stresslessaboutmoney.com`. You do not have to create that
  mailbox: once the domain is proved, Resend sends from any name in front of the @.

Resend suggests using a part of your domain (a "subdomain", such as `mail.stresslessaboutmoney.com`) and not the bare
domain, so the sign-in emails are kept apart from your own everyday email. If you prove only the subdomain, the From
address must end with the subdomain.

To prove the domain you add a few lines, called DNS records, at the place where the domain is managed (the company
you bought it from, such as GoDaddy, Namecheap, Squarespace or Cloudflare). You need the sign-in for that account.

**If you have no domain, or cannot get into its account yet**, the honest options are:

1. Buy a domain (a small yearly fee) and come back to this page. This is the real fix.
2. Leave things as they are for the soft launch: do not do Part 4, keep "Confirm email" off so that people can sign
   up without an email, and know that the "set a new password" email will not reach anyone outside your Supabase
   team. On the admin page, "Confirm their email by hand" still works.
3. Resend has a test sender, `onboarding@resend.dev`. It only sends to the address of your own Resend account, so it
   is good for a look, not for players.

## Part 1. Create the Resend account

1. Open https://resend.com in your browser.
   You should see: the Resend home page with a button to sign up.
2. Click the sign-up button (its label is on the screen; see "Check on the screen" below).
   You should see: a form asking for an email and a password, or buttons to sign up with Google or GitHub.
3. Sign up with the email you want the account to belong to, for example stresslessaboutmoney@gmail.com.
   You should see: a message asking you to confirm your email, or the Resend dashboard.
4. If it asks, open your inbox and click the confirmation link from Resend.
   You should see: the Resend dashboard, with a menu on the left.
   If you see this instead: no email after a few minutes. Look in the spam folder, then ask Resend to send it again.
5. If Resend shows a "get started" tour that offers to make an API key, skip it for now. You make the key in Part 3.

## Part 2. Add your domain and prove it is yours

**This needs your own domain's DNS. If you cannot sign in to it, stop here and tell Claude.**

Your answers (2026-11-25): the emails come from `hello@mail.stresslessaboutmoney.com`, the sender name is
`SLAM the Game`, and the domain to prove is `mail.stresslessaboutmoney.com`. This holds only if
stresslessaboutmoney.com is yours and you can sign in to its DNS. That confirmation is still open.

1. In the Resend menu on the left, click "Domains".
   You should see: a page of domains, empty for now.
2. Click "Add Domain".
   You should see: a box to type a domain.
3. Type the domain to send from: `mail.stresslessaboutmoney.com`.
4. If it asks for a region, keep the one already chosen. Then click the button that adds the domain.
   You should see: a list of DNS records. Each has a type, a name and a long value.
5. Open a second browser tab and sign in to the place where your domain is managed.
6. Find its DNS page there. It may be called "DNS", "DNS records", "Manage DNS" or "Advanced DNS".
   You should see: a list of records and a button to add one.
7. Add each record from the Resend tab, one at a time: same type, same name, same value. Use the copy button next
   to each value in Resend. Do not type the values by hand.
   You should see: each new record in the list at your domain company.
8. Go back to the Resend tab and click the button that checks the records (see "Check on the screen").
   You should see: the domain marked as verified. This often takes 15 minutes. It can take up to 72 hours.

If you see this instead:

- **Still not verified after an hour.** Compare each record with Resend, character by character. They must match
  exactly.
- **Your domain company added your domain twice to a name** (it shows `mail.stresslessaboutmoney.com.stresslessaboutmoney.com`).
  Some companies add the domain for you. Type only the first part of the name, or put a full stop at the end of the
  value. Resend has a page for each big domain company; search its help for the company name.
- **You use Cloudflare and a record has an orange cloud.** Turn the cloud grey ("DNS only") for that record.
- **Still not verified after 72 hours.** In Resend, open the domain and click "Restart verification".

## Part 3. Make the key (this is the SMTP password)

Open the Supabase tab from Part 4, steps 1 to 3, first. Then you can paste the key the moment you have it.

1. In the Resend menu on the left, click "API Keys".
2. Click "Create API Key".
   You should see: a box asking for a name and a permission.
3. Name it `supabase-slam`.
4. For the permission, choose "Sending access". This key can then only send email and can do nothing else.
5. If it lets you pick a domain, pick the domain from Part 2.
6. Click the button that creates the key.
   You should see: the key, a long line of letters and numbers.
7. Copy it with the copy button. Treat it as shown once: you may not be able to see it again.
8. Go straight to the Supabase tab and paste it (Part 4, step 9). Paste it nowhere else.

If you see this instead: you closed the box before copying, or you pasted the key somewhere it should not be. On the
"API Keys" page, delete that key and make a new one. A deleted key stops working, so nothing is lost.

## Part 4. Paste the settings into Supabase

1. Open https://supabase.com/dashboard/project/twuxggigsfsdczsyvupk/auth/smtp and sign in if asked.
   You should see: the SMTP settings of your project.
   If you see this instead: a different page. In the left menu click "Authentication", then "Emails" (it may be
   shown as "Email" under "Notifications"), then the tab "SMTP Settings".
2. Turn on the switch "Enable Custom SMTP".
   You should see: a form with fields for the sender and for the SMTP server.
3. Fill in the fields. The labels on your screen may differ by a word; the meaning is the same.

| Field | What goes in it |
|-------|-----------------|
| Sender email (the From address) | `hello@mail.stresslessaboutmoney.com` |
| Sender name | `SLAM the Game` |
| Host | `smtp.resend.com` |
| Port number | `465` |
| Username | `resend` (the word itself, all small letters, not your email) |
| Password | The key from Part 3 |

4. Type the Sender email.
5. Type the Sender name.
6. Type the Host.
7. Type the Port number.
8. Type the Username.
9. Paste the key into Password.
10. Leave every other field as it is.
11. Click "Save" (or "Save changes").
    You should see: a short message that the settings were saved. From now on Supabase sends to any address.
    If you see this instead: a field outlined with a message under it. Read the message, fix that field, save again.

### Raise the limit

When SMTP is first turned on, Supabase holds your project to a low number of emails an hour (30 when this was
written).

12. Open https://supabase.com/dashboard/project/twuxggigsfsdczsyvupk/auth/rate-limits (left menu: "Authentication",
    then "Rate Limits").
    You should see: a list of limits. One is for sending emails.
13. In the limit for sending emails, read the number that is there, then type `100`.
    Why 100: the Resend free plan sends at most 100 a day, so a higher number here does nothing.
14. Click "Save".
    You should see: a message that the limits were saved.

### Turn on "Confirm email"

Do this only after the test in Part 5, step 1 to 4, has worked once. With it on, a new player must click the link in
the email before signing in, so the email has to arrive.

15. Open https://supabase.com/dashboard/project/twuxggigsfsdczsyvupk/auth/providers (left menu: "Authentication",
    then "Sign In / Providers" or "Providers").
16. Click the row "Email".
    You should see: the settings for email sign-in, with a switch about confirming the email.
17. Turn on "Confirm email".
18. Click "Save".
    You should see: a message that it was saved.

## Part 5. Send a test

The quick test, before "Confirm email" is on:

1. Open the admin page of the game and sign in as the admin.
2. Open a player whose inbox you can read (your own second account is best).
3. Tap "Email them a link to set a new password".
4. Open that inbox.
   You should see: within a minute or two, an email from the Sender name you chose, from the address you chose.

The full test, after "Confirm email" is on:

5. Open the game in a private browser window.
6. Sign up with a second email address of yours, one that is not in your Supabase team.
   You should see: "Check your email. We sent a link to" and your address, with what to do if nothing arrives.
7. Open that inbox and tap the link in the email.
   You should see: the game opens, and you can sign in.

The last step, after both tests worked:

8. Tell Claude: "Email works. Turn on EMAIL_READY." Until then the sign-in screen of the game says "Forgot your
   password? Contact Eli." and opens an email draft to stresslessaboutmoney@gmail.com, because a reset email would
   reach nobody. With the switch on (`EMAIL_READY` in `game/account/supa.js`), the sign-in screen shows "Forgot my
   password" and sends the reset email.

If the domain is not ready by the launch: keep "Confirm email" off and leave the switch off. A new player is signed
in straight after sign-up, with no email. If the email service answers with an error, the game says in plain words
that the email could not be sent and what to do.

### When the email does not arrive

Look in this order.

1. **The spam folder** of the inbox, and the "Promotions" tab in Gmail. If it is there, mark it "Not spam".
2. **Resend, "Emails"** in the left menu. Every email Resend was asked to send is listed with its state.
   - It is listed as delivered: the mail reached the other side. Look in spam again, and check the address for a typo.
   - It is listed as bounced: the address refused it. Open the email in the list to read why.
   - It is not listed at all: Supabase never handed it to Resend. Go to the next two lines.
3. **Resend, "Logs"** in the left menu. A refused attempt shows here with the reason. A wrong key, a From address
   that is not on your proved domain, or the day's limit reached all show here.
4. **Supabase, the auth logs.** In your project, left menu: "Logs", then "Auth". Look at the newest lines at the
   time of your test. A line about a rate limit means the limit in Part 4, step 13, is too low or was not saved. A
   line about SMTP or authentication means the Host, Port number, Username or Password is wrong: make a new key
   (Part 3) and paste it again.
5. If all of that looks right, wait ten minutes and send one more test before changing anything.

## Checklist

- [ ] The Resend account exists and I can sign in to it.
- [ ] My domain shows as verified on Resend's "Domains" page.
- [ ] The key was pasted into Supabase and is saved nowhere else.
- [ ] Custom SMTP is on in Supabase, the email limit is raised, and "Confirm email" is on.
- [ ] A test sign-up with a second address got its email, and the link opened the game.
- [ ] I asked Claude to turn on `EMAIL_READY`, and the sign-in screen shows "Forgot my password".

## Check on the screen

These could not be read from an official page on 2026-11-25 (the two sites could not be opened from where this was
written; the facts above come from search results that quote the official pages). Read them from the screen itself.

- Resend's sign-up button label and the steps of its sign-up form (Part 1).
- The label of the button that checks the DNS records, and the exact word for a proved domain (Part 2, step 8).
- Whether Resend shows the key only once. Treat it as shown once (Part 3, step 7).
- The exact labels of the Supabase SMTP fields. They are given here as Resend's own guide names them (Part 4).
- The left menu names in Supabase. Supabase's own page gives the links used above; Resend's guide names the path as
  "Authentication", then "Email" under "Notifications", then "SMTP Settings".
- The starting email limit after SMTP is on: Supabase's page says 30 an hour, Resend's page says 25. Read the number
  on the "Rate Limits" page.
- The exact label of the "Confirm email" switch on the "Email" provider, and of the "Logs", "Auth" page in Supabase.
- Not checked in this run: sending through Gmail's own mail server in place of Resend. It is not in these steps.

## Sources

All read on 2026-11-25, through search results quoting the pages, and through Supabase's documentation search.

- Host `smtp.resend.com`, username `resend`, the password is the API key, ports 25, 465, 587, 2465, 2587, "if
  unsure use 465", and that a verified domain is needed first: Resend, "Send emails with SMTP",
  https://resend.com/docs/send-with-smtp
- Supabase menu path and the fields (sender email, sender name, host, port, username, password), port 465: Resend,
  "Send emails using Supabase with SMTP", https://resend.com/docs/send-with-supabase-smtp
- The switch "Enable Custom SMTP": Resend, "How to configure Supabase to send emails from your domain",
  https://resend.com/blog/how-to-configure-supabase-to-send-emails-from-your-domain
- Free plan: 100 emails a day, 3,000 a month, the day starts again at midnight UTC, no queue at the limit: Resend,
  "What are Resend account quotas and limits?", https://resend.com/docs/knowledge-base/account-quotas-and-limits
  and https://resend.com/pricing
- "Domains", "Add Domain", the subdomain advice, records must match exactly, often 15 minutes and up to 72 hours,
  "Restart verification", the Cloudflare and doubled-domain snags: Resend, "Add and verify a domain",
  https://resend.com/docs/add-a-domain and "What if my domain is not verifying?",
  https://resend.com/docs/knowledge-base/what-if-my-domain-is-not-verifying
- The test sender `onboarding@resend.dev` only sends to your own account address; once a domain is verified you can
  send from any address on it: Resend, "403 Error Using resend.dev Domain",
  https://resend.com/docs/knowledge-base/403-error-resend-dev-domain and "Sender email addresses in Resend",
  https://resend.com/docs/knowledge-base/how-do-I-create-an-email-address-or-sender-in-resend
- "API Keys", "Create API Key", "Full access" and "Sending access", limiting a key to one domain: Resend, "Create
  API key", https://resend.com/docs/api-reference/api-keys/create-api-key and
  https://resend.com/changelog/new-api-key-permissions
- The "Emails" page and its states (delivered, bounced), and the "Logs" page: Resend, "View and manage emails",
  https://resend.com/docs/dashboard/emails/manage-emails
- The built-in sender only sends to the project's team and is not for real use; the settings page is
  `/dashboard/project/<project>/auth/smtp`; 30 messages an hour after SMTP is on, changed on
  `/dashboard/project/<project>/auth/rate-limits`: Supabase, "Send emails with custom SMTP",
  https://supabase.com/docs/guides/auth/auth-smtp
- The built-in sender's limit of 2 an hour, and that the email limit can only be changed with custom SMTP: Supabase,
  "Rate limits", https://supabase.com/docs/guides/auth/rate-limits
- Whether people must confirm their email is set on `/dashboard/project/<project>/auth/providers`: Supabase,
  "Password-based Auth", https://supabase.com/docs/guides/auth/passwords
