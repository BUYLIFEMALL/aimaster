import test from "node:test";
import assert from "node:assert/strict";
import { parseArticle, renderHtml, renderMarkdown, renderPlainText, measureLength, alignImageMarkers, removeImageMarker, renameImageMarker, imageMarkerProblems } from "../src/lib/blog/article.ts";
import { applyHumanizerEdits, splitArticle, extractSignatures } from "../src/lib/blog/humanizer.ts";
import { sanitizeBodyYear, sanitizeYear } from "../src/lib/blog/yearPolicy.ts";
import { buildFallbackPlan, normalizeImagePlan, clampImageCount, finalizePrompt } from "../src/lib/blog/imagePlan.ts";
import { buildWritingStylePrompt, isWritingStyle, isWritingTone } from "../src/lib/blog/styles.ts";
import { sanitizePost, imagePaths, removedImagePaths, imagePrefix } from "../src/lib/blog/sanitize.ts";
import { runBlogPipeline, photoSlotOrder, clampTargetLength } from "../src/lib/blog/pipeline.ts";
import { callLlm, describeHttpError } from "../src/lib/blog/llm.ts";
import { missingKeyMessage, resolveImageEngine, resolveTextEngine, isKnownTextModel, imagePlatformOf } from "../src/lib/blog/models.ts";
import { BLOG_PERSONAS } from "../src/lib/blog/personas.ts";
import { getWritingStyleExample } from "../src/lib/blog/styles.ts";

const ARTICLE = [
  "도입 문단입니다. **핵심**을 먼저 말해요.",
  "",
  "[SECTION - 첫 번째 소제목]",
  "본문 1 <b>태그</b> & 기호",
  "이어지는 줄",
  "",
  "[IMAGE INSERT - 장면 A]",
  "",
  "- 항목 하나",
  "- 항목 둘",
  "",
  "> 인용 박스",
  "",
  "[SECTION - 참고자료]",
  "출처 안내",
].join("\n");

const slots = [
  { type: "thumbnail", caption: "대표", prompt: "p", url: "https://x.supabase.co/storage/v1/object/public/allinone-images/u1/c.webp" },
  { type: "body", caption: "장면 A", prompt: "p", url: "https://x.supabase.co/storage/v1/object/public/allinone-images/u1/a.webp" },
];

test("parseArticle: 소제목·이미지·목록·인용·문단 구분", () => {
  const kinds = parseArticle(ARTICLE).map((b) => b.kind);
  assert.deepEqual(kinds, ["para", "section", "para", "image", "list", "quote", "section", "para"]);
  assert.equal(parseArticle(ARTICLE)[2].text, "본문 1 <b>태그</b> & 기호 이어지는 줄");
});

