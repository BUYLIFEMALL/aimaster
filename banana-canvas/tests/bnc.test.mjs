import test from "node:test";
import assert from "node:assert/strict";
import { cleanParams, missingInput, buildTask } from "../src/lib/bnc/tasks.ts";
import { aspectAppendix, synthesisPrompt, comicPrompt, lifeAlbumPrompt, suggestGeneratePrompt, suggestEditPrompt, suggestSynthesisPrompt, storyPlanPrompt, recipePlanPrompt, yearGuard, KOREAN_PEOPLE_RULE } from "../src/lib/bnc/prompts.ts";
import { STYLES, PROCESSES, CATEGORIES, MATERIALS } from "../src/lib/bnc/styles.ts";
import { detectImage, sizeError, isOwnPath, inPath, outPath, isUuid, fileBase } from "../src/lib/bnc/paths.ts";

const UID = "11111111-2222-4333-8444-555555555555";
const FID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

test("프리셋 규모: 스타일 20종·처리 4종·카테고리 11종", () => {
  assert.equal(STYLES.length, 20);
  assert.equal(PROCESSES.length, 4);
  assert.equal(CATEGORIES.length, 11);
  assert.equal(new Set(STYLES.map((s) => s.id)).size, 20);
  for (const id of Object.keys(MATERIALS)) assert.ok(STYLES.some((s) => s.id === id), id);
});

test("cleanParams: 잘못된 값은 안전하게 정리", () => {
  assert.equal(cleanParams(null), null);
  assert.equal(cleanParams({ kind: "hack" }), null);
  const p = cleanParams({ kind: "edit", model: "x", processes: ["restore", "nope", "restore"], style: "zzz", upscale: 4, aspect: "21:9", sources: ["a", 5, "b", "c", "d", "e", "f"], age: 999, category: "??" });
  assert.equal(p.model, "flash");
  assert.deepEqual(p.processes, ["restore"]);
  assert.equal(p.style, undefined);
  assert.equal(p.upscale, 4);
  assert.equal(p.aspect, undefined);
  assert.equal(p.sources.length, 5);
  assert.equal(p.age, 120);
  assert.equal(p.category, "default");
  assert.equal(cleanParams({ kind: "comic", comicStyle: "x", comicLang: "en" }).comicStyle, "noir");
});

test("missingInput: 종류별 필수 입력 안내", () => {
  assert.equal(missingInput(cleanParams({ kind: "generate" })), "생성할 이미지의 아이디어를 입력해 주세요.");
  assert.equal(missingInput(cleanParams({ kind: "generate", prompt: "고양이" })), null);
  assert.match(missingInput(cleanParams({ kind: "edit" })), /원본 이미지/);
  assert.match(missingInput(cleanParams({ kind: "edit", base: "x" })), /처리 방식/);
  assert.equal(missingInput(cleanParams({ kind: "edit", base: "x", style: "oil" })), null);
  assert.match(missingInput(cleanParams({ kind: "synthesis", base: "x" })), /소스/);
  assert.match(missingInput(cleanParams({ kind: "synthesis", base: "x", sources: ["s"] })), /설명/);
  assert.match(missingInput(cleanParams({ kind: "inpaint", base: "x" })), /브러시/);
  assert.match(missingInput(cleanParams({ kind: "lifealbum", base: "x" })), /나이/);
  assert.equal(missingInput(cleanParams({ kind: "bgremove", base: "x" })), null);
  assert.equal(missingInput(cleanParams({ kind: "story", prompt: "a" })), null);
  assert.match(missingInput(cleanParams({ kind: "recipe" })), /요리/);
});

test("buildTask(edit): 처리·스타일·추가요청 결합, 업스케일 후처리, 배경 지시", () => {
  const p = cleanParams({ kind: "edit", base: "x", processes: ["restore", "upscale"], style: "oil", prompt: "배경에 은하수", upscale: 4 });
  const t = buildTask(p, { bgEmpty: false });
  assert.equal(t.post, "upscale");
  assert.equal(t.upscale, 4);
  assert.ok(t.prompt.startsWith("Dramatically enhance"));
  assert.ok(t.prompt.includes("Restore this image") && t.prompt.includes("oil painting") && t.prompt.includes("배경에 은하수"));
  assert.ok(!t.prompt.includes("SPECIAL INSTRUCTION"));
  const t2 = buildTask(cleanParams({ kind: "edit", base: "x", style: "neon" }), { bgEmpty: true });
  assert.ok(t2.prompt.includes("SPECIAL INSTRUCTION"));
  assert.equal(t2.post, "none");
});

