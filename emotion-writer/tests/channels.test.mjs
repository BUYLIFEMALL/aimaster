// v1.18 「다른 크기로 받기」 채널 크기(무료 시험)
import test from "node:test";
import assert from "node:assert/strict";
import { CHANNEL_SIZES, channelFileName } from "../src/lib/studio/channels.ts";
import { readFileSync } from "node:fs";

test("채널 규격 크기", () => {
  const byId = Object.fromEntries(CHANNEL_SIZES.map((c) => [c.id, [c.width, c.height]]));
  assert.deepEqual(byId["insta-feed"], [1080, 1080]);
  assert.deepEqual(byId["insta-portrait"], [1080, 1350]);
  assert.deepEqual(byId["story"], [1080, 1920]);
  assert.deepEqual(byId["share-og"], [1200, 630]);
  assert.deepEqual(byId["youtube-thumb"], [1280, 720]);
  assert.deepEqual(byId["portrait-3x4"], [1080, 1440]);
  assert.equal(new Set(CHANNEL_SIZES.map((c) => c.id)).size, CHANNEL_SIZES.length);
});

test("파일 이름에 채널·크기", () => {
  assert.equal(channelFileName(CHANNEL_SIZES[1], 123), "감성글귀-insta-portrait-1080x1350-123.jpg");
});

test("v1.21 이미지 변환 스튜디오 규격과 같은 이름·숫자(공통 5종)", () => {
  const shared = { "insta-feed": [1080, 1080], "insta-portrait": [1080, 1350], story: [1080, 1920], "youtube-thumb": [1280, 720], "share-og": [1200, 630] };
  for (const [id, wh] of Object.entries(shared)) {
    const c = CHANNEL_SIZES.find((x) => x.id === id);
    assert.ok(c, id);
    assert.deepEqual([c.width, c.height], wh);
  }
});

test("v1.22 공용 기준 코드 사본에서 크기 목록을 만들고, 버튼에 비율 아이콘", () => {
  const ch = readFileSync(new URL("../src/lib/studio/channels.ts", import.meta.url), "utf8");
  assert.match(ch, /from "\.\/postPresets"/);
  assert.equal(CHANNEL_SIZES.length, 6);
  const q = readFileSync(new URL("../src/components/QuoteCanvas.tsx", import.meta.url), "utf8");
  assert.match(q, /16 \* c\.width\) \/ Math\.max\(c\.width, c\.height\)/);
});
