import 'server-only';
import {authorizeProgramUser} from '../access';
import {createAdminClient} from '../supabase/admin';
import {buildRequestStatuses,type RequestJob,type RequestReceipt} from './requestStatus';
import {checkRequestedRelationship,type RelationshipScope,type RelationshipAdapter} from './relationshipCheck';

export async function readRequestStatuses(userId:string){
 const access=await authorizeProgramUser(userId);if(!access.allowed||access.userId!==userId)throw Error('Request status unavailable');
 const client=createAdminClient(),time=new Date().toISOString();
 const jobs=await client.from('bnc_jobs').select('id,user_id,account_id,actor_id,neighbor_id,post_id,kind,state,generation,created_at,expires_at')
  .eq('user_id',userId).eq('kind','request').gt('expires_at',time).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(50);
 if(jobs.error)throw Error('Request status unavailable');
 const rows=(jobs.data??[]) as RequestJob[];
 if(!rows.length)return {requests:[],externalActions:0};
 const accountIds=[...new Set(rows.map(j=>j.account_id))],neighborIds=[...new Set(rows.map(j=>j.neighbor_id))];
 const [accounts,relations,receipts]=await Promise.all([
  client.from('member_platform_accounts').select('id,user_id,platform,external_id,needs_reconnect').eq('user_id',userId).in('id',accountIds).limit(50),
  client.from('bnc_neighbors').select('user_id,account_id,neighbor_id,state,verified_at').eq('user_id',userId).in('account_id',accountIds).in('neighbor_id',neighborIds).limit(2500),
  client.from('bnc_execution_evidence').select('user_id,job_id,generation,observed_at,attempted_at,expires_at,proof').eq('user_id',userId).in('job_id',rows.map(j=>j.id)).gt('expires_at',time).limit(50),
 ]);
 if([accounts,relations,receipts].some(r=>r.error))throw Error('Request status unavailable');
 return {requests:buildRequestStatuses(userId,rows,relations.data??[],receipts.data??[],accounts.data??[]),externalActions:0};
}

// No public route invokes this reader. Default OFF; enabling requires a specific
// permitted relationship-reading method and the corresponding physical adapter.
export function checkServerRequestedRelationship(scope:RelationshipScope,adapter:RelationshipAdapter){
 const client=createAdminClient();
 return checkRequestedRelationship(scope,{
  authorize:async user=>{const a=await authorizeProgramUser(user);return a.allowed&&a.userId===user;},
  permitted:async()=>process.env.BNC_RELATION_READ_ENABLED==='true'&&!!process.env.BNC_RELATION_POLICY_REFERENCE?.trim(),
  connected:async s=>{
   const [device,account]=await Promise.all([
    client.from('bnc_reader_devices').select('id').eq('id',s.deviceId).eq('user_id',s.memberId).eq('account_id',s.accountId).eq('blog_id',s.actorId).is('revoked_at',null).gt('expires_at',new Date().toISOString()).maybeSingle(),
    client.from('member_platform_accounts').select('id').eq('id',s.accountId).eq('user_id',s.memberId).eq('platform','naver_blog').eq('external_id',s.actorId).eq('needs_reconnect',false).maybeSingle(),
   ]);return !device.error&&!account.error&&!!device.data&&!!account.data;
  },
  load:async s=>{
   const j=await client.from('bnc_jobs').select('id,user_id,account_id,actor_id,neighbor_id,post_id,kind,state,generation,created_at,expires_at').eq('id',s.jobId).eq('user_id',s.memberId).maybeSingle();
   if(j.error||!j.data)return null;
   const r=await client.from('bnc_execution_evidence').select('user_id,job_id,generation,observed_at,attempted_at,expires_at,proof').eq('job_id',j.data.id).eq('user_id',s.memberId).eq('generation',j.data.generation).maybeSingle();
   return !r.error&&r.data?{job:j.data as RequestJob,receipt:r.data as RequestReceipt}:null;
  },
  observe:async(user,id,state)=>{const r=await client.rpc('bnc_dispatch',{p_user_id:user,p_operation:'observe',p_payload:{id,relationship:state,liked:null}});if(r.error||r.data?.id!==id)throw Error('Observation unavailable');return r.data;},
  stop:async user=>{const r=await client.rpc('bnc_dispatch',{p_user_id:user,p_operation:'configure',p_payload:{enabled:false}});if(r.error)throw Error('Stop unavailable');return r.data;},
  adapter,
 });
}
