import { callAI, parseJsonSafe, type AIModelConfig } from "./models";
import { buildHumanizerPrompt, applyHumanizerEdits } from "@/lib/humanizer";
import { WRITING_STYLES, buildWritingStylePrompt, isWritingTone, isWritingStyle, type WritingTone, type WritingStyle } from "./writingStyles";

import { sanitizeYear, sanitizeBodyYear } from "@/lib/yearPolicy";

// 연도 정책은 src/lib/yearPolicy.ts (올해 기준, 본문은 과거 사실 보존)
export { sanitizeYear, sanitizeBodyYear };

export interface PipelineInput {
  topic?: string;
  category: string;
  searchKeywords?: string;
  publishPurpose?: string;
  preferredTone?: string;
  writingStyle?: WritingStyle;
  recentTitles?: string[]; // 중복 방지용
  targetLength?: number; // 목표 글자수 (1 ~ 4000자, 기본 2000자)
  persona?: {
    id: string;
    name: string;
    badge: string;
    tonePrompt: string;
  };
  aiConfig: AIModelConfig;
}

export interface PipelineResult {
  title: string;
  content: string;
  excerpt?: string;
  tags: string[];
  category: string;
  personaName?: string;
  preferredTone?: WritingTone;
  writingStyle?: WritingStyle;
  targetLength?: number;
  charCount?: number;
  reviewStatus?: "PASS" | "WARN" | "FAIL" | "UNKNOWN"; // 저장 글을 불러온 경우에는 없음
  reviewNote?: string;
  images: {
    type: "thumbnail" | "body";
    prompt: string;
    caption: string;
  }[];
  stepsLog: {
    step: string;
    status: "done" | "warn";
    message: string;
  }[];
}

