/** The Dive Deeper links a widget offers, derived from widgets/parity.json.
 *
 *  The practitioner's question of 2026-10-14: *how do I see the Deeper Dive notebooks from each
 *  relevant widget?* The answer was that you could not. Fifteen notebooks carried a Dive Deeper
 *  section -- the half written for someone who wants to understand the widget rather than for a
 *  reviewer checking it (experiment 94) -- and **fourteen of them were reachable from nothing**.
 *  The one exception was the projection notebook, linked from the nine widgets that take a UTM
 *  zone, and it sat at the BOTTOM of the Inspector below the evidence and definition blocks,
 *  where nobody scrolled to find it.
 *
 *  So the link is generated from the ledger rather than written per widget, and it is rendered
 *  near the top, beside the description of what the widget does. */
import parityRecord from '../widgets/parity.json';
import lessonRecord from '../widgets/dive-deeper.json';
import {METRIC_NODE_TYPES,PROJECTION_NOTEBOOK} from './metric-crs.js';

const LAB='https://digital-twin-ph.github.io/validation-lab/lab/index.html?path=';
export const notebookURL=(notebook:string):string=>LAB+encodeURIComponent(notebook);
/** The lessons live in their own repository from 2026-10-20, with their own site. */
export const lessonURL=(notebook:string):string=>lessonRecord.repository.site+encodeURIComponent(notebook);

export interface DiveDeeper {notebook:string; heading:string; url:string; why:string}
interface ParityEntry {widget:string; check:string; notebook?:string; diveDeeper?:string}

/** The notebook sections that explain this widget, most specific first. A widget may offer two:
 *  its own, and -- when it projects to metres -- the one explaining what the zone choice costs. */
export function diveDeeperFor(nodeType:string):DiveDeeper[] {
  const found:DiveDeeper[]=[];
  const seen=new Set<string>();
  // A lesson written against the pedagogical requirements comes FIRST, before a section that
  // predates them. Both are offered while both exist; the ledger's ceiling is what records how
  // many are still in the older form.
  for(const lesson of lessonRecord.entries as {widget:string;notebook:string;title:string;teaches:string}[]){
    if(lesson.widget.split(':').pop()!==nodeType)continue;
    seen.add(lesson.notebook);
    found.push({notebook:lesson.notebook,heading:lesson.title,url:lessonURL(lesson.notebook),why:lesson.teaches});
  }
  for(const entry of parityRecord.entries as ParityEntry[]){
    if(entry.widget.split(':').pop()!==nodeType||!entry.diveDeeper||!entry.notebook)continue;
    if(seen.has(entry.notebook))continue;
    seen.add(entry.notebook);
    found.push({notebook:entry.notebook,heading:entry.diveDeeper,url:notebookURL(entry.notebook),
      why:'What this widget does, on real data, with the assumption it inherits made visible and varied.'});
  }
  if((METRIC_NODE_TYPES as readonly string[]).includes(nodeType)&&!seen.has(PROJECTION_NOTEBOOK.notebook))
    found.push({notebook:PROJECTION_NOTEBOOK.notebook,heading:PROJECTION_NOTEBOOK.section,
      url:PROJECTION_NOTEBOOK.url,
      why:'This widget measures in metres, so it projects first, and the zone you pick is part of how the answer is computed. Near a zone boundary two defensible zones give areas that differ by about half a percent — small, but systematic across every length in the workflow.'});
  return found;
}

/** The Inspector block, or '' for a widget with nothing to link. */
export function diveDeeperPanel(nodeType:string,esc:(value:string)=>string):string{
  const entries=diveDeeperFor(nodeType);
  if(!entries.length)return '';
  return '<details class="explainer dive-deeper"><summary>Dive Deeper</summary>'
    +entries.map(entry=>`<p><a href="${entry.url}" target="_blank" rel="noopener noreferrer">`
      +`${esc(entry.heading.replace(/^Dive deeper · /i,''))}</a><br>${esc(entry.why)}</p>`).join('')
    +'<p class="muted">Opens the notebook in your browser and runs it there. Needs a connection.</p>'
    +'</details>';
}
/** THE TWO LINKS A LEARNER NEEDS, where a learner looks and at the size of a control.
 *
 *  The practitioner, 2026-10-21: *"The buttons for Deeper Dive and Manual are very tiny when they
 *  are the most important links for users and learners."* They were: the manual was a 10-pixel
 *  green text-button and the notebooks were a collapsed `<summary>`, both sitting wherever the
 *  panel's alerts happened to leave them. They are now one block in one place -- directly under
 *  the widget's title, before its controls -- so the panel has the same shape for every widget and
 *  the way in is the first thing on it.
 *
 *  A widget with neither renders nothing rather than an empty frame, and the Dive Deeper details
 *  below is kept for the notebooks' own descriptions: this is the entry, not a replacement. */
export function learnBlock(nodeType:string,esc:(value:string)=>string,manual:string):string{
  const entries=diveDeeperFor(nodeType);
  if(!manual&&!entries.length)return '';
  const lab=entries[0];
  return `<nav class="learn-block" aria-label="Learn about this widget">`
    +(manual?`<button class="button learn-link" id="open-manual" data-manual="${esc(nodeType)}">`
      +`<span aria-hidden="true">\u25a4</span> Manual</button>`:'')
    +(lab?`<a class="button learn-link" href="${lab.url}" target="_blank" rel="noopener noreferrer">`
      +`<span aria-hidden="true">\u2697</span> Dive deeper${entries.length>1?` (${entries.length})`:''}</a>`:'')
    +`</nav>`;
}
