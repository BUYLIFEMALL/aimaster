// 수집한 글감(기사 요약 등)을 AI 기획·작성·검수에 근거 자료로 넘기고, 자료에 없는 사실 문장을 찾아 표시한다.
// 글감 없이 주제만 입력한 경우에는 아무 것도 붙이지 않아 기존 동작과 같다.

export const MAX_SOURCE_CHARS = 4000;

export function normalizeSourceMaterial(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\r\n/g, "\n").trim().slice(0, MAX_SOURCE_CHARS);
}

/** 기획·작성 프롬프트에 붙이는 근거 자료 블록. 자료가 없으면 빈 문자열. */
export function buildSourceBlock(material: string): string {
  if (!material) return "";
  return `

[근거 자료 — 사실은 반드시 이 자료에서만 가져온다]
${material}
[근거 자료 끝]
- 인물·사건·수치·발언·만남 경위·앞으로의 계획처럼 사실로 읽히는 내용은 위 자료에 있는 것만 쓴다.
- 자료에 없는 부분은 지어내지 말고 "알려진 내용은 여기까지예요"처럼 담백하게 넘어가거나, 독자에게 묻는 문장·일반적인 생각으로만 채운다.`;
}

/** 검수 프롬프트에 붙이는 대조 지시. 자료가 없으면 빈 문자열. */
export function buildSourceReviewRule(material: string): string {
  if (!material) return "";
  return `

[원문 대조 검수]
아래 근거 자료와 본문을 대조해, 자료에 없는 사실(인물의 행동·발언·경위·수치·날짜 등)을 사실처럼 쓴 문장을 찾아 "unsupported" 배열에 본문 문장 그대로 넣어줘(최대 5개, 없으면 빈 배열). 의견·질문·일반론은 넣지 않는다.
근거 자료:
${material}`;
}

/** 검수 응답의 unsupported 값을 정리한다. */
export function readUnsupported(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter((item) => item.length >= 4)
    .slice(0, 5);
}

/** 자료에 없는 문장이 있으면 PASS를 WARN으로 낮추고 검수 의견에 붙일 문구를 만든다. */
export function applyUnsupported(status: "PASS" | "WARN" | "FAIL" | "UNKNOWN", unsupported: string[]) {
  if (!unsupported.length) return { status, note: "" };
  return {
    status: status === "PASS" ? ("WARN" as const) : status,
    note: `근거 자료에 없는 사실 문장 ${unsupported.length}개 — 확인·수정 필요: ${unsupported.map((s) => `「${s.slice(0, 80)}」`).join(" ")}`,
  };
}
