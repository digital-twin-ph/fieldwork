import{a as d}from"./chunk-RLISDMUH.js";import{b as s}from"./chunk-HZDOZ2AB.js";import{d as f}from"./chunk-ZUGTHI7D.js";f();function c(o){let e=n=>`<urn:fieldwork:canvas:node:${encodeURIComponent(n)}>`,i=`@prefix fw: <urn:fieldwork:>.
@prefix prov: <http://www.w3.org/ns/prov#>.
@prefix dct: <http://purl.org/dc/terms/>.
`;for(let n of o.nodes){let r=d.widgets.find(t=>t.nodeType===n.type);if(!r)throw new Error(`No semantic widget registration for ${n.type}`);let a=r.releases.find(t=>t.version===r.currentVersion);i+=`${e(n.id)} a fw:CanvasNodePlan, prov:Plan; dct:identifier ${JSON.stringify(n.id)}; fw:nodeType ${JSON.stringify(n.type)}; fw:widget <${r.id}>; fw:catalogVersion ${JSON.stringify(r.currentVersion)}; fw:catalogDigest ${JSON.stringify(a.sha256)}; fw:widgetDefinitionSource ${JSON.stringify(s)}; fw:configuration ${JSON.stringify(JSON.stringify(n.params))}.
<${r.id}> a fw:WidgetDefinition.
`}for(let n of o.edges)i+=`<urn:fieldwork:canvas:edge:${encodeURIComponent(n.id)}> a fw:CanvasConnection; fw:fromPlan ${e(n.from)}; fw:toPlan ${e(n.to)}; fw:inputPort ${JSON.stringify(n.port)}.
`;return i}export{c as a};
//# sourceMappingURL=chunk-6J3PLVKX.js.map
