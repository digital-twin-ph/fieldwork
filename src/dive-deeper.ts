/** The Dive Deeper links a widget offers: the lessons in their own repository, from widgets/dive-deeper.json.
 *
 *  The practitioner's question of 2026-10-14: *how do I see the Deeper Dive notebooks from each relevant widget?*
 *  The links were generated from the ledger and rendered near the top, beside the description of what the widget does.
 *
 *  LESSONS ONLY, from 2026-11-26. Until then this also linked twenty older sections at the end of Validation Lab
 *  notebooks, and the projection section for every widget that takes a UTM zone. The practitioner: Dive Deeper is
 *  pedagogy, in its own repository, deferred until the widgets are mature enough to teach from. The lab's sections
 *  were taken out, and the zone is explained in the manual's page on it, which the learn block links for those
 *  widgets. */
import lessonRecord from '../widgets/dive-deeper.json';
import {METRIC_NODE_TYPES} from './metric-crs.js';
import {hasManual} from './manual.js';

/** The lessons live in their own repository from 2026-10-20, with their own site. */
export const lessonURL=(notebook:string):string=>lessonRecord.repository.site+encodeURIComponent(notebook);
/** The manual's page on the UTM zone, for every widget that projects to metres (the practitioner's rule of 2026-10-13:
 *  a widget may embed a CRS choice only if the person making it can reach an explanation of what they are choosing). */
export const ZONE_PAGE='surface:utm-zone';

export interface DiveDeeper {notebook:string; heading:string; url:string; why:string}
/** The lessons that explain this widget. */
export function diveDeeperFor(nodeType:string):DiveDeeper[] {
  const found:DiveDeeper[]=[];
  for(const lesson of lessonRecord.entries as {widget:string;notebook:string;title:string;teaches:string}[]){
    if(lesson.widget.split(':').pop()!==nodeType)continue;
    found.push({notebook:lesson.notebook,heading:lesson.title,url:lessonURL(lesson.notebook),why:lesson.teaches});
  }
  return found;
}

/** The Inspector block, or '' for a widget with nothing to link. */
export function diveDeeperPanel(nodeType:string,esc:(value:string)=>string):string{
  const entries=diveDeeperFor(nodeType);
  if(!entries.length)return '';
  return '<details class="explainer dive-deeper"><summary>Dive Deeper</summary>'
    +entries.map(entry=>`<p><a href="${entry.url}" target="_blank" rel="noopener noreferrer">`
      +`${esc(entry.heading)}</a><br>${esc(entry.why)}</p>`).join('')
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
  const zone=(METRIC_NODE_TYPES as readonly string[]).includes(nodeType)&&hasManual(ZONE_PAGE);
  if(!manual&&!entries.length&&!zone)return '';
  const lab=entries[0];
  return `<nav class="learn-block" aria-label="Learn about this widget">`
    +(manual?`<button class="button learn-link" id="open-manual" data-manual="${esc(nodeType)}">`
      +`<span aria-hidden="true">\u25a4</span> Manual</button>`:'')
    +(zone?`<button class="button learn-link" id="open-zone-manual">`
      +`<span aria-hidden="true">\u25a4</span> UTM zone</button>`:'')
    +(lab?`<a class="button learn-link" href="${lab.url}" target="_blank" rel="noopener noreferrer">`
      +`<span aria-hidden="true">\u2697</span> Dive deeper${entries.length>1?` (${entries.length})`:''}</a>`:'')
    +`</nav>`;
}
