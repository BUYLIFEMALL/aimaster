// ⏳ 오래 안 팔린 매물(C-2) — 지금 있는 매물만·처음 발견일 기준·첫 수집분은 「N일 이상」 표시
import { test } from "node:test";
import assert from "node:assert/strict";
import { findStale } from "../extension/lib/stale.js";

const now = Date.parse("2026-12-31T00:00:00Z");
const init = "2026-10-01T00:00:00.000Z";
const last = "2026-12-30T00:00:00.000Z";
const states = {
  "2950": {
    initializedAt: init,
    updatedAt: last,
    items: {
      a: { priceText: "8억", firstSeen: init, lastSeen: last, item: { complexNo: "2950", dong: "101동", tradeName: "매매", area: 84, floor: "10/20" } },
      b: { priceText: "7억", firstSeen: "2026-11-20T00:00:00.000Z", lastSeen: last, item: { complexNo: "2950", tradeName: "매매" } },
      c: { priceText: "6억", firstSeen: "2026-12-20T00:00:00.000Z", lastSeen: last, item: { complexNo: "2950", tradeName: "전세" } },
      d: { priceText: "5억", firstSeen: init, lastSeen: "2026-12-01T00:00:00.000Z", item: { complexNo: "2950" } },
    },
  },
};

test("지금 목록에 있고 30일 넘은 매물만, 오래된 순", () => {
  const r = findStale(states, { "2950": "백송마을5단지" }, { now });
  assert.deepEqual(r.map((x) => x.key), ["2950:a", "2950:b"]);
  assert.equal(r[0].complex, "백송마을5단지");
  assert.equal(r[0].days, 91);
  assert.equal(r[0].sinceStart, true);
  assert.equal(r[1].sinceStart, false);
  assert.equal(r[0].url, "https://new.land.naver.com/complexes/2950?articleNo=a");
});

test("기준 일수·빈 입력", () => {
  assert.equal(findStale(states, {}, { now, minDays: 60 }).length, 1);
  assert.equal(findStale(states, {}, { now })[0].complex, "단지 2950");
  assert.deepEqual(findStale(null), []);
});
