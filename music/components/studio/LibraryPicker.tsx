"use client";
import { useState } from "react";
import { ERAS, MARKETS, type Brief } from "@/lib/studio/config";
import {
  LIBRARY,
  ERA_LABELS,
  filterLibrary,
  applyPreset,
  type LibraryFilter,
} from "@/lib/studio/catalog";
export function LibraryPicker({
  brief,
  onChange,
  busy,
  compact = false,
}: {
  brief: Brief;
  onChange: (b: Brief) => void;
  busy: boolean;
  compact?: boolean;
}) {
  const [filter, setFilter] = useState<LibraryFilter>({
    market: "",
    era: "",
    group: "",
    type: "",
    query: "",
    bpm: "",
  });
  const [selected, setSelected] = useState("");
  const [variant, setVariant] = useState("기본");
  const [page, setPage] = useState(0);
  const pool = filterLibrary({ ...filter, group: "", query: "", bpm: "" });
  const groups = [...new Set(pool.map((p) => p.group))].sort((a, b) =>
    a.localeCompare(b, "ko"),
  );
  const matches = filterLibrary(filter);
  const candidate = matches.find((p) => p.id === selected);
  const preview = candidate ? applyPreset(brief, candidate, variant) : null;
  function update(key: keyof LibraryFilter, value: string) {
    setFilter((f) => ({
      ...f,
      [key]: value,
      ...(["market", "era", "type"].includes(key)
        ? { group: "", bpm: "" }
        : {}),
      ...(["market", "type"].includes(key) ? { era: "" } : {}),
    }));
    setSelected("");
    setVariant("기본");
    setPage(0);
  }
  return (
    <fieldset disabled={busy} className="library-picker">
      <p className="muted">
        프리셋 461개 · 댄스 200개. 이름·시대·장르·BPM을 참고하여 음악 속성으로
        Style을 구성합니다.
      </p>
      <label>
        프리셋 검색
        <input
          value={filter.query}
          onChange={(e) => update("query", e.target.value)}
          placeholder="아티스트·장르·스타일 이름·BPM"
        />
      </label>
      <div className="two-columns">
        <label>
          음악 분류
          <select
            aria-label="음악 분류"
            value={filter.market}
            onChange={(e) => update("market", e.target.value)}
          >
            <option value="">전체</option>
            {MARKETS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label>
          시대
          <select
            aria-label="시대"
            value={filter.era}
            onChange={(e) => update("era", e.target.value)}
          >
            <option value="">전체 시대</option>
            {ERAS.filter((e) =>
              LIBRARY.some(
                (p) =>
                  (!filter.market || p.markets.includes(filter.market)) &&
                  (!filter.type || p.type === filter.type) &&
                  p.eras.includes(e),
              ),
            ).map((e) => (
              <option key={e} value={e}>
                {ERA_LABELS[e] || e}
              </option>
            ))}
          </select>
        </label>
        <label>
          유형
          <select
            aria-label="유형"
            value={filter.type}
            onChange={(e) => update("type", e.target.value)}
          >
            <option value="">전체 유형</option>
            <option value="template">스타일 템플릿</option>
            <option value="reference">아티스트 참고</option>
            <option value="dance">댄스 그루브</option>
          </select>
        </label>
        <label>
          {filter.type === "dance" ? "댄스 계열" : "스타일 그룹"}
          <select
            aria-label="스타일 그룹"
            value={filter.group}
            onChange={(e) => update("group", e.target.value)}
          >
            <option value="">전체 그룹</option>
            {groups.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </label>
      </div>
      {filter.type === "dance" && (
        <label>
          BPM 범위
          <select
            aria-label="BPM 범위"
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
      <label>
        프리셋 선택 <span className="muted">{matches.length}개</span>
        <select
          aria-label="프리셋 선택"
          value={candidate?.id || ""}
          onChange={(e) => {
            setSelected(e.target.value);
            setVariant("기본");
          }}
        >
          <option value="">선택해 주세요</option>
          {matches.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.bpm} BPM
            </option>
          ))}
        </select>
      </label>
      {candidate && preview && (
        <div className="preset-preview">
          <strong>{candidate.name}</strong>
          <p className="muted">
            {candidate.group} ·{" "}
            {candidate.eras.map((e) => ERA_LABELS[e] || e).join(" / ")}
          </p>
          {candidate.type === "reference" && (
            <label>
              음악 방향
              <select
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
          <p className="muted">
            {preview.structure} · {preview.bpm} BPM
          </p>
          <button className="primary" onClick={() => onChange(preview)}>
            선택한 프리셋을 기준 Style로 적용
          </button>
          <p className="muted">
            기존 제목·가사는 유지합니다. 기준 Style을 잠그고 AI의 Style 생성
            선택을 해제합니다.
          </p>
        </div>
      )}
      {!compact && (
        <>
          <div className="preset-grid">
            {matches.slice(page * 12, page * 12 + 12).map((p) => (
              <button
                className={`preset ${selected === p.id ? "selected" : ""}`}
                key={p.id}
                onClick={() => {
                  setSelected(p.id);
                  setVariant("기본");
                }}
              >
                <strong>{p.name}</strong>
                <span>{p.group}</span>
                <small>
                  {p.eras.map((e) => ERA_LABELS[e] || e).join(" / ")} · {p.bpm}{" "}
                  BPM
                </small>
              </button>
            ))}
          </div>
          {matches.length > 12 && (
            <div className="actions">
              <button
                disabled={busy || page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                이전
              </button>
              <span>
                {page + 1} / {Math.ceil(matches.length / 12)}
              </span>
              <button
                disabled={busy || (page + 1) * 12 >= matches.length}
                onClick={() => setPage((p) => p + 1)}
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
      {!matches.length && (
        <p className="muted">
          일치하는 프리셋이 없습니다. 검색어나 필터를 바꿔 주세요.
        </p>
      )}
    </fieldset>
  );
}
