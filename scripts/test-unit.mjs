import {readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';

// Explicit discovery works on Windows too, without shell glob expansion.
const files=(await readdir(new URL('../tests/',import.meta.url)))
  .filter(name=>name.endsWith('.test.mjs')).sort().map(name=>`tests/${name}`);
if(!files.length)throw new Error('No unit regression tests found.');
const result=spawnSync(process.execPath,['--test',...files],{stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;
