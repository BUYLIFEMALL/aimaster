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

test("v1.21 받은 그림의 변환을 처음 마치면 보낸 곳으로 변환 완료 신호(정해진 이름표만·한 번만)", async () => {
  const { readFileSync } = await import("node:fs");
  const tool = readFileSync(new URL("../src/components/tool/ConvertTool.tsx", import.meta.url), "utf8");
  assert.match(tool, /importedFile\.current = imported;/);
  assert.match(tool, /if \(item\.file === importedFile\.current\) markLinkDone\(importVia\?\.key\);/);
  const lib = readFileSync(new URL("../src/lib/linkDone.ts", import.meta.url), "utf8");
  assert.match(lib, /once\(via, \(\) => \{/);
  assert.match(lib, /"\/api\/link-done"/);
  const api = readFileSync(new URL("../src/app/api/link-done/route.ts", import.meta.url), "utf8");
  assert.match(api, /checkProgramAccessApi\(\)/);
  assert.match(api, /const via = viaSource\(body\?\.via\)\?\.key;/);
  assert.match(api, /action: "linked_convert", metadata: \{ via \}/);
  assert.match(api, /export const dynamic = "force-dynamic";/);
  assert.match(api, /export const fetchCache = "force-no-store";/);
});

test("v1.22 보관함에 다시 저장: 인물사진에서 온 JPEG·PNG·WebP만", async () => {
  const { resaveTarget } = await import("../src/lib/resave.ts");
  assert.equal(resaveTarget("portrait-photo", "image/webp")?.api, "https://portrait-photo.buylife.xyz/api/saved");
  assert.equal(resaveTarget("portrait-photo", "image/avif"), null);
  assert.equal(resaveTarget("banana-canvas", "image/png")?.api, "https://banana-canvas.buylife.xyz/api/import-result"); // v1.23부터
  assert.equal(resaveTarget(undefined, "image/png"), null);
  const { readFileSync } = await import("node:fs");
  const lib = readFileSync(new URL("../src/lib/resave.ts", import.meta.url), "utf8");
  assert.match(lib, /credentials: "include"/);
  const tool = readFileSync(new URL("../src/components/tool/ConvertTool.tsx", import.meta.url), "utf8");
  assert.match(tool, /item\.file === importedFile\.current && importVia && resaveTarget\(importVia\.key, item\.result\.blob\.type\)/);
});

test("v1.23 다시 저장 뒤 보관함 열기 링크·4컷은 아직 대상 아님", async () => {
  const { resaveTarget } = await import("../src/lib/resave.ts");
  assert.equal(resaveTarget("banana-canvas", "image/webp")?.open, "https://banana-canvas.buylife.xyz/history");
  assert.equal(resaveTarget("portrait-photo", "image/jpeg")?.open, "https://portrait-photo.buylife.xyz/history");
  assert.equal(resaveTarget("four-cut-comics", "image/png"), null);
  const { readFileSync } = await import("node:fs");
  const tool = readFileSync(new URL("../src/components/tool/ConvertTool.tsx", import.meta.url), "utf8");
  assert.match(tool, /data-resave-open/);
});
