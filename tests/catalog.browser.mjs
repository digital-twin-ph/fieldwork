import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

const registry=JSON.parse(readFileSync(new URL('../widgets/registry.json',import.meta.url),'utf8'));
const parity=JSON.parse(readFileSync(new URL('../widgets/parity.json',import.meta.url),'utf8'));
const identity=JSON.parse(readFileSync(new URL('../widgets/pack-catalog.json',import.meta.url),'utf8'));
const packs=JSON.parse(readFileSync(new URL('../widgets/packs.json',import.meta.url),'utf8'));
const kinds=JSON.parse(readFileSync(new URL('../widgets/classification.json',import.meta.url),'utf8'));

test('the widget catalog shows identities, digests and independent checks, and works offline',async({page,context})=>{
  await page.goto('/?example=blank');
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});

  // Two entry points on a desktop width: the header control and the node library link.
  await expect(page.locator('#header-catalog')).toBeVisible();
  await page.locator('#header-catalog').click();
  const dialog=page.locator('#catalog-dialog');
  await expect(dialog).toBeVisible();
  await dialog.locator('#catalog-close').click();
  await page.locator('#open-catalog').click();
  await expect(dialog).toBeVisible();

  // Every compiled definition appears, not only the ones this workspace offers in the palette.
  await expect(dialog.locator('tr[data-widget]')).toHaveCount(registry.widgets.length);
  await expect(dialog).toContainText(`${registry.widgets.length} definitions`);
  await expect(dialog).toContainText(`${identity.catalogVersion} ·`);
  await expect(dialog).toContainText(`${identity.catalogDigest.slice(0,12)}`);

  // A row carries the version and the first 12 characters of the release digest it was built from.
  const reproject=registry.widgets.find(w=>w.nodeType==='reproject');
  const row=dialog.locator('tr[data-widget="reproject"]');
  await expect(row).toContainText(reproject.currentVersion);
  await expect(row).toContainText(reproject.releases.find(r=>r.version===reproject.currentVersion).sha256.slice(0,12));
  await expect(row.locator('[data-parity]')).toHaveText('agrees');

  // A partial result is shown as partial rather than rounded up to a pass.
  await expect(dialog.locator('tr[data-widget="clip_raster"] [data-parity]')).toHaveText('partial');
  // An unchecked widget says so plainly.
  await expect(dialog.locator('tr[data-widget="voronoi"] [data-parity]')).toHaveText('not checked');
  const checked=new Set(parity.entries.map(e=>e.widget)).size;
  await expect(dialog).toContainText(`${checked} of ${registry.widgets.length} widgets`);
  // The catalog must not imply anything is installable or certified.
  // The build actually serving the page, reported by the service worker rather than by the page,
  // so a stale cache can be told apart from a missing feature.
  const build=readFileSync(new URL('../sw.js',import.meta.url),'utf8').match(/"(fieldwork-ts-[0-9a-f]+)"/)[1];
  await expect(dialog.locator('#catalog-build')).toHaveText(build,{timeout:45000});
  await expect(dialog).toContainText('running an older build');
  await expect(dialog).toContainText('nothing is installable');
  await expect(dialog).toContainText('no widget here is individually certified');

  // Standard components are distinguished from widgets that belong to a pack's domain.
  await expect(dialog).toContainText(`${kinds.standardCount} standard`);
  await expect(dialog).toContainText(`${kinds.domainCount} belonging to a pack's domain`);
  await expect(dialog.locator('tr[data-widget="table_input"] .tag').first()).toHaveText('standard');
  const domainRow=dialog.locator(`tr[data-widget="${kinds.widgets.find(w=>w.classification==='domain').nodeType}"]`);
  await expect(domainRow).toContainText('domain');
  await expect(domainRow).toContainText('Sea-level rise');
  await expect(dialog).toContainText('derived from those mappings, not declared');

  // Packs are listed with their recorded admission state and why they are not admitted, and the
  // view says plainly that nothing here can be added, with the reason.
  const pack=packs.packs[0];
  await expect(dialog.locator('#pack-table')).toContainText(pack.name);
  await expect(dialog.locator('#pack-table')).toContainText(pack.commit.slice(0,12));
  await expect(dialog.locator('#pack-table')).toContainText('not-admitted');
  await expect(dialog.locator('#pack-table')).toContainText('declaration-only');
  for(const review of Object.keys(pack.admission.reviews))await expect(dialog.locator('#pack-table')).toContainText(review);
  await expect(dialog).toContainText('A pack cannot be added here');
  await expect(dialog).toContainText('there is nothing in it to run');

  await dialog.locator('#catalog-close').click();
  await expect(dialog).toBeHidden();

  // The same identity is available where a practitioner is working: on the selected node.
  await page.locator('[data-add="reproject"]').click();
  await expect(page.locator('.inspector')).toContainText('Definition');
  await expect(page.locator('.inspector')).toContainText(`reproject ${reproject.currentVersion}`);
  await expect(page.locator('.inspector')).toContainText('Compiled into this build');
  await expect(page.locator('.inspector')).toContainText('Standard widget · any domain');
  await page.locator('.inspector details', {hasText:'What was checked'}).first().click();
  await expect(page.locator('.inspector')).toContainText('maximum separation');

  // A domain widget says which pack's domain it belongs to, in the same place.
  await page.locator('[data-add="slr_site_assignment"]').click();
  await expect(page.locator('.inspector')).toContainText('Domain widget · Sea-level rise');

  // A link can open it directly, so it can be pointed at rather than described.
  await page.goto('/?example=blank&catalog=1');
  await expect(page.locator('#catalog-dialog')).toBeVisible({timeout:45000});
  await expect(page.locator('#catalog-dialog tr[data-widget]')).toHaveCount(registry.widgets.length);
  await page.locator('#catalog-close').click();

  // At phone width the header cannot take another control, so the library link is the way in.
  await page.setViewportSize({width:390,height:844});
  await expect(page.locator('#header-catalog')).toBeHidden();
  await expect(page.locator('#open-catalog')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  await page.setViewportSize({width:1600,height:1100});

  await expect(page.locator('#offline-status')).toContainText('Available offline',{timeout:45000});
  await context.setOffline(true);
  await page.reload();
  // The deep link is still in the URL, so an offline reload reopens the catalog by itself.
  await expect(page.locator('#catalog-dialog')).toContainText(`${registry.widgets.length} definitions`);
  await expect(page.locator('#catalog-dialog tr[data-widget]')).toHaveCount(registry.widgets.length);
  await page.screenshot({path:'test-results/widget-catalog.png',fullPage:true});
});
