// AI 작성 결과의 형식 오류를 코드로 정리한다.
// - 줄바꿈이 「\n」 글자 그대로 들어간 경우 → 진짜 줄바꿈으로 바꾼다.
// - 본문 맨 앞의 마크다운 제목 줄(「# 제목」) → 제목은 따로 들어가므로 지운다.
// - 같은 빈 줄이 3줄 이상 이어지면 2줄로 줄인다.

export function cleanGeneratedBody(text: string): string {
  let body = String(text || "").replace(/\r\n/g, "\n");
  // 글자 그대로의 \n (백슬래시+n)만 바꾼다. 줄 전체가 \n 묶음이면 빈 줄로 남는다.
  body = body.replace(/\\n/g, "\n");
  // 맨 앞(빈 줄 제외) 마크다운 제목 줄 제거. [SECTION ...] 같은 구조 태그는 건드리지 않는다.
  body = body.replace(/^\s*#{1,6}[ \t]+[^\n]*\n?/, "");
  // 줄 끝 공백 정리 + 빈 줄 과다 정리
  body = body.split("\n").map((line) => line.replace(/[ \t]+$/g, "")).join("\n");
  body = body.replace(/\n{3,}/g, "\n\n");
  return body.trim();
}
