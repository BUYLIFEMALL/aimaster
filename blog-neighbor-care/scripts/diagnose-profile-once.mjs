// Default: read-only preparation. --run requires a separately approved request
// ID and consumes a durable one-attempt marker before contacting the provider.
import fs from 'node:fs';
import { generateJson, ProviderFailure } from '../src/lib/analysis/provider.ts';
import { prompt, validateResult } from '../src/lib/analysis/contracts.ts';
const originalJob='e207aead-b540-4ec5-af46-8b371dafc30c';
const root=new URL('../../',import.meta.url);
let phase='configuration';
try {
 const env={...process.env};
 for(const line of fs.readFileSync(new URL('.env.local',root),'utf8').split(/\r?\n/)){const m=line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);if(m&&!env[m[1]])env[m[1]]=m[2].replace(/^["']|["']$/g,'');}
 const url=env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/,''),service=env.SUPABASE_SECRET_KEY?.trim()||env.SUPABASE_SERVICE_ROLE_KEY;
 if(url!=='https://esgxyikcnnvmlhygjkth.supabase.co'||!service)throw Error('configuration');
 async function read(path){const response=await fetch(url+'/rest/v1/'+path,{redirect:'error',signal:AbortSignal.timeout(15000),headers:{apikey:service,authorization:'Bearer '+service}});if(!response.ok)throw Error('storage');return response.json();}
 phase='source';
 const jobs=await read(`bnc_analysis_jobs?id=eq.${originalJob}&select=user_id,kind,state,input,material_ids,expires_at`);
 const job=jobs[0];
 if(jobs.length!==1||job.kind!=='profile'||job.state!=='uncertain'||job.input.provider!=='anthropic'||job.input.model!=='claude-haiku-4-5'||job.material_ids.length!==1||Date.parse(job.expires_at)<=Date.now())throw Error('scope');
 const materials=await read(`bnc_reader_materials?user_id=eq.${encodeURIComponent(job.user_id)}&id=eq.${encodeURIComponent(job.material_ids[0])}&select=id,blog_id,post_id,title,body,expires_at`);
 if(materials.length!==1||Date.parse(materials[0].expires_at)<=Date.now())throw Error('source');
 const bundle={id:originalJob,kind:'profile',input:job.input,profile:null,expiresAt:job.expires_at,posts:materials.map(m=>({id:m.id,blogId:m.blog_id,postId:m.post_id,title:m.title,body:[...m.body].slice(0,4000).join(''),originalCharacterCount:[...m.body].length,bodyTruncated:[...m.body].length>4000,source:'member-initiated-browser-read'}))};
 const messages=prompt(bundle);
 // Byte count is a conservative token estimate with 512 tokens for framing.
 const estimatedInputTokens=Buffer.byteLength(JSON.stringify({model:'claude-haiku-4-5',max_tokens:6000,system:messages.system,messages:[{role:'user',content:messages.user}]}),'utf8')+512;
 const conservativeUsd=estimatedInputTokens/1e6+6000*5/1e6;
 if(conservativeUsd>0.05)throw Error('budget');
 const args=process.argv.slice(2),run=args.includes('--run');
 const readiness={originalJob,preparedAt:new Date().toISOString(),provider:'anthropic',model:'claude-haiku-4-5',materialCount:1,estimatedInputTokens,outputTokenLimit:6000,conservativeUsd,usdLimit:0.05,operatingWrites:0,originalStateUnchanged:true,rawBodyOrKeyPrinted:false,runRequested:run};
 if(!run){console.log(JSON.stringify(readiness));process.exit(0);}
 phase='approval';
 const approval=args[args.indexOf('--approval')+1];
 if(!args.includes('--approval')||!/^[a-f0-9-]{36}$/.test(approval??'')||approval==='bc3a34c2-007f-484b-823d-5f170a2b2b15')throw Error('new_approval_required');
 phase='key';
 const keys=await read(`user_api_keys?user_id=eq.${encodeURIComponent(job.user_id)}&provider=eq.anthropic&select=api_key`);
 if(keys.length!==1||typeof keys[0].api_key!=='string')throw Error('key');
 const key=keys[0].api_key.trim();if(!/^sk-ant-[A-Za-z0-9_-]+$/.test(key))throw Error('key');
 const marker=new URL(`scratch/blog-profile-diagnostic-${approval}.json`,root);
 const result={...readiness,approval,attempts:1,state:'started',stage:'provider'};
 fs.writeFileSync(marker,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 try {
  const output=await generateJson('anthropic','claude-haiku-4-5',key,messages.system,messages.user);
  result.stage='validation';validateResult(output,bundle);
  result.state='validated';
 }catch(error){result.state='unconfirmed';result.reason=error instanceof ProviderFailure?error.reason:result.stage==='validation'?'result_invalid':'unconfirmed';if(error instanceof ProviderFailure){result.httpStatus=error.httpStatus;result.providerCode=error.providerCode;}}
 result.completedAt=new Date().toISOString();
 fs.writeFileSync(marker,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}catch { console.error(JSON.stringify({diagnosticFailed:true,phase,detailsRedacted:true,generationRetried:false}));process.exitCode=1; }
