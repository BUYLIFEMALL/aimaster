import { test } from "node:test";
import assert from "node:assert/strict";
import { skipSummary } from "../src/lib/desk/skipSummary.ts";

const ok = { ok: true, note: "", sent: false };

test("사유별로 세고 많은 순으로", () => {
  const list = [
    ok,
    { ok: false, note: "수신거부", sent: false },
    { ok: false, note: "수신거부", sent: false },
    { ok: false, note: "광고 수신 미동의", sent: false },
    { ok: true, note: "", sent: true },
    { ok: false, note: "동의 2년 지남 — 다시 확인 필요", sent: false },
  ];
  assert.equal(skipSummary(list), "수신거부 2 · 광고 수신 미동의 1 · 동의 2년 지남 — 다시 확인 필요 1 · 발송 기록 있음 1");
});

test("이미 보낸 고객은 사유와 상관없이 「발송 기록 있음」으로", () => {
  assert.equal(skipSummary([{ ok: false, note: "수신거부", sent: true }]), "발송 기록 있음 1");
});

test("모두 보낼 수 있으면 빈 글", () => {
  assert.equal(skipSummary([ok, ok]), "");
  assert.equal(skipSummary([]), "");
});
