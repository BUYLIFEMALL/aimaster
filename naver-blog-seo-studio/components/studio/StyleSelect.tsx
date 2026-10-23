"use client";

// BLC-08b (2026-10-22): 「새 글 만들기」·「자료부터 집필」의 「내 문체 적용」 선택칸 — 승인이 유효한 내 문체만 고를 수 있다(기본 = 적용 안 함).
import { useEffect, useState } from "react";

type StyleItem = { id: string; name: string; approval_valid?: boolean };

export function StyleSelect({ value, onChange, onManage }: { value: string; onChange: (id: string) => void; onManage?: () => void }) {
  const [styles, setStyles] = useState<StyleItem[] | null>(null);
  useEffect(() => {
    fetch("/api/styles").then((r) => r.json()).then((d: { styles?: StyleItem[] }) => setStyles((d.styles ?? []).filter((s) => s.approval_valid))).catch(() => setStyles([]));
  }, []);
  useEffect(() => {
    if (styles && value && !styles.some((s) => s.id === value)) onChange("");
  }, [styles, value, onChange]);
  return (
    <div className="field">
      <label htmlFor="style-select">내 문체 적용 (선택)</label>
      <select id="style-select" value={value} onChange={(e) => onChange(e.target.value)} disabled={!styles?.length}>
        <option value="">적용 안 함 (기본)</option>
        {(styles ?? []).map((s) => <option key={s.id} value={s.id}>✍️ {s.name}</option>)}
      </select>
      <small>{styles && !styles.length ? <>승인한 내 문체가 없습니다. {onManage && <button type="button" className="text-button" onClick={onManage}>「내 문체」에서 만들기</button>}</> : "승인한 내 문체의 말투·문장·구성 습관만 따릅니다. 사실·경험은 지어내지 않습니다."}</small>
    </div>
  );
}
