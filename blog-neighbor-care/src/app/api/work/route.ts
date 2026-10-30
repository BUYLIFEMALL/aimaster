import { authorizeMember } from '@/lib/access';
import { createAdminClient } from '@/lib/supabase/admin';
import { createWorkHandler } from '@/lib/work-api';
import { readRequestStatuses } from '@/lib/execution/requestStatusServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = createWorkHandler({
  authorize: authorizeMember,
  execute: async (userId, operation, payload) => {
    if(['review_approve','save_execution'].includes(operation)){const {data,error}=await createAdminClient().rpc('bnc_post_dispatch',{p_user_id:userId,p_device_id:null,p_operation:operation==='review_approve'?'approve':'configure',p_payload:payload});return {data,error};}
    if(['accept_devices','grant_accept','revoke_accept','accept_list','draft_accept','approve_accept'].includes(operation)){const map:Record<string,string>={accept_devices:'devices',grant_accept:'grant',revoke_accept:'revoke',accept_list:'list',draft_accept:'draft',approve_accept:'approve'};const {data,error}=await createAdminClient().rpc('bnc_accept_dispatch',{p_user_id:userId,p_device_id:null,p_operation:map[operation],p_payload:payload});return {data,error};}
    if(['extension_devices','grant_extension','revoke_extension'].includes(operation)){
      const {data,error}=await createAdminClient().rpc('bnc_extension_permission_dispatch',{p_user_id:userId,p_operation:operation==='extension_devices'?'list':operation==='grant_extension'?'grant':'revoke',p_payload:payload});return {data,error};
    }
    if(['engagement_list','engagement_review','draft_reply','draft_return_visit'].includes(operation)){
      const op=operation==='engagement_list'?'list':operation==='engagement_review'?'review':operation==='draft_reply'?'reply':'return_visit';
      const {data,error}=await createAdminClient().rpc('bnc_engagement_dispatch',{p_user_id:userId,p_operation:op,p_payload:payload});
      return {data,error};
    }
    if(operation==='request_status')return {data:await readRequestStatuses(userId),error:null};
    if(operation==='schedule_status'||operation==='resume_schedule'){
      const {data,error}=await createAdminClient().rpc('bnc_schedule_control',{p_user_id:userId,p_operation:operation==='schedule_status'?'status':'resume',p_payload:payload});
      return {data,error};
    }
    if(operation==='schedule'||operation==='save_schedule'){
      const {data,error}=await createAdminClient().rpc('bnc_schedule_preferences_dispatch',{p_user_id:userId,p_operation:operation==='schedule'?'get':'save',p_payload:payload});
      return {data,error};
    }
    if(operation==='cancel'){
      const {data,error}=await createAdminClient().rpc('bnc_work_cancel',{p_user_id:userId,p_id:payload.id});
      return {data,error};
    }
    const { data, error } = await createAdminClient().rpc('bnc_dispatch', {
      p_user_id: userId, p_operation: operation, p_payload: payload,
    });
    return { data, error };
  },
});
