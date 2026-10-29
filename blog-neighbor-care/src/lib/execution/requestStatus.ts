export type RequestJob={id:string;user_id:string;account_id:string;actor_id:string;neighbor_id:string;post_id:string;kind:string;state:string;generation:number;created_at:string;expires_at:string};
export type RelationshipRow={user_id:string;account_id:string;neighbor_id:string;state:string;verified_at:string};
export type RequestReceipt={user_id:string;job_id:string;generation:number;observed_at:string;attempted_at:string;expires_at:string;proof:Record<string,unknown>};
export type RequestAccount={id:string;user_id:string;platform:string;external_id:string;needs_reconnect:boolean};
export type RequestStatus={jobId:string;state:'not_requested'|'pending'|'accepted'|'removed'|'unknown';requestedAt:string|null;checkedAt:string|null;cancellationSuggested:boolean};
const DAY=86400000;
export function freshRequestObservation(value:string|null,now:number):boolean{
 const time=value?Date.parse(value):NaN;return Number.isFinite(time)&&Number.isFinite(now)&&time<=now&&time>now-300000;
}
/** Saved records only. Imported directory labels and search/RSS results cannot
 * substitute for a request receipt or current same-account relationship check. */
export function buildRequestStatuses(userId:string,jobs:RequestJob[],relations:RelationshipRow[],receipts:RequestReceipt[],accounts:RequestAccount[],now=Date.now()):RequestStatus[]{
 if(!Number.isFinite(now)||jobs.length>50||relations.length>2500||receipts.length>50||accounts.length>50)throw Error('Request status bounds required');
 return jobs.filter(j=>j.user_id===userId&&j.kind==='request'&&Date.parse(j.expires_at)>now).map(j=>{
  const base:RequestStatus={jobId:j.id,state:'unknown',requestedAt:null,checkedAt:null,cancellationSuggested:false};
  if(['draft','ready','claimed','failed_no_effect','skipped'].includes(j.state))return {...base,state:'not_requested'};
  if(j.state!=='succeeded'||!Number.isSafeInteger(j.generation)||j.generation<1)return base;
  const account=accounts.filter(a=>a.id===j.account_id&&a.user_id===userId&&a.platform==='naver_blog'&&a.external_id===j.actor_id&&!a.needs_reconnect);
  const receipt=receipts.filter(r=>r.user_id===userId&&r.job_id===j.id&&r.generation===j.generation&&Date.parse(r.expires_at)>now&&
   Date.parse(r.attempted_at)>=Date.parse(j.created_at)&&Date.parse(r.observed_at)>=Date.parse(r.attempted_at)&&Date.parse(r.observed_at)<=now&&
   r.proof.account_id===j.account_id&&r.proof.actor_id===j.actor_id&&r.proof.neighbor_id===j.neighbor_id&&r.proof.post_id===j.post_id&&r.proof.kind==='request'&&r.proof.state==='pending');
  if(account.length!==1||receipt.length!==1)return base;
  base.requestedAt=receipt[0].observed_at;
  const observed=relations.filter(r=>r.user_id===userId&&r.account_id===j.account_id&&r.neighbor_id===j.neighbor_id&&freshRequestObservation(r.verified_at,now));
  if(observed.length!==1||Date.parse(observed[0].verified_at)<Date.parse(base.requestedAt))return base;
  const relation=observed[0];base.checkedAt=relation.verified_at;
  base.state=relation.state==='mutual'?'accepted':relation.state==='pending'?'pending':relation.state==='removed'?'removed':'unknown';
  base.cancellationSuggested=base.state==='pending'&&now-Date.parse(base.requestedAt)>=7*DAY;
  return base;
 });
}
