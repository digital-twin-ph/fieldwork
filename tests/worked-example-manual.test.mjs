import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {validateManual,renderManual,stepSentence,MANUAL_SCHEMA} from '../build/worked-example-manual.js';

/** A WORKED EXAMPLE'S MANUAL, read and worded (experiment 173). The practitioner, 2026-11-04: *"worked examples should
 *  come with a Manual tab that lays out step by step how to build the workflows by hand."* */
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const TITLES={table_input:'Tabular data',select_rows:'Select rows by value'};
const title=type=>TITLES[type]??type;

const manual=()=>({schema:MANUAL_SCHEMA,example:'urn:test',workflows:[{name:'First',steps:[
  {add:'table_input',as:'daily'},
  {add:'select_rows',as:'days'},
  {connect:{from:'daily',to:'days',port:'records'}},
  {note:'Two dates, both kept.'},
  {fill:'select-from',label:'From',value:'2023-06-01'},
  {fill:'workflow-name-edit',view:'project',label:'Name',value:'First'},
  {run:true},
  {see:'14 bars',check:'2023-06-07'}]}]});

test('a step reads as a sentence that names what is on screen',()=>{
  const types={daily:'table_input',days:'select_rows'};
  assert.match(stepSentence({add:'select_rows',as:'days'},types,title,esc),/Add <strong>Select rows by value<\/strong>: type its name in <strong>Find a node…<\/strong>/);
  assert.equal(stepSentence({connect:{from:'daily',to:'days',port:'records'}},types,title,esc),
    'Connect the output of <strong>Tabular data</strong> to the <em>records</em> input of <strong>Select rows by value</strong>.');
  assert.equal(stepSentence({fill:'select-from',label:'From',value:'2023-06-01'},types,title,esc),
    'Set <strong>From</strong> to <code>2023-06-01</code>.');
  assert.equal(stepSentence({fill:'x',view:'project',label:'Name',value:'First'},types,title,esc),
    'In <strong>Project</strong>, set <strong>Name</strong> to <code>First</code>.');
});

test('notes are not numbered, and the steps after one number on',()=>{
  const html=renderManual(validateManual(manual()),'First',title,esc);
  assert.match(html,/<li value="3"[^>]*>Connect/);
  assert.match(html,/<p class="manual-note">Two dates, both kept.<\/p>/);
  assert.match(html,/<li value="4"[^>]*>Set <strong>From/);
  assert.match(html,/Open now/);
});

test('a manual that could not be followed is refused, saying where',()=>{
  assert.throws(()=>validateManual({schema:'other'}),/not a worked example manual/);
  const early=manual();early.workflows[0].steps.unshift({select:'daily'});
  assert.throws(()=>validateManual(early),/"First", step 1 names "daily" before it is added/);
  const twice=manual();twice.workflows[0].steps.push({add:'table_input',as:'daily'});
  assert.throws(()=>validateManual(twice),/adds a second "daily"/);
  const unknown=manual();unknown.workflows[0].steps.push({dance:true});
  assert.throws(()=>validateManual(unknown),/not a step this manual knows/);
});

const NYC=new URL('../../example-2025-nyc-ozone/manual.json',import.meta.url);
test('the NYC manual is one that can be followed',{skip:existsSync(NYC)?false:'example-2025-nyc-ozone is not checked out'},()=>{
  const nyc=validateManual(JSON.parse(readFileSync(NYC,'utf8')));
  assert.deepEqual(nyc.workflows.map(w=>w.name),['What happened during the June 2023 smoke?','Ten years of daily visits','Did visits move with the air?']);
});
