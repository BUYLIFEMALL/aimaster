import assert from 'node:assert/strict';
import test from 'node:test';
import { createCleanupHandler } from '../src/lib/cleanup.ts';
const token = 'local-cleanup-fixture';
const request = (authorization = `Bearer ${token}`, method = 'GET') => new Request('https://local.test/api/cron/cleanup-reader', {
  method, headers: authorization == null ? {} : { authorization },
});
const outputs = [
  { expiredRequestsRemoved: 2 }, { expiredJobsRemoved: 3 }, { expiredImportsRemoved: 4 }, { expiredPayloadsRemoved: 5 }, { expiredEvidenceRemoved: 6 },
];
function setup(overrides = {}, report) {
  const calls = [];
  const handler = createCleanupHandler({ secret: () => token, report, rpc: async (name, args) => {
    calls.push({ name, args });
    const behavior = overrides[calls.length - 1];
    if (behavior instanceof Error) throw behavior;
    return behavior ?? { data: outputs[calls.length - 1], error: null };
  } });
  return { handler, calls };
}
test('CL01 no database access for missing/wrong/multibyte credential or non-GET', async () => {
  const { handler, calls } = setup();
  for (const value of [null, '', 'Bearer invalid', `Bearer ${token.slice(0, -1)}é`, `Bearer ${token}x`]) {
    const response = await handler(request(value));
    assert.equal(response.status, 401); assert.match(response.headers.get('cache-control'), /no-store/);
  }
  assert.equal((await handler(request(undefined, 'POST'))).status, 405);
  assert.equal(calls.length, 0);
  const missingSecret = createCleanupHandler({ secret: () => undefined, rpc: () => { throw Error('must not run'); } });
  assert.equal((await missingSecret(request())).status, 401);
});
test('CL02 all datasets use server-only cleanup and expose only expected counts', async () => {
  const { handler, calls } = setup({ 0: { data: { ...outputs[0], privateBody: 'must not leak' }, error: null } });
  const response = await handler(request()), body = await response.json();
  assert.equal(response.status, 200); assert.equal(body.ok, true);
  assert.deepEqual(body.results.reader, { ok: true, data: outputs[0] });
  assert.deepEqual(calls.map(c => c.name), ['bnc_reader_dispatch', 'bnc_analysis_dispatch', 'bnc_neighbor_import_dispatch', 'bnc_work_cleanup', 'bnc_execution_result_dispatch']);
  for (const call of calls) assert.deepEqual(call.args, { p_user_id: null, p_operation: 'cleanup', p_payload: {} });
  assert.doesNotMatch(JSON.stringify(body), /privateBody|must not leak/);
});
test('CL03 first RPC failure and rejected middle RPC do not skip later cleanup', async () => {
  for (const failure of [{ data: null, error: { message: 'secret database error' } }, new Error('secret rejection')]) {
    for (const index of [0, 1, 2, 3, 4]) {
      const { handler, calls } = setup({ [index]: failure });
      const response = await handler(request()), body = await response.json();
      assert.equal(response.status, 503); assert.equal(body.ok, false); assert.equal(calls.length, 5);
      assert.equal(Object.values(body.results).filter(r => r.ok).length, 4);
      assert.doesNotMatch(JSON.stringify(body), /secret/);
    }
  }
});
test('CL04 null/malformed/negative counts cannot report cleanup success', async () => {
  for (const data of [null, {}, { expiredJobsRemoved: -1 }, { expiredJobsRemoved: '0' }, { expiredJobsRemoved: 0.5 }]) {
    const { handler, calls } = setup({ 1: { data, error: null } });
    const response = await handler(request());
    assert.equal(response.status, 503); assert.equal(calls.length, 5);
  }
});

test('CL05 authorized invocations emit one sanitized result summary; denied requests emit none', async () => {
  const reports=[];
  const {handler,calls}=setup({0:{data:{...outputs[0],privateBody:'private-body',memberId:'private-member'},error:null},2:{data:null,error:{message:'private-error'}}},summary=>reports.push(summary));
  assert.equal((await handler(request(null))).status,401);assert.equal(reports.length,0);assert.equal(calls.length,0);
  assert.equal((await handler(request())).status,503);assert.equal(reports.length,1);assert.equal(calls.length,5);
  assert.equal(reports[0].ok,false);assert.deepEqual(Object.keys(reports[0]).sort(),['ok','results']);
  assert.deepEqual(reports[0].results.reader,{ok:true,data:outputs[0]});assert.deepEqual(reports[0].results.neighbors,{ok:false});
  assert.doesNotMatch(JSON.stringify(reports),/private|local-cleanup-fixture|authorization|user_id/);
});

test('CL06 logging failure or mutation cannot repeat cleanup or change its response', async () => {
  let reports=0;
  const {handler,calls}=setup({},summary=>{reports++;summary.results.reader.ok=false;throw Error('private-log-failure');});
  const response=await handler(request()),body=await response.json();
  assert.equal(response.status,200);assert.equal(body.ok,true);assert.equal(body.results.reader.ok,true);assert.equal(reports,1);assert.equal(calls.length,5);assert.doesNotMatch(JSON.stringify(body),/private/);
});
