import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pointsAsTable} from '../build/core.js';
import {transmissionTree,treeSentence,treeSvg} from '../build/transmission-tree.js';

// WHO INFECTED WHOM, DRAWN AS CHAINS (experiment 200, step 5): on Hagelloch's 188 cases, and on the cases a real line
// list holds that a tree must not hide.
const hagelloch=pointsAsTable(JSON.parse(readFileSync(new URL('../examples/hagelloch-1861/cases.json',import.meta.url),'utf8')));
const cols={id:'case_ID',parent:'infector',date:'date_of_prodrome'};
const table=rows=>({kind:'data-table',keys:['id','by','on'],valueField:'',rows:rows.map(([id,by,on])=>({key:{id,by,on},value:null})),
  rowCount:rows.length,missingValueCount:0});

test('Hagelloch: 188 cases in 4 chains, 184 links, the largest from case 184 over 6 generations',()=>{
  const t=transmissionTree(hagelloch,cols);
  assert.deepEqual(t.counts,{cases:188,chains:4,noInfector:4,unknownInfector:0,undated:0,inLoop:0,links:184});
  assert.deepEqual(t.chains.map(c=>[c.root,c.size,c.generations]),[['184',173,6],['173',9,5],['174',5,4],['141',1,1]]);
  const one=t.cases.find(c=>c.id==='1');
  assert.equal(one.parent,'45');
  assert.equal(one.generation,t.cases.find(c=>c.id==='45').generation+1);
  // Every case sits below its infector.
  const row=new Map(t.cases.map(c=>[c.id,c.row]));
  for(const c of t.cases)if(c.generation)assert.ok(row.get(c.parent)<c.row,`${c.id} below ${c.parent}`);
  assert.match(treeSentence(t),/^188 cases in 4 chains, joined by 184 links/);
  assert.match(treeSvg(t,s=>s),/^<svg class="transmission-tree"/);
});

test('nothing is dropped: no infector, an infector not in the table, a loop and a missing date are each counted',()=>{
  const t=transmissionTree(table([['a','','2020-01-01'],['b','a','2020-01-04'],['c','zz','2020-01-02'],
    ['d','e','2020-01-05'],['e','d','2020-01-06'],['f','b','']]),{id:'id',parent:'by',date:'on'});
  assert.deepEqual(t.counts,{cases:6,chains:4,noInfector:1,unknownInfector:1,undated:1,inLoop:2,links:2});
  assert.equal(t.cases.find(c=>c.id==='c').starts,'infector not in the table');
  assert.equal(t.cases.find(c=>c.id==='d').starts,'in a loop');
  assert.equal(t.cases.find(c=>c.id==='f').generation,2);
  assert.match(treeSentence(t),/1 case names an infector the table does not hold; 2 cases sit in a loop, which no chain can be; 1 case without a readable date/);
});

test('a case id twice, or a column the table lacks, is refused and said',()=>{
  assert.throws(()=>transmissionTree(table([['a','',''],['a','','']]),{id:'id',parent:'by',date:'on'}),/"a" appears twice/);
  assert.throws(()=>transmissionTree(hagelloch,{...cols,date:'onset'}),/Choose the date column in Configure/);
});
