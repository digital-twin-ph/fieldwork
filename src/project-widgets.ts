/** A PROJECT'S WIDGETS, AND WHERE EACH IS USED (the practitioner, 2026-11-14: "each project should name the widget and
 *  its workflows in a tab beside notes, N3, results, workflow tabs"). The widget catalog says which worked examples use a
 *  widget; this says, inside one project, which of its workflows do, and as which steps. Read from the workflows
 *  themselves each time the tab opens, so there is nothing to keep up to date. */
export interface ProjectWorkflow {key:string; name:string; nodes:readonly {type:string;params?:{label?:unknown}}[]}
export interface WidgetUse {type:string; uses:{key:string;name:string;steps:string[]}[]}

/** Each widget the project uses, in the palette's order where `order` gives it, with each workflow and its steps. */
export function projectWidgets(workflows:readonly ProjectWorkflow[],order:readonly string[]=[]):WidgetUse[]{
  const byType=new Map<string,WidgetUse>();
  for(const w of workflows)for(const n of w.nodes){
    const use=byType.get(n.type)??{type:n.type,uses:[]};byType.set(n.type,use);
    let here=use.uses.find(u=>u.key===w.key);
    if(!here){here={key:w.key,name:w.name,steps:[]};use.uses.push(here);}
    const label=typeof n.params?.label==='string'?n.params.label.trim():'';
    here.steps.push(label);
  }
  const rank=(t:string)=>{const i=order.indexOf(t);return i<0?order.length:i;};
  return [...byType.values()].sort((a,b)=>rank(a.type)-rank(b.type)||a.type.localeCompare(b.type));
}

export function projectWidgetsMarkup(projectName:string,rows:readonly WidgetUse[],workflowCount:number,
  titleOf:(type:string)=>{title:string;icon:string;manual:boolean},esc:(v:string)=>string):string{
  if(!rows.length)return `<div class="widgets-view-body"><h2>Widgets</h2><p class="muted">No workflow in this project has a step yet.</p></div>`;
  return `<div class="widgets-view-body"><h2>Widgets in ${esc(projectName)}</h2>`
    +`<p>${rows.length} widget${rows.length===1?'':'s'} across ${workflowCount} workflow${workflowCount===1?'':'s'}. `
    +'Choose a workflow to open it.</p>'
    +'<table class="catalog-table project-widgets"><thead><tr><th scope="col">Widget</th><th scope="col">Workflows, and the steps there</th></tr></thead><tbody>'
    +rows.map(r=>{const t=titleOf(r.type);
      return `<tr data-widget="${esc(r.type)}"><th scope="row">${t.icon} ${esc(t.title)}`
        +(t.manual?`<br><button class="text-button" data-widget-manual="${esc(r.type)}">Manual</button>`:'')+'</th><td>'
        +r.uses.map(u=>`<div class="widget-use"><button class="text-button" data-open-workflow="${esc(u.key)}">${esc(u.name)}</button>`
          +`<span class="muted"> · ${u.steps.length} step${u.steps.length===1?'':'s'}`
          +(u.steps.some(Boolean)?`: ${u.steps.map(s=>esc(s||'(unnamed)')).join('; ')}`:'')+'</span></div>').join('')
        +'</td></tr>';}).join('')
    +'</tbody></table></div>';
}
