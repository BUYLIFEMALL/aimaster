// v1.18 「내 작업 레시피」·「이 컷만 다시」(이미지 카테고리 플랜 F2) — 무료 시험(AI 호출 없음)
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cleanPresetName, cleanPresetSettings, presetFromRecord, isPresetKind, MAX_PRESETS } from "../src/lib/bnc/presets.ts";
import { recutPlan, replaceOutput, RECUT_LOCK_MS } from "../src/lib/bnc/recut.ts";
import { GRAPHIC_TEMPLATES, GRAPHIC_STYLES } from "../src/lib/bnc/graphicTemplates.ts";

const UID = "11111111-2222-4333-8444-555555555555";
const out = (n, text) => ({ path: `${UID}/out/aaaaaaaa-bbbb-4ccc-8ddd-00000000000${n}.png`, mime: "image/png", w: 1, h: 1, text });
const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

test("레시피 이름·종류 정리", () => {
  assert.equal(cleanPresetName("  빈티지   필름 "), "빈티지 필름");
  assert.equal(cleanPresetName("   "), null);
  assert.equal(cleanPresetName("가".repeat(40)).length, 30);
  assert.equal(isPresetKind("edit"), true);
  assert.equal(isPresetKind("story"), false);
  assert.equal(MAX_PRESETS, 20);
});

test("편집 레시피: 목록에 있는 처리·스타일만, 비어 있으면 저장 안 함", () => {
  assert.equal(cleanPresetSettings("edit", { processes: ["nope"], style: "zzz", prompt: "" }), null);
  const e = cleanPresetSettings("edit", { processes: ["restore", "restore", "hack"], style: "zzz", prompt: "  밝게  ", upscale: 7 });
  assert.deepEqual(e, { processes: ["restore"], style: "", prompt: "밝게", upscale: 2 });
});

test("복원·만화 레시피: 잘못된 값은 기본값으로", () => {
  assert.deepEqual(cleanPresetSettings("restore", { repair: false, upscale: 4, aspect: "21:9", prompt: "x" }), { repair: false, colorize: true, upscale: 4, aspect: "original", prompt: "x" });
  assert.deepEqual(cleanPresetSettings("comic", { comicStyle: "evil", comicLang: "en", aspect: "9:16", comicText: "대사" }), { comicStyle: "noir", comicLang: "en", aspect: "4:3" });
});

test("기록에서 레시피 만들기: 편집 기록의 options + prompt", () => {
  const s = presetFromRecord("edit", { model: "flash", processes: ["restore"], style: undefined, upscale: 0 }, "배경 정리");
  assert.deepEqual(s, { processes: ["restore"], style: "", prompt: "배경 정리", upscale: 2 });
  assert.equal(presetFromRecord("story", {}, "x"), null);
});

test("컷 다시 만들기 계획: 스토리는 앞 컷 그림·등장인물, 첫 컷은 처음 원본", () => {
  const row = { kind: "story", prompt: "여행자", options: { model: "pro", storyCharacter: "빨간 모자 소녀" }, outputs: [out(1, "숲길"), out(2, "오두막"), out(3, "밤")], input_paths: [`${UID}/in/aaaaaaaa-bbbb-4ccc-8ddd-000000000009.jpg`] };
  const p = recutPlan(row, 1);
  assert.equal(p.mode, "story");
  assert.equal(p.prevPath, row.outputs[0].path);
  assert.equal(p.character, "빨간 모자 소녀");
  assert.equal(p.text, "오두막");
  assert.equal(p.total, 3);
  assert.equal(p.model, "pro");
  assert.equal(p.aspect, "16:9");
  assert.equal(recutPlan(row, 0).prevPath, row.input_paths[0]);
  // 옛 기록(등장인물 설명 없음)도 앞 컷만으로 다시 만든다
  assert.equal(recutPlan({ ...row, options: {} }, 2).character, "");
});

test("컷 다시 만들기 계획: 레시피는 요리 이름 + 단계 그림 지시, 실패해 글만 남은 단계도 가능", () => {
  const row = { kind: "recipe", prompt: "마카롱", options: { stepPrompts: ["반죽 섞기 클로즈업", ""] }, outputs: [out(1, "반죽을 섞는다"), { path: "", mime: "", w: 0, h: 0, text: "굽는다" }], input_paths: [] };
  const a = recutPlan(row, 0);
  assert.equal(a.stepPrompt, "반죽 섞기 클로즈업");
  assert.equal(a.dish, "마카롱");
  assert.equal(a.aspect, "4:3");
  assert.equal(recutPlan(row, 1).stepPrompt, "굽는다");
});

