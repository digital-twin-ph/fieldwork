/** A PUBLISHED RULESET ON A CANVAS: compare-level-to-elevation applied to a small table, as a table step then a rule
 *  step then a table. Snow's outbreak-extent workflow served the editor tests until its extent rule retired on
 *  2026-11-11 (docs/audits/old-naledi-audit.md); this is the one shipped ruleset that runs on data a test can state. */
export function compareLevelWorkflow(){
  const rows=[['A',500,0.2],['B',300,1.5],['C',400,null]];
  const data={kind:'data-table',keys:['place','value_mm','elevation_m'],valueField:'n',numericKeys:{value_mm:'millimetre',elevation_m:'metre'},
    rows:rows.map(([place,value_mm,elevation_m])=>({key:{place,value_mm,elevation_m},value:1})),rowCount:rows.length,missingValueCount:0};
  return {schema:'fieldwork/workflow/1',name:'Compare level to elevation',nodes:[
    {id:'places',type:'table_input',x:20,y:20,params:{label:'Places',keys:data.keys,valueField:'n',data}},
    {id:'review',type:'apply_ruleset',x:320,y:20,params:{label:'Compare a projected rise with an elevation',parameters:{},
      ruleset:{id:'urn:fieldwork:ruleset:compare-level-to-elevation',version:'1.0.0',
        title:'Compare a projected rise with an elevation',inputs:[['records','table']],output:'table'}}},
    {id:'out',type:'table_output',x:620,y:20,params:{label:'Compared'}}],
    edges:[{id:'e1',from:'places',to:'review',port:'records'},{id:'e2',from:'review',to:'out',port:'table'}]};
}
