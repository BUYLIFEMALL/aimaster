// v1.26 보낸 곳 기록 — 무료 시험(Node 24 TS 타입 지우기로 공용 사본을 직접 불러옴)
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BANANA_SOURCES, isBananaSource } from "../lib/bananaIdeaLink.ts";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("공용 이름표에 있는 이름만 보낸 곳으로 받는다", () => {
  assert.equal(isBananaSource("style-dna-analyzer"), true);
  assert.equal(BANANA_SOURCES["style-dna-analyzer"].url, "https://style-dna-analyzer.buylife.xyz");
  assert.equal(isBananaSource("toString"), false);
  assert.equal(isBananaSource("<b>"), false);
});

test("대시보드 안내·생성 요청·기록 저장 연결", () => {
  const page = read("app/(dashboard)/dashboard/page.tsx");
  assert.match(page, /promptSourceInfo\(searchParams\.get\("src"\)\)/);
  assert.match(page, /ideaSource=\{promptSource\?\.key\}/);
  assert.match(read("components/Step2PlatformGenerator.tsx"), /options: optionValues,\s*ideaSource/);
  const route = read("app/api/generate/route.ts");
  assert.match(route, /const source = promptSourceKey\(ideaSource\)/);
  assert.match(route, /\.\.\.\(source \? \{ ideaSource: source \} : \{\}\)/);
});

test("v1.27 첫 다운로드·바나나로 보낸 시각 기록", () => {
  const route = read("app/api/generate/route.ts");
  assert.match(route, /\.select\("id"\)\.single\(\)/);
  assert.match(route, /logId: logIds\[0\] \?\? null/);
  const mark = read("app/api/gallery/mark/route.ts");
  assert.match(mark, /\.eq\("user_id", user\.id\)\.eq\("program_id", AI_IMAGE_STUDIO_PROGRAM_ID\)/);
  // 2026-10-22: 첫 1회만 저장·정해진 값은 공용 `link-mark`(동작 같음)
  assert.match(mark, /onceMarkNext\(data\.metadata/);
  assert.match(mark, /pickAllowed\(body\.kind, \["download", "banana"/);
  const viewer = read("components/ImageResultViewer.tsx");
  assert.match(viewer, /markLog\(logId, "download"\)/);
  assert.match(viewer, /markLog\(logId, "banana"\)/);
  const gallery = read("components/GalleryClient.tsx");
  assert.match(gallery, /markLog\(item\.id, "banana"\)/);
  assert.match(gallery, /handleDownload\(item\.image_url, item\.provider, item\.id\)/);
});

test("미배포 대기(2026-10-22): 갤러리 형식 바꾸기 링크·변환 스튜디오에서 다시 저장 받기", () => {
  const link = readFileSync(new URL("../lib/convertLink.ts", import.meta.url), "utf8");
  assert.match(link, /&via=ai-image-studio/);
  assert.match(link, /includes\("\/storage\/v1\/object\/sign\/ai-image-generations\/"\)/);
  const api = readFileSync(new URL("../app/api/import-result/route.ts", import.meta.url), "utf8");
  assert.match(api, /resaveCors\(request\.headers\.get\("origin"\)\)/);
  assert.match(api, /readResaveBody\(await request\.text\(\), MAX_IMPORT_B64\)/);
  assert.match(api, /action: "image_import"/);
  assert.match(api, /const path = `\$\{user\.id\}\//);
  const ui = readFileSync(new URL("../components/GalleryClient.tsx", import.meta.url), "utf8");
  assert.match(ui, /data-convert-link/);
});

test("v1.28: 갤러리 「변환됨」 표시·큰 보기 창 형식 바꾸기", () => {
  const page = readFileSync(new URL("../app/(dashboard)/gallery/page.tsx", import.meta.url), "utf8");
  assert.match(page, /action: log\.action as string/);
  const ui = readFileSync(new URL("../components/GalleryClient.tsx", import.meta.url), "utf8");
  assert.match(ui, /item\.action === "image_import" && \(/);
  assert.match(ui, /data-converted-badge/);
  assert.match(ui, /data-convert-link-modal/);
});

test("미배포 대기(2026-10-23): 다시 저장 배지 이름·형식 바꾸기 첫 클릭 기록(handoffs.convert)", () => {
  const ui = readFileSync(new URL("../components/GalleryClient.tsx", import.meta.url), "utf8");
  assert.match(ui, /"image-convert-studio": "이미지 변환 스튜디오"/);
  assert.equal((ui.match(/markLog\((item|activeModalItem)\.id, "convert"\)/g) || []).length, 2);
  const api = readFileSync(new URL("../app/api/gallery/mark/route.ts", import.meta.url), "utf8");
  assert.match(api, /\["download", "banana", "convert"\]/);
  assert.match(api, /\{ kind: "handoff", to: kind \}/);
});
