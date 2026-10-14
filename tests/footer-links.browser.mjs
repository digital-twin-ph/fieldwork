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
  // Names the offending element rather than asserting a bare boolean. Two guesses at which element
  // overflowed on Linux WebKit were both wrong, and a failure that says only "true" cannot be
  // diagnosed from a CI log.
  //
  // A third guess was wrong for a different reason, on 2026-10-14: the list named six palette
  // entries sitting at x=6397, and all six were INSIDE a strip that scrolls horizontally on
  // purpose. An element past the viewport edge inside a clipping ancestor cannot widen the page,
  // so listing it sends the reader after the wrong thing -- which is what the fix before this one
  // did. Only elements with no clipping ancestor are reported now, and each says which ancestor
  // was expected to clip it.
  const overflow=await page.evaluate(()=>{
    const clipper=(el)=>{
      for(let node=el.parentElement;node&&node!==document.documentElement;node=node.parentElement){
        const {overflowX}=getComputedStyle(node);
        if(overflowX==='hidden'||overflowX==='auto'||overflowX==='scroll')
          return `${node.tagName.toLowerCase()}${node.id?'#'+node.id:''}.${typeof node.className==='string'?node.className.split(' ')[0]:''} (${overflowX})`;
      }
      return null;
    };
    const describe=el=>({tag:el.tagName.toLowerCase(),id:el.id,
      cls:typeof el.className==='string'?el.className:'',
      right:Math.round(el.getBoundingClientRect().right),
      w:Math.round(el.getBoundingClientRect().width),clippedBy:clipper(el)});
    const past=[...document.querySelectorAll('*')].map(describe).filter(e=>e.right>innerWidth+1);
    return {scrollWidth:document.documentElement.scrollWidth,innerWidth,
      wide:past.filter(e=>!e.clippedBy).sort((a,b)=>b.right-a.right).slice(0,6),
      clipped:past.filter(e=>e.clippedBy).length};
  });
  expect(overflow.scrollWidth,
    `page scrolls sideways by ${overflow.scrollWidth-overflow.innerWidth}px; `
    +`${overflow.clipped} element(s) past the edge are inside something that clips them, which is `
    +`allowed. Unclipped: ${JSON.stringify(overflow.wide)}`)
    .toBeLessThanOrEqual(overflow.innerWidth);
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
