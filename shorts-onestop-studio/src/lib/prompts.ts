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