test("컷 다시 만들기 계획: 안 되는 경우는 한국어 안내", () => {
  const row = { kind: "story", prompt: "", options: {}, outputs: [out(1, "a")], input_paths: [] };
  assert.equal(typeof recutPlan({ ...row, kind: "edit" }, 0), "string");
  assert.equal(typeof recutPlan(row, 5), "string");
  assert.equal(typeof recutPlan(row, -1), "string");
  assert.equal(typeof recutPlan(row, "1; drop"), "string");
  assert.equal(typeof recutPlan({ ...row, outputs: [out(1, "")] }, 0), "string");
  assert.equal(typeof recutPlan({ ...row, kind: "recipe", prompt: "" }, 0), "string");
});

test("한 칸만 바꾸고 나머지는 그대로", () => {
  const a = [out(1, "a"), out(2, "b")];
  const b = replaceOutput(a, 1, out(3, "b"));
  assert.equal(b[0], a[0]);
  assert.equal(b[1].path, out(3, "b").path);
  assert.ok(RECUT_LOCK_MS >= 3 * 60 * 1000);
});

test("서버 코드: 권한·본인 키·선점(이중 과금 방지)·본인 행만", () => {
  const r = read("../src/app/api/run/recut/route.ts");
  assert.match(r, /guardAi\(request\)/);
  assert.match(r, /busy_until\.is\.null,busy_until\.lt\./);
  assert.match(r, /\.eq\("user_id", g\.userId\)/);
  assert.match(r, /catch \(e\) \{\s*await release\(\);/);
  assert.match(r, /maxDuration = 300/);
  const pr = read("../src/app/api/presets/route.ts");
  assert.ok((pr.match(/checkProgramAccessApi\(\)/g) ?? []).length >= 3);
  assert.match(pr, /\.delete\(\)\.eq\("id", id\)\.eq\("user_id", access\.user\.id\)/);
  assert.match(pr, />= MAX_PRESETS/);
});

test("새 스토리·레시피는 다시 만들기에 필요한 정보를 기록에 남긴다", () => {
  assert.match(read("../src/lib/runner.ts"), /meta: \{ storyCharacter: character \}/);
  assert.match(read("../src/lib/runner.ts"), /meta: \{ stepPrompts:/);
  assert.match(read("../src/app/api/run/route.ts"), /\.\.\.result\.meta \}/);
});

// v1.19 템플릿 그래픽 레시피·이름 바꾸기
test("그래픽 레시피: 목록에 있는 템플릿·화풍·언어, 그 템플릿에 있는 칸만", () => {
  const tpl = GRAPHIC_TEMPLATES.find((t) => t.fields.length > 0);
  const f0 = tpl.fields[0].id;
  const g = cleanPresetSettings("graphic", {
    templateId: tpl.id, fields: { [f0]: "  카페   오픈 ", hacked: "x" }, preset: "nope", languages: ["한국어", "클링온"],
    prompt: "할인 문구", aspect: "21:9", imageSize: "8K", maintainSubject: false,
  });
  assert.equal(g.templateId, tpl.id);
  assert.deepEqual(g.fields, { [f0]: "카페 오픈" });
  assert.equal(g.preset, "");
  assert.deepEqual(g.languages, ["한국어"]);
  assert.equal(g.aspect, "1:1");
  assert.equal(g.imageSize, "1K");
  assert.equal(g.maintainSubject, false);
  assert.equal(cleanPresetSettings("graphic", { templateId: "없는-템플릿" }), null);
  const ok = cleanPresetSettings("graphic", { templateId: tpl.id, preset: GRAPHIC_STYLES[0].value, aspect: "9:16", imageSize: "2K" });
  assert.equal(ok.preset, GRAPHIC_STYLES[0].value);
  assert.equal(ok.aspect, "9:16");
  assert.equal(ok.imageSize, "2K");
});

test("기록에서 그래픽 레시피 만들기", () => {
  const tpl = GRAPHIC_TEMPLATES[0];
  const s = presetFromRecord("graphic", { templateId: tpl.id, fields: {}, languages: ["English"], aspect: "16:9", imageSize: "1K" }, "추가 요청");
  assert.equal(s.templateId, tpl.id);
  assert.equal(s.prompt, "추가 요청");
  assert.equal(s.aspect, "16:9");
  assert.equal(isPresetKind("graphic"), true);
});

test("이름 바꾸기: 권한 확인·본인 레시피만·이름 검사", () => {
  const pr = read("../src/app/api/presets/route.ts");
  assert.equal((pr.match(/checkProgramAccessApi\(\)/g) ?? []).length, 4);
  assert.match(pr, /update\(\{ name \}\)\.eq\("id", body\.id\)\.eq\("user_id", access\.user\.id\)/);
  assert.match(pr, /export async function PATCH[\s\S]*cleanPresetName\(body\.name\)/);
  const sql = read("../supabase/migrations/20261022_v1_19_presets_graphic_rename.sql");
  assert.match(sql, /'graphic'/);
  assert.match(sql, /for update using \(auth\.uid\(\) = user_id\)/);
});
