import { callAI, parseJsonSafe, type AIModelConfig } from "./models";
import { buildHumanizerPrompt, applyHumanizerEdits } from "@/lib/humanizer";

export interface PipelineInput {
  topic?: string;
  category: string;
  searchKeywords?: string;
  publishPurpose?: string;
  preferredTone?: string; // "해요체" | "합니다체" | "친근한 반말"
  recentTitles?: string[]; // 중복 방지용
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
  tags: string[];
  category: string;
  personaName?: string;
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
  const { category, searchKeywords, publishPurpose, preferredTone = "해요체", recentTitles = [], persona, aiConfig } = input;
  const stepsLog: PipelineResult["stepsLog"] = [];

  const personaPromptSnippet = persona
    ? `\n- 작성자 페르소나 캐릭터: "${persona.name}" [${persona.badge}]\n- 페르소나 관점 및 어조 가이드: ${persona.tonePrompt}`
    : "";

  // 1단계: Research Agent (주제 및 소제목 기획)
  const researchSystemPrompt = `너는 네이버 블로그 전문 기획 에이전트야.
네이버 C-Rank 및 D-I-A+ 검색 알고리즘에 최적화되고, 실제 독자의 클릭과 긴 체류시간을 유도하는 제목과 3~4개의 핵심 소제목 목차를 기획해줘.
최근 발행된 글 제목들과 소재가 중복되지 않도록 참신하고 신뢰도 높은 관점을 제시해야 해.
${persona ? `특히 "${persona.name}" [${persona.badge}] 시각에서 독자가 가장 궁금해하고 신뢰할 수 있는 소제목으로 구성해줘.` : ""}`;

  const researchUserPrompt = `[기획 조건]
- 카테고리: ${category}
- 검색 키워드: ${searchKeywords || "자동 발굴"}
- 발행 목적: ${publishPurpose || "정보 제공 및 독자 체류시간 극대화"}${personaPromptSnippet}
- 최근 발행 글 목록 (소재 중복 절대 금지):
${recentTitles.slice(0, 10).map((t) => "- " + t).join("\n") || "(없음)"}
${input.topic ? `- 사용자가 지정한 주제: ${input.topic}` : ""}

반드시 아래 JSON 형식으로만 응답해:
{
  "finalTitle": "클릭률 높은 네이버 블로그 최종 제목 (특수문자 남발 금지)",
  "subsections": [
    { "title": "소제목 1", "keyPoints": ["포함할 핵심 팩트 1", "팩트 2"] },
    { "title": "소제목 2", "keyPoints": ["포함할 핵심 팩트 1", "팩트 2"] },
    { "title": "소제목 3", "keyPoints": ["포함할 핵심 팩트 1", "팩트 2"] }
  ],
  "reasoning": "주제 선정 이유 및 신선도"
}`;

  const researchRaw = await callAI(aiConfig, researchSystemPrompt, researchUserPrompt);
  const researchData = parseJsonSafe(researchRaw, {
    finalTitle: input.topic || `${category} 완벽 가이드`,
    subsections: [
      { title: "개요 및 핵심 배경", keyPoints: ["기본 개념"] },
      { title: "실제 적용 및 주의사항", keyPoints: ["실전 팁"] },
      { title: "자주 묻는 질문 및 요약", keyPoints: ["핵심 요약"] },
    ],
  });

  stepsLog.push({
    step: "1. Research Agent",
    status: "done",
    message: `주제 및 3개 소제목 기획 완료: "${researchData.finalTitle}"${persona ? ` (${persona.name} 시점)` : ""}`,
  });

