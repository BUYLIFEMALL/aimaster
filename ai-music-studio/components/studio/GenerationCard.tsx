"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileText, Loader2, StickyNote, Star, Trash2 } from "lucide-react";
import type { ClientGeneration } from "@/lib/generationTypes";
import { PROVIDERS } from "@/lib/providers/catalog";

export const LYRIC_VIDEO_URL = "https://lyric-video-studio.buylife.xyz/source";
export const PLAYLIST_URL = "https://playlist-channel-studio.buylife.xyz/video";
export const MASTERING_URL = "https://ai-mastering-studio.buylife.xyz";
// v1.07 배경음악 공용화 5단계 — 두 프로그램 모두 「AI 음악 스튜디오 내 곡(에서) 고르기」 목록이 있어 그 화면을 연다
export const SHORTS_ONESTOP_URL = "https://shorts-onestop-studio.buylife.xyz/render";
export const MUSIC_VIDEO_URL = "https://music-video-studio.buylife.xyz/music";
export const SUNO_STUDIO_URL = "https://music-automation.buylife.xyz/plannings";

function elapsed(from: string) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(from).getTime()) / 1000));
  return s < 60 ? `${s}초` : `${Math.floor(s / 60)}분 ${s % 60}초`;
}

function daysLeft(iso: string) {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

export function GenerationCard({ gen, onDeleted, onUpdated }: { gen: ClientGeneration; onDeleted?: (id: string) => void; onUpdated?: (gen: ClientGeneration) => void }) {
  const star = gen.options?.star === true;
  const savedMemo = typeof gen.options?.memo === "string" ? gen.options.memo : "";
  const [editingMemo, setEditingMemo] = useState(false);
  const [memo, setMemo] = useState(savedMemo);
  const [saving, setSaving] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, tick] = useState(0);

  useEffect(() => {
    if (gen.status !== "running") return;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [gen.status]);

  const lyrics = (gen.lyrics || gen.lyrics_out || "").trim();
  const left = daysLeft(gen.expiresAt);

  // v1.05 별 표시·메모 — 회원 본인 행의 options에만 합쳐 저장(비교 결과에서 고른 곡 표시)
  async function patch(change: { star?: boolean; memo?: string }) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/generations/${gen.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(change) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "저장하지 못했습니다.");
      onUpdated?.({ ...gen, options: { ...(gen.options ?? {}), ...data.options } });
      setEditingMemo(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/generations/${gen.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "삭제하지 못했습니다.");
      onDeleted?.(gen.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제하지 못했습니다.");
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <article data-generation={gen.id} className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white" title={gen.title || gen.prompt}>{gen.title || gen.prompt.slice(0, 40)}</p>
          <p className="mt-0.5 text-xs text-violet-300">{gen.modelName}</p>
        </div>
        {gen.status === "completed" && (
          <button type="button" onClick={() => patch({ star: !star })} disabled={saving} aria-pressed={star} title={star ? "별 표시 빼기" : "마음에 드는 곡으로 별 표시"}
            className={`ml-auto shrink-0 rounded-lg p-1 ${star ? "text-amber-300" : "text-zinc-500 hover:text-amber-200"}`}>
            <Star className="h-4 w-4" fill={star ? "currentColor" : "none"} aria-hidden="true" />
            <span className="sr-only">{star ? "별 표시됨" : "별 표시"}</span>
          </button>
        )}
        {gen.status === "running" && (
          <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[11px] font-bold text-violet-200">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> 만드는 중 {elapsed(gen.created_at)}
          </span>
        )}
        {gen.status === "completed" && (
          <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> 완성
          </span>
        )}
        {gen.status === "failed" && (
          <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[11px] font-bold text-red-300">
            <AlertCircle className="h-3 w-3" aria-hidden="true" /> 실패
          </span>
        )}
      </header>

      <p className="line-clamp-2 text-xs leading-relaxed text-zinc-400">{gen.prompt}</p>

      {gen.status === "running" && (
        <p className="rounded-xl bg-zinc-950/60 p-3 text-xs leading-relaxed text-zinc-400">
          보통 30초~3분 걸립니다. 이 화면을 닫아도 계속 만들어지며, 완성되면 내 보관함에 저장됩니다.
        </p>
      )}
      {gen.status === "failed" && gen.error_message && (
        <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs leading-relaxed text-red-300">{gen.error_message}</p>
      )}

      {gen.outputs.map((o, i) => (
        <div key={o.path} className="space-y-1.5">
          {gen.outputs.length > 1 && <p className="text-[11px] font-medium text-zinc-500">{o.title ? `${o.title} · ` : ""}{i + 1}번 곡</p>}
          {o.url ? <audio controls preload="none" src={o.url} className="w-full" /> : <p className="text-xs text-zinc-500">재생 주소를 만들지 못했습니다.</p>}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {o.downloadUrl && (
              <a href={o.downloadUrl} className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-violet-300 hover:underline">
                <Download className="h-3.5 w-3.5" aria-hidden="true" /> 내려받기 ({(o.bytes / 1_048_576).toFixed(1)}MB)
              </a>
            )}
            {/* 다른 프로그램으로 보내기 — 그쪽이 회원 본인 행만 읽어 음악·제목·가사(Lyria 시간 가사 포함)를 넣는다 */}
            <a href={`${LYRIC_VIDEO_URL}?ams=${gen.id}&i=${i}`} target="_blank" rel="noreferrer" className="whitespace-nowrap text-xs font-medium text-zinc-400 hover:text-violet-200">
              🎬 가사 영상 →
            </a>
          </div>
        </div>
      ))}

      {gen.outputs.length > 0 && (
        <a href={`${PLAYLIST_URL}?ams=${gen.outputs.map((_, n) => `${gen.id}:${n}`).join(",")}`} target="_blank" rel="noreferrer"
          className="w-fit whitespace-nowrap rounded-full border border-zinc-700 px-3 py-1 text-[11px] font-medium text-zinc-300 hover:border-violet-500/40 hover:text-violet-200">
          🎞️ 플레이리스트 영상으로 보내기 →
        </a>
      )}

      {gen.outputs.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
          <a href={MASTERING_URL} target="_blank" rel="noreferrer" title="곡을 내려받은 뒤 마스터링 스튜디오에 넣어 소리를 다듬습니다"
            className="whitespace-nowrap font-medium text-zinc-400 hover:text-violet-200">🎚️ 마스터링 스튜디오 → <span className="text-zinc-500">(내려받은 파일을 넣어 주세요)</span></a>
          <a href={SHORTS_ONESTOP_URL} target="_blank" rel="noreferrer" title="쇼츠 원스톱 ④ 영상 화면의 「🎵 ③ 배경음악」에서 「AI 음악 스튜디오 내 곡에서 고르기」로 이 곡을 고르세요"
            className="whitespace-nowrap font-medium text-zinc-400 hover:text-violet-200">🎵 쇼츠 원스톱 배경음악 → <span className="text-zinc-500">(「AI 음악 스튜디오 내 곡에서 고르기」)</span></a>
          <a href={MUSIC_VIDEO_URL} target="_blank" rel="noreferrer" title="뮤직비디오 1단계 「이 뮤직비디오의 곡」에서 「AI 음악 스튜디오에서 가져오기」로 이 곡을 고르세요"
            className="whitespace-nowrap font-medium text-zinc-400 hover:text-violet-200">🎥 뮤직비디오 → <span className="text-zinc-500">(「AI 음악 스튜디오에서 가져오기」)</span></a>
          {gen.provider === "suno" && (
            <a href={SUNO_STUDIO_URL} target="_blank" rel="noreferrer" className="whitespace-nowrap font-medium text-zinc-400 hover:text-violet-200">
              🔁 곡 연장·구간 다시 만들기는 음악(SUNO)자동화에서 →
            </a>
          )}
        </div>
      )}

      {gen.status === "completed" && (
        editingMemo ? (
          <div className="space-y-1.5">
            <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} maxLength={300} placeholder="이 곡에 대한 메모(예: 후렴이 좋음, 2번 곡 사용)"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-100 focus:border-violet-500 focus:outline-none" />
            <div className="flex gap-2">
              <button type="button" disabled={saving} onClick={() => patch({ memo })} className="whitespace-nowrap rounded-lg bg-violet-500 px-2.5 py-1 text-xs font-bold text-white disabled:opacity-60">{saving ? "저장 중…" : "메모 저장"}</button>
              <button type="button" onClick={() => { setMemo(savedMemo); setEditingMemo(false); }} className="whitespace-nowrap text-xs text-zinc-400">취소</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setEditingMemo(true)} className="flex w-fit items-start gap-1 text-left text-xs text-zinc-400 hover:text-zinc-200">
            <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {savedMemo ? <span className="text-zinc-200">{savedMemo}</span> : <span>메모 쓰기</span>}
          </button>
        )
      )}

      {lyrics && (
        <div>
          <button type="button" onClick={() => setShowLyrics((v) => !v)} className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-zinc-200">
            <FileText className="h-3.5 w-3.5" aria-hidden="true" /> {showLyrics ? "가사 접기" : "가사 보기"}
          </button>
          {showLyrics && <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl bg-zinc-950/60 p-3 font-sans text-xs leading-relaxed text-zinc-300">{lyrics}</pre>}
        </div>
      )}

      {gen.status === "completed" && (
        <p className="text-xs leading-relaxed text-zinc-400">
          실측: {typeof gen.options?.actual === "string" ? gen.options.actual : "공급자가 사용량을 알려 주지 않음"}{" "}
          <a href={PROVIDERS[gen.provider]?.usageLink} target="_blank" rel="noreferrer" className="whitespace-nowrap text-violet-300 hover:underline">사용량 확인 ↗</a>
        </p>
      )}

      <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/80 pt-3 text-[11px] text-zinc-500">
        <span className="whitespace-nowrap">
          {gen.instrumental ? "연주곡" : "보컬곡"}
          {gen.est_cost_usd != null ? ` · 예상 약 $${Number(gen.est_cost_usd).toFixed(2)}` : ""}
          {gen.status !== "running" ? ` · 자동 삭제 D-${left}` : ""}
        </span>
        {gen.status !== "running" &&
          (confirming ? (
            <span className="flex items-center gap-2">
              <button type="button" disabled={deleting} onClick={remove} className="whitespace-nowrap rounded-lg bg-red-500/15 px-2 py-1 font-bold text-red-300 hover:bg-red-500/25">
                {deleting ? "삭제 중…" : "정말 삭제"}
              </button>
              <button type="button" disabled={deleting} onClick={() => setConfirming(false)} className="whitespace-nowrap text-zinc-400 hover:text-zinc-200">취소</button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className="inline-flex items-center gap-1 whitespace-nowrap text-zinc-500 hover:text-red-300">
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> 삭제
            </button>
          ))}
      </footer>
      {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
    </article>
  );
}
