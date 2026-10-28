import test from 'node:test';
import assert from 'node:assert/strict';
import { generateJson } from '../src/lib/analysis/provider.ts';
const secret='fixture-private-key';
test('PR01 billing, credentials, model and rate errors are distinct without exposing response text',async()=>{
 for(const [status,type,message,code] of [
  [400,'invalid_request_error','Your credit balance is too low to access the Anthropic API.','billing_required'],
  [402,'billing_error','Payment issue.','billing_required'],
  [401,'authentication_error','invalid x-api-key '+secret,'authentication_required'],
  [404,'not_found_error','model: fixture-retired','model_unavailable'],
  [429,'rate_limit_error','Rate limit reached.','rate_limited'],
  [403,'permission_error','Access denied.','permission_denied'],
  [400,'invalid_request_error','Malformed request '+secret,'request_invalid'],
  [529,'overloaded_error','Temporarily overloaded.','provider_unavailable'],
 ]){
  let calls=0;
  await assert.rejects(()=>generateJson('anthropic','claude-haiku-4-5',secret,'system','fixture',async()=>{
   calls++;return Response.json({error:{type,message}},{status});
  }),error=>{assert.equal(error.httpStatus,status);assert.equal(error.providerCode,code);assert.doesNotMatch(JSON.stringify(error)+error.message,new RegExp(secret));return true;});
  assert.equal(calls,1);
 }
});
test('PR02 oversized/unreadable rejection body stays bounded and is not retained',async()=>{
 let cancelled=false;
 const response=new Response(new ReadableStream({pull(c){c.enqueue(new TextEncoder().encode(secret.repeat(1000)));},cancel(){cancelled=true;}}),{status:400});
 await assert.rejects(()=>generateJson('anthropic','claude-haiku-4-5',secret,'s','u',async()=>response),error=>{
  assert.equal(error.reason,'http_rejected');assert.equal(error.providerCode,undefined);assert.doesNotMatch(JSON.stringify(error),new RegExp(secret));return true;
 });
 assert.equal(cancelled,true);
});
