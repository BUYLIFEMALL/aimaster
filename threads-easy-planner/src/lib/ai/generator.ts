import "server-only";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider } from "@/lib/apiKeys";
import type { TopicSuggestion, ThreadPlanResult, RewriteMode } from "@/types/planner";
export type { TopicSuggestion, ThreadPlanResult, RewriteMode };


/**
 * 1. "오늘 뭐 쓰지?" 주제 10개 추천
 */
export async function suggestTopicsAI(params: {
  categoryName?: string;
  customKeyword?: string;
  aiConfig: { provider: AIProvider; apiKey: string; model?: string };
}): Promise<TopicSuggestion[]> {
  const { categoryName, customKeyword, aiConfig } = params;

  const targetDescription = customKeyword
    ? `사용자가 지정한 키워드/분야: "${customKeyword}"`
    : `선택된 카테고리: "${categoryName || "일상 / 꿀팁"}"`;

  const systemPrompt = `너는 현재 대한민국 Threads(스레드)에서 가장 반응이 폭발적인 글을 쏟아내는 바이럴 콘텐츠 디렉터야.
초보자도 바로 쓸 수 있도록, 지금 스레드 알고리즘이 밀어주는 매력적인 스레드 주제 10개를 추천해줘.

[스레드 흥행 공식]
1. 추상적인 정보 나열 금지: "20대 재테크 팁" (X) -> "통장에 100만원도 없던 내가 6개월 만에 1000만원 모은 강제 저축법" (O)
2. 호기심 & 공감 & 손실 회피: "모르면 손해 보는", "솔직히 인정해야 하는", "나만 몰랐던"
3. 스레드 특유의 썰(스토리) & 1인칭 솔직한 어조가 들어간 주제.

반드시 아래 JSON 포맷으로만 응답해. 백틱(\`\`\`json)이나 다른 설명 없이 순수 JSON 배열만 출력해:
[
  {
    "id": 1,
    "topic": "스레드 주제 제목",
    "hookPreview": "첫 문장으로 쓰기 좋은 1초 후킹 예시",
    "whyItWorks": "이 주제가 왜 반응이 좋을지 1줄 이유"
  }
]`;

  const userPrompt = `분야: ${targetDescription}\n이 타깃의 독자들이 스크롤을 멈추고 댓글을 달 수밖에 없는 스레드 주제 10개를 뽑아줘.`;

  const rawJson = await callLLM(aiConfig, systemPrompt, userPrompt);
  return parseJsonSafe<TopicSuggestion[]>(rawJson, []);
}

/**
 * 2. 선택한 주제로 5단 구성 스레드 글 생성
 */
export async function generateThreadPlanAI(params: {
  topic: string;
  additionalNote?: string;
  aiConfig: { provider: AIProvider; apiKey: string; model?: string };
}): Promise<ThreadPlanResult> {
  const { topic, additionalNote, aiConfig } = params;

  const systemPrompt = `너는 Threads(스레드) 플랫폼에 완벽히 최적화된 글을 쓰는 탑티어 크리에이터야.
사용자가 고른 주제를 바탕으로 완벽한 스레드 포스팅 1세트를 만들어줘.

[스레드 글 작성 규칙]
1. 첫 문장 후킹 (hook): 피드 스크롤을 1초 만에 멈추게 해야 함. 반전, 강력한 질문, 충격적인 경험담, 공감 유발.
2. 전체 글 (content):
   - 전체 분량: 공백 포함 300자~430자 이내 (스레드에서 가장 가독성 높은 황금 분량)
   - 줄바꿈: 1~2문장마다 반드시 빈 줄(\\n\\n)을 넣어 모바일 화면에서 숨통이 트이게 작성.
   - 문체: 반말 또는 친근한 해요체 (지루한 설명문 절대 금지, 내가 직접 겪거나 깨달은 톤).
   - 이모지는 문맥에 맞게 2~4개만 절제하여 사용.
3. 마지막 댓글/CTA (cta):
   - 스레드 알고리즘의 핵심은 '댓글'임. 독자가 댓글을 안 달고는 못 배기게 만드는 열린 질문 또는 투표 유도 질문.
   - 예: "여러분은 A vs B 중 어떤 쪽이신가요? 댓글로 알려줘요!" 또는 "나중에 보려면 저장해두고 써먹으세요."
4. 후속 콘텐츠 아이디어 5개 (followUpIdeas):
   - 이 글이 반응이 좋았을 때 다음 날이나 시리즈로 이어서 올릴 수 있는 구체적인 후속 아이디어 5개.

반드시 아래 JSON 규격으로만 응답해:
{
  "topic": "정제된 스레드 주제명",
  "hook": "스크롤을 멈추는 첫 문장 후킹",
  "content": "가독성 좋은 줄바꿈이 포함된 전체 본문 (hook 포함)",
  "cta": "댓글을 유도하는 마지막 1줄 또는 첫 댓글 멘트",
  "followUpIdeas": [
    "후속 아이디어 1",
    "후속 아이디어 2",
    "후속 아이디어 3",
    "후속 아이디어 4",
    "후속 아이디어 5"
  ]
}`;

  const userPrompt = `주제: ${topic}${additionalNote ? `\n추가 전달사항: ${additionalNote}` : ""}\n스레드 글 1세트를 생성해줘.`;

  const rawJson = await callLLM(aiConfig, systemPrompt, userPrompt);
  return parseJsonSafe<ThreadPlanResult>(rawJson, {
    topic,
    hook: "오늘 꼭 공유하고 싶었던 이야기가 있어요.",
    content: "스레드 본문 생성을 다시 시도해주세요.",
    cta: "여러분 생각은 어떠신가요?",
    followUpIdeas: [],
  });
}

