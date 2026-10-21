// v1.18 「다른 크기로 받기」 채널 크기(무료 시험)
import test from "node:test";
import assert from "node:assert/strict";
import { CHANNEL_SIZES, channelFileName } from "../src/lib/studio/channels.ts";

test("채널 규격 크기", () => {
  const byId = Object.fromEntries(CHANNEL_SIZES.map((c) => [c.id, [c.width, c.height]]));
  assert.deepEqual(byId["insta-square"], [1080, 1080]);
  assert.deepEqual(byId["insta-portrait"], [1080, 1350]);
  assert.deepEqual(byId["story"], [1080, 1920]);
  assert.deepEqual(byId["wide"], [1200, 628]);
  assert.equal(new Set(CHANNEL_SIZES.map((c) => c.id)).size, CHANNEL_SIZES.length);
});

test("파일 이름에 채널·크기", () => {
  assert.equal(channelFileName(CHANNEL_SIZES[1], 123), "감성글귀-insta-portrait-1080x1350-123.jpg");
});
