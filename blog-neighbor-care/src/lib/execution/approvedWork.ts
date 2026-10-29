import {createHash} from 'node:crypto';

// Private orchestration only: no route, timer, browser adapter or credentials.
// The trusted host must bind these dependencies to the authenticated member and
// a permitted platform adapter. Member HTTP must never accept these operations.
type Obj=Record<string,unknown>;
export type ExecutionJob=Readonly<{
 id:string;user_id:string;account_id:string;actor_id:string;neighbor_id:string;
 post_id:string;kind:'request'|'like'|'comment'|'reply';body:string;expires_at:string;parent_comment_id?:string;
}>;
type Context={accountId:string;actorId:string;neighborId:string;postId:string;checkedAt:number;postOwnerId?:string;parentCommentId?:string;parentAuthorId?:string};
export type Observation=Context&{
 restriction:'none'|'login'|'captcha'|'platform';relationship:'none'|'unknown'|'pending'|'mutual'|'removed';
 liked:boolean|null;duplicate:boolean|null;
};
export type Effect=Context&{state:'pending'|'liked'|'commented'|'unknown';bodyHash?:string;effectId?:string};
type Permit=Readonly<{generation:number;deviceId:string;validUntil:string}>;
type Dependencies={
 authorize:(memberId:string)=>Promise<boolean>;
 permitted:(memberId:string,job:ExecutionJob)=>Promise<boolean>;
 load:(memberId:string,jobId:string)=>Promise<unknown>;
 rpc:(memberId:string,operation:string,payload:Obj)=>Promise<unknown>;
 adapter:{
  inspect:(job:ExecutionJob)=>Promise<Observation>;
  // Must check active account/tab, relationship, duplicate state and expiry.
  // apply must repeat these checks immediately before its physical click.
  assertCurrent:(job:ExecutionJob)=>Promise<boolean>;
  apply:(job:ExecutionJob,permit:Permit)=>Promise<void>;
  verify:(job:ExecutionJob)=>Promise<Effect>;
 };
 now?:()=>number;
};
export type ExecutionAdapter=Dependencies['adapter'];
type Outcome={status:'blocked'|'succeeded'|'uncertain';reason:string;externalAttempted:boolean;reportStored:boolean};
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(v);
const obj=(v:unknown):v is Obj=>!!v&&typeof v==='object'&&!Array.isArray(v);
const blog=(v:unknown):v is string=>typeof v==='string'&&/^[a-z0-9_-]{1,50}$/.test(v);
const sameJob=(j:ExecutionJob,r:Obj)=>Object.keys(j).every(k=>r[k]===j[k as keyof ExecutionJob]);
const hash=(body:string)=>createHash('sha256').update(body,'utf8').digest('hex');
const blocked=(reason:string):Outcome=>({status:'blocked',reason,externalAttempted:false,reportStored:false});

