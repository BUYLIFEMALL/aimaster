// 글 생성 4단계 파이프라인(naver-blog-agent 의 Research → Writer → Humanizer → Reviewer 구조를 올인원에 맞게 가져왔다).
// 올인원의 기존 강점(네이버 HTML 서식·컬러 테마·마크다운)은 article → render* 변환으로 유지한다.
import { callGeminiText, parseJsonLoose } from "./gemini";
import { alignImageMarkers, measureLength } from "./article";
import { applyHumanizerEdits, BLOG_HUMANIZER_RULES, buildHumanizerUser, splitArticle } from "./humanizer";
import { buildFallbackPlan, clampImageCount, normalizeImagePlan } from "./imagePlan";
import { buildWritingStylePrompt, isWritingStyle, isWritingTone, WRITING_STYLES, type WritingStyle, type WritingTone } from "./styles";
import type { BlogPost, ImageRatio, ImageSlot, ReviewStatus, StepLog } from "./types";
import { sanitizeBodyYear, sanitizeYear } from "./yearPolicy";

export interface PipelineInput {
  apiKey: string;
  textModel: string;
  topic: string;
  /** 주제 추천 단계에서 넘어온 기획 배경(선택) */
  hint?: string;
  extraRequest?: string;
  tone: WritingTone;
  style: WritingStyle;
  targetLength: number;
  imageCount: number;
  withThumbnail: boolean;
  ratio: ImageRatio;
  themeId: string;
  withInteractive: boolean;
  withThumbnailText: boolean;
  onStep?: (message: string) => void;
  signal?: AbortSignal;
}

export function clampTargetLength(n: unknown): number {
  return Math.max(500, Math.min(4000, Math.round(Number(n) || 2000)));
}

const yearRule = (year: number) =>
  `[기준 연도 엄수] 현재 연도는 ${year}년이다. 모든 제목·소제목·정책·혜택·트렌드·연도 표기는 ${year}년(당해 연도) 최신 기준으로 쓴다. 최신 정보를 과거 연도(2023년, 2024년 등)로 쓰지 않는다. 단, 출시·발표·시행처럼 실제로 있었던 과거 사실의 연도는 정확히 그대로 둔다.`;

function sectionGuide(target: number): string {
  return target <= 1000 ? "2~3개" : target <= 2500 ? "3~4개" : "4~5개";
}

interface ResearchData {
  finalTitle: string;
  subsections: { title: string; keyPoints: string[] }[];
  scenes: unknown;
}

