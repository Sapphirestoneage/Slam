#!/usr/bin/env bash
# Backup: one encrypted copy of the database of the game (Supabase), made by .github/workflows/backup.yml.
#
# USAGE    SUPABASE_DB_URL=... BACKUP_PASSPHRASE=... bash tools/backup.sh <folder for the encrypted file>
# DOES     1. Stops with a plain line when one of the two secrets is not set, or the passphrase is short.
#          2. Stops when the database is a newer major version than the pg_dump of this machine.
#          3. Runs pg_dump (the schemas public and auth) and sends its output straight into gpg, so a copy that
#             is not encrypted is never written to a disk.
#          4. Reads the encrypted file back (decrypts it in memory and lists its content) to prove it opens.
# NEVER    Prints a secret, writes a plain dump to a file, or puts anything in the repository.
# OUTPUT   The last line: "backup is <file> (<size> bytes, <n> tables with rows)" or "no backup: <why>".
# SEE      RESTORE.md (how to open and restore a backup).
set -u -o pipefail

OUT="${1:-}"
stop() {
  echo "no backup: $1"
  exit 1
}

[ -n "$OUT" ] || stop "name a folder for the encrypted file"
[ -n "${SUPABASE_DB_URL:-}" ] || stop "the secret SUPABASE_DB_URL is not set (RESTORE.md, Setup, step 2)"
[ -n "${BACKUP_PASSPHRASE:-}" ] || stop "the secret BACKUP_PASSPHRASE is not set (RESTORE.md, Setup, step 3)"
# The repository is public, so each person with a GitHub account can download the encrypted file.
# The passphrase is the only lock. A short one can be guessed by a machine.
[ "${#BACKUP_PASSPHRASE}" -ge 20 ] || stop "the secret BACKUP_PASSPHRASE has fewer than 20 characters (RESTORE.md, Setup, step 3)"
for tool in pg_dump pg_restore psql gpg; do
  command -v "$tool" >/dev/null 2>&1 || stop "the tool $tool is not on this machine"
done
mkdir -p "$OUT" || stop "the folder $OUT cannot be made"

# pg_dump must be the same major version as the database, or newer.
SERVER="$(psql "$SUPABASE_DB_URL" --no-psqlrc --tuples-only --no-align --command 'show server_version_num' 2>/dev/null)" ||
  stop "the database did not answer. Check the secret SUPABASE_DB_URL (RESTORE.md, Setup, step 2)"
SERVER_MAJOR=$((SERVER / 10000))
TOOL_MAJOR="$(pg_dump --version | sed -E 's/.* ([0-9]+)\.[0-9]+.*/\1/')"
[ "$TOOL_MAJOR" -ge "$SERVER_MAJOR" ] ||
  stop "the database is PostgreSQL $SERVER_MAJOR and pg_dump is $TOOL_MAJOR. Set PG_MAJOR in .github/workflows/backup.yml to $SERVER_MAJOR"

FILE="$OUT/slam-backup-$(date -u +%Y-%m-%d-%H%M).dump.gpg"
ERR="$(mktemp)"
trap 'rm -f "$ERR"' EXIT

# The passphrase goes to gpg on its own channel (number 3), never on the command line.
pg_dump "$SUPABASE_DB_URL" --format=custom --no-owner --schema=public --schema=auth 2>"$ERR" |
  gpg --batch --yes --quiet --pinentry-mode loopback --passphrase-fd 3 --symmetric --cipher-algo AES256 \
    --output "$FILE" 3< <(printf "%s" "$BACKUP_PASSPHRASE")
if [ $? -ne 0 ] || [ ! -s "$FILE" ]; then
  rm -f "$FILE"
  # pg_dump can print the address of the database in its message: show the message without it.
  sed -E 's#postgres(ql)?://[^ ]+#(the database address)#g' "$ERR" | tail -n 5
  stop "pg_dump or gpg stopped (the lines above say why). No file was kept"
fi

# Proof that the file opens with the passphrase and holds a database: list its content, in memory.
TABLES="$(gpg --batch --quiet --pinentry-mode loopback --passphrase-fd 3 --decrypt "$FILE" 3< <(printf "%s" "$BACKUP_PASSPHRASE") 2>/dev/null |
  pg_restore --list 2>/dev/null | grep -c ' TABLE DATA ')"
if [ "${TABLES:-0}" -lt 1 ]; then
  rm -f "$FILE"
  stop "the encrypted file did not open again, or it holds no table. No file was kept"
fi

echo "backup is $FILE ($(wc -c <"$FILE" | tr -d ' ') bytes, $TABLES tables with rows)"
