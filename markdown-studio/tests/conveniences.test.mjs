// 2026-10-17 v1.12 편의 기능(예상 읽기 시간·템플릿 미니어처) 단위 테스트
import test from "node:test";
import assert from "node:assert/strict";
import { readingMinutes, readingLabel } from "../src/lib/documents/readingTime.ts";
import { templatePreviewLines } from "../src/lib/documents/templatePreview.ts";
import { nextPinColor, sanitizePinColors, PIN_COLORS } from "../src/lib/documents/model.ts";

test("예상 읽기 시간: 공백 제외 500자/분, 1분 미만은 1분", () => {
  assert.equal(readingMinutes(""), 0);
  assert.equal(readingMinutes("   \n "), 0);
  assert.equal(readingMinutes("가"), 1);
  assert.equal(readingMinutes("가".repeat(500)), 1);
  assert.equal(readingMinutes("가".repeat(501)), 2);
  assert.equal(readingMinutes("가 ".repeat(1000)), 2);
  assert.equal(readingLabel(""), "읽기 0분");
  assert.equal(readingLabel("가".repeat(1420)), "약 3분 소요");
});

test("템플릿 미니어처: 줄 종류 구분·코드 안쪽 생략·표 구분선 생략·최대 줄 수", () => {
  const md = "# 회의록\n\n## 안건\n- 첫째\n1. 둘째\n- [ ] 할 일\n| 이름 | 역할 |\n|---|---|\n> 메모\n```js\nconst a = 1;\n```\n본문";
  const lines = templatePreviewLines(md, 20);
  assert.deepEqual(lines.map(l => l.kind), ["h", "h", "list", "list", "check", "table", "quote", "code", "text"]);
  assert.equal(lines[0].level, 1);
  assert.equal(lines[1].level, 2);
  assert.equal(lines[5].text, "이름 · 역할");
  assert.equal(lines[7].text, "js");
  assert.equal(templatePreviewLines(md).length, 6);
  assert.deepEqual(templatePreviewLines(""), []);
  // 빈 항목·빈 표 칸·빈 체크도 모양이 보이게
  const blank = templatePreviewLines("-\n1.\n- [ ]\n| | |");
  assert.deepEqual(blank.map(l => [l.kind, l.text]), [["list", "항목"], ["list", "항목"], ["check", "할 일"], ["table", "· · ·"]]);
});

test("v1.14 색깔 꼬리표: 없음→빨강→노랑→초록→파랑→보라→없음 순환", () => {
  const seen = [];
  let c;
  for (let i = 0; i < 6; i++) { c = nextPinColor(c); seen.push(c); }
  assert.deepEqual(seen, [...PIN_COLORS, undefined]);
});

test("v1.14 색깔 꼬리표 정리: 고정된 문서·정해진 색만 남김", () => {
  assert.deepEqual(sanitizePinColors({ a: "red", b: "blue", c: "pink", d: 3 }, ["a", "c", "d"]), { a: "red" });
  assert.deepEqual(sanitizePinColors(null, ["a"]), {});
  assert.deepEqual(sanitizePinColors("red", ["a"]), {});
});

test("v1.15 테마 스크립트: 라이트·다크·자동(컴퓨터 설정 변경도 따라감, 자동이 아니면 무시)", async () => {
  const { THEME_INIT_SCRIPT, THEME_KEY } = await import("../src/lib/theme.ts");
  const run = (stored, systemDark) => {
    const store = { [THEME_KEY]: stored };
    const listeners = [];
    const q = { matches: systemDark, addEventListener: (_e, f) => listeners.push(f) };
    const root = { dataset: {} };
    const env = { window: { matchMedia: () => q }, document: { documentElement: root }, localStorage: { getItem: k => store[k] ?? null } };
    new Function("window", "document", "localStorage", THEME_INIT_SCRIPT)(env.window, env.document, env.localStorage);
    return { root, q, store, fire: () => listeners.forEach(f => f()) };
  };
  assert.equal(run(null, true).root.dataset.theme, undefined);
  assert.equal(run("light", true).root.dataset.theme, undefined);
  assert.equal(run("dark", false).root.dataset.theme, "dark");
  assert.equal(run("auto", true).root.dataset.theme, "dark");
  const auto = run("auto", false);
  assert.equal(auto.root.dataset.theme, undefined);
  auto.q.matches = true; auto.fire();
  assert.equal(auto.root.dataset.theme, "dark");
  auto.store[THEME_KEY] = "light"; auto.fire();
  assert.equal(auto.root.dataset.theme, undefined);
});

test("v1.16 꼬리표 이름: 정해진 색만·공백 제거·10자·빈 이름 제외, 표시 이름", async () => {
  const { sanitizePinNames, pinLabel } = await import("../src/lib/documents/model.ts");
  assert.deepEqual(sanitizePinNames({ red: "  급함 ", blue: "", pink: "x", green: "가나다라마바사아자차카", amber: 3 }), { red: "급함", green: "가나다라마바사아자차" });
  assert.deepEqual(sanitizePinNames(null), {});
  assert.equal(pinLabel("red", { red: "급함" }), "급함");
  assert.equal(pinLabel("blue", { red: "급함" }), "파랑");
});

test("v1.18 휴지통 경과일: 날짜 차이·잘못된 값은 0", async () => {
  const { trashAgeDays, TRASH_OLD_DAYS } = await import("../src/lib/documents/model.ts");
  const now = new Date("2026-11-20T12:00:00Z");
  assert.equal(trashAgeDays("2026-11-20T01:00:00Z", now), 0);
  assert.equal(trashAgeDays("2026-10-21T12:00:00Z", now), 30);
  assert.ok(trashAgeDays("2026-10-21T12:00:00Z", now) >= TRASH_OLD_DAYS);
  assert.equal(trashAgeDays("2026-10-22T12:00:01Z", now), 28);
  assert.equal(trashAgeDays("이상한 값", now), 0);
  assert.equal(trashAgeDays("2027-01-01T00:00:00Z", now), 0);
});
