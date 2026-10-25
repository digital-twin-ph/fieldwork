/** WHY A SAVE WAS REFUSED, decided in one pure function.
 *
 *  `change()` returns a bare `false` for conditions that have nothing to do with each other: a
 *  run in flight, which never reaches the store, and a store that refused the bytes. Callers were
 *  handed that one boolean and wrote a sentence about storage for both, so applying a study area
 *  during a run reported "Study area could not be saved. Retry Apply." over a workspace holding
 *  169 KB, where retrying would fail identically until the run ended. Found 2026-10-24.
 *
 *  THIS IS A DECISION, NOT A SURFACE, and it lives here so it can be checked as one. The first
 *  version of it sat inside a four-thousand-line module where the only way to reach it was to
 *  race a browser against its own auto-run -- a test that passed in isolation in both engines and
 *  failed in WebKit under the full suite, which is a flake rather than a check. Given the three
 *  facts it depends on, the answer is fixed, and a fixed answer deserves a deterministic test. */
export interface SaveFailure {name:string; bytes:number}

/** The refusal in words. `quotaMessage` is injected rather than imported so this module stays
 *  free of the storage figures and can be exercised without them. */
export function saveRefusalMessage(
    fallback:string,
    busy:boolean,
    lastFailure:SaveFailure|null,
    quotaMessage:(bytes:number)=>string):string{
  // A RUN IN FLIGHT IS NOT A STORAGE PROBLEM. No save was attempted, so there is nothing the
  // store could have said, and the caller's sentence would send the practitioner to look at a
  // quota that is not the reason. Checked first because a stale `lastFailure` from an earlier
  // refusal would otherwise describe the wrong event.
  if(busy)return 'A run is in progress, so nothing can be saved yet. Wait for it to finish, then try again.';
  // Nothing recorded: the caller's own sentence stands, because inventing a cause is worse than
  // naming none.
  if(!lastFailure)return fallback;
  return /quota|exceed|full/i.test(lastFailure.name)
    ? quotaMessage(lastFailure.bytes)
    : `${fallback} The device reported ${lastFailure.name}.`;
}
