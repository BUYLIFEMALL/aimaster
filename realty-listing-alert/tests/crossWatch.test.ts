import { test } from "node:test";
import assert from "node:assert/strict";
import { suggestRegionsFromOtherPrograms, type OwnTargetRow, type WatchRow } from "../lib/crossWatch.ts";

const on = (sgg_cd: string): WatchRow => ({ sgg_cd, is_active: true });
const dong = (cortar_no: string, enabled = true): OwnTargetRow => ({ target_type: "region", cortar_no, enabled });

test("실거래·상가에 켠 시군구 중 매물 알림 동 감시가 없는 곳만, 출처와 함께(시군구 5자리)", () => {
  const out = suggestRegionsFromOtherPrograms({
    own: [dong("1165010100")], // 서초구 반포동 감시 중
    sales: [on("11650"), on("11110")],
    commercial: [on("11110"), on("41285")],
  });
  assert.deepEqual(out, [
    { sgg_cd: "11110", sources: ["실거래", "상가"] },
    { sgg_cd: "41285", sources: ["상가"] },
  ]);
});

test("꺼 둔 동 감시는 감시 중으로 보지 않음 · 단지 감시는 시군구를 덮지 않음", () => {
  const out = suggestRegionsFromOtherPrograms({
    own: [dong("1111017400", false), { target_type: "complex", cortar_no: null, enabled: true }],
    sales: [on("11110")],
    commercial: [],
  });
  assert.deepEqual(out, [{ sgg_cd: "11110", sources: ["실거래"] }]);
});

test("다른 프로그램의 꺼진 감시·형식이 틀린 코드(동 10자리 등)는 제안하지 않음", () => {
  const out = suggestRegionsFromOtherPrograms({
    own: [],
    sales: [{ sgg_cd: "11110", is_active: false }, { sgg_cd: "1111017400", is_active: true }],
    commercial: [{ sgg_cd: "41285", is_active: null }, on("1165")],
  });
  assert.deepEqual(out, []);
});
