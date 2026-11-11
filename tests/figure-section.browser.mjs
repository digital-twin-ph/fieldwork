import {test,expect} from './fixtures.mjs';
import {inMapSettings} from './map-settings.mjs';
import {readFileSync,existsSync} from 'node:fs';

/** AN OUTPUT'S FIGURE GOES WHERE THE PRACTITIONER PUTS IT. The practitioner, 2026-11-05: *"all output widgets may have
 *  default IMRAD sections but it should be flexible."* South London's ground map, moved from Results to the
 *  Introduction in the Inspector, is filed there in Notes after a run, and the receipt says so. */
test.use({serviceWorkers:'block'});

const BUNDLE=new URL('../../example-1855-cholera-south-london/fieldwork-project.json.gz',import.meta.url);
const skip=existsSync(BUNDLE)?false
  :'example-1855-cholera-south-london is not checked out beside this repository.';
const bundle=skip?Buffer.alloc(0):readFileSync(BUNDLE);
const MAP='Sub-districts of South London';

test('a map moved to the Introduction is filed there, and Results is the default',async({page})=>{test.skip(!!skip,skip);
  await page.route(/raw\.githubusercontent\.com/,route=>route.fulfill({status:200,body:bundle}));
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('[data-view="project"]').click();
  await page.locator('[data-open-example="urn:fieldwork:example:south-london-1854"]').click();
  await expect(page.locator('[data-example-status="urn:fieldwork:example:south-london-1854"]')).toContainText('digest matched',{timeout:20000});

  await page.locator('[data-view="workflow"]').click();
  const ground=page.locator('#workflow-select option',{hasText:'The ground'});
  await page.locator('#workflow-select').selectOption(await ground.getAttribute('value'));
  await page.locator('.react-flow__node[data-id="where"]').click();
  // Where it can be found: in the map's Configure… (experiment 186), not at the foot of the Inspector.
  await inMapSettings(page,async d=>{
    const section=d.locator('#output-section');
    await expect(section).toHaveValue('Results');
    await expect(section.locator('option[value="Results"]')).toHaveText('Results (default)');
    await expect(section.locator('option')).toHaveCount(4);
    await section.selectOption('Introduction');
  });
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
  expect(saved.nodes.find(n=>n.id==='where').params.section).toBe('Introduction');

  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('[data-view="notes"]').click();
  // Two: the figure's note and its basemap's, which goes where the figure goes (OpenStreetMap by default, 2026-11-10).
  await expect(page.locator('.notes-part[data-section="Introduction"] .notes-note',{hasText:MAP})).toHaveCount(2,{timeout:20000});
  await expect(page.locator('.notes-part[data-section="Results"] .notes-note',{hasText:MAP})).toHaveCount(0);

  // Back to the default: the choice is removed rather than stored as Results, so the receipt says it was not chosen.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="where"]').click();
  await inMapSettings(page,d=>d.locator('#output-section').selectOption('Results'));
  const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
  expect(after.nodes.find(n=>n.id==='where').params.section).toBeUndefined();
});
