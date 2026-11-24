import test from 'node:test';
import assert from 'node:assert/strict';
import {recordAttributesHtml} from '../build/point-layers.js';

const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);

// The practitioner, 2026-11-23, having joined a species list onto 55,227 bat records: "Without the species in the
// tool tip I have no way of directly verifying whether the relate two tables worked."
test('a record says what it is, not only where it is',()=>{
  const html=recordAttributesHtml({name:'Record 4638',Species:'Eidolon helvum',Family:'Pteropodidae',
    Country:'Democratic Republic of Congo'},esc);
  assert.match(html,/Species: Eidolon helvum/);
  assert.match(html,/Family: Pteropodidae/);
  // The name is the popup's heading already; repeating it under itself says nothing.
  assert.doesNotMatch(html,/name:/);
  // Column order is the source's, which for a table-derived layer is the file's own.
  assert.ok(html.indexOf('Species')<html.indexOf('Family'),'columns keep the order they arrive in');
});

test('an empty value and the NA a file writes are not shown as facts',()=>{
  const html=recordAttributesHtml({Species:'Mops condylurus',Roost:'NA',Date:'',Year:'  ',Checked:'Yes'},esc);
  assert.match(html,/Species: Mops condylurus/);
  assert.match(html,/Checked: Yes/);
  for(const absent of ['Roost','Date','Year'])assert.doesNotMatch(html,new RegExp(absent+':'));
});

test('a wide line list is capped, and says how many columns were left',()=>{
  const wide=Object.fromEntries(Array.from({length:20},(_,i)=>[`c${i}`,`v${i}`]));
  const html=recordAttributesHtml(wide,esc);
  assert.match(html,/and 6 more columns/);
  assert.match(html,/c0: v0/);
  assert.doesNotMatch(html,/c19: v19/);
});

test('nothing to say is nothing added',()=>{
  assert.equal(recordAttributesHtml(undefined,esc),'');
  assert.equal(recordAttributesHtml({},esc),'');
  assert.equal(recordAttributesHtml({name:'x',Roost:'NA'},esc),'');
});

test('a value carrying markup is escaped',()=>{
  const html=recordAttributesHtml({Note:'<script>x</script>'},esc);
  assert.doesNotMatch(html,/<script>/);
  assert.match(html,/&lt;script&gt;/);
});
