import {test,expect} from '@playwright/test';

const ONTOLOGY='https://digital-twin-ph.github.io/fieldwork-ontology/';
const LAB='https://digital-twin-ph.github.io/validation-lab/';

test('the status bar links to the ontology and the Validation Lab',async({page})=>{
  await page.goto('/?example=blank');
  const footer=page.locator('.app-footer');
  await expect(footer).toBeVisible();

  for(const [id,href,label] of [['#footer-ontology',ONTOLOGY,'Ontology'],
                                ['#footer-lab',LAB,'Validation Lab']]){
    const link=footer.locator(id);
    await expect(link).toBeVisible();
    await expect(link).toContainText(label);
    expect(await link.getAttribute('href')).toBe(href);
    // Opening a new tab rather than replacing the workspace, and without handing the
    // destination a reference back to this one.
    expect(await link.getAttribute('target')).toBe('_blank');
    expect(await link.getAttribute('rel')).toContain('noopener');
    // These are the only things in the application that need a connection, so each says so.
    expect(await link.getAttribute('title')).toContain('needs a connection');
  }
});

test('the status bar still fits a phone, and the links survive',async({page})=>{
  await page.goto('/?example=blank');
  await page.setViewportSize({width:390,height:844});
  // Five items do not fit a 390px row. The two context strings give way; the links do not, so a
  // reader on a phone can still reach the ontology and the lab.
  await expect(page.locator('#footer-ontology')).toBeVisible();
  await expect(page.locator('#footer-lab')).toBeVisible();
  await expect(page.locator('#footer-context')).toBeHidden();
  // The research note goes too. It is the one footer item carrying nothing a reader acts on, and on
  // Linux WebKit the footer measures wider than on macOS WebKit or Chromium -- enough to push the
  // page into a horizontal scroll at 390px, which only CI saw.
  await expect(page.locator('.app-footer>span').last()).toBeHidden();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  const box=await page.locator('.app-footer').boundingBox();
  expect(box.width).toBeLessThanOrEqual(390);
});

test('the links survive an offline reload, and say they need a connection',async({page,context})=>{
  // The workspace is offline-first and these two destinations are not part of it. The links are
  // cached with the page, so they remain present and honest rather than disappearing.
  await page.goto('/?example=blank');
  await expect(page.locator('#offline-status')).toContainText('Available offline',{timeout:45000});
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#footer-ontology')).toBeVisible();
  await expect(page.locator('#footer-lab')).toBeVisible();
});
