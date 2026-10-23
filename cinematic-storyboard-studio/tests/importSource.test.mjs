// v1.11 바나나 결과 → 스토리보드 참고 이미지 받기 판단(무료 시험)
import test from "node:test";
import assert from "node:assert/strict";
import { importSourceOf } from "../src/lib/importSource.ts";

const SB = "https://esgxyikcnnvmlhygjkth.supabase.co";
test("바나나 버킷 서명 주소만 받는다", () => {
  assert.equal(importSourceOf(`${SB}/storage/v1/object/sign/banana-canvas-files/u/out/a.png?token=t`, SB), "AI 바나나 캔버스");
  assert.equal(importSourceOf(`${SB}/storage/v1/object/sign/portrait-photo-files/u/a.jpg?token=t`, SB), "AI 인물사진"); // v1.15부터 받음
  assert.equal(importSourceOf(`${SB}/storage/v1/object/public/banana-canvas-files/u/a.png`, SB), null);
  assert.equal(importSourceOf("https://evil.example.com/storage/v1/object/sign/banana-canvas-files/a.png", SB), null);
  assert.equal(importSourceOf("x", SB), null);
});

test("v1.12 보낸 곳(?via=) 안내·돌아가기", async () => {
  const { viaSource } = await import("../src/lib/linkMark.ts");
  assert.equal(viaSource("banana-canvas").name, "바나나 캔버스");
  assert.equal(viaSource("x"), undefined);
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../src/components/studio/StudioWorkspace.tsx", import.meta.url), "utf8");
  assert.match(src, /viaSource\(params\.get\("via"\)\)/);
  assert.match(src, /data-via-back/);
});

test("v1.13 보낸 곳을 프로젝트에 저장(정해진 이름표만, 실패해도 만들기 성공)", async () => {
  const { readFileSync } = await import("node:fs");
  const api = readFileSync(new URL("../src/app/api/projects/route.ts", import.meta.url), "utf8");
  assert.match(api, /const source = viaSource\(body\?\.source\)\?\.key;/);
  assert.match(api, /if \(source\) await admin\.from\("storyboard_projects"\)\.update\(\{ source \}\)/);
  const ws = readFileSync(new URL("../src/components/studio/StudioWorkspace.tsx", import.meta.url), "utf8");
  assert.match(ws, /source: importVia\?\.key/);
  assert.match(ws, /if \(!fromImport\) \{\s*setImportNote\(null\);\s*setImportVia\(undefined\);/);
  const { viaSource } = await import("../src/lib/linkMark.ts");
  assert.equal(viaSource("banana-canvas")?.key, "banana-canvas");
  assert.equal(viaSource("x' or 1=1"), undefined);
});

test("v1.14 4컷 만화 완성작도 받는다(보낸 곳 이름표·저장은 같은 흐름)", async () => {
  assert.equal(importSourceOf(`${SB}/storage/v1/object/sign/four-cut-comics-files/u/a.jpg?token=t`, SB), "AI 4컷 만화");
  assert.equal(importSourceOf(`${SB}/storage/v1/object/public/four-cut-comics-files/u/a.jpg`, SB), null);
  const { viaSource } = await import("../src/lib/linkMark.ts");
  assert.equal(viaSource("four-cut-comics")?.back, "AI 4컷 만화로 돌아가기");
});

test("v1.15 인물사진 서버 보관 사진도 받는다(공개 주소·다른 버킷은 거절)", async () => {
  assert.equal(importSourceOf(`${SB}/storage/v1/object/public/portrait-photo-files/u/a.jpg`, SB), null);
  assert.equal(importSourceOf(`${SB}/storage/v1/object/sign/style-dna-images/u/a.jpg?token=t`, SB), null);
  const { viaSource } = await import("../src/lib/linkMark.ts");
  assert.equal(viaSource("portrait-photo")?.back, "AI 인물사진으로 돌아가기");
});
