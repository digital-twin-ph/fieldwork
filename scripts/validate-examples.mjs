#!/usr/bin/env node
/** Whether the worked-example pin in `widgets/examples.json` describes the bytes on disk.
 *
 * A worked example lives in its own repository because a repository boundary is a LICENCE
 * boundary -- Fieldwork is Apache-2.0 and cannot carry data it may not transform, and South
 * London redistributes one BSD-2-Clause boundary file. Experiment 127 settled that and it is not
 * in question here. What was missing is the other half: the practitioner, 2026-10-26, *"Consider
 * that repo a worked example repo so let's manage it as an integral part of fieldwork."* Separate
 * in location, integral in lifecycle -- and nothing checked the join between the two.
 *
 * WRITTEN FOR THE CLASS, not for one repository: the practitioner widened it the same day --
 * *"from here on all worked example repos, like a new one I just created for nigeria
 * immunization."* So this walks the catalogue for anything carrying a commit and a file list
 * rather than naming a repository, and a second example is covered by arriving in
 * `widgets/examples.json`. Nothing here needs editing for it.
 *
 * Both of 2026-10-26's example failures were that join going unchecked, and neither was reachable
 * by any existing validator:
 *
 *   1. Re-pinning to a new commit updated every `sha256` and no `bytes`. The application refuses
 *      on size BEFORE it hashes -- "a size that disagrees is already a different file" -- so eight
 *      browser tests failed identically on both engines, 29 minutes into a gate, for a mismatch
 *      visible in a byte comparison.
 *   2. The pinned commit existed only on the author's laptop. Every local test passed, because
 *      the tests read the sibling checkout by relative path; the deployed application fetches that
 *      commit from GitHub and would have 404ed in front of an audience.
 *
 * So this checks three things that are all free and all local:
 *
 *   - each pinned file's `bytes` and `sha256` against the file in the sibling checkout;
 *   - the pinned commit against that checkout's HEAD, because a pin to anything else means the
 *     catalogue and the tests disagree about which bytes are under test;
 *   - whether the pinned commit has been PUSHED, read from the remote-tracking ref rather than
 *     the network, so it stays deterministic offline. This is the only soft one: a pin that is
 *     correct but unpushed is a release blocker and not a build error, so it reports loudly and
 *     exits 0 unless `--released` is passed.
 *
 * A missing sibling checkout is NOT a failure. The repository is optional -- a contributor who
 * has not cloned it is not broken -- and it is reported as unchecked, which is the honest state.
 *
 * Usage: node scripts/validate-examples.mjs [--released]
 */