test("renderHtml: 이스케이프·테마색·대표/본문 이미지·없는 이미지는 생략", () => {
  const html = renderHtml(ARTICLE, slots, "green-orange");
  assert.match(html, /&lt;b&gt;태그&lt;\/b&gt; &amp; 기호/);
  assert.match(html, /<strong>핵심<\/strong>/);
  assert.match(html, /#10b981/);
  assert.equal((html.match(/<img /g) || []).length, 2); // 대표 1 + 본문 1
  const noUrl = renderHtml(ARTICLE, [{ ...slots[1], url: undefined }], "blue-gray");
  assert.ok(!noUrl.includes("<img"));
  const evil = renderHtml(ARTICLE, [{ ...slots[1], url: "javascript:alert(1)" }], "blue-gray");
  assert.ok(!evil.includes("javascript:"));
});

test("renderMarkdown / renderPlainText", () => {
  const md = renderMarkdown(ARTICLE, slots, "제목");
  assert.match(md, /^# 제목/);
  assert.match(md, /## 첫 번째 소제목/);
  assert.match(md, /!\[장면 A\]\(https:\/\/x\.supabase\.co/);
  assert.match(md, /- 항목 하나\n- 항목 둘/);
  const txt = renderPlainText(ARTICLE);
  assert.match(txt, /■ 첫 번째 소제목/);
  assert.ok(!txt.includes("[IMAGE INSERT"));
  assert.ok(!txt.includes("**"));
});

test("measureLength: 구조 표식 줄과 ** 제외", () => {
  assert.equal(measureLength("[SECTION - a]\n가나다\n[IMAGE INSERT - b]\n**라마**"), "가나다\n라마".length);
});

test("alignImageMarkers: 표식 설명을 컷 캡션으로, 모자라면 채우고 많으면 지움", () => {
  const body = [{ type: "body", caption: "컷1", prompt: "" }, { type: "body", caption: "컷2", prompt: "" }];
  const a = alignImageMarkers("첫 문단\n\n[IMAGE INSERT - 임의 설명]\n\n둘째 문단\n\n셋째 문단", body);
  assert.match(a, /\[IMAGE INSERT - 컷1\]/);
  assert.match(a, /\[IMAGE INSERT - 컷2\]/);
  assert.equal((a.match(/\[IMAGE INSERT/g) || []).length, 2);
  const b = alignImageMarkers("가\n[IMAGE INSERT - x]\n나\n[IMAGE INSERT - y]\n다", [body[0]]);
  assert.equal((b.match(/\[IMAGE INSERT/g) || []).length, 1);
  assert.equal(alignImageMarkers("가\n\n나", []).includes("IMAGE"), false);
});

test("removeImageMarker / renameImageMarker / imageMarkerProblems", () => {
  const body = [{ type: "body", caption: "장면 A", prompt: "" }];
  assert.ok(!removeImageMarker(ARTICLE, "장면 A").includes("장면 A"));
  assert.match(renameImageMarker(ARTICLE, "장면 A", "새 이름"), /\[IMAGE INSERT - 새 이름\]/);
  assert.deepEqual(imageMarkerProblems(ARTICLE, body), []);
  assert.equal(imageMarkerProblems(ARTICLE, []).length, 1);
  assert.equal(imageMarkerProblems("본문만", body).length, 1);
});

test("humanizer: 블록 재결합 동일·잠금·숫자 변경은 취소", () => {
  const text = "첫 문단 100명입니다.\n\n[SECTION - 소제목]\n둘째 문단 5가지.\n\n[SECTION - 참고자료]\n출처 1";
  const blocks = splitArticle(text);
  assert.equal(blocks.map((b) => b.text).join(""), text);
  assert.ok(blocks.find((b) => b.text.startsWith("[SECTION - 소제목]")).locked);
  assert.ok(blocks.find((b) => b.text.includes("출처")).locked);
  const first = blocks.find((b) => b.text.includes("첫 문단"));
  const second = blocks.find((b) => b.text.includes("둘째"));
  const res = applyHumanizerEdits(blocks, [
    { id: first.id, text: "첫 문단은 100명이에요." }, // 숫자 보존 → 적용
    { id: second.id, text: "둘째 문단 6가지." }, // 숫자 변경 → 취소
    { id: blocks.find((b) => b.locked).id, text: "해킹" }, // 잠금 → 무시
  ]);
  assert.match(res.article, /첫 문단은 100명이에요\./);
  assert.match(res.article, /둘째 문단 5가지\./);
  assert.ok(!res.article.includes("해킹"));
  assert.equal(res.changes, 1);
  assert.deepEqual(extractSignatures("a 3.5 b https://x.y/z").urls, ["https://x.y/z"]);
});

test("yearPolicy: 최신 표기는 올해로, 과거 사실은 보존", () => {
  const y = new Date().getFullYear();
  assert.equal(sanitizeYear("2023년 지원금 총정리", y), `${y}년 지원금 총정리`);
  assert.match(sanitizeBodyYear("2024년 기준으로 신청하세요.", y), new RegExp(`${y}년 기준`));
  assert.match(sanitizeBodyYear("제품은 2022년에 출시됐다.", y), /2022년에 출시/);
});

test("imagePlan: 개수 고정·fallback·AI 장면 정리", () => {
  assert.equal(clampImageCount(99), 5);
  assert.equal(clampImageCount(0), 2);
  assert.equal(clampImageCount(undefined), 2);
  const fb = buildFallbackPlan("제목", "주제", [{ title: "소제목" }], 3, true);
  assert.deepEqual(fb.map((s) => s.type), ["thumbnail", "body", "body"]);
  const plan = normalizeImagePlan([{ caption: "대표 컷", prompt: "cover" }, { caption: "대표 컷", prompt: "dup" }, { caption: "본문 컷", prompt: "body" }], fb);
  assert.equal(plan.length, 3);
  assert.equal(plan[0].type, "thumbnail");
  assert.equal(plan[1].caption, "본문 컷");
  assert.equal(new Set(plan.map((s) => s.caption)).size, 3);
  assert.equal(normalizeImagePlan("망가짐", fb).length, 3);
  const noThumb = normalizeImagePlan([], buildFallbackPlan("t", "c", [], 2, false));
  assert.deepEqual(noThumb.map((s) => s.type), ["body", "body"]);
  assert.match(finalizePrompt("a cat"), /Korean/);
  assert.match(finalizePrompt("a cat"), /No visible text/);
});

test("styles: 말끝·문체 검증과 프롬프트", () => {
  assert.ok(isWritingTone("해요체") && !isWritingTone("x"));
  assert.ok(isWritingStyle("detailed") && !isWritingStyle("x"));
  assert.match(buildWritingStylePrompt("합니다체", "plain"), /합니다.*담백한/s);
});

const SUPA = "https://x.supabase.co";
test("sanitizePost: 이미지 주소는 본인 폴더만·길이/개수 제한·허용 목록", () => {
  const own = `${imagePrefix(SUPA, "u1")}a.webp`;
  const other = `${imagePrefix(SUPA, "u2")}a.webp`;
  const r = sanitizePost(
    {
      title: " 제목 ",
      article: "본문",
      tags: ["#태그", "", 5, "b"],
      settings: { tone: "없음", style: "plain", targetLength: 99999, imageCount: 9, ratio: "2:1", themeId: "nope" },
      images: [
        { type: "thumbnail", caption: "대표", prompt: "p", url: own },
        { type: "body", caption: "대표", prompt: "중복" },
        { type: "body", caption: "본문", prompt: "p", url: other },
        { type: "body", caption: "외부", prompt: "p", url: "https://evil.com/a.png" },
      ],
      reviewStatus: "pass",
    },
    SUPA,
    "u1",
  );
  assert.ok(r.ok);
  assert.equal(r.value.title, "제목");
  assert.deepEqual(r.value.tags, ["태그", "b"]);
  assert.equal(r.value.settings.tone, "해요체");
  assert.equal(r.value.settings.targetLength, 4000);
  assert.equal(r.value.settings.imageCount, 5);
  assert.equal(r.value.settings.ratio, "16:9");
  assert.equal(r.value.images.length, 3); // 중복 캡션 제거
  assert.equal(r.value.images[0].url, own);
  assert.equal(r.value.images[1].url, undefined); // 남의 폴더
  assert.equal(r.value.images[2].url, undefined); // 외부
  assert.equal(r.value.reviewStatus, "PASS");
  assert.equal(sanitizePost({ title: "", article: "x" }, SUPA, "u1").ok, false);
  assert.equal(sanitizePost({ title: "t", article: " " }, SUPA, "u1").ok, false);
});

test("imagePaths / removedImagePaths", () => {
  const a = `${imagePrefix(SUPA, "u1")}a.webp`;
  const b = `${imagePrefix(SUPA, "u1")}b.webp`;
  const before = [{ type: "thumbnail", caption: "c", prompt: "", url: a }, { type: "body", caption: "d", prompt: "", url: b }, { type: "body", caption: "e", prompt: "", url: "https://evil/x.png" }];
  assert.deepEqual(imagePaths(before, SUPA, "u1"), ["u1/a.webp", "u1/b.webp"]);
  assert.deepEqual(removedImagePaths(before, [before[0]], SUPA, "u1"), ["u1/b.webp"]);
});

test("runBlogPipeline: 4단계 호출 순서·정리·이미지 자리·글자수 측정(가짜 Gemini)", async () => {
  const replies = [
    JSON.stringify({
      finalTitle: "2023년 AI 도구 5가지",
      subsections: [{ title: "도구 소개", keyPoints: ["a"] }, { title: "활용 팁", keyPoints: ["b"] }],
      scenes: [{ caption: "대표 컷", prompt: "cover photo" }, { caption: "책상 장면", prompt: "desk photo" }],
    }),
    "도입 문단입니다.\n\n[SECTION - 도구 소개]\n본문 1 100개.\n\n[IMAGE INSERT - 임의]\n\n본문 2.\n\n[SECTION - 참고자료]\n출처",
    JSON.stringify({ status: "success", edits: [{ id: "b0", text: "도입 문단이에요." }] }),
    JSON.stringify({ tags: ["#AI", "생산성"], summary: "요약 두 줄", reviewStatus: "PASS", reviewNote: "좋음" }),
  ];
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), body: JSON.parse(init.body), key: init.headers["x-goog-api-key"] });
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: replies[calls.length - 1] }] } }] }) };
  };
  try {
    const steps = [];
    const post = await runBlogPipeline({
      engine: { provider: "gemini", model: "gemini-flash-latest", apiKey: "KEY123" }, topic: "AI 도구", keywords: "AI 도구, 생산성", purpose: "직장인 독자에게 추천",
      persona: { name: "테스트 화자", badge: "배지", tonePrompt: "친절한 선배 톤" }, tone: "합니다체", style: "plain", targetLength: 500,
      imageCount: 2, withThumbnail: true, ratio: "16:9", themeId: "blue-gray", withInteractive: false, withThumbnailText: false, onStep: (m) => steps.push(m),
    });
    assert.equal(calls.length, 4);
    assert.ok(calls.every((c) => c.key === "KEY123" && !c.url.includes("KEY123")));
    assert.equal(calls[0].body.generationConfig.responseMimeType, "application/json");
    assert.equal(calls[1].body.generationConfig.responseMimeType, undefined); // 본문은 JSON이 아니다
    assert.equal(steps.length, 4);
    // 선택한 페르소나·말끝·문체·키워드·발행 목적·글자수가 본문 작성 프롬프트에 들어갔는지
    const writerSystem = calls[1].body.systemInstruction.parts[0].text;
    const writerUser = calls[1].body.contents[0].parts.at(-1).text;
    assert.match(writerSystem, /테스트 화자/);
    assert.match(writerSystem, /친절한 선배 톤/);
    assert.match(writerSystem, /합니다체/);
    assert.match(writerSystem, /담백한/);
    assert.match(writerSystem, /500자/);
    assert.match(writerUser, /AI 도구, 생산성/);
    assert.match(writerUser, /직장인 독자에게 추천/);
    assert.match(post.title, new RegExp(`${new Date().getFullYear()}년 AI 도구`));
    assert.deepEqual(post.images.map((s) => s.type), ["thumbnail", "body"]);
    assert.match(post.article, /\[IMAGE INSERT - 책상 장면\]/); // 표식이 컷 캡션으로 맞춰짐
    assert.match(post.article, /도입 문단이에요\./); // 윤문 적용
    assert.deepEqual(post.tags, ["AI", "생산성"]);
    assert.equal(post.reviewStatus, "WARN"); // 글자수가 목표 범위 밖이라 PASS 를 WARN 으로
    assert.match(post.reviewNote, /본문 \d+자/);
    assert.equal(post.summary, "요약 두 줄");
    assert.ok(post.steps.length >= 5);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("alignImageMarkers: 컷 이름과 정확히 같은 표식은 순서가 바뀌어도 그대로 유지", () => {
  const body = [{ type: "body", caption: "사진 2 · 케이크", prompt: "" }, { type: "body", caption: "사진 3 · 내부", prompt: "" }];
  const a = alignImageMarkers("가\n\n[IMAGE INSERT - 사진 3 · 내부]\n\n나\n\n[IMAGE INSERT - 사진 2 · 케이크]\n\n[IMAGE INSERT - 사진 2 · 케이크]\n\n다", body);
  const order = [...a.matchAll(/\[IMAGE INSERT - ([^\]]+)\]/g)].map((m) => m[1]);
  assert.deepEqual(order, ["사진 3 · 내부", "사진 2 · 케이크"]);
});

