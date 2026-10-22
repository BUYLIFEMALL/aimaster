// v1.24: 다른 프로그램(이미지 스타일 분석기 등)이 `/studio?idea=`로 보낸 글을 「이미지 생성」 아이디어 칸에 채운다.
// 글자만 받고 자동 생성은 하지 않는다. 칸 한도(600자)에 맞춰 자르고, 글이 아니면 버린다. 순수 함수(시험 대상)
export const MAX_IDEA = 600;

export function cleanIdeaParam(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? t.slice(0, MAX_IDEA) : undefined;
}
