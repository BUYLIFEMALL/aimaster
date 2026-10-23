"use client";
import { useState } from "react";
import {
  VOICES,
  ARCS,
  type Brief,
  type Album,
  type Track,
  type SavedStyle,
  type SavedItem,
} from "@/lib/studio/config";
import { ALBUM_MOODS, castTrack } from "@/lib/studio/workflows";
import { missingTracks } from "@/lib/studio/storage";
import { automaticExclude } from "@/lib/studio/catalog";
import { BriefControls } from "./BriefControls";
import { CurrentSelection } from "./CurrentSelection";
import { AlbumReferencePicker } from "./AlbumReferencePicker";
import { TrackEditor, downloadFile, trackProblems } from "./TrackEditor";
export function AlbumPanel({
  brief,
  album,
  busy,
  onChange,
  onGenerate,
  onLyrics,
  onTrack,
  onSave,
  onImportBuilder,
  onApplyStyle,
  onArrange,
  onReset,
  onUndo,
  canUndo,
  styles,
  saved,
  onLoad,
  notice,
  onImportAlbum,
  onAlbumChange,
  onMove,
}: {
  brief: Brief;
  album: Album | null;
  busy: boolean;
  onChange: (b: Brief) => void;
  onGenerate: () => void;
  onLyrics: (ids: string[], regenerate?: boolean) => void;
  onTrack: (t: Track) => void;
  onSave: () => void;
  onImportBuilder: () => void;
  onApplyStyle: (s: SavedStyle) => void;
  onArrange: () => void;
  onReset: () => void;
  onUndo: () => void;
  canUndo: boolean;
  styles: SavedStyle[];
  saved: SavedItem[];
  onLoad: (item: SavedItem) => void;
  notice: (s: string) => void;
  onImportAlbum: (file: File) => Promise<void>;
  onAlbumChange: (album: Album) => void;
  onMove: (id: string, offset: number) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [opened, setOpened] = useState<Set<string>>(() => new Set());
  const [savedStyle, setSavedStyle] = useState("");
  const [showSavedStyles, setShowSavedStyles] = useState(false);
  const moods = brief.mood.split(",").map((t) => t.trim());
  function cast(t: Track, voice: string, rap: string) {
    try {
      onTrack(castTrack(brief, t, voice, rap));
    } catch (e) {
      notice(e instanceof Error ? e.message : "보컬 적용 실패");
    }
  }
  const pending = album ? missingTracks(album.tracks) : [];
  const selectedPending = pending.filter((t) => selected.has(t.id));
  function toggle(id: string) {
    setSelected((old) => {
      const next = new Set(old);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  return (
    <div className="album-layout">
      <div className="album-left">
        <section className="card album-settings">
          <h2>앨범 컨셉</h2>
          <fieldset disabled={busy}>
            <label>
              앨범 주제 / 컨셉 (필수)
              <textarea
                aria-label="앨범 컨셉"
                rows={4}
                maxLength={1500}
                value={brief.concept}
                onChange={(e) =>
                  onChange({ ...brief, concept: e.target.value })
                }
                placeholder="12곡으로 담고 싶은 이야기와 감정"
              />
            </label>
            <label>
              상세 의도 (선택)
              <textarea
                rows={4}
                maxLength={1500}
                value={brief.intent}
                onChange={(e) => onChange({ ...brief, intent: e.target.value })}
                placeholder="곡별 장면·마지막 결말·피할 단어 등"
              />
            </label>
            <AlbumReferencePicker brief={brief} onChange={onChange} />
            <div className="actions album-import-actions">
              <button onClick={onImportBuilder}>현재 빌더 설정 가져오기</button>
              <button
                aria-expanded={showSavedStyles}
                onClick={() => setShowSavedStyles((v) => !v)}
              >
                저장 프리셋에서 가져오기
              </button>
            </div>
            {showSavedStyles && (
              <label>
                저장 프리셋에서 가져오기
                <select
                  value={savedStyle}
                  onChange={(e) => {
                    setSavedStyle(e.target.value);
                    const s = styles.find((s) => s.id === e.target.value);
                    if (s) onApplyStyle(s);
                  }}
                >
                  <option value="">없음 / 선택</option>
                  {styles.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {!styles.length && (
                  <small className="muted">
                    저장한 Style 프리셋이 없습니다. 빌더·검색에서 먼저
                    저장하세요.
                  </small>
                )}
              </label>
            )}
            <h3>무드 (다중 선택)</h3>
            <div className="tag-chips">
              {ALBUM_MOODS.map(([label, term]) => (
                <button
                  key={term}
                  className={moods.includes(term) ? "selected" : ""}
                  aria-pressed={moods.includes(term)}
                  onClick={() =>
                    onChange({
                      ...brief,
                      mood: (moods.includes(term)
                        ? moods.filter((v) => v !== term)
                        : [...moods, term]
                      )
                        .filter(Boolean)
                        .join(", "),
                    })
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            <label>
              앨범 흐름 (CONCEPT ARC)
              <select
                aria-label="앨범 흐름"
                value={brief.arc}
                onChange={(e) => onChange({ ...brief, arc: e.target.value })}
              >
                {ARCS.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label className="album-language">
              <span>
                가사 언어{" "}
                <span className="muted">
                  한국어 {100 - brief.englishPct}% · 영어 {brief.englishPct}%
                </span>
              </span>
              <input
                type="range"
                aria-label="가사 영문 비율"
                min={0}
                max={100}
                step={5}
                disabled={brief.instrumental}
                value={brief.englishPct}
                onChange={(e) =>
                  onChange({ ...brief, englishPct: Number(e.target.value) })
                }
              />
            </label>
            <div className="actions album-generate-actions">
              <button
                className="primary"
                disabled={busy || !brief.concept.trim()}
                onClick={onGenerate}
              >
                {album ? "앨범 다시 기획" : "앨범 기획 생성"} ({brief.count}곡)
              </button>
              <label className="album-count">
                곡 수
                <select
                  aria-label="앨범 곡 수"
                  value={brief.count}
                  onChange={(e) =>
                    onChange({ ...brief, count: Number(e.target.value) })
                  }
                >
                  {Array.from({ length: 10 }, (_, i) => i + 3).map((n) => (
                    <option key={n} value={n}>
                      {n}곡
                    </option>
                  ))}
                </select>
              </label>
              <button onClick={onReset}>현재 앨범 초기화</button>
              {canUndo && <button onClick={onUndo}>초기화 되돌리기</button>}
            </div>
            {album && (
              <p className="muted">
                성공하면 현재 트랙 목록을 교체합니다. 먼저 보관하거나 JSON으로
                백업해 주세요.
              </p>
            )}
            <details className="advanced-settings album-advanced">
              <summary>AI 모델·보컬·편곡 세부 설정</summary>
              <CurrentSelection brief={brief} />
              <BriefControls
                brief={brief}
                onChange={onChange}
                busy={busy}
                showReference={false}
                showLanguage={false}
              />
            </details>
          </fieldset>
        </section>
        <section className="card album-saved-panel">
          <div className="section-title">
            <h3>저장된 앨범 ({saved.filter((s) => s.draft.album).length})</h3>
            <label className="button import-button">
              앨범 JSON 가져오기
              <input
                aria-label="앨범 JSON 가져오기"
                className="file-input"
                type="file"
                accept=".json,application/json"
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onImportAlbum(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <p className="muted">
            브라우저 초안은 자동 저장됩니다. PC 간 이동은 JSON으로 백업하세요.
          </p>
          {!saved.some((s) => s.draft.album) && (
            <p className="muted">저장된 앨범이 없습니다.</p>
          )}
          {saved
            .filter((s) => s.draft.album)
            .map((s) => (
              <div className="saved-row" key={s.id}>
                <div>
                  <strong>{s.name}</strong>
                  <small>
                    {s.draft.album?.tracks.length}곡 ·{" "}
                    {new Date(s.savedAt).toLocaleDateString("ko-KR")}
                  </small>
                </div>
                <button disabled={busy} onClick={() => onLoad(s)}>
                  불러오기
                </button>
                <button
                  className="download"
                  disabled={busy}
                  onClick={() =>
                    downloadFile(
                      JSON.stringify(
                        {
                          schema: 1,
                          draft: { ...s.draft, song: null },
                          saved: [],
                          styles: [],
                        },
                        null,
                        2,
                      ),
                      "suno-saved-album.json",
                      "application/json",
                    )
                  }
                >
                  JSON 저장
                </button>
              </div>
            ))}
        </section>
      </div>
      <div className="album-results">
        {!album ? (
          <section className="card album-empty">
            <p className="muted">
              앨범 컨셉을 입력하고 ‘앨범 기획 생성’을 누르면 여기에{" "}
              {brief.count}곡 트랙리스트가 표시됩니다.
            </p>
          </section>
        ) : (
          <>
            <section className="card">
              <div className="section-title">
                <h2>{album.title}</h2>
                <span className="pill">
                  {
                    album.tracks.filter(
                      (t) => brief.instrumental || t.lyrics.trim(),
                    ).length
                  }
                  /{album.tracks.length}곡 준비
                </span>
              </div>
              <div className="two-columns">
                <label>
                  앨범 제목
                  <input
                    aria-label="앨범 제목"
                    value={album.title}
                    maxLength={100}
                    disabled={busy}
                    onChange={(e) =>
                      onAlbumChange({ ...album, title: e.target.value })
                    }
                  />
                </label>
                <label>
                  앨범 설명
                  <textarea
                    aria-label="앨범 설명"
                    value={album.summary}
                    maxLength={1000}
                    disabled={busy}
                    onChange={(e) =>
                      onAlbumChange({ ...album, summary: e.target.value })
                    }
                  />
                </label>
              </div>
              <p className="muted">
                최종 확인{" "}
                {
                  album.tracks.filter(
                    (t) =>
                      t.reviewed &&
                      !trackProblems(t, brief.instrumental).length,
                  ).length
                }
                /{album.tracks.length}곡 · 작사 대기{" "}
                {brief.instrumental ? 0 : pending.length}곡
              </p>
              <div className="actions">
                <button
                  className="primary"
                  disabled={busy || brief.instrumental || !pending.length}
                  onClick={() => onLyrics(pending.map((t) => t.id))}
                >
                  미완성 가사 이어 만들기 ({pending.length}곡)
                </button>
                <button disabled={busy} onClick={onSave}>
                  현재 앨범 보관
                </button>
                <button
                  className="download"
                  disabled={busy}
                  onClick={() =>
                    downloadFile(
                      JSON.stringify(
                        {
                          schema: 1,
                          draft: {
                            brief,
                            song: null,
                            album,
                            albumBrief: brief,
                          },
                          saved: [],
                          styles: [],
                        },
                        null,
                        2,
                      ),
                      "suno-album.json",
                      "application/json",
                    )
                  }
                >
                  앨범 JSON 저장
                </button>
              </div>
              <div className="actions">
                <button
                  disabled={busy}
                  onClick={() =>
                    setSelected(new Set(album.tracks.map((t) => t.id)))
                  }
                >
                  트랙 전체 선택
                </button>
                <button disabled={busy} onClick={() => setSelected(new Set())}>
                  트랙 선택 해제
                </button>
                <button
                  className="primary"
                  disabled={
                    busy || brief.instrumental || !selectedPending.length
                  }
                  onClick={() => onLyrics(selectedPending.map((t) => t.id))}
                >
                  선택 트랙 작사 ({selectedPending.length}곡)
                </button>
                <button
                  onClick={() =>
                    setOpened(new Set(album.tracks.map((t) => t.id)))
                  }
                >
                  전체 펼치기
                </button>
                <button onClick={() => setOpened(new Set())}>전체 접기</button>
              </div>
              <p className="muted">
                작사는 순서대로 곡마다 1회 호출하며 본인 API 비용이 발생할 수
                있습니다. 완료된 가사는 건너뜁니다.
              </p>
              <label>
                자동 제외 스타일
                <input readOnly value={automaticExclude(brief)} />
              </label>
              <button disabled={busy} onClick={onArrange}>
                선택 편곡을 모든 곡의 Style에 적용
              </button>
            </section>
            {album.tracks.map((t, i) => (
              <details
                className="album-track"
                key={t.id}
                open={opened.has(t.id)}
                onToggle={(e) => {
                  const open = e.currentTarget.open;
                  setOpened((old) => {
                    if (old.has(t.id) === open) return old;
                    const next = new Set(old);
                    if (open) next.add(t.id);
                    else next.delete(t.id);
                    return next;
                  });
                }}
              >
                <summary>
                  <span className="start-number">{i + 1}</span>
                  <div>
                    <strong>{t.title}</strong>
                    <small>
                      {t.bpm} BPM ·{" "}
                      {t.reviewed
                        ? "확인 완료"
                        : t.lyrics.trim()
                          ? "가사 준비"
                          : "작사 대기"}
                    </small>
                  </div>
                </summary>
                <div className="actions track-toolbar">
                  <label className="toggle">
                    <input
                      aria-label={`트랙 ${i + 1} 선택`}
                      type="checkbox"
                      checked={selected.has(t.id)}
                      disabled={busy}
                      onChange={() => toggle(t.id)}
                    />
                    작사할 트랙 선택
                  </label>
                  <button
                    disabled={busy || i === 0}
                    onClick={() => onMove(t.id, -1)}
                  >
                    트랙 위로
                  </button>
                  <button
                    disabled={busy || i === album.tracks.length - 1}
                    onClick={() => onMove(t.id, 1)}
                  >
                    트랙 아래로
                  </button>
                </div>
                <div className="track-casting two-columns">
                  <label>
                    이 곡 보컬
                    <select
                      aria-label="이 곡 보컬"
                      disabled={busy || brief.instrumental}
                      value={t.voice || ""}
                      onChange={(e) =>
                        cast(t, e.target.value, t.rapVoice || "")
                      }
                    >
                      <option value="">앨범 설정 따르기</option>
                      {VOICES.map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    이 곡 랩 보이스
                    <select
                      aria-label="이 곡 랩 보이스"
                      disabled={
                        busy || brief.instrumental || brief.rapPct === 0
                      }
                      value={t.rapVoice || ""}
                      onChange={(e) => cast(t, t.voice || "", e.target.value)}
                    >
                      <option value="">앨범 설정 따르기</option>
                      {VOICES.filter((v) => !/코러스|합창|그룹/.test(v)).map(
                        (v) => (
                          <option key={v}>{v}</option>
                        ),
                      )}
                    </select>
                  </label>
                </div>
                <TrackEditor
                  track={t}
                  busy={busy}
                  instrumental={brief.instrumental}
                  notice={notice}
                  onChange={onTrack}
                  generate={() => onLyrics([t.id], true)}
                />
              </details>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