test("photoSlotOrder / clampTargetLength", () => {
  assert.deepEqual(photoSlotOrder(4, 2), [2, 0, 1, 3]);
  assert.deepEqual(photoSlotOrder(3, 9), [2, 0, 1]);
  assert.deepEqual(photoSlotOrder(1, 0), [0]);
  assert.equal(clampTargetLength(1), 300);
  assert.equal(clampTargetLength(99999), 4000);
  assert.equal(clampTargetLength(undefined), 2000);
});

test("callLlm: 공급사별 이미지 페이로드·Anthropic 브라우저 헤더·키 가림", async () => {
  const sent = {};
  const mk = (name, response, ok = true, status = 200) => async (url, init) => {
    sent[name] = { url, headers: init.headers, body: JSON.parse(init.body) };
    return { ok, status, json: async () => response };
  };
  const images = [{ mime: "image/jpeg", base64: "QUJD" }, { mime: "image/jpeg", base64: "REVG" }];
  const base = { apiKey: "SECRETKEY", system: "s", user: "u", images };

  await callLlm({ ...base, provider: "gemini", model: "m", json: true, maxTokens: 1234 }, mk("gemini", { candidates: [{ content: { parts: [{ text: "ok" }] } }] }));
  assert.equal(sent.gemini.body.contents[0].parts.length, 3);
  assert.equal(sent.gemini.body.generationConfig.maxOutputTokens, 1234);
  assert.equal(sent.gemini.headers["x-goog-api-key"], "SECRETKEY");
  assert.ok(!sent.gemini.url.includes("SECRETKEY"));

  await callLlm({ ...base, provider: "openai", model: "gpt-4.1", json: true }, mk("openai", { choices: [{ message: { content: "ok" } }] }));
  assert.equal(sent.openai.body.messages[1].content.length, 3);
  assert.equal(sent.openai.body.response_format.type, "json_object");

  await callLlm({ ...base, provider: "anthropic", model: "claude-sonnet-5" }, mk("anthropic", { content: [{ type: "text", text: "ok" }] }));
  assert.equal(sent.anthropic.headers["anthropic-dangerous-direct-browser-access"], "true");
  assert.equal(sent.anthropic.body.messages[0].content.length, 3);
  assert.ok(sent.anthropic.body.max_tokens >= 8192);

  await assert.rejects(
    callLlm({ ...base, provider: "openai", model: "gpt-4.1" }, mk("x", { error: { message: "bad SECRETKEY here" } }, false, 401)),
    (e) => e.message.includes("OpenAI") && e.message.includes("키가 올바르지") && !e.message.includes("SECRETKEY"),
  );
  assert.match(describeHttpError("anthropic", 400, "Your credit balance is too low", "k"), /크레딧/);
  assert.match(describeHttpError("gemini", 429, "", "k"), /한도/);
});

