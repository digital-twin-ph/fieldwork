import catalog from '../widgets/examples.json';
import {contentHash} from './project-files.js';

/** WORKED EXAMPLES THAT LIVE IN A REPOSITORY.
 *
 *  The practitioner, 2026-10-20: *"So worked examples do not have to occupy space in the
 *  downloaded app, we can set them up as repos read from a curated manifest."* And on 2026-10-23,
 *  having met the stronger reason: *"I thought about creating a GitHub repo for South London and
 *  be able to import the worked example from FW."*
 *
 *  The stronger reason is licensing. `examples/snow-gboh` is GPL with its version unstated, so
 *  this project may hold that data and may not transform it -- no precache budget answers that.
 *  A repository boundary is a licence boundary, and `widgets/examples.json` records the terms per
 *  example because the whole point is that an example may carry terms this project could not
 *  adopt.
 *
 *  PINNED AT A COMMIT, NEVER A BRANCH. A digest pinned against a moving ref verifies nothing:
 *  the file changes upstream, the digest fails, and the only way to make it pass again is to
 *  stop checking. `widgets/packs.json` settled this for packs and the deploy workflow settled it
 *  again for the validation lab, where a ledger pinning a commit caught a notebook that the
 *  default branch did not carry.
 *
 *  Measured 2026-10-23, which is what made this buildable rather than proposed: GitHub Pages and
 *  raw.githubusercontent both answer `access-control-allow-origin: *`, including at a commit SHA
 *  and for a binary asset, so a browser may fetch this without the CORS wall that stops DHIS2 and
 *  geoBoundaries. One trap recorded with it -- HEAD on raw.githubusercontent returns no such
 *  header and GET does, so a HEAD-only probe reports the opposite.
 */
export interface ExampleFile {path:string; sha256:string; bytes:number}
export interface CatalogExample {
  id:string; title:string; repository:string; commit:string; rawBase:string;
  licence:{data:string; source:string; note:string};
  description:string;
  carries:{workflow:boolean; data:boolean; geography:boolean};
  notYet?:string;
  files:ExampleFile[];
}
const CATALOG=catalog as unknown as {
  schema:string; catalogVersion:string; updated:string;
  governance:{curatedOwners:string[]}; examples:CatalogExample[]};

export const EXAMPLE_CATALOG_VERSION=CATALOG.catalogVersion;
export const curatedExamples=():CatalogExample[]=>structuredClone(CATALOG.examples);
export const exampleById=(id:string):CatalogExample|undefined=>
  CATALOG.examples.find(e=>e.id===id);

/** The URL a file is fetched from, built from the PINNED COMMIT rather than from a ref anyone
 *  can move. Refuses a path the catalog does not pin: a fetch the trust root never described is
 *  not made safe by arriving from the right repository. */
export function fileURL(example:CatalogExample,path:string):string{
  const pinned=example.files.find(f=>f.path===path);
  if(!pinned)throw new Error(`${path} is not pinned in the example catalog, so it is not fetched.`);
  if(!/^[0-9a-f]{40}$/.test(example.commit))
    throw new Error(`${example.id} must pin a full commit SHA, not a branch or a short hash.`);
  return `${example.rawBase}/${example.commit}/${path}`;
}

/** Fetched, then verified against the digest the catalog pins. A mismatch is a REFUSAL: the
 *  bytes are discarded and the reason names the file, because a warning on a content check is a
 *  check nobody acts on. */
export async function verifiedFile(example:CatalogExample,path:string,
    fetchImpl:typeof fetch=fetch):Promise<Uint8Array<ArrayBuffer>>{
  const pinned=example.files.find(f=>f.path===path)!;
  const url=fileURL(example,path);
  const response=await fetchImpl(url);
  if(!response.ok)throw new Error(`${path} could not be fetched from ${example.repository}: `
    +`${response.status}. The example stays unavailable rather than partly loaded.`);
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(bytes.length!==pinned.bytes)
    throw new Error(`${path} is ${bytes.length} bytes and the catalog pins ${pinned.bytes}. `
      +`Refused without hashing: a size that disagrees is already a different file.`);
  const digest=await contentHash(bytes);
  if(digest!==pinned.sha256)
    throw new Error(`${path} does not match the digest pinned for ${example.id}. `
      +`Expected ${pinned.sha256}, computed ${digest}. Refused.`);
  return bytes;
}
