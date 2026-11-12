import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {relateTable,relateShape} from '../build/relate-table.js';
import {transmissionTree,treeSentence} from '../build/transmission-tree.js';

/** ONE ROW PER MATCH (2026-11-12): MERS's cases related to their recorded sources. A case with three sources becomes three
 *  rows, counted and said; without the choice the step stops and names the key, as it always did. */
const tableOf=(keys,rows,valueField='n')=>({kind:'data-table',keys,valueField,rowCount:rows.length,missingValueCount:0,
  rows:rows.map(r=>({key:Object.fromEntries(keys.map((k,i)=>[k,r[i]])),value:1}))});
const cases=tableOf(['id','dt_onset'],[['a','2015-05-01'],['b','2015-05-10'],['c','2015-05-12'],['d','2015-05-20']]);
const links=tableOf(['from','to'],[['a','b'],['a','c'],['b','c'],['c','d']]);

test('without the choice, a key matching several rows stops the step, naming it and saying what to do',()=>{
  assert.throws(()=>relateTable(cases,links,{on:'id',rightOn:'to',bring:'from',unmatched:{decision:'keep',label:'none recorded',signature:''}}),
    /more than one "from".*keep one row per match/s);
});

test('one row per match: c, recorded from a and b, is two rows, and the step says one key added one row',()=>{
  const request={on:'id',rightOn:'to',bring:'from',several:'each'};
  const shape=relateShape(cases,links,request);
  const r=relateTable(cases,links,{...request,unmatched:{decision:'keep',label:'none recorded',signature:shape.signature}});
  assert.deepEqual(r.table.rows.map(x=>`${x.key.id}<${x.key.from}`),['a<none recorded','b<a','c<a','c<b','d<c']);
  assert.deepEqual(r.several,{keys:1,addedRows:1});
  const t=transmissionTree(r.table,{id:'id',parent:'from',date:'dt_onset',none:'none recorded'});
  assert.equal(t.counts.noInfector,1,'"none recorded" is read as no source, not as a source missing from the table');
  assert.equal(t.counts.unknownInfector,0);
  assert.deepEqual(t.cases.find(x=>x.id==='c').alsoFrom,['b']);
});

const MERS=new URL('../../example-2015-mers-korea/data/',import.meta.url);
test('MERS: 162 cases with every recorded source, SK_39 with three and SK_107 with two',{skip:!existsSync(MERS)},()=>{
  const csv=name=>{const [h,...l]=readFileSync(new URL(name,MERS),'utf8').trim().split(/\r?\n/);const head=h.split(',').map(c=>c.replace(/"/g,''));
    return l.map(line=>Object.fromEntries(line.match(/("([^"]*)"|[^,]*)(,|$)/g).slice(0,head.length).map((v,i)=>[head[i],v.replace(/,$/,'').replace(/^"|"$/g,'')])));};
  const list=csv('mers_korea_2015_linelist.csv'),contacts=csv('mers_korea_2015_contacts.csv');
  const left=tableOf(['id','dt_onset'],list.map(r=>[r.id,r.dt_onset]));
  const right=tableOf(['from','to','exposure'],contacts.map(r=>[r.from,r.to,r.exposure]));
  const request={on:'id',rightOn:'to',bring:'from',several:'each'};
  const r=relateTable(left,right,{...request,unmatched:{decision:'keep',label:'none recorded',signature:relateShape(left,right,request).signature}});
  assert.equal(r.table.rows.length,162+3,'98 links over 95 cases: three more rows than cases');
  assert.deepEqual(r.several,{keys:2,addedRows:3});
  const t=transmissionTree(r.table,{id:'id',parent:'from',date:'dt_onset',none:'none recorded'});
  assert.equal(t.counts.cases,162);
  assert.equal(t.counts.severalSources,2);
  assert.equal(t.counts.furtherLinks,3);
  assert.deepEqual(t.cases.find(c=>c.id==='SK_39').alsoFrom.length,2);
  assert.match(treeSentence(t),/2 cases record more than one source/);
});
