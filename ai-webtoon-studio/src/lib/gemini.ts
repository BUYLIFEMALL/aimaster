import { ArtStyle, BalloonStyle, WebtoonProject, CutScene } from "./types";

export const ART_STYLE_PROMPT_MAP: Record<ArtStyle, { label: string; enTag: string }> = {
  modern_korean_webtoon: {
    label: "현대 한국 웹툰 풍",
    enTag: "Korean webtoon manhwa style, high quality digital comic art, clean lineart, vibrant cel shading, modern webtoon aesthetic, masterpiece",
  },
  shonen_manga: {
    label: "소년 만화 풍",
    enTag: "Dynamic Japanese shonen manga anime style, dramatic contrast, bold action lines, vibrant anime color palette, expressive eyes, intense energy",
  },
  romance_fantasy: {
    label: "로맨스 순정 풍",
    enTag: "Korean romance fantasy otome webtoon style, soft sparkling pastel lighting, delicate elegant facial features, detailed glittering hair, dreamy atmosphere, beautiful aesthetic",
  },
  chibi_sd_casual: {
    label: "귀여운 SD/캐주얼 풍",
    enTag: "Cute chibi SD comic style, adorable 2-3 head proportion, cute expressive eyes, soft rounded shapes, cheerful bright colors, lighthearted cartoon aesthetic",
  },
  american_hero_comic: {
    label: "미국 히어로 코믹스 풍",
    enTag: "American superhero comic book style, bold ink contours, dramatic chiaroscuro cross-hatching, heroic proportions, gritty cinematic lighting, Marvel and DC graphic novel aesthetic",
  },
};

export const BALLOON_STYLE_LABEL_MAP: Record<BalloonStyle, string> = {
  round_smooth: "부드러운 원형 (일상·대화)",
  classic_rect: "클래식 사각형 (나레이션·독백)",
  action_spike: "강렬한 액션형 (외침·충격)",
};

const GEMINI_API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

// 1. 시놉시스 마법봉 확장
export async function expandSynopsisAI(
  apiKey: string,
  title: string,
  synopsisDraft: string,
  artStyle: ArtStyle
): Promise<string> {
  if (!apiKey) throw new Error("Gemini API 키가 등록되지 않았습니다.");

  const currentYear = new Date().getFullYear();
  const styleLabel = ART_STYLE_PROMPT_MAP[artStyle].label;

  const prompt = `당신은 ${currentYear}년 기준 대한민국 최고의 네이버·카카오 연재 웹툰 전문 스토리 작가입니다.
사용자가 입력한 초안을 바탕으로 독자의 시선을 단숨에 사로잡을 흥미진진한 [웹툰 핵심 시놉시스]를 3~4문장으로 매력적으로 완성해주세요.

[입력 정보]
- 작품 제목: ${title || "무제"}
- 아트 스타일: ${styleLabel}
- 시놉시스 초안 또는 키워드: ${synopsisDraft || "흥미로운 웹툰 도입부"}

[작성 지침]
- 세계관 설정, 주인공의 핵심 목표, 긴장감 넘치는 사건의 시작이 명확하게 드러나야 합니다.
- 불필요한 서두나 사족 없이 완성된 시놉시스 본문만 300자 내외로 출력하세요.`;

  const response = await callGeminiText(apiKey, prompt);
  return response.trim();
}

// 2. 캐릭터 묘사 마법봉 확장
export async function expandCharacterAI(
  apiKey: string,
  charName: string,
  charDraft: string,
  artStyle: ArtStyle
): Promise<string> {
  if (!apiKey) throw new Error("Gemini API 키가 등록되지 않았습니다.");

  const currentYear = new Date().getFullYear();
  const styleLabel = ART_STYLE_PROMPT_MAP[artStyle].label;

  const prompt = `당신은 ${currentYear}년 웹툰 캐릭터 디자이너입니다.
아래 캐릭터의 외형 정보를 AI 이미지 생성 모델이 일관성 있게 그릴 수 있도록 구체적인 시각 묘사(나이, 헤어스타일, 눈동자 색, 대표 의상, 체형, 시그니처 소품 등)로 디테일하게 보강해주세요.

[캐릭터 정보]
- 이름: ${charName || "주인공"}
- 화풍: ${styleLabel}
- 외형 키워드: ${charDraft || "단정한 학생"}

[작성 지침]
- 다른 컷에서도 동일인물로 인식될 수 있도록 고유의 시각적 특징(머리색, 복장, 악세서리 등)을 2~3줄로 명확히 작성하세요.
- 설명글 없이 완성된 외형 묘사 텍스트만 출력하세요.`;

  const response = await callGeminiText(apiKey, prompt);
  return response.trim();
}

