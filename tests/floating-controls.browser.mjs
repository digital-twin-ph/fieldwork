import {test,expect} from '@playwright/test';

test('project title and workflow actions remain visible when scrolling desktop and mobile',async({page})=>{
  await page.goto('/?example=blank');
  for(const viewport of [{width:1100,height:720},{width:390,height:844}]){
    await page.setViewportSize(viewport);
    await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
    await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBeGreaterThan(71);
    await expect(page.locator('.project-bar')).toBeInViewport({ratio:1});
    await expect(page.locator('#project-title')).toBeInViewport({ratio:1});
    // `export-button` and `encrypted-export` moved inside the Back up dialog on 2026-10-23:
    // one header control named for what a practitioner is doing, rather than three named for
    // file formats. What this test is about -- the actions you need stay reachable while the
    // canvas scrolls -- is unchanged, and `backup-button` is the one that has to stay put.
    for(const id of ['import-button','backup-button','run-button'])await expect(page.locator('#'+id)).toBeInViewport({ratio:1});
    await expect.poll(()=>page.locator('.project-bar').evaluate(el=>Math.round(el.getBoundingClientRect().top))).toBe(0);
    await page.screenshot({path:`test-results/floating-controls-${viewport.width}.png`});
  }
});
