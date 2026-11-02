// 실거래 층 빈칸 되찾기(2026-11-02 플랜 §2). 국토부 상업업무용 실거래는 집합 거래의 37~40%가 층이 비어 온다.
// 건축물대장 전유부(공공데이터포털 건축HUB, 공개 공공데이터)에서 같은 지번·같은 전용면적 호실의 층을 찾는다. 순수 함수만 둔다(시험 대상).
// 법정동 코드는 regions.ts bjdongCodeOf.

/** 지번 「123-4」 → 본번·부번 4자리. 가려진 지번(*)·산 지번은 null */
export function parseJibun(jibun: string): { bun: string; ji: string } | null {
  const m = String(jibun ?? "").trim().match(/^(\d{1,4})(?:-(\d{1,4}))?$/);
  return m ? { bun: m[1].padStart(4, "0"), ji: (m[2] ?? "0").padStart(4, "0") } : null;
}

export type ExposItem = { exposPubuseGbCdNm?: string; flrGbCdNm?: string; flrNo?: number | string; area?: number | string };

/**
 * 전유 호실 중 전용면적이 같은(±0.05㎡) 호실의 층. 국토부 층 표기와 같게 지하는 「-1」로 돌려준다.
 * 같은 면적 호실이 여러 층에 있으면 정할 수 없어 ambiguous.
 */
export function pickFloor(items: ExposItem[], areaM2: number): { floor: string } | { ambiguous: string[] } | null {
  const floors = new Set<string>();
  for (const it of items) {
    if (it.exposPubuseGbCdNm && !String(it.exposPubuseGbCdNm).includes("전유")) continue;
    if (Math.abs(Number(it.area) - areaM2) > 0.05) continue;
    const n = Number(it.flrNo);
    if (!Number.isFinite(n)) continue;
    floors.add(String(it.flrGbCdNm ?? "").includes("지하") ? `-${Math.abs(n)}` : String(n));
  }
  if (floors.size === 0) return null;
  if (floors.size > 1) return { ambiguous: [...floors].sort() };
  return { floor: [...floors][0] };
}
