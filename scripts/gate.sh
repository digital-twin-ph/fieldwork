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
# Resolve in THIS tree: a bare "HEAD" inside the worktree would mean the worktree's own head,
# which is whatever the last gate left there.
sha=$(git -C "$here" rev-parse "${1:-HEAD}")

if [ ! -d "$tree/.git" ] && [ ! -f "$tree/.git" ]; then
  git -C "$here" worktree add --detach "$tree" "$sha"
  # Shared rather than installed: 230 MB and several minutes saved per setup, and the gate then
  # runs against exactly the dependencies developed against, which is what a landing check is for.
  ln -s "$here/node_modules" "$tree/node_modules"
else
  git -C "$tree" checkout --detach --force "$sha"
fi

echo "Gating $(git -C "$here" log --oneline -1 "$sha") in $tree on port $port"
cd "$tree"
FIELDWORK_TEST_PORT="$port" npm run check
