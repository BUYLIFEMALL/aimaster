import { test } from "node:test";
import assert from "node:assert/strict";
import { etaFromProgress, formatEta, isMacDesktop, isSlowRender, renderDecodeFromParam, renderDiagnostics, renderHwFromParam, renderVerboseFromParam } from "../lib/edit/renderInfo.ts";

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
  const d = renderDiagnostics({ outcome: "done", hw: "no-preference", decode: "default", elapsedMs: 5300, totalFrames: 150, renderedFrames: 150, encodedFrames: 150, userAgent: "x", cores: 22 });
  assert.equal(d.seconds, 5.3);
  assert.equal(d.frames, "150/150/150");
  assert.equal(d.fps, 28.3);
  assert.equal(d.lag, 0);
  assert.equal(d.decode, "default");
  assert.equal(d.msPerFrame, 35);
});

test("남은 시간은 전체 진행률로 계산(인코딩에서 막혀도 맞게)", () => {
  assert.equal(etaFromProgress(1000, 0.01), 0);
  assert.equal(etaFromProgress(10_000, 1), 0);
  assert.equal(etaFromProgress(10_000, 0.5), 10_000);
  // 맥 사례: 5분에 8% → 남은 약 57분, 20초 뒤부터 느림 안내 대상
  assert.equal(etaFromProgress(300_000, 0.08), 3_450_000);
});

const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36";
const WIN = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36";
const IPAD = "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

test("맥 데스크톱만 맥으로 본다", () => {
  assert.equal(isMacDesktop(MAC), true);
  assert.equal(isMacDesktop(WIN), false);
  assert.equal(isMacDesktop(IPAD), false);
});

test("디코딩 방식: 맥은 소프트웨어 기본, hwdecode·softdecode 스위치", () => {
  assert.equal(renderDecodeFromParam(null, MAC), "software");
  assert.equal(renderDecodeFromParam(null, WIN), "default");
  assert.equal(renderDecodeFromParam("hwdecode", MAC), "default");
  assert.equal(renderDecodeFromParam("softdecode", WIN), "software");
  assert.equal(renderDecodeFromParam("software,hwdecode", MAC), "default");
});

test("스위치 여러 개를 쉼표로", () => {
  assert.equal(renderHwFromParam("verbose,software"), "prefer-software");
  assert.equal(renderVerboseFromParam("hwdecode, verbose"), true);
  assert.equal(renderVerboseFromParam("software"), false);
  assert.equal(renderVerboseFromParam(null), false);
});
