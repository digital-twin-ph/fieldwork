/** A PROJECT AS A GIT REPOSITORY, written by the application that holds it.
 *
 *  The practitioner, 2026-10-31, on why this is not a side quest: *"it is a selling point of FW,
 *  to decrease friction everywhere in the epidemiologist's workflow, from designing an
 *  investigation, implementing its workflows and managing evidence generation, and publication."*
 *
 *  WHAT THIS CLOSES, AND WHAT IT DOES NOT. Experiment 150 designed this layout, measured it, and
 *  published it as `digital-twin-ph/fieldwork-project-template`; its own `.fieldwork/format.json`
 *  then had to say *"NOTHING IN FIELDWORK READS OR WRITES THIS LAYOUT."* This module is the
 *  writing half. The reading half -- opening a repository back into a project -- is not built,
 *  and the format declaration this emits says so rather than implying a round trip.
 *
 *  ONE FILE IS ONE WORKFLOW, which is the merge strategy and not a serialisation convenience.
 *  There is no merge base in a browser, so a conflict can be made rare and legible but never
 *  merged: two authors on different workflows never touch the same blob, and two on the same one
 *  collide, which is correct because a canvas is a graph and a silently merged graph is a graph
 *  neither author drew. The template's `.gitattributes` carries the other half of that --
 *  `workflows/*.json -merge` -- so git refuses rather than interleaves.
 *
 *  NAMED FOR THE WORKFLOW, NEVER FOR ITS KEY. `mintWorkflowKey` produces `${projectId}/w${n}` and
 *  the project id carries a dedupe counter, so a key says nothing and changes on a rebuild --
 *  which broke three validation-lab fixtures on 2026-10-31 and is recorded in 150. A reviewer
 *  reading a pull request needs `died-or-survived-by-water-supply.json`, not `w7.json`.
 *
 *  PRETTY-PRINTED AND KEY-ORDERED, because the point of the layout is a readable diff. A minified
 *  blob in a repository is the gzip it replaced with extra steps.
 */
import type {Project} from './project.js';

/** The layout's own version, written into every repository so a reader can tell what it is
 *  looking at without inferring from the directory names. */
export const PROJECT_REPOSITORY_SCHEMA='fieldwork/project-repository/1';

/** Long enough to stay readable in a pull request, short enough to survive a filesystem and a
 *  checkout on Windows. 48 is what the 2026-10-31 conversion used and what the published
 *  repository carries, so it is fixed here rather than re-chosen. */
export const FILENAME_CEILING=48;

/** A workflow's file name, from the name a practitioner gave it.
 *
 *  Lowercased, every run of non-alphanumerics folded to one dash, truncated, and a trailing dash
 *  removed so a truncation never leaves a name ending in punctuation. Two workflows whose names
 *  slug the same would collide, which `repositoryFiles` refuses rather than silently overwriting:
 *  losing a workflow to a filename clash is the one failure this layout must not have. */
export const workflowFileName=(name:string):string=>
  (name||'').toLowerCase().replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+/,'').slice(0,FILENAME_CEILING).replace(/-+$/,'');

/** What a project document holds, narrowed to the fields this reads. Narrower than importing the
 *  whole type on purpose: a writer that can see everything grows to write everything. */
export interface RepositorySource {
  project:Project;
  workflows:readonly {key:string; document:unknown}[];
  /** Notes keyed by id, as the write-up store holds them. Absent where a project has none. */
  notes?:Record<string,unknown>;
  /** Payloads a node refers to, by the digest the node names. */
  assets?:Record<string,{bytes:number; sha256:string; text?:string}>;
  /** Declarations that reproduce a payload too large to commit. */
  acquired?:Record<string,unknown>;
}

const stringify=(value:unknown):string=>JSON.stringify(value,null,1)+'\n';

/** THE REPOSITORY, AS PATHS AND CONTENTS. Pure: no zip, no download, no clock.
 *
 *  Separated from the writing so the layout can be asserted without a browser, which is what
 *  experiment 150 could not do when the conversion lived in a script outside `src/`. */
