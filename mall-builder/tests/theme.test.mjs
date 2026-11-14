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
