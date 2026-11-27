/** A SUPABASE KEY, CHECKED ON THE SPOT (experiment 233's spike, 2026-11-27). The practitioner: *"a manual entry for it in
 *  the credentials dialog so I can follow it and create my API key and test it on the spot with an API status check."*
 *
 *  Only a publishable key belongs in a browser. Supabase's API keys page, read 2026-11-27: secret keys are for backend
 *  components only, and a browser's request with one is answered 401. A secret key is refused here before anything is
 *  sent, so it never leaves this page, and it is refused as it is added, so it is never kept in a credentials file. */

export const SUPABASE_PROVIDER='supabase';
/** A project's address: https://<project ref>.supabase.co, nothing after it. */
export const SUPABASE_ORIGIN=/^https:\/\/[a-z0-9]+\.supabase\.co$/;

/** The role a legacy JWT key carries (`anon` or `service_role`), or undefined for anything else. */
function jwtRole(key:string):string|undefined{
  const parts=key.split('.');
  if(parts.length!==3)return undefined;
  try{
    const json=atob(parts[1].replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(parts[1].length/4)*4,'='));
    const role=(JSON.parse(json) as {role?:unknown}).role;
    return typeof role==='string'?role:undefined;
  }catch{return undefined;}
}

/** Why this key must not be used in a browser, or undefined when it may be. */
export function supabaseKeyProblem(key:string):string|undefined{
  if(key.startsWith('sb_secret_')||jwtRole(key)==='service_role')
    return 'This is a Supabase secret key. It must never be used in a browser. Use the project\'s publishable key, which starts sb_publishable_.';
  return undefined;
}

export interface SupabaseCheck {ok:boolean; said:string}

/** Asks the project's Auth health route with the key, and says in words what came back. */
export async function checkSupabase(origin:string,key:string,fetchFn:typeof fetch=fetch):Promise<SupabaseCheck>{
  if(!SUPABASE_ORIGIN.test(origin))
    return {ok:false,said:`${origin} is not a Supabase project address. It reads https://, then the project's reference, then .supabase.co, with nothing after it.`};
  const problem=supabaseKeyProblem(key);
  if(problem)return {ok:false,said:`Not sent. ${problem}`};
  let response:Response;
  try{response=await fetchFn(`${origin}/auth/v1/health`,{headers:{apikey:key},cache:'no-store'});}
  catch{return {ok:false,said:`Could not reach ${origin}. Check the address, and that this computer is online. A project that has been deleted cannot be reached.`};}
  const legacy=jwtRole(key)==='anon'?' This is a legacy anon key: Supabase plans to retire these in early 2027, so use the publishable key instead.':'';
  if(response.ok){
    let about='';
    try{const body=await response.json() as {name?:unknown;version?:unknown};
      if(typeof body.name==='string')about=` (${body.name}${typeof body.version==='string'?` ${body.version}`:''})`;}catch{/* a health answer without a body is still an answer */}
    return {ok:true,said:`Supabase answered ${response.status}: the project is running and accepted this key${about}.${legacy}`};
  }
  if(response.status===401||response.status===403)
    return {ok:false,said:`Supabase answered ${response.status}: it refused this key. Copy the publishable key again from the project's API Keys page.`};
  return {ok:false,said:`Supabase answered ${response.status}. A free project pauses after a week without use: open it in Supabase's dashboard and restore it, then check again.`};
}
