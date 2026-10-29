import{l as s}from"./chunk-K6IMXJIS.js";function a(c){let r=[],i=new Set;for(let e of c){let o=e.params.provenance;if(!o)continue;let t=o.what?.trim();if(!t)continue;let n=s(o).trim(),d=`${t}\0${n}`;i.has(d)||(i.add(d),r.push({kind:"derived",id:`derived:${e.id}`,section:"Methods",fn:"source",text:t,...n?{detail:n}:{},nodeId:e.id}))}return r}export{a};
//# sourceMappingURL=chunk-2XXDUQEV.js.map
