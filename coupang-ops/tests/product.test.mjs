// 쿠팡 상품 생성 본문 만들기·검사(외부 호출 없음)
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCreateBody, checkDraft, kstDateTime } from "../src/lib/coupang/product.ts";

const defaults = {
  outboundShippingPlaceCode: "100",
  returnCenter: { code: "R1", name: "반품지", phone: "02-1234-5678", zipCode: "12345", address: "서울", addressDetail: "1층" },
  deliveryMethod: "SEQUENCIAL",
  deliveryCompanyCode: "CJGLS",
  deliveryChargeType: "CONDITIONAL_FREE",
  deliveryCharge: 3000,
  freeShipOverAmount: 30000,
  deliveryChargeOnReturn: 3000,
  returnCharge: 3000,
  remoteAreaDeliverable: false,
  unionDelivery: true,
  outboundShippingTimeDay: 2,
  maximumBuyForPerson: 0,
  adultOnly: false,
  taxFree: false,
};
const img = (n) => `https://coupang-ops.buylife.xyz/i/${n}`;
const draft = () => ({
  vendorId: "A00012345",
  wingUserId: "seller01",
  categoryCode: 56137,
  name: "노트북 백팩",
  options: [
    { name: "블랙", originalPrice: 39000, salePrice: 29000, stock: 99, attributes: [{ type: "색상", value: "블랙" }] },
    { name: "그레이", originalPrice: 39000, salePrice: 29000, stock: 99, attributes: [{ type: "색상", value: "그레이" }] },
  ],
  notices: [{ category: "가방", detail: "종류", content: "상세페이지 참조" }],
  images: { representation: img("a"), extras: [img("b")], contents: [img("c"), img("d")] },
  requested: false,
  now: new Date(Date.UTC(2026, 9, 28, 15, 30, 0)),
});

test("정상 초안은 문제 없음", () => {
  assert.deepEqual(checkDraft(draft(), defaults), []);
});

test("한국 시각으로 판매 시작일을 만든다(UTC 15:30 → 다음날 00:30)", () => {
  assert.equal(kstDateTime(new Date(Date.UTC(2026, 9, 28, 15, 30, 0))), "2026-10-29T00:30:00");
});

test("본문 모양: 코드값·옵션·이미지 순서", () => {
  const b = buildCreateBody(draft(), defaults);
  assert.equal(b.vendorId, "A00012345");
  assert.equal(b.vendorUserId, "seller01");
  assert.equal(b.requested, false);
  assert.equal(b.saleEndedAt, "2099-01-01T23:59:59");
  assert.equal(b.unionDeliveryType, "UNION_DELIVERY");
  assert.equal(b.remoteAreaDeliverable, "N");
  assert.equal(b.freeShipOverAmount, 30000);
  assert.equal(b.items.length, 2);
  assert.equal(b.items[0].maximumBuyCount, 99);
  assert.deepEqual(b.items[0].images.map((i) => i.imageType), ["REPRESENTATION", "DETAIL"]);
  assert.equal(b.items[0].contents[0].contentDetails.length, 2);
  assert.deepEqual(b.items[1].attributes, [{ attributeTypeName: "색상", attributeValueName: "그레이" }]);
  assert.equal(b.items[0].notices[0].noticeCategoryName, "가방");
});

test("중복 옵션명·정가<판매가·재고 초과를 잡는다", () => {
  const d = draft();
  d.options[1].name = "블랙";
  d.options[0].originalPrice = 1000;
  d.options[0].stock = 100000;
  const p = checkDraft(d, defaults);
  assert.ok(p.some((s) => s.includes("같은 옵션명")));
  assert.ok(p.some((s) => s.includes("정가가 판매가보다 낮습니다")));
  assert.ok(p.some((s) => s.includes("재고는")));
});

test("반품배송비 100~150% 규칙", () => {
  const p = checkDraft(draft(), { ...defaults, returnCharge: 5000 });
  assert.ok(p.some((s) => s.includes("100~150%")));
  assert.deepEqual(checkDraft(draft(), { ...defaults, returnCharge: 4500 }), []);
});

test("이미지 주소는 https·200자 이하", () => {
  const d = draft();
  d.images.representation = "http://example.com/a.jpg";
  d.images.contents.push(`https://x.com/${"a".repeat(200)}`);
  const p = checkDraft(d, defaults);
  assert.ok(p.some((s) => s.includes("대표 이미지 주소")));
  assert.ok(p.some((s) => s.includes("200자")));
});

test("기본값·키·카테고리가 없으면 알려 준다", () => {
  const d = { ...draft(), vendorId: "", categoryCode: null };
  const p = checkDraft(d, null);
  assert.ok(p.some((s) => s.includes("기본값")));
  assert.ok(p.some((s) => s.includes("키를 먼저")));
  assert.ok(p.some((s) => s.includes("카테고리")));
});
