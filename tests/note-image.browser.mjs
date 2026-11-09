import {test,expect} from '@playwright/test';
import {readFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';

/** A PICTURE IN A NOTE (experiment 196). The practitioner, 2026-11-08: an authored note can carry an image, kept by its
 *  digest, with required alt text and a caption, shown on the Notes board and in the write-up; an SVG is shown as an
 *  image, never inlined. Driven on South London's published bundle, as `notes-writing.browser.mjs` is, with the
 *  vertical-datum diagram from this repository. */
test.use({serviceWorkers:'block'});

const BUNDLE=new URL('../../example-1855-cholera-south-london/fieldwork-project.json.gz',import.meta.url);
const skip=existsSync(BUNDLE)?false:'example-1855-cholera-south-london is not checked out beside this repository.';
const bundle=skip?Buffer.alloc(0):readFileSync(BUNDLE);
const DIAGRAM=new URL('../docs/images/vertical-datums.svg',import.meta.url).pathname;
const digest=createHash('sha256').update(readFileSync(DIAGRAM)).digest('hex');
const INTRO='.notes-part[data-section="Introduction"]';

test('a note carries a picture with its alt text and caption, kept by digest, and the project file carries it',async({page})=>{test.skip(!!skip,skip);
  await page.route(/raw\.githubusercontent\.com/,route=>route.fulfill({status:200,body:bundle}));
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('[data-view="project"]').click();
  await page.locator('[data-open-example="urn:fieldwork:example:south-london-1854"]').click();
  await expect(page.locator('[data-example-status="urn:fieldwork:example:south-london-1854"]')).toContainText('digest matched',{timeout:20000});
  await page.locator('[data-view="notes"]').click();
  await page.locator('.notes-part').first().waitFor();

  await page.locator(INTRO).locator('[data-add-note]').first().click();
  await page.locator('#note-text').fill('A height means nothing until it says what it is measured from.');
  await page.locator('[data-note-tab="image"]').click();
  await page.locator('#note-image-file').setInputFiles(DIAGRAM);
  await expect(page.locator('#note-image-preview img')).toHaveAttribute('src',/^data:image\/svg\+xml;base64,/);
  await expect(page.locator('[data-note-tab="image"]')).toHaveText('Image (1)');
  // BOTH ARE REQUIRED, and saying so is the refusal.
  await page.locator('#note-save').click();
  await expect(page.locator('#note-status')).toContainText('Alt text is required');
  await expect(page.locator('#note-dialog')).toBeVisible();
  await page.locator('#note-image-alt').fill('A cross-section of a low coast: the ellipsoid, the geoid, local mean sea level and a projected sea level.');
  await page.locator('#note-image-caption').fill('Heights and the surfaces they are measured from. Not to scale.');
  await page.locator('#note-save').click();
  await expect(page.locator('#note-dialog')).not.toBeVisible();

  // ON THE BOARD, as an image: never the SVG's own markup in the page.
  const figure=page.locator(INTRO).locator('figure.notes-image');
  await expect(figure.locator('img')).toHaveAttribute('alt',/A cross-section of a low coast/);
  await expect(figure.locator('figcaption')).toHaveText('Heights and the surfaces they are measured from. Not to scale.');
  expect(await page.locator(INTRO).locator('svg text').count()).toBe(0);
  expect(await figure.locator('img').evaluate(img=>img.naturalWidth)).toBeGreaterThan(0);

  // KEPT, so it is there after a reload: the note holds the digest, the store holds the bytes.
  await page.reload();
  await page.locator('[data-view="notes"]').click();
  await page.locator('.notes-part').first().waitFor();
  await expect(page.locator(INTRO).locator('figure.notes-image img')).toHaveAttribute('src',/^data:image\/svg\+xml;base64,/);

  // AND IT TRAVELS: the exported project carries the bytes under the digest the note names.
  await page.locator('[data-view="project"]').click();
  await page.locator('#storage-status').click();
  const block=page.locator('.project-view-block').filter({hasText:'South London'}).first();
  const download=page.waitForEvent('download');
  await block.locator('button[data-export-project]').click();
  const file=JSON.parse(gunzipSync(readFileSync(await (await download).path())).toString());
  const note=file.project.notes.find(n=>n.image);
  expect(note.image.sha256).toBe(digest);
  expect(file.images[digest].data.startsWith('data:image/svg+xml;base64,')).toBe(true);
});
