// v1.10 「형식 바꾸기」로 받을 수 있는 주소(무료 시험)
import test from "node:test";
import assert from "node:assert/strict";
import { importSourceOf } from "../src/lib/importSource.ts";

const SB = "https://esgxyikcnnvmlhygjkth.supabase.co";
const sign = (bucket) => `${SB}/storage/v1/object/sign/${bucket}/u/x.jpg?token=abc`;

test("세 프로그램 버킷의 서명 주소는 받는다", () => {
  assert.equal(importSourceOf(sign("banana-canvas-files"), SB), "바나나 캔버스");
  assert.equal(importSourceOf(sign("portrait-photo-files"), SB), "AI 인물사진");
  assert.equal(importSourceOf(sign("four-cut-comics-files"), SB), "AI 4컷 만화");
});

test("다른 버킷·공개 주소·다른 호스트·http는 받지 않는다", () => {
  assert.equal(importSourceOf(sign("style-dna-images"), SB), null);
  assert.equal(importSourceOf(`${SB}/storage/v1/object/public/portrait-photo-files/u/x.jpg`, SB), null);
  assert.equal(importSourceOf("https://evil.example.com/storage/v1/object/sign/portrait-photo-files/x.jpg", SB), null);
  assert.equal(importSourceOf(sign("portrait-photo-files").replace("https:", "http:"), SB), null);
  assert.equal(importSourceOf("not a url", SB), null);
});

test("v1.19 보낸 곳(?via=) 안내·돌아가기", async () => {
  const { viaSource } = await import("../src/lib/linkMark.ts");
  assert.equal(viaSource("banana-canvas").url, "https://banana-canvas.buylife.xyz/history");
  assert.equal(viaSource("evil"), undefined);
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../src/components/tool/ConvertTool.tsx", import.meta.url), "utf8");
  assert.match(src, /viaSource\(params\.get\("via"\)\)/);
  assert.match(src, /data-via-back/);
});


test("v1.20 인물사진·4컷 이름표와 조사 맞춘 돌아가기 문구", async () => {
  const { viaSource } = await import("../src/lib/linkMark.ts");
  assert.equal(viaSource("portrait-photo").back, "AI 인물사진으로 돌아가기");
  assert.equal(viaSource("four-cut-comics").url, "https://four-cut-comics.buylife.xyz/works");
  assert.equal(viaSource("banana-canvas").back, "바나나 캔버스로 돌아가기");
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../src/components/tool/ConvertTool.tsx", import.meta.url), "utf8");
  assert.match(src, /↩ \{importVia\.back\}/);
});
