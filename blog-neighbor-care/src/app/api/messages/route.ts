import {createMessageHandler} from '@/lib/messages/api';
import {analysisDependencies} from '@/lib/analysis/server';
import {createAdminClient} from '@/lib/supabase/admin';
export const runtime='nodejs';export const dynamic='force-dynamic';
export const POST=createMessageHandler({member:analysisDependencies.member,key:analysisDependencies.key,generate:analysisDependencies.generate,
 rpc:async(user,op,payload)=>{const {data,error}=await createAdminClient().rpc('bnc_message_dispatch',{p_user_id:user,p_operation:op,p_payload:payload});return {data,error};},
});
