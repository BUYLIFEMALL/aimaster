// 실행: node --test tests/   — M2-5 이용약관·개인정보 처리방침(2026-11-15)
import { test } from "node:test";
import assert from "node:assert/strict";
import { POLICY_MAX, cleanPolicyBody, isPolicyKind, policyTemplate } from "../src/lib/policies.ts";

const FULL = { storeName: "시험몰", company: "바이라이프", ceo: "홍길동", address: "서울 강남구 1", phone: "1644-0000", email: "help@x.test", officer: "홍길동 (help@x.test)" };
const EMPTY = { storeName: "", company: "", ceo: "", address: "", phone: "", email: "", officer: "" };

test("서식: 사업자 정보가 들어가고, 빈 칸은 [ ]로 남는다", () => {
  const t = policyTemplate("terms", FULL, "2026년 11월 15일");
  assert.match(t, /^시험몰 이용약관/);
  assert.ok(t.includes("바이라이프(이하 \"회사\")"));
  assert.ok(t.includes("전화 1644-0000, 이메일 help@x.test"));
  assert.ok(t.includes("2026년 11월 15일부터 시행"));
  assert.ok(t.includes("제8조(청약철회 등)"));
  const p = policyTemplate("privacy", FULL, "2026년 11월 15일");
  assert.ok(p.includes("책임자: 홍길동 (help@x.test)"));
  assert.ok(p.includes("5년"));
  const e = policyTemplate("privacy", EMPTY, "오늘");
  assert.ok(e.includes("[개인정보보호책임자]") && e.includes("[상호]") && e.includes("[연락처]"));
  assert.ok(policyTemplate("terms", EMPTY, "오늘").includes("[몰 이름]"));
});

test("정리: 줄바꿈 통일·제어문자 제거·길이 제한", () => {
  assert.deepEqual(cleanPolicyBody("  가\r\n나\u0007다  "), { ok: true, value: "가\n나다" });
  assert.deepEqual(cleanPolicyBody(null), { ok: true, value: "" });
  assert.equal(cleanPolicyBody("x".repeat(POLICY_MAX + 1)).ok, false);
  assert.equal(cleanPolicyBody("x".repeat(POLICY_MAX)).ok, true);
});

test("종류는 terms·privacy만", () => {
  assert.deepEqual(["terms", "privacy", "refund", ""].map(isPolicyKind), [true, true, false, false]);
});
