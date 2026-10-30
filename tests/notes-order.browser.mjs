import {test,expect} from '@playwright/test';
import {readFileSync,existsSync} from 'node:fs';

/** NOTES MOVE WITHIN A SECTION, DRIVEN AS A DRAG.
 *
 *  `tests/notes-order.test.mjs` covers `moveNote`, which was correct the whole time. What was not
 *  was the handler that calls it, and the only way to see that was to drag a card in the running
 *  application. The practitioner, 2026-10-30, on being offered the app: *"Yes"* -- and the first
 *  gesture tried found a defect three green unit tests could not: a card dropped on its own body
 *  took the same code path as a drop into the empty space below the last card, so a note nudged
 *  and let go was sent to the end of its section.
 *
 *  TWO MECHANICAL NOTES, each of which silently produced a passing no-op before it was found:
 *
 *  1. **Both cards must be on screen at once.** Playwright reports a box for a card the viewport
 *     cannot show, and a synthetic drag to those coordinates lands on `<html>`: no `dragstart`
 *     fires, nothing moves, and an assertion written the easy way around would report the
 *     reordering as working. So the part is scrolled to the top of the notes view first and every
 *     box is read after that scroll.
 *  2. **A toast can cover the card.** `+ note` leaves one over the first card of a part, and a
 *     drag that begins on a toast begins on nothing, so these tests wait for it to clear.
 *
 *  Driven on the published bundle, like `notes-spike.browser.mjs`, because a fixture would answer
 *  a question nobody asked. */
test.use({serviceWorkers:'block'});

const BUNDLE=new URL('../../example-1855-cholera-south-london/fieldwork-project.json.gz',import.meta.url);
const skip=existsSync(BUNDLE)?false
  :'example-1855-cholera-south-london is not checked out beside this repository.';
const bundle=skip?Buffer.alloc(0):readFileSync(BUNDLE);

const METHODS='.notes-part[data-section="Methods"] .notes-note';

const southLondon=async page=>{
  await page.route(/raw\.githubusercontent\.com/,route=>route.fulfill({status:200,body:bundle}));
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('[data-view="project"]').click();
  await page.locator('[data-open-example]').click();
  await expect(page.locator('[data-example-status]')).toContainText('digest matched',{timeout:20000});
  await page.locator('[data-view="notes"]').click();
  await page.locator('.notes-part').first().waitFor();
  await settle(page);
  // The part's own cards to the top of the scroller, so a whole drag fits inside the viewport.
  await page.evaluate(()=>{
    const first=document.querySelector('.notes-part[data-section="Methods"] .notes-note');
    const view=document.querySelector('.notes-view');
    view.scrollTop+=first.getBoundingClientRect().y-view.getBoundingClientRect().y-8;});
};

/** No toast over the cards: one that is still up is an element a drag would start on. */
const settle=async page=>{await page.locator('.toast.visible').waitFor({state:'hidden',timeout:20000})
  .catch(()=>{});};

const keys=page=>page.locator(METHODS)
  .evaluateAll(cards=>cards.map(card=>card.getAttribute('data-note')));

const boxOf=(page,index)=>page.locator(METHODS).nth(index)
  .evaluate(card=>{const r=card.getBoundingClientRect();
    return {x:Math.round(r.x),y:Math.round(r.y),h:Math.round(r.height)};});

/** A drag between two cards, both of which must already be on screen. */
const drag=async(page,from,to)=>{
  const start=await boxOf(page,from),end=await boxOf(page,to);
  expect(start.y,'the card being dragged is on screen').toBeGreaterThan(0);
  expect(end.y,'the card dropped onto is on screen').toBeGreaterThan(0);
  await page.mouse.move(start.x+60,start.y+14);
  await page.mouse.down();
  const travel=(end.y+16)-(start.y+14);
  for(let step=1;step<=12;step++)
    await page.mouse.move(start.x+60,start.y+14+travel*step/12);
  await page.mouse.move(end.x+62,end.y+16);
  await page.mouse.up();
};

