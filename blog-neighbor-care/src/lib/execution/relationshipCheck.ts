import type {RequestJob,RequestReceipt} from './requestStatus';
export type RelationshipScope={memberId:string;jobId:string;accountId:string;deviceId:string;actorId:string};
type Snapshot={accountId:string;actorId:string;neighborId:string;checkedAt:number;restriction:'none'|'login'|'captcha'|'platform';relationship:'pending'|'mutual'|'removed'|'unknown'};
export type RelationshipAdapter={inspect:(job:Readonly<RequestJob>)=>Promise<Snapshot>;assertCurrent:(job:Readonly<RequestJob>,snapshot:Readonly<Snapshot>)=>Promise<boolean>};
type Dependencies={
 authorize:(user:string)=>Promise<boolean>;connected:(scope:Readonly<RelationshipScope>)=>Promise<boolean>;
 permitted:()=>Promise<boolean>;load:(scope:Readonly<RelationshipScope>)=>Promise<{job:RequestJob;receipt:RequestReceipt}|null>;
 observe:(user:string,jobId:string,state:'pending'|'mutual'|'removed')=>Promise<unknown>;stop:(user:string)=>Promise<unknown>;
 adapter:RelationshipAdapter;now?:()=>number;
};
const uuid=(s:unknown)=>typeof s==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(s);
/** Read-only platform inspection. No apply/click method, claim, budget or arm.
 * This private entry is not available through member or reader HTTP APIs. */
export async function checkRequestedRelationship(input:RelationshipScope,d:Dependencies){
 const scope=Object.freeze({...input}),now=d.now??Date.now;
 const blocked=(reason:string)=>({status:'blocked' as const,reason,externalActions:0 as const});
 if(![scope.memberId,scope.jobId,scope.accountId,scope.deviceId].every(uuid)||!/^[a-z0-9_-]{1,50}$/.test(scope.actorId))return blocked('invalid_scope');
 const authorized=async()=>await d.authorize(scope.memberId)===true&&await d.connected(scope)===true&&await d.permitted()===true;
 try{
  if(!await authorized())return blocked('read_not_permitted');
  const bundle=await d.load(scope);if(!bundle)return blocked('request_unavailable');
  const job=Object.freeze({...bundle.job}),receipt={...bundle.receipt,proof:{...bundle.receipt.proof}};
  if(job.id!==scope.jobId||job.user_id!==scope.memberId||job.account_id!==scope.accountId||job.actor_id!==scope.actorId||
   job.kind!=='request'||job.state!=='succeeded'||Date.parse(job.expires_at)<=now()||!Number.isFinite(Date.parse(job.expires_at))||
   !Number.isSafeInteger(job.generation)||job.generation<1||receipt.job_id!==job.id||receipt.user_id!==scope.memberId||receipt.generation!==job.generation||
   !(Date.parse(receipt.expires_at)>now())||!(Date.parse(receipt.observed_at)<=now())||!(Date.parse(receipt.attempted_at)>=Date.parse(job.created_at))||
   !(Date.parse(receipt.observed_at)>=Date.parse(receipt.attempted_at))||receipt.proof.kind!=='request'||receipt.proof.state!=='pending'||
   receipt.proof.account_id!==job.account_id||receipt.proof.actor_id!==job.actor_id||receipt.proof.neighbor_id!==job.neighbor_id||receipt.proof.post_id!==job.post_id)return blocked('request_unavailable');
  const immutableJob=Object.freeze({...job});
  const snapshot=Object.freeze({...await d.adapter.inspect(immutableJob)});
  if(!await authorized())return blocked('read_authorization_changed');
  const fresh=()=>Number.isFinite(snapshot.checkedAt)&&snapshot.checkedAt<=now()&&snapshot.checkedAt>now()-30000;
  if(snapshot.accountId!==job.account_id||snapshot.actorId!==job.actor_id||snapshot.neighborId!==job.neighbor_id||!fresh())return blocked('read_context_changed');
  if(snapshot.restriction!=='none'){
   await d.stop(scope.memberId);return blocked('platform_restricted');
  }
  if(!['pending','mutual','removed'].includes(snapshot.relationship))return blocked('relationship_unknown');
  if(!await d.adapter.assertCurrent(immutableJob,snapshot)||!await authorized()||!fresh()||Date.parse(job.expires_at)<=now())return blocked('read_context_changed');
  await d.observe(scope.memberId,job.id,snapshot.relationship as 'pending'|'mutual'|'removed');
  return {status:'observed' as const,relationship:snapshot.relationship,externalActions:0 as const};
 }catch{return blocked('relationship_check_unconfirmed');}
}
