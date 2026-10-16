"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { syncRemixStatusAction, deleteRemixAction } from "@/lib/actions/remix";
import { ImageLightbox } from "@/components/plannings/ImageLightbox";
import type { RemixStatus } from "@/types/database.types";

export interface RemixVariant {
  id: string;
  audio_url: string;
  image_url: string | null;
  duration_seconds: number | null;
  created_at: string;
}

export interface RemixCardData {
  id: string;
  source_title: string | null;
  desired_feel: string;
  style_description: string | null;
  status: RemixStatus;
  error_message: string | null;
  created_at: string;
  target_duration_seconds: number | null;
  extend_hop_count: number;
  music_track_remix_variants: RemixVariant[];
}

function latestBatch(variants: RemixVariant[]): RemixVariant[] {
  if (variants.length === 0) return [];
  const maxTime = Math.max(...variants.map((v) => new Date(v.created_at).getTime()));
  return variants.filter((v) => maxTime - new Date(v.created_at).getTime() < 2000);
}

const STATUS_LABEL: Record<RemixStatus, { label: string; className: string }> = {
  generating: {
    label: "생성 중...",
    className: "bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse",
  },
  completed: {
    label: "완료",
    className: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  },
  failed: {
    label: "실패",
    className: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
  },
};

export function RemixCard({ remix }: { remix: RemixCardData }) {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  async function handleSyncStatus() {
    setSyncError(null);
    setIsSyncing(true);
    try {
      const result = await syncRemixStatusAction(remix.id);
      if (result.error) {
        setSyncError(result.error);
      } else if (result.status && result.status !== "generating") {
        router.refresh();
      } else {
        setSyncError("아직 Suno에서 생성이 끝나지 않았습니다. 잠시 후 다시 확인해주세요.");
      }
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleDelete() {
    setDeleteError(null);
    setIsDeleting(true);
    try {
      const result = await deleteRemixAction(remix.id);
      if (result.error) {
        setDeleteError(result.error);
        setIsDeleting(false);
      } else {
        router.refresh();
      }
    } catch {
      setIsDeleting(false);
    }
  }

  const badge = STATUS_LABEL[remix.status];
  const visibleVariants = latestBatch(remix.music_track_remix_variants);
  const currentDuration = visibleVariants.reduce((max, v) => Math.max(max, v.duration_seconds ?? 0), 0);
  const target = remix.target_duration_seconds;
  const isExtending = remix.status === "generating" && remix.extend_hop_count > 0;

  return (
    <>
      <div className="rounded-2xl border border-[#272732] bg-[#14141b] p-5 shadow-lg shadow-black/40 hover:border-[#383848] transition-colors relative">
        <div className="flex items-center justify-between mb-3 gap-2">
          <p className="font-bold text-white text-base flex items-center gap-2 truncate">
            <span>🎛️</span>
            <span className="truncate">{remix.source_title ? `"${remix.source_title}" 리믹스` : "리믹스"}</span>
          </p>
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${badge.className}`}>
            {badge.label}
          </span>
        </div>

        <div className="rounded-xl bg-[#1c1c28] border border-[#2a2a3c] p-3 mb-3 text-xs space-y-1">
          <p className="text-zinc-300 font-medium flex items-center gap-1.5">
            <span className="text-orange-400">💭 무드/컨셉:</span>
            <span>{remix.desired_feel}</span>
          </p>
          {remix.style_description && (
            <p className="text-zinc-400 flex items-center gap-1.5">
              <span className="text-amber-400">🎨 프롬프트 스타일:</span>
              <span>{remix.style_description}</span>
            </p>
          )}
          {target != null && (currentDuration > 0 || isExtending) && (
            <p className="text-zinc-400 flex items-center gap-1.5 pt-0.5">
              <span>⏱️ 현재 약 {currentDuration}초 / 목표 {target}초</span>
              {isExtending && (
                <span className="text-amber-400 font-semibold">
                  (자동 연장 {remix.extend_hop_count}회차 진행 중)
                </span>
              )}
            </p>
          )}
        </div>

        {remix.status === "failed" && remix.error_message && (
          <p className="mb-3 text-xs text-rose-300 bg-rose-950/40 border border-rose-500/30 rounded-xl px-3 py-2">
            ⚠️ {remix.error_message}
          </p>
        )}

        {remix.status === "generating" && (
          <div className="mb-4">
            <button
              type="button"
              onClick={handleSyncStatus}
              disabled={isSyncing}
              className="text-xs font-bold text-orange-400 hover:text-orange-300 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
            >
              <span>{isSyncing ? "⚡ Suno 상태 조회 중..." : "🔄 지금 상태 새로고침 (Suno 직접 조회)"}</span>
            </button>
            {syncError && <p className="mt-1.5 text-xs text-rose-400">{syncError}</p>}
          </div>
        )}

        {visibleVariants.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 mb-4">
            {visibleVariants.map((variant, index) => (
              <div
                key={variant.id}
                className="rounded-xl border border-[#272738] bg-[#1a1926] p-3 space-y-2.5 shadow-sm"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-orange-400">변주곡 #{index + 1}</span>
                  {variant.duration_seconds && (
                    <span className="text-[11px] text-zinc-400">{variant.duration_seconds}초</span>
                  )}
                </div>
                {variant.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={variant.image_url}
                    alt={`리믹스 커버 ${index + 1}`}
                    className="w-full rounded-xl aspect-square object-cover cursor-zoom-in ring-1 ring-[#343448] hover:ring-orange-500/40 transition-all"
                    onClick={() => setLightboxUrl(variant.image_url)}
                  />
                )}
                <audio controls src={variant.audio_url} className="w-full opacity-90 hover:opacity-100" />
              </div>
            ))}
          </div>
        )}

        {deleteError && (
          <p className="mb-3 text-xs text-rose-300 bg-rose-950/40 border border-rose-500/30 rounded-xl px-3 py-2">
            {deleteError}
          </p>
        )}

        {remix.status !== "generating" && (
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-rose-400 border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-60 transition-colors"
            >
              {isDeleting ? "삭제 중..." : "리믹스 삭제"}
            </button>
          </div>
        )}
      </div>

      {lightboxUrl && <ImageLightbox src={lightboxUrl} alt="리믹스 커버" onClose={() => setLightboxUrl(null)} />}
    </>
  );
}
