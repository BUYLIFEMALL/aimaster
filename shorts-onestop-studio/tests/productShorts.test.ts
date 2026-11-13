import test from "node:test";
import assert from "node:assert/strict";
import { PRODUCT_HASH, normalizeProduct, productBlock, productHandoffHash, readProductHandoff } from "../src/lib/productShorts.ts";
import { REF_HASH } from "../src/lib/reference.ts";

test("넘기기 값 이름이 레퍼런스 대사 넘기기와 겹치지 않는다", () => {
  assert.notEqual(PRODUCT_HASH, REF_HASH);
  assert.equal(readProductHandoff(`#${REF_HASH}=abc`), null);
});

test("보낸 값을 그대로 받는다(한글·&·= 포함)", () => {
  const hash = productHandoffHash({ name: "접이식 & 휴대용 선풍기", points: ["무게 300g", "USB-C=충전", "소음 적음"], offer: "오늘 출발" }, "AI 상세페이지 자동화");
  assert.deepEqual(readProductHandoff(hash), {
    product: { name: "접이식 & 휴대용 선풍기", points: ["무게 300g", "USB-C=충전", "소음 적음"], offer: "오늘 출발" },
    from: "AI 상세페이지 자동화",
  });
});

test("길이·개수 제한과 빈 값 정리", () => {
  const p = normalizeProduct({ name: `  ${"가".repeat(150)} `, points: ["a", "", "b", "c", "d"], offer: 3 });
  assert.equal(p?.name.length, 100);
  assert.deepEqual(p?.points, ["a", "b", "c"]);
  assert.equal(p?.offer, "");
  assert.equal(normalizeProduct({ name: "   " }), null);
  assert.equal(normalizeProduct(null), null);
});

test("깨진 값이 있어도 나머지는 받는다", () => {
  const r = readProductHandoff(`#${PRODUCT_HASH}=%EB%AC%BC%EB%B3%91&product-point=%E0%A4&product-point=%EA%B0%80%EB%B3%8D%EB%8B%A4`);
  assert.deepEqual(r?.product, { name: "물병", points: ["가볍다"], offer: "" });
});

test("상품명이 없으면 넘기기가 아니다", () => {
  assert.equal(productHandoffHash({ name: "", points: [], offer: "" }), "");
  assert.equal(readProductHandoff(`#${PRODUCT_HASH}=`), null);
});

test("프롬프트 블록에는 판매자가 적은 값만 들어간다", () => {
  const block = productBlock({ name: "물병", points: ["가볍다"], offer: "" });
  assert.match(block, /상품명: 물병/);
  assert.match(block, /1\. 가볍다/);
  assert.doesNotMatch(block, /혜택/);
});

// ── v1.52 메이커 후속 1단계 ──
import { applyProduct, normalizeProductExtra, productCaption, productExtraHash, productPhotoSlots, productSceneCount, readProductExtra } from "../src/lib/productShorts.ts";

const baseHash = () => productHandoffHash({ name: "물병", points: ["가볍다"], offer: "" }, "상세페이지");

test("추가 필드를 붙여도 기존 4개 받기는 그대로(하위 호환)", () => {
  const hash = baseHash() + productExtraHash({ id: "P-001", option: "화이트", url: "https://smartstore.naver.com/x/1", desc: "500ml, 1회 세척 쉬움", rights: "owned", rev: "r3" });
  assert.deepEqual(readProductHandoff(hash), { product: { name: "물병", points: ["가볍다"], offer: "" }, from: "상세페이지" });
  assert.deepEqual(readProductExtra(hash), { id: "P-001", option: "화이트", url: "https://smartstore.naver.com/x/1", desc: "500ml, 1회 세척 쉬움", rights: "owned", rev: "r3" });
});

test("추가 필드: https만·ID 형식·권리 값이 틀리면 빈 값, 길이 자르기", () => {
  const e = normalizeProductExtra({ id: "a b<c", url: "http://x.com", rights: "anyone", desc: "가".repeat(400), rev: "r 1" });
  assert.equal(e.id, ""); assert.equal(e.url, ""); assert.equal(e.rights, ""); assert.equal(e.rev, "");
  assert.equal(e.desc.length, 300);
  assert.equal(readProductExtra("#other=1"), null);
  assert.equal(productExtraHash({}), "");
});

