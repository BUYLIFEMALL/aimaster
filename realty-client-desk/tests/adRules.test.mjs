import { test } from "node:test";
import assert from "node:assert/strict";
import { adEligibility, composeAd, isNightKst, matchReasons } from "../src/lib/desk/adRules.ts";

const client = { deal_type: "전세", regions: "백석동, 마두동", property_types: ["아파트"], budget_min: null, budget_max: 40000, monthly_max: null, area_min: 59, status: "상담 중" };
const listing = { deal_type: "전세", property_type: "아파트", address: "경기도 고양시 일산동구 백석동 1234", price: 41000, monthly: null, area_m2: 84.9 };

test("조건 맞추기: 거래·유형·지역·예산(5% 여유)·면적", () => {
  assert.deepEqual(matchReasons(client, listing), ["전세", "아파트", "백석동", "예산 안", "면적 맞음"]);
  assert.equal(matchReasons({ ...client, deal_type: "매매" }, listing), null);
  assert.equal(matchReasons(client, { ...listing, address: "서울 강남구 역삼동" }), null);
  assert.equal(matchReasons(client, { ...listing, price: 43000 }), null); // 5% 넘음
  assert.equal(matchReasons({ ...client, status: "계약" }, listing), null);
  assert.deepEqual(matchReasons({ ...client, regions: null, property_types: [], budget_max: null, area_min: null }, listing), ["전세"]);
});

test("월세 상한", () => {
  const c = { ...client, deal_type: "월세", monthly_max: 100 };
  const l = { ...listing, deal_type: "월세", price: 3000, monthly: 120 };
  assert.equal(matchReasons(c, l), null);
  assert.ok(matchReasons(c, { ...l, monthly: 100 }));
});

test("광고 보낼 수 있는 고객: 동의·수신거부·2년", () => {
  const now = Date.parse("2026-11-03T12:00:00+09:00");
  assert.deepEqual(adEligibility({ ad_consent_at: null, ad_optout_at: null }, now), { ok: false, reason: "광고 수신 미동의" });
  assert.equal(adEligibility({ ad_consent_at: "2026-11-01T00:00:00Z", ad_optout_at: "2026-11-02T00:00:00Z" }, now).ok, false);
  assert.deepEqual(adEligibility({ ad_consent_at: "2026-11-01T00:00:00Z", ad_optout_at: null }, now), { ok: true, soon: false });
  assert.deepEqual(adEligibility({ ad_consent_at: "2024-11-20T00:00:00Z", ad_optout_at: null }, now), { ok: true, soon: true });
  assert.equal(adEligibility({ ad_consent_at: "2024-11-01T00:00:00Z", ad_optout_at: null }, now).ok, false);
});

test("밤 9시~아침 8시(한국 시각) 막기", () => {
  assert.equal(isNightKst(new Date("2026-11-03T12:00:00Z")), true); // 21:00 KST
  assert.equal(isNightKst(new Date("2026-11-03T22:59:00Z")), true); // 07:59 KST
  assert.equal(isNightKst(new Date("2026-11-03T23:00:00Z")), false); // 08:00 KST
  assert.equal(isNightKst(new Date("2026-11-03T11:59:00Z")), false); // 20:59 KST
});

test("광고 문자: 맨 앞 (광고)·명칭·전화, 맨 끝 무료 수신거부", () => {
  const office = { office_name: "백석공인", office_phone: "031-123-4567", office_address: null, reject_080: null };
  const text = composeAd(office, " 본문 ", "https://x/u/abc");
  assert.equal(text, "(광고)백석공인 031-123-4567\n본문\n무료수신거부 https://x/u/abc");
  assert.ok(composeAd({ ...office, reject_080: "080-123-4567" }, "b", "u").endsWith("무료수신거부 080-123-4567 / u"));
});
