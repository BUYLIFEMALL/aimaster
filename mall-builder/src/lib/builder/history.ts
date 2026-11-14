// 디자인 빌더 D6 — 게시 기록 한 줄 요약(node --test 대상, DB 없음)
// 기록은 DB 0081 mall_builder_design_history.snapshot = { home: 첫 화면 게시본, theme·header·footer·popup·list·detail: 조각 게시본 }
// 옛 기록·이상한 값이 와도 깨지지 않게 너그럽게 읽는다(보여 주기만 — 되돌리기는 DB 함수가 통째로 복사)
// 확장자(.ts)까지 적는다 — `node --test`가 이 파일을 바로 읽기 때문

import { BLOCK_DEFS, type BlockType } from "../blocks.ts";

export type SnapshotSummary = { blocks: number; shownBlocks: number; firstBlock: string; primary: string; parts: string[] };

const PART_LABEL: [string, string][] = [
  ["home", "첫 화면"], ["theme", "테마"], ["header", "헤더"], ["footer", "바닥글"], ["popup", "팝업"], ["list", "상품 목록"], ["detail", "상품 상세"],
];

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

export function summarizeSnapshot(raw: unknown): SnapshotSummary {
  const snap = isObj(raw) ? raw : {};
  const home = isObj(snap.home) ? snap.home : {};
  const list = Array.isArray(home.blocks) ? home.blocks.filter(isObj) : [];
  const shown = list.filter((b) => b.visible !== false);
  const first = shown[0]?.type;
  const firstBlock = typeof first === "string" && first in BLOCK_DEFS ? BLOCK_DEFS[first as BlockType].label : "";
  const theme = isObj(snap.theme) ? snap.theme : {};
  const primary = typeof theme.primary === "string" && /^#[0-9a-fA-F]{6}$/.test(theme.primary) ? theme.primary : "";
  return {
    blocks: list.length,
    shownBlocks: shown.length,
    firstBlock,
    primary,
    parts: PART_LABEL.filter(([k]) => isObj(snap[k])).map(([, label]) => label),
  };
}

// ── D6-3 동시 편집 경고 ──
// 편집기를 열 때의 「마지막 초안 저장 시각」(첫 화면 + 조각 6개 중 가장 늦은 것)을 기억해 두고,
// 저장할 때 DB의 지금 값이 더 늦으면 다른 곳(다른 직원·다른 탭)에서 먼저 저장한 것 — 덮어쓰기 전에 알린다

const ms = (v: unknown) => (typeof v === "string" ? Date.parse(v) : NaN);

/** 여러 시각 중 가장 늦은 것(읽을 수 없는 값은 건너뜀). 하나도 없으면 null */
export function latestStamp(stamps: (string | null | undefined)[]): string | null {
  let best: string | null = null;
  for (const s of stamps) if (!Number.isNaN(ms(s)) && (best === null || ms(s) > ms(best))) best = s as string;
  return best;
}

/** 편집기를 연 뒤(base) 더 늦게 저장된 것(current)이 있나 */
export function isStale(base: string | null, current: string | null): boolean {
  if (current === null || Number.isNaN(ms(current))) return false;
  if (base === null || Number.isNaN(ms(base))) return true;
  return ms(current) > ms(base);
}
