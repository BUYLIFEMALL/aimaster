// v1.24: 다른 프로그램(이미지 스타일 분석기 등)이 `/studio?idea=`로 보낸 글을 「이미지 생성」 아이디어 칸에 채운다.
// 글자만 받고 자동 생성은 하지 않는다. 칸 한도에 맞춰 자르고, 글이 아니면 버린다. 순수 함수(시험 대상)
// v1.25: 한도·보낸 곳 이름표는 공용 사본 `bananaIdeaLink.ts`(기준 스타일 분석기)와 같은 값을 쓴다 — 보내는 쪽과 항상 같음
import { BANANA_SOURCES, isBananaSource, MAX_BANANA_IDEA, type BananaSource } from "./bananaIdeaLink";

export const MAX_IDEA = MAX_BANANA_IDEA;

export function cleanIdeaParam(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? t.slice(0, MAX_IDEA) : undefined;
}

// 보낸 프로그램(`&src=`) — 공용 이름표에 있는 이름만 받는다(모르는 값은 버려 「다른 프로그램」으로 표시).
// `from`은 저장 작업 불러오기(uuid)에 쓰므로 보낸 곳은 `src`로 받는다
export function ideaSourceKey(v: unknown): BananaSource | undefined {
  return isBananaSource(v) ? v : undefined;
}

export function ideaSourceName(v: unknown): string | undefined {
  return isBananaSource(v) ? BANANA_SOURCES[v].name : undefined;
}

// v1.25: 돌아가기 링크 주소(공용 이름표의 주소만)
export function ideaSourceUrl(v: unknown): string | undefined {
  return isBananaSource(v) ? BANANA_SOURCES[v].url : undefined;
}
