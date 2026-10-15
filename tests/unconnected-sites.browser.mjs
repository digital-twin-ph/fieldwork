import {test,expect} from '@playwright/test';
import assert from 'node:assert/strict';

// What a site out of reach of the streets gets, and what the practitioner is told about it.
// Before 2026-10-14 it threw and discarded every other site's catchment. Experiment 114 asked for
// two things instead: an answer that says what it assumed, and an alert that can be acted on.
test('a site past the snap limit is routed off-network, and the widget says so',async({page})=>{
  await page.goto('/?example=snow-isochrone');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  const widget=page.locator('.react-flow__node[data-id="catchments"]');
  await expect(widget.locator('.node')).not.toHaveClass(/alerting/);
  await expect(widget.locator('.node-alert')).toHaveCount(0);

  // 5 m from a street is closer than any of the eight pumps stands, so every one is marked.
  await widget.click();
  await page.locator('#catchment-maxSnapM').fill('5');
  await page.locator('#catchment-maxSnapM').blur();
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});

  // The run completed and the catchments are still drawn: this is a finding, not a failed run.
  await expect(widget.locator('.node')).toHaveClass(/alerting/);
  await expect(widget.locator('.node-alert')).toContainText('routed off-network');
  await expect(page.locator('#map [data-catchment]')).not.toHaveCount(0);
  const alert=page.locator('.inspector-alert');
  await expect(alert).toContainText('Out of bounds');
  await expect(alert).toContainText('Routed off-network');
  await expect(alert).toContainText('charged as a straight line');
  await expect(alert).toContainText('assumes a walk that may not exist');
  assert.ok((await alert.locator('tbody tr').count())>0,'each site is named with the leg it was charged');

  // The badge closes. It covers the node it is about, and once it has been read it is in the
  // way -- the practitioner asked for an x on 2026-10-15. Closing it keeps the finding: the
  // Inspector still carries the whole alert, and the node still glows.
  await widget.locator('.node-alert-close').click();
  await expect(widget.locator('.node-alert')).toHaveCount(0);
  await expect(page.locator('.inspector-alert')).toContainText('Out of bounds');
  await expect(widget.locator('.node')).toHaveClass(/alerting/);

  // And it comes back on the next run, because a finding that stays dismissed across runs makes
  // the canvas quieter and less true.
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await expect(widget.locator('.node-alert')).toContainText('routed off-network');
  // Red, boldly: the ring is drawn in the danger token, not the ordinary border colour.
  const ring=await widget.locator('.node').evaluate(n=>getComputedStyle(n).boxShadow);
  assert.match(ring,/rgb\(165, 43, 35\)/,'the glow uses --danger-3');
  await page.screenshot({path:'test-results/unconnected-sites-alert.png'});
  await page.locator('[data-view="rules"]').click();
  await expect(page.locator('#n3-preview')).toContainText('fw:offNetworkSiteCount');
  await expect(page.locator('#n3-preview')).toContainText('fw:offNetworkMetres');

  // The loop closes: the omission is acted on by raising the limit, and the alert goes.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#catchment-maxSnapM').fill('150');
  await page.locator('#catchment-maxSnapM').blur();
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await expect(widget.locator('.node')).not.toHaveClass(/alerting/);
  await expect(page.locator('.inspector-alert')).toHaveCount(0);
});

// When even a straight line cannot be afforded there is no answer to give, and no polygon that
// would not be a lie. The site is named instead, and the omission follows the value downstream:
// a summary over seven of nine catchments is also over seven of nine.
test('a site whose walk spends the budget gets no result, and the omission travels downstream',async({page})=>{
  await page.goto('/?example=snow-isochrone');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('.react-flow__node[data-id="catchments"]').click();
  await page.locator('#catchment-maxSnapM').fill('1000');
  await page.locator('#catchment-maxSnapM').blur();
  // The shipped example draws four cumulative bands; the single travel time below is what the
  // widget uses once they are cleared. Six seconds of walking buys 7.5 m, and the pump stands
  // 10.9 m from the nearest junction.
  await page.locator('#catchment-thresholds').fill('');
  await page.locator('#catchment-thresholds').blur();
  await page.locator('#catchment-minutes').fill('0.1');
  await page.locator('#catchment-minutes').blur();
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  const alert=page.locator('.inspector-alert');
  await expect(alert).toContainText('with no result');
  await expect(alert).toContainText('No result');
  await expect(alert).toContainText('spends the whole travel budget');
  await expect(page.locator('.react-flow__node[data-id="summary"] .node')).toHaveClass(/alerting/);
  await page.locator('[data-view="rules"]').click();
  await expect(page.locator('#n3-preview')).toContainText('fw:unconnectedSiteCount');
});
