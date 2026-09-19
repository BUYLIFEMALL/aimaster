import { NextRequest, NextResponse } from "next/server";
import { getCard } from "@/lib/cards";
import { SPREAD_CONFIGS, type SpreadType, type SpreadPosition } from "@/lib/deck";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * 뽑힌 타로 카드들 + 사용자가 입력한 질문을 바탕으로 OpenAI가 하나로 엮인
 * 한국어 타로 해석을 써준다. checkProgramAccessApi() + resolveApiKey("openai")로 로그인한
 * 회원 본인의 API 키만 쓰는 표준 패턴을 따른다.
 */
const MODEL_ID = "gpt-4o-mini";


function getSystemPrompt(spreadType: SpreadType): string {
  if (spreadType === "one_card") {
    return `당신은 따뜻하고 통찰력 있는 한국어 전문 타로 리더입니다. 오늘의 원카드(One Card) 타로를 해석합니다.

스프레드 규칙:
- 단 한 장의 카드로 오늘 하루 직면할 핵심 에너지와 귀중한 조언을 도출합니다.
- 정방향 카드는 그 에너지가 순조롭게 발현됨을, 역방향 카드는 내면화되거나 주의가 필요한 영역임을 의미합니다.

작성 규칙:
- 반드시 한국어로, 정중하고 따뜻한 존댓말로 작성하세요.
- 질문이 있다면 질문에 명확히 대답하고, 없면 오늘 하루 전체의 가이드로 풀어주세요.
- 2~3개 문단으로 작성하되, 마크다운 서식 없이 자연스러운 줄글 문단으로만 작성하세요.`;
  }

  if (spreadType === "love_three_cards") {
    return `당신은 관계와 공감 능력이 뛰어난 타로 리더입니다. 연인/친구 간의 궁합 3카드 스프레드를 해석합니다.

스프레드 규칙:
- "나의 마음": 내가 이 관계에서 느끼는 속마음과 태도
- "상대방의 마음": 나를 바라보는 상대방의 속마음과 상태
- "우리의 미래": 두 사람이 함께 만들어갈 진전과 관계의 흐름
- 정방향/역방향의 기운 차이를 관계의 역학 구도에 섬세하게 반영하세요.

작성 규칙:
- 따뜻하고 깊은 공감의 언어로 존댓말 작성을 유지하세요.
- 3~4개 문단으로 구성하되 서식 없이 자연스러운 줄글 문단으로 작성하세요.`;
  }

  if (spreadType === "relationship") {
    return `당신은 관계 심리에 깊은 통찰을 가진 타로 리더입니다. 6카드 관계 심층 분석
스프레드를 해석합니다.

스프레드 규칙(카드 6장, 각 자리의 의미):
- "나의 마음과 역할": 이 관계 안에서 내가 느끼는 감정과 내가 맡고 있는 역할
- "상대방의 마음과 역할": 상대방이 이 관계에서 느끼는 감정과 맡고 있는 역할
- "두 사람의 연결고리": 두 사람을 이어주는 근본적인 연결고리와 관계의 바탕
- "관계의 강점": 이 관계가 가진 강점, 잘 맞는 부분
- "관계의 과제": 함께 풀어야 할 과제나 장애물
- "관계가 나아갈 방향": 지금 흐름대로라면 이 관계가 나아갈 방향

작성 규칙:
- 나와 상대방 각각의 마음을 먼저 살핀 뒤, 두 사람 사이의 연결고리·강점·과제를 엮고
  마지막에 방향성으로 마무리하는 자연스러운 흐름으로 작성하세요.
- 특정 성별이나 관계 유형(연인/친구/가족 등)을 단정하지 말고 중립적으로 서술하세요.
- 따뜻하고 깊은 공감의 언어로 존댓말을 유지하고, 5~6개 문단 줄글 서식으로 작성하세요
  (서식 기호 없이).`;
  }

  if (spreadType === "celtic_cross") {
    return `당신은 수십 년의 경력을 가진 마스터 타로 리더입니다. 가장 정통적인 켈틱 크로스
10카드 스프레드를 해석합니다.

스프레드 규칙(카드 10장, 각 자리의 의미):
- "현재 상황": 지금 당신이 처해 있는 핵심 상황과 에너지
- "도전·장애물": 지금 직접 마주해야 할 도전 과제나 십자로 교차하는 힘
- "먼 과거·근본 원인": 이 상황의 뿌리가 된 먼 과거의 사건
- "최근 과거": 최근에 지나온, 지금 상황에 영향을 준 흐름
- "가능한 미래": 지금 흐름대로라면 도달할 수 있는 가능성
- "가까운 미래": 가까운 시일 안에 다가올 사건이나 변화
- "나 자신의 태도": 이 상황을 대하는 당신의 마음가짐
- "주변 환경·외부 영향": 주변 사람이나 환경이 미치는 영향
- "희망과 두려움": 마음 깊이 품고 있는 희망과 두려움
- "최종 결과": 모든 요소가 종합됐을 때 다다르는 최종 결과

작성 규칙:
- 10장의 카드를 개별로 나열하지 말고, 흐름(과거→현재→미래, 내면→외부, 희망/두려움→결과)
  으로 자연스럽게 엮어서 하나의 통합된 이야기로 풀어주세요.
- 반드시 한국어 존댓말로 따뜻하되 깊이 있게 작성하고, 6~8개 문단 줄글 서식으로
  작성하세요(서식 기호 없이).`;
  }

  if (spreadType === "horseshoe") {
    return `당신은 균형 잡힌 시각을 가진 노련한 타로 리더입니다. 말굽(Horseshoe) 7카드
스프레드를 해석합니다.

스프레드 규칙(카드 7장, 각 자리의 의미):
- "과거의 영향": 지금 상황에 영향을 준 과거의 흐름과 경험
- "현재 상황": 지금 당신이 놓여 있는 현재 상황
- "숨겨진 영향": 겉으로 드러나지 않았지만 실제로 작용하고 있는 숨은 요인
- "장애물·극복할 점": 앞으로 나아가기 위해 넘어서야 할 장애물이나 주의할 점
- "주변 환경·외부 영향": 주변 사람이나 환경이 이 상황에 미치는 영향
- "조언·취해야 할 행동": 지금 취하면 좋을 현실적인 조언과 행동 방향
- "예상되는 결과": 이 흐름대로라면 다다르게 될 예상 결과

작성 규칙:
- 7장의 카드를 하나씩 나열하지 말고, "과거→현재→숨은 요인" 다음 "장애물↔외부환경"을
  함께 짚고 "조언→예상 결과"로 마무리하는 자연스러운 흐름으로 엮어주세요.
- 반드시 한국어 존댓말로 따뜻하고 균형 있게 작성하고, 5~6개 문단 줄글 서식으로
  작성하세요(서식 기호 없이).`;
  }

  if (spreadType === "five_cards") {
    return `당신은 심층적인 문제 해결 능력을 갖춘 마스터 타로 리더입니다. 5카드 심층 스프레드를 해석합니다.

스프레드 규칙:
- "현재 상황": 현재 고민의 전체적인 상태
- "원인·배경": 이 문제가 생겨난 근본적인 원인
- "해법·조언": 현실적으로 취해야 할 지혜로운 행동
- "장애물·주의": 주의해야 할 경계나 방해 요소
- "최종 결과": 조언을 따랐을 때 도달할 흐름과 결과

작성 규칙:
- 5개 지점을 논리적이면서도 가슴 따뜻하게 엮어주세요.
- 4~5개 문단으로 구성하고 서식 없이 줄글 문단으로 작성하세요.`;
  }

  // 기본 three_cards
  return `당신은 따뜻하고 통찰력 있는 한국어 타로 리더입니다. 과거-현재-미래 3카드 스프레드를 해석합니다.

스프레드 규칙:
- "과거" 자리 카드는 지나온 흐름과 원인, "현재"는 지금 이 순간의 심리 상태와 과제, "미래"는 다가올 방향과 가능성을 보여줍니다.
- 정방향/역방향 차이를 반드시 반영하고, 3장의 흐름을 하나의 이야기로 자연스럽게 엮어주세요.

작성 규칙:
- 반드시 한국어 존댓말로 따뜻하게 작성하고 3~4개 문단 줄글 서식으로 작성하세요.`;
}

