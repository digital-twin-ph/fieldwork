import {test,expect} from './fixtures.mjs';
import {readFileSync,existsSync} from 'node:fs';
import {collectPageErrors} from './page-errors.mjs';

/** MERS AS PINNED: the waves (experiment 216) and the hospitals' inset (experiment 213). Opened from the example
 *  repository's bundle, served locally as the pinned file, and run. The numbers asserted were measured in 216: 67
 *  chains, SK_1's of 94; 135 dated cases by generation 40, 28, 65 and 2. */
test.use({serviceWorkers:'block'});
const BUNDLE=new URL('../../example-2015-mers-korea/fieldwork-project.json.gz',import.meta.url);
const skip=existsSync(BUNDLE)?false:'example-2015-mers-korea is not checked out beside this repository.';
const ID='urn:fieldwork:example:mers-korea-2015';

const open=async page=>{
  const bundle=readFileSync(BUNDLE);
  await page.route(/raw\.githubusercontent\.com\/digital-twin-ph\/example-2015-mers-korea\/[^/]+\/fieldwork-project\.json\.gz/,r=>r.fulfill({status:200,body:bundle}));
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('[data-view="project"]').click();
  await page.locator(`[data-open-example="${ID}"]`).click();
  await expect(page.locator(`[data-example-status="${ID}"]`)).toContainText('digest matched',{timeout:60000});
};
const run=async(page,named)=>{
  await page.locator('[data-view="workflow"]').click();
  const option=page.locator('#workflow-select option',{hasText:named});
  await page.locator('#workflow-select').selectOption(await option.getAttribute('value'));
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:90000});
};

test('MERS came in waves: each case its chain, the curve by generation, the chains by size',async({page})=>{
  test.skip(!!skip,skip);test.setTimeout(240000);
  const errors=collectPageErrors(page);
  await open(page);
  await run(page,'Did it come in waves?');
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'The chains, by size'}).click();
  const main=page.locator('main').first();
  await expect(main.locator('tr',{hasText:'SK_1'}).first()).toContainText('94');
  await page.getByRole('tab',{name:'Epidemic curve by generation'}).click();
  await expect(main).toContainText('MERS-CoV cases by day of onset and generation');
  // The step's own account, in its Inspector.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="transmission_chains-1794680000004"]').click();
  await expect(page.locator('#inspector-content')).toContainText('162 cases in 67 chains');
  await expect(page.locator('#inspector-content')).toContainText('the largest starts with SK_1 and holds 94 cases over 4 generations');
  await page.locator('.react-flow__node[data-id="case_series-1794680000005"]').click();
  await expect(page.locator('#inspector-content')).toContainText('each id once');
  // Configure… shows the chains before Apply.
  await page.locator('.react-flow__node[data-id="transmission_chains-1794680000004"]').click();
  await page.locator('#configure-step').click();
  await expect(page.locator('#chains-dialog')).toContainText('67 chains');
  await page.locator('#chains-dialog #config-cancel').click();
  await page.screenshot({path:'test-results/mers-waves.png',fullPage:true});
  expect(errors).toEqual([]);
});

test('the hospitals’ map carries its inset: the box, the enlarged part, two lines, a scale bar; and it can be picked again',async({page})=>{
  test.skip(!!skip,skip);test.setTimeout(240000);
  const errors=collectPageErrors(page);
  await open(page);
  await run(page,'Where were the cases in hospital?');
  await page.locator('[data-view="notes"]').click();
  const figure=page.locator('#notes-view .notes-note',{hasText:'Where were the cases in hospital?'}).first();
  await expect(figure.locator('svg [data-inset-frame]')).toBeAttached({timeout:30000});
  expect(await figure.locator('svg [data-inset-line]').count()).toBe(2);
  await expect(figure.locator('svg [data-inset-scale]')).toContainText(/km/);
  // Every hospital in the inset at least a mark's width from the next.
  const apart=await figure.locator('svg [data-inset-frame]').evaluate(frame=>{
    const marks=[...frame.querySelectorAll('[data-place]')].map(g=>{const b=g.getBoundingClientRect();return [b.x+b.width/2,b.y+b.height/2,b.width];});
    let least=Infinity;for(let i=0;i<marks.length;i++)for(let j=i+1;j<marks.length;j++){
      const d=Math.hypot(marks[i][0]-marks[j][0],marks[i][1]-marks[j][1]);if(d>0.5)least=Math.min(least,d/marks[i][2]);}
    return {marks:marks.length,least};});
  expect(apart.marks).toBeGreaterThan(3);
  expect(apart.least).toBeGreaterThanOrEqual(1);
  console.log('inset marks',JSON.stringify(apart));
  await figure.screenshot({path:'test-results/mers-inset-figure.png'});
  // Picked again on Configure…'s preview, which can be zoomed where the static figure cannot: the box changes, and
  // Apply keeps it.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="map_output-1794679906640"]').click();
  await page.locator('#configure-step').click();
  const dialog=page.locator('dialog[open]').last();
  await expect(dialog.locator('#map-inset-arrange')).toHaveValue('inset');
  await expect(dialog.locator('#map-config-preview .leaflet-container')).toBeVisible({timeout:20000});
  await dialog.locator('#map-config-preview .leaflet-control-zoom-in').click();
  await dialog.locator('[data-inset-from-preview]').click();
  await dialog.locator('#config-apply').click();
  const box=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.type==='map_output').params.inset.box);
  expect(box).not.toEqual([126.98,36.88,127.18,37.06]);
  expect(box[0]).toBeLessThan(box[2]);
  expect(errors).toEqual([]);
});

test('on an interactive map the picker sits on the map: zoom in, use the view, and the box is kept',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=hagelloch');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:90000});
  // Hagelloch's map of its cases over the village, switched to the interactive map in Configure….
  await page.locator('.react-flow__node[data-id="map"]').click();
  await page.locator('#configure-step').click();
  const dialog=page.locator('dialog[open]').last();
  await dialog.locator('#polygon-presentation').selectOption('interactive');
  await dialog.locator('#config-apply').click();
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:90000});
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'Where the cases were'}).click();
  const use=page.locator('.map-inset-bar.leaflet-control [data-inset-use]');
  await expect(use).toBeVisible({timeout:30000});
  // The whole view is refused: an inset shows a part.
  await page.locator('.leaflet-control-zoom-out').first().click();
  await use.click();
  await expect(page.locator('.toast').last()).toContainText(/whole map|outside the map/);
  for(let i=0;i<3;i++)await page.locator('.leaflet-control-zoom-in').first().click();
  await page.locator('.map-inset-bar.leaflet-control [data-inset-use]').click();
  await expect(page.locator('.toast').last()).toContainText('Kept as the inset');
  const inset=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.id==='map').params.inset);
  expect(inset.box[0]).toBeLessThan(inset.box[2]);
  await expect(page.locator('.map-inset-bar.leaflet-control [data-inset-clear]')).toBeVisible({timeout:20000});
  expect(errors).toEqual([]);
});
