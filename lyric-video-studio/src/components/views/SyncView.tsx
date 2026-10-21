"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useStudio } from "@/components/studio/StudioContext";
import { StudioBar, Transport, usePlayhead } from "@/components/studio/parts";
import { clearFrom, formatTime, isSynced, lineAt, newId, parseTime, shiftAll, stampLine, timeline, toSrt, type LyricLine } from "@/lib/lyrics";

const DELAYS = [0, 0.1, 0.2, 0.3];

export function SyncView() {
  const s = useStudio();
  const { t, playing } = usePlayhead();
  const [cursor, setCursor] = useState(() => Math.max(0, s.lines.findIndex((l) => !isSynced(l))));
  const [delay, setDelay] = useState(0.1);
  const rows = useRef<(HTMLLIElement | null)[]>([]);
  const tl = useMemo(() => timeline(s.lines, s.audio?.buffer.duration ?? Infinity), [s.lines, s.audio]);
  const nowLine = useMemo(() => { const { index, gap } = lineAt(tl, t); return index >= 0 && !gap ? tl[index] : null; }, [tl, t]);
  const done = cursor >= s.lines.length;

  function stamp() {
    if (!s.player || !s.audio || cursor >= s.lines.length) return;
    const at = Math.max(0, s.player.currentTime - delay);
    s.setLines((prev) => stampLine(prev, cursor, at));
    setCursor((c) => c + 1);
  }
  function undo() {
    if (cursor <= 0) return;
    const back = cursor - 1;
    s.setLines((prev) => clearFrom(prev, back));
    setCursor(back);
    if (s.player) s.player.currentTime = Math.max(0, s.player.currentTime - 2);
  }
  function restart() {
    if (!s.player || !s.audio) return;
    if (s.lines.some(isSynced) && !confirm("맞춰 둔 시간을 모두 지우고 처음부터 다시 맞출까요?")) return;
    s.setLines((prev) => clearFrom(prev, 0)); setCursor(0);
    s.player.currentTime = 0; s.player.play().catch(() => undefined);
  }

  // 스페이스바 = 지금 줄 시작, 백스페이스 = 한 줄 되돌리기 (글자 입력 칸에서는 동작하지 않음)
  const keys = useRef({ stamp, undo }); keys.current = { stamp, undo };
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      if (e.code === "Space") { e.preventDefault(); keys.current.stamp(); }
      else if (e.code === "Backspace") { e.preventDefault(); keys.current.undo(); }
    };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, []);
  useEffect(() => { rows.current[Math.min(cursor, s.lines.length - 1)]?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [cursor, s.lines.length]);

  const edit = (i: number, patch: Partial<LyricLine>) => s.setLines((prev) => prev.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  const nudge = (i: number, dt: number) => s.setLines((prev) => prev.map((l, k) => {
    if (k === i && isSynced(l)) return { ...l, start: Math.max(0, +(l.start + dt).toFixed(2)) };
    if (k === i - 1 && isSynced(l) && isSynced(prev[i])) return { ...l, end: Math.max(l.start + 0.1, +(prev[i].start + dt).toFixed(2)) };
    return l;
  }));
  const setStart = (i: number, raw: string) => {
    const v = raw.trim() === "" ? -1 : parseTime(raw.length <= 5 && !raw.includes(":") ? `0:${raw}` : raw);
    if (raw.trim() !== "" && !Number.isFinite(v)) return;
    s.setLines((prev) => (v < 0 ? clearFrom(prev, i).map((l, k) => (k > i ? prev[k] : l)) : stampLine(prev, i, v)));
  };
  const insertAfter = (i: number) => s.setLines((prev) => [...prev.slice(0, i + 1), { id: newId(), start: -1, end: -1, text: "새 줄" }, ...prev.slice(i + 1)]);
  const remove = (i: number) => { s.setLines((prev) => prev.filter((_, k) => k !== i)); if (cursor > i) setCursor((c) => c - 1); };
  const seekTo = (l: LyricLine) => { if (s.player && isSynced(l)) { s.player.currentTime = Math.max(0, l.start - 0.5); s.player.play().catch(() => undefined); } };
  function downloadSrt() {
    const blob = new Blob([toSrt(s.lines)], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${s.title || "lyrics"}.srt`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  if (!s.lines.length) return <div className="stack"><StudioBar /><div className="empty-state"><div className="emoji">📝</div><p>먼저 1단계에서 가사를 넣어 주세요.</p><Link className="button primary" href="/source">음악·가사 넣기로</Link></div></div>;

  return (
    <div className="stack">
      <StudioBar />
      <div className="page-heading"><p className="eyebrow">STEP 2</p><h1>⏱️ 가사 싱크</h1><p>노래를 틀어 두고 각 줄이 시작될 때 <kbd>스페이스바</kbd>(또는 아래 큰 버튼)를 누르면 시간이 찍힙니다. 틀리면 <kbd>백스페이스</kbd>로 한 줄 되돌립니다.</p></div>
      {!s.audio && <div className="notice warning">음악 파일이 없습니다. <Link href="/source" className="subtle-link">1단계에서 음악을 넣어 주세요.</Link> 시간은 직접 적어 넣을 수도 있습니다.</div>}
      <section className="card stack sync-console">
        <Transport />
        <div className="now-lyric" aria-live="polite">{nowLine ? nowLine.text : playing ? "♪" : "재생하면 지금 부르는 줄이 여기 보입니다"}</div>
        <div className="sync-actions">
          <button type="button" className="primary tap" onClick={stamp} disabled={!s.audio || done}>
            {done ? "✓ 모든 줄을 맞췄습니다" : <>⏎ 지금 「{s.lines[cursor]?.text.split("\n")[0].slice(0, 24)}」 시작 <small>(스페이스바)</small></>}
          </button>
          <button type="button" onClick={undo} disabled={cursor === 0}>↩ 한 줄 되돌리기</button>
          <button type="button" onClick={restart} disabled={!s.audio}>▶ 처음부터 맞추기</button>
        </div>
        <div className="row" style={{ fontSize: 12 }}>
          <span className="muted">손 반응 보정</span>
          <div className="chips">{DELAYS.map((d) => <button key={d} type="button" className={`chip ${delay === d ? "on" : ""}`} onClick={() => setDelay(d)}>{d === 0 ? "없음" : `−${d}초`}</button>)}</div>
          <span className="muted">· 전체 시간</span>
          <button type="button" className="chip" onClick={() => s.setLines((p) => shiftAll(p, -0.5))}>−0.5초</button>
          <button type="button" className="chip" onClick={() => s.setLines((p) => shiftAll(p, 0.5))}>+0.5초</button>
          <button type="button" className="chip" onClick={downloadSrt} disabled={!s.lines.some(isSynced)}>⬇ .srt 받기</button>
        </div>
      </section>
      <section className="card">
        <h2>가사 {s.lines.length}줄 · 맞춘 줄 {s.lines.filter(isSynced).length}줄</h2>
        <ol className="sync-list">
          {s.lines.map((l, i) => {
            const live = nowLine?.id === l.id;
            return (
              <li key={l.id} ref={(el) => { rows.current[i] = el; }} className={`${i === cursor ? "cursor" : ""} ${live ? "live" : ""}`}>
                <span className="num">{i + 1}</span>
                <input className="time mono" aria-label={`${i + 1}번째 줄 시작 시각`} defaultValue={isSynced(l) ? formatTime(l.start) : ""} key={`${l.id}:${l.start}`} placeholder="--:--" onBlur={(e) => setStart(i, e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
                <span className="nudge"><button type="button" aria-label="0.1초 앞당기기" onClick={() => nudge(i, -0.1)} disabled={!isSynced(l)}>−</button><button type="button" aria-label="0.1초 늦추기" onClick={() => nudge(i, 0.1)} disabled={!isSynced(l)}>+</button></span>
                <input className="text" aria-label={`${i + 1}번째 줄 가사`} value={l.text} onChange={(e) => edit(i, { text: e.target.value })} />
                <span className="row-actions">
                  <button type="button" aria-label="이 줄부터 듣기" onClick={() => seekTo(l)} disabled={!isSynced(l) || !s.audio}>▶</button>
                  <button type="button" aria-label="아래에 줄 추가" onClick={() => insertAfter(i)}>＋</button>
                  <button type="button" aria-label="줄 지우기" className="danger" onClick={() => remove(i)}>✕</button>
                </span>
              </li>
            );
          })}
        </ol>
      </section>
      <div className="actions" style={{ justifyContent: "space-between" }}>
        <Link className="button" href="/source">← 음악·가사 넣기</Link>
        <Link className="button primary" href="/design">다음: 디자인 →</Link>
      </div>
    </div>
  );
}
