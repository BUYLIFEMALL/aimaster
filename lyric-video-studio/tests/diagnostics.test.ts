import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDiag, memoryEstimateMb, preflightWarnings, stageOf } from "../src/lib/render/diagnostics.ts";

test("메모리 어림 — 4분 곡: 소리 약 88MB + 메모리 방식 결과 약 245MB, 파일로 바로 저장이면 결과는 0", () => {
  assert.deepEqual(memoryEstimateMb(240, false), { audio: 88, output: 245, total: 333 });
  assert.deepEqual(memoryEstimateMb(240, true), { audio: 88, output: 0, total: 88 });
});

test("만들기 전 주의 — 문제 없으면 없음, 메모리·인코더 대체·인코더 없음", () => {
  assert.deepEqual(preflightWarnings({ durationSec: 200, toFile: false, canSaveToFile: true, deviceMemoryGb: 8, video: "H.264 High", audio: "AAC" }), []);
  const low = preflightWarnings({ durationSec: 600, toFile: false, canSaveToFile: true, deviceMemoryGb: 2 });
  assert.equal(low.length, 1); assert.match(low[0], /파일로 바로 저장/);
  assert.match(preflightWarnings({ durationSec: 60, toFile: false, canSaveToFile: false, video: "H.264 Baseline" })[0], /Baseline로 대체/);
  assert.match(preflightWarnings({ durationSec: 60, toFile: false, canSaveToFile: false, video: null })[0], /찾지 못했습니다/);
  assert.match(preflightWarnings({ durationSec: 60, toFile: false, canSaveToFile: false, audio: "Opus" })[0], /Opus/);
  assert.deepEqual(preflightWarnings({ durationSec: 60, toFile: false, canSaveToFile: false }), []); // 메모리 값을 모르면 판단 안 함
});

test("단계 이름 — 진행 숫자는 빼고 같은 단계로", () => {
  assert.equal(stageOf("영상 만드는 중… 12.3 / 200.0초"), stageOf("영상 만드는 중… 150.0 / 200.0초"));
  assert.equal(stageOf("파일로 묶는 중…"), "파일로 묶는 중…");
});

test("진단 글 — 머리말 뒤에 시각·표시·내용", () => {
  const t = formatDiag(["가사영상 v1.12"], [{ sec: 0, level: "info", text: "시작" }, { sec: 12.34, level: "warn", text: "주의" }, { sec: 20, level: "error", text: "실패" }]);
  assert.equal(t.split("\n")[0], "가사영상 v1.12");
  assert.match(t, /12\.3초 ⚠ 주의/);
  assert.match(t, /20\.0초 ✖ 실패/);
});
