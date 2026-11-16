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
