import type { Inputs, Opt, Strategy, Subject, Style } from "./types";
import { audienceInfo } from "./audience";

/** 모든 AI 프롬프트는 당해 연도 기준(CLAUDE.md 핵심 원칙 8) */
export function yearGuard(): string {
  const y = new Date().getFullYear();
  const [koreaYear, koreaMonth] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit" }).format(new Date()).split("-").map(Number);
  return `[기준 연도 엄수: 현재 연도는 ${y}년입니다. 연도·시기·트렌드를 언급할 때는 ${y}년(당해 연도)을 기준으로 하고, 과거 연도로 퇴행하지 마세요.] [기준 시점: 한국 시간으로 지금은 ${koreaYear}년 ${koreaMonth}월입니다. 계절·시기 표현은 현재 월에 맞추고, 연도·계절은 불필요하게 덧붙이지 마세요.]`;
}

const ETHNICITY_EN: Record<string, string> = {
  "한국인 (Korean)": "Korean",
  "백인 (Caucasian)": "Caucasian",
  "흑인 (Black/African)": "Black / African",
  "동양인 (East Asian)": "East Asian",
  "히스패닉 (Hispanic)": "Hispanic",
  "다문화/판타지": "multicultural / fantasy-styled",
};
const AGE_EN: Record<string, string> = {
  "10대 (Teen)": "teenager",
  "20대 (Young Adult)": "young adult in their 20s",
  "30-40대 (Adult)": "adult in their 30s-40s",
  "50대 이상 (Senior)": "senior aged 50+",
  "어린이 (Child)": "child",
};

/** 피사체 요구사항 문단(영어). 인물은 별다른 지정이 없으면 한국인으로 묘사한다(핵심 원칙 3). */
export function subjectBlock(s: Subject): string {
  if (s.type === "none") {
    return "[Character Requirement]\n- Do NOT feature a specific person/character as the main subject. Focus on text, graphics, or an abstract representation of the topic.";
  }
  if (s.type === "person") {
    const gender = s.gender === "male" ? "Male" : s.gender === "female" ? "Female" : "Choose the gender that fits the topic most naturally";
    return [
      "[Character Requirement - MANDATORY]",
      "- Subject: A REALISTIC PERSON",
      `- Gender: ${gender}`,
      `- Ethnicity: ${ETHNICITY_EN[s.ethnicity] ?? "Korean"}`,
      `- Age: ${AGE_EN[s.age] ?? "young adult in their 20s"}`,
      "- Expression: Must be highly expressive (e.g., shocked, excited, crying, determined) depending on the context.",
    ].join("\n");
  }
  if (s.type === "animal") {
    return `[Character Requirement - MANDATORY]\n- Subject: ANIMAL\n- Detail: ${s.description || "Cute animal related to the topic"}`;
  }
  return `[Character Requirement - MANDATORY]\n- Subject: OBJECT / ITEM\n- Detail: ${s.description || "Key item related to the topic"}`;
}

