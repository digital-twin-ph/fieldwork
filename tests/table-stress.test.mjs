/** STRESS TESTS OF THE TABLE OPERATIONS (TODO 1a, the practitioner, 2026-11-20: "We need to stress test all the table
 *  operations"). Made-up tables, each built around one trap — names, values, shape, keys, chains — run through every
 *  step that takes a table, in Node with the real reasoner. What each must do: finish; refuse in words, never with a
 *  programming error; never read a missing or unreadable value as zero; and say what a total hides. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInThisContext} from 'node:vm';
import {executeWorkflow,validateWorkflow} from '../build/core.js';
import {parseCSV} from '../build/input-data.js';
import {dataTable} from '../build/data-table.js';

globalThis.self=globalThis;
runInThisContext(readFileSync(new URL('../vendor/eye-21.1.24.js',import.meta.url),'utf8'),{filename:'eye.js'});
const reason=async input=>(await eyereasoner.n3reasoner(input,undefined,{outputType:'quads'}))
  .map(q=>({subject:q.subject.value,predicate:q.predicate.value,object:q.object.value}));

const H='id,infector,district,week,exposed,ill,cases';
/** Each table, and the trap it is built around. */
const TABLES={
  plain:[H,'1,,North,2026-01-05,yes,yes,4','2,1,North,2026-01-12,no,no,2','3,1,South,2026-01-05,yes,no,5','4,3,South,2026-01-12,no,yes,1'],
  // VALUES: empty cells, NA, an empty key.
  missing:[H,'1,,North,2026-01-05,yes,yes,','2,1,North,,no,,','3,1,South,2026-01-05,,no,NA','4,3,,2026-01-12,no,yes,1'],
  // VALUES: a trailing space, a decimal comma, a word, a negative.
  textnum:[H,'1,,North,2026-01-05,yes,yes,4 ','2,1,North,2026-01-12,no,no,"1,5"','3,1,South,2026-01-05,yes,no,five','4,3,South,2026-01-12,no,yes,-1'],
  // KEYS: a repeated row, a self-loop, a source not held, a name differing only in capitals and a space.
  dupkeys:[H,'1,,North,2026-01-05,yes,yes,4','1,,North,2026-01-05,yes,yes,4','3,3,South,2026-01-05,yes,no,5','4,9,south ,2026-01-12,no,yes,1'],
  // SHAPE: one row.
  oneRow:[H,'1,,North,2026-01-05,yes,yes,4'],
  // NAMES: accents, and a comma inside a quoted name.
  unicode:[H,'1,,Bas-Uélé,2026-01-05,oui,oui,4','2,1,Bas-Uélé,2026-01-12,non,non,2','3,1,Équateur,2026-01-05,oui,non,5','4,3,"Kasaï, Central",2026-01-12,non,oui,1'],
};
const table=name=>dataTable(parseCSV(TABLES[name].join('\n')),{keys:['id','infector','district','week','exposed','ill'],valueField:'cases'});

const STEPS={
  select_rows:{label:'Select',keyColumn:'district',values:['North']},
  group_table:{label:'Group',by:['district']},
  append_rows:{label:'Append'},
  relate_table:{label:'Relate',on:'district',bring:'cases'},
  transmission_chains:{label:'Chains',id:'id',parent:'infector'},
  two_by_two:{label:'Two by two',exposureColumn:'exposed',exposed:'yes',unexposed:'no',outcomeColumn:'ill',caseValue:'yes',nonCaseValue:'no',level:95},
  detect_unusual_counts:{label:'Detect',timeField:'week',method:'ears-c1'},
  regression:{label:'Regression',family:'poisson',outcome:'cases',exposure:{column:'exposed',as:'categorical'},adjust:[],errors:'profile'},
};
const PORTS={append_rows:['records','records_2'],relate_table:['records','related']};

