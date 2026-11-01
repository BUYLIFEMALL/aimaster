import {randomBytes,randomUUID} from 'node:crypto';
import {object,only,uuid,hash,bad,AnalysisInputError,type ObjectValue} from '../analysis/contracts';
import {isAnalysisSelection} from '../analysis/modelSelection';
import {prepareMessage,messagePrompt,messageSchema,validateMessage,type MessageBundle} from '../messages/contracts';
import type {AnalysisDependencies} from '../analysis/api';
import type {Provider} from '../analysis/provider';
import {fetchNeighborFeed} from './feed';
import {newMonitorToken,type CronClient} from './cronJob';

type Quote={provider:Provider;model:string;inputUsdPerMillion:number;outputUsdPerMillion:number;validUntil:string;reference:string;hash:string};
export function monitorQuotes(raw:string|undefined,now=Date.now()):Quote[]{
 try{const values=JSON.parse(raw??'[]');if(!Array.isArray(values)||values.length>30)return [];
  return values.filter(v=>object(v)&&only(v,['provider','model','inputUsdPerMillion','outputUsdPerMillion','validUntil','reference'])&&isAnalysisSelection(v as never)&&[v.inputUsdPerMillion,v.outputUsdPerMillion].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>0&&n<=1000)&&typeof v.validUntil==='string'&&Date.parse(v.validUntil)>now&&typeof v.reference==='string'&&v.reference.length<=500&&/^https:\/\//.test(v.reference)).map(v=>({...v,hash:hash(v)}));
 }catch{return [];}
}
export function reserveEstimate(q:Quote,prompt:{system:string;user:string}){
 const inputTokenBound=Buffer.byteLength(prompt.system+prompt.user,'utf8')+8192;
 if(inputTokenBound>100000)throw Error('input_bound');
 // Reserve a conservative estimate, not a guarantee of the provider's bill.
 return Math.ceil(inputTokenBound*q.inputUsdPerMillion+6000*q.outputUsdPerMillion);
}
type Namespace='monitor'|'post'|'message'|'analysis'|'scheduler';
export type MonitorRpc=(ns:Namespace,op:string,p?:ObjectValue)=>Promise<any>;
type D=Pick<AnalysisDependencies,'member'|'key'|'generate'>&{
 rpc:(user:string,namespace:Namespace,op:string,p:ObjectValue)=>Promise<{data:any;error:unknown}>;
 feedEnabled:()=>boolean;aiEnabled:()=>boolean;prices:()=>string|undefined;fetcher?:typeof fetch;
 cron:{key:(user:string)=>Promise<string|null>;saveKey:(user:string,key:string)=>Promise<void>;deleteKey:(user:string)=>Promise<void>;client:CronClient};
};
// One publisher read. A failed read only skips that neighbor until it is due again; it never stops the session.
export async function runFeedWork(rpc:MonitorRpc,work:any,fetcher?:typeof fetch):Promise<{ok:boolean;status?:number}>{
 const binding={sessionId:work.id,workId:work.work_id,generation:work.generation};
 await rpc('monitor','check',binding);
 let posts;
 try{posts=(await fetchNeighborFeed(work.neighbor_id,fetcher)).posts;}
 catch(e){await rpc('monitor','fail',binding);return {ok:false,status:(e as {status?:number}).status};}
 await rpc('monitor','feed_complete',{...binding,posts:posts.map(post=>({...post,body:'',hash:hash([post.title,''])}))});
 return {ok:true};
}
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'cache-control':'private, no-store','x-content-type-options':'nosniff'}});
export function createMonitorHandler(d:D){return async(req:Request)=>{
 const url=new URL(req.url);if(req.method!=='POST')return reply({error:'POST 요청이 필요합니다.'},405);
 if(req.headers.get('origin')!==`${url.protocol}//${req.headers.get('host')??url.host}`||req.headers.get('sec-fetch-site')==='cross-site')return reply({error:'프로그램에서 요청하세요.'},403);
 let userId='',work:any,runHash='',attempted=false;
 const rpc:MonitorRpc=async(ns,op,p={})=>{const r=await d.rpc(userId,ns,op,p);if(r.error||r.data==null)throw Error('store');return r.data;};
 try{
  const member=await d.member();if(!member.allowed)return reply({error:member.error},member.status);userId=member.userId;
  if(req.headers.get('content-type')?.split(';')[0]!=='application/json')bad();
  const stream=req.body?.getReader();if(!stream)bad();const chunks=[];let length=0;
  for(;;){const r=await stream!.read();if(r.done)break;length+=r.value.length;if(length>16384){await stream!.cancel();return reply({error:'설정이 너무 큽니다.'},413);}chunks.push(r.value);}
  const v=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!object(v)||!only(v,['operation','payload'])||!object(v.payload))bad();const op=v.operation,p=v.payload;
  if(op==='catalog'||op==='status'){
   if(!only(p,[]))bad();const data=await rpc('monitor','status');
   return reply({data,scheduler:await rpc('scheduler','get'),hasCronKey:!!(await d.cron.key(userId)),...(op==='catalog'?{directory:await rpc('post','directory'),choices:await rpc('message','list')}:{}),quotes:monitorQuotes(d.prices()),feedReady:d.feedEnabled(),aiReady:d.aiEnabled()});
  }
  if(op==='cron_key_save'){
   const key=typeof p.apiKey==='string'?p.apiKey.trim():'';if(!only(p,['apiKey'])||key.length<8||key.length>512||/\s/.test(key))bad();
   await d.cron.saveKey(userId,key);return reply({data:{saved:true},hasCronKey:true});
  }
  if(op==='cron_key_delete'){
   if(!only(p,[]))bad();const status=await rpc('monitor','status');
   if(status.monitor?.state==='active'&&status.monitor.background)return reply({error:'상시 감시를 먼저 중단한 뒤 키를 삭제하세요.'},409);
   await d.cron.deleteKey(userId);return reply({data:{deleted:true},hasCronKey:false});
  }
  if(op==='start'){
   if(!only(p,['accountId','neighbors','aiEnabled','profileId','profileRevision','provider','model','quoteHash','budgetMicros','maxAi','expectedRevision','feedConsent','aiConsent','confirmed','background'])||!uuid(p.accountId)||!Array.isArray(p.neighbors)||p.neighbors.length<1||p.neighbors.length>50||p.neighbors.some((n:unknown)=>typeof n!=='string'||!/^[a-z0-9_-]{1,50}$/.test(n))||new Set(p.neighbors).size!==p.neighbors.length||typeof p.aiEnabled!=='boolean'||typeof p.background!=='boolean'||p.feedConsent!==true||p.confirmed!==true||!Number.isSafeInteger(p.expectedRevision)||Number(p.expectedRevision)<0||!Number.isSafeInteger(p.budgetMicros)||Number(p.budgetMicros)<0||Number(p.budgetMicros)>10000000||!Number.isSafeInteger(p.maxAi)||Number(p.maxAi)<0||Number(p.maxAi)>20)bad();
   if(!d.feedEnabled())return reply({error:'RSS 읽기 운영 준비가 필요합니다.'},409);
   if(p.aiEnabled){
    if(!d.aiEnabled()||!uuid(p.profileId)||!Number.isSafeInteger(p.profileRevision)||Number(p.profileRevision)<1||p.aiConsent!==true||Number(p.maxAi)<1||Number(p.budgetMicros)<1||!monitorQuotes(d.prices()).some(q=>q.hash===p.quoteHash&&q.provider===p.provider&&q.model===p.model))return reply({error:'AI 프로필·모델·유효한 단가·예산·전송 동의를 확인하세요.'},400);
   }else if(p.maxAi!==0||p.budgetMicros!==0)bad();
   const cronKey=p.background?await d.cron.key(userId):null;
   if(p.background&&!cronKey)return reply({error:'탭을 닫아도 확인하려면 본인 cron-job.org API 키를 먼저 등록하세요.'},409);
   const started=await rpc('monitor','start',p);
   if(cronKey){
    // The token is stored before the job exists so the first call is never rejected. A job that cannot start leaves no running session behind.
    try{const {token,tokenHash}=newMonitorToken();await rpc('scheduler','rotate',{tokenHash});const jobId=await d.cron.client.upsert(cronKey,token);await rpc('scheduler','set',{jobId,active:true,paused:false});}
    catch(e){await rpc('monitor','stop',{sessionId:started.sessionId}).catch(()=>{});return reply({error:e instanceof Error&&e.message!=='store'?e.message:'상시 감시를 켜지 못해 시작을 취소했습니다.'},409);}
   }
   return reply({data:started});
  }
  if(op==='scheduler_pause'||op==='scheduler_resume'){
   if(!only(p,['sessionId'])||!uuid(p.sessionId))bad();const status=await rpc('monitor','status'),s=await rpc('scheduler','get'),key=await d.cron.key(userId);
   if(status.monitor?.id!==p.sessionId||status.monitor.state!=='active'||!status.monitor.background||!s.jobId||!key)return reply({error:'일시정지할 상시 감시가 없습니다. 상태를 다시 조회하세요.'},409);
   const resume=op==='scheduler_resume';
   try{await d.cron.client.setEnabled(key,s.jobId,resume);}catch(e){return reply({error:e instanceof Error?e.message:'cron-job.org 응답을 확인하지 못했습니다.'},409);}
   await rpc('scheduler','set',{active:resume,paused:!resume,lastError:null});return reply({data:{paused:!resume},scheduler:await rpc('scheduler','get')});
  }
  if(!['stop','acknowledge','tick'].includes(String(op))||!only(p,['sessionId',...(op==='acknowledge'?['confirmed']:[])])||!uuid(p.sessionId)||op==='acknowledge'&&p.confirmed!==true)bad();
  if(op==='stop'){
   const data=await rpc('monitor','stop',p),s=await rpc('scheduler','get');
   // The session is already stopped; if this switch-off fails, the next cron call finds no active session and retries it.
   if(s.active){try{const key=await d.cron.key(userId);if(key&&s.jobId)await d.cron.client.setEnabled(key,s.jobId,false);await rpc('scheduler','set',{active:false,paused:false,lastError:null});}catch{await rpc('scheduler','set',{lastError:'cron-job.org 작업을 끄지 못했습니다. 다음 호출 때 다시 시도합니다.'}).catch(()=>{});}}
   return reply({data});
  }
  if(op!=='tick')return reply({data:await rpc('monitor',String(op),p)});
  if(!d.feedEnabled())return reply({error:'RSS 운영 준비가 해제되었습니다. 감시를 중단하세요.'},409);
  work=await rpc('monitor','claim',p);if(!['feed','ai'].includes(work.phase)){work=null;return reply({data:await rpc('monitor','status')});}
  const binding={sessionId:work.id,workId:work.work_id,generation:work.generation};
  if(work.phase==='feed')await runFeedWork(rpc,work,d.fetcher);
  else{
   await rpc('monitor','check',binding);
   const quote=monitorQuotes(d.prices()).find(q=>q.hash===work.quote_hash&&q.provider===work.provider&&q.model===work.model);if(!d.aiEnabled()||!quote)throw Error('quote');
   const material=await rpc('post','material',{id:work.target_id}),profile=await rpc('analysis','get',{id:work.profile_id});
   const prepared=prepareMessage({id:work.work_id,kind:'comment',provider:work.provider,model:work.model,profileId:work.profile_id,profileRevision:work.profile_revision,accountId:work.account_id,rightsConfirmed:true,externalAiConfirmed:true,facts:[],post:{url:material.url,title:material.title,body:material.body}});
   const preview:MessageBundle={id:work.work_id,kind:'comment',input:prepared.input,profile:profile.reviewedProfile,posts:[{id:randomUUID(),title:material.title,body:material.body}],previousTexts:[],expiresAt:material.expiresAt};
   const amountMicros=reserveEstimate(quote,messagePrompt(preview)),key=(await d.key(userId,work.provider))?.trim();
   if(!key||key.length>4096||/[\r\n]/.test(key))throw Error('key');
   runHash=hash(randomBytes(32).toString('hex'));
   const bundle=await rpc('monitor','reserve_ai',{...binding,prepared,amountMicros,quoteHash:quote.hash,runHash});
   if(bundle.phase==='budget'){work=null;return reply({data:await rpc('monitor','status')});}
   const prompt=messagePrompt(bundle);if(reserveEstimate(quote,prompt)>amountMicros)throw Error('budget');
   const current=await d.member();if(!current.allowed||current.userId!==userId)throw Error('member');await rpc('monitor','check',binding);
   attempted=true;const raw=await d.generate(work.provider,work.model,key,prompt.system,prompt.user,messageSchema());
   const result=validateMessage(raw,bundle);await rpc('message','complete',{id:work.work_id,run_hash:runHash,result});await rpc('monitor','ai_complete',binding);
  }
  work=null;return reply({data:await rpc('monitor','status')});
 }catch(e){
  if(work?.work_id){if(attempted)await rpc('message','uncertain',{id:work.work_id,run_hash:runHash}).catch(()=>{});await rpc('monitor','fail',{sessionId:work.id,workId:work.work_id,generation:work.generation}).catch(()=>{});}
  const input=e instanceof AnalysisInputError&&!attempted; // After an AI call the charge may be real: never report it as a settings mistake.
  return reply({error:input?'설정·계정·동의·예산을 확인하세요.':'감시·AI 준비 결과를 확인하지 못했습니다. 자동 재요청하지 않습니다. 상태와 생성 기록을 먼저 확인하세요.'},input?400:409);
 }
};}
