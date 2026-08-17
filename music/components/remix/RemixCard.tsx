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

/**
 * 원곡 길이만큼 자동 연장(remixSync.ts의 maybeAutoExtendRemix)될 때마다 같은 remix row에
 * variant가 계속 쌓인다 — 화면에는 가장 최근 연장분(가장 긴 결과)만 보여주고 짧았던 이전
 * 시도들은 숨긴다(DB/Storage에는 그대로 남아있음). 한 번에 저장된 variant들은 같은 INSERT
 * 문으로 들어가서 created_at이 사실상 동일하므로, 가장 최신 created_at과 가까운(2초 이내)
 * variant들만 "최신 배치"로 간주한다.
 */
function latestBatch(variants: RemixVariant[]): RemixVariant[] {
  if (variants.length === 0) return [];
  const maxTime = Math.max(...variants.map((v) => new Date(v.created_at).getTime()));
  return variants.filter((v) => maxTime - new Date(v.created_at).getTime() < 2000);
}

const STATUS_LABEL: Record<RemixStatus, { label: string; className: string }> = {
  generating: { label: "생성 중...", className: "bg-amber-100 text-amber-700" },
  completed: { label: "완료", className: "bg-green-100 text-green-700" },
  failed: { label: "실패", className: "bg-red-100 text-red-700" },
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
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2 gap-2">
          <p className="font-bold text-gray-900">
            🎛️ {remix.source_title ? `"${remix.source_title}" 리믹스` : "리믹스"}
          </p>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${badge.className}`}>{badge.label}</span>
        </div>

        <p className="text-sm text-gray-500 mb-1">💭 {remix.desired_feel}</p>
        {remix.style_description && <p className="text-xs text-gray-400 mb-1">🎨 {remix.style_description}</p>}
        {target != null && (currentDuration > 0 || isExtending) && (
          <p className="text-xs text-gray-400 mb-3">
            ⏱️ 현재 약 {currentDuration}초 / 목표 {target}초
            {isExtending && ` — 원곡 길이까지 자동으로 이어붙이는 중 (${remix.extend_hop_count}번째 연장)`}
          </p>
        )}

        {remix.status === "failed" && remix.error_message && (
          <p className="mb-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{remix.error_message}</p>
        )}

        {remix.status === "generating" && (
          <div className="mb-3">
            <button
              type="button"
              onClick={handleSyncStatus}
              disabled={isSyncing}
              className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-60"
            >
              {isSyncing ? "확인 중..." : "지금 상태 확인 (Suno에 직접 조회)"}
            </button>
            {syncError && <p className="mt-1 text-xs text-red-600">{syncError}</p>}
          </div>
        )}

        {visibleVariants.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 mb-4">
            {visibleVariants.map((variant, index) => (
              <div key={variant.id} className="space-y-2">
                {variant.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={variant.image_url}
                    alt={`리믹스 커버 ${index + 1}`}
                    className="w-full rounded-xl aspect-square object-cover cursor-zoom-in"
                    onClick={() => setLightboxUrl(variant.image_url)}
                  />
                )}
                <audio controls src={variant.audio_url} className="w-full" />
              </div>
            ))}
          </div>
        )}

        {deleteError && <p className="mb-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{deleteError}</p>}
        {remix.status !== "generating" && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 disabled:opacity-60 transition-colors"
          >
            {isDeleting ? "삭제 중..." : "삭제"}
          </button>
        )}
      </div>

      {lightboxUrl && <ImageLightbox src={lightboxUrl} alt="리믹스 커버" onClose={() => setLightboxUrl(null)} />}
    </>
  );
}
