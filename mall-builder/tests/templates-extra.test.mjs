import { test } from "node:test";
import assert from "node:assert/strict";
import { EXTRA_LAYOUTS } from "../src/lib/builder/templates-extra.ts";
import { COLOR_PRESETS, DARK_BG, INDUSTRIES } from "../src/lib/builder/templates.ts";
import { validateDoc } from "../src/lib/blocks.ts";
import { contrastWarning, isDarkColor, readTheme, validateTheme } from "../src/lib/theme.ts";
import { validateFooter, validateHeader, validatePopup } from "../src/lib/builder/frame.ts";
import { validateDetail, validateList } from "../src/lib/builder/pages.ts";

// D5+ 프론트 스타일 3종(116·117·118) — 등록표에 붙기 전에도 따로 검사(templates.ts 시험과 같은 기준)
const apply = (l, c, storeName = "가나몰") => {
  const mode = l.shape.mode ?? "light";
  return { theme: { ...l.shape, mode, primary: c.primary, bg: mode === "dark" ? DARK_BG : c.bg }, ...l.build({ now: 0, storeName }) };
};

test("3종 × 색 12개: 모든 조각이 저장 검사를 통과하고, 바탕 밝기와 블록 배경색이 맞는다", () => {
  assert.equal(EXTRA_LAYOUTS.length, 3);
  for (const l of EXTRA_LAYOUTS) for (const c of COLOR_PRESETS) {
    const t = apply(l, c);
    const where = `${l.id}·${c.id}`;
    assert.deepEqual(validateTheme(t.theme), [], where);
    assert.deepEqual(readTheme(t.theme), t.theme, where);
    assert.equal(contrastWarning(t.theme), null, where);
    assert.equal(validateDoc(t.home).ok, true, where);
    for (const [name, fn] of [["header", validateHeader], ["footer", validateFooter], ["popup", validatePopup], ["list", validateList], ["detail", validateDetail]]) {
      const v = fn(t[name]);
      assert.equal(v.ok, true, `${where} ${name}: ${v.error ?? ""}`);
    }
    for (const b of t.home.blocks) if (b.style?.bg_color) assert.equal(isDarkColor(b.style.bg_color), t.theme.mode === "dark", `${where} ${b.id}`);
  }
});

test("문구에 몰마다 다른 사실을 쓰지 않고, 몰 이름은 이스케이프 없이 그대로", () => {
  const CLAIMS = /인증|보증|정품|증정|쿠폰|무료\s*배송|당일|오늘\s*(출발|출고|발송)|최저가|1위|식약처|특허|100\s*%/;
  for (const l of EXTRA_LAYOUTS) {
    const t = apply(l, COLOR_PRESETS[0], "A&B <샵>");
    const texts = [t.header.band.text, t.footer.note, ...t.home.blocks.flatMap((b) => [b.settings.title, b.settings.subtitle, b.settings.eyebrow, b.settings.accent, b.settings.text, b.settings.button?.label, b.settings.button2?.label, ...(b.settings.tabs ?? []).map((x) => x.label)])].filter(Boolean);
    for (const s of texts) {
      assert.doesNotMatch(s, CLAIMS, `${l.id}: 「${s}」`);
      assert.doesNotMatch(s, /&amp;|&lt;|&gt;/, `${l.id}: 「${s}」`);
    }
  }
});

test("같은 화면 이동 단추는 그 템플릿 안 블록을 가리키고, 블록 번호는 겹치지 않는다", () => {
  const seen = new Set();
  for (const l of EXTRA_LAYOUTS) {
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

test("업종·분위기·기본색이 등록표 규칙에 맞고, 118은 어두운 테마", () => {
  for (const l of EXTRA_LAYOUTS) {
    assert.ok(l.industries.length && l.industries.every((i) => INDUSTRIES.includes(i)), l.id);
    assert.ok(COLOR_PRESETS.some((c) => c.id === l.defaultColor), l.id);
    assert.match(l.name, /^11[6-8]\. .+ 스타일$/);
  }
  assert.equal(EXTRA_LAYOUTS.find((l) => l.id === "street-night").shape.mode, "dark");
});
