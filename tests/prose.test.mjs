import test from 'node:test';
import assert from 'node:assert/strict';
import {toHTML,escapeProse,hasMarkup,equationsIn} from '../build/prose.js';
import {toHTML as manualHTML} from '../scripts/widget-manual.mjs';

/** THE MARKUP A NOTE IS WRITTEN IN.
 *
 *  The practitioner, 2026-10-30: *"Let's do formatting and LaTeX."* What is stored is still the
 *  text that was typed -- markdown is plain text, so the readers that expect prose (the counts,
 *  the contributions statement, the receipt) are unchanged. These assert the reading of it. */

test('escaping comes first, so nothing a note says can become markup',()=>{
  assert.equal(escapeProse('<script>&"'),'&lt;script&gt;&amp;&quot;');
  // The whole point: a note carried between machines cannot bring script with it.
  assert.match(toHTML('<img src=x onerror=alert(1)>'),/&lt;img/);
  assert.doesNotMatch(toHTML('<b>bold</b>'),/<b>/);
});

test('bold, italic and code, and an underscore inside a word is not emphasis',()=>{
  assert.match(toHTML('**water** supply'),/<strong>water<\/strong>/);
  assert.match(toHTML('the *Lambeth* company'),/<em>Lambeth<\/em>/);
  assert.match(toHTML('a `relate` step'),/<code>relate<\/code>/);
  // A login, a column name or a file name is not a request for italics.
  assert.doesNotMatch(toHTML('sub_district_name'),/<em>/);
  // And bold is not read as an empty italic wrapping a bold.
  assert.doesNotMatch(toHTML('**water**'),/<em>/);
});

test('lists and quotations, and a list that changes kind closes the first',()=>{
  assert.match(toHTML('- one\n- two'),/<ul><li>one<\/li><li>two<\/li><\/ul>/);
  assert.match(toHTML('1. one\n2. two'),/<ol><li>one<\/li><li>two<\/li><\/ol>/);
  assert.match(toHTML('- one\n1. two'),/<\/ul><ol>/);
  assert.match(toHTML('> Snow said so.'),/<blockquote><p>Snow said so\.<\/p><\/blockquote>/);
});

test('a note has no headings and no tables, which is a decision and not a gap',()=>{
  // A heading inside a note is a second structure arguing with the IMRaD section it sits in.
  assert.doesNotMatch(toHTML('# Methods'),/<h2>/);
  assert.match(toHTML('# Methods'),/<p># Methods<\/p>/);
  // A table in a write-up is an artifact this application makes, with its own provenance.
  assert.doesNotMatch(toHTML('| a | b |\n| --- | --- |\n| 1 | 2 |'),/<table>/);
  // The manual's pages do get both, through the same renderer.
  assert.match(toHTML('# Methods',{headings:true}),/<h2>Methods<\/h2>/);
});

test('a link is offered to a manual page and withheld from a note',()=>{
  assert.doesNotMatch(toHTML('[Snow](https://example.org)'),/<a /);
  assert.match(toHTML('[Snow](https://example.org)',{links:true}),
    /<a href="https:\/\/example\.org" target="_blank" rel="noopener noreferrer">Snow<\/a>/);
});

/** MATHEMATICS IS LIFTED OUT BEFORE ANYTHING IS ESCAPED.
 *
 *  `<`, `>` and `&` are ordinary mathematics. Escaping a formula and then handing the result to a
 *  TeX parser produces `\lt` where the author wrote `<` -- a defect nobody sees until it is in a
 *  publication. */
test('a formula keeps the characters that are also markup',()=>{
  const html=toHTML('Risk where $a < b$ holds.');
  assert.match(html,/data-tex="a &lt; b"/);
  // What is shown before the converter loads is the LaTeX, dollars and all.
  assert.match(html,/\$a &lt; b\$/);
  assert.equal(equationsIn('$a < b$')[0].tex,'a < b');
});

test('a display formula stands on its own line, and an inline one does not',()=>{
  const display=toHTML('The rate is\n$$r = \\frac{d}{p} \\times 1000$$\nper 1,000.');
  assert.match(display,/<p class="prose-display">/);
  assert.match(display,/is-display/);
  assert.match(toHTML('written $r$ here'),/<p>written <span class="prose-math"/);
  assert.doesNotMatch(toHTML('written $r$ here'),/is-display/);
  const found=equationsIn('text $a$ more\n$$b$$\n');
  assert.deepEqual(found.map(f=>[f.tex,f.display]),[['a',false],['b',true]]);
});

test('a lone dollar sign is money, not mathematics',()=>{
  assert.deepEqual(equationsIn('it cost $5 and no more'),[]);
  assert.doesNotMatch(toHTML('it cost $5 and no more'),/prose-math/);
});

test('hasMarkup says whether there is anything to read differently',()=>{
  assert.equal(hasMarkup('Plain prose, with a comma.'),false);
  for(const marked of ['**bold**','`code`','- a list','1. a list','> a quote','$x$'])
    assert.equal(hasMarkup(marked),true,marked);
});

/** ONE DIALECT, MECHANISED.
 *
 *  `scripts/widget-manual.mjs` has compiled the manual since 2026-10-14. A second markdown in the
 *  same application would be a thing to learn twice, so this asserts the two agree on every
 *  construct both support. Where they differ it is because a note is not a manual page, and those
 *  differences are the tests above rather than a silent drift. */
test('it agrees with the manual’s compiler on everything both support',()=>{
  const shared=['A paragraph of **bold** and `code`.',
    '# A heading',
    '- one\n- two',
    '[Snow](https://example.org) cited.',
    'Two lines of\none paragraph.'];
  for(const source of shared)
    assert.equal(toHTML(source,{headings:true,links:true}),manualHTML(source),source);
});
