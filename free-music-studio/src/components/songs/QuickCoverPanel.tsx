"use client";

// 곡 만들기 화면에서 바로 커버(백로그 C-3, 2026-11-06) — 오른쪽 곡 카드의 「🎨 커버」를 누르면 가운데에 열린다.
// 원곡은 다시 올리지 않고 회원 PC 엔진 보관함 파일을 받아 그대로 대기열에 넣는다(「가져온 음악」 화면의 커버와 같은 enqueueEdit, 원본 boks-music cover() 참고).
import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Palette, X } from "lucide-react";
import { useEngine } from "@/components/engine/useEngine";
import { EngineError, enqueueEdit, fetchLibraryFile, hasQueue } from "@/lib/engine";
import { LIMITS } from "@/lib/songs";
import { COVER_SOURCE_KEY, type CoverSource, type Track } from "@/lib/tracks";

export function QuickCoverPanel({ source, onClose }: { source: Track; onClose: () => void }) {
  const engine = useEngine();
  const status = engine.status;
  const queueOk = engine.paired && hasQueue(status);
  const own = source.kind === "text2music"; // 이 프로그램으로 만든 곡은 회원 본인 곡
  const [title, setTitle] = useState(`${source.title} · Cover`.slice(0, LIMITS.title));
  const [style, setStyle] = useState(source.style_prompt);
  const [lyrics, setLyrics] = useState(source.lyrics);
  const [strength, setStrength] = useState(0.6);
  const [rights, setRights] = useState(own);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => { // 다른 곡의 커버를 누르면 칸을 그 곡으로 다시 채운다
    setTitle(`${source.title} · Cover`.slice(0, LIMITS.title));
    setStyle(source.style_prompt);
    setLyrics(source.lyrics);
    setRights(source.kind === "text2music");
    setMessage(null);
  }, [source]);

  const start = async () => {
    if (!status) return;
    setBusy(true);
    setMessage(null);
    try {
      const { url, ext } = await fetchLibraryFile(source.id);
      const blob = await (await fetch(url)).blob();
      URL.revokeObjectURL(url);
      const file = new File([blob], `${source.title}.${ext}`, { type: blob.type });
      const name = title.trim() || `${source.title} · Cover`;
      await enqueueEdit(file, { mode: "cover", style_prompt: style, lyrics, strength }, source.duration_sec, { title: name.slice(0, LIMITS.title), device: status.device, parentId: source.id }, status.quality);
      setMessage({ ok: true, text: `「${name}」 커버를 대기열에 넣었습니다. 엔진이 차례로 만들고, 다 되면 오른쪽 목록과 「모든 음악」에 저절로 들어옵니다.` });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof EngineError ? e.message : "커버를 대기열에 넣지 못했습니다. 잠시 뒤 다시 시도해 주세요." });
    } finally {
      setBusy(false);
    }
  };

  // 대기열이 없는 옛 엔진이면 예전처럼 「가져온 음악」 화면에서 만든다
  const toImport = () => {
    const src: CoverSource = { id: source.id, title: source.title, style_prompt: source.style_prompt, lyrics: source.lyrics, kind: source.kind };
    try {
      sessionStorage.setItem(COVER_SOURCE_KEY, JSON.stringify(src));
    } catch {}
  };

  const canStart = queueOk && rights && !busy && (style.trim() || lyrics.trim());
  return (
    <section className="space-y-3 rounded-2xl border border-fuchsia-500/30 bg-gradient-to-b from-[#120a1d] to-[#070b14] p-5">
      <div className="flex items-center gap-2">
        <h2 className="flex min-w-0 flex-1 items-center gap-2 text-sm font-bold text-slate-100">
          <Palette className="h-4 w-4 shrink-0 text-fuchsia-300" />
          <span className="truncate">커버 만들기 — 원곡의 멜로디에서 시작: {source.title}</span>
        </h2>
        <button type="button" onClick={onClose} aria-label="커버 만들기 닫기" className="rounded-lg border border-slate-700 p-1.5 text-slate-300 hover:bg-slate-900">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="text-[11px] leading-relaxed text-slate-400">원곡 파일은 다시 올리지 않습니다. 이 PC 엔진 보관함에 있는 원곡을 그대로 써서, 새 스타일로 다시 부릅니다.</p>
      <label className="block space-y-1 text-xs text-slate-300">
        제목
        <input value={title} maxLength={LIMITS.title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
      </label>
      <label className="block space-y-1 text-xs text-slate-300">
        원곡을 얼마나 따를까요? <span className="font-mono text-fuchsia-300">{Math.round(strength * 100)}%</span>
        <input type="range" min={0.2} max={1} step={0.05} value={strength} onChange={(e) => setStrength(Number(e.target.value))} className="w-full accent-fuchsia-500" />
        <span className="block text-[11px] text-slate-500">낮을수록 새 스타일을 많이, 높을수록 원곡에 가깝게 부릅니다.</span>
      </label>
      <label className="block space-y-1 text-xs text-slate-300">
        새 스타일
        <textarea value={style} rows={2} maxLength={LIMITS.style} onChange={(e) => setStyle(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100" placeholder="예: acoustic ballad, warm female vocal" />
      </label>
      <label className="block space-y-1 text-xs text-slate-300">
        가사(원곡 가사를 그대로 채웠습니다)
        <textarea value={lyrics} rows={4} maxLength={LIMITS.lyrics} onChange={(e) => setLyrics(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-[11px] text-slate-100" />
      </label>
      {!own && (
        <label className="flex items-start gap-2 text-[11px] text-amber-200">
          <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} className="mt-0.5 accent-amber-500" />
          이 원곡을 커버할 권리가 있습니다(내가 만들었거나 사용 허락을 받은 곡).
        </label>
      )}
      {queueOk ? (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={!canStart} onClick={() => void start()} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 px-4 py-2.5 text-xs font-bold text-white hover:brightness-110 disabled:opacity-40">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Palette className="h-4 w-4" />} {busy ? "원곡을 엔진에 넘기는 중…" : "커버 대기열에 넣기"}
          </button>
          {!rights && <span className="text-[11px] text-slate-500">권리 확인에 체크해야 시작할 수 있습니다.</span>}
        </div>
      ) : (
        <p className="text-[11px] text-slate-400">
          이 엔진은 대기열이 없습니다.{" "}
          <Link href={`/import?from=${source.id}`} onClick={toImport} className="text-fuchsia-300 underline underline-offset-2">
            「가져온 음악」에서 이 곡으로 커버 만들기 →
          </Link>
        </p>
      )}
      {message && <p className={`text-[11px] ${message.ok ? "text-emerald-300" : "text-rose-300"}`}>{message.text}</p>}
    </section>
  );
}
