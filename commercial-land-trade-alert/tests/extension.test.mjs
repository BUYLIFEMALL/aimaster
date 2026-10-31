import { test } from "node:test";
import assert from "node:assert/strict";
import { articleUrl, isWatchableUrl, matchesTarget, normalizeArticle, parseKoreanPrice } from "../extension/lib/listing.js";
import { compareTarget, filterEvents } from "../extension/lib/compare.js";
import { buildKakaoText, buildSummary, kakaoLinkFor } from "../extension/lib/notify.js";
import { kindsText, parseWatchUrl } from "../src/lib/watchTargets.ts";

const BASE = "https://new.land.naver.com/offices?ms=2AJhyo,3zk74s,16&a=SG&e=RETAIL";
const RAW = { articleNo: "111", realEstateTypeCode: "SG", realEstateTypeName: "상가", tradeTypeCode: "B2", tradeTypeName: "월세", dealOrWarrantPrc: "5,000", rentPrc: "380", area1: 163, area2: 108, floorInfo: "1/6", articleConfirmYmd: "20261030", realtorName: "역삼공인중개사사무소02)555-1234" };

test("금액 글자를 만 원으로 읽는다", () => {
  assert.equal(parseKoreanPrice("63억 3,000"), 633000);
  assert.equal(parseKoreanPrice("43억"), 430000);
  assert.equal(parseKoreanPrice("5,000"), 5000);
  assert.equal(parseKoreanPrice(""), null);
});

test("유형별 면적 기준을 맞춘다", () => {
  const sg = normalizeArticle(RAW, "t1", BASE);
  assert.equal(sg.area, 108);
  assert.equal(sg.areaLabel, "전용");
  assert.equal(sg.subArea, 163);
  const gm = normalizeArticle({ ...RAW, realEstateTypeCode: "GM", area1: 253, area2: 676 }, "t1", BASE);
  assert.equal(gm.area, 676);
  assert.equal(gm.areaLabel, "연면적");
  assert.equal(gm.subArea, 253);
  const tj = normalizeArticle({ ...RAW, realEstateTypeCode: "TJ", area1: 347, area2: 0 }, "t1", BASE);
  assert.equal(tj.area, 347);
  assert.equal(tj.areaLabel, "토지");
});

test("월세 표기와 전화번호 제거, 매물 주소", () => {
  const i = normalizeArticle(RAW, "t1", BASE);
  assert.equal(i.priceText, "5,000만 / 월 380만");
  assert.ok(!/\d{3,}-\d{4}/.test(i.realtor));
  assert.match(articleUrl(BASE, "111"), /articleNo=111/);
});

test("감시 조건으로 거른다", () => {
  const i = normalizeArticle(RAW, "t1", BASE);
  assert.equal(matchesTarget(i, { trade_types: ["A1"] }), false);
  assert.equal(matchesTarget(i, { trade_types: ["B2"], price_max: 4000 }), false);
  assert.equal(matchesTarget(i, { trade_types: ["B2"], area_min: 100, area_max: 200 }), true);
  assert.equal(matchesTarget(i, { area_min: 200 }), false);
});

const item = (over = {}) => ({ ...normalizeArticle(RAW, "t1", BASE), ...over });

test("첫 수집은 기준만 저장한다", () => {
  const r = compareTarget(undefined, [item()]);
  assert.equal(r.firstRun, true);
  assert.equal(r.events.length, 0);
});

test("가격 내림·오름·신규·사라짐", () => {
  const s = compareTarget(undefined, [item(), item({ no: "222" })]).state;
  const r = compareTarget(s, [item({ price: 4000, priceText: "4,000만" }), item({ no: "333", price: 9000, priceText: "9,000만" })]);
  const types = r.events.map((e) => e.type).sort();
  assert.deepEqual(types, ["gone", "new", "priceDown"]);
  assert.equal(r.events.find((e) => e.type === "priceDown").prevPriceText, "5,000만 / 월 380만");
});

