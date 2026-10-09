import data from '../examples/john-snow/points.json';
import dates from '../examples/john-snow/dates.json';
import graph from '../examples/john-snow/network.json';
import type {Workflow,WorkflowNode,PointFeature} from './types.js';
import type {EvidenceReference} from './evidence.js';
const voronoiSource='https://github.com/PHI-Case-Studies/1854-Cholera-Outbreak-London-Advanced-2/blob/d1b56c135b0fab2f470b837a51e6777dfc20b286/';
const isoSource='https://github.com/PHI-Case-Studies/Jupyterlite-1854-Cholera-Outbreak-London-Advanced-1/blob/8bde848d13d71602b2b32c62e5d4b4957e4a45a1/content/';
function reference(id:string,title:string,url:string,role:EvidenceReference['role'],notes:string):EvidenceReference{return {id,kind:'url',title,url,role,authors:'PHI Case Studies; source attribution in repository',published:'',locator:'Pinned source revision',notes,addedAt:'2026-10-07T00:00:00.000Z',modifiedAt:'2026-10-07T00:00:00.000Z'};}
export function johnSnowExample(kind:'snow-voronoi'|'snow-isochrone'):Workflow{
  const iso=kind==='snow-isochrone',pumps=structuredClone(data.pumps) as PointFeature[],deaths=structuredClone(data.deaths) as PointFeature[];
  const nodes:WorkflowNode[]=[
    {id:'study',type:'area',x:20,y:20,params:{source:'drawn',label:'Soho reporting rectangle (illustrative)',selectionMode:'bbox',geometry:{type:'Polygon',coordinates:[[[-.142,51.509],[-.128,51.509],[-.128,51.517],[-.142,51.517],[-.142,51.509]]]}}},
    {id:'pumps',type:'observations',x:20,y:200,params:{label:iso?'Broadwick Street pump':'Eight pump locations',data:{type:'FeatureCollection',features:iso?pumps.filter(p=>p.id==='pump-250'):pumps},sourceInfo:{format:'CSV',url:voronoiSource+'data/pumps.csv',description:'Original FID retained in attributes; stable IDs prefixed pump-'}},references:[reference('pumps-source','Pump CSV',voronoiSource+'data/pumps.csv','data','Historical case-study point table; not a facility attendance record.')]},
    {id:'locations',type:'observations',x:610,y:300,params:{label:'250 death locations (489 deaths)',data:{type:'FeatureCollection',features:deaths},sourceInfo:{format:'CSV',url:voronoiSource+'data/cholera_deaths.csv',description:'This source subset has 250 locations; DEATHS totals 489.'}},references:[reference('deaths-source','Death location CSV',voronoiSource+'data/cholera_deaths.csv','data','Count locations and sum DEATHS separately. This is not the whole outbreak population or a mortality denominator.')]},
    iso?{id:'catchments',type:'isochrone',x:320,y:200,params:{label:'Walking-time catchment',zone:30,hemisphere:'north',minutes:5,thresholds:[1,5,10,15],fillHoles:true,speedMPerMin:75,bufferM:25,maxSnapM:100,direction:'outbound'},references:[reference('iso-method','John Snow isochrone notebook',isoSource+'NB03-Cholera-Case-Study-Isochrone-Map.ipynb','method','Conceptual adaptation; Fieldwork interpolates partial edges, preserves curved geometry and holes, and does not reproduce notebook infill. See local method review.')]}
      :{id:'catchments',type:'voronoi',x:320,y:200,params:{label:'Nearest pump catchments',zone:30,hemisphere:'north'},references:[reference('voronoi-method','John Snow Voronoi notebook',voronoiSource+'NB03-Constructing-Voronoi-Polygons.ipynb','method','Independent half-plane implementation in WGS84 UTM zone 30N. Original notebook uses angular coordinates; results need not match.')]},
    {id:'clip',type:'clip_polygons',x:620,y:30,params:{label:'Clip to reporting area'}},
    {id:'summary',type:'summarize_polygons',x:910,y:100,params:{label:'Locations and deaths by catchment',boundary:'include',valueField:'DEATHS'}},
    {id:'map',type:'map_output',x:1210,y:0,params:{label:iso?'Isochrone plot':'Voronoi catchment map',inputMode:'polygons',presentation:'plot',contextPoints:iso}},
    {id:'table',type:'table_output',x:1210,y:170,params:{label:'Catchment counts and deaths',inputMode:'polygons'}},
    {id:'chart',type:'chart_output',x:1210,y:340,params:{label:'Deaths by catchment',inputMode:'polygons'}},
    // Place and time from the same outbreak, side by side and deliberately not joined: the map has
    // buildings without dates and the table has dates without buildings, so no case links the two.
    {id:'dates',type:'table_input',x:20,y:620,params:{label:'Snow 1855 Table 1 · deaths by date',
      keys:['date'],valueField:'deaths',data:{kind:'data-table',keys:['date'],valueField:'deaths',
        rows:dates.rows.map(row=>({key:{date:row.date},value:row.deaths})),
        rowCount:dates.rows.length,missingValueCount:0},
      source:{filename:'snow_dates.csv',bytes:828,sha256:'',rows:dates.rows.length}},
      references:[reference('snow-dates','Snow 1855, Table 1','https://geodacenter.github.io/data-and-lab//snow/','data',
        `Daily attacks and deaths for the Broad Street outbreak. ${dates.excludedUndated.attacks} attacks of unknown date are excluded, because a keyed table cannot hold an empty key.`)]},
    {id:'curve',type:'case_series',x:470,y:620,params:{label:'Deaths by day',source:'table',
      dateField:'date',dateKind:'death',period:'day'}},
    {id:'epidemic',type:'chart_output',x:900,y:620,params:{label:'Epidemic curve · by date of death',inputMode:'series'}}
  ];
  if(iso)nodes.push({id:'network',type:'network_input',x:20,y:390,params:{label:'Soho OSM network snapshot',inputMethod:'file',marginM:250,data:structuredClone(graph)},references:[reference('network-source','Soho saved GraphML',isoSource+'outputs/soho.graphml','data','OpenStreetMap contributors, ODbL. Extraction date unknown. 738 nodes / 1619 directed edges; not a reconstructed 1854 network.')]});
  if(iso){
    const study=nodes.find(n=>n.id==='study')!;if(study.type==='area')study.params={source:'drawn',label:'Soho isochrone reporting extent (illustrative)',selectionMode:'bbox',geometry:{type:'Polygon',coordinates:[[[-.155,51.502],[-.119,51.502],[-.119,51.525],[-.155,51.525],[-.155,51.502]]]}};
    nodes.push({id:'context-pumps',type:'observations',x:910,y:450,params:{label:'All eight pumps (map context)',data:{type:'FeatureCollection',features:pumps}},references:structuredClone(nodes.find(n=>n.id==='pumps')!.references)});
    nodes.push({id:'interactive',type:'map_output',x:1210,y:510,params:{label:'Interactive isochrone map',inputMode:'polygons',presentation:'interactive',contextPoints:true}});
    nodes.find(n=>n.id==='catchments')!.references!.push(reference('nb04-visual','NB04 Cell 15 plot and Folium map','https://github.com/PHI-Case-Studies/1854-Cholera-Outbreak-London-Advanced-1/blob/97a1d13dfb23032387ed23804e3d6f4dbc99aec7/NB04-Cholera-Case-Study-Isochrone-Map.ipynb','method','Visual target: executed Cell 15 and Cell 18. Fieldwork retains its independent computational method; cumulative counts are not notebook band counts.'));
  }
  const edges=[{id:'sites-catchments',from:'pumps',to:'catchments',port:'sites'},{id:'area-clip',from:'study',to:'clip',port:'area'},{id:'catchments-clip',from:'catchments',to:'clip',port:'polygons'},{id:'clip-summary',from:'clip',to:'summary',port:'polygons'},{id:'points-summary',from:'locations',to:'summary',port:'points'},...['map','table','chart'].map(id=>({id:'summary-'+id,from:'summary',to:id,port:'polygons'})),{id:'dates-curve',from:'dates',to:'curve',port:'cases'},{id:'curve-epidemic',from:'curve',to:'epidemic',port:'series'},iso?{id:'network-catchments',from:'network',to:'catchments',port:'network'}:{id:'area-catchments',from:'study',to:'catchments',port:'area'}];
  if(iso){edges.push({id:'summary-interactive',from:'summary',to:'interactive',port:'polygons'},...['map','interactive'].map(to=>({id:'context-'+to,from:'context-pumps',to,port:'context'})));nodes.push({id:'acquisition-buffer',type:'buffer_area',x:320,y:430,params:{label:'Network acquisition buffer',distanceM:500}});edges.push({id:'area-buffer',from:'study',to:'acquisition-buffer',port:'area'},{id:'area-network',from:'acquisition-buffer',to:'network',port:'area'});}

  return {schema:'fieldwork/workflow/1',exampleId:kind,name:iso?'John Snow · network isochrones':'John Snow · Voronoi catchments',nodes,edges};
}
