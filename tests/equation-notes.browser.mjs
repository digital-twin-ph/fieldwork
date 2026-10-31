import {test,expect} from '@playwright/test';
import {readFileSync,existsSync} from 'node:fs';

/** THE EQUATIONS THE COMPUTATIONS MACHINED, ON THE NOTES TAB OF THE WORKED EXAMPLE.
 *
 *  The practitioner, 2026-10-30: *"The computation widgets, especially epi widgets, should emit
 *  equations of their computations, with corresponding citations. And these should show up on the
 *  Notes UI, under Methods."* Experiment 151, amendment of 2026-10-30.
 *
 *  `tests/equations.test.mjs` asserts what the notes SAY. This asserts the two things it cannot
 *  reach: that a run of South London puts them on the Notes tab under Methods at all, and that
 *  the LaTeX in them is typeset by the browser rather than left as the source it started as.
 *
 *  BOTH ENGINES, and the second is the one that matters here. MathML is rendered natively by
 *  Chromium and by WebKit, and the whole case for Temml over KaTeX in experiment 151 rests on
 *  that -- nothing is fetched when a formula is drawn and no font files are shipped. A
 *  Chromium-only result would not establish it, and Tauri on macOS runs WKWebView. */
test.use({serviceWorkers:'block'});

const BUNDLE=new URL('../../example-1855-cholera-south-london/fieldwork-project.json.gz',import.meta.url);
const skip=existsSync(BUNDLE)?false
  :'example-1855-cholera-south-london is not checked out beside this repository.';
const METHODS='.notes-part[data-section="Methods"]';

/** The one workflow that reaches a two-by-two, selected by name after the bundle is imported.
 *  The example opens on a different one, which is the mistake `notes-writing.browser.mjs`
 *  records having made first. */
const runWorkflow=async (page,named)=>{
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles(BUNDLE.pathname);
  await expect(page.locator('.toast')).toContainText(/imported with \d+ workflows/,{timeout:30000});
  await page.locator('[data-view="workflow"]').click();
  const option=page.locator('#workflow-select option',{hasText:named});
  await page.locator('#workflow-select').selectOption(await option.getAttribute('value'));
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('[data-view="notes"]').click();
  await page.locator('.notes-part').first().waitFor();
};

/** A card in Methods whose text contains `holds`. */
const methodsCard=(page,holds)=>
  page.locator(`${METHODS} .notes-note.k-machined`).filter({hasText:holds});

test('a two-by-two machines its equations into Methods, typeset',{skip},async({page})=>{
  await runWorkflow(page,'Died or survived, by water supply');
  const card=methodsCard(page,'The four cells');
  await expect(card).toHaveCount(1);
  // TYPESET BY THE BROWSER, not shown as its source. `prose.ts` leaves the LaTeX on the element
  // and `typeset` replaces it with MathML, so the presence of <math> is the whole claim: the
  // converter loaded, and the engine drew it.
  await expect(card.locator('math').first()).toBeVisible();
  // The three measures, each with its own equation.
  const math=card.locator('.prose-math.is-display');
  expect(await math.count()).toBeGreaterThanOrEqual(8);
  // AND THE SOURCE SURVIVES BESIDE THE RENDERING, which is what a machine where the chunk never
  // loads falls back to. Read off a DISPLAY formula: the first `[data-tex]` on this card is the
  // inline `$a$` that introduces the letters, which is correct and carries no fraction.
  await expect(math.first()).toHaveAttribute('data-tex',/\\frac/);
  // No formula was refused. `prose.ts` marks one it could not read, and a formula that silently
  // renders as nothing is the failure this check exists for.
  await expect(card.locator('.prose-math[title*="could not be read"]')).toHaveCount(0);
});

test('the cells are stated as a, b, c, d with what each one counts',{skip},async({page})=>{
  await runWorkflow(page,'Died or survived, by water supply');
  const card=methodsCard(page,'The four cells');
  // Experiment 147's vocabulary, on a surface for the first time. An FETP-trained reader is
  // taught these letters; `exposureColumn` and `caseValue` are this application's words.
  // THE FIRST LIST ON THE CARD. The second is the reference list, which is a list for the same
  // reason the cells are -- a note carries no table (experiment 151) -- so `li` alone counts
  // both and the first version of this test asserted 4 against 7.
  const cells=card.locator('ul').first().locator('li');
  await expect(cells).toHaveCount(4);
  await expect(cells.nth(0)).toContainText('844');
  await expect(cells.nth(3)).toContainText('19,115');
  // The letter itself is typeset too, so the bullet reads as mathematics and the formulas below
  // are written in the same notation the bullets introduced.
  await expect(cells.nth(0).locator('math')).toHaveCount(1);
});