test("끝까지 못 읽은 회차는 사라짐을 판단하지 않고, 옛 확인 매물을 신규로 보지 않는다", () => {
  const now = Date.parse("2026-10-31T03:00:00Z");
  const s = compareTarget(undefined, [item({ no: "1" })], { now }).state;
  const r = compareTarget(s, [item({ no: "2", confirmYmd: "20260901" }), item({ no: "3", confirmYmd: "20261030" })], { now, complete: false });
  assert.deepEqual(r.events.map((e) => [e.type, e.item.no]), [["new", "3"]]);
  assert.ok(r.state.items["1"], "못 본 매물은 유지");
  assert.ok(r.state.items["2"], "옛 매물은 기준에 저장");
});

test("끝까지 못 읽은 기준 뒤 끝까지 읽어도 옛 매물을 신규로 보지 않는다", () => {
  const now = Date.parse("2026-10-31T03:00:00Z");
  const s = compareTarget(undefined, [item({ no: "1" })], { now, complete: false }).state;
  const r = compareTarget(s, [item({ no: "1" }), item({ no: "2", confirmYmd: "20260901" }), item({ no: "3", confirmYmd: "20261030", price: 7000 })], { now, complete: true });
  assert.deepEqual(r.events.map((e) => [e.type, e.item.no]), [["new", "3"]]);
  const next = compareTarget(r.state, [item({ no: "1" }), item({ no: "2", confirmYmd: "20260901" }), item({ no: "3", confirmYmd: "20261030", price: 7000 }), item({ no: "4", confirmYmd: "20260901", price: 8000 })], { now, complete: true });
  assert.deepEqual(next.events.map((e) => [e.type, e.item.no]), [["new", "4"]]);
});

test("같은 매물을 다시 올리면 알리지 않는다", () => {
  const s = compareTarget(undefined, [item({ no: "1" })]).state;
  const r = compareTarget(s, [item({ no: "9" })]);
  assert.deepEqual(r.events.map((e) => e.type), ["relisted"]);
  assert.equal(filterEvents(r.events, { notifyNew: true, notifyDrop: true, notifyRise: true, notifyGone: true }).length, 0);
});

test("알림 기준을 지킨다", () => {
  const ev = [{ type: "new" }, { type: "priceDown" }, { type: "priceUp" }, { type: "gone" }];
  assert.deepEqual(filterEvents(ev, { notifyNew: true, notifyDrop: true, notifyRise: false, notifyGone: false }).map((e) => e.type), ["new", "priceDown"]);
});

test("알림 글과 카톡 제한", () => {
  const per = [{ name: "역삼동 상가", total: 3, firstRun: false, complete: false, pagesRead: 15, events: [{ type: "new", item: item() }] }];
  const text = buildSummary(per);
  assert.match(text, /역삼동 상가/);
  assert.match(text, /앞 15페이지만/);
  assert.match(text, /articleNo=111/);
  assert.ok(buildKakaoText(per).length <= 200);
  assert.match(buildKakaoText(per), /신규 1/);
  assert.match(kakaoLinkFor(per), /\/api\/go\?u=/);
});

test("감시 주소 검사", () => {
  assert.equal(isWatchableUrl(BASE), true);
  assert.equal(isWatchableUrl("https://new.land.naver.com/complexes/1"), false);
  assert.equal(isWatchableUrl("https://evil.example.com/offices?ms=1&a=SG"), false);
  const p = parseWatchUrl(`${BASE}&articleNo=99`);
  assert.equal(p.kinds, "SG");
  assert.ok(!p.url.includes("articleNo"));
  assert.equal(parseWatchUrl("https://new.land.naver.com/offices?ms=1&a=APT"), null);
  assert.equal(kindsText("SG:TJ"), "상가·토지");
});

