# RESTORE: the weekly backup of the game's database

This page is written in Simplified Technical English. Each step has one instruction.

## What the backup is

- GitHub makes one backup each Sunday at 07:17 UTC. The workflow is `.github/workflows/backup.yml`.
- The backup holds the accounts (the schema `auth`) and the saved games and reports (the schema `public`).
- The backup is one encrypted file. Its name is `slam-backup-<date>.dump.gpg`.
- GitHub keeps each file for 90 days. After 90 days GitHub deletes the file.
- The repository is public. Thus each person with a GitHub account can download the encrypted file.
- The passphrase is the only lock on the file. Keep the passphrase long and private.
- No copy that is not encrypted is written to a disk on GitHub. No dump is in the repository.

## Setup (Eli, one time)

1. Open https://supabase.com/dashboard and open the project of the game.
2. Get the database address:
   1. Click **Connect** at the top of the page.
   2. Find the block **Session pooler**. Do not use "Direct connection": GitHub cannot reach that address.
   3. Copy the address. It starts with `postgresql://postgres.` and ends with `:5432/postgres`.
   4. Replace `[YOUR-PASSWORD]` in the address with the database password.
   5. If you do not know the database password, open **Database**, then **Settings**, and click **Reset database password**.
3. Make a passphrase:
   1. Use 6 random words or more. The minimum is 20 characters.
   2. Save the passphrase in your password manager. Name the entry "SLAM backup passphrase".
   3. Do not put the passphrase in an email, a chat or the repository.
4. Open https://github.com/Sapphirestoneage/Slam/settings/secrets/actions .
5. Click **New repository secret**.
6. Type the name `SUPABASE_DB_URL`. Paste the address from step 2. Click **Add secret**.
7. Click **New repository secret** again.
8. Type the name `BACKUP_PASSPHRASE`. Paste the passphrase from step 3. Click **Add secret**.
9. Make the first backup now. Do the steps of "Make a backup now".

CAUTION: If you lose the passphrase, no person can open the backups. Not GitHub, and not a developer.

CAUTION: If you change the passphrase, the old backups still open only with the old passphrase. Keep the old passphrase for 90 days.

## Make a backup now

1. Open https://github.com/Sapphirestoneage/Slam/actions/workflows/backup.yml .
2. Click **Run workflow**.
3. Click the green button **Run workflow**.
4. Wait 2 minutes. Reload the page.
5. Make sure the newest run has a green mark.
6. If the run has no green mark, click the run. Read the last line of the step "Dump and encrypt". The line starts with `no backup:` and gives the cause.

## Download a backup

1. Open https://github.com/Sapphirestoneage/Slam/actions/workflows/backup.yml .
2. Click the run of the date you want.
3. Go to the block **Artifacts** at the bottom of the page.
4. Click the name `slam-backup-<number>`. The browser downloads a zip file.
5. Open the zip file. It holds one file: `slam-backup-<date>.dump.gpg`.

## Decrypt a backup

You need the tool `gpg`. On a Mac, install it with `brew install gnupg`. On Windows, install Gpg4win.

1. Open a terminal in the folder that holds the file.
2. Run this command. Use the name of your file.

   ```
   gpg --output slam.dump --decrypt slam-backup-2026-11-29-0717.dump.gpg
   ```

3. Type the passphrase when gpg asks.
4. Make sure the file `slam.dump` is in the folder.

WARNING: `slam.dump` is not encrypted. It holds the email address and the money numbers of each player. Do not put it in the repository, in a shared folder or in an email. Delete it when the restore is done.

## Test a restore on a scratch database

Do this test one time after the setup, and one time each 3 months. A backup that was never restored is not proven.

You need PostgreSQL 17 on your computer (`brew install postgresql@17` on a Mac). The tools are `createdb`, `psql` and `pg_restore`.

1. Make an empty database:

   ```
   createdb slam_scratch
   ```

2. Make the three roles that Supabase has and a plain PostgreSQL does not have:

   ```
   psql slam_scratch -c "create role anon; create role authenticated; create role service_role;"
   ```

3. Restore the backup into the empty database:

   ```
   pg_restore --no-owner --no-privileges --dbname slam_scratch slam.dump
   ```

4. Ignore a message that says a schema or a role "already exists". Ignore a message about an extension that is not installed.
5. Count the accounts and the saved games:

   ```
   psql slam_scratch -c "select count(*) from auth.users" -c "select count(*) from public.games"
   ```

6. Compare the two numbers with the admin page of the game (`/game/admin.html`). The numbers must be the same as on the day of the backup.
7. Delete the scratch database and the plain file:

   ```
   dropdb slam_scratch
   rm slam.dump
   ```

## Restore one person's saved game

Use this when one player lost a game and the database itself is healthy.

1. Do the steps 1 to 3 of "Test a restore on a scratch database".
2. Find the saved game of the person in the scratch database:

   ```
   psql slam_scratch -c "select g.* from public.games g join auth.users u on u.id = g.owner where u.email = 'person@example.com'"
   ```

3. Give the result to the developer session. The session writes the rows back with the admin tools.
4. Do step 7 of "Test a restore on a scratch database".

NOTE: The name of the owner column in `public.games` can be different. Run `psql slam_scratch -c "\d public.games"` to see the columns.

## Restore the full database (the project is lost)

NOTE: This procedure was not tried on a real Supabase project. Do the scratch test first. Ask a developer session to do these steps with you.

1. Make a new project on https://supabase.com/dashboard .
2. Copy the **Session pooler** address of the new project (Setup, step 2).
3. Restore the accounts and the data:

   ```
   pg_restore --no-owner --data-only --disable-triggers --schema auth --schema public --dbname "<address of the new project>" slam.dump
   ```

   A new project has the tables of `auth` already. Thus this command adds only the rows of `auth`.
4. If the command says a table of `public` does not exist, run the files in `supabase/migrations/` first, in the order of their names. Then do step 3 again.
5. Put the address and the public key of the new project in `game/account/supa.js`. A developer session does this.
6. Put the new address in the secret `SUPABASE_DB_URL` (Setup, steps 4 to 6).
7. Add the addresses of the game to the sign-in allow list of the new project (docs/RELEASE.md, "The test build").
8. Delete `slam.dump`.

## What was tried, and what was not

- Tried on November 27, 2026, with PostgreSQL 16 on the build machine and a small made-up database: the backup script, the stop when a secret is not set, the stop when the passphrase is short, the stop when the address is not correct, the decrypt, the restore into a scratch database, and the refusal of an incorrect passphrase.
- Not tried: the workflow on GitHub (it needs the two secrets), and a dump of the real database (version 17).
- If GitHub shows no backup run for more than 8 days, open the Actions tab. GitHub stops a schedule after 60 days with no change in the repository. Click **Enable workflow** to start it again.
