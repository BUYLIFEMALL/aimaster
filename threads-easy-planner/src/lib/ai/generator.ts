import "server-only";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider } from "@/lib/apiKeys";
import type { TopicSuggestion, ThreadPlanResult, HookVariant, RewriteMode } from "@/types/planner";
export type { TopicSuggestion, ThreadPlanResult, HookVariant, RewriteMode };

/**
 * 1. "오늘 뭐 쓰지?" 주제 10개 추천
 * 스레드 4대 심리(공감·손해회피·호기심·반전)와 5대 훅 유형 기반
 */
export async function suggestTopicsAI(params: {
  categoryName?: string;
  customKeyword?: string;
  aiConfig: { provider: AIProvider; apiKey: string; model?: string };
}): Promise<TopicSuggestion[]> {
  const { categoryName, customKeyword, aiConfig } = params;

  const targetDescription = customKeyword
    ? `사용자 입력 키워드/분야: "${customKeyword}"`
    : `선택된 타깃 카테고리: "${categoryName || "자취 / 생활꿀팁"}"`;

  const systemPrompt = `너는 대한민국 Threads(스레드)에서 실시간으로 수백 개의 댓글과 바이럴을 터뜨리는 탑티어 콘텐츠 디렉터야.
초보자도 바로 터지는 글을 쓸 수 있도록, 지금 스레드 알고리즘과 독자 심리를 완벽히 관통하는 매력적인 주제 10개를 뽑아줘.

[스레드 4대 심리 자극 공식]
1. 공감: "나만 이런 줄 알았는데 다들 똑같더라", 숨겨진 찌질함이나 귀찮음 건드리기
2. 손해 회피: "모르면 평생 손해 보는", "제발 이거 모르고 돈/시간 쓰지 마"
3. 호기심: "퇴근하고 딱 10분 바꿨는데 삶의 질 바뀐 썰", "진짜 나만 알고 싶었던"
4. 반전: "다들 좋다는 방법 다 버렸다", "인생 편해지려고 샀는데 오히려 더 바빠진 이유"

[5대 훅 유형 분배]
10개 추천 주제는 자책형, 부정 명령형, 리얼 썰형, 논쟁형, 반전형을 골고루 배분해줘.
- 지루한 설명문 절대 금지: "20대 재테크 팁" (X) -> "통장에 100만원도 없던 내가 6개월 만에 1000만원 모은 강제 저축법" (O)
- 제품명은 넣지 말고, 1인칭 솔직한 날것의 어조가 느껴지게 작성할 것.

반드시 아래 JSON 객체 포맷으로만 응답해:
{
  "topics": [
    {
      "id": 1,
      "topic": "스레드 주제 제목",
      "hookPreview": "첫 문장으로 쓰기 좋은 1초 후킹 예시",
      "whyItWorks": "자극한 심리(공감·손해회피·호기심·반전)와 멈추게 하는 이유 1줄"
    }
  ]
}`;

  const userPrompt = `분야: ${targetDescription}\n이 타깃의 독자들이 스크롤을 멈추고 댓글을 달 수밖에 없는 스레드 주제 10개를 뽑아줘.`;

  const rawJson = await callLLM(aiConfig, systemPrompt, userPrompt);
  const parsed = parseJsonSafe<any>(rawJson, null);

  if (!parsed) return [];

  if (Array.isArray(parsed)) {
    return parsed as TopicSuggestion[];
  }

  const candidate =
    parsed.topics ||
    parsed.response ||
    parsed.data ||
    parsed.suggestions ||
    Object.values(parsed).find(Array.isArray);

  if (Array.isArray(candidate)) {
    return candidate as TopicSuggestion[];
  }

  return [];
}

/**
 * 2. 선택한 주제로 스레드 글 및 5대 훅 유형별 글 세트 자동 생성
 * - 황금 4단계 구조: 멈추게 하기 → 공감 쌓기 → 반전 한 방 → 질문 던지기
 * - 4~6줄 친근한 반말(친구/언니 카톡 톤), AI 티 완전 제거, 제품명 노출 금지
 * - 5대 훅 유형(자책형, 부정 명령형, 리얼 썰형, 논쟁형, 반전형) 대안 완비
 */
