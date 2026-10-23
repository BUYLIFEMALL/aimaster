// v1.29(S-23-01·02): 섹션 한꺼번에 만들기 — 어떤 섹션을 만들지, 끝난 뒤 상품 상태를 무엇으로 둘지(순수 함수).

/**
 * 만들 섹션 목록. "remaining"은 아직 이미지가 없는 섹션만(직접 올린 사진·GIF·이미 만든 섹션은 건너뜀),
 * "all"은 전부 다시 만든다(회원이 두 번 눌러 확인한 경우).
 */
export function sectionsToGenerate<T extends { section_key: string }>(
  ordered: T[],
  states: Record<string, { status: string } | undefined>,
  mode: "remaining" | "all",
): T[] {
  if (mode === "all") return ordered;
  return ordered.filter((t) => states[t.section_key]?.status !== "done");
}

/**
 * 한꺼번에 만들기가 끝난 뒤 상품 상태. 모든 섹션이 끝났을 때만 「상세페이지 완성」,
 * 중간에 실패·중단되면 생성 전 상태(「소구점 분석완료」)로 둔다(예전에는 실패해도 완성으로 바뀜).
 */
export function statusAfterGenerate(allSectionsDone: boolean): "completed" | "analyzed" {
  return allSectionsDone ? "completed" : "analyzed";
}
