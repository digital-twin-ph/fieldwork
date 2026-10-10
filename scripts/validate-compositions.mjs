// Every composition in compositions/ validates against the live registry, and its drift
// against that registry is reported. A composition is governed by closure over its
// members, so this runs in the gate beside validate:widgets rather than on request.
import {readFile,readdir} from 'node:fs/promises';
import {validateComposition,detectDrift,openInputs} from '../build/compositions.js';

const registry=JSON.parse(await readFile('widgets/registry.json','utf8'));
const dirs=await readdir('compositions',{withFileTypes:true});
let checked=0,drifted=0;
const problems=[];
for(const dir of dirs.filter(d=>d.isDirectory())){
  for(const file of (await readdir(`compositions/${dir.name}`)).filter(f=>f.endsWith('.json'))){
    const path=`compositions/${dir.name}/${file}`;
    const composition=JSON.parse(await readFile(path,'utf8'));
    if(composition.nodeType!==dir.name)problems.push(`${path}: lives in ${dir.name} but is named ${composition.nodeType}`);
    if(!file.startsWith(composition.version))problems.push(`${path}: declares version ${composition.version}`);
    try{validateComposition(composition,registry);}catch(error){problems.push(`${path}: ${error.message}`);continue;}
    checked++;
    const drift=detectDrift(composition,registry).filter(d=>d.state!=='unchanged');
    for(const member of drift){drifted++;console.log(`  drift: ${composition.nodeType} ${composition.version} · ${member.node} ${member.state} — ${member.detail}`);}
    console.log(`  ${composition.nodeType} ${composition.version}: ${composition.members.length} members, `
      +`${openInputs(composition).length} open inputs behind ${composition.ports.inputs.length} ports, `
      +`${composition.parameters.length} public parameters, ${composition.governance.status}`);
  }
}
if(problems.length){for(const p of problems)console.error(`  ${p}`);
  throw new Error(`${problems.length} composition problem${problems.length===1?'':'s'}.`);}
console.log(`Compositions validated: ${checked}, with ${drifted} drifted member${drifted===1?'':'s'}.`);
