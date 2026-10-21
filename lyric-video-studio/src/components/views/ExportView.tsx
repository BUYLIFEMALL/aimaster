"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useStudio } from "@/components/studio/StudioContext";
import { Preview, StudioBar } from "@/components/studio/parts";
import { canSaveToFile, exportLyricVideo, exportLyricVideoToFile, MAX_EXPORT_SECONDS, MAX_FILE_EXPORT_SECONDS, pickSaveFile, type ExportProgress } from "@/lib/render/export";
import { sizeFor } from "@/lib/design";
import { YoutubeUploadCard } from "@/components/studio/YoutubeUploadCard";
import { formatTime, isSynced } from "@/lib/lyrics";

const safeName = (s: string) => s.replace(/[\\/:*?"<>|]/g, "_").trim().slice(0, 80);

export function ExportView() {
  const s = useStudio(), d = s.design;
  const [prog, setProg] = useState<ExportProgress | null>(null), [error, setError] = useState("");
  const [result, setResult] = useState<{ url: string; size: number; name: string; savedTo?: string; blob?: Blob } | null>(null);
  const abort = useRef<AbortController | null>(null);
  const [supported, setSupported] = useState(true), [fileOk, setFileOk] = useState(false), [toFile, setToFile] = useState(false);
  useEffect(() => { setSupported("VideoEncoder" in window && "AudioEncoder" in window); setFileOk(canSaveToFile()); }, []);
  const longSong = (s.audio?.buffer.duration ?? 0) > 8 * 60;
  useEffect(() => { if (fileOk && longSong) setToFile(true); }, [fileOk, longSong]); // 긴 곡은 파일로 바로 저장을 기본으로
  useEffect(() => () => { abort.current?.abort(); }, []);
  useEffect(() => () => { if (result?.url) URL.revokeObjectURL(result.url); }, [result]);

  const { W, H } = sizeFor(d.aspect);
  const synced = s.lines.filter(isSynced).length, dur = s.audio?.buffer.duration ?? 0;
  const maxSec = toFile ? MAX_FILE_EXPORT_SECONDS : MAX_EXPORT_SECONDS;
  const checks = [
    { ok: !!s.audio, text: s.audio ? `음악: ${s.audio.name} (${formatTime(dur, false)})` : "음악 파일이 없습니다", fix: "/source" },
    { ok: synced > 0, text: synced > 0 ? `가사: ${synced}줄 시간 맞춤${synced < s.lines.length ? ` (시간 없는 ${s.lines.length - synced}줄은 빠짐)` : ""}` : "시간을 맞춘 가사가 없습니다", fix: "/sync" },
    { ok: dur <= maxSec, text: dur <= maxSec ? `길이: ${maxSec / 60}분 이하${toFile ? " (파일로 바로 저장)" : ""}` : `곡이 ${maxSec / 60}분보다 깁니다${!toFile && fileOk && dur <= MAX_FILE_EXPORT_SECONDS ? " — 아래 「파일로 바로 저장」을 켜면 30분까지 됩니다" : ""}`, fix: "" },
    { ok: supported, text: supported ? "이 브라우저에서 영상 만들기를 쓸 수 있습니다" : "이 브라우저는 영상 만들기(WebCodecs)를 지원하지 않습니다 — 최신 크롬·엣지로 열어 주세요", fix: "" },
  ];
  const ready = checks.every((c) => c.ok);
  const running = !!prog && !result && !error;
  const estMb = Math.round((dur * (8 + 0.16)) / 8);

  async function run() {
    if (!s.audio || !ready) return;
    const name = `${safeName([s.artist, s.title].filter(Boolean).join(" - ")) || "가사영상"}${d.aspect === "portrait" ? "-세로" : ""}.mp4`;
    let file: FileSystemFileHandle | null = null;
    if (toFile) { // 저장 위치는 버튼을 누른 직후에 골라야 브라우저가 허락한다
      try { file = await pickSaveFile(name); } catch { setError("저장 위치를 고르지 못했습니다. 다시 시도해 주세요."); return; }
      if (!file) return; // 회원이 취소
    }
    s.player?.pause();
    setError(""); setResult(null); setProg({ pct: 0, status: "준비 중…" });
    const ctrl = new AbortController(); abort.current = ctrl;
    const started = performance.now();
    try {
      if (file) {
        await exportLyricVideoToFile({ scene: s.scene, audio: s.audio.buffer, signal: ctrl.signal, onProgress: setProg, file });
        setResult({ url: "", size: 0, name, savedTo: file.name });
      } else {
        const blob = await exportLyricVideo({ scene: s.scene, audio: s.audio.buffer, signal: ctrl.signal, onProgress: setProg });
        setResult({ url: URL.createObjectURL(blob), size: blob.size, name, blob });
      }
      setProg({ pct: 100, status: `완료 · ${Math.round((performance.now() - started) / 1000)}초 걸림` });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") { setProg(null); setError("영상 만들기를 취소했습니다."); }
      else setError(e instanceof Error ? e.message : "영상을 만들지 못했습니다. 다시 시도해 주세요.");
    } finally { abort.current = null; }
  }

  return (
    <div className="stack">
      <StudioBar />
      <div className="page-heading"><p className="eyebrow">STEP 4</p><h1>🎬 MP4 내보내기</h1><p>이 컴퓨터의 그래픽 기능으로 영상을 만듭니다. 만드는 동안 이 탭을 닫거나 다른 탭으로 오래 옮기지 마세요.</p></div>
      <div className="grid-side">
        <section className="card stack">
          <h2>만들기 전 확인</h2>
          <ul className="checklist">{checks.map((c) => <li key={c.text} className={c.ok ? "ok" : "bad"}>{c.ok ? "✅" : "⚠️"} {c.text}{!c.ok && c.fix && <> · <Link className="subtle-link" href={c.fix}>고치러 가기</Link></>}</li>)}</ul>
          <div className="field-grid two">
            <label>프레임레이트<select value={d.fps} disabled={running} onChange={(e) => s.setDesign({ fps: Number(e.target.value) === 24 ? 24 : 30 })}><option value={30}>30fps — 기본</option><option value={24}>24fps — 약 20% 빠름</option></select></label>
            {fileOk && <label className="toggle" style={{ gridColumn: "1 / -1" }}><input type="checkbox" checked={toFile} disabled={running} onChange={(e) => setToFile(e.target.checked)} />💾 파일로 바로 저장 <small>— 저장 위치를 먼저 고르고 만들면서 바로 씁니다. 긴 곡(최대 30분)·메모리가 적은 PC에 권장</small></label>}
            <div className="notice">해상도 <strong>{W}×{H}</strong> · {d.aspect === "portrait" ? "세로(쇼츠·릴스)" : "가로(유튜브)"}<br />예상 크기 최대 약 {estMb}MB</div>
          </div>
          <div className="actions">
            {!running ? <button type="button" className="primary big" onClick={() => void run()} disabled={!ready}>🎬 MP4 만들기</button>
              : <button type="button" className="danger" onClick={() => abort.current?.abort()}>■ 취소</button>}
          </div>
          {prog && (
            <div className="progress-box" aria-live="polite">
              <div className="progress-track"><div className="progress-fill" style={{ width: `${prog.pct}%` }} /></div>
              <small>{prog.pct}% · {prog.status}</small>
            </div>
          )}
          {error && <div className="notice error-box">{error}</div>}
          {result?.savedTo && <div className="notice success">💾 「{result.savedTo}」로 저장했습니다. 고른 폴더에서 열어 확인해 주세요. 가사 시간표와 디자인은 위쪽 「💾 저장」으로 보관함에 남길 수 있습니다.</div>}
          {result && !result.savedTo && (
            <div className="stack result">
              <video src={result.url} controls playsInline className={d.aspect === "portrait" ? "portrait" : ""} />
              <div className="actions">
                <a className="button primary" href={result.url} download={result.name}>⬇ {result.name} 내려받기 ({(result.size / 1024 / 1024).toFixed(1)}MB)</a>
              </div>
              <p className="muted" style={{ fontSize: 12 }}>영상 파일은 서버에 남지 않습니다. 꼭 내려받아 두세요. 가사 시간표와 디자인은 위쪽 「💾 저장」으로 보관함에 남길 수 있습니다.</p>
            </div>
          )}
        </section>
        <aside className="card stack">
          <h2>최종 화면</h2>
          <Preview maxWidth={d.aspect === "portrait" ? 260 : 340} />
          <Link className="button" href="/design">← 디자인 다시 고르기</Link>
        </aside>
      </div>
      {result &&<YoutubeUploadCard blob={result.blob ?? null} disabled={running} />}
    </div>
  );
}
