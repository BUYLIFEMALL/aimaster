import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeOutline, applySection, outlineStatus, joinSections, sectionsHash, cleanSectionBody } from "../lib/sections.ts";
import { outlinePrompt, sectionPrompt } from "../lib/ai/sectionPrompt.ts";
import { normalizeStyle } from "../lib/style.ts";
import { factRule, groundingSection } from "../lib/ai/groundingPrompt.ts";
import { styleSection } from "../lib/ai/stylePrompt.ts";

const raw = { titles: ["가을 캠핑 준비물 체크리스트", "", "초보 가을 캠핑 준비"], sections: [{ heading: "무시됨", goal: "검색 의도 요약" }, { heading: "필수 장비는?", goal: "텐트·침낭" }, { heading: "", goal: "제목 없음 → 빠짐" }, { heading: "안전은?", goal: "기온 차이" }] };

test("BLC-09: normalizeOutline keeps titles, forces intro heading empty, drops sections without heading", () => {
  const o = normalizeOutline(raw);
  assert.deepEqual(o.titles, ["가을 캠핑 준비물 체크리스트", "초보 가을 캠핑 준비"]);
  assert.equal(o.sections.length, 3);
  assert.equal(o.sections[0].heading, "");
  assert.equal(o.sections[1].heading, "필수 장비는?");
  assert.ok(o.sections.every((s) => s.status === "empty" && s.body === ""));
  assert.equal(normalizeOutline({ titles: ["a"], sections: [{ goal: "x" }, { heading: "h", goal: "y" }] }), null);
  assert.equal(normalizeOutline(null), null);
});

test("BLC-09: applySection changes only that section; a failed rewrite keeps the body already written", () => {
  const o = normalizeOutline(raw);
  let s = applySection(o.sections, 1, { body: "텐트 본문" }, "t1");
  assert.equal(s[1].status, "done");
  assert.equal(s[0].status, "empty");
  assert.equal(outlineStatus(s), "writing");
  s = applySection(s, 1, { error: "시간 초과" }, "t2");
  assert.equal(s[1].body, "텐트 본문");
  assert.equal(s[1].status, "done");
  s = applySection(s, 2, { error: "시간 초과" }, "t3");
  assert.equal(s[2].status, "failed");
  assert.equal(outlineStatus(o.sections), "outline");
  const all = o.sections.map((x, i) => ({ ...x, body: `본문${i}`, status: "done" }));
  assert.equal(outlineStatus(all), "written");
});

test("BLC-09: joinSections uses the SEO body format and sectionsHash changes when a section changes", () => {
  const sections = [{ heading: "", goal: "", body: "도입 문단", status: "done" }, { heading: "필수 장비는?", goal: "", body: "텐트를 고릅니다.", status: "done" }];
  assert.equal(joinSections(sections), "도입 문단\n\n필수 장비는?\n\n텐트를 고릅니다.");
  const h1 = sectionsHash(sections);
  assert.equal(sectionsHash(sections.map((x) => ({ ...x, status: "done", updatedAt: "다른 시각" }))), h1);
  assert.notEqual(sectionsHash([sections[0], { ...sections[1], body: "침낭을 고릅니다." }]), h1);
});

test("BLC-09: cleanSectionBody strips markdown and a repeated heading, rejects too-short bodies", () => {
  const long = "가을 캠핑에는 텐트와 침낭이 필요합니다. ".repeat(6);
  assert.equal(cleanSectionBody(`## 필수 장비는?\n\n**${long}**`, "필수 장비는?"), long.trim());
  assert.equal(cleanSectionBody("짧은 글", "h"), null);
  assert.equal(cleanSectionBody(undefined, "h"), null);
});

test("BLC-09: prompts use approved grounding, mark the target section, and add no required ending rule", () => {
  const grounding = { keyword: "가을 캠핑", angle: "준비물 위주", points: [{ text: "밤 기온이 낮다", source: 1, quote: "밤 기온", title: "자료1", link: "" }] };
  const persona = { name: "정보 전달형 전문 에디터", toneDescription: "차분한 톤" };
  const style = { name: "내 블로그", profile: normalizeStyle({ summary: "생활 정보", tone: "친근한 존댓말", sentence: "짧게", structure: "요약", reader: "직장인", expressions: [], avoid: [], strengths: [], cautions: [] }) };
  // 서버 sectionRules와 같은 조립(문체는 끝맺음 값 없이)
  const rules = { style: styleSection(style), facts: `${factRule([], true)}${groundingSection(grounding)}` };
  const o = outlinePrompt({ today: "2026-10-22", persona, rules, keyword: grounding.keyword });
  assert.match(o.system, /승인한 근거/);
  assert.match(o.user, /"titles"/);
  const sections = normalizeOutline(raw).sections.map((x, i) => (i === 0 ? { ...x, body: "도입 본문", status: "done" } : x));
  const p = sectionPrompt({ today: "2026-10-22", persona, rules, title: "제목", sections, index: 1 });
  assert.match(p.user, /▶ 2\. 필수 장비는\?/);
  assert.match(p.user, /도입 본문/);
  assert.doesNotMatch(p.system, /문장 끝맺음\(필수\)/);
});

