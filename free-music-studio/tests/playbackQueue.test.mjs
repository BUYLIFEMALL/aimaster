import test from "node:test";
import assert from "node:assert/strict";
import { createPlaybackQueue, currentQueueId, selectQueueTrack, setQueueShuffle, stepPlaybackQueue } from "../src/lib/playbackQueue.ts";

const ids = ["a", "b", "c", "d"];

test("대기열: 순서대로 끝에서 멈춤, 전체 반복은 처음으로, 한 곡 반복은 끝났을 때만", () => {
  let q = createPlaybackQueue(ids);
  for (const want of ["b", "c", "d"]) {
    q = stepPlaybackQueue(q);
    assert.equal(currentQueueId(q), want);
  }
  assert.equal(stepPlaybackQueue(q), null);
  assert.equal(currentQueueId(stepPlaybackQueue({ ...q, repeat: "all" })), "a");
  const one = { ...q, repeat: "one" };
  assert.equal(currentQueueId(stepPlaybackQueue(one, { ended: true })), "d");
  assert.equal(stepPlaybackQueue(one), null); // 다음 버튼은 넘어감(끝이라 멈춤)
});

test("대기열: 섞으면 한 바퀴에 모든 곡 한 번씩, 다음 바퀴 첫 곡은 방금 곡이 아님", () => {
  let n = 0;
  const random = () => ((n = (n * 7 + 3) % 10) / 10);
  let q = createPlaybackQueue(ids, { shuffle: true, repeat: "all", random });
  const seen = [currentQueueId(q)];
  for (let i = 0; i < 3; i++) {
    q = stepPlaybackQueue(q, { random });
    seen.push(currentQueueId(q));
  }
  assert.deepEqual([...seen].sort(), ids);
  const last = currentQueueId(q);
  q = stepPlaybackQueue(q, { random: () => 0.99 });
  assert.notEqual(currentQueueId(q), last);
});

test("대기열: 섞기 켜면 지금 곡이 맨 앞, 끄면 원래 순서의 그 자리, 고르기", () => {
  let q = selectQueueTrack(createPlaybackQueue(ids), "c");
  q = setQueueShuffle(q, true, () => 0);
  assert.equal(currentQueueId(q), "c");
  assert.equal(q.index, 0);
  q = setQueueShuffle(q, false);
  assert.equal(q.index, 2);
  assert.equal(currentQueueId(q), "c");
});
