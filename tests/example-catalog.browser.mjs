import {test,expect} from './fixtures.mjs';
import {readFileSync,existsSync} from 'node:fs';
import {collectPageErrors} from './page-errors.mjs';
const catalog=JSON.parse(readFileSync(new URL('../widgets/examples.json',import.meta.url),'utf8'));

/** THE CATALOG HAS A SURFACE, and refusing is part of it.
 *
 *  The practitioner, 2026-10-24: *"How do I load South London in FW? Is it in manifest?"* It was
 *  pinned in `widgets/examples.json` by commit, per-file digest and licence, and nothing read any
 *  of it -- the only way in was a URL you had to know. These check both halves of what the
 *  governance promises: fetched only on an explicit action, and refused rather than partly loaded
 *  when the bytes are not the bytes that were pinned.
 *
 *  The network is stubbed. A test that reached raw.githubusercontent.com would be measuring
 *  GitHub's uptime, and would stop working the moment the example is re-pinned. */
test.use({serviceWorkers:'block'});

// The bytes come from the example repository beside this one, so the stub serves what the
// catalog actually pins rather than a fixture that could drift from it. Checked out or not is
// said plainly, on the same terms as the validation lab: a link verified against nothing is the
// defect, and a test that silently passes without its subject is the same defect wearing green.
const BUNDLE=new URL('../../example-1855-cholera-south-london/fieldwork-project.json.gz',import.meta.url);
const skip=existsSync(BUNDLE)?false
  :'example-1855-cholera-south-london is not checked out beside this repository, so the bytes the catalog pins are not here to serve.';
const bundle=skip?Buffer.alloc(0):readFileSync(BUNDLE);

const openProjects=async page=>{
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('[data-view="project"]').click();
  await expect(page.locator('#project-examples')).toBeVisible();
};

test('a curated example is listed with its terms, and is not fetched until asked',async({page})=>{test.skip(!!skip,skip);
  const errors=collectPageErrors(page);
  let requests=0;
  await page.route(/raw\.githubusercontent\.com/,route=>{requests++;
    route.fulfill({status:200,body:bundle});});
  await openProjects(page);

  const row=page.locator('#project-examples-list');
  await expect(row).toContainText("Snow's South London");
  await expect(row).toContainText('Not fetched yet');
  await expect(row).toContainText('CC0-1.0');
  // NOTHING IS FETCHED ON LOAD. The catalog's own fetch policy, which an interface can break
  // silently: listing an example must cost nothing until the practitioner asks for it.
  expect(requests).toBe(0);

  await page.locator('[data-open-example="urn:fieldwork:example:south-london-1854"]').click();
  await expect(page.locator('[data-example-status="urn:fieldwork:example:south-london-1854"]')).toContainText('digest matched',{timeout:20000});
  expect(requests).toBe(1);
  // It opened: the workflow is on the canvas and is the one the example publishes.
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('.react-flow__node[data-id="mortality"]')).toBeVisible();
  // And it is marked as held on this device, which is the FETCHABLE/AVAILABLE distinction the
  // governance requires the interface to make.
  await page.locator('[data-view="project"]').click();
  await expect(page.locator('#project-examples-list')).toContainText('Fetched on this device');
  expect(errors).toEqual([]);
});

test('bytes that do not match the pinned digest are refused, not loaded',async({page})=>{test.skip(!!skip,skip);
  await page.route(/raw\.githubusercontent\.com/,route=>route.fulfill({
    // Right size, wrong bytes: this is the case a length check alone would wave through.
    status:200,body:Buffer.alloc(bundle.length,7)}));
  await openProjects(page);
  await page.locator('[data-open-example="urn:fieldwork:example:south-london-1854"]').click();
  await expect(page.locator('[data-example-status="urn:fieldwork:example:south-london-1854"]')).toContainText('does not match the digest',{timeout:20000});
  // REFUSED, NOT PARTLY LOADED: the canvas is still the blank one.
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('.react-flow__node[data-id="mortality"]')).toHaveCount(0);
});

/** AN INVESTIGATION IS A PROJECT, AND ITS QUESTIONS ARE ITS WORKFLOWS.
 *
 *  The practitioner, 2026-10-24: *"when we import South London, we import a project and its
 *  workflows. Right now it just one workflow."* It was, and it landed under "-- No project --". */
