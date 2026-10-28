import 'server-only';
import {authorizeProgramUser} from '../access';
import {createAdminClient} from '../supabase/admin';
import {runTicketedWork,type ExecutionHostStore} from './trustedHost';
import type {ExecutionAdapter} from './approvedWork';

// Not registered as an HTTP endpoint. A trusted platform worker must supply the
// adapter; missing secret, policy reference or live gate denies execution.
export function runServerWork(ticket:string,adapter:ExecutionAdapter){
 let cached:ReturnType<typeof createAdminClient>|undefined;
 const client=()=>cached??=createAdminClient();
 const store:ExecutionHostStore={
  member:authorizeProgramUser,
  connected:async b=>{
   const [device,account]=await Promise.all([
    client().from('bnc_reader_devices').select('id').eq('id',b.deviceId).eq('user_id',b.memberId).eq('account_id',b.accountId).eq('blog_id',b.actorId).is('revoked_at',null).gt('expires_at',new Date().toISOString()).maybeSingle(),
    client().from('member_platform_accounts').select('id').eq('id',b.accountId).eq('user_id',b.memberId).eq('platform','naver_blog').eq('external_id',b.actorId).eq('needs_reconnect',false).maybeSingle(),
   ]);return !device.error&&!account.error&&!!device.data&&!!account.data;
  },
  load:async(user,id)=>{const r=await client().from('bnc_jobs').select('*').eq('id',id).eq('user_id',user).maybeSingle();if(r.error)throw Error('Worker job unavailable');return r.data;},
  permitted:async job=>{
   const reference=({request:process.env.BNC_REQUEST_POLICY_REFERENCE,like:process.env.BNC_LIKE_POLICY_REFERENCE,comment:process.env.BNC_COMMENT_POLICY_REFERENCE})[job.kind];
   if(!reference?.trim())return false;
   const r=await client().from('bnc_runtime').select('live_allowed,policy_reference').eq('singleton',true).maybeSingle();
   return !r.error&&r.data?.live_allowed===true&&!!r.data.policy_reference?.trim();
  },
  rpc:async(user,op,p)=>{const r=await client().rpc('bnc_dispatch',{p_user_id:user,p_operation:op,p_payload:p});if(r.error)throw Error('Worker operation unavailable');return r.data;},
  result:async(user,p)=>{const r=await client().rpc('bnc_execution_result_dispatch',{p_user_id:user,p_operation:'result',p_payload:p});if(r.error)throw Error('Worker result unavailable');return r.data;},
 };
 return runTicketedWork(ticket,{secret:()=>process.env.BNC_WORKER_SECRET,store,adapter});
}
