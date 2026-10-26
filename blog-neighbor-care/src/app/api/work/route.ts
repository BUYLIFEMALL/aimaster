import { authorizeMember } from '@/lib/access';
import { createAdminClient } from '@/lib/supabase/admin';
import { createWorkHandler } from '@/lib/work-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = createWorkHandler({
  authorize: authorizeMember,
  execute: async (userId, operation, payload) => {
    const { data, error } = await createAdminClient().rpc('bnc_dispatch', {
      p_user_id: userId, p_operation: operation, p_payload: payload,
    });
    return { data, error };
  },
});
