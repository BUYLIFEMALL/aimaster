// v1.26: 다른 프로그램이 `/dashboard?prompt=…&src=<프로그램>`으로 보낸 프롬프트의 보낸 곳.
// 이름·주소 표는 공용 사본 `bananaIdeaLink.ts`(기준 style-dna-analyzer, 직접 고치지 않음)의 `BANANA_SOURCES` — 정해 둔 이름만 받는다.
// 받은 보낸 곳은 생성 기록 `usage_logs.metadata.ideaSource`에 남겨 관리자 통계에서 연계를 센다(DB 칸 추가 없음)
import { BANANA_SOURCES, isBananaSource, type BananaSource } from "./bananaIdeaLink";

export function promptSourceKey(v: unknown): BananaSource | undefined {
  return isBananaSource(v) ? v : undefined;
}

export function promptSourceInfo(v: unknown): { key: BananaSource; name: string; url: string } | undefined {
  return isBananaSource(v) ? { key: v, ...BANANA_SOURCES[v] } : undefined;
}
