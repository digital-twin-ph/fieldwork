import walkingCatchment from '../compositions/compute_walking_catchment/0.4.0.json';
import type {Composition} from './compositions.js';

/** The compositions this build carries, by id and version.
 *
 *  A workflow pins a composition by reference rather than embedding it, so the saved file
 *  stays small and drift stays detectable. The cost is that the reference has to resolve:
 *  a workflow naming a composition this build does not carry cannot run, and says so by
 *  name rather than failing somewhere inside an executor.
 *
 *  Bundled rather than fetched, because Fieldwork runs offline. A composition reaching the
 *  palette is therefore a build decision, which is the same gate admission already
 *  describes: assets, a review and an owner before anyone else can add it to a canvas. */

const BUNDLED:Composition[]=[walkingCatchment as unknown as Composition];

export const compositionKey=(id:string,version:string)=>`${id}@${version}`;

const INDEX=new Map(BUNDLED.map(c=>[compositionKey(c.id,c.version),c]));

export function resolveComposition(id:string,version:string):Composition{
  const found=INDEX.get(compositionKey(id,version));
  if(found)return structuredClone(found);
  const others=BUNDLED.filter(c=>c.id===id).map(c=>c.version);
  throw new Error(others.length
    ?`This workflow uses ${id} version ${version}, and this build carries ${others.join(', ')}. Open it in a build that has that version, or rebuild the step.`
    :`This workflow uses ${id}, which this build does not carry. Nothing it did can be reproduced here.`);
}

/** Compositions offered on the palette: admitted ones only.
 *
 *  Private and shared compositions are usable in the workflow that holds them and are not
 *  offered to everyone who opens the application, which is what admission means in
 *  [76](../docs/experiments/76-composition-governance.md). */
export const bundledCompositions=():Composition[]=>BUNDLED.map(c=>structuredClone(c));
