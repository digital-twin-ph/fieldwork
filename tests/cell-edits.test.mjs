import test from 'node:test';
import assert from 'node:assert/strict';
import {applyFeatureEdits,applyTableEdits,editsSentence,validEdits} from '../build/cell-edits.js';

/** VALUES EDITED BY HAND (experiment 214): on a copy, only where the value read is still there, and said. */
const at='2026-11-13T12:00:00Z';
const points=[{id:'a',properties:{district:'Bo Distrct',cases:3}},{id:'b',properties:{district:'Kenema',cases:null}}];

test('an edit is applied to a copy, and the records held are untouched',()=>{
  const out=applyFeatureEdits(points,[{record:'a',column:'district',from:'Bo Distrct',to:'Bo District',at}]);
  assert.equal(out.features[0].properties.district,'Bo District');
  assert.equal(points[0].properties.district,'Bo Distrct');
  assert.equal(out.applied.length,1);
});

test('an empty cell can be filled, and is counted as filled',()=>{
  const out=applyFeatureEdits(points,[{record:'b',column:'cases',from:null,to:'4',at}]);
  assert.equal(out.features[1].properties.cases,4);
  assert.match(editsSentence(out),/1 value edited by hand, 1 of them filling an empty cell/);
});

test('an edit whose value read is no longer there is not applied, and is reported',()=>{
  const out=applyFeatureEdits(points,[{record:'a',column:'district',from:'Bo district',to:'Bo District',at}]);
  assert.equal(out.features[0].properties.district,'Bo Distrct');
  assert.equal(out.stale.length,1);
  assert.match(editsSentence(out),/1 edit was not applied/);
});

test('later edits of a cell read what earlier ones wrote',()=>{
  const out=applyFeatureEdits(points,[{record:'a',column:'cases',from:'3',to:'5',at},{record:'a',column:'cases',from:'5',to:'6',at}]);
  assert.equal(out.features[0].properties.cases,6);
});

test('a table’s rows are edited by position, a key column or the value column',()=>{
  const table={kind:'data-table',keys:['district'],valueField:'population',rows:[{key:{district:'Bo'},value:100},{key:{district:'Kenema'},value:null}],rowCount:2,missingValueCount:1};
  const out=applyTableEdits(table,[{record:'row 1',column:'district',from:'Bo',to:'Bo District',at},{record:'row 2',column:'population',from:null,to:'250',at}]);
  assert.equal(out.table.rows[0].key.district,'Bo District');
  assert.equal(out.table.rows[1].value,250);
  assert.equal(out.table.missingValueCount,0);
  assert.equal(table.rows[0].key.district,'Bo');
});

test('edits are checked as they arrive',()=>{
  assert.ok(validEdits([{record:'a',column:'x',from:null,to:'1',at}]));
  assert.ok(!validEdits([{record:'a',column:'x',to:'1'}]));
});

test('a manual can ask for an edit, and its playback places the nodes added so far',async()=>{
  const {validateManual,stepSentence,placedByStep}=await import('../build/worked-example-manual.js');
  const steps=[{add:'table_input',as:'cases'},{edit:'cases',record:'row 1',column:'district',value:'Bo District'},{add:'table_output',as:'shown'},{run:true}];
  validateManual({schema:'fieldwork/worked-example-manual/1',example:'x',workflows:[{name:'w',steps}]});
  assert.match(stepSentence(steps[1],{cases:'table_input'},t=>t,s=>s),/Data quality.*Records.*district.*row 1.*Bo District/);
  const placed=placedByStep(steps,[{id:'n-out',type:'table_output'},{id:'n-in',type:'table_input'}]);
  assert.deepEqual(placed,[['n-in'],['n-in'],['n-in','n-out'],['n-in','n-out']]);
  assert.throws(()=>validateManual({schema:'fieldwork/worked-example-manual/1',example:'x',workflows:[{name:'w',steps:[{edit:'nobody',record:'row 1',column:'a',value:'b'}]}]}),/before it is added/);
});

