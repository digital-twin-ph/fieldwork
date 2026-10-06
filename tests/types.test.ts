// Compile-only regression cases. An unused @ts-expect-error fails typecheck,
// so these protect the contracts against accidental broadening to any.
import type {NodeSpec,WorkflowNode,PointCollection,SpatialReference} from '../src/types.js';
import type {ReasoningRequest,ReasoningResponse} from '../src/worker-types.js';
import {mapOutput} from '../src/map-output.js';
import type {CoverageValue} from '../src/results.js';

const area:NodeSpec<'measure_area'>={type:'measure_area',params:{unit:'km2'}};
void area;
// @ts-expect-error A linear unit cannot describe polygon area.
const wrongUnit:NodeSpec<'measure_area'>={type:'measure_area',params:{unit:'km'}};
// @ts-expect-error A map output cannot use point-source parameters.
const wrongParams:NodeSpec<'map_output'>={type:'map_output',params:{data:{type:'FeatureCollection',features:[]}}};
// @ts-expect-error Browser geometry is explicitly longitude-latitude, not latitude-longitude.
const wrongAxis:SpatialReference={datum:'WGS84',geodeticCRS:'EPSG:4326',geometryCRS:'OGC:CRS84',axisOrder:'latitude-longitude',units:'degree'};
// @ts-expect-error Requests carry N3 text.
const wrongMessage:ReasoningRequest={id:1,input:42};
// @ts-expect-error Replies contain a quad array, not serialized text.
const wrongReply:ReasoningResponse={id:1,quads:'not quads'};
// @ts-expect-error Point inputs cannot contain polygon geometry.
const wrongGeometry:PointCollection={type:'FeatureCollection',features:[{type:'Feature',id:'p1',properties:{name:'Pin'},geometry:{type:'Polygon',coordinates:[]}}]};

declare const node:WorkflowNode;
if(node.type==='observations'){
  node.params.data.features[0]?.properties.name.toUpperCase();
  // @ts-expect-error A point source has no area unit setting.
  node.params.unit;
}
declare const map:WorkflowNode<'map_output'>;
declare const reviewed:CoverageValue;
mapOutput(map,{coverage:reviewed},'run');
// @ts-expect-error Reviewed coverage and raw point layers are alternative inputs.
mapOutput(map,{coverage:reviewed,points:{layers:[]}},'run');