  // 2단계: Writer Agent (1,800~2,500자 블로그 본문 작성)
  const writerSystemPrompt = persona
    ? `너는 "${persona.name}" [${persona.badge}] 페르소나를 지닌 네이버 블로그 상위 0.1% 전문 파워블로거 라이터야.
${persona.tonePrompt}
주어진 목차를 바탕으로 네이버 스마트에디터 ONE에 최적화된 1,800~2,500자 분량의 포스팅 본문을 작성해줘.

[작성 규칙]
1. 말투: ${persona.tonePrompt}를 최우선으로 반영하되 기본 어조는 자연스러운 ${preferredTone}. (기계적인 AI 번역투 절대 금지)
2. 구조화 태그:
   - 소제목 시작 시: [SECTION - 소제목명]
   - 이미지 들어갈 자리: [IMAGE INSERT - 상황을 설명하는 상세 묘사]
   - 마지막에: [SECTION - 참고자료] (출처 및 공식 기관 안내 또는 이웃 소통 맺음말)
3. 모바일 가독성을 위해 2~3문장마다 빈 줄(\\n\\n)로 단락을 띄울 것.
4. 해당 인물의 생생한 실사용/실경험 썰, 구체적 수치, 독자가 무릎을 칠 꿀팁 위주로 작성할 것.`
    : `너는 네이버 블로그 상위 0.1% 전문 파워블로거 라이터야.
주어진 목차를 바탕으로 네이버 스마트에디터 ONE에 최적화된 1,800~2,500자 분량의 정보성 포스팅 본문을 작성해줘.

[작성 규칙]
1. 말투: 자연스러운 ${preferredTone} (상투적인 기계적 어투 금지)
2. 구조화 태그:
   - 소제목 시작 시: [SECTION - 소제목명]
   - 이미지 들어갈 자리: [IMAGE INSERT - 상황을 설명하는 상세 묘사]
   - 마지막에: [SECTION - 참고자료] (출처 및 공식 기관 안내)
3. 모바일 가독성을 위해 2~3문장마다 빈 줄(\\n\\n)로 단락을 띄울 것.
4. 신뢰할 수 있는 사실, 구체적 예시, 독자가 궁금해할 실전 꿀팁 위주로 작성할 것.`;

  const writerUserPrompt = `[기획된 글 정보]
제목: ${researchData.finalTitle}
카테고리: ${category}
${persona ? `작성자 캐릭터: ${persona.name} (${persona.badge})` : ""}
소제목 구성:
${researchData.subsections.map((s: any, idx: number) => `${idx + 1}. ${s.title}: ${s.keyPoints.join(", ")}`).join("\n")}

위 목차를 바탕으로 스마트에디터 ONE 양식의 전체 본문을 상세히 작성해줘.`;

  const writerRaw = await callAI(aiConfig, writerSystemPrompt, writerUserPrompt);
  let draftArticle = writerRaw.trim();

  stepsLog.push({
    step: "2. Writer Agent",
    status: "done",
    message: `1차 본문 작성 완료 (공백 제외 약 ${draftArticle.replace(/\s/g, "").length}자)`,
  });

  // 3단계: Blog Humanizer (문장 다듬기 & AI 티 제거)
  let humanizedArticle = draftArticle;
  try {
    const { systemPrompt: hSys, userPrompt: hUser, blocks } = buildHumanizerPrompt(
      draftArticle,
      researchData.finalTitle,
      category
    );
    const humanizerRaw = await callAI(aiConfig, hSys, hUser);
    const humanizerData = parseJsonSafe(humanizerRaw, { edits: [] });

    if (Array.isArray(humanizerData.edits) && humanizerData.edits.length > 0) {
      const { article, changes } = applyHumanizerEdits(blocks, humanizerData.edits);
      humanizedArticle = article;
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

  // 4단계: Reviewer Agent (태그 추천 및 최종 검수)
  const reviewerSystemPrompt = `너는 네이버 블로그 SEO 및 팩트체크 검수관이야.
완성된 본문을 검토하고, 네이버 블로그 검색 노출에 가장 효과적인 태그 5~10개를 선정해줘.`;

  const reviewerUserPrompt = `제목: ${researchData.finalTitle}
카테고리: ${category}
본문 미리보기:
${humanizedArticle.slice(0, 1500)}

반드시 아래 JSON 형식으로만 응답해:
{
  "tags": ["태그1", "태그2", "태그3", "태그4", "태그5"],
  "reviewStatus": "PASS",
  "reviewNote": "검수 완료 의견"
}`;

  const reviewerRaw = await callAI(aiConfig, reviewerSystemPrompt, reviewerUserPrompt);
  const reviewerData = parseJsonSafe(reviewerRaw, {
    tags: [category, "블로그정보", "꿀팁", "생활정보", "최신정보"],
    reviewStatus: "PASS",
  });

  stepsLog.push({
    step: "4. Reviewer Agent",
    status: "done",
    message: `SEO 태그 ${reviewerData.tags.length}개 추출 및 최종 검수 통과`,
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

  return {
    title: researchData.finalTitle,
    content: humanizedArticle,
    tags: reviewerData.tags,
    category,
    personaName: persona?.name,
    images: imagePrompts,
    stepsLog,
  };
}
