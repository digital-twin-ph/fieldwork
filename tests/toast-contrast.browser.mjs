import {test,expect} from '@playwright/test';

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
