import { test } from "node:test";
import assert from "node:assert/strict";
import { renderCanvasFromParam, renderDiagnostics } from "../lib/edit/renderInfo.ts";

const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/156.0 Safari/537.36";
const WIN = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/156.0 Safari/537.36";

test("v1.25 2D 캔버스 방식 — 맥은 cpu 기본, 스위치로 바꾸기", () => {
  assert.equal(renderCanvasFromParam(null, MAC), "cpu");
  assert.equal(renderCanvasFromParam(null, WIN), "gpu");
  assert.equal(renderCanvasFromParam("gpucanvas", MAC), "gpu");
  assert.equal(renderCanvasFromParam("trace, cpucanvas", WIN), "cpu");
  const d = renderDiagnostics({ outcome: "done", hw: "no-preference", decode: "software", canvas: "cpu", elapsedMs: 1000, totalFrames: 1, renderedFrames: 1, encodedFrames: 1, userAgent: "x", cores: 4 });
  assert.equal(d.canvas, "cpu");
});

test("v1.25 preferCpuCanvas — 2d에만 willReadFrequently, 겹쳐 써도 마지막에 되돌림", async () => {
  const calls = [];
  class FakeCanvas { getContext(id, options) { calls.push([id, options]); return {}; } }
  const original = FakeCanvas.prototype.getContext;
  globalThis.OffscreenCanvas = FakeCanvas;
  try {
    const { preferCpuCanvas } = await import("../lib/edit/cpuCanvas.ts");
    const a = preferCpuCanvas();
    const b = preferCpuCanvas();
    new FakeCanvas().getContext("2d", { alpha: false });
    new FakeCanvas().getContext("webgl");
    assert.deepEqual(calls[0], ["2d", { alpha: false, willReadFrequently: true }]);
    assert.deepEqual(calls[1], ["webgl", undefined]);
    a();
    a(); // 두 번 불러도 한 번만 센다
    assert.notEqual(FakeCanvas.prototype.getContext, original);
    b();
    assert.equal(FakeCanvas.prototype.getContext, original);
  } finally {
    delete globalThis.OffscreenCanvas;
  }
});
