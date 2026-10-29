import 'server-only';
import {authorizeProgramUser} from '../access';
import {createAdminClient} from '../supabase/admin';
import {captureIncomingComment,type EngagementScope,type IncomingComment} from './engagementIntake';

// Private reader integration; not registered with HTTP/extension/cron.
export function captureServerIncomingComment(scope:EngagementScope,adapter:{inspect:()=>Promise<IncomingComment>;assertCurrent:(s:Readonly<IncomingComment>)=>Promise<boolean>}){
 const client=createAdminClient();
 return captureIncomingComment(scope,{
  authorize:async id=>{const a=await authorizeProgramUser(id);return a.allowed&&a.userId===id;},
  permitted:async()=>process.env.BNC_ENGAGEMENT_READ_ENABLED==='true'&&!!process.env.BNC_ENGAGEMENT_READ_POLICY_REFERENCE?.trim(),
  connected:async s=>{
   const [account,device]=await Promise.all([
    client.from('member_platform_accounts').select('id').eq('id',s.accountId).eq('user_id',s.memberId).eq('external_id',s.actorId).eq('platform','naver_blog').eq('needs_reconnect',false).maybeSingle(),
    client.from('bnc_reader_devices').select('id').eq('id',s.deviceId).eq('user_id',s.memberId).eq('account_id',s.accountId).eq('blog_id',s.actorId).is('revoked_at',null).gt('expires_at',new Date().toISOString()).maybeSingle(),
   ]);return !account.error&&!device.error&&!!account.data&&!!device.data;
  },
  save:async(s,v)=>{
   const initialized=await client.rpc('bnc_dispatch',{p_user_id:s.memberId,p_operation:'settings',p_payload:{}});if(initialized.error)throw Error('Inbox unavailable');
   // Duplicate source keeps its original deadline and previously queued jobs.
   const r=await client.from('bnc_engagement_inbox').upsert({user_id:s.memberId,account_id:s.accountId,actor_id:s.actorId,neighbor_id:v.neighborId,
    own_post_id:v.ownPostId,comment_id:v.commentId,return_post_id:v.returnPostId,observed_at:new Date(v.checkedAt).toISOString(),
    expires_at:new Date(v.checkedAt+720*3600000).toISOString()},{onConflict:'user_id,account_id,own_post_id,comment_id',ignoreDuplicates:true});
   if(r.error)throw Error('Inbox unavailable');
  },
  stop:async user=>{const r=await client.rpc('bnc_dispatch',{p_user_id:user,p_operation:'configure',p_payload:{enabled:false}});if(r.error)throw Error('Stop unavailable');},adapter,
 });
}
