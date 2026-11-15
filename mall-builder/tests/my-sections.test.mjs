import { test } from "node:test";
import assert from "node:assert/strict";
import { validateSection, prepareInsert, MAX_SECTION_BLOCKS } from "../src/lib/builder/sections.ts";

// E3 — 내 섹션(블록 묶음 저장·다시 쓰기)
const P1 = "11111111-2222-4333-8444-555555555555";
const P2 = "11111111-2222-4333-8444-666666666666";
const showcaseManual = { id: "showcase-a", type: "showcase", visible: true, settings: { title: "고른 상품", source: "manual", category_id: "", product_ids: [P1], columns: 4, limit: 8 } };
const notice = { id: "notice-a", type: "notice", visible: true, settings: { title: "공지", count: 5 }, style: { title_font: "serif" } };
const cats = { id: "cat-a", type: "category_icons", visible: true, settings: { title: "", items: [{ category_id: P1, image: "", emoji: "🍎" }, { category_id: P2, image: "", emoji: "🍐" }] } };
const tabs = { id: "tabs-a", type: "tabs", visible: true, settings: { title: "", tabs: [{ label: "가", source: "category", category_id: P1, product_ids: [] }, { label: "나", source: "new", category_id: "", product_ids: [] }], columns: 4, limit: 8 } };

test("이름은 1~40자, 블록은 1~10개, 블록 검사를 통과해야 저장", () => {
  assert.equal(validateSection("", [notice]).ok, false);
  assert.equal(validateSection("가".repeat(41), [notice]).value.name.length, 40);
  assert.equal(validateSection("빈 묶음", []).ok, false);
  assert.equal(validateSection("많음", Array.from({ length: MAX_SECTION_BLOCKS + 1 }, (_, i) => ({ ...notice, id: `n${i}` }))).ok, false);
  assert.equal(validateSection("잘못", [{ ...showcaseManual, settings: { ...showcaseManual.settings, product_ids: [] } }]).ok, false);
  const v = validateSection("  명절 묶음 ", [notice, showcaseManual]);
  assert.equal(v.ok, true);
  assert.equal(v.value.name, "명절 묶음");
  assert.equal(v.value.blocks[0].style.title_font, "serif", "겉모양도 함께 저장");
});

test("같은 몰에 넣으면 그대로, 번호만 새로(지금 쓰는 번호와 안 겹침)", () => {
  const r = prepareInsert([showcaseManual, notice], { sameStore: true, existingIds: ["showcase-a"] });
  assert.equal(r.blocks.length, 2);
  assert.notEqual(r.blocks[0].id, "showcase-a");
  assert.match(r.blocks[0].id, /^showcase-[0-9a-f]{12}$/);
  assert.equal(r.blocks[0].settings.source, "manual");
  assert.deepEqual(r.notes, []);
});

test("다른 몰에 넣으면 상품·카테고리 출처는 신상품으로, 카테고리 바로가기는 빼고 알림", () => {
  const r = prepareInsert([showcaseManual, cats, tabs, notice], { sameStore: false, existingIds: [] });
  assert.deepEqual(r.blocks.map((b) => b.type), ["showcase", "tabs", "notice"]);
  assert.equal(r.blocks[0].settings.source, "new");
  assert.deepEqual(r.blocks[0].settings.product_ids, []);
  assert.equal(r.blocks[1].settings.tabs[0].source, "new");
  assert.equal(r.blocks[1].settings.tabs[0].category_id, "");
  assert.equal(r.notes.length, 2, "출처 바꿈 1줄 + 카테고리 바로가기 뺌 1줄");
  assert.equal(new Set(r.blocks.map((b) => b.id)).size, 3);
});
