import {test,expect} from './fixtures.mjs';

/** THE TAB BAR WRAPS RATHER THAN OVERLAPS (the practitioner, 2026-11-15, a screenshot: "Overlapping UI components"):
 *  the Widgets tab was cut off behind the library button and the run state ran onto two lines. At each width the last
 *  tab is whole and clear of the buttons, and the run state is on one line. */
for(const width of [1280,1440,1920]){
  test(`at ${width} px the tabs are whole and clear of the toolbar's buttons`,async({page})=>{
    await page.setViewportSize({width,height:900});
    await page.goto('/?example=hagelloch');
    await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:90000});
    const tab=await page.locator('.tab[data-view="widgets"]').boundingBox();
    const tabs=await page.locator('.canvas-toolbar .tabs').evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth}));
    expect(tabs.scroll).toBeLessThanOrEqual(tabs.client+1);
    for(const id of ['#workflow-state','#fullscreen-workbench']){
      const box=await page.locator(id).boundingBox();
      const overlaps=box.x<tab.x+tab.width&&tab.x<box.x+box.width&&box.y<tab.y+tab.height&&tab.y<box.y+box.height;
      expect(overlaps,`${id} overlaps the Widgets tab`).toBe(false);
    }
    const state=await page.locator('#workflow-state').boundingBox();
    expect(state.height).toBeLessThan(30);
    await expect(page.locator('#toggle-library')).toHaveText('Hide widget library');
    // Next to the panel it hides: left of every tab, and within a few pixels of the panel's edge.
    const toggle=await page.locator('#toggle-library').boundingBox(),first=await page.locator('.tab[data-view="project"]').boundingBox();
    const panel=await page.locator('.library').boundingBox();
    // Left of the tabs, or above them where a narrow window wraps the bar (WebKit at 1280 px, 2026-11-15): never over one.
    expect(toggle.x).toBeLessThanOrEqual(first.x);
    expect(toggle.x-(panel.x+panel.width)).toBeLessThan(40);
    for(const box of await page.locator('.canvas-toolbar .tab:not([hidden])').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}))){
      const over=box.x<toggle.x+toggle.width&&toggle.x<box.x+box.width&&box.y<toggle.y+toggle.height&&toggle.y<box.y+box.height;
      expect(over,'the library button covers a tab').toBe(false);
    }
  });
}
