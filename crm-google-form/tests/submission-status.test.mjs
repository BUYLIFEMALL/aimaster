// CRM-20261118-03 — 접수 상태 분류 순수 함수 시험(DB·네트워크 0, 새 패키지 0).
// 실행: node --test crm-google-form/tests/submission-status.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SUBMISSION_STATUSES,
  REVIEW_STATUSES,
  STATUS_FILTERS,
  statusMeta,
  countSubmissionStatuses,
  matchesStatusFilter,
  showsErrorMessage,
  REVIEW_STATUS_NOT_IN,
} from "../lib/crm/submissionStatus.ts";

const rows = (list) => list.map((status, i) => ({ id: String(i), status }));

test("상태 6개: 기존 3개 + 새 3개, 순서 고정", () => {
  assert.deepEqual(SUBMISSION_STATUSES, ["received", "notified", "failed", "dispatching", "partial", "unknown"]);
  assert.deepEqual(REVIEW_STATUSES, ["dispatching", "partial", "unknown"]);
});

test("기존 3개 라벨·색은 그대로(회귀 0)", () => {
  assert.deepEqual(statusMeta("received"), { label: "접수됨", chip: "mx-chip", review: false });
  assert.deepEqual(statusMeta("notified"), { label: "발송 완료", chip: "mx-chip-green", review: false });
  assert.deepEqual(statusMeta("failed"), { label: "발송 실패", chip: "mx-chip-red", review: false });
});

test("새 3개: 결과 미확정·확인 필요 라벨, 자동 재시도 안내 0", () => {
  const d = statusMeta("dispatching");
  const p = statusMeta("partial");
  const u = statusMeta("unknown");
  assert.equal(d.label, "발송 처리 중");
  assert.equal(p.label, "일부만 전송");
  assert.equal(u.label, "결과 확인 필요");
  for (const m of [d, p, u]) {
    assert.equal(m.review, true);
    assert.equal(m.chip, "mx-chip-amber");
    assert.ok(m.hint && m.hint.length > 0);
    assert.doesNotMatch(m.hint, /자동으로 다시 보냅|재시도합니다|다시 발송합니다/);
  }
  assert.match(u.hint, /자동으로 다시 보내지 않/);
});

test("목록 밖 값도 숨기지 않고 확인 필요로 분류(누락 방지)", () => {
  const m = statusMeta("sent");
  assert.equal(m.review, true);
  assert.equal(m.chip, "mx-chip-amber");
  assert.match(m.label, /sent/);
  for (const v of ["", "UNKNOWN", "Failed", " failed"]) assert.equal(statusMeta(v).review, true, JSON.stringify(v));
});

test("개수: 6상태 각각 + 확인 필요 합계, 합이 전체와 같다", () => {
  const c = countSubmissionStatuses(rows(["received", "notified", "notified", "failed", "dispatching", "partial", "partial", "unknown", "weird"]));
  assert.deepEqual(c, { total: 9, received: 1, notified: 2, failed: 1, dispatching: 1, partial: 2, unknown: 1, other: 1, review: 5 });
  assert.equal(c.received + c.notified + c.failed + c.review, c.total);
});

test("기존 자료만 있으면 확인 필요 0, 기존 개수 그대로(회귀)", () => {
  const c = countSubmissionStatuses(rows(["received", "notified", "failed", "failed"]));
  assert.deepEqual(c, { total: 4, received: 1, notified: 1, failed: 2, dispatching: 0, partial: 0, unknown: 0, other: 0, review: 0 });
});

test("실패 개수에 새 상태를 섞지 않는다(실패 0으로 숨기지도 않음)", () => {
  const c = countSubmissionStatuses(rows(["partial", "unknown", "dispatching"]));
  assert.equal(c.failed, 0);
  assert.equal(c.review, 3);
});

test("필터: 기존 4개 + 확인 필요, 각 필터 결과", () => {
  assert.deepEqual(STATUS_FILTERS.map((f) => f.value), ["all", "received", "notified", "failed", "review"]);
  const all = ["received", "notified", "failed", "dispatching", "partial", "unknown", "weird"];
  const pick = (f) => all.filter((s) => matchesStatusFilter(s, f));
  assert.deepEqual(pick("all"), all);
  assert.deepEqual(pick("received"), ["received"]);
  assert.deepEqual(pick("notified"), ["notified"]);
  assert.deepEqual(pick("failed"), ["failed"]);
  assert.deepEqual(pick("review"), ["dispatching", "partial", "unknown", "weird"]);
  // 모든 상태가 「전체」가 아닌 필터 중 정확히 하나에 들어간다(누락·중복 0)
  for (const s of all) assert.equal(["received", "notified", "failed", "review"].filter((f) => matchesStatusFilter(s, f)).length, 1, s);
});

test("오류 원문 표시는 기존처럼 failed만(확대 0)", () => {
  assert.equal(showsErrorMessage("failed"), true);
  for (const s of ["received", "notified", "dispatching", "partial", "unknown", "weird"]) assert.equal(showsErrorMessage(s), false, s);
});

test("대시보드 확인 필요 개수용 조건: 기존 3개가 아닌 모든 값", () => {
  assert.equal(REVIEW_STATUS_NOT_IN, "(received,notified,failed)");
});