/**
 * 3. 7종 "다시 써줘" 원클릭 리라이팅
 */
export async function rewriteThreadPlanAI(params: {
  currentPlan: ThreadPlanResult;
  mode: RewriteMode;
  aiConfig: { provider: AIProvider; apiKey: string; model?: string };
}): Promise<ThreadPlanResult> {
  const { currentPlan, mode, aiConfig } = params;

  const modeInstructions: Record<RewriteMode, string> = {
    provocative: "더 자극적으로: 호기심과 반전을 극대화하고, 조금 더 도발적이거나 궁금해서 미치겠는 어조로 본문과 후킹을 수정해줘.",
    natural: "더 자연스럽게: AI 냄새를 100% 제거하고, 친한 동네 친구나 이웃에게 카톡하듯 아주 편안하고 솔직한 구어체로 고쳐줘.",
    shorter: "더 짧게: 사족을 다 쳐내고 핵심만 3~4줄로 군더더기 없이 임팩트 있게 압축해줘.",
    expert: "더 전문적으로: 신뢰도 높은 데이터나 인사이트를 가진 전문가 시점으로 논리 정연하게 재구성해줘.",
    funny: "더 웃기게: 피식 웃음이 나오는 위트, 짤방 감성의 유머, 찰진 자조적 드립을 녹여내줘.",
    no_ad: "광고 느낌 빼기: 협찬이나 광고 느낌을 완전히 지우고 내돈내산 100% 솔직한 찐경험담 느낌으로 바꿔줘.",
    hooks_only: "후킹 집중 개선: 본문 내용은 훌륭하니 유지하되, 첫 문장 후킹(hook)을 1초 만에 뇌리에 꽂히는 5가지 대안으로 업그레이드하고 가장 좋은 걸 hook에 반영해줘.",
  };

  const systemPrompt = `너는 스레드 글을 원하는 맛과 톤으로 완벽하게 변신시키는 리라이팅 전문가야.
기존 스레드 글을 사용자가 선택한 요청에 맞춰 다시 써줘.

[리라이팅 요청 사항]
${modeInstructions[mode]}

[스레드 원칙 준수]
- 모바일 가독성을 위한 1~2문장 단위 줄바꿈(\\n\\n) 필수
- 400자 내외의 깔끔한 분량 유지
- 알고리즘 댓글 유도 CTA 포함

반드시 아래 JSON 규격으로만 응답해:
{
  "topic": "${currentPlan.topic}",
  "hook": "수정된 첫 문장 후킹",
  "content": "수정된 전체 본문",
  "cta": "수정된 댓글 유도 CTA",
  "followUpIdeas": ${JSON.stringify(currentPlan.followUpIdeas)}
}`;

  const userPrompt = `[기존 글]
첫 문장: ${currentPlan.hook}
본문:
${currentPlan.content}

댓글/CTA: ${currentPlan.cta}

위 글을 "${modeInstructions[mode]}" 방향으로 다시 작성해줘.`;

  const rawJson = await callLLM(aiConfig, systemPrompt, userPrompt);
  return parseJsonSafe<ThreadPlanResult>(rawJson, currentPlan);
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
    const selectedModel = model || "gemini-2.5-flash";
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
    const selectedModel = model || "claude-3-5-sonnet-latest";
    const res = await anthropic.messages.create({
      model: selectedModel,
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
    const firstBlock = res.content[0];
    return firstBlock && "text" in firstBlock ? firstBlock.text : "";
  }

  // 기본: OpenAI
  const openai = new OpenAI({ apiKey });
  const selectedModel = model || "gpt-4o-mini";
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
  try {
    const cleaned = raw.replace(/^```json/m, "").replace(/^```/m, "").replace(/```$/m, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    // 괄호 탐색 방어
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
