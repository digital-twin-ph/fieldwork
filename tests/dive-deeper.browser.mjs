import {test,expect} from './fixtures.mjs';

// Asked on 2026-10-14: how do I see the Deeper Dive notebooks from each relevant widget? The panel is generated from
// the ledger and rendered beside the description. From 2026-11-26 it offers lessons only: the practitioner deferred
// Dive Deeper, which is pedagogy in its own repository, and the older sections at the end of Validation Lab notebooks
// were taken out. A widget that projects to metres offers the manual's page on the UTM zone instead.

test('a metric widget with no lesson offers the UTM zone page and no Dive Deeper panel',async({page})=>{
  await page.goto('/?example=snow-voronoi');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="catchments"]').click();

  await expect(page.locator('#inspector-content details.dive-deeper')).toHaveCount(0);
  // Nothing in the Inspector reaches into the Validation Lab for an explanation any more.
  await expect(page.locator('#inspector-content a[href*="validation-lab"]')).toHaveCount(0);
  const zone=page.locator('#inspector-content #open-zone-manual');
  await expect(zone).toHaveText(/UTM zone/);
  await zone.click();
  const dialog=page.locator('#manual-dialog');
  await expect(dialog.locator('#manual-title')).toHaveText('The UTM zone');
  await expect(dialog).toContainText('Use the same zone in every step');
  await page.screenshot({path:'test-results/utm-zone-manual.png'});
});

test('a widget that projects nothing offers neither',async({page})=>{
  await page.goto('/?example=snow-voronoi');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="table"]').click();
  await expect(page.locator('#inspector-content details.dive-deeper')).toHaveCount(0);
  await expect(page.locator('#inspector-content #open-zone-manual')).toHaveCount(0);
});

// The lessons moved to their own repository on 2026-10-20, so the link has to leave for the new
// site rather than the Lab's. The practitioner had asked whether the repo was being used: it was
// created, recorded as a decision, and nothing pointed at it.
test('a widget with a lesson links the dive-deeper site, not the lab',async({page})=>{
  await page.goto('/?example=snow-geoprivacy');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="original-center"]').click();

  const link=page.locator('#inspector-content details.dive-deeper a').first();
  await expect(link).toHaveAttribute('href',/digital-twin-ph\.github\.io\/dive-deeper\/lab\/index\.html\?path=mean-center\.ipynb/);
  await expect(link).toHaveText('Where the centre of an outbreak is, and what moves it');
  // What it teaches is the ledger's sentence, not a generic one written per widget.
  await expect(page.locator('#inspector-content details.dive-deeper')).toContainText('2.10 m');
});
