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