export async function executeApprovedWork(input:{memberId:string;jobId:string;deviceId:string},d:Dependencies):Promise<Outcome>{
 const now=d.now??Date.now;
 if(!uuid(input.memberId)||!uuid(input.jobId)||!uuid(input.deviceId))return blocked('invalid_identity');
 let job:ExecutionJob,claim:Obj;
 const context=(v:Context)=>v.accountId===job.account_id&&v.actorId===job.actor_id&&v.neighborId===job.neighbor_id&&v.postId===job.post_id&&
  Number.isFinite(v.checkedAt)&&v.checkedAt<=now()&&v.checkedAt>now()-30000&&
  (job.kind!=='reply'||(v.postOwnerId===job.actor_id&&v.parentCommentId===job.parent_comment_id&&v.parentAuthorId===job.neighbor_id));
 const usable=(v:Observation)=>context(v)&&v.restriction==='none'&&(
  job.kind==='request'?['none','removed'].includes(v.relationship):v.relationship==='mutual'&&
  (job.kind==='like'?v.liked===false:v.duplicate===false));
 const observe=async()=>{
  const v=await d.adapter.inspect(job);
  if(v.restriction!=='none'){
   await d.rpc(input.memberId,'configure',{enabled:false});
   throw Error('blocked');
  }
  if(!usable(v))throw Error('unverified');
  await d.rpc(input.memberId,'observe',{id:job.id,relationship:v.relationship==='none'?'unknown':v.relationship,liked:v.liked});
 };
 try{
  if(await d.authorize(input.memberId)!==true)return blocked('member_unavailable');
  const loaded=await d.load(input.memberId,input.jobId);
  if(!obj(loaded)||loaded.id!==input.jobId||loaded.user_id!==input.memberId||!uuid(loaded.account_id)||!blog(loaded.actor_id)||!blog(loaded.neighbor_id)||
   loaded.actor_id===loaded.neighbor_id||!['request','like','comment','reply'].includes(String(loaded.kind))||typeof loaded.post_id!=='string'||
   (loaded.kind==='request'?loaded.post_id!=='':!/^\d+$/.test(loaded.post_id))||typeof loaded.body!=='string'||loaded.body.length>4000||
   (loaded.kind!=='like'&&!loaded.body.trim())||(['comment','reply'].includes(String(loaded.kind))&&/https?:\/\/|www\./i.test(loaded.body))||
   (loaded.kind==='reply'&&(typeof loaded.parent_comment_id!=='string'||!/^[a-zA-Z0-9_-]{1,128}$/.test(loaded.parent_comment_id)))||
   loaded.state!=='ready'||typeof loaded.expires_at!=='string'||Date.parse(loaded.expires_at)<=now()||!Number.isFinite(Date.parse(loaded.expires_at)))return blocked('job_unavailable');
  job=Object.freeze({id:loaded.id as string,user_id:loaded.user_id as string,account_id:loaded.account_id,actor_id:loaded.actor_id,neighbor_id:loaded.neighbor_id,
   post_id:loaded.post_id,kind:loaded.kind as ExecutionJob['kind'],body:loaded.body,expires_at:loaded.expires_at,
   ...(loaded.kind==='reply'?{parent_comment_id:loaded.parent_comment_id as string}:{})});
  if(await d.permitted(input.memberId,job)!==true)return blocked('platform_unavailable');
  await observe();
  const reserved=await d.rpc(input.memberId,'claim',{id:job.id,device_id:input.deviceId});
  if(!obj(reserved)||!sameJob(job,reserved)||reserved.state!=='claimed'||reserved.device_id!==input.deviceId||!Number.isSafeInteger(reserved.generation)||Number(reserved.generation)<1)return blocked('claim_unconfirmed');
  claim=reserved;
  // Refresh account, relationship and duplicate evidence after the claim.
  await observe();
  if(await d.authorize(input.memberId)!==true||await d.permitted(input.memberId,job)!==true)return blocked('authorization_changed');
 }catch{return blocked('preparation_unconfirmed');}
 const token={id:job.id,device_id:input.deviceId,generation:claim.generation};
 let externalAttempted=false;
 const uncertain=async(reason:string):Promise<Outcome>=>{
  let reportStored=false;
  try{const r=await d.rpc(input.memberId,'result',{...token,outcome:'uncertain',verified:false});reportStored=obj(r)&&r.id===job.id&&r.state==='uncertain';}catch{/* Never retry the external operation. */}
  return {status:'uncertain',reason,externalAttempted,reportStored};
 };
 try{
  const armed=await d.rpc(input.memberId,'arm',token);
  if(!obj(armed)||!sameJob(job,armed)||armed.state!=='armed'||armed.device_id!==input.deviceId||armed.generation!==claim.generation)return uncertain('arm_unconfirmed');
  if(await d.authorize(input.memberId)!==true||await d.permitted(input.memberId,job)!==true)return uncertain('authorization_changed_after_arm');
  const permit=await d.rpc(input.memberId,'verify_permit',token);
  if(!obj(permit)||permit.valid!==true||permit.id!==job.id||typeof permit.permit_until!=='string'||!Number.isFinite(Date.parse(permit.permit_until)))return uncertain('permit_unconfirmed');
  const until=permit.permit_until;
  if(until!==armed.permit_until)return uncertain('permit_changed');
  if(await d.adapter.assertCurrent(job)!==true||Date.parse(until)<=now()||Date.parse(job.expires_at)<=now())return uncertain('context_changed_after_arm');
  const attemptedAt=now();externalAttempted=true;
  await d.adapter.apply(job,Object.freeze({generation:Number(claim.generation),deviceId:input.deviceId,validUntil:until}));
  const effect=await d.adapter.verify(job);
  const verified=context(effect)&&effect.checkedAt>=attemptedAt&&(job.kind==='request'?effect.state==='pending':job.kind==='like'?effect.state==='liked':
   effect.state==='commented'&&effect.bodyHash===hash(job.body)&&typeof effect.effectId==='string'&&/^[a-zA-Z0-9_-]{1,128}$/.test(effect.effectId));
  if(!verified)return uncertain('effect_unconfirmed');
  // A late verified success may still settle an armed/uncertain server job.
  const evidence={account_id:job.account_id,actor_id:job.actor_id,neighbor_id:job.neighbor_id,post_id:job.post_id,kind:job.kind,state:effect.state,
   effect_id:['comment','reply'].includes(job.kind)?effect.effectId:null,body_hash:['comment','reply'].includes(job.kind)?hash(job.body):null,observed_at:new Date(effect.checkedAt).toISOString(),
   ...(job.kind==='reply'?{parent_comment_id:job.parent_comment_id}:{})};
  const settled=await d.rpc(input.memberId,'result',{...token,outcome:'success',verified:true,attempted_at:new Date(attemptedAt).toISOString(),evidence});
  if(!obj(settled)||settled.id!==job.id||settled.state!=='succeeded')return {status:'uncertain',reason:'report_unconfirmed',externalAttempted,reportStored:false};
  return {status:'succeeded',reason:'effect_verified',externalAttempted,reportStored:true};
 }catch{return uncertain('execution_unconfirmed');}
}
