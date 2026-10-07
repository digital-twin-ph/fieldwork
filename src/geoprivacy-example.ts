import source from '../examples/john-snow/points.json';
import type {Workflow,WorkflowNode,PointFeature} from './types.js';
import type {EvidenceReference} from './evidence.js';

const ref=(id:string,title:string,url:string,role:EvidenceReference['role'],notes:string):EvidenceReference=>({id,kind:'url',title,url,role,notes,authors:'PHI Case Studies',published:'',locator:'Pinned source checkout',addedAt:'2026-10-07T00:00:00.000Z',modifiedAt:'2026-10-07T00:00:00.000Z'});
const sourceUrl='https://github.com/PHI-Case-Studies/1854-Cholera-Outbreak-London-Advanced-2/blob/d1b56c135b0fab2f470b837a51e6777dfc20b286/data/cholera_deaths.csv';
const notebookUrl='https://git.cdc.gov/jupyterlite/2026-Map-Encryption-Library';
export function geoprivacyExample():Workflow{
  const nodes:WorkflowNode[]=[
    {id:'study',type:'area',x:20,y:20,params:{source:'drawn',label:'Soho display extent (illustrative)',selectionMode:'bbox',geometry:{type:'Polygon',coordinates:[[[-.147,51.508],[-.126,51.508],[-.126,51.518],[-.147,51.518],[-.147,51.508]]]}}},
    {id:'locations',type:'observations',x:20,y:210,params:{label:'Private source: 250 death locations',data:{type:'FeatureCollection',features:structuredClone(source.deaths) as PointFeature[]},sourceInfo:{format:'CSV',url:sourceUrl,description:'250 locations; DEATHS counts sum to 489. Classroom historical data; private input in this exercise.'}},references:[ref('cholera-source','Cholera deaths CSV',sourceUrl,'data','Historical source locations and counts.')]},
    {id:'pumps',type:'observations',x:20,y:540,params:{label:'Eight historical pump locations',data:{type:'FeatureCollection',features:structuredClone(source.pumps) as PointFeature[]},sourceInfo:{format:'CSV',url:sourceUrl.replace('cholera_deaths.csv','pumps.csv'),description:'Eight pump points used as geographic context, not evidence of historical pump use.'}},references:[ref('pumps-source','Pump locations CSV',sourceUrl.replace('cholera_deaths.csv','pumps.csv'),'data','Historical pump positions for map context.')]},
    {id:'before-map',type:'map_output',x:330,y:15,params:{label:'BEFORE · private source map',inputMode:'spatial'}},
    {id:'before-table',type:'table_output',x:330,y:180,params:{label:'BEFORE · private source table',inputMode:'spatial'}},
    {id:'move',type:'donut_geomask',x:330,y:355,params:{label:'Donut geomasking',innerM:50,outerM:125,seed:42},references:[ref('donut-notebook','Donut geomasking notebook',notebookUrl+'/-/blob/948eeda/00a-donut-geomasking.ipynb','method','Educational adaptation. Seeded browser PRNG is not cryptographic; no anonymity guarantee.')]},
    {id:'after-move-map',type:'map_output',x:640,y:290,params:{label:'AFTER · moved points map',inputMode:'spatial'}},
    {id:'after-move-table',type:'table_output',x:640,y:450,params:{label:'AFTER · moved points table',inputMode:'spatial'}},
    {id:'original-center',type:'mean_center',x:940,y:35,params:{label:'Original mean center',zone:30,hemisphere:'north'}},
    {id:'moved-center',type:'mean_center',x:940,y:505,params:{label:'Moved mean center',zone:30,hemisphere:'north'}},
    {id:'compare',type:'compare_point_sets',x:1240,y:290,params:{label:'Mean-center displacement',zone:30,hemisphere:'north',centers:true},references:[ref('donut-evaluation','Donut geomasking evaluation notebook',notebookUrl+'/-/blob/948eeda/00b-donut-geomasking-evaluation.ipynb','method','Adapted mean-center comparison; unweighted projected location means and pump context, not a privacy test.')]},
    {id:'comparison-map',type:'comparison_map',x:1540,y:290,params:{label:'PRIVATE · original vs moved centers'}},
    {id:'group',type:'hex_aggregate',x:330,y:610,params:{label:'H3 cell aggregation',resolution:9,minOccupancy:2},references:[ref('hex-notebook','Hex grid binning notebook',notebookUrl+'/-/blob/948eeda/00c-hex-grid-binning.ipynb','method','H3 cells and minimum occupancy; occupancy does not ensure anonymity.')]},
    {id:'after-group-map',type:'map_output',x:640,y:630,params:{label:'AFTER · H3 cells map',inputMode:'polygons',presentation:'plot'}},
    {id:'after-group-table',type:'table_output',x:640,y:790,params:{label:'AFTER · H3 cells table',inputMode:'polygons'}}
  ];
  const edge=(from:string,to:string,port:string)=>({id:`${from}-${to}-${port}`,from,to,port});
  return {schema:'fieldwork/workflow/1',exampleId:'snow-geoprivacy',name:'John Snow · geoprivacy transformations',nodes,edges:[edge('study','before-map','area'),edge('locations','before-map','points'),edge('locations','before-table','points'),edge('locations','move','points'),edge('study','after-move-map','area'),edge('move','after-move-map','points'),edge('move','after-move-table','points'),edge('locations','original-center','points'),edge('move','moved-center','points'),edge('locations','compare','original'),edge('move','compare','moved'),edge('pumps','compare','pumps'),edge('original-center','compare','originalCenter'),edge('moved-center','compare','movedCenter'),edge('compare','comparison-map','comparison'),edge('locations','group','points'),edge('group','after-group-map','polygons'),edge('group','after-group-table','polygons')]};
}