test('edits are versioned: taking one back and restoring a version add versions, and delete nothing',async()=>{
  const {editsAt,versionWords,validEdits:valid}=await import('../build/cell-edits.js');
  const log=[
    {version:1,record:'a',column:'district',from:'Bo Distrct',to:'Bo District',at},
    {version:2,record:'b',column:'cases',from:null,to:'4',at},
    {version:3,revokes:1,at},
    {version:4,restore:2,at},
    {version:5,restore:0,at}];
  assert.deepEqual(editsAt(log,2).map(e=>e.version),[1,2]);
  assert.deepEqual(editsAt(log,3).map(e=>e.version),[2],'version 3 took back version 1');
  assert.deepEqual(editsAt(log,4).map(e=>e.version),[1,2],'version 4 restored version 2, the edit of version 1 with it');
  assert.deepEqual(editsAt(log).map(e=>e.version),[],'version 5 restored the records as imported');
  assert.equal(versionWords(log,2),'took back version 1');
  assert.equal(versionWords(log,4),'restored the records as imported');
  assert.ok(valid(log));
  assert.ok(!valid([{version:1,revokes:1,at}]),'a version cannot take back itself or one after it');
  // Plain edits written before versions read as versions 1, 2.
  assert.deepEqual(editsAt([{record:'a',column:'x',from:null,to:'1',at},{record:'b',column:'x',from:null,to:'2',at}]).map(e=>e.version),[1,2]);
});

test('Total within groups gives a group’s mean and median, of the values present, and refuses them as shares',async()=>{
  const {groupTable}=await import('../build/group-table.js');
  const t={kind:'data-table',keys:['g','id'],valueField:'days',rows:[
    {key:{g:'a',id:'1'},value:2},{key:{g:'a',id:'2'},value:9},{key:{g:'a',id:'3'},value:4},{key:{g:'a',id:'4'},value:null},
    {key:{g:'b',id:'5'},value:3},{key:{g:'b',id:'6'},value:5}],rowCount:6,missingValueCount:1};
  const mean=groupTable(t,{by:['g'],aggregate:'mean',excludeMissing:true}).table.rows;
  const median=groupTable(t,{by:['g'],aggregate:'median',excludeMissing:true}).table.rows;
  assert.deepEqual(mean.map(r=>r.value),[5,4]);
  assert.deepEqual(median.map(r=>r.value),[4,4],'the middle of 2, 4, 9; and of 3, 5 the mean of the two');
  assert.equal(groupTable(t,{by:['g'],aggregate:'median'}).table.rows[0].value,null,'an empty cell, not excluded, makes it unknown');
  const t3={kind:'data-table',keys:['g','h','id'],valueField:'days',rows:[{key:{g:'a',h:'x',id:'1'},value:2},{key:{g:'a',h:'y',id:'2'},value:4}],rowCount:2,missingValueCount:0};
  assert.throws(()=>groupTable(t3,{by:['g','h'],aggregate:'mean',share:{within:['g']}}),/does not add up to one/);
});

