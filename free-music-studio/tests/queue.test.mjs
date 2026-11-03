import test from "node:test";
import assert from "node:assert/strict";
import { activeCount, hasQueue, trackRecordOf } from "../src/lib/engine.ts";
import { parseTrackInput } from "../src/lib/tracks.ts";

const job = (status, kind = "text2music", duration = 180) => ({
  id: "j",
  kind,
  title: "비 오는 창가",
  status,
  stage: "",
  createdAt: "",
  recorded: false,
  track: { id: "11111111-1111-4111-8111-111111111111", song_id: null, style_prompt: "jazz", lyrics: "[Instrumental]", duration_sec: duration, device: "cpu", kind },
});

test("대기열: 0.1.6 엔진만 대기열 사용, 대기·진행 개수", () => {
  assert.equal(hasQueue({ features: ["library", "queue"] }), true);
  assert.equal(hasQueue({ features: ["library"] }), false);
  assert.equal(hasQueue(null), false);
  assert.equal(activeCount([job("queued"), job("running"), job("done"), job("interrupted")]), 2);
});

test("대기열: 끝난 작업의 기록 본문은 곡 기록 검사를 통과한다", () => {
  const song = parseTrackInput(trackRecordOf(job("done")));
  assert.equal(song.ok, true);
  assert.equal(song.value.title, "비 오는 창가");
  const cover = parseTrackInput(trackRecordOf(job("done", "cover", 95)));
  assert.equal(cover.ok, true);
  assert.equal(cover.value.kind, "cover");
});
