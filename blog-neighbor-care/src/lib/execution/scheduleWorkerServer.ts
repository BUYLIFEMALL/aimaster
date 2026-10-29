import 'server-only';
import {authorizeProgramUser} from '../access';
import {createAdminClient} from '../supabase/admin';
import {createScheduleWorker,type ScheduleWorkerBinding} from './scheduleWorker';
import {runServerScheduledWork} from './scheduledServer';
import type {ExecutionAdapter} from './approvedWork';
import {jobMatchesBrowserUrl} from './nativeBrowser';

// Trusted long-lived worker hosts only. Not called from any route, member UI,
// cron or extension yet. No adapter/secret/policy/live gate means no actions.
export function createServerScheduleWorker(binding:ScheduleWorkerBinding,adapter:ExecutionAdapter,browserUrl?:string){
 return createScheduleWorker(binding,{
  secret:()=>process.env.BNC_WORKER_SECRET,
  context:async b=>{
   const access=await authorizeProgramUser(b.memberId);
   if(!access.allowed)return {memberId:'',allowed:false,connected:false,enabled:false,liveAllowed:false,settingsRevision:0,preferenceRevision:0,policyKinds:[]};
   const client=createAdminClient();
   const [settings,prefs,runtime,device,account]=await Promise.all([
    client.from('bnc_settings').select('enabled,revision').eq('user_id',b.memberId).maybeSingle(),
    client.from('bnc_schedule_preferences').select('revision').eq('user_id',b.memberId).maybeSingle(),
    client.from('bnc_runtime').select('live_allowed,policy_reference').eq('singleton',true).maybeSingle(),
    client.from('bnc_reader_devices').select('id').eq('id',b.deviceId).eq('user_id',b.memberId).eq('account_id',b.accountId).eq('blog_id',b.actorId).is('revoked_at',null).gt('expires_at',new Date().toISOString()).maybeSingle(),
    client.from('member_platform_accounts').select('id').eq('id',b.accountId).eq('user_id',b.memberId).eq('platform','naver_blog').eq('external_id',b.actorId).eq('needs_reconnect',false).maybeSingle(),
   ]);
   if([settings,prefs,runtime,device,account].some(r=>r.error))throw Error('Worker context unavailable');
   const references={request:process.env.BNC_REQUEST_POLICY_REFERENCE,like:process.env.BNC_LIKE_POLICY_REFERENCE,comment:process.env.BNC_COMMENT_POLICY_REFERENCE,reply:process.env.BNC_REPLY_POLICY_REFERENCE};
   return {memberId:access.allowed?access.userId:'',allowed:access.allowed,connected:!!device.data&&!!account.data,
    enabled:settings.data?.enabled===true,liveAllowed:runtime.data?.live_allowed===true&&!!runtime.data?.policy_reference?.trim(),
    settingsRevision:settings.data?.revision??0,preferenceRevision:prefs.data?.revision??0,
    policyKinds:Object.entries(references).filter(([,value])=>!!value?.trim()).map(([kind])=>kind)};
  },
  jobs:async(b,revision,kinds)=>{
   let query=createAdminClient().from('bnc_jobs').select('id,user_id,account_id,actor_id,neighbor_id,post_id,state,approval_revision,approval_hash,kind,body,expires_at,generation')
    .eq('user_id',b.memberId).eq('account_id',b.accountId).eq('actor_id',b.actorId).eq('state','ready').eq('approval_revision',revision)
    .in('kind',[...kinds]).gt('expires_at',new Date().toISOString());
   if(browserUrl){
    const u=new URL(browserUrl),m=/^\/([a-z0-9_-]{1,50})\/(\d{1,30})\/?$/.exec(u.pathname);
    if(u.pathname==='/BuddyAddForm.naver')query=query.eq('kind','request').eq('neighbor_id',u.searchParams.get('blogId')??'');
    else{
     const owner=m?.[1]??u.searchParams.get('blogId'),post=m?.[2]??u.searchParams.get('logNo');
     if(!owner||!post)throw Error('Worker target unavailable');query=query.eq('post_id',post);
     query=owner===b.actorId?query.eq('kind','reply'):query.in('kind',['like','comment']).eq('neighbor_id',owner);
    }
   }
   const r=await query.order('created_at',{ascending:true}).order('id',{ascending:true}).limit(10);
   if(r.error)throw Error('Worker queue unavailable');return (r.data??[]).filter(j=>!browserUrl||jobMatchesBrowserUrl(j,browserUrl));
  },
  dispatch:(ticket,revisions,signal)=>runServerScheduledWork(ticket,revisions,{
   inspect:async job=>{if(signal.aborted)throw Error('Worker stopped');return adapter.inspect(job);},
   assertCurrent:async job=>!signal.aborted&&await adapter.assertCurrent(job),
   apply:async(job,permit)=>{if(signal.aborted)throw Error('Worker stopped');await adapter.apply(job,permit);},
   // A completed action may still settle after cancellation, without repeating it.
   verify:job=>adapter.verify(job),
  }),
 });
}
