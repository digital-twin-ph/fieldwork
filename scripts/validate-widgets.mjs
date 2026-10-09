import {readFile, access} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
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

// --- Parity evidence -----------------------------------------------------------------
// Shape and registry agreement only; verifying a recorded result against the Validation Lab's
// own file needs that repository, so it lives in validate-parity.mjs and stays out of the gate.
export function checkParity(parity,registryDoc){
  const problems=[],notes=[];
  if(parity.schema!=='fieldwork/parity-evidence/1')problems.push(`unknown parity schema ${parity.schema}`);
  if(!/^[0-9a-f]{40}$/.test(parity.lab?.commit??''))problems.push('parity lab commit is not a full 40-character SHA');
  const outcomes=Object.keys(parity.outcomes??{});
  if(!outcomes.length)problems.push('no parity outcomes declared');
  const seen=new Set();
  for(const e of parity.entries??[]){
    const where=`${e.widget??'an entry'} ${e.coversRelease??''}`.trim();
    const widget=registryDoc.widgets.find(w=>w.id===e.widget);
    if(!widget){problems.push(`${where}: unknown widget`);continue;}
    if(!widget.releases.some(r=>r.version===e.coversRelease))
      problems.push(`${where}: names a release the registry does not list`);
    for(const field of ['check','result','sha256','criterion','outcome','measured','ranAt'])
      if(!e[field])problems.push(`${where}: missing ${field}`);
    if(!/^[a-f0-9]{64}$/.test(e.sha256??''))problems.push(`${where}: result digest is not a SHA-256`);
    if(e.outcome&&!outcomes.includes(e.outcome))problems.push(`${where}: undeclared outcome ${e.outcome}`);
    if(!e.external?.length)problems.push(`${where}: names no external implementation`);
    const key=`${e.widget}@${e.coversRelease}:${e.check}`;
    if(seen.has(key))problems.push(`${where}: duplicate entry for check ${e.check}`);
    seen.add(key);
    // A result about an older release is evidence about that release, not about what runs now.
    if(e.coversRelease!==widget.currentVersion)
      notes.push(`${e.widget}: parity covers ${e.coversRelease}, but ${widget.currentVersion} is current — not re-established`);
    if(e.outcome!=='agrees')notes.push(`${e.widget} ${e.coversRelease}: ${e.outcome} — ${e.measured}`);
  }
  const covered=new Set((parity.entries??[]).map(e=>e.widget));
  notes.push(`parity recorded for ${covered.size} of ${registryDoc.widgets.length} widgets`);
  return {problems,notes};
}


// --- Vendored pack declarations -------------------------------------------------------------
// The host carries copies of a pack's vocabulary and shapes so it can validate against them.
// Vendoring is not forking: a copy that drifts from the digest the catalog pins is a failure.
export function checkVendored(catalog,read){
  const problems=[],checked=[];
  const vendored={'ontology/sea-level.ttl':'ontology/packs/sea-level.ttl',
                  'ontology/shapes/sea-level.ttl':'ontology/shapes/pack-sea-level.ttl'};
  for(const pack of catalog.packs??[]){
    for(const [packPath,hostPath] of Object.entries(vendored)){
      const pinned=pack.files?.[packPath];
      if(!pinned)continue;
      const text=read(hostPath);
      if(text===null){problems.push(`${hostPath} is vendored from ${pack.id} but missing`);continue;}
      const digest=createHash('sha256').update(text).digest('hex');
      if(digest!==pinned)problems.push(`${hostPath} digest ${digest.slice(0,12)} does not match the pinned ${pinned.slice(0,12)} for ${packPath}`);
      else checked.push(hostPath);
    }
  }
  return {problems,checked};
}


// --- Standard versus domain widgets ---------------------------------------------------------
// Two kinds of widget, and the line between them is derived rather than declared: a widget whose
// vocabulary is entirely the host's is a standard component that ships with the application and
// applies to any domain; a widget that maps to a pack's namespace belongs to that pack's domain.
// Deriving it means nobody can forget to label one, and merging a domain widget into the standard
// set — which is how the sea-level work landed — fails here instead of passing silently.
const STANDARD_VOCABULARIES=['urn:fieldwork:','http://www.opengis.net/ont/geosparql#',
  'http://www.w3.org/ns/prov#','http://qudt.org/schema/qudt/','http://purl.org/dc/terms/',
  'http://www.w3.org/ns/dcat#','http://www.w3.org/2004/02/skos/core#'];

