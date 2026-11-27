import test from 'node:test';
import assert from 'node:assert/strict';
import {checkSupabase,supabaseKeyProblem} from '../build/supabase-check.js';

/** A SUPABASE KEY, CHECKED ON THE SPOT (experiment 233's spike, 2026-11-27). One request to the project's Auth health
 *  route; a secret key is never sent. */
const ORIGIN='https://abcdefghijklmnopqrst.supabase.co';
const jwt=role=>`x.${Buffer.from(JSON.stringify({role})).toString('base64url')}.y`;
const answering=(status,body)=>{const asked=[];
  const fetchFn=async(url,init)=>{asked.push({url,init});return new Response(body===undefined?null:JSON.stringify(body),{status});};
  return {asked,fetchFn};};

test('a working publishable key: the health route, the key on the apikey header, and what answered', async()=>{
  const {asked,fetchFn}=answering(200,{name:'GoTrue',version:'v2.170.0'});
  const result=await checkSupabase(ORIGIN,'sb_publishable_abc',fetchFn);
  assert.equal(result.ok,true);
  assert.equal(asked[0].url,`${ORIGIN}/auth/v1/health`);
  assert.equal(asked[0].init.headers.apikey,'sb_publishable_abc');
  assert.match(result.said,/answered 200: the project is running and accepted this key \(GoTrue v2\.170\.0\)/);
});

test('a refused key says so, with the status', async()=>{
  const result=await checkSupabase(ORIGIN,'sb_publishable_wrong',answering(401,{message:'Invalid API key'}).fetchFn);
  assert.equal(result.ok,false);
  assert.match(result.said,/answered 401: it refused this key/);
});

test('any other answer names its status and the paused-project cause', async()=>{
  const result=await checkSupabase(ORIGIN,'sb_publishable_abc',answering(503).fetchFn);
  assert.equal(result.ok,false);
  assert.match(result.said,/answered 503\. A free project pauses after a week without use/);
});

test('no answer at all is said as unreachable', async()=>{
  const result=await checkSupabase(ORIGIN,'sb_publishable_abc',async()=>{throw new TypeError('Failed to fetch');});
  assert.equal(result.ok,false);
  assert.match(result.said,/^Could not reach https:\/\/abcdefghijklmnopqrst\.supabase\.co\./);
});

test('a secret key is never sent, new or legacy', async()=>{
  for(const key of ['sb_secret_abc',jwt('service_role')]){
    const {asked,fetchFn}=answering(200,{});
    const result=await checkSupabase(ORIGIN,key,fetchFn);
    assert.equal(result.ok,false);assert.equal(asked.length,0);
    assert.match(result.said,/^Not sent\. This is a Supabase secret key/);
    assert.ok(supabaseKeyProblem(key));
  }
  assert.equal(supabaseKeyProblem('sb_publishable_abc'),undefined);
  assert.equal(supabaseKeyProblem(jwt('anon')),undefined);
});

test('a legacy anon key works and is told it will be retired', async()=>{
  const result=await checkSupabase(ORIGIN,jwt('anon'),answering(200,{}).fetchFn);
  assert.equal(result.ok,true);
  assert.match(result.said,/legacy anon key: Supabase plans to retire these in early 2027/);
});

test('an address that is not a project is refused before anything is sent', async()=>{
  for(const origin of [`${ORIGIN}/`,'https://supabase.com','http://abc.supabase.co','https://abc.supabase.co/rest/v1']){
    const {asked,fetchFn}=answering(200,{});
    const result=await checkSupabase(origin,'sb_publishable_abc',fetchFn);
    assert.equal(result.ok,false);assert.equal(asked.length,0);
    assert.match(result.said,/is not a Supabase project address/);
  }
});