/** 전략 생성용 시스템 지침 */
export function strategySystem(inputs: Inputs): string {
  const a = audienceInfo(inputs.audience);
  return `${yearGuard()}
당신은 유튜브 썸네일 트렌드를 선도하는 '전문 아트 디렉터'입니다.
사용자의 주제와 첨부된 문서를 분석하여 **두 가지 서로 다른 접근 방식(A안, B안)**의 텍스트 전략을 제안해야 합니다.

[타겟 분석: ${a.label}]
- ${a.strategy}
- 이 타겟층이 반응하는 키워드와 디자인 스타일을 적용하십시오.

${subjectBlock(inputs.subject)}

[전략 생성 목표]
**A안: 직관/정보/팩트 중심** — 내용을 명확하게 전달하고, 구체적인 숫자나 이득(Benefit)을 강조합니다.
  예: "5분 만에 100만원 버는 법", "이것만 알면 해결"
**B안: 호기심/감성/충격 중심** — 궁금증을 유발하거나 감정을 자극하는 질문, 의문문, 강렬한 단어를 사용합니다.
  예: "아직도 이걸 모르시나요?", "충격적인 결말"

[공통 규칙]
- 메인 텍스트는 매우 짧고 굵게(3~5단어). 서브 텍스트는 메인을 보조하되 반드시 작성합니다(숫자, vs, 기간 등).
- 텍스트는 한국어로 작성합니다(주제가 다른 언어면 그 언어).
- imagePrompt는 영어로, 배경·인물(설정된 피사체)·조명·구도를 묘사합니다. 이미지 안에 들어갈 글자는 포함하지 마세요.
- imagePromptKo는 imagePrompt를 한국어로 옮긴 사용자 표시용 문장입니다.
- 시각 연출 키워드: "Hyper-realistic, 8k, High Contrast, Cinematic Lighting".

[출력(JSON)] strategySummary(기획 의도 3줄 요약), imagePrompt, imagePromptKo, option1(A안), option2(B안).
각 option: label(전략 이름), hookMainText, hookSubText, textStyleSuggestion(색상·폰트 분위기 추천).`;
}

export function strategyUser(topic: string, docText: string, avoid?: string[]): string {
  let u = `주제/요청사항: ${topic}`;
  if (docText) u += `\n\n[첨부 문서 내용 시작]\n${docText}\n[첨부 문서 내용 끝]`;
  if (avoid?.length) u += `\n\n[이전 제안과 다른 새로운 문구를 만드세요. 이전 메인 문구: ${avoid.join(" / ")}]`;
  return u;
}

const BORDER: Record<string, string> = {
  solid: "- [BORDER]: Add a THICK, SOLID COLOR border (bright yellow or red) around the ENTIRE edge of the thumbnail. It must be high-contrast and fully visible.",
  neon: "- [BORDER]: Add a GLOWING NEON border (cyan, magenta, or lime green) around the edges. Cyberpunk or gaming vibe.",
  sketch: "- [BORDER]: Add a ROUGH, HAND-DRAWN white scribble border around the edges. Casual, vlog, or diary aesthetic.",
};

/** 옵션(A/B) 한 장의 이미지 생성 프롬프트 */
export function imagePrompt(strategy: Strategy, opt: Opt, inputs: Inputs): string {
  const o = strategy[opt];
  const style: Style = inputs.style;
  const extras: string[] = [];
  if (BORDER[style.border]) extras.push(BORDER[style.border]);
  if (style.channelName.trim()) {
    extras.push(`- [BRANDING]: Include the channel name text "${style.channelName.trim()}" in a small, stylish font in one corner (top-left or top-right). It must be distinct from the main/sub text.`);
  }
  const text = style.withText
    ? `[Text Rendering - CRITICAL]\nRender the following text into the image exactly as written (Korean must be spelled correctly).\n1. MAIN TEXT: "${o.main}"\n2. SUB TEXT: "${o.sub}"\n\n[Text Rules]\n${audienceInfo(inputs.audience).imageRule}\n- Ensure text is legible and does not cover the face/eyes of the subject.\n- Place text in the negative space / safe zone (center or sides).`
    : "[No Text]\nDo NOT render any text, letters, numbers, logos, or watermarks. Leave clear negative space where a title could be added later.";
  return [
    "[Role] Professional YouTube Thumbnail Designer",
    `[Visual Prompt]\n${strategy.imagePrompt}`,
    `[Specific Style & Atmosphere]\n${o.styleHint}`,
    subjectBlock(inputs.subject),
    text,
    extras.length ? `[Visual Extra Rules]\n${extras.join("\n")}` : "",
    "- Lighting: professional studio lighting, rim light. Quality: 8k, hyper-realistic, sharp focus. 16:9 YouTube thumbnail composition.",
  ].filter(Boolean).join("\n\n");
}

export function editPrompt(instruction: string): string {
  return `Modify this YouTube thumbnail image. Keep the 16:9 composition and everything not mentioned unchanged. Instruction: ${instruction}`;
}
