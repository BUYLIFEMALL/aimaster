// 실행: node --test lib/shopPayload.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHOP_MAX_BYTES, shopKind, shopPayload, shopSizeError } from "./shopPayload.ts";
import { GIF_ACCEPT_TYPES, GIF_MAX_BYTES, GIF_SENDER_ORIGIN, MSG_FILE, readFileMessage } from "./gifHandoff.ts";

test("크기 기준이 받는 쪽 약속(10MB)과 같다", () => {
  assert.equal(SHOP_MAX_BYTES, GIF_MAX_BYTES);
});

test("결과 종류: WebP 형식·.webp 이름은 WebP, 그 밖은 GIF(기존 동작)", () => {
  assert.equal(shopKind("image/webp", "a"), "webp");
  assert.equal(shopKind("", "상품A.WEBP"), "webp");
  assert.equal(shopKind("image/gif", "clip.mp4"), "gif");
  assert.equal(shopKind("", "clip"), "gif");
});

test("크기 경계: 0바이트·10MB 초과는 막고 정확히 10MB는 통과", () => {
  assert.match(shopSizeError(0) ?? "", /비어/);
  assert.equal(shopSizeError(1), null);
  assert.equal(shopSizeError(GIF_MAX_BYTES), null);
  assert.match(shopSizeError(GIF_MAX_BYTES + 1) ?? "", /10MB 이하/);
});

test("WebP 결과는 image/webp·.webp로, GIF 결과는 image/gif·.gif로 보낸다", () => {
  const w = shopPayload(new Blob([new Uint8Array(5)], { type: "image/webp" }), "상품A.webp");
  assert.ok(!("error" in w));
  assert.equal(w.file.type, "image/webp");
  assert.equal(w.name, "상품A.webp");
  assert.equal(w.kind, "webp");
  const g = shopPayload(new Blob([new Uint8Array(5)], { type: "image/gif" }), "clip.mp4");
  assert.ok(!("error" in g));
  assert.equal(g.file.type, "image/gif");
  assert.equal(g.name, "clip.gif");
  assert.equal(g.file.size, 5);
});

test("10MB 초과는 보내기 전에 오류로 막는다", () => {
  const big = shopPayload(new Blob([new Uint8Array(GIF_MAX_BYTES + 1)], { type: "image/webp" }), "x.webp");
  assert.ok("error" in big);
});

test("보낸 메시지를 받는 쪽 검사(readFileMessage)가 그대로 받아들인다 — WebP·GIF 모두", () => {
  const cases: Array<[string, string]> = [["image/webp", "상품A.webp"], ["image/gif", "clip.mp4"]];
  for (const [type, name] of cases) {
    const p = shopPayload(new Blob([new Uint8Array(8)], { type }), name);
    assert.ok(!("error" in p));
    assert.ok((GIF_ACCEPT_TYPES as readonly string[]).includes(p.file.type));
    const got = readFileMessage(GIF_SENDER_ORIGIN, { type: MSG_FILE, name: p.name, file: p.file });
    assert.ok(got && !("error" in got));
    assert.equal(got.name, p.name);
  }
});

test("다른 주소에서 온 메시지는 받는 쪽이 무시한다(신뢰 주소만)", () => {
  const p = shopPayload(new Blob([new Uint8Array(8)], { type: "image/webp" }), "a.webp");
  assert.ok(!("error" in p));
  assert.equal(readFileMessage("https://evil.example", { type: MSG_FILE, name: p.name, file: p.file }), null);
  assert.equal(readFileMessage("http://video-to-gif.buylife.xyz", { type: MSG_FILE, name: p.name, file: p.file }), null);
});
