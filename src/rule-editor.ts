/** Writing rules, in a dialog with room to write them in.
 *
 *  The practitioner, 2026-10-15: *"I see the ruleset widget but it's not editable"*, and then
 *  *"Perhaps the rule editor should be a modal dialog so there is enough space."* Both right. The
 *  Inspector could show the rules a node carries and change their numbers; it could not add a
 *  condition, and a panel that narrow could not have held one legibly if it tried.
 *
 *  What this edits is [experiment 106](../docs/experiments/106-rule-builder-ui.md)'s authored
 *  form: conditions, grouped by AND, alternatives by OR, each rule concluding a list. The form is
 *  disjunctive normal form by construction, so every arrangement this dialog can produce has an
 *  N3 image -- the editor cannot build something the compiler must refuse for being inexpressible.
 *  What it CAN build is something refused for being too large, and the ceiling is checked on every
 *  edit rather than at the end.
 *
 *  Nothing is guessed. A field is chosen from the bindings the step declares, a comparator from
 *  what that field's kind supports, and a value is typed. The vocabulary a practitioner coins
 *  lives in `urn:fieldwork:authored:` and never in the application's own namespace.
 */
import type {ParamsByType} from './types.js';
import type {Escape} from './types.js';
import {compileAuthoredRuleset,compiledRuleCount,RULE_CEILING,authoredUnitProblems} from './authored-rules.js';

type Authored=NonNullable<ParamsByType['apply_ruleset']['authored']>;
type Field=Authored['fields'][number];

/** Which comparators a field of each kind can be asked for.
 *
 *  A term is matched or it is not; a number can be compared. Offering `is more than` for a
 *  category would compile to a math builtin that silently matches nothing, which is the failure
 *  the compiler refuses and this list prevents a practitioner from reaching. */
const COMPARATORS:Record<Field['kind'],{value:string;label:string}[]>={
  number:[{value:'equals',label:'is'},{value:'greaterThan',label:'is more than'},
    {value:'notGreaterThan',label:'is at most'},{value:'lessThan',label:'is less than'},
    {value:'notLessThan',label:'is at least'}],
  term:[{value:'equals',label:'is'}],
  boolean:[{value:'equals',label:'is'}],
};

/** Every predicate a condition can read: each declared field, and whether it was recorded.
 *
 *  The `…Known` companion is what lets a rule conclude Unknown instead of concluding nothing,
 *  and it is the branch a practitioner forgets, so it is offered rather than left to be typed. */
function readable(fields:Field[]):{predicate:string;label:string;kind:Field['kind']}[]{
  return fields.flatMap(field=>[
    {predicate:field.predicate,label:field.label||field.attribute,kind:field.kind},
    {predicate:`${field.predicate}Known`,label:`whether ${field.label||field.attribute} is recorded`,kind:'boolean' as const},
  ]);
}

const blankCondition=(fields:Field[]):Authored['rules'][number]['any'][number]['all'][number]=>
  ({field:readable(fields)[0]?.predicate??'fwa:field',comparator:'equals',value:''});

export interface RuleEditorResult {rules:Authored['rules']}

/** Opens the dialog. Resolves with the edited rules, or with nothing if the practitioner closes
 *  it without keeping them -- the node is not touched until they do. */
