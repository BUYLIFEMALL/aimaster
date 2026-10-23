"use client";
import { useEffect, useRef, useState } from "react";
import { Pause, Play, Save, SkipBack } from "lucide-react";
import { useStudio } from "./StudioContext";
import { drawFrame, ensureFonts, type DrawCache } from "@/lib/render/draw";
import { sizeFor } from "@/lib/design";
import { formatTime } from "@/lib/lyrics";
import { toMsg, type Msg } from "@/components/ui/api";
import { Message } from "@/components/ui/Message";

/** 재생 위치를 매 화면마다 읽어 온다(재생 중일 때만 빠르게) */
export function usePlayhead() {
  const { player } = useStudio();
  const [t, setT] = useState(0), [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!player) return;
    let raf = 0;
    const tick = () => { setT(player.currentTime); raf = requestAnimationFrame(tick); };
    const on = () => { setPlaying(true); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); };
    const off = () => { setPlaying(false); cancelAnimationFrame(raf); setT(player.currentTime); };
    const seek = () => setT(player.currentTime);
    player.addEventListener("play", on); player.addEventListener("pause", off); player.addEventListener("ended", off); player.addEventListener("seeked", seek);
    setT(player.currentTime); setPlaying(!player.paused); if (!player.paused) on();
    return () => { cancelAnimationFrame(raf); player.removeEventListener("play", on); player.removeEventListener("pause", off); player.removeEventListener("ended", off); player.removeEventListener("seeked", seek); };
  }, [player]);
  return { t, playing };
}

export function Transport() {
  const { player, audio } = useStudio();
  const { t, playing } = usePlayhead();
  const dur = audio?.buffer.duration ?? 0;
  if (!audio || !player) return <p className="muted" style={{ fontSize: 12 }}>음악 파일을 넣으면 재생할 수 있습니다.</p>;
  return (
    <div className="player">
      <button type="button" aria-label="처음으로" onClick={() => { player.currentTime = 0; }}><SkipBack size={15} /></button>
      <button type="button" className="primary" aria-label={playing ? "일시정지" : "재생"} onClick={() => (playing ? player.pause() : player.play().catch(() => undefined))}>{playing ? <Pause size={15} /> : <Play size={15} />}</button>
      <input type="range" min={0} max={dur || 1} step={0.05} value={Math.min(t, dur)} aria-label="재생 위치" onChange={(e) => { player.currentTime = Number(e.target.value); }} />
      <span className="mono">{formatTime(t)} / {formatTime(dur, false)}</span>
    </div>
  );
}

/** 미리보기 — 내보내기와 같은 drawFrame으로 그린다(해상도만 절반) */
export function Preview({ maxWidth }: { maxWidth?: number }) {
  const { scene, design } = useStudio();
  const { t } = usePlayhead();
  const ref = useRef<HTMLCanvasElement>(null), cache = useRef<DrawCache>({});
  const [fontsReady, setFontsReady] = useState(0);
  const { W, H } = sizeFor(design.aspect), pw = W / 2, ph = H / 2;
  useEffect(() => { let alive = true; void ensureFonts(design).then(() => alive && setFontsReady((n) => n + 1)); return () => { alive = false; }; }, [design]);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    drawFrame(ctx, pw, ph, scene, t, cache.current);
  }, [scene, t, pw, ph, fontsReady]);
  const portrait = design.aspect === "portrait";
  return (
    <div className={`stage-frame ${portrait ? "portrait" : "landscape"}`} style={{ maxWidth: maxWidth ?? (portrait ? 340 : 760) }}>
      <canvas ref={ref} width={pw} height={ph} aria-label="가사 영상 미리보기" />
    </div>
  );
}

/** 단계 화면 위쪽: 프로젝트 이름·저장 상태·저장 버튼 */
export function StudioBar() {
  const { title, dirty, projectId, save, audio, savedNames, audioBusy, sunoVariantId } = useStudio();
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState<Msg>(null);
  async function onSave() {
    setBusy(true); setMsg(null);
    try { await save(); setMsg({ text: "내 보관함에 저장했습니다. 저장 데이터는 30일 뒤 자동 삭제됩니다.", ok: true }); }
    catch (e) { setMsg(toMsg(e)); } finally { setBusy(false); }
  }
  return (
    <div className="studio-bar">
      <div className="row" style={{ gap: 8, minWidth: 0 }}>
        <strong className="ellipsis">🎵 {title || "새 가사 영상"}</strong>
        <span className={`badge ${dirty ? "" : "brand"}`}>{dirty ? "저장 안 됨" : projectId ? "저장됨" : "새 작업"}</span>
        {!audio && audioBusy && <span className="badge">⏳ {audioBusy}</span>}
        {!audio && savedNames.audioName && !audioBusy && <span className="badge warn">음악 「{savedNames.audioName}」 다시 선택 필요</span>}
        {audio && sunoVariantId && <span className="badge brand">🎼 Suno 곡</span>}
      </div>
      <button type="button" onClick={() => void onSave()} disabled={busy}><Save size={14} />{busy ? "저장 중…" : "💾 저장"}</button>
      {msg && <div style={{ flexBasis: "100%" }}><Message msg={msg} /></div>}
    </div>
  );
}

/** 끌어다 놓기 또는 눌러서 고르기 */
export function FileDrop({ accept, label, hint, onFile, current }: { accept: string; label: string; hint: string; onFile: (f: File) => void; current?: string }) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return (
    <div
      className={`drop ${over ? "over" : ""} ${current ? "filled" : ""}`} role="button" tabIndex={0}
      onClick={() => input.current?.click()} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.current?.click(); } }}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
    >
      <strong>{label}</strong>
      <small>{current ? `✓ ${current}` : hint}</small>
      <input ref={input} type="file" accept={accept} hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
    </div>
  );
}