export function repositoryFiles(source:RepositorySource):Map<string,string>{
  const files=new Map<string,string>();
  const names=new Map<string,string>();
  for(const workflow of source.workflows){
    const document=workflow.document as {name?:string}|undefined;
    const name=(document?.name||'').trim();
    // NO FALLBACK TO THE KEY. Falling back would file an unnamed workflow as `p-w1.json`, which
    // is the `w7.json` problem this layout exists to avoid — and it would do it silently, on the
    // one workflow whose name nobody chose. Refusing asks for thirty seconds of naming and gets
    // a repository somebody can review.
    const file=workflowFileName(name);
    if(!file)throw new Error(`The workflow "${workflow.key}" has no name that makes a file name. `
      +'Name it before exporting a repository: a file named for nothing is a file nobody can '
      +'review.');
    // A CLASH IS REFUSED, NEVER RESOLVED BY SUFFIX. Two workflows slugging the same means two
    // names a reader cannot tell apart either, and appending `-2` would hide that in the one
    // place -- a pull request -- where it matters most.
    if(names.has(file))throw new Error(`"${name}" and "${names.get(file)}" both make the file `
      +`name "${file}.json". Rename one: a repository where two workflows cannot be told apart `
      +'by their file names is one nobody can review.');
    names.set(file,name);
    files.set(`workflows/${file}.json`,stringify(workflow.document));
  }
  files.set('project.json',stringify({
    schema:'fieldwork/project/2',
    id:source.project.id,
    name:source.project.name,
    subject:source.project.subject,
    // THE FILE NAMES, NOT THE KEYS. This list is what a reader follows to the files, so it has
    // to name them; a minted key here would point at nothing on disk.
    workflows:[...names.keys()],
    ...(source.project.createdAt?{createdAt:source.project.createdAt}:{}),
    ...(source.project.changedAt?{changedAt:source.project.changedAt}:{}),
    ...(source.project.authors?{authors:source.project.authors}:{}),
  }));
  for(const [id,note] of Object.entries(source.notes??{}))
    files.set(`notes/${id}.json`,stringify(note));
  files.set('assets/manifest.json',stringify({
    schema:'fieldwork/asset-manifest/1',
    assets:source.assets??{},
    acquired:source.acquired??{},
  }));
  files.set('.fieldwork/format.json',stringify(formatDeclaration()));
  return files;
}

/** The format declaration the repository carries.
 *
 *  Its `notYet` field is the honest one and is the reason this is not simply copied from the
 *  template: the template's copy says nothing in Fieldwork reads or writes this layout, which
 *  stopped being true for WRITING on 2026-10-31 and is still true for reading. A declaration
 *  that overstated the round trip would invite somebody to export a repository and expect to
 *  open it again. */
export const formatDeclaration=()=>({
  schema:PROJECT_REPOSITORY_SCHEMA,
  describes:'The on-disk layout of a Fieldwork project held in a git repository, so several '
    +'authors can co-own one.',
  paths:{
    'project.json':'The project record: name, subject, authors, when it began, and which '
      +'workflow files belong to it. One file, rarely edited, conflicts rarely.',
    'workflows/*.json':'One workflow graph per file. THE UNIT OF COLLABORATION: two authors '
      +'working on different workflows never touch the same blob; two working on the same one '
      +'collide, and should.',
    'notes/*.json':'One note per file. The write-up is assembled from these at render time; it '
      +'is not authored as a file.',
    'assets/manifest.json':'Every payload a node refers to, by path, sha256 and bytes — and, for '
      +'a payload that was acquired rather than committed, the declaration that reproduces it.',
    'assets/*':'Payloads small enough to belong in a repository, as plain text that diffs.',
  },
  rules:{
    granularity:'A file is a workflow. Chosen because there is no merge base in a browser, so a '
      +'conflict can be made rare and legible but never merged — which makes file granularity '
      +'the merge strategy rather than a serialisation convenience.',
    naming:'A workflow file is named for the workflow, never for its storage key. A key is '
      +'minted as `${projectId}/w${n}` and changes when a project is rebuilt, so it identifies '
      +'nothing across a clone and tells a reviewer nothing in a diff.',
    payloads:'A node does not inline a payload. It names one in assets/manifest.json by path '
      +'and digest.',
    acquired:'A payload read from a large source — an OSM extract, a raster, a downloaded '
      +'network — is NOT committed. The declaration that reproduces it is.',
  },
  notYet:'FIELDWORK WRITES THIS LAYOUT AND CANNOT YET READ IT. A project exports as a repository '
    +'from version 0.13.0; opening one back into the application is unbuilt, so a repository is '
    +'still a place to put work and publish it rather than one the application can round-trip. '
    +'See experiment 150.',
});
