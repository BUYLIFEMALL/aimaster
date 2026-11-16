import { test } from "node:test";
import assert from "node:assert/strict";
import { overlapNotesFor, type OverlapTarget } from "../lib/targetOverlap.ts";

const complex = (no: string): OverlapTarget => ({ target_type: "complex", complex_no: no, cortar_no: null, region_name: null });
const region = (cortar: string, name: string): OverlapTarget => ({ target_type: "region", complex_no: null, cortar_no: cortar, region_name: name });

test("U-5 감시 화면: 단지 감시·지역 감시가 둘 다 있고 지역 펼침 ok면 안내", () => {
  const targets = [complex("2936"), region("4128510300", "백석동")];
  const check = { regions: [{ cortarNo: "4128510300", status: "ok" }], overlaps: [{ complexNo: "2936", cortarNo: "4128510300", regionName: "백석동" }] };
  assert.deepEqual(overlapNotesFor(check, targets), { "2936": ["백석동"] });
});

test("U-5 옛 확장·결과 없음·다른 계정(null)은 빈 값", () => {
  const targets = [complex("2936"), region("1", "가동")];
  assert.deepEqual(overlapNotesFor(null, targets), {});
  assert.deepEqual(overlapNotesFor(undefined, targets), {});
  assert.deepEqual(overlapNotesFor({}, targets), {});
  assert.deepEqual(overlapNotesFor({ regions: [{ cortarNo: "1", status: "ok" }] }, targets), {});
});

test("U-5 지역 펼침이 실패·미확인이면 표시 안 함(겹침 0과 구분)", () => {
  const targets = [complex("2936"), region("1", "가동")];
  const ov = [{ complexNo: "2936", cortarNo: "1", regionName: "가동" }];
  assert.deepEqual(overlapNotesFor({ regions: [{ cortarNo: "1", status: "failed" }], overlaps: ov }, targets), {});
  assert.deepEqual(overlapNotesFor({ regions: [{ cortarNo: "1", status: "skipped" }], overlaps: ov }, targets), {});
  assert.deepEqual(overlapNotesFor({ regions: [], overlaps: ov }, targets), {});
});

test("U-5 그 뒤 지운 단지·지역 감시의 옛 겹침은 표시 안 함", () => {
  const check = { regions: [{ cortarNo: "1", status: "ok" }], overlaps: [{ complexNo: "2936", cortarNo: "1", regionName: "가동" }] };
  assert.deepEqual(overlapNotesFor(check, [complex("2936")]), {}); // 지역 감시 지움
  assert.deepEqual(overlapNotesFor(check, [region("1", "가동")]), {}); // 단지 감시 지움
});

test("U-5 지역 이름은 지금 목록 이름을 쓰고, 여러 지역·중복은 한 번씩", () => {
  const targets = [complex("2936"), region("1", "가동(새 이름)"), region("2", "나동")];
  const check = {
    regions: [{ cortarNo: "1", status: "ok" }, { cortarNo: "2", status: "ok" }],
    overlaps: [{ complexNo: "2936", cortarNo: "1", regionName: "가동" }, { complexNo: "2936", cortarNo: "2", regionName: "나동" }, { complexNo: "2936", cortarNo: "1", regionName: "가동" }],
  };
  assert.deepEqual(overlapNotesFor(check, targets), { "2936": ["가동(새 이름)", "나동"] });
});