export async function runBlogPipeline(input: PipelineInput): Promise<BlogPost> {
  const year = new Date().getFullYear();
  const tone = isWritingTone(input.tone) ? input.tone : "해요체";
  const style = isWritingStyle(input.style) ? input.style : "default";
  const target = clampTargetLength(input.targetLength);
  const total = clampImageCount(input.imageCount);
  const withThumbnail = input.withThumbnail && total >= 1;
  const bodyCount = Math.max(0, total - (withThumbnail ? 1 : 0));
  const topic = sanitizeYear(input.topic, year);
  const stylePrompt = buildWritingStylePrompt(tone, style);
  const steps: StepLog[] = [];
  const call = (system: string, user: string, json: boolean, maxOutputTokens?: number) =>
    callGeminiText(input.apiKey, input.textModel, system, user, { json, maxOutputTokens, signal: input.signal });

  // ── 1단계 Research: 제목·소제목·장면별 이미지 프롬프트 ──
  input.onStep?.("1/4 주제·소제목·이미지 장면 기획 중…");
  const needScenes = withThumbnail || bodyCount > 0;
  const researchSystem = `너는 네이버 블로그 전문 기획 에이전트다.
${yearRule(year)}
네이버 C-Rank 및 D.I.A+ 검색 알고리즘에 최적화되고 독자의 클릭과 체류시간을 이끄는 제목과 ${sectionGuide(target)}의 핵심 소제목 목차를 기획한다. 목표 분량은 공백 포함 약 ${target}자다.
이미지 장면(scenes)은 이 글의 내용을 시각적으로 보여 주는 영어 이미지 생성 프롬프트다. ${withThumbnail ? "첫 번째는 대표(썸네일) 이미지다. " : ""}각 장면은 서로 다른 구도와 소재여야 하며 사실적인 사진 스타일로, 이미지 안에 글자가 들어가지 않게 쓴다.`;
  const researchUser = `[기획 조건]
- 주제: ${topic}
${input.hint ? `- 기획 배경/의도: ${sanitizeYear(input.hint, year)}\n` : ""}${input.extraRequest ? `- 추가 요청: ${sanitizeYear(input.extraRequest, year)}\n` : ""}- 목표 글자수: 공백 포함 약 ${target}자
- 이미지 장면 수: ${needScenes ? (withThumbnail ? 1 : 0) + bodyCount : 0}개

반드시 아래 JSON으로만 답한다:
{
  "finalTitle": "클릭률 높은 최종 제목(특수문자 남발 금지, 연도를 쓰면 ${year}년)",
  "subsections": [ { "title": "소제목", "keyPoints": ["포함할 핵심 사실", "..."] } ],
  "scenes": [ { "caption": "한국어 짧은 캡션(중복 금지, 대괄호 금지)", "prompt": "English image prompt" } ]
}`;
  const researchRaw = await call(researchSystem, researchUser, true, 4096);
  const parsed = parseJsonLoose<Partial<ResearchData>>(researchRaw);
  const research: ResearchData = {
    finalTitle: sanitizeYear(parsed?.finalTitle || topic, year) || topic,
    subsections:
      Array.isArray(parsed?.subsections) && parsed!.subsections!.length
        ? parsed!.subsections!.map((s) => ({ title: sanitizeYear(String(s?.title ?? ""), year), keyPoints: Array.isArray(s?.keyPoints) ? s!.keyPoints!.map((k) => sanitizeYear(String(k), year)) : [] })).filter((s) => s.title)
        : [
            { title: "핵심 개요와 배경", keyPoints: ["기본 개념"] },
            { title: "실전 활용과 주의사항", keyPoints: ["실전 팁"] },
            { title: "자주 묻는 질문과 요약", keyPoints: ["핵심 요약"] },
          ],
    scenes: parsed?.scenes,
  };
  steps.push({ step: "1. 기획", status: parsed ? "done" : "warn", message: parsed ? `제목·소제목 ${research.subsections.length}개 기획: "${research.finalTitle}"` : "기획 응답을 읽지 못해 기본 목차로 진행했습니다." });

  const fallbackPlan = buildFallbackPlan(research.finalTitle, topic, research.subsections, total, withThumbnail);
  const images: ImageSlot[] = needScenes ? normalizeImagePlan(research.scenes, fallbackPlan) : [];

  // ── 2단계 Writer: 태그가 붙은 본문 ──
  input.onStep?.(`2/4 본문 작성 중… (목표 약 ${target}자)`);
  const writerSystem = `너는 네이버 블로그 상위 0.1% 전문 파워블로거 라이터다.
주어진 목차로 네이버 스마트에디터 ONE에 맞는 공백 포함 약 ${target}자(최소 ${Math.round(target * 0.85)}자 ~ 최대 ${Math.round(target * 1.15)}자) 분량의 포스팅 본문을 쓴다.

[작성 규칙]
1. ${yearRule(year)}
2. 분량을 지키고, 도입(공감·문제 제기) → 본문(소제목별 핵심 노하우·구체 수치·사례) → 실전 팁/주의사항 → 맺음말(이웃 소통) 순서로 구성한다.
3. 구조 표기만 사용한다. 마크다운 제목(#)·HTML 태그는 쓰지 않는다.
   - 소제목: 줄 전체를 [SECTION - 소제목명] 으로 쓴다.
   - 이미지 자리: 줄 전체를 [IMAGE INSERT - 장면 설명] 으로 쓴다. 본문에 정확히 ${bodyCount}곳만, 맥락에 맞는 위치에 넣는다${bodyCount ? "" : "(0곳이면 넣지 않는다)"}.
   - 목록은 줄 앞에 "- ", 인용·핵심 요약 박스는 줄 앞에 "> ", 강조는 **굵게** 로 쓴다.
   - 마지막에 [SECTION - 참고자료] 로 출처·공식 기관 안내 또는 이웃 소통 맺음말을 둔다.
4. 모바일 가독성을 위해 2~3문장마다 빈 줄로 단락을 나눈다.
5. 신뢰할 수 있는 사실, 구체적 예시, 실전 팁 위주로 쓴다. 근거 없는 수치·출처·후기를 지어내지 않는다.
${input.withInteractive ? "6. 독자가 직접 체크하거나 계산해 볼 수 있는 참여형 요소(체크리스트·자가진단·비교 표 대신 목록)를 한 곳 이상 넣는다.\n" : ""}
${stylePrompt}`;
  const writerUser = `[기획된 글]
제목: ${research.finalTitle}
주제: ${topic}
${input.hint ? `기획 배경: ${sanitizeYear(input.hint, year)}\n` : ""}${input.extraRequest ? `추가 요청: ${sanitizeYear(input.extraRequest, year)}\n` : ""}소제목 구성:
${research.subsections.map((s, i) => `${i + 1}. ${s.title}: ${s.keyPoints.join(", ")}`).join("\n")}

위 목차로 전체 본문을 약 ${target}자 분량으로 상세히 작성해줘. 본문만 출력하고 제목·머리말·설명은 쓰지 마.`;
  const writerRaw = await call(writerSystem, writerUser, false, 16384);
  const draft = sanitizeBodyYear(writerRaw.replace(/^```[a-z]*\n?|```$/gim, "").trim(), year);
  steps.push({ step: "2. 본문 작성", status: "done", message: `1차 본문 작성 완료 (${tone} · ${WRITING_STYLES.find((s) => s.value === style)?.label}, 약 ${measureLength(draft)}자 / 목표 ${target}자)` });

  // ── 3단계 Humanizer: AI 티 제거 윤문(숫자·URL 보존 검증) ──
  input.onStep?.("3/4 문장 다듬는 중… (AI 티 제거)");
  let article = draft;
  try {
    const blocks = splitArticle(draft);
    const raw = await call(`${BLOG_HUMANIZER_RULES}\n\n${stylePrompt}`, buildHumanizerUser(blocks, research.finalTitle, topic), true, 16384);
    const data = parseJsonLoose<{ edits?: { id: string; text: string }[] }>(raw);
    if (data && Array.isArray(data.edits) && data.edits.length) {
      const applied = applyHumanizerEdits(blocks, data.edits);
      article = sanitizeBodyYear(applied.article, year);
      steps.push({ step: "3. 윤문", status: "done", message: `문장 다듬기 완료 (${applied.changes}개 문단 수정, 숫자·링크 보존 검증 통과분만 적용)` });
    } else {
      steps.push({ step: "3. 윤문", status: "done", message: "원문이 이미 자연스러워 추가 수정 없이 유지했습니다." });
    }
  } catch (err) {
    steps.push({ step: "3. 윤문", status: "warn", message: `윤문을 건너뛰고 원문을 보존했습니다: ${err instanceof Error ? err.message : "오류"}` });
  }

  // 이미지 자리 표식을 컷 캡션에 맞춘다
  article = alignImageMarkers(article, images.filter((s) => s.type === "body"));

  // ── 4단계 Reviewer: 글자수는 코드로 측정, 검수·태그·요약 ──
  input.onStep?.("4/4 검수·태그·요약 만드는 중…");
  const measured = measureLength(article);
  const minLen = Math.round(target * 0.85);
  const maxLen = Math.round(target * 1.15);
  const lengthOk = measured >= minLen && measured <= maxLen;
  const lengthNote = `본문 ${measured}자 (목표 ${target}자, 허용 ${minLen}~${maxLen}자) ${lengthOk ? "범위 내" : measured < minLen ? "부족" : "초과"}`;
  let reviewStatus: ReviewStatus = "UNKNOWN";
  let reviewNote = lengthNote;
  let tags: string[] = [];
  let summary = "";
  try {
    const reviewerSystem = `너는 네이버 블로그 SEO 및 팩트체크 검수관이다.
${yearRule(year)}
본문 전체를 처음부터 끝까지 검토한다. 지어낸 수치·출처·경험, 과거 연도 사용, 선택된 말끝·문체 불일치, 주제 이탈이 있으면 지적한다. 네이버 검색 노출에 효과적인 태그 5~10개와 검색결과 스니펫용 2줄 요약을 만든다.
reviewStatus 는 문제가 없으면 "PASS", 고칠 점이 있으면 "WARN", 그대로 발행하면 안 되면 "FAIL" 로만 답한다.
${stylePrompt}`;
    const reviewerUser = `제목: ${research.finalTitle}
주제: ${topic}
글자수 측정(코드 계산): ${lengthNote}
본문 전체:
${article}

반드시 아래 JSON으로만 답한다:
{ "tags": ["태그1", "태그2"], "summary": "2줄 메타 요약", "reviewStatus": "PASS | WARN | FAIL", "reviewNote": "검수 의견(최신성·문체·키워드 반영 포함)" }`;
    const raw = await call(reviewerSystem, reviewerUser, true, 4096);
    const data = parseJsonLoose<{ tags?: unknown; summary?: unknown; reviewStatus?: unknown; reviewNote?: unknown }>(raw);
    const st = String(data?.reviewStatus ?? "").toUpperCase();
    reviewStatus = st === "PASS" || st === "WARN" || st === "FAIL" ? st : "UNKNOWN";
    if (reviewStatus === "PASS" && !lengthOk) reviewStatus = "WARN";
    tags = Array.isArray(data?.tags) ? (data!.tags as unknown[]).filter((t): t is string => typeof t === "string" && t.trim().length > 0).map((t) => sanitizeYear(t.replace(/^#/, "").trim(), year)).slice(0, 10) : [];
    summary = typeof data?.summary === "string" ? data.summary.trim().slice(0, 300) : "";
    reviewNote = [typeof data?.reviewNote === "string" ? sanitizeYear(data.reviewNote, year) : "", lengthNote].filter(Boolean).join(" / ");
    steps.push({ step: "4. 검수", status: reviewStatus === "PASS" ? "done" : "warn", message: reviewStatus === "UNKNOWN" ? `검수 결과를 읽지 못했습니다(통과로 보지 않음). ${lengthNote}` : `검수 ${reviewStatus} · 태그 ${tags.length}개 · ${lengthNote}` });
  } catch (err) {
    steps.push({ step: "4. 검수", status: "warn", message: `검수를 건너뛰었습니다(통과로 보지 않음): ${err instanceof Error ? err.message : "오류"}. ${lengthNote}` });
  }
  if (!tags.length) tags = [topic.slice(0, 20), "블로그", "꿀팁", "정보", "최신정보"].filter(Boolean);
  steps.push({ step: "5. 이미지 계획", status: "done", message: images.length ? `이미지 컷 ${images.length}장 계획(${images.map((s) => (s.type === "thumbnail" ? "대표" : "본문")).join("·")})` : "이미지 없이 글만 생성합니다." });

  return {
    title: sanitizeYear(research.finalTitle, year),
    summary,
    article: sanitizeBodyYear(article, year),
    tags,
    images,
    reviewStatus,
    reviewNote,
    steps,
    settings: {
      tone,
      style,
      targetLength: target,
      imageCount: total,
      ratio: input.ratio,
      themeId: input.themeId,
      topic,
      withThumbnailText: input.withThumbnailText,
    },
  };
}