test("BLC-09 v1.94: section length targets were raised (intro 300~450, sections 450~650)", () => {
  const persona = { name: "p", toneDescription: "t" };
  const rules = { style: "", facts: "" };
  const sections = normalizeOutline(raw).sections;
  assert.match(sectionPrompt({ today: "2026-10-22", persona, rules, title: "제목", sections, index: 0 }).user, /공백 제외 300~450자/);
  const body = sectionPrompt({ today: "2026-10-22", persona, rules, title: "제목", sections, index: 1 }).user;
  assert.match(body, /공백 제외 450~650자, 3개 이상 문단/);
  assert.match(body, /구체적인 예시나 판단 기준/);
});

test("v1.96: parseSavedModel keeps only a provider+model pair that is still in the list", async () => {
  const { parseSavedModel } = await import("../lib/savedModel.ts");
  const options = [{ value: "gpt-4o-mini", label: "a", provider: "openai" }, { value: "claude-haiku-4-5", label: "b", provider: "anthropic" }];
  assert.deepEqual(parseSavedModel(JSON.stringify({ provider: "openai", model: "gpt-4o-mini" }), options), { provider: "openai", model: "gpt-4o-mini" });
  // 2026-11-19: 목록에 없는 모델이라도 저장된 플랫폼은 보존(기본값 함수가 없으면 그 플랫폼 첫 항목)
  assert.deepEqual(parseSavedModel(JSON.stringify({ provider: "openai", model: "retired-model" }), options), { provider: "openai", model: "gpt-4o-mini" });
  assert.equal(parseSavedModel(JSON.stringify({ provider: "gemini", model: "claude-haiku-4-5" }), options), null);
  assert.equal(parseSavedModel("{깨진", options), null);
  assert.equal(parseSavedModel(null, options), null);
});

test("v1.97: account model wins, legacy OpenAI setting is inherited, OpenAI-only features follow an OpenAI default", async () => {
  const { accountContentModel } = await import("../lib/savedModel.ts");
  const { getUserOpenAIContentModel } = await import("../lib/ai/openaiModels.ts");
  const options = [{ value: "gpt-4o-mini", label: "a", provider: "openai" }, { value: "gpt-4.1", label: "b", provider: "openai" }, { value: "claude-haiku-4-5", label: "c", provider: "anthropic" }];
  assert.deepEqual(accountContentModel({ naver_blog_seo_content_model: { provider: "anthropic", model: "claude-haiku-4-5" }, naver_blog_seo_openai_model: "gpt-4.1" }, options), { provider: "anthropic", model: "claude-haiku-4-5" });
  assert.deepEqual(accountContentModel({ naver_blog_seo_openai_model: "gpt-4.1" }, options), { provider: "openai", model: "gpt-4.1" });
  assert.deepEqual(accountContentModel({ naver_blog_seo_content_model: { provider: "openai", model: "retired" } }, options), { provider: "openai", model: "gpt-4o-mini" }); // 2026-11-19: 플랫폼 보존
  assert.equal(accountContentModel(undefined, options), null);
  assert.equal(getUserOpenAIContentModel({ naver_blog_seo_content_model: { provider: "openai", model: "gpt-6-luna" }, naver_blog_seo_openai_model: "gpt-6.1-terra" }), "gpt-6-luna");
  assert.equal(getUserOpenAIContentModel({ naver_blog_seo_content_model: { provider: "anthropic", model: "claude-haiku-4-5" }, naver_blog_seo_openai_model: "gpt-5" }), "gpt-5.6-sol"); // 2026-11-03: 종료 모델 gpt-5 저장값은 대체 모델로 이어받음
  assert.equal(getUserOpenAIContentModel({}), "gpt-6.1-terra");
  assert.equal(getUserOpenAIContentModel({ naver_blog_seo_openai_model: "gpt-4.1" }), "gpt-6.1-terra"); // 2026-11-19: 목록에서 뺀 gpt-4.1 저장값은 대체 모델로 이어받음
});

test("v1.98: the OpenAI model sent by the screen wins over the account value; unknown names are ignored", async () => {
  const { getUserOpenAIContentModel } = await import("../lib/ai/openaiModels.ts");
  const meta = { naver_blog_seo_content_model: { provider: "openai", model: "gpt-6-luna" }, naver_blog_seo_openai_model: "gpt-6.1-terra" };
  assert.equal(getUserOpenAIContentModel(meta, "gpt-6.2-sol"), "gpt-6.2-sol");
  assert.equal(getUserOpenAIContentModel(meta, "not-a-model"), "gpt-6-luna");
  assert.equal(getUserOpenAIContentModel(meta, undefined), "gpt-6-luna");
  assert.equal(getUserOpenAIContentModel({}, 123), "gpt-6.1-terra");
});