export function openRuleEditor(authored:Authored,esc:Escape):Promise<RuleEditorResult|undefined>{
  return new Promise(resolve=>{
    // Edited on a copy. A practitioner who closes without keeping leaves the step as it was, and
    // one who keeps gets a single change that Undo reverses in one step.
    let rules:Authored['rules']=JSON.parse(JSON.stringify(authored.rules));
    const fields=authored.fields,choices=readable(fields);
    const kindOf=(predicate:string)=>choices.find(c=>c.predicate===predicate)?.kind??'term';
    const unitOf=(predicate:string)=>{
      const field=fields.find(f=>f.predicate===predicate);
      return field?.unitLabel||field?.unit?.split('/').pop();
    };

    const dialog=document.createElement('dialog');
    dialog.id='rule-editor';
    dialog.setAttribute('aria-labelledby','rule-editor-title');

    const close=(result?:RuleEditorResult)=>{dialog.close();dialog.remove();resolve(result);};

    const conditionRow=(rule:number,group:number,index:number,
      condition:Authored['rules'][number]['any'][number]['all'][number])=>{
      const kind=kindOf(condition.field);
      const where=`data-rule="${rule}" data-group="${group}" data-condition="${index}"`;
      return `<div class="rule-condition">`
        +`<select ${where} data-part="field" aria-label="Field">`
        +choices.map(choice=>`<option value="${esc(choice.predicate)}" ${choice.predicate===condition.field?'selected':''}>${esc(choice.label)}</option>`).join('')
        +`</select>`
        +`<select ${where} data-part="comparator" aria-label="Comparator">`
        +COMPARATORS[kind].map(c=>`<option value="${c.value}" ${c.value===condition.comparator?'selected':''}>${esc(c.label)}</option>`).join('')
        +`</select>`
        +(kind==='boolean'
          ?`<select ${where} data-part="value" aria-label="Value"><option value="true" ${condition.value===true?'selected':''}>true</option><option value="false" ${condition.value===false?'selected':''}>false</option></select>`
          :`<input ${where} data-part="value" aria-label="Value" value="${esc(String(condition.value??''))}" placeholder="${kind==='number'?'a number, or {{parameter}}':'a value, such as clinic'}">`
            // The unit the field is measured in, beside the box the number is typed into. A bare
            // literal takes the field's unit and nothing can check it, so showing it is the only
            // defence there is: the practitioner typing 10 can see whether 10 means minutes.
            +(kind==='number'&&unitOf(condition.field)?`<span class="rule-unit">${esc(unitOf(condition.field)!)}</span>`:''))
        +`<button class="button small" ${where} data-part="drop-condition" aria-label="Remove this condition">Remove</button>`
        +`</div>`;
    };

    const render=()=>{
      const count=compiledRuleCount({subject:'?s',rules:rules as never});
      let problem='';
      try{compileAuthoredRuleset({subject:'?s',rules:rules as never});}
      catch(error){problem=error instanceof Error?error.message:String(error);}
      // Units are checked while the rule is being written, which is the whole point: the same
      // check at run time tells a practitioner their rules are wrong after they have written
      // them, kept them, and run the workflow.
      if(!problem){
        const units=authoredUnitProblems({...authored,rules:rules as never});
        if(units.length)problem=units[0].says;
      }
      dialog.innerHTML=`<div class="manual-head"><h2 id="rule-editor-title">${esc(authored.title)}</h2>`
        +`<div><button class="button" id="rule-editor-cancel">Close without keeping</button>`
        +`<button class="button primary" id="rule-editor-keep" ${problem?'disabled':''}>Keep these rules</button></div></div>`
        +`<div class="rule-editor-body">`
        +`<p class="description">Every rule is checked against every record. A record that matches more than one rule takes all of their conclusions, so rules that disagree must not both match; a record that matches none keeps no conclusion, and the run says how many.</p>`
        +(problem?`<div class="inspector-alert" role="alert"><strong>These rules cannot be compiled</strong><p>${esc(problem)}</p></div>`:'')
        +rules.map((rule,r)=>`<section class="rule-card"><header><h3>Rule ${r+1}</h3>`
          +`<button class="button small" data-rule="${r}" data-part="drop-rule">Remove rule</button></header>`
          +rule.any.map((group,g)=>`<div class="rule-group">`
            +(g?`<p class="rule-or">or if</p>`:`<p class="rule-or">if</p>`)
            +group.all.map((condition,c)=>conditionRow(r,g,c,condition)).join('')
            +`<button class="button small" data-rule="${r}" data-group="${g}" data-part="add-condition">+ and</button>`
            +(rule.any.length>1?`<button class="button small" data-rule="${r}" data-group="${g}" data-part="drop-group">Remove alternative</button>`:'')
            +`</div>`).join('')
          +`<button class="button small" data-rule="${r}" data-part="add-group">+ or</button>`
          +`<p class="rule-or">then</p>`
          +rule.then.map((conclusion,t)=>`<div class="rule-condition">`
            +`<input data-rule="${r}" data-then="${t}" data-part="predicate" aria-label="Conclusion name" value="${esc(conclusion.predicate.replace(/^fwa:/,''))}" placeholder="band">`
            +`<span class="rule-is">is</span>`
            +`<input data-rule="${r}" data-then="${t}" data-part="conclusion" aria-label="Conclusion value" value="${esc(conclusion.value.replace(/^fwa:/,''))}" placeholder="Short">`
            +(rule.then.length>1?`<button class="button small" data-rule="${r}" data-then="${t}" data-part="drop-then">Remove</button>`:'')
            +`</div>`).join('')
          +`<button class="button small" data-rule="${r}" data-part="add-then">+ and conclude</button>`
          +`</section>`).join('')
        +`<button class="button" id="rule-editor-add">+ Add a rule</button>`
        +`<p class="muted">${count} of ${RULE_CEILING} rules once compiled. Every alternative becomes a rule of its own, so alternatives multiply where conditions add.</p>`
        +`</div>`;
      wire();
    };

    const number=(el:HTMLElement,name:string)=>Number(el.dataset[name]);
    const wire=()=>{
      dialog.querySelector<HTMLButtonElement>('#rule-editor-cancel')!.onclick=()=>close();
      dialog.querySelector<HTMLButtonElement>('#rule-editor-keep')!.onclick=()=>close({rules});
      dialog.querySelector<HTMLButtonElement>('#rule-editor-add')!.onclick=()=>{
        rules=[...rules,{any:[{all:[blankCondition(fields)]}],then:[{predicate:'fwa:decision',value:'fwa:Review'}]}];
        render();
      };
      dialog.querySelectorAll<HTMLElement>('[data-part]').forEach(el=>{
        const part=el.dataset.part!,r=number(el,'rule');
        if(el instanceof HTMLButtonElement){
          el.onclick=()=>{
            const g=number(el,'group'),c=number(el,'condition'),t=number(el,'then');
            if(part==='drop-rule')rules=rules.filter((_,i)=>i!==r);
            if(part==='add-group')rules[r].any=[...rules[r].any,{all:[blankCondition(fields)]}];
            if(part==='drop-group')rules[r].any=rules[r].any.filter((_,i)=>i!==g);
            if(part==='add-condition')rules[r].any[g].all=[...rules[r].any[g].all,blankCondition(fields)];
            if(part==='drop-condition'){
              rules[r].any[g].all=rules[r].any[g].all.filter((_,i)=>i!==c);
              // A group with no conditions would match everything, which is never what the person
              // deleting the last one meant. The alternative goes with it.
              if(!rules[r].any[g].all.length)rules[r].any=rules[r].any.filter((_,i)=>i!==g);
              if(!rules[r].any.length)rules=rules.filter((_,i)=>i!==r);
            }
            if(part==='add-then')rules[r].then=[...rules[r].then,{predicate:'fwa:reason',value:'fwa:Stated'}];
            if(part==='drop-then')rules[r].then=rules[r].then.filter((_,i)=>i!==t);
            render();
          };
          return;
        }
        el.addEventListener('change',()=>{
          const value=(el as HTMLInputElement|HTMLSelectElement).value;
          const g=number(el,'group'),c=number(el,'condition'),t=number(el,'then');
          const condition=rules[r]?.any?.[g]?.all?.[c];
          if(part==='field'&&condition){
            condition.field=value;
            // The comparators that fit the new field. A term that kept `is more than` would
            // compile to a builtin matching nothing, so the choice is corrected rather than
            // carried over.
            const allowed=COMPARATORS[kindOf(value)].map(x=>x.value);
            if(!allowed.includes(condition.comparator))condition.comparator=allowed[0];
            if(kindOf(value)==='boolean'&&typeof condition.value!=='boolean')condition.value=true;
          }
          if(part==='comparator'&&condition)condition.comparator=value;
          if(part==='value'&&condition)
            condition.value=kindOf(condition.field)==='boolean'?value==='true'
              :kindOf(condition.field)==='number'&&value.trim()&&!value.includes('{{')?Number(value)
              :value;
          // A practitioner writes `band`, not `fwa:band`: the namespace is the application's
          // business and is added here rather than asked for.
          const prefixed=(raw:string)=>raw.trim().startsWith('fwa:')?raw.trim():`fwa:${raw.trim().replace(/[^A-Za-z0-9_]+/g,'_')}`;
          if(part==='predicate'&&rules[r]?.then?.[t])rules[r].then[t].predicate=prefixed(value);
          if(part==='conclusion'&&rules[r]?.then?.[t])rules[r].then[t].value=prefixed(value);
          render();
        });
      });
    };

    render();
    document.body.append(dialog);
    dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
    dialog.showModal();
  });
}
