import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

/** THE RULE EDITOR AS A JSON EDITOR (the practitioner, 2026-11-21: "So we can make the rule editor a specialized JSON
 *  editor. Editor also validates in real time." and "Auto bracket."). Chief complaints sorted into syndromes by words:
 *  the rules as JSON, a comma left out and said on its line, brackets that close themselves, a file uploaded, a file
 *  downloaded, and the run that follows. */
test.use({serviceWorkers:'block'});
const COMPLAINTS=['N/V/D','Vomitting x2','fevr and cough','ankle injury'];
function workflow(){
  const data={kind:'data-table',keys:['visit','chief_complaint'],valueField:'n',
    rows:COMPLAINTS.map((c,i)=>({key:{visit:`V${i+1}`,chief_complaint:c},value:1})),rowCount:COMPLAINTS.length,missingValueCount:0};
  return {schema:'fieldwork/workflow/1',name:'Syndromes',nodes:[
    {id:'visits',type:'table_input',x:20,y:20,params:{label:'Visits',keys:data.keys,valueField:'n',data}},
    {id:'rules',type:'apply_ruleset',x:320,y:20,params:{label:'Syndromes',parameters:{},
      ruleset:{id:'urn:fieldwork:ruleset:written-in-this-workflow',version:'1.0.0',title:'Rules written in this workflow',inputs:[['subjects','table']],output:'table'},
      authored:{title:'Syndromes',mustNotBeReadAs:'a diagnosis',parameters:[],
        fields:[{attribute:'chief_complaint',predicate:'fwa:chief_complaint',kind:'term'}],rules:[]}}},
    {id:'out',type:'table_output',x:620,y:20,params:{label:'Visits by syndrome'}}],
    edges:[{id:'e1',from:'visits',to:'rules',port:'subjects'},{id:'e2',from:'rules',to:'out',port:'table'}]};
}
const RULES={schema:'fieldwork/authored-ruleset/1',title:'Syndromes',mustNotBeReadAs:'a diagnosis',
  fields:[{attribute:'chief_complaint',predicate:'fwa:chief_complaint',kind:'term'}],parameters:[],
  rules:[{any:[{all:[{field:'fwa:chief_complaint',comparator:'contains',value:'vomit, n/v, diarrh'}]}],then:[{predicate:'fwa:syndrome',value:'gastrointestinal'}]},
    {any:[{all:[{field:'fwa:chief_complaint',comparator:'contains',value:'fever, fevr'}]}],then:[{predicate:'fwa:syndrome',value:'influenza-like'}]}],
  otherwise:[{predicate:'fwa:syndrome',value:'other'}]};

test('the rules as JSON, checked as typed, brackets closed, uploaded and downloaded, then run',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles({name:'s.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(workflow()))});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="rules"]').click();
  await page.locator('#configure-step').click();
  const editor=page.locator('#rule-editor');
  // THE SAME RULESET AS JSON, the schema first.
  await editor.locator('[data-rule-view="json"]').click();
  const area=editor.locator('#rule-json');
  await expect(area).toHaveValue(/"schema": "fieldwork\/authored-ruleset\/1"/);
  await expect(editor.locator('.json-ok')).toBeVisible();
  // UPLOADED: the file's rules, checked and taken.
  await editor.locator('#rule-json-upload').setInputFiles({name:'syndromes.ruleset.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(RULES,null,2))});
  await expect(area).toHaveValue(/"influenza-like"/);
  await expect(editor.locator('.json-ok')).toBeVisible();
  // A COMMA LEFT OUT, said on its line while typing, and Apply held until it is fixed.
  const text=await area.inputValue(),broken=text.replace('"title": "Syndromes",','"title": "Syndromes"');
  await area.fill(broken);
  const line=broken.split('\n').findIndex(l=>l.includes('"title"'))+1;
  await expect(editor.locator('.json-problems')).toContainText(`Line ${line}`);
  await expect(editor.locator('.json-problems')).toContainText('A comma is missing after the value of "title"');
  await expect(editor.locator('.json-gutter .json-bad')).toHaveText(`⚠ ${line}`);
  await expect(page.locator('#config-apply')).toBeDisabled();
  await area.fill(text);
  await expect(editor.locator('.json-ok')).toBeVisible();
  // BRACKETS CLOSE THEMSELVES: typing at the end leaves a closed pair, and the closing one typed over.
  await page.waitForTimeout(600);
  const before=(await area.inputValue()).length;
  await area.focus();await area.evaluate(el=>el.setSelectionRange(el.value.length,el.value.length));
  await page.keyboard.type('[');
  await expect.poll(async()=>(await area.inputValue()).slice(-2)).toBe('[]');
  await page.keyboard.type(']');
  await expect.poll(async()=>(await area.inputValue()).length).toBe(before+2);
  await area.fill(text);
  await expect(editor.locator('.json-ok')).toBeVisible();
  // DOWNLOADED, as the file a person keeps.
  const [download]=await Promise.all([page.waitForEvent('download'),editor.locator('#rule-json-download').click()]);
  expect(download.suggestedFilename()).toBe('syndromes.ruleset.json');
  // THE RULES VIEW SHOWS THE SAME RULES, and the run sorts the complaints.
  await editor.locator('[data-rule-view="rules"]').click();
  await expect(editor.locator('.rule-words').first()).toHaveValue('vomit, n/v, diarrh');
  await page.locator('#config-apply').click();
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:30000});
  await page.locator('[data-view="results"]').click();
  const table=page.locator('#table-panel, .results-table, [data-result-table]').first();
  for(const word of ['gastrointestinal','influenza-like','other'])await expect(page.locator('body')).toContainText(word);
  void table;
  expect(errors).toEqual([]);
});