test("사진 배치: 상품이 나오는 장면 우선, 적으면 돌아가며, 6장이면 카드1까지", () => {
  assert.deepEqual(productPhotoSlots(0), []);
  assert.deepEqual(productPhotoSlots(1).map((x) => x.photo), [0, 0, 0, 0, 0]);
  assert.deepEqual(productPhotoSlots(2).map((x) => `${x.scene}:${x.photo}`), ["2:0", "3:1", "4:0", "0:1", "5:0"]);
  assert.equal(productPhotoSlots(6).length, 6);
  assert.equal(productPhotoSlots(6)[5].scene, 1);
});

const demo = () => ({
  topic: "t", category: "", tone: "friendly" as const, format: "product" as const,
  intro: { eyebrow: "", title: "인트로", narration: "n" },
  cards: [1, 2, 3, 4].map((i) => ({ title: `c${i}`, desc: "", narration: "n" })),
  outro: { title: "끝", subtitle: "AI가 쓴 부제", cta: [], narration: "n" },
  hashtags: [], source: "ai" as const,
});
const rec = (rights: "owned" | "") => ({ name: "물병", points: [], offer: "", ...normalizeProductExtra({ option: "화이트", rights }), from: "", photos: 0 });

test("대본에 넣기: 권리가 없으면 사진은 안 넣고 상품명 원문은 고정", () => {
  const s = applyProduct(demo(), rec(""), [{ path: "u1/product/a.jpg" }]);
  assert.equal(productSceneCount(s), 0);
  assert.equal(s.outro.subtitle, "물병 · 화이트");
  assert.equal(s.product?.photos, 0);
});

test("대본에 넣기: 상품 장면에 원본 사진, 장면 배경·아래 글자 배치, AI 장면은 덮지 않음, 다시 넣으면 교체", () => {
  const d = demo();
  (d.cards[1] as { bg?: unknown }).bg = { type: "image", source: "ai", src: "", path: "u1/ai.png" };
  const s = applyProduct(d, rec("owned"), [{ path: "u1/product/a.jpg" }, { path: "u1/product/b.jpg" }, { path: "bad/path.jpg" }]);
  assert.equal(s.cards[1].bg?.source, "ai"); // 카드2(AI 이미지)는 그대로
  assert.equal(s.cards[2].bg?.source, "product");
  assert.equal(s.intro.bg?.source, "product");
  assert.equal(s.cards[0].bg, undefined); // 카드1(쓰기 전)은 6장일 때만
  assert.equal(s.backdrop?.mode, "scene");
  assert.equal(s.design?.layout, "bottom");
  assert.equal(s.product?.photos, 2); // product 폴더가 아닌 경로는 버림
  const again = applyProduct(s, rec("owned"), [{ path: "u1/product/z.jpg" }]);
  assert.ok([again.intro.bg, ...again.cards.map((c) => c.bg), again.outro.bg].filter((b) => b?.source === "product").every((b) => b?.path === "u1/product/z.jpg"));
});

test("프롬프트 블록에 옵션·확정 설명이 들어가고, 고정 문구는 원문 그대로", () => {
  const block = productBlock({ name: "물병", points: [], offer: "" }, { option: "화이트", desc: "500ml" });
  assert.match(block, /옵션: 화이트/); assert.match(block, /확정한 상품 설명: 500ml/);
  assert.equal(productCaption({ name: "물병" }), "물병");
});

// ── v1.54 같은 상품으로 다시 만들기 ──
import { productPhotoPaths } from "../src/lib/productShorts.ts";

test("저장된 상품 대본에서 올렸던 사진을 올린 순서대로 되찾는다", () => {
  const s = applyProduct(demo(), rec("owned"), [{ path: "u1/product/a.jpg" }, { path: "u1/product/b.jpg" }, { path: "u1/product/c.jpg" }]);
  assert.deepEqual(productPhotoPaths(s), ["u1/product/a.jpg", "u1/product/b.jpg", "u1/product/c.jpg"]);
  // 한 장면이 AI 영상으로 바뀌어도 처음 사진(poster)으로 찾는다
  const v = structuredClone(s);
  v.cards[1].bg = { type: "video", source: "ai", src: "", path: "u1/video/x.mp4", poster: s.cards[1].bg };
  assert.deepEqual(productPhotoPaths(v), ["u1/product/a.jpg", "u1/product/b.jpg", "u1/product/c.jpg"]);
  assert.deepEqual(productPhotoPaths(demo()), []);
});
