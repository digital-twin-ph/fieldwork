import {test,expect} from '@playwright/test';

// WCAG 2.1 contrast, measured on what is actually rendered: the effective foreground after
// alpha compositing, over the nearest opaque ancestor background. 4.5:1 for normal text,
// 3:1 for large text (>=24px, or >=18.66px bold).
const measure=page=>page.evaluate(()=>{
  const rgb=s=>{const m=s.match(/[\d.]+/g);return m?m.slice(0,3).map(Number).concat(m[3]===undefined?1:Number(m[3])):null;};
  const lum=c=>{const [r,g,b]=c.slice(0,3).map(v=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4;});return 0.2126*r+0.7152*g+0.0722*b;};
  const ratio=(a,b)=>{const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+0.05)/(y+0.05);};
  const over=(fg,bg)=>fg[3]>=1?fg:fg.slice(0,3).map((v,i)=>v*fg[3]+bg[i]*(1-fg[3])).concat(1);
  const bgOf=el=>{let n=el;while(n){const c=rgb(getComputedStyle(n).backgroundColor);if(c&&c[3]>0.5)return c;n=n.parentElement;}return [255,255,255,1];};
  const failures=[];let examined=0;
  document.querySelectorAll('*').forEach(el=>{
    if(![...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))return;
    const s=getComputedStyle(el);
    if(s.visibility==='hidden'||s.display==='none'||Number(s.opacity)<0.3)return;
    const box=el.getBoundingClientRect();if(box.width<2||box.height<2)return;
    examined++;
    const size=parseFloat(s.fontSize),weight=Number(s.fontWeight)||400;
    const bg=bgOf(el),fg=over(rgb(s.color),bg);
    const required=size>=24||(size>=18.66&&weight>=700)?3:4.5;
    const r=ratio(fg,bg);
    if(r<required)failures.push({pair:`rgb(${fg.slice(0,3).map(Math.round)}) on rgb(${bg.slice(0,3)})`,
      ratio:Math.round(r*100)/100,required,size,text:(el.textContent||'').trim().slice(0,30)});
  });
  return {examined,failures,pairs:[...new Set(failures.map(f=>f.pair))]};
});

test('dark meets WCAG AA for every rendered text element',async({page})=>{
  await page.goto('/?example=old-naledi');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('#theme-select').selectOption('dark');
  await page.waitForTimeout(400);
  const {examined,failures}=await measure(page);
  expect(examined).toBeGreaterThan(150);
  expect(failures.map(f=>`${f.ratio} ${f.pair} "${f.text}"`)).toEqual([]);
});

test('light does not get worse than its recorded baseline',async({page})=>{
  // The released light theme has long-standing low-contrast text, mostly 8-10px labels in pale
  // green on white. It is recorded in docs/experiments/46-colour-theme.md rather than changed
  // here, because altering it is a design decision, not part of adding a theme. This is a
  // ratchet: it may improve, it must not regress.
  await page.goto('/?example=old-naledi');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('#theme-select').selectOption('light');
  await page.waitForTimeout(400);
  const {pairs}=await measure(page);
  expect(pairs.length,'distinct failing colour pairs in light').toBeLessThanOrEqual(46);
});