test("시세 대비와 후보 점수", async () => {
  const { gapText, marketGap, scoreListing, daysSince } = await import("../extension/lib/score.js");
  const it = item({ kind: "SG", tradeType: "A1", price: 100000, area: 100, floor: "1/5" });
  const row = (floor, area = 100, inDong = 1) => [floor, area, 4000, inDong];
  const five = (f) => [1, 2, 3, 4, 5].map(() => row(f));
  const g = marketGap(it, { samples: { SG: five("1") } });
  assert.equal(g.pct, -17);
  assert.equal(gapText(g), "-17%(동·1층 5건)");
  assert.equal(marketGap({ ...it, tradeType: "B2" }, { samples: { SG: five("1") } }), null, "월세는 비교 안 함");
  assert.equal(marketGap(it, { samples: { SG: five("b") } }), null, "다른 층과 비교 안 함");
  assert.equal(marketGap(it, { samples: { SG: five(null) } }), null, "층 없는 거래 안 씀");
  assert.equal(marketGap({ ...it, floor: "고/15" }, { samples: { SG: five("1") } }), null, "층을 모르는 매물");
  assert.equal(marketGap({ ...it, floor: "B1/15" }, { samples: { SG: five("b") } }).floorName, "지하");
  assert.equal(marketGap(it, { samples: { SG: [1, 2, 3, 4, 5].map(() => row("1", 300)) } }), null, "면적 2배 초과 제외");
  assert.equal(marketGap(it, { samples: { SG: [row("1"), ...[1, 2, 3, 4].map(() => row("1", 100, 0))] } }).scope, "시군구");
  assert.equal(marketGap({ ...it, kind: "TJ", floor: "" }, { samples: { TJ: five(null) } }).floorName, "");
  assert.equal(marketGap(it, { SG: { median: 4000, count: 12, scope: "동" } }), null, "표본 없으면 비교 안 함");
  const s = scoreListing({ gap: g, drops: 1, ageDays: 40 });
  assert.equal(s.score, 60);
  assert.equal(s.candidate, true);
  assert.equal(s.reasons.length, 3);
  assert.equal(scoreListing({ gap: { pct: 5 } }).candidate, false);
  assert.equal(scoreListing({ drops: 9 }).score, 30);
  assert.equal(daysSince(new Date(Date.now() - 3 * 86400000).toISOString()), 3);
});

test("가격을 내릴 때마다 횟수를 센다", () => {
  let s = compareTarget(undefined, [item({ no: "1", price: 9000 })]).state;
  s = compareTarget(s, [item({ no: "1", price: 8000 })]).state;
  s = compareTarget(s, [item({ no: "1", price: 8500 })]).state;
  s = compareTarget(s, [item({ no: "1", price: 7000 })]).state;
  assert.equal(s.items["1"].drops, 2);
});

test("실거래 시세 요약", async () => {
  const { floorBucket, marketSamples, summarizeMarket } = await import("../src/lib/trades/market.ts");
  const row = (over) => ({ kind: "building", building_type: "집합", category: "판매", umd_nm: "역삼동", price_per_pyeong: 100, is_share: false, cancelled: false, ...over });
  const rows = [1, 2, 3, 4, 5].map((n) => row({ price_per_pyeong: n * 100 }));
  assert.deepEqual(summarizeMarket(rows, "역삼동").SG, { median: 300, count: 5, scope: "동" });
  assert.equal(summarizeMarket(rows, "대치동").SG.scope, "시군구");
  assert.equal(summarizeMarket(rows.slice(0, 4), "역삼동").SG, null);
  const noisy = [...rows, row({ price_per_pyeong: 99999, is_share: true }), row({ price_per_pyeong: 99999, cancelled: true }), row({ price_per_pyeong: 99999, category: "숙박" }), row({ price_per_pyeong: 99999, building_type: "일반" })];
  assert.equal(summarizeMarket(noisy, "역삼동").SG.median, 300);
  assert.equal(summarizeMarket(noisy, "역삼동").GM, null);
  assert.equal(floorBucket("-1") + floorBucket("B1") + floorBucket("1") + floorBucket("7"), "bb12");
  assert.equal(floorBucket(null), null);
  assert.deepEqual(marketSamples([row({ floor: "1", area_m2: 50 }), row({ area_m2: 0 })], "역삼동").SG, [["1", 50, 100, 1]]);
  const land = [1, 2, 3, 4, 5].map((n) => row({ kind: "land", building_type: null, category: "대", price_per_pyeong: n * 10 }));
  assert.equal(summarizeMarket([...land, row({ kind: "land", building_type: null, category: "도로", price_per_pyeong: 1 })], "역삼동").TJ.median, 30);
});

