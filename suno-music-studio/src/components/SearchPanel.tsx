"use client";
import { useState } from "react";
import { MODELS, type Brief, type Track } from "@/lib/studio/config";
import { type Research } from "@/lib/studio/research";
import { LibraryGallery } from "./LibraryGallery";
export function SearchPanel({
  brief,
  busy,
  onChange,
  onSearch,
  result,
  research,
  onApply,
  onApplyBrief,
  notice,
}: {
  brief: Brief;
  busy: boolean;
  onChange: (b: Brief) => void;
  onSearch: (query: string, useWeb: boolean) => void;
  result: Track[];
  research: Research | null;
  onApply: (t: Track) => void;
  onApplyBrief: (b: Brief) => void;
  notice: (s: string) => void;
}) {
  const [query, setQuery] = useState(""),
    [useWeb, setUseWeb] = useState(false),
    [mode, setMode] = useState("ai");
  return (
    <>
      <section className="card">
        <div className="section-title">
          <h2>음악 검색</h2>
          <div className="actions">
            <button
              className={mode === "ai" ? "selected" : ""}
              aria-pressed={mode === "ai"}
              onClick={() => setMode("ai")}
            >
              AI 검색
            </button>
            <button
              className={mode === "local" ? "selected" : ""}
              aria-pressed={mode === "local"}
              onClick={() => setMode("local")}
            >
              내장 목록 검색
            </button>
          </div>
        </div>
        {mode === "ai" && (
          <fieldset disabled={busy}>
            <div className="actions">
              {(["anthropic", "openai", "gemini"] as const).map((p) => (
                <button
                  key={p}
                  className={brief.provider === p ? "selected" : ""}
                  aria-pressed={brief.provider === p}
                  onClick={() => {
                    const m = MODELS.find((m) => m.provider === p)!;
                    onChange({
                      ...brief,
                      provider: p,
                      model: m.id,
                      customModel: false,
                    });
                  }}
                >
                  {p === "anthropic"
                    ? "Claude"
                    : p === "openai"
                      ? "OpenAI"
                      : "Gemini"}
                </button>
              ))}
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={useWeb}
                onChange={(e) => setUseWeb(e.target.checked)}
              />
              웹 검색 사용
            </label>
            <p className="muted">
              {useWeb
                ? "공급사의 웹 검색 도구와 스타일 기획을 차례로 호출합니다. 본인 API의 검색·생성 비용이 발생할 수 있으며, 검색 지원 모델이 필요합니다."
                : "웹 검색 OFF — 모델이 6가지 음악 방향을 제안합니다. 실제 대표곡·최신 정보로 표시하지 않습니다."}
            </p>
            <label>
              아티스트·곡명 또는 만들고 싶은 음악
              <input
                aria-label="AI 음악 검색어"
                maxLength={300}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && query.trim() && !busy) {
                    e.preventDefault();
                    onSearch(query, useWeb);
                  }
                }}
                placeholder="예: 도시 야경의 신스 팝 · 90년대 한국 발라드"
              />
            </label>
            <div className="actions">
              <button
                className="primary"
                disabled={!query.trim()}
                onClick={() => onSearch(query, useWeb)}
              >
                검색
              </button>
              {[
                "도시 야경 신스 팝",
                "90년대 한국 발라드",
                "따뜻한 재즈 피아노",
                "에너지 넘치는 댄스",
              ].map((q) => (
                <button key={q} onClick={() => setQuery(q)}>
                  {q}
                </button>
              ))}
            </div>
          </fieldset>
        )}
      </section>
      {mode === "local" ? (
        <section className="card">
          <LibraryGallery
            brief={brief}
            busy={busy}
            onApply={onApplyBrief}
            notice={notice}
          />
        </section>
      ) : (
        <>
          {research && (
            <section className="card">
              <h2>웹에서 확인한 참고 정보</h2>
              <p className="research-text">{research.text}</p>
              <div className="source-links">
                {research.sources.map((s) => (
                  <a
                    key={s.url}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {s.title}
                  </a>
                ))}
              </div>
              {research.suggestionsHtml && (
                <iframe
                  title="Google 검색 제안"
                  className="search-attribution"
                  sandbox="allow-popups allow-popups-to-escape-sandbox"
                  referrerPolicy="no-referrer"
                  srcDoc={research.suggestionsHtml}
                />
              )}
            </section>
          )}
          {!!result.length && (
            <section className="card">
              <h2>음악 방향 제안 ({result.length})</h2>
              <p className="muted">
                새 곡 기획 예시입니다. 위 참고 정보의 실제 대표곡 목록과 구분해
                사용하세요.
              </p>
              <div className="gallery-cards">
                {result.map((t) => (
                  <article className="gallery-card" key={t.id}>
                    <h3>{t.title}</h3>
                    <p>{t.summary}</p>
                    <p className="mono">{t.style}</p>
                    <div className="actions">
                      <button
                        className="primary"
                        disabled={busy}
                        onClick={() => onApply(t)}
                      >
                        빌더에 로드
                      </button>
                      <button
                        disabled={busy}
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(t.style);
                            notice("Style을 복사했습니다.");
                          } catch {
                            notice("클립보드 권한을 확인해 주세요.");
                          }
                        }}
                      >
                        STYLE 복사
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
