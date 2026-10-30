import {test,expect} from '@playwright/test';
import {readFileSync,existsSync} from 'node:fs';

/** FORMATTING AND LATEX, IN THE RUNNING APPLICATION.
 *
 *  `tests/prose.test.mjs` covers the dialect. This covers the two things a unit test cannot see:
 *  that the toolbar writes markdown a person could have typed, and that a formula is actually
 *  typeset by the browser rather than left as the LaTeX it started as.
 *
 *  THE CONVERTER IS A LAZY CHUNK, 212KB against an `app.js` of 333KB, loaded only where there is
 *  mathematics -- so these assertions are also the check that it loads at all. It is precached
 *  like every other generated output, because mathematics is as useful offline as anything else
 *  here; the MapLibre renderer is excluded from the precache for the opposite reason. */
test.use({serviceWorkers:'block'});

const BUNDLE=new URL('../../example-1855-cholera-south-london/fieldwork-project.json.gz',import.meta.url);
const skip=existsSync(BUNDLE)?false
  :'example-1855-cholera-south-london is not checked out beside this repository.';
const bundle=skip?Buffer.alloc(0):readFileSync(BUNDLE);
const RESULTS='.notes-part[data-section="Results"]';

const southLondon=async page=>{
  await page.route(/raw\.githubusercontent\.com/,route=>route.fulfill({status:200,body:bundle}));
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('[data-view="project"]').click();
  await page.locator('[data-open-example]').click();
  await expect(page.locator('[data-example-status]')).toContainText('digest matched',{timeout:20000});
  await page.locator('[data-view="notes"]').click();
  await page.locator('.notes-part').first().waitFor();
};

test('a note is written in markdown and read as markdown',{skip},async({page})=>{
  await southLondon(page);
  await page.locator(RESULTS).locator('[data-add-note]').first().click();
  await page.locator('#note-text').fill(
    'The **Lambeth** company had moved its intake.\n\n- above the tidal limit\n- in 1852');
  // THE PREVIEW IS THE ONLY WAY TO SEE IT while writing. Markdown with nothing to read it back
  // is a format somebody has to hold in their head.
  const preview=page.locator('#note-preview');
  await expect(preview).toBeVisible();
  await expect(preview.locator('strong')).toHaveText('Lambeth');
  await expect(preview.locator('li')).toHaveCount(2);
  await page.locator('#note-save').click();
  await expect(page.locator('#note-dialog')).not.toBeVisible();
  // And on the card, which is where the write-up is read.
  const card=page.locator(`${RESULTS} .notes-note`).filter({hasText:'had moved its intake'});
  await expect(card.locator('.prose strong')).toHaveText('Lambeth');
  await expect(card.locator('.prose li')).toHaveCount(2);
  // WHAT IS STORED IS WHAT WAS TYPED. Markdown is plain text, so reopening shows the source --
  // not HTML, and not a second format for the receipt and the counts to learn.
  await card.locator('[data-note-open]').click();
  await expect(page.locator('#note-text')).toHaveValue(/\*\*Lambeth\*\*/);
});

test('a plain note is not given a preview it does not need',{skip},async({page})=>{
  await southLondon(page);
  await page.locator(RESULTS).locator('[data-add-note]').first().click();
  await page.locator('#note-text').fill('Plain prose, which needs no second reading.');
  // The same words twice is noise, not help.
  await expect(page.locator('#note-preview')).toBeHidden();
});

test('the toolbar writes markdown, not formatting of its own',{skip},async({page})=>{
  await southLondon(page);
  await page.locator(RESULTS).locator('[data-add-note]').first().click();
  const area=page.locator('#note-text');
  await area.fill('the Lambeth company');
  // Select "Lambeth" and press Bold: what lands in the field is what somebody could have typed.
  await area.evaluate(el=>{el.selectionStart=4;el.selectionEnd=11;});
  await page.locator('[data-wrap="**"]').click();
  await expect(area).toHaveValue('the **Lambeth** company');
  // A line button starts every line it covers, and numbers them where that is the kind.
  await area.fill('above the tidal limit\nin 1852');
  await area.evaluate(el=>{el.selectionStart=0;el.selectionEnd=el.value.length;});
  await page.locator('[data-line="1. "]').click();
  await expect(area).toHaveValue('1. above the tidal limit\n2. in 1852');
});

test('a formula is typeset, and its source is what shows until it is',{skip},async({page})=>{
  await southLondon(page);
  await page.locator(RESULTS).locator('[data-add-note]').first().click();
  await page.locator('#note-text').fill(
    'Deaths per 1,000 is\n\n$$r = \\frac{d}{p} \\times 1000$$\n\nwith $d$ the deaths.');
  // MathML, produced in the browser from the LaTeX. Nothing is fetched to render it.
  const preview=page.locator('#note-preview');
  await expect(preview.locator('math')).toHaveCount(2,{timeout:20000});
  await expect(preview.locator('.prose-display math')).toHaveCount(1);
  await expect(preview.locator('mfrac')).toHaveCount(1);
  await page.locator('#note-save').click();
  const card=page.locator(`${RESULTS} .notes-note`).filter({hasText:'Deaths per 1,000 is'});
  await expect(card.locator('math')).toHaveCount(2,{timeout:20000});
  // The stored note is still the LaTeX somebody wrote, which is what experiment 141 settled.
  await card.locator('[data-note-open]').click();
  await expect(page.locator('#note-text')).toHaveValue(/\\frac\{d\}\{p\}/);
});

test('a formula that is not LaTeX keeps its source and says so',{skip},async({page})=>{
  await southLondon(page);
  await page.locator(RESULTS).locator('[data-add-note]').first().click();
  await page.locator('#note-text').fill('Broken: $\\frac{1}$ here.');
  const broken=page.locator('#note-preview .prose-math');
  // NOT A BLANK. A formula that silently renders as nothing is worse than one that renders as
  // the TeX somebody typed, because only one of the two can be corrected by reading it.
  await expect(broken).toHaveAttribute('data-typeset','failed',{timeout:20000});
  await expect(broken).toContainText('\\frac{1}');
  await expect(broken).toHaveAttribute('title',/could not be read as LaTeX/);
});
