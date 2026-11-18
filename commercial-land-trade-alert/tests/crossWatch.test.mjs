import { test } from "node:test";
import assert from "node:assert/strict";
import { suggestFromOtherPrograms } from "../src/lib/crossWatch.ts";

const known = [
  { sgg_cd: "11110", sgg_nm: "종로구" },
  { sgg_cd: "11680", sgg_nm: "강남구" },
  { sgg_cd: "41285", sgg_nm: "고양시 일산동구" },
];
const on = (sgg_cd) => ({ sgg_cd, is_active: true });
const region = (cortar_no, enabled = true) => ({ cortar_no, target_type: "region", enabled });

test("실거래·매물 알림 지역 중 상가에 아직 없는 시군구만, 출처와 함께", () => {
  const out = suggestFromOtherPrograms({ own: ["11680"], sales: [on("11110"), on("11680")], listing: [region("1111017400"), region("4128510100")], known });
  assert.deepEqual(out, [
    { sgg_cd: "11110", sgg_nm: "종로구", sources: ["실거래", "매물 알림"] },
    { sgg_cd: "41285", sgg_nm: "고양시 일산동구", sources: ["매물 알림"] },
  ]);
});

test("꺼 둔 예전 감시·단지 감시·모르는 코드는 제안하지 않음", () => {
  const out = suggestFromOtherPrograms({
    own: [],
    sales: [{ sgg_cd: "11110", is_active: false }, { sgg_cd: "41285", is_active: null }, on("99999")],
    listing: [region("1168010100", false), { cortar_no: "1168010100", target_type: "complex", enabled: true }, { cortar_no: "4128510100", target_type: "region", enabled: null }],
    known,
  });
  assert.deepEqual(out, []);
});

test("다른 프로그램에 등록이 없으면 빈 목록", () => {
  assert.deepEqual(suggestFromOtherPrograms({ own: [], sales: [], listing: [], known }), []);
});
