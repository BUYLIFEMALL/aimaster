import test from "node:test";
import assert from "node:assert/strict";
import { normalizePlan, normalizeSection, parseJsonLoose, cleanKeyword } from "../src/lib/lpa/plan.ts";
import { extractHtml, validateHtml, extractImageKeywords, replaceImages } from "../src/lib/lpa/html.ts";
import { cleanInputs, missingInputs } from "../src/lib/lpa/validate.ts";
import { planPrompt, codePrompt, yearGuard } from "../src/lib/lpa/prompts.ts";
import { TEMPLATES, templateById } from "../src/lib/lpa/templates.ts";
import { sanitizeDoc, stageOf } from "../src/lib/projects.ts";

const rawPlan = {
  projectInfo: { topic: "필라테스", target: "직장인", goal: "신청", layoutType: "hero" },
  structure: { mainPage: { title: "메인", sections: [{ id: "a", title: "소개", description: "d" }] }, subPages: [{ id: "s1", title: "A", path: "/a" }] },
  contentStrategy: { headline: "헤드라인", subHeadline: "서브", cta: "신청", keyMessages: ["m"] },
  designSystem: { primaryColor: "#112233", secondaryColor: "red", backgroundColor: "#ffffff" },
  developmentGuide: {},
  imageAssets: [{ name: "hero", keyword: "Pilates Studio!", description: "x" }],
};

test("parseJsonLoose: 코드블록과 앞뒤 설명을 제거한다", () => {
  assert.deepEqual(parseJsonLoose('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(parseJsonLoose('결과: {"a":2} 끝'), { a: 2 });
  assert.equal(parseJsonLoose("not json"), null);
});

test("normalizePlan: 서브 페이지 4개 보정·색상 검증·키워드 정리", () => {
  const p = normalizePlan(rawPlan);
  assert.ok(p);
  assert.equal(p.structure.subPages.length, 4);
  assert.equal(p.designSystem.secondaryColor, "#0ea5e9");
  assert.equal(p.designSystem.primaryColor, "#112233");
  assert.equal(p.imageAssets[0].keyword, "pilates-studio");
  assert.equal(p.projectInfo.layoutType, "hero");
  assert.equal(p.projectInfo.language, "ko");
});

test("normalizePlan: 핵심이 없으면 null", () => {
  assert.equal(normalizePlan({}), null);
  assert.equal(normalizePlan({ ...rawPlan, contentStrategy: {} }), null);
  assert.equal(normalizePlan("x"), null);
});

test("normalizeSection: 형식이 틀리면 null", () => {
  assert.equal(normalizeSection("designSystem", "문자열"), null);
  assert.equal(normalizeSection("imageAssets", {}), null);
  assert.ok(normalizeSection("imageAssets", [{ name: "a", keyword: "b" }]));
});

test("cleanKeyword", () => {
  assert.equal(cleanKeyword("한글 only"), "only");
  assert.equal(cleanKeyword("한글"), "landscape");
});

test("extractHtml / validateHtml", () => {
  const html = "<!DOCTYPE html><html><head></head><body>hi</body></html>";
  assert.equal(extractHtml("설명\n```html\n" + html + "\n```"), html);
  assert.equal(extractHtml("없음"), null);
  assert.equal(validateHtml(html), null);
  assert.ok(validateHtml("<html><body>x"));
  assert.ok(validateHtml('<html><head><script type="importmap"></script></head><body></body></html>'));
});

test("이미지 키워드 추출·치환", () => {
  const html = '<img src="https://loremflickr.com/1600/900/cafe"><img src="https://loremflickr.com/800/600/Tea,cup"><img src="https://loremflickr.com/1600/900/cafe">';
  assert.deepEqual(extractImageKeywords(html), ["cafe", "tea,cup"]);
  const out = replaceImages(html, { cafe: "https://img/x.jpg" });
  assert.equal(out.split("https://img/x.jpg").length - 1, 2);
  assert.ok(out.includes("loremflickr.com/800/600/Tea,cup"));
});

test("입력 정리와 필수 확인", () => {
  const i = cleanInputs({ topic: "  a  b ", target: "t", goal: "g", templateId: "nope", imageProvider: "x", model: "y" });
  assert.equal(i.topic, "a b");
  assert.equal(i.templateId, "custom");
  assert.equal(i.imageProvider, "loremflickr");
  assert.equal(i.model, "pro");
  assert.equal(missingInputs({ ...i, goal: "" }), "목표를 입력해 주세요.");
  assert.equal(missingInputs(i), null);
});

test("프롬프트: 당해 연도·구조 고정 포함", () => {
  const year = new Date().getFullYear();
  assert.ok(yearGuard().includes(`${year}년`));
  const t = templateById("portfolio");
  const p = planPrompt({ topic: "a", target: "b", goal: "c", templateId: "portfolio", imageProvider: "loremflickr", model: "pro" });
  assert.ok(p.includes(t.structure));
  assert.ok(p.includes(`${year}년`));
  assert.ok(planPrompt({ topic: "a", target: "b", goal: "c", templateId: "custom", imageProvider: "loremflickr", model: "pro" }).includes("직접 고르고"));
  const plan = normalizePlan(rawPlan);
  assert.ok(codePrompt(plan).includes("loremflickr.com/1600/900"));
});

test("템플릿 20종·고유 id", () => {
  assert.equal(TEMPLATES.length, 20);
  assert.equal(new Set(TEMPLATES.map((t) => t.id)).size, 20);
  assert.equal(templateById("zzz").id, "custom");
});

test("프로젝트 문서 정리", () => {
  const plan = normalizePlan(rawPlan);
  const html = "<!DOCTYPE html><html><body>x</body></html>";
  const doc = sanitizeDoc({ inputs: { topic: "a" }, plan, html });
  assert.ok(doc);
  assert.equal(stageOf(doc), "code");
  assert.equal(stageOf({ ...doc, html: "" }), "plan");
  assert.equal(sanitizeDoc({ inputs: {}, plan: { bad: 1 } }), null);
  assert.equal(sanitizeDoc({ inputs: {}, plan: null, html: "<p>x</p>" }), null);
});
