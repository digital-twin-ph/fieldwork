import {test,expect} from '@playwright/test';
import {existsSync} from 'node:fs';
import {collectPageErrors} from './page-errors.mjs';

/** A RATE, ON THE GROUND IT WAS MEASURED OVER.
 *
 *  Snow's Table VIII is 32 sub-districts of deaths and population; the boundary is 33 polygons,
 *  because Streatham is two parts and both carry its rate. Until `join_table_to_area` the two
 *  could not meet, and the only map this repository could draw from measured values was a dot
 *  map of where people lived -- which is mostly a map of where people lived.
 *
 *  Two defects are pinned here, both found on 2026-10-25 running this workflow for the first
 *  time. The execution case read `inputs.table` when the port is named `records`, so the run
 *  failed with "Cannot read properties of undefined (reading 'keys')" and named neither port.
 *  And the figure's key was a fixed string naming sites, observations and modeled catchments --
 *  none of which a choropleth of sub-district mortality carries. */

const BUNDLE=new URL('../../example-1855-cholera-south-london/fieldwork-project.json.gz',import.meta.url);
const skip=existsSync(BUNDLE)?false
  :'example-1855-cholera-south-london is not checked out beside this repository.';

test('a table of rates joins to named parts and draws a classed figure',{skip},async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles(BUNDLE.pathname);
  await expect(page.locator('.toast')).toContainText('imported with 6 workflows',{timeout:30000});

  await page.locator('[data-view="workflow"]').click();
  const mapped=page.locator('#workflow-select option',{hasText:'Deaths per 1,000 people, mapped'});
  await page.locator('#workflow-select').selectOption(await mapped.getAttribute('value'));

  // THE COLUMN IS OFFERED, not typed. The rate upstream is not a table_input, and offering only
  // a table_input's keys left this control saying "Connect a table first" with a table connected.
  await page.locator('.react-flow__node[data-id="shaded"]').click();
  await expect(page.locator('#join-key')).toHaveValue('group');
  await expect(page.locator('#join-key option')).toHaveCount(2); // the prompt, and `group`

  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});

  await page.locator('[data-view="results"]').click();
  // 33 parts for 32 sub-districts: Streatham is two polygons and both take its rate, which is
  // true of a rate and would not be true of a count.
  const polygons=page.locator('#map path[data-catchment]');
  await expect(polygons).toHaveCount(33);
  const fills=await polygons.evaluateAll(els=>els.map(e=>e.getAttribute('fill')));
  expect(new Set(fills).size).toBe(5);

  // Every part that took a value carries it, so a reader can check a shade against the table.
  expect(await polygons.evaluateAll(els=>els.filter(e=>e.hasAttribute('data-value')).length))
    .toBe(33);

  // THE KEY SAYS WHAT IS DRAWN. No sites and no observations are on this figure, so neither is
  // named; the breaks are printed because a shade without them says only "more" and "less".
  const text=(await page.locator('#map text').allTextContents()).join(' · ');
  expect(text).toContain('Polygon shade: the joined value');
  expect(text).toContain('5 quantile classes');
  expect(text).not.toContain('modeled catchments');
  expect(text).not.toContain('Squares: sites');
  expect(errors).toEqual([]);
});
