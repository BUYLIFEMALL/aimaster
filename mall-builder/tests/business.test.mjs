import { test } from "node:test";
import assert from "node:assert/strict";
import { validateBusinessApplication, checkCertFile, certPath, APPROVAL_LABEL } from "../src/lib/business.ts";

test("사업자 신청 검사", () => {
  // 국세청 검증식을 통과하는 번호(예시: 220-81-62517)
  const r = validateBusinessApplication({ business_no: "2208162517", company: " 바이라이프 ", ceo_name: "홍길동" });
  assert.deepEqual(r, { ok: true, value: { business_no: "220-81-62517", company: "바이라이프", ceo_name: "홍길동" } });
  assert.match(validateBusinessApplication({ business_no: "1234567890", company: "a", ceo_name: "b" }).error, /사업자등록번호/);
  assert.match(validateBusinessApplication({ business_no: "220-81-62517", company: "", ceo_name: "b" }).error, /상호/);
  assert.match(validateBusinessApplication({ business_no: "220-81-62517", company: "a", ceo_name: "" }).error, /대표자/);
});

test("사업자등록증 파일 검사", () => {
  assert.match(checkCertFile(null), /올려 주세요/);
  assert.match(checkCertFile({ type: "image/png", size: 0 }), /올려 주세요/);
  assert.match(checkCertFile({ type: "text/plain", size: 10 }), /PDF/);
  assert.match(checkCertFile({ type: "application/pdf", size: 6 * 1024 * 1024 }), /5MB/);
  assert.equal(checkCertFile({ type: "image/jpeg", size: 1000 }), null);
});

test("저장 경로 — 몰/계정/파일", () => {
  assert.equal(certPath("S", "U", "application/pdf", 1), "S/U/business-cert-1.pdf");
  assert.equal(certPath("S", "U", "image/jpeg", 2), "S/U/business-cert-2.jpg");
  assert.equal(certPath("S", "U", "image/webp", 3), "S/U/business-cert-3.webp");
});

test("상태 이름표", () => {
  assert.equal(APPROVAL_LABEL.pending, "사업자 승인 대기");
});
