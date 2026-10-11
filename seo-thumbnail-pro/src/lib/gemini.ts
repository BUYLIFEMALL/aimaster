import {
  ThumbnailSettings,
  StrategyResponse,
  SeoAnalysisResult,
  GENRE_OPTIONS,
  MOOD_OPTIONS,
} from "@/types/thumbnail";

const CURRENT_YEAR = new Date().getFullYear(); // 2026년 동적 주입

/**
 * Gemini API 연결 테스트
 */
export async function testGeminiConnection(apiKey: string): Promise<boolean> {
  if (!apiKey.trim()) {
    throw new Error("API 키가 입력되지 않았습니다.");
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey.trim()}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: "Hello, reply with OK if connection is working." }] }],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || `API 연결 실패 (상태 코드: ${response.status})`
    );
  }

  return true;
}

/**
 * 1. 대본/아이디어 분석 및 A/B 테스트 3대 전략 생성
 */
export async function generateStrategies(
  apiKey: string,
  script: string
): Promise<StrategyResponse> {
  if (!apiKey.trim()) throw new Error("API 키가 설정되지 않았습니다.");
  if (!script.trim()) throw new Error("대본 또는 기획안 내용을 입력해주세요.");

  const prompt = `
당신은 유튜브 SEO 알고리즘 및 썸네일 클릭률(CTR) 극대화 전문 컨설턴트입니다.
현재 연도는 ${CURRENT_YEAR}년입니다. 과거 연도(2023, 2024년 등)로 후퇴하지 말고 항상 최신 트렌드를 반영하세요.

아래 유튜브 영상 대본/기획안/아이디어를 분석하여, A/B 테스트를 위한 3가지 차별화된 SEO 전략과 1개의 종합 공통 메타데이터를 작성해주세요.

[입력 콘텐츠]
${script}

[3대 전략 가이드라인]
1. 호기심 유발형 (High CTR): 미스터리, 질문, "왜 그랬을까?", 결말에 대한 궁금증 자극
2. 가치/혜택 중심형 (Value): 시청자가 영상을 보고 얻을 수 있는 핵심 정보, 팁, 실질적 이득 강조
3. 스토리/감성 후킹형 (Story/Connection): 서사적 몰입, 공감대 형성, 극적 상황 연출

반드시 아래 JSON 포맷으로만 응답하세요:
{
  "strategies": [
    {
      "strategy": "호기심 유발형",
      "title": "클릭률을 극대화하는 매력적인 유튜브 제목",
      "description": "영상 핵심과 호기심을 유도하는 300자 내외의 SEO 최적화 설명",
      "tags": "#핵심해시태그 #관련태그 #인기키워드 (5-8개)",
      "studioTags": "유튜브 스튜디오 태그란에 입력할 쉼표로 구분된 키워드 (500자 이내)",
      "pinnedComment": "시청자의 댓글 참여를 폭발시키는 유도 질문이나 소통 멘트",
      "visualStrategy": "썸네일에 배치할 시각적 요소, 인물 구도, 텍스트 배치 연출안"
    },
    ... (총 3개)
  ],
  "comprehensive": {
    "description": "3가지 전략을 모두 아우르는 공통의 포괄적인 영상 설명문",
    "tags": "#공통핵심해시태그1 #공통핵심해시태그2 (10-15개)",
    "keywords": "쉼표로 구분된 필수 핵심 키워드 목록",
    "pinnedComment": "최종 썸네일 선택 후 고정 댓글로 활용할 보완 전략"
  }
}
`;

  const models = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-3-flash-preview"];
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.7,
          },
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `모델 ${model} 호출 실패 (${response.status})`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("응답 내용이 비어있습니다.");

      const parsed: StrategyResponse = JSON.parse(text);
      if (!parsed.strategies || !Array.isArray(parsed.strategies)) {
        throw new Error("올바른 전략 데이터 형식이 아닙니다.");
      }
      return parsed;
    } catch (err: any) {
      lastError = err;
      continue;
    }
  }

  throw lastError || new Error("전략 생성에 실패했습니다.");
}

/**
 * 2. 기존 SEO 텍스트 역분석 (직접 SEO 분석으로 채우기)
 */
export async function analyzeSeoData(
  apiKey: string,
  seoText: string
): Promise<SeoAnalysisResult> {
  if (!apiKey.trim()) throw new Error("API 키가 설정되지 않았습니다.");
  if (!seoText.trim()) throw new Error("분석할 유튜브 SEO 텍스트를 입력해주세요.");

  const prompt = `
다음 유튜브 SEO 데이터(제목, 설명, 태그 등)를 분석하여 썸네일 제작에 가장 적합한 상세 설정값들을 추출해주세요.

[SEO 데이터]
${seoText}

[선택지 제약]
- genre는 다음 중 반드시 하나여야 함: [${GENRE_OPTIONS.join(", ")}]
- mood는 다음 중 반드시 하나여야 함: [${MOOD_OPTIONS.join(", ")}]

반드시 아래 JSON 포맷으로만 응답하세요:
{
  "title": "썸네일에 들어갈 짧고 강렬한 문구 (15자 내외)",
  "keywords": "배경 및 시각 소품으로 적합한 3-5개 핵심 키워드",
  "genre": "위 genre 목록 중 가장 적합한 하나",
  "mood": "위 mood 목록 중 가장 적합한 하나",
  "includePerson": true,
  "subjectDescription": "인물이 포함된다면 추천하는 인물의 표정/동작/의상 (예: 크게 놀란 표정의 직장인)"
}
`;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey.trim()}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.5,
      },
    }),
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson?.error?.message || "SEO 역분석에 실패했습니다.");
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("분석 결과가 비어있습니다.");

  return JSON.parse(text);
}

