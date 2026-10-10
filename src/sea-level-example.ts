import projections from '../examples/manila-sea-level/projections.json';
import sites from '../examples/manila-sea-level/sites.json';
import facilities from '../examples/manila-sea-level/facilities.json';
import provenance from '../examples/manila-sea-level/provenance.json';
import type {PointCollection,Workflow,WorkflowNode} from './types.js';
import type {EvidenceReference} from './evidence.js';

/** Manila coastal exposure: published sea-level projections against real facilities.
 *
 *  Built incrementally. This is the first part — which facilities, which published projection
 *  site, and how far apart they are — and it deliberately stops short of comparing a projected
 *  level to an elevation, because no elevation has been supplied yet and inventing one would be
 *  the worst thing this example could teach.
 *
 *  Everything here is real and runs with no network. The projections are the AR6 extract this
 *  project made from the published archive; the eight sites are the published tide gauges that
 *  extract covers; the facilities are OpenStreetMap health facilities inside a Manila box, the
 *  same data Find health facilities retrieves live. A practitioner can delete the bundled
 *  facilities node and connect that widget instead, which is the point of bundling a sample
 *  rather than a special format. */

const cite=(id:string,title:string,url:string,role:EvidenceReference['role'],notes:string):EvidenceReference=>
  ({id,kind:'url',title,url,role,authors:'',published:'',locator:'',notes,
    addedAt:'2026-10-10T00:00:00.000Z',modifiedAt:'2026-10-10T00:00:00.000Z'});

const AR6=provenance.projections;

export function seaLevelExample():Workflow{
  const nodes:WorkflowNode[]=[
    {id:'area',type:'area',x:20,y:40,params:{source:'drawn',label:'Manila coastal study area',
      selectionMode:'bbox',geometry:{type:'Polygon',coordinates:[[
        [120.93,14.52],[121.05,14.52],[121.05,14.68],[120.93,14.68],[120.93,14.52]]]}}},

    {id:'facilities',type:'observations',x:20,y:250,
      params:{label:`${facilities.features.length} Manila health facilities`,
        data:structuredClone(facilities) as PointCollection,
        sourceInfo:{format:'GeoJSON',source:provenance.facilities.source,
          licence:provenance.facilities.licence}},
      references:[cite('osm-facilities','OpenStreetMap health facilities, HOT country export',
        'https://www.openstreetmap.org/copyright','data',
        `${provenance.facilities.attribution}. ${provenance.facilities.note} Replaceable by the Find health facilities widget, which retrieves the same data live.`)]},

    // The eight published tide gauges the extract covers. A site is where a projection exists,
    // not a place of interest, and the distance to one is part of the result rather than a
    // detail: a projection at a gauge is not a value for an arbitrary point.
    {id:'sites',type:'observations',x:20,y:470,
      params:{label:`${sites.features.length} AR6 projection sites`,
        data:structuredClone(sites) as PointCollection,
        sourceInfo:{format:'CSV',source:provenance.sites.source,licence:provenance.sites.licence}},
      references:[cite('ar6-sites','IPCC AR6 projection site list',
        'https://github.com/Rutgers-ESSP/IPCC-AR6-Sea-Level-Projections','data',
        'The published list of locations at which AR6 provides projections. Only the eight the bundled extract covers are included; a site layer wider than the extract would offer assignments to sites carrying no projection.')]},

    {id:'projections',type:'table_input',x:420,y:470,
      params:{label:'AR6 projections · 8 Philippine tide gauges',
        keys:projections.keys,valueField:projections.valueField,unit:projections.unit,
        data:structuredClone(projections) as never,
        source:{filename:'ar6-philippines-gauges-extract.csv',bytes:0,sha256:'',
          rows:projections.rowCount}},
      references:[cite('ar6-dataset','IPCC AR6 Sea Level Projections',AR6.datasetIRI,'data',
        `Version ${AR6.datasetVersion}, ${AR6.licence}, values in ${AR6.unit}, measured against the ${AR6.baselinePeriod} baseline. ${AR6.note}`)]},

    {id:'extract',type:'slr_extract_import',x:760,y:470,
      params:{label:'Declare the extract',datasetIRI:AR6.datasetIRI,
        datasetVersion:AR6.datasetVersion,baselinePeriod:AR6.baselinePeriod,
        citations:AR6.requiredCitations as [string,string,string],
        basisKind:AR6.basisKind as 'confidence-pbox',
        familyValues:{withVerticalLandMotion:'with_vlm',withoutVerticalLandMotion:'without_vlm'}}},

    {id:'assignment',type:'slr_site_assignment',x:1080,y:250,
      params:{label:'Assign each facility its nearest gauge'}},

    {id:'map',type:'map_output',x:1400,y:40,
      params:{label:'Facilities and projection sites',inputMode:'spatial',pointInputCount:2}},
    {id:'table',type:'table_output',x:1400,y:300,
      params:{label:'Facility, assigned gauge, distance',inputMode:'table'}},
  ];
  return {schema:'fieldwork/workflow/1',name:'Manila coastal exposure · sea-level projections',
    exampleId:'sea-level',nodes,edges:[
      {id:'e-area-map',from:'area',to:'map',port:'area'},
      {id:'e-facilities-map',from:'facilities',to:'map',port:'points'},
      {id:'e-sites-map',from:'sites',to:'map',port:'points_2'},
      {id:'e-facilities',from:'facilities',to:'assignment',port:'points'},
      {id:'e-sites',from:'sites',to:'assignment',port:'sites'},
      {id:'e-projections',from:'projections',to:'extract',port:'projections'},
      {id:'e-extract',from:'extract',to:'assignment',port:'projections'},
      {id:'e-table',from:'assignment',to:'table',port:'table'},
    ]};
}
