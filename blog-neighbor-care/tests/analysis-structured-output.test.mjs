import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {generateJson} from '../src/lib/analysis/provider.ts';
import {createAnalysisHandler} from '../src/lib/analysis/api.ts';
const schema={type:'object',properties:{profile:{type:'object',properties:{tone:{type:'string'}},required:['tone'],additionalProperties:false}},required:['profile'],additionalProperties:false};
test('AS01 Anthropic request constrains output with the supplied schema instead of relying on prompt text',async()=>{
 let calls=0;
 const output=await generateJson('anthropic','claude-haiku-4-5','fixture','system','user',async(_url,options)=>{
  calls++;const body=JSON.parse(options.body);assert.equal(body.output_config?.format?.type,'json_schema');assert.deepEqual(body.output_config.format.schema,schema);
  return Response.json({stop_reason:'end_turn',content:[{type:'text',text:'{"profile":{"tone":"설명체"}}'}]});
 },schema);
 assert.deepEqual(output,{profile:{tone:'설명체'}});assert.equal(calls,1);
});
test('AS02 profile handler supplies a static closed schema, retains exact quotation checks and never retries malformed output',async()=>{
 const member=randomUUID(),source=randomUUID(),id=randomUUID();let calls=0,captured;
 const input={id,provider:'anthropic',model:'claude-haiku-4-5',externalAiConfirmed:true,materialIds:[source],preferences:{requiredTopics:[],excludedTopics:[],region:'',scale:'any',styleSamples:[]}};
 let state='queued';const records=[];
 const handler=createAnalysisHandler({member:async()=>({allowed:true,userId:member}),key:async()=> 'fixture',
  rpc:async(_member,operation,p)=>{
   records.push(operation);
   if(operation==='prepare')return {data:{id,state},error:null};
   if(operation==='claim'){state='running';return {data:{id,kind:'profile',input,profile:null,posts:[{id:source,blogId:'fixture',postId:'123',title:'private-fixture-title',body:'private-fixture-body',source:'member-initiated-browser-read'}],expiresAt:'2099-01-01T00:00:00Z'},error:null};}
   if(operation==='uncertain')state='uncertain';return {data:{id,state},error:null};
  },generate:async(_p,_m,_k,_s,_u,s)=>{calls++;captured=s;assert.equal(s?.additionalProperties,false);assert.deepEqual(s?.required,['profile','evidence']);
   assert.equal(s.properties.profile.additionalProperties,false);assert.equal(s.properties.evidence.items.additionalProperties,false);
   assert.doesNotMatch(JSON.stringify(s),/private-fixture|fixture|[a-f0-9]{8}-[a-f0-9]{4}/);
   return generateJson('anthropic','claude-haiku-4-5','fixture','system','user',async()=>Response.json({stop_reason:'end_turn',content:[{type:'text',text:'non-JSON private-output'}]}),s);
  }});
 const send=()=>handler(new Request('https://fixture.test/api/analysis',{method:'POST',headers:{origin:'https://fixture.test','content-type':'application/json'},body:JSON.stringify({operation:'profile',payload:input})}));
 const response=await send();assert.equal(response.status,502);assert.equal(state,'uncertain');assert.equal(calls,1);assert.ok(captured);
 assert.doesNotMatch(await response.text(),/private-output|private-fixture/);await send();assert.equal(calls,1);assert.equal(records.includes('complete'),false);
});
test('AS03 schema mode does not repair invalid JSON, ignore refusal/truncation or make a second provider call',async()=>{
 for(const [stop_reason,text,reason]of [['end_turn','```json\n{}\n```','output_json'],['max_tokens','{"profile":','response_incomplete'],['refusal','I cannot do that','response_incomplete']]){
  let calls=0;await assert.rejects(()=>generateJson('anthropic','claude-haiku-4-5','fixture','s','u',async()=>{calls++;return Response.json({stop_reason,content:[{type:'text',text}]});},schema),error=>error.reason===reason);assert.equal(calls,1);
 }
});
