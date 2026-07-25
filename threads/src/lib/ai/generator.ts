import "server-only";

export interface GeneratePostInput {
  topic: string;
  tone?: "casual" | "professional" | "friendly";
}

export interface GeneratePostResult {
  content: string;
}

const TONE_INSTRUCTIONS: Record<NonNullable<GeneratePostInput["tone"]>, string> = {
  casual: "친근하고 캐주얼한 말투로 작성해줘.",
  professional: "전문적이고 신뢰감 있는 말투로 작성해줘.",
  friendly: "다정하고 편안한 말투로 작성해줘.",
};

export async function generatePostContent(input: GeneratePostInput): Promise<GeneratePostResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY가 설정되어 있지 않습니다. .env.local을 확인해주세요.");
  }

  const toneInstruction = TONE_INSTRUCTIONS[input.tone ?? "casual"];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "너는 Threads(스레드) 마케팅 게시글을 작성하는 카피라이터야. 500자 이내, 해시태그 없이 자연스러운 한국어 게시글 본문만 출력해. 따옴표나 설명 없이 게시글 본문만 출력해.",
        },
        {
          role: "user",
          content: `주제: ${input.topic}\n${toneInstruction}`,
        },
      ],
      max_tokens: 400,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`AI 생성 요청이 실패했습니다. (${response.status}) ${errorBody}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("AI가 빈 응답을 반환했습니다.");
  }

  return { content };
}
