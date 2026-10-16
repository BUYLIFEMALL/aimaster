import "server-only";
import { FORMATS, TONES, type Format, type Tone } from "@/lib/script";

// 프롬프트는 이 프로그램용으로 새로 썼다(참고 원본 문구 사용 안 함). 당해 연도는 항상 동적으로 주입한다(원칙 8).
function yearRule() {
  const y = new Date().getFullYear();
  return `[기준 연도 엄수: 현재 연도는 ${y}년입니다. 모든 연도 표기, 정책, 정보, 트렌드, 제목은 반드시 ${y}년(당해 연도)을 기준으로 작성하세요. 과거 연도(2023년, 2024년 등)로 퇴행하지 마세요.]`;
}

const SAFETY = "사실이 불확실한 수치·의학·법률·투자 단정은 피하고 일반적인 정보로 표현하세요. 특정 실존 인물을 비방하거나 자극적 혐오 표현을 쓰지 마세요.";

export function topicPrompt(o: { category: string; seed?: string; reference?: string; count: number; guideline?: string }) {
  const system = [
    "당신은 한국어 유튜브 쇼츠(세로 30~60초) 기획자입니다. 시청자가 첫 1초에 멈추고 끝까지 보게 만드는 주제를 제안합니다.",
    yearRule(), SAFETY,
    o.guideline ? `[회원 작성 지침 — 우선 적용]\n${o.guideline}` : "",
  ].filter(Boolean).join("\n\n");
  const prompt = [
    `분야: ${o.category}`,
    o.seed ? `회원이 입력한 키워드·아이디어: ${o.seed}` : "",
    o.reference ? `참고 자료(이 내용을 근거로 주제를 고르세요):\n${o.reference}` : "",
    `서로 겹치지 않는 쇼츠 주제 ${o.count}개를 제안하세요. 각 주제는 20~40자의 구체적인 제목 문장으로, 숫자·질문·반전 같은 호기심 장치를 적절히 섞습니다.`,
    `JSON 형식: {"topics":[{"title":"주제 제목","hook":"첫 장면에서 던질 한 줄 후킹(25자 이내)","format":"list|howto|tips|compare|story 중 하나"}]}`,
  ].filter(Boolean).join("\n\n");
  return { system, prompt };
}

export function scriptPrompt(o: { topic: string; category: string; tone: Tone; format: Format; cards: number; reference?: string; guideline?: string }) {
  const system = [
    "당신은 한국어 유튜브 쇼츠 대본 작가입니다. 화면에는 짧은 글자만, 자세한 내용은 내레이션으로 전달하는 세로 카드형 쇼츠 대본을 씁니다.",
    yearRule(), SAFETY,
    `말투: ${TONES[o.tone].guide}`,
    `구성 방식: ${FORMATS[o.format].guide}`,
    o.guideline ? `[회원 작성 지침 — 기본 규칙보다 우선 적용]\n${o.guideline}` : "",
  ].filter(Boolean).join("\n\n");
  const prompt = [
    `주제: ${o.topic}`,
    o.category ? `분야: ${o.category}` : "",
    o.reference ? `참고 자료(이 내용을 근거로 쓰고, 자료에 없는 사실을 지어내지 마세요):\n${o.reference}` : "",
    `규칙:
- 인트로 1장 + 카드 정확히 ${o.cards}장 + 아웃트로 1장.
- 인트로 title은 첫 1초에 멈추게 하는 18자 이내 질문·숫자·반전형 문장, eyebrow는 8자 이내 꼬리표.
- 카드 title은 화면에 크게 들어갈 16자 이내 핵심어, desc는 24자 이내 한 줄 보조 설명, tag는 6자 이내(예: "1위", "STEP 2", "꿀팁").
- 각 narration은 소리 내어 읽기 좋은 자연스러운 1~3문장(카드당 40~110자). 화면 글자를 그대로 반복하지 말고 이유·예시를 더합니다.
- 아웃트로는 요약 한 줄(title), 부제(subtitle), 행동 유도 문구 cta 1~2개(예: "저장해 두세요"), narration.
- 해시태그 hashtags 5~8개(한국어 위주, # 포함).`,
    `JSON 형식: {"intro":{"eyebrow":"","title":"","narration":""},"cards":[{"tag":"","title":"","desc":"","narration":""}],"outro":{"title":"","subtitle":"","cta":[""],"narration":""},"hashtags":["#"]}`,
  ].filter(Boolean).join("\n\n");
  return { system, prompt };
}