import {readFileSync,existsSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';

const root=new URL('..',import.meta.url).pathname.replace(/\/$/,'');
const catalog=JSON.parse(readFileSync(join(root,'widgets/examples.json'),'utf8'));
const released=process.argv.includes('--released');
const problems=[],blockers=[],unchecked=[];
let filesChecked=0,examples=0;

/** Every entry carrying a commit and a file list, wherever the schema puts it. Walked rather than
 *  reached by a fixed path, so a nested catalogue shape does not silently check nothing. */
function*pinned(node){
  if(Array.isArray(node)){for(const item of node)yield*pinned(item);return;}
  if(node&&typeof node==='object'){
    if(typeof node.commit==='string'&&Array.isArray(node.files))yield node;
    for(const value of Object.values(node))yield*pinned(value);
  }
}

const git=(cwd,args)=>execFileSync('git',['-C',cwd,...args],{encoding:'utf8'}).trim();

for(const example of pinned(catalog)){
  examples++;
  const name=(example.repository||example.key||'example').split('/').pop();
  // The sibling checkout, where the browser tests read it from.
  const checkout=join(root,'..',name);
  if(!existsSync(checkout)){unchecked.push(`${name}: no checkout at ../${name}`);continue;}

  for(const file of example.files){
    const path=join(checkout,file.path);
    if(!existsSync(path)){problems.push(`${name}: pins ${file.path}, which is not in the checkout.`);continue;}
    filesChecked++;
    const bytes=statSync(path).size;
    const sha256=createHash('sha256').update(readFileSync(path)).digest('hex');
    // BOTH, and reported together. The size is what the application checks first and is the one
    // that was stale; a digest-only check would have passed on 2026-10-26 and shipped the defect.
    if(file.bytes!==undefined&&file.bytes!==bytes)
      problems.push(`${name}: ${file.path} is ${bytes} bytes and the catalogue pins ${file.bytes}. `
        +'The application refuses on size before it hashes, so this fails in the browser and '
        +'nowhere else.');
    if(file.sha256&&file.sha256!==sha256)
      problems.push(`${name}: ${file.path} hashes to ${sha256.slice(0,12)}… and the catalogue pins `
        +`${file.sha256.slice(0,12)}….`);
  }

  // THE DECLARED NODE TYPES, against the bundle that is pinned.
  //
  // `widgets/evidence.json` counts example use, and until 2026-10-27 it counted only the examples
  // COMPILED INTO the application -- so every widget the South London bundle exercises read as
  // used by nothing. `join_table_to_area` sat at "declared only" while the pinned bundle shipped a
  // working choropleth built on it, which is the reverse of what that ledger is for.
  //
  // The fix cannot be "let the generator read the clone": a generated file whose contents depend
  // on what somebody happens to have cloned is not a measurement, and the gate would then disagree
  // between machines. So the catalogue DECLARES the node types and the generator reads the
  // declaration; this recomputes it from the bundle wherever the checkout exists, so the
  // declaration cannot drift from the bytes it describes.
  if(Array.isArray(example.uses)){
    const bundlePath=example.files.find(f=>f.path.endsWith('fieldwork-project.json.gz'))?.path;
    const full=bundlePath&&join(checkout,bundlePath);
    if(full&&existsSync(full)){
      let bundle;
      try{bundle=JSON.parse(gunzipSync(readFileSync(full)));}
      catch(error){problems.push(`${name}: ${bundlePath} could not be read as a gzipped project `
        +`document (${error.message}), so the declared node types could not be checked.`);bundle=null;}
      if(bundle){
        const found=[...new Set((bundle.workflows??[]).flatMap(w=>
          (w.document?.nodes??[]).map(n=>n.type)))].sort();
        const declared=[...example.uses].sort();
        const missing=found.filter(t=>!declared.includes(t));
        const phantom=declared.filter(t=>!found.includes(t));
        if(missing.length||phantom.length)
          problems.push(`${name}: the catalogue's "uses" does not match the pinned bundle. `
            +`${missing.length?`The bundle instantiates ${missing.join(', ')} and the catalogue does not list `
              +`${missing.length===1?'it':'them'}. `:''}`
            +`${phantom.length?`The catalogue lists ${phantom.join(', ')} and the bundle instantiates `
              +`${phantom.length===1?'it':'them'} nowhere. `:''}`
            +'widgets/evidence.json counts example use from this list, so a wrong entry here is a '
            +'wrong claim about which widgets have evidence.');
        const workflows=(bundle.workflows??[]).length;
        if(example.workflowCount!==undefined&&example.workflowCount!==workflows)
          problems.push(`${name}: the catalogue says ${example.workflowCount} workflows and the `
            +`pinned bundle carries ${workflows}.`);
      }
    }
  }

  let head;
  try{head=git(checkout,['rev-parse','HEAD']);}
  catch{unchecked.push(`${name}: ../${name} is not a git checkout`);continue;}
  if(head!==example.commit)
    problems.push(`${name}: the catalogue pins ${example.commit.slice(0,7)} and ../${name} is at `
      +`${head.slice(0,7)}. The browser tests read the checkout and the deployed application fetches `
      +'the pin, so these disagreeing means the two test different bytes.');

  // PUSHED, read locally. `git ls-remote` would need the network, and this project does not make
  // a validator depend on it -- validate:packs already does and is the one check that fails
  // offline. The remote-tracking ref answers the same question as of the last fetch.
  let pushed=null;
  try{
    const upstream=git(checkout,['rev-parse','--abbrev-ref','--symbolic-full-name','@{u}']);
    try{git(checkout,['merge-base','--is-ancestor',example.commit,upstream]);pushed=true;}
    catch{pushed=false;}
  }catch{unchecked.push(`${name}: no upstream branch, so nothing says where it publishes`);}
  if(pushed===false){
    const line=`${name}: ${example.commit.slice(0,7)} is not an ancestor of its upstream, so it has `
      +'not been pushed. Every local test passes on the checkout; the deployed application fetches '
      +'the commit and will not find it. Push before the pin is released.';
    (released?problems:blockers).push(line);
  }
}

console.log(`Worked examples: ${examples} pinned, ${filesChecked} file digests and sizes verified`
  +(unchecked.length?`, ${unchecked.length} unchecked`:'')+'.');
for(const line of unchecked)console.log(`  unchecked — ${line}`);
for(const line of blockers)console.log(`\n  NOT YET PUSHED — ${line}`);
if(problems.length){console.error('\n'+problems.join('\n\n'));process.exit(1);}