test('a note moves within its section, and stays where it was put',{skip},async({page})=>{
  await southLondon(page);
  const before=await keys(page);
  expect(before.length,'Methods carries enough notes to reorder').toBeGreaterThan(2);
  await drag(page,2,0);
  await expect.poll(()=>keys(page).then(k=>k[0])).toBe(before[2]);
  const after=await keys(page);
  // The third card is now first and the two it passed keep their order relative to each other:
  // a move, not a shuffle.
  expect(after.slice(1,3)).toEqual(before.slice(0,2));
  // ORDER IS THE PROJECT'S OWN LIST, so it survives a reload with nothing stored for it.
  await page.reload();
  await page.locator('[data-view="notes"]').click();
  await page.locator('.notes-part').first().waitFor();
  expect(await keys(page)).toEqual(after);
});

test('a note dropped on itself does not move',{skip},async({page})=>{
  await southLondon(page);
  const before=await keys(page);
  // A real drag that ends on the card it began on. It has to travel far enough to BE a drag:
  // `drag(page,0,0)` moves two pixels, which never crosses the browser's threshold, so no
  // `dragstart` fires and the test passes having done nothing. That is how this assertion was
  // caught asserting nothing on 2026-10-30 -- it still passed with the fix removed. So the
  // gesture goes to the far end of the same card, which is tall enough to hold it.
  const card=await boxOf(page,0);
  expect(card.h,'the card is tall enough for a drag that stays inside it').toBeGreaterThan(60);
  await page.mouse.move(card.x+60,card.y+12);
  await page.mouse.down();
  for(let step=1;step<=10;step++)
    await page.mouse.move(card.x+60,card.y+12+(card.h-24)*step/10);
  await page.mouse.move(card.x+62,card.y+card.h-10);
  await page.mouse.up();
  // Before 2026-10-30 this sent the note to the end of its section, because it reached `moveNote`
  // with no position -- which is what a drop into the empty space below the last card means.
  await page.waitForTimeout(600);
  expect(await keys(page)).toEqual(before);
  // And it says nothing. A toast reporting a move that did not happen is the interface claiming
  // work it did not do.
  await expect(page.locator('.toast.visible')).toHaveCount(0);
});

test('a drop below the last card ends that section, not the write-up',{skip},async({page})=>{
  await southLondon(page);
  // Introduction, not Methods: a drop into the empty space below the last card can only be
  // performed where that space is on screen, and Methods is taller than the viewport.
  await page.evaluate(()=>{
    const first=document.querySelector('.notes-part[data-section="Introduction"] .notes-note');
    const view=document.querySelector('.notes-view');
    view.scrollTop+=first.getBoundingClientRect().y-view.getBoundingClientRect().y-8;});
  const cards='.notes-part[data-section="Introduction"] .notes-note';
  const before=await page.locator(cards).evaluateAll(all=>all.map(c=>c.getAttribute('data-note')));
  const start=await page.locator(cards).first()
    .evaluate(card=>{const r=card.getBoundingClientRect();
      return {x:Math.round(r.x),y:Math.round(r.y)};});
  const drop=await page.locator('.notes-part[data-section="Introduction"] .notes-drop')
    .evaluate(zone=>{const r=zone.getBoundingClientRect();return {bottom:Math.round(r.bottom)};});
  const last=await page.locator(cards).last()
    .evaluate(card=>Math.round(card.getBoundingClientRect().bottom));
  // Below the last card and inside the zone, so the drop carries no position and means "the end".
  const target=Math.round((last+drop.bottom)/2);
  expect(target,'the space below the last card is on screen').toBeLessThan(1090);
  expect(target,'and it really is below the last card').toBeGreaterThan(last);
  await page.mouse.move(start.x+60,start.y+14);
  await page.mouse.down();
  for(let step=1;step<=12;step++)
    await page.mouse.move(start.x+60,start.y+14+(target-start.y-14)*step/12);
  await page.mouse.move(start.x+62,target);
  await page.mouse.up();
  await expect.poll(()=>page.locator(cards)
    .evaluateAll(all=>all[all.length-1].getAttribute('data-note'))).toBe(before[0]);
  // IT IS STILL IN THE INTRODUCTION. The end of a part is not the end of the list, which is the
  // whole reason `moveNote` takes the section's last index rather than the array's length.
  const parts=await page.locator('.notes-part h3').allTextContents();
  expect(parts.map(part=>part.split(' ')[0]))
    .toEqual(['Introduction','Methods','Results','Discussion']);
  expect(await page.locator(cards).count()).toBe(before.length);
});
