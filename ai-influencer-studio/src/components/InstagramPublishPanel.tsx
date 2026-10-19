"use client";

import { useEffect, useState } from "react";
import { Send, Check, ExternalLink, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MAX_INSTA_CAPTION, MAX_INSTA_PHOTOS, feedCrop, togglePick } from "@/lib/instagram/feedImage";
import type { HistoryItem } from "@/types/influencer";

// v1.14 인스타 자동 포스팅 1차(즉시 게시) — 기준: cardnews-studio InstagramPublishPanel(v1.18).
// 인스타 연결은 INSTA 포스팅 자동화에서 한 번 한 값을 그대로 쓴다(공용 insta_accounts).

interface Status { connected: boolean; username: string; expired: boolean; connectUrl: string }
interface Photo { id: string; url: string; label: string }

const FALLBACK_CONNECT = "https://auto-instagram-posting.buylife.xyz/settings";
const MAX_EDGE = 1440;

/** 사진을 인스타 피드 비율에 맞춰 잘라 JPEG로(인스타 API는 JPEG만 받음) */
async function toFeedJpeg(url: string): Promise<Blob> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("사진을 읽지 못했습니다."));
    img.src = url;
  });
  const crop = feedCrop(img.naturalWidth, img.naturalHeight);
  const scale = Math.min(1, MAX_EDGE / Math.max(crop.sw, crop.sh));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(crop.sw * scale);
  canvas.height = Math.round(crop.sh * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("사진을 변환하지 못했습니다.");
  ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("사진을 변환하지 못했습니다."))), "image/jpeg", 0.9)
  );
}

export function InstagramPublishPanel({ currentImage, caption, history }: { currentImage: string; caption: string; history: HistoryItem[] }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [text, setText] = useState(caption);
  const [picked, setPicked] = useState<string[]>(["current"]);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ permalink: string; username: string } | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/instagram", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => alive && setStatus(d))
      .catch(() => alive && setStatus({ connected: false, username: "", expired: false, connectUrl: FALLBACK_CONNECT }));
    return () => { alive = false; };
  }, []);
  // 새 사진·다른 캡션 탭으로 바뀌면 처음 상태로
  useEffect(() => { setText(caption); }, [caption]);
  useEffect(() => { setPicked(["current"]); setDone(null); setConfirmed(false); }, [currentImage]);

  const photos: Photo[] = [
    { id: "current", url: currentImage, label: "지금 사진" },
    ...history.filter((h) => h.imageUrl && h.imageUrl !== currentImage).map((h) => ({ id: h.id, url: h.imageUrl, label: h.timestamp })),
  ];
  const chosen = picked.map((id) => photos.find((p) => p.id === id)).filter((p): p is Photo => !!p);

  async function publish() {
    setError(""); setDone(null);
    try {
      setBusy("사진 준비 중...");
      const blobs = [];
      for (const p of chosen) blobs.push(await toFeedJpeg(p.url));
      setBusy("사진 올리는 중...");
      const up = await fetch("/api/instagram/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ count: blobs.length }) });
      const upData = await up.json().catch(() => ({}));
      if (!up.ok) throw new Error(upData.error || "사진을 올릴 준비를 하지 못했습니다.");
      const uploads = upData.uploads as { path: string; token: string }[];
      const supabase = createClient();
      for (let i = 0; i < uploads.length; i++) {
        const { error: e } = await supabase.storage.from("insta-post-images").uploadToSignedUrl(uploads[i].path, uploads[i].token, blobs[i], { contentType: "image/jpeg" });
        if (e) throw new Error("사진을 올리지 못했습니다. 네트워크를 확인하고 다시 시도해주세요.");
      }
      setBusy("인스타그램에 게시하는 중... (최대 1~2분)");
      const res = await fetch("/api/instagram/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paths: uploads.map((u) => u.path), caption: text }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "인스타그램 게시에 실패했습니다.");
      setDone({ permalink: data.permalink || "", username: data.username || "" });
      setConfirmed(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "인스타그램 게시에 실패했습니다.");
    } finally {
      setBusy("");
    }
  }

  const ready = status?.connected && !status.expired;
  return (
    <div className="p-3.5 rounded-xl bg-if-raised border border-if-border space-y-2.5">
      <div className="flex items-center gap-1.5 text-xs font-bold text-if-text">
        <Send className="w-3.5 h-3.5 text-pink-500" />
        <span>인스타그램에 게시</span>
        {status && ready && <span className="ml-auto font-normal text-[11px] text-emerald-400">연결됨 @{status.username}</span>}
      </div>

      {!status ? (
        <p className="text-[11px] text-if-muted">연결 상태를 확인하고 있어요...</p>
      ) : !ready ? (
        <div className="space-y-2">
          <p className="text-[11px] text-if-muted">
            {status.expired ? "인스타그램 연결이 만료되었어요." : "아직 연결된 인스타그램 계정이 없어요."} INSTA 포스팅 자동화에서 한 번 연결하면 여기서도 바로 게시할 수 있어요.
          </p>
          <a href={status.connectUrl || FALLBACK_CONNECT} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg if-gradient text-white font-semibold text-xs">
            <ExternalLink className="w-3 h-3" />INSTA에서 연결하기
          </a>
        </div>
      ) : (
        <>
          <div>
            <p className="text-[11px] text-if-muted mb-1.5">
              게시할 사진 ({chosen.length}/{MAX_INSTA_PHOTOS}장 · 2장 이상이면 넘겨 보는 캐러셀, 누른 순서대로) — 인스타 피드 비율(4:5~1.91:1)을 벗어나면 가운데 기준으로 잘라 올려요.
            </p>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {photos.map((p) => {
                const order = picked.indexOf(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPicked((cur) => togglePick(cur, p.id))}
                    disabled={!!busy}
                    title={p.label}
                    className={`relative shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 ${order >= 0 ? "border-pink-500" : "border-if-border opacity-60"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
                    {order >= 0 && <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-pink-500 text-white text-[10px] font-bold flex items-center justify-center">{order + 1}</span>}
                  </button>
                );
              })}
            </div>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_INSTA_CAPTION))}
            rows={4}
            disabled={!!busy}
            aria-label="인스타 게시 캡션"
            className="w-full bg-if-surface border border-if-border rounded-lg px-3 py-2 text-xs text-if-text focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
          />
          <div className="flex items-center justify-between text-[11px] text-if-muted">
            <span>{text.length}/{MAX_INSTA_CAPTION}자</span>
          </div>
          <label className="flex items-start gap-1.5 text-[11px] text-if-text">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} disabled={!!busy} className="mt-0.5" />
            <span>@{status.username} 계정에 바로 공개 게시하는 것을 확인했어요.</span>
          </label>
          <button
            type="button"
            onClick={publish}
            disabled={!confirmed || !!busy || chosen.length === 0}
            className="w-full px-4 py-2 rounded-lg if-gradient text-white font-semibold text-xs hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-1"
          >
            {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>{busy || `인스타그램에 게시 (${chosen.length}장)`}</span>
          </button>
        </>
      )}
      {error && <p className="text-[11px] text-red-400">{error}</p>}
      {done && (
        <p className="text-[11px] text-emerald-400 flex items-center gap-1">
          <Check className="w-3 h-3" />게시했어요.
          {done.permalink && <a href={done.permalink} target="_blank" rel="noopener noreferrer" className="underline">게시물 보기</a>}
        </p>
      )}
    </div>
  );
}
