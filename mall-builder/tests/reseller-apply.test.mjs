// M1-4(0071) 리셀러 신청 — 화면 검사가 DB 규칙과 같은지
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkApplyFile, parseApproveRate, resellerApplyOpen, resellerApplyPath, validateResellerApply } from "../src/lib/reseller-apply.ts";

const base = { name: " 김리셀 ", phone: "010-1111-2222", channel: "https://blog.naver.com/kim", intro: "", payee_type: "individual", biz_no: "", bank_name: "국민", bank_account: "123-456-789", bank_holder: "김리셀" };

test("개인 신청 — 이름 정리, 사업자번호 비움", () => {
  const r = validateResellerApply({ ...base, biz_no: "111-22-33333" });
  assert.equal(r.ok, true);
  assert.equal(r.ok && r.value.name, "김리셀");
  assert.equal(r.ok && r.value.biz_no, "");
});

test("사업자 신청 — 사업자등록번호 10자리 필수", () => {
  assert.equal(validateResellerApply({ ...base, payee_type: "business", biz_no: "123" }).ok, false);
  const r = validateResellerApply({ ...base, payee_type: "business", biz_no: "111-22-33333" });
  assert.equal(r.ok && r.value.biz_no, "1112233333");
});

test("채널·계좌·구분 빠지면 거절", () => {
  assert.equal(validateResellerApply({ ...base, channel: " " }).ok, false);
  assert.equal(validateResellerApply({ ...base, bank_account: "12" }).ok, false);
  assert.equal(validateResellerApply({ ...base, payee_type: "" }).ok, false);
});

test("서류 경로 — DB가 보는 <몰>/<본인>/reseller-apply- 모양", () => {
  const p = resellerApplyPath("S", "U", "bankbook", "image/jpeg", 5);
  assert.equal(p, "S/U/reseller-apply-bankbook-5.jpg");
  assert.ok(p.startsWith("S/U/reseller-apply-"));
  assert.equal(resellerApplyPath("S", "U", "doc", "application/pdf", 5), "S/U/reseller-apply-doc-5.pdf");
});

test("서류 파일 검사", () => {
  assert.match(checkApplyFile(null, "통장 사본"), /올려/);
  assert.match(checkApplyFile({ type: "text/plain", size: 10 }, "통장 사본"), /PDF/);
  assert.match(checkApplyFile({ type: "image/png", size: 6 * 1024 * 1024 }, "통장 사본"), /5MB/);
  assert.equal(checkApplyFile({ type: "image/png", size: 100 }, "통장 사본"), null);
});

test("신청 받기·승인 율", () => {
  assert.equal(resellerApplyOpen({ reseller_apply: true }), true);
  assert.equal(resellerApplyOpen({ supplier_apply: true }), false);
  assert.deepEqual(parseApproveRate(""), { ok: true, value: null });
  assert.deepEqual(parseApproveRate("2.5"), { ok: true, value: 2.5 });
  assert.equal(parseApproveRate("60").ok, false);
});
