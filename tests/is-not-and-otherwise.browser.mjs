import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

/** IS NOT, OTHERWISE, AND RULES AS BLOCKS (experiment 192). Seven made-up cases with a laboratory result, a contact and
 *  a rash; the step's rules give a class, and what no rule classifies takes the otherwise. */
test.use({serviceWorkers:'block'});
const cases=[['Positive','No','Yes'],['Negative','Yes','Yes'],['Indeterminate','Yes','Yes'],['Pending','No','Yes'],['','','Yes'],['','Unknown','No'],['','','']]
  .map(([lab,contact,rash],i)=>({key:{case:`C${i+1}`,lab,contact,rash},value:1}));
const data={kind:'data-table',keys:['case','lab','contact','rash'],valueField:'n',rows:cases,rowCount:cases.length,missingValueCount:0};
const fields=['case','lab','contact','rash'].map(a=>({attribute:a,predicate:`fwa:${a}`,kind:'term'}));
const is=(f,v)=>({field:`fwa:${f}`,comparator:'equals',value:`fwa:${v}`});
const workflow={schema:'fieldwork/workflow/1',name:'Classes',exampleId:'blank',nodes:[
  {id:'t',type:'table_input',x:40,y:40,params:{label:'Cases',keys:data.keys,valueField:'n',data}},
  {id:'r',type:'apply_ruleset',x:340,y:40,params:{label:'Classify',parameters:{},
    ruleset:{id:'urn:fieldwork:ruleset:outreach-criteria',version:'1.0.0',title:'Rules written in this workflow',inputs:[['subjects','table']],output:'table'},
    authored:{title:'Classify the cases',mustNotBeReadAs:'',fields,parameters:[],
      rules:[{any:[{all:[is('lab','Positive')]}],then:[{predicate:'fwa:class',value:'fwa:Confirmed'}]},
        {any:[{all:[is('lab','Negative')]}],then:[{predicate:'fwa:class',value:'fwa:Discarded'}]}],
      otherwise:[]}}},
  {id:'o',type:'table_output',x:640,y:40,params:{label:'Out',inputMode:'table'}}],
  edges:[{id:'e1',from:'t',to:'r',port:'subjects'},{id:'e2',from:'r',to:'o',port:'table'}]};

/** WCAG contrast of two CSS colours. */
const contrast=(a,b)=>{const lum=c=>{const [r,g,bl]=c.match(/\d+(\.\d+)?/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4;});
  return 0.2126*r+0.7152*g+0.0722*bl;};const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+0.05)/(y+0.05);};

for(const theme of ['light','dark'])
test(`rules are blocks with their words, legible in ${theme}; is not and an otherwise are written and counted`,async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/?example=blank');
  await page.evaluate(t=>{try{localStorage.setItem('fieldwork.theme.v1',t);}catch{}},theme);
  await page.goto('/?example=blank');
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});
  await page.locator('#workflow-file').setInputFiles({name:'w.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(workflow))});
  await page.locator('.react-flow__node[data-id="r"]').click();
  for(const section of ['name','inputs','settings','result'])await expect(page.locator(`[data-standard-section="${section}"]`)).toBeVisible();
  await expect(page.locator('.inspector .standard-sentence')).toContainText('Classify the cases: 2 rules written on this step, giving class');
  await page.locator('#configure-step').click();
  const dialog=page.locator('#rule-editor');
  await expect(dialog.locator('.config-head')).toContainText('Apply ruleset');
  // EACH BLOCK HAS ITS WORD, and the word reads against its own fill at AA.
  await expect(dialog.locator('.rule-block-if .rule-word').first()).toHaveText(/if/i);
  await expect(dialog.locator('.rule-block-then .rule-word').first()).toHaveText(/then/i);
  for(const kind of ['if','then']){
    const [ink,fill]=await dialog.locator(`.rule-block-${kind}`).first().evaluate(e=>[getComputedStyle(e.querySelector('.rule-word')).color,getComputedStyle(e).backgroundColor]);
    expect(contrast(ink,fill),`${kind} word against its block, ${theme}`).toBeGreaterThanOrEqual(4.5);
  }
  // IS NOT: rule 3, contact is Yes and lab is not Positive and not Negative, gives Linked: C3, whose result is
  // Indeterminate. C2 has a contact and a Negative result, so it is not linked; a lab not recorded is never "not" anything.
  await dialog.locator('#rule-editor-add').click();
  const card=dialog.locator('.rule-card').last();
  await card.locator('[data-part="field"]').selectOption('fwa:contact');
  await card.locator('[data-part="value"]').fill('Yes');await card.locator('[data-part="value"]').press('Tab');
  for(const value of ['Positive','Negative']){
    await card.locator('[data-part="add-condition"]').click();
    await card.locator('[data-part="field"]').last().selectOption('fwa:lab');
    await card.locator('[data-part="comparator"]').last().selectOption('notEquals');
    await card.locator('[data-part="value"]').last().fill(value);await card.locator('[data-part="value"]').last().press('Tab');
  }
  await card.locator('[data-part="predicate"]').fill('class');await card.locator('[data-part="predicate"]').press('Tab');
  await card.locator('[data-part="conclusion"]').fill('Linked');await card.locator('[data-part="conclusion"]').press('Tab');
  await expect(dialog.locator('.rule-card').last().locator('h3')).toHaveText('Rule 3 · 1 record');
  // A COMPARATOR IS KEYED BY ITS FAMILY: equality here, its word at AA against its own tint.
  const op=dialog.locator('.rule-card').last().locator('select.rule-op-equal').last();
  await expect(op).toHaveValue('notEquals');
  const [opInk,opFill]=await op.evaluate(e=>[getComputedStyle(e).color,getComputedStyle(e).backgroundColor]);
  expect(contrast(opInk,opFill),`is not against its tint, ${theme}`).toBeGreaterThanOrEqual(4.5);
  // A CATEGORY ANOTHER RULE CONCLUDED is offered as a column a condition can read: rules in stages.
  await expect(card.locator('[data-part="field"]').first().locator('option[value="fwa:class"]')).toHaveCount(1);
  // OTHERWISE: the class of what no rule classifies.
  await dialog.locator('#rule-editor-add-otherwise').click();
  const otherwise=dialog.locator('.rule-block-otherwise').first();
  await expect(otherwise.locator('.rule-word')).toHaveText(/otherwise/i);
  await otherwise.locator('[data-otherwise-part="value"]').fill('Cannot be classified');
  await otherwise.locator('[data-otherwise-part="value"]').press('Tab');
  await expect(dialog.locator('.rule-block-otherwise .rule-block-count')).toHaveText('4 records');
  const [ink,fill]=await dialog.locator('.rule-block-otherwise').first().evaluate(e=>[getComputedStyle(e.querySelector('.rule-word')).color,getComputedStyle(e).backgroundColor]);
  expect(contrast(ink,fill),`otherwise word against its block, ${theme}`).toBeGreaterThanOrEqual(4.5);
  await dialog.screenshot({path:`test-results/rule-blocks-${theme}.png`});
  await dialog.locator('#config-apply').click();
  await expect(dialog).toBeHidden();
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="r"]').click();
  await expect(page.locator('[data-standard-section="result"]')).toContainText('because a column has an otherwise');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.id==='r').params.authored);
  expect(saved.otherwise).toEqual([{predicate:'fwa:class',value:'fwa:Cannot_be_classified'}]);
  expect(saved.rules[2].any[0].all.filter(c=>c.comparator==='notEquals').length).toBe(2);
  expect(errors).toEqual([]);
});
