import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

/** A WORKFLOW BUILT WITH THE KEYBOARD ALONE (the Section 508 audit, WCAG 2.1.1, 2026-11-16): no pointer at all. The
 *  library's search to add, the Inspector's list to connect, a canvas node selected and moved with the keys, the run
 *  started from the keyboard. The page is entered by Tab from its start, as a person without a mouse would. */
test.use({serviceWorkers:'block'});
// SAFARI'S RULE: on a Mac, Tab skips buttons and links unless Option is held or "Press Tab to highlight each item" is on.
let TAB='Tab';
test.beforeEach(({browserName})=>{TAB=browserName==='webkit'?'Alt+Tab':'Tab';});
const tabTo=async(page,selector,limit=400)=>{
  for(let i=0;i<limit;i++){
    if(await page.evaluate(s=>document.activeElement?.matches(s)??false,selector))return;
    await page.keyboard.press(TAB);
  }
  throw new Error(`${selector} was not reached by Tab in ${limit} presses`);
};

test('a workflow is built, connected, rearranged and run without a pointer',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await expect(page.locator('html[data-ready="true"]')).toHaveCount(1,{timeout:30000});

  // ADD from the library: Tab to its search, type, Tab to the entry, Enter.
  await tabTo(page,'#node-search');
  await page.keyboard.type('Study area');
  await tabTo(page,'button[data-add="study_area"]');
  await page.keyboard.press('Enter');
  await expect(page.locator('.react-flow__node')).toHaveCount(1);
  await tabTo(page,'#node-search');
  await page.keyboard.press('Meta+A');await page.keyboard.type('Map');
  await tabTo(page,'button[data-add="map_output"]');
  await page.keyboard.press('Enter');
  await expect(page.locator('.react-flow__node')).toHaveCount(2);

  // CONNECT in the Inspector of the map just added: its first input's list, a choice by arrow key.
  await tabTo(page,'select.connect-port');
  const list=page.locator('select.connect-port:focus');
  const offered=await list.locator('option').allTextContents();
  expect(offered.some(o=>/Study area/i.test(o)),`the list offers the study area: ${offered.join(' | ')}`).toBe(true);
  await list.selectOption({label:offered.find(o=>/Study area/i.test(o))});
  await expect(page.locator('.react-flow__edge')).toHaveCount(1);

  // SELECT AND MOVE a node on the canvas: Tab reaches it, Enter selects, an arrow moves it.
  await tabTo(page,'.react-flow__node');
  const node=page.locator('.react-flow__node:focus');
  const before=await node.boundingBox();
  await page.keyboard.press('Enter');
  await expect(page.locator('.react-flow__node.selected')).toHaveCount(1);
  for(let i=0;i<5;i++)await page.keyboard.press('ArrowRight');
  const after=await page.locator('.react-flow__node.selected').boundingBox();
  expect(after.x,'moved right by the keys').toBeGreaterThan(before.x);

  expect(errors).toEqual([]);
});

test('a worked example runs from the keyboard, and a Tab from a canvas node never leaves Fieldwork',async({page})=>{
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=hagelloch');
  await expect(page.locator('html[data-ready="true"]')).toHaveCount(1,{timeout:30000});
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:120000});
  // From a node, Tab and Enter: the practitioner pressed Enter there and was taken to React Flow's website, a corner link
  // reached by one Tab with a faint focus ring. No link of the canvas is in the Tab order now.
  // SKIP LINKS FIRST (WCAG 2.4.1): the first Tab stop skips the header, the project bar and the library.
  await page.keyboard.press(TAB);
  await expect(page.locator('.skip-link:focus')).toHaveText('Skip to the canvas');
  await page.keyboard.press('Enter');
  await tabTo(page,'.react-flow__node',12);
  // A WIDGET REACHED BY TAB SHOWS IT, AND IS SELECTED, so the Inspector follows (2.4.7).
  const focused=page.locator('.react-flow__node:focus');
  expect(await focused.evaluate(el=>getComputedStyle(el).outlineStyle)).toBe('solid');
  await expect(focused).toHaveClass(/selected/);
  await page.keyboard.press(TAB);
  await expect(page.locator('.react-flow__node:focus')).toHaveClass(/selected/);
  expect(await page.evaluate(()=>document.activeElement?.tagName)).not.toBe('A');
  await expect(page.locator('.react-flow__attribution')).toHaveCount(0);
  // Run again from the keyboard.
  await tabTo(page,'#run-button');
  await page.keyboard.press('Enter');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:120000});
  expect(page.url()).toContain('127.0.0.1');
});
