import { test } from "node:test";
import assert from "node:assert/strict";
import { suggestFromOtherPrograms } from "../src/lib/realestate/crossWatch.ts";

const known = [
  { sgg_cd: "11110", sgg_nm: "종로구" },
  { sgg_cd: "11650", sgg_nm: "서초구" },
  { sgg_cd: "41285", sgg_nm: "고양시 일산동구" },
];

test("다른 프로그램 지역 중 아직 없는 시군구만, 출처와 함께", () => {
  const out = suggestFromOtherPrograms({
    own: ["11650"],
    commercial: ["11650", "41285"],
    listingCortars: ["1111017400", "4128510100", null],
    known,
  });
  assert.deepEqual(out, [
    { sgg_cd: "11110", sgg_nm: "종로구", sources: ["매물 알림"] },
    { sgg_cd: "41285", sgg_nm: "고양시 일산동구", sources: ["상가", "매물 알림"] },
  ]);
});

test("모르는 코드·형식이 틀린 코드·이미 켠 지역은 제안하지 않음", () => {
  const out = suggestFromOtherPrograms({ own: ["11110"], commercial: ["99999", "1165", "11110"], listingCortars: ["123", "1111017400"], known });
  assert.deepEqual(out, []);
});

test("다른 프로그램에 등록이 없으면 빈 목록", () => {
  assert.deepEqual(suggestFromOtherPrograms({ own: [], commercial: [], listingCortars: [], known }), []);
});
