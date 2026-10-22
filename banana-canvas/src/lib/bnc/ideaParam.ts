// v1.24: 다른 프로그램(이미지 스타일 분석기 등)이 `/studio?idea=`로 보낸 글을 「이미지 생성」 아이디어 칸에 채운다.
// 글자만 받고 자동 생성은 하지 않는다. 칸 한도(600자)에 맞춰 자르고, 글이 아니면 버린다. 순수 함수(시험 대상)
export const MAX_IDEA = 600;

export function cleanIdeaParam(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? t.slice(0, MAX_IDEA) : undefined;
}

// v1.24: 보낸 프로그램(`&src=`) — 정해 둔 이름만 화면 이름으로 바꾼다(모르는 값은 버려 「다른 프로그램」으로 표시).
// `from`은 저장 작업 불러오기(uuid)에 쓰므로 보낸 곳은 `src`로 받는다
const SOURCE_NAMES: Record<string, string> = {
  "style-dna-analyzer": "이미지 스타일 분석기",
  "emotion-writer": "감성 글귀",
  "reverse-prompt": "리버스 프롬프트",
};

export function ideaSourceName(v: unknown): string | undefined {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(SOURCE_NAMES, v) ? SOURCE_NAMES[v] : undefined;
}
