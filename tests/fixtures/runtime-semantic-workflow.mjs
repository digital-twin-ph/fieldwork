import {johnSnowExample} from '../../build/john-snow.js';
export function runtimeSemanticWorkflow(){
  const w=johnSnowExample('snow-isochrone');
  const point=(id,x,n=1)=>({type:'Feature',id,properties:{name:id,DEATHS:n},geometry:{type:'Point',coordinates:[x,51.513]}});
  for(const node of w.nodes){delete node.references;
    if(node.id==='pumps')node.params.data.features=[point('origin',-.136)];
    if(node.id==='context-pumps')node.params.data.features=[point('origin',-.136),point('other',-.135)];
    if(node.id==='locations')node.params.data.features=[point('near',-.1359,2),point('far',-.13,3)];
    if(node.id==='network')node.params.data={source:'Synthetic directed graph; not OSM',nodes:[{id:'a',coordinates:[-.136,51.513]},{id:'b',coordinates:[-.135,51.513]}],edges:[{from:'a',to:'b',lengthM:70}]};
    if(node.id==='catchments'){node.params.thresholds=[1,2];node.params.fillHoles=false;}
  }
  w.nodes.push({id:'voronoi',type:'voronoi',x:0,y:0,params:{label:'Nearest site',zone:30,hemisphere:'north'}},{id:'voronoi-table',type:'table_output',x:0,y:0,params:{label:'Voronoi regions',inputMode:'polygons'}});
  w.edges.push({id:'va',from:'study',to:'voronoi',port:'area'},{id:'vp',from:'context-pumps',to:'voronoi',port:'sites'},{id:'vt',from:'voronoi',to:'voronoi-table',port:'polygons'});
  return w;
}
// This fixture isolates semantic serialization; browser scenarios exercise real EYE.
export const readinessStub=async()=>[{subject:'urn:fieldwork:area:study',predicate:'urn:fieldwork:readyForSpatialAnalysis',object:'true',objectType:'Literal',datatype:'http://www.w3.org/2001/XMLSchema#boolean'}];