async function run(name,type,params=STEPS[type]){
  const t=table(name);
  const w={schema:'fieldwork/workflow/1',name:'Stress',nodes:[
    {id:'src',type:'table_input',x:0,y:0,params:{label:'Made-up',keys:t.keys,valueField:'cases',data:t}},
    {id:'step',type,x:300,y:0,params},{id:'out',type:'table_output',x:600,y:0,params:{label:'Table'}}],
    edges:[...(PORTS[type]??['records']).map((port,i)=>({id:`e${i}`,from:'src',to:'step',port})),{id:'eo',from:'step',to:'out',port:'table'}]};
  return Promise.race([executeWorkflow(validateWorkflow(w),reason),
    new Promise((_,reject)=>setTimeout(()=>reject(new Error('HANG: no answer in 15 s')),15000))]);
}
const rowsOf=r=>(r.outputs.find(o=>o.nodeId==='out')?.table??r.outputs.find(o=>o.nodeId==='out'))?.rows??[];
const receiptOf=r=>r.receipts.find(x=>x.nodeId==='step');

test('every table step on every made-up table finishes, and a refusal is in words, not a programming error',async()=>{
  for(const name of Object.keys(TABLES))for(const type of Object.keys(STEPS)){
    try{await run(name,type);}
    catch(error){
      assert.ok(error instanceof Error,`${name} · ${type}: threw a non-error`);
      assert.doesNotMatch(error.message,/HANG|is not a function|undefined is not|Cannot read|of undefined|of null|NaN/,`${name} · ${type}: ${error.message}`);
      assert.ok(error.message.length>20,`${name} · ${type}: "${error.message}"`);
    }
  }
});

test('a missing or unreadable count is never read as zero: a total over one is unknown',async()=>{
  const missing=rowsOf(await run('missing','group_table'));
  assert.equal(missing.find(r=>r.key.district==='North').value,null);
  assert.equal(missing.find(r=>r.key.district==='South').value,null);
  const textnum=rowsOf(await run('textnum','group_table'));
  assert.equal(textnum.find(r=>r.key.district==='North').value,null,'"1,5" is unreadable, not 0');
  assert.equal(textnum.find(r=>r.key.district==='South').value,null,'"five" is unreadable, not 0');
  await assert.rejects(run('missing','two_by_two'),/empty\. An empty cell is unknown, not zero/);
});

test('what a total hides is said: a blank key, and names differing only in capitals or spaces',async()=>{
  const blank=receiptOf(await run('missing','group_table'));
  assert.match(blank.method,/1 row with a blank district, totalled as a group of its own/);
  const near=receiptOf(await run('dupkeys','group_table'));
  assert.match(near.method,/“South” and “south” differ only in capitals or spaces and were totalled apart/);
  assert.doesNotMatch(receiptOf(await run('plain','group_table')).method,/blank|capitals/);
});

test('Relate a column does not choose a key\'s readable value over its empty cell',async()=>{
  await assert.rejects(run('textnum','relate_table'),/gives "North" more than one "cases": "4" and an empty cell/);
});

test('a chain of table steps: select, then total, then relate back',async()=>{
  const t=table('plain');
  const w={schema:'fieldwork/workflow/1',name:'Chain',nodes:[
    {id:'src',type:'table_input',x:0,y:0,params:{label:'Made-up',keys:t.keys,valueField:'cases',data:t}},
    {id:'sel',type:'select_rows',x:200,y:0,params:{label:'Exposed',keyColumn:'exposed',values:['yes']}},
    {id:'grp',type:'group_table',x:400,y:0,params:{label:'By district',by:['district']}},
    {id:'rel',type:'relate_table',x:600,y:0,params:{label:'Beside',on:'district',bring:'cases'}},
    {id:'out',type:'table_output',x:800,y:0,params:{label:'Table'}}],
    edges:[{id:'a',from:'src',to:'sel',port:'records'},{id:'b',from:'sel',to:'grp',port:'records'},
      {id:'c',from:'src',to:'rel',port:'records'},{id:'d',from:'grp',to:'rel',port:'related'},{id:'e',from:'rel',to:'out',port:'table'}]};
  const r=await executeWorkflow(validateWorkflow(w),reason);
  const rows=rowsOf(r);
  assert.equal(rows.length,4);
  assert.deepEqual(rows.map(x=>x.key.cases),['4','4','5','5']);
});

