import {test,expect} from './fixtures.mjs';
import {readFileSync} from 'node:fs';

const registry=JSON.parse(readFileSync(new URL('../widgets/registry.json',import.meta.url),'utf8'));
const parity=JSON.parse(readFileSync(new URL('../widgets/parity.json',import.meta.url),'utf8'));
const kinds=JSON.parse(readFileSync(new URL('../widgets/classification.json',import.meta.url),'utf8'));
const examples=JSON.parse(readFileSync(new URL('../widgets/examples.json',import.meta.url),'utf8')).examples;

// "The widget catalog is linked in two places. It only needs to show active widgets and the worked example
// utilization." -- the practitioner, 2026-11-09. One way in, beside the node library; a row per widget that can be used;
// for each, the worked examples that use it, read from widgets/examples.json.
const retired=new Set(kinds.widgets.filter(w=>w.retired).map(w=>w.nodeType));
const active=kinds.widgets.filter(w=>!w.retired).map(w=>w.nodeType);
const usedBy=type=>examples.filter(e=>e.uses.includes(type));

test('the widget catalog lists the widgets that can be used and the worked examples that use them',async({page,context})=>{
  await page.goto('/?example=blank');
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});

  // One entry point.
  await expect(page.locator('#header-catalog')).toHaveCount(0);
  await page.locator('#open-catalog').click();
  const dialog=page.locator('#catalog-dialog');
  await expect(dialog).toBeVisible();

  // Active widgets only: no retired one is listed.
  const rows=dialog.locator('tr[data-widget]');
  await expect(rows).toHaveCount(active.length);
  for(const type of retired)await expect(dialog.locator(`tr[data-widget="${type}"]`)).toHaveCount(0);
  // THE BUILT-IN EXAMPLES COUNT TOO (2026-11-14): Snow's London and Hagelloch, read from their own workflows, so the
  // tally is at least what the repository examples alone give, and Street network, which only Snow uses, is in it.
  const used=active.filter(type=>usedBy(type).length).length;
  const said=await dialog.locator('p').first().textContent();
  const m=said.match(new RegExp(`^${active.length} widgets you can use\\. (\\d+) of them are used in at least one of the ${examples.length+2} worked examples, 2 of them built in\\.$`));
  expect(m,said).not.toBeNull();
  expect(Number(m[1])).toBeGreaterThan(used);
  await expect(dialog.locator('tr[data-widget="network_input"]')).toContainText('1854 Cholera Outbreak in London');
  await expect(dialog.locator('tr[data-widget="network_input"]')).toContainText('built in');

  // A widget used by examples names each of them, linked to its repository.
  const row=dialog.locator('tr[data-widget="raster_input"]');
  for(const example of usedBy('raster_input')){
    await expect(row.locator(`a[href="${example.repository}"]`)).toHaveText(example.title);
  }
  // One no example uses says so, rather than leaving the cell empty.
  const unused=dialog.locator('td[data-examples="0"]');
  if(await unused.count())await expect(unused.first()).toHaveText('Not in a worked example yet');
  await expect(dialog.locator('td[data-examples="0"]')).toHaveCount(active.length-Number(m[1]));
  await dialog.locator('#catalog-close').click();
  await expect(dialog).toBeHidden();

  // The step's identity stays where the step is: on the selected node.
  const reproject=registry.widgets.find(w=>w.nodeType==='reproject');
  await page.locator('[data-view="workflow"]').click();
  if(!await page.locator('[data-add="reproject"]').count()){
    await page.locator('[data-add="point_input"]').click();
    await page.locator('[data-view="workflow"]').click();
  }
  await page.locator('[data-add="reproject"]').click();
  await expect(page.locator('.inspector')).toContainText(`reproject ${reproject.currentVersion}`);
  await expect(page.locator('.inspector')).toContainText('Compiled into this build');
  if(parity.entries.some(e=>e.widget.endsWith(':reproject'))){
    await page.locator('.inspector details',{hasText:'What was checked'}).first().click();
    await expect(page.locator('.inspector')).toContainText('maximum separation');
  }

  // A link opens it directly; at phone width it fits, and it opens offline.
  await page.goto('/?example=blank&catalog=1');
  await expect(page.locator('#catalog-dialog tr[data-widget]')).toHaveCount(active.length,{timeout:45000});
  await page.setViewportSize({width:390,height:844});
  await expect(page.locator('#open-catalog')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  await page.setViewportSize({width:1600,height:1100});
  await expect(page.locator('#offline-status')).toHaveAttribute('data-state','ready',{timeout:45000});
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#catalog-dialog tr[data-widget]')).toHaveCount(active.length,{timeout:45000});
  await page.screenshot({path:'test-results/widget-catalog.png',fullPage:true});
});