test("models: 새 설정이 없으면 기존 Gemini·나노바나나 설정 유지, 선택하면 그대로 반영, 키 없으면 자동 전환 없이 안내", () => {
  const legacy = { geminiApiKey: "g", textModel: "gemini-flash-lite-latest", imageModel: "nano-banana-2-lite" };
  const t = resolveTextEngine(legacy);
  assert.deepEqual([t.provider, t.model, t.apiKey], ["gemini", "gemini-flash-lite-latest", "g"]);
  const i = resolveImageEngine(legacy);
  assert.deepEqual([i.platform, i.model, i.keyProvider], ["nanobanana", "nanobanana", "gemini"]);
  assert.equal(missingKeyMessage("text", legacy), null);

  const picked = { ...legacy, textProvider: "openai", textModelId: "gpt-4.1", openaiApiKey: "o", imageModelId: "black-forest-labs/flux-2-dev" };
  assert.deepEqual([resolveTextEngine(picked).provider, resolveTextEngine(picked).model, resolveTextEngine(picked).apiKey], ["openai", "gpt-4.1", "o"]);
  assert.deepEqual([resolveImageEngine(picked).platform, resolveImageEngine(picked).keyProvider], ["flux", "replicate"]);
  // 선택한 공급사의 키가 없으면 다른 공급사로 바꾸지 않고 안내한다
  assert.match(missingKeyMessage("image", picked), /Replicate/);
  assert.match(missingKeyMessage("text", { ...picked, openaiApiKey: "" }), /GPT.*자동 전환하지 않습니다/s);
  // 모르는 모델 ID 는 해당 공급사의 첫 모델로
  assert.equal(resolveTextEngine({ ...legacy, textProvider: "anthropic", textModelId: "nope" }).model, "claude-sonnet-5");
  assert.ok(isKnownTextModel("gemini", "gemini-3.7-flash"));
  assert.equal(imagePlatformOf("gpt-image-2"), "openai");
});