export async function generateThreadPlanAI(params: {
  topic: string;
  additionalNote?: string;
  aiConfig: { provider: AIProvider; apiKey: string; model?: string };
}): Promise<ThreadPlanResult> {
  const { topic, additionalNote, aiConfig } = params;

  const systemPrompt = `너는 Threads(스레드)에서 피드를 멈추고 댓글 수백 개를 이끌어내는 탑티어 바이럴 크리에이터야.
독자가 스크롤을 내리다 첫 문장에서 손가락을 멈추고, 끝까지 읽은 뒤 무조건 댓글을 달게 만드는 완벽한 스레드 포스팅 세트를 작성해줘.

[스레드 4단계 황금 구조 - 필수 준수]
1. 멈추게 하기 (1초 훅): 피드 스크롤을 1초 만에 멈추는 강력한 첫 줄 (반전, 자책, 부정 명령, 날것의 썰).
2. 공감 쌓기: "나만 이런 줄 알았는데...", 누구나 겪는 현실의 찌질함·불편함·귀찮음을 솔직하게 고백.
3. 반전 한 방: 상식을 깨는 의외의 시각이나 팁 제시.
   ※ 중요 규칙: 특정 상업적 제품명이나 브랜드명은 절대 쓰지 말 것! 광고 냄새를 100% 빼고 오직 리얼한 일상 경험과 상황으로만 공감을 얻을 것.
4. 질문 던지기: 스레드 알고리즘의 핵심은 '댓글'임. 마지막 줄은 무조건 독자가 댓글로 자기 이야기를 안 털어놓고는 못 배기게 만드는 열린 질문 던지기.

[문체 및 작성 원칙]
- 분량: 4~6줄 내외의 압축적 분량 (모바일 화면 가독성을 위해 1~2문장마다 반드시 빈 줄(\\n\\n) 삽입).
- 문체: 친한 친구나 친한 언니에게 카톡하듯 솔직하고 찰진 '반말' 어조 (설명문, 존댓말 절대 금지).
- AI 티 100% 제거: "따라서", "결론적으로", "요약하자면", "~에 대해 알아보겠습니다", "~것이 중요합니다" 같은 상투적 교과서 말투 절대 금지.
- 거짓 과장 금지: 실제 경험담처럼 느껴지도록 날것의 감정을 담아낼 것.

[5대 훅 유형별 대안 완비]
기본 추천 글 외에도 5대 훅 유형별로 첫 문장과 4~6줄 전체 본문 세트를 함께 작성해줘:
1) 자책형: "아 나 진짜 멍청하게 왜 여태...", 솔직한 자책과 뼈아픈 후회
2) 부정 명령형: "제발 이거 모르면 사지 마", "퇴근하고 절대 배달앱 켜지 마", 손해 회피 극대화
3) 리얼 썰형: "퇴근하고 설거지 귀찮아서 일주일에 4번을 굶다가...", 날것의 1인칭 현실 썰
4) 논쟁형: "A vs B 솔직히 뭐가 맞음?", 댓글 토론 폭발 유발
5) 반전형: "다들 좋다는 거 다 버렸다. 진짜 내 삶 바꾼 건 이거였음", 상식 파괴 반전

반드시 아래 JSON 규격으로만 응답해:
{
  "topic": "${topic}",
  "hook": "가장 반응 좋은 대표 첫 문장 후킹",
  "hookType": "자책형 | 부정 명령형 | 리얼 썰형 | 논쟁형 | 반전형",
  "whyHookWorks": "이 첫 줄이 피드를 멈추게 하는 이유 1줄 (자극한 심리: 공감·손해회피·호기심·반전)",
  "content": "가독성 빈 줄(\\n\\n)이 포함된 4~6줄 친근한 반말 전체 본문 (hook 포함)",
  "cta": "마지막 댓글을 부르는 열린 질문",
  "followUpIdeas": [
    "후속 아이디어 1",
    "후속 아이디어 2",
    "후속 아이디어 3",
    "후속 아이디어 4",
    "후속 아이디어 5"
  ],
  "hookVariants": [
    {
      "type": "자책형",
      "hook": "자책형 첫 문장 훅",
      "whyItWorks": "자책형 훅이 피드를 멈추게 하는 이유",
      "content": "자책형 훅으로 시작하는 4~6줄 친근한 반말 본문 (질문 포함)"
    },
    {
      "type": "부정 명령형",
      "hook": "부정 명령형 첫 문장 훅",
      "whyItWorks": "부정 명령형 훅이 피드를 멈추게 하는 이유",
      "content": "부정 명령형 훅으로 시작하는 4~6줄 친근한 반말 본문 (질문 포함)"
    },
    {
      "type": "리얼 썰형",
      "hook": "리얼 썰형 첫 문장 훅",
      "whyItWorks": "리얼 썰형 훅이 피드를 멈추게 하는 이유",
      "content": "리얼 썰형 훅으로 시작하는 4~6줄 친근한 반말 본문 (질문 포함)"
    },
    {
      "type": "논쟁형",
      "hook": "논쟁형 첫 문장 훅",
      "whyItWorks": "논쟁형 훅이 피드를 멈추게 하는 이유",
      "content": "논쟁형 훅으로 시작하는 4~6줄 친근한 반말 본문 (질문 포함)"
    },
    {
      "type": "반전형",
      "hook": "반전형 첫 문장 훅",
      "whyItWorks": "반전형 훅이 피드를 멈추게 하는 이유",
      "content": "반전형 훅으로 시작하는 4~6줄 친근한 반말 본문 (질문 포함)"
    }
  ]
}`;

  const userPrompt = `주제: ${topic}${additionalNote ? `\n추가 전달사항: ${additionalNote}` : ""}\n스레드 글 1세트와 5대 훅 유형별 글을 생성해줘.`;

  const rawJson = await callLLM(aiConfig, systemPrompt, userPrompt);
  const parsed = parseJsonSafe<any>(rawJson, null);

  const root = parsed?.plan || parsed?.result || parsed?.data || parsed || {};

  const hookVariants: HookVariant[] = Array.isArray(root.hookVariants)
    ? root.hookVariants.map((v: any) => ({
        type: String(v.type || "리얼 썰형"),
        hook: String(v.hook || ""),
        whyItWorks: String(v.whyItWorks || "호기심과 공감을 자극해 스크롤을 멈춤"),
        content: String(v.content || ""),
      }))
    : [];

  return {
    topic: String(root.topic || topic).trim(),
    hook: String(root.hook || "솔직히 나만 이런 줄 알았는데 아니더라.").trim(),
    hookType: String(root.hookType || "리얼 썰형").trim(),
    whyHookWorks: String(root.whyHookWorks || "일상 속 공감과 호기심을 자극해 1초 만에 스크롤을 멈추게 함").trim(),
    content: String(root.content || "스레드 본문이 생성되었습니다.").trim(),
    cta: String(root.cta || "여러분은 어떠신가요? 댓글로 알려줘요!").trim(),
    followUpIdeas: Array.isArray(root.followUpIdeas)
      ? root.followUpIdeas.map(String)
      : [
          "같은 주제의 2탄 심화 이야기",
          "초보자가 흔히 저지르는 실수 3가지",
          "실제 적용 후 달라진 변화 후기",
          "댓글 반응 모아보는 Q&A 썰",
          "놓치면 아쉬운 핵심 3줄 요약",
        ],
    hookVariants: hookVariants.length > 0 ? hookVariants : undefined,
  };
}