// ── 2026-11-19 (Master msg_841a78cd076a): 저장된 플랫폼 보존 — 목록에서 뺀 모델은 대체/같은 플랫폼 기본값 ──
const OPTS = [
  ...["gpt-6.2-astra", "gpt-6.1-terra", "gpt-6-luna"].map((value) => ({ value, label: value, provider: "openai" })),
  ...["claude-fable-5-2", "claude-sonnet-5-5", "claude-haiku-5-5"].map((value) => ({ value, label: value, provider: "anthropic" })),
  ...["gemini-4-carbon", "gemini-3.8-flash", "gemini-3.6-flash"].map((value) => ({ value, label: value, provider: "gemini" })),
];
const DEF = (p) => ({ openai: "gpt-6.1-terra", anthropic: "claude-sonnet-5-5", gemini: "gemini-3.8-flash" })[p];

test("2026-11-19: 로컬 저장값의 폐기 모델은 같은 플랫폼(대체 모델 또는 기본값)으로 복구", async () => {
  const { parseSavedModel } = await import("../lib/savedModel.ts");
  const p = (provider, model) => parseSavedModel(JSON.stringify({ provider, model }), OPTS, DEF);
  assert.deepEqual(p("openai", "gpt-4.1"), { provider: "openai", model: "gpt-6.1-terra" });
  assert.deepEqual(p("openai", "gpt-4o-mini"), { provider: "openai", model: "gpt-6-luna" });
  assert.deepEqual(p("anthropic", "claude-haiku-4-5"), { provider: "anthropic", model: "claude-haiku-5-5" });
  assert.deepEqual(p("anthropic", "claude-fable-5"), { provider: "anthropic", model: "claude-fable-5-2" });
  assert.deepEqual(p("gemini", "gemini-3.7-flash"), { provider: "gemini", model: "gemini-3.8-flash" });
  assert.deepEqual(p("gemini", "gemini-3.5-flash"), { provider: "gemini", model: "gemini-3.6-flash" });
  // 대체표에도 없는 모델 → 같은 플랫폼 기본값(다른 플랫폼으로 바뀌지 않음)
  assert.deepEqual(p("anthropic", "claude-unknown-9"), { provider: "anthropic", model: "claude-sonnet-5-5" });
  assert.deepEqual(p("gemini", "gemini-2.0-flash"), { provider: "gemini", model: "gemini-3.8-flash" });
  // 정상 저장값은 그대로
  assert.deepEqual(p("anthropic", "claude-fable-5-2"), { provider: "anthropic", model: "claude-fable-5-2" });
  // 미지정·깨진 값·모르는 플랫폼은 null(기본 시작)
  assert.equal(parseSavedModel(null, OPTS, DEF), null);
  assert.equal(parseSavedModel("{broken", OPTS, DEF), null);
  assert.equal(p("mistral", "x"), null);
  assert.equal(p("openai", ""), null);
  // 기본값 함수를 안 넘기면 그 플랫폼 첫 항목
  assert.deepEqual(parseSavedModel(JSON.stringify({ provider: "anthropic", model: "claude-unknown-9" }), OPTS), { provider: "anthropic", model: "claude-fable-5-2" });
});

test("2026-11-19: 계정 저장값 — Claude/Gemini 폐기 모델이 있어도 옛 OpenAI 설정으로 플랫폼이 바뀌지 않음", async () => {
  const { accountContentModel } = await import("../lib/savedModel.ts");
  const meta = (provider, model, legacy) => ({ naver_blog_seo_content_model: provider ? { provider, model } : undefined, naver_blog_seo_openai_model: legacy });
  assert.deepEqual(accountContentModel(meta("anthropic", "claude-haiku-4-5", "gpt-4.1"), OPTS, DEF), { provider: "anthropic", model: "claude-haiku-5-5" });
  assert.deepEqual(accountContentModel(meta("gemini", "gemini-3.7-flash", "gpt-4o"), OPTS, DEF), { provider: "gemini", model: "gemini-3.8-flash" });
  assert.deepEqual(accountContentModel(meta("anthropic", "claude-unknown-9", "gpt-4.1"), OPTS, DEF), { provider: "anthropic", model: "claude-sonnet-5-5" });
  // 새 값이 없으면 옛 OpenAI 설정을 이어받음(폐기 이름은 대체)
  assert.deepEqual(accountContentModel(meta(undefined, undefined, "gpt-4o"), OPTS, DEF), { provider: "openai", model: "gpt-6.1-terra" });
  assert.equal(accountContentModel({}, OPTS, DEF), null);
  // 정상 값 유지
  assert.deepEqual(accountContentModel(meta("gemini", "gemini-4-carbon", "gpt-4.1"), OPTS, DEF), { provider: "gemini", model: "gemini-4-carbon" });
});
