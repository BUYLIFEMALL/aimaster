"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createReelCoverUploadAction, getReelCoverAction, removeReelCoverAction } from "@/lib/actions/reelCover";
import { REEL_COVER_BUCKET, checkReelCoverFile, reelCoverRatioNote } from "@/lib/instagram/reelCover";

// v1.35 인스타 릴스 표지 이미지(선택). 올려 두면 「인스타에 올리기」 때 cover_url로 함께 보낸다.
export function ReelCoverPicker({ videoId, disabled }: { videoId: string; disabled?: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    void getReelCoverAction(videoId).then((r) => { if (alive) setUrl(r.url); });
    return () => { alive = false; };
  }, [videoId]);

  async function upload(file: File) {
    setError(null); setNote(null);
    const bad = checkReelCoverFile(file);
    if (bad) { setError(bad); return; }
    setBusy(true);
    try {
      const size = await imageSize(file);
      const up = await createReelCoverUploadAction(videoId);
      if (!up.path || !up.token) throw new Error(up.error ?? "업로드 주소를 만들지 못했습니다.");
      const { error: upErr } = await createClient().storage.from(REEL_COVER_BUCKET).uploadToSignedUrl(up.path, up.token, file, { contentType: "image/jpeg", upsert: true });
      if (upErr) throw new Error("표지를 저장소에 올리지 못했습니다. 잠시 후 다시 시도해 주세요.");
      const r = await getReelCoverAction(videoId);
      if (!r.url) throw new Error("올린 표지를 확인하지 못했습니다. 다시 올려 주세요.");
      setUrl(r.url);
      setNote(size ? reelCoverRatioNote(size.w, size.h) : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "표지를 올리지 못했습니다.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setBusy(true); setError(null); setNote(null);
    const r = await removeReelCoverAction(videoId);
    setBusy(false);
    if (r.error) setError(r.error); else setUrl(null);
  }

  return (
    <div>
      <label className="mb-1 block text-xs text-neutral-500">표지 이미지 (JPG, 선택)</label>
      <div className="flex items-start gap-3">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="릴스 표지" className="h-32 w-[72px] rounded-md border border-neutral-200 object-cover" />
        )}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={disabled || busy} onClick={() => input.current?.click()}
              className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">
              {busy ? "처리 중..." : url ? "표지 바꾸기" : "표지 올리기"}
            </button>
            {url && (
              <button type="button" disabled={disabled || busy} onClick={() => void remove()}
                className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50">
                표지 빼기
              </button>
            )}
          </div>
          <p className="text-xs text-neutral-500">
            세로 9:16 JPG(8MB 이하)를 권장합니다. AI 썸네일·SEO 자동화에서 「세로 9:16」으로 만든 이미지를 받아 올리면 됩니다. 비워 두면 영상 첫 화면이 표지가 됩니다.
          </p>
          {note && <p className="text-xs text-amber-600">{note}</p>}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </div>
      <input ref={input} type="file" accept="image/jpeg" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
    </div>
  );
}

function imageSize(file: File): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    const src = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve({ w: img.naturalWidth, h: img.naturalHeight }); URL.revokeObjectURL(src); };
    img.onerror = () => { resolve(null); URL.revokeObjectURL(src); };
    img.src = src;
  });
}