test('a curated example opens as a project with its workflows',async({page})=>{test.skip(!!skip,skip);
  await page.route(/raw\.githubusercontent\.com/,route=>route.fulfill({status:200,body:bundle}));
  await openProjects(page);
  await page.locator('[data-open-example="urn:fieldwork:example:south-london-1854"]').click();
  await expect(page.locator('[data-example-status="urn:fieldwork:example:south-london-1854"]')).toContainText('digest matched',{timeout:20000});
  // A PROJECT, named, with every question under it -- not a loose canvas. Three until 2026-10-25,
  // when the choropleth joined the rates to the boundaries; five and then six on 2026-10-26, when
  // the water-company comparison brought Table IX and the rate ratio, and the contingency table
  // brought the 2x2 that a rate table cannot be; seven on 2026-10-30 with the plate, and eight on
  // 2026-10-31 with the river. The count is asserted rather than ignored because a bundle that
  // quietly loses a workflow is the failure this pinned catalog exists to catch.
  //
  // AGAINST THE CATALOG'S DECLARATION, not against a literal. The literal said 6 through three
  // re-pins and only a gate noticed. `workflowCount` is what the catalog PROMISES a reader of
  // this example will find, so comparing the interface to it still catches a bundle that lost a
  // workflow -- that is the whole tripwire -- while a number typed here catches only the day
  // somebody forgets to retype it.
  await expect(page.locator('#project-select')).toContainText("Snow's South London");
  await expect(page.locator('#project-select'))
    .toContainText(`${catalog.examples[0].workflowCount} workflows`);
  const workflows=await page.locator('#workflow-select option').allTextContents();
  expect(workflows).toContain('Deaths per 1,000 people, by sub-district');
  // Renamed on 2026-10-29, when the study area became the bounding extent and the 32
  // sub-districts became a polygon layer beside the river: the question is the ground, not a count.
  expect(workflows).toContain('The ground: an extent, its sub-districts and the river');
  expect(workflows).toContain('Cholera in 1849 compared with 1854');
  expect(workflows).toContain('Deaths per 1,000 people, mapped');
  expect(workflows).toContain('Deaths per house, by water company');
  expect(workflows).toContain('Died or survived, by water supply');
});

/** RESET REACHES AN IMPORTED EXAMPLE TOO.
 *
 *  The practitioner, 2026-10-24: *"Imported examples should also be resettable."* Reset reloaded a
 *  workflow compiled into the application, and an imported one has no such template, so the
 *  control hid itself and an edit to published work had no way back.
 *
 *  Three things are checked here, and the second is the one worth the test: that the reset is
 *  SERVED FROM THE CACHE -- the request counter does not move -- so a device that has gone offline
 *  can still reset; and that the workflow is still the practitioner's afterwards, because a reset
 *  that restored the published identity along with the published content would have made it
 *  undeletable again, which is the defect this pair of controls already had once. */
test('an imported example is resettable, from the bytes already verified',async({page})=>{test.skip(!!skip,skip);
  const errors=collectPageErrors(page);
  let requests=0;
  await page.route(/raw\.githubusercontent\.com/,route=>{requests++;
    route.fulfill({status:200,body:bundle});});
  page.on('dialog',dialog=>dialog.accept());
  await openProjects(page);
  await page.locator('[data-open-example="urn:fieldwork:example:south-london-1854"]').click();
  await expect(page.locator('[data-example-status="urn:fieldwork:example:south-london-1854"]')).toContainText('digest matched',{timeout:20000});
  await page.locator('[data-view="workflow"]').click();
  const node=page.locator('.react-flow__node[data-id="mortality"]');
  await expect(node).toBeVisible();
  // The control is offered at all, which it was not before: an imported example has an origin
  // even though it has no template.
  await expect(page.locator('#reset-example')).toBeVisible();

  // Edit it: remove a widget the example publishes.
  await node.click();
  await page.locator('#delete-node').click();
  await expect(node).toHaveCount(0);

  await page.locator('#reset-example').click();
  await expect(node).toBeVisible({timeout:20000});
  // NOT A SECOND FETCH. The bytes verified at import were kept under the digest the catalog pins,
  // so the reset reads those and the network is not touched again.
  expect(requests).toBe(1);
  // Still theirs: in the project it was imported into, and still deletable.
  await expect(page.locator('#project-select')).toContainText("Snow's South London");
  await expect(page.locator('#delete-workflow')).toBeEnabled();
  expect(errors).toEqual([]);
});

/** A NEWER VERSION PINNED (2026-11-13): a workflow imported from a repository example and reopened from the project list
 *  says so when the catalog pins a different digest for the file it was read from, and Fetch again opens the pinned one
 *  beside it. Simulated by recording an older digest as the copy's origin. */
test('a repository example whose pin has moved says so, and Fetch again opens the pinned version',async({page})=>{test.skip(!!skip,skip);
  const errors=collectPageErrors(page);
  await page.route(/raw\.githubusercontent\.com/,route=>route.fulfill({status:200,body:bundle}));
  await openProjects(page);
  await page.locator('[data-open-example="urn:fieldwork:example:south-london-1854"]').click();
  await expect(page.locator('[data-example-status="urn:fieldwork:example:south-london-1854"]')).toContainText('digest matched',{timeout:20000});
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('#fetch-pinned')).toHaveCount(0);
  await page.evaluate(()=>{const key='fieldwork-example-origins-v1',all=JSON.parse(localStorage.getItem(key));
    for(const o of Object.values(all))o.sha256='0'.repeat(64);localStorage.setItem(key,JSON.stringify(all));});
  await page.reload();
  await expect(page.locator('#example-note')).toContainText('A newer version of',{timeout:20000});
  const before=await page.locator('#project-select option').count();
  await page.locator('#fetch-pinned').click();
  await expect.poll(()=>page.locator('#project-select option').count(),{timeout:20000}).toBeGreaterThan(before);
  await expect(page.locator('#fetch-pinned')).toHaveCount(0);
  expect(errors).toEqual([]);
});