// A STUDY AREA OF TWO UNITS, North and South, for Join a table to the study area.
const square=(x,y)=>[[[x,y],[x+1,y],[x+1,y+1],[x,y+1],[x,y]]];
const area={id:'area',type:'study_area',x:0,y:200,params:{label:'Two districts',source:'drawn',selectionMode:'polygon',
  geometry:{type:'MultiPolygon',coordinates:[square(30,0),square(31,0)]},
  boundary:{boundaryID:'TST-ADM1-1',unitID:'n s',unitName:'North, South',source:'test',licence:'CC BY 4.0',
    units:[{id:'n',name:'North'},{id:'s',name:'South'}]}}};
const MORE={
  chart_output:{label:'Chart',keyColumn:'district',chartTitle:'Cases by district'},
  join_table_to_area:{label:'Join',keyField:'district',normalisation:'fuzzy'},
};
async function runMore(name,type){
  const t=table(name);
  const nodes=[{id:'src',type:'table_input',x:0,y:0,params:{label:'Made-up',keys:t.keys,valueField:'cases',data:t}},
    {id:'grp',type:'group_table',x:200,y:0,params:{label:'By district',by:['district']}},
    {id:'step',type,x:400,y:0,params:MORE[type]}];
  const edges=[{id:'a',from:'src',to:'grp',port:'records'},{id:'b',from:'grp',to:'step',port:'records'}];
  if(type==='join_table_to_area'){nodes.push(area,{id:'map',type:'map_output',x:600,y:0,params:{label:'Map',basemap:'none'}});
    edges.push({id:'c',from:'area',to:'step',port:'area'},{id:'d',from:'step',to:'map',port:'polygons'});}
  const w={schema:'fieldwork/workflow/1',name:'Stress',nodes,edges};
  return Promise.race([executeWorkflow(validateWorkflow(w),reason),
    new Promise((_,reject)=>setTimeout(()=>reject(new Error('HANG: no answer in 15 s')),15000))]);
}

test('Chart and Join a table to the study area, on totals from every made-up table: finished, refused in words',async()=>{
  const seen=[];
  for(const name of Object.keys(TABLES))for(const type of Object.keys(MORE)){
    try{await runMore(name,type);seen.push(`${name} · ${type}: ran`);}
    catch(error){
      assert.doesNotMatch(error.message,/HANG|is not a function|undefined is not|Cannot read|of undefined|of null|NaN/,`${name} · ${type}: ${error.message}`);
      seen.push(`${name} · ${type}: refused`);
    }
  }
  assert.ok(seen.includes('plain · chart_output: ran'),seen.join('\n'));
  assert.ok(seen.includes('plain · join_table_to_area: ran'),seen.join('\n'));
});

// KEYS PROPOSED FROM THEIR VALUES (the practitioner, 2026-11-22: "Can FW detect compatible keys between tables?").
import {proposeRelateKeys} from '../build/relate-table.js';
const t2=(csv,keys,value)=>dataTable(parseCSV(csv),{keys,valueField:value});
test('Relate proposes the key columns whose values link most, across names that differ, and says codes against names',()=>{
  const cases=t2('LGA,week,cases\nAba North,1,4\nAba South,1,2\nAbak,1,5\nAbaji,1,1',['LGA','week'],'cases');
  const people=t2('state,lga_name,population\nAbia,Aba-North,100\nAbia,aba south,90\nAkwa Ibom,Abak,80\nFCT,Bwari,70',['state','lga_name'],'population');
  assert.deepEqual(proposeRelateKeys(cases,people,'fuzzy').proposal,{on:'LGA',rightOn:'lga_name',linked:3,leftDistinct:4,rightDistinct:4});
  // Exact matching ignores case only, so the hyphen in "Aba-North" keeps it apart.
  assert.equal(proposeRelateKeys(cases,people,'exact').proposal.linked,2);
  // Codes facing names: nothing links, and it is said.
  const coded=t2('pcode,population\nNG001001,100\nNG001002,90\nNG003001,80',['pcode'],'population');
  const named=t2('district,cases\nAba North,4\nAba South,2\nAbak,5',['district'],'cases');
  const r=proposeRelateKeys(named,coded,'fuzzy');
  assert.equal(r.proposal,undefined);
  assert.deepEqual(r.codesAndNames,{codes:'the second table\'s "pcode"',names:'the first table\'s "district"'});
});
