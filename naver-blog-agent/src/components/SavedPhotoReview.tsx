"use client";

import { useEffect, useState } from "react";
import type { DraftImage } from "@/lib/draftImages";
import type { PhotoReviewResult } from "@/lib/photoReview";
import PhotoReviewEvidence from "./PhotoReviewEvidence";

/** 임시 미리보기는 이 컴포넌트에만 둔다. 원고/캐시/검수 스냅샷에는 전달하지 않는다. */
export default function SavedPhotoReview({ images, review }: { images: DraftImage[]; review?: PhotoReviewResult }) {
  const photos = images.filter(image => image.storagePath);
  const paths = JSON.stringify(photos.map(image => image.storagePath));
  const [refresh, setRefresh] = useState(0);
  const [preview, setPreview] = useState<{ key: string; urls: Record<string, string>; error: string; loading: boolean }>({ key: "", urls: {}, error: "", loading: false });
  const key = `${paths}:${refresh}`;
  useEffect(() => {
    const storagePaths: string[] = JSON.parse(paths);
    if (!storagePaths.length) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/photos/resolve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paths: storagePaths }), signal: controller.signal, cache: "no-store" });
        const body = await response.json();
        if (!response.ok || !Array.isArray(body.photos) || body.photos.length !== storagePaths.length) throw new Error(body.error || "사진 미리보기를 확인하지 못했습니다.");
        const urls: Record<string, string> = {};
        for (const photo of body.photos) {
          if (!storagePaths.includes(photo.storagePath) || typeof photo.preview?.url !== "string" || !photo.preview.url.startsWith("https://")) throw new Error("사진 미리보기 연결을 확인하지 못했습니다.");
          urls[photo.storagePath] = photo.preview.url;
        }
        if (!controller.signal.aborted) setPreview({ key, urls, error: "", loading: false });
      } catch (error) {
        if (!controller.signal.aborted) setPreview({ key, urls: {}, error: error instanceof Error ? error.message : "사진 조회 실패", loading: false });
      }
    })();
    return () => controller.abort();
  }, [paths, key]);
  if (!photos.length) return null;
  const current = preview.key === key;
  return <section className="space-y-3 rounded-xl border border-emerald-200 bg-white p-4" aria-label="저장한 내 사진과 후기 근거">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold text-emerald-950">내 사진 {photos.length}장 · 순서와 대표 보존</h3><button type="button" disabled={!current || preview.loading} onClick={() => setRefresh(value => value + 1)} className="rounded-lg border border-emerald-200 px-3 py-2 text-xs disabled:opacity-40">사진 미리보기 새로 조회</button></div>
    <p className="text-xs leading-relaxed text-slate-600">사진은 원래 등록일로부터 30일 보관됩니다. 미리보기 만료 시 새로 조회하세요. 조회는 검수 상태를 바꾸지 않습니다. 본문 사진 위치 표시는 원본 텍스트 편집에서 유지해 주세요.</p>
    <p role="status" className="text-xs text-amber-900">{current ? preview.error || (preview.loading ? "사진 확인 중" : "") : "사진 확인 중"}</p>
    <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{photos.map((photo, index) => <li key={photo.storagePath} className="min-w-0 rounded-lg border border-slate-200 p-3 text-xs">
      {current && preview.urls[photo.storagePath!] && <img src={preview.urls[photo.storagePath!]} alt={`내 사진 ${index + 1}`} className="mb-2 aspect-video w-full rounded object-contain" onError={() => setPreview(previous => ({ ...previous, error: "미리보기 주소가 만료되었거나 사진을 읽지 못했습니다. 새로 조회해 주세요." }))} />}
      <p className="font-semibold">사진 {index + 1} · {photo.type === "thumbnail" ? "대표" : "본문"}</p><p className="mt-1 whitespace-pre-wrap break-words">{photo.caption}</p>
      {photo.expiresAt && <p className="mt-1 text-slate-500">보관 만료: {new Date(photo.expiresAt).toLocaleString("ko-KR")}</p>}
    </li>)}</ol>
    {review && <PhotoReviewEvidence review={review} />}
  </section>;
}
