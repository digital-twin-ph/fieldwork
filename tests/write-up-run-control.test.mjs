import test from 'node:test';
import assert from 'node:assert/strict';
import {notesPanel} from '../build/notes-ui.js';

/** THE WRITE-UP'S ONE CONTROL, in each of the three states it has.
 *
 *  The practitioner, 2026-10-30: *"There is no Run Workflows button on the Notes tab."* And again
 *  on 2026-10-31: *"Before Map 3 I still need the Run Workflows button at the top of the Notes
 *  tab."* The first report was answered by making the control always render; the second was about
 *  WHERE and WHAT it rendered as, which no test asked. Experiment 141. */

const esc=v=>String(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const panel=(run)=>notesPanel([],[],()=>undefined,esc,[],()=>undefined,run);
const bar=(html)=>html.slice(0,html.indexOf('</div>')+6);

test('THE CONTROL IS THE FIRST THING IN THE TAB',()=>{
  // The whole of the second report. The markup was there and the control was not: a sentence in
  // muted .86rem with a `.button.small` inside it, filed below the counts and the description.
  const html=panel({pending:['A','B'],total:6});
  assert.match(html,/^<div class="notes-run">/);
  assert.ok(html.indexOf('data-run-pending')<html.indexOf('notes-head'),
    'the counts come before the button');
});

test('something to run: a button, the count, and the workflows by name',()=>{
  const html=panel({pending:['The ground','Mortality','Per house','Died or survived'],total:6});
  assert.match(bar(html),/<button class="button primary" data-run-pending>Run workflows<\/button>/);
  assert.match(html,/4 of this project's 6 workflows have not run in this session/);
  assert.match(html,/not in this write-up yet/);
  // NAMED AND CAPPED at three, then the remainder as a number.
  assert.match(html,/The ground; Mortality; Per house, and 1 more/);
  assert.ok(!html.includes('Died or survived'),'the fourth name is printed in full');
});

test('one workflow left is spoken of as one',()=>{
  const html=panel({pending:['Died or survived'],total:6});
  assert.match(html,/1 of this project's 6 workflows has not run/);
  assert.match(html,/so its tables, charts and maps/);
});

test('NOTHING PENDING STILL SHOWS THE BUTTON',()=>{
  // Reported 2026-10-30. The control rendered only when something was pending, so a practitioner
  // whose six workflows had all run correctly saw nothing -- and had no way to tell a tab that
  // had decided against showing a button from a tab that never had one.
  const html=panel({pending:[],total:6});
  assert.match(html,/class="notes-run is-ready"/);
  assert.match(bar(html),/data-run-pending>Run workflows again<\/button>/);
  assert.match(html,/All 6 of this project's workflows have run in this session/);
});

test('NO PROJECT IS NOT A COMPLETED PROJECT, and offers no button',()=>{
  // Found on 2026-10-31 on the open `heat` example while looking for the button the practitioner
  // asked for: a workflow in no project was told "every workflow in this project has run in this
  // session" over a write-up with no project behind it and nothing run, with a button whose
  // handler returned without acting. The old control had two states for a surface with three.
  const html=panel({pending:[],total:0});
  assert.match(html,/class="notes-run is-absent"/);
  assert.ok(!html.includes('data-run-pending'),'a control that cannot act is still rendered');
  assert.match(html,/This workflow is not in a project/);
  assert.ok(!/has run in this session/.test(html),'an absence is reported as a completion');
});

test('it reports and does not grade',()=>{
  // 149's rule. A practitioner who has deliberately run two of six is not doing anything wrong.
  for(const run of [{pending:['A'],total:6},{pending:[],total:6},{pending:[],total:0}])
    assert.doesNotMatch(panel(run),/incomplete|missing|should|warning|complete the/i);
});

test('a workflow name is escaped where it is printed',()=>{
  assert.match(panel({pending:['<script>'],total:2}),/&lt;script&gt;/);
});

/** GRAYED OUT RATHER THAN GONE.
 *
 *  The practitioner, 2026-10-31: *"Perhaps we should have a rule that workflows with no project
 *  will not render on the Notes tab?"* and then, on the answer: *"we can render machined notes for
 *  the workflow"* / *"we can gray out the + notes to make it clear notes cannot be added without a
 *  project."* Experiment 141. */

const NOTE={kind:'machined',id:'n1:description',section:'Results',
  nodeId:'n1',text:'Mortality by sub-district. 32 rows.'};
const withNote=(run)=>notesPanel([],[NOTE],()=>'Mortality',esc,[],()=>undefined,run);
const UNFILED='This workflow is not in a project, so there is nowhere to keep a note.';

test('A READ-ONLY WRITE-UP STILL RENDERS ITS NOTES',()=>{
  // The practitioner's own correction to their first proposal. A workflow's machined notes are
  // what its run produced; they are not the project's to withhold, and no other surface shows
  // them. `writeUpNow` falls back to the open workflow's own key for exactly this reason.
  const html=withNote({pending:[],total:0,readOnly:UNFILED});
  assert.match(html,/Mortality by sub-district\. 32 rows\./);
  assert.match(html,/class="notes-note k-machined"/);
});

test('every control that cannot keep a note is disabled, and says why on itself',()=>{
  const html=withNote({pending:[],total:0,readOnly:UNFILED});
  const adds=[...html.matchAll(/<button[^>]*data-add-note="[^"]*"([^>]*)>/g)].map(m=>m[1]);
  assert.ok(adds.length>=5,`only ${adds.length} add controls found`);
  for(const attrs of adds){
    assert.match(attrs,/ disabled/);
    assert.match(attrs,/aria-disabled="true"/);
    // THE FACT AND THE ACCOUNT TOGETHER. A disabled button says "not here" and not "because".
    assert.ok(attrs.includes('nowhere to keep a note'),'the button does not say why');
  }
  // AND THE CARD CANNOT BE PICKED UP, because moving a note is kept by the same call.
  assert.match(html,/class="notes-note k-machined" draggable="false"/);
  // The reason is also said once, in prose, at the top.
  assert.match(html,/class="notes-readonly"/);
});

test('a built-in example says it is an example, not that it has no project',()=>{
  // TWO STATES, TWO SENTENCES. Both end at `writeNotes` returning false, and only one of them is
  // about a missing project; one message for both would send half the practitioners who meet it
  // looking for the wrong thing.
  const shipped='Heat outreach screening is a worked example that ships with Fieldwork, '
    +'so its write-up is read-only.';
  const html=withNote({pending:[],total:1,readOnly:shipped});
  assert.match(html,/is a worked example that ships with Fieldwork/);
  assert.ok(!html.includes('not in a project'),'a filed example is called unfiled');
  // It still has a project, so it still has the run control.
  assert.match(html,/data-run-pending>Run workflows again</);
});

test('a project of the practitioner’s own disables nothing',()=>{
  const html=withNote({pending:[],total:6,readOnly:null});
  assert.ok(!/data-add-note="[^"]*"[^>]*disabled/.test(html),'an add control is disabled');
  assert.match(html,/draggable="true"/);
  assert.ok(!html.includes('notes-readonly'),'a writable write-up explains a refusal');
});

test('an older caller that states nothing is treated as writable',()=>{
  // `readOnly` is optional, so the panel must not disable a board because a caller predates the
  // field. The surface refuses a WRITE on its own account either way.
  const html=withNote({pending:[],total:6});
  assert.ok(!/data-add-note="[^"]*"[^>]*disabled/.test(html));
});
