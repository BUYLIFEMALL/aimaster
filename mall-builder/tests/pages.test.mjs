import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_DETAIL, DEFAULT_LIST, arrangeProducts, listFor, readDetail, readList, validateDetail, validateList } from "../src/lib/builder/pages.ts";

const C1 = "11111111-1111-4111-8111-111111111111";
const C2 = "22222222-2222-4222-8222-222222222222";

test("빈 값은 지금 화면 그대로", () => {
  assert.deepEqual(readList(null), DEFAULT_LIST);
  assert.deepEqual(readDetail(undefined), DEFAULT_DETAIL);
});

test("목록 — 열 수·정렬·품절 숨기기·카드·배너·카테고리별 덮어쓰기", () => {
  const v = validateList({
    columns: 3, sort: "price_asc", hide_soldout: true, card: { style: "plain" },
    banner: { image: "https://x.supabase.co/b.png", link: "/s/x/notices" },
    overrides: [{ category_id: C1, columns: 5, sort: "name", banner: { image: "", link: "" } }],
  });
  assert.ok(v.ok);
  assert.equal(v.value.columns, 3);
  assert.deepEqual(v.value.card, { style: "plain" });
  assert.deepEqual(v.value.overrides, [{ category_id: C1, columns: 5, sort: "name" }]);
  const c1 = listFor(v.value, C1);
  assert.equal(c1.columns, 5);
  assert.equal(c1.sort, "name");
  assert.equal(c1.banner.image, "https://x.supabase.co/b.png");
  const c2 = listFor(v.value, C2);
  assert.equal(c2.columns, 3);
  assert.equal(c2.sort, "price_asc");
});

test("목록 — 틀린 값은 저장 거절, 읽을 때는 틀린 항목만 버림", () => {
  assert.match(validateList({ columns: 9 }).error, /2~5/);
  assert.match(validateList({ overrides: [{ category_id: "x" }] }).error, /카테고리를 골라/);
  assert.match(validateList({ overrides: [{ category_id: C1 }, { category_id: C1 }] }).error, /두 번/);
  assert.match(validateList({ banner: { image: "http://x/a.png" } }).error, /https/);
  const r = readList({ columns: 9, overrides: [{ category_id: "x" }, { category_id: C2, columns: 2 }], banner: { image: "http://x" } });
  assert.equal(r.columns, 4);
  assert.deepEqual(r.overrides, [{ category_id: C2, columns: 2 }]);
  assert.equal(r.banner, undefined);
});

test("상세 — 쿠폰·후기 끄기, 공통 위·아래 그림 3장까지", () => {
  const v = validateDetail({ show_coupons: false, show_boards: false, top_images: [{ image: "https://x.supabase.co/t.png", link: "" }] });
  assert.ok(v.ok);
  assert.equal(v.value.show_coupons, false);
  assert.equal(v.value.top_images.length, 1);
  assert.match(validateDetail({ bottom_images: [{ image: "", link: "" }] }).error, /올려 주세요/);
  assert.match(validateDetail({ top_images: Array.from({ length: 4 }, () => ({ image: "https://x/a.png" })) }).error, /3장/);
  assert.equal(readDetail({ top_images: [{ image: "" }, { image: "https://x.supabase.co/t.png" }] }).top_images.length, 1);
});

test("정렬 — 표시 가격 기준, 가격 비공개는 뒤로, 같은 값은 원래 순서, 품절 숨기기", () => {
  const p = (name, unitPrice, extra = {}) => ({ name, status: "on_sale", display: { unitPrice, priceHidden: false }, ...extra });
  const list = [p("다", 3000), p("가", 1000), p("나", 2000, { display: { unitPrice: 0, priceHidden: true } }), p("라", 1000, { status: "sold_out" })];
  assert.deepEqual(arrangeProducts(list, { sort: "default", hide_soldout: false }).map((x) => x.name), ["다", "가", "나", "라"]);
  assert.deepEqual(arrangeProducts(list, { sort: "price_asc", hide_soldout: false }).map((x) => x.name), ["가", "라", "다", "나"]);
  assert.deepEqual(arrangeProducts(list, { sort: "price_desc", hide_soldout: false }).map((x) => x.name), ["다", "가", "라", "나"]);
  assert.deepEqual(arrangeProducts(list, { sort: "name", hide_soldout: true }).map((x) => x.name), ["가", "나", "다"]);
});
