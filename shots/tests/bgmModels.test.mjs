import test from "node:test";
import assert from "node:assert/strict";
import { BGM_MODELS, DEFAULT_BGM_MODEL, isBgmModel } from "../src/lib/bgmModels.ts";

test("v1.40 배경음악 모델: 기본은 Suno V6, 모르는 값은 거부, 키 종류는 suno·gemini·elevenlabs만", () => {
  assert.equal(DEFAULT_BGM_MODEL, "suno:V6");
  assert.ok(isBgmModel("lyria:lyria-3.5"));
  assert.ok(isBgmModel("elevenlabs:music_v2_5"));
  assert.ok(!isBgmModel("suno:V4_5"));
  assert.ok(!isBgmModel(""));
  assert.deepEqual([...new Set(BGM_MODELS.map((m) => m.key))].sort(), ["elevenlabs", "gemini", "suno"]);
  for (const m of BGM_MODELS.filter((x) => x.key === "suno")) assert.match(m.id, /^suno:V6/);
});
