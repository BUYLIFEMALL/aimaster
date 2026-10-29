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
 rpc:async(user,device,operation,payload)=>{const {data,error}=await createAdminClient().rpc('bnc_extension_execute',{p_user_id:user,p_device_id:device,p_operation:operation,p_payload:payload});return {data,error};},
});
