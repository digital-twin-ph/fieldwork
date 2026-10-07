import {readFile, access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve, relative, isAbsolute} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {Parser} from 'n3';

const root=fileURLToPath(new URL('../',import.meta.url));
const semver=/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const check=(condition,message)=>{if(!condition)throw new Error(message);};
function localPath(path){
  check(typeof path==='string' && path.length>0,'Missing local path');
  const absolute=resolve(root,path), rel=relative(root,absolute);
  check(!isAbsolute(path)&&!rel.startsWith('..')&&!isAbsolute(rel),'Path outside repository');
  return absolute;
}
export async function sourceDefinitions(){
  // Bundle current TypeScript in memory, not a potentially stale build/core.js.
  const result=await build({absWorkingDir:root,entryPoints:['src/core.ts'],bundle:true,write:false,platform:'node',format:'esm'});
  const module=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
  return {definitions:module.TYPES,nodeInputs:module.nodeInputs};
}
export async function validateRegistry({catalog,read=path=>readFile(localPath(path),'utf8'),definitions,nodeInputs}={}){
  catalog??=JSON.parse(await read('widgets/registry.json'));
  if(!definitions)({definitions,nodeInputs}=await sourceDefinitions());
  check(catalog.schema==='fieldwork/widget-registry/1'&&Array.isArray(catalog.widgets),'Invalid registry schema');
  const ids=new Set(),types=new Set();let releaseCount=0;
  for(const entry of catalog.widgets){
    check(typeof entry.nodeType==='string'&&Object.hasOwn(definitions,entry.nodeType),'Unknown widget type');
    check(entry.id===`urn:fieldwork:widget:${entry.nodeType}`,'Invalid stable widget identity');
    check(!ids.has(entry.id)&&!types.has(entry.nodeType),'Duplicate widget identity');ids.add(entry.id);types.add(entry.nodeType);
    check(semver.test(entry.currentVersion),'Invalid current version');
    check(Array.isArray(entry.releases)&&entry.releases.length>0,'Missing releases');
    const versions=new Set();let current;
    for(const ref of entry.releases){
      check(semver.test(ref.version)&&!versions.has(ref.version),'Invalid or duplicate release version');versions.add(ref.version);
      check(ref.path===`widgets/releases/${entry.nodeType}/${ref.version}.json`,'Unexpected release path');
      const bytes=await read(ref.path);
      check(createHash('sha256').update(bytes).digest('hex')===ref.sha256,`Release digest mismatch: ${ref.path}`);
      const release=JSON.parse(bytes);releaseCount++;
      check(release.schema==='fieldwork/widget-release/1'&&release.id===entry.id&&release.nodeType===entry.nodeType&&release.version===ref.version,'Release identity mismatch');
      check(typeof release.title==='string'&&release.title.length>0&&/^\d{4}-\d{2}-\d{2}$/.test(release.released),'Missing release metadata');
      check(['implemented','proposed','retired'].includes(release.implementationStatus),'Invalid implementation status');
      check(['shared','example-specific'].includes(release.standardization),'Invalid standardization status');
      check(release.configuration?.planClass==='http://www.w3.org/ns/prov#Plan','Missing plan mapping');
      check(release.configuration.typescriptType===`ParamsByType['${entry.nodeType}']`,'Invalid parameter binding');
      check(release.configuration.validationStatus==='application-only'&&Array.isArray(release.configuration.shaclShapes)&&release.configuration.shaclShapes.length===0,'This registry version supports application validation only');
      check(['partial','gap'].includes(release.ontology?.status)&&Array.isArray(release.ontology.mappings),'Invalid ontology mapping status');
      check((release.ontology.status==='gap')===(release.ontology.mappings.length===0),'Ontology status contradicts mappings');
      for(const mapping of release.ontology.mappings){
        check(['entity','activity','configuration'].includes(mapping.role),'Invalid mapping role');
        const quads=new Parser().parse(await read(mapping.file));
        check(quads.some(q=>q.subject.value===mapping.iri&&q.predicate.value==='http://www.w3.org/1999/02/22-rdf-syntax-ns#type'&&q.object.value==='http://www.w3.org/2002/07/owl#Class'),`Undeclared ontology class: ${mapping.iri}`);
      }
      check(release.compatibility?.workflowSchema==='fieldwork/workflow/1'&&release.compatibility.versionPersistence==='not-yet-persisted','Unsupported workflow compatibility claim');
      check(Array.isArray(release.compatibility.migrationFrom),'Missing migration declarations');
      for(const migration of release.compatibility.migrationFrom){
        const heat=entry.nodeType==='observations'&&['places','centers'].includes(migration.nodeType)&&migration.implementation==='src/core.ts#validateWorkflow';
        const facilities=entry.nodeType==='facilities'&&migration.nodeType==='facilities'&&migration.implementation==='src/old-naledi.ts#migrateFacilitySources';
        const output=['map_output','table_output','chart_output'].includes(entry.nodeType)&&migration.nodeType==='output'&&migration.implementation==='src/output-contract.ts#migrateOutputNodes';
        check((heat||facilities||output)&&migration.adapterVersion==='1','Unknown migration adapter');
      }
      check(Array.isArray(release.changes)&&release.changes.length>0&&release.changes.every(c=>typeof c.description==='string'&&c.description.length>0),'Missing change history');
      check(release.evidence?.status==='not-individually-certified','Unsupported certification claim');
      // Historical releases may reference removed source paths. Check current paths only.
      if(ref.version===entry.currentVersion)current=release;
    }
    check(current,'Current version has no release');
    const def=definitions[entry.nodeType];
    check(current.title===def.title,'Widget title drift');
    check(JSON.stringify(current.ports.inputs)===JSON.stringify(def.inputs.map(([name,type])=>({name,type})))&&current.ports.output===def.output,`Port contract drift: ${entry.nodeType}`);
    if(entry.nodeType==='map_output'){check(current.ports.rasterInput?.value==='raster','Missing raster input mode');if(nodeInputs)check(JSON.stringify(nodeInputs({type:'map_output',params:{inputMode:'raster'}}))===JSON.stringify([['raster','raster']]),'Raster port contract drift');}
    if(['map_output','table_output','chart_output'].includes(entry.nodeType)){
      check(current.ports.polygonInput?.value==='polygons','Missing polygon input mode');
      if(nodeInputs)check(JSON.stringify(nodeInputs({type:entry.nodeType,params:{inputMode:'polygons'}}))===JSON.stringify([['polygons','polygons']]),'Polygon port contract drift');
    }
    const dynamic=['coverage_check','map_output','table_output'].includes(entry.nodeType);
    check(dynamic===Boolean(current.ports.dynamicInputs),'Dynamic port contract drift');
    if(['map_output','table_output'].includes(entry.nodeType)){
      check(current.ports.reasoningInput?.parameter==='inputMode'&&current.ports.reasoningInput.value==='decisions','Missing reasoning input mode');
      if(nodeInputs)check(JSON.stringify(nodeInputs({type:entry.nodeType,params:{inputMode:'decisions'}}))===JSON.stringify([['decisions','decisions']]),'Reasoning port contract drift');
    }
    if(dynamic){
      const d=current.ports.dynamicInputs;
      check(d.kind==='point-layers'&&d.minimum===1&&d.maximum===8,'Dynamic port limits drift');
      if(nodeInputs)for(const count of [1,8])check(nodeInputs({type:entry.nodeType,params:{pointInputCount:count}}).filter(([,type])=>type==='points').length===count,'Dynamic port expansion drift');
    }
    for(const path of [current.configuration.typescriptFile,...current.implementation.files,current.implementation.definition.split('#')[0]])await access(localPath(path));
    const replacement=current.compatibility.replacementCandidate;
    check(replacement===null||catalog.widgets.some(w=>w.id===replacement&&w.id!==entry.id),'Unknown replacement candidate');
  }
  check(Object.keys(definitions).every(type=>types.has(type)),'Unregistered implementation widget');
  return {widgets:ids.size,releases:releaseCount};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{const result=await validateRegistry();console.log(`Widget registry valid: ${result.widgets} widgets, ${result.releases} releases. No runtime version dispatch is implied.`);}
  catch(error){console.error(error.message);process.exitCode=1;}
}
