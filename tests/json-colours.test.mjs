import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {highlightJson} from '../build/ruleset-json.js';

/** COLOUR-KEYED JSON (2026-11-21): every colour readable on the editor's ground and on a problem line's tint, in both
 *  themes, by WCAG's contrast ratio, 4.5:1 for text (the practitioner has low vision: AA or better, always). */
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
const themes=[...css.matchAll(/--json-key:(#[0-9a-f]{6});--json-string:(#[0-9a-f]{6});--json-number:(#[0-9a-f]{6});--json-literal:(#[0-9a-f]{6});--json-punct:(#[0-9a-f]{6});--json-ground:(#[0-9a-f]{6});--json-bad-ground:(#[0-9a-f]{6})/g)]
  .map(m=>({colours:{key:m[1],string:m[2],number:m[3],literal:m[4],punct:m[5]},grounds:[m[6],m[7]]}));
const lum=hex=>{const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4);
  return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2];};
const ratio=(a,b)=>{const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+0.05)/(y+0.05);};

test('three declarations, light and the two of dark, the same in both dark ones',()=>{
  assert.equal(themes.length,3);
  assert.deepEqual(themes[1],themes[2]);
});
test('every colour meets 4.5:1 on the ground and on a problem line, in both themes',()=>{
  for(const t of themes)for(const [name,colour] of Object.entries(t.colours))for(const ground of t.grounds)
    assert.ok(ratio(colour,ground)>=4.5,`${name} ${colour} on ${ground}: ${ratio(colour,ground).toFixed(2)}`);
});
test('names, text, numbers, true and false and null, and punctuation are each marked; a problem line is tinted',()=>{
  const html=highlightJson('{\n  "a": "b",\n  "n": -1.5e3,\n  "t": true\n}',new Set([3]));
  // Quotes arrive as &quot; since 2026-11-25, when the highlighter took the one HTML escape: drawn, it is the same
  // glyph, so the coloured layer still lines up with the text typed over it character for character.
  assert.match(html,/<span class="json-key">&quot;a&quot;<\/span><span class="json-punct">:<\/span> <span class="json-string">&quot;b&quot;<\/span>/);
  assert.match(html,/<span class="json-number">-1.5e3<\/span>/);
  assert.match(html,/<span class="json-literal">true<\/span>/);
  assert.equal((html.match(/json-line-bad/g)||[]).length,1);
  assert.match(highlightJson('"<b>"'),/&lt;b&gt;/);
  assert.equal((highlightJson('a\n\nb').match(/json-line/g)||[]).length,3);
});
