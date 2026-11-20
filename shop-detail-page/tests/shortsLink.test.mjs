// 상품 → 쇼츠 원스톱 넘기기 주소 시험. 받는 쪽(shorts-onestop-studio) 읽기 함수로 다시 풀어 형식이 맞는지 확인한다.
import { test } from "node:test";
import assert from "node:assert/strict";
import { shortsProductUrl, shortsOffer, shortsPoints, SHORTS_TOPIC_URL } from "../lib/shortsLink.ts";
import { readProductHandoff, readProductExtra } from "../../shorts-onestop-studio/src/lib/productShorts.ts";

const base = { id: "82deeddc-1234-4abc-9def-000000000001", name: "스테인리스 진공 텀블러 500ml", product_label: null, key_features: "- 12시간 보온\n✔ 원터치 뚜껑\n3. 식기세척기 사용\n4. 네 번째", price: 29900, sale_price: 19900, currency: "KRW" };

test("받는 쪽이 그대로 읽는다(상품명·장점 3개·혜택·보낸 곳·상품ID)", () => {
  const url = shortsProductUrl(base);
  assert.ok(url.startsWith(`${SHORTS_TOPIC_URL}#product-name=`));
  const hash = url.slice(url.indexOf("#"));
  const got = readProductHandoff(hash);
  assert.equal(got.product.name, base.name);
  assert.deepEqual(got.product.points, ["12시간 보온", "원터치 뚜껑", "식기세척기 사용"]);
  assert.equal(got.product.offer, "정가 29,900원 → 할인가 19,900원");
  assert.equal(got.from, "AI 상세페이지 자동화");
  assert.equal(readProductExtra(hash).id, base.id);
});

test("할인가가 없으면 혜택 문구를 만들지 않고, 정가보다 높지 않으면 판매가만", () => {
  assert.equal(shortsOffer({ price: 29900, sale_price: null, currency: "KRW" }), "");
  assert.equal(shortsOffer({ price: null, sale_price: 19900, currency: "KRW" }), "판매가 19,900원");
  assert.equal(shortsOffer({ price: 19900, sale_price: 19900, currency: "KRW" }), "판매가 19,900원");
  assert.equal(shortsOffer({ price: 30, sale_price: 20, currency: "USD" }), "");
  const hash = shortsProductUrl({ ...base, sale_price: null }).split("#")[1];
  assert.ok(!hash.includes("product-offer="));
});

test("상품명이 없으면 관리용 이름, 둘 다 없으면 버튼 숨김(null)", () => {
  assert.equal(readProductHandoff(shortsProductUrl({ ...base, name: "", product_label: "관리용 텀블러" }).replace(/^[^#]*/, "")).product.name, "관리용 텀블러");
  assert.equal(shortsProductUrl({ ...base, name: null, product_label: "  " }), null);
  assert.deepEqual(shortsPoints(null), []);
});

// 2026-11-20 이모지 경계(원스톱 조사 dc52806a9 H8): 제한 끝에서 이모지가 잘려도 예외 없이 주소를 만들고,
// 받는 쪽이 반쪽 글자 없이 읽는다. 상품명·장점·조합 모두 확인.
const hasLone = (s) => /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(s);

test("상품명 100자 경계의 이모지 — 예외 없이 이모지를 통째로 빼고 받는 쪽 왕복", () => {
  const name = "가".repeat(99) + "🎁" + "뒤";
  const url = shortsProductUrl({ ...base, name });
  const got = readProductHandoff(url.slice(url.indexOf("#")));
  assert.equal(got.product.name, "가".repeat(99));
  assert.ok(!hasLone(got.product.name));
  // 경계 안쪽 이모지는 그대로 남는다
  const ok = shortsProductUrl({ ...base, name: "가".repeat(98) + "🎁" });
  assert.equal(readProductHandoff(ok.slice(ok.indexOf("#"))).product.name, "가".repeat(98) + "🎁");
});

test("장점 60자 경계의 이모지·여러 줄 조합 — 장점마다 반쪽 없이 왕복", () => {
  const feats = ["나".repeat(59) + "🔥끝", "✔ 다".repeat(1) + "라".repeat(57) + "😀😀", "3. 짧은 장점 🌿"].join("\n");
  const url = shortsProductUrl({ ...base, key_features: feats });
  const got = readProductHandoff(url.slice(url.indexOf("#")));
  assert.equal(got.product.points.length, 3);
  assert.equal(got.product.points[0], "나".repeat(59));
  assert.equal(got.product.points[2], "짧은 장점 🌿");
  for (const p of got.product.points) { assert.ok(p.length <= 60, p); assert.ok(!hasLone(p), p); }
});

test("원래 들어온 짝 없는 반쪽 글자도 빼서 예외가 나지 않음", () => {
  const url = shortsProductUrl({ ...base, name: "텀블러\uD83D 500ml", key_features: "\uDE00보온" });
  const got = readProductHandoff(url.slice(url.indexOf("#")));
  assert.equal(got.product.name, "텀블러 500ml");
  assert.deepEqual(got.product.points, ["보온"]);
});