test("추정 수익률", async () => {
  const { estimateYield, yieldText } = await import("../extension/lib/score.js");
  const sale = item({ kind: "SG", tradeType: "A1", price: 100000, area: 100, floor: "1/5", rent: null });
  const rents = [1, 2, 3, 4, 5].map(() => item({ kind: "SG", tradeType: "B2", price: 10000, rent: 500, area: 100, floor: "1/9" }));
  const y = estimateYield(sale, [sale, ...rents]);
  assert.equal(y.pct, 6.7);
  assert.equal(yieldText(y), "6.7%(월세 5건)");
  assert.equal(yieldText({ pct: 15, count: 5 }), "15%(월세 5건)");
  assert.equal(yieldText({ pct: 28.5, count: 10 }), "28.5%(월세 10건) · 확인 필요");
  assert.equal(estimateYield(sale, [sale, ...rents.slice(1)]), null, "5건 미만");
  assert.equal(estimateYield({ ...sale, floor: "B1/5" }, [sale, ...rents]), null, "다른 층");
  assert.equal(estimateYield({ ...sale, floor: "고/5" }, [sale, ...rents]), null, "층 모름");
  assert.equal(estimateYield({ ...sale, kind: "TJ" }, rents), null, "토지 제외");
  assert.equal(estimateYield({ ...sale, price: 5000 }, rents), null, "보증금보다 싼 값");
});

test("AI 요약 자료와 응답 읽기", async () => {
  const { buildAiInput, readStream } = await import("../extension/lib/ai.js");
  const cols = ["유형", "가격", "후보 점수", "변동", "추정 수익률", "중개사 상호", "네이버 매물 주소"];
  const rows = Array.from({ length: 40 }, (_, i) => ["상가", `${i}억`, i, "", "", "비밀중개", "https://x"]);
  const input = buildAiInput(cols, [...rows, ["상가", "제외", "", "", "", "", ""]]);
  assert.equal(input.count, 30);
  assert.ok(input.text.split("\n")[1].includes("39억"), "점수 높은 순");
  assert.ok(!input.text.includes("비밀중개") && !input.text.includes("https://x"), "중개사·링크 제외");
  assert.ok(!input.text.includes("제외"));
  const sse = (lines) => new Response(lines.map((l) => `data: ${JSON.stringify(l)}\n\n`).join("")).body;
  const delta = (t) => ({ type: "content_block_delta", delta: { type: "text_delta", text: t } });
  assert.equal(await readStream(sse([delta("가"), delta("나"), { type: "message_delta", delta: { stop_reason: "end_turn" } }])), "가나");
  await assert.rejects(readStream(sse([{ type: "message_delta", delta: { stop_reason: "refusal" } }])));
  await assert.rejects(readStream(sse([])));
});

test("직전에 본 지역 응답을 버리고 저장 화면 기준을 쓴다", async () => {
  const { selectViewPages } = await import("../extension/lib/listing.js");
  const a = { articleList: [1] }, b = { articleList: [2] }, c = { articleList: [3] };
  const v = selectViewPages([{ cortarNo: "2653010100", body: a }, { cortarNo: "1168010100", body: b }, { cortarNo: null, body: c }]);
  assert.equal(v.cortarNo, "1168010100");
  assert.deepEqual(v.bodies, [b, c]);
  assert.equal(selectViewPages([{ cortarNo: null, body: a }]).cortarNo, null);
});

