import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("v1.31 형식 바꾸기 링크가 보낸 곳(?via=four-cut-comics)을 함께 넘긴다", () => {
  const src = readFileSync(new URL("../src/components/studio/ServerWorks.tsx", import.meta.url), "utf8");
  assert.match(src, /image-convert-studio\.buylife\.xyz\/convert\?src=\$\{encodeURIComponent\(w\.url\)\}.*&via=four-cut-comics(&label=|`)/); // 2026-10-22 뒤에 &label= 붙음
});

test("v1.32 스토리보드로 링크가 서명 주소와 보낸 곳(?via=four-cut-comics)을 넘긴다", () => {
  const src = readFileSync(new URL("../src/components/studio/ServerWorks.tsx", import.meta.url), "utf8");
  assert.match(src, /cinematic-storyboard-studio\.buylife\.xyz\/studio\?src=\$\{encodeURIComponent\(w\.url\)\}&via=four-cut-comics`/);
});

test("v1.34 다시 저장: 첫 바이트로 형식 판별·그림만 있는 작품 항목·옛 목록 검사 통과", async () => {
  const { importedMeta, parseIndex } = await import("../src/lib/comic/savedIndex.ts");
  const { detectImageExt } = await import("../src/lib/resaveReceiver.ts"); // 2026-10-22 공용 기준 코드로 옮김
  assert.equal(detectImageExt(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), "jpg");
  assert.equal(detectImageExt(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "png");
  assert.equal(detectImageExt(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ")), "webp");
  assert.equal(detectImageExt(new TextEncoder().encode("<svg>")), null);
  const m = importedMeta({ id: "123e4567-e89b-12d3-a456-426614174000", ext: "webp", bytes: 10, now: new Date("2026-10-22T00:00:00Z") });
  assert.equal(m.imported, "image-convert-studio");
  assert.equal(parseIndex([m]).length, 1);
  assert.equal(m.expiresAt, "2026-11-21T00:00:00.000Z");
  const api = readFileSync(new URL("../src/app/api/import-result/route.ts", import.meta.url), "utf8");
  assert.match(api, /resaveCors\(request\.headers\.get\("origin"\)\)/); // 2026-10-22 공용 기준 코드 사용
  assert.match(api, /checkProgramAccessApi\(\)/);
  assert.doesNotMatch(api, /Access-Control-Allow-Origin": "\*"/);
  const saved = readFileSync(new URL("../src/lib/saved.ts", import.meta.url), "utf8");
  assert.match(saved, /imagePath\(userId, m\.id, m\.ext\)/);
  const ui = readFileSync(new URL("../src/components/studio/ServerWorks.tsx", import.meta.url), "utf8");
  assert.match(ui, /\{!w\.imported && <button[^>]*>.*대본<\/button>\}/);
});

test("v1.34 인스타 예약 후보에서 다시 저장한 작품 제외", () => {
  const ui = readFileSync(new URL("../src/components/studio/WorksInstaSchedule.tsx", import.meta.url), "utf8");
  assert.match(ui, /items\.filter\(\(it\) => it\.url && !it\.imported\)/);
});

test("공용 기준 코드 resave-receiver: CORS·본문·이름표(4컷이 기준)", async () => {
  const { resaveCors, readResaveBody, cleanResaveLabel, RESAVE_ORIGIN } = await import("../src/lib/resaveReceiver.ts");
  assert.equal(resaveCors(RESAVE_ORIGIN)["Access-Control-Allow-Origin"], RESAVE_ORIGIN);
  assert.deepEqual(resaveCors("https://evil.example.com"), {});
  assert.deepEqual(resaveCors(null), {});
  assert.equal(cleanResaveLabel("고양이\n일기 3화\u0007"), "고양이 일기 3화");
  assert.equal(cleanResaveLabel("가".repeat(80)).length, 60);
  assert.equal(cleanResaveLabel(3), "");
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(120)]).toString("base64");
  const ok = readResaveBody(JSON.stringify({ image: { data: png }, label: "냥 2화" }), 3_000_000);
  assert.equal(ok.ok, true); assert.equal(ok.ext, "png"); assert.equal(ok.label, "냥 2화");
  assert.equal(readResaveBody(JSON.stringify({ image: { data: Buffer.alloc(120).toString("base64") } }), 3_000_000).status, 400);
  assert.equal(readResaveBody("x".repeat(3_002_001), 3_000_000).status, 413);
  const { importedMeta } = await import("../src/lib/comic/savedIndex.ts");
  assert.equal(importedMeta({ id: "123e4567-e89b-12d3-a456-426614174000", ext: "webp", bytes: 1, label: "냥 2화" }).title, "냥 2화 · WEBP");
  const ui = readFileSync(new URL("../src/components/studio/ServerWorks.tsx", import.meta.url), "utf8");
  assert.match(ui, /&via=four-cut-comics&label=\$\{encodeURIComponent\(/);
});
