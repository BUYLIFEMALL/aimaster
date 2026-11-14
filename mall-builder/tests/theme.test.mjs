import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_THEME, STEPS, buildPalette, hexToOklch, readTheme, themeStyle, validateTheme } from "../src/lib/theme.ts";

test("기본 테마는 CSS 변수를 하나도 내보내지 않는다(화면 변화 0)", () => {
  assert.deepEqual(themeStyle(DEFAULT_THEME), {});
  assert.deepEqual(themeStyle(readTheme(null)), {});
  assert.deepEqual(themeStyle(readTheme({})), {});
});

test("틀린 값은 기본값으로 읽는다", () => {
  const t = readTheme({ primary: "red", bg: "#FFF", radius: "huge", button: "neon", image_ratio: "2:1" });
  assert.deepEqual(t, DEFAULT_THEME);
  assert.equal(readTheme({ primary: " #DC2626 " }).primary, "#dc2626");
  assert.deepEqual(readTheme([]), DEFAULT_THEME);
});

test("저장 전 검사는 한국어 오류를 돌려준다", () => {
  assert.deepEqual(validateTheme({ primary: "#dc2626", radius: "md", button: "flat", image_ratio: "4:5" }), []);
  assert.equal(validateTheme("x").length, 1);
  const errs = validateTheme({ primary: "빨강", bg: 3, radius: "huge", button: "x", image_ratio: "9:16" });
  assert.equal(errs.length, 5);
  assert.match(errs[0], /포인트색/);
});

test("OKLCH 변환 — 흰색·검은색·파랑", () => {
  const [lw, cw] = hexToOklch("#ffffff");
  assert.ok(Math.abs(lw - 1) < 0.001 && cw < 0.001);
  const [lb] = hexToOklch("#000000");
  assert.ok(lb < 0.001);
  const [l, c, h] = hexToOklch("#2563eb");
  assert.ok(Math.abs(l - 0.546) < 0.01, `L=${l}`);
  assert.ok(c > 0.2 && h > 255 && h < 270, `C=${c} H=${h}`);
});

test("팔레트 — 11단계, 600은 고른 색, 밝은 단계일수록 밝다", () => {
  const p = buildPalette("#dc2626");
  assert.deepEqual(Object.keys(p).map(Number), [...STEPS]);
  const [l6, c6] = hexToOklch("#dc2626");
  assert.equal(p[600], `oklch(${Math.round(l6 * 10000) / 100}% ${Math.round(c6 * 10000) / 10000} ${p[600].split(" ")[2].replace(")", "")})`);
  const ls = STEPS.map((s) => parseFloat(p[s].slice(6)));
  for (let i = 1; i < ls.length; i++) assert.ok(ls[i] < ls[i - 1], `${STEPS[i]} 단계가 더 어두워야 함`);
  // 회색을 고르면 채도 0에 가까운 팔레트
  const g = buildPalette("#6b7280");
  assert.ok(STEPS.every((s) => parseFloat(g[s].split(" ")[1]) < 0.05));
});

test("다른 테마는 필요한 변수만 덮어쓴다", () => {
  const v = themeStyle(readTheme({ primary: "#059669", bg: "#ffffff", radius: "sm", button: "flat", image_ratio: "4:5" }));
  assert.equal(Object.keys(v).filter((k) => k.startsWith("--color-blue-")).length, 11);
  assert.equal(v["--mall-primary-600"], v["--color-blue-600"]);
  assert.equal(v["--mall-bg"], "#ffffff");
  assert.equal(v["--mall-radius"], "0.25rem");
  assert.equal(v["--mall-btn-depth"], "0px");
  assert.equal(v["--mall-img-ratio"], "4 / 5");
  // 바탕색만 바꾸면 그것만
  assert.deepEqual(themeStyle(readTheme({ bg: "#fffbeb" })), { "--mall-bg": "#fffbeb" });
});

test("색 칸을 비우면 기본색으로(검사 통과, 읽으면 기본값)", () => {
  assert.deepEqual(validateTheme({ primary: "", bg: "" }), []);
  assert.deepEqual(readTheme({ primary: "", bg: "" }), DEFAULT_THEME);
  assert.equal(validateTheme({ primary: "#12" }).length, 1);
});

// I23 어두운 테마(2026-11-15) — 밝기 칸 mode: light(기본, 저장 안 함 = 화면 변화 0) / dark
test("밝기: 기본은 밝게, 어둡게는 읽고 검사를 통과, 틀린 값은 오류", async () => {
  const { readTheme, validateTheme, DEFAULT_THEME } = await import("../src/lib/theme.ts");
  assert.equal(DEFAULT_THEME.mode, "light");
  assert.equal(readTheme({}).mode, "light");
  assert.equal(readTheme({ mode: "dark" }).mode, "dark");
  assert.equal(readTheme({ mode: "x" }).mode, "light");
  assert.deepEqual(validateTheme({ mode: "dark" }), []);
  assert.equal(validateTheme({ mode: "night" }).length, 1);
});

test("어둡게: 회색 단계를 뒤집고(진한 글자 → 밝게), 포인트색 옅은 단계도 뒤집되 단추 색(--mall-primary)은 그대로", async () => {
  const { themeStyle, readTheme, buildPalette } = await import("../src/lib/theme.ts");
  const light = themeStyle(readTheme({ primary: "#059669" }));
  assert.equal(light["--color-slate-900"], undefined);
  const v = themeStyle(readTheme({ primary: "#059669", mode: "dark", bg: "#0c0a09" }));
  assert.equal(v["--color-slate-900"], "oklch(96.8% 0.007 247.896)"); // 원래 slate-100(거울: 900↔100, 950↔50)
  assert.equal(v["--color-slate-50"], "oklch(12.9% 0.042 264.695)"); // 원래 slate-950
  assert.equal(v["--color-gray-700"], "oklch(87.2% 0.01 258.338)"); // 원래 gray-300
  const p = buildPalette("#059669");
  assert.equal(v["--color-blue-50"], p[950]);
  assert.equal(v["--color-blue-600"], p[400]);
  assert.equal(v["--mall-primary-600"], p[600]);
  assert.ok(v["--mall-surface"]);
  // 기본 포인트색이어도 어둡게면 옅은 단계를 뒤집는다
  const d2 = themeStyle(readTheme({ mode: "dark", bg: "#0c0a09" }));
  assert.ok(d2["--color-blue-50"]);
});

test("색 대비 경고: 바탕 밝기와 밝기 칸이 어긋나면 알림", async () => {
  const { contrastWarning, readTheme } = await import("../src/lib/theme.ts");
  assert.equal(contrastWarning(readTheme({})), null);
  assert.equal(contrastWarning(readTheme({ mode: "dark", bg: "#0c0a09" })), null);
  assert.match(contrastWarning(readTheme({ bg: "#111111" })), /어둡게/);
  assert.match(contrastWarning(readTheme({ mode: "dark", bg: "#ffffff" })), /밝게/);
});