test("personas / 문체 예시", () => {
  assert.equal(BLOG_PERSONAS.length, 6);
  assert.ok(BLOG_PERSONAS.every((p) => p.id && p.name && p.tonePrompt && p.defaultKeywords && p.defaultPurpose));
  assert.match(getWritingStyleExample("해요체", "default"), /해요\.$/);
  assert.match(getWritingStyleExample("한다체", "plain"), /다\.$/);
  assert.notEqual(getWritingStyleExample("해요체", "plain"), getWritingStyleExample("합니다체", "plain"));
});

test("runBlogPipeline: 사진 기반(비전) — 사진이 컷이 되고 캡션이 본문 표식과 연결, 사진은 4단계 중 기획·작성에만 전달", async () => {
  const replies = [
    JSON.stringify({ finalTitle: "성수 카페 방문", subsections: [{ title: "분위기", keyPoints: ["a"] }], photoCaptions: ["대표 외관", "케이크", "내부 좌석"] }),
    "도입.\n\n[SECTION - 분위기]\n본문입니다.\n\n[IMAGE INSERT - 사진 3 · 내부 좌석]\n\n둘째.\n\n[IMAGE INSERT - 사진 2 · 케이크]\n\n[SECTION - 참고자료]\n출처",
    JSON.stringify({ edits: [] }),
    JSON.stringify({ tags: ["성수"], summary: "요약", reviewStatus: "PASS", reviewNote: "ok" }),
  ];
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push(JSON.parse(init.body));
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: replies[calls.length - 1] }] } }] }) };
  };
  try {
    const photos = [{ mime: "image/jpeg", base64: "AAA" }, { mime: "image/jpeg", base64: "BBB" }, { mime: "image/jpeg", base64: "CCC" }];
    const post = await runBlogPipeline({
      engine: { provider: "gemini", model: "m", apiKey: "k" }, topic: "성수 카페 방문", tone: "해요체", style: "conversational", targetLength: 800,
      imageCount: 3, withThumbnail: true, ratio: "16:9", themeId: "green-orange", withInteractive: false, withThumbnailText: false,
      photos, thumbIndex: 0, role: "너는 맛집 인플루언서다.", extraContext: "- 장소명: 성수 카페",
    });
    assert.equal(calls[0].contents[0].parts.filter((p) => p.inlineData).length, 3); // 기획: 사진 3장
    assert.equal(calls[1].contents[0].parts.filter((p) => p.inlineData).length, 3); // 작성: 사진 3장
    assert.equal(calls[2].contents[0].parts.filter((p) => p.inlineData).length, 0); // 윤문: 텍스트만
    assert.equal(calls[3].contents[0].parts.filter((p) => p.inlineData).length, 0); // 검수: 텍스트만
    assert.match(calls[1].systemInstruction.parts[0].text, /맛집 인플루언서/);
    assert.match(calls[1].systemInstruction.parts[0].text, /지어내지 않는다/);
    assert.deepEqual(post.images.map((s) => s.type), ["thumbnail", "body", "body"]);
    assert.deepEqual(post.images.map((s) => s.prompt), ["", "", ""]); // 사진 컷은 생성 프롬프트가 없다
    assert.match(post.images[0].caption, /^대표 1 · 대표 외관/);
    assert.match(post.images[1].caption, /^사진 2 · 케이크/);
    assert.match(post.article, /\[IMAGE INSERT - 사진 3 · 내부 좌석\]/); // 글에서 쓴 순서(3번 먼저) 그대로 연결
    assert.equal(post.images.length, 3);
  } finally {
    globalThis.fetch = realFetch;
  }
});