test('the card names its methods and sends the works to References',{skip},async({page})=>{
  // The practitioner, 2026-10-31, reading this card in South London: *"these are citations and
  // should be in the References."* The card printed every method's full citation while the
  // References part assembled the same works from the same field.
  await runWorkflow(page,'Died or survived, by water supply');
  const card=methodsCard(page,'The four cells');
  await expect(card).toContainText('Katz log');
  await expect(card).toContainText('Wald log');
  await expect(card).toContainText('The works are in References.');
  // AND NOT THE BIBLIOGRAPHY, asserted as an absence because that is what was removed.
  await expect(card).not.toContainText('Katz D, Baptista J');
  await expect(card).not.toContainText('doi:');
  // THE UNSOURCED METHOD IS STILL MARKED. A missing mark would read as "nothing to say" when it
  // means "nobody has looked it up", which are different claims; the sentence saying so in full
  // is in References.
  await expect(card).toContainText('Wald unpooled (no primary source read)');
});

test('a rate machines its equation, and cites nothing because it estimates nothing',
  {skip},async({page})=>{
    await runWorkflow(page,'Deaths per 1,000 people, by sub-district');
    const card=methodsCard(page,'divided by');
    await expect(card).toHaveCount(1);
    await expect(card.locator('math').first()).toBeVisible();
    // The figure this repository reports for Snow's Table VIII, reached through the application
    // rather than asserted in a unit test over a fixture.
    await expect(card).toContainText('3.109');
    await expect(card).toContainText('No interval is computed here, so no method is cited');
  });

test('a machined equation survives a reload and is still the same note',{skip},async({page})=>{
  await runWorkflow(page,'Died or survived, by water supply');
  await expect(methodsCard(page,'The four cells')).toHaveCount(1);
  await page.reload();
  await page.locator('[data-view="notes"]').click();
  await page.locator('.notes-part').first().waitFor();
  // CORRECTED 2026-10-30, SAME DAY. This asserted the note was ABSENT after a reload, with the
  // reasoning that *"a machined note comes from the last run and not from the project"*. That
  // described the implementation and not the model: the practitioner's ruling hours later was
  // that the write-up *"is supposed to hold notes from all workflows in that project"*, and a
  // publication that empties itself on reload is the same defect one step smaller. The write-up
  // is now kept; what the old assertion was protecting against -- an equation whose numbers no
  // longer match the canvas -- is handled by carrying the run date rather than by forgetting.
  await expect(methodsCard(page,'The four cells')).toHaveCount(1);
  // And it is the SAME note, not a re-machined one: the id is derived from the node.
  const keys=await methodsCard(page,'The four cells')
    .evaluateAll(ns=>ns.map(n=>n.getAttribute('data-note')));
  expect(keys[0]).toContain(':equation');
});

/** WHAT THE ARTIFACTS DECLARE ABOUT THEMSELVES, which is the same thread one step on: *"We need
 *  to add the tables next, then maps, then charts as machined notes."* A table, a map and a chart
 *  are what a Results section is mostly made of, and until 2026-10-30 not one of them put a word
 *  into the write-up.
 *
 *  NOT CAPTIONS. *"Captions are the user's responsibility, unless there is a way to machine it
 *  based on table, map, chart or equation semantics."* What is machined is read off declarations;
 *  the caption is the author's and is written beside it. */
const RESULTS='.notes-part[data-section="Results"]';
const described=page=>page.locator(`${RESULTS} .notes-note.k-machined`);

test('a table and a chart describe themselves into Results',{skip},async({page})=>{
  await runWorkflow(page,'Deaths per 1,000 people, by sub-district');
  await expect(described(page)).toHaveCount(2);
  const table=described(page).filter({hasText:'Mortality by sub-district'});
  // THE COLUMNS AS THE TABLE SPELLS THEM, in code spans, rather than forced into prose. On this
  // example that is `group` and a value field that is itself a unit phrase.
  await expect(table.locator('code')).toContainText(['group','per 1,000 people']);
  await expect(table).toContainText('32 rows');
  const chart=described(page).filter({hasText:'ranked'});
  await expect(chart).toContainText('32 bars');
  // The chart's own caption, which has existed since before any of this and reached no write-up.
  await expect(chart).toContainText('(proportion)');
});

test('a map describes its layers, bottom to top',{skip},async({page})=>{
  await runWorkflow(page,'The ground: an extent, its sub-districts and the river');
  const map=described(page).filter({hasText:'bottom to top'});
  await expect(map).toHaveCount(1);
  await expect(map).toContainText('4 layers, bottom to top');
  // Read off `mapLayers`, the same list the figure and the key draw from, so the caption cannot
  // disagree with the picture. Feature counts come with it.
  await expect(map).toContainText('Registration sub-districts (32 features)');
});

test('nothing machined numbers its own artifact, or claims to be the caption',{skip},
  async({page})=>{
    // Two rules at once, both the practitioner's. A number is computed per venue when a document
    // is rendered, so writing one would be wrong the first time a card moved; and the caption is
    // the author's, so nothing machined may present itself as one.
    await runWorkflow(page,'Died or survived, by water supply');
    for(const text of await described(page).allTextContents()){
      expect(text).not.toMatch(/\b(Table|Figure|Chart|Exhibit)\s+\d+\b/i);
      expect(text).not.toMatch(/\bcaption\b/i);
    }
  });
