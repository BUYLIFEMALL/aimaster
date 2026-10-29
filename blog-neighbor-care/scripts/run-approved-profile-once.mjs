// Default: read-only preflight. Paid execution requires this exact new approval
// marked applied, plus a durable exclusive marker. Never alters the old job.
// Invoke from the app folder: node --conditions=react-server --import tsx
// scripts/run-approved-profile-once.mjs [--approval <scoped-request-id>] [--run]
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {createAnalysisHandler} from '../src/lib/analysis/api.ts';
import {generateJson} from '../src/lib/analysis/provider.ts';
import {prompt,hash,analysisOutputSchema} from '../src/lib/analysis/contracts.ts';
import {resolveApiKey} from '../src/lib/analysis/memberApiKeys.ts';
import {checkProgramAccess} from '../src/lib/programAccess.ts';
const userId='4a82ff77-97f7-474d-866e-8e9431858ed3',originalJob='e207aead-b540-4ec5-af46-8b371dafc30c';
const scopedApprovals=['ae2dc89a-e1bc-4254-a100-c5c39ad783e5','668992b9-4d8d-4f57-96db-e0fdf1fb8c7b'];
const args=process.argv.slice(2),approvalIndex=args.indexOf('--approval');
const approvalId=approvalIndex>=0?args[approvalIndex+1]:scopedApprovals[0],provider='anthropic',model='claude-haiku-4-5';
const root=new URL('../../',import.meta.url);let stage='configuration';
try{
 const env={...process.env};for(const line of fs.readFileSync(new URL('.env.local',root),'utf8').split(/\r?\n/)){
  const m=line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);if(m&&!env[m[1]])env[m[1]]=m[2].replace(/^["']|["']$/g,'');
 }
 const url=env.NEXT_PUBLIC_SUPABASE_URL,secret=env.SUPABASE_SECRET_KEY?.trim()||env.SUPABASE_SERVICE_ROLE_KEY?.trim();
 if(url!=='https://esgxyikcnnvmlhygjkth.supabase.co'||!secret)throw Error('configuration');
 const client=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 async function one(table,columns,id){const r=await client.from(table).select(columns).eq('id',id).maybeSingle();if(r.error||!r.data)throw Error('lookup');return r.data;}
 const run=args.includes('--run');
 if(!scopedApprovals.includes(approvalId)||args.filter(x=>x==='--approval').length>1||args.filter(x=>x==='--run').length>1||
  args.some((x,i)=>!['--run','--approval'].includes(x)&&!(approvalIndex>=0&&i===approvalIndex+1)))throw Error('arguments');
 stage='approval';
 const marker=new URL(`scratch/blog-profile-approved-${approvalId}.json`,root),consumed=fs.existsSync(marker);
 const approval=await one('admin_dev_requests','kind,category,status,from_session',approvalId);
 const approved=!consumed&&approval.kind==='owner_action'&&approval.category==='cost'&&approval.status==='applied'&&approval.from_session==='codex-win-20261026-blog-check';
 if(run&&!approved)throw Error('new_approval_required');
 stage='source';
 const old=await one('bnc_analysis_jobs','user_id,kind,state,input,material_ids,expires_at',originalJob);
 if(old.user_id!==userId||old.kind!=='profile'||old.state!=='uncertain'||old.input.provider!==provider||old.input.model!==model||old.material_ids.length!==1||Date.parse(old.expires_at)<=Date.now()+120000)throw Error('scope');
 const material=await one('bnc_reader_materials','id,user_id,blog_id,post_id,title,body,expires_at',old.material_ids[0]);
 if(material.user_id!==userId||material.blog_id!=='buylifemall'||Date.parse(material.expires_at)<=Date.now()+120000)throw Error('source');
 const payload={id:randomUUID(),provider,model,externalAiConfirmed:true,materialIds:[material.id],preferences:old.input.preferences};
 function budget(messages){
  const tokens=Buffer.byteLength(JSON.stringify({model,max_tokens:6000,system:messages.system,messages:[{role:'user',content:messages.user}],output_config:{format:{type:'json_schema',schema:analysisOutputSchema('profile')}}}),'utf8')+512;
  const usd=tokens/1e6+6000*5/1e6;if(tokens>20000||usd>0.05)throw Error('budget');return {estimatedInputTokens:tokens,maximumOutputTokens:6000,estimatedMaximumUsd:usd,usdLimit:0.05};
 }
 const preflight=budget(prompt({id:payload.id,kind:'profile',input:old.input,profile:null,expiresAt:material.expires_at,posts:[{id:material.id,blogId:material.blog_id,postId:material.post_id,title:material.title,
  body:[...material.body].slice(0,4000).join(''),source:'member-initiated-browser-read',originalCharacterCount:[...material.body].length,bodyTruncated:[...material.body].length>4000}]}));
 const readiness={checkedAt:new Date().toISOString(),originalJob,approvalId,approved,approvalConsumed:consumed,runRequested:run,provider,model,materialCount:1,...preflight,originalJobUnchanged:true,rawBodyOrKeyPrinted:false};
 if(!run){console.log(JSON.stringify({...readiness,operatingWrites:0,paidCalls:0}));process.exit(0);}
 stage='access';
 const member=async()=>{
  const p=await client.from('programs').select('id').eq('slug','blog-neighbor-care').eq('is_active',true).maybeSingle();
  const a=await checkProgramAccess(client,userId,'blog-neighbor-care');
  return !p.error&&p.data&&a.allowed?{allowed:true,userId}:{allowed:false,status:403,error:'Program access required'};
 };
 if(!(await member()).allowed)throw Error('access');
 // The marker records capabilities/status only, no input body, output or key.
 const result={...readiness,newJobId:payload.id,paidCalls:0,state:'started'};
 fs.writeFileSync(marker,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 try{
  const handler=createAnalysisHandler({member,key:async(id,p)=>{if(id!==userId||p!==provider)throw Error('scope');return resolveApiKey(client,id,p);},
   rpc:async(id,operation,p)=>{if(id!==userId)throw Error('scope');return client.rpc('bnc_analysis_dispatch',{p_user_id:id,p_operation:operation,p_payload:p});},
   generate:async(p,m,key,system,user,schema)=>{
    if(p!==provider||m!==model||result.paidCalls!==0)throw Error('scope');budget({system,user});
    result.paidCalls=1;result.state='provider_attempted';fs.writeFileSync(marker,JSON.stringify(result,null,2)+'\n');
    return generateJson(p,m,key,system,user,fetch,schema);
   },reportFailure:d=>{result.failure={stage:d.stage,reason:d.reason,...(d.httpStatus?{httpStatus:d.httpStatus}:{}),...(d.providerCode?{providerCode:d.providerCode}:{})};},
  });
  stage='analysis';
  const response=await handler(new Request('https://blog-neighbor-care.buylife.xyz/api/analysis',{method:'POST',headers:{origin:'https://blog-neighbor-care.buylife.xyz','content-type':'application/json'},body:JSON.stringify({operation:'profile',payload})}));
  const reply=await response.json();result.httpStatus=response.status;
  if(response.ok&&reply.data?.state==='succeeded'){
   const stored=await client.rpc('bnc_analysis_dispatch',{p_user_id:userId,p_operation:'get',p_payload:{id:payload.id}});
   result.persistedAndRequeried=!stored.error&&stored.data?.state==='succeeded'&&hash(stored.data.result)===hash(reply.data.result);
   result.state=result.persistedAndRequeried?'succeeded':'result_unconfirmed';
   result.quality={schemaAndExactQuotesValidated:true,sampleCount:reply.data.result?.sampleCount,provisional:reply.data.result?.provisional,requiresMemberReview:true};
  }else{result.state='unconfirmed';result.errorCode=reply.code??(reply.needKey?'MEMBER_KEY_REQUIRED':'ANALYSIS_UNAVAILABLE');}
 }catch{result.state='unconfirmed';result.stage=stage;}
 result.completedAt=new Date().toISOString();fs.writeFileSync(marker,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}catch{console.error(JSON.stringify({preflightFailed:true,stage,detailsRedacted:true,automaticRetry:false}));process.exitCode=1;}
