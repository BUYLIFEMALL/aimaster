import {createExtensionContextHandler} from '@/lib/neighbors/contextApi';
import {readerDependencies} from '@/lib/reader/server';
import {createAdminClient} from '@/lib/supabase/admin';
export const runtime='nodejs';export const dynamic='force-dynamic';
export const POST=createExtensionContextHandler({
 authorize:async hash=>{const d=await readerDependencies.device(hash);if(!d)return {allowed:false,status:401};const a=await readerDependencies.user(d.userId);return a.allowed?{allowed:true,userId:d.userId,deviceId:d.deviceId}:{allowed:false,status:a.status};},
 profile:()=>{try{
  const profile=JSON.parse(process.env.BNC_EXTENSION_DOM_PROFILE??'null');if(profile?.v!==1||profile.reviewed!==true||!profile.reference?.trim())return null;
  const reads=[];if(process.env.BNC_RELATION_READ_ENABLED==='true'&&process.env.BNC_RELATION_POLICY_REFERENCE?.trim())reads.push('relationship');
  if(process.env.BNC_ENGAGEMENT_READ_ENABLED==='true'&&process.env.BNC_ENGAGEMENT_READ_POLICY_REFERENCE?.trim())reads.push('incoming','return_post');return reads.length?{profile,reads}:null;
 }catch{return null;}},
 rpc:async(user,device,op,payload)=>{const {data,error}=await createAdminClient().rpc('bnc_extension_context_dispatch',{p_user_id:user,p_device_id:device,p_operation:op,p_payload:payload});return {data,error};},
});
