// E2-1 등록 정보 도우미 순수 함수 시험(외부 호출·DB 없음)
import { test } from "node:test";
import assert from "node:assert/strict";
import { tokenizeName, topWords, priceStats, adShare, usedInNames } from "../lib/registerHelper.ts";

test("낱말 나누기: 수량·용량·한 글자는 빼고 소문자로", () => {
  assert.deepEqual(tokenizeName("[무료배송] 스탠리 텀블러 500ml 2개 / Tumbler 대 용량"), ["무료배송", "스탠리", "텀블러", "tumbler", "용량"]);
});

test("많이 쓰인 낱말: 상품명 수로 세고(한 이름 안 중복은 1번), 2개 이상만, 많은 순", () => {
  const names = ["보온 텀블러 텀블러", "스텐 보온 텀블러", "보온 머그컵", "캠핑 컵", "텀블러 세척솔", "접이식 의자"];
  const words = topWords(names);
  assert.deepEqual(words.slice(0, 2), [
    { word: "텀블러", count: 3, pct: 50 },
    { word: "보온", count: 3, pct: 50 },
  ].sort((a, b) => a.word.localeCompare(b.word, "ko")));
  assert.ok(!words.some((w) => w.word === "캠핑"), "1번만 나온 낱말은 뺌");
});

test("표본이 5개 미만이면 1번 나온 낱말도 보여 줌", () => {
  assert.equal(topWords(["캠핑 의자", "접이식 테이블"]).length, 4);
});

test("가격 분포: 빈 값·0원 빼고 실제 가격 중에서 1/4·가운데·3/4", () => {
  const stats = priceStats([null, 0, 10000, 20000, 30000, 40000, 50000, 60000, 70000, 80000]);
  assert.deepEqual(stats, { count: 8, min: 10000, q1: 20000, median: 40000, q3: 60000, max: 80000 });
  assert.equal(priceStats([null, 0]), null);
});

test("광고 비율과 연관 키워드 사용 수(띄어쓰기 무시)", () => {
  const items = [
    { name: "캠핑 의자", price: 1, is_ad: true },
    { name: "캠핑의자 경량", price: 1, is_ad: false },
    { name: "접이식 테이블", price: 1, is_ad: false },
    { name: "릴렉스 체어", price: 1, is_ad: false },
  ];
  assert.deepEqual(adShare(items), { ads: 1, total: 4, pct: 25 });
  assert.equal(usedInNames("캠핑의자", items.map((i) => i.name)), 2);
  assert.equal(usedInNames(" ", items.map((i) => i.name)), 0);
});
