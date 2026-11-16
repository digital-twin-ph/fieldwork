import {test,expect} from './fixtures.mjs';
import {readFileSync,existsSync} from 'node:fs';
import {collectPageErrors} from './page-errors.mjs';

/** THE DRAFT AS A PUBLICATION, A SURVEILLANCE REPORT OR A SIT REP, AND A FIGURE'S PLACE IN EACH (experiment 202, 2026-11-15).
 *  The practitioner: notes' text and images resizable, "so that polished charts, maps and graphs can be inserted side
 *  by side or "inserted" like in Word". On South London, opened from its repository so its write-up can be kept. */
test.use({serviceWorkers:'block'});
const REPO=new URL('../../example-1855-cholera-south-london/',import.meta.url);
const skip=existsSync(REPO)?false:'example-1855-cholera-south-london is not checked out beside this repository.';

test('Draft as: a WHO-style sit rep with two figures side by side, one left out, kept when the draft is opened again',async({page})=>{
  test.skip(!!skip,skip);test.setTimeout(400000);
  const errors=collectPageErrors(page);
  await page.setViewportSize({width:1300,height:1600});
  await page.route(/raw\.githubusercontent\.com\/digital-twin-ph\/example-1855-cholera-south-london\/[0-9a-f]{40}\//,route=>{
    const path=new URL(route.request().url()).pathname.split('/').slice(4).join('/');
    route.fulfill({status:200,body:readFileSync(new URL(path,REPO)),headers:{'access-control-allow-origin':'*'}});});
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await expect(page.locator('html[data-ready="true"]')).toHaveCount(1,{timeout:30000});
  await page.locator('[data-view="project"]').click();
  await page.locator('[data-open-example="urn:fieldwork:example:south-london-1854"]').click();
  await expect(page.locator('[data-example-status="urn:fieldwork:example:south-london-1854"]')).toContainText('digest matched',{timeout:30000});
  await page.locator('[data-view="notes"]').click();
  const pending=page.locator('[data-run-pending]');
  if(await pending.count()){await pending.click();await expect(page.locator('.toast').last()).toContainText('ran',{timeout:300000});}
  await page.locator('[data-view="notes"]').click();
  await page.locator('[data-publication]').click();
  const view=page.locator('#publication-view'),paper=view.locator('.publication-page');
  await view.locator('[data-publication-kind]').selectOption('sitrep-who');
  await expect(paper.locator('.pub-kicker')).toHaveText('Situation report');
  for(const heading of ['Highlights','Situation in numbers','Epidemiological update','Risk assessment','Preparedness and response','Data notes'])
    await expect(paper.locator('h2',{hasText:heading})).toHaveCount(1);
  await expect(paper.locator('h2',{hasText:'Abstract'})).toHaveCount(0);
  await expect(paper.locator('.pub-follows')).toContainText('WHO situation reports');
  // Switched to the OCHA style and back: what is laid out follows the format, and the kind is kept.
  await view.locator('[data-publication-kind]').selectOption('sitrep-ocha');
  await expect(paper.locator('h2',{hasText:'Operational gaps and challenges'})).toHaveCount(1);
  await view.locator('[data-publication-kind]').selectOption('sitrep-who');
  // The first figure half width, side by side with the next; the first table left out.
  const figure=()=>paper.locator('.pub-figure[data-pub-note]').first();
  const id=await figure().getAttribute('data-pub-note');
  await figure().locator('[data-pub-width]').selectOption('half');
  await paper.locator(`[data-pub-note="${id}"] [data-pub-place]`).selectOption('beside');
  const table=paper.locator('.pub-table[data-pub-note]').first(),tableId=await table.getAttribute('data-pub-note');
  await table.locator('[data-pub-place]').selectOption('out');
  await expect(paper.locator(`.pub-left-out[data-pub-note="${tableId}"]`)).toHaveCount(1);
  const row=paper.locator('.pub-row').first();
  await expect(row.locator(':scope > *')).toHaveCount(2);
  const same=async()=>{const [a,b]=[await row.locator(':scope > *').nth(0).boundingBox(),await row.locator(':scope > *').nth(1).boundingBox()];
    return Math.abs(a.y-b.y)<2&&b.x>a.x+a.width-4;};
  expect(await same(),'side by side on screen').toBe(true);
  await page.emulateMedia({media:'print'});
  expect(await same(),'side by side in print').toBe(true);
  await expect(paper.locator('.pub-layout').first()).toBeHidden();
  await expect(paper.locator('.pub-left-out')).toBeHidden();
  await page.emulateMedia({media:'screen'});
  // Figures numbered in the order drawn.
  const numbers=(await paper.locator('.pub-caption strong:first-child').allTextContents()).filter(t=>/^Figure/.test(t));
  expect(numbers).toEqual(numbers.map((_,i)=>`Figure ${i+1}.`));
  // Closed and opened again: the kind and the layout were kept with the project.
  await view.locator('[data-publication-back]').click();
  await page.locator('[data-publication]').click();
  await expect(view.locator('[data-publication-kind]')).toHaveValue('sitrep-who');
  await expect(paper.locator(`[data-pub-note="${id}"]`)).toHaveClass(/pub-w-half pub-p-beside/);
  await expect(paper.locator(`.pub-left-out[data-pub-note="${tableId}"]`)).toHaveCount(1);
  await page.screenshot({path:'test-results/draft-sitrep.png'});
  expect(errors).toEqual([]);
});
