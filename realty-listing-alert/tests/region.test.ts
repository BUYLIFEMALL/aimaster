// 지역(동) 감시 시험 — node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import { complexTargetsFirst, pickTopComplexes } from "../extension/lib/listing.js";
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

test("작업 목록은 단지 감시를 먼저 둔다 — 지역과 겹치는 단지는 단지 감시로 읽힘(2026-11-13 L-5, 단지 2936)", () => {
  const targets = [
    { target_type: "region", region_name: "고양시 일산동구 백석동" },
    { target_type: "region", region_name: "사상구 삼락동" },
    { target_type: "complex", complex_no: "111515", complex_name: "헬리오시티" },
    { target_type: "complex", complex_no: "2936", complex_name: null },
  ];
  const ordered = complexTargetsFirst(targets);
  assert.deepEqual(ordered.map((t) => t.complex_no ?? t.region_name), ["111515", "2936", "고양시 일산동구 백석동", "사상구 삼락동"]);
  // background.js와 같은 중복 규칙: 먼저 들어간 단지 감시가 남고, 지역에서 온 같은 번호는 건너뛴다
  const seen = new Set();
  const work: { complex_no: string; complex_name: string | null; fromRegion?: string }[] = [];
  for (const t of ordered) {
    if (t.target_type !== "region") { seen.add(t.complex_no); work.push(t as never); continue; }
    if (t.region_name === "고양시 일산동구 백석동" && !seen.has("2936")) work.push({ complex_no: "2936", complex_name: "백송xx", fromRegion: t.region_name });
  }
  const w2936 = work.filter((w) => w.complex_no === "2936");
  assert.equal(w2936.length, 1);
  assert.equal(w2936[0].complex_name, null); // 이름이 비어 있어 수집 뒤 이름 고치기가 나간다
  assert.equal(w2936[0].fromRegion, undefined);
  assert.deepEqual(complexTargetsFirst(undefined as never), []);
});
