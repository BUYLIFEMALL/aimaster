import { test } from "node:test";
import assert from "node:assert/strict";
import { EXTRA_LAYOUTS_3 } from "../src/lib/builder/templates-extra-3.ts";
import { EXTRA_LAYOUTS_2 } from "../src/lib/builder/templates-extra-2.ts";
import { EXTRA_LAYOUTS } from "../src/lib/builder/templates-extra.ts";
import { COLOR_PRESETS, DARK_BG, INDUSTRIES, LAYOUTS, layoutsFor } from "../src/lib/builder/templates.ts";
import { validateDoc } from "../src/lib/blocks.ts";
import { contrastWarning, isDarkColor, readTheme, validateTheme } from "../src/lib/theme.ts";
import { validateFooter, validateHeader, validatePopup } from "../src/lib/builder/frame.ts";
import { validateDetail, validateList } from "../src/lib/builder/pages.ts";

// D5+ 3차 템플릿 131~138(FRONT-20261116-05) — 2차 시험과 같은 기준 + 식품·디지털 각 10종 이상·기존 템플릿 보존
const apply = (l, c, storeName = "가나몰") => {
  const mode = l.shape.mode ?? "light";
  return { theme: { ...l.shape, mode, primary: c.primary, bg: mode === "dark" ? DARK_BG : c.bg }, ...l.build({ now: 0, storeName }) };
};

test("8종 × 색 12개: 모든 조각이 저장 검사를 통과하고, 바탕 밝기와 블록 배경색이 맞는다", () => {
  assert.equal(EXTRA_LAYOUTS_3.length, 8);
  for (const l of EXTRA_LAYOUTS_3) for (const c of COLOR_PRESETS) {
    const t = apply(l, c);
    const where = `${l.id}·${c.id}`;
    assert.deepEqual(validateTheme(t.theme), [], where);
    assert.deepEqual(readTheme(t.theme), t.theme, where);
    assert.equal(contrastWarning(t.theme), null, where);
    const v = validateDoc(t.home);
    assert.equal(v.ok, true, `${where} home: ${v.error ?? ""}`);
    for (const [name, fn] of [["header", validateHeader], ["footer", validateFooter], ["popup", validatePopup], ["list", validateList], ["detail", validateDetail]]) {
      const r = fn(t[name]);
      assert.equal(r.ok, true, `${where} ${name}: ${r.error ?? ""}`);
    }
    for (const b of t.home.blocks) if (b.style?.bg_color) assert.equal(isDarkColor(b.style.bg_color), t.theme.mode === "dark", `${where} ${b.id}`);
  }
});

test("저장 검사를 거쳐도 블록 설정이 그대로 남는다(잘리거나 기본값으로 바뀌지 않음)", () => {
  for (const l of EXTRA_LAYOUTS_3) {
    const t = apply(l, COLOR_PRESETS[0]);
    const v = validateDoc(t.home);
    assert.equal(v.ok, true, l.id);
    assert.deepEqual(v.value.blocks.map((b) => b.settings), t.home.blocks.map((b) => b.settings), l.id);
  }
});

test("문구에 몰마다 다른 사실·효과 약속을 쓰지 않고, 몰 이름은 글에선 그대로·html에선 이스케이프", () => {
  const CLAIMS = /인증|보증|정품|증정|쿠폰|무료\s*배송|당일|오늘\s*(출발|출고|발송)|최저가|1위|식약처|특허|100\s*%|유기농|무농약|국내산|산지\s*직송|효과|효능|친환경|무첨가|신선도|A\/?S|에이에스/;
  for (const l of EXTRA_LAYOUTS_3) {
    const t = apply(l, COLOR_PRESETS[0], "A&B <샵>");
    const texts = [l.description, t.header.band.text, t.footer.note, ...t.home.blocks.flatMap((b) => [b.settings.title, b.settings.subtitle, b.settings.eyebrow, b.settings.accent, b.settings.text, b.settings.button?.label, b.settings.button2?.label, ...(b.settings.tabs ?? []).map((x) => x.label)])].filter(Boolean);
    for (const s of texts) {
      assert.doesNotMatch(s, CLAIMS, `${l.id}: 「${s}」`);
      assert.doesNotMatch(s, /&amp;|&lt;|&gt;/, `${l.id}: 「${s}」`);
    }
    for (const b of t.home.blocks) if (b.type === "html") {
      assert.match(b.settings.html, /A&amp;B &lt;샵&gt;/, `${l.id} ${b.id}`);
      assert.doesNotMatch(b.settings.html, CLAIMS, `${l.id} ${b.id}`);
    }
  }
});

