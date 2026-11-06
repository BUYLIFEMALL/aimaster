import test from "node:test";
import assert from "node:assert/strict";
import { albumArtPrompt } from "../src/lib/albumArt.ts";

test("앨범 그림 설명: 기획 설명이 있으면 그대로, 없으면 제목·스타일로 — 정사각형·글자 금지·한국인 규칙은 늘", () => {
  const withArt = albumArtPrompt({ title: "가을", style: "jazz", art: "dim jazz bar at dusk" });
  assert.match(withArt, /Scene: dim jazz bar at dusk/);
  assert.match(withArt, /Square 1:1 album cover/);
  assert.match(withArt, /no text, letters/);
  assert.match(withArt, /Korean/);
  const noArt = albumArtPrompt({ title: "가을 노래", style: "lo-fi piano", art: "  " });
  assert.match(noArt, /titled "가을 노래"/);
  assert.match(noArt, /lo-fi piano/);
});

test("앨범 그림 모델 목록 — 플랫폼별 3개 이상, 기본 모델이 목록 안, Replicate 모델은 정사각형 칸, 기준 프로그램에 있는 이름만", async () => {
  const fs = await import("node:fs");
  const { ART_PROVIDERS, replicateInput, toArtModel } = await import("../src/lib/albumArtModels.ts");
  const ref = fs.readFileSync(new URL("../../ai-image-studio/lib/providers/registry.ts", import.meta.url), "utf8");
  for (const p of ART_PROVIDERS) {
    assert.ok(p.models.length >= 3, p.id);
    assert.ok(p.models.some((m) => m.id === p.defaultModel), p.id);
    for (const m of p.models) assert.ok(ref.includes(`id: "${m.id}"`), `기준 프로그램에 없음: ${m.id}`);
  }
  for (const m of ART_PROVIDERS.find((p) => p.id === "replicate").models) {
    const i = replicateInput(m.id);
    assert.ok(i.aspect_ratio === "1:1" || i.size === "1024x1024", m.id);
  }
  assert.equal(toArtModel("openai", "없는 모델"), "gpt-image-2.5-flare");
});
