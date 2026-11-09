// P-6(2026-11-09) 확장 묶음 — 스펙트럼 3종·팔레트 2종·파티클 흐름/꼬리/최대 개수/자동 줄이기
import test from "node:test";
import assert from "node:assert/strict";
import { getPresetColor } from "../src/lib/render/color-utils.ts";
import { COLOR_PRESET_OPTIONS, DEFAULT_SETTINGS, PARTICLE_WIND_OPTIONS, VISUALIZER_OPTIONS } from "../src/data/presets.ts";
import { drawSpectrumVisualizer } from "../src/lib/render/canvas-visualizer.ts";
import { ParticleSystem } from "../src/lib/render/particle-system.ts";

// 그리기 호출을 받아 주기만 하는 가짜 캔버스
const fakeCtx = () => {
  const calls = { stroke: 0, fill: 0 };
  const grad = { addColorStop() {} };
  return new Proxy(
    { calls },
    {
      get(o, k) {
        if (k in o) return o[k];
        if (k === "createLinearGradient" || k === "createRadialGradient") return () => grad;
        if (k === "stroke") return () => calls.stroke++;
        if (k === "fill" || k === "fillRect") return () => calls.fill++;
        return () => {};
      },
      set() {
        return true;
      },
    }
  );
};

test("팔레트 — 파스텔·모노 색", () => {
  assert.match(getPresetColor("PASTEL", "#fff", 0, 10, 0), /^hsl\(/);
  assert.equal(getPresetColor("MONO", "#fff", 0, 10, 0), "rgb(255, 255, 255)");
  assert.equal(getPresetColor("MONO", "#fff", 9, 10, 0), "rgb(135, 135, 135)");
  assert.deepEqual(COLOR_PRESET_OPTIONS.map((c) => c.id), ["DEFAULT", "NEON_ICE", "SUNSET", "FOREST", "VIBRANT", "PASTEL", "MONO"]);
});

test("스펙트럼 3종 — 목록에 있고, 소리가 있으면 그린다", () => {
  const ids = VISUALIZER_OPTIONS.map((o) => o.type);
  for (const t of ["OSCILLOSCOPE", "MIRROR_GLOW", "DOT_MATRIX"]) {
    assert.ok(ids.includes(t), t);
    const ctx = fakeCtx();
    const freq = new Uint8Array(1024).map((_, i) => (i % 7) * 30);
    drawSpectrumVisualizer(ctx, 1920, 1080, freq, { ...DEFAULT_SETTINGS, visualizerType: t }, 1000);
    assert.ok(ctx.calls.stroke + ctx.calls.fill > 0, t);
  }
});

test("파티클 기본값·흐름 방향 목록", () => {
  assert.equal(DEFAULT_SETTINGS.particleWind, "none");
  assert.equal(DEFAULT_SETTINGS.particleTrail, false);
  assert.equal(DEFAULT_SETTINGS.particleMax, 400);
  assert.equal(DEFAULT_SETTINGS.particleAutoReduce, true);
  assert.deepEqual(PARTICLE_WIND_OPTIONS.map((w) => w.id), ["none", "left", "right", "up", "down"]);
});

test("파티클 — 최대 동시 개수를 지키고, 꼬리를 그린다", () => {
  const ps = new ParticleSystem();
  const s = { ...DEFAULT_SETTINGS, snow: true, overlayDensity: 100, particleMax: 100, particleAutoReduce: false, particleWind: "right", particleTrail: true };
  const ctx = fakeCtx();
  for (let i = 0; i <= 120; i++) ps.updateAndDraw(ctx, 1920, 1080, s, i * 100);
  assert.ok(ps.particles.length <= 100, String(ps.particles.length));
  assert.ok(ps.particles.length > 0);
  assert.ok(ctx.calls.stroke > 0);
});