/** 장면별 배경 찾기: 스톡 검색어(영어)와 AI 이미지 묘사(영어)를 한 번에 만든다. 인물은 한국인 기본(원칙 3) */
export function visualsPrompt(o: { topic: string; scenes: string[]; style: string; character: string }) {
  const system = [
    "You are a visual director for Korean vertical short-form videos (9:16). For each scene, write (1) a short English stock-footage search query (2-4 plain keywords that exist in stock libraries like Pexels/Pixabay) and (2) an English image-generation prompt describing a background scene that matches the narration.",
    "If people appear, depict them as Korean (East Asian) by default unless the scene clearly needs a specific foreign person or place.",
    "Backgrounds must leave clear space for large on-screen text: avoid busy centers, no text, letters, logos, or watermarks in images.",
    o.character ? `Keep this same character consistent in every image prompt: ${o.character}` : "",
    `Image style for all prompts: ${o.style}`,
  ].filter(Boolean).join("\n");
  const prompt = [
    `Video topic (Korean): ${o.topic}`,
    `Scenes in order (Korean narration):\n${o.scenes.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
    `Return JSON exactly: {"scenes":[{"query":"english keywords","prompt":"english image prompt, vertical 9:16 composition"}]} with ${o.scenes.length} items in the same order.`,
  ].join("\n\n");
  return { system, prompt };
}

/** 발행 계획(P7): 채널 단계 전략 + 날짜에 배치할 주제 목록. 날짜·시각은 서버가 붙인다 */
export function planPrompt(o: { stageLabel: string; stageGuide: string; categories: string[]; count: number; days: number; perDay: number; seed?: string; guideline?: string }) {
  const system = [
    "당신은 한국어 유튜브 쇼츠 채널 운영 전략가입니다. 채널 단계에 맞는 운영 전략과 실제로 만들 쇼츠 주제 목록을 제안합니다.",
    yearRule(), SAFETY,
    o.guideline ? `[회원 작성 지침 — 우선 적용]\n${o.guideline}` : "",
  ].filter(Boolean).join("\n\n");
  const prompt = [
    `채널 단계: ${o.stageLabel} — ${o.stageGuide}`,
    `분야: ${o.categories.join(", ")}`,
    `기간: ${o.days}일, 하루 ${o.perDay}편`,
    o.seed ? `회원 키워드·채널 방향: ${o.seed}` : "",
    `할 일:
1) strategy: 이 단계·분야에 맞는 운영 전략 요약(summary, 2문장), 집중할 점(focus) 3개, 실행 팁(tips) 3개.
2) topics: 서로 겹치지 않는 쇼츠 주제 정확히 ${o.count}개를 업로드 순서대로. 각 주제는 20~40자의 구체적인 제목 문장, 첫 장면 후킹(hook, 25자 이내), 구성(format), 분야(category, 위 분야 중 하나를 그대로). 분야는 고르게 섞고, 같은 형식이 3번 넘게 연속되지 않게 합니다. 시리즈로 이어지는 주제는 제목에 순서가 드러나게 합니다.`,
    `JSON 형식: {"strategy":{"summary":"","focus":[""],"tips":[""]},"topics":[{"title":"","hook":"","format":"list|howto|tips|compare|story 중 하나","category":""}]}`,
  ].filter(Boolean).join("\n\n");
  return { system, prompt };
}

/** 업로드 문구(P7): 대본을 바탕으로 쇼츠 제목 후보·설명·해시태그·검색 태그 */
export function seoPrompt(o: { topic: string; category: string; outline: string }) {
  const system = [
    "당신은 한국어 유튜브 쇼츠 업로드 문구(SEO) 담당자입니다. 검색과 추천에 잘 걸리면서 내용과 정확히 일치하는 문구를 씁니다. 낚시성 과장, 내용에 없는 약속은 쓰지 않습니다.",
    yearRule(), SAFETY,
  ].join("\n\n");
  const prompt = [
    `주제: ${o.topic}`, o.category ? `분야: ${o.category}` : "",
    `대본 요약:\n${o.outline}`,
    `만들 것:
- titles: 쇼츠 제목 후보 5개(각 40자 이내, 핵심 검색어를 앞쪽에, 서로 다른 각도: 질문형·숫자형·결과형 등). 연도가 필요하면 당해 연도만.
- description: 설명란 문구(3~5줄, 첫 줄에 핵심 요약과 검색어, 이어서 영상 내용 요약, 마지막에 구독·저장 유도 한 줄). 해시태그는 넣지 말 것.
- hashtags: 해시태그 6~8개(# 포함, #shorts 1개 포함, 나머지는 한국어 위주).
- tags: 검색 태그 10~15개(# 없이, 짧은 검색어, 한국어 위주에 필요하면 영어 1~2개).`,
    `JSON 형식: {"titles":[""],"description":"","hashtags":["#"],"tags":[""]}`,
  ].filter(Boolean).join("\n\n");
  return { system, prompt };
}
