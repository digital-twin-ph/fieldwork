#!/bin/sh
# Gate a commit in a worktree, so the main tree stays editable. See AGENTS.md,
# "Where a gate runs, and when to start one".
#
# Usage: scripts/gate.sh [ref]            # default HEAD
#        FIELDWORK_TEST_PORT=4185 scripts/gate.sh
set -eu
here=$(cd "$(dirname "$0")/.." && pwd)
tree="${FIELDWORK_GATE_TREE:-$here/../fieldwork-gate}"
port="${FIELDWORK_TEST_PORT:-4184}"
# CHROMIUM ONLY BY DEFAULT, the practitioner's decision of 2026-11-03: "it's slowing us down", and "I am testing
# on Chromium anyway not Safari". WebKit stays in CI's verify job, which runs both on every push. Name both to
# gate both: FIELDWORK_BROWSERS=chromium,webkit scripts/gate.sh
browsers="${FIELDWORK_BROWSERS:-chromium}"
# Resolve in THIS tree: a bare "HEAD" inside the worktree would mean the worktree's own head,
# which is whatever the last gate left there.
sha=$(git -C "$here" rev-parse "${1:-HEAD}")

# Before the worktree moves, so a machine that cannot run a browser costs seconds and no run.
(cd "$here" && FIELDWORK_BROWSERS="$browsers" node scripts/gate-preflight.mjs)

if [ ! -d "$tree/.git" ] && [ ! -f "$tree/.git" ]; then
  git -C "$here" worktree add --detach "$tree" "$sha"
  # Shared rather than installed: 230 MB and several minutes saved per setup, and the gate then
  # runs against exactly the dependencies developed against, which is what a landing check is for.
  ln -s "$here/node_modules" "$tree/node_modules"
else
  git -C "$tree" checkout --detach --force "$sha"
fi

echo "Gating $(git -C "$here" log --oneline -1 "$sha") in $tree on port $port, browsers: $browsers"
cd "$tree"
FIELDWORK_TEST_PORT="$port" FIELDWORK_BROWSERS="$browsers" npm run check
