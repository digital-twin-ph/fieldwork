import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

// "When refreshing the browser I get this alert but the text on the dark green buttons can't be
// read." -- the practitioner, 2026-10-15, with a screenshot of the update toast. The toast sets
// its text to --accent-contrast, which is near-black in dark mode, and .button paints its own
// dark surface behind that text. Dark on dark, inside a light green panel.
//
// The same defect shape as the manual's code chips the same day: a colour inherited from one
// place and a background from another, with nothing checking they can be seen together.
for(const scheme of ['dark','light'])
  test(`a toast action button reads against the toast in ${scheme} mode`,async({page})=>{
    await page.goto('/');
    await page.emulateMedia({colorScheme:scheme});
    await page.goto('/?example=blank');
    // Raise a toast that carries an action, the way the update prompt does.
    await page.evaluate(()=>{
      const toast=document.getElementById('toast');
      toast.textContent='A newer version of Fieldwork is ready. Reload to use it.';
      const button=document.createElement('button');
      button.className='button small';button.textContent='Reload';
      toast.append(button);toast.classList.add('visible');
    });
    const contrast=await page.locator('#toast .button').evaluate(el=>{
      const parse=v=>(v.match(/\d+(\.\d+)?/g)||[0,0,0]).slice(0,3).map(Number);
      const L=c=>{const [r,g,b]=c.map(v=>{const s=v/255;return s<=.03928?s/12.92:((s+.055)/1.055)**2.4;});
        return .2126*r+.7152*g+.0722*b;};
      // The button is transparent, so what sits behind its text is the toast.
      const style=getComputedStyle(el),behind=getComputedStyle(el.parentElement);
      const a=L(parse(style.color)),b=L(parse(behind.backgroundColor));
      return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
    });
    expect(contrast).toBeGreaterThan(4.5);
  });

// "This Reload button does not work." -- the practitioner, 2026-10-15, with a screenshot of the
// update toast. It did not, and neither did any other action a toast has ever offered. The
// toast is `pointer-events:none` so an invisible one does not swallow clicks on the canvas
// underneath it, and the rule that makes it visible restored the opacity and the position and
// not the pointer events. Legible since this morning and unclickable since it was written.
test('a toast action can actually be clicked',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/?example=blank');
  await page.evaluate(()=>{
    window.__clicked=0;
    const toast=document.getElementById('toast');
    toast.textContent='A newer version of Fieldwork is ready. Reload to use it.';
    const button=document.createElement('button');
    button.className='button small';button.textContent='Reload';
    button.onclick=()=>{window.__clicked++;};
    toast.append(button);toast.classList.add('visible');
  });
  // The element receives pointer events, which is what was missing.
  expect(await page.locator('#toast').evaluate(el=>getComputedStyle(el).pointerEvents)).toBe('auto');
  await page.locator('#toast .button').click();
  expect(await page.evaluate(()=>window.__clicked)).toBe(1);

  // And a hidden toast still lets clicks through to the canvas beneath it.
  await page.evaluate(()=>document.getElementById('toast').classList.remove('visible'));
  expect(await page.locator('#toast').evaluate(el=>getComputedStyle(el).pointerEvents)).toBe('none');
  expect(errors).toEqual([]);
});

// "This is hard to read - white on light orange." -- the practitioner, 2026-10-16, on the
// warning toast in dark mode. Measured at 2.08 against a 4.5 floor. All four tone/scheme pairs
// failed: light warning 3.81, light failure 3.72, dark warning 2.08, dark failure 2.41 — every
// one of them white text on a mid-tone fill, which is the same defect as the dark-green action
// button above and the manual's code chips before that.
//
// So every tone is held here, in both schemes, rather than the one that was complained about.
for(const scheme of ['dark','light'])
  for(const tone of ['warning','failure','notice'])
    test(`a ${tone} toast reads against its own background in ${scheme} mode`,async({page})=>{
      await page.goto('/');
      await page.emulateMedia({colorScheme:scheme});
      await page.goto('/?example=blank');
      const contrast=await page.evaluate(tone=>{
        const toast=document.getElementById('toast');
        toast.textContent='Complete in 534 ms: 5 output tabs updated. 66 records could not be read as declared.';
        toast.className=`toast visible ${tone}`;
        const parse=v=>(v.match(/\d+(\.\d+)?/g)||[0,0,0]).slice(0,3).map(Number);
        const L=c=>{const [r,g,b]=c.map(v=>{const s=v/255;return s<=.03928?s/12.92:((s+.055)/1.055)**2.4;});
          return .2126*r+.7152*g+.0722*b;};
        const style=getComputedStyle(toast);
        const a=L(parse(style.color)),b=L(parse(style.backgroundColor));
        return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
      },tone);
      expect(contrast,`${tone} in ${scheme}`).toBeGreaterThan(4.5);
    });
