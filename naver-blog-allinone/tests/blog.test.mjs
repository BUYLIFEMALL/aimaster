import test from "node:test";
import assert from "node:assert/strict";
import { parseArticle, renderHtml, renderMarkdown, renderPlainText, measureLength, alignImageMarkers, removeImageMarker, renameImageMarker, imageMarkerProblems } from "../src/lib/blog/article.ts";
import { applyHumanizerEdits, splitArticle, extractSignatures } from "../src/lib/blog/humanizer.ts";
import { sanitizeBodyYear, sanitizeYear } from "../src/lib/blog/yearPolicy.ts";
import { buildFallbackPlan, normalizeImagePlan, clampImageCount, finalizePrompt } from "../src/lib/blog/imagePlan.ts";
import { buildWritingStylePrompt, isWritingStyle, isWritingTone } from "../src/lib/blog/styles.ts";
import { sanitizePost, imagePaths, removedImagePaths, imagePrefix } from "../src/lib/blog/sanitize.ts";
import { runBlogPipeline } from "../src/lib/blog/pipeline.ts";

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
      apiKey: "KEY123", textModel: "gemini-flash-latest", topic: "AI 도구", tone: "해요체", style: "default", targetLength: 500,
      imageCount: 2, withThumbnail: true, ratio: "16:9", themeId: "blue-gray", withInteractive: false, withThumbnailText: false, onStep: (m) => steps.push(m),
    });
    assert.equal(calls.length, 4);
    assert.ok(calls.every((c) => c.key === "KEY123" && !c.url.includes("KEY123")));
    assert.equal(calls[0].body.generationConfig.responseMimeType, "application/json");
    assert.equal(calls[1].body.generationConfig.responseMimeType, undefined); // 본문은 JSON이 아니다
    assert.equal(steps.length, 4);
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
