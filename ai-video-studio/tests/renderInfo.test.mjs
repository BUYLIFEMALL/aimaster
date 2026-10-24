import { test } from "node:test";
import assert from "node:assert/strict";
import { formatEta, isSlowRender, renderDiagnostics, renderHwFromParam } from "../lib/edit/renderInfo.ts";

test("?render=software만 소프트웨어 인코딩", () => {
  assert.equal(renderHwFromParam("software"), "prefer-software");
  assert.equal(renderHwFromParam(null), "no-preference");
  assert.equal(renderHwFromParam("hardware"), "no-preference");
});

test("남은 시간 글자", () => {
  assert.equal(formatEta(0), "");
  assert.equal(formatEta(NaN), "");
  assert.equal(formatEta(400), "약 1초");
  assert.equal(formatEta(40_000), "약 40초");
  assert.equal(formatEta(125_000), "약 2분 5초");
  assert.equal(formatEta(1_500_000), "약 25분");
});

test("20초 지나고 남은 예상 3분 넘을 때만 느림 안내", () => {
  assert.equal(isSlowRender(10_000, 600_000), false);
  assert.equal(isSlowRender(20_000, 180_000), false);
  assert.equal(isSlowRender(20_000, 180_001), true);
});

test("진단 줄: 프레임·속도·밀림", () => {
  const d = renderDiagnostics({ outcome: "done", hw: "no-preference", elapsedMs: 5300, totalFrames: 150, renderedFrames: 150, encodedFrames: 150, userAgent: "x", cores: 22 });
  assert.equal(d.seconds, 5.3);
  assert.equal(d.frames, "150/150/150");
  assert.equal(d.fps, 28.3);
  assert.equal(d.lag, 0);
});
