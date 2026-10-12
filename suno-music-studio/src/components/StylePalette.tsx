"use client";
import { useState } from "react";
import { type Brief, type SavedStyle } from "@/lib/studio/config";
import {
  STYLE_PALETTE,
  joinTags,
  automaticExclude,
} from "@/lib/studio/catalog";
import { styleIssues } from "@/lib/studio/validation";
export function StylePalette({
  brief,
  onChange,
  busy,
  styles,
  onSave,
  notice,
}: {
  brief: Brief;
  onChange: (b: Brief) => void;
  busy: boolean;
  styles: SavedStyle[];
  onSave: (name: string) => void;
  notice: (s: string) => void;
}) {
  const [category, setCategory] = useState("장르"),
    [query, setQuery] = useState(""),
    [custom, setCustom] = useState(""),
    [name, setName] = useState("");
  const tags = Object.entries(STYLE_PALETTE)
    .flatMap(([c, vs]) => vs.map((tag) => ({ c, tag })))
    .filter(
      (v) =>
        (query || v.c === category) &&
        v.tag.toLowerCase().includes(query.trim().toLowerCase()),
    );
  const current = brief.style
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const selected = (tag: string) =>
    current.some((t) => t.toLowerCase() === tag.toLowerCase());
  function add(tag: string) {
    if (!tag.trim() || /[^\x20-\x7E]/.test(tag)) {
      notice("영문 음악 용어로 태그를 입력해 주세요.");
      return;
    }
    const bpm = tag.match(/^(\d{2,3}) BPM$/i);
    const base = bpm
      ? current.filter((t) => !/^\d{2,3} BPM$/i.test(t))
      : current;
    const style = joinTags(base.join(", "), [tag]);
    if (style.length > 1000) {
      notice("Style은 1,000자 이내로 정리해 주세요.");
      return;
    }
    onChange({
      ...brief,
      style,
      ...(bpm ? { bpm: Math.min(320, Math.max(40, Number(bpm[1]))) } : {}),
    });
  }
  return (
    <fieldset disabled={busy} className="style-palette">
      <h3>Style 태그 조합</h3>
      <label>
        태그 검색
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="장르·악기·보컬·드럼·이펙트 검색"
        />
      </label>
      <div className="actions">
        {Object.keys(STYLE_PALETTE).map((c) => (
          <button
            key={c}
            aria-pressed={category === c}
            className={category === c ? "selected" : ""}
            onClick={() => {
              setCategory(c);
              setQuery("");
            }}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="tags palette-options">
        {tags.map(({ c, tag }) => (
          <button
            key={`${c}:${tag}`}
            aria-pressed={selected(tag)}
            onClick={() =>
              selected(tag)
                ? onChange({
                    ...brief,
                    style: current
                      .filter((t) => t.toLowerCase() !== tag.toLowerCase())
                      .join(", "),
                  })
                : add(tag)
            }
          >
            {tag}
          </button>
        ))}
      </div>
      <label>
        직접 태그 추가
        <div className="tag-entry">
          <input
            value={custom}
            maxLength={180}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add(custom);
                setCustom("");
              }
            }}
            placeholder="예: intimate piano, syncopated bass"
          />
          <button
            onClick={() => {
              add(custom);
              setCustom("");
            }}
          >
            추가
          </button>
        </div>
      </label>
      <div className="tags">
        {current.map((tag) => (
          <button
            key={tag}
            aria-label={`${tag} 태그 제거`}
            onClick={() =>
              onChange({
                ...brief,
                style: current.filter((t) => t !== tag).join(", "),
              })
            }
          >
            {tag} ×
          </button>
        ))}
      </div>
      <p className="muted">자동 제외: {automaticExclude(brief) || "없음"}</p>
      <label>
        내 Style 이름
        <input
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="보관할 스타일 이름"
        />
      </label>
      <button
        disabled={busy || !name.trim() || styleIssues(brief.style).length > 0}
        onClick={() => {
          onSave(name.trim());
          setName("");
        }}
      >
        현재 Style 프리셋 저장
      </button>
      {!!styles.length && (
        <label>
          내 Style 불러오기
          <select
            defaultValue=""
            onChange={(e) => {
              const s = styles.find((s) => s.id === e.target.value);
              if (s)
                onChange({
                  ...brief,
                  style: s.style,
                  exclude: s.exclude,
                  bpm: s.bpm,
                  presetId: "",
                  styleGroup: "",
                  locked: true,
                  generateStyle: false,
                });
              e.target.value = "";
            }}
          >
            <option value="">저장한 Style 선택 ({styles.length}/100)</option>
            {styles.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </fieldset>
  );
}
