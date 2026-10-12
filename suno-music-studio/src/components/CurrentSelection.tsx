"use client";
import { type Brief } from "@/lib/studio/config";
import { ERA_LABELS, LIBRARY } from "@/lib/studio/catalog";
export function CurrentSelection({ brief }: { brief: Brief }) {
  const preset = LIBRARY.find((p) => p.id === brief.presetId);
  return (
    <section className="card current-selection" aria-label="현재 선택">
      <div className="section-title">
        <h2>현재 선택</h2>
        <span className="muted">읽기 전용</span>
      </div>
      <dl>
        <dt>참고 프리셋</dt>
        <dd>{preset?.name || "직접 작성 · 내 Style"}</dd>
        <dt>분류 · 시대 · 그룹</dt>
        <dd>
          {brief.market} · {ERA_LABELS[brief.era] || brief.era}
          {brief.styleGroup ? " · " + brief.styleGroup : ""}
        </dd>
        <dt>곡 구조 · 템포</dt>
        <dd>
          {brief.structure} · {brief.bpm} BPM
        </dd>
        <dt>보컬</dt>
        <dd>
          {brief.instrumental
            ? "연주곡"
            : brief.voice === "자연스러운 보컬"
              ? brief.presetVoice
              : brief.voice}
          {!brief.instrumental && brief.differentRapVoice && brief.rapPct > 0
            ? " / 랩: " + brief.rapVoice
            : ""}
        </dd>
      </dl>
      <p className="muted">
        {brief.locked ? "Style 잠금 · AI 변경 제한" : "AI Style 작성 허용"} ·
        한글 {100 - brief.englishPct}% · 랩 {brief.rapPct}%
      </p>
    </section>
  );
}
