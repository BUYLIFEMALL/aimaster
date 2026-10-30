import { timingSafeEqual } from 'node:crypto';

const steps = [
  { name: 'messages', rpc: 'bnc_message_dispatch', count: 'expiredMessagesRemoved' },
  { name: 'reader', rpc: 'bnc_reader_dispatch', count: 'expiredRequestsRemoved' },
  { name: 'analysis', rpc: 'bnc_analysis_dispatch', count: 'expiredJobsRemoved' },
  { name: 'neighbors', rpc: 'bnc_neighbor_import_dispatch', count: 'expiredImportsRemoved' },
  { name: 'work', rpc: 'bnc_work_cleanup', count: 'expiredPayloadsRemoved' },
  { name: 'execution', rpc: 'bnc_execution_result_dispatch', count: 'expiredEvidenceRemoved' },
  { name: 'engagement', rpc: 'bnc_engagement_cleanup', count: 'expiredEngagementsRemoved' },
  { name: 'context', rpc: 'bnc_extension_context_cleanup', count: 'expiredContextRecordsRemoved' },
  { name: 'extension', rpc: 'bnc_extension_execution_cleanup', count: 'expiredExtensionRecordsRemoved' },
  { name: 'accept', rpc: 'bnc_accept_cleanup', count: 'expiredAcceptRecordsRemoved' },
  { name: 'posts', rpc: 'bnc_post_cleanup', count: 'expiredPostTargetsRemoved' },
  { name: 'monitor', rpc: 'bnc_monitor_dispatch', count: 'expiredMonitorRecordsRemoved' },
] as const;
type CleanupRpc = (name: string, args: { p_user_id: null; p_operation: 'cleanup'; p_payload: Record<string, never> }) =>
  PromiseLike<{ data: unknown; error: unknown }>;
type CleanupResult = { ok: boolean; data?: Record<string, number> };
type CleanupSummary = { ok: boolean; results: Record<string, CleanupResult> };
type Dependencies = { secret: () => string | undefined; rpc: CleanupRpc; report?: (summary: CleanupSummary) => void | Promise<void> };
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
    const results: Record<string, CleanupResult> = {};
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
    // Log only the whitelisted summary after authenticated cleanup. A reporting
    // failure must not change the outcome or repeat any cleanup transaction.
    try { await deps.report?.(structuredClone({ ok, results })); } catch { /* No retry. */ }
    return reply({ ok, results, ...(ok ? {} : { error: '일부 자료 정리에 실패했습니다.' }) }, ok ? 200 : 503);
  };
}
