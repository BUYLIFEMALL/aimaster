"use client";
import { Copy, Download, CheckCircle2 } from "lucide-react";
import type { Track } from "@/lib/studio/config";
import { useRef } from "react";
import { SECTION_TAGS, insertSection } from "@/lib/studio/catalog";
import { styleIssues } from "@/lib/studio/validation";
export function downloadFile(
  text: string,
  filename: string,
  type = "text/plain;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function trackText(t: Track) {
  return `Title: ${t.title}\n\nStyle:\n${t.style}\n\nExclude Styles:\n${t.exclude}\n\nLyrics:\n${t.lyrics}\n`;
}
export function trackProblems(t: Track, instrumental: boolean) {
  return [
    ...(!t.title.trim() ? ["제목을 입력해 주세요."] : []),
    ...styleIssues(t.style),
    ...(!instrumental && !t.lyrics.trim()
      ? ["가사를 작성하거나 생성해 주세요."]
      : []),
    ...(instrumental && t.lyrics.trim()
      ? ["연주곡은 가사를 비워 주세요."]
      : []),
  ];
}
export function TrackEditor({
  track,
  onChange,
  busy,
  instrumental,
  notice,
  generate,
  builder = false,
  onSkeleton,
  onReset,
  onUndo,
}: {
  track: Track;
  onChange: (v: Track) => void;
  busy: boolean;
  instrumental: boolean;
  notice: (s: string) => void;
  generate?: () => void;
  builder?: boolean;
  onSkeleton?: () => void;
  onReset?: () => void;
  onUndo?: () => void;
}) {
  const lyricsRef = useRef<HTMLTextAreaElement>(null);
  const issues = trackProblems(track, instrumental);
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      notice("복사했습니다. Suno Custom 모드의 해당 입력란에 붙여 넣으세요.");
    } catch {
      notice(
        "복사 권한이 없습니다. 입력란에서 직접 선택하거나 TXT를 내려받아 주세요.",
      );
    }
  }
  function edit(k: keyof Track, v: string | number) {
    onChange({ ...track, [k]: v, reviewed: false });
  }
  return (
    <article className={`card track-editor ${builder ? "builder-editor" : ""}`}>
      <div className="section-title">
        <h2>{track.title || "곡 제목"}</h2>
        <span className={`pill ${track.reviewed ? "success" : ""}`}>
          {track.reviewed ? "최종 확인 완료" : "확인 필요"}
        </span>
      </div>
      {builder && (
        <div className="actions builder-toolbar">
          <button
            disabled={busy || instrumental || Boolean(track.lyrics.trim())}
            onClick={onSkeleton}
          >
            기본 가사 골격
          </button>
          <button disabled={busy} onClick={onReset}>
            현재 빌더 초기화
          </button>
          {onUndo && (
            <button disabled={busy} onClick={onUndo}>
              빌더 초기화 되돌리기
            </button>
          )}
        </div>
      )}
      <p className="muted">{track.summary}</p>
      <div className="two-columns">
        <label>
          곡 제목
          <input
            value={track.title}
            maxLength={80}
            onChange={(e) => edit("title", e.target.value)}
            disabled={busy}
          />
        </label>
        <label>
          BPM
          <input
            type="number"
            min={40}
            max={320}
            value={track.bpm}
            onChange={(e) =>
              edit("bpm", Math.min(320, Math.max(40, Number(e.target.value))))
            }
            disabled={busy}
          />
        </label>
      </div>
      <section className="editor-style-section">
        <h3>STYLE</h3>
        <label>
          Style{" "}
          <span className="muted">
            {track.style.length}/1,000 · 영문 음악 용어
          </span>
          <textarea
            aria-label="곡 Style"
            value={track.style}
            maxLength={1000}
            rows={3}
            onChange={(e) => edit("style", e.target.value)}
            disabled={busy}
          />
        </label>
        <label>
          제외 스타일
          <textarea
            aria-label="곡 제외 스타일"
            value={track.exclude}
            maxLength={500}
            rows={2}
            onChange={(e) => edit("exclude", e.target.value)}
            disabled={busy}
          />
        </label>
        {builder && (
          <div className="actions">
            <button
              disabled={busy || !track.style.trim()}
              onClick={() => copy(track.style)}
            >
              <Copy size={15} />
              Style 복사
            </button>
          </div>
        )}
      </section>
      <section className="editor-lyrics-section">
        <div className="section-title">
          <h3>LYRICS</h3>
          <span className="muted">
            {
              track.lyrics
                .split(/\r?\n/)
                .filter((l) => /^\[[^\]]+\]/.test(l.trim())).length
            }
            개 구간 ·{" "}
            {track.lyrics.split(/\r?\n/).filter((l) => l.trim()).length}줄
          </span>
        </div>
        {!instrumental && (
          <div className="tags section-tags" aria-label="가사 구간 삽입">
            {SECTION_TAGS.map((tag) => (
              <button
                key={tag}
                disabled={busy}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  try {
                    const el = lyricsRef.current;
                    const inserted = insertSection(
                      track.lyrics,
                      el?.selectionStart ?? track.lyrics.length,
                      el?.selectionEnd ?? track.lyrics.length,
                      tag,
                    );
                    edit("lyrics", inserted.text);
                    requestAnimationFrame(() => {
                      el?.focus();
                      el?.setSelectionRange(inserted.cursor, inserted.cursor);
                    });
                  } catch (e) {
                    notice(e instanceof Error ? e.message : "구간 삽입 실패");
                  }
                }}
              >
                [{tag}]
              </button>
            ))}
          </div>
        )}
        <label>
          가사 <span className="muted">{track.lyrics.length}/5,000</span>
          <textarea
            aria-label="가사"
            ref={lyricsRef}
            className="lyrics-area"
            value={track.lyrics}
            maxLength={5000}
            rows={12}
            onChange={(e) => edit("lyrics", e.target.value)}
            disabled={busy}
            placeholder={
              instrumental
                ? "연주곡은 비워 둡니다."
                : "직접 작성하거나 AI 작사를 실행하세요."
            }
          />
        </label>
        {builder && (
          <div className="actions">
            <button
              disabled={busy || !track.lyrics.trim()}
              onClick={() => copy(track.lyrics)}
            >
              <Copy size={15} />
              Lyrics 복사
            </button>
          </div>
        )}
      </section>
      <details className="advanced-settings">
        <summary>곡 컨셉·핵심 구절 수정</summary>
        <label>
          곡 컨셉
          <textarea
            aria-label="곡 컨셉"
            value={track.summary}
            maxLength={700}
            disabled={busy}
            onChange={(e) => edit("summary", e.target.value)}
          />
        </label>
        <label>
          핵심 구절
          <input
            aria-label="핵심 구절"
            value={track.hook}
            maxLength={200}
            disabled={busy}
            onChange={(e) => edit("hook", e.target.value)}
          />
        </label>
      </details>
      {issues.length > 0 && <p className="error">{issues.join(" ")}</p>}
      <label className="review-control">
        <input
          type="checkbox"
          checked={track.reviewed}
          disabled={busy || issues.length > 0}
          onChange={(e) => onChange({ ...track, reviewed: e.target.checked })}
        />
        <CheckCircle2 size={19} />
        최종 가사·스타일 수정 및 확인 완료
      </label>
      <div className="actions">
        <button onClick={() => copy(track.title)}>
          <Copy size={15} />
          제목 복사
        </button>
        {!builder && (
          <button onClick={() => copy(track.style)}>
            <Copy size={15} />
            Style 복사
          </button>
        )}
        {!builder && (
          <button
            onClick={() => copy(track.lyrics)}
            disabled={!track.lyrics.trim()}
          >
            <Copy size={15} />
            가사 복사
          </button>
        )}
        <button
          onClick={() => copy(track.exclude)}
          disabled={!track.exclude.trim()}
        >
          제외 스타일 복사
        </button>
        <button
          className="download"
          onClick={() => downloadFile(trackText(track), "suno-song.txt")}
        >
          <Download size={15} />
          TXT 저장
        </button>
        {generate && (
          <button
            className="primary"
            disabled={busy || instrumental}
            onClick={generate}
          >
            {track.lyrics.trim() ? "가사 다시 생성" : "이 곡 가사 생성"}
          </button>
        )}
      </div>
    </article>
  );
}
