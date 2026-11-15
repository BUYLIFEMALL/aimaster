import { test } from "node:test";
import assert from "node:assert/strict";
import { BLOCK_DEFS, BLOCK_SKINS } from "../src/lib/blocks.ts";
import { applyInlineEdits } from "../src/lib/builder/inline-edit.ts";

// I14·E9 — 블록 스킨(모양 여러 벌)과 스킨마다 다른 칸
const IMG = "https://example.com/a.jpg";
const CAT = "11111111-2222-4333-8444-555555555555";
const banner = (x) => BLOCK_DEFS.banner.validate({ image: IMG, mobile_image: "", link: "", max_width: 1100, ...x });

test("배너: 기본 스킨은 저장하지 않고(옛 저장본과 같음), 꽉 찬 띠는 skin만 남는다", () => {
  assert.deepEqual(banner({}).value, { image: IMG, mobile_image: "", link: "", max_width: 1100 });
  assert.deepEqual(banner({ skin: "full", headline: "x" }).value, { image: IMG, mobile_image: "", link: "", max_width: 1100, skin: "full" });
  assert.deepEqual(banner({ skin: "이상한값" }).value, { image: IMG, mobile_image: "", link: "", max_width: 1100 });
});

test("배너: 글 얹은 배너는 큰 글 필수, 칸 길이를 자른다", () => {
  assert.equal(banner({ skin: "overlay" }).ok, false);
  const v = banner({ skin: "overlay", headline: "가".repeat(50), sub: "나".repeat(90), button_label: "다".repeat(30) }).value;
  assert.equal(v.skin, "overlay");
  assert.equal(v.headline.length, 40);
  assert.equal(v.sub.length, 80);
  assert.equal(v.button_label.length, 20);
});

test("카테고리 바로가기: 글자 칩은 그림·이모지를 버리고, 그림 주소가 이상해도 통과", () => {
  const items = [{ category_id: CAT, image: "javascript:x", emoji: "🍎" }, { category_id: CAT, image: "", emoji: "" }];
  const v = BLOCK_DEFS.category_icons.validate({ title: "", items, skin: "chip" });
  assert.equal(v.ok, true);
  assert.equal(v.value.skin, "chip");
  assert.deepEqual(v.value.items.map((i) => [i.image, i.emoji]), [["", ""], ["", ""]]);
  assert.equal(BLOCK_DEFS.category_icons.validate({ title: "", items }).ok, false); // 기본 스킨은 그림 검사 그대로
  assert.equal(BLOCK_DEFS.category_icons.validate({ title: "", items: items.map((i) => ({ ...i, image: "" })), skin: "circle" }).value.skin, "circle");
});

test("공지: 한 줄 띠만 저장, 그 밖은 기본(목록)", () => {
  assert.equal(BLOCK_DEFS.notice.validate({ title: "공지", count: 5, skin: "line" }).value.skin, "line");
  assert.equal("skin" in BLOCK_DEFS.notice.validate({ title: "공지", count: 5, skin: "x" }).value, false);
});

test("스킨 목록: 첫 값이 기본(빈 값)이고, 저장 검사가 받는 값과 같다", () => {
  for (const [type, skins] of Object.entries(BLOCK_SKINS)) {
    assert.equal(skins[0].id, "", type);
    assert.equal(new Set(skins.map((k) => k.id)).size, skins.length, type);
  }
});

test("바로 편집: 글 얹은 배너의 큰 글·작은 글을 고칠 수 있다", () => {
  const doc = { schema_version: 1, blocks: [{ id: "b1", type: "banner", visible: true, settings: { image: IMG, mobile_image: "", link: "", max_width: 1100, skin: "overlay", headline: "옛 글", sub: "", button_label: "" } }] };
  const r = applyInlineEdits(doc, [{ blockId: "b1", field: "headline", value: "새 글" }, { blockId: "b1", field: "sub", value: "작은 글" }, { blockId: "b1", field: "image", value: "x" }]);
  assert.equal(r.applied, 2);
  assert.equal(r.doc.blocks[0].settings.headline, "새 글");
  assert.equal(r.doc.blocks[0].settings.image, IMG);
});
