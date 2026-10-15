import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

// "I like #4 because selecting the study area should automatically suggest the UTM zone and the
// pros and cons for selecting a particular one if there is more than one possible choice."
// -- the practitioner, 2026-10-15.
//
// The suggestion existed and was shown only on widgets that ALREADY have a zone, which is after
// the decision has been made. A study area has no zone of its own and is where the zone is
// decided: everything measured afterwards inherits what the first measuring widget was given.
test('a study area suggests the zone before any widget carries one',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=coverage');
  await page.locator('.react-flow__node[data-id="scope"]').click();
  const advice=page.locator('[data-zone-advice]');
  await expect(advice).toBeVisible();
  await expect(advice).toContainText('Measuring in metres will use UTM zone');
  // It says what it is NOT doing, because a suggestion that looks like a setting is worse than
  // no suggestion.
  await expect(advice).toContainText('Nothing is set here');
  await expect(advice).toContainText('%');
  expect(errors).toEqual([]);
});

test('an area spanning two zones names each candidate and what it costs',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('#node-library [data-add="study_area"]').click();
  // A box straddling the zone 30/31 boundary at 6°E. No single zone is right for it, which is
  // the case the practitioner asked about.
  await page.evaluate(()=>{
    const key='fieldwork-workflow-v1';
    const w=JSON.parse(localStorage.getItem(key));
    const area=w.nodes.find(n=>n.type==='study_area');
    area.params.source='drawn';area.params.selectionMode='bbox';
    area.params.geometry={type:'Polygon',coordinates:[[[4.5,48],[7.5,48],[7.5,49],[4.5,49],[4.5,48]]]};
    delete w.manifest;
    localStorage.setItem(key,JSON.stringify(w));
    const workspaces=JSON.parse(localStorage.getItem('fieldwork-examples-v1')||'{}');
    workspaces.blank=w;localStorage.setItem('fieldwork-examples-v1',JSON.stringify(workspaces));
  });
  await page.reload();
  await page.locator('.react-flow__node').first().click();
  const advice=page.locator('[data-zone-advice]');
  await expect(advice).toContainText('no single zone is right');
  await expect(advice).toContainText('which side to keep whole');
  // Both candidates, each with the worst stretch it would cost — the pros and cons, as numbers.
  const rows=advice.locator('tbody tr');
  await expect(rows).toHaveCount(2);
  await expect(advice).toContainText('holds most of the area');
  // And why a stretch matters: it is systematic, not random.
  await expect(advice).toContainText('wrong in the same direction');
  expect(errors).toEqual([]);
});
