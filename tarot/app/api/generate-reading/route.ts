import { NextRequest, NextResponse } from "next/server";
import { getCard } from "@/lib/cards";
import { SPREAD_POSITIONS, SPREAD_POSITION_LABELS, type SpreadPosition } from "@/lib/deck";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * 뽑힌 카드 3장(과거-현재-미래) + 사용자가 입력한 질문을 바탕으로 OpenAI가 하나로 엮인
 * 한국어 타로 해석을 써준다. checkProgramAccessApi() + resolveApiKey("openai")로 로그인한
 * 회원 본인의 API 키만 쓰는 표준 패턴을 따른다(앱 공용 키 폴백 없음).
 *
 * 클라이언트가 자유 텍스트로 "이렇게 해석해줘"를 보낼 수 없게, cardId/position/orientation
 * 조합만 받고 실제 카드 의미(정/역방향 문구)는 이 서버가 lib/cards.ts에서 직접 가져와
 * 시스템 프롬프트에 근거로 넣는다 — 모델이 카드 상징을 지어내지 않고 우리 데이터에 기반해
 * 해석하도록 그라운딩하기 위함이다. 질문 텍스트만 사용자가 직접 입력한 자유 텍스트이며,
 * 300자로 제한해 과도한 프롬프트 인젝션/남용 여지를 줄인다.
 */
const MODEL_ID = "gpt-4o-mini";

const SYSTEM_PROMPT = `당신은 따뜻하고 통찰력 있는 한국어 타로 리더입니다. 과거-현재-미래 3카드 스프레드를 해석합니다.

스프레드 규칙:
- "과거" 자리 카드는 지금 상황의 배경이나 원인, 이미 지나온 흐름을 보여줍니다.
- "현재" 자리 카드는 지금 이 순간의 심리 상태, 처한 상황, 마주한 핵심 과제를 보여줍니다.
- "미래" 자리 카드는 지금의 흐름이 이어질 경우 다가올 방향이나 결과의 가능성을 보여줍니다. 정해진 운명이 아니라 "지금처럼 가면 이런 흐름"이라는 참고로 다뤄주세요.
- 정방향 카드는 그 카드의 에너지가 비교적 건강하고 순조롭게 발현되고 있다는 뜻이고, 역방향 카드는 그 에너지가 막혀있거나, 내면화되어 있거나, 과하게 또는 왜곡되게 나타나고 있다는 뜻입니다. 정방향/역방향의 차이를 반드시 해석에 반영하세요.
- 세 장을 각각 따로 설명하고 끝내지 말고, 과거→현재→미래로 이어지는 하나의 이야기로 자연스럽게 엮어주세요.

작성 규칙:
- 반드시 한국어로, 존댓말로 따뜻하게 작성하세요.
- 사용자가 질문을 남겼다면 그 질문과 직접 연결해서 해석하세요. 질문이 없다면 전반적인 삶의 흐름으로 해석하세요.
- 확정적인 예언("반드시 ~된다")이나 의학적·법률적·재정적 조언은 피하고, 통찰과 조언 중심으로 풀어주세요.
- 3~5개 문단으로 구성하세요: (1) 과거 카드 해석, (2) 현재 카드 해석, (3) 미래 카드 해석, (4) 세 카드를 관통하는 조언으로 마무리. 각 문단은 2~4문장 정도로 간결하게 쓰세요.
- 마크다운 제목이나 별표 같은 서식 없이, 자연스러운 줄글 문단으로만 작성하세요.`;

interface CardInput {
  cardId: string;
  position: SpreadPosition;
  orientation: "upright" | "reversed";
}

function buildUserPrompt(cards: CardInput[], question: string | undefined): string {
  const cardLines = cards
    .map((c) => {
      const card = getCard(c.cardId)!;
      const meaning = c.orientation === "upright" ? card.upright : card.reversed;
      return `- [${SPREAD_POSITION_LABELS[c.position]}] ${card.nameKo}(${card.nameEn}) · ${
        c.orientation === "upright" ? "정방향" : "역방향"
      }\n  카드 의미 참고: ${meaning}`;
    })
    .join("\n");

  const questionLine = question?.trim()
    ? `사용자가 남긴 질문/고민: "${question.trim()}"`
    : "사용자가 특별한 질문을 남기지 않았습니다. 전반적인 삶의 흐름으로 해석해주세요.";

  return `${questionLine}\n\n뽑힌 카드 3장:\n${cardLines}\n\n위 내용을 바탕으로 하나로 이어지는 타로 해석을 작성해주세요.`;
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

  let body: { cards?: CardInput[]; question?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { cards, question } = body;

  if (!Array.isArray(cards) || cards.length !== 3) {
    return NextResponse.json({ error: "카드 3장 정보가 필요합니다." }, { status: 400 });
  }
  const usedPositions = new Set<string>();
  for (const c of cards) {
    if (!c || !getCard(c.cardId)) {
      return NextResponse.json({ error: "알 수 없는 카드가 포함되어 있습니다." }, { status: 400 });
    }
    if (!SPREAD_POSITIONS.includes(c.position)) {
      return NextResponse.json({ error: "알 수 없는 카드 위치입니다." }, { status: 400 });
    }
    if (c.orientation !== "upright" && c.orientation !== "reversed") {
      return NextResponse.json({ error: "알 수 없는 카드 방향입니다." }, { status: 400 });
    }
    usedPositions.add(c.position);
  }
  if (usedPositions.size !== 3) {
    return NextResponse.json({ error: "과거·현재·미래 카드가 각각 하나씩 필요합니다." }, { status: 400 });
  }
  if (question && question.length > 300) {
    return NextResponse.json({ error: "질문은 300자 이내로 입력해주세요." }, { status: 400 });
  }

  let openaiRes: Response;
  try {
    openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL_ID,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(cards, question) },
        ],
        max_tokens: 1200,
        temperature: 0.85,
      }),
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
