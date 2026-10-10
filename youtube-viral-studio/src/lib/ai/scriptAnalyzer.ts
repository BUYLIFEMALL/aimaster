import "server-only";

export interface ScriptAnalysisResult {
  videoId: string;
  videoTitle: string;
  hasOriginalScript: boolean;
  hookScore: number; // 0 ~ 100
  hookTitle: string;
  hookDetails: string;
  retentionScore: number; // 0 ~ 100
  retentionTitle: string;
  retentionDetails: string;
  ctaScore: number; // 0 ~ 100
  ctaTitle: string;
  ctaDetails: string;
  viralSecret: string[];
  copycatTemplate: {
    hookPrompt: string;
    bodyStructure: string;
    ctaEnding: string;
    exampleDraft: string;
  };
  providerUsed: string;
}

const SYSTEM_PROMPT = `당신은 대한민국 최고의 유튜브 쇼츠 바이럴 디렉터이자 알고리즘 분석가입니다.
현재 연도는 ${new Date().getFullYear()}년입니다. 과거 연도(2023, 2024년 등)를 기준으로 답변하지 마십시오.

주어진 쇼츠 영상의 대본(또는 메타데이터)을 분석하여, 시청자의 뇌리에 꽂히는 3단 구조(첫 3초 훅킹, 시청 유지력, 행동유도 CTA)를 날카롭게 해체하고, 크리에이터가 즉시 자신의 영상에 응용할 수 있는 카피캣 템플릿을 JSON 형태로 반환하십시오.

반드시 아래 JSON 형식으로만 응답해야 합니다(마크다운 코드블록 포함 가능):
{
  "hookScore": 95,
  "hookTitle": "도입부 훅킹 핵심 요약",
  "hookDetails": "첫 3초에서 시청자를 멈추게 한 첫 문장과 심리적 트리거 상세 분석",
  "retentionScore": 90,
  "retentionTitle": "시청 지속력 유지 기법",
  "retentionDetails": "지루함을 없앤 빠른 템포와 정보 격차(Information Gap) 빌드업 분석",
  "ctaScore": 88,
  "ctaTitle": "결말 및 반응 유도 장치",
  "ctaDetails": "댓글 논쟁 또는 좋아요/공유를 유발한 엔딩 기법 분석",
  "viralSecret": [
    "알고리즘을 뚫어낸 핵심 요인 1",
    "알고리즘을 뚫어낸 핵심 요인 2",
    "알고리즘을 뚫어낸 핵심 요인 3"
  ],
  "copycatTemplate": {
    "hookPrompt": "[첫 3초 대사 템플릿: 빈칸 채우기 형식]",
    "bodyStructure": "[본문 전개 3단계 구조]",
    "ctaEnding": "[마지막 3초 행동유도 대사 템플릿]",
    "exampleDraft": "[이 구조를 그대로 흉내내어 작성한 50초 쇼츠 완성 예시 대본]"
  }
}`;

/**
 * Gemini API로 대본 분석
 */
async function analyzeWithGemini(
  content: string,
  apiKey: string
): Promise<any> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: `${SYSTEM_PROMPT}\n\n[분석할 쇼츠 데이터]:\n${content}` }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Gemini API 호출에 실패했습니다.");
  }

  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return JSON.parse(rawText);
}

/**
 * OpenAI API로 대본 분석
 */
async function analyzeWithOpenAI(
  content: string,
  apiKey: string
): Promise<any> {
  const url = "https://api.openai.com/v1/chat/completions";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `[분석할 쇼츠 데이터]:\n${content}` },
      ],
      temperature: 0.7,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "OpenAI API 호출에 실패했습니다.");
  }

  const rawText = data.choices?.[0]?.message?.content;
  return JSON.parse(rawText);
}

export async function analyzeShortsScript(params: {
  videoId: string;
  title: string;
  description?: string;
  transcript?: string;
  geminiKey?: string | null;
  openaiKey?: string | null;
}): Promise<ScriptAnalysisResult> {
  const { videoId, title, description, transcript, geminiKey, openaiKey } = params;

  if (!geminiKey && !openaiKey) {
    throw new Error(
      "등록된 AI API 키가 없습니다. [설정 > YouTube API 키] 메뉴에서 본인의 Google Gemini 또는 OpenAI API 키를 등록해주세요."
    );
  }

  const inputContent = `
[영상 ID]: ${videoId}
[영상 제목]: ${title}
[영상 설명]: ${description || "없음"}
[영상 대본/자막 전문]:
${transcript || "자막 없음 (제목 및 설명 기반 분석 모드)"}
`.trim();

  let parsed: any;
  let providerUsed = "";

  if (geminiKey) {
    parsed = await analyzeWithGemini(inputContent, geminiKey);
    providerUsed = "Google Gemini 2.0 Flash";
  } else if (openaiKey) {
    parsed = await analyzeWithOpenAI(inputContent, openaiKey);
    providerUsed = "OpenAI GPT-4o-mini";
  }

  return {
    videoId,
    videoTitle: title,
    hasOriginalScript: Boolean(transcript && transcript.length > 20),
    hookScore: parsed.hookScore ?? 90,
    hookTitle: parsed.hookTitle ?? "도입부 훅킹",
    hookDetails: parsed.hookDetails ?? "",
    retentionScore: parsed.retentionScore ?? 88,
    retentionTitle: parsed.retentionTitle ?? "시청 유지력",
    retentionDetails: parsed.retentionDetails ?? "",
    ctaScore: parsed.ctaScore ?? 85,
    ctaTitle: parsed.ctaTitle ?? "행동유도(CTA)",
    ctaDetails: parsed.ctaDetails ?? "",
    viralSecret: parsed.viralSecret || [],
    copycatTemplate: parsed.copycatTemplate || {
      hookPrompt: "",
      bodyStructure: "",
      ctaEnding: "",
      exampleDraft: "",
    },
    providerUsed,
  };
}
