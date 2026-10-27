import { timingSafeEqual } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET, received = request.headers.get('authorization');
  const expected = secret ? `Bearer ${secret}` : '';
  if (!expected || !received || Buffer.byteLength(received) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(received), Buffer.from(expected))) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await createAdminClient().rpc('bnc_reader_dispatch', { p_user_id: null, p_operation: 'cleanup', p_payload: {} });
  if (error) return Response.json({ error: '정리 작업 실패' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  const analysis = await createAdminClient().rpc('bnc_analysis_dispatch', { p_user_id: null, p_operation: 'cleanup', p_payload: {} });
  return Response.json(analysis.error ? { error: '분석 자료 정리 작업 실패' } : { data, analysis: analysis.data },
    { status: analysis.error ? 503 : 200, headers: { 'Cache-Control': 'no-store' } });
}
