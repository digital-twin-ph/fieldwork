import {test,expect} from './fixtures.mjs';
import {readFileSync,existsSync} from 'node:fs';
import {collectPageErrors} from './page-errors.mjs';
import {inMapSettings} from './map-settings.mjs';

/** THE TABLE UNDER THE MAP (the practitioner's choice, 2026-11-14), on Salmonella's Länder: one row per Land with every
 *  attribute the polygons carry, sortable, and linked both ways, on the static figure and on the interactive map.
 *  Baden-Württemberg has the most cases, 11, counted from the published CSV. */
test.use({serviceWorkers:'block'});
const BUNDLE=new URL('../../example-2021-salmonella-germany/fieldwork-project.json.gz',import.meta.url);
const skip=existsSync(BUNDLE)?false:'example-2021-salmonella-germany is not checked out beside this repository.';
const ID='urn:fieldwork:example:salmonella-germany-2021';

test('the table under a map lists each place with its attributes and finds it on the map, and the reverse',async({page})=>{
  test.skip(!!skip,skip);test.setTimeout(240000);
  const errors=collectPageErrors(page);
  const bundle=readFileSync(BUNDLE);
  await page.route(/raw\.githubusercontent\.com\/digital-twin-ph\/example-2021-salmonella-germany\/[^/]+\/fieldwork-project\.json\.gz/,r=>r.fulfill({status:200,body:bundle}));
  await page.route(/tile\.openstreetmap\.org/,r=>r.abort());
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('[data-view="project"]').click();
  await page.locator(`[data-open-example="${ID}"]`).click();
  await expect(page.locator(`[data-example-status="${ID}"]`)).toContainText('digest matched',{timeout:60000});
  await page.locator('[data-view="workflow"]').click();
  const option=page.locator('#workflow-select option',{hasText:'Where did the cases live?'});
  await page.locator('#workflow-select').selectOption(await option.getAttribute('value'));
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:90000});
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'Cases by federal state'}).click();

  // THE STATIC FIGURE. Sixteen rows, the columns as the file and the join spell them.
  const parts=page.locator('#map-parts');
  await expect(parts).toContainText('Attributes of the 16 places');
  await expect(parts.locator('tbody tr')).toHaveCount(16);
  for(const column of ['shapeName','shapeISO','cases','iso'])await expect(parts.locator('thead')).toContainText(column);
  // Sorted by cases, highest first: Baden-Württemberg, 11.
  await parts.locator('[data-parts-sort="cases"]').click();
  await parts.locator('[data-parts-sort="cases"]').click();
  await expect(parts.locator('th[aria-sort="descending"]')).toContainText('cases');
  await expect(parts.locator('tbody tr').first()).toContainText('Baden-Württemberg');
  await expect(parts.locator('tbody tr').first()).toContainText('11');
  // A row chosen marks its place; a place chosen marks its row.
  const bw=await parts.locator('tbody tr').first().getAttribute('data-map-part');
  await parts.locator('tbody tr').first().click();
  await expect(page.locator(`#map [data-catchment="${bw}"]`).first()).toHaveClass(/part-chosen/);
  const be=await parts.locator('tbody tr',{hasText:'Berlin'}).getAttribute('data-map-part');
  await page.locator(`#map [data-catchment="${be}"]`).first().dispatchEvent('click');
  await expect(parts.locator(`tr[data-map-part="${be}"]`)).toHaveAttribute('aria-selected','true');
  await expect(page.locator(`#map [data-catchment="${bw}"].part-chosen`)).toHaveCount(0);

  // THE INTERACTIVE MAP, the same table and the same link.
  await page.locator('[data-view="workflow"]').click();
  const map=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.type==='map_output').id);
  await page.locator(`.react-flow__node[data-id="${map}"]`).click();
  await inMapSettings(page,d=>d.locator('#polygon-presentation').selectOption('interactive'));
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:90000});
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'Cases by federal state'}).click();
  await expect(page.locator('#catchment-map-host .leaflet-container')).toBeVisible();
  await expect(parts.locator('tbody tr')).toHaveCount(16);
  await parts.locator('tbody tr',{hasText:'Bayern'}).click();
  await expect(page.locator('.leaflet-popup-content')).toContainText('DE-BY');
  expect(errors).toEqual([]);
});