test("buildTask: 종류별 파이프라인", () => {
  const g = buildTask(cleanParams({ kind: "generate", prompt: "우주를 나는 고양이", aspect: "16:9" }), { bgEmpty: false });
  assert.equal(g.needs.base, false);
  assert.equal(g.aspect, "16:9");
  assert.ok(g.prompt.includes(KOREAN_PEOPLE_RULE));
  assert.equal(buildTask(cleanParams({ kind: "bgremove", base: "x" }), { bgEmpty: false }).post, "chromakey");
  assert.equal(buildTask(cleanParams({ kind: "inpaint", base: "x", mask: "m" }), { bgEmpty: false }).needs.mask, true);
  assert.equal(buildTask(cleanParams({ kind: "idphoto", base: "x" }), { bgEmpty: false }).aspect, "3:4");
  assert.equal(buildTask(cleanParams({ kind: "story", prompt: "a" }), { bgEmpty: false }).mode, "story");
  assert.equal(buildTask(cleanParams({ kind: "story", prompt: "a" }), { bgEmpty: false }).estimate, 8);
  assert.equal(buildTask(cleanParams({ kind: "recipe", prompt: "마카롱" }), { bgEmpty: false }).mode, "recipe");
  assert.equal(buildTask(cleanParams({ kind: "synthesis", base: "x", sources: ["s"], prompt: "갑옷", aspect: "16:9" }), { bgEmpty: false }).needs.sources, true);
});

test("프롬프트: 종횡비 부록·얼굴 고정·만화·인생 앨범·제안 템플릿·연도", () => {
  assert.equal(aspectAppendix("original"), "");
  assert.ok(aspectAppendix("16:9").includes("16:9") && aspectAppendix("16:9").includes("outpainting"));
  const s = synthesisPrompt("갑옷을 입혀줘", true, "original");
  assert.ok(s.includes("FACIAL IDENTITY LOCK") && s.includes("BACKGROUND GENERATION") && s.includes("갑옷을 입혀줘"));
  assert.ok(synthesisPrompt("a", false, "1:1").includes("BACKGROUND INTEGRATION"));
  assert.ok(comicPrompt("webtoon", "ko", "안녕", "4:3").includes('"안녕"'));
  assert.ok(comicPrompt("noir", "ko", "", "original").includes("must NOT contain any text"));
  assert.ok(lifeAlbumPrompt(25, "9:16").includes("25 years old") && lifeAlbumPrompt(25, "9:16").includes("9:16"));
  const year = new Date().getFullYear();
  assert.ok(yearGuard().includes(`${year}년`));
  assert.ok(suggestEditPrompt({ processes: [], style: "유화", custom: "", bgEmpty: false, styleId: "oil" }).includes("Materials & Textures"));
  assert.ok(suggestEditPrompt({ processes: [], style: null, custom: "", bgEmpty: true }).includes("transparent or meaningless"));
  assert.ok(suggestGeneratePrompt("고양이", "food").includes("Food Photo Template"));
  assert.ok(suggestGeneratePrompt("고양이", "default").includes("creative prompt generation expert"));
  assert.ok(suggestSynthesisPrompt(true, "16:9").includes("Part C"));
  assert.ok(storyPlanPrompt("모험", true).includes("BEGIN from") && storyPlanPrompt("모험", false).includes("8 scenes"));
  assert.ok(recipePlanPrompt("마카롱").includes(`${year}년`));
});

test("paths: 이미지 판별·크기·소유 경로", () => {
  assert.deepEqual(detectImage("a.JPG", ""), { mime: "image/jpeg", ext: "jpg" });
  assert.deepEqual(detectImage("a.bin", "image/png"), { mime: "image/png", ext: "png" });
  assert.equal(detectImage("a.gif", "image/gif"), null);
  assert.equal(sizeError(1000), null);
  assert.match(sizeError(16 * 1024 * 1024), /15MB/);
  assert.match(sizeError(0), /빈 파일/);
  const i = inPath(UID, FID, "png");
  const o = outPath(UID, FID, "jpg");
  assert.equal(i, `${UID}/in/${FID}.png`);
  assert.equal(isOwnPath(UID, i), true);
  assert.equal(isOwnPath(UID, o), true);
  assert.equal(isOwnPath("99999999-2222-4333-8444-555555555555", i), false);
  assert.equal(isOwnPath(UID, `${UID}/x/${FID}.png`), false);
  assert.equal(isOwnPath(UID, `${UID}/in/../${FID}.png`), false);
  assert.equal(isUuid(FID), true);
  assert.equal(fileBase("내 사진 (1).png"), "내-사진-1");
});
