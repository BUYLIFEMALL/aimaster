import { test } from "node:test";
import assert from "node:assert/strict";
import { createProbe, ProbeStopped, CALL_GAP_MS } from "../src/lib/trades/floorProbe.ts";

// 가짜 시계·가짜 응답 — 실제 공공 API는 부르지 않는다
function harness(respond, { deadline = Infinity } = {}) {
  let clock = 0;
  const log = [];
  const probe = createProbe({
    key: "k",
    deadline,
    now: () => clock,
    sleep: async (ms) => {
      clock += ms;
    },
    fetcher: async (url) => {
      const u = new URL(url);
      log.push({ at: clock, bun: u.searchParams.get("bun"), page: Number(u.searchParams.get("pageNo")) });
      clock += 10;
      return respond(u);
    },
  });
  return { probe, log };
}
const ok = (total, n = Math.min(total, 100)) => ({
  ok: true,
  status: 200,
  json: async () => ({ response: { body: { totalCount: total, items: { item: Array.from({ length: n }, () => ({ flrNo: 1, area: 10 })) } } } }),
});
const status = (s) => ({ ok: false, status: s, json: async () => ({}) });

test("쪽은 하나씩 순서대로, 호출 사이 간격을 둔다", async () => {
  const { probe, log } = harness(() => ok(250));
  const lot = await probe.lot("41285", "10100", "0869", "0000");
  assert.equal(lot.items.length, 300); // 가짜 응답은 쪽마다 100줄
  assert.deepEqual(log.map((l) => l.page), [1, 2, 3]);
  for (let i = 1; i < log.length; i++) assert.ok(log[i].at - log[i - 1].at >= CALL_GAP_MS);
  assert.equal(probe.calls, 3);
});

test("3,000줄 넘는 지번은 첫 쪽만 보고 따로 센다", async () => {
  const { probe, log } = harness(() => ok(6894));
  const lot = await probe.lot("41285", "10100", "0869", "0000");
  assert.equal(lot.tooLarge, true);
  assert.equal(lot.total, 6894);
  assert.equal(log.length, 1);
});

test("같은 지번은 한 번만 읽고, 실패도 기억해 다시 부르지 않는다", async () => {
  const { probe, log } = harness(() => status(500));
  await assert.rejects(probe.lot("11680", "10100", "0837", "0011"), /HTTP 500/);
  await assert.rejects(probe.lot("11680", "10100", "0837", "0011"), /HTTP 500/);
  assert.equal(log.length, 1);
  assert.equal(probe.stopped, null); // 429가 아닌 오류는 회차를 멈추지 않는다
});

test("429는 1번만 다시 해 보고, 또 나면 회차를 멈춘다", async () => {
  const { probe, log } = harness(() => status(429));
  await assert.rejects(probe.lot("11680", "10100", "0837", "0011"), (e) => e instanceof ProbeStopped && e.reason === "rate_limited");
  assert.equal(log.length, 2);
  assert.equal(probe.stopped, "rate_limited");
  await assert.rejects(probe.lot("11590", "10200", "0408", "0000"), ProbeStopped);
  assert.equal(log.length, 2); // 멈춘 뒤에는 부르지 않는다
});

test("429 뒤 다시 해서 되면 계속 간다", async () => {
  let first = true;
  const { probe } = harness(() => {
    if (first) {
      first = false;
      return status(429);
    }
    return ok(50);
  });
  const lot = await probe.lot("26530", "10100", "0642", "0000");
  assert.equal(lot.total, 50);
  assert.equal(probe.stopped, null);
  assert.equal(probe.calls, 2);
});

test("시간 예산을 넘으면 멈춘다", async () => {
  const { probe } = harness(() => ok(2000), { deadline: 1000 });
  await assert.rejects(probe.lot("41285", "10100", "0869", "0000"), (e) => e instanceof ProbeStopped && e.reason === "time");
  assert.equal(probe.stopped, "time");
  assert.ok(probe.calls < 20);
});
