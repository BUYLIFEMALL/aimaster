import {createMonitorHandler} from '@/lib/neighbors/monitor';
import {analysisDependencies} from '@/lib/analysis/server';
import {createAdminClient} from '@/lib/supabase/admin';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60;
export const POST=createMonitorHandler({member:analysisDependencies.member,key:analysisDependencies.key,generate:analysisDependencies.generate,
 feedEnabled:()=>process.env.BNC_FEED_READ_ENABLED==='true'&&!!process.env.BNC_FEED_READ_POLICY_REFERENCE?.trim(),
 aiEnabled:()=>process.env.BNC_AUTO_MESSAGE_ENABLED==='true',prices:()=>process.env.BNC_AUTO_MESSAGE_PRICES,
 rpc:async(user,namespace,op,payload)=>{const names={monitor:'bnc_monitor_dispatch',post:'bnc_post_dispatch',message:'bnc_message_dispatch',analysis:'bnc_analysis_dispatch'};const {data,error}=await createAdminClient().rpc(names[namespace],{p_user_id:user,p_operation:op,p_payload:payload,...(namespace==='post'?{p_device_id:null}:{})});return {data,error};},
});
