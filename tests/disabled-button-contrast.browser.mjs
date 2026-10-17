import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

// "I noticed that some worked examples lost the Run Workflow button." -- the practitioner,
// 2026-10-17. Nothing removed it. `.button.primary:disabled{opacity:.45}`, added 2026-10-15,
// composited the white label and the green fill onto the same pale mint: the label measured
// 1.22:1 against its own background in both schemes. Every worked example auto-runs on load and
// the button is disabled while it runs, so the slower ones spent that whole time showing a
// button nobody could see.
//
// Opacity on a whole element is the thing being tested here, not one colour pair: it moves text
// and background TOWARDS EACH OTHER, which is the one direction a contrast fix must never go.
// The composite is measured as rendered, so this stays honest if the tokens change.
const contrastOf=el=>{
  const parse=v=>(v.match(/\d+(\.\d+)?/g)||[0,0,0]).slice(0,3).map(Number);
  const L=c=>{const [r,g,b]=c.map(v=>{const s=v/255;return s<=.03928?s/12.92:((s+.055)/1.055)**2.4;});
    return .2126*r+.7152*g+.0722*b;};
  // Composite the element's own opacity onto whatever is painted behind it, exactly as the
  // browser does, then read the label against the fill it actually sits on.
  const over=(fg,a,bg)=>fg.map((c,i)=>c*a+bg[i]*(1-a));
  const opaque=node=>{
    for(let n=node;n;n=n.parentElement){
      const c=parse(getComputedStyle(n).backgroundColor);
      const alpha=Number((getComputedStyle(n).backgroundColor.match(/[\d.]+\)$/)||['1)'])[0].slice(0,-1));
      if(getComputedStyle(n).backgroundColor!=='rgba(0, 0, 0, 0)'&&alpha>0)return c;
    }
    return [255,255,255];
  };
  const style=getComputedStyle(el),a=Number(style.opacity);
  const page=opaque(el.parentElement);
  const ownFill=style.backgroundColor==='rgba(0, 0, 0, 0)'?page:parse(style.backgroundColor);
  const fill=over(ownFill,a,page),ink=over(parse(style.color),a,over(ownFill,1,page));
  const x=L(ink),y=L(fill);
  return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
};

// `button{transition:background .15s}` means getComputedStyle returns an INTERPOLATED colour
// while the button is settling into its disabled fill, and measuring there reads a figure that
// is true for 150 ms and true of nothing. Wait for two identical readings before measuring.
const settled=async button=>{
  let last=null;
  await expect.poll(async()=>{
    const now=await button.evaluate(el=>getComputedStyle(el).backgroundColor);
    const same=now===last;last=now;return same;
  },{timeout:5000}).toBe(true);
};

for(const scheme of ['dark','light'])
  test(`a disabled Run workflow button can still be read in ${scheme} mode`,async({page})=>{
    const errors=collectPageErrors(page);
    await page.goto('/');
    await page.emulateMedia({colorScheme:scheme});
    await page.evaluate(()=>localStorage.clear());
    // The blank canvas has no nodes, which is one of the two ways the button is disabled; the
    // other is a run in progress, and both take the same rule.
    await page.goto('/?example=blank');
    const button=page.locator('#run-button');
    await expect(button).toBeDisabled();
    await settled(button);
    expect(await button.evaluate(contrastOf)).toBeGreaterThan(4.5);
    // Visible as a control too, not just as text: the fill has to be distinguishable from the
    // bar behind it, or the button is a word floating in the header.
    const againstBar=await button.evaluate(el=>{
      const parse=v=>(v.match(/\d+(\.\d+)?/g)||[0,0,0]).slice(0,3).map(Number);
      const L=c=>{const [r,g,b]=c.map(v=>{const s=v/255;return s<=.03928?s/12.92:((s+.055)/1.055)**2.4;});
        return .2126*r+.7152*g+.0722*b;};
      const a=L(parse(getComputedStyle(el).backgroundColor));
      const b=L(parse(getComputedStyle(el.closest('.project-bar')).backgroundColor));
      return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
    });
    expect(againstBar).toBeGreaterThan(1.1);
    expect(errors).toEqual([]);
  });

test('the button stays readable while a worked example is running',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  // 06 has eighteen nodes and is the slowest example to load, which is why it was the one that
  // looked like it had lost its button.
  await page.goto('/?example=snow-isochrone');
  const button=page.locator('#run-button');
  await expect(button).toHaveText('◌ Running…',{timeout:20000});
  await settled(button);
  expect(await button.evaluate(contrastOf)).toBeGreaterThan(4.5);
  await expect(button).toHaveText('▶ Run workflow',{timeout:60000});
  expect(errors).toEqual([]);
});
