import test from 'node:test';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {readFileSync,existsSync} from 'node:fs';
const {transmissionChains,chainsFacts,CHAIN_COLUMNS}=await import('../build/transmission-chains.js');

// Experiment 216: each case its chain, handed on as columns. The practitioner, 2026-11-14: "New step: Transmission chains".
const table=rows=>({kind:'data-table',keys:['id','from'],valueField:'onset',rows:rows.map(([id,from,onset=1])=>({key:{id,from},value:onset})),
  rowCount:rows.length,missingValueCount:0});
const byId=result=>Object.fromEntries(result.table.rows.map(r=>[r.key.id,r.key]));

test('each row gains its chain, generation, offspring and chain size',()=>{
  const r=transmissionChains(table([['A',''],['B','A'],['C','A'],['D','B'],['E','']]),{id:'id',parent:'from'});
  assert.deepEqual(r.table.keys,['id','from',...CHAIN_COLUMNS]);
  const c=byId(r);
  assert.deepEqual([c.A.chain,c.A.generation,c.A.offspring,c.A.chain_size],['A','0','2','4']);
  assert.deepEqual([c.D.chain,c.D.generation,c.D.offspring],['A','2','0']);
  assert.deepEqual([c.E.chain,c.E.chain_size],['E','1']);
  assert.match(r.sentence,/^5 cases in 2 chains/);
  assert.equal(r.table.numericKeys.generation,'links from the first case');
});

test('nothing is dropped: a source not held, a loop, a written none, a case in two rows, a row with no id',()=>{
  const r=transmissionChains(table([['A','none'],['B','Z'],['C','D'],['D','C'],['E','A'],['E','B'],['','A']]),
    {id:'id',parent:'from',none:'none'});
  const c=byId(r);
  assert.equal(c.A.chain,'A');                       // "none" means no source
  assert.equal(c.B.chain,'B');                       // Z is not in the table: B starts a chain
  assert.ok(c.C.chain&&c.D.chain);                   // a loop: counted, not dropped
  assert.equal(r.table.rows.filter(x=>x.key.id==='E').every(x=>x.key.chain==='A'),true);  // two rows, one chain: the first source
  assert.equal(r.table.rows.length,7);
  assert.equal(r.unidentified,1);
  assert.match(r.sentence,/1 case names a source the table does not hold/);
  assert.match(r.sentence,/in a loop/);
  assert.match(r.sentence,/1 row with no case id/);
});

test('a column already named chain is refused rather than overwritten',()=>{
  const t=table([['A','']]);t.keys.push('chain');
  assert.throws(()=>transmissionChains(t,{id:'id',parent:'from'}),/already has a column named chain/);
});

test('the receipt states every count',()=>{
  const r=transmissionChains(table([['A',''],['B','A']]),{id:'id',parent:'from'});
  const facts=chainsFacts('<urn:x>',{id:'id',parent:'from'},r);
  for(const term of ['a fw:TransmissionChains','fw:chainsFound "1"','fw:casesNoInfector "1"','fw:rowsWithoutCaseId "0"'])assert.ok(facts.includes(term),term);
});

const MERS=new URL('../../example-2015-mers-korea/fieldwork-project.json.gz',import.meta.url);
test('MERS: 162 cases in 67 chains, SK_1’s of 94 over 4 generations, SK_76’s of 3, 65 of one',{skip:!existsSync(MERS)&&'Needs example-2015-mers-korea beside this repository.'},async()=>{
  const core=await import('../build/core.js');
  const w=JSON.parse(gunzipSync(readFileSync(MERS))).workflows.map(x=>x.document).find(d=>d.nodes.some(n=>n.params?.figure==='tree'));
  const tree=w.nodes.find(n=>n.params?.figure==='tree');
  const run=await core.executeWorkflow(w);
  const r=transmissionChains(run.tables[w.edges.find(e=>e.to===tree.id).from],tree.params.tree);
  const sizes=r.tree.chains.map(c=>c.size).sort((a,b)=>b-a);
  assert.equal(r.tree.counts.cases,162);assert.equal(r.tree.chains.length,67);
  assert.deepEqual(sizes.slice(0,2),[94,3]);assert.equal(sizes.filter(s=>s===1).length,65);
  assert.equal(r.tree.chains.find(c=>c.size===94).root,'SK_1');
  assert.equal(r.tree.chains.find(c=>c.size===94).generations,4);
});

test('a curve from a table of cases, one per row, split by generation (Case series 0.x, 2026-11-15)',async()=>{
  const {caseSeriesFromTable}=await import('../build/case-series.js');
  const r=transmissionChains({kind:'data-table',keys:['id','from','onset'],valueField:'age',
    rows:[['A','','2015-05-11',68],['B','A','2015-05-20',63],['C','A','2015-05-20',40],['D','B','2015-05-28',51]]
      .map(([id,from,onset,age])=>({key:{id,from,onset},value:age})),rowCount:4,missingValueCount:0},{id:'id',parent:'from'});
  const s=caseSeriesFromTable(r.table,{dateField:'onset',dateKind:'onset',period:'day',splitBy:'generation',rowAsCase:true});
  assert.equal(s.total,4);                                   // four cases, not 222 years of age
  assert.deepEqual(s.bins.filter(b=>b.count).map(b=>[b.key,b.group,b.count]),
    [['2015-05-11','0',1],['2015-05-20','1',2],['2015-05-28','2',1]]);
  assert.equal(s.unit,undefined);
});

test('a case in several rows, one per recorded source, is counted once; rows that disagree on its date are refused',async()=>{
  const {caseSeriesFromTable}=await import('../build/case-series.js');
  const t=rows=>({kind:'data-table',keys:['id','from','onset'],valueField:'age',rows:rows.map(([id,from,onset])=>({key:{id,from,onset},value:1})),rowCount:rows.length,missingValueCount:0});
  const s=caseSeriesFromTable(t([['A','','2015-05-11'],['B','A','2015-05-20'],['B','C','2015-05-20'],['C','','2015-05-12']]),
    {dateField:'onset',dateKind:'onset',period:'day',rowAsCase:true,caseId:'id'});
  assert.equal(s.total,3);
  assert.throws(()=>caseSeriesFromTable(t([['B','A','2015-05-20'],['B','C','2015-05-21']]),
    {dateField:'onset',dateKind:'onset',period:'day',rowAsCase:true,caseId:'id'}),/The case "B" is in two rows with different onset/);
});
