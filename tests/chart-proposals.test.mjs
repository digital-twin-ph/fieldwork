import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeChartForms,proposalOrder} from '../build/chart-proposals.js';

// THE PROPOSER, QUESTION FIRST (experiment 210; the practitioner, 2026-11-13: chart type candidates in the dropdown).
const row=(key,value=1)=>({key,value});
const fits=list=>proposalOrder(list).filter(p=>p.fits).map(p=>p.form);

test('a case series proposes its curve, and the stacked curve only where it is split',()=>{
  assert.deepEqual(fits(proposeChartForms({kind:'series'})),['curve']);
  const split=proposeChartForms({kind:'series',splitBy:'class'});
  assert.deepEqual(fits(split),['curve','stacked']);
  assert.match(split.find(p=>p.form==='stacked').because,/split by class/);
});

test('ages by gender propose the pyramid; categories alone propose bars and say what the others need',()=>{
  // Hagelloch's cases by age and gender: single years, and two values of gender.
  const ages={keys:['age','gender'],rows:[...Array(12)].flatMap((_,a)=>[row({age:String(a),gender:'f'}),row({age:String(a),gender:'m'})])};
  assert.deepEqual(fits(proposeChartForms({kind:'table',table:ages})),['pyramid','bars']);
  // MERS's places of exposure: one category.
  const places={keys:['exposure'],rows:['Hospital room','Emergency room','Hospital visit'].map(e=>row({exposure:e}))};
  const proposed=proposeChartForms({kind:'table',table:places});
  assert.deepEqual(fits(proposed),['bars']);
  assert.match(proposed.find(p=>p.form==='tree').because,/needs a column naming each case/);
});

test('a case, its source and a date propose the tree, with "none recorded" left as the one word for no source',()=>{
  // MERS's cases related to their recorded sources: SK_2 and SK_3 from SK_1, SK_1 with none recorded.
  const cases={keys:['id','from','dt_onset'],rows:[
    row({id:'SK_1',from:'none recorded',dt_onset:'2015-05-11'}),row({id:'SK_2',from:'SK_1',dt_onset:'2015-05-19'}),
    row({id:'SK_3',from:'SK_1',dt_onset:'2015-05-20'}),row({id:'SK_4',from:'SK_2',dt_onset:'2015-05-25'})]};
  const proposed=proposeChartForms({kind:'table',table:cases});
  assert.equal(proposalOrder(proposed)[0].form,'tree');
  assert.equal(proposed.find(p=>p.form==='tree').because,'from holds values of id, in the same table, and dt_onset dates each row');
  // Two words where none is recorded is not a source column.
  cases.rows.push(row({id:'SK_5',from:'unknown',dt_onset:'2015-05-26'}));
  assert.ok(!proposeChartForms({kind:'table',table:cases}).find(p=>p.form==='tree').fits);
});
