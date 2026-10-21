"use client";
import { useState } from "react";
import { ERAS, MARKETS, type Brief } from "@/lib/studio/config";
import {
  LIBRARY,
  ERA_LABELS,
  filterLibrary,
  applyPreset,
  type LibraryPreset,
  type LibraryFilter,
} from "@/lib/studio/catalog";
export function LibraryGallery({
  brief,
  busy,
  onApply,
  notice,
  dance = false,
  onSeed,
}: {
  brief: Brief;
  busy: boolean;
  onApply: (b: Brief) => void;
  notice: (s: string) => void;
  dance?: boolean;
  onSeed?: (b: Brief) => void;
}) {
  const [filter, setFilter] = useState<LibraryFilter>({
    market: "",
    era: "",
    group: "",
    type: dance ? "dance" : "",
    query: "",
    bpm: "",
  });
  const [page, setPage] = useState(0);
  const scoped = (items: LibraryPreset[]) =>
    items.filter((p) => (dance ? p.type === "dance" : p.type !== "dance"));
  const matches = scoped(filterLibrary(filter));
  const groups = [
    ...new Set(
      scoped(filterLibrary({ ...filter, group: "", query: "", bpm: "" })).map(
        (p) => p.group,
      ),
    ),
  ];
  const families = [
    ...new Set(LIBRARY.filter((p) => p.type === "dance").map((p) => p.group)),
  ];
  function update(key: keyof LibraryFilter, value: string) {
    setFilter((f) => ({
      ...f,
      [key]: value,
      ...(["market", "era", "type"].includes(key) ? { group: "" } : {}),
      ...(key === "market" ? { era: "" } : {}),
    }));
    setPage(0);
  }
  async function copy(style: string) {
    try {
      await navigator.clipboard.writeText(style);
      notice("Style을 복사했습니다.");
    } catch {
      notice("클립보드 권한을 확인해 주세요.");
    }
  }
  return (
    <fieldset disabled={busy} className="library-picker gallery">
      <div className="section-title">
        <h2>{dance ? "200 댄스 스타일 가이드" : "프리셋 라이브러리"}</h2>
        <span className="pill">
          {matches.length}/{dance ? 200 : 461}
        </span>
      </div>
      <p className="muted">
        이름·분류·BPM은 원본 선택 항목을 참고했습니다. 표시 Style은 음악
        속성으로 구성한 자체 기획 예시입니다.
      </p>
      {dance ? (
        <div className="tag-chips family-filters">
          {["", ...families].map((g) => (
            <button
              key={g}
              aria-pressed={filter.group === g}
              className={filter.group === g ? "selected" : ""}
              onClick={() => update("group", g)}
            >
              {g || "전체 (ALL)"}
            </button>
          ))}
        </div>
      ) : (
        <div className="tag-chips">
          {["", ...MARKETS].map((m) => (
            <button
              key={m}
              aria-pressed={filter.market === m}
              className={filter.market === m ? "selected" : ""}
              onClick={() => update("market", m)}
            >
              {m || "전체"}
            </button>
          ))}
        </div>
      )}
      <div className="gallery-filters">
        <label>
          검색
          <input
            aria-label="라이브러리 검색"
            placeholder="이름·스타일·장르·BPM"
            value={filter.query}
            onChange={(e) => update("query", e.target.value)}
          />
        </label>
        {!dance && (
          <>
            <label>
              시대
              <select
                aria-label="프리셋 시대"
                value={filter.era}
                onChange={(e) => update("era", e.target.value)}
              >
                <option value="">전체 시대</option>
                {ERAS.map((v) => (
                  <option key={v} value={v}>
                    {ERA_LABELS[v] || v}
                  </option>
                ))}
              </select>
            </label>
            <label>
              스타일 그룹
              <select
                aria-label="프리셋 그룹"
                value={filter.group}
                onChange={(e) => update("group", e.target.value)}
              >
                <option value="">전체 그룹</option>
                {groups.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </label>
            <label>
              유형
              <select
                aria-label="프리셋 유형"
                value={filter.type}
                onChange={(e) => update("type", e.target.value)}
              >
                <option value="">전체 유형</option>
                <option value="template">스타일 템플릿</option>
                <option value="reference">아티스트 참고</option>
              </select>
            </label>
          </>
        )}
        {dance && (
          <label>
            BPM 범위
            <select
              aria-label="댄스 BPM"
              value={filter.bpm}
              onChange={(e) => update("bpm", e.target.value)}
            >
              <option value="">전체 BPM</option>
              {[
                "40-110",
                "110-125",
                "125-135",
                "135-145",
                "145-160",
                "160-200",
                "200-321",
              ].map((v) => (
                <option key={v} value={v}>
                  {v.replace("-", "~")} BPM
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="gallery-cards">
        {matches.slice(page * 12, page * 12 + 12).map((p) => (
          <GalleryCard
            key={p.id}
            preset={p}
            brief={brief}
            dance={dance}
            onApply={onApply}
            onSeed={onSeed}
            copy={copy}
          />
        ))}
      </div>
      {!matches.length && (
        <p className="empty-state">
          검색 결과가 없습니다. 분류나 검색어를 바꿔 주세요.
        </p>
      )}
      {matches.length > 12 && (
        <div className="actions gallery-pagination">
          <button
            disabled={busy || page === 0}
            onClick={() => setPage(page - 1)}
          >
            이전
          </button>
          <span>
            {page + 1}/{Math.ceil(matches.length / 12)}
          </span>
          <button
            disabled={busy || (page + 1) * 12 >= matches.length}
            onClick={() => setPage(page + 1)}
          >
            다음
          </button>
        </div>
      )}
    </fieldset>
  );
}
function GalleryCard({
  preset: p,
  brief,
  dance,
  onApply,
  onSeed,
  copy,
}: {
  preset: LibraryPreset;
  brief: Brief;
  dance: boolean;
  onApply: (b: Brief) => void;
  onSeed?: (b: Brief) => void;
  copy: (s: string) => void;
}) {
  const [variant, setVariant] = useState("기본");
  const preview = applyPreset(brief, p, variant);
  return (
    <article className="gallery-card">
      <div className="section-title">
        <strong>{p.name}</strong>
        <span className="muted">{p.bpm} BPM</span>
      </div>
      <p className="muted">
        {p.group} · {p.eras.map((e) => ERA_LABELS[e] || e).join(" / ")}
      </p>
      {p.type === "reference" && (
        <label>
          음악 방향
          <select
            aria-label={`${p.name} 음악 방향`}
            value={variant}
            onChange={(e) => setVariant(e.target.value)}
          >
            {["기본", "발라드", "축제"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
      )}
      <p className="mono">{preview.style}</p>
      <p className="muted">구조: {preview.structure}</p>
      <div className="actions">
        <button
          className="primary"
          onClick={() => (dance && onSeed ? onSeed(preview) : onApply(preview))}
        >
          {dance ? "조합기에 로드" : "빌더에 로드"}
        </button>
        <button onClick={() => copy(preview.style)}>STYLE 복사</button>
      </div>
    </article>
  );
}
