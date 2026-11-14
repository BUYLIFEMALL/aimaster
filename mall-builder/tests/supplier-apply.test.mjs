// M1-0(0070) 공급사 입점 신청 — 화면 검사가 DB 규칙과 같은지
import { test } from "node:test";
import assert from "node:assert/strict";
import { supplierApplyCertPath, supplierApplyOpen, validateSupplierApply } from "../src/lib/supplier-apply.ts";

const base = { company: "가나상사", biz_no: "123-45-67890", ceo_name: " 홍길동 ", contact_name: "", phone: "010-1111-2222", category: "생활용품", intro: "" };

test("validateSupplierApply — 사업자번호 숫자 10자리로 정리", () => {
  const r = validateSupplierApply(base);
  assert.equal(r.ok, true);
  assert.equal(r.ok && r.value.biz_no, "1234567890");
  assert.equal(r.ok && r.value.ceo_name, "홍길동");
});

test("validateSupplierApply — 상호·사업자번호 거절", () => {
  assert.equal(validateSupplierApply({ ...base, company: "  " }).ok, false);
  assert.equal(validateSupplierApply({ ...base, biz_no: "123-45" }).ok, false);
  assert.equal(validateSupplierApply({ ...base, company: "가".repeat(61) }).ok, false);
});

test("supplierApplyCertPath — DB 저장소 규칙 모양(<몰>/<본인>/supplier-apply-…)", () => {
  assert.equal(supplierApplyCertPath("S", "U", "application/pdf", 1), "S/U/supplier-apply-1.pdf");
  assert.equal(supplierApplyCertPath("S", "U", "image/jpeg", 2), "S/U/supplier-apply-2.jpg");
  assert.equal(supplierApplyCertPath("S", "U", "image/png", 3), "S/U/supplier-apply-3.png");
});

test("supplierApplyOpen — modules.supplier_apply가 true일 때만", () => {
  assert.equal(supplierApplyOpen({ supplier_apply: true }), true);
  assert.equal(supplierApplyOpen({ supplier_apply: "true" }), false);
  assert.equal(supplierApplyOpen(null), false);
  assert.equal(supplierApplyOpen({ resale: true }), false);
});
