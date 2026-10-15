"use client";

import type { DetailSections } from "@/lib/programs/detailSections";

// 관리자 프로그램 편집: 상세 페이지 "핵심 특징 4개 + 사용 순서 4단계" 입력(2026-10-16).
// 빈 줄은 저장하지 않고, 모두 비우면 상세 페이지에서 두 묶음이 숨겨진다. 작성 규칙: docs/PROGRAM_DESCRIPTION_STANDARD.md §9.
export const EMPTY_SECTIONS: DetailSections = {
  features: Array.from({ length: 4 }, () => ({ icon: "", title: "", desc: "" })),
  steps: Array.from({ length: 4 }, () => ({ title: "", desc: "" })),
};

/** 저장된 값(일부만 있을 수 있음)을 4칸씩 채운 편집용 값으로 */
export function toEditable(v: DetailSections | null | undefined): DetailSections {
  const f = v?.features ?? [];
  const s = v?.steps ?? [];
  return {
    features: Array.from({ length: Math.max(4, f.length) }, (_, i) => f[i] ?? { icon: "", title: "", desc: "" }),
    steps: Array.from({ length: Math.max(4, s.length) }, (_, i) => s[i] ?? { title: "", desc: "" }),
  };
}

export default function DetailSectionsEditor({ value, onChange }: { value: DetailSections; onChange: (v: DetailSections) => void }) {
  const setFeature = (i: number, key: "icon" | "title" | "desc", v: string) =>
    onChange({ ...value, features: value.features.map((f, j) => (j === i ? { ...f, [key]: v } : f)) });
  const setStep = (i: number, key: "title" | "desc", v: string) =>
    onChange({ ...value, steps: value.steps.map((s, j) => (j === i ? { ...s, [key]: v } : s)) });

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-subtext mb-2">핵심 특징 (이모지 · 제목 14자 안팎 · 설명 60자 안팎) — 이 프로그램만의 특징을 실제 기능으로</p>
        <div className="space-y-2">
          {value.features.map((f, i) => (
            <div key={i} className="grid grid-cols-[3.5rem_1fr] sm:grid-cols-[3.5rem_12rem_1fr] gap-2">
              <input aria-label={`특징 ${i + 1} 이모지`} value={f.icon} onChange={(e) => setFeature(i, "icon", e.target.value)} className="input-dark text-center" placeholder="✨" />
              <input aria-label={`특징 ${i + 1} 제목`} value={f.title} onChange={(e) => setFeature(i, "title", e.target.value)} className="input-dark" placeholder={`특징 ${i + 1} 제목`} />
              <input aria-label={`특징 ${i + 1} 설명`} value={f.desc} onChange={(e) => setFeature(i, "desc", e.target.value)} className="input-dark col-span-2 sm:col-span-1" placeholder="설명" />
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs text-subtext mb-2">실제 사용 순서 (단계 제목 12자 안팎 · 설명 50자 안팎) — 프로그램 화면의 작업 흐름 순서대로</p>
        <div className="space-y-2">
          {value.steps.map((s, i) => (
            <div key={i} className="grid grid-cols-[2rem_1fr] sm:grid-cols-[2rem_12rem_1fr] gap-2 items-center">
              <span className="text-gold font-bold text-sm">{String(i + 1).padStart(2, "0")}</span>
              <input aria-label={`단계 ${i + 1} 제목`} value={s.title} onChange={(e) => setStep(i, "title", e.target.value)} className="input-dark" placeholder={`단계 ${i + 1} 제목`} />
              <input aria-label={`단계 ${i + 1} 설명`} value={s.desc} onChange={(e) => setStep(i, "desc", e.target.value)} className="input-dark col-span-2 sm:col-span-1" placeholder="설명" />
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-subtext">비워 둔 줄은 저장하지 않습니다. 모두 비우면 상세 페이지에서 두 묶음이 표시되지 않습니다.</p>
    </div>
  );
}
