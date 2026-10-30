import {createPostHandler} from '@/lib/neighbors/postApi';
import {authorizeMember} from '@/lib/access';import {createAdminClient} from '@/lib/supabase/admin';
export const runtime='nodejs';export const dynamic='force-dynamic';
export const POST=createPostHandler({member:authorizeMember,feedEnabled:()=>process.env.BNC_FEED_READ_ENABLED==='true'&&!!process.env.BNC_FEED_READ_POLICY_REFERENCE?.trim(),rpc:async(u,op,p)=>{const {data,error}=await createAdminClient().rpc('bnc_post_dispatch',{p_user_id:u,p_device_id:null,p_operation:op,p_payload:p});return {data,error};}});