import { sanitizePrefs, saveGenPrefs, loadGenPrefs, clearGenPrefs } from "../src/lib/blog/prefs.ts";

test("설정값 저장: 허용된 값만 남기고 잘못된 값은 버린다", () => {
  const out = sanitizePrefs({ themeId: "없는테마", bodyImages: 9, ratio: "1:1", tone: "해요체", targetLength: 99999, personaId: "없는사람", hack: 1 });
  assert.equal(out.themeId, undefined);
  assert.equal(out.bodyImages, undefined);
  assert.equal(out.ratio, "1:1");
  assert.equal(out.tone, "해요체");
  assert.equal(out.targetLength, 4000);
  assert.equal(out.personaId, undefined);
  assert.equal("hack" in out, false);
});

test("설정값 저장: 저장 → 불러오기 → 초기화", () => {
  const mem = new Map();
  const st = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
  assert.equal(loadGenPrefs(st), null);
  assert.equal(saveGenPrefs(st, { bodyImages: 3, interactive: true, personaId: null }), true);
  const got = loadGenPrefs(st);
  assert.equal(got.bodyImages, 3);
  assert.equal(got.interactive, true);
  assert.equal(got.personaId, null);
  clearGenPrefs(st);
  assert.equal(loadGenPrefs(st), null);
  mem.set("naver_blog_allinone_gen_prefs_v1", "{깨진json");
  assert.equal(loadGenPrefs(st), null);
});

import { sanitizeCategories, categoryName, DEFAULT_CATEGORIES } from "../src/lib/blog/categories.ts";

