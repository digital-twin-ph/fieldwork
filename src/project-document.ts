import type {Workflow} from './types.js';
import type {Project} from './project.js';

/** A PROJECT AS ONE DOCUMENT: the investigation and every workflow in it.
 *
 *  The practitioner, 2026-10-21: *"Where is the export project button?"* There was none. Export
 *  and Encrypted ZIP are both workflow-scoped, so a project -- which is the thing an investigation
 *  actually is, and the thing a practitioner names, describes and adds questions to -- could not
 *  travel. Four workflows about one province moved as four unrelated files with nothing recording
 *  that they belonged together, which is the problem experiment 122 opened and the one half of it
 *  that was never closed.
 *
 *  The document carries the project record and each workflow's own export, so a workflow inside it
 *  is exactly what Export produces for that workflow -- including a bundle with its attachments.
 *  Nothing is re-encoded here, which means nothing can be re-encoded WRONGLY here.
 *
 *  What it does NOT carry is a payload kept by digest in the large store: a street network is a
 *  reference, and a reference whose bytes are not in the document is a workflow that opens without
 *  its data. That is stated on export rather than discovered on import. */
export interface ProjectDocument {
  schema:'fieldwork/project-document/1';
  exportedAt:string;
  project:Project;
  workflows:{key:string;document:unknown}[];
}
export const PROJECT_DOCUMENT_SCHEMA='fieldwork/project-document/1';

export function projectDocument(project:Project,workflows:{key:string;document:unknown}[]):ProjectDocument{
  if(!workflows.length)throw new Error('A project with no saved workflow has nothing to export.');
  return {schema:PROJECT_DOCUMENT_SCHEMA,exportedAt:new Date().toISOString(),
    project:structuredClone(project),workflows:structuredClone(workflows)};
}

/** Read one back, structurally. The workflows inside are NOT validated here: each is handed to the
 *  importer the application already uses for a single workflow, so one document cannot acquire a
 *  second, more forgiving reader. */
export function readProjectDocument(raw:unknown):ProjectDocument{
  const record=raw as Partial<ProjectDocument>;
  if(!record||typeof record!=='object'||record.schema!==PROJECT_DOCUMENT_SCHEMA)
    throw new Error('That file is not a Fieldwork project document.');
  const project=record.project as Project|undefined;
  if(!project||typeof project.id!=='string'||typeof project.name!=='string'||!Array.isArray(project.workflows))
    throw new Error('The project document carries no project record.');
  if(!Array.isArray(record.workflows)||!record.workflows.length)
    throw new Error('The project document carries no workflows.');
  for(const entry of record.workflows)
    if(!entry||typeof entry.key!=='string'||entry.document===undefined)
      throw new Error('Every workflow in a project document needs its key and its document.');
  return record as ProjectDocument;
}

/** The payload references a document leaves behind, so the export can say what will not travel. */
export function unbundledReferences(workflows:Workflow[]):number{
  let count=0;
  for(const workflow of workflows)
    for(const node of workflow.nodes??[]){
      const params=node.params as unknown as Record<string,unknown>;
      if(typeof params?.dataRef==='string'&&params.data===undefined)count++;
    }
  return count;
}
