import { authorizeMember } from '@/lib/access';
import { createAdminClient } from '@/lib/supabase/admin';
import { createWorkHandler } from '@/lib/work-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = createWorkHandler({
  authorize: authorizeMember,
  execute: async (userId, operation, payload) => {
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
