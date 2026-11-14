/** EACH WORKED EXAMPLE'S WIDGETS AND WORKFLOWS, READ FROM ITS PINNED BUNDLE (2026-11-14; the practitioner, of the widget
 *  catalog's tally: "Can that tally be automated?"). `uses` and `workflowCount` in widgets/examples.json were typed by
 *  hand at each pin and checked by validate:examples; this writes them from the bundle at the pinned commit, read from the
 *  checkout beside this repository. An example with no checkout here is left as it is, and named.
 *
 *    node scripts/example-uses.mjs           say what would change
 *    node scripts/example-uses.mjs --write   write it */
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
const path=new URL('../widgets/examples.json',import.meta.url);
const raw=readFileSync(path,'utf8'),catalog=JSON.parse(raw),write=process.argv.includes('--write');
const changed=[],skipped=[];
for(const example of catalog.examples){
  const name=example.repository.split('/').pop(),checkout=new URL(`../../${name}/`,import.meta.url).pathname;
  const bundle=example.files?.find(f=>f.path.endsWith('fieldwork-project.json.gz'))?.path;
  if(!bundle){continue;}
  if(!existsSync(checkout)){skipped.push(name);continue;}
  let doc;
  try{doc=JSON.parse(gunzipSync(execFileSync('git',['-C',checkout,'show',`${example.commit}:${bundle}`],{maxBuffer:1<<30})));}
  catch(error){skipped.push(`${name} (${error.message.split('\n')[0]})`);continue;}
  const uses=[...new Set((doc.workflows??[]).flatMap(w=>((w.document?.workflow??w.document)?.nodes??[]).map(n=>n.type)))].sort();
  const workflowCount=(doc.workflows??[]).length;
  if(JSON.stringify(uses)!==JSON.stringify([...(example.uses??[])].sort())||workflowCount!==example.workflowCount){
    changed.push(`${name}: ${workflowCount} workflows; ${uses.join(', ')}`);
    example.uses=uses;example.workflowCount=workflowCount;
  }
}
if(write&&changed.length)writeFileSync(path,JSON.stringify(catalog,null,2)+(raw.endsWith('\n')?'\n':''));
console.log(changed.length?`${write?'Wrote':'Would write'}:\n  ${changed.join('\n  ')}`:'Every pinned example\'s uses and workflow count already match its bundle.');
if(skipped.length)console.log(`Not read, no checkout or no bundle at the pinned commit: ${skipped.join(', ')}`);
