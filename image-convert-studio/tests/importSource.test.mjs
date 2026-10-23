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
  assert.equal(resaveTarget("four-cut-comics", "image/png")?.name, "4컷 보관함"); // v1.24부터 대상
  const { readFileSync } = await import("node:fs");
  const tool = readFileSync(new URL("../src/components/tool/ConvertTool.tsx", import.meta.url), "utf8");
  assert.match(tool, /data-resave-open/);
});

test("v1.24 4컷 보관함도 다시 저장 대상·너무 큰 그림은 미리 알림", async () => {
  const { resaveTarget, resaveTooBig } = await import("../src/lib/resave.ts");
  assert.equal(resaveTarget("four-cut-comics", "image/webp")?.api, "https://four-cut-comics.buylife.xyz/api/import-result");
  assert.equal(resaveTarget("four-cut-comics", "image/webp")?.open, "https://four-cut-comics.buylife.xyz/works");
  assert.equal(resaveTooBig("portrait-photo", 2_250_000), false);
  assert.equal(resaveTooBig("portrait-photo", 2_250_001), true);
  assert.equal(resaveTooBig(undefined, 9_999_999), false);
  const { readFileSync } = await import("node:fs");
  const tool = readFileSync(new URL("../src/components/tool/ConvertTool.tsx", import.meta.url), "utf8");
  assert.match(tool, /resaveTooBig\(importVia\.key, item\.result\.blob\.size\) \?/);
  assert.match(tool, /data-resave-too-big/);
});

test("미배포 대기(2026-10-22): 보낸 쪽 이름표 전달·너무 큰 결과 품질 70%로 다시 변환", async () => {
  const { RESAVE_RETRY_QUALITY } = await import("../src/lib/resave.ts");
  assert.equal(RESAVE_RETRY_QUALITY, 0.7);
  const { readFileSync } = await import("node:fs");
  const lib = readFileSync(new URL("../src/lib/resave.ts", import.meta.url), "utf8");
  assert.match(lib, /label: label\.slice\(0, 60\)/);
  const tool = readFileSync(new URL("../src/components/tool/ConvertTool.tsx", import.meta.url), "utf8");
  assert.match(tool, /const label = \(params\.get\("label"\) \?\? ""\)\.slice\(0, 60\);/);
  assert.match(tool, /resaveToSender\(importVia\.key, item\.result!\.blob, importLabel\)/);
  assert.match(tool, /data-resave-retry/);
  assert.match(tool, /quality: Math\.min\(quality, RESAVE_RETRY_QUALITY\)/);
  assert.match(tool, /if \(blob\.size >= previous\.blob\.size\)/);
});

test("미배포 대기(2026-10-22): 이미지 스튜디오에서 받기·다시 저장, PNG는 WebP로 바꿔 다시 변환", async () => {
  const { importSourceOf } = await import("../src/lib/importSource.ts");
  const SB = "https://esgxyikcnnvmlhygjkth.supabase.co";
  assert.equal(importSourceOf(`${SB}/storage/v1/object/sign/ai-image-generations/u/a.png?token=t`, SB), "AI 이미지 스튜디오");
  const { resaveTarget } = await import("../src/lib/resave.ts");
  assert.equal(resaveTarget("ai-image-studio", "image/webp")?.api, "https://ai-image-studio.buylife.xyz/api/import-result");
  const { viaSource } = await import("../src/lib/linkMark.ts");
  assert.equal(viaSource("ai-image-studio")?.back, "AI 이미지 스튜디오로 돌아가기");
  const { readFileSync } = await import("node:fs");
  const tool = readFileSync(new URL("../src/components/tool/ConvertTool.tsx", import.meta.url), "utf8");
  assert.match(tool, /item\.result\.blob\.type === "image\/png" \? "WebP로 바꿔 다시 변환"/);
  assert.match(tool, /const toWebp = previous\.blob\.type === "image\/png";/);
});

test("미배포 대기(2026-10-23): 검수용 ?qa=big&via= 일 때만 큰 시험 그림 버튼", async () => {
  const { readFileSync } = await import("node:fs");
  const tool = readFileSync(new URL("../src/components/tool/ConvertTool.tsx", import.meta.url), "utf8");
  assert.match(tool, /if \(params\.get\("qa"\) === "big" && via\) setQaVia\(via\);/);
  assert.match(tool, /\{qaVia && \(/);
  assert.match(tool, /data-qa-big/);
});
