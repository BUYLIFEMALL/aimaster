import test from "node:test";
import assert from "node:assert/strict";
import { detectMedia, sizeError, isOwnTempPath, tempPath, cleanThumb, fileBase, SIZE_LIMIT } from "../src/lib/rpa/media.ts";
import { normalize, parseJsonLoose, mainPrompt, withEditedPrompt, buildMidjourneyCommand, responseSchema, toMarkdown } from "../src/lib/rpa/schemas.ts";
import { analysisPrompt, yearGuard, SYSTEM_INSTRUCTION } from "../src/lib/rpa/prompts.ts";
import { cleanOptions } from "../src/lib/rpa/validate.ts";

const UID = "11111111-2222-4333-8444-555555555555";
const FID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

test("detectMedia: MIME·확장자·별칭으로 종류 판별", () => {
  assert.deepEqual(detectMedia("a.JPG", "image/jpeg"), { media: "image", mime: "image/jpeg", ext: "jpg" });
  assert.equal(detectMedia("song.mp3", "audio/mpeg").mime, "audio/mp3");
  assert.equal(detectMedia("clip.mov", "").media, "video");
  assert.equal(detectMedia("clip.mov", "").mime, "video/quicktime");
  assert.equal(detectMedia("x.exe", "application/octet-stream"), null);
  assert.equal(detectMedia("doc.pdf", "application/pdf"), null);
});

test("sizeError: 종류별 상한과 안내", () => {
  assert.equal(sizeError("image", 5 * 1024 * 1024), null);
  assert.match(sizeError("image", SIZE_LIMIT.image + 1), /20MB/);
  assert.match(sizeError("video", SIZE_LIMIT.video + 1), /50MB/);
  assert.match(sizeError("audio", 0), /빈 파일/);
});

test("임시 경로: 본인 폴더·형식만 허용", () => {
  const p = tempPath(UID, FID, "mp4");
  assert.equal(p, `${UID}/${FID}.mp4`);
  assert.equal(isOwnTempPath(UID, p), true);
  assert.equal(isOwnTempPath("99999999-2222-4333-8444-555555555555", p), false);
  assert.equal(isOwnTempPath(UID, `${UID}/../${FID}.mp4`), false);
  assert.equal(isOwnTempPath(UID, `${UID}/x/${FID}.mp4`), false);
  assert.equal(isOwnTempPath(UID, 123), false);
  assert.equal(tempPath(UID, FID, "../x"), `${UID}/${FID}.bin`);
});

test("cleanThumb·fileBase", () => {
  assert.equal(cleanThumb("data:image/jpeg;base64,AAAA"), "data:image/jpeg;base64,AAAA");
  assert.equal(cleanThumb("data:image/png;base64,AAAA"), null);
  assert.equal(cleanThumb("data:image/jpeg;base64," + "A".repeat(21000)), null);
  assert.equal(fileBase("내 사진 (1).final.png"), "내-사진-1-final");
});

