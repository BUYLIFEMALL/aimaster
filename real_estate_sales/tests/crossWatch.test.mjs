import { test } from "node:test";
import assert from "node:assert/strict";
import { suggestFromOtherPrograms } from "../src/lib/realestate/crossWatch.ts";

const known = [
  { sgg_cd: "11110", sgg_nm: "종로구" },
  { sgg_cd: "11650", sgg_nm: "서초구" },
  { sgg_cd: "41285", sgg_nm: "고양시 일산동구" },
];
const on = (sgg_cd) => ({ sgg_cd, is_active: true });
const region = (cortar_no, enabled = true) => ({ cortar_no, target_type: "region", enabled });

test("다른 프로그램 지역 중 아직 없는 시군구만, 출처와 함께", () => {
  const out = suggestFromOtherPrograms({
    own: ["11650"],
    commercial: [on("11650"), on("41285")],
    listing: [region("1111017400"), region("4128510100"), { cortar_no: null, target_type: "complex", enabled: true }],
    known,
  });
  assert.deepEqual(out, [
    { sgg_cd: "11110", sgg_nm: "종로구", sources: ["매물 알림"] },
    { sgg_cd: "41285", sgg_nm: "고양시 일산동구", sources: ["상가", "매물 알림"] },
  ]);
});

test("모르는 코드·형식이 틀린 코드·이미 켠 지역은 제안하지 않음", () => {
  const out = suggestFromOtherPrograms({ own: ["11110"], commercial: [on("99999"), on("1165"), on("11110")], listing: [region("123"), region("1111017400")], known });
  assert.deepEqual(out, []);
});

test("꺼 둔 예전 감시는 제안하지 않음(상가 is_active=false, 매물 알림 enabled=false·단지 감시)", () => {
  const out = suggestFromOtherPrograms({
    own: [],
    commercial: [{ sgg_cd: "11110", is_active: false }, { sgg_cd: "41285", is_active: null }],
    listing: [region("1165010100", false), { cortar_no: "1165010100", target_type: "complex", enabled: true }, { cortar_no: "4128510100", target_type: "region", enabled: null }],
    known,
  });
  assert.deepEqual(out, []);
});

test("다른 프로그램에 등록이 없으면 빈 목록", () => {
  assert.deepEqual(suggestFromOtherPrograms({ own: [], commercial: [], listing: [], known }), []);
});
