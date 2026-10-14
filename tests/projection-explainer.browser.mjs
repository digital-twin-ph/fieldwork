import {test,expect} from '@playwright/test';
import assert from 'node:assert/strict';

// The explainer is appended in one place in src/app.ts, keyed off METRIC_NODE_TYPES. The unit
// tests prove the HTML is right; only a browser can prove the line runs and the link is reachable.
// This project has twice shipped Inspector markup that TypeScript could not see was wrong.
test('a widget that projects offers the projection explainer in the Inspector',async({page})=>{
  await page.goto('/?example=snow-voronoi');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('.react-flow__node[data-id="catchments"]').click();
  const explainer=page.locator('#inspector-content details.explainer');
  await expect(explainer).toHaveCount(1);
  await expect(explainer.locator('summary')).toContainText('UTM zone');
  // Closed by default: it is reference material beside the knob, not a notice competing with it.
  assert.equal(await explainer.evaluate(el=>el.open),false);
  await explainer.locator('summary').click();
  const link=explainer.locator('a');
  await expect(link).toContainText('projection notebook');
  const href=await link.getAttribute('href');
  assert.match(href,/^https:\/\/digital-twin-ph\.github\.io\/validation-lab\/lab\/index\.html\?path=01-reproject-vs-pyproj\.ipynb$/,href);
  assert.equal(await link.getAttribute('rel'),'noopener noreferrer');
  assert.equal(await link.getAttribute('target'),'_blank');

  // And a widget that projects nothing does not carry it.
  await page.locator('.react-flow__node[data-id="table"]').click();
  await expect(page.locator('#inspector-content details.explainer')).toHaveCount(0);
});