export async function runBlogGenerationPipeline(input: PipelineInput): Promise<PipelineResult> {
  const currentYear = new Date().getFullYear();
  const {
    category,
    recentTitles = [],
    persona,
    aiConfig,
  } = input;
  const preferredTone = isWritingTone(input.preferredTone) ? input.preferredTone : "해요체";
  const writingStyle = isWritingStyle(input.writingStyle) ? input.writingStyle : "default";
  const writingStylePrompt = buildWritingStylePrompt(preferredTone, writingStyle);

  // [1단계 안전망: 입력단 과거 연도 자동 정제]
  const cleanTopic = sanitizeYear(input.topic, currentYear);
  const cleanSearchKeywords = sanitizeYear(input.searchKeywords, currentYear);
  const cleanPublishPurpose = sanitizeYear(input.publishPurpose, currentYear);

  const targetLength = Math.max(1, Math.min(4000, Number(input.targetLength) || 2000));
  const stepsLog: PipelineResult["stepsLog"] = [];

  const personaPromptSnippet = persona
    ? `\n- 작성자 페르소나 캐릭터: "${persona.name}" [${persona.badge}]\n- 페르소나 관점 및 어조 가이드: ${persona.tonePrompt}`
    : "";

  const sectionCountGuide =
    targetLength <= 1000
      ? "2~3개"
      : targetLength <= 2500
      ? "3~4개"
      : "4~5개";

  // 1단계: Research Agent (주제 및 소제목 기획)
  const researchSystemPrompt = `너는 네이버 블로그 전문 기획 에이전트야.
[기준 연도 절대 엄수]: 현재 연도는 ${currentYear}년이야. 모든 제목, 소제목, 정책, 혜택, 최신 트렌드, 정보는 반드시 ${currentYear}년(당해 연도) 기준으로 기획해야 해.
사용자가 제공한 주제나 참고 자료에 과거 연도(2023년, 2024년 등)가 최신 정보·정책·혜택·트렌드의 기준으로 쓰였다면 따라 쓰지 말고 ${currentYear}년(당해 연도)으로 바꿔서 기획해. 단, 출시·발표·시행처럼 실제로 있었던 과거 사실의 연도는 정확히 그대로 둬.
네이버 C-Rank 및 D-I-A+ 검색 알고리즘에 최적화되고, 실제 독자의 클릭과 긴 체류시간을 유도하는 ${currentYear}년 최신 트렌드 제목과 ${sectionCountGuide}의 핵심 소제목 목차를 기획해줘.
목표 글자수는 공백 포함 약 ${targetLength}자이므로, 목표 분량에 걸맞은 알찬 목차 구성이 필요해.
최근 발행된 글 제목들과 소재가 중복되지 않도록 참신하고 신뢰도 높은 관점을 제시해야 해.
${persona ? `특히 "${persona.name}" [${persona.badge}] 시각에서 독자가 가장 궁금해하고 신뢰할 수 있는 소제목으로 구성해줘.` : ""}`;

  const researchUserPrompt = `[기획 조건]
- 기준 연도: ${currentYear}년 (최신 정보를 과거 연도 기준으로 쓰지 말 것. 실제로 있었던 과거 사실의 연도만 그대로 허용)
- 카테고리: ${category}
- 검색 키워드: ${cleanSearchKeywords || "자동 발굴"}
- 발행 목적: ${cleanPublishPurpose || "정보 제공 및 독자 체류시간 극대화"}${personaPromptSnippet}
- 목표 글자수: 공백 포함 약 ${targetLength}자
- 최근 발행 글 목록 (소재 중복 절대 금지):
${recentTitles.slice(0, 10).map((t) => "- " + t).join("\n") || "(없음)"}
${cleanTopic ? `- 사용자가 지정한 주제: ${cleanTopic}` : ""}

반드시 아래 JSON 형식으로만 응답해:
{
  "finalTitle": "클릭률 높은 네이버 블로그 최종 제목 (특수문자 남발 금지, 연도 언급 시 반드시 ${currentYear}년)",
  "subsections": [
    { "title": "소제목 1", "keyPoints": ["포함할 핵심 팩트 1", "팩트 2"] },
    { "title": "소제목 2", "keyPoints": ["포함할 핵심 팩트 1", "팩트 2"] },
    { "title": "소제목 3", "keyPoints": ["포함할 핵심 팩트 1", "팩트 2"] }
  ],
  "reasoning": "주제 선정 이유 및 신선도"
}`;

  const researchRaw = await callAI(aiConfig, researchSystemPrompt, researchUserPrompt);
  const rawResearchData = parseJsonSafe(researchRaw, {
    finalTitle: cleanTopic || `${category} 완벽 가이드`,
    subsections: [
      { title: "개요 및 핵심 배경", keyPoints: ["기본 개념"] },
      { title: "실제 적용 및 주의사항", keyPoints: ["실전 팁"] },
      { title: "자주 묻는 질문 및 요약", keyPoints: ["핵심 요약"] },
    ],
  });

  // 기획 제목 1차 정제
  const researchData = {
    ...rawResearchData,
    finalTitle: sanitizeYear(rawResearchData.finalTitle, currentYear),
    subsections: (rawResearchData.subsections || []).map((s: any) => ({
      title: sanitizeYear(s.title, currentYear),
      keyPoints: Array.isArray(s.keyPoints)
        ? s.keyPoints.map((k: string) => sanitizeYear(k, currentYear))
        : [],
    })),
  };

  stepsLog.push({
    step: "1. Research Agent",
    status: "done",
    message: `주제 및 소제목 기획 완료 (기준: ${currentYear}년, 목표: 약 ${targetLength}자): "${researchData.finalTitle}"${persona ? ` (${persona.name} 시점)` : ""}`,
  });

  // 2단계: Writer Agent (목표 글자수 반영 본문 작성)
  const lengthGuideline = `공백 포함 약 ${targetLength}자 내외 (최소 ${Math.round(targetLength * 0.85)}자 ~ 최대 ${Math.round(targetLength * 1.15)}자)`;

  const writerSystemPrompt = persona
    ? `너는 "${persona.name}" [${persona.badge}] 페르소나를 지닌 네이버 블로그 상위 0.1% 전문 파워블로거 라이터야.
${persona.tonePrompt}
주어진 목차를 바탕으로 네이버 스마트에디터 ONE에 최적화된 ${lengthGuideline} 분량의 포스팅 본문을 작성해줘.

[작성 규칙]
1. 기준 연도 절대 엄수: 현재 연도는 ${currentYear}년이야. 모든 본문 내용, 제도, 지원금, 제품, 가이드, 연도 표기는 반드시 ${currentYear}년(당해 연도) 최신 기준이야. 주어진 목차나 소재에 최신 정보 기준으로 쓰인 과거 연도(2023년, 2024년 등)가 있으면 ${currentYear}년으로 바꿔서 작성해. 단, 출시·발표·시행·사건처럼 실제로 있었던 과거 사실의 연도는 정확히 그대로 쓰고 올해로 바꾸지 마.
2. 분량 준수: 공백 포함 약 ${targetLength}자 내외를 목표로 충실하게 내용을 전개할 것.
3. 말투: 회원이 선택한 ${preferredTone}와 문체를 페르소나의 어조보다 우선 반영한다. (기계적인 AI 번역투 절대 금지)
4. 구조화 태그:
   - 소제목 시작 시: [SECTION - 소제목명]
   - 이미지 들어갈 자리: [IMAGE INSERT - 상황을 설명하는 상세 묘사]
   - 마지막에: [SECTION - 참고자료] (출처 및 공식 기관 안내 또는 이웃 소통 맺음말)
5. 모바일 가독성을 위해 2~3문장마다 빈 줄(\\n\\n)로 단락을 띄울 것.
6. 제공된 사실·경험에 근거하여 실용적으로 작성한다. 페르소나를 이유로 실사용/실경험이나 수치를 지어내지 않는다.`
    : `너는 네이버 블로그 상위 0.1% 전문 파워블로거 라이터야.
주어진 목차를 바탕으로 네이버 스마트에디터 ONE에 최적화된 ${lengthGuideline} 분량의 정보성 포스팅 본문을 작성해줘.

[작성 규칙]
1. 기준 연도 절대 엄수: 현재 연도는 ${currentYear}년이야. 모든 본문 내용, 제도, 지원금, 제품, 가이드, 연도 표기는 반드시 ${currentYear}년(당해 연도) 최신 기준이야. 주어진 목차나 소재에 최신 정보 기준으로 쓰인 과거 연도(2023년, 2024년 등)가 있으면 ${currentYear}년으로 바꿔서 작성해. 단, 출시·발표·시행·사건처럼 실제로 있었던 과거 사실의 연도는 정확히 그대로 쓰고 올해로 바꾸지 마.
2. 분량 준수: 공백 포함 약 ${targetLength}자 내외를 목표로 충실하게 내용을 전개할 것.
3. 말투: 자연스러운 ${preferredTone} (상투적인 기계적 어투 금지)
4. 구조화 태그:
   - 소제목 시작 시: [SECTION - 소제목명]
   - 이미지 들어갈 자리: [IMAGE INSERT - 상황을 설명하는 상세 묘사]
   - 마지막에: [SECTION - 참고자료] (출처 및 공식 기관 안내)
5. 모바일 가독성을 위해 2~3문장마다 빈 줄(\\n\\n)로 단락을 띄울 것.
6. 신뢰할 수 있는 사실, 구체적 예시, 독자가 궁금해할 실전 꿀팁 위주로 작성할 것.`;

  const writerUserPrompt = `[기획된 글 정보]
기준 연도: ${currentYear}년 (최신 정보는 ${currentYear}년 기준, 실제 과거 사실의 연도는 그대로)
제목: ${researchData.finalTitle}
카테고리: ${category}
${cleanTopic ? `사용자가 지정한 주제: ${cleanTopic}
` : ""}검색 키워드: ${cleanSearchKeywords || "(지정 없음)"}
발행 목적: ${cleanPublishPurpose || "정보 제공 및 독자 체류시간 극대화"}
목표 분량: 공백 포함 약 ${targetLength}자
${persona ? `작성자 캐릭터: ${persona.name} (${persona.badge})` : ""}
소제목 구성:
${researchData.subsections.map((s: any, idx: number) => `${idx + 1}. ${s.title}: ${s.keyPoints.join(", ")}`).join("\n")}

위 목차를 바탕으로 스마트에디터 ONE 양식의 전체 본문을 약 ${targetLength}자 분량으로 상세히 작성해줘.
검색 키워드는 제목·소제목·본문에 억지스럽지 않게 자연스럽게 녹이고, 발행 목적에 맞는 관점과 마무리를 갖춰줘.`;

  const writerRaw = await callAI(aiConfig, `${writerSystemPrompt}\n\n${writingStylePrompt}`, writerUserPrompt);
  const draftArticle = sanitizeBodyYear(writerRaw.trim(), currentYear);

  stepsLog.push({
    step: "2. Writer Agent",
    status: "done",
    message: `1차 본문 작성 완료 (${preferredTone} · ${WRITING_STYLES.find((style) => style.value === writingStyle)?.label}, 공백 포함 약 ${draftArticle.length}자 / 목표: ${targetLength}자)`,
  });

  // 3단계: Blog Humanizer (문장 다듬기 & AI 티 제거)
  let humanizedArticle = draftArticle;
  try {
    const { systemPrompt: hSys, userPrompt: hUser, blocks } = buildHumanizerPrompt(
      draftArticle,
      researchData.finalTitle,
      category
    );
    const humanizerRaw = await callAI(aiConfig, `${hSys}\n\n${writingStylePrompt}`, hUser);
    const humanizerData = parseJsonSafe(humanizerRaw, { edits: [] });

    if (Array.isArray(humanizerData.edits) && humanizerData.edits.length > 0) {
      const { article, changes } = applyHumanizerEdits(blocks, humanizerData.edits);
      humanizedArticle = sanitizeBodyYear(article, currentYear);
      stepsLog.push({
        step: "3. Blog Humanizer",
        status: "done",
        message: `인간화 윤문 완료 (${changes.length}개 문단 다듬기 적용)`,
      });
    } else {
      stepsLog.push({
        step: "3. Blog Humanizer",
        status: "done",
        message: "원문이 이미 자연스러워 추가 윤문 없이 원본 유지",
      });
    }
  } catch (err: any) {
    stepsLog.push({
      step: "3. Blog Humanizer",
      status: "warn",
      message: `휴머나이저 건너뜀 (원문 보존): ${err?.message || "오류"}`,
    });
  }

  // 4단계: Reviewer Agent (본문 전체 검수 · 글자수 판정 · 태그 추천)
  // 글자수는 AI 추측이 아니라 코드로 측정한다. [SECTION]/[IMAGE INSERT] 구조 태그 줄은 제외한다.
  const measuredLength = humanizedArticle
    .split(/\r?\n/)
    .filter((line) => !/^\s*\[(SECTION|IMAGE INSERT)\b[^\]]*\]\s*$/i.test(line))
    .join("\n")
    .trim().length;
  const minLength = Math.round(targetLength * 0.85);
  const maxLength = Math.round(targetLength * 1.15);
  const lengthOk = measuredLength >= minLength && measuredLength <= maxLength;
  const lengthNote = `본문 ${measuredLength}자 (목표 ${targetLength}자, 허용 ${minLength}~${maxLength}자) ${lengthOk ? "범위 내" : measuredLength < minLength ? "부족" : "초과"}`;

  const reviewerSystemPrompt = `너는 네이버 블로그 SEO 및 팩트체크 검수관이야.
[기준 연도 엄수]: 현재 연도는 ${currentYear}년이야. 본문 및 태그 검수 시 최신 정보가 과거 연도(2023년, 2024년 등) 기준으로 쓰이지 않았는지 보고(실제 과거 사실의 연도는 정상), 필요 시 ${currentYear}년 최신 태그를 부여해줘.
본문 전체를 처음부터 끝까지 검토해. 지어낸 수치·출처·경험, 과거 연도 사용, 선택된 말끝·문체 불일치, 주제·키워드 이탈이 있으면 지적하고,
네이버 블로그 검색 노출에 가장 효과적인 태그 5~10개를 선정해줘.
reviewStatus는 문제가 없으면 "PASS", 고쳐야 할 점이 있으면 "WARN", 그대로 발행하면 안 되면 "FAIL"로만 답해.`;

  const reviewerUserPrompt = `기준 연도: ${currentYear}년
최종 제목: ${sanitizeYear(researchData.finalTitle, currentYear)}
제목: ${researchData.finalTitle}
카테고리: ${category}
검색 키워드: ${cleanSearchKeywords || "(지정 없음)"}
발행 목적: ${cleanPublishPurpose || "정보 제공 및 독자 체류시간 극대화"}
글자수 측정(코드 계산): ${lengthNote}
본문 전체:
${humanizedArticle}

반드시 아래 JSON 형식으로만 응답해:
{
  "tags": ["태그1", "태그2", "태그3", "태그4", "태그5"],
  "reviewStatus": "PASS | WARN | FAIL 중 하나",
  "reviewNote": "검수 의견 (${currentYear}년 최신성, 문체, 키워드 반영 여부 포함)"
}`;

  const reviewerRaw = await callAI(aiConfig, `${reviewerSystemPrompt}\n\n${writingStylePrompt}\n선택된 말끝과 문체의 적용 여부도 검수 의견에 포함한다.`, reviewerUserPrompt);
  // 파싱 실패를 PASS로 간주하지 않는다. 읽지 못하면 UNKNOWN으로 남기고 경고한다.
  const reviewerData = parseJsonSafe<{ tags?: unknown; reviewStatus?: unknown; reviewNote?: unknown } | null>(reviewerRaw, null);
  const parsedStatus = String(reviewerData?.reviewStatus || "").toUpperCase();
  let reviewStatus: NonNullable<PipelineResult["reviewStatus"]> =
    parsedStatus === "PASS" || parsedStatus === "WARN" || parsedStatus === "FAIL" ? parsedStatus : "UNKNOWN";
  if (reviewStatus === "PASS" && !lengthOk) reviewStatus = "WARN";
  const reviewerTags = Array.isArray(reviewerData?.tags)
    ? (reviewerData!.tags as unknown[]).filter((t): t is string => typeof t === "string" && t.trim().length > 0)
    : [];
  const tags = reviewerTags.length > 0 ? reviewerTags : [category, "블로그정보", "꿀팁", "생활정보", "최신정보"];
  const reviewNote = [typeof reviewerData?.reviewNote === "string" ? reviewerData.reviewNote : "", lengthNote].filter(Boolean).join(" / ");

  stepsLog.push({
    step: "4. Reviewer Agent",
    status: reviewStatus === "PASS" ? "done" : "warn",
    message:
      reviewStatus === "UNKNOWN"
        ? `검수 결과를 읽지 못했습니다(통과로 보지 않음). 기본 태그 사용. ${lengthNote}`
        : `검수 ${reviewStatus} · 태그 ${tags.length}개 · ${lengthNote}`,
  });

  // 5단계: Image Prompts 생성 (썸네일 1장 + 본문 삽입 2장)
  const imagePrompts: PipelineResult["images"] = [
    {
      type: "thumbnail",
      prompt: `Clean, modern blog thumbnail photo about ${researchData.finalTitle}, East Asian person or professional setting, photorealistic, 8k, bright natural lighting, no text`,
      caption: `${researchData.finalTitle} 대표 이미지`,
    },
    {
      type: "body",
      prompt: `Informative detailed close-up shot about ${category}, clean workspace or real-life scene, photorealistic, high quality, soft shadows, no text`,
      caption: "관련 상세 안내 이미지",
    },
  ];

  stepsLog.push({
    step: "5. Image Agent",
    status: "done",
    message: `대표 썸네일 및 본문 이미지 프롬프트 ${imagePrompts.length}종 준비 완료`,
  });

  // [3단계 안전망: 최종 반환 직전 정규식 Safe-guard 교정]
  const finalTitle = sanitizeYear(researchData.finalTitle, currentYear);
  const finalContent = sanitizeBodyYear(humanizedArticle, currentYear);
  const finalTags = tags.map((t: string) => sanitizeYear(t, currentYear));
  const finalImages = imagePrompts.map((img) => ({
    ...img,
    prompt: sanitizeYear(img.prompt, currentYear),
    caption: sanitizeYear(img.caption, currentYear),
  }));

  return {
    title: finalTitle,
    content: finalContent,
    tags: finalTags,
    category,
    personaName: persona?.name,
    preferredTone,
    writingStyle,
    targetLength,
    charCount: finalContent.length,
    reviewStatus,
    reviewNote: sanitizeYear(reviewNote, currentYear),
    images: finalImages,
    stepsLog,
  };
}
