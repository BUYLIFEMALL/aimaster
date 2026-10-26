// 📅 주간 리포트(D) — 요일 열쇠·놓친 날·같은 주 막기·글 만들기·AI 프롬프트
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildWeeklyPrompt, buildWeeklyReport, shouldSendWeekly, topRepeatDrops, weeklyKey } from "../extension/lib/weekly.js";
import { COLUMNS } from "../extension/lib/sheet.js";

// 2026-10-26은 월요일(KST)
const MON = Date.parse("2026-10-26T03:00:00Z"); // KST 12시
const WED = Date.parse("2026-10-28T03:00:00Z");
const SUN_LATE = Date.parse("2026-11-01T14:30:00Z"); // KST 11-01(일) 23:30
const SUN_NEXT = Date.parse("2026-11-01T15:30:00Z"); // KST 11-02(월) 00:30

test("요일 열쇠: 그 주의 고른 요일 날짜(KST)", () => {
  assert.equal(weeklyKey(MON, 1), "2026-10-26");
  assert.equal(weeklyKey(WED, 1), "2026-10-26");
  assert.equal(weeklyKey(SUN_LATE, 1), "2026-10-26");
  assert.equal(weeklyKey(SUN_NEXT, 1), "2026-11-02");
  assert.equal(weeklyKey(MON, 3), "2026-10-21");
});

const hist = [{ at: "2026-10-20T03:00:00Z", complexes: [] }, { at: "2026-10-26T03:00:00Z", complexes: [] }];
test("보낼 때: 꺼짐·기록 부족·같은 주는 보내지 않고, 놓친 날은 그 주 다음 수집 때", () => {
  assert.equal(shouldSendWeekly({ enabled: false, day: 1 }, null, hist, MON), null);
  assert.equal(shouldSendWeekly({ enabled: true, day: 1 }, null, hist.slice(0, 1), MON), null);
  assert.equal(shouldSendWeekly({ enabled: true, day: 1 }, null, hist, MON), "2026-10-26");
  assert.equal(shouldSendWeekly({ enabled: true, day: 1 }, "2026-10-26", hist, WED), null);
  assert.equal(shouldSendWeekly({ enabled: true, day: 1 }, "2026-10-19", hist, WED), "2026-10-26");
});

const snap = (at: string, total: number, avg: number, ev = { new: 0, priceDown: 0, priceUp: 0, gone: 0 }) => ({
  at, complexes: [{ name: "백송마을5단지", total, events: ev, trades: { 매매: { avg, tradeGapAvg: 4 } } }], realtors: [],
});
const row = (url: string, price: string) => { const r = COLUMNS.map(() => ""); r[COLUMNS.indexOf("네이버 매물 주소")] = url; r[COLUMNS.indexOf("단지명")] = "백송마을5단지"; r[COLUMNS.indexOf("가격(만 원)")] = price; r[COLUMNS.indexOf("휴대폰")] = "010-1234-5678"; return r; };

test("여러 번 내린 매물 상위", () => {
  const log = [
    { at: "2026-10-20T00:00:00Z", type: "priceDown", row: row("u1", "8억") },
    { at: "2026-10-25T00:00:00Z", type: "priceDown", row: row("u1", "7억 8,000") },
    { at: "2026-10-25T00:00:00Z", type: "priceDown", row: row("u2", "6억") },
  ];
  const d = topRepeatDrops(log);
  assert.equal(d.length, 1);
  assert.deepEqual([d[0].url, d[0].drops, d[0].price], ["u1", 2, "7억 8,000"]);
});

test("리포트 글: 단지 줄·합계·카톡 200자·전화번호 없음·AI 줄", () => {
  const h = [snap("2026-10-19T03:00:00Z", 40, 50000), snap("2026-10-26T03:00:00Z", 44, 51000, { new: 3, priceDown: 1, priceUp: 0, gone: 1 })];
  const log = [{ at: "2026-10-20T00:00:00Z", type: "priceDown", row: row("u1", "8억") }, { at: "2026-10-25T00:00:00Z", type: "priceDown", row: row("u1", "7억") }];
  const r = buildWeeklyReport({ history: h, eventLog: log, states: {}, now: MON, aiText: "**이번 주** 매물이 늘었어요." })!;
  assert.match(r.text, /📅 \[주간 리포트\] 10\.19~10\.26/);
  assert.match(r.text, /매물 44건\(\+4\) · 매매 평균 5억 1,000만 원\(\+2%\)/);
  assert.match(r.text, /🆕 3 · 📉 1 · 📈 0 · 👋 1 · 실거래 대비 \+4%/);
  assert.match(r.text, /여러 번 내린 매물/);
  assert.match(r.text, /🤖 AI 주간 요약\n이번 주 매물이 늘었어요\./);
  assert.equal(r.text.includes("010-1234-5678"), false);
  assert.ok(r.kakao.length <= 200);
  assert.match(r.html, /<b>🤖 AI 주간 요약<\/b>/);
  assert.equal(buildWeeklyReport({ history: [], eventLog: [], states: {} }), null);
});

test("기록이 짧으면 n일치 기준을 밝힘", () => {
  const h = [snap("2026-10-24T03:00:00Z", 40, 50000), snap("2026-10-26T03:00:00Z", 41, 50000)];
  assert.match(buildWeeklyReport({ history: h, eventLog: [], states: {}, now: MON })!.text, /기록 2일치 기준/);
});

test("주간 프롬프트: 당해 연도·400자·투자 권유 금지", () => {
  const p = buildWeeklyPrompt({ a: 1 }, 2026);
  assert.match(p, /2026년/);
  assert.match(p, /400자/);
  assert.match(p, /투자 권유/);
});
