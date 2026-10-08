import{a as f}from"./chunk-Y27K76V3.js";function a(i){let r=n=>`<urn:fieldwork:canvas:node:${encodeURIComponent(n)}>`,t=`@prefix fw: <urn:fieldwork:>.
@prefix prov: <http://www.w3.org/ns/prov#>.
@prefix dct: <http://purl.org/dc/terms/>.
`;for(let n of i.nodes){let e=f.widgets.find(o=>o.nodeType===n.type);if(!e)throw new Error(`No semantic widget registration for ${n.type}`);let s=e.releases.find(o=>o.version===e.currentVersion);t+=`${r(n.id)} a fw:CanvasNodePlan, prov:Plan; dct:identifier ${JSON.stringify(n.id)}; fw:nodeType ${JSON.stringify(n.type)}; fw:widget <${e.id}>; fw:catalogVersion ${JSON.stringify(e.currentVersion)}; fw:catalogDigest ${JSON.stringify(s.sha256)}; fw:configuration ${JSON.stringify(JSON.stringify(n.params))}.
<${e.id}> a fw:WidgetDefinition.
`}for(let n of i.edges)t+=`<urn:fieldwork:canvas:edge:${encodeURIComponent(n.id)}> a fw:CanvasConnection; fw:fromPlan ${r(n.from)}; fw:toPlan ${r(n.to)}; fw:inputPort ${JSON.stringify(n.port)}.
`;return t}export{a};
//# sourceMappingURL=chunk-6N76ZU3J.js.map
