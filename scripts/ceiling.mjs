/** A ceiling may fall freely and may rise only on the record.
 *
 *  Without this the ratchet has no ratchet: the LIST could never grow, but the bound on it could be
 *  raised in the same commit that grew it, and nothing read the prose that said otherwise. Found
 *  2026-10-13 by raising this ceiling by five and watching the build pass.
 *
 *  Falling is unconstrained on purpose -- clearing an entry should never need paperwork. */
export function ceilingProblems(label,{current,initial,raises}){
  const out=[];
  if(!Number.isInteger(initial))return [`${label} records no initial ceiling, so no rise can be detected.`];
  let allowed=initial;
  for(const raise of raises??[]){
    if(!Number.isInteger(raise.from)||!Number.isInteger(raise.to)||raise.to<=raise.from)
      out.push(`${label} records a raise that does not raise: ${JSON.stringify(raise)}`);
    else if(!raise.date||!raise.why)
      out.push(`${label} raises the ceiling to ${raise.to} without a date and a reason.`);
    else allowed+=raise.to-raise.from;
  }
  if(current>allowed)
    out.push(`${label} sets a ceiling of ${current}; ${initial} was the starting value and the `
      +`recorded raises account for ${allowed}. A ceiling that moves without a record is not a `
      +`ratchet. Lower it, or record the raise with its date and reason.`);
  return out;
}
