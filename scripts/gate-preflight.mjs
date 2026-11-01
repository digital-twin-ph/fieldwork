#!/usr/bin/env node
/** CAN THIS MACHINE RUN A BROWSER AT ALL? Asked before a gate spends anything.
 *
 *  On 2026-10-31 the desktop session logged out at 23:48 with a gate running. Every run after it
 *  reported 748 failures with no test executed, and that read as a broken suite for two more
 *  runs. The cause was the session and not the commit, so it is reported as the session. */
import {execFileSync} from 'node:child_process';
import {userInfo,platform} from 'node:os';
import {chromium,webkit,firefox} from '@playwright/test';

const refuse=message=>{console.error(`Gate not started: ${message}`);process.exit(1);};

if(platform()==='darwin'){
  const owner=execFileSync('stat',['-f','%Su','/dev/console'],{encoding:'utf8'}).trim();
  if(owner!==userInfo().username)
    refuse(`the desktop session belongs to "${owner}", not "${userInfo().username}", so no browser `
      +'can start. Log in at the Mac and run the gate again.');
}

const engines={chromium,webkit,firefox};
const names=(process.env.FIELDWORK_BROWSERS||'chromium,webkit').split(',').map(n=>n.trim()).filter(Boolean);
for(const name of names){
  if(!engines[name])refuse(`"${name}" is not a browser Playwright can run.`);
  try{await (await engines[name].launch()).close();}
  catch(error){refuse(`${name} would not launch, so no browser test could run. `
    +`${String(error).split('\n')[0]}`);}
}
console.log(`Preflight: ${names.join(', ')} launch.`);
