import test from 'node:test';
import assert from 'node:assert/strict';
import {escapeHtml} from '../build/inspector-kit.js';

// ONE HTML ESCAPE. Four modules each defined this character for character (code review, 2026-11-23); two more
// escape only &, < and >, and seven places escape four characters rather than five. A value escaped by a weaker
// rule and placed in an attribute lets a quote out of it.
test('the five characters that can change the meaning of markup',()=>{
  assert.equal(escapeHtml('&'),'&amp;');
  assert.equal(escapeHtml('<script>'),'&lt;script&gt;');
  assert.equal(escapeHtml('"'),'&quot;');
  // The apostrophe, because a single-quoted attribute is as much an attribute as a double-quoted one.
  assert.equal(escapeHtml("O'Brien"),'O&#39;Brien');
});

test('a value that is not a string is one a surface still shows',()=>{
  assert.equal(escapeHtml(0),'0');
  assert.equal(escapeHtml(false),'false');
  assert.equal(escapeHtml(null),'');
  assert.equal(escapeHtml(undefined),'');
});

test('an attribute cannot be broken out of, either way it is quoted',()=>{
  const payload='" onerror="alert(1)';
  assert.ok(!escapeHtml(payload).includes('"'),'no bare double quote survives');
  const single="' onerror='alert(1)";
  assert.ok(!escapeHtml(single).includes("'"),'no bare apostrophe survives');
});

test('escaping twice is visible, not silent',()=>{
  // Not idempotent, and should not be: a double escape shows as &amp;lt; rather than quietly collapsing,
  // so a caller escaping an already-escaped value sees it in the output.
  assert.equal(escapeHtml(escapeHtml('<')),'&amp;lt;');
});

// ONE RULE, MECHANISED. On 2026-11-25 eight more copies of the rule and ten weaker ones were found after 0.185.0 had
// brought four together, because nothing stopped a module writing its own. This reads the source for the shape every
// copy took: a replace over &, <, > (and perhaps quotes) mapping each to its entity. Decoding, as xlsx.ts does to
// read a spreadsheet's XML, maps the other way and is not matched.
test('no module defines an HTML escape of its own',async()=>{
  const {readdir,readFile}=await import('node:fs/promises');
  const dir=new URL('../src/',import.meta.url);
  const shape=/\.replace\(\/(\[&<>[^\]]*\]|&)\/g,[^\n]{0,40}&amp;/;
  const found=[];
  for(const name of (await readdir(dir)).filter(n=>/\.tsx?$/.test(n)&&n!=='html-escape.ts')){
    const lines=(await readFile(new URL(name,dir),'utf8')).split('\n');
    lines.forEach((line,i)=>{if(shape.test(line))found.push(`src/${name}:${i+1}`);});
  }
  assert.deepEqual(found,[],'import escapeHtml from src/html-escape.ts instead');
});
