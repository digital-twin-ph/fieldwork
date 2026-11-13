/** Runtime checks are still necessary at JSON, file and browser-storage boundaries. */
export function isRecord(value:unknown):value is Record<string,unknown> {return typeof value==='object' && value!==null && !Array.isArray(value);}
/** What went wrong, in words. A browser event passed as the reason, as a FileReader's failure is, read "[object
 *  ProgressEvent]" (2026-11-13); it is said as the read that failed. */
export function errorMessage(error:unknown):string {
  if(error instanceof Error)return error.message;
  if(typeof Event!=='undefined'&&error instanceof Event){const inner=(error.target as {error?:{message?:string}}|null)?.error?.message;
    return `A file could not be read${inner?`: ${inner}`:''}. It may be too large for this browser tab.`;}
  return String(error);
}
export function required<T>(value:T|null|undefined,message='Required application value is missing'):T {if(value===null||value===undefined)throw new Error(message);return value;}
