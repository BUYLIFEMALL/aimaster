import { test } from "node:test";
import assert from "node:assert/strict";
import { buildProductPrompt, cleanDraft, isOwnImageUrl, ProductDraftSchema } from "../src/lib/aiProduct.ts";

test("프롬프트에 올해 연도·지어내기 금지·메모가 들어간다", () => {
  const p = buildProductPrompt({ memo: "A4 복사지 80g", storeName: "가나몰", categoryNames: ["사무용품"], hasImage: true, year: 2026 });
  assert.match(p.system, /2026년/);
  assert.match(p.system, /지어내지/);
  assert.match(p.user, /A4 복사지 80g/);
  assert.match(p.user, /대표 사진/);
  assert.match(p.user, /사무용품/);
});

test("정리: 길이 자르기·HTML 지우기·옵션 2개 이상만·3묶음까지", () => {
  const d = cleanDraft({
    name: "가".repeat(150),
    summary: " 한 줄 ",
    description: "<b>특징</b>\n\n\n\n쓰임새",
    options: [
      { name: "색상", values: ["화이트", "블랙", "화이트"] },
      { name: "크기", values: ["L"] },
      { name: "a", values: ["1", "2"] },
      { name: "b", values: ["1", "2"] },
      { name: "c", values: ["1", "2"] },
    ],
    cautions: ["", "인증 확인 필요"],
  });
  assert.equal(d.name.length, 100);
  assert.equal(d.summary, "한 줄");
  assert.equal(d.description, "특징\n\n쓰임새");
  assert.deepEqual(d.options[0], { name: "색상", values: ["화이트", "블랙"] });
  assert.equal(d.options.length, 3);
  assert.ok(!d.options.some((g) => g.name === "크기"));
  assert.deepEqual(d.cautions, ["인증 확인 필요"]);
});

test("사진 주소는 이 서비스 저장소 공개 주소만", () => {
  const base = "https://abc.supabase.co";
  assert.ok(isOwnImageUrl(`${base}/storage/v1/object/public/mall-builder/s1/a.jpg`, base));
  assert.ok(isOwnImageUrl(`${base}/storage/v1/object/public/x.png`, base + "/"));
  assert.ok(!isOwnImageUrl("https://evil.example.com/a.jpg", base));
  assert.ok(!isOwnImageUrl(`${base}/storage/v1/object/public/../sign/a.jpg`, base));
  assert.ok(!isOwnImageUrl(null, base));
  assert.ok(!isOwnImageUrl(`${base}/storage/v1/object/public/a.jpg`, undefined));
});

test("응답 형식이 모의 응답을 읽는다", () => {
  const r = ProductDraftSchema.safeParse({ name: "a", summary: "b", description: "c", options: [], cautions: [] });
  assert.ok(r.success);
  assert.ok(!ProductDraftSchema.safeParse({ name: "a" }).success);
});