test("카테고리: 형식 검사·중복 제거·순서 다시 매기기", () => {
  const out = sanitizeCategories([{ id: "a", name: " 육아 " }, { id: "a", name: "중복" }, { id: "", name: "빈id" }, { id: "b", name: "" }, { id: "c", name: "여행" }, "x", null]);
  assert.deepEqual(out.map((c) => [c.id, c.name, c.sort_order]), [["a", "육아", 1], ["c", "여행", 2]]);
  assert.deepEqual(sanitizeCategories("나쁜값"), []);
  assert.equal(categoryName(out, "c"), "여행");
  assert.equal(categoryName(out, "없음"), null);
  assert.equal(DEFAULT_CATEGORIES.length, 6);
});

test("카테고리: 글 저장 시 categoryId가 남고 길이가 제한된다", () => {
  const base = { title: "제목", article: "본문", settings: {} };
  const ok = sanitizePost({ ...base, settings: { categoryId: " cat-1 " } }, "https://x.supabase.co", "u1");
  assert.equal(ok.value.settings.categoryId, "cat-1");
  const none = sanitizePost(base, "https://x.supabase.co", "u1");
  assert.equal("categoryId" in none.value.settings, false);
});

import { readNaverCategory, readNaverCategoryList, reconcileNaverCategory, loadLastNaverCategory, saveLastNaverCategory } from "../src/lib/blog/naverCategory.ts";

test("네이버 카테고리: 번호·이름 형식 검사와 목록 정리", () => {
  assert.deepEqual(readNaverCategory({ id: "12", name: " 경제 이야기 " }), { id: "12", name: "경제 이야기" });
  assert.equal(readNaverCategory({ id: "abc", name: "x" }), null);
  assert.equal(readNaverCategory({ id: "5", name: "" }), null);
  assert.equal(readNaverCategory("나쁜값"), null);
  const list = readNaverCategoryList([{ id: "1", name: "a" }, { id: "1", name: "중복" }, { id: "x", name: "나쁨" }, { id: "2", name: "b" }]);
  assert.deepEqual(list.map((c) => c.id), ["1", "2"]);
});

test("네이버 카테고리: 불러온 목록 대조·마지막 선택 기억", () => {
  const list = [{ id: "1", name: "새 이름" }, { id: "2", name: "b" }];
  assert.deepEqual(reconcileNaverCategory({ id: "1", name: "옛 이름" }, list), { id: "1", name: "새 이름" });
  assert.equal(reconcileNaverCategory({ id: "9", name: "삭제됨" }, list), null);
  const mem = new Map();
  const st = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
  assert.equal(loadLastNaverCategory(st), null);
  saveLastNaverCategory(st, { id: "2", name: "b" });
  assert.deepEqual(loadLastNaverCategory(st), { id: "2", name: "b" });
  saveLastNaverCategory(st, null);
  assert.equal(loadLastNaverCategory(st), null);
});

test("네이버 카테고리: 글 저장 시 올바른 값만 남는다", () => {
  const base = { title: "제목", article: "본문" };
  const ok = sanitizePost({ ...base, settings: { naverCategory: { id: "7", name: "여행" } } }, "https://x.supabase.co", "u1");
  assert.deepEqual(ok.value.settings.naverCategory, { id: "7", name: "여행" });
  const bad = sanitizePost({ ...base, settings: { naverCategory: { id: "x", name: "여행" } } }, "https://x.supabase.co", "u1");
  assert.equal("naverCategory" in bad.value.settings, false);
});

import { extensionVersionAtLeast } from "../src/lib/blog/naverCategory.ts";

test("확장 버전 비교: 옛 확장(v1.04)은 카테고리 읽기를 지원하지 않는다", () => {
  assert.equal(extensionVersionAtLeast("v1.04", "v1.25"), false);
  assert.equal(extensionVersionAtLeast("v1.25", "v1.25"), true);
  assert.equal(extensionVersionAtLeast("v1.30", "v1.25"), true);
  assert.equal(extensionVersionAtLeast("v2.01", "v1.25"), true);
  assert.equal(extensionVersionAtLeast(undefined, "v1.25"), false);
});

import { textModelDisplayName } from "../src/lib/blog/models.ts";

test("헤더 모델 표시: 모델 카드와 같은 친숙한 이름", () => {
  assert.equal(textModelDisplayName("gemini", "gemini-flash-latest"), "Gemini Flash");
  assert.equal(textModelDisplayName("openai", "gpt-4.1"), "GPT-4.1");
  assert.equal(textModelDisplayName("anthropic", "claude-sonnet-5"), "Claude Sonnet 5");
  assert.equal(textModelDisplayName("gemini", "gemini-2.5-flash"), "gemini-2.5-flash");
});