export function classifyWidgets(releases,catalog){
  const problems=[],widgets=[];
  const packs=(catalog.packs??[]).map(pack=>({id:pack.id,name:pack.name,namespace:pack.namespace}));
  for(const [nodeType,release] of Object.entries(releases)){
    const iris=(release.ontology?.mappings??[]).map(mapping=>mapping.iri);
    const foreign=iris.filter(iri=>!STANDARD_VOCABULARIES.some(prefix=>iri.startsWith(prefix)));
    const owners=[...new Set(foreign.map(iri=>packs.find(pack=>iri.startsWith(pack.namespace))?.id??`unknown:${iri}`))];
    for(const owner of owners)if(owner.startsWith('unknown:'))
      problems.push(`${nodeType} maps to ${owner.slice(8)}, which is neither a host vocabulary nor a namespace of any catalogued pack`);
    if(owners.length>1)problems.push(`${nodeType} maps to more than one domain: ${owners.join(', ')}. A widget belongs to one domain or to none.`);
    const pack=owners.length===1&&!owners[0].startsWith('unknown:')?owners[0]:null;
    widgets.push({nodeType,classification:foreign.length?'domain':'standard',...(pack?{pack}:{})});
  }
  const domain=widgets.filter(w=>w.classification==='domain');
  return {problems,widgets:widgets.sort((a,b)=>a.nodeType.localeCompare(b.nodeType)),
    standardCount:widgets.length-domain.length,domainCount:domain.length,
    byPack:Object.fromEntries(packs.map(pack=>[pack.id,domain.filter(w=>w.pack===pack.id).map(w=>w.nodeType)]))};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    const result=await validateRegistry();
    console.log(`Widget registry valid: ${result.widgets} widgets, ${result.releases} releases. No runtime version dispatch is implied.`);
    const registryDoc=JSON.parse(await readFile(localPath('widgets/registry.json'),'utf8'));
    const parityDoc=JSON.parse(await readFile(localPath('widgets/parity.json'),'utf8'));
    const parity=checkParity(parityDoc,registryDoc);
    const catalogDoc=JSON.parse(await readFile(localPath('widgets/packs.json'),'utf8'));
    const vendored=checkVendored(catalogDoc,path=>{try{return readFileSync(localPath(path),'utf8');}catch{return null;}});
    const releases=Object.fromEntries(registryDoc.widgets.map(w=>[w.nodeType,
      JSON.parse(readFileSync(localPath(w.releases.find(r=>r.version===w.currentVersion).path),'utf8'))]));
    const kinds=classifyWidgets(releases,catalogDoc);
    console.log(`  widgets: ${kinds.standardCount} standard (ship with the application, any domain), ${kinds.domainCount} domain`);
    for(const [pack,types] of Object.entries(kinds.byPack))if(types.length)console.log(`  domain: ${pack} → ${types.join(', ')}`);
    if(kinds.problems.length){for(const problem of kinds.problems)console.error(`CLASSIFICATION PROBLEM: ${problem}`);process.exitCode=1;}
    const generated=JSON.parse(readFileSync(localPath('widgets/classification.json'),'utf8'));
    if(JSON.stringify(generated.widgets)!==JSON.stringify(kinds.widgets))
      {console.error('CLASSIFICATION PROBLEM: widgets/classification.json is stale; rebuild to regenerate it');process.exitCode=1;}
    for(const file of vendored.checked)console.log(`  vendored: ${file} matches the digest the catalog pins`);
    if(vendored.problems.length){for(const problem of vendored.problems)console.error(`VENDOR PROBLEM: ${problem}`);process.exitCode=1;}
    for(const note of parity.notes)console.log(`  parity: ${note}`);
    if(parity.problems.length){for(const problem of parity.problems)console.error(`PARITY PROBLEM: ${problem}`);process.exitCode=1;}
  }
  catch(error){console.error(error.message);process.exitCode=1;}
}
