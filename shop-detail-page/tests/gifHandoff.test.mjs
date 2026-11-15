// 공용 gif-handoff 받는 쪽 시험 — 2026-11-15 애니메이션 WebP 받기 추가. 실행: node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import {
  GIF_RECEIVER_ORIGIN,
  GIF_SENDER_ORIGIN,
  MSG_FILE,
  gifFileName,
  isAnimatedImageUrl,
  isAnimatedWebp,
  readFileMessage,
} from "../lib/gifHandoff.ts";

const msg = (file, name = "상품영상.webp") => ({ type: MSG_FILE, name, file });

test("GIF·WebP 받기: 형식·크기·보낸 곳", () => {
  const gif = readFileMessage(GIF_SENDER_ORIGIN, msg(new Blob(["GIF89a"], { type: "image/gif" }), "a.gif"));
  assert.deepEqual(gif && "name" in gif ? gif.name : gif, "a.gif");
  const webp = readFileMessage(GIF_SENDER_ORIGIN, msg(new Blob(["RIFF"], { type: "image/webp" })));
  assert.equal(webp && "name" in webp ? webp.name : webp, "상품영상.webp");
  assert.deepEqual(readFileMessage(GIF_SENDER_ORIGIN, msg(new Blob(["x"], { type: "image/png" }))), { error: "GIF·WebP 파일만 받을 수 있습니다." });
  assert.match(readFileMessage(GIF_SENDER_ORIGIN, msg(new Blob([], { type: "image/webp" }))).error, /10MB/);
  assert.equal(readFileMessage(GIF_RECEIVER_ORIGIN, msg(new Blob(["x"], { type: "image/webp" }))), null); // 다른 곳에서 온 메시지는 무시
});

test("이름: 경로 글자 지우고 형식대로 끝", () => {
  assert.equal(gifFileName("a/b.mp4"), "ab.gif");
  assert.equal(gifFileName("", "webp"), "animation.webp");
  assert.equal(gifFileName("상품.gif", "webp"), "상품.webp");
});

function webpHead(flags) {
  const h = new Uint8Array(32);
  const put = (o, s) => [...s].forEach((c, i) => (h[o + i] = c.charCodeAt(0)));
  put(0, "RIFF"); put(8, "WEBP"); put(12, "VP8X");
  h[20] = flags;
  return h;
}

test("움직이는 WebP 판단: VP8X 움직임 표시", () => {
  assert.equal(isAnimatedWebp(webpHead(0x02)), true);
  assert.equal(isAnimatedWebp(webpHead(0x12)), true); // 움직임 + 투명
  assert.equal(isAnimatedWebp(webpHead(0x10)), false); // 투명만
  const lossy = webpHead(0); "VP8 ".split("").forEach((c, i) => (lossy[12 + i] = c.charCodeAt(0)));
  assert.equal(isAnimatedWebp(lossy), false); // 일반 WebP
  assert.equal(isAnimatedWebp(new Uint8Array(10)), false);
});

test("주소로 움직이는 그림 판단", () => {
  assert.equal(isAnimatedImageUrl("https://x/a/b-1.gif"), true);
  assert.equal(isAnimatedImageUrl("https://x/a/b-1-anim.webp?token=1"), true);
  assert.equal(isAnimatedImageUrl("https://x/a/b-1.webp"), false);
  assert.equal(isAnimatedImageUrl(null), false);
});
