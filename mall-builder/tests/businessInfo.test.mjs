import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isValidBusinessNo, formatBusinessNo, validateBusinessInfo, readBusinessInfo, missingRequired, emptyBusinessInfo,
} from "../src/lib/businessInfo.ts";

test("사업자등록번호 검증 숫자 — 올바른 번호", () => {
  // 검증 숫자가 맞는 번호(국세청 계산식): 220-81-62517(공개된 대기업 번호), 864-25-00988(주인님 몰 바닥글)
  assert.equal(isValidBusinessNo("220-81-62517"), true);
  assert.equal(isValidBusinessNo("2208162517"), true);
  assert.equal(isValidBusinessNo("864-25-00988"), true);
});

test("사업자등록번호 검증 숫자 — 틀린 번호", () => {
  assert.equal(isValidBusinessNo("220-81-62518"), false);
  assert.equal(isValidBusinessNo("123-45-6789"), false);
  assert.equal(isValidBusinessNo(""), false);
});

test("사업자등록번호 모양 맞추기", () => {
  assert.equal(formatBusinessNo("2208162517"), "220-81-62517");
  assert.equal(formatBusinessNo(" 220 81 62517 "), "220-81-62517");
});

test("저장값 정리 — 앞뒤 공백 제거, 번호 모양 통일", () => {
  const r = validateBusinessInfo({ company_name: "  바이라이프 ", business_no: "2208162517", phone: "1644-3686" });
  assert.equal(r.ok, true);
  assert.equal(r.ok && r.value.company_name, "바이라이프");
  assert.equal(r.ok && r.value.business_no, "220-81-62517");
});

test("필수 칸이 비어 있어도 저장은 된다(작성 중), 빠진 칸은 따로 알려준다", () => {
  const r = validateBusinessInfo({ company_name: "바이라이프" });
  assert.equal(r.ok, true);
  assert.deepEqual(missingRequired(r.ok ? r.value : emptyBusinessInfo()), ["대표자", "사업자등록번호", "사업장 주소", "고객센터 전화", "개인정보보호책임자"]);
});

test("형식이 틀린 칸은 거부", () => {
  const r = validateBusinessInfo({ business_no: "123-45-67890", email: "abc", phone: "전화", bank_account: "계좌", company_name: "가".repeat(61) });
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(r.ok ? {} : r.errors).sort(), ["bank_account", "business_no", "company_name", "email", "phone"]);
});

test("DB 값 읽기 — 모르는 칸·문자열 아닌 값은 버림", () => {
  const info = readBusinessInfo({ company_name: "A", unknown: "x", phone: 123 });
  assert.equal(info.company_name, "A");
  assert.equal(info.phone, "");
  assert.equal("unknown" in info, false);
  assert.equal(readBusinessInfo(null).company_name, "");
});

test("번호 칸의 비슷한 하이픈(복사해 온 문자)은 일반 하이픈으로 바꿔 통과(2026-11-12)", () => {
  const r = validateBusinessInfo({ bank_account: "123456‐01–123456", phone: "1644－3686" });
  assert.equal(r.ok, true);
  assert.equal(r.value.bank_account, "123456-01-123456");
  assert.equal(r.value.phone, "1644-3686");
});