test("통계 요약과 주간 리포트", async () => {
  const { parsePriceCell, pickEvents, pushHistory, summarizeTable, trendText } = await import("../extension/lib/stats.js");
  const { buildWeeklyReport, shouldSendWeekly, weeklyKey } = await import("../extension/lib/weekly.js");
  const { COLUMNS } = await import("../extension/lib/sheet.js");
  assert.deepEqual(parsePriceCell("10억 5,000만"), { price: 105000, rent: null });
  assert.deepEqual(parsePriceCell("15억 / 월 8,500만"), { price: 150000, rent: 8500 });
  assert.deepEqual(parsePriceCell("5,000만"), { price: 5000, rent: null });
  const row = (over) => COLUMNS.map((c) => over[c] ?? "");
  const base = { "감시 화면": "상가 1", "유형": "상가", "면적(㎡)": 100 };
  const table = [
    row({ ...base, "거래 종류": "매매", "가격": "10억", "시세 대비": "-20%(동·1층 5건)", "추정 수익률": "5.5%(월세 5건)", "변동": "🆕 신규", "네이버 매물 주소": "u1" }),
    row({ ...base, "거래 종류": "매매", "가격": "20억", "시세 대비": "", "변동": "" }),
    row({ ...base, "거래 종류": "월세", "가격": "1억 / 월 500만", "변동": "" }),
    row({ ...base, "거래 종류": "매매", "가격": "99억", "변동": "👋 사라짐", "네이버 매물 주소": "u2" }),
  ];
  const now = Date.parse("2026-11-03T03:00:00Z");
  const at = new Date(now).toISOString();
  const snap = summarizeTable(COLUMNS, table, at, { "상가 1": "11680" });
  const g = snap.groups[0];
  assert.equal(g.total, 3, "사라진 매물 제외");
  assert.equal(g.events.gone, 1);
  assert.equal(g.sgg, "11680");
  assert.equal(g.trades["매매"].avg, 150000);
  assert.equal(g.trades["매매"].gapAvg, -20);
  assert.equal(g.trades["매매"].gapN, 1);
  assert.equal(g.trades["매매"].gapMed, -20);
  assert.equal(g.trades["매매"].yieldMed, null, "수익률 5건 미만은 비움");
  assert.equal(g.trades["매매"].yieldN, 1);
  const many = [1, 2, 3, 4, 5].map((n) => row({ ...base, "거래 종류": "매매", "가격": "10억", "추정 수익률": `${n}.5%(월세 5건)` }));
  assert.equal(summarizeTable(COLUMNS, many, at).groups[0].trades["매매"].yieldMed, 3.5);
  assert.equal(g.trades["월세"].rentAvg, 500);
  assert.equal(pickEvents(COLUMNS, table, at).length, 2);
  assert.ok(!JSON.stringify(pickEvents(COLUMNS, table, at)).includes("중개"), "중개사 없음");
  const old = { at: new Date(now - 400 * 86400000).toISOString(), groups: [] };
  assert.equal(pushHistory([old], snap, { now }).length, 1, "1년 지난 기록 정리");
  assert.ok(trendText([snap], now).includes("매물 3→3건"));
  assert.equal(weeklyKey(now), "2026-11-02", "화요일이면 그 주 월요일");
  assert.equal(shouldSendWeekly(false, null, [snap, snap], now), null, "꺼져 있으면 안 보냄");
  assert.equal(shouldSendWeekly(true, null, [snap], now), null, "기록 2회 미만");
  assert.equal(shouldSendWeekly(true, "2026-11-02", [snap, snap], now), null, "이번 주 보냄");
  assert.equal(shouldSendWeekly(true, "2026-10-26", [snap, snap], now), "2026-11-02");
  const rep = buildWeeklyReport({ history: [snap], eventLog: [{ type: "priceDown", url: "u", kind: "상가", area: 10, floor: "1/3", price: "1억" }, { type: "priceDown", url: "u", kind: "상가", area: 10, floor: "1/3", price: "9천" }], now });
  assert.ok(rep.text.includes("상가 1 · 상가") && rep.text.includes("2번 내림"));
  assert.ok(rep.kakao.length <= 200);
});
