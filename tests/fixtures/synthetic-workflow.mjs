/** A SMALL SYNTHETIC WORKFLOW FOR TESTS: one reasoning step shared by a map and a table.
 *
 *  The heat example served here until it retired on 2026-11-11 (docs/audits/old-naledi-audit.md), with its outreach
 *  ruleset and the decisions it produced. The tests that used it check general mechanics (one inference shared by every
 *  output, the execution plan, validation, evidence, packaging), so this keeps heat's eight synthetic places, one of them
 *  without a location, and replaces the retired ruleset with rules written in the workflow. Nothing here is an example
 *  shipped to anyone; the places and distances are made up. */
const WRITTEN='urn:fieldwork:ruleset:written-in-this-workflow';
const place=(id,name,km,coordinates)=>({type:'Feature',id,properties:{name,km},
  geometry:coordinates?{type:'Point',coordinates}:null});

export function syntheticWorkflow(){
  return {schema:'fieldwork/workflow/1',name:'Synthetic places',nodes:[
    {id:'places',type:'point_input',x:35,y:52,params:{label:'Places',data:{type:'FeatureCollection',features:[
      place('oakwood','Oakwood',6.1,[-84.455,33.873]),place('northgate','Northgate',7.4,[-84.337,33.875]),
      place('riverside','Riverside',2.2,[-84.438,33.812]),place('midtown','Midtown',0.3,[-84.37,33.79]),
      place('eastfield','Eastfield',8.6,[-84.277,33.795]),place('brookside','Brookside',5.5,[-84.421,33.734]),
      place('southpark','South Park',7.9,[-84.34,33.72]),place('cedar','Cedar Heights',null,null)]}}},
    {id:'criteria',type:'apply_ruleset',x:323,y:90,params:{label:'Farther than 5 km',parameters:{},
      ruleset:{id:WRITTEN,version:'1.0.0',title:'Rules written in this workflow',inputs:[['subjects','points']],output:'points'},
      authored:{title:'Farther than 5 km',mustNotBeReadAs:'A synthetic test fixture, not a screening rule.',parameters:[],
        fields:[{attribute:'km',predicate:'fw:distanceKm',kind:'number',label:'Distance',unit:'http://qudt.org/vocab/unit/KiloM'}],
        rules:[{any:[{all:[{field:'fw:distanceKm',comparator:'greaterThan',value:5}]}],
          then:[{predicate:'fw:decision',value:'fw:Review'}]}]}}},
    {id:'area',type:'study_area',x:35,y:280,params:{label:'Around the places',source:'drawn',selectionMode:'bbox',
      geometry:{type:'Polygon',coordinates:[[[-84.5,33.7],[-84.25,33.7],[-84.25,33.9],[-84.5,33.9],[-84.5,33.7]]]}}},
    {id:'map',type:'map_output',x:605,y:70,params:{label:'Map'}},
    {id:'table',type:'table_output',x:605,y:249,params:{label:'Table'}}
  ],edges:[
    {id:'e1',from:'places',to:'criteria',port:'subjects'},
    {id:'e2',from:'criteria',to:'map',port:'points'},
    {id:'e3',from:'criteria',to:'table',port:'points'},
    {id:'e4',from:'area',to:'map',port:'area'}]};
}
/** The name the tests imported from core.js while the heat example was there. */
export const exampleWorkflow=syntheticWorkflow;
/** A stub reasoner for this fixture: the study area is ready for analysis, and every place gets `decision`. Counts its
 *  calls, so a test can tell the area's check from the rules' run. */
export function stubReasoner(decision='urn:fieldwork:Review'){
  const NS='urn:fieldwork:',ids=['oakwood','northgate','riverside','midtown','eastfield','brookside','southpark','cedar'];
  const stub=async input=>{stub.calls++;stub.inputs.push(input);return [{subject:NS+'area:area',predicate:NS+'readyForSpatialAnalysis',object:'true'},
    ...ids.map(id=>({subject:NS+'place:'+id,predicate:NS+'decision',object:decision}))];};
  stub.calls=0;stub.inputs=[];
  return stub;
}
