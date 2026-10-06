/** Runtime checks are still necessary at JSON, file and browser-storage boundaries. */
export function isRecord(value:unknown):value is Record<string,unknown> {return typeof value==='object' && value!==null && !Array.isArray(value);}
export function errorMessage(error:unknown):string {return error instanceof Error?error.message:String(error);}
export function required<T>(value:T|null|undefined,message='Required application value is missing'):T {if(value===null||value===undefined)throw new Error(message);return value;}