test("parseJsonLoose", () => {
  assert.deepEqual(parseJsonLoose('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(parseJsonLoose('설명 {"a":2} 끝'), { a: 2 });
  assert.equal(parseJsonLoose("nope"), null);
});

const rawImage = {
  visual_analysis: { subject_details: "붉은 코트의 여성", environment: "비 오는 서울 거리", lighting_style: "네온 역광", color_grade: ["teal", "magenta"], composition_guide: "삼분할", artistic_style: "시네마틱" },
  midjourney_data: {
    prompt: "a woman in a red coat, neon-lit rainy Seoul street, cinematic", negative_prompt: "blurry, text",
    parameters: { aspect_ratio: "16:9", stylize: 5000, chaos: -4, weird: "200", version: "v7", tile: "false" },
  },
};

test("normalize(image): 범위 보정·명령어 조립", () => {
  const a = normalize("image", rawImage);
  assert.ok(a);
  const p = a.midjourney_data.parameters;
  assert.equal(p.stylize, 1000);
  assert.equal(p.chaos, 0);
  assert.equal(p.weird, 200);
  assert.equal(p.tile, false);
  assert.equal(p.aspect_ratio, "16:9");
  assert.equal(a.midjourney_data.full_command, "a woman in a red coat, neon-lit rainy Seoul street, cinematic --ar 16:9 --stylize 1000 --chaos 0 --weird 200 --v 7 --no blurry, text");
  assert.equal(mainPrompt("image", a), a.midjourney_data.full_command);
  assert.deepEqual(a.visual_analysis.color_grade, ["teal", "magenta"]);
});

test("normalize(image): Midjourney가 아닌 도구는 명령어=프롬프트", () => {
  const a = normalize("image", rawImage, "flux");
  assert.equal(a.midjourney_data.full_command, rawImage.midjourney_data.prompt);
  assert.equal(mainPrompt("image", a), rawImage.midjourney_data.prompt);
  const b = withEditedPrompt("image", a, { prompt: "new" }, "flux");
  assert.equal(b.midjourney_data.full_command, "new");
});

test("normalize: 주 프롬프트가 없거나 객체가 아니면 null", () => {
  assert.equal(normalize("image", { midjourney_data: {} }), null);
  assert.equal(normalize("video", { cinematography: {} }), null);
  assert.equal(normalize("audio", "x"), null);
  assert.equal(normalize("audio", null), null);
});

test("normalize(video/audio): 누락 필드 보정", () => {
  const v = normalize("video", { video_prompt: "A slow dolly-in on a lighthouse at dusk" });
  assert.equal(v.cinematography.shot_type, "");
  assert.equal(mainPrompt("video", v), "A slow dolly-in on a lighthouse at dusk");
  const au = normalize("audio", { audio_prompt: "lo-fi hip hop", musical_structure: { bpm: "86 BPM" }, instrumentation: { lead: "piano, rhodes" } });
  assert.equal(au.musical_structure.bpm, 86);
  assert.deepEqual(au.instrumentation.lead, ["piano", "rhodes"]);
});

test("withEditedPrompt: 편집 후 명령어 재조합", () => {
  const a = normalize("image", rawImage);
  const b = withEditedPrompt("image", a, { prompt: "a man in a blue coat", negative: "" });
  assert.equal(b.midjourney_data.full_command, "a man in a blue coat --ar 16:9 --stylize 1000 --chaos 0 --weird 200 --v 7");
  const v = withEditedPrompt("video", normalize("video", { video_prompt: "old" }), { prompt: "new" });
  assert.equal(v.video_prompt, "new");
  assert.equal(withEditedPrompt("audio", normalize("audio", { audio_prompt: "old" }), { prompt: "  " }), null);
});

test("buildMidjourneyCommand: 타일 포함", () => {
  const c = buildMidjourneyCommand("p", "", { aspect_ratio: "1:1", stylize: 100, chaos: 0, weird: 0, version: "6.1", tile: true });
  assert.equal(c, "p --ar 1:1 --stylize 100 --chaos 0 --weird 0 --v 6.1 --tile");
});

test("responseSchema: 종류별 최상위 키", () => {
  assert.deepEqual(Object.keys(responseSchema("image").properties), ["visual_analysis", "midjourney_data"]);
  assert.ok("video_prompt" in responseSchema("video").properties);
  assert.ok("audio_prompt" in responseSchema("audio").properties);
});

test("프롬프트: 당해 연도·언어·대상 도구·메모 반영", () => {
  const year = new Date().getFullYear();
  assert.ok(yearGuard().includes(`${year}년`));
  assert.ok(SYSTEM_INSTRUCTION.includes("Reverse Prompt Architect"));
  const p = analysisPrompt("video", { lang: "ko", model: "flash", target: "veo", length: "detailed", memo: "배경 위주로" });
  assert.ok(p.includes(`${year}년`) && p.includes("Veo") && p.includes("Korean") && p.includes("배경 위주로") && p.includes("120-180"));
  const q = analysisPrompt("image", { lang: "en", model: "flash", target: "flux", length: "short", memo: "" });
  assert.ok(q.includes("Flux") && q.includes("in English") && !q.includes("User note"));
});

test("cleanOptions: 종류에 없는 대상 도구는 기본값", () => {
  assert.equal(cleanOptions({ target: "suno" }, "image").target, "midjourney");
  assert.equal(cleanOptions({ target: "suno" }, "audio").target, "suno");
  const o = cleanOptions({ lang: "en", model: "pro", length: "short", memo: "  a   b " }, "video");
  assert.deepEqual(o, { lang: "en", model: "pro", target: "sora", length: "short", memo: "a b" });
  assert.equal(cleanOptions(null, "audio").model, "flash");
});

test("toMarkdown", () => {
  const md = toMarkdown("테스트", "image", normalize("image", rawImage));
  assert.ok(md.startsWith("# 테스트") && md.includes("## 추천 프롬프트") && md.includes("## 부정 프롬프트") && md.includes("visual_analysis"));
});
