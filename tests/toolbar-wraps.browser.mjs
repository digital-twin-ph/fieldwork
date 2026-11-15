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
    await expect(page.locator('#toggle-library')).toHaveText('Hide node library');
    // Next to the panel it hides: left of every tab, and within a few pixels of the panel's edge.
    const toggle=await page.locator('#toggle-library').boundingBox(),first=await page.locator('.tab[data-view="project"]').boundingBox();
    const panel=await page.locator('.library').boundingBox();
    expect(toggle.x).toBeLessThan(first.x);
    expect(toggle.x-(panel.x+panel.width)).toBeLessThan(40);
  });
}
