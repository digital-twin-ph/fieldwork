import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

// CHART'S CONFIGURE…, PREVIEWED AND PROPOSED (the practitioner, 2026-11-13: "The ability to preview the Chart would be
// extremely useful. It would also be useful to have potential chart type candidates appear on the dropdown, as we
// discussed in experiment 210."). Hagelloch's pyramid and its stacked curve, after a run.
test('Configure… draws the chart as set, and Draw offers first the forms that suit the data, each by its question',async({page})=>{
  test.setTimeout(180_000);
  const errors=collectPageErrors(page);
  await page.goto('/?example=hagelloch-people');
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('#run-button')).toBeEnabled({timeout:60_000});
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:90_000});

  // THE PYRAMID: ages by gender suit it, and bars; the tree needs other data.
  await page.locator('.react-flow__node[data-id="age-chart"]').click();
  await page.locator('#configure-step').click();
  const dialog=page.locator('#chart-config');
  const draw=dialog.locator('#chart-figure');
  await expect(draw.locator('optgroup[label="Suits these data"] option')).toHaveText(['How are two groups spread across ages? Population pyramid','How do groups differ? Bars']);
  await expect(draw.locator('optgroup[label="Needs other data"] option')).toHaveText(['Who infected whom? Transmission tree']);
  await expect(dialog.locator('[data-draw-because]')).toContainText('Suits these data: age in bands, the two values of gender back to back.');
  const preview=dialog.locator('#chart-config-preview');
  await expect(preview.locator('svg.marks')).toContainText('f ← count → m',{timeout:30_000});
  // A title typed is drawn at once, before Apply.
  await dialog.locator('#chart-title').fill('Previewed before Apply');
  await dialog.locator('#chart-title').press('Tab');
  await expect(preview.locator('svg.marks')).toContainText('Previewed before Apply');
  // Bars chosen: the reason follows, and the preview redraws without the pyramid's axis.
  await draw.selectOption('bars');
  await expect(dialog.locator('[data-draw-because]')).toContainText('one bar for each category');
  await expect(preview.locator('svg.marks')).not.toContainText('f ← count → m');
  await dialog.locator('#config-cancel').click();
  await dialog.getByRole('button',{name:'Discard changes'}).click();
  await expect(dialog).toBeHidden();

  // THE CURVE BY SCHOOL CLASS: split, so the stacked curve suits it as well as the plain one.
  await page.locator('.react-flow__node[data-id="class-curve-chart"]').click();
  await page.locator('#configure-step').click();
  await expect(dialog.locator('#chart-series-figure optgroup[label="Suits these data"] option')).toHaveText(['How did it unfold over time? Epidemic curve','When, and of which kind? Stacked epidemic curve']);
  await expect(dialog.locator('#chart-series-figure')).toHaveValue('stacked');
  await expect(dialog.locator('[data-draw-because]')).toContainText('the series is split by class');
  await expect(dialog.locator('#chart-config-preview svg.marks')).toBeVisible({timeout:30_000});

  expect(errors).toEqual([]);
});
