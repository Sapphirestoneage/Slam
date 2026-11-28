#!/usr/bin/env bash
# Promote: publish "main" to the public site (the branch "release"), in two stages, only when both suites pass.
#
# USAGE    bash tools/promote.sh [--next] [remote]   (remote: a name or a path; the default is "origin")
#          --next: stage 1 only. The test build at /game-next/ is renewed. /game/ and the rest stay as they are.
# DOES     1. Reads where main and release are on the remote.
#          2. STAGE 1, the test build: puts the folder game/ of main on release as game-next/. Nothing else on
#             release changes. The page there shows the banner "TEST BUILD" (game/features/testbuild.js).
#          3. Checks out that exact main commit in a temporary folder (a git worktree), so the folder this
#             script is started from, and any work not yet committed in it, plays no part and is not touched.
#          4. Runs `node --test` and `npm run test:game` there (the math checks are test/mathchecks.test.js).
#          5. STAGE 2, only when both pass: release gets the files of main, so /game/ is now what /game-next/
#             was. game-next/ stays, with the same build.
# HOW      release is a branch that this script builds. Each stage is one new commit on top of release (a plain
#          push, never forced). The commit of stage 2 has main as its second parent.
# NEVER    Forces or rewrites. When a suite does not pass, /game/ and the rest of the public site stay as they
#          were, and the script ends with a code that is not 0. The test build stays at /game-next/.
# OUTPUT   The last line says what happened:
#            "release is now <sha of main>"
#            "release is already at main (<sha>): nothing to promote"
#            "game-next is now <sha of main>: the test build only, /game/ is as it was"   (with --next)
#            "not promoted: <why>"
# SEE      docs/RELEASE.md. The decision logic is tested in test/promote.test.js with a local remote.
set -u

NEXT_ONLY=0
if [ "${1:-}" = "--next" ]; then
  NEXT_ONLY=1
  shift
fi
REMOTE="${1:-origin}"
NEXT="game-next"
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

# Get the commits themselves. Nothing local is changed by this: no branch, no working file.
git fetch --quiet "$REMOTE" "refs/heads/$SRC" || stop "main could not be fetched from \"$REMOTE\""
if [ -n "$REL_SHA" ]; then
  git fetch --quiet "$REMOTE" "refs/heads/$DST" || stop "release could not be fetched from \"$REMOTE\""
fi
WORK="$(mktemp -d "${TMPDIR:-/tmp}/slam-promote.XXXXXX")" || stop "no temporary folder could be made"

# The files of a commit as one tree: all of $1 without game-next/ ("" = nothing), plus game/ of $2 as game-next/
# ("" = no game-next/). It works in an index file of its own: no working file and no branch is touched.
tree_of() {
  local idx="$WORK/index.$RANDOM$RANDOM" out
  out="$(
    export GIT_INDEX_FILE="$idx"
    if [ -n "$1" ]; then git read-tree "$1" || exit 1; else git read-tree --empty || exit 1; fi
    git rm -r -q --cached --ignore-unmatch "$NEXT" >/dev/null 2>&1
    if [ -n "$2" ] && git rev-parse -q --verify "$2:game" >/dev/null 2>&1; then
      git read-tree --prefix="$NEXT/" "$2:game" || exit 1
    fi
    git write-tree
  )" || return 1
  rm -f "$idx"
  printf '%s\n' "$out"
}
# One new commit on release ($1 = its tree, $2 = its message, the rest = its parents), and a plain push.
put() {
  local tree="$1" msg="$2" parents=() c
  shift 2
  for c in "$@"; do [ -n "$c" ] && parents+=(-p "$c"); done
  c="$(git commit-tree "$tree" "${parents[@]}" -m "$msg" 2>"$WORK/push.log")" || return 1
  git push --quiet "$REMOTE" "$c:refs/heads/$DST" >"$WORK/push.log" 2>&1 || return 1
  REL_SHA="$c"
}

# 2. What is public now? Two questions: are the files of release those of main, and is game-next/ the game of main?
MAIN_TREE="$(git rev-parse "$MAIN_SHA^{tree}")" || stop "main ($MAIN_SHA) cannot be read"
MAIN_GAME="$(git rev-parse -q --verify "$MAIN_SHA:game" 2>/dev/null || true)"
PUBLISHED=0
STAGED=0
if [ -n "$REL_SHA" ]; then
  REL_REST="$(tree_of "$REL_SHA" "")" || stop "release ($REL_SHA) cannot be read"
  [ "$REL_REST" = "$MAIN_TREE" ] && PUBLISHED=1
  REL_NEXT="$(git rev-parse -q --verify "$REL_SHA:$NEXT" 2>/dev/null || true)"
  [ "$REL_NEXT" = "$MAIN_GAME" ] && STAGED=1
fi
if [ "$PUBLISHED" = 1 ] && [ "$STAGED" = 1 ]; then
  echo "release is already at main ($MAIN_SHA): nothing to promote"
  exit 0
fi

# STAGE 1. The test build: game/ of main as game-next/ on release. With no release yet there is no public site
# to keep as it is, so stage 2 makes the branch (with --next: the branch starts with the test build alone).
if [ "$STAGED" = 0 ] && { [ -n "$REL_SHA" ] || [ "$NEXT_ONLY" = 1 ]; }; then
  T="$(tree_of "$REL_SHA" "$MAIN_SHA")" || stop "the test build could not be made. Nothing was changed."
  put "$T" "Test build: game-next is main $MAIN_SHA" "$REL_SHA" || {
    sed 's/^/    /' "$WORK/push.log"
    stop "the push of the test build was refused (see the lines above). Nothing was changed."
  }
  echo "game-next is now $MAIN_SHA (the test build)"
fi
if [ "$NEXT_ONLY" = 1 ]; then
  echo "game-next is now $MAIN_SHA: the test build only, /game/ is as it was"
  exit 0
fi

# 3. A clean checkout of that exact commit, in a temporary folder.
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

run_suite "node --test" node --test || stop "node --test did not pass on main ($MAIN_SHA). /game/ and the rest of the public site are as they were."
run_suite "npm run test:game" npm run --silent test:game || stop "npm run test:game did not pass on main ($MAIN_SHA). /game/ and the rest of the public site are as they were."

# STAGE 2. Both passed: release gets the files of main, and game-next/ keeps the same build.
T="$(tree_of "$MAIN_SHA" "$MAIN_SHA")" || stop "the files of main could not be put together. /game/ is as it was."
put "$T" "Publish main $MAIN_SHA" "$REL_SHA" "$MAIN_SHA" || {
  sed 's/^/    /' "$WORK/push.log"
  stop "the push of release was refused (see the lines above). /game/ is as it was."
}
echo "release is now $MAIN_SHA"
exit 0
