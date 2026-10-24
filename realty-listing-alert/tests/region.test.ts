// 지역(동) 감시 시험 — node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import { pickTopComplexes } from "../extension/lib/listing.js";
import { readFileSync } from "node:fs";

const regions = JSON.parse(readFileSync(new URL("../public/regions.json", import.meta.url), "utf8"));
// lib/regions.ts regionNameOf와 같은 규칙(그 파일은 "@/public" 경로라 여기서는 같은 계산을 직접 한다)
const nameOf = (code: string) => {
  const sido = regions.find((s: { c: string }) => s.c === code.slice(0, 2));
  const sgg = sido?.g.find((g: { c: string }) => g.c === code.slice(0, 5));
  const dong = sgg?.d.find((d: string[]) => d[0] === code);
  return sgg && dong ? `${sgg.n} ${dong[1]}` : null;
};

test("지역 목록: 백석동 번호가 네이버 지역 번호와 같다", () => {
  assert.equal(nameOf("4128510600"), "고양시 일산동구 백석동");
  assert.equal(regions.find((s: { c: string }) => s.c === "11").g.length, 25);
  assert.equal(nameOf("9999999999"), null);
});

test("지역 단지 고르기: 매물 많은 순 상위 N곳, 번호 없는 줄 제외", () => {
  const list = [
    { complexNo: "1", complexName: "가", dealCount: 3, leaseCount: 1, rentCount: 0 },
    { complexNo: "2", complexName: "나", dealCount: 10, leaseCount: 5, rentCount: 2 },
    { complexNo: "3", complexName: "다", dealCount: 7 },
    { complexName: "번호없음", dealCount: 99 },
  ];
  assert.deepEqual(pickTopComplexes(list, null, 2).map((c) => c.complexNo), ["2", "3"]);
  assert.equal(pickTopComplexes(list, null, 5).length, 3);
  assert.equal(pickTopComplexes(null, null, 5).length, 0);
  // 매물 수 칸이 없으면 네이버 순서 그대로
  assert.deepEqual(pickTopComplexes([{ complexNo: "9" }, { complexNo: "8" }], null, 5).map((c) => c.complexNo), ["9", "8"]);
});
