"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { applySunoCoverAction, requestSunoCoverAction, requestSunoVideoAction, syncMediaAction, type MediaState } from "@/lib/actions/media";

// Suno 커버 이미지·뮤직비디오(2026-10-21 Suno V6 3차 ⑦⑧). 커버는 곡(트랙) 단위·곡당 1번, 영상은 변주(곡 1개)마다.
export interface MediaItem {
  id: string;
  kind: "suno_cover" | "video";
  variant_id: string | null;
  status: "generating" | "completed" | "failed";
  urls: string[];
  error_message: string | null;
  created_at: string;
}

const chip =
  "px-3 py-1.5 rounded-full text-xs font-bold border border-[#2d2d3e] bg-[#20202e] text-zinc-300 hover:text-white hover:border-orange-500/40 hover:bg-[#28283a] disabled:opacity-50 transition-all flex items-center gap-1";

function useRun() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  async function run(key: string, fn: () => Promise<MediaState>, pendingText?: string) {
    setBusy(key);
    setMessage(null);
    try {
      const res = await fn();
      if (res.needsApiKey) setMessage("Suno(sunoapi.org) API 키를 [API 키 등록 · 플랫폼 연동]에서 먼저 등록해 주세요.");
      else if (res.error) setMessage(res.error);
      else if (res.pending) setMessage(pendingText ?? "아직 만드는 중입니다. 잠시 뒤 다시 확인해 주세요.");
      else router.refresh();
    } catch {
      setMessage("요청을 보내지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(null);
    }
  }
  return { busy, message, run };
}

/** 곡(트랙) 단위 — 변주 목록 아래에 놓는다. */
export function SunoCoverPanel({ trackId, media }: { trackId: string; media: MediaItem[] }) {
  const { busy, message, run } = useRun();
  const latest = media.filter((m) => m.kind === "suno_cover").sort((a, b) => a.created_at.localeCompare(b.created_at)).pop();
  const canRequest = !latest || latest.status === "failed";

  return (
    <div className="mb-5 space-y-2 rounded-xl border border-[#2a2a3c] bg-[#101018] p-3 text-[11px] text-zinc-300">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold text-zinc-200">🖼️ Suno 커버 이미지</span>
        {canRequest && (
          <button type="button" className={chip} disabled={!!busy} onClick={() => run("req", () => requestSunoCoverAction(trackId))}>
            {busy === "req" ? "요청 중..." : latest ? "다시 요청" : "Suno 커버 받기 (2장)"}
          </button>
        )}
        {latest?.status === "generating" && (
          <>
            <span className="text-amber-400">만드는 중... (보통 1분 안팎, 완료되면 자동 반영)</span>
            <button type="button" className={chip} disabled={!!busy} onClick={() => run("sync", () => syncMediaAction(latest.id))}>
              {busy === "sync" ? "확인 중..." : "상태 확인"}
            </button>
          </>
        )}
      </div>
      {!latest && <p className="text-zinc-500">곡 하나당 한 번만 받을 수 있습니다. 본인 sunoapi.org 크레딧이 사용되며, 기존 자동 커버는 그대로 있습니다.</p>}
      {latest?.status === "failed" && <p className="text-rose-300">⚠️ {latest.error_message ?? "Suno 커버를 만들지 못했습니다."}</p>}
      {latest?.status === "completed" && (
        <div className="flex flex-wrap gap-3">
          {latest.urls.map((url, i) => (
            <div key={url} className="space-y-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Suno 커버 ${i + 1}`} className="h-28 w-28 rounded-lg object-cover border border-[#2d2d3e]" />
              <button type="button" className={chip} disabled={!!busy} onClick={() => run(`apply${i}`, () => applySunoCoverAction(latest.id, i))}>
                {busy === `apply${i}` ? "바꾸는 중..." : "이 커버로 바꾸기"}
              </button>
            </div>
          ))}
        </div>
      )}
      {message && <p className="text-rose-300">⚠️ {message}</p>}
    </div>
  );
}

/** 변주(곡 1개) 단위 — 곡 카드 버튼 묶음 안에 놓는다. */
export function SunoVideoButton({ variantId, media }: { variantId: string; media: MediaItem[] }) {
  const { busy, message, run } = useRun();
  const [author, setAuthor] = useState("");
  const [open, setOpen] = useState(false);
  const latest = media
    .filter((m) => m.kind === "video" && m.variant_id === variantId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .pop();

  return (
    <>
      {(!latest || latest.status === "failed") && (
        <button type="button" className={chip} onClick={() => setOpen((v) => !v)} title="Suno가 음악에 맞춘 시각 효과 영상(MP4)을 만들어 줍니다. 본인 sunoapi.org 크레딧이 사용됩니다.">
          <span>🎬</span>
          <span>{latest ? "Suno 뮤직비디오 다시 만들기" : "Suno 뮤직비디오(MP4)"}</span>
        </button>
      )}
      {open && (!latest || latest.status === "failed") && (
        <div className="basis-full flex flex-wrap items-center gap-2 rounded-xl border border-[#2a2a3c] bg-[#101018] p-3 text-[11px] text-zinc-300">
          <label className="flex items-center gap-1">
            영상에 표시할 이름(선택)
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              maxLength={50}
              placeholder="예: 채널 이름"
              className="rounded-lg border border-[#2d2d3e] bg-[#16161f] px-2 py-1 text-xs text-white"
            />
          </label>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => run("req", () => requestSunoVideoAction(variantId, author))}
            className="rounded-full bg-orange-500 px-3 py-1.5 text-xs font-bold text-black hover:bg-orange-400 disabled:opacity-50"
          >
            {busy === "req" ? "요청 중..." : "영상 만들기"}
          </button>
        </div>
      )}
      {latest?.status === "generating" && (
        <div className="basis-full flex flex-wrap items-center gap-2 text-[11px] text-amber-400">
          🎬 뮤직비디오 만드는 중... (보통 1~3분, 완료되면 자동 반영)
          <button type="button" className={chip} disabled={!!busy} onClick={() => run("sync", () => syncMediaAction(latest.id))}>
            {busy === "sync" ? "확인 중..." : "상태 확인"}
          </button>
        </div>
      )}
      {latest?.status === "failed" && <p className="basis-full text-[11px] text-rose-300">⚠️ {latest.error_message ?? "뮤직비디오를 만들지 못했습니다."}</p>}
      {latest?.status === "completed" && latest.urls[0] && (
        <div className="basis-full space-y-1">
          <p className="text-[11px] font-bold text-zinc-300">🎬 Suno 뮤직비디오</p>
          <video controls preload="none" src={latest.urls[0]} className="w-full rounded-lg" />
          <a href={latest.urls[0]} download className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300">
            ⬇ MP4 내려받기
          </a>
        </div>
      )}
      {message && <p className="basis-full text-[11px] text-rose-300">⚠️ {message}</p>}
    </>
  );
}