// 3. 컷별 시나리오 콘티 생성기
export async function generateStoryboardAI(
  apiKey: string,
  project: WebtoonProject
): Promise<{ scriptText: string; cuts: CutScene[] }> {
  if (!apiKey) throw new Error("Gemini API 키가 등록되지 않았습니다.");

  const currentYear = new Date().getFullYear();
  const styleInfo = ART_STYLE_PROMPT_MAP[project.artStyle];

  const charProfiles = project.characters
    .map((c, i) => `[인물 ${i + 1}: ${c.name}] ${c.description}`)
    .join("\n");

  const prompt = `당신은 ${currentYear}년 상위 1% 네이버/카카오 웹툰 메인 프로듀서입니다.
아래 웹툰 기획 정보를 바탕으로 총 ${project.chapterCount}화 중에서 총 ${project.cutCount}컷 분량의 정밀한 [웹툰 시나리오 콘티]를 작성해주세요.

[작품 정보]
- 제목: ${project.title}
- 작가명: ${project.author}
- 시놉시스: ${project.synopsis}
- 아트 스타일: ${styleInfo.label} (${styleInfo.enTag})
- 말풍선 스타일: ${BALLOON_STYLE_LABEL_MAP[project.balloonStyle]}
- 등장인물 프로필:
${charProfiles || "주인공"}
- 스토리 추가 요청: ${project.storyPrompt || "자연스러운 웹툰 1화 연출"}

[필수 요구사항]
정확히 ${project.cutCount}개의 컷으로 나누고, 반드시 아래 JSON 형식으로만 응답하세요. 다른 설명이나 마크다운 백틱 코드블록 앞뒤 텍스트는 절대 쓰지 마세요.

JSON 형식:
{
  "summary": "이번 화 줄거리 요약",
  "cuts": [
    {
      "cutIndex": 1,
      "cameraAngle": "카메라 앵글 (예: 익스트림 클로즈업, 하이앵글 풀샷 등)",
      "characterNames": ["등장인물 이름"],
      "description": "구체적인 장면 연출, 배경, 인물의 행동과 표정 (한국어)",
      "dialogue": "캐릭터 대사 또는 나레이션 (한국어)",
      "prompt": "Highly detailed Stable Diffusion / Flux English image prompt for this specific cut, combining character visual traits, camera angle, action, background, and ${styleInfo.enTag}"
    }
  ]
}`;

  const response = await callGeminiText(apiKey, prompt);
  
  // JSON 파싱
  let parsed: { summary?: string; cuts?: any[] };
  try {
    const cleaned = response
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error("JSON parse failed, raw response:", response);
    throw new Error("AI가 시나리오 콘티 형식을 올바르게 생성하지 못했습니다. 다시 시도해주세요.");
  }

  const cuts: CutScene[] = (parsed.cuts || []).map((c: any, idx: number) => ({
    cutIndex: c.cutIndex || idx + 1,
    cameraAngle: c.cameraAngle || "바스트 샷",
    characterNames: Array.isArray(c.characterNames) ? c.characterNames : [],
    description: c.description || "",
    dialogue: c.dialogue || "",
    prompt: c.prompt || `${project.title}, ${styleInfo.enTag}`,
  }));

  // 사람이 읽기 좋은 콘티 텍스트로도 변환
  const scriptText = cuts
    .map(
      (c) =>
        `[CUT ${c.cutIndex}] (${c.cameraAngle})
인물: ${c.characterNames.join(", ") || "배경"}
연출: ${c.description}
대사: "${c.dialogue}"
프롬프트: ${c.prompt}
`
    )
    .join("\n----------------------------------------\n\n");

  return { scriptText, cuts };
}

// Gemini 공통 호출 함수
async function callGeminiText(apiKey: string, prompt: string): Promise<string> {
  const url = `${GEMINI_API_ENDPOINT}/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const msg = errorData?.error?.message || `HTTP ${res.status}`;
    throw new Error(`Gemini API 오류: ${msg}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini API로부터 응답 텍스트를 받지 못했습니다.");
  }
  return text;
}