// THE SECOND EXAMPLE, opened from its pin rather than rebuilt. `oswego-from-scratch` proves it can
// be made by hand; this proves what was published is what opens.
const OSWEGO=new URL('../../example-1940-oswego-church-supper/fieldwork-project.json.gz',import.meta.url);
test('Oswego opens from its pin as one project, its counts intact',
  async({page})=>{test.skip(!existsSync(OSWEGO),'example-1940-oswego-church-supper is not checked out beside this repository.');
    const bytes=readFileSync(OSWEGO);
    await page.route(/raw\.githubusercontent\.com/,route=>route.fulfill({status:200,body:bytes}));
    await openProjects(page);
    await page.locator('[data-open-example="urn:fieldwork:example:oswego-1940"]').click();
    await expect(page.locator('[data-example-status="urn:fieldwork:example:oswego-1940"]')).toContainText('digest matched',{timeout:20000});
    await expect(page.locator('#project-select')).toContainText('The Oswego church supper, 1940');
    await page.locator('#run-button').click();
    await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
    await page.locator('[data-view="results"]').click();
    await expect(page.locator('main').first()).toContainText('14 exposures compared on one outcome');
  });

// THE THIRD EXAMPLE, opened from its pin. 774 polygons in each of four workflows, through the fetch.
const NIGERIA=new URL('../../example-2024-nigeria-immunization/fieldwork-project.json.gz',import.meta.url);
test('Nigeria opens from its pin as five workflows and runs',
  async({page})=>{test.skip(!existsSync(NIGERIA),'example-2024-nigeria-immunization is not checked out beside this repository.');
    const bytes=readFileSync(NIGERIA);
    await page.route(/raw\.githubusercontent\.com/,route=>route.fulfill({status:200,body:bytes}));
    await openProjects(page);
    await page.locator('[data-open-example="urn:fieldwork:example:nigeria-immunization-2024"]').click();
    await expect(page.locator('[data-example-status="urn:fieldwork:example:nigeria-immunization-2024"]'))
      .toContainText('digest matched',{timeout:30000});
    await expect(page.locator('#project-select')).toContainText('5 workflows');
    await page.locator('#run-button').click();
    await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  });

// THE FOURTH EXAMPLE, a case-control study, opened from its pin and run.
const SALMONELLA=new URL('../../example-2021-salmonella-germany/fieldwork-project.json.gz',import.meta.url);
test('the Salmonella example opens from its pin as four workflows and runs',
  async({page})=>{test.skip(!existsSync(SALMONELLA),'example-2021-salmonella-germany is not checked out beside this repository.');
    const bytes=readFileSync(SALMONELLA);
    await page.route(/raw\.githubusercontent\.com/,route=>route.fulfill({status:200,body:bytes}));
    await openProjects(page);
    await page.locator('[data-open-example="urn:fieldwork:example:salmonella-germany-2021"]').click();
    await expect(page.locator('[data-example-status="urn:fieldwork:example:salmonella-germany-2021"]'))
      .toContainText('digest matched',{timeout:30000});
    await expect(page.locator('#project-select')).toContainText('4 workflows');
    await page.locator('#run-button').click();
    await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  });

// THE FIFTH EXAMPLE, whose table is fetched rather than carried: opened from its pin, it holds no counts, says
// so, fetches them by digest, and runs. The package is answered from NYC_PKG; without one this is skipped.
const NYC=new URL('../../example-2025-nyc-ozone/fieldwork-project.json.gz',import.meta.url);
const NYC_ZENODO='https://zenodo.org/api/records/22757330/files/NYC_Pediatric_Asthma_Ozone_JHM_Reproducibility_v1.0.zip/content';
test('the NYC example opens without its counts, fetches them by digest, and runs',
  async({page})=>{test.skip(!existsSync(NYC)||!process.env.NYC_PKG,'example-2025-nyc-ozone is not beside this repository, or NYC_PKG is unset.');
    const bytes=readFileSync(NYC);
    await page.route(/raw\.githubusercontent\.com/,route=>route.fulfill({status:200,body:bytes}));
    await page.route(NYC_ZENODO,route=>route.fulfill({status:200,body:readFileSync(process.env.NYC_PKG),headers:{'access-control-allow-origin':'*'}}));
    await openProjects(page);
    await page.locator('[data-open-example="urn:fieldwork:example:nyc-asthma-ozone-2016-2025"]').click();
    await expect(page.locator('[data-example-status="urn:fieldwork:example:nyc-asthma-ozone-2016-2025"]'))
      .toContainText('digest matched',{timeout:30000});
    await page.locator('[data-view="workflow"]').click();
    const table=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.type==='table_input').id);
    await page.locator(`.react-flow__node[data-id="${table}"]`).click();
    await expect(page.locator('[data-table-remote]')).toContainText('The project keeps where it came from, not the rows');
    await page.locator('#table-fetch-remote').click();
    await expect(page.locator('[data-table-remote]')).toContainText('not the rows',{timeout:60000});
    await page.locator('#run-button').click();
    await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  });
