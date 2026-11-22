import {test,expect} from './fixtures.mjs';
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
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="catchments"]').click();

  const panel=page.locator('#inspector-content details.dive-deeper');
  await expect(panel).toHaveCount(1);
  await expect(panel.locator('summary')).toHaveText('Dive Deeper');
  // Collapsed: reference material beside the knob, not a notice competing with it.
  assert.equal(await panel.evaluate(el=>el.open),false);

  // It must be reachable without scrolling past the evidence and definition blocks, which is where it was and why it went
  // unseen. On the standard Inspector (Voronoi's since 0.169.0) it sits in Learn and record, beside the Manual and the
  // Evidence button, above the step's actions.
  const section=page.locator('#inspector-content .standard-section',{has:page.locator('#manage-references')});
  await expect(section.locator('details.dive-deeper')).toHaveCount(1);
  const below=await page.evaluate(()=>{const dive=document.querySelector('#inspector-content details.dive-deeper'),
    actions=document.querySelector('#inspector-content #duplicate-node');
    return !!actions&&!!(dive.compareDocumentPosition(actions)&Node.DOCUMENT_POSITION_FOLLOWING);});
  assert.ok(below,'the Dive Deeper panel must come before the step actions');

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
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="clip"]').click();
  const panel=page.locator('#inspector-content details.dive-deeper');
  await panel.locator('summary').click();
  const recorded=forWidget('clip_polygons');
  assert.equal(recorded.length,1,'expected clip_polygons to record one Dive Deeper section');
  await expect(panel).toContainText(recorded[0].diveDeeper.replace(/^Dive deeper · /i,''));

  // A table output computes nothing and has no notebook; it must not claim one.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="table"]').click();
  await expect(page.locator('#inspector-content details.dive-deeper')).toHaveCount(0);
});

// The lessons moved to their own repository on 2026-10-20, so the link has to leave for the new
// site rather than the Lab's. The practitioner had asked whether the repo was being used: it was
// created, recorded as a decision, and nothing pointed at it.
test('a widget with a lesson links the dive-deeper site, not the lab',async({page})=>{
  await page.goto('/?example=snow-geoprivacy');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="original-center"]').click();

  const link=page.locator('#inspector-content details.dive-deeper a').first();
  await expect(link).toHaveAttribute('href',/digital-twin-ph\.github\.io\/dive-deeper\/lab\/index\.html\?path=mean-center\.ipynb/);
  await expect(link).toHaveText('Where the centre of an outbreak is, and what moves it');
  // What it teaches is the ledger's sentence, not a generic one written per widget.
  await expect(page.locator('#inspector-content details.dive-deeper')).toContainText('2.10 m');
});