test("runBlogPipeline: 사람 문체 모드·회원 방문 경험이 작성·윤문 프롬프트에 들어가고, 끄면 들어가지 않는다", async () => {
  const run = async (extra) => {
    const replies = [
      JSON.stringify({ finalTitle: "성수 카페 후기", subsections: [{ title: "분위기", keyPoints: ["a"] }], scenes: [{ caption: "대표 컷", prompt: "cover" }] }),
      "도입 문단입니다.\n\n[SECTION - 분위기]\n본문 1.\n\n[SECTION - 참고자료]\n출처",
      JSON.stringify({ status: "success", edits: [] }),
      JSON.stringify({ tags: ["카페"], summary: "요약", reviewStatus: "PASS", reviewNote: "ok" }),
    ];
    const calls = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (url, init) => {
      calls.push(JSON.parse(init.body));
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: replies[calls.length - 1] }] } }] }) };
    };
    try {
      await runBlogPipeline({ engine: { provider: "gemini", model: "gemini-flash-latest", apiKey: "K" }, topic: "성수 카페", tone: "해요체", style: "default", targetLength: 500, imageCount: 1, withThumbnail: true, ratio: "16:9", themeId: "blue-gray", withInteractive: false, withThumbnailText: false, ...extra });
    } finally {
      globalThis.fetch = realFetch;
    }
    return { writerSystem: calls[1].systemInstruction.parts[0].text, writerUser: calls[1].contents[0].parts.at(-1).text, humanizerSystem: calls[2].systemInstruction.parts[0].text };
  };
  const on = await run({ humanStyle: true, experience: "평일 점심인데 대기가 30분 있었다" });
  assert.match(on.writerSystem, /사람이 쓴 글 문체/);
  assert.match(on.writerSystem, /지어내지 않는다/);
  assert.match(on.writerUser, /회원이 직접 겪은 경험/);
  assert.match(on.writerUser, /대기가 30분 있었다/);
  assert.match(on.humanizerSystem, /사람 문체 모드 추가 지침/);
  const off = await run({});
  assert.doesNotMatch(off.writerSystem, /사람이 쓴 글 문체/);
  assert.doesNotMatch(off.writerUser, /회원이 직접 겪은 경험/);
  assert.doesNotMatch(off.humanizerSystem, /사람 문체 모드 추가 지침/);
});

import { extractJson, askLlmJson } from "../src/lib/blog/askJson.ts";

test("askJson: 코드 펜스·앞뒤 설명이 있어도 배열/객체 JSON만 꺼낸다", () => {
  assert.deepEqual(extractJson("```json\n[{\"a\":1}]\n```", "array"), [{ a: 1 }]);
  assert.deepEqual(extractJson("결과입니다: {\"x\": [1,2]} 끝", "object"), { x: [1, 2] });
  assert.equal(extractJson("JSON 아님", "array"), null);
  assert.equal(extractJson("[깨진", "array"), null);
});

test("askLlmJson: 선택한 글 AI와 본인 키로 호출한다(Gemini 키 없이 GPT) — 배열은 OpenAI JSON 모드를 쓰지 않는다", async () => {
  const realFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), headers: init.headers, body: JSON.parse(init.body) });
    return { ok: true, json: async () => ({ choices: [{ message: { content: calls.length === 1 ? '[{"title":"제목","desc":"설명","keywords":["a"]}]' : '{"score": 7}' } }] }) };
  };
  try {
    const settings = { geminiApiKey: "", openaiApiKey: "OPENAI-KEY", textProvider: "openai", textModelId: "gpt-4.1", textModel: "gemini-flash-latest" };
    const arr = await askLlmJson(settings, "주제 4개", "array");
    assert.equal(arr[0].title, "제목");
    assert.ok(calls[0].url.includes("api.openai.com"));
    assert.equal(calls[0].headers.Authorization, "Bearer OPENAI-KEY");
    assert.equal(calls[0].body.response_format, undefined); // 배열 응답은 JSON 모드 미사용
    const obj = await askLlmJson(settings, "분석", "object");
    assert.equal(obj.score, 7);
    assert.deepEqual(calls[1].body.response_format, { type: "json_object" });
  } finally {
    globalThis.fetch = realFetch;
  }
});
