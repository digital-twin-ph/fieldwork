/** Runtime checks are still necessary at JSON, file and browser-storage boundaries. */
export function isRecord(value:unknown):value is Record<string,unknown> {return typeof value==='object' && value!==null && !Array.isArray(value);}
/** What went wrong, in words. A browser event passed as the reason, as a FileReader's failure is, read "[object
 *  ProgressEvent]" (2026-11-13); it is said as the read that failed. */
export function errorMessage(error:unknown):string {
  // A FILE THE BROWSER WOULD NOT READ: its own words blame "permission problems", which sent the practitioner looking at
  // the wrong thing (2026-11-13, a 12 GB grid read whole). Said as what to try.
  if(error instanceof Error&&error.name==='NotReadableError')
    return 'The file could not be read. It may be too large to read at once, or it changed, moved or was still downloading after it was chosen: choose it again.';
  if(error instanceof Error)return error.message;
  if(typeof Event!=='undefined'&&error instanceof Event){const inner=(error.target as {error?:{message?:string}}|null)?.error?.message;
    return `A file could not be read${inner?`: ${inner}`:''}. It may be too large for this browser tab.`;}
  return String(error);
}
export function required<T>(value:T|null|undefined,message='Required application value is missing'):T {if(value===null||value===undefined)throw new Error(message);return value;}
