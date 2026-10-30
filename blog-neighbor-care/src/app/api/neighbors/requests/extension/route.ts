import {createAcceptHandler} from '@/lib/neighbors/acceptApi';
import {readerDependencies} from '@/lib/reader/server';
import {createAdminClient} from '@/lib/supabase/admin';
export const runtime='nodejs';export const dynamic='force-dynamic';
export const POST=createAcceptHandler({
 authorize:async h=>{const d=await readerDependencies.device(h);if(!d)return {allowed:false,status:401};const a=await readerDependencies.user(d.userId);return a.allowed?{allowed:true,userId:d.userId,deviceId:d.deviceId}:{allowed:false,status:a.status};},
 profile:()=>{try{const p=JSON.parse(process.env.BNC_EXTENSION_DOM_PROFILE??'null');if(p?.v!==1||p.reviewed!==true||!p.reference?.trim()||!/^\/[A-Za-z0-9_-]+\.naver$/.test(p.incomingRequestPath??''))return null;return {profile:p,read:process.env.BNC_ACCEPT_READ_ENABLED==='true'&&!!process.env.BNC_ACCEPT_READ_POLICY_REFERENCE?.trim(),execute:!!process.env.BNC_ACCEPT_POLICY_REFERENCE?.trim()};}catch{return null;}},
 rpc:async(u,d,op,p)=>{const {data,error}=await createAdminClient().rpc('bnc_accept_dispatch',{p_user_id:u,p_device_id:d,p_operation:op,p_payload:p});return {data,error};},
});
