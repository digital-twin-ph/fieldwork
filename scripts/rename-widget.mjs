// Applies a node-type rename across the widget ledgers AND regenerates every artifact derived from
// them, which together are the mechanical half of the migration the naming convention describes.
// The source edits and the RENAMED_NODE_TYPES entry are done by hand, because they need judgement;
// everything here is bookkeeping that was identical for `samples` and would have been retyped for
// each of the three that followed.
//
// Usage: node scripts/rename-widget.mjs <from> <to> "<why>"
import {readFileSync,writeFileSync,renameSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {emittedTerms,emitsFor} from './ontology-coupling.mjs';
import {sourceDefinitions} from './validate-widgets.mjs';

const [from,to,why]=process.argv.slice(2);
if(!from||!to||!why){console.error('Usage: node scripts/rename-widget.mjs <from> <to> "<why>"');process.exit(1);}
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const write=(p,d)=>writeFileSync(p,JSON.stringify(d,null,2)+'\n');
const bump=v=>{const [a,b,c]=v.split('.').map(Number);return `${a}.${b+1}.0`;};

// 1. the release folder keeps one directory per node type, so it moves with the name
if(existsSync(`widgets/releases/${from}`))renameSync(`widgets/releases/${from}`,`widgets/releases/${to}`);

// 2. a new release recording the rename, built from the one that was current
const registry=read('widgets/registry.json');
const entry=registry.widgets.find(w=>w.nodeType===from);
if(!entry)throw new Error(`No registry entry for ${from}`);
const current=entry.releases.find(r=>r.version===entry.currentVersion);
const base=read(current.path.replace(`releases/${from}/`,`releases/${to}/`));
const version=bump(entry.currentVersion);
// The title comes from the live definition, not from the release being copied: a rename usually
// changes the title too, and copying it produced "Widget title drift" on the first run.
const {definitions}=await sourceDefinitions();
if(!definitions[to])throw new Error(`src/core.ts has no definition for ${to}; rename the source first`);
const release={...base,nodeType:to,id:`urn:fieldwork:widget:${to}`,version,released:new Date().toISOString().slice(0,10),
  title:definitions[to].title,
  ports:{...base.ports,inputs:definitions[to].inputs.map(([name,type])=>({name,type})),output:definitions[to].output},
  configuration:{...base.configuration,typescriptType:`ParamsByType['${to}']`},
  changes:[{kind:'minor',description:
    `Renamed from \`${from}\` to \`${to}\`. The old identifier keeps resolving: a saved workflow `
    +`naming \`${from}\` is rewritten on open and stamped with sourceMigration, because the `
    +`operation is unchanged and a rename must not refuse work the way a retirement does. ${why} `
    +`No contract change: ports, output, parameters and behaviour are identical.`},...(base.changes??[])]};
const emits=emitsFor(await emittedTerms(),release.implementation.definition.replace(/^src\//,''));
release.ontology={...base.ontology,emits:{classes:emits.classes,properties:emits.properties}};
const path=`widgets/releases/${to}/${version}.json`;
write(path,release);

// 3. the registry entry: the new name, the archived one, and the moved paths
entry.nodeType=to;
entry.id=`urn:fieldwork:widget:${to}`;
entry.previousNodeTypes=[...new Set([...(entry.previousNodeTypes??[]),from])];
for(const r of entry.releases)r.path=r.path.replace(`releases/${from}/`,`releases/${to}/`);
entry.currentVersion=version;
entry.releases.push({version,path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')});
write('widgets/registry.json',registry);

// 4. every other ledger keyed by node type. Done on the JSON text so a nodeType field is rewritten
//    wherever it appears, and only where the whole value matches -- never a substring of prose.
for(const file of ['widgets/classification.json','widgets/evidence.json','widgets/check-coverage.json',
                   'widgets/standardization.json','widgets/parity.json']){
  if(!existsSync(file))continue;
  const before=readFileSync(file,'utf8');
  const after=before
    .replaceAll(`"nodeType": "${from}"`,`"nodeType": "${to}"`)
    .replaceAll(`"widget": "urn:fieldwork:widget:${from}"`,`"widget": "urn:fieldwork:widget:${to}"`)
    .replaceAll(`urn:fieldwork:widget:${from}:`,`urn:fieldwork:widget:${to}:`)
    .replaceAll(`"${from}"`,`"${to}"`);
  if(after!==before){write(file,JSON.parse(after));console.log(`  rewrote ${file}`);}
}

// 5. the naming ledger: the violations this rename clears, and the ceiling that can only fall
const naming=read('widgets/naming.json');
const cleared=naming.knownViolations.filter(v=>v.nodeType===from);
naming.knownViolations=naming.knownViolations.filter(v=>v.nodeType!==from);
naming.maxKnownViolations=naming.knownViolations.length;
write('widgets/naming.json',naming);

// 6. a review is of a name, and the name changed
const reviews=read('widgets/name-review.json');
const definition=read(path);
for(const r of reviews.reviews)if(r.nodeType===from){
  r.nodeType=to;r.title=definition.title;
  r.fingerprint=createHash('sha256').update(`${to}\n${definition.title}\n${r.group}`).digest('hex').slice(0,12);
  delete r.note;
}
write('widgets/name-review.json',reviews);

// 7. the DERIVED artifacts, regenerated rather than listed in a comment for someone to remember.
//
//  These are computed from the registry and the sources, so a rename invalidates every one of
//  them and none needs judgement. Two renames on 2026-10-19 failed the gate twice over exactly
//  this -- first `widgets/evidence.json`, then `ontology/widgets.ttl` -- and the other three were
//  only regenerated because the stale names were hunted by hand afterwards.
//
//  `widgets/evidence.json` is the one worth understanding. It is already in the step-4 loop above,
//  which rewrites `"nodeType": "<from>"` wherever it appears, so the script touched it, printed
//  that it had rewritten it, and left it SEMANTICALLY stale: the identifiers were patched and the
//  derived summary -- rungs, counts, most-used -- was not recomputed. A file that looks handled
//  and is not is worse than one the script never claimed.
const DERIVED=[
  ['scripts/widget-evidence.mjs','widgets/evidence.json'],
  ['scripts/widget-manual.mjs','ontology/widgets.ttl and widgets/manual-pages.json'],
  ['scripts/port-contracts.mjs','widgets/port-contracts.json'],
  ['scripts/release-notes.mjs','widgets/release-notes.json'],
  ['scripts/widget-names.mjs','docs/widget-names.md'],
];
for(const [script,target] of DERIVED){
  const result=spawnSync(process.execPath,[script,'--write'],{encoding:'utf8'});
  if(result.status!==0){
    console.error(`  could not regenerate ${target}: ${script} exited ${result.status}`);
    console.error(result.stderr?.trim()||result.stdout?.trim()||'(no output)');
    process.exitCode=1;
  } else console.log(`  regenerated ${target}`);
}

console.log(`${from} -> ${to}: release ${version}, ${cleared.length} naming violation(s) cleared, `
  +`ceiling now ${naming.maxKnownViolations}`);
