import {test,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Asked on 2026-10-14: how do I see the Deeper Dive notebooks from each relevant widget?
// The answer was that fourteen of the fifteen were reachable from nothing, and the one that was
// linked sat below the evidence and definition blocks where nobody scrolled. The panel is now
// generated from widgets/parity.json and rendered beside the description. Only a browser can show
// that it renders where it is meant to and that its links are real.
const parity=JSON.parse(readFileSync(new URL('../widgets/parity.json',import.meta.url),'utf8'));
const forWidget=type=>parity.entries.filter(e=>e.widget.split(':').pop()===type&&e.diveDeeper);

test('a widget with a notebook offers it in the Inspector, above the fold',async({page})=>{
  await page.goto('/?example=snow-voronoi');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('.react-flow__node[data-id="catchments"]').click();

  const panel=page.locator('#inspector-content details.dive-deeper');
  await expect(panel).toHaveCount(1);
  await expect(panel.locator('summary')).toHaveText('Dive Deeper');
  // Collapsed: reference material beside the knob, not a notice competing with it.
  assert.equal(await panel.evaluate(el=>el.open),false);

  // It must be reachable without scrolling past the evidence and definition blocks, which is
  // where it was and why it went unseen. Asserted against the Evidence section's position
  // rather than a pixel count, so the check survives the Inspector growing.
  const order=await page.evaluate(()=>{
    const body=document.querySelector('#inspector-content');
    const dive=body.querySelector('details.dive-deeper');
    const evidence=[...body.querySelectorAll('*')].find(el=>/^Evidence references/.test(el.textContent?.trim()||'')&&el.children.length===0);
    return evidence?dive.compareDocumentPosition(evidence)&Node.DOCUMENT_POSITION_FOLLOWING?'before':'after':'no-evidence-block';
  });
  assert.equal(order,'before','the Dive Deeper panel must come before the evidence block');

  await panel.locator('summary').click();
  // The Voronoi offers two: its own section, and the projection one because it measures in metres.
  const links=panel.locator('a');
  await expect(links).toHaveCount(2);
  const hrefs=await links.evaluateAll(els=>els.map(e=>e.getAttribute('href')));
  for(const href of hrefs){
    assert.match(href,/^https:\/\/digital-twin-ph\.github\.io\/validation-lab\/lab\/index\.html\?path=[\w.%-]+\.ipynb$/,href);
  }
  assert.ok(hrefs.some(h=>h.includes('15-voronoi')),`its own notebook is missing: ${hrefs}`);
  assert.ok(hrefs.some(h=>h.includes('01-reproject')),`the projection notebook is missing: ${hrefs}`);
  assert.equal(await links.first().getAttribute('rel'),'noopener noreferrer');
  await page.screenshot({path:'test-results/dive-deeper-inspector.png'});
});

test('the headings shown are the ones the ledger records, and a widget without one shows nothing',async({page})=>{
  await page.goto('/?example=snow-voronoi');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});

  // The link text comes from the notebook's own section heading, so a practitioner reads what
  // the section is called rather than a label written separately and left to drift.
  await page.locator('.react-flow__node[data-id="clip"]').click();
  const panel=page.locator('#inspector-content details.dive-deeper');
  await panel.locator('summary').click();
  const recorded=forWidget('clip_polygons');
  assert.equal(recorded.length,1,'expected clip_polygons to record one Dive Deeper section');
  await expect(panel).toContainText(recorded[0].diveDeeper.replace(/^Dive deeper · /i,''));

  // A table output computes nothing and has no notebook; it must not claim one.
  await page.locator('.react-flow__node[data-id="table"]').click();
  await expect(page.locator('#inspector-content details.dive-deeper')).toHaveCount(0);
});

// The lessons moved to their own repository on 2026-10-20, so the link has to leave for the new
// site rather than the Lab's. The practitioner had asked whether the repo was being used: it was
// created, recorded as a decision, and nothing pointed at it.
test('a widget with a lesson links the dive-deeper site, not the lab',async({page})=>{
  await page.goto('/?example=snow-geoprivacy');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('.react-flow__node[data-id="original-center"]').click();

  const link=page.locator('#inspector-content details.dive-deeper a').first();
  await expect(link).toHaveAttribute('href',/digital-twin-ph\.github\.io\/dive-deeper\/lab\/index\.html\?path=mean-center\.ipynb/);
  await expect(link).toHaveText('Where the centre of an outbreak is, and what moves it');
  // What it teaches is the ledger's sentence, not a generic one written per widget.
  await expect(page.locator('#inspector-content details.dive-deeper')).toContainText('2.10 m');
});
