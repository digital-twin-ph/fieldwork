/** Couples what the application asserts to what the ontology declares.
 *
 *  A widget's release pins an ontology *class* and `validate:widgets` checks that class
 *  exists. Nothing checked the **properties**: those lived in prose in `ontology.note`, so
 *  a widget could emit `fw:cellSizeX` for a year with nothing defining it, which is what
 *  nine of sample_raster's terms were doing when this was written.
 *
 *  Terms are extracted from source rather than from a running widget, because receipts are
 *  built from template literals and a widget needs inputs to run. Any `fw:Term` appearing
 *  in `src/` is a term the application can assert, which is the conservative reading.
 */
import {readFile,readdir} from 'node:fs/promises';
import {Parser} from 'n3';

const PREFIX='urn:fieldwork:';

async function ttlFiles(dir){
  const out=[];
  for(const entry of await readdir(dir,{withFileTypes:true})){
    if(entry.isDirectory())out.push(...await ttlFiles(`${dir}/${entry.name}`));
    else if(entry.name.endsWith('.ttl'))out.push(`${dir}/${entry.name}`);
  }
  return out;
}

/** Every fw: term any ontology file mentions, and how each typed one is typed. */
export async function declaredTerms(roots=['ontology']){
  const mentioned=new Set(),typed=new Map();
  for(const root of roots)for(const file of await ttlFiles(root)){
    for(const quad of new Parser().parse(await readFile(file,'utf8'))){
      for(const term of [quad.subject,quad.predicate,quad.object])
        if(term.value?.startsWith(PREFIX))mentioned.add(term.value.slice(PREFIX.length));
      if(quad.predicate.value.endsWith('22-rdf-syntax-ns#type')&&quad.subject.value.startsWith(PREFIX))
        typed.set(quad.subject.value.slice(PREFIX.length),quad.object.value.split(/[#/]/).pop());
    }
  }
  return {mentioned,typed};
}

/** Every fw: term the source can assert, with the modules that assert it. */
export async function emittedTerms(dir='src'){
  const emitted=new Map();
  for(const file of (await readdir(dir)).filter(f=>f.endsWith('.ts'))){
    const text=await readFile(`${dir}/${file}`,'utf8');
    for(const match of text.matchAll(/\bfw:([A-Za-z][A-Za-z0-9]*)/g)){
      if(!emitted.has(match[1]))emitted.set(match[1],new Set());
      emitted.get(match[1]).add(file);
    }
  }
  return emitted;
}

export function undeclared(emitted,declared){
  return [...emitted.keys()]
    .filter(term=>!declared.typed.has(term)&&!declared.mentioned.has(term))
    .sort()
    .map(term=>({term,kind:/^[A-Z]/.test(term)?'class-or-individual':'property',
      modules:[...emitted.get(term)].sort()}));
}
