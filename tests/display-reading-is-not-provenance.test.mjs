/** A DISPLAY CHOICE IS NOT THE FILE'S OWN SHAPE (2026-11-25, review of 0.196.0).
 *
 *  "Always show this table wide" wrote `DataTable.wide`, which is provenance: it says the table ARRIVED wide and
 *  names the subjects it had. Computation relies on it. `isWide` rebuilds one record per subject and Apply ruleset
 *  then evaluates rules over those subjects rather than over rows — so a reader asking to SEE a long table wide
 *  silently changed what was computed: six rule inputs became three, and the measure and value fields were replaced
 *  by measure-named ones.
 *
 *  The preference is `shownWide` now. Views read either; nothing that computes reads the second. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {wideFrame,wideCells} from '../build/data-table-ui.js';
import {isWide} from '../build/authored-application.js';

const longTable=()=>({kind:'data-table',keys:['district','measure'],valueField:'value',
  rows:[
    {key:{district:'Kumbotso',measure:'eligible'},value:120},
    {key:{district:'Kumbotso',measure:'vaccinated'},value:90},
    {key:{district:'Kunchi',measure:'eligible'},value:80},
    {key:{district:'Kunchi',measure:'vaccinated'},value:55},
  ],rowCount:4,missingValueCount:0});

const reading={measureKey:'measure',subjectKeys:['district']};

test('a kept display reading shows the table wide',()=>{
  const shown={...longTable(),shownWide:reading};
  const frame=wideFrame(shown);
  assert.ok(frame,'the reader asked for it wide, so it is read wide');
  assert.equal(frame.subject,'district');
  assert.deepEqual(frame.columns,['eligible','vaccinated']);
  assert.deepEqual(wideCells(shown).columns,['district','eligible','vaccinated']);
});

test('and it does not make the table one Apply ruleset evaluates by subject',()=>{
  const shown={...longTable(),shownWide:reading};
  // THE WHOLE POINT. `isWide` is the gate into `wideSubjects`, which rebuilds one record per subject; a rule is then
  // evaluated over two records instead of four rows, against measure-named fields.
  assert.equal(isWide(shown),false,'a display choice must not change what a rule is evaluated over');
  // A table that really did arrive wide still is one.
  assert.equal(isWide({...longTable(),wide:reading}),true);
});

test('with neither reading, the guess stays in Quick Look and the other views show the table as stored',()=>{
  // `wideFrame` still offers a reading for an undeclared table: that is what Quick Look draws, over the hint saying
  // the shape is not the table's own, and it is where the offer to keep it lives.
  assert.ok(wideFrame(longTable()),'Quick Look may still propose a wide reading');
  // `wideCells` draws the Join and Detect previews, which widen only on a reading the table carries.
  assert.deepEqual(wideCells(longTable()).columns,['district','measure','value']);
  assert.equal(isWide(longTable()),false);
});