interface CardInput {
  cardId: string;
  position: SpreadPosition;
  orientation: "upright" | "reversed";
}

function buildUserPrompt(cards: CardInput[], question: string | undefined, spreadType: SpreadType): string {
  const config = SPREAD_CONFIGS[spreadType] ?? SPREAD_CONFIGS.three_cards;

  const cardLines = cards
    .map((c) => {
      const card = getCard(c.cardId)!;
      const meaning = c.orientation === "upright" ? card.upright : card.reversed;
      const posLabel = config.positionLabels[c.position] || c.position;
      return `- [${posLabel}] ${card.nameKo}(${card.nameEn}) · ${
        c.orientation === "upright" ? "정방향" : "역방향"
      }\n  카드 의미 참고: ${meaning}`;
    })
    .join("\n");

  const questionLine = question?.trim()
    ? `사용자가 남긴 질문/고민: "${question.trim()}"`
    : "사용자가 특별한 질문을 남기지 않았습니다. 전반적인 흐름과 조언으로 해석해주세요.";

  return `${questionLine}\n\n[스프레드: ${config.title}]\n뽑힌 카드 ${cards.length}장:\n${cardLines}\n\n위 내용을 바탕으로 종합 타로 해석을 작성해주세요.`;
}

export async function POST(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const apiKey = await resolveApiKey(access.user.id, "openai");
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI API 키가 등록되지 않았습니다. /settings에서 먼저 등록해주세요.", code: "NO_API_KEY" },
      { status: 400 },
    );
  }

  let body: { cards?: CardInput[]; question?: string; spreadType?: SpreadType; model?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { cards, question, spreadType = "three_cards", model } = body;
  const targetModel = model && model.trim() ? model.trim() : MODEL_ID;
  const config = SPREAD_CONFIGS[spreadType] ?? SPREAD_CONFIGS.three_cards;

  if (!Array.isArray(cards) || cards.length !== config.cardCount) {
    return NextResponse.json(
      { error: `스프레드에 맞는 카드 ${config.cardCount}장 정보가 필요합니다.` },
      { status: 400 },
    );
  }

  for (const c of cards) {
    if (!c || !getCard(c.cardId)) {
      return NextResponse.json({ error: "알 수 없는 카드가 포함되어 있습니다." }, { status: 400 });
    }
    if (c.orientation !== "upright" && c.orientation !== "reversed") {
      return NextResponse.json({ error: "알 수 없는 카드 방향입니다." }, { status: 400 });
    }
  }

  if (question && question.length > 300) {
    return NextResponse.json({ error: "질문은 300자 이내로 입력해주세요." }, { status: 400 });
  }

  const isReasoningModel = targetModel.startsWith("o1") || targetModel.startsWith("o3");
  // 카드 수가 많은 스프레드는 흐름을 엮어 쓸 문단이 많아져 더 넉넉한 토큰 한도가 필요하다.
  const maxTokens = config.cardCount >= 10 ? 3500 : config.cardCount >= 6 ? 3000 : 2000;
  const requestBody: Record<string, unknown> = {
    model: targetModel,
    messages: [
      { role: isReasoningModel ? "user" : "system", content: getSystemPrompt(spreadType) },
      { role: "user", content: buildUserPrompt(cards, question, spreadType) },
    ],
    max_completion_tokens: maxTokens,
  };


  let openaiRes: Response;
  try {
    openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(45000),
    });
  } catch {
    return NextResponse.json(
      { error: "해석 생성 서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요." },
      { status: 502 },
    );
  }

  if (!openaiRes.ok) {
    let message = "해석 생성에 실패했습니다. /settings에서 등록한 API 키가 유효한지 확인해주세요.";
    try {
      const parsed = await openaiRes.json();
      if (parsed?.error?.message) message = parsed.error.message;
    } catch {}
    return NextResponse.json({ error: message }, { status: openaiRes.status });
  }

  const data = await openaiRes.json();
  const reading = data?.choices?.[0]?.message?.content?.trim();

  if (!reading) {
    return NextResponse.json(
      { error: "해석이 생성되지 않았습니다. 잠시 후 다시 시도해주세요." },
      { status: 502 },
    );
  }

  return NextResponse.json({ reading });
}
