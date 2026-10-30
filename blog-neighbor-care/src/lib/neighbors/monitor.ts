import {randomBytes,randomUUID} from 'node:crypto';
import {object,only,uuid,hash,bad,AnalysisInputError,type ObjectValue} from '../analysis/contracts';
import {isAnalysisSelection} from '../analysis/modelSelection';
import {prepareMessage,messagePrompt,messageSchema,validateMessage,type MessageBundle} from '../messages/contracts';
import type {AnalysisDependencies} from '../analysis/api';
import type {Provider} from '../analysis/provider';
import {fetchNeighborFeed} from './feed';

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
type D=Pick<AnalysisDependencies,'member'|'key'|'generate'>&{
 rpc:(user:string,namespace:'monitor'|'post'|'message'|'analysis',op:string,p:ObjectValue)=>Promise<{data:any;error:unknown}>;
 feedEnabled:()=>boolean;aiEnabled:()=>boolean;prices:()=>string|undefined;fetcher?:typeof fetch;
};
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'cache-control':'private, no-store','x-content-type-options':'nosniff'}});
export function createMonitorHandler(d:D){return async(req:Request)=>{
 const url=new URL(req.url);if(req.method!=='POST')return reply({error:'POST 요청이 필요합니다.'},405);
 if(req.headers.get('origin')!==`${url.protocol}//${req.headers.get('host')??url.host}`||req.headers.get('sec-fetch-site')==='cross-site')return reply({error:'프로그램에서 요청하세요.'},403);
 let userId='',work:any,runHash='',attempted=false;
 const rpc=async(ns:'monitor'|'post'|'message'|'analysis',op:string,p:ObjectValue={})=>{const r=await d.rpc(userId,ns,op,p);if(r.error||r.data==null)throw Error('store');return r.data;};
 try{
  const member=await d.member();if(!member.allowed)return reply({error:member.error},member.status);userId=member.userId;
  if(req.headers.get('content-type')?.split(';')[0]!=='application/json')bad();
  const stream=req.body?.getReader();if(!stream)bad();const chunks=[];let length=0;
  for(;;){const r=await stream!.read();if(r.done)break;length+=r.value.length;if(length>16384){await stream!.cancel();return reply({error:'설정이 너무 큽니다.'},413);}chunks.push(r.value);}
  const v=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!object(v)||!only(v,['operation','payload'])||!object(v.payload))bad();const op=v.operation,p=v.payload;
  if(op==='catalog'||op==='status'){
   if(!only(p,[]))bad();const data=await rpc('monitor','status');
   return reply({data,...(op==='catalog'?{directory:await rpc('post','directory'),choices:await rpc('message','list')}:{}),quotes:monitorQuotes(d.prices()),feedReady:d.feedEnabled(),aiReady:d.aiEnabled()});
  }
  if(op==='start'){
   if(!only(p,['accountId','neighbors','aiEnabled','profileId','profileRevision','provider','model','quoteHash','budgetMicros','maxAi','expectedRevision','feedConsent','aiConsent','confirmed'])||!uuid(p.accountId)||!Array.isArray(p.neighbors)||p.neighbors.length<1||p.neighbors.length>50||p.neighbors.some((n:unknown)=>typeof n!=='string'||!/^[a-z0-9_-]{1,50}$/.test(n))||new Set(p.neighbors).size!==p.neighbors.length||typeof p.aiEnabled!=='boolean'||p.feedConsent!==true||p.confirmed!==true||!Number.isSafeInteger(p.expectedRevision)||Number(p.expectedRevision)<0||!Number.isSafeInteger(p.budgetMicros)||Number(p.budgetMicros)<0||Number(p.budgetMicros)>10000000||!Number.isSafeInteger(p.maxAi)||Number(p.maxAi)<0||Number(p.maxAi)>20)bad();
   if(!d.feedEnabled())return reply({error:'RSS 읽기 운영 준비가 필요합니다.'},409);
   if(p.aiEnabled){
    if(!d.aiEnabled()||!uuid(p.profileId)||!Number.isSafeInteger(p.profileRevision)||Number(p.profileRevision)<1||p.aiConsent!==true||Number(p.maxAi)<1||Number(p.budgetMicros)<1||!monitorQuotes(d.prices()).some(q=>q.hash===p.quoteHash&&q.provider===p.provider&&q.model===p.model))return reply({error:'AI 프로필·모델·유효한 단가·예산·전송 동의를 확인하세요.'},400);
   }else if(p.maxAi!==0||p.budgetMicros!==0)bad();
   return reply({data:await rpc('monitor','start',p)});
  }
  if(!['stop','acknowledge','tick'].includes(String(op))||!only(p,['sessionId',...(op==='acknowledge'?['confirmed']:[])])||!uuid(p.sessionId)||op==='acknowledge'&&p.confirmed!==true)bad();
  if(op!=='tick')return reply({data:await rpc('monitor',String(op),p)});
  if(!d.feedEnabled())return reply({error:'RSS 운영 준비가 해제되었습니다. 감시를 중단하세요.'},409);
  work=await rpc('monitor','claim',p);if(!['feed','ai'].includes(work.phase)){work=null;return reply({data:await rpc('monitor','status')});}
  const binding={sessionId:work.id,workId:work.work_id,generation:work.generation};
  await rpc('monitor','check',binding);
  if(work.phase==='feed'){
   const {posts}=await fetchNeighborFeed(work.neighbor_id,d.fetcher);
   await rpc('monitor','feed_complete',{...binding,posts:posts.map(post=>({...post,body:'',hash:hash([post.title,''])}))});
  }else{
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
  return reply({error:e instanceof AnalysisInputError?'설정·계정·동의·예산을 확인하세요.':'감시·AI 준비 결과를 확인하지 못했습니다. 자동 재요청하지 않습니다. 상태와 생성 기록을 먼저 확인하세요.'},e instanceof AnalysisInputError?400:409);
 }
};}
