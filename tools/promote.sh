#!/usr/bin/env bash
# Promote: move the public site (the branch "release") forward to "main", only when both test suites pass.
#
# USAGE    bash tools/promote.sh [remote]          (remote: a name or a path; the default is "origin")
# DOES     1. Reads where main and release are on the remote.
#          2. Checks out that exact main commit in a temporary folder (a git worktree), so the folder this
#             script is started from, and any work not yet committed in it, plays no part and is not touched.
#          3. Runs `node --test` and `npm run test:game` there.
#          4. Only when both pass: fast-forwards release to that commit and pushes it.
# NEVER    Forces, merges or rewrites. When release cannot be fast-forwarded, or a suite does not pass, it
#          changes nothing and ends with a code that is not 0.
# OUTPUT   The last line says what happened:
#            "release is now <sha>"
#            "release is already at main (<sha>): nothing to promote"
#            "not promoted: <why>"
# SEE      docs/RELEASE.md. The decision logic is tested in test/promote.test.js with a local remote.
set -u

REMOTE="${1:-origin}"
SRC="main"
DST="release"
HERE="$(cd "$(dirname "$0")/.." && pwd)"
WORK=""

cleanup() {
  if [ -n "$WORK" ] && [ -d "$WORK" ]; then
    git -C "$HERE" worktree remove --force "$WORK/site" >/dev/null 2>&1
    rm -rf "$WORK"
    git -C "$HERE" worktree prune >/dev/null 2>&1
  fi
}
trap cleanup EXIT

stop() {
  echo "not promoted: $1"
  exit 1
}

cd "$HERE" || stop "the repository folder $HERE cannot be opened"
git rev-parse --git-dir >/dev/null 2>&1 || stop "$HERE is not a git repository"

# A test run inside a test run does nothing in Node.js. This script may be started from a test.
unset NODE_TEST_CONTEXT

# 1. Where are main and release on the remote, right now?
REFS="$(git ls-remote "$REMOTE" "refs/heads/$SRC" "refs/heads/$DST" 2>/dev/null)" || stop "the remote \"$REMOTE\" cannot be reached"
MAIN_SHA="$(printf '%s\n' "$REFS" | awk -v r="refs/heads/$SRC" '$2 == r { print $1 }')"
REL_SHA="$(printf '%s\n' "$REFS" | awk -v r="refs/heads/$DST" '$2 == r { print $1 }')"
[ -n "$MAIN_SHA" ] || stop "the remote \"$REMOTE\" has no branch $SRC"

if [ "$MAIN_SHA" = "$REL_SHA" ]; then
  echo "release is already at main ($MAIN_SHA): nothing to promote"
  exit 0
fi

# Get the commits themselves. Nothing local is changed by this: no branch, no working file.
git fetch --quiet "$REMOTE" "refs/heads/$SRC" || stop "main could not be fetched from \"$REMOTE\""
if [ -n "$REL_SHA" ]; then
  git fetch --quiet "$REMOTE" "refs/heads/$DST" || stop "release could not be fetched from \"$REMOTE\""
  # 2. Fast-forward only: release must be an ancestor of main.
  git merge-base --is-ancestor "$REL_SHA" "$MAIN_SHA" ||
    stop "release ($REL_SHA) has commits that main ($MAIN_SHA) does not have, so it cannot be fast-forwarded. Nothing was changed."
fi

# 3. A clean checkout of that exact commit, in a temporary folder.
WORK="$(mktemp -d "${TMPDIR:-/tmp}/slam-promote.XXXXXX")" || stop "no temporary folder could be made"
git worktree add --quiet --detach "$WORK/site" "$MAIN_SHA" >/dev/null 2>&1 || stop "main ($MAIN_SHA) could not be checked out in a temporary folder"
# The optional packages (ExcelJS) are not in git. When the starting folder has them, the clean checkout uses them.
[ -d "$HERE/node_modules" ] && ln -s "$HERE/node_modules" "$WORK/site/node_modules"

run_suite() { # $1 = a name for the message, the rest = the command
  local name="$1"
  shift
  echo "Running $name on $MAIN_SHA ..."
  if (cd "$WORK/site" && "$@") >"$WORK/suite.log" 2>&1; then
    echo "  $name passed"
    return 0
  fi
  echo "  $name did not pass. The last lines of its output:"
  tail -n 40 "$WORK/suite.log" | sed 's/^/    /'
  return 1
}

run_suite "node --test" node --test || stop "node --test did not pass on main ($MAIN_SHA). Nothing was changed."
run_suite "npm run test:game" npm run --silent test:game || stop "npm run test:game did not pass on main ($MAIN_SHA). Nothing was changed."

# 4. Both passed. A plain push: git refuses it when it is not a fast-forward.
git push --quiet "$REMOTE" "$MAIN_SHA:refs/heads/$DST" >"$WORK/push.log" 2>&1 || {
  sed 's/^/    /' "$WORK/push.log"
  stop "the push of release was refused (see the lines above). Nothing was changed."
}
echo "release is now $MAIN_SHA"
exit 0
