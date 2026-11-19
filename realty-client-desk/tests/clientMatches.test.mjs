import { test } from "node:test";
import assert from "node:assert/strict";
import { clientMatchLabel, isSeekingClient, matchListingsForClient as rawMatch } from "../src/lib/desk/clientMatches.ts";
import { matchReasons } from "../src/lib/desk/adRules.ts";
const matchListingsForClient = (c, ls) => rawMatch(c, ls, matchReasons);

const client = { deal_type: "매매", deal_side: "매수", regions: "백석동", property_types: ["아파트"], budget_min: null, budget_max: 50000, monthly_max: null, area_min: null, status: "상담 중" };
const L = (id, over = {}) => ({ id, status: "광고 중", deal_type: "매매", property_type: "아파트", address: "경기 고양시 일산동구 백석동 1234", price: 48000, monthly: null, area_m2: 84, ...over });

test("일치 매물 수와 첫 링크는 들어온 순서(최근순)의 첫 일치", () => {
  const m = matchListingsForClient(client, [L("a", { address: "서울 종로구 교남동" }), L("b"), L("c")]);
  assert.deepEqual(m, { count: 2, firstId: "b" });
});

test("예산 5% 경계: 52500 포함, 52501 제외", () => {
  assert.equal(matchListingsForClient(client, [L("x", { price: 52500 })]).count, 1);
  assert.equal(matchListingsForClient(client, [L("y", { price: 52501 })]).count, 0);
});

test("계약·내림 매물은 세지 않는다", () => {
  const m = matchListingsForClient(client, [L("a", { status: "계약" }), L("b", { status: "내림" })]);
  assert.deepEqual(m, { count: 0, firstId: null });
});

test("매도·임대, 계약·종료 고객은 0건이고 줄 대상도 아니다", () => {
  for (const over of [{ deal_side: "매도" }, { deal_side: "임대" }, { status: "계약" }, { status: "종료" }]) {
    const c = { ...client, ...over };
    assert.equal(matchListingsForClient(c, [L("a")]).count, 0);
    assert.equal(isSeekingClient(c), false);
  }
  assert.equal(isSeekingClient(client), true);
  assert.equal(isSeekingClient({ ...client, deal_side: null }), true); // 옛 자료는 구하는 쪽
});

test("지역 불일치·빈 목록은 0건", () => {
  assert.deepEqual(matchListingsForClient(client, [L("a", { address: "서울 마포구 망원동" })]), { count: 0, firstId: null });
  assert.deepEqual(matchListingsForClient(client, []), { count: 0, firstId: null });
});

test("상한에 닿으면 범위를 밝히고, 아니면 그대로", () => {
  assert.equal(clientMatchLabel({ count: 3, firstId: "a" }, 200, true), "🏠 최근 매물 200건 중 맞는 내 매물 3건");
  assert.equal(clientMatchLabel({ count: 3, firstId: "a" }, 12, false), "🏠 맞는 내 매물 3건");
  assert.equal(clientMatchLabel({ count: 0, firstId: null }, 12, false), "🏠 맞는 광고 중 매물 없음");
});
