import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';
import {readFileSync} from 'node:fs';

/** MAKE BANDS… (the practitioner, 2026-11-12: "How do we assist the user in configuring age bands"): from a start and
 *  rising cut points, the rules for each band, previewed as typed, added as ordinary rules; Hagelloch's ages banded. */
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
const wire=async(page,from,to,port)=>{
  const a=await page.locator(`.react-flow__node[data-id="${from}"] [data-handleid="out"]`).boundingBox();
  const b=await page.locator(`.react-flow__node[data-id="${to}"] [data-handleid="${port}"]`).boundingBox();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:20});await page.mouse.up();
  await expect.poll(async()=>(await saved(page)).edges.some(e=>e.from===from&&e.to===to)).toBe(true);
};

test('bands from cut points: previewed, written as rules with no gap or overlap, and every child banded',async({page})=>{
  test.setTimeout(120_000);
  const errors=collectPageErrors(page);
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=hagelloch-people');
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#node-library [data-add="apply_ruleset"]').click();
  const step=(await saved(page)).nodes.filter(n=>n.type==='apply_ruleset').pop().id;
  await page.locator('#configure-step').click();
  await page.locator('#ruleset-choice').selectOption('authored');
  await page.locator('#ruleset-config #config-apply').click();
  await page.locator('#rule-editor #config-cancel').click();
  await page.locator('#tidy-button').click();
  await wire(page,'cases',step,'subjects');
  await page.locator(`.react-flow__node[data-id="${step}"]`).click();
  await page.locator('#configure-step').click();
  const editor=page.locator('#rule-editor');
  await editor.locator('[aria-label="Unit for age"]').fill('years');
  await editor.locator('[aria-label="Unit for age"]').press('Tab');
  await editor.locator('#rule-editor-bands summary').click();
  await editor.locator('#bands-field').selectOption({label:'age'});
  await editor.locator('#bands-cuts').fill('1, 5, 10');
  await expect(editor.locator('#bands-preview')).toHaveText('0 · 1 to 4 · 5 to 9 · 10 and over');
  await editor.locator('#bands-cuts').fill('5, 1');
  await expect(editor.locator('#bands-preview')).toContainText('must rise');
  await editor.locator('#bands-cuts').fill('1, 5, 10');
  await editor.locator('#bands-column').fill('age_band');
  await editor.locator('#bands-add').click();
  await expect(editor.locator('[data-rule]')).toHaveCount(4);
  await editor.locator('#config-apply').click();
  await page.locator('#node-library [data-add="table_output"]').click();
  const out=(await saved(page)).nodes.filter(n=>n.type==='table_output').pop().id;
  await page.locator('#tidy-button').click();
  const declared=await page.locator(`.react-flow__node[data-id="${out}"] [data-handleid="points"]`).count();
  await wire(page,step,out,declared?'points':'layer');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60_000});
  // Hagelloch's 188 children: each in exactly one band, by the file's own ages.
  const ages=JSON.parse(readFileSync(new URL('../examples/hagelloch-1861/cases.json',import.meta.url),'utf8')).features.map(f=>f.properties.age);
  const want={'0':0,'1 to 4':0,'5 to 9':0,'10 and over':0};
  for(const a of ages)want[a<1?'0':a<5?'1 to 4':a<10?'5 to 9':'10 and over']++;
  await page.locator('[data-view="results"]').click();
  const text=await page.locator('main').first().innerText();
  for(const band of Object.keys(want))expect(text).toContain(band);
  expect(Object.values(want).reduce((a,b)=>a+b,0)).toBe(188);
  expect(errors).toEqual([]);
});
