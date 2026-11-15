// v1.57 상품 숏폼 장면 기획 템플릿·검증 시험. 실행: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { PRODUCT_TEMPLATES, applyTemplate, checkProductScript, inputNumbers, inventedNumbers, issuesNote, readPhotoPlan, templateGuide } from "../src/lib/productTemplates.ts";
import { applyProduct, planSlots, productPhotoList } from "../src/lib/productShorts.ts";
import type { ShortsScript } from "../src/lib/script.ts";

const card = (title: string, narration = "가볍게 들고 다녀요") => ({ tag: "", title, desc: "한 줄 설명", narration });
function script(over: Partial<ShortsScript> = {}): ShortsScript {
  return {
    topic: "휴대용 선풍기 홍보 쇼츠", category: "", tone: "friendly", format: "product",
    intro: { eyebrow: "여름 필수", title: "더운 출근길 괜찮아요?", narration: "출근길마다 땀이 나죠" },
    cards: [card("땀나는 출근길"), card("접이식 선풍기"), card("가방에 쏙"), card("시원한 하루")],
    outro: { title: "이번 여름은 시원하게", subtitle: "", cta: ["프로필 링크"], narration: "프로필 링크에서 확인하세요" },
    hashtags: [], source: "ai", ...over,
  };
}
const ctx = { template: "pain" as const, photos: 3, input: "휴대용 선풍기 홍보 쇼츠\n상품명: 접이식 선풍기\n판매자가 적은 장점:\n1. 무게 300g" };

test("템플릿 4종 모두 카드 4장·태그·움직임이 있다", () => {
  for (const t of Object.values(PRODUCT_TEMPLATES)) {
    assert.equal(t.cards.length, 4);
    assert.ok(t.cards.every((c) => c.tag.length <= 6 && c.guide));
    assert.ok(["stamp", "count", "check", "shine"].includes(t.motion));
  }
});

test("깨끗한 기획은 문제 0건", () => {
  assert.deepEqual(checkProductScript(script(), ctx), []);
});

test("카드 수가 다르면 문제", () => {
  const s = script(); s.cards.pop();
  assert.ok(checkProductScript(s, ctx).some((i) => i.field === "cards"));
});

test("화면 글자 수 한도 초과", () => {
  const s = script(); s.cards[1].title = "가".repeat(30);
  assert.ok(checkProductScript(s, ctx).some((i) => i.scene === 1 && i.field === "title"));
});

test("입력에 없는 가격·평점·후기 수는 잡고, 입력의 숫자·순서 숫자·올해는 통과", () => {
  const allowed = inputNumbers(ctx.input);
  assert.deepEqual(inventedNumbers("무게 300g이라 가볍고 3가지가 좋아요", allowed), []);
  assert.deepEqual(inventedNumbers(`${new Date().getFullYear()}년 신상`, allowed), []);
  assert.deepEqual(inventedNumbers("단돈 19,900원, 평점 4.8점, 리뷰 1,200개", allowed), ["19,900원", "4.8점", "1,200개"]);
  const s = script(); s.cards[2].narration = "리뷰 3천 건이 증명해요";
  assert.ok(checkProductScript(s, ctx).some((i) => i.scene === 2 && i.field === "narration"));
});

test("근거 없는 과장 표현은 잡되, 판매자가 직접 적었으면 통과", () => {
  const s = script(); s.outro.cta = ["품절 대란"];
  assert.ok(checkProductScript(s, ctx).some((i) => i.scene === "outro"));
  assert.deepEqual(checkProductScript(s, { ...ctx, input: `${ctx.input}\n혜택: 품절 대란` }), []);
});

test("사진 번호: AI 결과에서 읽고, 없는 번호는 문제", () => {
  const raw = { intro: { photo: 0 }, cards: [{ photo: 0 }, { photo: 1 }, { photo: 2 }, { photo: 5 }], outro: { photo: 3 } };
  const plan = readPhotoPlan(raw);
  assert.deepEqual(plan, [0, 0, 1, 2, 5, 3]);
  const issues = checkProductScript(script({ photoPlan: plan }), ctx);
  assert.equal(issues.length, 1); assert.equal(issues[0].scene, 3); assert.equal(issues[0].field, "photo");
  assert.equal(readPhotoPlan({ intro: {}, cards: [{}], outro: {} }), undefined);
});

test("템플릿 적용: 카드 태그를 역할로 고정하고 템플릿을 기록", () => {
  const s = applyTemplate(script(), "three");
  assert.equal(s.template, "three");
  assert.deepEqual(s.cards.map((c) => c.tag), ["장점 1", "장점 2", "장점 3", "정리"]);
});

test("사진 배치: 기획 번호대로, 맞지 않으면 기본 배치", () => {
  const s = script({ photoPlan: [1, 0, 2, 2, 3, 1] });
  assert.deepEqual(planSlots(s, 3), [{ scene: 0, photo: 0 }, { scene: 2, photo: 1 }, { scene: 3, photo: 1 }, { scene: 4, photo: 2 }, { scene: 5, photo: 0 }]);
  assert.equal(planSlots(s, 2), null); // 3번 사진이 없음
  assert.equal(planSlots(script({ photoPlan: [0, 0, 0, 0, 0, 0] }), 3), null);
  const photos = [{ path: "u/product/a.jpg" }, { path: "u/product/b.jpg" }, { path: "u/product/c.jpg" }];
  const rec = { name: "접이식 선풍기", points: [], offer: "", id: "", option: "", url: "", desc: "", rights: "owned" as const, rev: "", from: "", photos: 3 };
  const out = applyProduct(s, rec, photos);
  assert.equal(out.cards[0].bg, undefined); // 기획에서 0 = 사진 없음(고민 장면)
  assert.equal(out.cards[1].bg?.path, "u/product/b.jpg");
  assert.equal(out.outro.bg?.path, "u/product/a.jpg");
  assert.deepEqual(productPhotoList(out).map((p) => p.path), ["u/product/a.jpg", "u/product/b.jpg", "u/product/c.jpg"]);
});

test("프롬프트 지시와 다시 쓰기 안내", () => {
  const g = templateGuide("proof", 2);
  assert.ok(g.includes("카드 정확히 4장") && g.includes("1~2번") && g.includes("근거"));
  assert.ok(templateGuide("pain", 0).includes("모두 0"));
  const note = issuesNote([{ scene: 1, field: "title", msg: "30자" }, { scene: "outro", field: "cta", msg: "과장" }]);
  assert.ok(note.includes("카드2 title") && note.includes("아웃트로 cta"));
});
