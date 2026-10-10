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
