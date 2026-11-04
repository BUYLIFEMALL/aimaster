import {createExtensionExecutionHandler} from '@/lib/execution/extensionApi';
import {readerDependencies} from '@/lib/reader/server';
import {createAdminClient} from '@/lib/supabase/admin';
export const runtime='nodejs';export const dynamic='force-dynamic';
export const POST=createExtensionExecutionHandler({
 authorize:async hash=>{const d=await readerDependencies.device(hash);if(!d)return {allowed:false,status:401};const a=await readerDependencies.user(d.userId);return a.allowed?{allowed:true,userId:d.userId,deviceId:d.deviceId}:{allowed:false,status:a.status};},
 profile:()=>{
  try{const profile=JSON.parse(process.env.BNC_EXTENSION_DOM_PROFILE??'null');
   if(profile?.v!==1||profile.reviewed!==true||typeof profile.reference!=='string'||!profile.reference.trim())return null;
   const refs={request:process.env.BNC_REQUEST_POLICY_REFERENCE,like:process.env.BNC_LIKE_POLICY_REFERENCE,comment:process.env.BNC_COMMENT_POLICY_REFERENCE,reply:process.env.BNC_REPLY_POLICY_REFERENCE};
   const kinds=Object.entries(refs).filter(([,ref])=>!!ref?.trim()).map(([kind])=>kind);return kinds.length?{profile,kinds}:null;
  }catch{return null;}
 },
 rpc:async(user,device,operation,payload)=>{
  const db=createAdminClient();
  if(operation==='autopilot_status'||operation==='autopilot_pause'){
   if(operation==='autopilot_pause'){const r=await db.rpc('bnc_autopilot_dispatch',{p_user_id:user,p_operation:'pause',p_payload:{}});if(r.error)return {data:null,error:r.error};}
   const {data,error}=await db.rpc('bnc_autopilot_dispatch',{p_user_id:user,p_operation:'get',p_payload:{}});return {data,error};
  }
  if(operation==='next'){
   // v1.18 C-2: 다음 대상을 묻기 전에 자동 운영 준비(새 글 공감·통과한 댓글 초안 → 작업·승인). 일시정지면 실행 없이 기다린다.
   const prep=await db.rpc('bnc_autopilot_prepare',{p_user_id:user,p_device_id:device});
   if(!prep.error&&prep.data&&(prep.data as {paused?:boolean}).paused)return {data:{phase:'waiting',reason:'paused',nextDueAt:new Date(Date.now()+5*60000).toISOString()},error:null};
  }
  const {data,error}=await db.rpc(['next','traversal_offer'].includes(operation)?'bnc_post_dispatch':'bnc_extension_execute',{p_user_id:user,p_device_id:device,p_operation:operation==='traversal_offer'?'offer':operation,p_payload:payload});return {data,error};},
});
