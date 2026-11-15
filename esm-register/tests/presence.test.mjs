// 실행: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { presenceOf, PRESENCE_WINDOW_MS } from "../src/lib/extension/presence.ts";

const NOW = Date.parse("2026-11-06T08:10:00Z");

test("확장 접속 상태: 연결 없음·최근·오래됨", () => {
  assert.equal(presenceOf([], NOW).state, "none");
  assert.equal(presenceOf(["2026-11-06T08:09:30Z"], NOW).state, "recent");
  assert.equal(presenceOf([new Date(NOW - PRESENCE_WINDOW_MS - 1000).toISOString()], NOW).state, "stale");
  assert.equal(presenceOf([null], NOW).state, "stale");
});

test("여러 연결 중 가장 최근 접속으로 판단", () => {
  const r = presenceOf(["2026-11-03T06:16:29Z", null, "2026-11-06T08:08:00Z"], NOW);
  assert.equal(r.state, "recent");
  assert.equal(r.lastSeen, "2026-11-06T08:08:00.000Z");
});