/**
 * 3. 7종 "다시 써줘" 원클릭 리라이팅
 * 4~6줄 친근한 반말, 제품명 배제, 마지막 열린 질문 원칙 유지
 */
export async function rewriteThreadPlanAI(params: {
  currentPlan: ThreadPlanResult;
  mode: RewriteMode;
  aiConfig: { provider: AIProvider; apiKey: string; model?: string };
}): Promise<ThreadPlanResult> {
  const { currentPlan, mode, aiConfig } = params;

  const modeInstructions: Record<RewriteMode, string> = {
    provocative: "더 자극적으로: 손해 회피와 부정 명령을 극대화하고, 궁금해서 안 읽고는 못 배기게 도발적인 1인칭 톤으로 고쳐줘.",
    natural: "더 자연스럽게: AI 냄새를 100% 제거하고, 친한 친구나 동네 언니에게 카톡으로 털어놓듯 가장 편안하고 리얼한 구어체 반말로 고쳐줘.",
    shorter: "더 짧게: 사족을 전부 쳐내고 핵심만 3~4줄로 군더더기 없이 임팩트 있게 압축해줘.",
    expert: "더 전문적으로: 신뢰도 높은 인사이트와 설득력 있는 시각을 친근한 구어체 안에 담아 논리 정연하게 재구성해줘.",
    funny: "더 웃기게: 피식 웃음이 나오는 위트, 짤방 감성의 유머, 찰진 자조적 드립을 녹여내줘.",
    no_ad: "광고 느낌 빼기: 제품명이나 홍보성 단어를 완전히 지우고, 내돈내산 100% 솔직한 찐경험담 느낌으로 바꿔줘.",
    hooks_only: "후킹 집중 개선: 본문 내용은 유지하되, 첫 문장 후킹(hook)을 1초 만에 뇌리에 꽂히는 5가지 대안 중 가장 파괴력 있는 문장으로 업그레이드해줘.",
  };

  const systemPrompt = `너는 스레드 글을 원하는 맛과 톤으로 완벽하게 변신시키는 리라이팅 전문가야.
기존 스레드 글을 사용자가 선택한 요청에 맞춰 다시 써줘.

[스레드 불변 규칙]
1. 4~6줄 내외 분량, 모바일 가독성을 위해 1~2문장마다 빈 줄(\\n\\n) 필수
2. 친근한 반말 어조 (교과서식 설명문, 존댓말 금지)
3. 특정 상업적 제품명이나 브랜드명 노출 절대 금지
4. 마지막 줄은 무조건 독자의 댓글을 부르는 열린 질문으로 끝낼 것

[리라이팅 요청 사항]
${modeInstructions[mode]}

반드시 아래 JSON 규격으로만 응답해:
{
  "topic": "${currentPlan.topic}",
  "hook": "수정된 첫 문장 후킹",
  "hookType": "${currentPlan.hookType || "리얼 썰형"}",
  "whyHookWorks": "수정된 첫 줄이 피드를 멈추게 하는 이유 1줄",
  "content": "수정된 전체 본문 (4~6줄 가독성 줄바꿈 포함)",
  "cta": "수정된 댓글 유도 열린 질문",
  "followUpIdeas": ${JSON.stringify(currentPlan.followUpIdeas)}
}`;

  const userPrompt = `[기존 글]
첫 문장: ${currentPlan.hook}
본문:
${currentPlan.content}

댓글/질문: ${currentPlan.cta}

위 글을 "${modeInstructions[mode]}" 방향으로 다시 작성해줘.`;

  const rawJson = await callLLM(aiConfig, systemPrompt, userPrompt);
  const parsed = parseJsonSafe<any>(rawJson, null);
  const root = parsed?.plan || parsed?.result || parsed?.data || parsed || {};

  return {
    topic: currentPlan.topic,
    hook: String(root.hook || currentPlan.hook).trim(),
    hookType: String(root.hookType || currentPlan.hookType || "리얼 썰형").trim(),
    whyHookWorks: String(root.whyHookWorks || currentPlan.whyHookWorks || "호기심과 공감을 자극해 스크롤을 멈춤").trim(),
    content: String(root.content || currentPlan.content).trim(),
    cta: String(root.cta || currentPlan.cta).trim(),
    followUpIdeas: Array.isArray(root.followUpIdeas) ? root.followUpIdeas.map(String) : currentPlan.followUpIdeas,
    hookVariants: currentPlan.hookVariants,
  };
}