test("같은 화면 이동 단추는 그 템플릿 안 블록을 가리키고, 블록·레이아웃 번호는 기존과도 겹치지 않는다", () => {
  const seen = new Set();
  const others = LAYOUTS.filter((l) => !EXTRA_LAYOUTS_3.includes(l));
  for (const l of others) for (const b of apply(l, COLOR_PRESETS[0]).home.blocks) seen.add(b.id);
  for (const l of EXTRA_LAYOUTS_3) {
    assert.ok(!others.some((o) => o.id === l.id), `레이아웃 번호 겹침: ${l.id}`);
    const t = apply(l, COLOR_PRESETS[0]);
    const ids = t.home.blocks.map((b) => b.id);
    for (const i of ids) {
      assert.ok(!seen.has(i), `블록 번호 겹침: ${i}`);
      seen.add(i);
    }
    for (const b of t.home.blocks) for (const bt of [b.settings.button, b.settings.button2]) {
      if (bt?.link?.startsWith("#")) assert.ok(ids.some((i) => `#blk-${i}` === bt.link), `${l.id}: ${bt.link}`);
    }
  }
});

test("업종·분위기·기본색·이름이 등록표 규칙에 맞고, 131~134는 식품·135~138은 디지털, 134·136은 어두운 테마", () => {
  EXTRA_LAYOUTS_3.forEach((l, i) => {
    assert.ok(l.industries.length && l.industries.every((x) => INDUSTRIES.includes(x)), l.id);
    assert.ok(l.moods.length >= 2, l.id);
    assert.ok(COLOR_PRESETS.some((c) => c.id === l.defaultColor), l.id);
    assert.match(l.name, new RegExp(`^${131 + i}\\. .+ 스타일$`), l.id);
    assert.ok(l.industries.includes(i < 4 ? "food" : "digital"), l.id);
  });
  const dark = EXTRA_LAYOUTS_3.filter((l) => l.shape.mode === "dark").map((l) => l.id);
  assert.deepEqual(dark, ["butcher-dark", "gaming-gear-dark"]);
});

test("등록표에 이어 붙고 기존 19종은 그대로, 식품·디지털 10종 이상·모든 업종 6종 이상(D5+ 3차 완료 조건)", () => {
  for (const l of [...EXTRA_LAYOUTS, ...EXTRA_LAYOUTS_2, ...EXTRA_LAYOUTS_3]) assert.ok(LAYOUTS.includes(l), l.id);
  const keep = ["clean-wellness", "luxury-boutique", "trendy-pop", "neo-modern", "clean-select", "market-daily", "brand-story", "kids-toy", "digital-tech", "wholesale-catalog", "editorial-magazine", "minimal-showroom", "street-night", "fresh-market", "bakery-cafe", "premium-deli", "kids-pastel", "mom-baby-care", "color-cosmetic"];
  for (const k of keep) assert.ok(LAYOUTS.some((l) => l.id === k), `기존 템플릿 사라짐: ${k}`);
  assert.equal(LAYOUTS.length, 27);
  assert.equal(new Set(LAYOUTS.map((l) => l.id)).size, 27);
  for (const i of ["food", "digital"]) assert.ok(layoutsFor(i).length >= 10, `${i}: ${layoutsFor(i).length}`);
  for (const i of INDUSTRIES) assert.ok(layoutsFor(i).length >= 6, `${i}: ${layoutsFor(i).length}`);
  assert.equal(layoutsFor("").length, 27);
});
