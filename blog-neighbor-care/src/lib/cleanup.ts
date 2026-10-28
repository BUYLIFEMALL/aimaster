import { timingSafeEqual } from 'node:crypto';

const steps = [
  { name: 'reader', rpc: 'bnc_reader_dispatch', count: 'expiredRequestsRemoved' },
  { name: 'analysis', rpc: 'bnc_analysis_dispatch', count: 'expiredJobsRemoved' },
  { name: 'neighbors', rpc: 'bnc_neighbor_import_dispatch', count: 'expiredImportsRemoved' },
] as const;
type CleanupRpc = (name: string, args: { p_user_id: null; p_operation: 'cleanup'; p_payload: Record<string, never> }) =>
  PromiseLike<{ data: unknown; error: unknown }>;
type Dependencies = { secret: () => string | undefined; rpc: CleanupRpc };
const reply = (value: unknown, status: number) => Response.json(value, {
  status, headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
});

export function createCleanupHandler(deps: Dependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== 'GET') return new Response(null, { status: 405, headers: { Allow: 'GET', 'Cache-Control': 'private, no-store' } });
    const secret = deps.secret(), received = request.headers.get('authorization');
    const expected = secret ? `Bearer ${secret}` : '';
    if (!expected || !received || Buffer.byteLength(received) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(received), Buffer.from(expected))) return reply({ error: 'Unauthorized' }, 401);

    // Each RPC is a separate transaction. A failure in one dataset must not
    // prevent the other datasets from expiring; retrying cleanup is idempotent.
    const results: Record<string, { ok: boolean; data?: Record<string, number> }> = {};
    for (const step of steps) {
      try {
        const { data, error } = await deps.rpc(step.rpc, { p_user_id: null, p_operation: 'cleanup', p_payload: {} });
        const count = data && typeof data === 'object' ? (data as Record<string, unknown>)[step.count] : undefined;
        if (error || typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) {
          results[step.name] = { ok: false };
        } else {
          // Do not echo unexpected database fields, error details or bodies.
          results[step.name] = { ok: true, data: { [step.count]: count } };
        }
      } catch {
        results[step.name] = { ok: false };
      }
    }
    const ok = Object.values(results).every(result => result.ok);
    return reply({ ok, results, ...(ok ? {} : { error: '일부 자료 정리에 실패했습니다.' }) }, ok ? 200 : 503);
  };
}
