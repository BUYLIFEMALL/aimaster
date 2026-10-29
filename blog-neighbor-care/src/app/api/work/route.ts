import { authorizeMember } from '@/lib/access';
import { createAdminClient } from '@/lib/supabase/admin';
import { createWorkHandler } from '@/lib/work-api';
import { readRequestStatuses } from '@/lib/execution/requestStatusServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = createWorkHandler({
  authorize: authorizeMember,
  execute: async (userId, operation, payload) => {
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
