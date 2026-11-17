import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// FRONT-20261116-10 — 어두운 테마(몰 테마 밝기 = 어둡게)에서 공통 머리글이 흰 바탕(bg-white/95)으로 남고
// 글자(slate)만 밝게 뒤집혀 상점 이름이 1.02:1로 안 보이던 문제의 회귀 시험
const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const frame = readFileSync(new URL("../src/app/s/[store]/(shop)/shop-frame.tsx", import.meta.url), "utf8");
const BS = String.fromCharCode(92); // 역슬래시 — CSS 선택자에서 「/」는 「\/」로 적는다
const ruleBody = (cls) => {
  const head = `[data-mall-mode="dark"] .${cls.replace("/", BS + "/")} { background-color: `;
  const at = css.indexOf(head);
  return at < 0 ? null : css.slice(at + head.length, css.indexOf("}", at));
};

test("어두운 테마에서 흰 바탕 클래스(bg-white·/90·/95)는 모두 어두운 면(--mall-surface)으로 바뀐다", () => {
  for (const cls of ["bg-white", "bg-white/90", "bg-white/95"]) assert.match(ruleBody(cls) ?? "", /var\(--mall-surface\)/, cls);
  // 반투명 단계는 원래 투명도를 그대로 지킨다
  assert.equal(ruleBody("bg-white/95").trim(), "color-mix(in oklab, var(--mall-surface) 95%, transparent);");
});

test("공통 머리글(shop-frame)이 쓰는 흰 바탕 클래스는 전부 어두운 테마 규칙이 있다", () => {
  const used = [...new Set([...frame.matchAll(/\bbg-white(?:\/\d+)?(?=[\s"])/g)].map((m) => m[0]))];
  assert.ok(used.includes("bg-white/95"), "머리글 바탕 클래스가 바뀌었으면 이 시험과 globals.css 규칙을 함께 맞출 것");
  for (const cls of used) assert.notEqual(ruleBody(cls), null, `규칙 없음: ${cls}`);
});

// FRONT-20261117-02 — 파란 단추(bg-blue-600/700 + 흰 글자)는 어둡게에서 --color-blue-600이 400 단계로 뒤집혀
// 흰 글자 대비가 기본 파랑 2.63:1로 떨어지던 문제. 뒤집지 않는 단추 색(--mall-primary-600 = 고른 포인트색)으로 되돌린다
test("어두운 테마의 파란 단추 바탕은 단추 색(--mall-primary-600) — 어둡게 범위 안에서만, 흰 글자와 짝일 때만", () => {
  const rule = '[data-mall-mode="dark"] :is(.bg-blue-600, .bg-blue-700).text-white { background-color: var(--mall-primary-600); }';
  assert.ok(css.includes(rule), "규칙 없음 또는 선택자가 바뀜");
  // 어둡게 범위 밖에서 같은 클래스를 덮는 규칙은 없다(밝은 테마·관리자 화면 그대로)
  assert.equal(css.split("\n").filter((l) => /\.bg-blue-(600|700)/.test(l) && !l.startsWith('[data-mall-mode="dark"]')).length, 0);
});

test("색 12가지 모두 어두운 테마 파란 단추의 흰 글자 대비가 나빠지지 않는다(후 = 밝은 테마 단추와 같은 값)", async () => {
  const { themeStyle, buildPalette, DEFAULT_THEME } = await import("../src/lib/theme.ts");
  const src = readFileSync(new URL("../src/lib/builder/templates.ts", import.meta.url), "utf8");
  const primaries = [...src.matchAll(/\{ id: "\w+", name: "[^"]+", primary: ("#[0-9a-f]{6}"|DEFAULT_THEME\.primary)/g)].map((m) => (m[1].startsWith('"') ? m[1].slice(1, -1) : DEFAULT_THEME.primary));
  assert.equal(primaries.length, 12);
  // oklch(L% C H) → 상대 휘도 → 흰 글자 대비 (1 + 0.05) / (Y + 0.05)
  const white = (str) => {
    const [l, c, h] = str.match(/oklch\(([\d.]+)% ([\d.]+) ([\d.]+)\)/).slice(1).map(Number);
    const L = l / 100, a = c * Math.cos((h * Math.PI) / 180), b = c * Math.sin((h * Math.PI) / 180);
    const x = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, y = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, z = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const rgb = [4.0767416621 * x - 3.3077115913 * y + 0.2309699292 * z, -1.2684380046 * x + 2.6097574011 * y - 0.3413193965 * z, -0.0041960863 * x - 0.7034186147 * y + 1.707614701 * z].map((v) => Math.min(1, Math.max(0, v)));
    return 1.05 / (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2] + 0.05);
  };
  for (const primary of primaries) {
    const dark = themeStyle({ ...DEFAULT_THEME, primary, mode: "dark" });
    const before = white(dark["--color-blue-600"]);
    const after = white(dark["--mall-primary-600"]);
    assert.ok(after > before, `${primary}: ${before.toFixed(2)} → ${after.toFixed(2)}`);
    assert.ok(Math.abs(after - white(buildPalette(primary)[600])) < 0.05, `${primary}: 밝은 테마 단추와 다름`);
  }
});
