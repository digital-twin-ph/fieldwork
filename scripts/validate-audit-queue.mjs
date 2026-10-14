// The audit queue may shrink and never grow, and a widget leaves it only by being audited.
//
// A queue of things to look at is the easiest kind of ledger to let rot: entries get added, none
// get removed, and the count stops meaning anything. The ceiling makes the direction visible, and
// requiring `auditedIn` to name a document that actually mentions the node type stops a widget
// being marked audited by assertion.
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const queue=JSON.parse(readFileSync(join(root,'widgets/audit-queue.json'),'utf8'));
const registry=JSON.parse(readFileSync(join(root,'widgets/registry.json'),'utf8'));
const known=new Set(registry.widgets.map(w=>w.nodeType));
const problems=[];

if(queue.pending.length>queue.pendingCeiling)
  problems.push(`${queue.pending.length} widgets are pending against a ceiling of ${queue.pendingCeiling}. The ceiling may be lowered, never raised: audit one, or say why the ceiling moves.`);

const seen=new Set();
for(const entry of [...queue.pending,...queue.audited]){
  if(seen.has(entry.nodeType))problems.push(`${entry.nodeType} appears twice in the queue.`);
  seen.add(entry.nodeType);
  if(!known.has(entry.nodeType))problems.push(`${entry.nodeType} is queued but is not a registered widget.`);
}
for(const entry of queue.pending)
  if(!entry.why?.trim())problems.push(`${entry.nodeType}: queued with no reason. An entry nobody can act on is not a finding.`);

for(const entry of queue.audited){
  const path=join(root,entry.auditedIn||'');
  if(!entry.auditedIn||!existsSync(path)){
    problems.push(`${entry.nodeType}: claims it was audited in "${entry.auditedIn}", which does not exist.`);continue;
  }
  if(!readFileSync(path,'utf8').includes(entry.nodeType))
    problems.push(`${entry.nodeType}: ${entry.auditedIn} does not mention it, so the audit it claims cannot be read.`);
  if(!entry.verdict?.trim())problems.push(`${entry.nodeType}: audited with no verdict recorded.`);
}

console.log(`Widget audit queue: ${queue.pending.length} pending (ceiling ${queue.pendingCeiling}), ${queue.audited.length} audited.`);
if(queue.pending.length)console.log('  pending: '+queue.pending.map(e=>e.nodeType).join(', '));
if(problems.length){console.error('');for(const p of problems)console.error('  • '+p);process.exit(1);}
