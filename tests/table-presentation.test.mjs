import test from 'node:test';
import assert from 'node:assert/strict';
import {presentValue,validatePresentation} from '../build/table-presentation.js';

const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);

/** A TABLE PRESENTED TO A STANDARD (Table 0.15.0, 2026-11-27): one precision a column, thousands separators never on a
 *  year, an absent value a dash unless the table says otherwise, numbers marked to be right-aligned. */
test('values are written to the presentation',()=>{
  assert.deepEqual(presentValue(1234.5,'cases',{decimals:1},esc),{html:'1,234.5',number:true,absent:false});
  assert.equal(presentValue('1234','cases',{},esc).html,'1,234');
  assert.equal(presentValue(2026,'year',{},esc).html,'2026','a year has no separator');
  assert.equal(presentValue(1234,'cases',{separators:false},esc).html,'1234');
  assert.equal(presentValue(3,'cases',{decimals:2},esc).html,'3.00');
  assert.equal(presentValue('A12','id',{},esc).number,false);
  assert.equal(presentValue(1234,'id',{},esc,{measure:false}).html,'1234','an identifier keeps its digits');
});
test('an absent value is a dash read as "no value" unless the table says otherwise',()=>{
  assert.match(presentValue(null,'x',undefined,esc).html,/aria-label="no value">—/);
  assert.equal(presentValue(null,'x',{absent:'unknown'},esc).html,'unknown');
  assert.equal(presentValue('','x',{absent:'blank'},esc).html,'');
});
test('a saved presentation with an unknown or out-of-range setting is refused',()=>{
  assert.throws(()=>validatePresentation({colour:'red'}),/no setting "colour"/);
  assert.throws(()=>validatePresentation({decimals:9}),/0 to 6/);
  assert.throws(()=>validatePresentation({absent:'NA'}),/unknown, a dash, or blank/);
  validatePresentation({caption:'Deaths by house',decimals:1,separators:false,absent:'unknown',shade:true});
});
