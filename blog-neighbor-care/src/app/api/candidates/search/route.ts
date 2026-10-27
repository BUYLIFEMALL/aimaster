import { createSearchHandler } from '../../../../lib/search/api';
import { getUserApiKeys } from '../../../../lib/search/memberNaverKeys';
import { authorizeMember } from '../../../../lib/access';
import { createAdminClient } from '../../../../lib/supabase/admin';
import type { AnalysisJob } from '../../../../lib/analysis/client';
export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';
export const POST = createSearchHandler({
  member: authorizeMember,
  profile: async (userId, id) => { const { data, error } = await createAdminClient().rpc('bnc_analysis_dispatch', { p_user_id: userId, p_operation: 'get', p_payload: { id } }); if (error) { if (String(error.message).includes('BNC_ANALYSIS_NOT_FOUND')) return null; throw new Error('Profile unavailable'); } return data as AnalysisJob; },
  keys: async userId => { const keys = await getUserApiKeys(userId, ['naver_client_id', 'naver_client_secret']); return keys.naver_client_id && keys.naver_client_secret ? { clientId: keys.naver_client_id, clientSecret: keys.naver_client_secret } : null; },
  fetch: (...args) => fetch(...args),
});
export const GET = () => new Response(null, { status: 405, headers: { Allow: 'POST' } });
