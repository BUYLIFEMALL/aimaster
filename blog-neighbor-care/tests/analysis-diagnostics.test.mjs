import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { createAnalysisHandler } from '../src/lib/analysis/api.ts';
import { generateJson } from '../src/lib/analysis/provider.ts';
const owner = randomUUID(), source = randomUUID();
const sensitive = 'fixture-key-and-private-response-must-not-leak';
const valid = { profile: { topics: ['가상'], interests: [], audience: '가상 독자', tone: '설명체', phrases: [], keywords: ['가상'] },
  evidence: [{ sourceId: source, quote: '가상 원문입니다.' }] };
function setup(mode, reporterThrows = false) {
  const diagnostics = [], jobs = new Map(); let fetchCalls = 0;
  const input = { id: randomUUID(), provider: 'anthropic', model: 'claude-haiku-4-5', externalAiConfirmed: true,
    materialIds: [source], preferences: { requiredTopics: [], excludedTopics: [], region: '', scale: 'any', styleSamples: [] } };
  const handler = createAnalysisHandler({
    member: async () => ({ allowed: true, userId: owner }), key: async () => sensitive,
    reportFailure: async d => { diagnostics.push(d); if (reporterThrows) throw Error(sensitive); },
    generate: (p, m, k, s, u) => generateJson(p, m, k, s, u, async () => {
      fetchCalls++;
      if (mode === 'http') return new Response(sensitive, { status: 401 });
      if (mode === 'billing') return Response.json({error:{type:'invalid_request_error',message:'Your credit balance is too low. '+sensitive}},{status:400});
      if (mode === 'rate') return new Response(sensitive,{status:429});
      if (mode === 'transport') throw Error(sensitive);
      if (mode === 'json') return new Response(sensitive);
      return Response.json({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(mode === 'validation' ? {} : valid) }] });
    }),
    rpc: async (_user, op, payload) => {
      let job = jobs.get(payload.id);
      if (op === 'prepare') { if (!job) { job = { id: payload.id, state: 'queued', input: payload.input }; jobs.set(job.id, job); } return { data: job, error: null }; }
      if (op === 'claim') { job.state = 'running'; return { data: { id: job.id, kind: 'profile', input: job.input, profile: null,
        posts: [{ id: source, blogId: 'fixture', postId: '123', title: '가상 제목', body: '가상 원문입니다.', source: 'fixture' }], expiresAt: '2026-11-01T00:00:00Z' }, error: null }; }
      if (op === 'complete' && mode === 'persist') return { data: null, error: { message: sensitive } };
      if (op === 'complete') { job.state = 'succeeded'; job.result = payload.result; }
      if (op === 'uncertain') job.state = 'uncertain';
      return { data: job, error: null };
    },
  });
  return { input, diagnostics, jobs, get calls() { return fetchCalls; }, send: () => handler(new Request('https://fixture.test/api/analysis', {
    method: 'POST', headers: { origin: 'https://fixture.test', 'content-type': 'application/json' }, body: JSON.stringify({ operation: 'profile', payload: input }),
  })) };
}
test('AD01 provider rejection, malformed response, validation and storage failures have distinct safe metadata', async () => {
  for (const [mode, stage, reason, status] of [
    ['http', 'provider', 'http_rejected', 401], ['transport', 'provider', 'transport', undefined],
    ['json', 'provider', 'response_json', undefined], ['validation', 'validation', 'result_invalid', undefined],
    ['persist', 'persist', 'storage_failed', undefined],
  ]) {
    const s = setup(mode), response = await s.send(), body = await response.json();
    assert.equal(response.status, 502); assert.equal(body.code, 'GENERATION_UNCONFIRMED');
    assert.equal(s.diagnostics.length, 1, `missing safe diagnostic for ${mode}`);
    assert.deepEqual(s.diagnostics[0], { jobId: s.input.id, kind: 'profile', provider: 'anthropic', model: 'claude-haiku-4-5', stage, reason, ...(status ? { httpStatus: status, providerCode: 'authentication_required' } : {}) });
    assert.doesNotMatch(JSON.stringify([body, s.diagnostics]), new RegExp(sensitive));
    assert.equal(body.diagnostic, undefined); assert.equal(body.httpStatus, undefined);
    assert.equal(s.jobs.get(s.input.id).state, 'uncertain');
    await s.send(); assert.equal(s.calls, 1, 'same uncertain job must not call provider again');
    assert.equal(s.diagnostics.length, 1);
  }
});
test('AD02 logging failure cannot hide uncertain state or trigger a retry; successful requests emit no failure', async () => {
  const failure = setup('http', true);
  assert.equal((await failure.send()).status, 502); assert.equal(failure.jobs.get(failure.input.id).state, 'uncertain');
  await failure.send(); assert.equal(failure.calls, 1);
  const success = setup('success'); assert.equal((await success.send()).status, 200); assert.equal(success.diagnostics.length, 0);
});
test('AD03 member sees a safe actionable rejection reason while uncertain state, privacy and one-call guard remain',async()=>{
 for(const [mode,hint] of [['billing',/API 잔액·결제/],['http',/API 키의 인증/],['rate',/사용량 한도/],['validation',/형식·근거 검사/],['persist',/저장·조회 결과/]]){
  const s=setup(mode),r=await s.send(),body=await r.json();assert.equal(r.status,502);assert.match(body.error,hint);assert.match(body.error,/과금 여부/);assert.equal(body.jobId,s.input.id);
  assert.doesNotMatch(JSON.stringify(body),new RegExp(sensitive));assert.equal(s.jobs.get(s.input.id).state,'uncertain');await s.send();assert.equal(s.calls,1);
 }
});
