import {test,expect} from './fixtures.mjs';
import {EXAMPLE_TEMPLATES} from '../build/example-templates.js';

/** NO WORKED EXAMPLE OPENS WITH ONE NODE OVER ANOTHER (0.204.0). The port rows made nodes taller, and overlapping pairs
 *  in the eleven built-in examples went from 13, already there at 0.203.0, to 27. The practitioner chose shorter nodes
 *  (2026-11-27): a widget's own description, the same on every node of its kind, shows on the selected node only; the
 *  seven pairs left were moved apart. Read from the nodes as drawn, at their saved positions. */
const keys=Object.keys(EXAMPLE_TEMPLATES).filter(key=>key!=='blank');

for(const key of keys)test(`${key} opens with no node over another`,async({page})=>{
  await page.goto(`/?example=${key}`);
  await page.waitForSelector('html[data-ready]');
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('.react-flow__node').first()).toBeVisible({timeout:30000});
  await page.waitForTimeout(500);
  const overlaps=await page.evaluate(()=>{
    const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1'));
    const box=[...document.querySelectorAll('.react-flow__node')].map(el=>{const n=w.nodes.find(n=>n.id===el.dataset.id);
      return {id:el.dataset.id,x:n.x,y:n.y,w:el.offsetWidth,h:el.offsetHeight};});
    const found=[];
    for(let i=0;i<box.length;i++)for(let j=i+1;j<box.length;j++){const a=box[i],b=box[j];
      const across=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x),down=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);
      if(across>4&&down>4)found.push(`${a.id} and ${b.id}, by ${Math.round(down)} px`);}
    return found;});
  expect(overlaps).toEqual([]);
});
