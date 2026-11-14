import { test } from "node:test";
import assert from "node:assert/strict";
import { BLOCK_TYPES, newBlock, normalizeStyle, readDoc, validateDoc } from "../src/lib/blocks.ts";
import { defaultPuckProps, fromPuck, fromPuckRaw, toPuck } from "../src/lib/builder/puck-adapter.ts";

const OLD_DOC = {
  schema_version: 1,
  blocks: [
    { id: "a1", type: "topbar", visible: true, settings: { items: [{ text: "안녕하세요", link: "", bg: "#111827" }], rotate_sec: 4 } },
    { id: "a2", type: "banner", visible: false, settings: { image: "https://x.supabase.co/a.png", mobile_image: "", link: "/s/x/c/1", max_width: 1100 } },
    { id: "a3", type: "showcase", visible: true, settings: { title: "추천", source: "new", category_id: "", product_ids: [], columns: 4, limit: 8 }, show_from: "2026-11-20T00:00:00.000Z" },
    { id: "a4", type: "notice", visible: true, settings: { title: "공지사항", count: 5 } },
  ],
};

test("블록 겉모양 — 기본값·틀린 값은 버리고, 하나도 없으면 null", () => {
  assert.equal(normalizeStyle(undefined), null);
  assert.equal(normalizeStyle({}), null);
  assert.equal(normalizeStyle({ pad_top: 0, width: "content", bg_color: "red", title_align: "left", hide_pc: false }), null);
  assert.deepEqual(normalizeStyle({ pad_top: 40, pad_bottom: 999, width: "full", bg_color: "#FFFBEB", title_align: "center", hide_mobile: true, junk: 1 }), {
    pad_top: 40, width: "full", bg_color: "#fffbeb", title_align: "center", hide_mobile: true,
  });
});

test("옛 저장본은 겉모양 칸 없이 그대로 읽힌다", () => {
  const v = validateDoc(OLD_DOC);
  assert.ok(v.ok);
  assert.ok(v.value.blocks.every((b) => !("style" in b)));
  assert.deepEqual(readDoc(OLD_DOC), v.value);
});

test("PC와 휴대폰 모두 숨기면 거절(숨기기를 쓰라고 안내)", () => {
  const doc = { blocks: [{ ...OLD_DOC.blocks[0], style: { hide_pc: true, hide_mobile: true } }] };
  const v = validateDoc(doc);
  assert.equal(v.ok, false);
  assert.match(v.error, /숨기기/);
});

test("왕복: 저장본 → Puck → 저장본 = 같음(옛 저장본·겉모양 있는 저장본)", () => {
  const a = readDoc(OLD_DOC);
  const back = fromPuck(toPuck(a));
  assert.ok(back.ok);
  assert.deepEqual(back.value, a);

  const styled = readDoc({ blocks: [{ ...OLD_DOC.blocks[3], style: { pad_top: 24, bg_color: "#f1f5f9", width: "full" } }] });
  assert.deepEqual(styled.blocks[0].style, { pad_top: 24, bg_color: "#f1f5f9", width: "full" });
  const back2 = fromPuck(toPuck(styled));
  assert.ok(back2.ok);
  assert.deepEqual(back2.value, styled);
});

test("Puck 데이터의 빈 겉모양·빈 예약 시각은 저장하지 않는다", () => {
  const raw = fromPuckRaw({ content: [{ type: "notice", props: { id: "n1", visible: true, settings: { title: "공지", count: 3 }, style: {}, show_from: "", show_until: "" } }] });
  assert.deepEqual(raw.blocks[0], { id: "n1", type: "notice", visible: true, settings: { title: "공지", count: 3 } });
});

test("Puck에서 순서를 바꾸면 저장본 순서도 바뀐다", () => {
  const p = toPuck(readDoc(OLD_DOC));
  p.content.reverse();
  const back = fromPuck(p);
  assert.ok(back.ok);
  assert.deepEqual(back.value.blocks.map((b) => b.id), ["a4", "a3", "a2", "a1"]);
});

test("모르는 종류·틀린 설정은 몇 번째 블록인지 알려 준다", () => {
  const bad = fromPuck({ content: [{ type: "notice", props: { id: "n1", visible: true, settings: { title: "공지", count: 3 }, style: {} } }, { type: "nope", props: { id: "x" } }] });
  assert.equal(bad.ok, false);
  assert.match(bad.error, /2번째/);
  assert.equal(fromPuck(null).ok, true);
});

test("새 블록 기본 props는 12종 모두 저장 검사 모양과 같다", () => {
  assert.equal(BLOCK_TYPES.length, 12);
  for (const t of BLOCK_TYPES) {
    const d = defaultPuckProps(t);
    assert.deepEqual(d.settings, newBlock(t, "z").settings);
    assert.deepEqual(d.style, {});
  }
});

test("상품 카드 표시·배치(D2-4b·4c) — 기본값은 저장하지 않고, 고른 값만 남는다", async () => {
  const { normalizeCard } = await import("../src/lib/blocks.ts");
  assert.equal(normalizeCard(undefined), null);
  assert.equal(normalizeCard({ hide_discount: false, style: "box" }), null);
  assert.deepEqual(normalizeCard({ hide_discount: true, hide_list_price: true, hide_business: true, style: "plain", x: 1 }), { hide_discount: true, hide_list_price: true, hide_business: true, style: "plain" });
  const base = { title: "추천", source: "new", category_id: "", product_ids: [], columns: 4, limit: 8 };
  const plain = validateDoc({ blocks: [{ id: "s1", type: "showcase", visible: true, settings: { ...base, card: {}, layout: "grid" } }] });
  assert.ok(plain.ok);
  assert.deepEqual(plain.value.blocks[0].settings, base);
  const styled = validateDoc({ blocks: [{ id: "s1", type: "showcase", visible: true, settings: { ...base, card: { style: "plain", hide_discount: true }, layout: "row" } }] });
  assert.ok(styled.ok);
  assert.deepEqual(styled.value.blocks[0].settings.card, { hide_discount: true, style: "plain" });
  assert.equal(styled.value.blocks[0].settings.layout, "row");
  const tabs = validateDoc({ blocks: [{ id: "t1", type: "tabs", visible: true, settings: { title: "", tabs: [{ label: "가", source: "new", category_id: "", product_ids: [] }, { label: "나", source: "new", category_id: "", product_ids: [] }], columns: 4, limit: 8, card: { hide_list_price: true }, layout: "row" } }] });
  assert.ok(tabs.ok);
  assert.deepEqual(tabs.value.blocks[0].settings.card, { hide_list_price: true });
  assert.equal("layout" in tabs.value.blocks[0].settings, false);
  const back = fromPuck(toPuck(styled.value));
  assert.ok(back.ok);
  assert.deepEqual(back.value, styled.value);
});
