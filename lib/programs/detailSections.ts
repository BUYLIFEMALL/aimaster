// 프로그램 상세 페이지의 "핵심 특징 4개 + 사용 순서" (programs.detail_sections, 2026-10-16).
// 작성 규칙: docs/PROGRAM_DESCRIPTION_STANDARD.md §9. 값이 없거나 형식이 틀리면 빈 배열 → 화면에서 숨긴다.
export interface DetailFeature { icon: string; title: string; desc: string }
export interface DetailStep { title: string; desc: string }
export interface DetailSections { features: DetailFeature[]; steps: DetailStep[] }

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function parseDetailSections(v: unknown): DetailSections {
  const o = v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  const arr = (x: unknown) => (Array.isArray(x) ? x.filter((i): i is Record<string, unknown> => !!i && typeof i === "object") : []);
  return {
    features: arr(o.features).map((f) => ({ icon: str(f.icon, 8), title: str(f.title, 40), desc: str(f.desc, 200) })).filter((f) => f.title && f.desc).slice(0, 6),
    steps: arr(o.steps).map((s) => ({ title: str(s.title, 40), desc: str(s.desc, 160) })).filter((s) => s.title && s.desc).slice(0, 6),
  };
}

/** 저장용: 빈 줄은 버리고, 하나도 없으면 null */
export function toDetailSectionsValue(d: DetailSections): DetailSections | null {
  const clean = parseDetailSections(d);
  return clean.features.length || clean.steps.length ? clean : null;
}
