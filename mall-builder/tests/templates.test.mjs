import { test } from "node:test";
import assert from "node:assert/strict";
import { COLOR_PRESETS, INDUSTRIES, LAYOUTS, applyTemplate, layoutsFor } from "../src/lib/builder/templates.ts";
import { validateDoc } from "../src/lib/blocks.ts";
import { validateTheme, readTheme } from "../src/lib/theme.ts";
import { validateFooter, validateHeader, validatePopup } from "../src/lib/builder/frame.ts";
import { validateDetail, validateList } from "../src/lib/builder/pages.ts";

const ctx = { now: Date.parse("2026-11-14T00:00:00Z"), storeName: "가나<몰> & 상사" };

test("등록표 — 레이아웃 4종 이상 × 색 12개, 번호 겹침 없음", () => {
  assert.ok(LAYOUTS.length >= 4);
  assert.equal(COLOR_PRESETS.length, 12);
  assert.equal(new Set(LAYOUTS.map((l) => l.id)).size, LAYOUTS.length);
  assert.equal(new Set(COLOR_PRESETS.map((c) => c.id)).size, COLOR_PRESETS.length);
  for (const l of LAYOUTS) assert.ok(COLOR_PRESETS.some((c) => c.id === l.defaultColor), `${l.id} 기본 색`);
});

test("모든 레이아웃 × 모든 색 조합이 저장 검사를 그대로 통과한다(등록표 실수 방지)", () => {
  for (const l of LAYOUTS) {
    for (const c of COLOR_PRESETS) {
      const t = applyTemplate(l.id, c.id, ctx);
      const where = `${l.id}/${c.id}`;
      assert.deepEqual(validateTheme(t.theme), [], where);
      assert.equal(readTheme(t.theme).primary, c.primary, where);
      const home = validateDoc(t.home);
      assert.ok(home.ok, `${where}: ${home.error}`);
      assert.deepEqual(home.value, t.home, `${where}: 저장 검사가 블록을 바꾸면 안 됨`);
      for (const [name, v] of [["header", validateHeader(t.header)], ["footer", validateFooter(t.footer)], ["popup", validatePopup(t.popup)], ["list", validateList(t.list)], ["detail", validateDetail(t.detail)]]) {
        assert.ok(v.ok, `${where} ${name}: ${v.error}`);
      }
    }
  }
});

test("모르는 레이아웃은 null, 모르는 색은 레이아웃 기본 색", () => {
  assert.equal(applyTemplate("nope", "blue", ctx), null);
  const t = applyTemplate("market-daily", "nope", ctx);
  assert.equal(t.theme.primary, COLOR_PRESETS.find((c) => c.id === "orange").primary);
  // 타임세일 끝 시각은 고른 때로부터 7일 뒤
  const ts = t.home.blocks.find((b) => b.type === "timesale");
  assert.equal(ts.settings.ends_at, "2026-11-21T00:00:00.000Z");
});

test("업종으로 거르기 — 모든 업종에 템플릿이 하나 이상", () => {
  for (const i of INDUSTRIES) assert.ok(layoutsFor(i).length >= 1, i);
  assert.equal(layoutsFor("").length, LAYOUTS.length);
});