/**
 * 3. 썸네일 생성용 영문 프롬프트 조합 빌더
 */
export function buildThumbnailPrompt(
  settings: ThumbnailSettings,
  feedback?: string
): string {
  let subjectPart = "";
  if (settings.subject.include) {
    const race = settings.subject.race || "Korean";
    const age = settings.subject.age || "20s";
    const gender = settings.subject.gender || "woman";
    const desc = settings.subject.description
      ? `Description: ${settings.subject.description}.`
      : "";
    const refNote = settings.subject.image
      ? "Use the uploaded reference image for the subject's face, appearance, and styling."
      : "";

    subjectPart = `
    Subject: An expressive ${age} ${race} ${gender}.
    ${desc}
    ${refNote}
    The person must have vivid, engaging facial expressions and be the clear visual focal point.
    `;
  }

  const basePrompt = `
Create a professional, high-impact YouTube thumbnail (16:9 aspect ratio, 1080p photorealistic quality).
Video Topic/Headline: "${settings.title || "Trending YouTube Content"}"
Genre: ${settings.genre || "일상/브이로그"}
Visual Mood & Atmosphere: ${settings.mood || "선명한"}
Key Visual Elements & Props: ${settings.keywords || "Dynamic studio lighting, vivid elements"}
${subjectPart}

Visual Directives:
- Ultra-sharp focus, dynamic cinematic lighting, professional editorial photography aesthetic.
- High contrast and vibrant saturation that immediately grabs viewer attention on YouTube feed.
- Composition strictly adheres to the rule of thirds with prominent focal elements.
- Clean and impactful composition without clutter or random artifacts.
- 16:9 wide aspect ratio. Do not render gibberish text or watermarks in the image.
  `.trim();

  if (feedback && feedback.trim()) {
    return `Based on the previous thumbnail iteration, please modify and refine it according to this specific feedback: "${feedback.trim()}". Maintain the core context: ${basePrompt}`;
  }

  return basePrompt;
}

/**
 * 4. Gemini 이미지 모델 호출하여 16:9 고화질 썸네일 생성
 */
export async function generateThumbnailImage(
  apiKey: string,
  settings: ThumbnailSettings,
  feedback?: string,
  previousImageBase64?: string
): Promise<{ image: string; prompt: string }> {
  if (!apiKey.trim()) throw new Error("Gemini API 키를 먼저 등록해주세요.");

  const finalPrompt = buildThumbnailPrompt(settings, feedback);
  const parts: any[] = [{ text: finalPrompt }];

  // 피사체 참조 이미지 주입
  if (settings.subject.include && settings.subject.image) {
    const rawBase64 = settings.subject.image.includes(",")
      ? settings.subject.image.split(",")[1]
      : settings.subject.image;
    parts.push({
      inlineData: {
        data: rawBase64,
        mimeType: "image/png",
      },
    });
  }

  // 이전 생성 이미지 주입 (수정 피드백인 경우)
  if (previousImageBase64) {
    const rawBase64 = previousImageBase64.includes(",")
      ? previousImageBase64.split(",")[1]
      : previousImageBase64;
    parts.push({
      inlineData: {
        data: rawBase64,
        mimeType: "image/png",
      },
    });
  }

  // 나노바나나(Gemini Image) 모델 우선순위
  const imageModels = [
    "gemini-3.1-flash-image-preview",
    "gemini-2.5-flash-image",
    "gemini-3-pro-image-preview",
  ];

  let lastError: Error | null = null;

  for (const model of imageModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseModalities: ["IMAGE"],
            imageConfig: {
              aspectRatio: "16:9",
            },
          },
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const msg = errJson?.error?.message || `모델 ${model} 실패 (${response.status})`;
        if (response.status === 403 || msg.includes("permission") || msg.includes("quota")) {
          throw new Error("API 키 권한 오류: 유료 결제 계정의 Gemini API 키이거나 사용량 한도를 확인해주세요.");
        }
        throw new Error(msg);
      }

      const data = await response.json();
      const candidateParts = data?.candidates?.[0]?.content?.parts;
      const imagePart = candidateParts?.find((p: any) => p.inlineData?.data);

      if (imagePart) {
        const mime = imagePart.inlineData.mimeType || "image/png";
        return {
          image: `data:${mime};base64,${imagePart.inlineData.data}`,
          prompt: finalPrompt,
        };
      }
    } catch (err: any) {
      lastError = err;
      continue;
    }
  }

  throw lastError || new Error("썸네일 이미지 생성에 실패했습니다.");
}
