// Installs a pre-push hook that runs the fast half of the gate.
//
// Measured 2026-10-14: the browser suite is 9.1 minutes of a 9.8-minute gate -- 93% -- and
// everything else (build, typecheck, 15 validators, 490 unit tests) finishes in about 45 seconds.
// So the cheap half can run on every push and the expensive half stays in CI, where two engines
// exist. Three of the seven CI failures that day were things this hook would have caught before
// the push: a validator with no escape hatch for the runner, and a date stamp set to tomorrow.
//
// Not installed automatically. A repository that writes to .git/hooks on `npm install` is doing
// something to a developer's machine they did not ask for; this is a command they run.
import {writeFileSync,chmodSync,existsSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const dir=join(root,'.git/hooks');
const hook=join(dir,'pre-push');

const script=`#!/bin/sh
# Installed by scripts/install-hooks.mjs. Remove this file to stop it.
#
# The fast half of the gate: build, typecheck, validators, unit tests. About 45 seconds.
# The browser suite is NOT here -- it needs two engines and takes nine minutes, and Linux WebKit
# exists only in CI, where it has caught two defects that do not reproduce on a developer's
# machine. This hook is a filter, not a replacement for that.
#
# To push anyway, when you know why: git push --no-verify
echo "pre-push: running npm run check:fast"
if ! npm run --silent check:fast; then
  echo ""
  echo "pre-push: the fast gate failed, so nothing was pushed."
  echo "          Fix it, or push with --no-verify if you know why it fails."
  exit 1
fi
`;

if(!existsSync(dir))mkdirSync(dir,{recursive:true});
writeFileSync(hook,script);
chmodSync(hook,0o755);
console.log('Installed .git/hooks/pre-push — runs `npm run check:fast` before every push.');
console.log('Remove it with: rm .git/hooks/pre-push');
