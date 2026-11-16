import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DEFAULT_THEME, themeStyle } from "../src/lib/theme.ts";

// FRONT-20261116-06 — 타임세일 「어두운 띠」 스킨이 몰 테마 「어둡게」에서 바탕이 밝게 뒤집혀 흰 제목이 안 보이던 문제의 회귀 시험
// 원인: themeStyle()이 어둡게일 때 slate·gray·blue 색 변수를 뒤집는다 → 그 계열 클래스(bg-slate-900 등)를 어두운 띠에 쓰면 안 된다
const src = readFileSync(new URL("../src/app/s/[store]/home-slots.tsx", import.meta.url), "utf8");
const block = src.slice(src.indexOf('if (b.type === "timesale")'), src.indexOf('if (b.type === "reviews")'));
// `dark ? "…"` 의 참 쪽 문자열(어두운 띠일 때만 쓰는 클래스)
const darkClasses = [...block.matchAll(/dark \? "([^"]*)"/g)].map((m) => m[1]);

test("원인 확인: 어둡게 테마는 slate 변수를 뒤집지만 white·rose는 건드리지 않는다", () => {
  const v = themeStyle({ ...DEFAULT_THEME, mode: "dark" });
  assert.match(v["--color-slate-900"], /^oklch\(9\d/); // 900이 밝은 색(96.8%)으로
  for (const k of Object.keys(v)) assert.doesNotMatch(k, /--color-(white|rose)/, k);
});

test("어두운 띠 쪽 클래스는 뒤집히는 색 계열(slate·gray·blue)을 쓰지 않고 고정 바탕색을 쓴다", () => {
  assert.ok(darkClasses.length >= 5, `어두운 띠 클래스 ${darkClasses.length}개`);
  for (const c of darkClasses) assert.doesNotMatch(c, /(?:^|\s)(?:[a-z:]+:)?(?:bg|text|border)-(?:slate|gray|blue)-\d/, `뒤집히는 색: 「${c}」`);
  assert.ok(darkClasses.some((c) => c.includes("bg-[#0f172a]")), "고정 바탕색 없음");
  assert.ok(darkClasses.some((c) => c.includes("text-white")), "흰 제목 없음");
});

// 빨간 테두리(rose) 쪽 문자열 — `dark ? "…" : "…"` 의 거짓 쪽
const roseClasses = [...block.matchAll(/dark \? "[^"]*" : "([^"]*)"/g)].map((m) => m[1]);
const D = "in-data-[mall-mode=dark]:";

test("빨간 테두리(rose): 밝은 테마 색은 그대로, 몰 테마 「어둡게」일 때만 바탕·제목·설명·남은 시간·카운트다운을 보정", () => {
  const all = roseClasses.join(" ");
  for (const c of ["border-2 border-rose-500 bg-rose-50/30", "text-rose-700", "text-slate-600", "text-slate-500", "text-rose-600"]) assert.ok(all.includes(c), `밝은 테마 색 사라짐: ${c}`);
  for (const c of ["bg-rose-950/40", "text-rose-300", "text-[#cbd5e1]", "text-[#94a3b8]", "text-rose-400"]) assert.ok(all.includes(D + c), `어둡게 보정 없음: ${c}`);
  // 보정은 반드시 어둡게 한정 변형으로만(밝은 테마 클래스를 바꾸지 않음)
  for (const c of roseClasses) for (const tok of c.split(/\s+/)) if (/rose-(950|300|400)|#cbd5e1|#94a3b8/.test(tok)) assert.ok(tok.startsWith(D), `어둡게 한정이 아닌 보정: ${tok}`);
});

// WCAG 대비 — 어두운 띠 바탕 위 제목·설명·「남은 시간」 글자·카운트다운
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test("어두운 띠 글자색은 바탕 #0f172a 위에서 대비 4.5 이상(제목·설명·남은 시간·카운트다운)", () => {
  const bg = "#0f172a";
  for (const [name, fg] of [["제목 white", "#ffffff"], ["설명", "#cbd5e1"], ["남은 시간 글자", "#94a3b8"], ["카운트다운 rose-400", "#fb7185"]]) {
    assert.ok(ratio(fg, bg) >= 4.5, `${name} ${ratio(fg, bg).toFixed(2)}`);
  }
  for (const c of ["text-[#cbd5e1]", "text-[#94a3b8]"]) assert.ok(darkClasses.some((x) => x.includes(c)), c);
});

test("어둡게 + 빨간 테두리: 보정 글자색이 어두운 바탕 위에서 대비 4.5 이상", () => {
  // 바탕 = rose-950(#4d0218) 40%를 어두운 몰 바탕(#0c0a09) 위에 겹친 색, 남은 시간 상자 = 어둡게 면(약 #1b1d22)
  const box = "#26070f", surface = "#1b1d22";
  for (const [name, fg, bg] of [["제목 rose-300", "#ffa1ad", box], ["설명", "#cbd5e1", box], ["남은 시간 글자", "#94a3b8", surface], ["카운트다운 rose-400", "#ff637e", surface]]) {
    assert.ok(ratio(fg, bg) >= 4.5, `${name} ${ratio(fg, bg).toFixed(2)}`);
  }
});
