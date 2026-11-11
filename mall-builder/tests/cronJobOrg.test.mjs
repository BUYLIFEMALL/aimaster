// 실행: node --test tests/   — cron-job.org는 실제로 부르지 않고 가짜 응답으로 확인
import { test } from "node:test";
import assert from "node:assert/strict";
import { findJob, jobBody, setJobEnabled, upsertJob } from "../src/lib/cronJobOrg.ts";

const URL_A = "https://dev-mall-builder.vercel.app/api/cron/deposit-expire?store=a";

function fakeFetch(jobs, status = 200) {
  const calls = [];
  const f = async (url, init) => {
    calls.push({ url, method: init.method, body: init.body ? JSON.parse(init.body) : undefined, auth: init.headers.Authorization });
    if (status !== 200) return new Response("", { status });
    if (init.method === "GET") return new Response(JSON.stringify({ jobs }));
    if (init.method === "PUT") return new Response(JSON.stringify({ jobId: 77 }));
    return new Response("");
  };
  return { f, calls };
}

test("작업이 없으면 새로 만들고, 머리글엔 몰 토큰·10분 주기", async () => {
  const { f, calls } = fakeFetch([]);
  assert.equal(await upsertJob("key1", URL_A, "mbd_tok", f), 77);
  assert.deepEqual(calls.map((c) => c.method), ["GET", "PUT"]);
  assert.equal(calls[0].auth, "Bearer key1");
  const job = calls[1].body.job;
  assert.equal(job.url, URL_A);
  assert.equal(job.enabled, true);
  assert.deepEqual(job.schedule.minutes, [0, 10, 20, 30, 40, 50]);
  assert.equal(job.extendedData.headers.Authorization, "Bearer mbd_tok");
});

test("같은 주소 작업이 있으면 덮어쓴다(중복 생성 안 함)", async () => {
  const { f, calls } = fakeFetch([{ jobId: 5, url: URL_A, enabled: false }]);
  assert.equal(await upsertJob("key1", URL_A, "mbd_new", f), 5);
  assert.deepEqual(calls.map((c) => `${c.method} ${c.url.replace("https://api.cron-job.org", "")}`), ["GET /jobs", "PATCH /jobs/5"]);
});

test("켜기/끄기: 상태가 같으면 다시 부르지 않음, 작업 없으면 null", async () => {
  let t = fakeFetch([{ jobId: 5, url: URL_A, enabled: true }]);
  assert.equal(await setJobEnabled("k", URL_A, true, t.f), 5);
  assert.equal(t.calls.length, 1);
  t = fakeFetch([{ jobId: 5, url: URL_A, enabled: true }]);
  assert.equal(await setJobEnabled("k", URL_A, false, t.f), 5);
  assert.deepEqual(t.calls[1].body, { job: { enabled: false } });
  t = fakeFetch([]);
  assert.equal(await setJobEnabled("k", URL_A, false, t.f), null);
});

test("키가 틀리면 알아볼 수 있는 한국어 오류", async () => {
  const { f } = fakeFetch([], 401);
  await assert.rejects(findJob("bad", URL_A, f), /API 키가 올바르지 않습니다/);
  const t = fakeFetch([], 429);
  await assert.rejects(findJob("k", URL_A, t.f), /하루 호출 한도/);
});

test("주문 알림이 켜지면 1분마다(minutes [-1])", async () => {
  const { f, calls } = fakeFetch([]);
  await upsertJob("key1", URL_A, "mbd_tok", f, [-1]);
  assert.deepEqual(calls[1].body.job.schedule.minutes, [-1]);
});

test("작업 내용에 사이트 비밀값이 들어가지 않음", () => {
  const body = JSON.stringify(jobBody(URL_A, "mbd_x", true));
  assert.ok(!/CRON_SECRET|service_role|SUPABASE/i.test(body));
});
