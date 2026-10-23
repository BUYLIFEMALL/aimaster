"use client";
import { useState } from "react";
import { STYLE_PALETTE } from "@/lib/studio/catalog";
import { composeDance } from "@/lib/studio/workflows";
import { type Brief } from "@/lib/studio/config";
export function DanceComposer({
  brief,
  seed,
  onSeed,
  busy,
  onApply,
  notice,
  picked,
  onPicked,
}: {
  brief: Brief;
  seed: Brief;
  onSeed: (b: Brief) => void;
  busy: boolean;
  onApply: (b: Brief) => void;
  notice: (s: string) => void;
  picked: string[];
  onPicked: (tags: string[]) => void;
}) {
  const [category, setCategory] = useState("드럼·리듬"),
    [query, setQuery] = useState("");
  const composed = composeDance(seed.style, picked),
    output = composed.style;
  function toggle(tag: string) {
    onPicked(
      picked.includes(tag) ? picked.filter((t) => t !== tag) : [...picked, tag],
    );
  }
  return (
    <section className="card dance-composer">
      <h2>댄스 태그 조합기</h2>
      <p className="muted">
        왼쪽 스타일을 로드한 뒤 태그를 더하고, 확인한 결과를 빌더로 보냅니다.
      </p>
      <fieldset disabled={busy}>
        <label>
          베이스 스타일 (시드)
          <textarea
            aria-label="댄스 시드"
            value={seed.style}
            maxLength={1000}
            rows={4}
            onChange={(e) => onSeed({ ...seed, style: e.target.value })}
          />
        </label>
        <div className="tag-chips">
          {Object.keys(STYLE_PALETTE).map((c) => (
            <button
              aria-pressed={category === c}
              className={category === c ? "selected" : ""}
              key={c}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <label>
          태그 검색
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="영문 태그 검색"
          />
        </label>
        <div className="tag-chips palette-options">
          {STYLE_PALETTE[category]
            .filter((t) => t.toLowerCase().includes(query.toLowerCase()))
            .map((t) => (
              <button
                key={t}
                aria-pressed={picked.includes(t)}
                className={picked.includes(t) ? "selected" : ""}
                onClick={() => toggle(t)}
              >
                {t}
              </button>
            ))}
        </div>
        <h3>선택된 태그</h3>
        <div className="tag-chips">
          {picked.map((t) => (
            <button key={t} aria-label={`${t} 제거`} onClick={() => toggle(t)}>
              {t} ×
            </button>
          ))}
          {!picked.length && (
            <span className="muted">추가할 태그를 선택하세요.</span>
          )}
        </div>
        <label>
          조합된 최종 STYLE{" "}
          <span className={output.length > 1000 ? "error" : "muted"}>
            {output.length}/1000
          </span>
          <textarea
            aria-label="댄스 최종 Style"
            rows={6}
            value={output}
            readOnly
          />
        </label>
        <div className="actions">
          <button
            disabled={!output || output.length > 1000}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(output);
                notice("댄스 Style을 복사했습니다.");
              } catch {
                notice("클립보드 권한을 확인해 주세요.");
              }
            }}
          >
            STYLE 복사
          </button>
          <button
            className="primary"
            disabled={!output || output.length > 1000}
            onClick={() =>
              onApply({
                ...brief,
                ...seed,
                concept: brief.concept,
                intent: brief.intent,
                style: output,
                bpm: composed.bpm || seed.bpm,
                locked: true,
                generateStyle: false,
              })
            }
          >
            빌더로 보내기
          </button>
          <button
            onClick={() => {
              onSeed({ ...seed, style: "" });
              onPicked([]);
            }}
          >
            조합 초기화
          </button>
        </div>
      </fieldset>
    </section>
  );
}