test('Total within groups summarises a key column of numbers when asked, its blanks empty cells, a word refused',async()=>{
  const {groupTable}=await import('../build/group-table.js');
  const t={kind:'data-table',keys:['outcome','id','incubation_days'],valueField:'age',unit:'years',rows:[
    {key:{outcome:'Alive',id:'1',incubation_days:'4'},value:60},{key:{outcome:'Alive',id:'2',incubation_days:'8'},value:50},
    {key:{outcome:'Alive',id:'3',incubation_days:''},value:40},{key:{outcome:'Dead',id:'4',incubation_days:'6'},value:70}],rowCount:4,missingValueCount:0};
  const r=groupTable(t,{by:['outcome'],aggregate:'median',excludeMissing:true,total:'incubation_days'});
  assert.deepEqual(r.table.rows.map(x=>x.value),[6,6],'the median days, not the median age');
  assert.equal(r.table.valueField,'incubation_days');
  assert.equal(r.table.unit,undefined,'the unit declared was age’s');
  assert.equal(groupTable(t,{by:['outcome'],aggregate:'median',total:'incubation_days'}).table.rows[0].value,null,'a blank is an empty cell');
  assert.equal(groupTable(t,{by:['outcome'],aggregate:'count',total:'incubation_days'}).table.rows[0].value,3,'a count counts rows');
  const words={...t,rows:[...t.rows,{key:{outcome:'Dead',id:'5',incubation_days:'unknown'},value:1}]};
  assert.throws(()=>groupTable(words,{by:['outcome'],aggregate:'mean',total:'incubation_days'}),/"unknown" in row 5, which is not a number/);
});

test('a chart names a column with its confirmed label beside it, never instead of it',async()=>{
  const {tableChart}=await import('../build/chart-output.js');
  const t={kind:'data-table',keys:['신고 주차'],valueField:'rows',rows:[{key:{'신고 주차':'21'},value:3},{key:{'신고 주차':'22'},value:10}],rowCount:2,missingValueCount:0,
    columns:{'신고 주차':{label:'Week of report',origin:'dictionary',confirmed:true}}};
  const c=tableChart(t);
  assert.equal(c.categoryTitle,'신고 주차 (Week of report)');
  assert.match(c.caption,/by 신고 주차 \(Week of report\)/);
  assert.equal(tableChart({...t,columns:{'신고 주차':{label:'Week of report',origin:'dictionary',confirmed:false}}}).categoryTitle,'신고 주차','an unconfirmed label is not shown');
  assert.equal(tableChart({...t,columns:undefined}).categoryTitle,'신고 주차');
});

test('a project’s widgets: each with the workflows that use it and its steps there, in the palette’s order',async()=>{
  const {projectWidgets}=await import('../build/project-widgets.js');
  const rows=projectWidgets([
    {key:'a',name:'How deadly?',nodes:[{type:'table_input',params:{label:'Line list'}},{type:'group_table',params:{label:'By age'}},{type:'group_table',params:{label:'By sex'}}]},
    {key:'b',name:'How long?',nodes:[{type:'table_input',params:{label:'Dates'}},{type:'apply_ruleset',params:{}}]}],['table_input','apply_ruleset','group_table']);
  assert.deepEqual(rows.map(r=>r.type),['table_input','apply_ruleset','group_table']);
  assert.deepEqual(rows[0].uses.map(u=>[u.name,u.steps]),[['How deadly?',['Line list']],['How long?',['Dates']]]);
  assert.deepEqual(rows[2].uses,[{key:'a',name:'How deadly?',steps:['By age','By sex']}]);
  assert.deepEqual(rows[1].uses[0].steps,['']);
});

test('a sum of values held to one decimal is held to one decimal, not to binary arithmetic’s noise',async()=>{
  const {groupTable}=await import('../build/group-table.js');
  const vals=[1.1,2.2];
  const t={kind:'data-table',keys:['g','id'],valueField:'v',rows:vals.map((v,i)=>({key:{g:'a',id:String(i)},value:v})),rowCount:vals.length,missingValueCount:0};
  assert.equal(vals.reduce((a,b)=>a+b,0),3.3000000000000003,'the noise is real');
  assert.equal(groupTable(t,{by:['g']}).table.rows[0].value,3.3);
  const whole={...t,rows:[{key:{g:'a',id:'1'},value:3},{key:{g:'a',id:'2'},value:4}]};
  assert.equal(groupTable(whole,{by:['g']}).table.rows[0].value,7);
  const fine={...t,rows:[{key:{g:'a',id:'1'},value:0.125},{key:{g:'a',id:'2'},value:2.5}]};
  assert.equal(groupTable(fine,{by:['g']}).table.rows[0].value,2.625);
});
