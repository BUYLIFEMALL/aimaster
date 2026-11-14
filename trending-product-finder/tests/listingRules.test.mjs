// E2-2 상품명·태그 규칙 검사 순수 함수 시험(AI 호출 없음)
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkTitle, cleanTags, MAX_TAGS } from "../lib/listingRules.ts";

test("깨끗한 상품명은 문제 없음", () => {
  assert.deepEqual(checkTitle("접이식 캠핑의자 알루미늄 경량 휴대용", "naver"), []);
});

test("길이: 50자 넘으면 주의, 100자 넘으면 오류", () => {
  assert.equal(checkTitle("가".repeat(51), "coupang")[0].level, "warn");
  assert.equal(checkTitle("가".repeat(101), "naver")[0].level, "error");
  assert.equal(checkTitle("   ", "naver")[0].text, "상품명이 비어 있습니다.");
});

test("같은 낱말 반복·홍보 문구·꾸밈 기호를 알려 준다", () => {
  const texts = checkTitle("★특가★ 텀블러 보온 텀블러 무료배송", "naver").map((i) => i.text).join(" | ");
  assert.match(texts, /반복: 텀블러/);
  assert.match(texts, /무료배송, 특가/);
  assert.match(texts, /꾸밈 기호/);
});

test("태그: # 빼고 띄어쓰기 붙이고 중복·상품명과 같은 것·긴 것 제외, 최대 10개", () => {
  assert.deepEqual(cleanTags(["#캠핑 의자", "캠핑의자", "낚시의자", "", "가".repeat(21), "접이식의자"], "접이식의자"), ["캠핑의자", "낚시의자"]);
  assert.equal(cleanTags(Array.from({ length: 15 }, (_, i) => `태그${i}`)).length, MAX_TAGS);
});
