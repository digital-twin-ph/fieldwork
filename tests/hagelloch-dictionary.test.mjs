import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {hagellochExample,HAGELLOCH_DICTIONARY_SHA256} from '../build/hagelloch-example.js';

// EXPERIMENT 211: Hagelloch's cases carry the outbreaks package's dictionary, and what it says is proposed, not accepted.
test('the cases carry their source\'s dictionary, by the digest of the file, and its words only as proposals',()=>{
  const bytes=readFileSync(new URL('../examples/hagelloch-1861/dictionary.json',import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),HAGELLOCH_DICTIONARY_SHA256);
  const cases=hagellochExample().nodes.find(n=>n.id==='cases').params;
  assert.equal(cases.dictionary.sha256,HAGELLOCH_DICTIONARY_SHA256);
  assert.equal(cases.dictionaryRef,`dictionary:${HAGELLOCH_DICTIONARY_SHA256}`);
  assert.equal(cases.dictionary.sheets[0].rows.length,12);
  const klass=cases.columns.class;
  assert.equal(klass.confirmed,false,'proposed, never accepted for the practitioner');
  assert.equal(klass.scale,'nominal','a factor says no order; the order is the practitioner\'s to say');
  assert.deepEqual(klass.codes.map(c=>c.value),['0','1','2']);
  assert.deepEqual(cases.dictionaryCheck.notInDictionary,['name'],'the name this project gave each case is not the source\'s');
});
