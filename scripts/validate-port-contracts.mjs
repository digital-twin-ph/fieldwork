// The published port contracts must match the behaviour they describe, and TYPES.inputs must not
// understate what a widget accepts.
//
// Two different rots. The ledger goes stale when nodeInputs grows a branch nobody added a variant
// for, so a contract exists that nothing records. And TYPES.inputs -- the list a reader meets
// first -- is a union that was already missing 13 widget/port pairs used by the shipped examples.
// Experiment 112.
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {document_,contracts} from './port-contracts.mjs';
import {TYPES} from '../build/core.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const path=join(root,'widgets/port-contracts.json');
const problems=[];

if(!existsSync(path))problems.push('widgets/port-contracts.json is missing. Run `npm run contracts:ports`.');
else{
  const held=JSON.parse(readFileSync(path,'utf8'));
  const fresh=document_();
  // `generatedAt` moves with the clock and says nothing about drift.
  if(JSON.stringify(held.widgets)!==JSON.stringify(fresh.widgets))
    problems.push('widgets/port-contracts.json has drifted from src/core.ts. Run `npm run contracts:ports`.');
}

// Every port any contract names must appear in TYPES.inputs, which is what the palette, the
// Inspector and every reader of the definition see. A port reachable only by configuring a node
// is a port nobody can discover.
const undeclared=[];
for(const [type,widget] of Object.entries(contracts())){
  if(widget.deferredTo)continue;
  const declared=new Set((TYPES[type]?.inputs??[]).map(([port])=>port));
  for(const contract of widget.contracts)
    for(const [port] of [...contract.required,...contract.optional])
      if(!declared.has(port))undeclared.push(`${type}.${port}`);
}

const ledger=JSON.parse(readFileSync(join(root,'widgets/undeclared-ports.json'),'utf8'));
const unique=[...new Set(undeclared)].sort();
if(unique.length>ledger.ceiling)
  problems.push(`${unique.length} widget/port pairs are reachable but absent from TYPES.inputs, against a ceiling of ${ledger.ceiling}: ${unique.join(', ')}. Declare the port, or lower the ceiling with a reason.`);

console.log(`Port contracts: ${Object.keys(contracts()).length} widgets described, ${unique.length} ports reachable but undeclared (ceiling ${ledger.ceiling}).`);
if(unique.length)console.log('  undeclared: '+unique.join(', '));
if(problems.length){console.error('');for(const p of problems)console.error('  • '+p);process.exit(1);}
