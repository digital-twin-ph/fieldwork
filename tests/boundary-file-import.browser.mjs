import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

/** A STUDY AREA IS WHERE POLYGONS COME IN.
 *
 *  The practitioner, 2026-10-24: *"Study area then for polygon input. I have mentioned before
 *  that a study area is actually a polygon input."* It is the second half of the direction
 *  `a-study-area-is-a-polygon`, stated 2026-10-22; the first half let Combined area take an area.
 *
 *  Of the five port types only `polygons` had no source widget. The answer was not a sixth
 *  source: a study area already held several published outlines with provenance naming each, and
 *  what it lacked was a door for a file and a record of which part was which. */
// ADJACENT, sharing borders, which is what administrative units are. Two squares meeting along
// an edge were refused until 2026-10-24 -- the practitioner: *"Study area can hold adjacent
// units, like North Kivu and Ituri Provinces for Ebola outbreak."*
const square=(x,y)=>({type:'Polygon',coordinates:[[[x,y],[x+0.02,y],[x+0.02,y+0.02],[x,y+0.02],[x,y]]]});
// Named by `subdist`, as the South London layer names them, so the name property is read and not
// guessed. One feature is a Point: a mixed file keeps its polygons rather than being refused.
const layer={type:'FeatureCollection',features:[
  {type:'Feature',properties:{subdist:'St. Olave Southwark'},geometry:square(-0.08,51.50)},
  {type:'Feature',properties:{subdist:'Rotherhithe'},geometry:square(-0.06,51.50)},
  {type:'Feature',properties:{subdist:'Peckham'},geometry:square(-0.04,51.50)},
  {type:'Feature',properties:{subdist:'a pump, not a boundary'},geometry:{type:'Point',coordinates:[-0.1,51.5]}}]};

const openArea=async page=>{
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=hagelloch');
  // WAIT FOR THE RUN BEFORE EDITING. The example auto-runs, and `change()` returns false while a
  // run is in flight, which the apply path reports as "Study area could not be saved. Retry
  // Apply." -- a message about storage for a condition that is nothing to do with storage. Same
  // class as the swallowed New project click (experiment 135); recorded in TODO.md.
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:120000});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="village"]').click();
  await expect(page.locator('#inspector-content'))
    .not.toContainText('Choose a node to inspect',{timeout:45000});
  await page.locator('#edit-study-area').click();
  await page.locator('#area-file-source summary').click();
};
const choose=(page,data)=>page.locator('#area-file-input').setInputFiles(
  {name:'sub-districts.geojson',mimeType:'application/geo+json',buffer:Buffer.from(JSON.stringify(data))});

test('a boundary file becomes named units, and each part keeps its name',async({page})=>{
  const errors=collectPageErrors(page);
  await openArea(page);
  await page.locator('#area-file-name-key').fill('subdist');
  await choose(page,layer);

  // THREE of four: the point is skipped and said to be skipped, rather than refusing the file.
  await expect(page.locator('#area-file-status')).toContainText('3 boundaries read');
  await expect(page.locator('#area-file-status')).toContainText('1 feature skipped');
  await expect(page.locator('#area-file-status')).toContainText('subdist');
  await expect(page.locator('#area-boundary-pick option')).toHaveCount(3);
  await expect(page.locator('#area-boundary-pick')).toContainText('Rotherhithe');

  await page.locator('#area-boundary-pick').selectOption(['0','1','2']);
  await page.locator('#area-boundary-use').click();
  // WAIT FOR THE ASSEMBLY, not for the button. #area-apply is already enabled from the example's
  // own study area, so clicking it on enablement alone races the async assembly and saves the
  // geometry that was there before -- which is how this test first "failed".
  await expect(page.locator('#area-boundary-terms')).toContainText('outlines as published');
  await expect(page.locator('#area-apply')).toBeEnabled();
  await page.locator('#area-apply').click();

  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1'))
    .nodes.find(n=>n.type==='study_area').params);
  // Three parts, as published -- not a bounding box around all of them.
  expect(saved.geometry.type).toBe('MultiPolygon');
  expect(saved.geometry.coordinates.length).toBe(3);
  expect(saved.selectionMode).toBe('polygon');
  // AND WHICH PART IS WHICH. This is the whole point: without it the only record was a
  // comma-joined unitName and no figure could be matched to a boundary.
  expect(saved.boundary.units.map(u=>u.name))
    .toEqual(['St. Olave Southwark','Rotherhithe','Peckham']);
  // Provenance states what a local file cannot tell us, rather than inventing it.
  expect(saved.boundary.licence).toBe('not stated');
  expect(saved.boundary.source).toContain('sub-districts.geojson');
  expect(errors).toEqual([]);
});

test('a file with no polygons says so and changes nothing',async({page})=>{
  await openArea(page);
  await choose(page,{type:'FeatureCollection',features:[
    {type:'Feature',properties:{name:'a pump'},geometry:{type:'Point',coordinates:[-0.1,51.5]}}]});
  await expect(page.locator('#area-file-status')).toContainText('no Polygon or MultiPolygon');
  await expect(page.locator('#area-boundary-units')).toBeHidden();
});
