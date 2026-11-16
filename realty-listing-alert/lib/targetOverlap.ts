// U-5(2026-11-17): 감시 화면의 「지역 펼침 ↔ 단지 감시 겹침」 안내를 고르는 순수 함수(시험 tests/targetOverlap.test.ts).
// 겹침 기록은 확장이 마지막 회차에 남긴 lastResult.overlapCheck(extension/lib/listing.js regionOverlaps)다.
// 지금 목록에 그 단지 감시·그 지역 감시가 둘 다 있고 그 지역 펼침이 성공(ok)했을 때만 보여 준다.
// 옛 확장(기록 없음)·결과 없음·다른 계정(확장이 답하지 않음)이면 빈 값.

export type OverlapCheck = {
  regions?: { cortarNo?: string; status?: string }[];
  overlaps?: { complexNo?: string; cortarNo?: string; regionName?: string }[];
};

export type OverlapTarget = {
  target_type: string;
  complex_no: string | null;
  cortar_no: string | null;
  region_name: string | null;
};

/** 반환: { 단지 번호: [지역 이름…] } */
export function overlapNotesFor(check: OverlapCheck | null | undefined, targets: OverlapTarget[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (!check || !Array.isArray(check.overlaps)) return out;
  const okRegions = new Set((check.regions ?? []).filter((r) => r?.status === "ok").map((r) => String(r.cortarNo ?? "")));
  const complexNos = new Set(targets.filter((t) => t.target_type !== "region" && t.complex_no).map((t) => String(t.complex_no)));
  const regions = new Map(targets.filter((t) => t.target_type === "region" && t.cortar_no).map((t) => [String(t.cortar_no), t.region_name ?? ""]));
  for (const o of check.overlaps) {
    const no = String(o?.complexNo ?? "");
    const cortar = String(o?.cortarNo ?? "");
    if (!complexNos.has(no) || !regions.has(cortar) || !okRegions.has(cortar)) continue;
    const name = regions.get(cortar) || o.regionName || "";
    if (name) out[no] = [...new Set([...(out[no] ?? []), name])];
  }
  return out;
}
