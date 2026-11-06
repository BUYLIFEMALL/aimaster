import test from "node:test";
import assert from "node:assert/strict";
import { MAX_SCENES, crossCutSeconds, limitSegs, planCrossCut } from "../lib/clip/crossCut.ts";

const SEGS = [
  { start: 0.8, end: 4.0, text: "오늘은 접이식 선풍기를 소개합니다." },
  { start: 4.6, end: 9.1, text: "상자를 열면 설명서와 충전선이 있습니다." },
  { start: 10.0, end: 13.2, text: "무게가 정말 가볍습니다." },
];

test("해설 교차편집: 장면은 문장 시각을 따라가고 촬영본을 번갈아 쓴다", () => {
  const scenes = planCrossCut(SEGS, [30, 30]);
  assert.deepEqual(scenes.map((s) => [s.file, s.at, s.seconds]), [[0, 0, 4.6], [1, 4.6, 5.4], [0, 10, 3.5]]);
  // 첫 촬영본은 두 번째 쓸 때 지난번 뒤(4.6초)에서 이어 쓴다
  assert.equal(scenes[2].trimStart, 4.6);
  assert.equal(scenes[2].trimEnd, 30 - 4.6 - 3.5);
  assert.deepEqual(scenes.map((s) => s.caption), SEGS.map((s) => s.text));
  assert.equal(crossCutSeconds(scenes), 13.5);
});

test("해설 교차편집: 촬영본 끝에 닿으면 처음으로, 장면보다 짧으면 반복(hold)", () => {
  const scenes = planCrossCut(SEGS, [5, 2]);
  // 0번(5초): 첫 장면 4.6초 → 세 번째 장면 3.5초는 남은 0.4초로 부족 → 처음부터
  assert.equal(scenes[2].trimStart, 0);
  assert.equal(scenes[2].trimEnd, 1.5);
  // 1번(2초)은 5.4초 장면보다 짧아 3.4초 반복
  assert.deepEqual([scenes[1].trimStart, scenes[1].trimEnd, scenes[1].hold], [0, 0, 3.4]);
});

test("해설 교차편집: 회원이 고른 촬영본 순서를 따르고 잘못된 번호는 번갈아 쓰기로", () => {
  const scenes = planCrossCut(SEGS, [30, 30, 30], [2, 2, 9]);
  assert.deepEqual(scenes.map((s) => s.file), [2, 2, 2]);
  assert.equal(scenes[1].trimStart, 4.6);
  assert.deepEqual(planCrossCut([], [30]), []);
  assert.deepEqual(planCrossCut(SEGS, []), []);
});

test("문장이 20개를 넘으면 짧은 이웃끼리 합쳐 20개로", () => {
  const many = Array.from({ length: 25 }, (_, i) => ({ start: i * 2, end: i * 2 + (i === 3 || i === 4 ? 0.4 : 1.8), text: `문장${i}` }));
  const out = limitSegs(many);
  assert.equal(out.length, MAX_SCENES);
  // 짧은 문장 3·4 주변이 먼저 합쳐진다(2+3과 3+4가 같은 2.4초라 앞쪽부터)
  assert.ok(out.some((s) => s.text === "문장2 문장3"));
  assert.equal(out[0].start, 0);
  assert.equal(out[out.length - 1].end, many[24].end);
  assert.equal(limitSegs(SEGS).length, 3);
});
