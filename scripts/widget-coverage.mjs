#!/usr/bin/env node
/** Widget coverage: which widgets do the worked examples exercise, and how often?
 *
 * A widget is the versioned contract; a node is one instance of it in a workflow; a
 * workflow step is one execution. This script counts nodes per widget across the shipped
 * examples and the frozen fixtures, because a widget no example instantiates is a widget
 * whose composition with the rest has never been demonstrated. It reports gaps; it does
 * not fail a build, since a deliberate gap is a legitimate state to record. */
import {readFile,readdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const skipped=[];
const load=async name=>{
  try{return await import(pathToFileURL(new URL(`../build/${name}`,import.meta.url).pathname).href);}
  catch(error){skipped.push(`${name} (${error.code||'load failed'})`);return null;}
};
const registry=JSON.parse(await readFile(new URL('../widgets/registry.json',import.meta.url),'utf8'));
const widgets=registry.widgets.map(w=>w.nodeType);

const [core,snow,geo,raster,naledi,study,coverage,sealevel]=await Promise.all(
  ['core.js','john-snow.js','geoprivacy-example.js','raster-example.js','old-naledi.js','study-area.js','spatial-coverage.js',
   'sea-level-example.js'].map(load));

const examples=[];
const add=(name,build)=>{try{const w=build();if(w?.nodes)examples.push([name,w]);}catch(error){skipped.push(`${name} (${error.message})`);}};
if(core)add('heat (demo 01)',()=>core.exampleWorkflow());
if(naledi)add('old-naledi',()=>naledi.oldNalediWorkflow());
if(study)add('blank / study area',()=>study.blankWorkflow());
if(coverage)add('spatial coverage',()=>coverage.coverageExercise());
if(raster)add('raster clipping',()=>raster.rasterExample());
else{
  // Not every example module is a build entry point; raster-example is bundled into app.
  // Scan its source for node-type literals rather than report a gap we can resolve.
  const src=await readFile(new URL('../src/raster-example.ts',import.meta.url),'utf8');
  const nodes=[...src.matchAll(/type:'([a-z_]+)'/g)].map(m=>({type:m[1]}));
  if(nodes.length){
    examples.push(['raster clipping (source-scanned)',{nodes}]);
    skipped.splice(skipped.findIndex(s=>s.startsWith('raster-example.js')),1);
  }
}
if(sealevel)add('manila sea-level',()=>sealevel.seaLevelExample());
if(snow){add('snow-voronoi',()=>snow.johnSnowExample('snow-voronoi'));add('snow-isochrone',()=>snow.johnSnowExample('snow-isochrone'));}
if(geo)add('snow-geoprivacy',()=>geo.geoprivacyExample());

// CURATED EXAMPLES THAT LIVE IN THEIR OWN REPOSITORIES COUNT TOO, and until 2026-10-26 they did
// not. `widgets/examples.json` pins them by commit and digest, and this script read only the
// examples bundled into the build -- so South London, which is the ONLY example exercising
// join_table_to_area, rate and rate_ratio, reported all three as "never instantiated by any
// example". D10 is the criterion that asks whether some example instantiates a widget, and
// AGENTS.md names this script as the instrument for it, so the instrument was blind to the place
// the answer lived. Found by writing a lab check for rate_ratio and meeting the false zero.
//
// Read where checked out, reported where not: an example that is not beside this repository
// cannot be counted, and saying so is different from counting it absent.
const catalog=JSON.parse(await readFile(new URL('../widgets/examples.json',import.meta.url),'utf8'));
for(const example of catalog.examples??[]){
  const folder=(example.repository??'').split('/').filter(Boolean).pop();
  const bundle=(example.files??[]).find(f=>f.path.endsWith('.json.gz'));
  if(!folder||!bundle){skipped.push(`${example.id} (no bundle pinned)`);continue;}
  const path=new URL(`../../${folder}/${bundle.path}`,import.meta.url);
  let raw;
  try{raw=await readFile(path);}
  catch{skipped.push(`${example.title??example.id} (${folder} not checked out beside this repository)`);continue;}
  try{
    const {gunzipSync}=await import('node:zlib');
    const doc=JSON.parse(gunzipSync(raw).toString());
    for(const w of doc.workflows??[])
      if(w.document?.nodes)examples.push([`${folder}/${w.key.split('/').pop()}`,w.document]);
  }catch(error){skipped.push(`${example.id} (${error.message})`);}
}

// Frozen fixtures are worked examples too: they are what the browser suite replays.
// Except the ones whose whole purpose is to hold something invalid. A fixture that
// deliberately carries a removed widget is a test of what happens when a workflow
// outlives a widget, not a demonstration of anything, and counting it reports a
// missing registry entry that is the point of the fixture.
const DELIBERATELY_BROKEN=/^removed-widget-/;
const dir=new URL('../tests/fixtures/',import.meta.url);
for(const file of (await readdir(dir)).filter(f=>f.endsWith('.json')&&!DELIBERATELY_BROKEN.test(f))){
  const doc=JSON.parse(await readFile(new URL(file,dir),'utf8'));
  const w=doc?.nodes?doc:doc?.workflow?.nodes?doc.workflow:null;
  if(w)examples.push([`fixture: ${file.replace(/\.json$/,'')}`,w]);
}

const counts=new Map(widgets.map(w=>[w,0])),unknown=new Map(),perExample=[];
for(const [name,w] of examples){
  const local=new Map();
  for(const n of w.nodes||[]){
    const t=n.type;
    if(counts.has(t))counts.set(t,counts.get(t)+1); else unknown.set(t,(unknown.get(t)||0)+1);
    local.set(t,(local.get(t)||0)+1);
  }
  perExample.push([name,w.nodes?.length||0,local]);
}

console.log(`widget coverage over ${examples.length} worked examples and fixtures\n`);
console.log('example                            nodes  distinct widgets');
for(const [name,n,local] of perExample)
  console.log(`  ${name.padEnd(32)}${String(n).padStart(5)}${String(local.size).padStart(18)}`);

const used=[...counts].filter(([,c])=>c>0).sort((a,b)=>b[1]-a[1]);
const unused=[...counts].filter(([,c])=>c===0).map(([w])=>w).sort();
console.log(`\nexercised: ${used.length} of ${widgets.length} widgets`);
console.log('most instantiated: '+used.slice(0,8).map(([w,c])=>`${w} ${c}`).join(', '));
console.log(`\nnever instantiated by any example (${unused.length}):`);
for(const w of unused)console.log('  -',w);
if(skipped.length){
  console.log(`\nNOT MEASURED — these sources did not load, so the counts above are a floor, not a total:`);
  for(const s of skipped)console.log('  -',s);
  console.log('  Run `npm run build` and re-run; a widget listed as never instantiated may be used by a skipped example.');
}
if(unknown.size)console.log('\nnode types used by an example but absent from the registry:\n  '+[...unknown.keys()].join(', '));
