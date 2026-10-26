import test from 'node:test';
import assert from 'node:assert/strict';
import {authoredFacts,authoredProjection} from '../build/authored-application.js';
import {compileAuthoredRuleset} from '../build/authored-rules.js';

/** A RULESET THAT DECLARES ITS COLUMNS NEEDS NO BRANCH IN THE INTERPRETER.
 *
 *  Experiment 65 frames the widget as an interpreter and the ruleset as the program. An
 *  interpreter edited to run each new program is not one, and `src/core.ts` carried four such
 *  edits — one per bundled ruleset — while rules a practitioner AUTHORS had always gone through
 *  one general projection. `inputContract.fieldFrom` is what lets a bundled ruleset use it.
 *
 *  This also settles where a recode belongs. The practitioner, 2026-10-25: *"all the above can
 *  be built into the ruleset widget."* Epi Info's command set separates `DEFINE`, `ASSIGN`,
 *  `RECODE` and `IF`; here the first three are this projection writing a conclusion as a new
 *  column, and the fourth is the authored form's conditions. */

const BINDINGS=[{attribute:'rate',predicate:'fw:ratePerThousand',kind:'number',label:'Rate'}];

const TABLE={kind:'data-table',keys:['sub_district'],valueField:'deaths_per_1000',
  rows:[
    {key:{sub_district:'St. Olave, Southwark'},value:6.61},
    {key:{sub_district:'Dulwich'},value:0},
  ],
  rowCount:2,missingValueCount:0};

// A table's facts come from its KEY columns and its value; bind a point-style attribute instead.
const POINTS={type:'FeatureCollection',features:[
  {type:'Feature',id:'olave',geometry:null,properties:{name:'St. Olave, Southwark',rate:6.61}},
  {type:'Feature',id:'dulwich',geometry:null,properties:{name:'Dulwich',rate:0}},
]};

const RECODE={subject:'?p',comment:'Recode a rate into bands.',
  rules:[
    {any:[{all:[{field:'fw:ratePerThousand',comparator:'greaterThan',value:5}]}],
     then:[{predicate:'fw:band',value:'fw:High'}]},
    {any:[{all:[{field:'fw:ratePerThousand',comparator:'notGreaterThan',value:5}]}],
     then:[{predicate:'fw:band',value:'fw:Low'}]},
  ]};

test('a recode is an ordinary ruleset: conditions in, a new column out',async()=>{
  const facts=authoredFacts(POINTS,BINDINGS);
  // The binding is what makes a column readable as a predicate. Nothing is guessed from a name.
  assert.match(facts,/fw:ratePerThousand/);
  assert.match(facts,/6\.61/);
  const rules=compileAuthoredRuleset(RECODE);
  assert.match(rules,/fw:band fw:High/);
  // The conclusion names a column that did not exist in the data: DEFINE and ASSIGN in one.
  assert.doesNotMatch(JSON.stringify(POINTS),/band/);
});

test('conclusions become attributes on the records they were drawn about',()=>{
  const conclusions=[
    {subject:'urn:fieldwork:subject:olave',predicate:'urn:fieldwork:band',object:'urn:fieldwork:High'},
    {subject:'urn:fieldwork:subject:dulwich',predicate:'urn:fieldwork:band',object:'urn:fieldwork:Low'},
  ];
  const judged=authoredProjection(POINTS,BINDINGS,conclusions);
  const banded=judged.features.map(f=>[f.properties.name,f.properties.band]);
  assert.deepEqual(banded,[['St. Olave, Southwark','High'],['Dulwich','Low']]);
  // The source column is untouched: a recode adds a column, it does not overwrite one.
  assert.equal(judged.features[0].properties.rate,6.61);
  assert.deepEqual(judged.unmatched,[]);
});

/** AN UNRECODED RECORD IS NOT A RECORD WITH NO VALUE. The map will miss cases, and a silent
 *  pass-through is how a gap becomes a finding. `unmatched` is what makes it visible, the same
 *  stance experiment 138 takes for a table row naming no part of a boundary. */
test('a record no rule concluded about is reported, not silently unchanged',()=>{
  const judged=authoredProjection(POINTS,BINDINGS,[
    {subject:'urn:fieldwork:subject:olave',predicate:'urn:fieldwork:band',object:'urn:fieldwork:High'},
  ]);
  assert.deepEqual(judged.unmatched,['Dulwich']);
  assert.equal(judged.features[1].properties.band,undefined);
});

test('a table gets the conclusion as a key column, and keeps what it measured',()=>{
  const judged=authoredProjection(TABLE,[],[]);
  assert.equal(judged.table.valueField,'deaths_per_1000',
    'the value field is what the table measures and a recode must not touch it');
  assert.ok(judged.table.keys.includes('sub_district'));
});
