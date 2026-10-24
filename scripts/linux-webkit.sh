#!/usr/bin/env bash
# Runs the browser suite on LINUX WebKit, which is the engine the gate runs on a runner and the one
# nobody can start on a Mac. Playwright's `webkit` on macOS is WKWebView; on Linux it is a
# different build, and until this script existed a Linux-only failure could only be read in a CI
# log and re-run by pushing again.
#
# WHAT IT DOES NOT DO: reproduce a slow runner. This machine is faster than a shared runner, so a
# test that fails there on a 15-second actionTimeout and takes 2 seconds here will pass here --
# including inside this container. That is what `--cpus` is for: FIELDWORK_DOCKER_CPUS constrains
# the container so the two causes can be told apart. A test that passes unconstrained and fails at
# one CPU with the same timeout is a resource failure, not an engine failure, and the fix belongs
# in the test rather than in the environment. See docs/experiments/135-linux-webkit-in-a-container.md.
#
# The host's node_modules is never touched: the repository is bind-mounted READ-ONLY and copied
# into the container, so `npm ci` installs Linux binaries inside the container and the macOS ones
# outside it stay where they are. The copy includes uncommitted work, because the point is to test
# a fix before pushing it.
set -euo pipefail

# Pinned by digest, on the same terms as widgets/examples.json: a tag is a moving ref and a browser
# build verified against one verifies nothing. The tag is kept beside it for legibility and the
# digest is what docker resolves.
IMAGE_TAG='mcr.microsoft.com/playwright:v1.64.0-noble'
IMAGE_DIGEST='sha256:06a9939e57531807f8d5fd76ce44b53165ffb7d7501d87ab10e285c20b1e971f'
IMAGE="mcr.microsoft.com/playwright@${IMAGE_DIGEST}"

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# The image ships the browser builds for exactly one Playwright version. Installing a different one
# from the lockfile leaves `npx playwright test` looking for a browser revision that is not in the
# image, which fails as a missing executable several minutes in. Checked here instead.
WANT="$(node -p "require('$REPO/node_modules/@playwright/test/package.json').version" 2>/dev/null || true)"
if [ -n "$WANT" ] && [ "v$WANT" != "${IMAGE_TAG#*:}" ] && [ "v$WANT-noble" != "${IMAGE_TAG#*:}" ]; then
  echo "This repository is on Playwright $WANT and the image is ${IMAGE_TAG#*:}." >&2
  echo "Update IMAGE_TAG and IMAGE_DIGEST in $0 together, by pulling the matching tag and reading" >&2
  echo "its RepoDigest -- the browser builds in the image must be the ones the lockfile asks for." >&2
  exit 2
fi

# Screenshots, traces and error context are the whole point of running this locally rather than
# reading a CI log, and the container is --rm, so they are written to a host directory instead of
# dying with it. test-results/ is already ignored by git.
OUT="$REPO/test-results/linux-webkit"
rm -rf "$OUT"; mkdir -p "$OUT"

LIMITS=()
if [ -n "${FIELDWORK_DOCKER_CPUS:-}" ]; then
  LIMITS+=("--cpus=${FIELDWORK_DOCKER_CPUS}")
  echo "Constrained to ${FIELDWORK_DOCKER_CPUS} CPU(s)."
fi
if [ -n "${FIELDWORK_DOCKER_MEMORY:-}" ]; then LIMITS+=("--memory=${FIELDWORK_DOCKER_MEMORY}"); fi

# --init so a browser that does not exit is reaped rather than left holding the container open.
# --ipc=host is Playwright's own guidance for Chromium, which shares memory across processes and
# runs out under Docker's default 64MB /dev/shm. WebKit does not need it; it is set because this
# script takes a browser list and FIELDWORK_BROWSERS=chromium is a legitimate thing to ask for.
exec docker run --rm -t --init --ipc=host "${LIMITS[@]}" \
  -v "$REPO:/src:ro" \
  -v "$OUT:/out" \
  -e "FIELDWORK_BROWSERS=${FIELDWORK_BROWSERS:-webkit}" \
  -e "CI=${CI:-1}" \
  "$IMAGE" bash -euo pipefail -c '
    mkdir -p /work
    tar -C /src --exclude=./node_modules --exclude=./.git --exclude=./test-results \
      --exclude=./playwright-report -cf - . | tar -C /work -xf -
    cd /work
    echo "node $(node --version) on $(uname -m) $(. /etc/os-release && echo "$PRETTY_NAME")"
    npm ci --no-audit --no-fund
    npm run build
    # --output puts the artifacts on the host mount. The junit file is copied rather than
    # redirected because its path comes from the config, which this script does not edit.
    status=0
    npx playwright test --output=/out/artifacts "$@" || status=$?
    cp -f test-results/browser-junit.xml /out/ 2>/dev/null || true
    exit $status
  ' -- "$@"
