// V2 각색 강도(2026-11-06): 「내 대본으로 만들기」의 내 대본을 회원 본인 AI 키로 다듬는다 — 강도 3단(순수 함수: 프롬프트·응답 검사).
// 회원이 직접 쓴 대본만 대상이다(다른 사람의 대사·자막을 넣어 바꾸는 용도가 아님 — 화면 문구로 고지).
// 시험(node --test)에서 그대로 불러오려고 다른 파일을 가져오지 않는다. script.ts MAX_CARDS(8)와 같은 값
const MAX_CARDS = 8;

export const REWRITE_LEVELS = {
  light: { label: "맞춤법만", desc: "띄어쓰기·맞춤법·오타만 고치고 표현은 그대로" },
  medium: { label: "문장 다듬기", desc: "뜻과 순서는 그대로, 말하기 좋게 문장을 다듬음(길이 비슷)" },
  strong: { label: "구성까지 새로", desc: "내용은 유지하되 첫 줄 훅·순서·마무리를 쇼츠에 맞게 다시 짬" },
} as const;
export type RewriteLevel = keyof typeof REWRITE_LEVELS;
export const isRewriteLevel = (v: unknown): v is RewriteLevel => typeof v === "string" && v in REWRITE_LEVELS;

/** 한 줄 = 한 장면. 빈 줄 제거, 줄 수·길이 제한 */
export const MAX_LINES = MAX_CARDS + 2;
export const MAX_LINE_CHARS = 300;
export function readLines(raw: unknown): string[] {
  const text = Array.isArray(raw) ? raw.map((l) => (typeof l === "string" ? l : "")).join("\n") : typeof raw === "string" ? raw : "";
  return text.split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim().slice(0, MAX_LINE_CHARS)).filter(Boolean).slice(0, MAX_LINES);
}

const RULES: Record<RewriteLevel, string> = {
  light: "띄어쓰기·맞춤법·오타·문장 부호만 고치세요. 낱말 선택, 말투, 문장 순서, 길이는 바꾸지 마세요.",
  medium: "각 줄의 뜻과 순서는 그대로 두고, 소리 내어 읽기 좋은 자연스러운 구어체로 다듬으세요. 줄마다 길이는 원문의 ±20% 안에서, 새 정보나 과장은 넣지 마세요.",
  strong: "내용(사실·주장·예시)은 그대로 쓰되 쇼츠 구성에 맞게 다시 짜세요: 첫 줄은 1초 안에 멈추게 하는 훅, 중간은 핵심이 먼저 나오는 순서, 마지막 줄은 짧은 마무리·행동 유도. 새 사실이나 과장된 수치는 넣지 마세요.",
};

export function rewritePrompt(level: RewriteLevel, lines: string[], topic: string): { system: string; prompt: string } {
  const y = new Date().getFullYear();
  const system = [
    "당신은 한국어 유튜브 쇼츠 대본 편집자입니다. 회원이 직접 쓴 대본(한 줄 = 한 장면)을 요청한 강도로만 다듬습니다.",
    `[기준 연도 엄수: 현재 연도는 ${y}년입니다. 연도·정책·트렌드 표기는 ${y}년 기준으로, 과거 연도로 퇴행하지 마세요.]`,
    `강도: ${REWRITE_LEVELS[level].label} — ${RULES[level]}`,
    `줄 수는 입력과 똑같이 ${lines.length}줄을 유지하고(합치거나 나누지 않음), 각 줄은 ${MAX_LINE_CHARS}자 이내입니다.`,
    `JSON 형식으로만 답하세요: {"lines":["첫 줄","둘째 줄",...]}`,
  ].join("\n\n");
  const prompt = [topic ? `주제: ${topic}` : "", "대본:", ...lines.map((l, i) => `${i + 1}. ${l}`)].filter(Boolean).join("\n");
  return { system, prompt };
}

/** AI 응답에서 줄을 꺼낸다. 줄 수가 다르거나 비면 null(원문 유지). 번호 접두사는 뗀다 */
export function parseRewrite(json: unknown, count: number): string[] | null {
  const raw = json && typeof json === "object" ? (json as { lines?: unknown; items?: unknown }).lines ?? (json as { items?: unknown }).items : null;
  if (!Array.isArray(raw)) return null;
  const lines = raw
    .map((l) => (typeof l === "string" ? l : l && typeof l === "object" && typeof (l as { text?: unknown }).text === "string" ? (l as { text: string }).text : ""))
    .map((l) => l.replace(/^\s*\d+[.)]\s*/, "").replace(/\s+/g, " ").trim().slice(0, MAX_LINE_CHARS))
    .filter(Boolean);
  return lines.length === count ? lines : null;
}
