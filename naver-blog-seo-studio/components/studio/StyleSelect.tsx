"use client";

// BLC-08b (2026-10-22): 「새 글 만들기」·「자료부터 집필」의 「내 문체 적용」 선택칸 — 승인이 유효한 내 문체만 고를 수 있다(기본 = 적용 안 함).
import { useEffect, useState } from "react";
import { STYLE_STRENGTHS, type StyleStrength } from "@/lib/styleStrength";

type StyleItem = { id: string; name: string; approval_valid?: boolean };

// D-1: strength·onStrengthChange를 넘기면 문체를 골랐을 때 「반영 세기」 3칸을 함께 보여 준다.
export function StyleSelect({ value, onChange, onManage, strength, onStrengthChange }: { value: string; onChange: (id: string) => void; onManage?: () => void; strength?: StyleStrength; onStrengthChange?: (value: StyleStrength) => void }) {
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
      {value && strength && onStrengthChange && (
        <div role="radiogroup" aria-label="문체 반영 세기" style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: "6px 14px" }}>
          {STYLE_STRENGTHS.map((x) => (
            <label key={x.key} style={{ display: "inline-flex", alignItems: "center", gap: 4, minHeight: 28 }}>
              <input type="radio" name="style-strength" value={x.key} checked={strength === x.key} onChange={() => onStrengthChange(x.key)} />{x.label}
            </label>
          ))}
          <small style={{ flexBasis: "100%" }}>{STYLE_STRENGTHS.find((x) => x.key === strength)?.hint}</small>
        </div>
      )}
    </div>
  );
}
