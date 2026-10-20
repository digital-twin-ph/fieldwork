import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';

// The label a widget is BORN with should say what the widget is. The practitioner, 2026-10-20:
// "let's also check that the default widget name says what it is as a widget -- example the Map
// widget default is not Map, it's Study area and points."
//
// It was the heat example's label, baked in as every Map's starting name. The same leak as
// `facilities` naming one demonstration and `alert` baking in "heat": an example's specifics
// becoming the general thing's identity. A practitioner who adds a Map to a cholera workflow
// should not be told it is a study area and points.
const sources=readdirSync(new URL('../src/',import.meta.url)).filter(f=>f.endsWith('.ts'))
  .map(f=>readFileSync(new URL(`../src/${f}`,import.meta.url),'utf8')).join('\n');

const titles=new Map();
for(const m of sources.matchAll(/\b([a-z_0-9]+):\s*\{title:'([^']*)'/g))
  if(!titles.has(m[1]))titles.set(m[1],m[2]);

const defaults=new Map();
const add=(type,label)=>{if(titles.has(type))(defaults.get(type)??defaults.set(type,new Set()).get(type)).add(label);};
for(const m of sources.matchAll(/type:'([a-z_0-9]+)'\s*,\s*params:\{label:'([^']*)'/g))add(m[1],m[2]);
for(const m of sources.matchAll(/type==='([a-z_0-9]+)'\?\{type:'[a-z_0-9]+' as const,params:\{label:'([^']*)'/g))add(m[1],m[2]);

// A template may label its own node anything -- "250 death locations (489 deaths)" is a good label
// for one example's input. This checks the DEFAULT a freshly added node carries, which is the one
// in the constructor or the palette's add path.
const CONSTRUCTED=['map_output','table_output','chart_output','point_input','study_area',
  'coverage_check','measure_area','compare_point_sets','summarize_hull','stack_polygons','buffer_area'];

test('a freshly added widget is named after the widget, not after one example',()=>{
  const wrong=[];
  for(const type of CONSTRUCTED){
    const title=titles.get(type);if(!title)continue;
    const labels=[...(defaults.get(type)??[])];
    if(!labels.length)continue;
    // Shares a word with its own title, matched on a four-character stem, or on the whole title
    // when it is shorter -- "Map" is three letters, which is how this slipped through the first
    // sweep of it.
    const stems=(title.match(/[A-Za-z]{4,}/g)??[title]).map(w=>w.slice(0,4).toLowerCase());
    const names=labels.some(l=>stems.some(st=>l.toLowerCase().includes(st)));
    if(!names)wrong.push(`${type}: titled "${title}", default label ${labels.map(l=>`"${l}"`).join(' / ')}`);
  }
  assert.deepEqual(wrong,[],`these defaults name something other than their widget:\n  ${wrong.join('\n  ')}`);
});

test('the Map default is the one that prompted this',()=>{
  assert.ok([...(defaults.get('map_output')??[])].includes('Map'),
    'a Map added to any workflow starts life called Map');
});
