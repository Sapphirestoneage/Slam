# Turning on sign-in (Supabase, free plan)

Everything is built and tested against a stand-in server (tools/e2e/mock-cloud.mjs, the same rules as the database).
Three things turn it on:

1. Create a Supabase project. Copy its Project URL and its publishable (or "anon public") key. Never the secret key.
2. In the project: SQL Editor, paste all of docs/cloud-schema.sql, Run.
3. In the project: Authentication, URL Configuration. Set Site URL to https://sapphirestoneage.github.io/Slam/one.html
   and add the same address under Redirect URLs.
4. Put the two values in data/cloud.json: { "url": "https://xxxx.supabase.co", "key": "sb_publishable_..." } and push.

Optional: Authentication, Emails, the "Magic Link" template: add the line "Or type this code: {{ .Token }}" so the
six-digit code box works when the email is opened on another device.

Known limits: Supabase's built-in email sender allows only a few sign-in emails an hour, enough for testing. For real
use, connect a mail service under Authentication, SMTP. A free project pauses after a week with no activity.
Sync is newest-save-wins, a whole plan at a time.