// ======================== LLM Call Core ========================

async function callLLM(
  config: { provider: AIProvider; apiKey: string; model?: string },
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const { provider, apiKey, model } = config;

  if (provider === "gemini") {
    const genAI = new GoogleGenerativeAI(apiKey);
    const selectedModel = model || "gemini-3.7-flash";
    const geminiModel = genAI.getGenerativeModel({
      model: selectedModel,
      systemInstruction: systemPrompt,
    });
    const result = await geminiModel.generateContent({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    });
    return result.response.text();
  }

  if (provider === "anthropic") {
    const anthropic = new Anthropic({ apiKey });
    const selectedModel = model || "claude-sonnet-5";
    const res = await anthropic.messages.create({
      model: selectedModel,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
    const firstBlock = res.content[0];
    return firstBlock && "text" in firstBlock ? firstBlock.text : "";
  }

  // 기본: OpenAI
  const openai = new OpenAI({ apiKey });
  const selectedModel = model || "gpt-4.1";
  const completion = await openai.chat.completions.create({
    model: selectedModel,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  });
  return completion.choices[0]?.message?.content ?? "";
}

function parseJsonSafe<T>(raw: string, fallback: T): T {
  if (!raw || !raw.trim()) return fallback;
  try {
    const cleaned = raw.replace(/^```json/m, "").replace(/^```/m, "").replace(/```$/m, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    try {
      const match = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (match) {
        return JSON.parse(match[0]) as T;
      }
    } catch {
      // ignore
    }
    return fallback;
  }
}
