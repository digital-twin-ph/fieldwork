import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

// EVERY WORD ON A MAP'S OWN CONTROLS IS READABLE, IN BOTH THEMES (the practitioner, 2026-11-10: the layer list's
// "light font on light background. That needs a regression check"). WCAG AA: 4.5 to 1, text against the colour actually
// behind it, found by walking up to the first element with a background.
const measure=()=>{
  const rgb=s=>{const m=s.match(/[\d.]+/g)?.map(Number)??[0,0,0,0];return {r:m[0],g:m[1],b:m[2],a:m.length>3?m[3]:1};};
  const lum=({r,g,b})=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4;};return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b);};
  const behind=el=>{for(let e=el;e;e=e.parentElement){const c=rgb(getComputedStyle(e).backgroundColor);if(c.a>0.5)return c;}return {r:255,g:255,b:255};};
  const out=[];
  for(const el of document.querySelectorAll('.leaflet-control *, .leaflet-control')){
    const own=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());
    if(!own||!el.getClientRects().length||getComputedStyle(el).visibility==='hidden')continue;
    const fg=rgb(getComputedStyle(el).color),bg=behind(el),[a,b]=[lum(fg),lum(bg)].sort((x,y)=>y-x);
    out.push({text:el.textContent.trim().slice(0,40),ratio:(a+0.05)/(b+0.05)});
  }
  return out;
};

for(const scheme of ['light','dark'])test(`a map's layer list, scale and key are readable in the ${scheme} theme`,async({page})=>{
  const errors=collectPageErrors(page);
  await page.emulateMedia({colorScheme:scheme});
  await page.goto('/?example=hagelloch');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:120_000});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="map"]').click();
  await page.locator('#configure-step').click();
  const preview=page.locator('#map-config-preview');
  await expect(preview.locator('.leaflet-control-layers')).toBeVisible({timeout:30_000});
  const found=await page.evaluate(measure);
  expect(found.some(f=>f.text.length>0)).toBe(true);
  const poor=found.filter(f=>f.ratio<4.5);
  expect(poor,`below 4.5:1 in the ${scheme} theme: ${JSON.stringify(poor)}`).toEqual([]);
  expect(errors).toEqual([]);
});
