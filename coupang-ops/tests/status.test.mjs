// 등록 현황·승인 상태 정리(외부 호출 없음)
import { test } from "node:test";
import assert from "node:assert/strict";
import { historyPath, jobStatusOf, normalizeHistory, RECHECK_STATUSES, rejectReasonText, summarizeStatus } from "../src/lib/coupang/status.ts";

test("반려 칸 문구와 다시 확인 대상", () => {
  assert.equal(rejectReasonText("승인반려 — 반려 사유: 이미지 규격 위반"), "승인반려 — 반려 사유: 이미지 규격 위반");
  assert.match(rejectReasonText(""), /쿠팡 상태 확인/);
  assert.match(rejectReasonText(null), /쿠팡 상태 확인/);
  assert.deepEqual(RECHECK_STATUSES, ["saved", "requested"]);
});

test("쿠팡 상태 이름을 기록 상태로 바꾼다", () => {
  assert.equal(jobStatusOf("임시저장"), "saved");
  assert.equal(jobStatusOf("심사중"), "requested");
  assert.equal(jobStatusOf("승인대기중"), "requested");
  assert.equal(jobStatusOf("승인완료"), "approved");
  assert.equal(jobStatusOf("부분승인완료"), "approved");
  assert.equal(jobStatusOf("승인반려"), "rejected");
  assert.equal(jobStatusOf("상품삭제"), null);
  assert.equal(jobStatusOf("모름"), null);
  assert.equal(historyPath(123), "/v2/providers/seller_api/apis/api/v1/marketplace/seller-products/123/histories");
});

test("반려면 가장 최근 반려 사유를 붙인다", () => {
  const history = normalizeHistory({ code: "SUCCESS", data: [
    { status: "승인반려", comment: "옛 사유", createdBy: "SYSTEM", createdAt: "2026-10-01T10:00:00" },
    { status: "승인반려", comment: "대표 이미지를 내려받지 못함", createdBy: "SYSTEM", createdAt: "2026-10-02T10:00:00" },
    { status: "임시저장", comment: "", createdBy: "buylife", createdAt: "2026-09-30T10:00:00" },
  ] });
  assert.equal(history[0].comment, "대표 이미지를 내려받지 못함"); // 최신 먼저
  const s = summarizeStatus({ code: "SUCCESS", data: { statusName: "승인반려" } }, history);
  assert.equal(s.jobStatus, "rejected");
  assert.match(s.message, /반려 사유: 대표 이미지를 내려받지 못함/);
});

test("반려 사유가 안 보일 때 이력 조회 실패와 사유 없음을 구분한다", () => {
  const rejected = { data: { statusName: "승인반려" } };
  assert.match(summarizeStatus(rejected, [], "HTTP 403").message, /변경 이력을 읽지 못했습니다\(HTTP 403\)/);
  assert.match(summarizeStatus(rejected, []).message, /이력에 사유가 없습니다\(이력 0건\)/);
  // 이력의 상태 이름이 달라도 내용이 있으면 보여 준다
  const other = normalizeHistory({ data: [{ status: "반려", comment: "이미지 규격 위반", createdAt: "2026-10-31T02:49:00" }] });
  assert.match(summarizeStatus(rejected, other).message, /반려 사유: 이미지 규격 위반/);
});

test("상품 조회가 비어도 이력으로 상태를 읽고, 이상한 응답은 빈 목록", () => {
  assert.deepEqual(normalizeHistory(null), []);
  const s = summarizeStatus(null, normalizeHistory({ data: [{ status: "승인완료", createdAt: "2026-10-02T10:00:00" }] }));
  assert.equal(s.statusName, "승인완료");
  assert.equal(s.jobStatus, "approved");
  assert.equal(summarizeStatus(null, []).message, "쿠팡 상태를 읽지 못했습니다");
});
